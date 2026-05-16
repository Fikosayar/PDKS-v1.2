import React from 'react';
import { Users, Plus, Edit, Trash2 } from 'lucide-react';
import { Truck } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';

interface UsersPageProps {
  user: { uid: string };
  profile: UserProfile;
  allUsers: UserProfile[];
  addUser: (e: React.FormEvent<HTMLFormElement>) => void;
  setEditingUser: (v: UserProfile | null) => void;
  setDeletingUser: (v: UserProfile | null) => void;
}

export default function UsersPage({
  user, profile, allUsers, addUser, setEditingUser, setDeletingUser
}: UsersPageProps) {
  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users size={28} className="text-orange-500" /> Personel Yönetimi
        </h2>
      </div>

      {/* Add User Form */}
      {profile?.role === 'admin' && (
        <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 p-6 space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Plus size={20} className="text-orange-500" /> Yeni Personel Ekle
          </h3>
          <form onSubmit={addUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'name', label: 'Ad Soyad', placeholder: 'Örn: Ahmet Yılmaz', required: true },
              { name: 'title', label: 'Ünvan / Pozisyon', placeholder: 'Örn: Yazılım Geliştirici', required: false },
              { name: 'personnelId', label: 'Personel ID', placeholder: 'Örn: ahmet123', required: true },
            ].map(f => (
              <div key={f.name} className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase">{f.label}</label>
                <input name={f.name} required={f.required} placeholder={f.placeholder}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" />
              </div>
            ))}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase">Şifre</label>
              <input name="password" type="password" required placeholder="Şifre belirleyin"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase">Yetki</label>
              <select name="role" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none">
                <option value="employee">Personel</option>
                <option value="admin">Yönetici</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase">Bağlı Olduğu Yönetici</label>
              <select name="managerId" required className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none">
                <option value="admin_initial">Sistem Yöneticisi</option>
                {allUsers.filter(u => u.role === 'admin' && u.uid !== 'admin_initial').map(admin => (
                  <option key={admin.uid} value={admin.uid}>{admin.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase">Yıllık İzin Bakiyesi (Gün)</label>
              <input name="leaveBalance" type="number" defaultValue={14} required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase">İşe Giriş Tarihi</label>
              <input name="startDate" type="date" required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase">Doğum Tarihi</label>
              <input name="birthDate" type="date" required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase">Cihaz Kısıtlaması (UA)</label>
              <input name="allowedDevice" type="text" placeholder="Örn: iPhone, Samsung, SM-G991B"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase">Sabit Cihaz Kimliği</label>
              <input name="deviceId" type="text" placeholder="Otomatik tanımlanır veya ID girin"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 cursor-pointer hover:border-orange-500/50 transition-colors">
                <input name="canRemoteCheckIn" type="checkbox" value="true" className="h-4 w-4 accent-orange-500" />
                <div>
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    <Truck size={14} className="text-orange-500" /> Nakliye / Uzaktan Giriş Yetkisi
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Bu personel ofis dışından da giriş-çıkış yapabilir. Konumu kaydedilir, yöneticileri bildirim alır.</p>
                </div>
              </label>
            </div>
            <div className="md:col-span-2">
              <button className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white transition-colors hover:bg-orange-600">
                Personel Ekle
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 overflow-hidden">
        {/* Desktop */}
        <table className="hidden md:table w-full text-left">
          <thead>
            <tr className="border-b border-zinc-900 bg-zinc-900/40">
              {['İsim', 'ID', 'Yetki', 'İşlem'].map((h, i) => (
                <th key={h} className={cn("p-4 text-xs font-bold uppercase tracking-wider text-zinc-500", i === 3 && "text-right")}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {allUsers.filter(u => u.role !== 'deleted').map((u) => (
              <tr key={u.uid} className="hover:bg-zinc-900/30 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                      {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} className="h-full w-full object-cover" /> : u.name[0]}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium leading-none">{u.name}</span>
                      {u.title && <span className="text-[10px] text-zinc-500 font-medium mt-1 uppercase tracking-tight">{u.title}</span>}
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm text-zinc-400">{u.personnelId}</td>
                <td className="p-4">
                  <span className={cn("rounded-full px-2 py-1 text-[10px] font-bold uppercase", u.role === 'admin' ? "bg-orange-500/10 text-orange-500" : "bg-zinc-800 text-zinc-400")}>
                    {u.role === 'admin' ? 'Yönetici' : 'Personel'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {(profile?.role === 'admin' || u.managerId === user?.uid) && (
                      <button onClick={() => setEditingUser(u)} className="text-zinc-600 hover:text-orange-500 transition-colors"><Edit size={18} /></button>
                    )}
                    {profile?.role === 'admin' && u.uid !== user?.uid && (
                      <button onClick={() => setDeletingUser(u)} className="text-zinc-600 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-zinc-900">
          {allUsers.filter(u => u.role !== 'deleted').map((u) => (
            <div key={u.uid} className="p-4 flex items-center justify-between hover:bg-zinc-900/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold border border-zinc-700 overflow-hidden shrink-0">
                  {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} className="h-full w-full object-cover" /> : u.name[0]}
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-white leading-none">{u.name}</p>
                  {u.title && <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight leading-none">{u.title}</p>}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500">{u.personnelId}</span>
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase", u.role === 'admin' ? "bg-orange-500/10 text-orange-500" : "bg-zinc-800 text-zinc-600")}>
                      {u.role === 'admin' ? 'Yönet' : 'Pers'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(profile?.role === 'admin' || u.managerId === user?.uid) && (
                  <button onClick={() => setEditingUser(u)} className="p-2 text-zinc-500 active:text-orange-500 transition-colors"><Edit size={20} /></button>
                )}
                {profile?.role === 'admin' && u.uid !== user?.uid && (
                  <button onClick={() => setDeletingUser(u)} className="p-2 text-zinc-500 active:text-red-500 transition-colors"><Trash2 size={20} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
