export type DayKey = 'sat' | 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri';

export type LineCategory = 'production' | 'department' | 'absence';

export type LineEffortLevel = 'heavy' | 'light';

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
  /** 'heavy' = regular tiring production line, 'light' = rest/light station (e.g., manual packing) */
  effortLevel?: LineEffortLevel;
  /** Only core absence statuses (absent/leave) are protected from deletion */
  isProtected?: boolean;
}

export type ShiftGroupId = 'groupA' | 'groupB';

export const SHIFT_GROUP_LABELS: Record<ShiftGroupId, string> = {
  groupA: 'المجموعة الأولى',
  groupB: 'المجموعة الثانية',
};

export const NIGHT_SHIFT_LABEL = 'الوردية الليلية';

export interface Worker {
  id: string;
  name: string;
  role: string;
  /** Which alternating night-shift team this worker belongs to (40 workers per group) */
  groupId?: ShiftGroupId;
  defaultLineId?: string;
  /** Legacy single fixed line ID (kept for backwards compatibility with older saved data) */
  fixedLineId?: string;
  /** One or more production lines where this worker is a fixed key operator (outside fair rotation whenever any of these lines run) */
  fixedLineIds?: string[];
  active: boolean;
}

export function getWorkerGroupId(worker: Worker): ShiftGroupId {
  return worker.groupId === 'groupB' ? 'groupB' : 'groupA';
}

export function getWorkerFixedLineIds(worker: Worker): string[] {
  if (Array.isArray(worker.fixedLineIds)) {
    return worker.fixedLineIds;
  }
  return worker.fixedLineId ? [worker.fixedLineId] : [];
}

export function isLightRestLine(line: WorkLine | undefined): boolean {
  if (!line) return false;
  if (line.effortLevel) return line.effortLevel === 'light';
  return line.id === 'manual_packing';
}

export type ShiftType = 'night';

export const SHIFT_LABELS: Record<ShiftType, string> = {
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
  /** Which night-shift group is scheduled for this week (alternates week-by-week) */
  activeGroupId?: ShiftGroupId;
  dayNotes?: Partial<Record<DayKey, string>>;
  assignments: WeekAssignments;
}

export interface TrackerState {
  workers: Worker[];
  lines: WorkLine[];
  weeks: Record<string, WeekRecord>;
  activeWeekIso: string;
  activeGroupId?: ShiftGroupId;
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
    effortLevel: 'light',
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
  activeGroupId: ShiftGroupId = 'groupA'
): WeekRecord {
  return {
    weekStartIso,
    includeFriday: false,
    shiftType: 'night',
    activeGroupId,
    dayNotes: {},
    assignments: {},
  };
}

const DEMO_40_NAMES_GROUP_A: string[] = [
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

const DEMO_40_NAMES_GROUP_B: string[] = [
  'أحمد سليم',
  'طارق عبد العزيز',
  'مجدي فوزي',
  'عصام الدين علي',
  'وائل حامد',
  'أمير شحاتة',
  'جمال عبد الناصر',
  'محسن زكي',
  'صبري محمد',
  'ناصر إبراهيم',
  'شعبان رجب',
  'فتحي عبد الحميد',
  'خلف الله حسن',
  'محمود عبد الستار',
  'إيهاب مصطفى',
  'هيثم سعد',
  'رامز عزيز',
  'بولا وجيه',
  'أبانوب عاطف',
  'كيرلس ناجي',
  'جورج ماهر',
  'عماد رأفت',
  'عاطف صبحي',
  'سالم عيد',
  'رجب محمود',
  'عبد الله ياسين',
  'أدهم سامح',
  'سيف الدين طارق',
  'بلال حمدي',
  'حمزة خالد',
  'معاذ شريف',
  'أنس تامر',
  'يحيى هشام',
  'مالك وائل',
  'مازن عصام',
  'نور الدين علي',
  'عادل مختار',
  'سليمان فرج',
  'فرجاني سعد',
  'زكريا حمدان',
];

export function createBlank40Workers(groupId: ShiftGroupId = 'groupA'): Worker[] {
  const prefix = groupId === 'groupA' ? 'أ' : 'ب';
  const baseTs = Date.now();
  return Array.from({ length: 40 }, (_, i) => ({
    id: `w_${groupId}_${baseTs}_${i + 1}`,
    name: `عامل ${prefix} ${i + 1}`,
    role: 'عامل إنتاج',
    groupId,
    defaultLineId: i < 18 ? 'antinal' : i < 38 ? 'apidone' : 'printing',
    active: true,
  }));
}

export function createInitialDemoState(): TrackerState {
  const currentSat = getSaturdayIso();
  const demoWorkersA: Worker[] = DEMO_40_NAMES_GROUP_A.map((name, i) => ({
    id: `wA_${i + 1}`,
    name,
    role: i % 8 === 0 ? 'مشغل ماكينة' : i % 9 === 0 ? 'فني طباعة' : 'عامل إنتاج',
    groupId: 'groupA',
    defaultLineId:
      i < 18 ? 'antinal' : i < 38 ? 'apidone' : i === 38 ? 'printing' : 'manual_packing',
    active: true,
  }));

  const demoWorkersB: Worker[] = DEMO_40_NAMES_GROUP_B.map((name, i) => ({
    id: `wB_${i + 1}`,
    name,
    role: i % 8 === 0 ? 'مشغل ماكينة' : i % 9 === 0 ? 'فني طباعة' : 'عامل إنتاج',
    groupId: 'groupB',
    defaultLineId:
      i < 18 ? 'antinal' : i < 38 ? 'apidone' : i === 38 ? 'printing' : 'manual_packing',
    active: true,
  }));

  const demoAssignments: WeekAssignments = {};
  demoWorkersA.forEach((w, idx) => {
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
    workers: [...demoWorkersA, ...demoWorkersB],
    lines: DEFAULT_LINES,
    weeks: {
      [currentSat]: {
        weekStartIso: currentSat,
        includeFriday: false,
        shiftType: 'night',
        activeGroupId: 'groupA',
        dayNotes: {},
        assignments: demoAssignments,
      },
    },
    activeWeekIso: currentSat,
    activeGroupId: 'groupA',
    isDemoData: true,
    schemaVersion: 4,
  };
}
