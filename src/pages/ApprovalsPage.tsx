import React from 'react';
import { FileText, Check, X, Edit, Trash2, Truck, MapPin, CheckCircle2 } from 'lucide-react';
import { Clock3 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { UserProfile, LeaveRequest, OvertimeRequest, AttendanceLog } from '../types';

interface ApprovalsPageProps {
  user: { uid: string };
  profile: UserProfile;
  leaveRequests: LeaveRequest[];
  overtimeRequests: OvertimeRequest[];
  logs: AttendanceLog[];
  handleRequestAction: (collection: string, requestId: string, action: 'approved' | 'rejected') => void;
  setEditingLeave: (v: LeaveRequest | null) => void;
  setDeletingLeave: (v: LeaveRequest | null) => void;
}

export default function ApprovalsPage({
  user, profile, leaveRequests, overtimeRequests, logs,
  handleRequestAction, setEditingLeave, setDeletingLeave
}: ApprovalsPageProps) {
  const pendingLeaves = leaveRequests.filter(r => r.status === 'pending' && (r.managerId === user.uid || profile.role === 'admin') && r.userId !== user.uid);
  const pendingOvertime = overtimeRequests.filter(r => r.status === 'pending' && (r.managerId === user.uid || profile.role === 'admin') && r.userId !== user.uid);
  const pendingManual = logs.filter(l => l.status === 'pending' && l.manualEntry && l.userId !== user.uid);

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CheckCircle2 size={28} className="text-emerald-500" /> Onay Bekleyen Talepler
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* İzin Onayları */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <FileText size={20} className="text-orange-500" /> İzin Onayları
          </h3>
          <div className="space-y-3">
            {pendingLeaves.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-zinc-500 text-sm">
                Onay bekleyen izin talebi bulunmuyor.
              </div>
            ) : (
              pendingLeaves.map(req => (
                <div key={req.id} className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-4 space-y-3 group relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{req.userName}</p>
                      <p className="text-[10px] text-zinc-500">{format(new Date(req.startDate), 'd MMM')} - {format(new Date(req.endDate), 'd MMM yyyy')} ({req.days} Gün)</p>
                    </div>
                    {profile?.role === 'admin' && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingLeave(req)} className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-orange-500"><Edit size={12}/></button>
                        <button onClick={() => setDeletingLeave(req)} className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-500"><Trash2 size={12}/></button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 italic">"{req.reason}"</p>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => handleRequestAction('leaveRequests', req.id!, 'approved')} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500"><Check size={14} /> Onayla</button>
                    <button onClick={() => handleRequestAction('leaveRequests', req.id!, 'rejected')} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-500"><X size={14} /> Reddet</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Fazla Mesai Onayları */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Clock3 size={20} className="text-blue-500" /> Fazla Mesai Onayları
          </h3>
          <div className="space-y-3">
            {pendingOvertime.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-zinc-500 text-sm">
                Onay bekleyen mesai talebi bulunmuyor.
              </div>
            ) : (
              pendingOvertime.map(req => (
                <div key={req.id} className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{req.userName}</p>
                      <p className="text-[10px] text-zinc-500">{format(new Date(req.date), 'd MMMM yyyy')} • {req.hours} Saat</p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 italic">"{req.description}"</p>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => handleRequestAction('overtimeRequests', req.id!, 'approved')} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500"><Check size={14} /> Onayla</button>
                    <button onClick={() => handleRequestAction('overtimeRequests', req.id!, 'rejected')} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-500"><X size={14} /> Reddet</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Manuel Kayıt Onayları */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Truck size={20} className="text-emerald-500" /> Manuel Kayıt Onayları
          </h3>
          <div className="space-y-3">
            {pendingManual.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-zinc-500 text-sm">
                Onay bekleyen manuel kayıt bulunmuyor.
              </div>
            ) : (
              pendingManual.map(req => (
                <div key={req.id} className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-4 space-y-3 group relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{req.userName}</p>
                      <p className="text-[10px] text-zinc-500">{req.timestamp?.toDate ? format(req.timestamp.toDate(), 'd MMM yyyy, HH:mm') : ''} - {req.type === 'in' ? 'Giriş' : 'Çıkış'}</p>
                    </div>
                  </div>
                  {req.remoteNote && <p className="text-xs text-zinc-400 italic">"{req.remoteNote}"</p>}
                  {req.location && (
                    <a href={`https://www.google.com/maps?q=${req.location.latitude},${req.location.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:text-blue-400">
                      <MapPin size={12} /> Konumu Haritada Gör
                    </a>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => handleRequestAction('attendance', req.id!, 'approved')} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500"><Check size={14} /> Onayla</button>
                    <button onClick={() => handleRequestAction('attendance', req.id!, 'rejected')} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-500"><X size={14} /> Reddet</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
