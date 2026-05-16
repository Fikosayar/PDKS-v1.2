import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, User, Edit, CheckCircle, ChevronLeft, ChevronRight, Clock4, Key, Camera, Lock, Eye, EyeOff, Building2, MapPin, Truck, Plus, LogIn, LogOut, ShieldAlert, Clock3, Clock, Trash2, FileText, Download, XCircle, QrCode, Wifi } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import QRScanner from '../QRScanner';
import { UserProfile, AttendanceLog, LeaveRequest, OvertimeRequest } from '../../types';

export default function AppModals({
  editingUser, setEditingUser, allUsers, profile, user, db, setStatus, handlePasswordChange, newPassword, setNewPassword, showPasswordChangeModal, setShowPasswordChangeModal, showPassword, setShowPassword, handleAdminPasswordChange, adminPasswordChange, setAdminPasswordChange, showAdminPassword, setShowAdminPassword, 
  showRemoteModal, setShowRemoteModal, pendingScanType, isIpWhitelisted, currentIp, handleScanSuccess, 
  showManualLogModal, setShowManualLogModal, editingLog, manualLogType, setManualLogType, manualLogDate, setManualLogDate, manualLogTime, setManualLogTime, manualLogReason, setManualLogReason, handleManualLog, 
  editingLeave, setEditingLeave, handleLeaveRequest, 
  editingOvertime, setEditingOvertime, handleOvertimeRequest, 
  dashboardStatModal, setDashboardStatModal, 
  selectedDayDetails, setSelectedDayDetails, setEditingLog, setDeletingLog, setDeletingOvertime, setDeletingLeave, 
  deletingLeave, deletionReason, setDeletionReason, handleDeleteLeave, 
  deletingLog, deleteLog, 
  deletingOvertime, 
  deletingUser, deleteUser, 
  showScanner, setShowScanner, scanType, 
  doc, setDoc, updateDoc, 
  avatarBase64, setAvatarBase64, 
  viewingAttachment, setViewingAttachment, avatarUploading, getEffectiveLeaveBalance, handleDownloadAndOpen, handleUpdateUser, handleViewAttachment, leaveRequests, logs, overtimeRequests, remoteManualMode, remoteManualTime, remoteNote, remoteSubmitting, selectedPersonnelId, setAvatarUploading, setLogs, setRemoteManualMode, setRemoteManualTime, setRemoteNote, setRemoteSubmitting, setScanType, setDeletingUser, handleUpdateLeave, handleSelfPasswordChange
}: any) {
  return (
    <>
        {/* Edit User Modal */}
        <AnimatePresence>
          {editingUser && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-2xl rounded-3xl border border-zinc-900 bg-zinc-950 p-8 space-y-6 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Edit className="text-orange-500" /> Personel Düzenle
                  </h2>
                  <button 
                    onClick={() => setEditingUser(null)}
                    className="rounded-full bg-zinc-800 p-2 hover:bg-zinc-700"
                  >
                    <XCircle size={24} />
                  </button>
                </div>

                {/* Profil Fotoðrafý Yönetimi */}
                <div className="flex items-center gap-5 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/30">
                  <div className="relative group shrink-0">
                    {editingUser.avatarUrl ? (
                      <img src={editingUser.avatarUrl} alt={editingUser.name} className="h-20 w-20 rounded-full object-cover border-4 border-orange-500/30" />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 text-2xl font-black border-4 border-orange-500/10">
                        {editingUser.name[0]}
                      </div>
                    )}
                    <label className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <Camera size={20} className="text-white" />
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
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
                                canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
                                URL.revokeObjectURL(objectUrl);
                                resolve(canvas.toDataURL('image/jpeg', 0.8));
                              };
                              img.onerror = () => reject(new Error('Resim yüklenemedi.'));
                              img.src = objectUrl;
                            });
                            await updateDoc(doc(db, 'users', editingUser.uid), { avatarUrl: avatarBase64 });
                            setEditingUser(prev => prev ? { ...prev, avatarUrl: avatarBase64 } : prev);
                            // Personele bildirim gönder
                            await addDoc(collection(db, 'notifications'), {
                              userId: editingUser.uid,
                              title: 'Profil Fotoðrafýnýz Güncellendi',
                              message: `${profile?.name || 'Yöneticiniz'} profil fotoðrafýnýzý güncelledi.`,
                              type: 'info',
                              read: false,
                              link: '/profile',
                              createdAt: new Date().toISOString(),
                            });
                            setStatus({ type: 'success', message: `${editingUser.name} için profil fotoðrafý güncellendi.` });
                          } catch (err: any) {
                            setStatus({ type: 'error', message: 'Fotoðraf yüklenemedi: ' + err.message });
                          } finally {
                            setAvatarUploading(false);
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                    {avatarUploading && (
                      <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm mb-1">Profil Fotoðrafý</p>
                    <p className="text-[11px] text-zinc-500 mb-3">Resmin üzerine týklayarak fotoðrafý deðiþtirebilirsiniz. Deðiþiklik personele bildirim olarak iletilir.</p>
                    {editingUser.avatarUrl && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm('Profil fotoðrafý silinsin mi?')) return;
                          try {
                            await updateDoc(doc(db, 'users', editingUser.uid), { avatarUrl: null });
                            setEditingUser(prev => prev ? { ...prev, avatarUrl: undefined } : prev);
                            await addDoc(collection(db, 'notifications'), {
                              userId: editingUser.uid,
                              title: 'Profil Fotoðrafýnýz Silindi',
                              message: `${profile?.name || 'Yöneticiniz'} profil fotoðrafýnýzý kaldýrdý.`,
                              type: 'info',
                              read: false,
                              link: '/profile',
                              createdAt: new Date().toISOString(),
                            });
                            setStatus({ type: 'success', message: 'Fotoðraf silindi.' });
                          } catch (err: any) {
                            setStatus({ type: 'error', message: 'Silinemedi: ' + err.message });
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-500 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 size={11} /> Fotoðrafý Kaldýr
                      </button>
                    )}
                  </div>
                </div>

                <form onSubmit={handleUpdateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Ad Soyad</label>
                    <input 
                      name="name"
                      required
                      defaultValue={editingUser.name}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Ünvan / Pozisyon</label>
                    <input 
                      name="title"
                      defaultValue={editingUser.title || ''}
                      placeholder="Örn: Bölüm Müdürü, Tekniker"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Yetki</label>
                    <select 
                      name="role"
                      defaultValue={editingUser.role}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    >
                      <option value="employee">Personel</option>
                      <option value="admin">Yönetici</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Baðlý Olduðu Yönetici</label>
                    <select 
                      name="managerId"
                      required
                      defaultValue={editingUser.managerId || 'admin_initial'}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    >
                      <option value="admin_initial">Sistem Yöneticisi</option>
                      {allUsers.filter(u => u.role === 'admin' && u.uid !== 'admin_initial').map(admin => (
                        <option key={admin.uid} value={admin.uid}>{admin.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase flex items-center justify-between">
                      Yýllýk Ýzin Bakiyesi (Gün)
                      <span className="text-[10px] text-orange-500 lowercase font-normal italic">Mevcut: {getEffectiveLeaveBalance(editingUser)} Gün</span>
                    </label>
                    <input 
                      name="leaveBalance"
                      type="number"
                      required
                      defaultValue={editingUser.leaveBalance}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Ýþe Giriþ Tarihi</label>
                    <input 
                      name="startDate"
                      type="date"
                      defaultValue={editingUser.startDate}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Doðum Tarihi</label>
                    <input 
                      name="birthDate"
                      type="date"
                      defaultValue={editingUser.birthDate}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Cihaz Kýsýtlamasý</label>
                    <input 
                      name="allowedDevice"
                      type="text"
                      defaultValue={editingUser.allowedDevice || ''}
                      placeholder="Örn: iPhone, Samsung"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-zinc-600">Boþ býrakýlýrsa her cihazdan giriþ yapabilir.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-500 uppercase">Sabit Cihaz Kimliði (Fixed ID)</label>
                      {editingUser.deviceId && (
                        <button 
                          type="button"
                          onClick={() => {
                            const newUpdates = { ...editingUser, deviceId: '' };
                            setEditingUser(newUpdates);
                            fetch('/api/users/update', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ 
                                adminUid: profile.uid,
                                targetUid: editingUser.uid,
                                updates: { deviceId: '' }
                              })
                            }).then(() => {
                              setStatus({ type: 'success', message: 'Cihaz kilidi kaldýrýldý.' });
                            });
                          }}
                          className="text-[10px] font-bold text-red-500 hover:underline"
                        >
                          Cihaz Kilidini Kaldýr
                        </button>
                      )}
                    </div>
                    <input 
                      name="deviceId"
                      type="text"
                      defaultValue={editingUser.deviceId || ''}
                      placeholder="Otomatik atanýr, manuel girmek için yapýþtýrýn"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  {/* Nakliye / Uzaktan giriþ yetkisi */}
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 cursor-pointer hover:border-orange-500/50 transition-colors">
                      <input 
                        name="canRemoteCheckIn"
                        type="checkbox"
                        value="true"
                        defaultChecked={editingUser.canRemoteCheckIn === true}
                        className="h-4 w-4 accent-orange-500"
                      />
                      <div>
                        <p className="text-sm font-semibold text-white flex items-center gap-2">
                          <Truck size={14} className="text-orange-500" />
                          Nakliye / Uzaktan Giriþ Yetkisi
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Bu personel ofis dýþýndan (nakliyede) da giriþ-çýkýþ yapabilir. Konumu kaydedilir, yöneticileri bildirim alýr.</p>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Þifre Sýfýrla (Yeni Þifre)</label>
                    <input 
                      name="password"
                      type="password"
                      placeholder="Deðiþtirmek istemiyorsanýz boþ býrakýn"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2 pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => {
                        setEditingUser(null);
                        setDeletingUser(editingUser);
                      }}
                      className="flex-1 rounded-xl bg-red-500/10 py-3 font-bold text-red-500 transition-colors hover:bg-red-500/20"
                    >
                      Sil
                    </button>
                    <button className="flex-[2] rounded-xl bg-orange-500 py-3 font-bold text-white transition-colors hover:bg-orange-600">
                      Deðiþiklikleri Kaydet
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Manual Log Modal */}
      <AnimatePresence>
        {showManualLogModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowManualLogModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-900 bg-zinc-950 p-6 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Clock4 size={24} className="text-orange-500" />
                    {editingLog ? 'Kaydý Düzenle' : 'Manuel Kayýt Ekle'}
                  </h3>
                  {/* Hedef kiþi adýný göster */}
                  {(() => {
                    const tid = selectedDayDetails?.userId || selectedPersonnelId || editingLog?.userId;
                    const tName = tid ? (allUsers.find(u => u.uid === tid)?.name || (profile?.uid === tid ? profile?.name : null)) : null;
                    return tName ? <p className="text-xs text-zinc-500 mt-0.5">Personel: <span className="text-orange-400 font-bold">{tName}</span></p> : null;
                  })()}
                </div>
                <button onClick={() => setShowManualLogModal(false)} className="text-zinc-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleManualLog} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Tarih</label>
                  <input
                    type="date"
                    required
                    value={manualLogDate}
                    onChange={(e) => setManualLogDate(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Saat</label>
                  <input
                    type="time"
                    required
                    value={manualLogTime}
                    onChange={(e) => setManualLogTime(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Ýþlem Tipi</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setManualLogType('in')}
                      className={cn(
                        "rounded-xl py-3 text-sm font-bold transition-colors",
                        manualLogType === 'in' ? "bg-emerald-600 text-white" : "bg-zinc-900 text-zinc-500"
                      )}
                    >
                      Giriþ
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualLogType('out')}
                      className={cn(
                        "rounded-xl py-3 text-sm font-bold transition-colors",
                        manualLogType === 'out' ? "bg-orange-600 text-white" : "bg-zinc-900 text-zinc-500"
                      )}
                    >
                      Çýkýþ
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  {editingLog && (
                    <button
                      type="button"
                      onClick={() => setDeletingLog(editingLog)}
                      className="flex-1 rounded-xl bg-red-500/10 py-4 font-bold text-red-500 transition-colors hover:bg-red-500/20"
                    >
                      Sil
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-[2] rounded-xl bg-orange-500 py-4 font-bold text-white transition-colors hover:bg-orange-600"
                  >
                    {editingLog ? 'Güncelle' : 'Kaydet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Leave Modal */}
      <AnimatePresence>
        {editingLeave && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingLeave(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg rounded-3xl border border-zinc-900 bg-zinc-950 p-6 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold">Ýzin Talebini Düzenle</h3>
                <button onClick={() => setEditingLeave(null)} className="rounded-full bg-zinc-900 p-2 text-zinc-500 hover:bg-zinc-800"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateLeave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Baþlangýç</label>
                    <input name="startDate" type="date" required defaultValue={editingLeave.startDate} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Bitiþ</label>
                    <input name="endDate" type="date" required defaultValue={editingLeave.endDate} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Gün Sayýsý</label>
                  <input name="days" type="number" required defaultValue={editingLeave.days} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Durum</label>
                  <select name="status" defaultValue={editingLeave.status} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none appearance-none">
                    <option value="pending">Bekliyor</option>
                    <option value="approved">Onaylandý</option>
                    <option value="rejected">Reddedildi</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Açýklama</label>
                  <textarea name="reason" required defaultValue={editingLeave.reason} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none h-24 resize-none" />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!editingLeave) return;
                      setDeletingLeave(editingLeave);
                      setEditingLeave(null);
                    }}
                    className="flex-1 rounded-xl bg-red-500/10 py-3 font-bold text-red-500 transition-colors hover:bg-red-500/20"
                  >
                    Sil
                  </button>
                  <button type="submit" className="flex-[2] rounded-xl bg-orange-500 py-3 font-bold text-white transition-colors hover:bg-orange-600">Güncelle</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Overtime Edit Modal */}
      <AnimatePresence>
        {editingOvertime && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingOvertime(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg rounded-3xl border border-zinc-900 bg-zinc-950 p-6 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold">Mesai Düzenle</h3>
                <button onClick={() => setEditingOvertime(null)} className="rounded-full bg-zinc-900 p-2 text-zinc-500 hover:bg-zinc-800"><X size={20} /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await updateDoc(doc(db, 'overtimeRequests', editingOvertime.id!), {
                  date: formData.get('date'),
                  hours: Number(formData.get('hours')),
                  description: formData.get('description'),
                  status: formData.get('status')
                });
                setEditingOvertime(null);
                setStatus({ type: 'success', message: 'Mesai kaydý güncellendi' });
              }} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Tarih</label>
                  <input name="date" type="date" required defaultValue={editingOvertime.date} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Saat</label>
                  <input name="hours" type="number" step="0.5" required defaultValue={editingOvertime.hours} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Durum</label>
                  <select name="status" defaultValue={editingOvertime.status} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none appearance-none">
                    <option value="pending">Bekliyor</option>
                    <option value="approved">Onaylandý</option>
                    <option value="rejected">Reddedildi</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Açýklama</label>
                  <textarea name="description" required defaultValue={editingOvertime.description} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none h-24 resize-none" />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!editingOvertime?.id) return;
                      await setDoc(doc(db, 'overtimeRequests', editingOvertime.id), {
                        deleted: true,
                      }, { merge: true });
                      setEditingOvertime(null);
                      setStatus({ type: 'success', message: 'Mesai kaydý silindi.' });
                    }}
                    className="flex-1 rounded-xl bg-red-500/10 py-3 font-bold text-red-500 transition-colors hover:bg-red-500/20"
                  >
                    Sil
                  </button>
                  <button type="submit" className="flex-[2] rounded-xl bg-orange-500 py-3 font-bold text-white transition-colors hover:bg-orange-600">Güncelle</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordChangeModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPasswordChangeModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm rounded-3xl border border-zinc-900 bg-zinc-950 p-6 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Key size={24} className="text-orange-500" /> Þifreyi Deðiþtir
                </h3>
                <button onClick={() => setShowPasswordChangeModal(false)} className="rounded-full bg-zinc-900 p-2 text-zinc-500 hover:bg-zinc-800"><X size={20} /></button>
              </div>
              <form onSubmit={handleSelfPasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Yeni Þifre</label>
                  <input 
                    type="password" 
                    required 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Þifrenizi girin" 
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" 
                  />
                </div>
                <button type="submit" className="w-full rounded-xl bg-orange-500 py-4 font-bold text-white transition-colors hover:bg-orange-600">Güncelle</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dashboard Stat Detail Modal */}
      <AnimatePresence>
        {dashboardStatModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDashboardStatModal(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className={cn(
                "px-6 py-5 flex items-center justify-between",
                dashboardStatModal.color === 'emerald' ? "bg-emerald-500/10 border-b border-emerald-500/20" :
                dashboardStatModal.color === 'orange' ? "bg-orange-500/10 border-b border-orange-500/20" :
                dashboardStatModal.color === 'red' ? "bg-red-500/10 border-b border-red-500/20" :
                "bg-zinc-900/40 border-b border-zinc-800"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-xl",
                    dashboardStatModal.color === 'emerald' ? "bg-emerald-500/20 text-emerald-400" :
                    dashboardStatModal.color === 'orange' ? "bg-orange-500/20 text-orange-400" :
                    dashboardStatModal.color === 'red' ? "bg-red-500/20 text-red-400" :
                    "bg-zinc-800 text-zinc-400"
                  )}>
                    {dashboardStatModal.icon}
                  </div>
                  <div>
                    <p className="font-black text-white">{dashboardStatModal.title}</p>
                    <p className="text-xs text-zinc-400">{dashboardStatModal.people.length} kiþi · Bugün</p>
                  </div>
                </div>
                <button onClick={() => setDashboardStatModal(null)} className="rounded-full bg-zinc-800/60 p-2 text-zinc-400 hover:bg-zinc-700">
                  <X size={18} />
                </button>
              </div>
              {/* List */}
              <div className="max-h-[60vh] overflow-y-auto divide-y divide-zinc-900">
                {dashboardStatModal.people.length === 0 ? (
                  <div className="p-10 text-center text-zinc-500 text-sm">Bu kategoride kimse yok.</div>
                ) : (
                  dashboardStatModal.people.map(p => (
                    <div key={p.uid} className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-900/40 transition-colors">
                      <div className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center text-sm font-black shrink-0",
                        dashboardStatModal.color === 'emerald' ? "bg-emerald-500/20 text-emerald-400" :
                        dashboardStatModal.color === 'orange' ? "bg-orange-500/20 text-orange-400" :
                        dashboardStatModal.color === 'red' ? "bg-red-500/20 text-red-400" :
                        "bg-zinc-800 text-zinc-400"
                      )}>
                        {p.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{p.name}</p>
                        <p className="text-[11px] text-zinc-500 truncate">{p.detail}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Day Details Modal */}
      <AnimatePresence>
        {selectedDayDetails && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedDayDetails(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg rounded-3xl border border-zinc-900 bg-zinc-950 p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="mb-6 flex items-center justify-between sticky top-0 bg-zinc-950 py-2 z-10 border-b border-zinc-900">
                <div>
                  <h3 className="text-xl font-bold">{format(new Date(selectedDayDetails.date), 'd MMMM yyyy', { locale: tr })}</h3>
                  <p className="text-xs text-zinc-500">
                    {(allUsers.find(u => u.uid === selectedDayDetails.userId)?.name 
                      || (profile?.uid === selectedDayDetails.userId ? profile?.name : null)
                      || 'Personel') + ' Hareketleri'}
                  </p>
                </div>
                <button onClick={() => setSelectedDayDetails(null)} className="rounded-full bg-zinc-900 p-2 text-zinc-500 hover:bg-zinc-800"><X size={20} /></button>
              </div>
              
              <div className="space-y-6 pt-4">
                {/* Manuel Hareket Ekle: admin veya bu günün sahibinin yöneticisi */}
                {(() => {
                  const dayUserId = selectedDayDetails.userId;
                  const dayUser = allUsers.find(u => u.uid === dayUserId);
                  const canAddManual = profile?.role === 'admin' ||
                    dayUser?.managerId === profile?.uid ||
                    (dayUserId === profile?.uid && profile?.canRemoteCheckIn);
                  if (!canAddManual) return null;
                  return (
                    <button
                      onClick={() => {
                        setEditingLog(null);
                        setManualLogDate(selectedDayDetails.date);
                        setManualLogTime(format(new Date(), 'HH:mm'));
                        setManualLogType('in');
                        setShowManualLogModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 py-4 text-emerald-500 font-bold hover:bg-emerald-500/20 transition-all border border-emerald-500/20 border-dashed"
                    >
                      <Plus size={20} /> Manuel Hareket Ekle
                    </button>
                  );
                })()}
                {/* Logs Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                    <LogIn size={14} className="text-emerald-500" /> Giriþ-Çýkýþ Kayýtlarý
                  </h4>
                  <div className="space-y-2">
                    {logs.filter(l => l.userId === selectedDayDetails.userId && !l.deleted && l.timestamp?.toDate && format(l.timestamp.toDate(), 'yyyy-MM-dd') === selectedDayDetails.date).length === 0 ? (
                      <p className="text-xs italic text-zinc-600 py-2 text-center">Bu gün için giriþ/çýkýþ kaydý yok.</p>
                    ) : (
                      logs.filter(l => l.userId === selectedDayDetails.userId && !l.deleted && l.timestamp?.toDate && format(l.timestamp.toDate(), 'yyyy-MM-dd') === selectedDayDetails.date)
                        .sort((a,b) => a.timestamp.toDate() - b.timestamp.toDate())
                        .map(log => (
                        <div key={log.id} className={cn(
                          "flex items-center justify-between p-3 rounded-xl border",
                          log.status === 'pending' 
                            ? "bg-amber-500/5 border-amber-500/20" 
                            : "bg-zinc-900/40 border-zinc-800"
                        )}>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg", 
                              log.status === 'error' ? "bg-red-500/10 text-red-500" :
                              log.status === 'pending' ? "bg-amber-500/10 text-amber-400" :
                              log.type === 'in' ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                            )}>
                              {log.status === 'error' ? <ShieldAlert size={14} /> : 
                               log.status === 'pending' ? <Clock3 size={14} /> :
                               log.type === 'in' ? <LogIn size={14} /> : <LogOut size={14} />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold truncate">
                                {format(log.timestamp.toDate(), 'HH:mm')}
                                {log.status === 'pending' && <span className="ml-2 text-[9px] text-amber-400 font-black uppercase">Onay Bekliyor</span>}
                                {log.status === 'error' && <span className="ml-2 text-[9px] text-red-500 font-black uppercase">Hata</span>}
                              </p>
                              <p className="text-[10px] text-zinc-500 uppercase truncate">
                                {log.status === 'error' ? log.errorMessage : 
                                 log.status === 'pending' ? 'Yönetici onayý bekleniyor' :
                                 (log.type === 'in' ? 'Giriþ' : 'Çýkýþ')}
                              </p>
                              <p className="text-[9px] text-zinc-600 font-mono truncate">{log.ipAddress}</p>
                            </div>
                          </div>
                          {(profile?.role === 'admin' || allUsers.find(u => u.uid === log.userId)?.managerId === profile?.uid) && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => {
                                setEditingLog(log);
                                setManualLogDate(format(log.timestamp.toDate(), 'yyyy-MM-dd'));
                                setManualLogTime(format(log.timestamp.toDate(), 'HH:mm'));
                                setManualLogType(log.type);
                                setShowManualLogModal(true);
                              }} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500"><Edit size={14}/></button>
                              <button onClick={() => setDeletingLog(log)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-red-500"><Trash2 size={14}/></button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Overtime Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                    <Clock size={14} className="text-blue-500" /> Mesai Kayýtlarý
                  </h4>
                  <div className="space-y-2">
                    {overtimeRequests.filter(r => r.userId === selectedDayDetails.userId && r.date === selectedDayDetails.date).length === 0 ? (
                      <p className="text-xs italic text-zinc-600 py-2 text-center">Bu gün için mesai kaydý yok.</p>
                    ) : (
                      overtimeRequests.filter(r => r.userId === selectedDayDetails.userId && r.date === selectedDayDetails.date).map(req => (
                        <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 border border-zinc-800">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                              <Clock size={14} />
                            </div>
                            <div>
                              <p className="text-sm font-bold">{req.hours} Saat</p>
                              <p className={cn("text-[9px] font-bold uppercase", 
                                req.status === 'approved' ? "text-emerald-500" : 
                                req.status === 'pending' ? "text-orange-500" : "text-red-500"
                              )}>{req.status}</p>
                            </div>
                          </div>
                          {profile?.role === 'admin' && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => setEditingOvertime(req)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500"><Edit size={14}/></button>
                              <button 
                                onClick={() => setDeletingOvertime(req)} 
                                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-red-500"
                              >
                                <Trash2 size={14}/>
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Confirm Delete Overtime Modal */}
                <AnimatePresence>
                  {deletingOvertime && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeletingOvertime(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative w-full max-w-sm rounded-3xl border border-zinc-900 bg-zinc-950 p-6 shadow-2xl text-center"
                      >
                        <div className="mb-4 flex justify-center text-red-500"><Trash2 size={32} /></div>
                        <h3 className="text-xl font-bold mb-2">Mesai Silinsin mi?</h3>
                        <p className="text-sm text-zinc-500 mb-6">{deletingOvertime.date} tarihli {deletingOvertime.hours} saatlik mesai kaydý silinecektir.</p>
                        <div className="flex gap-3">
                          <button onClick={() => setDeletingOvertime(null)} className="flex-1 rounded-xl bg-zinc-900 py-3 font-bold text-zinc-400">Vazgeç</button>
                          <button 
                            onClick={async () => {
                              await setDoc(doc(db, 'overtimeRequests', deletingOvertime.id!), {
                                deleted: true,
                              }, { merge: true });
                              setDeletingOvertime(null);
                              setStatus({ type: 'success', message: 'Mesai kaydý silindi.' });
                            }} 
                            className="flex-1 rounded-xl bg-red-500 py-3 font-bold text-white"
                          >
                            Sil
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Leave Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                    <FileText size={14} className="text-orange-500" /> Ýzin Kayýtlarý
                  </h4>
                  <div className="space-y-2">
                    {leaveRequests.filter(r => r.userId === selectedDayDetails.userId && selectedDayDetails.date >= r.startDate && selectedDayDetails.date <= r.endDate).length === 0 ? (
                      <p className="text-xs italic text-zinc-600 py-2 text-center">Bu gün için izin kaydý yok.</p>
                    ) : (
                      leaveRequests.filter(r => r.userId === selectedDayDetails.userId && selectedDayDetails.date >= r.startDate && selectedDayDetails.date <= r.endDate).map(req => (
                        <div key={req.id} className="flex flex-col p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn("p-2 rounded-lg", req.type === 'report' ? "bg-purple-500/10 text-purple-500" : "bg-orange-500/10 text-orange-500")}>
                                <FileText size={14} />
                              </div>
                              <div>
                                <p className="text-sm font-bold capitalize">{req.type === 'report' ? 'Rapor' : (req.type === 'excuse' ? 'Mazeret' : 'Yýllýk Ýzin')}</p>
                                <p className={cn("text-[9px] font-bold uppercase", 
                                  req.status === 'approved' ? "text-emerald-500" : 
                                  req.status === 'pending' ? "text-orange-500" : "text-red-500"
                                )}>{req.status}</p>
                              </div>
                            </div>
                            {profile?.role === 'admin' && (
                              <div className="flex items-center gap-1">
                                <button onClick={() => setEditingLeave(req)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500"><Edit size={14}/></button>
                                <button onClick={() => setDeletingLeave(req)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-red-500"><Trash2 size={14}/></button>
                              </div>
                            )}
                          </div>
                          
                          {req.attachmentUrl && (
                            <button 
                              onClick={() => handleViewAttachment(req.attachmentUrl!)}
                              className="flex items-center gap-2 rounded-lg bg-zinc-950 p-2 text-[10px] font-bold text-emerald-400 hover:bg-zinc-900 transition-colors mt-2"
                            >
                              <Download size={14} /> Rapor Belgesini Görüntüle
                            </button>
                          )}
                          <p className="text-[10px] text-zinc-500 italic">"{req.reason}"</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Leave Modal */}
      <AnimatePresence>
        {deletingLeave && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeletingLeave(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm rounded-3xl border border-zinc-900 bg-zinc-950 p-6 shadow-2xl text-center"
            >
              <div className="mb-4 flex justify-center text-red-500"><Trash2 size={40} /></div>
              <h3 className="mb-2 text-xl font-bold">Talebi Sil</h3>
              <p className="mb-4 text-sm text-zinc-500">Bu izin talebini silmek istediðinize emin misiniz? Personele silme nedeni bildirilecektir.</p>
              
              <div className="mb-6 space-y-1 text-left">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Silme Nedeni (Zorunlu)</label>
                <textarea 
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="Ýptal edilme sebebi..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm focus:border-red-500 focus:outline-none h-20 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => {
                  setDeletingLeave(null);
                  setDeletionReason('');
                }} className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-bold text-zinc-500">Vazgeç</button>
                <button 
                  onClick={() => handleDeleteLeave(deletingLeave.id!, deletionReason)}
                  disabled={!deletionReason.trim()}
                  className={cn(
                    "flex-1 rounded-xl py-3 text-sm font-bold text-white transition-colors",
                    deletionReason.trim() ? "bg-red-600 hover:bg-red-500" : "bg-zinc-800 cursor-not-allowed text-zinc-600"
                  )}
                >
                  Sil
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Deletion Confirmation Modal */}
      <AnimatePresence>
        {deletingLog && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingLog(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-zinc-900 bg-zinc-950 p-6 shadow-2xl text-center"
            >
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-red-500/10 p-4 text-red-500">
                  <Trash2 size={32} />
                </div>
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">Kaydý Sil</h3>
              <p className="mb-6 text-sm text-zinc-400">
                Bu kayýt silinecek, emin misiniz? Bu iþlem geri alýnamaz.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingLog(null)}
                  className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-bold text-zinc-400 transition-colors hover:bg-zinc-800"
                >
                  Vazgeç
                </button>
                <button
                  onClick={() => deleteLog(deletingLog)}
                  className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white transition-colors hover:bg-red-600"
                >
                  Evet, Sil
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Overtime Modal */}
      <AnimatePresence>
        {deletingOvertime && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeletingOvertime(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm rounded-3xl border border-zinc-900 bg-zinc-950 p-6 shadow-2xl text-center"
            >
              <div className="mb-4 flex justify-center text-red-500"><Trash2 size={40} /></div>
              <h3 className="mb-2 text-xl font-bold">Mesaiyi Sil</h3>
              <p className="mb-6 text-sm text-zinc-500">Bu mesai kaydýný silmek istediðinize emin misiniz?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingOvertime(null)} className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-bold text-zinc-500">Vazgeç</button>
                <button onClick={async () => {
                  try {
                    await setDoc(doc(db, 'overtimeRequests', deletingOvertime.id!), {
                      deleted: true,
                    }, { merge: true });
                    setDeletingOvertime(null);
                    setStatus({ type: 'success', message: 'Mesai kaydý silindi' });
                  } catch (e) {
                    setStatus({ type: 'error', message: 'Hata oluþtu' });
                  }
                }} className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white">Sil</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete User Modal */}
      <AnimatePresence>
        {deletingUser && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingUser(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-zinc-900 bg-zinc-950 p-6 shadow-2xl text-center"
            >
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-red-500/10 p-4 text-red-500">
                  <Trash2 size={32} />
                </div>
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">Personeli Sil</h3>
              <p className="mb-6 text-sm text-zinc-400">
                <strong>{deletingUser.name}</strong> isimli personeli silmek istediðinize emin misiniz? Bu iþlem personelin sisteme giriþini engelleyecektir.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingUser(null)}
                  className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-bold text-zinc-400 transition-colors hover:bg-zinc-800"
                >
                  Vazgeç
                </button>
                <button
                  onClick={() => deleteUser(deletingUser.uid)}
                  className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white transition-colors hover:bg-red-600"
                >
                  Evet, Sil
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Scanner Modal */}
        <AnimatePresence>
          {showScanner && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-md space-y-4"
              >
                <div className="flex items-center justify-between text-white">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <QrCode /> {scanType === 'in' ? 'Giriþ' : 'Çýkýþ'} Taramasý
                  </h2>
                  <button 
                    onClick={() => setShowScanner(false)}
                    className="rounded-full bg-zinc-800 p-2 hover:bg-zinc-700"
                  >
                    <XCircle size={24} />
                  </button>
                </div>
                <QRScanner 
                  onScanSuccess={handleScanSuccess} 
                  onScanError={(err) => {
                    // Only show fatal errors like permission denied
                    if (err.includes("izni reddedildi") || err.includes("baþlatýlamadý")) {
                      setStatus({ type: 'error', message: err });
                      setShowScanner(false);
                    }
                  }}
                />
                <div className="flex items-center gap-2 rounded-xl bg-orange-500/10 p-4 text-xs text-orange-500">
                  <Wifi size={16} />
                  <span>Sadece iþ yeri Wi-Fi aðýna baðlýyken tarama yapabilirsiniz.</span>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      {/* Nakliye / Uzaktan Giriþ Seçim Modal */}
      <AnimatePresence>
        {showRemoteModal && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 overflow-hidden"
            >
              {/* Baþlýk */}
              <div className="flex items-center gap-3 p-5 border-b border-zinc-800">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 shrink-0">
                  <Truck size={22} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">Giriþ Yöntemi</h3>
                  <p className="text-xs text-zinc-500">
                    {pendingScanType === 'in' ? '?? Giriþ' : '?? Çýkýþ'} iþlemi — Bir yöntem seçin
                  </p>
                </div>
                <button onClick={() => { setShowRemoteModal(false); setRemoteManualMode(false); setRemoteNote(''); setRemoteManualTime(''); }} className="text-zinc-500 hover:text-white p-1">
                  <X size={20} />
                </button>
              </div>

              {!remoteManualMode ? (
                /* === EKRAN 1: Yöntem Seçimi === */
                <div className="p-5 space-y-3">
                  {/* QR Seçeneði */}
                  <button
                    onClick={() => {
                      if (pendingScanType) {
                        setScanType(pendingScanType);
                        setShowRemoteModal(false);
                        setRemoteManualMode(false);
                        setShowScanner(true);
                      }
                    }}
                    className="w-full flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-orange-500/50 hover:bg-zinc-900 transition-all text-left"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                      <QrCode size={22} />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">QR Kod ile Giriþ</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Ýþ yerindeki QR kodu kameraya okutun</p>
                    </div>
                    <ChevronRight size={18} className="ml-auto text-zinc-600" />
                  </button>

                  {/* Manuel Seçeneði */}
                  <button
                    onClick={() => {
                      setRemoteManualMode(true);
                      setRemoteManualTime(format(new Date(), 'HH:mm'));
                    }}
                    className="w-full flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-orange-500/50 hover:bg-zinc-900 transition-all text-left"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                      <Clock size={22} />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">Manuel Giriþ</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Saati kendiniz girin (nakliye, saha çalýþmasý)</p>
                    </div>
                    <ChevronRight size={18} className="ml-auto text-zinc-600" />
                  </button>

                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2">
                    <MapPin size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-400">Her iki yöntemde de konumunuz ve notunuz yöneticinize iletilir.</p>
                  </div>
                </div>
              ) : (
                /* === EKRAN 2: Manuel Giriþ Formu === */
                <div className="p-5 space-y-4">
                  <button onClick={() => setRemoteManualMode(false)} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition">
                    <ChevronLeft size={14} /> Geri dön
                  </button>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase">{pendingScanType === 'in' ? 'Giriþ Saati' : 'Çýkýþ Saati'}</label>
                    <input
                      type="time"
                      value={remoteManualTime}
                      onChange={(e) => setRemoteManualTime(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-2xl font-bold text-center focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase">Açýklama / Konum Notu</label>
                    <textarea
                      value={remoteNote}
                      onChange={(e) => setRemoteNote(e.target.value)}
                      placeholder="Örn: Ankara mal teslimi, þantiye çalýþmasý..."
                      rows={3}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { setShowRemoteModal(false); setRemoteManualMode(false); setRemoteNote(''); }}
                      className="rounded-xl border border-zinc-700 py-3 text-sm font-bold text-zinc-400 hover:bg-zinc-800 transition"
                    >
                      Ýptal
                    </button>
                    <button
                      disabled={remoteSubmitting || !remoteManualTime}
                      onClick={async () => {
                        if (!user || !profile || !pendingScanType || !remoteManualTime) return;
                        setRemoteSubmitting(true);
                        try {
                          // Saat bilgisini bugüne uygula
                          const [h, m] = remoteManualTime.split(':').map(Number);
                          const clientNow = new Date();
                          clientNow.setHours(h, m, 0, 0);

                          // GPS konum al
                          let location = undefined;
                          try {
                            const pos = await new Promise<GeolocationPosition>((res, rej) => {
                              navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 });
                            });
                            location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                          } catch {}

                          const logPayload = {
                            userId: user.uid,
                            userName: profile.name,
                            type: pendingScanType,
                            ipAddress: currentIp || 'Manuel',
                            location: location || null,
                            status: 'pending' as const,
                            isRemote: true,
                            remoteNote: remoteNote || '',
                            manualEntry: true,
                          };

                          const newDocRef = await addDoc(collection(db, 'attendance'), {
                            ...logPayload,
                            timestamp: clientNow, // Kullanýcýnýn girdiði saat
                          });

                          // Optimistik UI
                          const optimisticLog: AttendanceLog = {
                            id: newDocRef.id,
                            ...logPayload,
                            timestamp: { toDate: () => clientNow } as any,
                          };
                          setLogs(prev => [optimisticLog, ...prev.filter(l => l.id !== newDocRef.id)]);

                          // Bildirim gönder
                          fetch('/api/notify/checkin', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: user.uid, userName: profile.name, type: pendingScanType, isRemote: true, remoteNote: remoteNote || '' })
                          }).catch(() => {});

                          setStatus({ type: 'success', message: `?? Manuel ${pendingScanType === 'in' ? 'giriþ' : 'çýkýþ'} talebi alýndý. Yönetici onayýndan sonra kesinleþecek.` });
                          setShowRemoteModal(false);
                          setRemoteManualMode(false);
                          setRemoteNote('');
                          setRemoteManualTime('');
                        } catch (err) {
                          setStatus({ type: 'error', message: 'Manuel kayýt sýrasýnda hata oluþtu.' });
                        } finally {
                          setRemoteSubmitting(false);
                        }
                      }}
                      className="rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {remoteSubmitting ? <Clock size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                      {remoteSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Belge Görüntüleyici Modal */}
      {/* Belge Görüntüleyici Modal */}
      {viewingAttachment && (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-zinc-900 rounded-2xl overflow-hidden flex flex-col border border-zinc-800 h-[80vh] shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
              <h3 className="font-bold text-white flex items-center gap-2">
                <FileText size={18} className="text-emerald-500"/> Belge Görüntüleyici
              </h3>
              <button onClick={() => setViewingAttachment(null)} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 bg-black/80 p-2 sm:p-4 flex items-center justify-center overflow-auto relative">
              {viewingAttachment.startsWith('data:image') ? (
                <img src={viewingAttachment} alt="Rapor Belgesi" className="max-w-full max-h-full object-contain rounded-lg" />
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 text-center max-w-md mx-auto p-4">
                  <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                    <FileText size={48} className="text-red-500" />
                  </div>
                  <h4 className="text-xl font-bold text-white">PDF Belgesi</h4>
                  <p className="text-sm text-zinc-400">
                    Mobil cihazlarda (özellikle iOS) yerleþik PDF görüntüleyiciler tam uyumlu çalýþmayabilir. Belgeyi eksiksiz görüntülemek için lütfen cihazýnýza indirin veya açýn.
                  </p>
                  <button 
                    onClick={handleDownloadAndOpen}
                    className="mt-4 flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                  >
                    <Download size={18} /> Belgeyi Aç / Ýndir
                  </button>
                </div>
              )}
            </div>
            {viewingAttachment.startsWith('data:image') && (
              <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex justify-end gap-3">
                <button onClick={handleDownloadAndOpen} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <Download size={16} /> Cihaza Ýndir
                </button>
              </div>
            )}
          </div>
        </div>
      )}


    </>
  );
}



