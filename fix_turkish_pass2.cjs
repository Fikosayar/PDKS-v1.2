const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// Second pass - more targeted fixes based on screenshot analysis
const fixes2 = [
  // Settings page remaining
  ['RKET GENEL BLGLERİ', 'ŞİRKET GENEL BİLGİLERİ'],
  ['İRKET GENEL BİLGİLERİ', 'ŞİRKET GENEL BİLGİLERİ'],
  ['RKET AD', 'ŞİRKET ADI'],
  ['İRKET AD', 'ŞİRKET ADI'],
  ['HAFTALK', 'HAFTALIK'],
  ['CALİSMA', 'ÇALIŞMA'],
  ['CALISMA', 'ÇALIŞMA'],
  ['BALANGC', 'BAŞLANGIÇI'],
  ['MESAİ BAŞLANGIÇI', 'MESAİ BAŞLANGIÇI'],  // keep correct
  ['BTİ', 'BİTİŞİ'],
  ['BİTİİ', 'BİTİŞİ'],
  ['GVENLİK', 'GÜVENLİK'],
  ['GVENLIK', 'GÜVENLİK'],
  ['ERİİM', 'ERİŞİM'],
  ['ERIIM', 'ERİŞİM'],
  ['YERİ IP', 'YEREL IP'],
  
  // Personnel page remaining  
  ['NVAN', 'ÜNVAN'],
  ['BAL OLDUU', 'BAĞLI OLDUĞU'],
  ['YLLK IZN', 'YILLIK İZİN'],
  ['YLLK İZİN', 'YILLIK İZİN'],
  ['(GN)', '(GÜN)'],
  ['E GİRİŞ', 'İŞE GİRİŞ'],
  ['DOUM', 'DOĞUM'],
  ['KSTLAMASI', 'KISITLAMASI'],
  ['UA ERİŞİMİ', 'UA ERİŞİMİ'],  // keep correct
  
  // Common Turkish words that are broken
  ['Çıkış Yap', 'Çıkış Yap'],  // keep
  ['alışan', 'Çalışan'],
  ['giri', 'giriş'],  // too aggressive, skip
  
  // Fix remaining broken words found in text
  ['gncelle', 'güncelle'],
  ['gncel', 'güncel'],
  ['dzenle', 'düzenle'],
  ['Dzenle', 'Düzenle'],
  ['baaryl', 'başarıyla'],
  ['baary', 'başarı'],
  ['Baary', 'Başarı'],
  ['alr', 'alır'],
  ['gelitirici', 'geliştirici'],
  ['blm', 'bölüm'],
  ['mdr', 'müdür'],
  ['tarihi', 'tarihi'],
  ['tanmlan', 'tanımlan'],
  ['tanmla', 'tanımla'],
  ['ynetim', 'yönetim'],
  ['Ynetim', 'Yönetim'],
  ['ynetici', 'yönetici'],
  ['Ynetici', 'Yönetici'],
  ['bildirim', 'bildirim'], // keep
  ['deiikli', 'değişikli'],
  ['deerlendir', 'değerlendir'],
  ['dzelt', 'düzelt'],
  ['gster', 'göster'],
  ['Gster', 'Göster'],
  ['kaldrl', 'kaldırıl'],
  ['gizle', 'gizle'],
  ['sresiz', 'süresiz'],
  ['sre', 'süre'],
  ['nakliye', 'nakliye'], // keep
  ['personel', 'personel'], // keep
];

let count = 0;
for (const [from, to] of fixes2) {
  if (from === to) continue;
  const before = c;
  c = c.split(from).join(to);
  if (c !== before) {
    const occurrences = (before.split(from).length - 1);
    console.log(`  Fixed: "${from}" -> "${to}" (${occurrences}x)`);
    count += occurrences;
  }
}

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log(`\nSecond pass total: ${count} replacements made`);
