const fs = require('fs');

// Fix server.ts
let s = fs.readFileSync('server.ts', 'utf8');
s = s.replace(/authenticateT[^\w]?oken/g, 'authenticateToken');
const meRoute = `
  app.get('/api/users/me', authenticateToken, async (req, res) => {
    try {
      const u = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
      if (u.length > 0) res.json(u[0]);
      else res.status(404).json({ error: 'Not found' });
    } catch (e) { res.status(500).json({ error: 'Server error' }); }
  });
`;
if (!s.includes('/api/users/me')) {
  s = s.replace("app.get('/api/users'", meRoute + "\n  app.get('/api/users'");
}
fs.writeFileSync('server.ts', s, 'utf8');

// Fix App.tsx
let c = fs.readFileSync('src/App.tsx', 'utf8');
c = c.replace(
  /const docRef = doc\(db, 'users', sessionData\.uid\);\s*const docSnap = await getDoc\(docRef\);\s*if \(docSnap\.exists\(\)\) \{\s*const userData = docSnap\.data\(\) as UserProfile;\s*if \(userData\.role !== 'deleted'\) \{\s*setUser\(\{ uid: userData\.uid \}\);\s*setProfile\(userData\);\s*\} else \{\s*localStorage\.removeItem\('pdks_session'\);\s*\}\s*\}/g,
  `const res = await fetch('/api/users/me', { headers: { 'Authorization': \`Bearer \${sessionData.token}\` } });
          if (res.ok) {
            const userData = await res.json();
            if (userData && userData.role !== 'deleted') {
              setUser({ uid: userData.id || userData.uid });
              setProfile(userData);
            } else {
              localStorage.removeItem('pdks_session');
            }
          } else {
            localStorage.removeItem('pdks_session');
          }`
);

// also fix deletingLeave
c = c.replace(
  /const userRef = doc\(db, 'users', deletingLeave\.userId\);\s*const userSnap = await getDoc\(userRef\);\s*if \(userSnap\.exists\(\)\) \{\s*const userData = userSnap\.data\(\) as UserProfile;\s*const currentBalance = getEffectiveLeaveBalance\(userData\);\s*await updateDoc\(userRef, \{\s*leaveBalance: currentBalance \+ deletingLeave\.days\s*\}\);\s*\}/g,
  `// Update balance via API
        await fetch('/api/users/' + deletingLeave.userId + '/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${localStorage.getItem('pdks_session') ? JSON.parse(localStorage.getItem('pdks_session')).token : ''}\` },
          body: JSON.stringify({ action: 'add', days: deletingLeave.days })
        });`
);

fs.writeFileSync('src/App.tsx', c, 'utf8');
