export type SalaryMode = 'monthly' | 'daily' | 'hourly';

export type DayStatus =
  | 'present'
  | 'half_day'
  | 'extra_day'
  | 'paid_leave'
  | 'absent'
  | 'weekly_off';

export type LeaveKind = 'annual' | 'casual' | 'sick';

export type ShiftPeriod = 'morning' | 'evening' | 'night';

export type TransactionType = 'advance' | 'bonus' | 'deduction';

export type InsuranceMode = 'fixed' | 'percent';

export type OvertimeCalcRule = 'after_end_time' | 'after_daily_hours';

export interface CustomReminder {
  id: string;
  time: string; // HH:MM
  label: string;
  enabled: boolean;
}

export interface WorkReminderSettings {
  enabled: boolean;
  workStartTime: string; // HH:MM
  workEndTime: string; // HH:MM
  remindBeforeMinutes: number;
  remindStartEnabled: boolean;
  remindEndEnabled: boolean;
  activeDays: number[]; // JS day numbers: 0=Sun..6=Sat
  soundEnabled: boolean;
  customReminders: CustomReminder[];
}

export interface WorkLocationSettings {
  enabled: boolean;
  placeName: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  autoLogOnArrive: boolean;
  recordArrivalTimeNote: boolean;
}

export interface SalarySettings {
  employeeName: string;
  jobTitle: string;
  currency: string;
  salaryMode: SalaryMode;
  baseAmount: number; // Monthly salary OR daily rate OR hourly rate
  workingDaysPerMonth: number; // Usually 26 or 30
  dailyWorkHours: number; // Usually 8
  cycleStartDay?: number; // 1 = standard month; e.g. 25 = from 25th prev month to 24th current month
  paydayDayOfMonth?: number; // 1..31 day of month when salary is paid
  annualLeaveQuota?: number; // e.g., 21 days/year
  casualLeaveQuota?: number; // e.g., 6 days/year
  overtimeCalcRule?: OvertimeCalcRule; // 'after_end_time' (after official workEndTime) or 'after_daily_hours'
  overtimeMultiplier: number; // e.g., 1.5x or 1.35x
  customOvertimeHourRate: number; // If > 0, overrides calculated rate * multiplier
  extraDayMultiplier: number; // e.g., 2x for working Friday/Holiday
  absencePenaltyMultiplier: number; // 1 = deduct 1 day, 2 = deduct 2 days
  weeklyOffDay: number; // 0=Sun ... 5=Fri, 6=Sat
  transportAllowance: number;
  mealAllowance: number;
  otherAllowance: number;
  insuranceMode?: InsuranceMode;
  socialInsurance: number; // Fixed manual monthly social insurance amount
  insurancePercent?: number; // Optional percentage of base salary (e.g., 11%)
  otherFixedDeduction: number;
  reminders?: WorkReminderSettings;
  workLocation?: WorkLocationSettings;
}

export interface DayLogEntry {
  dateIso: string; // YYYY-MM-DD
  status: DayStatus;
  shift: ShiftPeriod;
  leaveKind?: LeaveKind; // Used when status === 'paid_leave'
  checkInTime?: string; // HH:MM
  checkOutTime?: string; // HH:MM
  lateMinutes?: number;
  workHours?: number; // Relevant mainly for hourly mode
  overtimeHours: number;
  dailyBonus: number;
  dailyDeduction: number;
  note?: string;
}

export interface SalaryTransaction {
  id: string;
  dateIso: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  type: TransactionType;
  amount: number;
  title: string;
  note?: string;
}

export interface MonthlyCommitment {
  id: string;
  title: string;
  amount: number;
  paidMonths: Record<string, boolean>; // key: monthKey (YYYY-MM)
}

export interface MonthRecord {
  monthKey: string; // YYYY-MM
  days: Record<string, DayLogEntry>; // key: YYYY-MM-DD
  manualInsurance?: number; // Optional manual per-month social insurance override
  monthNote?: string;
}

export interface WorkSalaryState {
  schemaVersion: number;
  isDemoData: boolean;
  settings: SalarySettings;
  months: Record<string, MonthRecord>;
  transactions: SalaryTransaction[];
  commitments?: MonthlyCommitment[];
  activeMonthKey: string;
}

export const DAY_STATUS_META: Record<
  DayStatus,
  {
    label: string;
    shortLabel: string;
    bg: string;
    text: string;
    border: string;
    barBg: string;
  }
> = {
  present: {
    label: 'حضور عادي',
    shortLabel: 'حضور',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/70',
    barBg: 'bg-emerald-600',
  },
  half_day: {
    label: 'نص يوم',
    shortLabel: 'نص يوم',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/70',
    barBg: 'bg-amber-500',
  },
  extra_day: {
    label: 'يوم إضافي / عطلة',
    shortLabel: 'إضافي',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-800 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800/70',
    barBg: 'bg-indigo-600',
  },
  paid_leave: {
    label: 'إجازة مدفوعة',
    shortLabel: 'إجازة',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-800 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800/70',
    barBg: 'bg-sky-600',
  },
  absent: {
    label: 'غياب بدون أجر',
    shortLabel: 'غياب',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800/70',
    barBg: 'bg-rose-600',
  },
  weekly_off: {
    label: 'راحة أسبوعية',
    shortLabel: 'راحة',
    bg: 'bg-slate-100 dark:bg-slate-800/70',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
    barBg: 'bg-slate-400',
  },
};

export const LEAVE_KIND_LABELS: Record<LeaveKind, string> = {
  annual: 'سنوية',
  casual: 'عارضة',
  sick: 'مرضية',
};

export const SHIFT_PERIOD_LABELS: Record<ShiftPeriod, string> = {
  morning: 'صباحية',
  evening: 'مسائية',
  night: 'ليلية',
};

export const TRANSACTION_META: Record<
  TransactionType,
  { label: string; sign: '+' | '-'; text: string; bg: string; border: string }
> = {
  advance: {
    label: 'سلفة',
    sign: '-',
    text: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/35',
    border: 'border-amber-200 dark:border-amber-800/70',
  },
  bonus: {
    label: 'مكافأة / حافز',
    sign: '+',
    text: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/35',
    border: 'border-emerald-200 dark:border-emerald-800/70',
  },
  deduction: {
    label: 'خصم / جزاء',
    sign: '-',
    text: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-50 dark:bg-rose-950/35',
    border: 'border-rose-200 dark:border-rose-800/70',
  },
};

export const ARABIC_WEEKDAYS = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export const CALENDAR_HEADERS_SAT_FIRST = [
  { label: 'السبت', jsDay: 6 },
  { label: 'الأحد', jsDay: 0 },
  { label: 'الاثنين', jsDay: 1 },
  { label: 'الثلاثاء', jsDay: 2 },
  { label: 'الأربعاء', jsDay: 3 },
  { label: 'الخميس', jsDay: 4 },
  { label: 'الجمعة', jsDay: 5 },
];

export const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export const CURRENCY_OPTIONS = [
  { code: 'ج.م', label: 'جنيه مصري (ج.م)' },
  { code: 'ر.س', label: 'ريال سعودي (ر.س)' },
  { code: 'د.إ', label: 'درهم إماراتي (د.إ)' },
  { code: 'د.ك', label: 'دينار كويتي (د.ك)' },
  { code: 'د.أ', label: 'دينار أردني (د.أ)' },
  { code: '$', label: 'دولار ($)' },
];

export function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getTodayIso(): string {
  return toIsoDateLocal(new Date());
}

export function getCurrentHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonthKey(monthKey: string, deltaMonths: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + deltaMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabelAr(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const monthName = ARABIC_MONTHS[(m - 1) % 12] ?? '';
  return `${monthName} ${y}`;
}

export function formatDayDateAr(dateIso: string): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = ARABIC_WEEKDAYS[dt.getDay()] ?? '';
  const monthName = ARABIC_MONTHS[(m - 1) % 12] ?? '';
  return `${weekday} ${d} ${monthName}`;
}

export function formatShortDayMonthAr(dateIso: string): string {
  const [, m, d] = dateIso.split('-').map(Number);
  const monthName = ARABIC_MONTHS[(m - 1) % 12] ?? '';
  return `${d} ${monthName}`;
}

export function getDaysInMonth(monthKey: string): string[] {
  const [y, m] = monthKey.split('-').map(Number);
  const total = new Date(y, m, 0).getDate();
  const list: string[] = [];
  for (let d = 1; d <= total; d++) {
    list.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return list;
}

/**
 * Returns all YYYY-MM-DD dates belonging to the payroll cycle for monthKey.
 * If cycleStartDay === 1 -> normal calendar month (1st to end of month).
 * If cycleStartDay > 1 (e.g. 25) -> from 25th of previous month through 24th of monthKey.
 */
export function getPayrollPeriodDates(monthKey: string, cycleStartDay = 1): string[] {
  const startDay = Math.max(1, Math.min(28, Math.round(cycleStartDay || 1)));
  if (startDay === 1) {
    return getDaysInMonth(monthKey);
  }
  const [y, m] = monthKey.split('-').map(Number);
  const prevMonthDate = new Date(y, m - 2, startDay);
  const endDate = new Date(y, m - 1, startDay - 1);
  const list: string[] = [];
  const cursor = new Date(prevMonthDate.getTime());
  while (cursor <= endDate) {
    list.push(toIsoDateLocal(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return list;
}

export function formatPayrollPeriodLabelAr(monthKey: string, cycleStartDay = 1): string {
  const base = formatMonthLabelAr(monthKey);
  const startDay = Math.max(1, Math.min(28, Math.round(cycleStartDay || 1)));
  if (startDay === 1) return base;
  const dates = getPayrollPeriodDates(monthKey, startDay);
  if (dates.length === 0) return base;
  return `${base} (${formatShortDayMonthAr(dates[0])} – ${formatShortDayMonthAr(
    dates[dates.length - 1]
  )})`;
}

export function getDayEntryFromAllMonths(
  allMonths: Record<string, MonthRecord>,
  dateIso: string
): DayLogEntry | undefined {
  const mk = dateIso.slice(0, 7);
  return allMonths[mk]?.days[dateIso];
}

export function getJsDayFromIso(dateIso: string): number {
  const [y, m, d] = dateIso.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function createDefaultReminders(): WorkReminderSettings {
  return {
    enabled: true,
    workStartTime: '08:00',
    workEndTime: '16:00',
    remindBeforeMinutes: 30,
    remindStartEnabled: true,
    remindEndEnabled: true,
    activeDays: [6, 0, 1, 2, 3, 4], // Sat..Thu (Fri off)
    soundEnabled: true,
    customReminders: [],
  };
}

export function createDefaultWorkLocation(): WorkLocationSettings {
  return {
    enabled: false,
    placeName: 'مقر العمل',
    latitude: null,
    longitude: null,
    radiusMeters: 150,
    autoLogOnArrive: true,
    recordArrivalTimeNote: true,
  };
}

export function createDefaultSettings(): SalarySettings {
  return {
    employeeName: '',
    jobTitle: '',
    currency: 'ج.م',
    salaryMode: 'monthly',
    baseAmount: 6500,
    workingDaysPerMonth: 26,
    dailyWorkHours: 8,
    cycleStartDay: 1,
    paydayDayOfMonth: 1,
    annualLeaveQuota: 21,
    casualLeaveQuota: 6,
    overtimeMultiplier: 1.5,
    customOvertimeHourRate: 0,
    extraDayMultiplier: 2,
    absencePenaltyMultiplier: 1,
    weeklyOffDay: 5, // Friday
    transportAllowance: 500,
    mealAllowance: 300,
    otherAllowance: 0,
    insuranceMode: 'fixed',
    socialInsurance: 450,
    insurancePercent: 11,
    otherFixedDeduction: 0,
    reminders: createDefaultReminders(),
    workLocation: createDefaultWorkLocation(),
  };
}

export function createEmptyMonthRecord(monthKey: string): MonthRecord {
  return {
    monthKey,
    days: {},
    monthNote: '',
  };
}

export function createCleanInitialState(): WorkSalaryState {
  const activeMonthKey = getCurrentMonthKey();
  return {
    schemaVersion: 2,
    isDemoData: false,
    settings: {
      ...createDefaultSettings(),
      baseAmount: 0,
      transportAllowance: 0,
      mealAllowance: 0,
      socialInsurance: 0,
    },
    months: {
      [activeMonthKey]: createEmptyMonthRecord(activeMonthKey),
    },
    transactions: [],
    commitments: [],
    activeMonthKey,
  };
}

export function createDemoInitialState(): WorkSalaryState {
  const activeMonthKey = getCurrentMonthKey();
  const allDates = getDaysInMonth(activeMonthKey);
  const todayIso = getTodayIso();
  const todayDayNum = Math.min(allDates.length, Math.max(12, Number(todayIso.slice(8, 10)) || 15));

  const days: Record<string, DayLogEntry> = {};
  for (let i = 0; i < todayDayNum; i++) {
    const dateIso = allDates[i];
    const jsDay = getJsDayFromIso(dateIso);
    if (jsDay === 5) {
      if (i > 6 && i <= 14) {
        days[dateIso] = {
          dateIso,
          status: 'extra_day',
          shift: 'morning',
          checkInTime: '08:00',
          checkOutTime: '16:00',
          overtimeHours: 0,
          dailyBonus: 0,
          dailyDeduction: 0,
          note: 'شغل يوم الجمعة',
        };
      } else {
        days[dateIso] = {
          dateIso,
          status: 'weekly_off',
          shift: 'morning',
          overtimeHours: 0,
          dailyBonus: 0,
          dailyDeduction: 0,
        };
      }
    } else if (i === 5) {
      days[dateIso] = {
        dateIso,
        status: 'absent',
        shift: 'morning',
        overtimeHours: 0,
        dailyBonus: 0,
        dailyDeduction: 0,
        note: 'ظرف عائلي',
      };
    } else if (i === 8) {
      days[dateIso] = {
        dateIso,
        status: 'paid_leave',
        shift: 'morning',
        leaveKind: 'annual',
        overtimeHours: 0,
        dailyBonus: 0,
        dailyDeduction: 0,
        note: 'إجازة سنوية',
      };
    } else if (i === 9) {
      days[dateIso] = {
        dateIso,
        status: 'half_day',
        shift: 'morning',
        checkInTime: '08:00',
        checkOutTime: '12:00',
        overtimeHours: 0,
        dailyBonus: 0,
        dailyDeduction: 0,
        note: 'انصراف مبكر بإذن',
      };
    } else {
      const ot = i === 2 ? 2 : i === 7 ? 3 : i === 10 ? 2 : 0;
      days[dateIso] = {
        dateIso,
        status: 'present',
        shift: 'morning',
        checkInTime: '08:00',
        checkOutTime: ot > 0 ? `${String(16 + ot).padStart(2, '0')}:00` : '16:00',
        overtimeHours: ot,
        dailyBonus: 0,
        dailyDeduction: 0,
        note: ot > 0 ? 'ساعات إضافية لتسليم الشغل' : undefined,
      };
    }
  }

  const demoTransactions: SalaryTransaction[] = [
    {
      id: 'tx_demo_1',
      dateIso: allDates[Math.min(6, allDates.length - 1)],
      monthKey: activeMonthKey,
      type: 'advance',
      amount: 500,
      title: 'سلفة منتصف الشهر',
      note: 'سلفة نقدية',
    },
    {
      id: 'tx_demo_2',
      dateIso: allDates[Math.min(10, allDates.length - 1)],
      monthKey: activeMonthKey,
      type: 'bonus',
      amount: 350,
      title: 'حافز التزام وإنتاج',
    },
    {
      id: 'tx_demo_3',
      dateIso: allDates[Math.min(8, allDates.length - 1)],
      monthKey: activeMonthKey,
      type: 'deduction',
      amount: 100,
      title: 'خصم تأخير صباحي',
    },
  ];

  const demoCommitments: MonthlyCommitment[] = [
    {
      id: 'com_demo_1',
      title: 'إيجار الشقة',
      amount: 1800,
      paidMonths: {},
    },
    {
      id: 'com_demo_2',
      title: 'فواتير كهرباء ونت ومياه',
      amount: 650,
      paidMonths: {},
    },
    {
      id: 'com_demo_3',
      title: 'قسط / جمعية شهرية',
      amount: 1000,
      paidMonths: {},
    },
  ];

  return {
    schemaVersion: 2,
    isDemoData: true,
    settings: {
      ...createDefaultSettings(),
      employeeName: 'أحمد محمود',
      jobTitle: 'فني تشغيل',
    },
    months: {
      [activeMonthKey]: {
        monthKey: activeMonthKey,
        days,
        monthNote: '',
      },
    },
    transactions: demoTransactions,
    commitments: demoCommitments,
    activeMonthKey,
  };
}
