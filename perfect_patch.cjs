const { execSync } = require('child_process');
const fs = require('fs');

console.log('Restoring App.tsx and server.ts from df479aa...');
execSync('git checkout df479aa -- src/App.tsx server.ts');

console.log('Applying patches...');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// Imports
c = c.replace(
  "useAttendanceMutation } from './api/hooks';", 
  "useAttendanceMutation, useSettingsMutation, useLeaveMutation, useOvertimeMutation, useUserMutation } from './api/hooks';"
);

// Hooks
const hookInjectionPoint = "const [notifications, setNotifications] = useState<SystemNotification[]>([]);";
const hooksString = `const [notifications, setNotifications] = useState<SystemNotification[]>([]);
const attendanceMutation = useAttendanceMutation();
const settingsMutation = useSettingsMutation();
const leaveMutation = useLeaveMutation();
const overtimeMutation = useOvertimeMutation();
const userMutation = useUserMutation();`;
c = c.replace(hookInjectionPoint, hooksString);

// App.tsx auth_error listener
c = c.replace(
  "useEffect(() => {\n    const checkLocation = () => {",
  `useEffect(() => {
  const handleAuthError = () => { setUser(null); setProfile(null); };
  window.addEventListener('auth_error', handleAuthError);
  return () => window.removeEventListener('auth_error', handleAuthError);
}, []);

useEffect(() => {
  const checkLocation = () => {`
);

// Mutations
c = c.replace(
  /await updateDoc\(doc\(db, 'attendance', editingLog.id\), \{/g,
  "await attendanceMutation.mutateAsync({ method: 'PUT', id: editingLog.id, payload: {"
);
c = c.replace(
  /\.\.\.\(isAdminOrManager \? \{ manualEntry: true, isRemote: false, remoteNote: null \} : \{\}\),\n\s*\}\);/g,
  "...(isAdminOrManager ? { manualEntry: true, isRemote: false, remoteNote: null } : {}),\n        } });"
);
c = c.replace(
  /await addDoc\(collection\(db, 'attendance'\), \{/g,
  "await attendanceMutation.mutateAsync({ method: 'POST', payload: {"
);
c = c.replace(
  /\.\.\.\(isAdminOrManager \? \{\} : \{ remoteNote: 'Geçmiş Kayıt \(Onay Bekliyor\)' \}\),\n\s*\}\);/g,
  "...(isAdminOrManager ? {} : { remoteNote: 'Geçmiş Kayıt (Onay Bekliyor)' }),\n        } });"
);

c = c.replace(
  /const response = await fetch\(\`\/api\/attendance\/\$\{log\.id\}\?adminUid=\$\{profile\.uid\}\`, \{\n\s*method: 'DELETE'\n\s*\}\);/g,
  "await attendanceMutation.mutateAsync({ method: 'DELETE', id: log.id }); const response = { ok: true };"
);

// checkAndCreateAutoOvertime
c = c.replace(
  /await addDoc\(collection\(db, 'overtimeRequests'\), \{\s*userId,\s*userName,\s*managerId: effectiveManagerId,\s*date: dateStr,\s*hours: overtimeHours,\s*description: `Otomatik Sistem Kaydı[^`]*`,\s*status: 'pending',\s*createdAt: serverTimestamp\(\),\s*\}\);/gs,
  `await overtimeMutation.mutateAsync({ method: 'POST', payload: { userName, managerId: effectiveManagerId, date: dateStr, hours: overtimeHours, description: 'Otomatik Sistem Kaydı (' + format(timestamp, 'HH:mm') + ' çıkış)', status: 'pending' } });`
);

// deleteUser
c = c.replace(
  /await setDoc\(doc\(db, 'users', uid\), \{\s*\.\.\.allUsers\.find\(u => u\.uid === uid\),\s*role: 'deleted',\s*\}\);/gs,
  `await userMutation.mutateAsync({ method: 'DELETE', id: uid });`
);

// submitLeaveRequest
c = c.replace(
  /await addDoc\(collection\(db, 'leaveRequests'\), \{([\s\S]*?)createdAt: serverTimestamp\(\),\s*\}\);/g,
  (match, inner) => {
    return `await leaveMutation.mutateAsync({ method: 'POST', payload: {
      userName: profile.name,
      managerId: profile.managerId || 'admin_initial',
      startDate, endDate, days, reason,
      type: leaveType,
      attachmentUrl,
      status: 'pending'
    } });`;
  }
);

// submitOvertimeRequest
c = c.replace(
  /await addDoc\(collection\(db, 'overtimeRequests'\), \{\s*userId: user\.uid,\s*userName: profile\.name,\s*managerId: profile\.managerId \|\| 'admin_initial',\s*date,\s*hours,\s*description,\s*status: 'pending',\s*createdAt: serverTimestamp\(\),\s*\}\);/gs,
  `await overtimeMutation.mutateAsync({ method: 'POST', payload: { userName: profile.name, managerId: profile.managerId || 'admin_initial', date, hours, description, status: 'pending' } });`
);

// handleDeleteLeave (part 1)
c = c.replace(
  /await setDoc\(doc\(db, 'leaveRequests', id\), \{.*?deleted: true,.*?deletedBy: profile\.uid,.*?\}, \{ merge: true \}\);/gs,
  "await leaveMutation.mutateAsync({ method: 'DELETE', id });"
);

// handleUpdateLeave
c = c.replace(
  /await updateDoc\(doc\(db, 'leaveRequests', editingLeave\.id!\), updates\);/g,
  "await leaveMutation.mutateAsync({ method: 'PUT', id: editingLeave.id!, payload: updates });"
);

// updateSettings
c = c.replace(
  /await setDoc\(doc\(db, 'settings', 'global'\), newSettings\);/g,
  "await settingsMutation.mutateAsync(newSettings);"
);

// regenerateQRSecret
c = c.replace(
  /await setDoc\(doc\(db, 'settings', 'global'\), \{\s*\.\.\.settings,\s*qrSecret: newSecret,\s*\}\);/g,
  "await settingsMutation.mutateAsync({ ...settings, qrSecret: newSecret });"
);

// syncOfflineQueueToFirebase - THIS TIME FIXING THE MISSING BRACE
c = c.replace(
  /await addDoc\(collection\(db, 'attendance'\), \{\s*\.\.\.payload,\s*timestamp: serverTimestamp\(\),\s*offlineQueued: true,\s*clientTimestamp\s*\}\);/g,
  "await attendanceMutation.mutateAsync({ method: 'POST', payload: { ...payload, offlineQueued: true, clientTimestamp } });"
);

// handleScanSuccess
c = c.replace(
  /const newDocRef = await addDoc\\(collection\\(db, 'attendance'\\), \\{[\\s\\S]*?\\}\\);/g,
  `const result = await attendanceMutation.mutateAsync({ method: 'POST', payload: logPayload });
      const newDocRef = { id: result.id || Math.random().toString() };`
);

c = c.replace(
  /await addDoc\(collection\(db, 'attendance'\), \{([\s\S]*?)errorMessage: '(.*?)'\n\s*\}\);/g,
  "await attendanceMutation.mutateAsync({ method: 'POST', payload: {$1errorMessage: '$2'} });"
);

// handleRequestAction
const oldHandleRequestAction = `const handleRequestAction = async (collectionName: 'leaveRequests' | 'overtimeRequests' | 'attendance', requestId: string, action: 'approved' | 'rejected') => {
  try {
    const requestRef = doc(db, collectionName, requestId);
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) return;

    const requestData = requestSnap.data();

    // If approving leave, deduct from balance
    if (collectionName === 'leaveRequests' && action === 'approved') {
      const userRef = doc(db, 'users', requestData.userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        const currentBalance = getEffectiveLeaveBalance(userData);
        await setDoc(userRef, { 
          ...userData, 
          leaveBalance: currentBalance - requestData.days
        });
      }
    }

    const finalStatus = collectionName === 'attendance' 
      ? (action === 'approved' ? 'success' : 'error') 
      : action;

    await setDoc(requestRef, { 
      ...requestData, 
      status: finalStatus,
    });`;

const newHandleRequestAction = `const handleRequestAction = async (collectionName: 'leaveRequests' | 'overtimeRequests' | 'attendance', requestId: string, action: 'approved' | 'rejected') => {
  try {
    const finalStatus = collectionName === 'attendance' 
      ? (action === 'approved' ? 'success' : 'error') 
      : action;

    if (collectionName === 'leaveRequests') {
      await leaveMutation.mutateAsync({ method: 'PUT', id: requestId, payload: { status: finalStatus } });
    } else if (collectionName === 'overtimeRequests') {
      await overtimeMutation.mutateAsync({ method: 'PUT', id: requestId, payload: { status: finalStatus } });
    } else if (collectionName === 'attendance') {
      await attendanceMutation.mutateAsync({ method: 'PUT', id: requestId, payload: { status: finalStatus } });
    }`;

c = c.replace(oldHandleRequestAction, newHandleRequestAction);

// handleDeleteLeave (part 2: balance)
const oldDeleteLeaveBalance = `      // 2. Revert balance if annual
    if (deletingLeave.type === 'annual') {
      const userRef = doc(db, 'users', deletingLeave.userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        const currentBalance = getEffectiveLeaveBalance(userData);
        await updateDoc(userRef, {
          leaveBalance: currentBalance + deletingLeave.days
        });
      }
    }`;

const newDeleteLeaveBalance = `      // 2. Revert balance if annual
    if (deletingLeave.type === 'annual') {
      await userMutation.mutateAsync({ method: 'PUT', id: deletingLeave.userId, payload: { leaveBalanceRevert: deletingLeave.days } });
    }`;

c = c.replace(oldDeleteLeaveBalance, newDeleteLeaveBalance);

// handleDeleteLeave notifications via API
c = c.replace(
  /\/\/ 3\. Send notification\s*\n\s*await addDoc\(collection\(db, 'notifications'\), \{([\s\S]*?)createdAt: serverTimestamp\(\)\s*\n\s*\}\);/g,
  `// 3. Send notification via API
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('pdks_token') },
      body: JSON.stringify({
        userId: deletingLeave.userId,
        title: 'İzin İptali',
        message: deletingLeave.startDate + ' tarihindeki izniniz yönetici tarafından iptal edildi. Neden: ' + reason,
        type: 'error',
        read: false
      })
    }).catch(() => {});`
);

// Overtime modalları (updateDoc / setDoc)
c = c.replace(
  /await updateDoc\(doc\(db, 'overtimeRequests', editingOvertime\.id!\), \{([\s\S]*?)\}\);/g,
  (match, inner) => `await overtimeMutation.mutateAsync({ method: 'PUT', id: editingOvertime.id!, payload: {${inner}} });`
);
c = c.replace(
  /await setDoc\(doc\(db, 'overtimeRequests', editingOvertime\.id\), \{([\s\S]*?)\}\);/g,
  (match, inner) => `await overtimeMutation.mutateAsync({ method: 'PUT', id: editingOvertime.id, payload: {${inner}} });`
);
c = c.replace(
  /await setDoc\(doc\(db, 'overtimeRequests', deletingOvertime\.id!\), \{([\s\S]*?)\}\);/g,
  (match, inner) => `await overtimeMutation.mutateAsync({ method: 'DELETE', id: deletingOvertime.id! });`
);

// Avatar updates
c = c.replace(/await updateDoc\(doc\(db, 'users', user\.uid\), \{ avatarUrl: avatarBase64 \}\);/g, `await userMutation.mutateAsync({ method: 'PUT', id: user.uid, payload: { avatarUrl: avatarBase64 } });`);
c = c.replace(/await updateDoc\(doc\(db, 'users', user\.uid\), \{ avatarUrl: null \}\);/g, `await userMutation.mutateAsync({ method: 'PUT', id: user.uid, payload: { avatarUrl: null } });`);
c = c.replace(/await updateDoc\(doc\(db, 'users', editingUser\.uid\), \{ avatarUrl: avatarBase64 \}\);/g, `await userMutation.mutateAsync({ method: 'PUT', id: editingUser.uid, payload: { avatarUrl: avatarBase64 } });`);
c = c.replace(/await updateDoc\(doc\(db, 'users', editingUser\.uid\), \{ avatarUrl: null \}\);/g, `await userMutation.mutateAsync({ method: 'PUT', id: editingUser.uid, payload: { avatarUrl: null } });`);

// Notifications
c = c.replace(
  /await updateDoc\(doc\(db, 'notifications', id\), \{ read: true \}\);/g,
  `await fetch('/api/notifications/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('pdks_token') }, body: JSON.stringify({ read: true }) });`
);
c = c.replace(
  /await addDoc\(collection\(db, 'notifications'\), \{([\s\S]*?)\}\);/g,
  (match, inner) => `await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('pdks_token') }, body: JSON.stringify({${inner}}) }).catch(() => {});`
);

// Remove snapshots
c = c.replace(/useEffect\(\(\) => \{\s*if \(!user.*?onSnapshot.*?return unsubscribe;\s*\}, \[user.*?\]\);/gs, '// [Migrated to React Query] Firebase listener removed');
c = c.replace(/const unsubscribe = onSnapshot\([^]*?return unsubscribe;\s*\}, \[.*?\]\);/g, '// Snapshot removed');
c = c.replace(/let unsubManager = onSnapshot\([^]*?return \(\) => \{\s*unsubManager\(\);\s*\};\s*\}, \[.*?\]\);/g, '// Manager snapshot removed');

// Firebase session verify
const oldSessionVerify = `    const savedSession = localStorage.getItem('pdks_session');
  if (savedSession) {
    const sessionData = JSON.parse(savedSession);
    // Verify session with Firestore
    const verifySession = async () => {
      try {
        if (sessionData.token) {
          await signInWithCustomToken(auth, sessionData.token).catch(e => console.error("Background re-auth error:", e));
        }
        const docRef = doc(db, 'users', sessionData.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const userData = docSnap.data() as UserProfile;
          if (userData.role !== 'deleted') {
            setUser({ uid: userData.uid });
            setProfile(userData);
          } else {
            localStorage.removeItem('pdks_session');
          }
        }
      } catch (error) {
        console.error("Session verification error:", error);
      } finally {
        setLoading(false);
      }
    };
    verifySession();
  } else {
    setLoading(false);
  }`;

const newSessionVerify = `    const savedToken = localStorage.getItem('pdks_token');
  const savedUser = localStorage.getItem('pdks_user');
  if (savedToken && savedUser) {
    try {
      setUser(JSON.parse(savedUser));
    } catch (e) {
      localStorage.removeItem('pdks_token');
      localStorage.removeItem('pdks_user');
    }
    setLoading(false);
  } else {
    setLoading(false);
  }`;

c = c.replace(oldSessionVerify, newSessionVerify);

// Fix serverTimestamp
c = c.replace(/timestamp: serverTimestamp\(\)/g, "timestamp: new Date().toISOString()");
c = c.replace(/createdAt: serverTimestamp\(\)/g, "createdAt: new Date().toISOString()");

// Remove ALL firebase imports (reliable regex in javascript)
c = c.replace(/^import\s+.*?\s+from\s+'firebase\/(firestore|auth)'.*?$/gm, '');
c = c.replace(/^import\s+.*?\s+from\s+'\.\.?\/lib\/firebase'.*?$/gm, '');

fs.writeFileSync('src/App.tsx', c, 'utf8');

// -------- SERVER PATCHES --------
let serverCode = fs.readFileSync('server.ts', 'utf8');

const missingRoutes = `
// --- ADDITIONAL CRUD ROUTES ---
app.post('/api/users', authenticateToken, async (req: any, res: any) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Yetkisiz' });
    const { newUser } = req.body;
    const hashedPassword = await bcrypt.hash(newUser.password, 10);
    const userList = await db.insert(users).values({
      companyId: req.user.companyId, personnelId: newUser.personnelId, name: newUser.name,
      title: newUser.title, role: newUser.role, managerId: newUser.managerId,
      passwordHash: hashedPassword, leaveBalance: newUser.leaveBalance,
      canRemoteCheckIn: newUser.canRemoteCheckIn, allowedDevice: newUser.allowedDevice,
    }).returning();
    res.json({ success: true, user: userList[0] });
  } catch (e: any) { res.status(500).json({ error: 'Sistem hatası' }); }
});

app.post('/api/users/update', authenticateToken, async (req: any, res: any) => {
  try {
    const { targetUid, updates } = req.body;
    if (updates.password) { updates.passwordHash = await bcrypt.hash(updates.password, 10); delete updates.password; }
    await db.update(users).set(updates).where(eq(users.id, targetUid));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Sistem hatası' }); }
});

app.delete('/api/users/:id', authenticateToken, async (req: any, res: any) => {
  try {
    await db.update(users).set({ isActive: false }).where(eq(users.id, req.params.id));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Sistem hatası' }); }
});

app.get('/api/settings', authenticateToken, async (req: any, res: any) => {
  try {
    const s = await db.select().from(companySettings).where(eq(companySettings.companyId, req.user.companyId)).limit(1);
    res.json(s[0] || {});
  } catch (e) { res.status(500).json({ error: 'Sistem hatası' }); }
});

app.put('/api/settings', authenticateToken, async (req: any, res: any) => {
  try {
    const updates = req.body;
    const existing = await db.select().from(companySettings).where(eq(companySettings.companyId, req.user.companyId));
    if (existing.length > 0) { await db.update(companySettings).set(updates).where(eq(companySettings.companyId, req.user.companyId)); }
    else { await db.insert(companySettings).values({ companyId: req.user.companyId, ...updates }); }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Sistem hatası' }); }
});

app.delete('/api/attendance/:id', authenticateToken, async (req: any, res: any) => {
  try {
    await db.delete(attendanceLogs).where(eq(attendanceLogs.id, req.params.id));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Sistem hatası' }); }
});

app.put('/api/attendance/:id', authenticateToken, async (req: any, res: any) => {
  try {
    await db.update(attendanceLogs).set(req.body).where(eq(attendanceLogs.id, req.params.id));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Sistem hatası' }); }
});

app.get('/api/leaves', authenticateToken, async (req: any, res: any) => {
  try { res.json(await db.select().from(leaveRequests).where(eq(leaveRequests.companyId, req.user.companyId))); } catch (e) { res.status(500).json({ error: 'Sistem hatası' }); }
});

app.post('/api/leaves', authenticateToken, async (req: any, res: any) => {
  try { await db.insert(leaveRequests).values({ companyId: req.user.companyId, userId: req.user.uid, ...req.body }); res.json({ success: true }); } catch (e) { res.status(500).json({ error: 'Sistem hatası' }); }
});

app.put('/api/leaves/:id', authenticateToken, async (req: any, res: any) => {
  try { await db.update(leaveRequests).set(req.body).where(eq(leaveRequests.id, req.params.id)); res.json({ success: true }); } catch (e) { res.status(500).json({ error: 'Sistem hatası' }); }
});

app.delete('/api/leaves/:id', authenticateToken, async (req: any, res: any) => {
  try { await db.delete(leaveRequests).where(eq(leaveRequests.id, req.params.id)); res.json({ success: true }); } catch (e) { res.status(500).json({ error: 'Sistem hatası' }); }
});

app.get('/api/overtime', authenticateToken, async (req: any, res: any) => {
  try { res.json(await db.select().from(overtimeRequests).where(eq(overtimeRequests.companyId, req.user.companyId))); } catch (e) { res.status(500).json({ error: 'Sistem hatası' }); }
});

app.post('/api/overtime', authenticateToken, async (req: any, res: any) => {
  try { await db.insert(overtimeRequests).values({ companyId: req.user.companyId, userId: req.user.uid, ...req.body }); res.json({ success: true }); } catch (e) { res.status(500).json({ error: 'Sistem hatası' }); }
});

app.put('/api/overtime/:id', authenticateToken, async (req: any, res: any) => {
  try { await db.update(overtimeRequests).set(req.body).where(eq(overtimeRequests.id, req.params.id)); res.json({ success: true }); } catch (e) { res.status(500).json({ error: 'Sistem hatası' }); }
});

app.delete('/api/overtime/:id', authenticateToken, async (req: any, res: any) => {
  try { await db.delete(overtimeRequests).where(eq(overtimeRequests.id, req.params.id)); res.json({ success: true }); } catch (e) { res.status(500).json({ error: 'Sistem hatası' }); }
});

app.get('/api/notifications', authenticateToken, async (req: any, res: any) => {
  try { res.json(await db.select().from(notifications).where(eq(notifications.userId, req.user.uid)).orderBy(desc(notifications.createdAt)).limit(100)); } catch (e) { res.status(500).json({ error: 'Sistem hatası' }); }
});

app.post('/api/notifications', authenticateToken, async (req: any, res: any) => {
  try { await db.insert(notifications).values({ userId: req.body.userId || req.user.uid, title: req.body.title || 'Bildirim', message: req.body.message || '', type: req.body.type || 'info', read: req.body.read || false }); res.json({ success: true }); } catch (e) { res.status(500).json({ error: 'Sistem hatası' }); }
});

app.put('/api/notifications/:id', authenticateToken, async (req: any, res: any) => {
  try { await db.update(notifications).set(req.body).where(eq(notifications.id, req.params.id)); res.json({ success: true }); } catch (e) { res.status(500).json({ error: 'Sistem hatası' }); }
});

app.post('/api/push/subscribe', authenticateToken, async (req: any, res: any) => {
  try { await db.update(users).set({ pushSubscription: JSON.stringify(req.body.subscription) }).where(eq(users.id, req.user.uid)); res.json({ success: true }); } catch (e) { res.status(500).json({ error: 'Sistem hatası' }); }
});

app.post('/api/notify/checkin', authenticateToken, async (req: any, res: any) => {
  try {
    const { userId, userName, type, isRemote, remoteNote } = req.body;
    const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userList.length > 0 && userList[0].managerId) {
      const title = type === 'in' ? 'Giriş Bildirimi' : 'Çıkış Bildirimi';
      const msg = userName + ' ' + (type === 'in' ? 'giriş yaptı' : 'çıkış yaptı') + (isRemote ? ' (Uzaktan)' : '');
      await db.insert(notifications).values({ userId: userList[0].managerId, title, message: msg, type: 'info', read: false });
      await sendPushToUser(userList[0].managerId, title, msg, '/movements');
    }
    res.json({ success: true });
  } catch (e) { res.json({ success: true }); }
});

app.post('/api/notify/approval', authenticateToken, async (req: any, res: any) => {
  try {
    const { targetUid, isApproved, requestType, actorName } = req.body;
    const typeLabel = requestType === 'leave' ? 'İzin' : requestType === 'overtime' ? 'Mesai' : 'Hareket';
    const title = typeLabel + ' Talebi ' + (isApproved ? 'Onaylandı' : 'Reddedildi');
    const msg = actorName + ' tarafından ' + (isApproved ? 'onaylandı' : 'reddedildi');
    await db.insert(notifications).values({ userId: targetUid, title, message: msg, type: isApproved ? 'success' : 'error', read: false });
    await sendPushToUser(targetUid, title, msg, '/approvals');
    res.json({ success: true });
  } catch (e) { res.json({ success: true }); }
});

app.post('/api/notify/newrequest', authenticateToken, async (req: any, res: any) => {
  try {
    const { userName, requestType, managerId } = req.body;
    const typeLabel = requestType === 'leave' ? 'İzin' : 'Mesai';
    const title = 'Yeni ' + typeLabel + ' Talebi';
    const msg = userName + ' yeni bir ' + typeLabel.toLowerCase() + ' talebi gönderdi';
    const targetId = managerId || 'admin_initial';
    await db.insert(notifications).values({ userId: targetId, title, message: msg, type: 'info', read: false });
    await sendPushToUser(targetId, title, msg, '/approvals');
    res.json({ success: true });
  } catch (e) { res.json({ success: true }); }
});
`;

const insertionPoint = "if (process.env.NODE_ENV !== 'production') {";
const splitContent = serverCode.split(insertionPoint);

if (splitContent.length === 2) {
  serverCode = splitContent[0] + missingRoutes + "\n  " + insertionPoint + splitContent[1];
  fs.writeFileSync('server.ts', serverCode, 'utf8');
}
console.log('Done!');


