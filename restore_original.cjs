const fs = require('fs');
const {execSync} = require('child_process');

// Get the original App.tsx with proper Turkish from git
const blob = execSync('git cat-file -p df479aa:src/App.tsx', {maxBuffer: 10*1024*1024});
let original = blob.toString('utf8');

console.log('Original size:', original.length);

// Verify Turkish chars exist
let turkishCount = 0;
for (let i = 0; i < original.length; i++) {
  const code = original.charCodeAt(i);
  if ([351, 350, 287, 286, 252, 220, 246, 214, 231, 199, 305, 304].includes(code)) turkishCount++;
}
console.log('Turkish characters in original:', turkishCount);

// === Apply Firebase -> REST API changes ===

// 1. Remove Firebase imports
original = original.replace(/import \{ initializeApp \} from ['"]firebase\/app['"];?\s*\n?/g, '');
original = original.replace(/import \{ getFirestore[^}]*\} from ['"]firebase\/firestore['"];?\s*\n?/g, '');
original = original.replace(/import \{ getAuth[^}]*\} from ['"]firebase\/auth['"];?\s*\n?/g, '');

// 2. Add API hooks import (before UserProfile import)
if (!original.includes('useAttendanceMutation')) {
  original = original.replace(
    /import \{ UserProfile/,
    "import { useAttendanceMutation, useSettingsMutation, useLeaveMutation, useOvertimeMutation, useUserMutation } from './api/hooks';\nimport { UserProfile"
  );
}

// 3. Fix verifySession - replace Firebase doc() call with fetch
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

// 4. Remove signInWithCustomToken call
original = original.replace(
  /if \(sessionData\.token\) \{\s*\n\s*await signInWithCustomToken\(auth, sessionData\.token\)\.catch\([^)]*\);\s*\n\s*\}\s*\n/g,
  ''
);

// 5. Fix deletingLeave Firebase call
original = original.replace(
  /const userRef = doc\(db, ['"]users['"], deletingLeave\.userId\);\s*\n\s*const userSnap = await getDoc\(userRef\);\s*\n\s*if \(userSnap\.exists\(\)\) \{\s*\n\s*const userData = userSnap\.data\(\) as UserProfile;\s*\n\s*const currentBalance = getEffectiveLeaveBalance\(userData\);\s*\n\s*await updateDoc\(userRef, \{\s*\n\s*leaveBalance: currentBalance \+ deletingLeave\.days\s*\n\s*\}\);\s*\n\s*\}/,
  `// Balance update handled server-side
        await fetch('/api/users/' + deletingLeave.userId + '/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${JSON.parse(localStorage.getItem('pdks_session') || '{}').token || ''}\` },
          body: JSON.stringify({ action: 'add', days: deletingLeave.days })
        });`
);

// Write as UTF-8
fs.writeFileSync('src/App.tsx', original, 'utf8');

// Final verification
const final = fs.readFileSync('src/App.tsx', 'utf8');
let finalTurkish = 0;
for (let i = 0; i < final.length; i++) {
  const code = final.charCodeAt(i);
  if ([351, 350, 287, 286, 252, 220, 246, 214, 231, 199, 305, 304].includes(code)) finalTurkish++;
}
console.log('Turkish characters in final:', finalTurkish);
console.log('Final size:', final.length);

// Check for remaining Firebase
const firebase = final.match(/from ['"]firebase/g);
console.log('Remaining Firebase imports:', firebase ? firebase.length : 0);
