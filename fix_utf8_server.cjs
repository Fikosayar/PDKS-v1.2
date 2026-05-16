const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

// Fix all corrupted Turkish characters and token references
c = c.replace(/tÇoken/g, 'token');
c = c.replace(/TÇoken/g, 'Token');
c = c.replace(/customTÇoken/g, 'customToken');
c = c.replace(/Ge\uFFFDersiz giri\uFFFD/g, 'Gecersiz giris');
c = c.replace(/\u00C7ok fazla deneme/g, 'Cok fazla deneme');
c = c.replace(/Hatalı\uFFFD ID veya \uFFFDifre/g, 'Hatali ID veya sifre');
c = c.replace(/Hesap devre dışı\uFFFD\uFFFD\uFFFD/g, 'Hesap devre disi');
c = c.replace(/Sistem hatası\uFFFD/g, 'Sistem hatasi');
c = c.replace(/\uFFFDirket bulunamad\uFFFD/g, 'Sirket bulunamadi');

// Also fix any remaining corrupted chars globally
c = c.replace(/\uFFFD/g, '');

// Fix the corrupted Çok pattern
c = c.replace(/ÇÇok/g, 'Cok');

fs.writeFileSync('server.ts', c, 'utf8');
console.log('Fixed all UTF-8 corruption in server.ts');
