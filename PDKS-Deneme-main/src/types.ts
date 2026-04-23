export interface UserProfile {
  uid: string;
  personnelId: string;
  password?: string;
  name: string;
  title?: string;
  email?: string;
  role: 'admin' | 'employee' | 'deleted';
  managerId?: string; // Assigned manager (admin)
  leaveBalance: number; // Annual leave balance
  startDate?: string; // Employment start date (YYYY-MM-DD)
  birthDate?: string; // Birth date (YYYY-MM-DD)
  allowedDevice?: string; // Restricted device model/UA
  deviceId?: string; // Registered fixed device ID
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
  attachmentUrl?: string; // For report PDFs
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
}

export interface AttendanceLog {
  id?: string;
  userId: string;
  userName: string;
  timestamp: any; // Firestore Timestamp
  type: 'in' | 'out';
  ipAddress: string;
  status?: 'success' | 'warning' | 'error';
  errorMessage?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  deleted?: boolean;
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
}
