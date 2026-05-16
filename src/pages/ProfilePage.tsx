import React from 'react';
import { User as UserIcon, Camera, Key, LogOut, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { UserProfile } from '../types';

interface ProfilePageProps {
  user: { uid: string };
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  setStatus: (v: { type: 'success' | 'error'; message: string } | null) => void;
  getEffectiveLeaveBalance: (u: UserProfile | null) => number;
  calculateLegalLeave: (startDate: string | undefined, birthDate: string | undefined) => number;
  handleLogout: () => void;
  setShowPasswordChangeModal: (v: boolean) => void;
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  avatarUploading: boolean;
  setAvatarUploading: (v: boolean) => void;
}

export default function ProfilePage({
  user, profile, setProfile, setStatus,
  getEffectiveLeaveBalance, calculateLegalLeave,
  handleLogout, setShowPasswordChangeModal,
  avatarInputRef, avatarUploading, setAvatarUploading
}: ProfilePageProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <UserIcon size={28} className="text-orange-500" /> Profil Bilgileri
        </h2>
      </div>

      <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 p-8 space-y-8">
        {/* Profil Fotoğrafı */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative group">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="h-28 w-28 rounded-full object-cover border-4 border-orange-500/30 shadow-xl"
              />
            ) : (
              <div className="h-28 w-28 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 border-4 border-orange-500/20">
                <UserIcon size={52} />
              </div>
            )}
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
            >
              {avatarUploading ? (
                <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={24} className="text-white" />
              )}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !user) return;
                if (file.size > 8 * 1024 * 1024) {
                  setStatus({ type: 'error', message: 'Fotoğraf en fazla 8MB olabilir.' });
                  return;
                }
                setAvatarUploading(true);
                try {
                  const avatarBase64 = await new Promise<string>((resolve, reject) => {
                    const img = new Image();
                    const objectUrl = URL.createObjectURL(file);
                    img.onload = () => {
                      const maxSize = 256;
                      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
                      const canvas = document.createElement('canvas');
                      canvas.width = img.width * scale;
                      canvas.height = img.height * scale;
                      const ctx = canvas.getContext('2d')!;
                      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                      URL.revokeObjectURL(objectUrl);
                      resolve(canvas.toDataURL('image/jpeg', 0.8));
                    };
                    img.onerror = () => reject(new Error('Resim yüklenemedi.'));
                    img.src = objectUrl;
                  });
                  await updateDoc(doc(db, 'users', user.uid), { avatarUrl: avatarBase64 });
                  setProfile(prev => prev ? { ...prev, avatarUrl: avatarBase64 } : prev);
                  setStatus({ type: 'success', message: 'Profil fotoğrafı güncellendi.' });
                } catch (err: any) {
                  setStatus({ type: 'error', message: 'Fotoğraf yüklenemedi: ' + err.message });
                } finally {
                  setAvatarUploading(false);
                  e.target.value = '';
                }
              }}
            />
          </div>

          <div className="text-center">
            <h3 className="text-2xl font-bold">{profile?.name}</h3>
            {profile?.title && <p className="text-orange-500 font-bold text-sm uppercase tracking-widest mt-1">{profile.title}</p>}
            <p className="text-zinc-500 text-xs mt-1">{profile?.role === 'admin' ? 'Yönetici' : 'Personel'}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="flex items-center gap-1.5 rounded-xl bg-orange-500/10 px-4 py-2 text-xs font-bold text-orange-500 hover:bg-orange-500/20 transition-colors disabled:opacity-50"
            >
              <Camera size={13} />
              {profile?.avatarUrl ? 'Değiştir' : 'Fotoğraf Ekle'}
            </button>
            {profile?.avatarUrl && (
              <button
                onClick={async () => {
                  if (!user) return;
                  if (!window.confirm('Profil fotoğrafı silinsin mi?')) return;
                  try {
                    await updateDoc(doc(db, 'users', user.uid), { avatarUrl: null });
                    setProfile(prev => prev ? { ...prev, avatarUrl: undefined } : prev);
                    setStatus({ type: 'success', message: 'Profil fotoğrafı silindi.' });
                  } catch (err: any) {
                    setStatus({ type: 'error', message: 'Silinemedi: ' + err.message });
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl bg-red-500/10 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={13} /> Sil
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Personel ID</p>
            <p className="font-medium">{profile?.personnelId}</p>
          </div>
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">İşe Giriş Tarihi</p>
            <p className="font-medium">
              {profile?.startDate ? format(new Date(profile.startDate), 'd MMMM yyyy', { locale: tr }) : '-'}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4 space-y-1 md:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Resmi Yıllık İzin Bakiyesi</p>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-orange-500">
                {getEffectiveLeaveBalance(profile)} GÜN
              </p>
              <div className="text-right">
                <p className="text-[9px] text-zinc-500 uppercase">Hukuki Hak Ediş (Referans)</p>
                <p className="text-xs font-bold text-zinc-400">{calculateLegalLeave(profile?.startDate, profile?.birthDate)} Gün</p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 space-y-4">
          <button 
            onClick={() => setShowPasswordChangeModal(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500/10 py-4 font-bold text-orange-500 transition-colors hover:bg-orange-500/20"
          >
            <Key size={20} /> Şifreyi Değiştir
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500/10 py-4 font-bold text-red-500 transition-colors hover:bg-red-500/20"
          >
            <LogOut size={20} /> Oturumu Kapat
          </button>
        </div>
      </div>
    </section>
  );
}

