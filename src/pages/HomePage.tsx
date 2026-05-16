import React from 'react';
import {
  LogIn, LogOut, Wifi, WifiOff, MapPin, Shield, Calendar, Clock,
  Download, AlertTriangle, FileText, UserX, ShieldAlert, Clock3
} from 'lucide-react';
import { Truck } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { getHoliday } from '../lib/holidays';
import { UserProfile, AttendanceLog, LeaveRequest, OvertimeRequest, GlobalSettings } from '../types';

interface DashboardStats {
  present: number;
  onLeave: number;
  late: number;
  absent: number;
  presentList: string[];
  onLeaveList: string[];
  lateList: string[];
  absentList: string[];
}

interface HomePageProps {
  user: { uid: string };
  profile: UserProfile;
  logs: AttendanceLog[];
  leaveRequests: LeaveRequest[];
  overtimeRequests: OvertimeRequest[];
  settings: GlobalSettings | null;
  isOnline: boolean;
  offlineQueueCount: number;
  currentIp: string;
  selectedMonth: string;
  setSelectedMonth: (v: string) => void;
  dashboardStats: DashboardStats | null;
  setDashboardStatModal: (v: any) => void;
  userLateCountThisMonth: number;
  setPendingScanType: (v: 'in' | 'out' | null) => void;
  setShowRemoteModal: (v: boolean) => void;
  setScanType: (v: 'in' | 'out' | null) => void;
  setShowScanner: (v: boolean) => void;
  setSelectedDayDetails: (v: { date: string; userId: string } | null) => void;
  exportToExcel: (uid: string, month: string) => void;
  exportToCalendar: (uid: string, month: string) => void;
}

export default function HomePage({
  user, profile, logs, leaveRequests, overtimeRequests, settings,
  isOnline, offlineQueueCount, currentIp,
  selectedMonth, setSelectedMonth,
  dashboardStats, setDashboardStatModal, userLateCountThisMonth,
  setPendingScanType, setShowRemoteModal, setScanType, setShowScanner,
  setSelectedDayDetails, exportToExcel, exportToCalendar
}: HomePageProps) {
  return (
    <>
      {/* Çevrimdışı Mod Uyarısı */}
      {!isOnline && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <WifiOff size={18} className="text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-400">Çevrimdışı Mod</p>
            <p className="text-xs text-amber-400/70">İnternet yok. Hareketler cihazınıza kaydedilecek, bağlantı gelince otomatik gönderilecek.</p>
          </div>
        </div>
      )}
      {offlineQueueCount > 0 && isOnline && (
        <div className="flex items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
          <Clock size={18} className="text-blue-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-blue-400">{offlineQueueCount} Bekleyen Hareket</p>
            <p className="text-xs text-blue-400/70">İnternet geldi. Senkronize ediliyor...</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => {
            if (profile?.canRemoteCheckIn) {
              setPendingScanType('in');
              setShowRemoteModal(true);
            } else {
              setScanType('in'); setShowScanner(true);
            }
          }}
          className="group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl bg-emerald-600 p-8 text-white transition-all hover:bg-emerald-500"
        >
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 transition-transform group-hover:scale-150" />
          <LogIn size={40} />
          <span className="text-lg font-bold">Giriş Yap</span>
          {profile?.canRemoteCheckIn && <span className="text-[10px] opacity-70 flex items-center gap-1"><Truck size={10} /> Nakliye Yetkili</span>}
        </button>
        <button
          onClick={() => {
            if (profile?.canRemoteCheckIn) {
              setPendingScanType('out');
              setShowRemoteModal(true);
            } else {
              setScanType('out'); setShowScanner(true);
            }
          }}
          className="group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl bg-zinc-900 p-8 text-white transition-all hover:bg-zinc-800"
        >
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5 transition-transform group-hover:scale-150" />
          <LogOut size={40} />
          <span className="text-lg font-bold">Çıkış Yap</span>
          {profile?.canRemoteCheckIn && <span className="text-[10px] opacity-70 flex items-center gap-1"><Truck size={10} /> Nakliye Yetkili</span>}
        </button>
      </div>

      {/* Admin Dashboard */}
      {profile?.role === 'admin' && dashboardStats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            onClick={() => setDashboardStatModal({ title: 'Şu An Ofiste', color: 'emerald', icon: <LogIn size={18} />, people: dashboardStats.presentList })}
            className="rounded-2xl border theme-border bg-emerald-500/10 p-4 text-left hover:bg-emerald-500/20 transition-colors cursor-pointer"
          >
            <div className="text-2xl font-black text-emerald-500">{dashboardStats.present}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70">Şu An Ofiste</div>
            <div className="text-[9px] text-emerald-700/60 mt-1">Detay için tıkla</div>
          </button>
          <button
            onClick={() => setDashboardStatModal({ title: 'İzinli', color: 'orange', icon: <FileText size={18} />, people: dashboardStats.onLeaveList })}
            className="rounded-2xl border theme-border bg-orange-500/10 p-4 text-left hover:bg-orange-500/20 transition-colors cursor-pointer"
          >
            <div className="text-2xl font-black text-orange-500">{dashboardStats.onLeave}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-orange-600/70">İzinli</div>
            <div className="text-[9px] text-orange-700/60 mt-1">Detay için tıkla</div>
          </button>
          <button
            onClick={() => setDashboardStatModal({ title: 'Geç Kalan', color: 'red', icon: <Clock size={18} />, people: dashboardStats.lateList })}
            className="rounded-2xl border theme-border bg-red-500/10 p-4 text-left hover:bg-red-500/20 transition-colors cursor-pointer"
          >
            <div className="text-2xl font-black text-red-500">{dashboardStats.late}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-red-600/70">Geç Kalan</div>
            <div className="text-[9px] text-red-700/60 mt-1">Detay için tıkla</div>
          </button>
          <button
            onClick={() => setDashboardStatModal({ title: 'Gelmeyen', color: 'zinc', icon: <UserX size={18} />, people: dashboardStats.absentList })}
            className="rounded-2xl border theme-border theme-bg-secondary p-4 text-left hover:bg-zinc-800/40 transition-colors cursor-pointer"
          >
            <div className="text-2xl font-black theme-text">{dashboardStats.absent}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Gelmeyen</div>
            <div className="text-[9px] text-zinc-600 mt-1">Detay için tıkla</div>
          </button>
        </div>
      )}

      {/* Late Warning */}
      {profile?.role !== 'admin' && userLateCountThisMonth > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <AlertTriangle size={24} className="text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-500">Geç Kalma Uyarısı</p>
            <p className="text-xs text-red-500/70">Bu ay içerisinde <strong>{userLateCountThisMonth} kez</strong> mesai başlangıç saati ({settings?.shiftStart || '08:00'}) sonrasında giriş yaptınız.</p>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border theme-border theme-bg-secondary p-4">
          <div className="mb-2 flex items-center gap-2 text-zinc-500">
            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} className="text-amber-400" />}
            <span className="text-xs font-semibold uppercase tracking-wider">Ağ Durumu</span>
          </div>
          <p className="text-sm font-medium theme-text">{isOnline ? (currentIp || 'Tespit ediliyor...') : 'Çevrimdışı'}</p>
          <p className="text-[10px] text-zinc-600">Mevcut IP Adresiniz</p>
        </div>
        <div className="rounded-2xl border theme-border theme-bg-secondary p-4">
          <div className="mb-2 flex items-center gap-2 text-zinc-500">
            <MapPin size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider">Konum</span>
          </div>
          <p className="text-sm font-medium theme-text">Aktif</p>
          <p className="text-[10px] text-zinc-600">GPS Doğrulaması</p>
        </div>
        <div className="rounded-2xl border theme-border theme-bg-secondary p-4">
          <div className="mb-2 flex items-center gap-2 text-zinc-500">
            <Shield size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider">Güvenlik</span>
          </div>
          <p className="text-sm font-medium theme-text">QR + IP Korumalı</p>
          <p className="text-[10px] text-zinc-600">Sistem Durumu</p>
        </div>
      </div>

      {/* Employee Attendance Calendar */}
      {profile?.role !== 'admin' && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar size={24} className="text-orange-500" /> Giriş Çıkış Hareketlerim
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => exportToExcel(user!.uid, selectedMonth)}
                className="flex-1 sm:flex-none rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors flex items-center justify-center gap-1.5">
                <Download size={13} /> Excel
              </button>
              <button onClick={() => exportToCalendar(user!.uid, selectedMonth)}
                className="flex-1 sm:flex-none rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500 transition-colors flex items-center justify-center gap-1.5">
                <Calendar size={13} /> Takvime Ekle
              </button>
              <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1 sm:flex-none rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs focus:border-orange-500 focus:outline-none" />
            </div>
          </div>

          {/* Calendar Days Header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
            {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => <div key={day} className="truncate">{day}</div>)}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2" key={`cal-${selectedMonth}-${logs.filter(l => l.userId === user?.uid).length}`}>
            {(() => {
              const results = [];
              const today = new Date();
              const [year, month] = selectedMonth.split('-').map(Number);
              const daysInMonth = new Date(year, month, 0).getDate();
              const firstDay = new Date(year, month - 1, 1).getDay();
              const padding = (firstDay + 6) % 7;

              for (let i = 0; i < padding; i++) {
                results.push(<div key={`p-${i}`} className="aspect-square" />);
              }

              const userLogs = logs
                .filter(l => l.userId === user?.uid && !l.deleted && l.timestamp?.toDate)
                .sort((a, b) => a.timestamp.toDate().getTime() - b.timestamp.toDate().getTime());

              for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dayDate = new Date(year, month - 1, d);
                const isSunday = dayDate.getDay() === 0;

                const dayInLogs = userLogs.filter(l => format(l.timestamp.toDate(), 'yyyy-MM-dd') === dateStr);
                const leave = leaveRequests.find(r => r.userId === user?.uid && r.status === 'approved' && !r.deleted && dateStr >= r.startDate && dateStr <= r.endDate);
                const overtime = overtimeRequests.filter(r => r.userId === user?.uid && r.status === 'approved' && !r.deleted && r.date === dateStr).reduce((sum, r) => sum + r.hours, 0);

                const isFuture = dayDate > today;
                const holiday = getHoliday(dateStr);
                const isHolidayDay = !!holiday;
                const isPending = dayInLogs.some(l => l.status === 'pending' && !l.deleted);
                const successLogs = dayInLogs.filter(l => l.status !== 'error' && l.status !== 'pending' && !l.deleted);
                const hasSuccessLogs = successLogs.length > 0;
                const hasInLog = successLogs.some(l => l.type === 'in');
                const hasOutLog = successLogs.some(l => l.type === 'out');
                const hasErrorLogs = dayInLogs.some(l => l.status === 'error' && !l.deleted);

                results.push(
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDayDetails({ date: dateStr, userId: user?.uid! })}
                    className={cn(
                      "aspect-square rounded-xl border p-1 flex flex-col items-center justify-between transition-all hover:scale-[1.02] hover:shadow-xl relative overflow-hidden",
                      hasErrorLogs && !hasSuccessLogs && !isPending ? "border-red-500/30 bg-red-500/5" :
                      isPending ? "border-amber-500/30 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.05)]" :
                      hasInLog && hasOutLog ? "border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.05)]" :
                      hasInLog && !hasOutLog ? "border-cyan-500/30 bg-cyan-500/5 shadow-[0_0_15px_rgba(6,182,212,0.05)]" :
                      leave ? "border-orange-500/30 bg-orange-500/5 shadow-[0_0_10px_rgba(249,115,22,0.1)]" :
                      isHolidayDay ? "border-red-500/30 bg-red-500/5 shadow-[0_0_10px_rgba(239,68,68,0.1)]" :
                      isSunday ? "border-zinc-900 bg-zinc-950/30" :
                      isFuture ? "border-zinc-900/30 bg-transparent opacity-30" : "border-zinc-900 bg-zinc-950/10"
                    )}
                  >
                    <span className={cn("text-[8px] font-bold absolute top-1 left-1.5", (isSunday || isHolidayDay) ? "text-red-500/50" : "text-zinc-600")}>{d}</span>
                    {isHolidayDay && !hasSuccessLogs && !leave && (
                      <span className="hidden sm:block absolute top-1 right-1 text-[7px] font-black text-red-500 uppercase max-w-[70%] text-right truncate">{holiday.name}</span>
                    )}
                    <div className="flex-1 flex flex-col items-start justify-center w-full gap-1 mt-3 px-1">
                      {hasSuccessLogs && (
                        <div className="flex items-center gap-1 sm:gap-0.5 leading-none">
                          <div className="hidden sm:flex items-center gap-0.5">
                            <span className="text-[11px] font-black text-emerald-500">
                              {format(dayInLogs.find(l => l.type === 'in' && l.status !== 'error')?.timestamp.toDate() || new Date(), 'HH:mm')}
                            </span>
                            {dayInLogs.find(l => l.type === 'out' && l.status !== 'error') && (
                              <>
                                <span className="text-[11px] text-zinc-600">-</span>
                                <span className="text-[11px] font-black text-orange-400">
                                  {format(dayInLogs.find(l => l.type === 'out' && l.status !== 'error')?.timestamp.toDate() || new Date(), 'HH:mm')}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="sm:hidden flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          </div>
                        </div>
                      )}
                      {hasErrorLogs && (
                        <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                      )}
                      {overtime > 0 && (
                        <>
                          <div className={cn("hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase text-left w-fit", isSunday ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-400")}>
                            {isSunday ? 'TFM' : 'FM'}: {overtime}s
                          </div>
                          <div className={cn("sm:hidden h-2 w-4 rounded-full", isSunday ? "bg-red-500" : "bg-blue-500")} />
                        </>
                      )}
                      {leave && (
                        <>
                          <div className={cn("hidden sm:flex flex-col items-start leading-none", leave.type === 'report' ? "text-purple-400" : "text-orange-500")}>
                            <span className="text-[10px] font-black uppercase tracking-tighter">{leave.type === 'report' ? 'Rapor' : 'İzin'}</span>
                          </div>
                          <div className={cn("sm:hidden h-1.5 w-full rounded-full", leave.type === 'report' ? "bg-purple-500" : "bg-orange-500")} />
                        </>
                      )}
                    </div>
                  </button>
                );
              }
              return results;
            })()}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-zinc-900 pt-4 px-2">
            {[
              { color: 'bg-emerald-500', glow: true, label: 'Giriş' },
              { color: 'bg-orange-400', glow: true, label: 'Çıkış' },
              { color: 'bg-blue-500', label: 'Mesai' },
              { color: 'bg-orange-500', bar: true, label: 'İzin' },
              { color: 'bg-purple-500', bar: true, label: 'Rapor' },
              { color: 'bg-red-500', pulse: true, label: 'Hatalı' },
            ].map(({ color, label, bar, glow, pulse }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={cn(
                  bar ? "h-1.5 w-4" : "h-2 w-2",
                  "rounded-full", color,
                  glow && `shadow-[0_0_5px_rgba(0,0,0,0.5)]`,
                  pulse && "animate-pulse"
                )} />
                <span className="text-[9px] font-bold text-zinc-500 uppercase">{label}</span>
              </div>
            ))}
          </div>

          {/* Log Table */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 overflow-hidden">
            <div className="p-3 border-b border-zinc-900 bg-zinc-900/40 text-[10px] font-bold text-zinc-500 uppercase">Detaylı Liste</div>
            <div className="max-h-[400px] overflow-y-auto">
              {/* Desktop */}
              <table className="hidden md:table w-full text-left">
                <tbody className="divide-y divide-zinc-900">
                  {logs.filter(l => l.userId === user?.uid && l.timestamp?.toDate && format(l.timestamp.toDate(), 'yyyy-MM') === selectedMonth).length === 0 ? (
                    <tr><td className="p-8 text-center text-zinc-500 text-xs italic">Bu ay için kayıt bulunmuyor.</td></tr>
                  ) : (
                    logs.filter(l => l.userId === user?.uid && l.timestamp?.toDate && format(l.timestamp.toDate(), 'yyyy-MM') === selectedMonth)
                      .sort((a, b) => (b.timestamp?.toDate?.()?.getTime() || 0) - (a.timestamp?.toDate?.()?.getTime() || 0))
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-zinc-900/30 transition-colors">
                          <td className="p-4"><p className="text-xs text-zinc-400">{log.timestamp?.toDate ? format(log.timestamp.toDate(), 'd MMM yyyy, HH:mm', { locale: tr }) : '...'}</p></td>
                          <td className="p-4">
                            <div className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase",
                              log.status === 'error' ? "bg-red-500/10 text-red-500" :
                              log.status === 'pending' ? "bg-amber-500/10 text-amber-500" :
                              log.type === 'in' ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                            )}>
                              {log.status === 'error' ? <ShieldAlert size={10} /> : log.status === 'pending' ? <Clock3 size={10} /> : log.type === 'in' ? <LogIn size={10} /> : <LogOut size={10} />}
                              {log.status === 'error' ? 'Hata' : log.status === 'pending' ? 'Bekliyor' : (log.type === 'in' ? 'Giriş' : 'Çıkış')}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <p className="text-[10px] text-zinc-400 font-bold">{log.status === 'error' ? log.errorMessage : log.status === 'pending' ? 'Yönetici onayı bekleniyor' : ''}</p>
                            <p className="text-[10px] text-zinc-600 font-mono">{log.ipAddress}</p>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-zinc-900">
                {logs.filter(l => l.userId === user?.uid && l.timestamp?.toDate && format(l.timestamp.toDate(), 'yyyy-MM') === selectedMonth).length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-xs italic">Bu ay için kayıt bulunmuyor.</div>
                ) : (
                  logs.filter(l => l.userId === user?.uid && l.timestamp?.toDate && format(l.timestamp.toDate(), 'yyyy-MM') === selectedMonth)
                    .sort((a, b) => (b.timestamp?.toDate?.()?.getTime() || 0) - (a.timestamp?.toDate?.()?.getTime() || 0))
                    .map((log) => (
                      <div key={log.id} className="p-4 flex items-center justify-between hover:bg-zinc-900/30 transition-colors">
                        <div className="space-y-1">
                          <p className="text-[11px] font-bold text-zinc-300">{log.timestamp?.toDate ? format(log.timestamp.toDate(), 'd MMM, HH:mm', { locale: tr }) : '...'}</p>
                          <p className="text-[9px] text-zinc-600 font-mono">{log.ipAddress}</p>
                        </div>
                        <div className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold uppercase",
                          log.status === 'error' ? "bg-red-500/10 text-red-500" :
                          log.status === 'pending' ? "bg-amber-500/10 text-amber-500" :
                          log.type === 'in' ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                        )}>
                          {log.status === 'error' ? 'Hata' : log.status === 'pending' ? 'Bekliyor' : (log.type === 'in' ? 'Giriş' : 'Çıkış')}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
