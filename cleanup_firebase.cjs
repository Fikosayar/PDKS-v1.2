const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// Remove firebase import lines
const lines = c.split('\n');
const filtered = lines.filter(l => {
  if (l.includes("from 'firebase")) return false;
  if (l.includes('from "firebase')) return false;
  return true;
});
c = filtered.join('\n');

// Remove firebaseConfig block
c = c.replace(/const firebaseConfig[\s\S]*?const auth = getAuth\(app\);/g, '');
c = c.replace(/\/\/ Initialize Firebase[\s\S]*?const auth = getAuth\(app\);/g, '');
c = c.replace(/const app = initializeApp\(firebaseConfig\);[\s\S]*?const auth = getAuth\(app\);/g, '');

// Remove any standalone firebase variable declarations
c = c.replace(/const db = getFirestore\(app\);\s*\n?/g, '');
c = c.replace(/const auth = getAuth\(app\);\s*\n?/g, '');

fs.writeFileSync('src/App.tsx', c, 'utf8');

const final = fs.readFileSync('src/App.tsx', 'utf8');
const fb = (final.match(/firebase/gi) || []);
console.log('firebase mentions left:', fb.length);

// Verify build will work - check for remaining doc(db calls
const docCalls = (final.match(/doc\(db/g) || []);
console.log('doc(db calls left:', docCalls.length);
const signIn = (final.match(/signInWithCustomToken/g) || []);
console.log('signInWithCustomToken left:', signIn.length);
