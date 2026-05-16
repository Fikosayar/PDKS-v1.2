const fs = require('fs');

let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(/clientTimestamp\s*\n\s*\}\);/g, "clientTimestamp } });");
c = c.replace(/errorMessage: '(.*?)'\s*\n\s*\}\);/g, "errorMessage: '$1' } });");
c = c.replace(/timestamp: new Date\(\)\.toISOString\(\),\s*\n\s*\}\);/g, "timestamp: new Date().toISOString() } });");
c = c.replace(/\.\.\.\(isAdminOrManager \? \{ manualEntry: true, isRemote: false, remoteNote: null \} : \{\}\),\n\s*\}\);/g, "...(isAdminOrManager ? { manualEntry: true, isRemote: false, remoteNote: null } : {}),\n        } });");
c = c.replace(/\.\.\.\(isAdminOrManager \? \{\} : \{ remoteNote: 'Geçmiş Kayıt \(Onay Bekliyor\)' \}\),\n\s*\}\);/g, "...(isAdminOrManager ? {} : { remoteNote: 'Geçmiş Kayıt (Onay Bekliyor)' }),\n        } });");

// One more place:
c = c.replace(/timestamp: new Date\(\)\.toISOString\(\),\s*\n\s*\}\);/g, "timestamp: new Date().toISOString() } });");
c = c.replace(/clientTimestamp\s*\n\s*\}\);/g, "clientTimestamp } });");

fs.writeFileSync('src/App.tsx', c, 'utf8');
