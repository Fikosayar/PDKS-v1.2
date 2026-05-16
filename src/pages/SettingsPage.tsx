import React from 'react';
import { QrCode, Printer, Key, Settings as SettingsIcon, Trash2, Info } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { GlobalSettings } from '../types';

interface SettingsPageProps {
  settings: GlobalSettings | null;
  setSettings: React.Dispatch<React.SetStateAction<GlobalSettings | null>>;
  handlePrintQR: () => void;
  regenerateQRSecret: () => void;
  updateSettings: (e: React.FormEvent) => void;
}

export default function SettingsPage({
  settings, setSettings, handlePrintQR, regenerateQRSecret, updateSettings
}: SettingsPageProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <QrCode size={28} className="text-orange-500" /> QR Kod Oluşturucu
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QR Code Display */}
        <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 p-8 flex flex-col items-center justify-center space-y-6">
          <div className="rounded-2xl bg-white p-4">
            <QRCodeSVG 
              id="qr-code-svg"
              value={settings?.qrSecret || 'PDKS-SECRET'} 
              size={200}
              level="H"
              includeMargin={false}
            />
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">İş Yeri Giriş QR Kodu</p>
            <p className="text-sm text-zinc-500">Bu kodu yazdırıp iş yerine asabilirsiniz.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handlePrintQR}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-2 text-sm font-bold hover:bg-orange-600 transition-colors"
            >
              <Printer size={18} /> Yazdır
            </button>
            <button 
              onClick={regenerateQRSecret}
              className="flex items-center gap-2 rounded-xl bg-zinc-800 px-6 py-2 text-sm font-bold hover:bg-zinc-700 transition-colors text-zinc-400"
            >
              <Key size={18} /> Kodu Yenile
            </button>
          </div>
        </div>

        {/* Settings Form */}
        <div className="space-y-6">
          <section className="rounded-3xl border border-zinc-900 bg-zinc-900/20 p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <SettingsIcon size={20} className="text-orange-500" /> Ayarları Güncelle
            </h3>
            <form onSubmit={updateSettings} className="space-y-6">
              {/* Şirket Bilgileri */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800 pb-1">Şirket Genel Bilgileri</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Şirket Adı</label>
                    <input name="companyName" defaultValue={settings?.companyName} placeholder="Örn: ABC Yazılım Ltd. Şti."
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Haftalık Çalışma Günü</label>
                    <select name="workDaysPerWeek" defaultValue={settings?.workDaysPerWeek || 6}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none">
                      <option value="5">5 Gün</option>
                      <option value="6">6 Gün</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase flex items-center gap-1">
                      Hesaplama Toleransı (Dk) <Info size={12} className="text-zinc-600" title="Geç giriş/erken çıkış/fazla mesai toleransı" />
                    </label>
                    <input name="roundingThresholdMinutes" type="number" defaultValue={settings?.roundingThresholdMinutes || 30}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" />
                  </div>
                </div>
              </div>

              {/* Vardiya Saatleri */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800 pb-1">Vardiya & Çalışma Saatleri</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Mesai Başlangıcı</label>
                    <input name="shiftStart" type="time" defaultValue={settings?.shiftStart || '09:00'}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Mesai Bitişi</label>
                    <input name="shiftEnd" type="time" defaultValue={settings?.shiftEnd || '18:00'}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" />
                  </div>
                </div>
              </div>

              {/* Güvenlik */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800 pb-1">Güvenlik & Erişim</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">İş Yeri IP Adresi</label>
                    <input name="officeIp" defaultValue={settings?.officeIp} placeholder="Örn: 176.234.12.34"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">QR Gizli Anahtar</label>
                    <input name="qrSecret" value={settings?.qrSecret || ''}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, qrSecret: e.target.value } : null)}
                      placeholder="QR içeriği ne olmalı?"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" />
                  </div>
                </div>
              </div>

              {/* Mola Kuralları */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Mola Kuralları</label>
                  <button 
                    type="button"
                    onClick={() => {
                      const current = settings?.breakRules || [];
                      setSettings(s => s ? { ...s, breakRules: [...current, { thresholdHours: 9, deductionMinutes: 90 }] } : s);
                    }}
                    className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-md hover:bg-emerald-500/20 transition-colors"
                  >
                    + Kural Ekle
                  </button>
                </div>
                <div className="space-y-3">
                  {(settings?.breakRules || []).map((rule, idx) => (
                    <div key={idx} className="flex items-end gap-3 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50 group">
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] text-zinc-600 uppercase font-bold">Çalışma Eşiği (Saat)</label>
                        <input name="rule_threshold" type="number" step="0.5" defaultValue={rule.thresholdHours}
                          className="w-full bg-transparent border-b border-zinc-800 focus:border-orange-500 outline-none text-sm py-1" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] text-zinc-600 uppercase font-bold">Kesinti (Dakika)</label>
                        <input name="rule_deduction" type="number" defaultValue={rule.deductionMinutes}
                          className="w-full bg-transparent border-b border-zinc-800 focus:border-orange-500 outline-none text-sm py-1" />
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          const updated = (settings?.breakRules || []).filter((_, i) => i !== idx);
                          setSettings(s => s ? { ...s, breakRules: updated } : s);
                        }}
                        className="text-red-500/50 hover:text-red-500 p-2 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(settings?.breakRules || []).length === 0 && (
                    <p className="text-[10px] text-zinc-600 italic text-center py-4">Henüz mola kuralı tanımlanmadı. Standart kanun kuralları uygulanır.</p>
                  )}
                </div>
              </div>

              <button className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white transition-colors hover:bg-orange-600">
                Ayarları Kaydet
              </button>
            </form>
          </section>
        </div>
      </div>
    </section>
  );
}
