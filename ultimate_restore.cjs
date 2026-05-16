const fs = require('fs');
const {execSync} = require('child_process');

// 1. Get original from git blob
const blob = execSync('git cat-file -p df479aa:src/App.tsx', {maxBuffer: 10*1024*1024});
let original = blob.toString('utf8');

// 2. Remove Firebase imports
original = original.replace(/import \{ initializeApp \} from ['"]firebase\/app['"];?\s*\n?/g, '');
original = original.replace(/import \{ getFirestore[^}]*\} from ['"]firebase\/firestore['"];?\s*\n?/g, '');
original = original.replace(/import \{ getAuth[^}]*\} from ['"]firebase\/auth['"];?\s*\n?/g, '');
// Let's remove ANY firebase imports
const lines = original.split('\n');
const filtered = lines.filter(l => !l.includes('from \'firebase') && !l.includes('from "firebase') && !l.includes('from `firebase'));
original = filtered.join('\n');

// 3. Add API hooks import (before UserProfile import)
if (!original.includes('useAttendanceMutation')) {
  original = original.replace(
    /import \{ UserProfile/,
    "import { useAttendanceMutation, useSettingsMutation, useLeaveMutation, useOvertimeMutation, useUserMutation } from './api/hooks';\nimport { UserProfile"
  );
}

// 4. Fix verifySession - replace Firebase doc() call with fetch
original = original.replace(
  /const docRef = doc\(db, ['"]users['"], sessionData\.uid\);\s*\n\s*const docSnap = await getDoc\(docRef\);\s*\n\s*if \(docSnap\.exists\(\)\) \{\s*\n\s*const userData = docSnap\.data\(\) as UserProfile;\s*\n\s*if \(userData\.role !== ['"]deleted['"]\) \{\s*\n\s*setUser\(\{ uid: userData\.uid \}\);\s*\n\s*setProfile\(userData\);\s*\n\s*\} else \{\s*\n\s*localStorage\.removeItem\(['"]pdks_session['"]\);\s*\n\s*\}\s*\n\s*\}/,
  `const verifyRes = await fetch('/api/users/me', { headers: { 'Authorization': \`Bearer \${sessionData.token}\` } });
          if (verifyRes.ok) {
            const userData = await verifyRes.json();
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

// 5. Remove signInWithCustomToken call
original = original.replace(
  /if \(sessionData\.token\) \{\s*\n\s*await signInWithCustomToken\(auth, sessionData\.token\)\.catch\([^)]*\);\s*\n\s*\}\s*\n/g,
  ''
);

// 6. Fix deletingLeave Firebase call
original = original.replace(
  /const userRef = doc\(db, ['"]users['"], deletingLeave\.userId\);\s*\n\s*const userSnap = await getDoc\(userRef\);\s*\n\s*if \(userSnap\.exists\(\)\) \{\s*\n\s*const userData = userSnap\.data\(\) as UserProfile;\s*\n\s*const currentBalance = getEffectiveLeaveBalance\(userData\);\s*\n\s*await updateDoc\(userRef, \{\s*\n\s*leaveBalance: currentBalance \+ deletingLeave\.days\s*\n\s*\}\);\s*\n\s*\}/,
  `// Balance update handled server-side
        await fetch('/api/users/' + deletingLeave.userId + '/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${JSON.parse(localStorage.getItem('pdks_session') || '{}').token || ''}\` },
          body: JSON.stringify({ action: 'add', days: deletingLeave.days })
        });`
);

// 7. Remove firebaseConfig and auth/db initialization
original = original.replace(/\/\/ Firebase config[\s\S]*?const db = getFirestore\(app\);\s*\n?/g, '');
original = original.replace(/const firebaseConfig[\s\S]*?const auth = getAuth\(app\);\s*\n?/g, '');
original = original.replace(/\/\/ Initialize Firebase[\s\S]*?const auth = getAuth\(app\);\s*\n?/g, '');
original = original.replace(/const app = initializeApp\(firebaseConfig\);[\s\S]*?const auth = getAuth\(app\);\s*\n?/g, '');
original = original.replace(/const db = getFirestore\(app\);\s*\n?/g, '');
original = original.replace(/const auth = getAuth\(app\);\s*\n?/g, '');

fs.writeFileSync('src/App.tsx', original, 'utf8');

const final = fs.readFileSync('src/App.tsx', 'utf8');
const fbCount = (final.match(/firebase/gi) || []).length;
console.log('Firebase mentions left:', fbCount);

const turkishCount = (final.match(/[şŞçÇğĞüÜöÖıİ]/g) || []).length;
console.log('Turkish chars left:', turkishCount);
