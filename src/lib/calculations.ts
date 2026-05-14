/**
 * İş Mantığı Hesaplamaları
 * Çalışma süresi, izin hakkı, mola kesintisi gibi hesaplamalar
 */

import { GlobalSettings } from '../types';
import { getHoliday } from './holidays';

/**
 * Yasal yıllık izin hakkını hesapla (4857 sayılı İş Kanunu, Madde 53)
 */
export function calculateLegalLeave(startDateStr: string | undefined, birthDateStr: string | undefined): number {
  if (!startDateStr) return 0;
  try {
    const start = new Date(startDateStr);
    const today = new Date();
    
    let years = today.getFullYear() - start.getFullYear();
    const m = today.getMonth() - start.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < start.getDate())) {
      years--;
    }

    if (years < 1) return 0;

    let age = 30;
    if (birthDateStr) {
      const birth = new Date(birthDateStr);
      age = today.getFullYear() - birth.getFullYear();
      const mAge = today.getMonth() - birth.getMonth();
      if (mAge < 0 || (mAge === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
    }

    // Türk İş Kanunu
    let days = 14;
    if (years >= 5 && years < 15) days = 20;
    else if (years >= 15) days = 26;

    // 18 yaş altı veya 50 yaş üstü: minimum 20 gün
    if (age <= 18 || age >= 50) return Math.max(days, 20);
    return days;
  } catch (e) {
    console.error("Leave calc error:", e);
    return 0;
  }
}

/**
 * Net çalışma süresini hesapla (mola kesintisi ile)
 * İş Kanunu Madde 68 - Ara Dinlenmesi
 */
export function calculateNetWorkDuration(durationHours: number, settings: GlobalSettings | null): number {
  if (!settings || !settings.breakRules || settings.breakRules.length === 0) {
    // Varsayılan İş Kanunu minimumlari
    if (durationHours > 7.5) return Math.max(0, durationHours - 1);
    if (durationHours > 4) return Math.max(0, durationHours - 0.5);
    if (durationHours > 0) return Math.max(0, durationHours - 0.25);
    return 0;
  }

  const sortedRules = [...settings.breakRules].sort((a, b) => b.thresholdHours - a.thresholdHours);
  const applicableRule = sortedRules.find(r => durationHours >= r.thresholdHours);

  if (applicableRule) {
    return Math.max(0, durationHours - (applicableRule.deductionMinutes / 60));
  }
  return durationHours;
}

/**
 * Kesilen mola süresini hesapla
 */
export function getDeductedBreakTime(durationHours: number, settings: GlobalSettings | null): number {
  const net = calculateNetWorkDuration(durationHours, settings);
  return durationHours - net;
}

/**
 * İzin günlerini hesapla (hafta sonları ve tatiller hariç)
 */
export function calculateLeaveDays(
  startDate: string, 
  endDate: string, 
  workDaysPerWeek: number = 6
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return 0;

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    const dateStr = current.toISOString().slice(0, 10);
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6 && workDaysPerWeek === 5;
    const isPublicHoliday = !!getHoliday(dateStr);
    
    if (!isSunday && !isSaturday && !isPublicHoliday) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Cihaz kimliği oluştur/getir (localStorage + cookie ile kalıcı)
 */
export function getOrCreateDeviceId(): string {
  let devId = localStorage.getItem('pdks_device_id');
  
  if (!devId) {
    const match = document.cookie.match(new RegExp('(^| )pdks_device_id=([^;]+)'));
    if (match) devId = match[2];
  }
  
  if (!devId) {
    devId = 'dev-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  
  try {
    localStorage.setItem('pdks_device_id', devId);
    document.cookie = `pdks_device_id=${devId}; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/`;
  } catch (e) {
    console.warn("Tarayıcı veri kaydetmeyi engelliyor.");
  }
  
  return devId;
}

/**
 * Data URI'yi Blob'a çevir (profil fotoğrafı yükleme için)
 */
export function dataURItoBlob(dataURI: string): Blob {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

/**
 * Efektif izin bakiyesi (kayıtlı bakiye veya yasal hesaplama)
 */
export function getEffectiveLeaveBalance(
  leaveBalance: number | undefined,
  startDate: string | undefined,
  birthDate: string | undefined
): number {
  if (leaveBalance !== undefined && leaveBalance !== 0) return leaveBalance;
  return calculateLegalLeave(startDate, birthDate) || 0;
}
