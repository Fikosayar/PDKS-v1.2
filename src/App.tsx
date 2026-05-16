// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, AttendanceLog, GlobalSettings, LeaveRequest, OvertimeRequest, SystemNotification, OfflineQueueItem } from './types';
import { subscribeToPush, requestNotificationPermission, showLocalNotification, VAPID_PUBLIC_KEY } from './lib/pushNotifications';
import { addToOfflineQueue, getOfflineQueue, removeFromOfflineQueue } from './lib/offlineQueue';
import { cn } from './lib/utils';
import { useProfile, useUsers, useLogs, useSettings, useNotifications, useLeaveRequests, useOvertimeRequests, useAttendanceMutation, useSettingsMutation, useLeaveMutation, useOvertimeMutation, useUserMutation } from './api/hooks';
import { 
  LogOut, 
  LogIn, 
  User as UserIcon, 
  Calendar, 
  MapPin, 
  Shield, 
  Settings as SettingsIcon,
  CheckCircle2,
  XCircle,
  Clock,
  QrCode,
  Wifi,
  WifiOff,
  Users,
  Trash2,
  Plus,
  Edit,
  Clock3,
  Check,
  X,
  FileText,
  Printer,
  UploadCloud,
  Key,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Download,
  Clock4,
  ShieldAlert,
  AlertCircle,
  Bell,
  Info,
  Truck,
  CheckCircle,
  Sun,
  Moon,
  Monitor,
  AlertTriangle,
  UserX,
  Camera
} from 'lucide-react';

import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import QRScanner from './components/QRScanner';
import BottomNav from './components/BottomNav';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { getStoredTheme, setStoredTheme, applyTheme, listenSystemTheme, getEffectiveTheme, type Theme } from './lib/theme';
import { getHoliday } from './lib/holidays';
import LeavesPage from './pages/LeavesPage';
import ApprovalsPage from './pages/ApprovalsPage';

function dataURItoBlob(dataURI: string) {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}
export default function App() {
  const [user, setUser] = useState<{ uid: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([]);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  // --- React Query Integration ---
  const { data: qProfile, isLoading: isProfileLoading } = useProfile();
  const { data: qUsers } = useUsers();
  const { data: qLogs } = useLogs();
  const { data: qSettings } = useSettings();
  const { data: qNotifs } = useNotifications();
  const { data: qLeaves } = useLeaveRequests();
  const { data: qOvertime } = useOvertimeRequests();

  useEffect(() => {
    // Read session on mount
    const savedUser = localStorage.getItem('pdks_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    if (qProfile) setProfile(qProfile);
    if (qUsers) setAllUsers(qUsers);
    if (qLogs) setLogs(qLogs);
    if (qSettings) setSettings(qSettings);
    if (qNotifs) setNotifications(qNotifs);
    if (qLeaves) setLeaveRequests(qLeaves);
    if (qOvertime) setOvertimeRequests(qOvertime);
    
    if (!isProfileLoading && user) setLoading(false);
  }, [qProfile, qUsers, qLogs, qSettings, qNotifs, qLeaves, qOvertime, isProfileLoading, user]);

  const [showScanner, setShowScanner] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname === '/' || location.pathname === '' ? 'home' : location.pathname.substring(1);
  const setActiveTab = (tab: string) => navigate(`/${tab}`);
  
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [editingLog, setEditingLog] = useState<AttendanceLog | null>(null);
  const [deletingLog, setDeletingLog] = useState<AttendanceLog | null>(null);
  const [showManualLogModal, setShowManualLogModal] = useState(false);
  const [manualLogDate, setManualLogDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [manualLogTime, setManualLogTime] = useState(format(new Date(), 'HH:mm'));
  const [manualLogType, setManualLogType] = useState<'in' | 'out'>('in');
  const [scanType, setScanType] = useState<'in' | 'out' | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Status mesajlar otomatik kaybolsun
  useEffect(() => {
    if (!status) return;
    const timeout = status.type === 'success' ? 4000 : 6000;
    const timer = setTimeout(() => setStatus(null), timeout);
    return () => clearTimeout(timer);
  }, [status]);

  const [currentIp, setCurrentIp] = useState<string>('');
  const [loginError, setLoginError] = useState<React.ReactNode | null>(null);
  const [calcLeaveDays, setCalcLeaveDays] = useState<number>(0);
  const [editingLeave, setEditingLeave] = useState<LeaveRequest | null>(null);
  const [deletingLeave, setDeletingLeave] = useState<LeaveRequest | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [leaveType, setLeaveType] = useState<'annual' | 'report' | 'excuse'>('annual');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const attendanceMutation = useAttendanceMutation();
  const settingsMutation = useSettingsMutation();
  const leaveMutation = useLeaveMutation();
  const overtimeMutation = useOvertimeMutation();
  const userMutation = useUserMutation();

  const [deletionReason, setDeletionReason] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [dashboardStatModal, setDashboardStatModal] = useState<null | { title: string; color: string; icon: React.ReactNode; people: { name: string; detail: string; uid: string }[] }>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  // Tema sistemi
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());
  const effectiveTheme = getEffectiveTheme(theme);

  useEffect(() => {
    applyTheme(theme);
    setStoredTheme(theme);
    // Sistem temas deiince gncelle
    if (theme === 'system') {
      return listenSystemTheme(() => applyTheme('system'));
    }
  }, [theme]);

  const cycleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : prev === 'light' ? 'system' : 'dark');
  };

  // evrimd mod
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  // Nakliye (uzaktan giri) modu
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [remoteNote, setRemoteNote] = useState('');
  const [pendingScanType, setPendingScanType] = useState<'in' | 'out' | null>(null);
  const [remoteManualMode, setRemoteManualMode] = useState(false); // true = manuel, false = QR
  const [remoteManualTime, setRemoteManualTime] = useState('');
  const [remoteSubmitting, setRemoteSubmitting] = useState(false);

  // Push bildirim durumu
  const [pushEnabled, setPushEnabled] = useState(false);



  const getEffectiveLeaveBalance = (u: UserProfile | null) => {
    if (!u) return 0;
    if (u.leaveBalance !== undefined && u.leaveBalance !== 0) return u.leaveBalance;
    return calculateLegalLeave(u.startDate, u.birthDate) || 0;
  };

  const calculateNetWorkDuration = (durationHours: number) => {
    if (!settings || !settings.breakRules || settings.breakRules.length === 0) {
      // Default Turkish Labor Law (Article 68) Minimums
      if (durationHours > 7.5) return Math.max(0, durationHours - 1);
      if (durationHours > 4) return Math.max(0, durationHours - 0.5);
      if (durationHours > 0) return Math.max(0, durationHours - 0.25);
      return 0;
    }

    // Sort rules by threshold descending
    const sortedRules = [...settings.breakRules].sort((a, b) => b.thresholdHours - a.thresholdHours);
    const applicableRule = sortedRules.find(r => durationHours >= r.thresholdHours);

    if (applicableRule) {
      return Math.max(0, durationHours - (applicableRule.deductionMinutes / 60));
    }
    return durationHours;
  };

  const getDeductedBreakTime = (durationHours: number) => {
    const net = calculateNetWorkDuration(durationHours);
    return durationHours - net;
  };

  const getOrCreateDeviceId = () => {
    // 1. nce LocalStorage'a bak
    let devId = localStorage.getItem('pdks_device_id');
    
    // 2. Yoksa erezlere (Cookie) bak (Safari bazen localStorage siler ama erezi tutar)
    if (!devId) {
      const match = document.cookie.match(new RegExp('(^| )pdks_device_id=([^;]+)'));
      if (match) devId = match[2];
    }
    
    // 3. kisinde de yoksa sfrdan olutur
    if (!devId) {
      devId = 'dev-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    
    // Her ihtimale kar ikisine birden tekrar glce kaydet
    try {
      localStorage.setItem('pdks_device_id', devId);
      // erezi 10 yl geerli olacak ekilde ayarla
      document.cookie = `pdks_device_id=${devId}; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/`;
    } catch (e) {
      console.warn("Tarayc veri kaydetmeyi engelliyor.");
    }
    
    return devId;
  };

  const calculateLegalLeave = (startDateStr: string | undefined, birthDateStr: string | undefined) => {
    if (!startDateStr) return 0;
    try {
      const start = new Date(startDateStr);
      const today = new Date();
      
      // Basic year difference
      let years = today.getFullYear() - start.getFullYear();
      
      // Month and day adjustment
      const m = today.getMonth() - start.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < start.getDate())) {
        years--;
      }

      // If they just started or haven't finished a year, 0
      if (years < 1) return 0;

      // Calculate age
      let age = 30;
      if (birthDateStr) {
        const birth = new Date(birthDateStr);
        age = today.getFullYear() - birth.getFullYear();
        const mAge = today.getMonth() - birth.getMonth();
        if (mAge < 0 || (mAge === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
      }

      // Turkish Labor Law
      let days = 14;
      if (years >= 5 && years < 15) days = 20;
      else if (years >= 15) days = 26;

      // Min 20 days for <18 or >=50 years old
      if (age <= 18 || age >= 50) return Math.max(days, 20);
      return days;
    } catch (e) {
      console.error("Leave calc error:", e);
      return 0;
    }
  };

  const dashboardStats = React.useMemo(() => {
    if (!profile || profile.role !== 'admin') return null;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const shiftStart = settings?.shiftStart || '08:00';

    // Sadece aktif personel (silinmemi)
    const activeUsers = allUsers.filter(u => u.role !== 'deleted');

    // Bugnn onayl loglar (pending dahil deil)
    const todayLogs = logs.filter(l =>
      !l.deleted &&
      l.status !== 'pending' &&
      l.status !== 'error' &&
      l.timestamp?.toDate &&
      format(l.timestamp.toDate(), 'yyyy-MM-dd') === todayStr
    );

    // Her personel iin bugnk en son durumu belirle (son log out mu in mi?)
    const userLastAction = new Map<string, string>(); // userId -> 'in' | 'out'
    const userFirstIn = new Map<string, string>();     // userId -> 'HH:mm' (ilk giri saati)

    todayLogs
      .sort((a, b) => (a.timestamp.toDate().getTime()) - (b.timestamp.toDate().getTime()))
      .forEach(l => {
        userLastAction.set(l.userId, l.type);
        if (l.type === 'in' && !userFirstIn.has(l.userId)) {
          userFirstIn.set(l.userId, format(l.timestamp.toDate(), 'HH:mm'));
        }
      });

    // u an ofiste: son hareketi 'in' olanlar
    const presentIds = new Set<string>();
    userLastAction.forEach((type, uid) => {
      if (type === 'in') presentIds.add(uid);
    });

    // Izinli bugn
    const onLeaveIds = new Set<string>(
      leaveRequests.filter(r =>
        r.status === 'approved' && !r.deleted &&
        r.startDate <= todayStr && r.endDate >= todayStr
      ).map(r => r.userId)
    );

    // Ge kalanlar: ilk giri saati mesai bandan sonra olan kiiler (kii ba 1 kez)
    let lateCount = 0;
    userFirstIn.forEach((time) => {
      if (time > shiftStart) lateCount++;
    });

    // Gelmeyen listesi: aktif, izinli deil, bugn hi giri yapmam
    const lateIds = new Set<string>();
    userFirstIn.forEach((time, uid) => { if (time > shiftStart) lateIds.add(uid); });
    const absentUserIds = new Set<string>();
    activeUsers.forEach(u => {
      if (!presentIds.has(u.uid) && !onLeaveIds.has(u.uid)) absentUserIds.add(u.uid);
    });

    // Kii listelerini de dndr
    const userMap = new Map<string, UserProfile>(activeUsers.map(u => [u.uid, u]));
    const presentList = [...presentIds].map(uid => {
      const u = userMap.get(uid);
      return { uid, name: u?.name || uid, detail: `Giris: ${userFirstIn.get(uid) || '-'}` };
    });
    const onLeaveList = [...onLeaveIds].map(uid => {
      const u = userMap.get(uid);
      return { uid, name: u?.name || uid, detail: u?.title || 'Izinli' };
    });
    const lateList = [...lateIds].map(uid => {
      const u = userMap.get(uid);
      return { uid, name: u?.name || uid, detail: `Giris: ${userFirstIn.get(uid) || '-'}` };
    });
    const absentList = [...absentUserIds].map(uid => {
      const u = userMap.get(uid);
      return { uid, name: u?.name || uid, detail: u?.title || 'Personel' };
    });

    const absentCount = Math.max(0, activeUsers.length - presentIds.size - onLeaveIds.size);

    return {
      totalStaff: activeUsers.length,
      present: presentIds.size, presentList,
      onLeave: onLeaveIds.size, onLeaveList,
      late: lateIds.size, lateList,
      absent: absentCount, absentList,
    };
  }, [logs, allUsers, leaveRequests, settings, profile]);


  const userLateCountThisMonth = React.useMemo(() => {
    if (!user || profile?.role === 'admin') return 0;
    const shiftStart = settings?.shiftStart || '08:00';
    const [year, month] = selectedMonth.split('-');
    let lateCount = 0;
    
    const userLogs = logs.filter(l => l.userId === user.uid && !l.deleted && l.type === 'in');
    
    // Her gnn sadece ilk giriini kontrol et
    const firstInsPerDay = new Map<string, string>(); // date -> time
    userLogs.forEach(l => {
      const dateStr = format(l.timestamp?.toDate() || new Date(), 'yyyy-MM-dd');
      if (!dateStr.startsWith(selectedMonth)) return;
      const timeStr = format(l.timestamp?.toDate() || new Date(), 'HH:mm');
      if (!firstInsPerDay.has(dateStr) || timeStr < firstInsPerDay.get(dateStr)!) {
        firstInsPerDay.set(dateStr, timeStr);
      }
    });

    firstInsPerDay.forEach((time) => {
      if (time > shiftStart) lateCount++;
    });

    return lateCount;
  }, [logs, selectedMonth, user, profile, settings]);

  // (Silinen duplicate blok)
  const [editingOvertime, setEditingOvertime] = useState<OvertimeRequest | null>(null);
  const [deletingOvertime, setDeletingOvertime] = useState<OvertimeRequest | null>(null);
  const [selectedDayDetails, setSelectedDayDetails] = useState<{ date: string, userId: string } | null>(null);

  const [calcOvertimeHours, setCalcOvertimeHours] = useState<number>(0);
  const [leaveStartDate, setLeaveStartDate] = useState<string>('');
  const [leaveEndDate, setLeaveEndDate] = useState<string>('');
  const [overtimeStartTime, setOvertimeStartTime] = useState<string>('18:00');
  const [overtimeEndTime, setOvertimeEndTime] = useState<string>('');

  useEffect(() => {
    if (settings?.shiftEnd) {
      setOvertimeStartTime(settings.shiftEnd);
    }
  }, [settings?.shiftEnd]);

  useEffect(() => {
    if (leaveStartDate && leaveEndDate) {
      const start = new Date(leaveStartDate);
      const end = new Date(leaveEndDate);
      if (end >= start) {
        let count = 0;
        const current = new Date(start);
        const workDays = settings?.workDaysPerWeek || 6;
        while (current <= end) {
          const dayOfWeek = current.getDay();
          const dateStr = current.toISOString().slice(0, 10);
          // Pazar her zaman tatil
          const isSunday = dayOfWeek === 0;
          // 5 gnlk Calisma dzeninde Cumartesi de tatil
          const isSaturday = dayOfWeek === 6 && workDays === 5;
          // Resmi tatil kontrol
          const isPublicHoliday = !!getHoliday(dateStr);
          
          if (!isSunday && !isSaturday && !isPublicHoliday) {
            count++;
          }
          current.setDate(current.getDate() + 1);
        }
        setCalcLeaveDays(count);
      } else {
        setCalcLeaveDays(0);
      }
    }
  }, [leaveStartDate, leaveEndDate, settings?.workDaysPerWeek]);

  useEffect(() => {
    if (overtimeStartTime && overtimeEndTime) {
      const [startH, startM] = overtimeStartTime.split(':').map(Number);
      const [endH, endM] = overtimeEndTime.split(':').map(Number);
      
      let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle overnight overtime
      
      setCalcOvertimeHours(parseFloat((diffMinutes / 60).toFixed(1)));
    }
  }, [overtimeStartTime, overtimeEndTime]);

  // Fetch current IP
  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setCurrentIp(data.ip))
      .catch(err => console.error("IP fetch error:", err));
  }, []);

  // Auth listener (Custom Session)
  useEffect(() => {
    const savedSession = localStorage.getItem('pdks_session');
    if (savedSession) {
      const sessionData = JSON.parse(savedSession);
      // Verify session with API
      const verifySession = async () => {
        try {
          const res = await fetch('/api/users/me', { headers: { 'Authorization': `Bearer ${sessionData.token}` } });
          if (res.ok) {
            const userData = await res.json();
            if (userData && userData.role !== 'deleted') {
              setUser({ uid: userData.id || userData.uid });
              setProfile(userData);
            } else {
              localStorage.removeItem('pdks_session');
            }
          } else {
            localStorage.removeItem('pdks_session');
          }
        } catch (error) {
          console.error("Session verification error:", error);
        } finally {
          setLoading(false);
        }
      };
      verifySession();
    } else {
      setLoading(false);
    }
  }, []);

  // Settings listener
  // [Migrated to React Query] Firebase listener removed
   // Logs listener  Admin: tm veriler | Personel/Manager: kendi verisi
  // [Migrated to React Query] Firebase listener removed

  // Ekip logs listener  Sadece yoneticiler iin (altndaki personelin hareketleri)
  // [Migrated to React Query] Firebase listener removed

  // Users listener (Admin and Managers)

  // [Migrated to React Query] Firebase listener removed

  // Notifications listener
  // [Migrated to React Query] Firebase listener removed

  // nternet balant takibi
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      // nternet gelince evrimd kuyruu senkronize et
      await syncOfflineQueueToFirebase();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, profile]);

  // SW mesajlarn dinle (bildirim tklamas ynlendirmesi)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE' && event.data.link) {
        navigate(event.data.link);
      }
      if (event.data?.type === 'SYNC_OFFLINE_QUEUE') {
        syncOfflineQueueToFirebase();
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [user, profile]);

  // Kullanc giri yaptktan sonra push abonelii kur
  useEffect(() => {
    if (!user) return;
    const setupPush = async () => {
      const granted = await requestNotificationPermission();
      if (granted) {
        const sub = await subscribeToPush();
        if (sub) {
          setPushEnabled(true);
          // Abonelii sunucuya kaydet
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: user.uid, subscription: sub })
          });
        }
      }
    };
    setupPush();
  }, [user]);

  // evrimd kuyruk saysn gncelle
  useEffect(() => {
    getOfflineQueue().then(q => setOfflineQueueCount(q.length));
  }, [user]);



  const markNotificationRead = async (id: string) => {
    try {
      await fetch('/api/notifications/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('pdks_token') }, body: JSON.stringify({ read: true }) });
    } catch (e) {
      console.error("Mark read error:", e);
    }
  };
  // evrimd kuyruu Firebase'e senkronize et
  const syncOfflineQueueToFirebase = useCallback(async () => {
    if (!user || !profile) return;
    const queue = await getOfflineQueue();
    if (queue.length === 0) return;
    
    let syncedCount = 0;
    for (const item of queue) {
      try {
        const { clientTimestamp, ...payload } = item.payload;
        await attendanceMutation.mutateAsync({ method: 'POST', payload: {
          ...payload,
          timestamp: new Date().toISOString(),
          offlineQueued: true,
          clientTimestamp
        } });
        await removeFromOfflineQueue(item.id);
        syncedCount++;
      } catch (err) {
        console.error('evrimd kayt senkronize edilemedi:', err);
      }
    }
    if (syncedCount > 0) {
      setOfflineQueueCount(0);
      setStatus({ type: 'success', message: `${syncedCount} evrimd hareket baaryla senkronize edildi!` });
    }
  }, [user, profile]);

  // Leave Requests listener

  // [Migrated to React Query] Firebase listener removed

  // Overtime Requests listener  or() yerine ayr query'ler (index gerektirmez)
  // [Migrated to React Query] Firebase listener removed

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError(null);
    const formData = new FormData(e.currentTarget);
    const personnelId = formData.get('personnelId') as string;
    const password = formData.get('password') as string;

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          personnelId, 
          password,
          deviceInfo: navigator.userAgent,
          permanentDeviceId: getOrCreateDeviceId()
        })
      });

      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error("Non-JSON response received:", text);
        throw new Error("Sunucudan geersiz yant alnd. Ltfen tekrar deneyin.");
      }

      if (response.ok && data.success !== false) {
        if (data.customToken) {
          localStorage.setItem('pdks_token', data.customToken);
          localStorage.setItem('pdks_user', JSON.stringify({ uid: data.uid }));
        }
        const session = { uid: data.uid, token: data.customToken };
        localStorage.setItem('pdks_session', JSON.stringify(session));
        setUser({ uid: data.uid });
        setProfile(data);
      } else {
        if (data.currentDevice) {
          setLoginError(
            <div className="space-y-2 rounded-xl bg-red-500/10 p-4 border border-red-500/20">
              <p className="font-bold text-red-500 flex items-center gap-2">
                <ShieldAlert size={16} /> {data.error}
              </p>
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Mevcut Cihaznz:</p>
                <div className="relative">
                  <p className="text-[11px] text-zinc-300 bg-zinc-900 p-2 rounded border border-zinc-800 break-all font-mono pr-8">{data.currentDevice}</p>
                  <button 
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(data.currentDevice);
                      setStatus({ type: 'success', message: 'Cihaz bilgisi kopyaland.' });
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    title="Kopyala"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
              {data.allowedDevice && (
                <div className="space-y-1">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Kaytl Olmas Gereken:</p>
                  <p className="text-[11px] text-orange-500 bg-orange-500/5 p-2 rounded border border-orange-500/20 font-mono">{data.allowedDevice}</p>
                </div>
              )}
              <p className="text-[10px] text-zinc-500 italic">
                Ltfen yoneticinizden cihaz bilginizi gncellemesini isteyin.
              </p>
            </div>
          );
        } else {
          setLoginError(data.error || 'Giris baarsz.');
        }
      }
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginError(
        <div className="flex flex-col items-center gap-2 justify-center text-center p-2">
          <AlertCircle size={20} className="text-red-500" />
          <div className="space-y-1">
            <p className="font-bold">Giris Hatas</p>
            <p className="text-[10px] opacity-80">{error?.message || 'Sistem hatas. Ltfen internet balantnz kontrol edin.'}</p>
          </div>
        </div>
      );
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pdks_session');
    setUser(null);
    setProfile(null);
  };

  const addUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (profile?.role !== 'admin') return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const title = formData.get('title') as string;
    const personnelId = formData.get('personnelId') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as 'admin' | 'employee';
    const managerId = formData.get('managerId') as string;
    const leaveBalance = parseInt(formData.get('leaveBalance') as string) || 14;
    const startDate = formData.get('startDate') as string;
    const birthDate = formData.get('birthDate') as string;
    const allowedDevice = formData.get('allowedDevice') as string;
    const deviceId = formData.get('deviceId') as string;
    const canRemoteCheckIn = formData.get('canRemoteCheckIn') === 'true';

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adminUid: profile.uid,
          newUser: { name, title, personnelId, password, role, managerId, leaveBalance, startDate, birthDate, allowedDevice, deviceId, canRemoteCheckIn }
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: 'Yeni personel baaryla eklendi.' });
        (e.target as HTMLFormElement).reset();
      } else {
        setStatus({ type: 'error', message: data.error || 'Personel eklenirken hata olutu.' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Sistem hatas.' });
    }
  };

  const handlePrintQR = () => {
    const qrElement = document.getElementById('qr-code-svg');
    if (!qrElement) {
      setStatus({ type: 'error', message: 'QR kod bulunamad.' });
      return;
    }

    const qrSvg = qrElement.outerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>PDKS QR Kod Yazdr</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; margin: 0; }
            .container { text-align: center; border: 4px solid #f97316; padding: 60px; border-radius: 40px; background: #fff; }
            h1 { margin-bottom: 30px; color: #f97316; font-size: 32px; }
            svg { width: 400px; height: 400px; }
            p { margin-top: 30px; font-size: 20px; color: #444; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>PDKS Giris/k QR Kodu</h1>
            ${qrSvg}
            <p>Ltfen giri ve klarda bu kodu okutunuz.</p>
          </div>
          <script>
            window.onload = () => { 
              setTimeout(() => {
                window.print(); 
                window.close(); 
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const regenerateQRSecret = async () => {
    if (profile?.role !== 'admin') return;
    const newSecret = `PDKS-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    try {
      await settingsMutation.mutateAsync({ ...settings, qrSecret: newSecret });
      setStatus({ type: 'success', message: 'QR kod baaryla guncellendi.' });
    } catch (error) {
      setStatus({ type: 'error', message: 'QR kod gncellenirken hata olutu.' });
    }
  };

  const isProcessingScan = React.useRef(false);
  const lastScanTimestamp = React.useRef<number>(0);
  const SCAN_COOLDOWN_MS = 60000; // 1 dakika mkerrer koruma

  const handleScanSuccess = async (decodedText: string) => {
    if (!settings || !user || !profile || !scanType || isProcessingScan.current) return;
    
    // Mkerrer okutma korumas: Son 1 dakika iinde ayn ilem yapldysa engelle
    const now = Date.now();
    if (now - lastScanTimestamp.current < SCAN_COOLDOWN_MS) {
      const kalanSaniye = Math.ceil((SCAN_COOLDOWN_MS - (now - lastScanTimestamp.current)) / 1000);
      setStatus({ type: 'error', message: `ok hzl okutma! Ltfen ${kalanSaniye} saniye bekleyin.` });
      setShowScanner(false);
      return;
    }
    
    isProcessingScan.current = true;
    // Scanner' hemen kapat ki ift okutma olmasn
    setShowScanner(false);
    
    try {
      // 1. QR Secret Check
      if (decodedText !== settings.qrSecret) {
        await attendanceMutation.mutateAsync({ method: 'POST', payload: {
          userId: user.uid,
          userName: profile.name,
          timestamp: new Date().toISOString(),
          type: scanType,
          ipAddress: currentIp,
          status: 'error',
          errorMessage: 'Geersiz QR Kod Okutuldu'
        } });
        setStatus({ type: 'error', message: 'Geersiz QR kod. Ltfen i yerindeki gncel kodu okutun.' });
        isProcessingScan.current = false;
        return;
      }

      // 2. IP Check (Nakliye yetkisi olan personel iin IP kontrol atla)
      const hasRemotePermission = profile.canRemoteCheckIn === true;
      if (settings.officeIp && currentIp !== settings.officeIp && !hasRemotePermission) {
        await attendanceMutation.mutateAsync({ method: 'POST', payload: {
          userId: user.uid,
          userName: profile.name,
          timestamp: new Date().toISOString(),
          type: scanType,
          ipAddress: currentIp,
          status: 'error',
          errorMessage: 'Hatal IP / A Eriimi Denemesi'
        } });
        setStatus({ type: 'error', message: `Hatal a. Sadece i yeri Wi-Fi ana balyken ilem yapabilirsiniz. (Mevcut IP: ${currentIp})` });
        isProcessingScan.current = false;
        return;
      }

      // 3. Nakliye modunda msn?
      const isRemote = hasRemotePermission && settings.officeIp && currentIp !== settings.officeIp;

      // 4. Konum al
      let location = undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        location = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        };
      } catch (e) {
        console.warn("Geolocation denied or failed");
      }

      const logPayload: any = {
        userId: user.uid,
        userName: profile.name,
        type: scanType,
        ipAddress: currentIp,
        location: location || null,
        status: 'success',
        isRemote: !!isRemote,
        remoteNote: isRemote ? (remoteNote || '') : null,
      };

      // 5. evrimd ise kuyrua al, online ise direkt yaz
      if (!isOnline) {
        const queueItem: OfflineQueueItem = {
          id: `offline-${Date.now()}-${Math.random().toString(36).substring(2)}`,
          type: 'attendance',
          payload: { ...logPayload, clientTimestamp: new Date().toISOString() },
          createdAt: new Date().toISOString()
        };
        await addToOfflineQueue(queueItem);
        const newCount = (await getOfflineQueue()).length;
        setOfflineQueueCount(newCount);
        setStatus({ type: 'success', message: `?? nternetsiz mod: ${scanType === 'in' ? 'Giris' : 'k'} kaydedildi, internet gelince senkronize edilecek.` });
      } else {
        const clientNow = new Date();
        // Firestore'a yaz
        const newDocRef = await attendanceMutation.mutateAsync({ method: 'POST', payload: {
          ...logPayload,
          timestamp: new Date().toISOString(),
        } });

        // OPTMSTK UI: Snapshot beklemeden annda state'e ekle
        const optimisticLog: AttendanceLog = {
          id: newDocRef.id,
          ...logPayload,
          timestamp: { toDate: () => clientNow } as any,
        };
        setLogs(prev => [optimisticLog, ...prev.filter(l => l.id !== newDocRef.id)]);

        // Check for auto-overtime
        if (scanType === 'out') {
          await checkAndCreateAutoOvertime(user.uid, profile.name, clientNow, 'out');
        }

        // Yneticiye giri bildirimi gnder
        fetch('/api/notify/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            userName: profile.name,
            type: scanType,
            isRemote: !!isRemote,
            remoteNote: remoteNote || ''
          })
        }).catch(() => {});

        setStatus({ type: 'success', message: `${isRemote ? '?? Nakliye: ' : ''}${scanType === 'in' ? 'Giris' : 'k'} ileminiz baaryla kaydedildi.` });
      }


      // Mkerrer koruma: Son basarili okutma zamann kaydet
      lastScanTimestamp.current = Date.now();
      setRemoteNote('');
      setScanType(null);
    } catch (error) {
      console.error("Save log error:", error);
      setStatus({ type: 'error', message: 'lem kaydedilirken bir hata olutu.' });
    } finally {
      isProcessingScan.current = false;
    }
  };


  const updateSettings = async (e: any) => {
    e.preventDefault();
    if (profile?.role !== 'admin') return;
    
    const formData = new FormData(e.currentTarget);
    const breakRules: { thresholdHours: number, deductionMinutes: number }[] = [];
    
    // Extract rules from numbered inputs
    const thresholds = formData.getAll('rule_threshold');
    const deductions = formData.getAll('rule_deduction');
    
    thresholds.forEach((t, i) => {
      const thresholdVal = parseFloat(t as string);
      const deductionVal = parseInt(deductions[i] as string);
      if (!isNaN(thresholdVal) && !isNaN(deductionVal)) {
        breakRules.push({ thresholdHours: thresholdVal, deductionMinutes: deductionVal });
      }
    });

    const newSettings = {
      officeIp: formData.get('officeIp') as string,
      qrSecret: formData.get('qrSecret') as string,
      companyName: formData.get('companyName') as string,
      workDaysPerWeek: parseInt(formData.get('workDaysPerWeek') as string) || 6,
      roundingThresholdMinutes: parseInt(formData.get('roundingThresholdMinutes') as string) || 30,
      shiftStart: formData.get('shiftStart') as string || '09:00',
      shiftEnd: formData.get('shiftEnd') as string || '18:00',
      breakRules: breakRules,
    };

    try {
      await settingsMutation.mutateAsync(newSettings);
      setStatus({ type: 'success', message: 'Ayarlar guncellendi.' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Ayarlar gncellenirken hata olutu.' });
    }
  };

  const exportToExcel = (personnelUid: string, monthStr: string) => {
    const personnel = allUsers.find(u => u.uid === personnelUid);
    if (!personnel || !settings) {
      setStatus({ type: 'error', message: 'Personel veya ayar bilgisi bulunamad.' });
      return;
    }

    const [year, month] = monthStr.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const today = new Date();
    
    const dayData: any[] = [];
    
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month - 1, d);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      if (date > today) continue;

      const dayLogs = logs.filter(l => 
        l.userId === personnelUid && 
        !l.deleted && 
        l.status !== 'error' &&
        l.timestamp?.toDate && 
        format(l.timestamp.toDate(), 'yyyy-MM-dd') === dateStr
      ).sort((a,b) => a.timestamp.toDate().getTime() - b.timestamp.toDate().getTime());

      if (dayLogs.length === 0) {
        const leave = leaveRequests.find(r => 
          r.userId === personnelUid && 
          !r.deleted && 
          r.status === 'approved' && 
          dateStr >= r.startDate && 
          dateStr <= r.endDate
        );
        
        dayData.push({
          'Tarih': format(date, 'd MMM yyyy, EEE', { locale: tr }),
          'Giris': leave ? leave.type.toUpperCase() : 'HAREKET YOK',
          'k': '-',
          'Brt Sre (Saat)': '0',
          'Mola (Saat)': '0',
          'Net Calisma (Saat)': '0',
          'Fazla Mesai (Saat)': '0',
          'Hafta Tatili Mesaisi (Saat)': '0'
        });
        continue;
      }

      // First In / Last Out
      let entry = dayLogs.find(l => l.type === 'in')?.timestamp.toDate() || dayLogs[0].timestamp.toDate();
      let exit = [...dayLogs].reverse().find(l => l.type === 'out')?.timestamp.toDate() || dayLogs[dayLogs.length - 1].timestamp.toDate();
      
      // SHIFT CONFIG
      const [sHour, sMin] = (settings.shiftStart || '09:00').split(':').map(Number);
      const [eHour, eMin] = (settings.shiftEnd || '18:00').split(':').map(Number);

      // APPLY PERSONNEL ADVANTAGE ROUNDING
      const threshold = settings.roundingThresholdMinutes || 30;
      const stdStart = new Date(entry); stdStart.setHours(sHour, sMin, 0, 0);
      const stdEnd = new Date(entry); stdEnd.setHours(eHour, eMin, 0, 0);

      const thresholdMs = threshold * 60 * 1000;

      // Entry Adjustment: If they are late up to threshold, round to shift start (Favor Employee)
      if (entry > stdStart && (entry.getTime() - stdStart.getTime()) <= thresholdMs) {
        entry = new Date(stdStart);
      }
      
      // Exit Adjustment:
      // 1. If they leave LATE but within threshold, round DOWN to shiftEnd (Favor Company - Overtime Prevention)
      if (exit > stdEnd && (exit.getTime() - stdEnd.getTime()) <= thresholdMs) {
        exit = new Date(stdEnd);
      }
      // 2. If they leave EARLY but within threshold, round UP to shiftEnd (Favor Employee - Work Completion)
      if (exit < stdEnd && (stdEnd.getTime() - exit.getTime()) <= thresholdMs) {
        exit = new Date(stdEnd);
      }
      
      const rawDuration = Math.max(0, (exit.getTime() - entry.getTime()) / (1000 * 60 * 60));
      const breakTime = getDeductedBreakTime(rawDuration);
      const netDuration = Math.max(0, rawDuration - breakTime);

      let overtime = 0;
      let weekendWork = 0;
      const isSunday = entry.getDay() === 0;

      if (isSunday) {
        weekendWork = netDuration;
      } else {
        if (exit.getTime() > stdEnd.getTime()) {
           const otStart = Math.max(entry.getTime(), stdEnd.getTime());
           overtime += (exit.getTime() - otStart) / (1000 * 60 * 60);
        }
      }

      const normalWork = Math.max(0, netDuration - overtime - weekendWork);

      dayData.push({
        'Tarih': format(date, 'd MMM yyyy, EEE', { locale: tr }),
        'Giris': format(entry, 'HH:mm'),
        'k': format(exit, 'HH:mm') + (format(exit, 'yyyy-MM-dd') !== dateStr ? ` (+1)` : ''),
        'Brt Sre (Saat)': rawDuration.toFixed(2),
        'Mola (Saat)': breakTime.toFixed(2),
        'Net Calisma (Saat)': normalWork.toFixed(2),
        'Fazla Mesai (Saat)': overtime.toFixed(2),
        'Hafta Tatili Mesaisi (Saat)': weekendWork.toFixed(2)
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(dayData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hareketler");
    XLSX.writeFile(workbook, `${personnel.name}_${monthStr}_Rapor.xlsx`);
  };

  const handleManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    // TargetId: ak modaldan, seili personelden veya mevcut log'dan al
    const targetId = selectedDayDetails?.userId || selectedPersonnelId || editingLog?.userId || user?.uid;
    

    
    if (!targetId || !profile) {
      setStatus({ type: 'error', message: 'Hedef kullanc veya profil bilgisi eksik.' });
      return;
    }

    // Hedef kullancy bul: allUsers'da, kendi profilinde veya log'daki userName ile
    const targetUser: UserProfile | null = 
      allUsers.find(u => u.uid === targetId) || 
      (profile.uid === targetId ? profile : null);
    
    if (!targetUser) {
      setStatus({ type: 'error', message: 'Kullanc bulunamad. Ltfen sayfay yenileyip tekrar deneyin.' });
      return;
    }

    // Yetki kurallar:
    // - 'admin' rol: herkese yapabilir
    // - 'mudur' / 'takim_lideri': sadece managerId'si kendi uid'i olan personele
    // - Dier roller: sadece kendi kaydna
    const isSystemAdmin = profile.role === 'admin';
    const isManagerOf = targetUser.managerId === profile.uid;
    const isSelf = profile.uid === targetId;
    
    const isAuthorized = isSystemAdmin || isManagerOf || isSelf;

    if (!isAuthorized) {
      setStatus({ type: 'error', message: 'Bu personelin kaydn dzenleme yetkiniz yok.' });
      return;
    }

    const timestamp = new Date(`${manualLogDate}T${manualLogTime}:00`);
    if (isNaN(timestamp.getTime())) {
      setStatus({ type: 'error', message: 'Geersiz tarih veya saat.' });
      return;
    }
    const auditInfo = `Manuel: ${profile.name}`;

    try {
      const isAdminOrManager = profile.role === 'admin' || targetUser.managerId === profile.uid;
      const newStatus = isAdminOrManager ? 'success' : 'pending';

      if (editingLog?.id) {
        // Mevcut kayd gncelle
        await attendanceMutation.mutateAsync({ method: 'PUT', id: editingLog.id, payload: {
          timestamp: timestamp,
          type: manualLogType,
          ipAddress: auditInfo,
          status: newStatus,
          ...(isAdminOrManager ? { manualEntry: true, isRemote: false, remoteNote: null } : {}),
        } });
        setStatus({ type: 'success', message: 'Kayt guncellendi.' });
      } else {
        // Yeni kayt ekle
        await attendanceMutation.mutateAsync({ method: 'POST', payload: {
          userId: targetId,
          userName: targetUser.name,
          timestamp: timestamp,
          type: manualLogType,
          ipAddress: auditInfo,
          status: newStatus,
          manualEntry: true,
          isRemote: !isAdminOrManager,
          ...(isAdminOrManager ? {} : { remoteNote: 'Gemi Kayt (Onay Bekliyor)' }),
        } });
        setStatus({ type: 'success', message: isAdminOrManager ? 'Kayt eklendi.' : 'Kayt eklendi, yonetici onay bekleniyor.' });
        
        if (!isAdminOrManager) {
          fetch('/api/notify/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid, userName: profile.name, type: manualLogType, isRemote: true, remoteNote: 'Gemi Manuel Kayt Eklendi' })
          }).catch(() => {});
        }
      }
      
      // k ise otomatik mesai kontrol
      if (manualLogType === 'out') {
        await checkAndCreateAutoOvertime(targetId, targetUser.name, timestamp, 'out');
      }

      setShowManualLogModal(false);
      setEditingLog(null);
    } catch (error: any) {
      console.error('Manual log error:', error);
      setStatus({ type: 'error', message: `Kayt baarsz: ${error?.message || error?.code || 'Bilinmeyen hata'}` });
    }
  };

  const deleteLog = async (log: AttendanceLog) => {
    if (!log.id || !profile) return;

    try {
      const response = await fetch(`/api/attendance/${log.id}?adminUid=${profile.uid}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setStatus({ type: 'success', message: 'Kayt baaryla silindi.' });
        setDeletingLog(null);
        setShowManualLogModal(false);
      } else {
        const data = await response.json();
        setStatus({ type: 'error', message: data.error || 'Kayt silinirken hata olutu.' });
      }
    } catch (error) {
      console.error("Delete log error:", error);
      setStatus({ type: 'error', message: 'Kayt silinirken sistem hatas olutu.' });
    }
  };

  const checkAndCreateAutoOvertime = async (userId: string, userName: string, timestamp: Date, type: 'in' | 'out') => {
    if (type !== 'out' || !settings) return;

    const [eHour, eMin] = (settings.shiftEnd || '18:00').split(':').map(Number);
    const threshold = settings.roundingThresholdMinutes || 30;
    
    const stdEndTime = new Date(timestamp);
    stdEndTime.setHours(eHour, eMin, 0, 0);

    // Overtime Request only if exit is AFTER shiftEnd + threshold
    const overtimeThresholdTime = stdEndTime.getTime() + (threshold * 60 * 1000);

    if (timestamp.getTime() > overtimeThresholdTime) {
      const dateStr = format(timestamp, 'yyyy-MM-dd');
      
      // Check if an overtime request already exists for this date
      const existing = overtimeRequests.find(r => r.userId === userId && r.date === dateStr);
      if (existing) return;

      const targetUser = allUsers.find(u => u.uid === userId);
      // managerId yoksa admin'e ynlendir (personele manager atanmam olabilir)
      const effectiveManagerId = targetUser?.managerId || 'admin_initial';

      // Calculate hours from standard shift end
      const exitTime = timestamp.getTime();
      const overtimeHours = parseFloat(((exitTime - stdEndTime.getTime()) / (1000 * 60 * 60)).toFixed(1));

      if (overtimeHours <= 0) return;

      try {
        await overtimeMutation.mutateAsync({ method: 'POST', payload: { userName, managerId: effectiveManagerId, date: dateStr, hours: overtimeHours, description: 'Otomatik Sistem Kayd (' + format(timestamp, 'HH:mm') + ' k)', status: 'pending' } });
      } catch (error) {
        console.error("Auto overtime error:", error);
      }
    }
  };

  const deleteUser = async (uid: string) => {
    if (profile?.role !== 'admin' || uid === user?.uid) return;
    
    try {
      await userMutation.mutateAsync({ method: 'DELETE', id: uid }); 
      setStatus({ type: 'success', message: 'Personel kayd pasif hale getirildi.' });
      setDeletingUser(null);
    } catch (error) {
      console.error("Delete user error:", error);
      setStatus({ type: 'error', message: 'Personel silinirken hata olutu.' });
    }
  };

  const submitLeaveRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !profile) return;

    const formData = new FormData(e.currentTarget);
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const days = parseInt(formData.get('days') as string);
    const reason = (formData.get('reason') as string).trim();

    if (!reason) {
      setStatus({ type: 'error', message: 'Ltfen bir aklama giriniz.' });
      return;
    }

    if (isNaN(days) || days <= 0) {
      setStatus({ type: 'error', message: 'Ltfen geerli bir gn says giriniz.' });
      return;
    }

    if (leaveType === 'annual' && days > getEffectiveLeaveBalance(profile)) {
      setStatus({ type: 'error', message: 'Yetersiz izin bakiyesi.' });
      return;
    }

    setUploading(true);
    try {
      let attachmentUrl = '';
      if (reportFile) {
        if (reportFile.size > 800 * 1024) {
          setStatus({ type: 'error', message: 'Dosya boyutu ok byk. Ltfen 800 KB altnda bir dosya sein veya resmi krpn.' });
          setUploading(false);
          return;
        }
        
        attachmentUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Dosya okunamad.'));
          reader.readAsDataURL(reportFile);
        });
      }

      await leaveMutation.mutateAsync({ method: 'POST', payload: {
        userName: profile.name,
        managerId: profile.managerId || 'admin_initial',
        startDate, endDate, days, reason,
        type: leaveType,
        attachmentUrl,
        status: 'pending'
      } });
      // Yneticiye push bildirimi gnder
      fetch('/api/notify/newrequest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          userName: profile.name,
          requestType: 'leave',
          managerId: profile.managerId || 'admin_initial'
        })
      }).catch(() => {});
      setStatus({ type: 'success', message: leaveType === 'report' ? 'Raporunuz iletildi.' : 'Izin talebiniz iletildi.' });
      (e.target as HTMLFormElement).reset();
      setLeaveStartDate('');
      setLeaveEndDate('');
      setCalcLeaveDays(0);
      setReportFile(null);
      setLeaveType('annual');
    } catch (error: any) {
      console.error("Leave request error:", error);
      const msg = error?.message || 'Bilinmeyen bir hata olutu.';
      setStatus({ type: 'error', message: `Talep iletilirken hata olutu: ${msg}` });
    } finally {
      setUploading(false);
    }
  };

  const handleViewAttachment = (base64Str: string) => {
    setViewingAttachment(base64Str);
  };

  const handleDownloadAndOpen = () => {
    if (!viewingAttachment) return;
    try {
      const blob = dataURItoBlob(viewingAttachment);
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = viewingAttachment.startsWith('data:image') ? 'rapor_belgesi.png' : 'rapor_belgesi.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      if (!viewingAttachment.startsWith('data:image')) {
        window.open(url, '_blank');
      }
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e) {
      console.error(e);
      setStatus({ type: 'error', message: 'Dosya indirilirken hata olutu.' });
    }
  };
  const submitOvertimeRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !profile) return;

    const formData = new FormData(e.currentTarget);
    const date = formData.get('date') as string;
    const hours = parseFloat(formData.get('hours') as string);
    const description = formData.get('description') as string;

    if (isNaN(hours) || hours <= 0) {
      setStatus({ type: 'error', message: 'Ltfen geerli bir saat giriniz.' });
      return;
    }

    try {
      await overtimeMutation.mutateAsync({ method: 'POST', payload: { userName: profile.name, managerId: profile.managerId || 'admin_initial', date, hours, description, status: 'pending' } });
      // Yneticiye push bildirimi gnder
      fetch('/api/notify/newrequest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          userName: profile.name,
          requestType: 'overtime',
          managerId: profile.managerId || 'admin_initial'
        })
      }).catch(() => {});
      setStatus({ type: 'success', message: 'Fazla mesai talebiniz iletildi.' });
      (e.target as HTMLFormElement).reset();
      setOvertimeEndTime('');
      setCalcOvertimeHours(0);
    } catch (error) {
      setStatus({ type: 'error', message: 'Talep iletilirken hata olutu.' });
    }
  };

  const handleRequestAction = async (collectionName: 'leaveRequests' | 'overtimeRequests' | 'attendance', requestId: string, action: 'approved' | 'rejected') => {
    try {
      

      // Push bildirimi gnder (arka planda, hata olsa bile devam)
      fetch('/api/notify/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUid: requestData.userId,
          isApproved: action === 'approved',
          requestType: collectionName === 'leaveRequests' ? 'leave' : collectionName === 'attendance' ? 'manual' : 'overtime',
          actorName: profile?.name || 'Ynetici'
        })
      }).catch(() => {});

      setStatus({ type: 'success', message: `Talep ${action === 'approved' ? 'onayland' : 'reddedildi'}.` });
    } catch (error) {
      setStatus({ type: 'error', message: 'lem srasnda hata olutu.' });
    }
  };


  const handleDeleteLeave = async (id: string, reason: string) => {
    if (!profile || profile.role !== 'admin' || !deletingLeave) return;
    if (!reason.trim()) {
      setStatus({ type: 'error', message: 'Silme nedeni zorunludur.' });
      return;
    }

    try {
      // 1. Mark as deleted
      await leaveMutation.mutateAsync({ method: 'DELETE', id });

      // 2. Revert balance if annual
      if (deletingLeave.type === 'annual') {
        // Update balance via API
        await fetch('/api/users/' + deletingLeave.userId + '/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('pdks_session') ? JSON.parse(localStorage.getItem('pdks_session')).token : ''}` },
          body: JSON.stringify({ action: 'add', days: deletingLeave.days })
        });
      }

      // 3. Send notification via API
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('pdks_token') },
        body: JSON.stringify({
          userId: deletingLeave.userId,
          title: 'Izin ptali',
          message: deletingLeave.startDate + ' tarihindeki izniniz yonetici tarafndan iptal edildi. Neden: ' + reason,
          type: 'error',
          read: false
        })
      }).catch(() => {});

      setStatus({ type: 'success', message: 'Izin talebi silindi ve bakiye iade edildi.' });
      setDeletingLeave(null);
      setDeletionReason('');
    } catch (error) {
      console.error("Delete error:", error);
      setStatus({ type: 'error', message: 'Izin silinirken hata olutu.' });
    }
  };

  const handleUpdateLeave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingLeave || profile?.role !== 'admin') return;
    const formData = new FormData(e.currentTarget);
    const updates = {
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      days: parseInt(formData.get('days') as string),
      reason: formData.get('reason') as string,
      status: formData.get('status') as string,
    };

    try {
      await leaveMutation.mutateAsync({ method: 'PUT', id: editingLeave.id!, payload: updates });
      setStatus({ type: 'success', message: 'Izin talebi guncellendi.' });
      setEditingLeave(null);
    } catch (error) {
      setStatus({ type: 'error', message: 'Gncelleme srasnda hata olutu.' });
    }
  };

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    
    // Check if admin or manager of this user
    const isAuthorized = profile?.role === 'admin' || editingUser.managerId === user?.uid;
    if (!isAuthorized) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const title = formData.get('title') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as 'admin' | 'employee';
    const managerId = formData.get('managerId') as string;
    const leaveBalance = parseInt(formData.get('leaveBalance') as string);
    const startDate = formData.get('startDate') as string;
    const birthDate = formData.get('birthDate') as string;
    const allowedDevice = formData.get('allowedDevice') as string;
    const deviceId = formData.get('deviceId') as string;
    const canRemoteCheckIn = formData.get('canRemoteCheckIn') === 'true';

    try {
      const response = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adminUid: profile.uid,
          targetUid: editingUser.uid,
          updates: { name, title, password, role, managerId, leaveBalance, startDate, birthDate, allowedDevice, deviceId, canRemoteCheckIn }
        })
      });

      if (response.ok) {
        setStatus({ type: 'success', message: 'Personel bilgileri guncellendi.' });
        setEditingUser(null);
      } else {
        const data = await response.json();
        setStatus({ type: 'error', message: data.error || 'Gncelleme srasnda hata olutu.' });
      }
    } catch (error) {
      console.error("Update user error:", error);
      setStatus({ type: 'error', message: 'Sistem hatas.' });
    }
  };

  const handleSelfPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user || !newPassword) return;

    try {
      const response = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adminUid: user.uid,
          targetUid: user.uid,
          updates: { password: newPassword }
        })
      });

      if (response.ok) {
        setStatus({ type: 'success', message: 'Sifreniz baaryla guncellendi.' });
        setShowPasswordChangeModal(false);
        setNewPassword('');
      } else {
        const data = await response.json();
        setStatus({ type: 'error', message: data.error || 'Sifre gncellenirken bir hata olutu.' });
      }
    } catch (error) {
      console.error("Password change error:", error);
      setStatus({ type: 'error', message: 'Sistem hatas.' });
    }
  };

  // Hareketleri .ics takvim dosyasna aktarma
  const exportToCalendar = (userId: string, month: string) => {
    const [year, m] = month.split('-').map(Number);
    const userLogs = logs
      .filter(l => l.userId === userId && !l.deleted && l.status !== 'error')
      .filter(l => {
        const d = l.timestamp?.toDate?.() || new Date();
        return d.getMonth() + 1 === m && d.getFullYear() === year;
      })
      .sort((a, b) => {
        const aT = a.timestamp?.toDate?.()?.getTime?.() || 0;
        const bT = b.timestamp?.toDate?.()?.getTime?.() || 0;
        return aT - bT;
      });

    if (userLogs.length === 0) {
      setStatus({ type: 'error', message: 'Bu ay iin hareket kayd bulunamad.' });
      return;
    }

    const events: string[] = [];
    const dateMap = new Map<string, typeof userLogs>();
    
    userLogs.forEach(log => {
      const d = log.timestamp?.toDate?.() || new Date();
      const dateKey = format(d, 'yyyy-MM-dd');
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
      dateMap.get(dateKey)!.push(log);
    });

    const formatICSDate = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    dateMap.forEach((dayLogs, dateKey) => {
      const inLog = dayLogs.find(l => l.type === 'in');
      const outLog = dayLogs.find(l => l.type === 'out');
      
      if (inLog) {
        const inTime = inLog.timestamp?.toDate?.() || new Date();
        const outTime = outLog?.timestamp?.toDate?.() || new Date(inTime.getTime() + 8 * 60 * 60 * 1000);
        const userName = inLog.userName || 'Personel';
        
        events.push(
          'BEGIN:VEVENT',
          `DTSTART:${formatICSDate(inTime)}`,
          `DTEND:${formatICSDate(outTime)}`,
          `SUMMARY:${userName} -  Gn`,
          `DESCRIPTION:Giris: ${format(inTime, 'HH:mm')}${outLog ? ' / k: ' + format(outTime, 'HH:mm') : ' (k yok)'}`,
          `UID:pdks-${dateKey}-${inLog.userId}@pdks`,
          'END:VEVENT'
        );
      }
    });

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PDKS//Devam Kontrol//TR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:PDKS Hareketler ${month}`,
      ...events,
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdks-hareketler-${month}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus({ type: 'success', message: 'Takvim dosyas indirildi. Telefonunuzda aarak takviminize ekleyebilirsiniz.' });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-[3px] border-zinc-800" />
            <div className="absolute inset-0 h-12 w-12 rounded-full border-[3px] border-transparent border-t-orange-500 animate-spin" />
          </div>
          <p className="text-xs font-medium text-zinc-500 tracking-widest uppercase">Ykleniyor</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center p-6 text-white overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(249,115,22,0.08),transparent_50%)]" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-md space-y-8"
        >
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 text-orange-500 shadow-[0_0_60px_rgba(249,115,22,0.15)] border border-orange-500/20">
              <Clock size={48} strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">PDKS</h1>
              <p className="text-zinc-500 text-sm font-medium">Personel Devam Kontrol Sistemi</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 rounded-3xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl p-8 shadow-2xl">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Personel ID</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <input 
                  name="personnelId"
                  required
                  placeholder="ID giriniz"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-12 pr-4 py-3.5 text-sm font-medium placeholder:text-zinc-700 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Sifre</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <input 
                  name="password"
                  type="password"
                  required
                  placeholder="Sifre giriniz"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-12 pr-4 py-3.5 text-sm font-medium placeholder:text-zinc-700 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            {loginError && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-medium text-red-500"
              >
                {loginError}
              </motion.div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 py-4 font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              Giris Yap
            </button>
          </form>
          
          <p className="text-center text-xs text-zinc-600">
            Giris bilgilerinizi yoneticinizden temin edebilirsiniz.
          </p>
          <div className="mt-4 text-center text-[10px] text-zinc-700 font-mono">
            Cihaz Kimligi: {getOrCreateDeviceId()}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg-base pb-24 theme-text transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b theme-border-subtle bg-black/5 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white">
              <Clock size={24} />
            </div>
            <div>
              <h1 className="font-bold leading-none">PDKS</h1>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">Personel Takip</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden text-right md:block">
              <p className="text-sm font-medium theme-text">{profile?.name}</p>
              <p className="text-xs text-zinc-500">{profile?.role === 'admin' ? 'Ynetici' : 'Personel'}</p>
            </div>

            {/* Tema Deitirici */}
            <button
              onClick={cycleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900/10 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-orange-500"
              title={`Tema: ${theme === 'dark' ? 'Koyu' : theme === 'light' ? 'Ak' : 'Sistem'}`}
            >
              {theme === 'dark' ? <Moon size={18} /> : theme === 'light' ? <Sun size={18} /> : <Monitor size={18} />}
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="group relative flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900/10 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-orange-500"
              >
                <Bell size={20} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full border-2 border-white dark:border-zinc-950 bg-red-500 flex items-center justify-center text-[9px] font-black text-white">
                    {notifications.filter(n => !n.read).length > 99 ? '99+' : notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowNotifications(false)}
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl z-20 overflow-hidden"
                    >
                      <div className="border-b border-zinc-800 px-4 py-3 bg-zinc-800/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Bildirimler</p>
                          {notifications.filter(n => !n.read).length > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-black text-white">
                              {notifications.filter(n => !n.read).length}
                            </span>
                          )}
                        </div>
                        {notifications.some(n => !n.read) && (
                          <button
                            onClick={async () => {
                              for (const n of notifications.filter(x => !x.read)) {
                                if (n.id) await markNotificationRead(n.id);
                              }
                            }}
                            className="text-[10px] text-orange-500 font-bold hover:text-orange-400 transition"
                          >
                            Tmn Okundu
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-xs text-zinc-500 uppercase tracking-widest">
                            Bildirim Yok
                          </div>
                        ) : (
                          notifications.map(notif => (
                            <div 
                              key={notif.id}
                              onClick={() => {
                                markNotificationRead(notif.id!);
                                if (notif.link) {
                                  // link -> uygulama rotas normalize et
                                  const routeMap: Record<string, string> = {
                                    '/takvim': '/home',
                                    '/hareketler': '/movements',
                                    '/izinler': '/leaves',
                                    '/onaylar': '/approvals',
                                    '/mesai': '/leaves',
                                    '/profil': '/profile',
                                  };
                                  const route = routeMap[notif.link] ?? notif.link;
                                  navigate(route);
                                  setShowNotifications(false);
                                }
                              }}
                              className={cn(
                                "border-b border-zinc-800 p-4 transition-colors hover:bg-zinc-800/50 cursor-pointer relative",
                                !notif.read && "bg-orange-500/5"
                              )}
                            >
                              {!notif.read && (
                                <span className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-orange-500" />
                              )}
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "mt-0.5 rounded-full p-1",
                                  notif.type === 'error' ? "bg-red-500/10 text-red-500" :
                                  notif.type === 'success' ? "bg-emerald-500/10 text-emerald-500" :
                                  "bg-blue-500/10 text-blue-500"
                                )}>
                                  {notif.type === 'success' ? <CheckCircle size={12} /> :
                                   notif.type === 'error' ? <AlertCircle size={12} /> :
                                   <Bell size={12} />}
                                </div>
                                <div className="space-y-1 flex-1 min-w-0">
                                  <p className="text-xs font-bold leading-none truncate">{notif.title}</p>
                                  <p className="text-[10px] text-zinc-500 leading-relaxed line-clamp-2">{notif.message}</p>
                                  <div className="flex items-center justify-between">
                                    <p className="text-[8px] text-zinc-600 uppercase font-black">
                                      {notif.createdAt?.toDate
                                        ? format(notif.createdAt.toDate(), 'd MMM HH:mm', { locale: tr })
                                        : typeof notif.createdAt === 'string'
                                          ? new Date(notif.createdAt).toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(notif.createdAt).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'short' })
                                          : ''}
                                    </p>
                                    {notif.link && (
                                      <span className="text-[9px] text-orange-500 font-bold flex items-center gap-0.5">
                                        Git <ChevronRight size={8} />
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => { navigate('/profile'); }}
              className="flex h-10 w-10 items-center justify-center rounded-full overflow-hidden bg-zinc-900 text-zinc-400 transition-colors hover:ring-2 hover:ring-orange-500 shrink-0"
              title="Profil"
            >
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-black text-orange-500">{profile?.name?.[0]?.toUpperCase()}</span>
              )}
            </button>
            <button 
              onClick={handleLogout}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4 md:pl-28 space-y-6">
        {/* Status Messages */}
        <AnimatePresence>
          {status && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={cn(
                "flex items-center gap-3 rounded-xl p-4 text-sm font-medium",
                status.type === 'success' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
              )}
            >
              {status.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              <span className="flex-1">{status.message}</span>
              <button onClick={() => setStatus(null)} className="opacity-50 hover:opacity-100">
                <XCircle size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'home' && (
          <>
            {/* evrimd Mod Uyars */}
            {!isOnline && (
              <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <WifiOff size={18} className="text-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-400">evrimd Mod</p>
                  <p className="text-xs text-amber-400/70">nternet yok. Hareketler cihaznza kaydedilecek, balant gelince otomatik gnderilecek.</p>
                </div>
              </div>
            )}
            {offlineQueueCount > 0 && isOnline && (
              <div className="flex items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
                <Clock size={18} className="text-blue-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-blue-400">{offlineQueueCount} Bekleyen Hareket</p>
                  <p className="text-xs text-blue-400/70">nternet geldi. Senkronize ediliyor...</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  if (profile?.canRemoteCheckIn) {
                    // Uzaktan yetkili: her zaman yntem seim modal' gster
                    setPendingScanType('in');
                    setShowRemoteModal(true);
                  } else {
                    // Yetkisiz: direkt QR scanner
                    setScanType('in'); setShowScanner(true);
                  }
                }}
                className="group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl bg-emerald-600 p-8 text-white transition-all hover:bg-emerald-500"
              >
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 transition-transform group-hover:scale-150" />
                <LogIn size={40} />
                <span className="text-lg font-bold">Giris Yap</span>
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
                <span className="text-lg font-bold">k Yap</span>
                {profile?.canRemoteCheckIn && <span className="text-[10px] opacity-70 flex items-center gap-1"><Truck size={10} /> Nakliye Yetkili</span>}
              </button>
            </div>


            {/* Ynetici Dashboard zet */}
            {profile?.role === 'admin' && dashboardStats && (
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <button
                  onClick={() => setDashboardStatModal({ title: 'u An Ofiste', color: 'emerald', icon: <LogIn size={18} />, people: dashboardStats.presentList })}
                  className="rounded-2xl border theme-border bg-emerald-500/10 p-4 text-left hover:bg-emerald-500/20 transition-colors cursor-pointer"
                >
                  <div className="text-2xl font-black text-emerald-500">{dashboardStats.present}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70">u An Ofiste</div>
                  <div className="text-[9px] text-emerald-700/60 mt-1">Detay iin tkla</div>
                </button>
                <button
                  onClick={() => setDashboardStatModal({ title: 'Izinli', color: 'orange', icon: <FileText size={18} />, people: dashboardStats.onLeaveList })}
                  className="rounded-2xl border theme-border bg-orange-500/10 p-4 text-left hover:bg-orange-500/20 transition-colors cursor-pointer"
                >
                  <div className="text-2xl font-black text-orange-500">{dashboardStats.onLeave}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-orange-600/70">Izinli</div>
                  <div className="text-[9px] text-orange-700/60 mt-1">Detay iin tkla</div>
                </button>
                <button
                  onClick={() => setDashboardStatModal({ title: 'Ge Kalan', color: 'red', icon: <Clock size={18} />, people: dashboardStats.lateList })}
                  className="rounded-2xl border theme-border bg-red-500/10 p-4 text-left hover:bg-red-500/20 transition-colors cursor-pointer"
                >
                  <div className="text-2xl font-black text-red-500">{dashboardStats.late}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-red-600/70">Ge Kalan</div>
                  <div className="text-[9px] text-red-700/60 mt-1">Detay iin tkla</div>
                </button>
                <button
                  onClick={() => setDashboardStatModal({ title: 'Gelmeyen', color: 'zinc', icon: <UserX size={18} />, people: dashboardStats.absentList })}
                  className="rounded-2xl border theme-border theme-bg-secondary p-4 text-left hover:bg-zinc-800/40 transition-colors cursor-pointer"
                >
                  <div className="text-2xl font-black theme-text">{dashboardStats.absent}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Gelmeyen</div>
                  <div className="text-[9px] text-zinc-600 mt-1">Detay iin tkla</div>
                </button>
              </div>
            )}

            {/* Personel Ge Kalma Uyars */}
            {profile?.role !== 'admin' && userLateCountThisMonth > 0 && (
              <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                <AlertTriangle size={24} className="text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-500">Ge Kalma Uyars</p>
                  <p className="text-xs text-red-500/70">Bu ay ierisinde <strong>{userLateCountThisMonth} kez</strong> mesai balang saati ({settings?.shiftStart || '08:00'}) sonrasnda giri yaptnz.</p>
                </div>
              </div>
            )}

            {/* Info Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border theme-border theme-bg-secondary p-4">
                <div className="mb-2 flex items-center gap-2 text-zinc-500">
                  {isOnline ? <Wifi size={16} /> : <WifiOff size={16} className="text-amber-400" />}
                  <span className="text-xs font-semibold uppercase tracking-wider">A Durumu</span>
                </div>
                <p className="text-sm font-medium theme-text">{isOnline ? (currentIp || 'Tespit ediliyor...') : 'evrimd'}</p>
                <p className="text-[10px] text-zinc-600">Mevcut IP Adresiniz</p>
              </div>
              <div className="rounded-2xl border theme-border theme-bg-secondary p-4">
                <div className="mb-2 flex items-center gap-2 text-zinc-500">
                  <MapPin size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Konum</span>
                </div>
                <p className="text-sm font-medium theme-text">Aktif</p>
                <p className="text-[10px] text-zinc-600">GPS Dorulamas</p>
              </div>
              <div className="rounded-2xl border theme-border theme-bg-secondary p-4">
                <div className="mb-2 flex items-center gap-2 text-zinc-500">
                  <Shield size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Gvenlik</span>
                </div>
                <p className="text-sm font-medium theme-text">QR + IP Korumal</p>
                <p className="text-[10px] text-zinc-600">Sistem Durumu</p>
              </div>
            </div>


            {/* Attendance Logs (Only for non-admins or if admin wants to see their own) */}
            {profile?.role !== 'admin' && (
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Calendar size={24} className="text-orange-500" /> Giris k Hareketlerim
                  </h2>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => exportToExcel(user!.uid, selectedMonth)}
                      className="flex-1 sm:flex-none rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Download size={13} /> Excel
                    </button>
                    <button 
                      onClick={() => exportToCalendar(user!.uid, selectedMonth)}
                      className="flex-1 sm:flex-none rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Calendar size={13} /> Takvime Ekle
                    </button>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="flex-1 sm:flex-none rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
                
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
                {['Pzt', 'Sal', 'ar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => <div key={day} className="truncate">{day}</div>)}
              </div>
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
                    
                    const dayInLogs = userLogs.filter(l => 
                      format(l.timestamp.toDate(), 'yyyy-MM-dd') === dateStr
                    );

                    const leave = leaveRequests.find(r => 
                      r.userId === user?.uid && 
                      r.status === 'approved' && 
                      !r.deleted &&
                      dateStr >= r.startDate && 
                      dateStr <= r.endDate
                    );

                    const overtime = overtimeRequests.filter(r =>
                      r.userId === user?.uid &&
                      r.status === 'approved' &&
                      !r.deleted &&
                      r.date === dateStr
                    ).reduce((sum, r) => sum + r.hours, 0);

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
                          <span className={cn(
                            "text-[8px] font-bold absolute top-1 left-1.5",
                            (isSunday || isHolidayDay) ? "text-red-500/50" : "text-zinc-600"
                          )}>
                            {d}
                          </span>
                          
                          {isHolidayDay && !hasSuccessLogs && !leave && (
                            <span className="hidden sm:block absolute top-1 right-1 text-[7px] font-black text-red-500 uppercase max-w-[70%] text-right truncate">
                              {holiday.name}
                            </span>
                          )}

                          
                          <div className="flex-1 flex flex-col items-start justify-center w-full gap-1 mt-3 px-1">
                            {hasSuccessLogs && (
                              <div className="flex items-center gap-1 sm:gap-0.5 leading-none">
                                {/* Desktop: Show Hours */}
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
                                {/* Mobile: Show Success Indicator */}
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
                                {/* Desktop */}
                                <div className={cn(
                                  "hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase text-left w-fit",
                                  isSunday ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-400"
                                )}>
                                  {isSunday ? 'TFM' : 'FM'}: {overtime}s
                                </div>
                                {/* Mobile */}
                                <div className={cn(
                                  "sm:hidden h-2 w-4 rounded-full",
                                  isSunday ? "bg-red-500" : "bg-blue-500"
                                )} />
                              </>
                            )}

                            {leave && (
                              <>
                                {/* Desktop */}
                                <div className={cn(
                                  "hidden sm:flex flex-col items-start leading-none",
                                  leave.type === 'report' ? "text-purple-400" : "text-orange-500"
                                )}>
                                  <span className="text-[10px] font-black uppercase tracking-tighter">
                                    {leave.type === 'report' ? 'Rapor' : 'Izin'}
                                  </span>
                                </div>
                                {/* Mobile */}
                                <div className={cn(
                                  "sm:hidden h-1.5 w-full rounded-full",
                                  leave.type === 'report' ? "bg-purple-500" : "bg-orange-500"
                                )} />
                              </>
                            )}
                          </div>
                        </button>
                      );
                    }
                    return results;
                  })()}
                </div>

                {/* Calendar Legend */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-zinc-900 pt-4 px-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Giris</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_5px_rgba(251,146,60,0.5)]" />
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">k</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Mesai</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-4 rounded-full bg-orange-500" />
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Izin</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-4 rounded-full bg-purple-500" />
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Rapor</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Hatal</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 overflow-hidden">
                  <div className="p-3 border-b border-zinc-900 bg-zinc-900/40 text-[10px] font-bold text-zinc-500 uppercase">Detayl Liste</div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {/* Desktop Table View */}
                    <table className="hidden md:table w-full text-left">
                      <tbody className="divide-y divide-zinc-900">
                        {logs.filter(l => l.userId === user?.uid && l.timestamp?.toDate && format(l.timestamp.toDate(), 'yyyy-MM') === selectedMonth).length === 0 ? (
                          <tr>
                            <td className="p-8 text-center text-zinc-500 text-xs italic">Bu ay iin kayt bulunmuyor.</td>
                          </tr>
                        ) : (
                          logs.filter(l => l.userId === user?.uid && l.timestamp?.toDate && format(l.timestamp.toDate(), 'yyyy-MM') === selectedMonth)
                            .sort((a,b) => (b.timestamp?.toDate?.()?.getTime() || 0) - (a.timestamp?.toDate?.()?.getTime() || 0))
                            .map((log) => (
                            <tr key={log.id} className="hover:bg-zinc-900/30 transition-colors">
                              <td className="p-4">
                                <p className="text-xs text-zinc-400">
                                  {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'd MMM yyyy, HH:mm', { locale: tr }) : '...'}
                                </p>
                              </td>
                              <td className="p-4">
                                <div className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase",
                                  log.status === 'error' ? "bg-red-500/10 text-red-500" :
                                  log.status === 'pending' ? "bg-amber-500/10 text-amber-500" :
                                  log.type === 'in' ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                                )}>
                                  {log.status === 'error' ? <ShieldAlert size={10} /> : log.status === 'pending' ? <Clock3 size={10} /> : log.type === 'in' ? <LogIn size={10} /> : <LogOut size={10} />}
                                  {log.status === 'error' ? 'Hata' : log.status === 'pending' ? 'Bekliyor' : (log.type === 'in' ? 'Giris' : 'k')}
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <p className="text-[10px] text-zinc-400 font-bold">{log.status === 'error' ? log.errorMessage : log.status === 'pending' ? 'Ynetici onay bekleniyor' : ''}</p>
                                <p className="text-[10px] text-zinc-600 font-mono">{log.ipAddress}</p>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-zinc-900">
                      {logs.filter(l => l.userId === user?.uid && l.timestamp?.toDate && format(l.timestamp.toDate(), 'yyyy-MM') === selectedMonth).length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 text-xs italic">Bu ay iin kayt bulunmuyor.</div>
                      ) : (
                        logs.filter(l => l.userId === user?.uid && l.timestamp?.toDate && format(l.timestamp.toDate(), 'yyyy-MM') === selectedMonth)
                          .sort((a,b) => (b.timestamp?.toDate?.()?.getTime() || 0) - (a.timestamp?.toDate?.()?.getTime() || 0))
                          .map((log) => (
                          <div key={log.id} className="p-4 flex items-center justify-between hover:bg-zinc-900/30 transition-colors">
                            <div className="space-y-1">
                              <p className="text-[11px] font-bold text-zinc-300">
                                {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'd MMM, HH:mm', { locale: tr }) : '...'}
                              </p>
                              <p className="text-[9px] text-zinc-600 font-mono">{log.ipAddress}</p>
                            </div>
                            <div className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold uppercase",
                              log.status === 'error' ? "bg-red-500/10 text-red-500" :
                              log.status === 'pending' ? "bg-amber-500/10 text-amber-500" :
                              log.type === 'in' ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                            )}>
                              {log.status === 'error' ? 'Hata' : log.status === 'pending' ? 'Bekliyor' : (log.type === 'in' ? 'Giris' : 'k')}
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
        )}

        {activeTab === 'movements' && profile?.role === 'admin' && (
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
                    <ArrowLeft size={18} /> Geri Dn
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
                        <Plus size={18} /> Manuel Kayt Ekle
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
                <p className="text-[10px] font-bold text-zinc-500 uppercase">Aylk Toplam Mesai</p>
                <p className="text-2xl font-black text-blue-500">{totalOvertimeHours.toFixed(1)} <span className="text-xs font-normal">Saat</span></p>
              </div>
              <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-4 flex flex-col items-center justify-center">
                <p className="text-[10px] font-bold text-zinc-500 uppercase">Aylk Toplam Izin</p>
                <p className="text-2xl font-black text-orange-500">{totalLeaveDays} <span className="text-xs font-normal">Gn</span></p>
              </div>
              <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-4 flex flex-col items-center justify-center">
                <p className="text-[10px] font-bold text-zinc-500 uppercase">Giris Kayd Says</p>
                <p className="text-2xl font-black text-emerald-500">{userLogs.filter(l => l.type === 'in').length} <span className="text-xs font-normal">Kez</span></p>
              </div>
            </>
          );
        })()}
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
        {['Pzt', 'Sal', 'ar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => <div key={day}>{day}</div>)}
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
                            const dayMovements = dayInLogs.map((inLog, idx) => {
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
                                    {/* Desktop */}
                                    <div className="hidden sm:flex flex-col sm:items-center gap-0 lg:gap-0.5 leading-none shrink-0 overflow-hidden">
                                      <span className="text-[9px] lg:text-[11px] font-black text-emerald-500 truncate">{format(dayMovements[0].in, 'HH:mm')}</span>
                                      {dayMovements[0].out && (
                                        <>
                                          <span className="hidden sm:inline text-[8px] lg:text-[10px] text-zinc-600">-</span>
                                          <span className="text-[9px] lg:text-[11px] font-black text-orange-400 truncate">{format(dayMovements[0].out, 'HH:mm')}</span>
                                        </>
                                      )}
                                    </div>
                                    {/* Mobile Dots */}
                                    <div className="sm:hidden flex items-center gap-1">
                                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                      {dayMovements[0].out && <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />}
                                    </div>
                                  </>
                                ) : null}
                                
                                {overtimeTotal > 0 && (
                                  <>
                                    <div className="hidden sm:block px-0.5 sm:px-1 py-0 rounded bg-blue-500/10 text-blue-400 text-[8px] lg:text-[9px] font-black uppercase truncate max-w-full">
                                      {overtimeTotal}s
                                    </div>
                                    <div className="sm:hidden h-1 w-3 rounded-full bg-blue-500" />
                                  </>
                                )}

                                {leave && (
                                  <>
                                    <span className="hidden sm:block text-[8px] lg:text-[9px] font-black uppercase leading-none truncate max-w-full text-orange-500">
                                      {leave.type === 'report' ? 'RA' : 'Z'}
                                    </span>
                                    <div className={cn(
                                      "sm:hidden h-1 w-full rounded-full",
                                      leave.type === 'report' ? "bg-purple-500" : "bg-orange-500"
                                    )} />
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
                                <span className={cn(
                                  "text-[8px] sm:text-[10px]",
                                  isSunday ? "text-red-500/40" : "text-zinc-600"
                                )}>
                                  {d}
                                </span>
                              </div>
                              <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
                                {content}
                              </div>
                            </button>
                          );
                        }
                        return results;
                      })()}
                    </div>

                    {/* Movements Legend */}
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-zinc-900 pt-4 px-2">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                        <span className="text-[9px] font-bold text-zinc-500 uppercase">Giris</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_5px_rgba(251,146,60,0.5)]" />
                        <span className="text-[9px] font-bold text-zinc-500 uppercase">k</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-[9px] font-bold text-zinc-500 uppercase">Mesai</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-4 rounded-full bg-orange-500" />
                        <span className="text-[9px] font-bold text-zinc-500 uppercase">Izin</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-4 rounded-full bg-purple-500" />
                        <span className="text-[9px] font-bold text-zinc-500 uppercase">Rapor</span>
                      </div>
                    </div>

                  <div className="mt-12 space-y-4">
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      <Clock size={20} className="text-orange-500" /> Tm Giris/k Kaytlar
                    </h4>
                    <div className="overflow-hidden rounded-2xl border border-zinc-900">
                      {/* Desktop Table */}
                      <table className="hidden md:table w-full text-left">
                        <thead>
                          <tr className="border-b border-zinc-900 bg-zinc-900/40 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            <th className="p-4">Tarih / Saat</th>
                            <th className="p-4">lem</th>
                            <th className="p-4">Kaynak</th>
                            <th className="p-4 text-right">lem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                          {logs
                            .filter(l => l.userId === selectedPersonnelId && l.timestamp?.toDate && format(l.timestamp.toDate(), 'yyyy-MM') === selectedMonth)
                            .sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime())
                            .map(log => (
                              <tr key={log.id} className="text-sm hover:bg-zinc-900/30 transition-colors">
                                <td className="p-4">
                                  {format(log.timestamp.toDate(), 'd MMM yyyy, HH:mm', { locale: tr })}
                                </td>
                                <td className="p-4">
                                  <span className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                                    log.type === 'in' ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-800 text-zinc-400"
                                  )}>
                                    {log.type === 'in' ? 'Giris' : 'k'}
                                  </span>
                                </td>
                                <td className="p-4 text-xs text-zinc-500">
                                  {log.ipAddress}
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingLog(log);
                                        setManualLogDate(format(log.timestamp.toDate(), 'yyyy-MM-dd'));
                                        setManualLogTime(format(log.timestamp.toDate(), 'HH:mm'));
                                        setManualLogType(log.type);
                                        setShowManualLogModal(true);
                                      }}
                                      className="text-zinc-600 hover:text-orange-500 transition-colors transition-all active:scale-95"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button
                                      onClick={() => setDeletingLog(log)}
                                      className="text-zinc-600 hover:text-red-500 transition-colors transition-all active:scale-95"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>

                      {/* Mobile Card List */}
                      <div className="md:hidden divide-y divide-zinc-900 bg-zinc-900/10">
                        {logs
                          .filter(l => l.userId === selectedPersonnelId && l.timestamp?.toDate && format(l.timestamp.toDate(), 'yyyy-MM') === selectedMonth)
                          .sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime())
                          .map(log => (
                            <div key={log.id} className="p-4 space-y-3 hover:bg-zinc-900/30">
                              <div className="flex items-center justify-between">
                                <span className={cn(
                                  "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                                  log.type === 'in' ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-800 text-zinc-400"
                                )}>
                                  {log.type === 'in' ? 'Giris' : 'k'}
                                </span>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => {
                                      setEditingLog(log);
                                      setManualLogDate(format(log.timestamp.toDate(), 'yyyy-MM-dd'));
                                      setManualLogTime(format(log.timestamp.toDate(), 'HH:mm'));
                                      setManualLogType(log.type);
                                      setShowManualLogModal(true);
                                    }}
                                    className="p-1 text-zinc-600 active:text-orange-500 transition-colors"
                                  >
                                    <Edit size={18} />
                                  </button>
                                  <button
                                    onClick={() => setDeletingLog(log)}
                                    className="p-1 text-zinc-600 active:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>
                              <div className="flex justify-between items-end">
                                <div className="space-y-0.5">
                                  <p className="text-[11px] font-bold text-zinc-300">
                                    {format(log.timestamp.toDate(), 'd MMMM yyyy', { locale: tr })}
                                  </p>
                                  <p className="text-xl font-black text-white">
                                    {format(log.timestamp.toDate(), 'HH:mm')}
                                  </p>
                                </div>
                                <p className="text-[9px] text-zinc-600 font-mono italic">
                                  {log.ipAddress}
                                </p>
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
        )}

        {(profile?.role === 'admin' || allUsers.some(u => u.managerId === user?.uid)) && activeTab === 'users' && (
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Users size={28} className="text-orange-500" /> Personel Ynetimi
              </h2>
            </div>

            {/* Add User Form */}
            {profile?.role === 'admin' && (
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 p-6 space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Plus size={20} className="text-orange-500" /> Yeni Personel Ekle
                </h3>
                <form onSubmit={addUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Ad Soyad</label>
                    <input 
                      name="name"
                      required
                      placeholder="rn: Ahmet Ylmaz"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">nvan / Pozisyon</label>
                    <input 
                      name="title"
                      placeholder="rn: Yazlm Gelitirici, Blm Mdr"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Personel ID</label>
                    <input 
                      name="personnelId"
                      required
                      placeholder="rn: ahmet123"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Sifre</label>
                    <input 
                      name="password"
                      type="password"
                      required
                      placeholder="Sifre belirleyin"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Yetki</label>
                    <select 
                      name="role"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    >
                      <option value="employee">Personel</option>
                      <option value="admin">Ynetici</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Bal Olduu Ynetici</label>
                    <select 
                      name="managerId"
                      required
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    >
                      <option value="admin_initial">Sistem Yoneticisi</option>
                      {allUsers.filter(u => u.role === 'admin' && u.uid !== 'admin_initial').map(admin => (
                        <option key={admin.uid} value={admin.uid}>{admin.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Yllk Izin Bakiyesi (Gn)</label>
                    <input 
                      name="leaveBalance"
                      type="number"
                      defaultValue={14}
                      required
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">e Giris Tarihi</label>
                    <input 
                      name="startDate"
                      type="date"
                      required
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Doum Tarihi</label>
                    <input 
                      name="birthDate"
                      type="date"
                      required
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Cihaz Kstlamas (UA erii)</label>
                    <input 
                      name="allowedDevice"
                      type="text"
                      placeholder="rn: iPhone, Samsung, SM-G991B"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Sabit Cihaz Kimligi (Hardware ID)</label>
                    <input 
                      name="deviceId"
                      type="text"
                      placeholder="Otomatik tanmlanr veya ID girin"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 cursor-pointer hover:border-orange-500/50 transition-colors">
                      <input 
                        name="canRemoteCheckIn"
                        type="checkbox"
                        value="true"
                        className="h-4 w-4 accent-orange-500"
                      />
                      <div>
                        <p className="text-sm font-semibold text-white flex items-center gap-2">
                          <Truck size={14} className="text-orange-500" />
                          Nakliye / Uzaktan Giris Yetkisi
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Bu personel ofis dndan (nakliyede) da giri-k yapabilir. Konumu kaydedilir, yoneticileri bildirim alr.</p>
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
            
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 overflow-hidden">
              {/* Desktop Table View */}
              <table className="hidden md:table w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-900 bg-zinc-900/40">
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-500">sim</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-500">ID</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Yetki</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-500 text-right">lem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {allUsers.filter(u => u.role !== 'deleted').map((u) => (
                    <tr key={u.uid} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.name} className="h-full w-full object-cover" />
                            ) : (
                              u.name[0]
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium leading-none">{u.name}</span>
                            {u.title && <span className="text-[10px] text-zinc-500 font-medium mt-1 uppercase tracking-tight">{u.title}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-zinc-400">{u.personnelId}</td>
                      <td className="p-4">
                        <span className={cn(
                          "rounded-full px-2 py-1 text-[10px] font-bold uppercase",
                          u.role === 'admin' ? "bg-orange-500/10 text-orange-500" : "bg-zinc-800 text-zinc-400"
                        )}>
                          {u.role === 'admin' ? 'Ynetici' : 'Personel'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(profile?.role === 'admin' || u.managerId === user?.uid) && (
                            <button 
                              onClick={() => setEditingUser(u)}
                              className="text-zinc-600 hover:text-orange-500 transition-colors"
                            >
                              <Edit size={18} />
                            </button>
                          )}
                          {profile?.role === 'admin' && u.uid !== user?.uid && (
                            <button 
                              onClick={() => setDeletingUser(u)}
                              className="text-zinc-600 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-zinc-900">
                {allUsers.filter(u => u.role !== 'deleted').map((u) => (
                  <div key={u.uid} className="p-4 flex items-center justify-between hover:bg-zinc-900/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold border border-zinc-700 overflow-hidden shrink-0">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={u.name} className="h-full w-full object-cover" />
                        ) : (
                          u.name[0]
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-bold text-white leading-none">{u.name}</p>
                        {u.title && <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight leading-none">{u.title}</p>}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500">{u.personnelId}</span>
                          <span className={cn(
                            "rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase",
                            u.role === 'admin' ? "bg-orange-500/10 text-orange-500" : "bg-zinc-800 text-zinc-600"
                          )}>
                            {u.role === 'admin' ? 'Ynet' : 'Pers'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(profile?.role === 'admin' || u.managerId === user?.uid) && (
                        <button 
                          onClick={() => setEditingUser(u)}
                          className="p-2 text-zinc-500 active:text-orange-500 transition-colors"
                        >
                          <Edit size={20} />
                        </button>
                      )}
                      {profile?.role === 'admin' && u.uid !== user?.uid && (
                        <button 
                          onClick={() => setDeletingUser(u)}
                          className="p-2 text-zinc-500 active:text-red-500 transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'qr' && profile?.role === 'admin' && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <QrCode size={28} className="text-orange-500" /> QR Kod Oluturucu
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <p className="font-bold text-lg"> Yeri Giris QR Kodu</p>
                  <p className="text-sm text-zinc-500">Bu kodu yazdrp i yerine asabilirsiniz.</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handlePrintQR}
                    className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-2 text-sm font-bold hover:bg-orange-600 transition-colors"
                  >
                    <Printer size={18} /> Yazdr
                  </button>
                  <button 
                    onClick={regenerateQRSecret}
                    className="flex items-center gap-2 rounded-xl bg-zinc-800 px-6 py-2 text-sm font-bold hover:bg-zinc-700 transition-colors text-zinc-400"
                  >
                    <Key size={18} /> Kodu Yenile
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <section className="rounded-3xl border border-zinc-900 bg-zinc-900/20 p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <SettingsIcon size={20} className="text-orange-500" /> Ayarlar Gncelle
                  </h3>
                  <form onSubmit={updateSettings} className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800 pb-1">irket Genel Bilgileri</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-zinc-500 uppercase">irket Ad</label>
                          <input 
                            name="companyName"
                            defaultValue={settings?.companyName}
                            placeholder="rn: ABC Yazlm Ltd. ti."
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-zinc-500 uppercase">Haftalk Calisma Gn</label>
                          <select 
                            name="workDaysPerWeek"
                            defaultValue={settings?.workDaysPerWeek || 6}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                          >
                            <option value="5">5 Gn</option>
                            <option value="6">6 Gn</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-zinc-500 uppercase flex items-center gap-1">
                            Hesaplama Tolerans (Dk) <Info size={12} className="text-zinc-600" title="Ge giri/erken k/fazla mesai tolerans" />
                          </label>
                          <input 
                            name="roundingThresholdMinutes"
                            type="number"
                            defaultValue={settings?.roundingThresholdMinutes || 30}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800 pb-1">Vardiya & Calisma Saatleri</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-zinc-500 uppercase">Mesai Balangc</label>
                          <input 
                            name="shiftStart"
                            type="time"
                            defaultValue={settings?.shiftStart || '09:00'}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-zinc-500 uppercase">Mesai Bitii</label>
                          <input 
                            name="shiftEnd"
                            type="time"
                            defaultValue={settings?.shiftEnd || '18:00'}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800 pb-1">Gvenlik & Eriim</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-zinc-500 uppercase"> Yeri IP Adresi</label>
                          <input 
                            name="officeIp"
                            defaultValue={settings?.officeIp}
                            placeholder="rn: 176.234.12.34"
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-zinc-500 uppercase">QR Gizli Anahtar</label>
                          <input 
                            name="qrSecret"
                            value={settings?.qrSecret || ''}
                            onChange={(e) => setSettings(prev => prev ? { ...prev, qrSecret: e.target.value } : null)}
                            placeholder="QR ierii ne olmal?"
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Mola Kurallar</label>
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
                              <label className="text-[10px] text-zinc-600 uppercase font-bold">Calisma Eii (Saat)</label>
                              <input 
                                name="rule_threshold"
                                type="number"
                                step="0.5"
                                defaultValue={rule.thresholdHours}
                                className="w-full bg-transparent border-b border-zinc-800 focus:border-orange-500 outline-none text-sm py-1"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <label className="text-[10px] text-zinc-600 uppercase font-bold">Kesinti (Dakika)</label>
                              <input 
                                name="rule_deduction"
                                type="number"
                                defaultValue={rule.deductionMinutes}
                                className="w-full bg-transparent border-b border-zinc-800 focus:border-orange-500 outline-none text-sm py-1"
                              />
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
                          <p className="text-[10px] text-zinc-600 italic text-center py-4">Henz mola kural tanmlanmad. Standart kanun kurallar uygulanr.</p>
                        )}
                      </div>
                    </div>
                    <button className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white transition-colors hover:bg-orange-600">
                      Ayarlar Kaydet
                    </button>
                  </form>
                </section>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'leaves' && (
          <LeavesPage
            user={user}
            profile={profile!}
            allUsers={allUsers}
            leaveRequests={leaveRequests}
            overtimeRequests={overtimeRequests}
            getEffectiveLeaveBalance={getEffectiveLeaveBalance}
            submitLeaveRequest={submitLeaveRequest}
            submitOvertimeRequest={submitOvertimeRequest}
            leaveType={leaveType}
            setLeaveType={setLeaveType}
            leaveStartDate={leaveStartDate}
            setLeaveStartDate={setLeaveStartDate}
            leaveEndDate={leaveEndDate}
            setLeaveEndDate={setLeaveEndDate}
            calcLeaveDays={calcLeaveDays}
            setCalcLeaveDays={setCalcLeaveDays}
            overtimeStartTime={overtimeStartTime}
            setOvertimeStartTime={setOvertimeStartTime}
            overtimeEndTime={overtimeEndTime}
            setOvertimeEndTime={setOvertimeEndTime}
            calcOvertimeHours={calcOvertimeHours}
            setCalcOvertimeHours={setCalcOvertimeHours}
            reportFile={reportFile}
            setReportFile={setReportFile}
            uploading={uploading}
            setEditingLeave={setEditingLeave}
            setDeletingLeave={setDeletingLeave}
          />
        )}



        {activeTab === 'approvals' && (
          <ApprovalsPage
            user={user}
            profile={profile!}
            leaveRequests={leaveRequests}
            overtimeRequests={overtimeRequests}
            logs={logs}
            handleRequestAction={handleRequestAction}
            setEditingLeave={setEditingLeave}
            setDeletingLeave={setDeletingLeave}
          />
        )}

        {activeTab === 'profile' && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <UserIcon size={28} className="text-orange-500" /> Profil Bilgileri
              </h2>
            </div>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 p-8 space-y-8">
              {/* Profil Fotoraf */}
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
                  {/* Upload overlay */}
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
                        setStatus({ type: 'error', message: 'Fotoraf en fazla 8MB olabilir.' });
                        return;
                      }
                      setAvatarUploading(true);
                      try {
                        // Canvas ile yeniden boyutlandr ve sktr (Firebase Storage yerine)
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
                          img.onerror = () => reject(new Error('Resim yklenemedi.'));
                          img.src = objectUrl;
                        });
                        await userMutation.mutateAsync({ method: 'PUT', id: user.uid, payload: { avatarUrl: avatarBase64 } });
                        setProfile(prev => prev ? { ...prev, avatarUrl: avatarBase64 } : prev);
                        setStatus({ type: 'success', message: 'Profil fotoraf guncellendi.' });
                      } catch (err: any) {
                        setStatus({ type: 'error', message: 'Fotoraf yklenemedi: ' + err.message });
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
                  <p className="text-zinc-500 text-xs mt-1">{profile?.role === 'admin' ? 'Ynetici' : 'Personel'}</p>
                </div>

                {/* Fotoraf aksiyonlar */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="flex items-center gap-1.5 rounded-xl bg-orange-500/10 px-4 py-2 text-xs font-bold text-orange-500 hover:bg-orange-500/20 transition-colors disabled:opacity-50"
                  >
                    <Camera size={13} />
                    {profile?.avatarUrl ? 'Deitir' : 'Fotoraf Ekle'}
                  </button>
                  {profile?.avatarUrl && (
                    <button
                      onClick={async () => {
                        if (!user) return;
                        if (!window.confirm('Profil fotoraf silinsin mi?')) return;
                        try {
                          await userMutation.mutateAsync({ method: 'PUT', id: user.uid, payload: { avatarUrl: null } });
                          setProfile(prev => prev ? { ...prev, avatarUrl: undefined } : prev);
                          setStatus({ type: 'success', message: 'Profil fotoraf silindi.' });
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
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">e Giris Tarihi</p>
                  <p className="font-medium">
                    {profile?.startDate ? format(new Date(profile.startDate), 'd MMMM yyyy', { locale: tr }) : '-'}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4 space-y-1 md:col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Resmi Yllk Izin Bakiyesi</p>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-black text-orange-500">
                      {getEffectiveLeaveBalance(profile)} GN
                    </p>
                    <div className="text-right">
                      <p className="text-[9px] text-zinc-500 uppercase">Hukuki Hak Edi (Referans)</p>
                      <p className="text-xs font-bold text-zinc-400">{calculateLegalLeave(profile?.startDate, profile?.birthDate)} Gn</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <button 
                  onClick={() => setShowPasswordChangeModal(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500/10 py-4 font-bold text-orange-500 transition-colors hover:bg-orange-500/20"
                >
                  <Key size={20} /> Sifreyi Deitir
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
        )}

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
                    <Edit className="text-orange-500" /> Personel Dzenle
                  </h2>
                  <button 
                    onClick={() => setEditingUser(null)}
                    className="rounded-full bg-zinc-800 p-2 hover:bg-zinc-700"
                  >
                    <XCircle size={24} />
                  </button>
                </div>

                {/* Profil Fotoraf Ynetimi */}
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
                              img.onerror = () => reject(new Error('Resim yklenemedi.'));
                              img.src = objectUrl;
                            });
                            await userMutation.mutateAsync({ method: 'PUT', id: editingUser.uid, payload: { avatarUrl: avatarBase64 } });
                            setEditingUser(prev => prev ? { ...prev, avatarUrl: avatarBase64 } : prev);
                            // Personele bildirim gnder
                            await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('pdks_token') }, body: JSON.stringify({
                              userId: editingUser.uid,
                              title: 'Profil Fotorafnz Guncellendi',
                              message: `${profile?.name || 'Yneticiniz'} profil fotorafnz gncelledi.`,
                              type: 'info',
                              read: false,
                              link: '/profile',
                              createdAt: new Date().toISOString(),
                            }) }).catch(() => {});
                            setStatus({ type: 'success', message: `${editingUser.name} iin profil fotoraf guncellendi.` });
                          } catch (err: any) {
                            setStatus({ type: 'error', message: 'Fotoraf yklenemedi: ' + err.message });
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
                    <p className="font-bold text-sm mb-1">Profil Fotoraf</p>
                    <p className="text-[11px] text-zinc-500 mb-3">Resmin zerine tklayarak fotoraf deitirebilirsiniz. Deiiklik personele bildirim olarak iletilir.</p>
                    {editingUser.avatarUrl && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm('Profil fotoraf silinsin mi?')) return;
                          try {
                            await userMutation.mutateAsync({ method: 'PUT', id: editingUser.uid, payload: { avatarUrl: null } });
                            setEditingUser(prev => prev ? { ...prev, avatarUrl: undefined } : prev);
                            await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('pdks_token') }, body: JSON.stringify({
                              userId: editingUser.uid,
                              title: 'Profil Fotorafnz Silindi',
                              message: `${profile?.name || 'Yneticiniz'} profil fotorafnz kaldrd.`,
                              type: 'info',
                              read: false,
                              link: '/profile',
                              createdAt: new Date().toISOString(),
                            }) }).catch(() => {});
                            setStatus({ type: 'success', message: 'Fotoraf silindi.' });
                          } catch (err: any) {
                            setStatus({ type: 'error', message: 'Silinemedi: ' + err.message });
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-500 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 size={11} /> Fotoraf Kaldr
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
                    <label className="text-xs font-semibold text-zinc-500 uppercase">nvan / Pozisyon</label>
                    <input 
                      name="title"
                      defaultValue={editingUser.title || ''}
                      placeholder="rn: Blm Mdr, Tekniker"
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
                      <option value="admin">Ynetici</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Bal Olduu Ynetici</label>
                    <select 
                      name="managerId"
                      required
                      defaultValue={editingUser.managerId || 'admin_initial'}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    >
                      <option value="admin_initial">Sistem Yoneticisi</option>
                      {allUsers.filter(u => u.role === 'admin' && u.uid !== 'admin_initial').map(admin => (
                        <option key={admin.uid} value={admin.uid}>{admin.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase flex items-center justify-between">
                      Yllk Izin Bakiyesi (Gn)
                      <span className="text-[10px] text-orange-500 lowercase font-normal italic">Mevcut: {getEffectiveLeaveBalance(editingUser)} Gn</span>
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
                    <label className="text-xs font-semibold text-zinc-500 uppercase">e Giris Tarihi</label>
                    <input 
                      name="startDate"
                      type="date"
                      defaultValue={editingUser.startDate}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Doum Tarihi</label>
                    <input 
                      name="birthDate"
                      type="date"
                      defaultValue={editingUser.birthDate}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Cihaz Kstlamas</label>
                    <input 
                      name="allowedDevice"
                      type="text"
                      defaultValue={editingUser.allowedDevice || ''}
                      placeholder="rn: iPhone, Samsung"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-zinc-600">Bo braklrsa her cihazdan giri yapabilir.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-500 uppercase">Sabit Cihaz Kimligi (Fixed ID)</label>
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
                              setStatus({ type: 'success', message: 'Cihaz kilidi kaldrld.' });
                            });
                          }}
                          className="text-[10px] font-bold text-red-500 hover:underline"
                        >
                          Cihaz Kilidini Kaldr
                        </button>
                      )}
                    </div>
                    <input 
                      name="deviceId"
                      type="text"
                      defaultValue={editingUser.deviceId || ''}
                      placeholder="Otomatik atanr, manuel girmek iin yaptrn"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  {/* Nakliye / Uzaktan giri yetkisi */}
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
                          Nakliye / Uzaktan Giris Yetkisi
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Bu personel ofis dndan (nakliyede) da giri-k yapabilir. Konumu kaydedilir, yoneticileri bildirim alr.</p>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Sifre Sfrla (Yeni Sifre)</label>
                    <input 
                      name="password"
                      type="password"
                      placeholder="Deitirmek istemiyorsanz bo brakn"
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
                      Deiiklikleri Kaydet
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
                    {editingLog ? 'Kayd Dzenle' : 'Manuel Kayt Ekle'}
                  </h3>
                  {/* Hedef kii adn gster */}
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
                  <label className="text-xs font-semibold text-zinc-500 uppercase">lem Tipi</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setManualLogType('in')}
                      className={cn(
                        "rounded-xl py-3 text-sm font-bold transition-colors",
                        manualLogType === 'in' ? "bg-emerald-600 text-white" : "bg-zinc-900 text-zinc-500"
                      )}
                    >
                      Giris
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualLogType('out')}
                      className={cn(
                        "rounded-xl py-3 text-sm font-bold transition-colors",
                        manualLogType === 'out' ? "bg-orange-600 text-white" : "bg-zinc-900 text-zinc-500"
                      )}
                    >
                      k
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
                    {editingLog ? 'Gncelle' : 'Kaydet'}
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
                <h3 className="text-xl font-bold">Izin Talebini Dzenle</h3>
                <button onClick={() => setEditingLeave(null)} className="rounded-full bg-zinc-900 p-2 text-zinc-500 hover:bg-zinc-800"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateLeave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Balang</label>
                    <input name="startDate" type="date" required defaultValue={editingLeave.startDate} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Biti</label>
                    <input name="endDate" type="date" required defaultValue={editingLeave.endDate} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Gn Says</label>
                  <input name="days" type="number" required defaultValue={editingLeave.days} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Durum</label>
                  <select name="status" defaultValue={editingLeave.status} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none appearance-none">
                    <option value="pending">Bekliyor</option>
                    <option value="approved">Onayland</option>
                    <option value="rejected">Reddedildi</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Aklama</label>
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
                  <button type="submit" className="flex-[2] rounded-xl bg-orange-500 py-3 font-bold text-white transition-colors hover:bg-orange-600">Gncelle</button>
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
                <h3 className="text-xl font-bold">Mesai Dzenle</h3>
                <button onClick={() => setEditingOvertime(null)} className="rounded-full bg-zinc-900 p-2 text-zinc-500 hover:bg-zinc-800"><X size={20} /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await overtimeMutation.mutateAsync({ method: 'PUT', id: editingOvertime.id!, payload: {
                  date: formData.get('date'),
                  hours: Number(formData.get('hours')),
                  description: formData.get('description'),
                  status: formData.get('status')
                } });
                setEditingOvertime(null);
                setStatus({ type: 'success', message: 'Mesai kayd guncellendi' });
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
                    <option value="approved">Onayland</option>
                    <option value="rejected">Reddedildi</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Aklama</label>
                  <textarea name="description" required defaultValue={editingOvertime.description} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none h-24 resize-none" />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!editingOvertime?.id) return;
                      await overtimeMutation.mutateAsync({ method: 'PUT', id: editingOvertime.id, payload: {
                        deleted: true,
                      } });
                      setEditingOvertime(null);
                      setStatus({ type: 'success', message: 'Mesai kayd silindi.' });
                    }}
                    className="flex-1 rounded-xl bg-red-500/10 py-3 font-bold text-red-500 transition-colors hover:bg-red-500/20"
                  >
                    Sil
                  </button>
                  <button type="submit" className="flex-[2] rounded-xl bg-orange-500 py-3 font-bold text-white transition-colors hover:bg-orange-600">Gncelle</button>
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
                  <Key size={24} className="text-orange-500" /> Sifreyi Deitir
                </h3>
                <button onClick={() => setShowPasswordChangeModal(false)} className="rounded-full bg-zinc-900 p-2 text-zinc-500 hover:bg-zinc-800"><X size={20} /></button>
              </div>
              <form onSubmit={handleSelfPasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Yeni Sifre</label>
                  <input 
                    type="password" 
                    required 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Sifrenizi girin" 
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" 
                  />
                </div>
                <button type="submit" className="w-full rounded-xl bg-orange-500 py-4 font-bold text-white transition-colors hover:bg-orange-600">Gncelle</button>
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
                    <p className="text-xs text-zinc-400">{dashboardStatModal.people.length} kii  Bugn</p>
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
                {/* Manuel Hareket Ekle: admin veya bu gnn sahibinin yoneticisi */}
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
                    <LogIn size={14} className="text-emerald-500" /> Giris-k Kaytlar
                  </h4>
                  <div className="space-y-2">
                    {logs.filter(l => l.userId === selectedDayDetails.userId && !l.deleted && l.timestamp?.toDate && format(l.timestamp.toDate(), 'yyyy-MM-dd') === selectedDayDetails.date).length === 0 ? (
                      <p className="text-xs italic text-zinc-600 py-2 text-center">Bu gn iin giri/k kayd yok.</p>
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
                                 log.status === 'pending' ? 'Ynetici onay bekleniyor' :
                                 (log.type === 'in' ? 'Giris' : 'k')}
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
                    <Clock size={14} className="text-blue-500" /> Mesai Kaytlar
                  </h4>
                  <div className="space-y-2">
                    {overtimeRequests.filter(r => r.userId === selectedDayDetails.userId && r.date === selectedDayDetails.date).length === 0 ? (
                      <p className="text-xs italic text-zinc-600 py-2 text-center">Bu gn iin mesai kayd yok.</p>
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
                        <p className="text-sm text-zinc-500 mb-6">{deletingOvertime.date} tarihli {deletingOvertime.hours} saatlik mesai kayd silinecektir.</p>
                        <div className="flex gap-3">
                          <button onClick={() => setDeletingOvertime(null)} className="flex-1 rounded-xl bg-zinc-900 py-3 font-bold text-zinc-400">Vazge</button>
                          <button 
                            onClick={async () => {
                              await overtimeMutation.mutateAsync({ method: 'DELETE', id: deletingOvertime.id! });
                              setDeletingOvertime(null);
                              setStatus({ type: 'success', message: 'Mesai kayd silindi.' });
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
                    <FileText size={14} className="text-orange-500" /> Izin Kaytlar
                  </h4>
                  <div className="space-y-2">
                    {leaveRequests.filter(r => r.userId === selectedDayDetails.userId && selectedDayDetails.date >= r.startDate && selectedDayDetails.date <= r.endDate).length === 0 ? (
                      <p className="text-xs italic text-zinc-600 py-2 text-center">Bu gn iin izin kayd yok.</p>
                    ) : (
                      leaveRequests.filter(r => r.userId === selectedDayDetails.userId && selectedDayDetails.date >= r.startDate && selectedDayDetails.date <= r.endDate).map(req => (
                        <div key={req.id} className="flex flex-col p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn("p-2 rounded-lg", req.type === 'report' ? "bg-purple-500/10 text-purple-500" : "bg-orange-500/10 text-orange-500")}>
                                <FileText size={14} />
                              </div>
                              <div>
                                <p className="text-sm font-bold capitalize">{req.type === 'report' ? 'Rapor' : (req.type === 'excuse' ? 'Mazeret' : 'Yllk Izin')}</p>
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
                              <Download size={14} /> Rapor Belgesini Grntle
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
              <p className="mb-4 text-sm text-zinc-500">Bu izin talebini silmek istediinize emin misiniz? Personele silme nedeni bildirilecektir.</p>
              
              <div className="mb-6 space-y-1 text-left">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Silme Nedeni (Zorunlu)</label>
                <textarea 
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="ptal edilme sebebi..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm focus:border-red-500 focus:outline-none h-20 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => {
                  setDeletingLeave(null);
                  setDeletionReason('');
                }} className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-bold text-zinc-500">Vazge</button>
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
              <h3 className="mb-2 text-xl font-bold text-white">Kayd Sil</h3>
              <p className="mb-6 text-sm text-zinc-400">
                Bu kayt silinecek, emin misiniz? Bu ilem geri alnamaz.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingLog(null)}
                  className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-bold text-zinc-400 transition-colors hover:bg-zinc-800"
                >
                  Vazge
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
              <p className="mb-6 text-sm text-zinc-500">Bu mesai kaydn silmek istediinize emin misiniz?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingOvertime(null)} className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-bold text-zinc-500">Vazge</button>
                <button onClick={async () => {
                  try {
                    await overtimeMutation.mutateAsync({ method: 'DELETE', id: deletingOvertime.id! });
                    setDeletingOvertime(null);
                    setStatus({ type: 'success', message: 'Mesai kayd silindi' });
                  } catch (e) {
                    setStatus({ type: 'error', message: 'Hata olutu' });
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
                <strong>{deletingUser.name}</strong> isimli personeli silmek istediinize emin misiniz? Bu ilem personelin sisteme giriini engelleyecektir.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingUser(null)}
                  className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-bold text-zinc-400 transition-colors hover:bg-zinc-800"
                >
                  Vazge
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
                    <QrCode /> {scanType === 'in' ? 'Giris' : 'k'} Taramas
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
                    if (err.includes("izni reddedildi") || err.includes("balatlamad")) {
                      setStatus({ type: 'error', message: err });
                      setShowScanner(false);
                    }
                  }}
                />
                <div className="flex items-center gap-2 rounded-xl bg-orange-500/10 p-4 text-xs text-orange-500">
                  <Wifi size={16} />
                  <span>Sadece i yeri Wi-Fi ana balyken tarama yapabilirsiniz.</span>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      {/* Nakliye / Uzaktan Giris Seim Modal */}
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
              {/* Balk */}
              <div className="flex items-center gap-3 p-5 border-b border-zinc-800">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 shrink-0">
                  <Truck size={22} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">Giris Yntemi</h3>
                  <p className="text-xs text-zinc-500">
                    {pendingScanType === 'in' ? '?? Giris' : '?? k'} ilemi  Bir yntem sein
                  </p>
                </div>
                <button onClick={() => { setShowRemoteModal(false); setRemoteManualMode(false); setRemoteNote(''); setRemoteManualTime(''); }} className="text-zinc-500 hover:text-white p-1">
                  <X size={20} />
                </button>
              </div>

              {!remoteManualMode ? (
                /* === EKRAN 1: Yntem Seimi === */
                <div className="p-5 space-y-3">
                  {/* QR Seenei */}
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
                      <p className="font-bold text-white text-sm">QR Kod ile Giris</p>
                      <p className="text-xs text-zinc-500 mt-0.5"> yerindeki QR kodu kameraya okutun</p>
                    </div>
                    <ChevronRight size={18} className="ml-auto text-zinc-600" />
                  </button>

                  {/* Manuel Seenei */}
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
                      <p className="font-bold text-white text-sm">Manuel Giris</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Saati kendiniz girin (nakliye, saha Calismas)</p>
                    </div>
                    <ChevronRight size={18} className="ml-auto text-zinc-600" />
                  </button>

                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2">
                    <MapPin size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-400">Her iki yntemde de konumunuz ve notunuz yoneticinize iletilir.</p>
                  </div>
                </div>
              ) : (
                /* === EKRAN 2: Manuel Giris Formu === */
                <div className="p-5 space-y-4">
                  <button onClick={() => setRemoteManualMode(false)} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition">
                    <ChevronLeft size={14} /> Geri dn
                  </button>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase">{pendingScanType === 'in' ? 'Giris Saati' : 'k Saati'}</label>
                    <input
                      type="time"
                      value={remoteManualTime}
                      onChange={(e) => setRemoteManualTime(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-2xl font-bold text-center focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase">Aklama / Konum Notu</label>
                    <textarea
                      value={remoteNote}
                      onChange={(e) => setRemoteNote(e.target.value)}
                      placeholder="rn: Ankara mal teslimi, antiye Calismas..."
                      rows={3}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { setShowRemoteModal(false); setRemoteManualMode(false); setRemoteNote(''); }}
                      className="rounded-xl border border-zinc-700 py-3 text-sm font-bold text-zinc-400 hover:bg-zinc-800 transition"
                    >
                      ptal
                    </button>
                    <button
                      disabled={remoteSubmitting || !remoteManualTime}
                      onClick={async () => {
                        if (!user || !profile || !pendingScanType || !remoteManualTime) return;
                        setRemoteSubmitting(true);
                        try {
                          // Saat bilgisini bugne uygula
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

                          const newDocRef = await attendanceMutation.mutateAsync({ method: 'POST', payload: {
                            ...logPayload,
                            timestamp: clientNow, // Kullancnn girdii saat
                          } });

                          // Optimistik UI
                          const optimisticLog: AttendanceLog = {
                            id: newDocRef.id,
                            ...logPayload,
                            timestamp: { toDate: () => clientNow } as any,
                          };
                          setLogs(prev => [optimisticLog, ...prev.filter(l => l.id !== newDocRef.id)]);

                          // Bildirim gnder
                          fetch('/api/notify/checkin', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: user.uid, userName: profile.name, type: pendingScanType, isRemote: true, remoteNote: remoteNote || '' })
                          }).catch(() => {});

                          setStatus({ type: 'success', message: `?? Manuel ${pendingScanType === 'in' ? 'giri' : 'k'} talebi alnd. Ynetici onayndan sonra kesinleecek.` });
                          setShowRemoteModal(false);
                          setRemoteManualMode(false);
                          setRemoteNote('');
                          setRemoteManualTime('');
                        } catch (err) {
                          setStatus({ type: 'error', message: 'Manuel kayt srasnda hata olutu.' });
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

      {/* Belge Grntleyici Modal */}
      {/* Belge Grntleyici Modal */}
      {viewingAttachment && (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-zinc-900 rounded-2xl overflow-hidden flex flex-col border border-zinc-800 h-[80vh] shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
              <h3 className="font-bold text-white flex items-center gap-2">
                <FileText size={18} className="text-emerald-500"/> Belge Grntleyici
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
                    Mobil cihazlarda (zellikle iOS) yerleik PDF grntleyiciler tam uyumlu Calismayabilir. Belgeyi eksiksiz grntlemek iin ltfen cihaznza indirin veya an.
                  </p>
                  <button 
                    onClick={handleDownloadAndOpen}
                    className="mt-4 flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                  >
                    <Download size={18} /> Belgeyi A / ndir
                  </button>
                </div>
              )}
            </div>
            {viewingAttachment.startsWith('data:image') && (
              <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex justify-end gap-3">
                <button onClick={handleDownloadAndOpen} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <Download size={16} /> Cihaza ndir
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      </main>



      {/* Bottom Nav */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profile={profile}
        user={user}
        allUsers={allUsers}
        leaveRequests={leaveRequests}
        overtimeRequests={overtimeRequests}
        notifications={notifications}
        logs={logs}
      />
    </div>
  );
}






