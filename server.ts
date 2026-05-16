import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import webpush from 'web-push';
import { db, pool } from './src/db/index.js';
import { users, attendanceLogs, leaveRequests, overtimeRequests, notifications, companies, companySettings } from './src/db/schema.js';
import { eq, and, desc, gte, lte } from 'drizzle-orm';

const __dirname = process.cwd();
const JWT_SECRET = process.env.PDKS_SYSTEM_KEY || 'default_jwt_secret_change_in_production';

// VAPID
const VAPID_PUBLIC_KEY = 'BOPBnKZxgQDkPI2W4reXfIxX4JvL_fmvxEStJMCwZ5VR8OCWongeK167qF3ag0_Liq0CkxvKpGM307hbTr3gJtY';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
if (VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:admin@pdks.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Push Helper
async function sendPushToUser(userId: string, title: string, body: string, link: string = '/') {
  try {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user || !user.pushSubscription) return;
    const subscription = JSON.parse(user.pushSubscription);
    const payload = JSON.stringify({ title, body, link });
    await webpush.sendNotification(subscription, payload);
  } catch (err: any) {
    if (err.statusCode === 410) {
      await db.update(users).set({ pushSubscription: null }).where(eq(users.id, userId));
    }
  }
}

// Authentication Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const tÇoken = authHeader && authHeader.split(' ')[1];
  if (!tÇoken) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(tÇoken, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'TÇoken expired or invalid' });
    req.user = user; // { uid, role, companyId }
    next();
  });
};

async function startServer() {
  
// --- INITIALIZE DATABASE ---
const initDb = async () => {
  try {
    const client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        subscription_status TEXT DEFAULT 'active'
      );
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id INTEGER REFERENCES companies(id),
        personnel_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        title TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        manager_id UUID,
        avatar_url TEXT,
        password_hash TEXT NOT NULL,
        leave_balance REAL DEFAULT 14,
        can_remote_check_in BOOLEAN DEFAULT false,
        allowed_device TEXT,
        push_subscription TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS attendance_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id INTEGER REFERENCES companies(id),
        user_id UUID REFERENCES users(id),
        user_name TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT now(),
        type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        ip_address TEXT,
        device_info TEXT,
        location TEXT,
        is_remote BOOLEAN DEFAULT false,
        remote_note TEXT,
        manual_entry BOOLEAN DEFAULT false,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS leave_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id INTEGER REFERENCES companies(id),
        user_id UUID REFERENCES users(id),
        user_name TEXT NOT NULL,
        manager_id UUID,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        days REAL NOT NULL,
        type TEXT NOT NULL,
        reason TEXT,
        attachment_url TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS overtime_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id INTEGER REFERENCES companies(id),
        user_id UUID REFERENCES users(id),
        user_name TEXT NOT NULL,
        manager_id UUID,
        date TEXT NOT NULL,
        hours REAL NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS company_settings (
        company_id INTEGER PRIMARY KEY REFERENCES companies(id),
        qr_secret TEXT,
        tolerance_minutes INTEGER DEFAULT 15,
        shift_start TEXT DEFAULT '09:00',
        shift_end TEXT DEFAULT '18:00',
        require_location BOOLEAN DEFAULT false,
        allowed_ips TEXT
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT now()
      );
      
      -- Default Admin User Check
      DO \$\$
      DECLARE
        comp_id INTEGER;
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM companies WHERE name = 'PDKS Demo') THEN
          INSERT INTO companies (name, subscription_status) VALUES ('PDKS Demo', 'active') RETURNING id INTO comp_id;
          INSERT INTO users (company_id, personnel_id, name, role, password_hash, leave_balance, can_remote_check_in)
          VALUES (comp_id, 'admin', 'Sistem Yöneticisi', 'superadmin', '\$2a\$10\$D1PjV.M/vG3R2GjQj.7qG./37L.Y.p9nO5rI8c7L3oH9qL8aU3.Y6', 14, true);
        END IF;
      END \$\$;
    `);
    client.release();
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Database initialization failed:', err);
  }
};
initDb();


const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  app.use(express.json({ limit: '2mb' }));

  // --- Rate Limiting ---
  const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
  const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
  const RATE_LIMIT_MAX = 10;
  function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = loginAttempts.get(ip);
    if (!record || (now - record.lastAttempt > RATE_LIMIT_WINDOW)) {
      loginAttempts.set(ip, { count: 1, lastAttempt: now });
      return true;
    }
    if (record.count >= RATE_LIMIT_MAX) return false;
    record.count++; record.lastAttempt = now;
    return true;
  }

  app.get('/api/health', (req, res) => res.json({ status: 'Çok', time: new Date().toISOString() }));

  // API Routes - Public
  app.post('/api/login', async (req, res) => {
    const { personnelId, password, deviceInfo, permanentDeviceId } = req.body;
    if (!personnelId || !password) return res.status(400).json({ error: 'Ge�ersiz giri�' });
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) return res.status(429).json({ error: '�Çok fazla deneme.' });

    try {
      const userList = await db.select().from(users).where(eq(users.personnelId, personnelId)).limit(1);
      if (userList.length === 0) return res.status(401).json({ error: 'Hatalı� ID veya �ifre' });
      const user = userList[0];

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) return res.status(401).json({ error: 'Hatalı� ID veya �ifre' });
      if (!user.isActive) return res.status(403).json({ error: 'Hesap devre dışı���' });

      // TÇoken
      const tÇoken = jwt.sign({ uid: user.id, role: user.role, companyId: user.companyId }, JWT_SECRET, { expiresIn: '30d' });
      const { passwordHash, ...safeUser } = user;
      res.json({ success: true, uid: user.id, customTÇoken: tÇoken, ...safeUser });
    } catch (error: any) {
      res.status(500).json({ error: 'Sistem hatası�' });
    }
  });

  // API Routes - Protected
  app.get('/api/me', authenticateToken, async (req: any, res) => {
    try {
      const userList = await db.select().from(users).where(eq(users.id, req.user.uid)).limit(1);
      if (userList.length === 0) return res.status(404).json({ error: 'User not found' });
      const { passwordHash, ...safeUser } = userList[0];
      res.json(safeUser);
    } catch (error: any) {
      res.status(500).json({ error: 'Sistem hatası�' });
    }
  });

  
  app.get('/api/users/me', authenticateToken, async (req, res) => {
    try {
      const u = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
      if (u.length > 0) res.json(u[0]);
      else res.status(404).json({ error: 'Not found' });
    } catch (e) { res.status(500).json({ error: 'Server error' }); }
  });

  app.get('/api/users', authenticateToken, async (req: any, res) => {
    try {
      if (!req.user.companyId && req.user.role !== 'superadmin') return res.status(400).json({ error: '�irket bulunamad�' });
      
      const query = req.user.role === 'superadmin' 
        ? db.select().from(users) 
        : db.select().from(users).where(eq(users.companyId, req.user.companyId));
        
      const allUsers = await query;
      const safeUsers = allUsers.map(u => { const { passwordHash, ...safe } = u; return safe; });
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ error: 'Sistem hatası�' });
    }
  });

  app.get('/api/logs', authenticateToken, async (req: any, res) => {
    try {
      const companyId = req.user.companyId;
      if (!companyId) return res.status(400).json({ error: '�irket bulunamad�' });
      const logs = await db.select().from(attendanceLogs).where(eq(attendanceLogs.companyId, companyId)).orderBy(desc(attendanceLogs.timestamp));
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Sistem hatası�' });
    }
  });

  app.post('/api/attendance', authenticateToken, async (req: any, res) => {
    try {
      const { type, isRemote, remoteNote, latitude, longitude } = req.body;
      const companyId = req.user.companyId;
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      
      await db.insert(attendanceLogs).values({
        companyId,
        userId: req.user.uid,
        type,
        ipAddress: clientIp,
        status: 'success',
        isRemote: !!isRemote,
        remoteNote,
        latitude,
        longitude
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Sistem hatası�' });
    }
  });

  
  // --- ADDITIONAL CRUD ROUTES ---

  // User Management
  app.post('/api/users', authenticateToken, async (req: any, res: any) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Yetkisiz' });
      const { newUser } = req.body;
      const hashedPassword = await bcrypt.hash(newUser.password, 10);
      
      const userList = await db.insert(users).values({
        companyId: req.user.companyId,
        personnelId: newUser.personnelId,
        name: newUser.name,
        title: newUser.title,
        role: newUser.role,
        managerId: newUser.managerId,
        passwordHash: hashedPassword,
        leaveBalance: newUser.leaveBalance,
        canRemoteCheckIn: newUser.canRemoteCheckIn,
        allowedDevice: newUser.allowedDevice,
      }).returning();
      
      res.json({ success: true, user: userList[0] });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: 'Sistem hatasıı' });
    }
  });

  app.post('/api/users/update', authenticateToken, async (req: any, res: any) => {
    try {
      const { targetUid, updates } = req.body;
      const isSelf = req.user.uid === targetUid;
      const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
      
      if (!isSelf && !isAdmin) return res.status(403).json({ error: 'Yetkisiz' });

      if (updates.password) {
        updates.passwordHash = await bcrypt.hash(updates.password, 10);
        delete updates.password;
      }
      
      await db.update(users).set(updates).where(eq(users.id, targetUid));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Sistem hatasıı' });
    }
  });

  app.delete('/api/users/:id', authenticateToken, async (req: any, res: any) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Yetkisiz' });
      await db.update(users).set({ isActive: false }).where(eq(users.id, req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Sistem hatasıı' });
    }
  });

  // Settings
  app.get('/api/settings', authenticateToken, async (req: any, res: any) => {
    try {
      const s = await db.select().from(companySettings).where(eq(companySettings.companyId, req.user.companyId)).limit(1);
      res.json(s[0] || {});
    } catch (e) {
      res.status(500).json({ error: 'Sistem hatasıı' });
    }
  });

  app.put('/api/settings', authenticateToken, async (req: any, res: any) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Yetkisiz' });
      const updates = req.body;
      // upsert
      const existing = await db.select().from(companySettings).where(eq(companySettings.companyId, req.user.companyId));
      if (existing.length > 0) {
        await db.update(companySettings).set(updates).where(eq(companySettings.companyId, req.user.companyId));
      } else {
        await db.insert(companySettings).values({ companyId: req.user.companyId, ...updates });
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Sistem hatasıı' });
    }
  });

  // Attendance Mutators
  app.delete('/api/attendance/:id', authenticateToken, async (req: any, res: any) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Yetkisiz' });
      await db.delete(attendanceLogs).where(eq(attendanceLogs.id, req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Sistem hatasıı' });
    }
  });
  
  app.put('/api/attendance/:id', authenticateToken, async (req: any, res: any) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Yetkisiz' });
      await db.update(attendanceLogs).set(req.body).where(eq(attendanceLogs.id, req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Sistem hatasıı' });
    }
  });

  // Leaves & Overtimes
  app.get('/api/leaves', authenticateToken, async (req: any, res: any) => {
    try {
      const leaves = await db.select().from(leaveRequests).where(eq(leaveRequests.companyId, req.user.companyId));
      res.json(leaves);
    } catch (e) {
      res.status(500).json({ error: 'Sistem hatasıı' });
    }
  });
  
  app.post('/api/leaves', authenticateToken, async (req: any, res: any) => {
    try {
      await db.insert(leaveRequests).values({ companyId: req.user.companyId, userId: req.user.uid, ...req.body });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Sistem hatasıı' });
    }
  });
  
  app.put('/api/leaves/:id', authenticateToken, async (req: any, res: any) => {
    try {
      await db.update(leaveRequests).set(req.body).where(eq(leaveRequests.id, req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Sistem hatasıı' });
    }
  });
  
  app.delete('/api/leaves/:id', authenticateToken, async (req: any, res: any) => {
    try {
      await db.delete(leaveRequests).where(eq(leaveRequests.id, req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Sistem hatasıı' });
    }
  });

  app.get('/api/overtime', authenticateToken, async (req: any, res: any) => {
    try {
      const ot = await db.select().from(overtimeRequests).where(eq(overtimeRequests.companyId, req.user.companyId));
      res.json(ot);
    } catch (e) {
      res.status(500).json({ error: 'Sistem hatasıı' });
    }
  });
  
  app.post('/api/overtime', authenticateToken, async (req: any, res: any) => {
    try {
      await db.insert(overtimeRequests).values({ companyId: req.user.companyId, userId: req.user.uid, ...req.body });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Sistem hatasıı' });
    }
  });
  
  app.put('/api/overtime/:id', authenticateToken, async (req: any, res: any) => {
    try {
      await db.update(overtimeRequests).set(req.body).where(eq(overtimeRequests.id, req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Sistem hatasıı' });
    }
  });
  
  app.delete('/api/overtime/:id', authenticateToken, async (req: any, res: any) => {
    try {
      await db.delete(overtimeRequests).where(eq(overtimeRequests.id, req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Sistem hatasıı' });
    }
  });

  app.get('/api/notifications', authenticateToken, async (req: any, res: any) => {
    try {
      const notifs = await db.select().from(notifications).where(eq(notifications.userId, req.user.uid)).orderBy(desc(notifications.createdAt)).limit(100);
      res.json(notifs);
    } catch (e) {
      res.status(500).json({ error: 'Sistem hatasıı' });
    }
  });

  app.post('/api/notifications', authenticateToken, async (req: any, res: any) => {
    try {
      const { userId, title, message, type, read } = req.body;
      await db.insert(notifications).values({
        userId: userId || req.user.uid,
        title: title || 'Bildirim',
        message: message || '',
        type: type || 'info',
        read: read || false,
      });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Sistem hatasıı' });
    }
  });

  app.put('/api/notifications/:id', authenticateToken, async (req: any, res: any) => {
    try {
      await db.update(notifications).set(req.body).where(eq(notifications.id, req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Sistem hatasıı' });
    }
  });

  // Push subscription
  app.post('/api/push/subscribe', authenticateToken, async (req: any, res: any) => {
    try {
      const { subscription } = req.body;
      await db.update(users).set({ pushSubscription: JSON.stringify(subscription) }).where(eq(users.id, req.user.uid));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Sistem hatasıı' });
    }
  });

  // Notify endpoints
  app.post('/api/notify/checkin', authenticateToken, async (req: any, res: any) => {
    try {
      const { userId, userName, type, isRemote, remoteNote } = req.body;
      // Find managers of this user
      const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (userList.length > 0 && userList[0].managerId) {
        const title = type === 'in' ? 'Giriş Bildirimi' : 'Çıkış Bildirimi';
        const msg = userName + ' ' + (type === 'in' ? 'giriş yaptı' : 'çıkış yaptı') + (isRemote ? ' (Uzaktan)' : '');
        await db.insert(notifications).values({
          userId: userList[0].managerId,
          title, message: msg, type: 'info', read: false
        });
        await sendPushToUser(userList[0].managerId, title, msg, '/movements');
      }
      res.json({ success: true });
    } catch (e) {
      res.json({ success: true }); // Don't fail on notification errors
    }
  });

  app.post('/api/notify/approval', authenticateToken, async (req: any, res: any) => {
    try {
      const { targetUid, isApproved, requestType, actorName } = req.body;
      const typeLabel = requestType === 'leave' ? 'İzin' : requestType === 'overtime' ? 'Mesai' : 'Hareket';
      const title = typeLabel + ' Talebi ' + (isApproved ? 'Onaylandı' : 'Reddedildi');
      const msg = actorName + ' tarafından ' + (isApproved ? 'onaylandı' : 'reddedildi');
      await db.insert(notifications).values({
        userId: targetUid, title, message: msg,
        type: isApproved ? 'success' : 'error', read: false
      });
      await sendPushToUser(targetUid, title, msg, '/approvals');
      res.json({ success: true });
    } catch (e) {
      res.json({ success: true });
    }
  });

  app.post('/api/notify/newrequest', authenticateToken, async (req: any, res: any) => {
    try {
      const { userName, requestType, managerId } = req.body;
      const typeLabel = requestType === 'leave' ? 'İzin' : 'Mesai';
      const title = 'Yeni ' + typeLabel + ' Talebi';
      const msg = userName + ' yeni bir ' + typeLabel.toLowerCase() + ' talebi gönderdi';
      const targetId = managerId || 'admin_initial';
      await db.insert(notifications).values({
        userId: targetId, title, message: msg, type: 'info', read: false
      });
      await sendPushToUser(targetId, title, msg, '/approvals');
      res.json({ success: true });
    } catch (e) {
      res.json({ success: true });
    }
  });


  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
      app.use(vite.middlewares);
    } catch (e) {}
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => console.log('Server running on port ' + PORT));
}

startServer();



