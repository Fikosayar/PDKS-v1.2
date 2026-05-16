# App.tsx Bölme Planı

## Mevcut Durum: 5064 satır

## Hedef Yapı

```
src/
├── App.tsx                    (~600 satır - sadece state, routing, modals)
├── hooks/
│   └── useAppState.ts         (~400 satır - tüm state ve fonksiyonlar)
├── pages/
│   ├── HomePage.tsx            (~450 satır)
│   ├── MovementsPage.tsx       (~400 satır)  
│   ├── UsersPage.tsx           (~200 satır)
│   ├── SettingsPage.tsx        (~250 satır)
│   ├── LeavesPage.tsx          (✅ mevcut)
│   ├── ApprovalsPage.tsx       (✅ mevcut)
│   └── ProfilePage.tsx         (~800 satır)
├── components/
│   ├── BottomNav.tsx           (✅ mevcut)
│   ├── QRScanner.tsx           (✅ mevcut)
│   └── Modals.tsx              (~500 satır - tüm modallar)
└── lib/
    ├── utils.ts                (✅ mevcut)
    ├── theme.ts                (✅ mevcut)
    └── holidays.ts             (✅ mevcut)
```

## Sıra
1. ProfilePage çıkar (800 satır - en büyük)
2. HomePage çıkar (450 satır)
3. MovementsPage çıkar (400 satır)
4. UsersPage + SettingsPage çıkar (450 satır)
5. Modals ayrıştır
