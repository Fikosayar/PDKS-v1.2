/**
 * API Service Layer — Tüm backend çağrıları burada merkezi yönetilir
 * Frontend'den doğrudan fetch() çağrısı yerine bu fonksiyonlar kullanılır
 */

// --- Auth ---

export interface LoginPayload {
  personnelId: string;
  password: string;
  deviceInfo: string;
  permanentDeviceId: string;
}

export interface LoginResponse {
  success: boolean;
  uid?: string;
  customToken?: string;
  error?: string;
  currentDevice?: string;
  allowedDevice?: string;
  [key: string]: any; // profile fields
}

export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Sunucudan geçersiz yanıt alındı. Lütfen tekrar deneyin.');
  }

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Giriş başarısız.');
  }

  return data;
}

// --- Users ---

export interface CreateUserPayload {
  adminUid: string;
  newUser: Record<string, any>;
}

export async function createUser(payload: CreateUserPayload): Promise<{ success: boolean }> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Personel eklenirken hata oluştu.');
  }
  return data;
}

export interface UpdateUserPayload {
  adminUid: string;
  targetUid: string;
  updates: Record<string, any>;
}

export async function updateUser(payload: UpdateUserPayload): Promise<{ success: boolean }> {
  const response = await fetch('/api/users/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Güncelleme başarısız.');
  }
  return data;
}

// --- Attendance ---

export async function deleteAttendanceLog(logId: string, adminUid: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/attendance/${logId}?adminUid=${adminUid}`, {
    method: 'DELETE',
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Kayıt silinirken hata oluştu.');
  }
  return data;
}

// --- Push Notifications ---

export async function subscribePush(uid: string, subscription: PushSubscription): Promise<void> {
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, subscription }),
  });
}

export async function sendPushNotification(payload: {
  actorUid: string;
  targetUid: string;
  title: string;
  body: string;
  link?: string;
}): Promise<void> {
  await fetch('/api/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// --- Notify ---

export function notifyApproval(payload: {
  targetUid: string;
  isApproved: boolean;
  requestType: string;
  actorName: string;
}): void {
  // Fire and forget
  fetch('/api/notify/approval', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

export function notifyCheckin(payload: {
  userId: string;
  userName: string;
  type: 'in' | 'out';
  isRemote: boolean;
  remoteNote: string;
}): void {
  fetch('/api/notify/checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

export function notifyNewRequest(payload: {
  userId: string;
  userName: string;
  requestType: string;
  managerId: string;
}): void {
  fetch('/api/notify/newrequest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
