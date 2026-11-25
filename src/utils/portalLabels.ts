import type {
  AttendanceStatus,
  LeaveStatus,
  LeaveType,
  NewsCategory,
  ShiftType,
} from '../types/portal';

export const SHIFT_LABELS: Record<ShiftType, string> = {
  morning: 'وردية أولى (صباحية)',
  evening: 'وردية ثانية (مسائية)',
  night: 'وردية ثالثة (ليلية)',
  admin: 'دوام إداري',
};

export const ATTENDANCE_STATUS_META: Record<
  AttendanceStatus,
  { label: string; textClass: string }
> = {
  present: {
    label: 'حضور منتظم',
    textClass: 'text-emerald-700 dark:text-emerald-400',
  },
  overtime: {
    label: 'حضور + إضافي',
    textClass: 'text-sky-700 dark:text-sky-400',
  },
  late: {
    label: 'تأخير',
    textClass: 'text-amber-700 dark:text-amber-400',
  },
  leave: {
    label: 'إجازة معتمدة',
    textClass: 'text-slate-600 dark:text-slate-400',
  },
  weekend: {
    label: 'راحة أسبوعية',
    textClass: 'text-slate-400 dark:text-slate-500',
  },
  mission: {
    label: 'مأمورية خارجية',
    textClass: 'text-teal-700 dark:text-teal-400',
  },
};

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: 'إجازة اعتيادية',
  casual: 'إجازة عارضة',
  sick: 'إجازة مرضية',
  compensatory: 'بدل راحة',
};

export const LEAVE_STATUS_META: Record<
  LeaveStatus,
  { label: string; textClass: string }
> = {
  pending: {
    label: 'قيد المراجعة',
    textClass: 'text-amber-700 dark:text-amber-400',
  },
  approved: {
    label: 'مقبولة',
    textClass: 'text-emerald-700 dark:text-emerald-400',
  },
  rejected: {
    label: 'مرفوضة',
    textClass: 'text-rose-700 dark:text-rose-400',
  },
  cancelled: {
    label: 'ملغاة',
    textClass: 'text-slate-500 dark:text-slate-400',
  },
};

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  announcements: 'تعميمات إدارية',
  hr: 'الموارد البشرية',
  events: 'فعاليات وأنشطة',
  production: 'إنجازات الإنتاج',
};

export const MONTH_OPTIONS: { key: string; label: string }[] = [
  { key: '2026-11', label: 'نوفمبر 2026' },
  { key: '2026-10', label: 'أكتوبر 2026' },
];
