// Türkiye Resmi Tatil Günleri ve İş Mantığı
// Dinamik tatil hesaplaması: yıla göre otomatik güncellenir

export interface PublicHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  isHalfDay?: boolean;
}

// Sabit resmi tatiller (her yıl aynı tarihte)
function getFixedHolidays(year: number): PublicHoliday[] {
  return [
    { date: `${year}-01-01`, name: 'Yılbaşı' },
    { date: `${year}-04-23`, name: 'Ulusal Egemenlik ve Çocuk Bayramı' },
    { date: `${year}-05-01`, name: 'Emek ve Dayanışma Günü' },
    { date: `${year}-05-19`, name: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı' },
    { date: `${year}-07-15`, name: 'Demokrasi ve Milli Birlik Günü' },
    { date: `${year}-08-30`, name: 'Zafer Bayramı' },
    { date: `${year}-10-28`, name: 'Cumhuriyet Bayramı Arifesi', isHalfDay: true },
    { date: `${year}-10-29`, name: 'Cumhuriyet Bayramı' },
  ];
}

// Dini tatiller (her yıl değişir - Hicri takvime göre)
// Not: Bu tarihler Diyanet duyurularına göre her yıl güncellenmeli
const RELIGIOUS_HOLIDAYS: Record<number, PublicHoliday[]> = {
  2025: [
    { date: '2025-03-29', name: 'Ramazan Bayramı Arifesi', isHalfDay: true },
    { date: '2025-03-30', name: 'Ramazan Bayramı (1. Gün)' },
    { date: '2025-03-31', name: 'Ramazan Bayramı (2. Gün)' },
    { date: '2025-04-01', name: 'Ramazan Bayramı (3. Gün)' },
    { date: '2025-06-05', name: 'Kurban Bayramı Arifesi', isHalfDay: true },
    { date: '2025-06-06', name: 'Kurban Bayramı (1. Gün)' },
    { date: '2025-06-07', name: 'Kurban Bayramı (2. Gün)' },
    { date: '2025-06-08', name: 'Kurban Bayramı (3. Gün)' },
    { date: '2025-06-09', name: 'Kurban Bayramı (4. Gün)' },
  ],
  2026: [
    { date: '2026-03-19', name: 'Ramazan Bayramı Arifesi', isHalfDay: true },
    { date: '2026-03-20', name: 'Ramazan Bayramı (1. Gün)' },
    { date: '2026-03-21', name: 'Ramazan Bayramı (2. Gün)' },
    { date: '2026-03-22', name: 'Ramazan Bayramı (3. Gün)' },
    { date: '2026-05-26', name: 'Kurban Bayramı Arifesi', isHalfDay: true },
    { date: '2026-05-27', name: 'Kurban Bayramı (1. Gün)' },
    { date: '2026-05-28', name: 'Kurban Bayramı (2. Gün)' },
    { date: '2026-05-29', name: 'Kurban Bayramı (3. Gün)' },
    { date: '2026-05-30', name: 'Kurban Bayramı (4. Gün)' },
  ],
  2027: [
    { date: '2027-03-09', name: 'Ramazan Bayramı Arifesi', isHalfDay: true },
    { date: '2027-03-10', name: 'Ramazan Bayramı (1. Gün)' },
    { date: '2027-03-11', name: 'Ramazan Bayramı (2. Gün)' },
    { date: '2027-03-12', name: 'Ramazan Bayramı (3. Gün)' },
    { date: '2027-05-15', name: 'Kurban Bayramı Arifesi', isHalfDay: true },
    { date: '2027-05-16', name: 'Kurban Bayramı (1. Gün)' },
    { date: '2027-05-17', name: 'Kurban Bayramı (2. Gün)' },
    { date: '2027-05-18', name: 'Kurban Bayramı (3. Gün)' },
    { date: '2027-05-19', name: 'Kurban Bayramı (4. Gün)' },
  ],
};

// Cache - yılın tatillerini hesapla ve sakla
const holidayCache = new Map<number, PublicHoliday[]>();

export function getHolidaysForYear(year: number): PublicHoliday[] {
  if (holidayCache.has(year)) {
    return holidayCache.get(year)!;
  }
  
  const fixed = getFixedHolidays(year);
  const religious = RELIGIOUS_HOLIDAYS[year] || [];
  
  if (religious.length === 0) {
    console.warn(`[Holidays] ${year} yılı için dini tatil tarihleri tanımlanmamış. Lütfen holidays.ts dosyasını güncelleyin.`);
  }
  
  const all = [...fixed, ...religious].sort((a, b) => a.date.localeCompare(b.date));
  holidayCache.set(year, all);
  return all;
}

export function getHoliday(dateStr: string): PublicHoliday | undefined {
  const year = parseInt(dateStr.substring(0, 4));
  const holidays = getHolidaysForYear(year);
  return holidays.find(h => h.date === dateStr);
}

export function isHoliday(dateStr: string): boolean {
  return !!getHoliday(dateStr);
}
