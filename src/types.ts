export type RoleName = 'admin' | 'mudur' | 'takim_lideri' | 'personel' | 'deleted';

export interface Permission {
  canApproveLeave: boolean;
  canApproveOvertime: boolean;
  canViewAllAttendance: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canUseRemoteCheckIn: boolean; // Nakliye / Uzaktan giriş yetkisi
}

export interface RoleDefinition {
  id: string;
  name: string;
  label: string; // Türkçe görüntü adı
  permissions: Permission;
  rank: number; // Küçük sayı = daha üst hiyerarşi
}

export interface UserProfile {
  uid: string;
  personnelId: string;
  password?: string;
  name: string;
  title?: string;
  email?: string;
  role: RoleName;
  customRole?: string; // RoleDefinition.id referansı
  managerId?: string;
  leaveBalance: number;
  startDate?: string;
  birthDate?: string;
  allowedDevice?: string;
  deviceId?: string;
  pushSubscription?: string; // JSON string of PushSubscription
  canRemoteCheckIn?: boolean; // Nakliye/uzaktan giriş yetkisi
  avatarUrl?: string; // Profil fotoğrafı URL
  createdAt: string;
}

export interface LeaveRequest {
  id?: string;
  userId: string;
  userName: string;
  managerId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  type: 'annual' | 'report' | 'excuse';
  attachmentUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  deleted?: boolean;
  deleteReason?: string;
  deletedBy?: string;
}

export interface OvertimeRequest {
  id?: string;
  userId: string;
  userName: string;
  managerId: string;
  date: string;
  hours: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  deleted?: boolean;
}

export interface AttendanceLog {
  id?: string;
  userId: string;
  userName: string;
  timestamp: any;
  type: 'in' | 'out';
  ipAddress: string;
  status?: 'success' | 'warning' | 'error' | 'pending';
  errorMessage?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  isRemote?: boolean; // Nakliye / uzaktan giriş
  remoteNote?: string; // Personelin nakliye notu/mazereti
  manualEntry?: boolean; // Admin/yönetici tarafından manuel oluşturuldu
  deleted?: boolean;
  offlineQueued?: boolean; // Çevrimdışı kuyruğundan gönderildi
}

export interface GlobalSettings {
  officeIp: string;
  qrSecret: string;
  companyName?: string;
  workDaysPerWeek?: number;
  roundingThresholdMinutes?: number;
  shiftStart?: string;
  shiftEnd?: string;
  breakRules?: {
    thresholdHours: number;
    deductionMinutes: number;
  }[];
}

export interface SystemNotification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  createdAt: any;
  link?: string; // Uygulamada yönlendirilecek yol (örn: '/izinler')
  deleted?: boolean;
}

// Çevrimdışı kuyruğu için (IndexedDB'de saklanır)
export interface OfflineQueueItem {
  id: string;
  type: 'attendance';
  payload: Omit<AttendanceLog, 'id' | 'timestamp'> & { clientTimestamp: string };
  createdAt: string;
}
