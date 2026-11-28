import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CalendarDays,
  Check,
  Lock,
  Moon,
  ReceiptText,
  Share2,
  SlidersHorizontal,
  Sun,
  Wallet,
  X,
} from 'lucide-react';
import {
  DayLogEntry,
  DayStatus,
  MonthlyCommitment,
  SalarySettings,
  SalaryTransaction,
  WorkSalaryState,
  createCleanInitialState,
  createDemoInitialState,
  createEmptyMonthRecord,
  getCurrentHHMM,
  getCurrentMonthKey,
  getDayEntryFromAllMonths,
  getJsDayFromIso,
  getPayrollPeriodDates,
  getTodayIso,
} from './types';
import {
  buildWhatsappPayslip,
  calculateShiftTimes,
  computeMonthlyPayroll,
} from './calculations';
import { DashboardView } from './DashboardView';
import { CalendarLogView } from './CalendarLogView';
import { TransactionsView } from './TransactionsView';
import { SettingsView } from './SettingsView';
import { DayEntryModal } from './DayEntryModal';
import { PinLockScreen } from './PinLockScreen';
import {
  ActiveReminderAlert,
  formatTimeAr12h,
  getNormalizedReminders,
  minutesToHHMM,
  parseTimeToMinutes,
  playReminderChime,
  sendBrowserNotification,
} from './reminderUtils';
import {
  GpsLiveState,
  captureCurrentPositionOffline,
  formatDistanceAr,
  getNormalizedWorkLocation,
  haversineDistanceMeters,
  translateGeolocationError,
} from './gpsUtils';

type TabKey = 'dashboard' | 'calendar' | 'transactions' | 'settings';

const STORAGE_KEY = 'my_work_salary_tracker_v1';
const THEME_KEY = 'my_work_salary_theme_v1';
const FIRED_REMINDERS_KEY = 'my_work_salary_fired_reminders_v1';
const GPS_AUTO_LOGGED_KEY = 'my_work_salary_gps_autolog_v1';
const PIN_STORAGE_KEY = 'my_work_salary_pin_v1';

interface MyWorkSalaryAppProps {
  onSwitchToShiftTracker?: () => void;
}

function loadInitialState(): WorkSalaryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WorkSalaryState;
      if (parsed && parsed.settings && parsed.months && Array.isArray(parsed.transactions)) {
        const currentMonth = getCurrentMonthKey();
        const activeMonthKey = parsed.activeMonthKey || currentMonth;
        if (!parsed.months[activeMonthKey]) {
          parsed.months[activeMonthKey] = createEmptyMonthRecord(activeMonthKey);
        }
        return {
          ...parsed,
          activeMonthKey,
          commitments: Array.isArray(parsed.commitments) ? parsed.commitments : [],
        };
      }
    }
  } catch {
    // fallback to demo state
  }
  return createDemoInitialState();
}

function loadSavedPin(): string | null {
  try {
    const raw = localStorage.getItem(PIN_STORAGE_KEY);
    if (raw && /^\d{4}$/.test(raw)) return raw;
  } catch {
    // ignore
  }
  return null;
}

export const MyWorkSalaryApp: React.FC<MyWorkSalaryAppProps> = ({
  onSwitchToShiftTracker,
}) => {
  const [state, setState] = useState<WorkSalaryState>(() => loadInitialState());
  const [pinCode, setPinCode] = useState<string | null>(() => loadSavedPin());
  const [isLocked, setIsLocked] = useState<boolean>(() => Boolean(loadSavedPin()));
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [editingDateIso, setEditingDateIso] = useState<string | null>(null);
  const [copiedPayslip, setCopiedPayslip] = useState(false);
  const [activeAlert, setActiveAlert] = useState<ActiveReminderAlert | null>(null);
  const [gpsState, setGpsState] = useState<GpsLiveState>({
    status: 'idle',
    distanceMeters: null,
    accuracyMeters: null,
    isInside: false,
    lastCheckedTime: null,
    errorMsg: null,
  });
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
    } catch {
      // ignore
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [isDark]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage quota errors
    }
  }, [state]);

  const triggerAlert = useCallback(
    (alert: ActiveReminderAlert, soundEnabled: boolean) => {
      setActiveAlert(alert);
      if (soundEnabled) {
        playReminderChime();
      }
      sendBrowserNotification(alert.title, alert.body);
    },
    []
  );

  // Live Work Schedule Reminder Checker (checks every 15s, deduplicated per day)
  useEffect(() => {
    const rem = getNormalizedReminders(state.settings.reminders);
    if (!rem.enabled) return;

    const checkNow = () => {
      const now = new Date();
      const todayIso = getTodayIso();
      const jsDay = now.getDay();
      if (!rem.activeDays.includes(jsDay)) return;

      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      let firedMap: Record<string, boolean> = {};
      try {
        const raw = localStorage.getItem(FIRED_REMINDERS_KEY);
        if (raw) firedMap = JSON.parse(raw) as Record<string, boolean>;
      } catch {
        firedMap = {};
      }

      const markFired = (key: string) => {
        firedMap[key] = true;
        // Keep only today's keys so storage never grows
        const pruned: Record<string, boolean> = {};
        for (const k of Object.keys(firedMap)) {
          if (k.startsWith(todayIso)) pruned[k] = true;
        }
        try {
          localStorage.setItem(FIRED_REMINDERS_KEY, JSON.stringify(pruned));
        } catch {
          // ignore
        }
      };

      if (rem.remindStartEnabled) {
        const startAlertMins =
          parseTimeToMinutes(rem.workStartTime) - Math.max(0, rem.remindBeforeMinutes || 0);
        const startAlertHHMM = minutesToHHMM(startAlertMins);
        const key = `${todayIso}_start_${startAlertHHMM}`;
        if (currentHHMM === startAlertHHMM && !firedMap[key]) {
          markFired(key);
          triggerAlert(
            {
              id: key,
              kind: 'start',
              timeLabel: formatTimeAr12h(rem.workStartTime),
              title:
                rem.remindBeforeMinutes > 0
                  ? `قرب ميعاد الشغل (بعد ${rem.remindBeforeMinutes} دقيقة)`
                  : 'حان ميعاد بداية العمل',
              body: `ميعاد شغلك الساعة ${formatTimeAr12h(rem.workStartTime)} — بالتوفيق في يومك!`,
            },
            rem.soundEnabled
          );
          return;
        }
      }

      if (rem.remindEndEnabled) {
        const key = `${todayIso}_end_${rem.workEndTime}`;
        if (currentHHMM === rem.workEndTime && !firedMap[key]) {
          markFired(key);
          triggerAlert(
            {
              id: key,
              kind: 'end',
              timeLabel: formatTimeAr12h(rem.workEndTime),
              title: 'انتهى وقت العمل — سجّل يومك الآن',
              body: `الساعة ${formatTimeAr12h(
                rem.workEndTime
              )} — ما تنساش تسجّل حضور النهاردة أو أي ساعات إضافي.`,
            },
            rem.soundEnabled
          );
          return;
        }
      }

      for (const cr of rem.customReminders) {
        if (!cr.enabled) continue;
        const key = `${todayIso}_custom_${cr.id}_${cr.time}`;
        if (currentHHMM === cr.time && !firedMap[key]) {
          markFired(key);
          triggerAlert(
            {
              id: key,
              kind: 'custom',
              timeLabel: formatTimeAr12h(cr.time),
              title: cr.label || 'تنبيه موعد عمل',
              body: `تذكير مجدول الساعة ${formatTimeAr12h(cr.time)}`,
            },
            rem.soundEnabled
          );
          return;
        }
      }
    };

    checkNow();
    const timer = window.setInterval(checkNow, 15000);
    return () => window.clearInterval(timer);
  }, [state.settings.reminders, triggerAlert]);

  const handleTestReminder = () => {
    const rem = getNormalizedReminders(state.settings.reminders);
    triggerAlert(
      {
        id: `test_${Date.now()}`,
        kind: 'test',
        timeLabel: formatTimeAr12h(rem.workStartTime),
        title: 'تجربة تنبيه مواعيد العمل',
        body: `مواعيدك المضبوطة: من ${formatTimeAr12h(rem.workStartTime)} إلى ${formatTimeAr12h(
          rem.workEndTime
        )}. المنبّه شغال تمام!`,
      },
      rem.soundEnabled
    );
  };

  // Evaluate an offline GPS reading against saved workplace geofence
  const evaluateGpsReading = useCallback(
    (lat: number, lng: number, accuracy: number) => {
      const loc = getNormalizedWorkLocation(state.settings.workLocation);
      if (loc.latitude === null || loc.longitude === null) return;

      const dist = haversineDistanceMeters(lat, lng, loc.latitude, loc.longitude);
      const isInside = dist <= loc.radiusMeters;
      const now = new Date();
      const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      const timeAr = formatTimeAr12h(nowHHMM);

      setGpsState({
        status: 'watching',
        distanceMeters: dist,
        accuracyMeters: Math.round(accuracy || 0),
        isInside,
        lastCheckedTime: timeAr,
        errorMsg: null,
      });

      if (!loc.enabled || !loc.autoLogOnArrive || !isInside) return;

      const todayIso = getTodayIso();
      const todayMonthKey = todayIso.slice(0, 7);

      let lastAutoLoggedDate = '';
      try {
        lastAutoLoggedDate = localStorage.getItem(GPS_AUTO_LOGGED_KEY) ?? '';
      } catch {
        // ignore
      }
      if (lastAutoLoggedDate === todayIso) return;

      // Only auto-log if today is not already logged manually
      setState((prev) => {
        const monthRec = prev.months[todayMonthKey] ?? createEmptyMonthRecord(todayMonthKey);
        if (monthRec.days[todayIso]) return prev;

        try {
          localStorage.setItem(GPS_AUTO_LOGGED_KEY, todayIso);
        } catch {
          // ignore
        }

        const arrivalNote = loc.recordArrivalTimeNote
          ? `وصول تلقائي بالـ GPS (${loc.placeName || 'العمل'}) الساعة ${timeAr}`
          : undefined;

        const rem = getNormalizedReminders(prev.settings.reminders);
        const expectedMins = parseTimeToMinutes(rem.workStartTime || '08:00');
        const arrivedMins = parseTimeToMinutes(nowHHMM);
        const diffLate = arrivedMins - expectedMins;
        const lateMinutes = diffLate > 0 && diffLate <= 240 ? diffLate : 0;

        window.setTimeout(() => {
          triggerAlert(
            {
              id: `gps_${todayIso}`,
              kind: 'start',
              timeLabel: timeAr,
              title: 'تم تسجيل حضورك تلقائياً بالـ GPS!',
              body: `وصلت ${loc.placeName || 'مقر العمل'} (${formatDistanceAr(
                dist
              )}) الساعة ${timeAr} واتسجل اليوم حضور عادي أوفلاين.`,
            },
            rem.soundEnabled
          );
        }, 0);

        return {
          ...prev,
          isDemoData: false,
          months: {
            ...prev.months,
            [todayMonthKey]: {
              ...monthRec,
              days: {
                ...monthRec.days,
                [todayIso]: {
                  dateIso: todayIso,
                  status: 'present',
                  shift: 'morning',
                  checkInTime: nowHHMM,
                  lateMinutes: lateMinutes > 0 ? lateMinutes : undefined,
                  overtimeHours: 0,
                  dailyBonus: 0,
                  dailyDeduction: 0,
                  note: arrivalNote,
                },
              },
            },
          },
        };
      });
    },
    [state.settings.workLocation, triggerAlert]
  );

  // Continuous offline GPS watcher while app is open & GPS check-in is enabled
  useEffect(() => {
    const loc = getNormalizedWorkLocation(state.settings.workLocation);
    if (!loc.enabled || loc.latitude === null || loc.longitude === null) {
      setGpsState((prev) =>
        prev.status === 'idle'
          ? prev
          : {
              status: 'idle',
              distanceMeters: null,
              accuracyMeters: null,
              isInside: false,
              lastCheckedTime: null,
              errorMsg: null,
            }
      );
      return;
    }

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGpsState((prev) => ({
        ...prev,
        status: 'error',
        errorMsg: 'المتصفح أو الجهاز لا يدعم الـ GPS.',
      }));
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        evaluateGpsReading(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      },
      (err) => {
        setGpsState((prev) => ({
          ...prev,
          status: 'error',
          errorMsg: translateGeolocationError(err),
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [state.settings.workLocation, evaluateGpsReading]);

  const handleCheckGpsNow = async () => {
    setGpsState((prev) => ({ ...prev, status: 'locating', errorMsg: null }));
    try {
      const pos = await captureCurrentPositionOffline();
      evaluateGpsReading(pos.latitude, pos.longitude, pos.accuracy);
    } catch (err) {
      setGpsState((prev) => ({
        ...prev,
        status: 'error',
        errorMsg: err instanceof Error ? err.message : 'تعذّر تحديد الموقع الحالي.',
      }));
    }
  };

  const activeMonth = useMemo(() => {
    return (
      state.months[state.activeMonthKey] ?? createEmptyMonthRecord(state.activeMonthKey)
    );
  }, [state.months, state.activeMonthKey]);

  const summary = useMemo(
    () =>
      computeMonthlyPayroll(
        state.settings,
        state.months,
        state.activeMonthKey,
        state.transactions
      ),
    [state.settings, state.months, state.activeMonthKey, state.transactions]
  );

  const handleChangeMonth = (monthKey: string) => {
    setState((prev) => ({
      ...prev,
      activeMonthKey: monthKey,
      months: prev.months[monthKey]
        ? prev.months
        : { ...prev.months, [monthKey]: createEmptyMonthRecord(monthKey) },
    }));
  };

  const handleSaveDay = (entry: DayLogEntry) => {
    const monthKey = entry.dateIso.slice(0, 7);
    setState((prev) => {
      const monthRec = prev.months[monthKey] ?? createEmptyMonthRecord(monthKey);
      return {
        ...prev,
        isDemoData: false,
        months: {
          ...prev.months,
          [monthKey]: {
            ...monthRec,
            days: {
              ...monthRec.days,
              [entry.dateIso]: entry,
            },
          },
        },
      };
    });
  };

  const handleDeleteDay = (dateIso: string) => {
    const monthKey = dateIso.slice(0, 7);
    setState((prev) => {
      const monthRec = prev.months[monthKey];
      if (!monthRec) return prev;
      const nextDays = { ...monthRec.days };
      delete nextDays[dateIso];
      return {
        ...prev,
        months: {
          ...prev.months,
          [monthKey]: {
            ...monthRec,
            days: nextDays,
          },
        },
      };
    });
  };

  const handleQuickLogToday = (status: DayStatus, overtimeHours = 0) => {
    const todayIso = getTodayIso();
    const existing = getDayEntryFromAllMonths(state.months, todayIso);
    handleSaveDay({
      dateIso: todayIso,
      status,
      leaveKind: status === 'paid_leave' ? existing?.leaveKind ?? 'annual' : undefined,
      shift: existing?.shift ?? 'morning',
      checkInTime: existing?.checkInTime,
      checkOutTime: existing?.checkOutTime,
      lateMinutes: existing?.lateMinutes,
      overtimeHours,
      dailyBonus: existing?.dailyBonus ?? 0,
      dailyDeduction: existing?.dailyDeduction ?? 0,
      note: existing?.note,
    });
  };

  const handlePunchTodayIn = () => {
    const todayIso = getTodayIso();
    const nowHHMM = getCurrentHHMM();
    const existing = getDayEntryFromAllMonths(state.months, todayIso);
    const rem = getNormalizedReminders(state.settings.reminders);
    const overtimeRule = state.settings.overtimeCalcRule ?? 'after_end_time';

    let overtimeHours = existing?.overtimeHours ?? 0;
    let workHours = existing?.workHours;
    let lateMinutes: number | undefined;

    if (existing?.checkOutTime) {
      const calc = calculateShiftTimes(
        nowHHMM,
        existing.checkOutTime,
        rem.workStartTime,
        state.settings.dailyWorkHours,
        rem.workEndTime,
        overtimeRule
      );
      overtimeHours = calc.overtimeHours;
      lateMinutes = calc.lateMinutes > 0 ? calc.lateMinutes : undefined;
      if (state.settings.salaryMode === 'hourly') workHours = calc.workedHours;
    } else {
      const diffLate = parseTimeToMinutes(nowHHMM) - parseTimeToMinutes(rem.workStartTime || '08:00');
      lateMinutes = diffLate > 0 && diffLate <= 240 ? diffLate : undefined;
    }

    handleSaveDay({
      dateIso: todayIso,
      status: existing?.status === 'extra_day' ? 'extra_day' : 'present',
      shift: existing?.shift ?? 'morning',
      checkInTime: nowHHMM,
      checkOutTime: existing?.checkOutTime,
      lateMinutes,
      workHours,
      overtimeHours,
      dailyBonus: existing?.dailyBonus ?? 0,
      dailyDeduction: existing?.dailyDeduction ?? 0,
      note: existing?.note,
    });
  };

  const handlePunchTodayOut = () => {
    const todayIso = getTodayIso();
    const nowHHMM = getCurrentHHMM();
    const existing = getDayEntryFromAllMonths(state.months, todayIso);
    const rem = getNormalizedReminders(state.settings.reminders);
    const inTime = existing?.checkInTime || rem.workStartTime || '08:00';
    const overtimeRule = state.settings.overtimeCalcRule ?? 'after_end_time';

    const calc = calculateShiftTimes(
      inTime,
      nowHHMM,
      rem.workStartTime,
      state.settings.dailyWorkHours,
      rem.workEndTime,
      overtimeRule
    );

    handleSaveDay({
      dateIso: todayIso,
      status: existing?.status === 'extra_day' ? 'extra_day' : 'present',
      shift: existing?.shift ?? 'morning',
      checkInTime: inTime,
      checkOutTime: nowHHMM,
      lateMinutes: calc.lateMinutes > 0 ? calc.lateMinutes : undefined,
      workHours: state.settings.salaryMode === 'hourly' ? calc.workedHours : existing?.workHours,
      overtimeHours: calc.overtimeHours,
      dailyBonus: existing?.dailyBonus ?? 0,
      dailyDeduction: existing?.dailyDeduction ?? 0,
      note: existing?.note,
    });
  };

  const handleSaveTodayShiftTimes = (checkInTime: string, checkOutTime: string) => {
    const todayIso = getTodayIso();
    const existing = getDayEntryFromAllMonths(state.months, todayIso);
    const rem = getNormalizedReminders(state.settings.reminders);
    const overtimeRule = state.settings.overtimeCalcRule ?? 'after_end_time';

    const calc = calculateShiftTimes(
      checkInTime,
      checkOutTime,
      rem.workStartTime,
      state.settings.dailyWorkHours,
      rem.workEndTime,
      overtimeRule
    );

    handleSaveDay({
      dateIso: todayIso,
      status: existing?.status === 'extra_day' ? 'extra_day' : 'present',
      shift: existing?.shift ?? 'morning',
      checkInTime,
      checkOutTime,
      lateMinutes: calc.lateMinutes > 0 ? calc.lateMinutes : undefined,
      workHours: state.settings.salaryMode === 'hourly' ? calc.workedHours : existing?.workHours,
      overtimeHours: calc.overtimeHours,
      dailyBonus: existing?.dailyBonus ?? 0,
      dailyDeduction: existing?.dailyDeduction ?? 0,
      note: existing?.note,
    });
  };

  const handleFillMonthPresent = () => {
    const monthKey = state.activeMonthKey;
    const allDates = getPayrollPeriodDates(monthKey, state.settings.cycleStartDay ?? 1);
    const offDay = state.settings.weeklyOffDay;

    setState((prev) => {
      const nextMonths = { ...prev.months };
      for (const dIso of allDates) {
        const mk = dIso.slice(0, 7);
        const rec = nextMonths[mk] ?? createEmptyMonthRecord(mk);
        if (rec.days[dIso]) continue;
        const jsDay = getJsDayFromIso(dIso);
        nextMonths[mk] = {
          ...rec,
          days: {
            ...rec.days,
            [dIso]: {
              dateIso: dIso,
              status: jsDay === offDay ? 'weekly_off' : 'present',
              shift: 'morning',
              overtimeHours: 0,
              dailyBonus: 0,
              dailyDeduction: 0,
            },
          },
        };
      }
      return {
        ...prev,
        isDemoData: false,
        months: nextMonths,
      };
    });
  };

  const handleClearMonthDays = () => {
    const monthKey = state.activeMonthKey;
    const allDates = getPayrollPeriodDates(monthKey, state.settings.cycleStartDay ?? 1);
    setState((prev) => {
      const nextMonths = { ...prev.months };
      for (const dIso of allDates) {
        const mk = dIso.slice(0, 7);
        const rec = nextMonths[mk];
        if (!rec || !rec.days[dIso]) continue;
        const nextDays = { ...rec.days };
        delete nextDays[dIso];
        nextMonths[mk] = { ...rec, days: nextDays };
      }
      return {
        ...prev,
        isDemoData: false,
        months: nextMonths,
      };
    });
  };

  const handleSetMonthInsurance = (amount: number | undefined) => {
    const monthKey = state.activeMonthKey;
    setState((prev) => {
      const monthRec = prev.months[monthKey] ?? createEmptyMonthRecord(monthKey);
      return {
        ...prev,
        isDemoData: false,
        months: {
          ...prev.months,
          [monthKey]: {
            ...monthRec,
            manualInsurance: amount,
          },
        },
      };
    });
  };

  const handleAddTransaction = (tx: Omit<SalaryTransaction, 'id'>) => {
    const newTx: SalaryTransaction = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    setState((prev) => ({
      ...prev,
      isDemoData: false,
      transactions: [newTx, ...prev.transactions],
    }));
  };

  const handleDeleteTransaction = (id: string) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
  };

  const handleUpdateSettings = (patch: Partial<SalarySettings>) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...patch,
      },
    }));
  };

  const handleClearDemoData = () => {
    setState(createCleanInitialState());
    setActiveTab('settings');
  };

  const handleAddCommitment = (title: string, amount: number) => {
    const item: MonthlyCommitment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title,
      amount,
      paidMonths: {},
    };
    setState((prev) => ({
      ...prev,
      isDemoData: false,
      commitments: [...(prev.commitments ?? []), item],
    }));
  };

  const handleToggleCommitmentPaid = (id: string) => {
    const mk = state.activeMonthKey;
    setState((prev) => ({
      ...prev,
      commitments: (prev.commitments ?? []).map((c) => {
        if (c.id !== id) return c;
        const paidMonths = { ...(c.paidMonths ?? {}) };
        paidMonths[mk] = !paidMonths[mk];
        return { ...c, paidMonths };
      }),
    }));
  };

  const handleDeleteCommitment = (id: string) => {
    setState((prev) => ({
      ...prev,
      commitments: (prev.commitments ?? []).filter((c) => c.id !== id),
    }));
  };

  const handleSetPin = (nextPin: string | null) => {
    setPinCode(nextPin);
    if (!nextPin) setIsLocked(false);
    try {
      if (nextPin) localStorage.setItem(PIN_STORAGE_KEY, nextPin);
      else localStorage.removeItem(PIN_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleImportState = (imported: WorkSalaryState) => {
    const activeMonthKey = imported.activeMonthKey || getCurrentMonthKey();
    setState({
      ...imported,
      isDemoData: false,
      activeMonthKey,
      commitments: Array.isArray(imported.commitments) ? imported.commitments : [],
      months: imported.months[activeMonthKey]
        ? imported.months
        : { ...imported.months, [activeMonthKey]: createEmptyMonthRecord(activeMonthKey) },
    });
  };

  const handleCopyWhatsappPayslip = async () => {
    const text = buildWhatsappPayslip(state.settings, summary);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPayslip(true);
      window.setTimeout(() => setCopiedPayslip(false), 2200);
    } catch {
      // ignore clipboard errors
    }
  };

  const navItems: Array<{ id: TabKey; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'الملخص', icon: <Wallet className="w-5 h-5" /> },
    { id: 'calendar', label: 'سجل الأيام', icon: <CalendarDays className="w-5 h-5" /> },
    { id: 'transactions', label: 'السُلف والميزانية', icon: <ReceiptText className="w-5 h-5" /> },
    { id: 'settings', label: 'إعدادات المرتب', icon: <SlidersHorizontal className="w-5 h-5" /> },
  ];

  const editingEntry = editingDateIso
    ? getDayEntryFromAllMonths(state.months, editingDateIso)
    : undefined;

  if (isLocked && pinCode) {
    return <PinLockScreen expectedPin={pinCode} onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col">
      {/* 3-Zone Top Bar Contract (Single Row, Clean Wordmark — 4 Nav Links — 1 Primary Action) */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 pt-safe">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-6">
          {/* Zone 1: Single-element brand wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            شغلي ومرتبي
          </button>

          {/* Zone 2: 4 clean single-line text navigation links (Desktop) */}
          <nav
            aria-label="التنقل الرئيسي"
            className="hidden md:flex items-center gap-7 text-sm font-semibold"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-2 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                    active
                      ? 'border-emerald-700 dark:border-emerald-400 text-emerald-700 dark:text-emerald-300'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single primary action button */}
          <button
            type="button"
            onClick={handleCopyWhatsappPayslip}
            className="min-h-[40px] px-3.5 sm:px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            {copiedPayslip ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            <span>{copiedPayslip ? 'اتنسخ الكشف!' : 'نسخ كشف المرتب'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7 pb-24 md:pb-10 space-y-5">
        {/* Live Reminder Alert Banner */}
        {activeAlert && (
          <div
            role="alert"
            className="rounded-2xl bg-emerald-700 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-md"
          >
            <div className="flex items-start gap-3 min-w-0">
              <BellRing className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-bold">{activeAlert.title}</div>
                <p className="text-xs sm:text-sm text-emerald-100 mt-0.5">{activeAlert.body}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  handleQuickLogToday('present', 0);
                  setActiveAlert(null);
                }}
                className="min-h-[40px] px-3.5 rounded-xl bg-white text-emerald-800 text-xs font-bold whitespace-nowrap hover:bg-emerald-50 transition-colors"
              >
                تسجيل حضور النهاردة
              </button>
              <button
                type="button"
                onClick={() => setActiveAlert(null)}
                aria-label="إغلاق التنبيه"
                className="w-10 h-10 rounded-xl bg-emerald-800/80 hover:bg-emerald-900 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            settings={state.settings}
            activeMonth={activeMonth}
            allMonths={state.months}
            transactions={state.transactions}
            commitments={state.commitments ?? []}
            summary={summary}
            gpsState={gpsState}
            isDemoData={state.isDemoData}
            onChangeMonth={handleChangeMonth}
            onQuickLogToday={handleQuickLogToday}
            onPunchTodayIn={handlePunchTodayIn}
            onPunchTodayOut={handlePunchTodayOut}
            onSaveTodayShiftTimes={handleSaveTodayShiftTimes}
            onOpenDayEditor={(dateIso) => setEditingDateIso(dateIso)}
            onSetMonthInsurance={handleSetMonthInsurance}
            onCheckGpsNow={handleCheckGpsNow}
            onNavigateTab={setActiveTab}
            onCopyWhatsappPayslip={handleCopyWhatsappPayslip}
            onClearDemoData={handleClearDemoData}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarLogView
            settings={state.settings}
            activeMonthKey={state.activeMonthKey}
            allMonths={state.months}
            summary={summary}
            onChangeMonth={handleChangeMonth}
            onOpenDayEditor={(dateIso) => setEditingDateIso(dateIso)}
            onFillMonthPresent={handleFillMonthPresent}
            onClearMonthDays={handleClearMonthDays}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            settings={state.settings}
            activeMonthKey={state.activeMonthKey}
            transactions={state.transactions}
            commitments={state.commitments ?? []}
            summary={summary}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onAddCommitment={handleAddCommitment}
            onToggleCommitmentPaid={handleToggleCommitmentPaid}
            onDeleteCommitment={handleDeleteCommitment}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={state.settings}
            fullState={state}
            gpsState={gpsState}
            pinCode={pinCode}
            onUpdateSettings={handleUpdateSettings}
            onSetPin={handleSetPin}
            onLockNow={() => setIsLocked(true)}
            onTestReminder={handleTestReminder}
            onCheckGpsNow={handleCheckGpsNow}
            onImportState={handleImportState}
            onResetAllData={() => setState(createCleanInitialState())}
          />
        )}
      </main>

      {/* Quiet Footer with Theme Toggle, Lock Button & Optional Workspace Switch */}
      <footer className="max-w-6xl w-full mx-auto px-4 sm:px-6 pb-24 md:pb-8 pt-2">
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>شغلي ومرتبي · حفظ تلقائي على الجهاز بدون إنترنت</span>
          <div className="flex flex-wrap items-center gap-2.5">
            {pinCode && (
              <button
                type="button"
                onClick={() => setIsLocked(true)}
                className="min-h-[36px] px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>قفل التطبيق</span>
              </button>
            )}
            {onSwitchToShiftTracker && (
              <button
                type="button"
                onClick={onSwitchToShiftTracker}
                className="min-h-[36px] px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 font-semibold whitespace-nowrap transition-colors"
              >
                فتح متابع خطوط الإنتاج
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsDark((d) => !d)}
              className="min-h-[36px] px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Navigation Bar (4 Touch Tabs, >=44px Hitboxes) */}
      <nav
        aria-label="شريط التنقل السفلي"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
      >
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors ${
                  active
                    ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 font-medium'
                }`}
              >
                {item.icon}
                <span className="text-[10px] leading-none whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Day Editor Modal / Bottom Sheet */}
      <DayEntryModal
        dateIso={editingDateIso}
        existingEntry={editingEntry}
        settings={state.settings}
        onSave={handleSaveDay}
        onDelete={handleDeleteDay}
        onClose={() => setEditingDateIso(null)}
      />
    </div>
  );
};
