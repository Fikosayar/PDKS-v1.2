/**
 * AppContext — Merkezi state yönetimi
 * Tüm sayfalar ve bileşenler arasında paylaşılan state
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { UserProfile, AttendanceLog, GlobalSettings, LeaveRequest, OvertimeRequest, SystemNotification, OfflineQueueItem } from '../types';
import { subscribeToPush, requestNotificationPermission } from '../lib/pushNotifications';
import { addToOfflineQueue, getOfflineQueue, removeFromOfflineQueue } from '../lib/offlineQueue';
import { getStoredTheme, setStoredTheme, applyTheme, listenSystemTheme, getEffectiveTheme, type Theme } from '../lib/theme';
import { calculateLegalLeave, getOrCreateDeviceId } from '../lib/calculations';
import { loginUser, subscribePush } from '../services/api';
import { format } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';

// --- Types ---

export interface StatusMessage {
  type: 'success' | 'error';
  message: string;
}

interface AppContextType {
  // Auth
  user: { uid: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  handleLogin: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleLogout: () => void;
  loginError: React.ReactNode | null;
  
  // Data
  logs: AttendanceLog[];
  allUsers: UserProfile[];
  leaveRequests: LeaveRequest[];
  overtimeRequests: OvertimeRequest[];
  settings: GlobalSettings | null;
  notifications: SystemNotification[];
  
  // UI State
  status: StatusMessage | null;
  setStatus: React.Dispatch<React.SetStateAction<StatusMessage | null>>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  // Theme
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  cycleTheme: () => void;
  
  // Online/Offline
  isOnline: boolean;
  offlineQueueCount: number;
  
  // Push
  pushEnabled: boolean;

  // Helpers
  getEffectiveLeaveBalance: (u: UserProfile | null) => number;
  markNotificationRead: (id: string) => Promise<void>;
  syncOfflineQueueToFirebase: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// --- Provider ---

export function AppProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname === '/' || location.pathname === '' ? 'home' : location.pathname.substring(1);
  const setActiveTab = (tab: string) => navigate(`/${tab}`);

  // Core state
  const [user, setUser] = useState<{ uid: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([]);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loginError, setLoginError] = useState<React.ReactNode | null>(null);

  // Status with auto-dismiss
  const [status, setStatus] = useState<StatusMessage | null>(null);
  useEffect(() => {
    if (!status) return;
    const timeout = status.type === 'success' ? 4000 : 6000;
    const timer = setTimeout(() => setStatus(null), timeout);
    return () => clearTimeout(timer);
  }, [status]);

  // Theme
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());
  const effectiveTheme = getEffectiveTheme(theme);
  useEffect(() => {
    applyTheme(theme);
    setStoredTheme(theme);
    if (theme === 'system') {
      return listenSystemTheme(() => applyTheme('system'));
    }
  }, [theme]);
  const cycleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : prev === 'light' ? 'system' : 'dark');

  // Online/Offline
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);

  // --- Auth ---
  
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError(null);
    const formData = new FormData(e.currentTarget);
    const personnelId = formData.get('personnelId') as string;
    const password = formData.get('password') as string;

    try {
      const data = await loginUser({
        personnelId,
        password,
        deviceInfo: navigator.userAgent,
        permanentDeviceId: getOrCreateDeviceId(),
      });

      if (data.success !== false && data.uid) {
        if (data.customToken) {
          try {
            await signInWithCustomToken(auth, data.customToken);
          } catch (authError) {
            console.error("Firebase Auth sign-in error:", authError);
          }
        }

        const session = { uid: data.uid, token: data.customToken };
        localStorage.setItem('pdks_session', JSON.stringify(session));
        setUser({ uid: data.uid });
        setProfile(data as unknown as UserProfile);
      } else {
        if (data.currentDevice) {
          setLoginError(`Cihaz uyumsuzluğu: ${data.error}`);
        } else {
          setLoginError(data.error || 'Giriş başarısız.');
        }
      }
    } catch (error: any) {
      setLoginError(error?.message || 'Sistem hatası. Lütfen internet bağlantınızı kontrol edin.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pdks_session');
    setUser(null);
    setProfile(null);
  };

  // --- Session Verify ---
  useEffect(() => {
    const savedSession = localStorage.getItem('pdks_session');
    if (savedSession) {
      const sessionData = JSON.parse(savedSession);
      const verifySession = async () => {
        try {
          if (sessionData.token) {
            await signInWithCustomToken(auth, sessionData.token).catch(() => {});
          }
          const docRef = doc(db, 'users', sessionData.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;
            if (userData.role !== 'deleted') {
              setUser({ uid: userData.uid });
              setProfile(userData);
            } else {
              localStorage.removeItem('pdks_session');
            }
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

  // --- Firestore Listeners ---

  // Settings
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as GlobalSettings);
      }
    });
    return unsubscribe;
  }, [user]);

  // Attendance Logs
  useEffect(() => {
    if (!user || !profile) return;
    
    let q: ReturnType<typeof query>;
    if (profile.role === 'admin') {
      q = query(collection(db, 'attendance'), orderBy('timestamp', 'desc'), limit(1000));
    } else {
      q = query(collection(db, 'attendance'), where('userId', '==', user.uid));
    }

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: false }, (snapshot) => {
      const newLogs = snapshot.docs
        .map(d => ({
          id: d.id,
          ...(d.data() as Record<string, any>)
        }))
        .filter((l: any) => !l.deleted) as AttendanceLog[];
      
      if (profile.role !== 'admin') {
        newLogs.sort((a, b) => {
          const aT = a.timestamp?.toDate?.()?.getTime?.() || 0;
          const bT = b.timestamp?.toDate?.()?.getTime?.() || 0;
          return bT - aT;
        });
      }
      
      setLogs(newLogs);
    }, (error) => {
      console.error("Logs listener error:", error);
    });
    return unsubscribe;
  }, [user, profile]);

  // Team Logs (managers)
  useEffect(() => {
    if (!user || !profile || profile.role === 'admin') return;
    
    const teamUids = allUsers.filter(u => u.managerId === user.uid).map(u => u.uid);
    if (teamUids.length === 0) return;
    
    const safeUids = teamUids.slice(0, 10);
    const q = query(collection(db, 'attendance'), where('userId', 'in', safeUids));

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: false }, (snapshot) => {
      const teamLogs = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((l: any) => !l.deleted) as AttendanceLog[];

      setLogs(prev => {
        const ownLogs = prev.filter(l => l.userId === user.uid);
        const merged = [...ownLogs, ...teamLogs];
        const unique = merged.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        return unique.sort((a: any, b: any) => {
          const aT = a.timestamp?.toDate?.()?.getTime?.() ?? 0;
          const bT = b.timestamp?.toDate?.()?.getTime?.() ?? 0;
          return bT - aT;
        });
      });
    });
    return unsubscribe;
  }, [user, profile, allUsers]);

  // Users
  useEffect(() => {
    if (!user || !profile) return;
    
    let q;
    if (profile.role === 'admin') {
      q = query(collection(db, 'users'));
    } else {
      q = query(collection(db, 'users'), where('managerId', '==', user.uid));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList = snapshot.docs.map(d => d.data() as UserProfile);
      setAllUsers(usersList);
    });
    return unsubscribe;
  }, [user, profile]);

  // Leave Requests
  useEffect(() => {
    if (!user || !profile) return;
    
    let q;
    if (profile.role === 'admin') {
      q = query(collection(db, 'leaveRequests'), orderBy('createdAt', 'desc'));
    } else {
      q = query(
        collection(db, 'leaveRequests'), 
        or(where('userId', '==', user.uid), where('managerId', '==', user.uid)),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as LeaveRequest[];
      const activeRequests = requests.filter(r => !(r as any).deleted);
      if (profile.role === 'admin') {
        setLeaveRequests(activeRequests);
      } else {
        setLeaveRequests(activeRequests.filter(r => r.userId === user.uid || r.managerId === user.uid));
      }
    });
    return unsubscribe;
  }, [user, profile]);

  // Overtime Requests
  useEffect(() => {
    if (!user || !profile) return;
    
    let q;
    if (profile.role === 'admin') {
      q = query(collection(db, 'overtimeRequests'), orderBy('createdAt', 'desc'));
    } else {
      q = query(
        collection(db, 'overtimeRequests'),
        or(where('userId', '==', user.uid), where('managerId', '==', user.uid)),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as OvertimeRequest[];
      const activeRequests = requests.filter(r => !(r as any).deleted);
      if (profile.role === 'admin') {
        setOvertimeRequests(activeRequests);
      } else {
        setOvertimeRequests(activeRequests.filter(r => r.userId === user.uid || r.managerId === user.uid));
      }
    });
    return unsubscribe;
  }, [user, profile]);

  // Notifications
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), where('userId', '==', user.uid), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as SystemNotification[];
      newNotifs.sort((a: any, b: any) => {
        const aTime = a.createdAt?.toDate?.()?.getTime?.() ?? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0);
        const bTime = b.createdAt?.toDate?.()?.getTime?.() ?? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0);
        return bTime - aTime;
      });
      setNotifications(newNotifs.slice(0, 50));
    }, (error) => {
      console.warn('Notifications listener error:', error.message);
    });
    return unsubscribe;
  }, [user]);

  // --- Side Effects ---

  // Online/Offline
  const syncOfflineQueueToFirebase = useCallback(async () => {
    if (!user || !profile) return;
    const queue = await getOfflineQueue();
    if (queue.length === 0) return;
    
    let syncedCount = 0;
    for (const item of queue) {
      try {
        const { clientTimestamp, ...payload } = item.payload;
        await addDoc(collection(db, 'attendance'), {
          ...payload,
          timestamp: serverTimestamp(),
          offlineQueued: true,
          clientTimestamp
        });
        await removeFromOfflineQueue(item.id);
        syncedCount++;
      } catch (err) {
        console.error('Çevrimdışı kayıt senkronize edilemedi:', err);
      }
    }
    if (syncedCount > 0) {
      setOfflineQueueCount(0);
      setStatus({ type: 'success', message: `${syncedCount} çevrimdışı hareket başarıyla senkronize edildi!` });
    }
  }, [user, profile]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await syncOfflineQueueToFirebase();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineQueueToFirebase]);

  // SW messages
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
  }, [navigate, syncOfflineQueueToFirebase]);

  // Push setup
  useEffect(() => {
    if (!user) return;
    const setupPush = async () => {
      const granted = await requestNotificationPermission();
      if (granted) {
        const sub = await subscribeToPush();
        if (sub) {
          setPushEnabled(true);
          await subscribePush(user.uid, sub);
        }
      }
    };
    setupPush();
  }, [user]);

  // Offline queue count
  useEffect(() => {
    getOfflineQueue().then(q => setOfflineQueueCount(q.length));
  }, [user]);

  // IP fetching moved to where it's needed (pages)

  // --- Helpers ---

  const getEffectiveLeaveBalanceFn = (u: UserProfile | null) => {
    if (!u) return 0;
    if (u.leaveBalance !== undefined && u.leaveBalance !== 0) return u.leaveBalance;
    return calculateLegalLeave(u.startDate, u.birthDate) || 0;
  };

  const markNotificationRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e) {
      console.error("Mark read error:", e);
    }
  };

  // --- Context Value ---

  const value: AppContextType = useMemo(() => ({
    user, profile, loading, handleLogin, handleLogout, loginError,
    logs, allUsers, leaveRequests, overtimeRequests, settings, notifications,
    status, setStatus, activeTab, setActiveTab,
    theme, effectiveTheme, cycleTheme,
    isOnline, offlineQueueCount, pushEnabled,
    getEffectiveLeaveBalance: getEffectiveLeaveBalanceFn,
    markNotificationRead, syncOfflineQueueToFirebase,
  }), [
    user, profile, loading, loginError,
    logs, allUsers, leaveRequests, overtimeRequests, settings, notifications,
    status, activeTab, theme, effectiveTheme,
    isOnline, offlineQueueCount, pushEnabled,
    syncOfflineQueueToFirebase,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
