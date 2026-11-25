export type DayKey = 'sat' | 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri';

export type LineCategory = 'production' | 'department' | 'absence';

export type LineColorKey =
  | 'teal'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'amber'
  | 'cyan'
  | 'orange'
  | 'rose'
  | 'slate'
  | 'emerald';

export interface WorkLine {
  id: string;
  name: string;
  shortName: string;
  category: LineCategory;
  color: LineColorKey;
  /** Default number of workers required to operate this line */
  requiredWorkers?: number;
  /** Only core absence statuses (absent/leave) are protected from deletion */
  isProtected?: boolean;
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  defaultLineId?: string;
  /** Fixed key operator on a specific line (excluded from fair rotation whenever this line is running) */
  fixedLineId?: string;
  active: boolean;
}

export type ShiftType = 'morning' | 'evening' | 'night';

export const SHIFT_LABELS: Record<ShiftType, string> = {
  morning: 'الوردية الصباحية',
  evening: 'الوردية المسائية',
  night: 'الوردية الليلية',
};

export interface AssignmentEntry {
  lineId: string;
  /** Optional second line when worker splits the day (0.5 + 0.5) */
  secondLineId?: string;
  /** Optional overtime hours worked that day */
  overtimeHours?: number;
  note?: string;
}

/** Map of workerId -> dayKey -> AssignmentEntry */
export type WeekAssignments = Record<string, Partial<Record<DayKey, AssignmentEntry>>>;

export interface WeekRecord {
  /** ISO date string of Saturday starting the week (YYYY-MM-DD) */
  weekStartIso: string;
  includeFriday: boolean;
  shiftType?: ShiftType;
  dayNotes?: Partial<Record<DayKey, string>>;
  assignments: WeekAssignments;
}

export interface TrackerState {
  workers: Worker[];
  lines: WorkLine[];
  weeks: Record<string, WeekRecord>;
  activeWeekIso: string;
  isDemoData: boolean;
  schemaVersion?: number;
}

export interface DayInfo {
  key: DayKey;
  label: string;
  shortLabel: string;
  offsetFromSat: number;
}

export const WEEK_DAYS: DayInfo[] = [
  { key: 'sat', label: 'السبت', shortLabel: 'سبت', offsetFromSat: 0 },
  { key: 'sun', label: 'الأحد', shortLabel: 'أحد', offsetFromSat: 1 },
  { key: 'mon', label: 'الإثنين', shortLabel: 'إثنين', offsetFromSat: 2 },
  { key: 'tue', label: 'الثلاثاء', shortLabel: 'ثلاثاء', offsetFromSat: 3 },
  { key: 'wed', label: 'الأربعاء', shortLabel: 'أربعاء', offsetFromSat: 4 },
  { key: 'thu', label: 'الخميس', shortLabel: 'خميس', offsetFromSat: 5 },
  { key: 'fri', label: 'الجمعة', shortLabel: 'جمعة', offsetFromSat: 6 },
];

export const DEFAULT_LINES: WorkLine[] = [
  {
    id: 'antinal',
    name: 'خط الانتينال',
    shortName: 'انتينال',
    category: 'production',
    color: 'teal',
    requiredWorkers: 18,
  },
  {
    id: 'apidone',
    name: 'خط الابيدون',
    shortName: 'ابيدون',
    category: 'production',
    color: 'blue',
    requiredWorkers: 20,
  },
  {
    id: 'enemax_pack',
    name: 'خط الانماكس تعبئة وتغليف',
    shortName: 'انماكس تعبئة',
    category: 'production',
    color: 'emerald',
    requiredWorkers: 24,
  },
  {
    id: 'tamper_enemax',
    name: 'تمبر الانماكس',
    shortName: 'تمبر انماكس',
    category: 'production',
    color: 'indigo',
    requiredWorkers: 8,
  },
  {
    id: 'bbc',
    name: 'خط بي بي سي',
    shortName: 'بي بي سي',
    category: 'production',
    color: 'cyan',
    requiredWorkers: 12,
  },
  {
    id: 'drops_line',
    name: 'خط النقط',
    shortName: 'النقط',
    category: 'production',
    color: 'orange',
    requiredWorkers: 5,
  },
  {
    id: 'printing',
    name: 'الطباعة',
    shortName: 'طباعة',
    category: 'production',
    color: 'violet',
    requiredWorkers: 4,
  },
  {
    id: 'manual_packing',
    name: 'التغليف اليدوي',
    shortName: 'تغليف يدوي',
    category: 'production',
    color: 'amber',
    requiredWorkers: 6,
  },
  {
    id: 'dept_tablets',
    name: 'قسم الأقراص',
    shortName: 'أقراص',
    category: 'department',
    color: 'cyan',
    requiredWorkers: 0,
  },
  {
    id: 'dept_effervescent',
    name: 'قسم الفوار',
    shortName: 'فوار',
    category: 'department',
    color: 'orange',
    requiredWorkers: 0,
  },
  {
    id: 'absent',
    name: 'غايب',
    shortName: 'غايب',
    category: 'absence',
    color: 'rose',
    isProtected: true,
  },
  {
    id: 'leave',
    name: 'إجازة',
    shortName: 'إجازة',
    category: 'absence',
    color: 'slate',
    isProtected: true,
  },
];

export const LINE_COLOR_STYLES: Record<
  LineColorKey,
  {
    cellBg: string;
    cellText: string;
    cellBorder: string;
    barBg: string;
    activeBtn: string;
  }
> = {
  teal: {
    cellBg: 'bg-teal-50 dark:bg-teal-950/40',
    cellText: 'text-teal-800 dark:text-teal-200',
    cellBorder: 'border-teal-200 dark:border-teal-800/70',
    barBg: 'bg-teal-600 dark:bg-teal-500',
    activeBtn: 'bg-teal-700 text-white border-teal-700',
  },
  blue: {
    cellBg: 'bg-blue-50 dark:bg-blue-950/40',
    cellText: 'text-blue-800 dark:text-blue-200',
    cellBorder: 'border-blue-200 dark:border-blue-800/70',
    barBg: 'bg-blue-600 dark:bg-blue-500',
    activeBtn: 'bg-blue-700 text-white border-blue-700',
  },
  indigo: {
    cellBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    cellText: 'text-indigo-800 dark:text-indigo-200',
    cellBorder: 'border-indigo-200 dark:border-indigo-800/70',
    barBg: 'bg-indigo-600 dark:bg-indigo-500',
    activeBtn: 'bg-indigo-700 text-white border-indigo-700',
  },
  violet: {
    cellBg: 'bg-violet-50 dark:bg-violet-950/40',
    cellText: 'text-violet-800 dark:text-violet-200',
    cellBorder: 'border-violet-200 dark:border-violet-800/70',
    barBg: 'bg-violet-600 dark:bg-violet-500',
    activeBtn: 'bg-violet-700 text-white border-violet-700',
  },
  amber: {
    cellBg: 'bg-amber-50 dark:bg-amber-950/40',
    cellText: 'text-amber-900 dark:text-amber-200',
    cellBorder: 'border-amber-200 dark:border-amber-800/70',
    barBg: 'bg-amber-600 dark:bg-amber-500',
    activeBtn: 'bg-amber-700 text-white border-amber-700',
  },
  cyan: {
    cellBg: 'bg-cyan-50 dark:bg-cyan-950/40',
    cellText: 'text-cyan-800 dark:text-cyan-200',
    cellBorder: 'border-cyan-200 dark:border-cyan-800/70',
    barBg: 'bg-cyan-600 dark:bg-cyan-500',
    activeBtn: 'bg-cyan-700 text-white border-cyan-700',
  },
  orange: {
    cellBg: 'bg-orange-50 dark:bg-orange-950/40',
    cellText: 'text-orange-800 dark:text-orange-200',
    cellBorder: 'border-orange-200 dark:border-orange-800/70',
    barBg: 'bg-orange-600 dark:bg-orange-500',
    activeBtn: 'bg-orange-700 text-white border-orange-700',
  },
  rose: {
    cellBg: 'bg-rose-50 dark:bg-rose-950/45',
    cellText: 'text-rose-800 dark:text-rose-200',
    cellBorder: 'border-rose-200 dark:border-rose-800/70',
    barBg: 'bg-rose-600 dark:bg-rose-500',
    activeBtn: 'bg-rose-700 text-white border-rose-700',
  },
  slate: {
    cellBg: 'bg-slate-100 dark:bg-slate-800/70',
    cellText: 'text-slate-700 dark:text-slate-300',
    cellBorder: 'border-slate-300 dark:border-slate-700',
    barBg: 'bg-slate-500 dark:bg-slate-400',
    activeBtn: 'bg-slate-700 text-white border-slate-700',
  },
  emerald: {
    cellBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    cellText: 'text-emerald-800 dark:text-emerald-200',
    cellBorder: 'border-emerald-200 dark:border-emerald-800/70',
    barBg: 'bg-emerald-600 dark:bg-emerald-500',
    activeBtn: 'bg-emerald-700 text-white border-emerald-700',
  },
};

const ARABIC_MONTHS = [
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

/** Returns YYYY-MM-DD in local time for the Saturday starting the week of `date`. */
export function getSaturdayIso(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffToSat = (d.getDay() + 1) % 7;
  d.setDate(d.getDate() - diffToSat);
  return formatIsoDate(d);
}

export function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function shiftIsoDays(iso: string, deltaDays: number): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + deltaDays);
  return formatIsoDate(d);
}

export function formatArabicShortDate(iso: string): string {
  const d = parseIsoDate(iso);
  return `${d.getDate()} ${ARABIC_MONTHS[d.getMonth()]}`;
}

export function formatWeekRangeAr(weekStartIso: string, includeFriday: boolean): string {
  const endOffset = includeFriday ? 6 : 5;
  const endIso = shiftIsoDays(weekStartIso, endOffset);
  const startDate = parseIsoDate(weekStartIso);
  const endDate = parseIsoDate(endIso);
  if (startDate.getMonth() === endDate.getMonth()) {
    return `${startDate.getDate()} – ${endDate.getDate()} ${ARABIC_MONTHS[endDate.getMonth()]} ${endDate.getFullYear()}`;
  }
  return `${startDate.getDate()} ${ARABIC_MONTHS[startDate.getMonth()]} – ${endDate.getDate()} ${ARABIC_MONTHS[endDate.getMonth()]} ${endDate.getFullYear()}`;
}

export function getTodayDayKey(): DayKey {
  const jsDay = new Date().getDay();
  const map: Record<number, DayKey> = {
    6: 'sat',
    0: 'sun',
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
  };
  return map[jsDay] ?? 'sat';
}

export function createEmptyWeek(
  weekStartIso: string,
  shiftType: ShiftType = 'morning'
): WeekRecord {
  return {
    weekStartIso,
    includeFriday: false,
    shiftType,
    dayNotes: {},
    assignments: {},
  };
}

const DEMO_40_NAMES: string[] = [
  'محمد أحمد',
  'محمود حسن',
  'كريم سعيد',
  'إسلام طارق',
  'يوسف عادل',
  'مصطفى سمير',
  'علاء فتحي',
  'أحمد رمضان',
  'حسام نبيل',
  'عمرو جمال',
  'وليد شوقي',
  'تامر صلاح',
  'خالد منصور',
  'رامي مجدي',
  'سعيد إبراهيم',
  'أشرف كامل',
  'هاني عاطف',
  'شريف فؤاد',
  'أيمن عبد الله',
  'باسم رشاد',
  'مينا جرجس',
  'بيشوي سامي',
  'جرجس مفيد',
  'ماركو عادل',
  'فادي نبيل',
  'نادر حمدي',
  'عمر فاروق',
  'زياد علاء',
  'إبراهيم صبري',
  'حسن محمود',
  'علي مصطفى',
  'سيد شعبان',
  'طه عبد الرحمن',
  'رضا سليمان',
  'ياسر حلمي',
  'ماجد رفعت',
  'سامح محسن',
  'أكرم يسري',
  'حاتم بدوي',
  'مروان خالد',
];

export function createBlank40Workers(): Worker[] {
  return Array.from({ length: 40 }, (_, i) => ({
    id: `w_${Date.now()}_${i + 1}`,
    name: `عامل ${i + 1}`,
    role: 'عامل إنتاج',
    defaultLineId: i < 18 ? 'antinal' : i < 38 ? 'apidone' : 'printing',
    active: true,
  }));
}

export function createInitialDemoState(): TrackerState {
  const currentSat = getSaturdayIso();
  const demoWorkers: Worker[] = DEMO_40_NAMES.map((name, i) => ({
    id: `w${i + 1}`,
    name,
    role: i % 8 === 0 ? 'مشغل خط' : i % 9 === 0 ? 'فني طباعة' : 'عامل إنتاج',
    defaultLineId:
      i < 18 ? 'antinal' : i < 38 ? 'apidone' : i === 38 ? 'printing' : 'manual_packing',
    active: true,
  }));

  // Realistic 40-worker schedule matching actual line capacities:
  // Sat: Antinal (18) + Apidone (20) + Printing (2) = 40
  // Sun: Enemax Pack (24) + Tamper Enemax (8) + BBC (6) + Absent (2) = 40
  // Mon: Antinal (18) + BBC (12) + Manual Packing (6) + Tablets (2) + Effervescent (1) + Absent (1) = 40
  const demoAssignments: WeekAssignments = {};
  demoWorkers.forEach((w, idx) => {
    const satLine = idx < 18 ? 'antinal' : idx < 38 ? 'apidone' : 'printing';

    let sunLine = 'enemax_pack';
    if (idx === 0) sunLine = 'manual_packing';
    else if (idx < 24) sunLine = 'enemax_pack';
    else if (idx < 32) sunLine = 'tamper_enemax';
    else if (idx < 38) sunLine = 'bbc';
    else sunLine = 'absent';

    let monLine = 'antinal';
    if (idx === 0) monLine = 'printing';
    else if (idx < 18) monLine = 'antinal';
    else if (idx < 30) monLine = 'bbc';
    else if (idx < 36) monLine = 'manual_packing';
    else if (idx < 38) monLine = 'dept_tablets';
    else if (idx === 38) monLine = 'dept_effervescent';
    else monLine = 'absent';

    demoAssignments[w.id] = {
      sat: { lineId: satLine },
      sun: { lineId: sunLine },
      mon: { lineId: monLine },
    };
  });

  return {
    workers: demoWorkers,
    lines: DEFAULT_LINES,
    weeks: {
      [currentSat]: {
        weekStartIso: currentSat,
        includeFriday: false,
        shiftType: 'morning',
        dayNotes: {},
        assignments: demoAssignments,
      },
    },
    activeWeekIso: currentSat,
    isDemoData: true,
    schemaVersion: 3,
  };
}
