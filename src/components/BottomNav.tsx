import React from 'react';
import { cn } from '../lib/utils';
import { 
  Clock, 
  FileText, 
  CheckCircle2, 
  Users, 
  QrCode, 
  Calendar, 
  User as UserIcon 
} from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile, AttendanceLog, LeaveRequest, OvertimeRequest, SystemNotification } from '../types';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profile: UserProfile | null;
  user: { uid: string } | null;
  allUsers: UserProfile[];
  leaveRequests: LeaveRequest[];
  overtimeRequests: OvertimeRequest[];
  notifications: SystemNotification[];
  logs: AttendanceLog[];
}

export default function BottomNav({
  activeTab,
  setActiveTab,
  profile,
  user,
  allUsers,
  leaveRequests,
  overtimeRequests,
  notifications,
  logs
}: BottomNavProps) {
  const handleTabClick = (tab: string) => {
    if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
    setActiveTab(tab);
  };

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 md:bottom-auto md:top-24 md:left-4 md:right-auto md:w-20 md:h-[calc(100vh-8rem)]">
      <div className="glass-panel theme-bg-card mx-auto max-w-lg md:max-w-none md:h-full w-full rounded-2xl flex md:flex-col items-center justify-between px-2 py-2 md:py-6 overflow-x-auto no-scrollbar gap-1">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => handleTabClick('home')}
          className={cn(
            "flex flex-1 md:flex-none flex-col items-center gap-1 py-1 px-1 transition-colors min-w-0 rounded-xl md:w-full md:py-3",
            activeTab === 'home' ? "text-orange-500 bg-orange-500/10" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Clock size={22} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
          <span className="text-[9px] font-bold truncate w-full text-center">Ana Sayfa</span>
        </motion.button>

        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => handleTabClick('leaves')}
          className={cn(
            "flex flex-1 md:flex-none flex-col items-center gap-1 py-1 px-1 transition-colors relative min-w-0 rounded-xl md:w-full md:py-3 shrink-0",
            activeTab === 'leaves' ? "text-orange-500 bg-orange-500/10" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <div className="relative">
            <FileText size={22} strokeWidth={activeTab === 'leaves' ? 2.5 : 2} />
            {notifications.some(n => !n.read && n.title.includes('İzin')) && (
              <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-zinc-900" />
            )}
          </div>
          <span className="text-[9px] font-bold truncate w-full text-center">Talepler</span>
        </motion.button>

        {(profile?.role === 'admin' || allUsers.some(u => u.managerId === user?.uid)) && (
          <>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => handleTabClick('approvals')}
              className={cn(
                "flex flex-1 md:flex-none flex-col items-center gap-1 py-1 px-1 transition-colors relative min-w-0 rounded-xl md:w-full md:py-3 shrink-0",
                activeTab === 'approvals' ? "text-orange-500 bg-orange-500/10" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <div className="relative">
                <CheckCircle2 size={22} strokeWidth={activeTab === 'approvals' ? 2.5 : 2} />
                {(() => {
                  // Kendi altındaki personelin bekleyen talepleri
                  const mySubordinateIds = allUsers.filter(u => u.managerId === user?.uid).map(u => u.uid);
                  const pendingLeave = leaveRequests.filter(r => r.status === 'pending' && mySubordinateIds.includes(r.userId)).length;
                  const pendingOvertime = overtimeRequests.filter(r => r.status === 'pending' && mySubordinateIds.includes(r.userId)).length;
                  const pendingManual = logs.filter(l => l.status === 'pending' && l.manualEntry && mySubordinateIds.includes(l.userId)).length;
                  const pendingCount = pendingLeave + pendingOvertime + pendingManual;
                  return pendingCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white shadow-lg ring-2 ring-zinc-900">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  );
                })()}
              </div>
              <span className="text-[9px] font-bold truncate w-full text-center">Onaylar</span>
            </motion.button>
          </>
        )}

        {profile?.role === 'admin' && (
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => handleTabClick('users')}
            className={cn(
              "flex flex-1 md:flex-none flex-col items-center gap-1 py-1 px-1 transition-colors min-w-0 rounded-xl md:w-full md:py-3 shrink-0",
              activeTab === 'users' ? "text-orange-500 bg-orange-500/10" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <Users size={22} strokeWidth={activeTab === 'users' ? 2.5 : 2} />
            <span className="text-[9px] font-bold truncate w-full text-center">Personel</span>
          </motion.button>
        )}
        
        {profile?.role === 'admin' && (
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => handleTabClick('qr')}
            className={cn(
              "flex flex-1 md:flex-none flex-col items-center gap-1 py-1 px-1 transition-colors min-w-0 focus:outline-none rounded-xl md:w-full md:py-3 shrink-0",
              activeTab === 'qr' ? "text-orange-500 bg-orange-500/10" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <QrCode size={22} strokeWidth={activeTab === 'qr' ? 2.5 : 2} />
            <span className="text-[9px] font-bold truncate w-full text-center">Ayarlar</span>
          </motion.button>
        )}

        {profile?.role === 'admin' && (
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => handleTabClick('movements')}
            className={cn(
              "flex flex-1 md:flex-none flex-col items-center gap-1 py-1 px-1 transition-colors min-w-0 focus:outline-none rounded-xl md:w-full md:py-3 shrink-0",
              activeTab === 'movements' ? "text-orange-500 bg-orange-500/10" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <Calendar size={22} strokeWidth={activeTab === 'movements' ? 2.5 : 2} />
            <span className="text-[9px] font-bold truncate w-full text-center">Hareketler</span>
          </motion.button>
        )}

        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => handleTabClick('profile')}
          className={cn(
            "flex flex-1 md:flex-none flex-col items-center gap-1 py-1 px-1 transition-colors min-w-0 rounded-xl md:w-full md:py-3",
            activeTab === 'profile' ? "text-orange-500 bg-orange-500/10" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <UserIcon size={22} strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
          <span className="text-[9px] font-bold truncate w-full text-center">Profil</span>
        </motion.button>
      </div>
    </nav>
  );
}
