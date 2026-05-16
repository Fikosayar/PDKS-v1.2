const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// Find all replacement-character (U+FFFD) occurrences and fix them
// Common Turkish chars: ş, ğ, ü, ö, ç, ı, İ, Ş, Ğ, Ü, Ö, Ç
// The pattern is usually: correct_char gets replaced by U+FFFD

// Let's find context around each U+FFFD and fix known patterns
const replacements = [
  // Login page
  [/Giri\uFFFD Yap/g, 'Giris Yap'],
  [/Giri\uFFFD/g, 'Giris'],
  [/\uFFFDifre/g, 'Sifre'],
  [/\uFFFDFRE/g, 'SIFRE'],
  [/\uFFFDIFRE/g, 'SIFRE'],
  [/y\uFFFDneticinizden/g, 'yoneticinizden'],
  [/Y\uFFFDneticisi/g, 'Yoneticisi'],
  [/y\uFFFDnetici/g, 'yonetici'],
  [/Kimli\uFFFDi/g, 'Kimligi'],
  [/bilgilerinizi/g, 'bilgilerinizi'],
  [/\u00c7\u0131k\u0131\u015f/g, 'Cikis'],
  
  // General UI strings
  [/\uFFFDal\uFFFD\uFFFDma/g, 'Calisma'],
  [/\uFFFDal\uFFFD\uFFFDan/g, 'Calisan'],
  [/Ba\uFFFDar\uFFFDl\uFFFD/g, 'Basarili'],
  [/ba\uFFFDar\uFFFDl\uFFFD/g, 'basarili'],
  [/g\uFFFDnderildi/g, 'gonderildi'],
  [/G\uFFFDnderildi/g, 'Gonderildi'],
  [/olu\uFFFDturuldu/g, 'olusturuldu'],
  [/Olu\uFFFDturuldu/g, 'Olusturuldu'],
  [/g\uFFFDncellendi/g, 'guncellendi'],
  [/G\uFFFDncellendi/g, 'Guncellendi'],
  [/d\uFFFDzenlendi/g, 'duzenlendi'],
  [/\uFFFDzin/g, 'Izin'],
  [/\uFFFDzg\uFFFDn/g, 'Ozgun'],
  [/mesai/g, 'mesai'],
  [/onay/g, 'onay'],
  
  // Clean up any remaining U+FFFD
  [/\uFFFD/g, ''],
];

let count = 0;
for (const [pattern, replacement] of replacements) {
  const before = c;
  c = c.replace(pattern, replacement);
  if (c !== before) count++;
}

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log(`Fixed ${count} UTF-8 patterns in App.tsx`);

// Count remaining U+FFFD
const remaining = (c.match(/\uFFFD/g) || []).length;
console.log(`Remaining U+FFFD characters: ${remaining}`);
