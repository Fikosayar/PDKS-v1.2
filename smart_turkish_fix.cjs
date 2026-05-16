const fs = require('fs');
const {execSync} = require('child_process');

// Get the ORIGINAL App.tsx (with correct Turkish) from first commit
const origBlob = execSync('git cat-file -p df479aa:src/App.tsx', {maxBuffer: 10*1024*1024});
const original = origBlob.toString('utf8');

// Get the CURRENT App.tsx (working but broken Turkish) from last good commit
execSync('git checkout 7ac0122 -- src/App.tsx');
let current = fs.readFileSync('src/App.tsx', 'utf8');

// Extract all quoted strings from original that contain Turkish chars
const turkishChars = /[\u015f\u015e\u011f\u011e\u00fc\u00dc\u00f6\u00d6\u00e7\u00c7\u0131\u0130]/;
const stringRegex = /(['"`])([^'"`\n]{2,80})\1/g;

const originalStrings = new Map();
let match;
while ((match = stringRegex.exec(original)) !== null) {
  const str = match[2];
  if (turkishChars.test(str)) {
    // Create a "stripped" version (no Turkish special chars) for matching
    const stripped = str
      .replace(/ş/g, '').replace(/Ş/g, '').replace(/ğ/g, '').replace(/Ğ/g, '')
      .replace(/ü/g, '').replace(/Ü/g, '').replace(/ö/g, '').replace(/Ö/g, '')
      .replace(/ç/g, '').replace(/Ç/g, '').replace(/ı/g, '').replace(/İ/g, 'I')
      .trim();
    if (stripped.length >= 3) {
      originalStrings.set(stripped, str);
    }
  }
}
console.log('Found', originalStrings.size, 'unique Turkish strings in original');

// Now find matching broken strings in current and replace
let replacements = 0;
for (const [stripped, correct] of originalStrings) {
  // Try to find the broken version in current
  if (current.includes(correct)) continue; // Already correct
  
  // The broken version has the same letters minus Turkish special chars
  // Try to find it
  if (current.includes(stripped)) {
    current = current.split(stripped).join(correct);
    replacements++;
  }
}

console.log('Made', replacements, 'replacements');

// Also do specific manual fixes based on screenshots
const manualFixes = [
  // Double letter issues from previous fixes
  ['ÖÖrn:', 'Örn:'],
  ['ŞŞifre', 'Şifre'],
  ['ŞŞİFRE', 'ŞİFRE'],
  
  // Settings page
  ['HAFTALK', 'HAFTALIK'],
  ['CALISMA', 'ÇALIŞMA'],
  ['CALİSMA', 'ÇALIŞMA'],
  ['BALANGC', 'BAŞLANGIÇI'],
  ['GVENLİK', 'GÜVENLİK'],
  ['GVENLIK', 'GÜVENLİK'],
  ['ERİİM', 'ERİŞİM'],
  ['ERIIM', 'ERİŞİM'],
  ['BİTİİ', 'BİTİŞİ'],
  ['BTİ', 'BİTİŞİ'],
  ['İRKET', 'ŞİRKET'],
  ['YERİ IP', 'YEREL IP'],
  
  // Personnel page
  ['NVAN', 'ÜNVAN'],
  ['BAL OLDUU', 'BAĞLI OLDUĞU'],
  ['YLLK', 'YILLIK'],
  ['(GN)', '(GÜN)'],
  ['E GİRİŞ', 'İŞE GİRİŞ'],
  ['DOUM', 'DOĞUM'],
  ['KSTLAMAS', 'KISITLAMASI'],
  ['UA ERİİ', 'UA ERİŞİMİ'],
  
  // Dashboard
  ['U AN OFİSTE', 'ŞU AN OFİSTE'],
  ['U AN OFISTE', 'ŞU AN OFİSTE'],
  ['IZİNLİ', 'İZİNLİ'],
  ['IZINLI', 'İZİNLİ'],
  ['GE KALAN', 'GEÇ KALAN'],
  ['GEC KALAN', 'GEÇ KALAN'],
  ['Detay iin tkla', 'Detay için tıkla'],
  ['A DURUMU', 'AĞ DURUMU'],
  ['AG DURUMU', 'AĞ DURUMU'],
  ['Korumal', 'Korumalı'],
  ['Dorulamas', 'Doğrulaması'],
  
  // Common words
  ['Ynetici', 'Yönetici'],
  ['Yoneticisi', 'Yöneticisi'],
  ['ynetici', 'yönetici'],
  ['yoneticileri', 'yöneticileri'],
  ['Gncelle', 'Güncelle'],
  ['gncelle', 'güncelle'],
  ['Dzenle', 'Düzenle'],
  ['dzenle', 'düzenle'],
  ['Deitir', 'Değiştir'],
  ['deitir', 'değiştir'],
  ['Deiiklik', 'Değişiklik'],
  ['deiiklik', 'değişiklik'],
  ['Geersiz', 'Geçersiz'],
  ['geersiz', 'geçersiz'],
  ['baary', 'başarı'],
  ['Baary', 'Başarı'],
  ['baaryl', 'başarıyla'],
  ['Kaytl', 'Kayıtlı'],
  ['kaytl', 'kayıtlı'],
  ['Ltfen', 'Lütfen'],
  ['ltfen', 'lütfen'],
  ['Yazdr', 'Yazdır'],
  ['yazdr', 'yazdır'],
  ['tanmlan', 'tanımlan'],
  ['tanmla', 'tanımla'],
  ['kopyaland', 'kopyalandı'],
  ['silind', 'silindi'],
  ['eklend', 'eklendi'],
  ['onayland', 'onaylandı'],
  ['Onayland', 'Onaylandı'],
  ['reddedild', 'reddedildi'],
  ['gster', 'göster'],
  ['Gster', 'Göster'],
  ['kaldrl', 'kaldırıl'],
  ['alr.', 'alır.'],
  ['Cihaznz', 'Cihazınız'],
  ['irket', 'Şirket'],
  ['alsan', 'Çalışan'],
  ['calsma', 'çalışma'],
  ['dndan', 'dışından'],
  ['giri-k', 'giriş-çıkış'],
  ['Giris Yap', 'Giriş Yap'],
  ['k Yap', 'Çıkış Yap'],
  ['Giris k', 'Giriş Çıkış'],
  ['SİM', 'İSİM'],
  ['LEM', 'İŞLEM'],
];

for (const [from, to] of manualFixes) {
  if (from === to) continue;
  if (current.includes(from) && !current.includes(to)) {
    current = current.split(from).join(to);
    replacements++;
  }
}

fs.writeFileSync('src/App.tsx', current, 'utf8');

// Final count
let turkishFinal = 0;
for (let i = 0; i < current.length; i++) {
  const code = current.charCodeAt(i);
  if ([351, 350, 287, 286, 252, 220, 246, 214, 231, 199, 305, 304].includes(code)) turkishFinal++;
}
console.log('Turkish chars in final file:', turkishFinal);
