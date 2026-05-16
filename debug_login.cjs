const fs = require('fs');
const c = fs.readFileSync('server.ts', 'utf8');
const lines = c.split('\n');
const idx = lines.findIndex(l => l.includes("app.post('/api/login'"));
if (idx !== -1) {
  console.log(lines.slice(idx, idx + 50).join('\n'));
} else {
  console.log('LOGIN ENDPOINT NOT FOUND');
}
