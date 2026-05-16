import React from 'react';
import { Calendar, ArrowLeft, ChevronRight, Download, Plus, Clock, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { UserProfile, AttendanceLog, LeaveRequest, OvertimeRequest } from '../types';

interface MovementsPageProps {
  allUsers: UserProfile[];
  logs: AttendanceLog[];
  leaveRequests: LeaveRequest[];
  overtimeRequests: OvertimeRequest[];
  selectedPersonnelId: string | null;
  setSelectedPersonnelId: (v: string | null) => void;
  selectedMonth: string;
  setSelectedMonth: (v: string) => void;
  exportToExcel: (uid: string, month: string) => void;
  setEditingLog: (v: AttendanceLog | null) => void;
  setDeletingLog: (v: AttendanceLog | null) => void;
  setManualLogDate: (v: string) => void;
  setManualLogTime: (v: string) => void;
  setManualLogType: (v: 'in' | 'out') => void;
  setShowManualLogModal: (v: boolean) => void;
  setSelectedDayDetails: (v: { date: string; userId: string } | null) => void;
}

export default function MovementsPage({
  allUsers, logs, leaveRequests, overtimeRequests,
  selectedPersonnelId, setSelectedPersonnelId,
  selectedMonth, setSelectedMonth,
  exportToExcel,
  setEditingLog, setDeletingLog,
  setManualLogDate, setManualLogTime, setManualLogType, setShowManualLogModal,
  setSelectedDayDetails
}: MovementsPageProps) {
  return (
    <section className="space-y-6">
      {!selectedPersonnelId ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calendar size={28} className="text-orange-500" /> Hareket Kontrol
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
            {allUsers.filter(u => u.role !== 'deleted').map(u => (
              <button
                key={u.uid}
                onClick={() => setSelectedPersonnelId(u.uid)}
                className="flex items-center justify-between rounded-2xl border border-zinc-900 bg-zinc-900/20 p-4 hover:bg-zinc-900/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold overflow-hidden shrink-0">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt={u.name} className="h-full w-full object-cover" />
                    ) : (
                      u.name[0]
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-bold">{u.name}</p>
                    <p className="text-xs text-zinc-500">{u.personnelId}</p>
                  </div>
                </div>
                <ChevronRight className="text-zinc-700" />
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <button
              onClick={() => setSelectedPersonnelId(null)}
              className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors w-fit"
            >
              <ArrowLeft size={18} /> Geri Dön
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => exportToExcel(selectedPersonnelId!, selectedMonth)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-500 transition-colors"
              >
                <Download size={16} /> <span className="hidden sm:inline">Excel'e Aktar</span><span className="sm:hidden">Excel</span>
              </button>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1 md:flex-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 p-6">
            <div className="mb-6 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center text-white text-xl font-bold shrink-0">
                  {allUsers.find(u => u.uid === selectedPersonnelId)?.name[0]}
                </div>
                <div>
                  <h3 className="text-xl font-bold leading-tight">{allUsers.find(u => u.uid === selectedPersonnelId)?.name}</h3>
                  <p className="text-sm text-zinc-500">{format(new Date(selectedMonth), 'MMMM yyyy', { locale: tr })}</p>
                </div>
              </div>
              <div className="md:ml-auto">
                <button
                  onClick={() => {
                    setEditingLog(null);
                    setManualLogDate(format(new Date(), 'yyyy-MM-dd'));
                    setManualLogTime(format(new Date(), 'HH:mm'));
                    setManualLogType('in');
                    setShowManualLogModal(true);
                  }}
                  className="w-full md:w-auto flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 md:py-2 text-sm font-bold text-white hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/10"
                >
                  <Plus size={18} /> Manuel Kayıt Ekle
                </button>
              </div>
            </div>

            {/* Monthly Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {(() => {
                const userLogs = logs.filter(l => l.userId === selectedPersonnelId && !l.deleted && l.timestamp?.toDate && format(l.timestamp.toDate(), 'yyyy-MM') === selectedMonth);
                const userLeaves = leaveRequests.filter(r => r.userId === selectedPersonnelId && r.status === 'approved' && !r.deleted && (r.startDate.startsWith(selectedMonth) || r.endDate.startsWith(selectedMonth)));
                const userOvertime = overtimeRequests.filter(r => r.userId === selectedPersonnelId && r.status === 'approved' && !r.deleted && r.date.startsWith(selectedMonth));
                const totalOvertimeHours = userOvertime.reduce((sum, r) => sum + r.hours, 0);
                const totalLeaveDays = userLeaves.reduce((sum, r) => sum + r.days, 0);
                return (
                  <>
                    <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-4 flex flex-col items-center justify-center">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">Aylık Toplam Mesai</p>
                      <p className="text-2xl font-black text-blue-500">{totalOvertimeHours.toFixed(1)} <span className="text-xs font-normal">Saat</span></p>
                    </div>
                    <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-4 flex flex-col items-center justify-center">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">Aylık Toplam İzin</p>
                      <p className="text-2xl font-black text-orange-500">{totalLeaveDays} <span className="text-xs font-normal">Gün</span></p>
                    </div>
                    <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-4 flex flex-col items-center justify-center">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">Giriş Kaydı Sayısı</p>
                      <p className="text-2xl font-black text-emerald-500">{userLogs.filter(l => l.type === 'in').length} <span className="text-xs font-normal">Kez</span></p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {(() => {
                const results = [];
                const [y, m] = selectedMonth.split('-').map(Number);
                const daysInMonth = new Date(y, m, 0).getDate();
                const firstDay = new Date(y, m - 1, 1).getDay();
                const padding = (firstDay + 6) % 7;

                for (let i = 0; i < padding; i++) {
                  results.push(<div key={`p-${i}`} className="hidden lg:block aspect-square" />);
                  results.push(<div key={`p-mob-${i}`} className="lg:hidden" />);
                }

                const userLogs = logs
                  .filter(l => l.userId === selectedPersonnelId && !l.deleted && l.timestamp?.toDate)
                  .sort((a, b) => a.timestamp.toDate().getTime() - b.timestamp.toDate().getTime());

                for (let d = 1; d <= daysInMonth; d++) {
                  const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const dayDate = new Date(y, m - 1, d);
                  const isSunday = dayDate.getDay() === 0;

                  const dayInLogs = userLogs.filter(l =>
                    l.type === 'in' &&
                    format(l.timestamp.toDate(), 'yyyy-MM-dd') === dateStr
                  );

                  const leave = leaveRequests.find(r =>
                    r.userId === selectedPersonnelId &&
                    r.status === 'approved' &&
                    !r.deleted &&
                    dateStr >= r.startDate &&
                    dateStr <= r.endDate
                  );

                  const overtimeTotal = overtimeRequests.filter(r =>
                    r.userId === selectedPersonnelId &&
                    r.status === 'approved' &&
                    !r.deleted &&
                    r.date === dateStr
                  ).reduce((sum, r) => sum + r.hours, 0);

                  let content = null;

                  if (dayInLogs.length > 0 || overtimeTotal > 0 || leave) {
                    const dayMovements = dayInLogs.map((inLog) => {
                      const entry = inLog.timestamp.toDate();
                      const nextOut = userLogs.find(l =>
                        l.type === 'out' &&
                        l.timestamp.toDate().getTime() > entry.getTime() &&
                        format(l.timestamp.toDate(), 'yyyy-MM-dd') === dateStr
                      );
                      return { in: entry, out: nextOut?.timestamp.toDate() };
                    });

                    content = (
                      <div className="space-y-0.5 sm:space-y-1 w-full flex flex-col items-start px-0.5 lg:px-1 mt-1 lg:mt-2 overflow-hidden">
                        {dayMovements.length > 0 ? (
                          <>
                            <div className="hidden sm:flex flex-col sm:items-center gap-0 lg:gap-0.5 leading-none shrink-0 overflow-hidden">
                              <span className="text-[9px] lg:text-[11px] font-black text-emerald-500 truncate">{format(dayMovements[0].in, 'HH:mm')}</span>
                              {dayMovements[0].out && (
                                <>
                                  <span className="hidden sm:inline text-[8px] lg:text-[10px] text-zinc-600">-</span>
                                  <span className="text-[9px] lg:text-[11px] font-black text-orange-400 truncate">{format(dayMovements[0].out, 'HH:mm')}</span>
                                </>
                              )}
                            </div>
                            <div className="sm:hidden flex items-center gap-1">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {dayMovements[0].out && <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />}
                            </div>
                          </>
                        ) : null}
                        {overtimeTotal > 0 && (
                          <>
                            <div className="hidden sm:block px-0.5 sm:px-1 py-0 rounded bg-blue-500/10 text-blue-400 text-[8px] lg:text-[9px] font-black uppercase truncate max-w-full">{overtimeTotal}s</div>
                            <div className="sm:hidden h-1 w-3 rounded-full bg-blue-500" />
                          </>
                        )}
                        {leave && (
                          <>
                            <span className="hidden sm:block text-[8px] lg:text-[9px] font-black uppercase leading-none truncate max-w-full text-orange-500">
                              {leave.type === 'report' ? 'RA' : 'İZ'}
                            </span>
                            <div className={cn("sm:hidden h-1 w-full rounded-full", leave.type === 'report' ? "bg-purple-500" : "bg-orange-500")} />
                          </>
                        )}
                      </div>
                    );
                  } else if (isSunday) {
                    content = (
                      <div className="flex flex-col items-center justify-center h-full text-zinc-800/30">
                        <span className="text-[6px] sm:text-[8px] lg:text-[10px] font-black uppercase tracking-tighter">OFF</span>
                      </div>
                    );
                  }

                  results.push(
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDayDetails({ date: dateStr, userId: selectedPersonnelId! })}
                      className={cn(
                        "aspect-square rounded-lg lg:rounded-xl border p-1 lg:p-2 flex flex-col items-center justify-between transition-all hover:bg-zinc-800/50 relative",
                        dayInLogs.length > 0 ? "border-zinc-800 bg-zinc-900/30" :
                        leave ? "border-orange-500/20 bg-orange-500/5" :
                        isSunday ? "border-zinc-900 bg-zinc-950/20" : "border-zinc-900 bg-zinc-950/5"
                      )}
                    >
                      <div className="flex w-full items-center justify-between font-bold leading-none">
                        <span className={cn("text-[8px] sm:text-[10px]", isSunday ? "text-red-500/40" : "text-zinc-600")}>{d}</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center w-full overflow-hidden">{content}</div>
                    </button>
                  );
                }
                return results;
              })()}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-zinc-900 pt-4 px-2">
              {[
                { color: 'bg-emerald-500', label: 'Giriş' },
                { color: 'bg-orange-400', label: 'Çıkış' },
                { color: 'bg-blue-500', label: 'Mesai' },
                { color: 'bg-orange-500', label: 'İzin', bar: true },
                { color: 'bg-purple-500', label: 'Rapor', bar: true },
              ].map(({ color, label, bar }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={cn(bar ? "h-1.5 w-4" : "h-2 w-2", "rounded-full", color)} />
                  <span className="text-[9px] font-bold text-zinc-500 uppercase">{label}</span>
                </div>
              ))}
            </div>

            {/* Log Table */}
            <div className="mt-12 space-y-4">
              <h4 className="text-lg font-bold flex items-center gap-2">
                <Clock size={20} className="text-orange-500" /> Tüm Giriş/Çıkış Kayıtları
              </h4>
              <div className="overflow-hidden rounded-2xl border border-zinc-900">
                {/* Desktop */}
                <table className="hidden md:table w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-900 bg-zinc-900/40 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      <th className="p-4">Tarih / Saat</th>
                      <th className="p-4">İşlem</th>
                      <th className="p-4">Kaynak</th>
                      <th className="p-4 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {logs
                      .filter(l => l.userId === selectedPersonnelId && l.timestamp?.toDate && format(l.timestamp.toDate(), 'yyyy-MM') === selectedMonth)
                      .sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime())
                      .map(log => (
                        <tr key={log.id} className="text-sm hover:bg-zinc-900/30 transition-colors">
                          <td className="p-4">{format(log.timestamp.toDate(), 'd MMM yyyy, HH:mm', { locale: tr })}</td>
                          <td className="p-4">
                            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", log.type === 'in' ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-800 text-zinc-400")}>
                              {log.type === 'in' ? 'Giriş' : 'Çıkış'}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-zinc-500">{log.ipAddress}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => { setEditingLog(log); setManualLogDate(format(log.timestamp.toDate(), 'yyyy-MM-dd')); setManualLogTime(format(log.timestamp.toDate(), 'HH:mm')); setManualLogType(log.type); setShowManualLogModal(true); }} className="text-zinc-600 hover:text-orange-500 transition-colors active:scale-95">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => setDeletingLog(log)} className="text-zinc-600 hover:text-red-500 transition-colors active:scale-95">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {/* Mobile */}
                <div className="md:hidden divide-y divide-zinc-900 bg-zinc-900/10">
                  {logs
                    .filter(l => l.userId === selectedPersonnelId && l.timestamp?.toDate && format(l.timestamp.toDate(), 'yyyy-MM') === selectedMonth)
                    .sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime())
                    .map(log => (
                      <div key={log.id} className="p-4 space-y-3 hover:bg-zinc-900/30">
                        <div className="flex items-center justify-between">
                          <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold uppercase", log.type === 'in' ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-800 text-zinc-400")}>
                            {log.type === 'in' ? 'Giriş' : 'Çıkış'}
                          </span>
                          <div className="flex items-center gap-3">
                            <button onClick={() => { setEditingLog(log); setManualLogDate(format(log.timestamp.toDate(), 'yyyy-MM-dd')); setManualLogTime(format(log.timestamp.toDate(), 'HH:mm')); setManualLogType(log.type); setShowManualLogModal(true); }} className="p-1 text-zinc-600 active:text-orange-500 transition-colors">
                              <Edit size={18} />
                            </button>
                            <button onClick={() => setDeletingLog(log)} className="p-1 text-zinc-600 active:text-red-500 transition-colors">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="space-y-0.5">
                            <p className="text-[11px] font-bold text-zinc-300">{format(log.timestamp.toDate(), 'd MMMM yyyy', { locale: tr })}</p>
                            <p className="text-xl font-black text-white">{format(log.timestamp.toDate(), 'HH:mm')}</p>
                          </div>
                          <p className="text-[9px] text-zinc-600 font-mono italic">{log.ipAddress}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
