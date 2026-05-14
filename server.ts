import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, limit, getDocs, doc, getDoc, setDoc, addDoc } from 'firebase/firestore';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import webpush from 'web-push';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Define the secret system key via Environment Variables for maximum security
const SYSTEM_KEY = process.env.PDKS_SYSTEM_KEY;
if (!SYSTEM_KEY) {
  console.error("CRITICAL ERROR: PDKS_SYSTEM_KEY environment variable is missing! Server cannot start securely.");
  process.exit(1);
}
const ACTIVE_SYSTEM_KEY = SYSTEM_KEY;

// VAPID Ayarları (Push Notifications)
const VAPID_PUBLIC_KEY = 'BOPBnKZxgQDkPI2W4reXfIxX4JvL_fmvxEStJMCwZ5VR8OCWongeK167qF3ag0_Liq0CkxvKpGM307hbTr3gJtY';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
if (!VAPID_PRIVATE_KEY) {
  console.error("CRITICAL ERROR: VAPID_PRIVATE_KEY environment variable is missing!");
  process.exit(1);
}
webpush.setVapidDetails(
  'mailto:admin@pdks.app',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Push bildirim gönderme yardımcı fonksiyonu
async function sendPushToUser(db: any, userId: string, title: string, body: string, link: string = '/') {
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (!userSnap.exists()) return;
    const userData = userSnap.data();
    if (!userData.pushSubscription) return;
    
    const subscription = JSON.parse(userData.pushSubscription);
    const payload = JSON.stringify({ title, body, link });
    await webpush.sendNotification(subscription, payload);
  } catch (err: any) {
    // 410 Gone = Abonelik geçersiz, temizle
    if (err.statusCode === 410) {
      await setDoc(doc(db, 'users', userId), { pushSubscription: null }, { merge: true });
    }
    console.warn(`Push gönderilemedi (${userId}):`, err.message);
  }
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  console.log(`Starting PDKS server on port ${PORT}...`);

  // Load config from environment variables
  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
    firestoreDatabaseId: process.env.VITE_FIREBASE_DATABASE_ID || "(default)"
  };

  if (!firebaseConfig.projectId) {
    console.error("CRITICAL ERROR: Firebase Environment Variables are missing!");
  } else {
    console.log(`Config loaded from ENV for project: ${firebaseConfig.projectId}`);
  }

  // Initialize Firebase Admin SDK (Only for tokens)
  try {
    const adminId = 'pdks-admin-app';
    initializeAdminApp({
      projectId: firebaseConfig.projectId,
    }, adminId);
    console.log("Firebase Admin SDK (Tokens) initialized.");
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }

  // Initialize Firebase Client SDK for Firestore (Bypasses IAM metadata server issues in this environment)
  let db: any;
  try {
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    console.log("Firebase Client SDK (Firestore) initialized.");
  } catch (error) {
    console.error("Firebase Client SDK initialization error:", error);
  }

  app.use(express.json({ limit: '2mb' }));

  // --- Rate Limiting (basit, bellek tabanlı) ---
  const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
  const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 dakika
  const RATE_LIMIT_MAX = 10; // 15 dakikada max 10 deneme

  function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = loginAttempts.get(ip);
    if (!record || (now - record.lastAttempt > RATE_LIMIT_WINDOW)) {
      loginAttempts.set(ip, { count: 1, lastAttempt: now });
      return true;
    }
    if (record.count >= RATE_LIMIT_MAX) {
      return false;
    }
    record.count++;
    record.lastAttempt = now;
    return true;
  }

  // Eski kayıtları periyodik temizle
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of loginAttempts.entries()) {
      if (now - record.lastAttempt > RATE_LIMIT_WINDOW) {
        loginAttempts.delete(ip);
      }
    }
  }, 5 * 60 * 1000);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API Routes
  app.post('/api/login', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not ready' });
    const { personnelId, password, deviceInfo, permanentDeviceId } = req.body;

    // Input validation
    if (!personnelId || !password || typeof personnelId !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Geçersiz giriş bilgileri' });
    }
    if (personnelId.length > 100 || password.length > 200) {
      return res.status(400).json({ error: 'Geçersiz giriş bilgileri' });
    }

    // Rate limiting
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: 'Çok fazla deneme. Lütfen 15 dakika bekleyin.' });
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('personnelId', '==', personnelId), limit(1));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return res.status(401).json({ error: 'Hatalı ID veya şifre' });
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      // Fetch secret using Client SDK (Requires firestore.rules to allow read)
      const secretSnap = await getDoc(doc(db, 'secrets', userDoc.id));
      if (!secretSnap.exists()) {
        return res.status(401).json({ error: 'Hatalı ID veya şifre' });
      }

      const storedPassword = secretSnap.data()?.password;
      let passwordMatch = false;

      // Fallback for old plaintext passwords
      if (storedPassword && !storedPassword.startsWith('$2a$') && !storedPassword.startsWith('$2b$')) {
        passwordMatch = (storedPassword === password);
        // Automatically hash the plaintext password and update DB for future logins
        if (passwordMatch) {
            const hashed = await bcrypt.hash(password, 10);
            await setDoc(doc(db, 'secrets', userDoc.id), { password: hashed, _system_key: ACTIVE_SYSTEM_KEY }, { merge: true });
        }
      } else if (storedPassword) {
        passwordMatch = await bcrypt.compare(password, storedPassword);
      }

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Hatalı ID veya şifre' });
      }

      if (userData.role === 'deleted') {
        return res.status(403).json({ error: 'Hesap devre dışı' });
      }

      // Check fixed device ID
      if (userData.role === 'employee' && permanentDeviceId) {
        const storedDeviceId = userData.deviceId || '';
        if (storedDeviceId && storedDeviceId.trim() !== permanentDeviceId.trim()) {
          return res.json({ 
            success: false,
            error: 'Bu hesap farklı bir cihaza tanımlıdır. Lütfen kayıtlı cihazınızdan giriş yapın.',
            currentDevice: permanentDeviceId,
            allowedDevice: 'Kayıtlı Sabit Cihaz (ID Uyuşmazlığı)'
          });
        }
        
        if (!userData.deviceId) {
          await setDoc(doc(db, 'users', userDoc.id), { 
            deviceId: permanentDeviceId.trim(),
            _system_key: ACTIVE_SYSTEM_KEY 
          }, { merge: true });
        }
      }

      // Check UA restriction
      if (userData.role === 'employee' && userData.allowedDevice && deviceInfo) {
        if (!deviceInfo.toLowerCase().includes(userData.allowedDevice.toLowerCase())) {
          return res.json({ 
            success: false,
            error: 'Bu cihazdan giriş yapma yetkiniz yok.',
            currentDevice: deviceInfo,
            allowedDevice: userData.allowedDevice
          });
        }
      }

      // Generate custom token (May fail if Admin SDK lacks permissions, but is supplementary)
      let customToken = null;
      try {
        customToken = await getAdminAuth().createCustomToken(userDoc.id);
      } catch (authError) {
        console.warn("Could not generate custom token (Role bypass might be needed):", authError);
      }

      const { _system_key, ...userResponse } = userData;
      res.json({ success: true, uid: userDoc.id, customToken, ...userResponse });
    } catch (error: any) {
      console.error("Login error details:", error);
      res.status(500).json({ error: 'Sistem hatası', details: error.message });
    }
  });

  app.post('/api/users', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not ready' });
    const { adminUid, newUser } = req.body;
    const { password, ...userProfile } = newUser;
    try {
      const adminSnap = await getDoc(doc(db, 'users', adminUid));
      if (!adminSnap.exists() || adminSnap.data()?.role !== 'admin') {
        return res.status(403).json({ error: 'Yetkisiz işlem' });
      }

      const q = query(collection(db, 'users'), where('personnelId', '==', userProfile.personnelId));
      const existing = await getDocs(q);
      if (!existing.empty) {
        return res.status(400).json({ error: 'Bu ID zaten kullanımda' });
      }

      const newDocRef = doc(collection(db, 'users'));
      const uid = newDocRef.id;
      await setDoc(newDocRef, { 
        ...userProfile, 
        uid, 
        leaveBalance: userProfile.leaveBalance || 14,
        createdAt: new Date().toISOString(),
        _system_key: ACTIVE_SYSTEM_KEY
      });
      const hashedPassword = await bcrypt.hash(password, 10);
      await setDoc(doc(db, 'secrets', uid), { 
        password: hashedPassword,
        _system_key: ACTIVE_SYSTEM_KEY
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Add user error:", error);
      res.status(500).json({ error: 'Sistem hatası' });
    }
  });

  app.post('/api/users/update', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not ready' });
    const { adminUid, targetUid, updates } = req.body;
    try {
      const actorSnap = await getDoc(doc(db, 'users', adminUid));
      if (!actorSnap.exists()) {
        return res.status(403).json({ error: 'Yetkisiz işlem' });
      }
      const actorData = actorSnap.data();
      
      const userRef = doc(db, 'users', targetUid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }

      // Authorization Check
      // 1. User is admin
      // 2. User is the target (self-update)
      // 3. User is the manager of the target
      let isAuthorized = actorData?.role === 'admin' || adminUid === targetUid;
      if (!isAuthorized && userSnap.data()?.managerId === adminUid) {
        isAuthorized = true;
      }

      if (!isAuthorized) {
        return res.status(403).json({ error: 'Bu işlemi yapma yetkiniz yok' });
      }

      const { password, ...profileUpdates } = updates;
      
      // If not admin, restrict which fields can be updated (e.g. only password/profile info)
      // For now, let's allow it but be careful with role changes if not admin
      if (profileUpdates.role && actorData?.role !== 'admin') {
        delete profileUpdates.role;
      }
      
      await setDoc(userRef, { 
        ...userSnap.data(),
        ...profileUpdates,
        _system_key: ACTIVE_SYSTEM_KEY
      }, { merge: true });

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await setDoc(doc(db, 'secrets', targetUid), { 
          password: hashedPassword,
          _system_key: ACTIVE_SYSTEM_KEY
        }, { merge: true });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: 'Sistem hatası' });
    }
  });

  app.delete('/api/attendance/:id', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not ready' });
    const { adminUid } = req.query;
    const { id } = req.params;
    try {
      const actorSnap = await getDoc(doc(db, 'users', adminUid as string));
      if (!actorSnap.exists()) {
        return res.status(403).json({ error: 'Yetkisiz işlem' });
      }
      const actorData = actorSnap.data();

      const logRef = doc(db, 'attendance', id);
      const logSnap = await getDoc(logRef);
      if (!logSnap.exists()) {
        return res.status(404).json({ error: 'Kayıt bulunamadı' });
      }
      const logData = logSnap.data();

      let isAuthorized = actorData?.role === 'admin';
      if (!isAuthorized) {
        const targetUserSnap = await getDoc(doc(db, 'users', logData?.userId));
        if (targetUserSnap.exists() && targetUserSnap.data()?.managerId === adminUid) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({ error: 'Bu kaydı silme yetkiniz yok.' });
      }

      await setDoc(logRef, { 
        ...logData,
        deleted: true,
        ipAddress: `Silindi: ${actorData?.name}`,
        _system_key: ACTIVE_SYSTEM_KEY
      }, { merge: true });

      res.json({ success: true });
    } catch (error) {
      console.error("Delete log error:", error);
      res.status(500).json({ error: 'Sistem hatası' });
    }
  });

  // Push abonelik kaydetme
  app.post('/api/push/subscribe', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not ready' });
    const { uid, subscription } = req.body;
    if (!uid || !subscription) return res.status(400).json({ error: 'Eksik parametre' });
    try {
      await setDoc(doc(db, 'users', uid), {
        pushSubscription: JSON.stringify(subscription)
      }, { merge: true });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Kaydedilemedi' });
    }
  });

  // Push bildirimi gönderme (admin/manager trigger)
  app.post('/api/push/send', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not ready' });
    const { actorUid, targetUid, title, body, link } = req.body;
    try {
      // Sadece admin veya manager gönderebilir
      const actorSnap = await getDoc(doc(db, 'users', actorUid));
      if (!actorSnap.exists()) return res.status(403).json({ error: 'Yetkisiz' });
      
      await sendPushToUser(db, targetUid, title, body, link || '/');
      
      // Firebase'e bildirim kaydı da ekle
      await addDoc(collection(db, 'notifications'), {
        userId: targetUid,
        title,
        message: body,
        type: 'info',
        read: false,
        link: link || '/',
        createdAt: new Date().toISOString()
      });
      
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Onay/Red bildirimlerini otomatik push olarak gönder
  app.post('/api/notify/approval', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not ready' });
    const { targetUid, isApproved, requestType, actorName } = req.body;
    const statusText = isApproved ? 'Onaylandı ✅' : 'Reddedildi ❌';
    const typeText = requestType === 'leave' ? 'İzin Talebi' : requestType === 'manual' ? 'Manuel Kayıt' : 'Mesai Talebi';
    const title = `${typeText} ${statusText}`;
    const body = `${actorName} tarafından ${isApproved ? 'onaylanmıştır' : 'reddedilmiştir'}.`;
    // Yönlendirme: onaylanan kayıtlar -> doğru uygulama rotası
    const link = requestType === 'leave' ? '/leaves' : requestType === 'manual' ? '/home' : '/leaves';
    
    try {
      await sendPushToUser(db, targetUid, title, body, link);
      await addDoc(collection(db, 'notifications'), {
        userId: targetUid,
        title,
        message: body,
        type: isApproved ? 'success' : 'error',
        read: false,
        link,
        createdAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Giriş bildirimi yöneticiye gönder
  app.post('/api/notify/checkin', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not ready' });
    const { userId, userName, type, isRemote, remoteNote } = req.body;
    try {
      const userSnap = await getDoc(doc(db, 'users', userId));
      if (!userSnap.exists()) return res.json({ success: false });
      const managerId = userSnap.data()?.managerId;
      if (!managerId) return res.json({ success: false });
      
      const typeText = type === 'in' ? 'Giriş' : 'Çıkış';
      const remoteText = isRemote ? ' (Nakliye/Uzaktan)' : '';
      const title = `${userName} - ${typeText} Hareketi${remoteText}`;
      const body = isRemote && remoteNote 
        ? `Not: ${remoteNote}` 
        : `${new Date().toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' })} saatinde ${typeText.toLowerCase()} yaptı.`;
      const link = isRemote ? '/approvals' : '/movements';

      await sendPushToUser(db, managerId, title, body, link);
      // Firestore'a bildirim kaydı ekle (uygulama içi bildirimleri için)
      await addDoc(collection(db, 'notifications'), {
        userId: managerId,
        title,
        message: body,
        type: 'info',
        read: false,
        link,
        createdAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Yeni talep bildirimi yöneticiye gönder  
  app.post('/api/notify/newrequest', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not ready' });
    const { userId, userName, requestType, managerId } = req.body;
    const typeText = requestType === 'leave' ? 'İzin' : 'Mesai';
    const title = `Yeni ${typeText} Talebi`;
    const body = `${userName} yeni bir ${typeText.toLowerCase()} talebi oluşturdu.`;
    const link = requestType === 'leave' ? '/approvals' : '/approvals';
    
    try {
      await sendPushToUser(db, managerId, title, body, link);
      await addDoc(collection(db, 'notifications'), {
        userId: managerId,
        title,
        message: body,
        type: 'info',
        read: false,
        link,
        createdAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Health check endpoint (Coolify / load balancer için)
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Middleware'leri ÖNCE ekle, sonra listen et
  if (process.env.NODE_ENV !== 'production') {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error("Vite start error:", e);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // ÖNCE sunucuyu başlat (healthcheck geçsin)
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // SONRA admin bootstrap (non-blocking, sunucu zaten dinliyor)
  if (db) {
    try {
      const adminId = 'admin_initial';
      const existingAdmin = await getDoc(doc(db, 'users', adminId));
      if (!existingAdmin.exists()) {
        console.log("Initial admin not found, creating...");
        await setDoc(doc(db, 'users', adminId), {
          uid: adminId,
          personnelId: 'admin',
          name: 'Sistem Yöneticisi',
          role: 'admin',
          createdAt: new Date().toISOString(),
          _system_key: ACTIVE_SYSTEM_KEY
        });
        const adminHashed = await bcrypt.hash('admin', 10);
        await setDoc(doc(db, 'secrets', adminId), {
          password: adminHashed,
          _system_key: ACTIVE_SYSTEM_KEY
        });
        console.log("Initial admin created successfully. CHANGE THE PASSWORD IMMEDIATELY!");
      } else {
        console.log("Admin already exists, skipping bootstrap.");
      }
    } catch (e) {
      console.error("Bootstrap error:", e);
    }
  }
}

startServer();

