import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, limit, getDocs, doc, getDoc, setDoc, addDoc } from 'firebase/firestore';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYSTEM_KEY = 'pdk_system_secret_2026';

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log("Starting PDKS server...");

  // Load config
  let firebaseConfig: any = {};
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log(`Config loaded for project: ${firebaseConfig.projectId}`);
    }
  } catch (e) {
    console.error("Config load error:", e);
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

  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API Routes
  app.post('/api/login', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not ready' });
    const { personnelId, password, deviceInfo, permanentDeviceId } = req.body;
    
    console.log(`[API Login] Attempting for personnelId: ${personnelId}`);
    try {
      const usersRef = collection(db, 'users');
      console.log(`[API Login] Querying collection: 'users' in db: ${firebaseConfig.firestoreDatabaseId || '(default)'}`);
      const q = query(usersRef, where('personnelId', '==', personnelId), limit(1));
      const snapshot = await getDocs(q);
      console.log(`[API Login] Snapshot results: ${snapshot.size} docs`);

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
            await setDoc(doc(db, 'secrets', userDoc.id), { password: hashed, _system_key: SYSTEM_KEY }, { merge: true });
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
            _system_key: SYSTEM_KEY 
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
        _system_key: SYSTEM_KEY
      });
      const hashedPassword = await bcrypt.hash(password, 10);
      await setDoc(doc(db, 'secrets', uid), { 
        password: hashedPassword,
        _system_key: SYSTEM_KEY
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
        _system_key: SYSTEM_KEY
      }, { merge: true });

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await setDoc(doc(db, 'secrets', targetUid), { 
          password: hashedPassword,
          _system_key: SYSTEM_KEY
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
        _system_key: SYSTEM_KEY
      }, { merge: true });

      res.json({ success: true });
    } catch (error) {
      console.error("Delete log error:", error);
      res.status(500).json({ error: 'Sistem hatası' });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

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

  if (db) {
    try {
      const adminId = 'admin_initial';
      await setDoc(doc(db, 'users', adminId), {
        uid: adminId,
        personnelId: 'admin',
        name: 'Sistem Yöneticisi',
        role: 'admin',
        createdAt: new Date().toISOString(),
        _system_key: SYSTEM_KEY
      });
      const adminHashed = await bcrypt.hash('admin', 10);
      await setDoc(doc(db, 'secrets', adminId), {
        password: adminHashed,
        _system_key: SYSTEM_KEY
      });
      console.log("Initial admin system check complete.");
    } catch (e) {
      console.error("Bootstrap error:", e);
    }
  }
}

startServer();
