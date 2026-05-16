const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// Comprehensive Turkish character restoration
// Based on screenshots and full text analysis
const fixes = [
  // === SETTINGS PAGE ===
  ['Ayarlar Gncelle', 'Ayarları Güncelle'],
  ['RKET GENEL BLGLER', 'ŞİRKET GENEL BİLGİLERİ'],
  ['RKET AD', 'ŞİRKET ADI'],
  ['rn: ABC Y', 'Örn: ABC Yazılım'],
  ['HAFTALK CALSMA GN', 'HAFTALIK ÇALIŞMA GÜN'],
  ['HAFTALK CALISMA GN', 'HAFTALIK ÇALIŞMA GÜN'],
  ['5 Gn', '5 Gün'],
  ['VARDYA & CALSMA SAATLER', 'VARDİYA & ÇALIŞMA SAATLERİ'],
  ['VARDYA & CALISMA SAATLER', 'VARDİYA & ÇALIŞMA SAATLERİ'],
  ['MESA BALANGC', 'MESAİ BAŞLANGIÇ'],
  ['MESAİ BALANGC', 'MESAİ BAŞLANGIÇI'],
  ['MESA BTT', 'MESAİ BİTİŞİ'],
  ['MESA BT', 'MESAİ BİTİŞİ'],
  ['MESAİ BTİ', 'MESAİ BİTİŞİ'],
  ['MESAİ BİTİİ', 'MESAİ BİTİŞİ'],
  ['GVENLK & ERM', 'GÜVENLİK & ERİŞİM'],
  ['GVENLİK & ERİİM', 'GÜVENLİK & ERİŞİM'],
  ['GVENLIK & ERIIM', 'GÜVENLİK & ERİŞİM'],
  ['YER IP ADRES', 'YERELl IP ADRESİ'],
  ['YERİ IP ADRESİ', 'YEREL IP ADRESİ'],
  ['rn: 176', 'Örn: 176'],
  ['QR ierii ne olmal', 'QR içeriği ne olmalı'],
  ['Henz mola kural tanmlanmad', 'Henüz mola kuralı tanımlanmadı'],
  ['Standart kanun kurallar uygulanr', 'Standart kanun kuralları uygulanır'],
  ['Yeri Giris QR Kodu', 'Yerinde Giriş QR Kodu'],
  ['Yeri Giriş QR Kodu', 'Yerinde Giriş QR Kodu'],
  ['Bu kodu yazdrp i yerine asabilirsiniz', 'Bu kodu yazdırıp iş yerine asabilirsiniz'],
  ['Bu kodu yazdrp', 'Bu kodu yazdırıp'],
  ['Yazdr', 'Yazdır'],

  // === PERSONNEL PAGE ===
  ['NVAN / POZSYON', 'ÜNVAN / POZİSYON'],
  ['NVAN / POZİSYON', 'ÜNVAN / POZİSYON'],
  ['rn: Yazlm Gelitirici', 'Örn: Yazılım Geliştirici'],
  ['Blm Mdr', 'Bölüm Müdür'],
  ['rn: Ahmet Ylmaz', 'Örn: Ahmet Yılmaz'],
  ['FRE', 'ŞİFRE'],  
  ['ifre belirleyin', 'Şifre belirleyin'],
  ['BAL OLDUU YNETC', 'BAĞLI OLDUĞU YÖNETİCİ'],
  ['BAL OLDUU YÖNETİCİ', 'BAĞLI OLDUĞU YÖNETİCİ'],
  ['YLLK ZN BAKYES', 'YILLIK İZİN BAKİYESİ'],
  ['YLLK IZİN BAKİYESİ (GN)', 'YILLIK İZİN BAKİYESİ (GÜN)'],
  ['E GR TARH', 'İŞE GİRİŞ TARİHİ'],
  ['E GİRİŞ TARİHİ', 'İŞE GİRİŞ TARİHİ'],
  ['DOUM TARH', 'DOĞUM TARİHİ'],
  ['DOUM TARİHİ', 'DOĞUM TARİHİ'],
  ['CHAZ KSTLAMASI', 'CİHAZ KISITLAMASI'],
  ['CİHAZ KSTLAMASI', 'CİHAZ KISITLAMASI'],
  ['UA ER', 'UA ERİŞİMİ'],
  ['UA ERİİ', 'UA ERİŞİMİ'],
  ['rn: iPhone', 'Örn: iPhone'],
  ['Otomatik tanmlanr', 'Otomatik tanımlanır'],
  ['Uzaktan Giris Yetkisi', 'Uzaktan Giriş Yetkisi'],
  ['ofis dndan', 'ofis dışından'],
  ['giri-k yapabilir', 'giriş-çıkış yapabilir'],
  ['giriş-k yapabilir', 'giriş-çıkış yapabilir'],
  ['yoneticileri bildirim alr', 'yöneticileri bildirim alır'],

  // === GENERAL UI ===
  ['Giriş k Hareketlerim', 'Giriş Çıkış Hareketlerim'],
  ['Giris k Hareketlerim', 'Giriş Çıkış Hareketlerim'],
  ['k Yap', 'Çıkış Yap'],
  ['A DURUMU', 'AĞ DURUMU'],
  ['GVENLK', 'GÜVENLİK'],
  ['GVENLİK', 'GÜVENLİK'],
  ['QR + IP Korumal', 'QR + IP Korumalı'],
  ['GPS Dorulamas', 'GPS Doğrulaması'],
  ['Takvime Ekle', 'Takvime Ekle'],

  // === COMMON WORDS ===
  ['Ynetici', 'Yönetici'],
  ['ynetici', 'yönetici'],
  ['Ynet', 'Yönet'],
  ['irket', 'Şirket'],
  ['alsan', 'Çalışan'],
  ['alsma', 'Çalışma'],
  ['calsma', 'çalışma'],
  ['geersiz', 'geçersiz'],
  ['Geersiz', 'Geçersiz'],
  ['yant alnd', 'yanıt alındı'],
  ['Ltfen', 'Lütfen'],
  ['ltfen', 'lütfen'],
  ['Cihaznz', 'Cihazınız'],
  ['kopyaland', 'kopyalandı'],
  ['Kaytl', 'Kayıtlı'],
  ['kaytl', 'kayıtlı'],
  ['deitir', 'değiştir'],
  ['Deitir', 'Değiştir'],
  ['bildirim', 'bildirim'],
  ['onaylad', 'onayladı'],
  ['reddedild', 'reddedildi'],
  ['silind', 'silindi'],
  ['eklend', 'eklendi'],
  ['gncellenmed', 'güncellenmedi'],
  ['oluturuldu', 'oluşturuldu'],
  ['oluşturuldu', 'oluşturuldu'],
  ['gncellendi', 'güncellendi'],
  ['gnderildi', 'gönderildi'],
  ['deiiklik', 'değişiklik'],
  ['Deiiklik', 'Değişiklik'],
  ['tamamland', 'tamamlandı'],
  ['zorunludur', 'zorunludur'],
  ['bulunmamaktadr', 'bulunmamaktadır'],
  ['giriniz', 'giriniz'],
  ['kaldrlacak', 'kaldırılacak'],
  ['onayland', 'onaylandı'],
  ['Onayland', 'Onaylandı'],
  ['iptal edildi', 'iptal edildi'],
  ['dzenlendi', 'düzenlendi'],
  ['Dzenlendi', 'Düzenlendi'],
  ['bakiye', 'bakiye'],
  ['yldr', 'yıldır'],
  ['Yl', 'Yıl'],
  ['yl', 'yıl'],
  ['rn:', 'Örn:'],
  ['rnek:', 'Örnek:'],
  
  // Fix double ŞŞ issue from previous fix
  ['ŞŞİFRE', 'ŞİFRE'],
  ['ŞŞifre', 'Şifre'],
  
  // Fix Ö mappings (rn -> Örn was too aggressive, be specific)
  // These are placeholder strings only
];

let count = 0;
for (const [from, to] of fixes) {
  if (from === to) continue; // skip identical
  const before = c;
  c = c.split(from).join(to);
  if (c !== before) {
    const occurrences = (before.split(from).length - 1);
    console.log(`  Fixed: "${from}" -> "${to}" (${occurrences}x)`);
    count += occurrences;
  }
}

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log(`\nTotal: ${count} replacements made`);
