const fs = require('fs');

let c = fs.readFileSync('src/App.tsx', 'utf8');

// The ultimate, careful cleanup script
const manualFixes = [
  // Fix my accidental double-replacements
  ['ÖÖrn', 'Örn'],
  ['ŞŞifre', 'Şifre'],
  ['ŞŞİFRE', 'ŞİFRE'],
  
  // Settings page
  ['HAFTALK', 'HAFTALIK'],
  ['CALİSMA', 'ÇALIŞMA'],
  ['CALISMA', 'ÇALIŞMA'],
  ['BALANGC', 'BAŞLANGIÇ'],
  ['MESAİ BAŞLANGIÇI', 'MESAİ BAŞLANGIÇ'], // Fix the weird one
  ['BTİ', 'BİTİŞ'],
  ['BİTİİ', 'BİTİŞ'],
  ['BİTİŞİ', 'BİTİŞ'], // Normalize
  ['GVENLİK', 'GÜVENLİK'],
  ['ERİİM', 'ERİŞİM'],
  ['YERİ IP', 'YEREL IP'],
  ['QR ierii ne olmalı', 'QR içeriği ne olmalı'],
  ['Yazlm', 'Yazılım'],
  ['yazlm', 'yazılım'],
  
  // Personnel page
  ['NVAN', 'ÜNVAN'],
  ['BAL OLDUU', 'BAĞLI OLDUĞU'],
  ['YLLK', 'YILLIK'],
  ['E GİRİŞ', 'İŞE GİRİŞ'],
  ['DOUM', 'DOĞUM'],
  ['KSTLAMASI', 'KISITLAMASI'],
  ['UA ERİİ', 'UA ERİŞİMİ'],
  
  // Dashboard & Misc
  ['U AN OFİSTE', 'ŞU AN OFİSTE'],
  ['U AN OFISTE', 'ŞU AN OFİSTE'],
  ['GE KALAN', 'GEÇ KALAN'],
  ['GEC KALAN', 'GEÇ KALAN'],
  ['A DURUMU', 'AĞ DURUMU'],
  ['Dorulamas', 'Doğrulaması'],
  ['Korumal', 'Korumalı'],
  ['kopyalandıı', 'kopyalandı'], // Just in case
];

let replaced = 0;
for (const [from, to] of manualFixes) {
  if (c.includes(from) && from !== to) {
    const beforeCount = c.split(from).length - 1;
    c = c.split(from).join(to);
    console.log(`Fixed "${from}" -> "${to}" (${beforeCount} times)`);
    replaced += beforeCount;
  }
}

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log('Total manual typo fixes:', replaced);
