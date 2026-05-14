/**
 * Web Push Notification Yönetimi
 * VAPID tabanlı gerçek push bildirimleri
 */

export const VAPID_PUBLIC_KEY = 'BOPBnKZxgQDkPI2W4reXfIxX4JvL_fmvxEStJMCwZ5VR8OCWongeK167qF3ag0_Liq0CkxvKpGM307hbTr3gJtY';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Push bildirimlerine abone ol ve subscription objesini döndür.
 * Bu obje Firebase'deki kullanıcı profiline kaydedilir.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push bildirimleri bu tarayıcıda desteklenmiyor.');
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Mevcut aboneliği kontrol et
    const existing = await registration.pushManager.getSubscription();
    if (existing) return existing;

    // Yeni abonelik oluştur
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    return subscription;
  } catch (err) {
    console.error('Push abonelik hatası:', err);
    return null;
  }
}

/**
 * Bildirim iznini iste
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  
  if (Notification.permission === 'granted') return true;
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Yerel bildirim göster (uygulama açıkken)
 */
export function showLocalNotification(title: string, body: string, link?: string) {
  if (!('serviceWorker' in navigator)) return;
  
  navigator.serviceWorker.ready.then(registration => {
    registration.showNotification(title, {
      body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      data: { link: link || '/' },
      requireInteraction: false,
    });
  });
}
