const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

const fixes = [
  ['U AN OFİSTE', 'ŞU AN OFİSTE'],
  ['U AN OFISTE', 'ŞU AN OFİSTE'],
  ['Detay iin tkla', 'Detay için tıkla'],
  ['IZİNLİ', 'İZİNLİ'],
  ['IZINLI', 'İZİNLİ'],
  ['GE KALAN', 'GEÇ KALAN'],
  ['GEC KALAN', 'GEÇ KALAN'],
  ['A DURUMU', 'AĞ DURUMU'],
  ['AG DURUMU', 'AĞ DURUMU'],
  ['GVENLİK', 'GÜVENLİK'],
  ['GVENLIK', 'GÜVENLİK'],
  ['QR + IP Korumalııı', 'QR + IP Korumalı']
];

let replaced = 0;
for (const [from, to] of fixes) {
  if (c.includes(from) && from !== to) {
    const count = c.split(from).length - 1;
    c = c.split(from).join(to);
    console.log(`Fixed: '${from}' -> '${to}' (${count}x)`);
    replaced += count;
  }
}

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log('Total fixed:', replaced);
