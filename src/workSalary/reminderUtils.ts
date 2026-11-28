import { ARABIC_WEEKDAYS, WorkReminderSettings, createDefaultReminders } from './types';

export interface ActiveReminderAlert {
  id: string;
  title: string;
  body: string;
  timeLabel: string;
  kind: 'start' | 'end' | 'custom' | 'test';
}

export function getNormalizedReminders(
  reminders?: WorkReminderSettings
): WorkReminderSettings {
  const defaults = createDefaultReminders();
  if (!reminders) return defaults;
  return {
    ...defaults,
    ...reminders,
    activeDays: Array.isArray(reminders.activeDays)
      ? reminders.activeDays
      : defaults.activeDays,
    customReminders: Array.isArray(reminders.customReminders)
      ? reminders.customReminders
      : [],
  };
}

export function parseTimeToMinutes(hhmm: string): number {
  const [hStr, mStr] = (hhmm || '08:00').split(':');
  const h = Math.max(0, Math.min(23, parseInt(hStr, 10) || 0));
  const m = Math.max(0, Math.min(59, parseInt(mStr, 10) || 0));
  return h * 60 + m;
}

export function minutesToHHMM(totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTimeAr12h(hhmm: string): string {
  const mins = parseTimeToMinutes(hhmm);
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h24 >= 12 ? 'م' : 'ص';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function playReminderChime(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [587.33, 783.99, 1046.5]; // D5 -> G5 -> C6 pleasant chime
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);

      gain.gain.setValueAtTime(0.001, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.14 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.35);
    });

    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1200);
  } catch {
    // Audio playback may be blocked until user interaction
  }
}

export function sendBrowserNotification(title: string, body: string): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;
  try {
    new Notification(title, {
      body,
      dir: 'rtl',
      lang: 'ar',
    });
    return true;
  } catch {
    return false;
  }
}

export function getNextReminderSummary(reminders: WorkReminderSettings): string {
  if (!reminders.enabled) return 'التنبيهات متوقفة حالياً';
  if (reminders.activeDays.length === 0) return 'اختر أيام العمل لتفعيل التنبيه';

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayJsDay = now.getDay();

  const candidateEvents: Array<{ dayOffset: number; minutes: number; label: string }> = [];

  for (let offset = 0; offset <= 7; offset++) {
    const jsDay = (todayJsDay + offset) % 7;
    if (!reminders.activeDays.includes(jsDay)) continue;

    if (reminders.remindStartEnabled) {
      const startMins = parseTimeToMinutes(reminders.workStartTime);
      const alertMins = startMins - Math.max(0, reminders.remindBeforeMinutes || 0);
      const normalizedDayOffset = alertMins < 0 ? offset - 1 : offset;
      const wrappedMins = ((alertMins % 1440) + 1440) % 1440;
      if (
        normalizedDayOffset > 0 ||
        (normalizedDayOffset === 0 && wrappedMins > nowMinutes)
      ) {
        candidateEvents.push({
          dayOffset: normalizedDayOffset,
          minutes: wrappedMins,
          label:
            reminders.remindBeforeMinutes > 0
              ? `قبل الشغل بـ ${reminders.remindBeforeMinutes} د`
              : 'بداية الشغل',
        });
      }
    }

    if (reminders.remindEndEnabled) {
      const endMins = parseTimeToMinutes(reminders.workEndTime);
      if (offset > 0 || endMins > nowMinutes) {
        candidateEvents.push({
          dayOffset: offset,
          minutes: endMins,
          label: 'نهاية الشغل وتسجيل اليوم',
        });
      }
    }

    for (const cr of reminders.customReminders) {
      if (!cr.enabled) continue;
      const cMins = parseTimeToMinutes(cr.time);
      if (offset > 0 || cMins > nowMinutes) {
        candidateEvents.push({
          dayOffset: offset,
          minutes: cMins,
          label: cr.label || 'تنبيه مخصص',
        });
      }
    }
  }

  if (candidateEvents.length === 0) return 'لا يوجد تنبيه مفعّل';

  candidateEvents.sort((a, b) =>
    a.dayOffset !== b.dayOffset ? a.dayOffset - b.dayOffset : a.minutes - b.minutes
  );

  const next = candidateEvents[0];
  const dayLabel =
    next.dayOffset === 0
      ? 'اليوم'
      : next.dayOffset === 1
      ? 'بكرة'
      : ARABIC_WEEKDAYS[(todayJsDay + next.dayOffset) % 7];

  return `التنبيه القادم: ${next.label} · ${dayLabel} الساعة ${formatTimeAr12h(
    minutesToHHMM(next.minutes)
  )}`;
}
