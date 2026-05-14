import React, { useState } from 'react';
import { FileText, Plus, UploadCloud, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { UserProfile, LeaveRequest, OvertimeRequest } from '../types';

interface LeavesPageProps {
  user: { uid: string };
  profile: UserProfile;
  allUsers: UserProfile[];
  leaveRequests: LeaveRequest[];
  overtimeRequests: OvertimeRequest[];
  getEffectiveLeaveBalance: (u: UserProfile | null) => number;
  submitLeaveRequest: (e: React.FormEvent<HTMLFormElement>) => void;
  submitOvertimeRequest: (e: React.FormEvent<HTMLFormElement>) => void;
  leaveType: 'annual' | 'report' | 'excuse';
  setLeaveType: (v: 'annual' | 'report' | 'excuse') => void;
  leaveStartDate: string;
  setLeaveStartDate: (v: string) => void;
  leaveEndDate: string;
  setLeaveEndDate: (v: string) => void;
  calcLeaveDays: number;
  setCalcLeaveDays: (v: number) => void;
  overtimeStartTime: string;
  setOvertimeStartTime: (v: string) => void;
  overtimeEndTime: string;
  setOvertimeEndTime: (v: string) => void;
  calcOvertimeHours: number;
  setCalcOvertimeHours: (v: number) => void;
  reportFile: File | null;
  setReportFile: (v: File | null) => void;
  uploading: boolean;
  setEditingLeave: (v: LeaveRequest | null) => void;
  setDeletingLeave: (v: LeaveRequest | null) => void;
}

export default function LeavesPage({
  user, profile, allUsers, leaveRequests, overtimeRequests,
  getEffectiveLeaveBalance, submitLeaveRequest, submitOvertimeRequest,
  leaveType, setLeaveType, leaveStartDate, setLeaveStartDate,
  leaveEndDate, setLeaveEndDate, calcLeaveDays, setCalcLeaveDays,
  overtimeStartTime, setOvertimeStartTime, overtimeEndTime, setOvertimeEndTime,
  calcOvertimeHours, setCalcOvertimeHours,
  reportFile, setReportFile, uploading,
  setEditingLeave, setDeletingLeave
}: LeavesPageProps) {
  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText size={28} className="text-orange-500" /> İzin ve Fazla Mesai Yönetimi
        </h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-4 lg:p-6 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] lg:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Yıllık İzin</p>
          <p className="text-2xl lg:text-4xl font-black text-orange-500">{getEffectiveLeaveBalance(profile)}</p>
          <p className="text-[10px] text-zinc-600 mt-1">Kalan Gün</p>
        </div>
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-4 lg:p-6 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] lg:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Bekleyen</p>
          <p className="text-2xl lg:text-4xl font-black text-white">
            {leaveRequests.filter(r => r.status === 'pending' && (r.userId === user.uid || r.managerId === user.uid)).length + 
             overtimeRequests.filter(r => r.status === 'pending' && (r.userId === user.uid || r.managerId === user.uid)).length}
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">Onay Bekleyen</p>
        </div>
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-4 lg:p-6 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] lg:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Fazla Mesai</p>
          <p className="text-2xl lg:text-4xl font-black text-blue-500">
            {overtimeRequests.filter(r => r.userId === user.uid && r.status === 'approved').reduce((sum, r) => sum + r.hours, 0).toFixed(1)}
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">Onaylı Saat</p>
        </div>
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-4 lg:p-6 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] lg:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Yönetici</p>
          <p className="text-[10px] lg:text-sm font-bold text-white truncate max-w-full px-1">
            {allUsers.find(u => u.uid === profile?.managerId)?.name || 'Sistem Yöneticisi'}
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">Onay Makamı</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Request Forms */}
        <div className="space-y-6">
          {/* İzin Talebi Formu */}
          <section className="rounded-3xl border border-zinc-900 bg-zinc-900/20 p-6 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Plus size={20} className="text-emerald-500" /> İzin Talebi Oluştur
            </h3>
            <form onSubmit={submitLeaveRequest} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Talep Türü</label>
                <select 
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none"
                >
                  <option value="annual">Yıllık İzin</option>
                  <option value="report">Rapor</option>
                  <option value="excuse">Mazeret İzni</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Başlangıç</label>
                  <input 
                    name="startDate" 
                    type="date" 
                    required 
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Bitiş</label>
                  <input 
                    name="endDate" 
                    type="date" 
                    required 
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Gün Sayısı</label>
                <input 
                  name="days" 
                  type="number" 
                  required 
                  value={calcLeaveDays || ''}
                  onChange={(e) => setCalcLeaveDays(parseInt(e.target.value))}
                  placeholder="Kaç gün?" 
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Açıklama</label>
                <textarea name="reason" required placeholder="İzin nedeni..." className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none h-20 resize-none" />
              </div>

              {leaveType === 'report' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Rapor Dosyası (PDF)</label>
                  <div className="relative group">
                    <input 
                      type="file" 
                      accept=".pdf,image/*" 
                      onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={cn(
                      "w-full rounded-xl border border-dashed py-4 flex flex-col items-center justify-center transition-colors",
                      reportFile ? "border-emerald-500 bg-emerald-500/5" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                    )}>
                      <UploadCloud size={20} className={reportFile ? "text-emerald-500" : "text-zinc-600"} />
                      <span className="text-[10px] font-bold mt-1 text-zinc-500">
                        {reportFile ? reportFile.name : 'Dosya Seç veya Sürükle'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button 
                disabled={uploading}
                className={cn(
                  "w-full rounded-xl py-3 font-bold text-white transition-colors flex items-center justify-center gap-2",
                  uploading ? "bg-zinc-800 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500"
                )}
              >
                {uploading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Yükleniyor...
                  </>
                ) : 'Talep Gönder'}
              </button>
            </form>
          </section>

          {/* Fazla Mesai Talebi Formu */}
          <section className="rounded-3xl border border-zinc-900 bg-zinc-900/20 p-6 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Plus size={20} className="text-blue-500" /> Fazla Mesai Talebi
            </h3>
            <form onSubmit={submitOvertimeRequest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Tarih</label>
                  <input name="date" type="date" required className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Mesai Başlangıç</label>
                  <input 
                    name="startTime" 
                    type="time" 
                    required 
                    value={overtimeStartTime}
                    onChange={(e) => setOvertimeStartTime(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Mesai Bitiş (Çıkış)</label>
                  <input 
                    name="endTime" 
                    type="time" 
                    required 
                    value={overtimeEndTime}
                    onChange={(e) => setOvertimeEndTime(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Toplam Saat</label>
                <input 
                  name="hours" 
                  type="number" 
                  step="0.1" 
                  required 
                  value={calcOvertimeHours || ''}
                  onChange={(e) => setCalcOvertimeHours(parseFloat(e.target.value))}
                  placeholder="Kaç saat?" 
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Açıklama</label>
                <textarea name="description" required placeholder="Çalışma detayı..." className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none h-20 resize-none" />
              </div>
              <button className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-500 transition-colors">Talep Gönder</button>
            </form>
          </section>
        </div>

        {/* Requests List */}
        <div className="space-y-6">
          <section className="space-y-4">
            <h3 className="text-lg font-bold">İzin Taleplerim</h3>
            <div className="space-y-3">
              {leaveRequests.filter(r => r.userId === user.uid).map(req => (
                <div key={req.id} className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-4 space-y-3 group relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{req.userName}</p>
                      <p className="text-[10px] text-zinc-500">{format(new Date(req.startDate), 'd MMM')} - {format(new Date(req.endDate), 'd MMM yyyy')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {profile?.role === 'admin' && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingLeave(req)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-orange-500"><Edit size={14}/></button>
                          <button onClick={() => setDeletingLeave(req)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-500"><Trash2 size={14}/></button>
                        </div>
                      )}
                      <div className={cn(
                        "rounded-full px-2 py-1 text-[10px] font-bold uppercase",
                        req.status === 'pending' ? "bg-orange-500/10 text-orange-500" :
                        req.status === 'approved' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {req.status === 'pending' ? 'Bekliyor' : req.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 italic">"{req.reason}"</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-bold">Fazla Mesai Taleplerim</h3>
            <div className="space-y-3">
              {overtimeRequests.filter(r => r.userId === user.uid).map(req => (
                <div key={req.id} className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{req.userName}</p>
                      <p className="text-[10px] text-zinc-500">{format(new Date(req.date), 'd MMMM yyyy')} • {req.hours} Saat</p>
                    </div>
                    <div className={cn(
                      "rounded-full px-2 py-1 text-[10px] font-bold uppercase",
                      req.status === 'pending' ? "bg-orange-500/10 text-orange-500" :
                      req.status === 'approved' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {req.status === 'pending' ? 'Bekliyor' : req.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 italic">"{req.description}"</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
