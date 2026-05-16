const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// Remove the signInWithCustomToken line and its surrounding if block
c = c.replace(
  /          if \(sessionData\.token\) \{\r?\n\s*await signInWithCustomToken\(auth, sessionData\.token\)\.catch\(e => console\.error\("Background re-auth error:", e\)\);\r?\n\s*\}\r?\n/,
  ''
);

// Fix the comment
c = c.replace('// Verify session with Firestore', '// Verify session with API');

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log('Done - removed signInWithCustomToken');
