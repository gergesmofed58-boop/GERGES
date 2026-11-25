import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActiveClockInState } from './useWorkAppStore';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
}

/**
 * يدير استمرار العداد في الخلفية (حتى لو قفلت البرنامج أو الشاشة) + تنبيه انتهاء الوردية + إبقاء الشاشة مفتوحة اختياريًا
 */
export function useBackgroundShift(activeClockIn: ActiveClockInState | null) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'denied'
  );

  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const notifiedShiftRef = useRef<number | null>(null);

  const supportsWakeLock =
    typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const supportsNotifications =
    typeof window !== 'undefined' && 'Notification' in window;

  // تحديث الساعة والعداد كل ثانية + مزامنة فورية لحظة ما ترجع للبرنامج بعد ما كان مقفول
  useEffect(() => {
    const syncNow = () => setNowMs(Date.now());
    const id = window.setInterval(syncNow, 1000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncNow();
      }
    };
    window.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', syncNow);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', syncNow);
    };
  }, []);

  // إشعار تلقائي لما تخلص ساعات الوردية لو المستخدم فعل التنبيهات
  useEffect(() => {
    if (!activeClockIn) {
      notifiedShiftRef.current = null;
      return;
    }
    const elapsedHours = (nowMs - activeClockIn.startedAtMs) / (1000 * 60 * 60);
    if (
      supportsNotifications &&
      notifPermission === 'granted' &&
      elapsedHours >= (activeClockIn.targetHours || 8) &&
      notifiedShiftRef.current !== activeClockIn.startedAtMs
    ) {
      notifiedShiftRef.current = activeClockIn.startedAtMs;
      try {
        new Notification('شغلي ومرتبي — خلّصت ساعات ورديتك', {
          body: `عدّى ${activeClockIn.targetHours || 8} ساعات على بداية الوردية، لو خلصت شغل اضغط عشان تقفل اليوم وتحفظ ساعاتك.`,
          icon: '/pwa-192x192.png',
        });
      } catch {
        // Ignore notification errors in restricted contexts
      }
    }
  }, [activeClockIn, nowMs, notifPermission, supportsNotifications]);

  // إيقاف Wake Lock لو الوردية اتقفلت
  useEffect(() => {
    if (!activeClockIn && wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  }, [activeClockIn]);

  const requestNotifications = useCallback(async () => {
    if (!supportsNotifications) return;
    try {
      const res = await Notification.requestPermission();
      setNotifPermission(res);
    } catch {
      // Ignore
    }
  }, [supportsNotifications]);

  const toggleWakeLock = useCallback(async () => {
    if (!supportsWakeLock) return;
    try {
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setWakeLockActive(false);
        return;
      }
      const nav = navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
      };
      if (nav.wakeLock) {
        const sentinel = await nav.wakeLock.request('screen');
        wakeLockRef.current = sentinel;
        setWakeLockActive(true);
      }
    } catch {
      setWakeLockActive(false);
    }
  }, [supportsWakeLock]);

  return {
    nowMs,
    wakeLockActive,
    supportsWakeLock,
    supportsNotifications,
    notifPermission,
    requestNotifications,
    toggleWakeLock,
  };
}
