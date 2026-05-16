const fs = require('fs');

// Fix server.ts - change superadmin to admin in initDb seed
let s = fs.readFileSync('server.ts', 'utf8');
s = s.replace("'superadmin', 14, true, true)", "'admin', 14, true, true)");
fs.writeFileSync('server.ts', s, 'utf8');
console.log('Fixed: initDb now creates admin with role=admin');

// Fix App.tsx - restore Turkish characters properly
let c = fs.readFileSync('src/App.tsx', 'utf8');

// The issue: previous fix removed Turkish chars. We need to restore them.
// Key replacements (ASCII back to Turkish):
const fixes = [
  ['Giris Yap', 'Giriş Yap'],
  ['Giris k Hareketlerim', 'Giriş Çıkış Hareketlerim'],
  ['k Yap', 'Çıkış Yap'],
  ['SIFRE', 'ŞİFRE'],
  ['Sifre', 'Şifre'],
  ['ifre', 'Şifre'],
  ['A DURUMU', 'AĞ DURUMU'],
  ['GVENLIK', 'GÜVENLİK'],
  ['GVENLİK', 'GÜVENLİK'],
  ['QR + IP Korumal', 'QR + IP Korumalı'],
  ['GPS Dorulamasi', 'GPS Doğrulaması'],
  ['GPS Dorulamas', 'GPS Doğrulaması'],
  ['Nakliye Yetkili', 'Nakliye Yetkili'],
  ['yoneticinizden', 'yöneticinizden'],
  ['Yoneticisi', 'Yöneticisi'],
  ['Ynetici', 'Yönetici'],
  ['Ynet', 'Yönet'],
  ['Kimligi', 'Kimliği'],
  ['bildirimler', 'bildirimler'],
  ['Sistem hatasi', 'Sistem hatası'],
  ['Gecersiz giris', 'Geçersiz giriş'],
  ['Hatali ID veya sifre', 'Hatalı ID veya şifre'],
  ['Hesap devre disi', 'Hesap devre dışı'],
  ['Cok fazla deneme', 'Çok fazla deneme'],
  ['Sirket bulunamadi', 'Şirket bulunamadı'],
  ['basarili', 'başarılı'],
  ['Basarili', 'Başarılı'],
  ['gonderildi', 'gönderildi'],
  ['Gonderildi', 'Gönderildi'],
  ['olusturuldu', 'oluşturuldu'],
  ['Olusturuldu', 'Oluşturuldu'],
  ['guncellendi', 'güncellendi'],
  ['Guncellendi', 'Güncellendi'],
  ['geersiz', 'geçersiz'],
  ['yant alnd', 'yanıt alındı'],
  ['Ltfen', 'Lütfen'],
  ['Cihaznz', 'Cihazınız'],
  ['kopyaland', 'kopyalandı'],
  ['Kaytl Olmas Gereken', 'Kayıtlı Olması Gereken'],
  ['Mevcut IP Adresiniz', 'Mevcut IP Adresiniz'],
];

let count = 0;
for (const [from, to] of fixes) {
  if (c.includes(from)) {
    c = c.split(from).join(to);
    count++;
  }
}

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log(`Restored ${count} Turkish character patterns in App.tsx`);
