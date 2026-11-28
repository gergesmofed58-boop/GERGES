import { WorkLocationSettings, createDefaultWorkLocation } from './types';

export interface GpsLiveState {
  status: 'idle' | 'locating' | 'watching' | 'error';
  distanceMeters: number | null;
  accuracyMeters: number | null;
  isInside: boolean;
  lastCheckedTime: string | null;
  errorMsg: string | null;
}

export function getNormalizedWorkLocation(
  loc?: WorkLocationSettings
): WorkLocationSettings {
  const defaults = createDefaultWorkLocation();
  if (!loc) return defaults;
  return {
    ...defaults,
    ...loc,
    radiusMeters: Math.max(25, Math.min(5000, loc.radiusMeters || defaults.radiusMeters)),
  };
}

/**
 * Pure offline Haversine distance in meters between two GPS coordinates.
 * Works 100% without internet using the phone's built-in GPS chip.
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function formatDistanceAr(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} متر`;
  const km = (meters / 1000).toFixed(1).replace(/\.0$/, '');
  return `${km} كم`;
}

export function translateGeolocationError(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'تم رفض إذن الموقع — فعّل إذن الـ GPS للمتصفح أو التطبيق من إعدادات الموبايل.';
    case err.POSITION_UNAVAILABLE:
      return 'إشارة الـ GPS غير متاحة حالياً — تأكد إن خدمة الموقع (Location) شغالة على الموبايل.';
    case err.TIMEOUT:
      return 'استغرق تحديد الموقع وقتاً طويلاً — جرّب تاني قريب من شباك أو مكان مفتوح لإشارة GPS أوضح.';
    default:
      return 'تعذّر قراءة إحداثيات الـ GPS حالياً.';
  }
}

export function captureCurrentPositionOffline(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
}> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('المتصفح أو الجهاز الحالي لا يدعم خدمة الـ GPS.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy || 0),
        });
      },
      (err) => {
        reject(new Error(translateGeolocationError(err)));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  });
}
