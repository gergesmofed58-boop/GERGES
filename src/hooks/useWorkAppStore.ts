import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AdjustmentKind,
  AttendanceRecord,
  DayRecordStatus,
  LeaveCategory,
  LeaveQuotas,
  LeaveRecord,
  MonthlyAdjustment,
  SalaryConfig,
  ToastNotice,
  UserProfile,
  WorkShift,
} from '../types/workApp';
import {
  calculateCalendarDays,
  calculateDiffHours,
  calculatePayrollForMonth,
} from '../utils/payrollEngine';

// v3: يبدأ فاضي تمامًا من غير بيانات وهمية جاهزة داخل المربعات
const STORAGE_KEY = 'dawami_ratibi_mobile_app_v3';

export interface ActiveClockInState {
  date: string;
  shift: WorkShift;
  checkInTime: string;
  startedAtMs: number;
  targetHours: number;
}

export interface WorkAppState {
  profile: UserProfile;
  salaryConfig: SalaryConfig; // الإعداد الافتراضي للشهور الجديدة
  monthlyConfigs: Record<string, SalaryConfig>; // إعداد مستقل لكل شهر لوحده
  attendance: AttendanceRecord[];
  leaves: LeaveRecord[];
  leaveQuotas: LeaveQuotas;
  adjustments: MonthlyAdjustment[];
  activeClockIn: ActiveClockInState | null;
  theme: 'light' | 'dark';
}

export interface MonthlyArchiveRow {
  monthKey: string;
  workedDays: number;
  dayShiftCount: number;
  nightShiftCount: number;
  totalWorkedHours: number;
  totalOvertimeHours: number;
  totalAllWorkedHours: number;
  basicSalary: number;
  monthlyIncentive: number;
  totalShiftAllowance: number;
  netSalary: number;
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function getCurrentHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function buildEmptyState(): WorkAppState {
  const emptyConfig: SalaryConfig = {
    basicSalary: 0,
    monthlyIncentive: 0,
    incentiveDeduction: 0,
    includeIncentiveInDeductions: true,
    monthWorkDays: 0,
    dailyShiftHours: 0,
    dayShiftAllowance: 0,
    nightShiftAllowance: 0,
    fixedAllowances: 0,
    dayOvertimeMultiplier: 0,
    nightOvertimeMultiplier: 0,
    holidayMultiplier: 0,
    enableSocialInsurance: true,
    socialInsuranceRate: 11,
    insuredWageOverride: null,
    enableIncomeTax: true,
    enableMartyrsFund: true,
    paydayDay: 0,
  };

  return {
    profile: {
      name: '',
      jobTitle: '',
      companyName: '',
      department: '',
      employeeCode: '',
      phone: '',
      email: '',
      hireDate: '',
      defaultShift: 'day',
      avatarDataUrl: null,
    },
    salaryConfig: emptyConfig,
    monthlyConfigs: {},
    attendance: [],
    leaves: [],
    leaveQuotas: {
      annual: 0,
      casual: 0,
      sick: 0,
      compensatory: 0,
    },
    adjustments: [],
    activeClockIn: null,
    theme: 'light',
  };
}

function loadState(): WorkAppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WorkAppState>;
      const empty = buildEmptyState();
      const baseConfig = { ...empty.salaryConfig, ...(parsed.salaryConfig ?? {}) };
      const monthlyConfigs: Record<string, SalaryConfig> = {
        ...(parsed.monthlyConfigs ?? {}),
      };
      return {
        profile: { ...empty.profile, ...(parsed.profile ?? {}) },
        salaryConfig: baseConfig,
        monthlyConfigs,
        attendance: Array.isArray(parsed.attendance) ? parsed.attendance : [],
        leaves: Array.isArray(parsed.leaves) ? parsed.leaves : [],
        leaveQuotas: { ...empty.leaveQuotas, ...(parsed.leaveQuotas ?? {}) },
        adjustments: Array.isArray(parsed.adjustments) ? parsed.adjustments : [],
        activeClockIn: parsed.activeClockIn ?? null,
        theme: parsed.theme === 'dark' ? 'dark' : 'light',
      };
    }
  } catch {
    // Fallback to clean empty state
  }
  return buildEmptyState();
}

export function useWorkAppStore() {
  const [state, setState] = useState<WorkAppState>(() => loadState());
  const todayDate = useMemo(() => getTodayStr(), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => todayDate.slice(0, 7));
  const [toast, setToast] = useState<ToastNotice | null>(null);

  const showToast = useCallback(
    (text: string, tone: ToastNotice['tone'] = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToast({ id, text, tone });
    },
    []
  );

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => {
      setToast((curr) => (curr?.id === toast.id ? null : curr));
    }, 3600);
    return () => window.clearTimeout(t);
  }, [toast]);

  // حفظ فوري محلي على الجهاز (شغال أوفلاين من غير نت)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota error
    }
  }, [state]);

  // مزامنة تلقائية لو البرنامج كان مفتوح في أكتر من تاب أو رجع من الخلفية
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setState(loadState());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.theme]);

  const activeSalaryConfig: SalaryConfig = useMemo(() => {
    const custom = state.monthlyConfigs[selectedMonth];
    return custom ? { ...state.salaryConfig, ...custom } : state.salaryConfig;
  }, [state.monthlyConfigs, state.salaryConfig, selectedMonth]);

  const monthAttendance = useMemo(
    () =>
      state.attendance
        .filter((r) => r.monthKey === selectedMonth)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.attendance, selectedMonth]
  );

  const monthAdjustments = useMemo(
    () => state.adjustments.filter((a) => a.monthKey === selectedMonth),
    [state.adjustments, selectedMonth]
  );

  const payroll = useMemo(
    () =>
      calculatePayrollForMonth(
        activeSalaryConfig,
        monthAttendance,
        monthAdjustments
      ),
    [activeSalaryConfig, monthAttendance, monthAdjustments]
  );

  const availableMonths = useMemo(() => {
    const set = new Set<string>([todayDate.slice(0, 7), selectedMonth]);
    state.attendance.forEach((r) => set.add(r.monthKey));
    Object.keys(state.monthlyConfigs).forEach((m) => set.add(m));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [state.attendance, state.monthlyConfigs, todayDate, selectedMonth]);

  const monthlySummaries: MonthlyArchiveRow[] = useMemo(() => {
    return availableMonths.map((mKey) => {
      const cfg = state.monthlyConfigs[mKey]
        ? { ...state.salaryConfig, ...state.monthlyConfigs[mKey] }
        : state.salaryConfig;
      const att = state.attendance.filter((r) => r.monthKey === mKey);
      const adj = state.adjustments.filter((a) => a.monthKey === mKey);
      const p = calculatePayrollForMonth(cfg, att, adj);
      return {
        monthKey: mKey,
        workedDays: p.workedDays,
        dayShiftCount: p.dayShiftCount,
        nightShiftCount: p.nightShiftCount,
        totalWorkedHours: p.totalWorkedHours,
        totalOvertimeHours: p.dayOvertimeHours + p.nightOvertimeHours,
        totalAllWorkedHours: p.totalAllWorkedHours,
        basicSalary: p.basicSalary,
        monthlyIncentive: p.monthlyIncentive,
        totalShiftAllowance: p.totalShiftAllowance,
        netSalary: p.netSalary,
      };
    });
  }, [availableMonths, state.monthlyConfigs, state.salaryConfig, state.attendance, state.adjustments]);

  const clockIn = useCallback(
    (shift: WorkShift) => {
      const today = getTodayStr();
      const time = getCurrentHHMM();
      const mKey = today.slice(0, 7);
      const targetHours =
        (state.monthlyConfigs[mKey]?.dailyShiftHours ||
          state.salaryConfig.dailyShiftHours ||
          8);

      setState((prev) => ({
        ...prev,
        activeClockIn: {
          date: today,
          shift,
          checkInTime: time,
          startedAtMs: Date.now(),
          targetHours,
        },
      }));
      showToast(
        `بدأت ${shift === 'night' ? 'الوردية الليلية' : 'الوردية النهارية'} الساعة ${time} — العداد هيفضل شغال حتى لو قفلت البرنامج.`
      );
    },
    [showToast, state.monthlyConfigs, state.salaryConfig.dailyShiftHours]
  );

  const clockOut = useCallback(() => {
    setState((prev) => {
      if (!prev.activeClockIn) return prev;
      const outTime = getCurrentHHMM();
      const { date, shift, checkInTime, startedAtMs, targetHours } = prev.activeClockIn;
      const mKey = date.slice(0, 7);
      const monthCfg = prev.monthlyConfigs[mKey] ?? prev.salaryConfig;

      // نحسب الوقت الحقيقي من ساعة الموبايل عشان حتى لو قفل البرنامج وفتحه بعد ساعات يطلع مظبوط بالثانية
      const elapsedHrsRaw = Math.max(0, (Date.now() - startedAtMs) / (1000 * 60 * 60));
      const totalHrs =
        elapsedHrsRaw >= 0.1
          ? Math.max(0.25, Math.round(elapsedHrsRaw * 4) / 4)
          : calculateDiffHours(checkInTime, outTime, shift);

      const standardHrs = monthCfg.dailyShiftHours || targetHours || 8;
      const workedHours = Math.min(totalHrs, standardHrs);
      const overtimeHours =
        totalHrs > standardHrs
          ? Math.round((totalHrs - standardHrs) * 4) / 4
          : 0;

      const record: AttendanceRecord = {
        id: `att-${date}-${Date.now()}`,
        monthKey: mKey,
        date,
        shift,
        checkIn: checkInTime,
        checkOut: outTime,
        workedHours,
        overtimeHours,
        lateMinutes: 0,
        status: overtimeHours > 0 ? 'overtime' : 'present',
        notes:
          overtimeHours > 0
            ? `تسجيل مباشر (${shift === 'night' ? 'ليلية' : 'نهارية'}) + ${overtimeHours} س إضافي`
            : `تسجيل مباشر (${shift === 'night' ? 'وردية ليلية' : 'وردية نهارية'})`,
      };

      const filtered = prev.attendance.filter((r) => r.date !== date);
      return {
        ...prev,
        activeClockIn: null,
        attendance: [record, ...filtered].sort((a, b) =>
          b.date.localeCompare(a.date)
        ),
      };
    });
    showToast('اتقفل اليوم واتحفظت ساعاتك، وصافي مرتبك اتحدث لوحده أوفلاين.');
  }, [showToast]);

  const cancelActiveShift = useCallback(() => {
    setState((prev) => ({ ...prev, activeClockIn: null }));
    showToast('اتلغت الوردية الجارية.', 'info');
  }, [showToast]);

  const saveAttendanceRecord = useCallback(
    (payload: {
      id?: string;
      date: string;
      shift: WorkShift;
      checkIn: string;
      checkOut: string;
      workedHours?: number;
      overtimeHours: number;
      lateMinutes: number;
      status: DayRecordStatus;
      notes: string;
    }) => {
      const monthKey = payload.date.slice(0, 7);
      const isOff = payload.status === 'absent' || payload.status === 'leave';
      const standardHrs = activeSalaryConfig.dailyShiftHours || 8;
      const hasTimes = Boolean(payload.checkIn && payload.checkOut);
      const autoWorked = hasTimes
        ? Math.min(
            standardHrs,
            calculateDiffHours(payload.checkIn, payload.checkOut, payload.shift)
          )
        : 0;
      const finalWorked = isOff
        ? 0
        : typeof payload.workedHours === 'number' && !Number.isNaN(payload.workedHours)
        ? Math.max(0, Math.min(24, payload.workedHours))
        : autoWorked;

      const entry: AttendanceRecord = {
        id: payload.id ?? `att-${payload.date}-${Date.now()}`,
        monthKey,
        date: payload.date,
        shift: payload.shift,
        checkIn: isOff ? null : payload.checkIn || null,
        checkOut: isOff ? null : payload.checkOut || null,
        workedHours: finalWorked,
        overtimeHours: isOff ? 0 : Math.max(0, payload.overtimeHours),
        lateMinutes: isOff ? 0 : Math.max(0, payload.lateMinutes),
        status: payload.status,
        notes: payload.notes.trim(),
      };

      setState((prev) => {
        const rest = prev.attendance.filter(
          (r) => r.id !== entry.id && r.date !== entry.date
        );
        return {
          ...prev,
          attendance: [entry, ...rest].sort((a, b) => b.date.localeCompare(a.date)),
        };
      });
      setSelectedMonth(monthKey);
      showToast('اتحفظ يوم الشغل واتحدثت ساعات ومرتب الشهر لوحدهم.');
    },
    [showToast, activeSalaryConfig.dailyShiftHours]
  );

  const deleteAttendanceRecord = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        attendance: prev.attendance.filter((r) => r.id !== id),
      }));
      showToast('اتمسح اليوم من السجل.', 'info');
    },
    [showToast]
  );

  const updateSalaryConfig = useCallback(
    (patch: Partial<SalaryConfig>, options?: { applyAsDefault?: boolean; notifyMsg?: string }) => {
      setState((prev) => {
        const currentMonthCfg = prev.monthlyConfigs[selectedMonth]
          ? { ...prev.salaryConfig, ...prev.monthlyConfigs[selectedMonth] }
          : { ...prev.salaryConfig };
        const updatedMonthCfg: SalaryConfig = { ...currentMonthCfg, ...patch };
        return {
          ...prev,
          salaryConfig: options?.applyAsDefault
            ? { ...prev.salaryConfig, ...patch }
            : prev.salaryConfig,
          monthlyConfigs: {
            ...prev.monthlyConfigs,
            [selectedMonth]: updatedMonthCfg,
          },
        };
      });
      if (options?.notifyMsg) {
        showToast(options.notifyMsg);
      }
    },
    [selectedMonth, showToast]
  );

  const addAdjustment = useCallback(
    (title: string, amount: number, kind: AdjustmentKind) => {
      if (!title.trim() || amount <= 0) return;
      const entry: MonthlyAdjustment = {
        id: `adj-${Date.now()}`,
        monthKey: selectedMonth,
        title: title.trim(),
        amount: Math.round(amount),
        kind,
        createdAt: todayDate,
      };
      setState((prev) => ({
        ...prev,
        adjustments: [entry, ...prev.adjustments],
      }));
      showToast(
        kind === 'bonus'
          ? 'اتضافت المكافأة لحسبة مرتب الشهر ده.'
          : 'اتسجل الخصم أو السلفة في مرتب الشهر ده.'
      );
    },
    [selectedMonth, showToast, todayDate]
  );

  const deleteAdjustment = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        adjustments: prev.adjustments.filter((a) => a.id !== id),
      }));
      showToast('اتمسح البند من كشف المرتب.', 'info');
    },
    [showToast]
  );

  const addLeave = useCallback(
    (payload: {
      type: LeaveCategory;
      startDate: string;
      endDate: string;
      notes: string;
    }) => {
      const days = calculateCalendarDays(payload.startDate, payload.endDate);
      if (days <= 0) return;
      const newLeave: LeaveRecord = {
        id: `lv-${Date.now()}`,
        type: payload.type,
        startDate: payload.startDate,
        endDate: payload.endDate,
        days,
        notes: payload.notes.trim(),
        createdAt: todayDate,
      };
      setState((prev) => ({
        ...prev,
        leaves: [newLeave, ...prev.leaves],
      }));
      showToast(`اتحفظت الإجازة (${days} يوم) واتخصمت من رصيدك.`);
    },
    [showToast, todayDate]
  );

  const deleteLeave = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        leaves: prev.leaves.filter((l) => l.id !== id),
      }));
      showToast('اتمسحت الإجازة ورجعت أيامها لرصيدك.', 'info');
    },
    [showToast]
  );

  const updateLeaveQuotas = useCallback(
    (quotas: LeaveQuotas) => {
      setState((prev) => ({ ...prev, leaveQuotas: quotas }));
      showToast('اتحفظ رصيد إجازاتك السنوي.');
    },
    [showToast]
  );

  const updateProfile = useCallback(
    (patch: Partial<UserProfile>, silent = false) => {
      setState((prev) => ({
        ...prev,
        profile: { ...prev.profile, ...patch },
      }));
      if (!silent) {
        showToast('اتحفظت بياناتك الشخصية بنجاح.');
      }
    },
    [showToast]
  );

  const toggleTheme = useCallback(() => {
    setState((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  }, []);

  const exportBackupJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dawami_backup_${todayDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('اتحملت النسخة الاحتياطية على جهازك.');
  }, [showToast, state, todayDate]);

  const importBackupJson = useCallback(
    (rawJson: string) => {
      try {
        const parsed = JSON.parse(rawJson) as Partial<WorkAppState>;
        if (!parsed.profile || !parsed.salaryConfig) {
          showToast('الملف ده مش نسخة احتياطية سليمة.', 'warning');
          return;
        }
        const empty = buildEmptyState();
        setState({
          profile: { ...empty.profile, ...parsed.profile },
          salaryConfig: { ...empty.salaryConfig, ...parsed.salaryConfig },
          monthlyConfigs: parsed.monthlyConfigs ?? {},
          attendance: Array.isArray(parsed.attendance) ? parsed.attendance : [],
          leaves: Array.isArray(parsed.leaves) ? parsed.leaves : [],
          leaveQuotas: { ...empty.leaveQuotas, ...(parsed.leaveQuotas ?? {}) },
          adjustments: Array.isArray(parsed.adjustments) ? parsed.adjustments : [],
          activeClockIn: parsed.activeClockIn ?? null,
          theme: parsed.theme === 'dark' ? 'dark' : state.theme,
        });
        showToast('رجعت كل بياناتك من النسخة الاحتياطية.');
      } catch {
        showToast('ما قدرناش نقرا الملف — اختار ملف النسخة الاحتياطية الصح.', 'warning');
      }
    },
    [showToast, state.theme]
  );

  const resetAllData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(buildEmptyState());
    showToast('اتمسحت كل البيانات وبدأنا على نضافة.', 'info');
  }, [showToast]);

  return {
    profile: state.profile,
    salaryConfig: activeSalaryConfig,
    attendance: state.attendance,
    monthAttendance,
    leaves: state.leaves,
    leaveQuotas: state.leaveQuotas,
    monthAdjustments,
    activeClockIn: state.activeClockIn,
    theme: state.theme,
    todayDate,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
    monthlySummaries,
    payroll,
    toast,
    dismissToast: () => setToast(null),
    clockIn,
    clockOut,
    cancelActiveShift,
    saveAttendanceRecord,
    deleteAttendanceRecord,
    updateSalaryConfig,
    addAdjustment,
    deleteAdjustment,
    addLeave,
    deleteLeave,
    updateLeaveQuotas,
    updateProfile,
    toggleTheme,
    exportBackupJson,
    importBackupJson,
    resetAllData,
  };
}
