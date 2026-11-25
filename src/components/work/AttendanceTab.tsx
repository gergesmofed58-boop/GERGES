import React, { useMemo, useState } from 'react';
import {
  Download,
  Moon,
  Pencil,
  Plus,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AttendanceRecord,
  ComputedPayroll,
  DayRecordStatus,
  WorkShift,
} from '../../types/workApp';
import {
  calculateDiffHours,
  formatArabicMonthLabel,
  formatEGP,
  getArabicWeekday,
  normalizeNumericInput,
  parseNumericString,
} from '../../utils/payrollEngine';
import { MonthBar } from './MonthBar';

interface AttendanceTabProps {
  records: AttendanceRecord[];
  payroll: ComputedPayroll;
  selectedMonth: string;
  todayDate: string;
  dailyShiftHours: number;
  onSelectMonth: (monthKey: string) => void;
  onSaveRecord: (payload: {
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
  }) => void;
  onDeleteRecord: (id: string) => void;
}

const STATUS_LABELS: Record<DayRecordStatus, { label: string; colorClass: string }> = {
  present: { label: 'حضور عادي', colorClass: 'text-emerald-700 dark:text-emerald-400' },
  overtime: { label: 'حضور + إضافي', colorClass: 'text-[#0F5C7E] dark:text-sky-400' },
  holiday: { label: 'شغل عيد / إجازة رسمية (×2)', colorClass: 'text-emerald-700 dark:text-emerald-400' },
  late: { label: 'تأخير', colorClass: 'text-amber-700 dark:text-amber-400' },
  leave: { label: 'إجازة', colorClass: 'text-slate-600 dark:text-slate-400' },
  absent: { label: 'غياب', colorClass: 'text-rose-700 dark:text-rose-400' },
};

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  records,
  payroll,
  selectedMonth,
  todayDate,
  dailyShiftHours,
  onSelectMonth,
  onSaveRecord,
  onDeleteRecord,
}) => {
  const [filter, setFilter] = useState<'all' | 'day' | 'night' | 'overtime' | 'holiday' | 'late'>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  // مربعات فاضية تمامًا من غير أرقام جاهزة مكتوبة جواها
  const [date, setDate] = useState(todayDate);
  const [shift, setShift] = useState<WorkShift>('day');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [workedHours, setWorkedHours] = useState('');
  const [overtimeHours, setOvertimeHours] = useState('');
  const [lateMinutes, setLateMinutes] = useState('');
  const [status, setStatus] = useState<DayRecordStatus>('present');
  const [notes, setNotes] = useState('');

  const effectiveDailyHours = dailyShiftHours > 0 ? dailyShiftHours : 8;

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filter === 'day') return r.shift === 'day';
      if (filter === 'night') return r.shift === 'night';
      if (filter === 'overtime') return r.overtimeHours > 0;
      if (filter === 'holiday') return r.status === 'holiday';
      if (filter === 'late') return r.lateMinutes > 0 || r.status === 'late';
      return true;
    });
  }, [records, filter]);

  const openAddSheet = () => {
    setEditingId(undefined);
    const defaultDate = todayDate.startsWith(selectedMonth)
      ? todayDate
      : `${selectedMonth}-01`;
    setDate(defaultDate);
    setShift('day');
    setCheckIn('');
    setCheckOut('');
    setWorkedHours('');
    setOvertimeHours('');
    setLateMinutes('');
    setStatus('present');
    setNotes('');
    setSheetOpen(true);
  };

  const openEditSheet = (rec: AttendanceRecord) => {
    setEditingId(rec.id);
    setDate(rec.date);
    setShift(rec.shift);
    setCheckIn(rec.checkIn ?? '');
    setCheckOut(rec.checkOut ?? '');
    setWorkedHours(rec.workedHours > 0 ? String(rec.workedHours) : '');
    setOvertimeHours(rec.overtimeHours > 0 ? String(rec.overtimeHours) : '');
    setLateMinutes(rec.lateMinutes > 0 ? String(rec.lateMinutes) : '');
    setStatus(rec.status);
    setNotes(rec.notes);
    setSheetOpen(true);
  };

  const syncHoursFromTimes = (inVal: string, outVal: string, shiftVal: WorkShift) => {
    if (!inVal || !outVal) return;
    const total = calculateDiffHours(inVal, outVal, shiftVal);
    if (total <= 0) return;
    const base = Math.min(effectiveDailyHours, total);
    const ot =
      total > effectiveDailyHours
        ? Math.round((total - effectiveDailyHours) * 4) / 4
        : 0;
    setWorkedHours(String(base));
    setOvertimeHours(ot > 0 ? String(ot) : '');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const wk = parseNumericString(workedHours);
    const ot = parseNumericString(overtimeHours);
    const late = parseNumericString(lateMinutes);
    const resolvedStatus: DayRecordStatus =
      status === 'present' && ot > 0
        ? 'overtime'
        : status === 'present' && late > 0
        ? 'late'
        : status;

    onSaveRecord({
      id: editingId,
      date,
      shift,
      checkIn,
      checkOut,
      workedHours: wk,
      overtimeHours: ot,
      lateMinutes: late,
      status: resolvedStatus,
      notes,
    });
    setSheetOpen(false);
  };

  const handleExportCsv = () => {
    const header = [
      'التاريخ',
      'اليوم',
      'الوردية',
      'الحضور',
      'الانصراف',
      'ساعات الشغل',
      'ساعات الإضافي',
      'التأخير (دقيقة)',
      'الحالة',
      'ملاحظات',
    ];
    const rows = records.map((r) => [
      r.date,
      getArabicWeekday(r.date),
      r.shift === 'night' ? 'ليلية' : 'نهارية',
      r.checkIn ?? '-',
      r.checkOut ?? '-',
      String(r.workedHours),
      String(r.overtimeHours),
      String(r.lateMinutes),
      STATUS_LABELS[r.status].label,
      r.notes.replace(/,/g, ' '),
    ]);
    const csv = '\uFEFF' + [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* العنوان والزراير */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            سجل الحضور والانصراف والورديات
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            سجّل أيام شغلك النهاري والليلي والإضافي، والبرنامج هيجمعلك ساعات كل شهر لوحده.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {records.length > 0 && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>نزّل جدول إكسل</span>
            </button>
          )}
          <button
            type="button"
            onClick={openAddSheet}
            className="min-h-[44px] px-4 rounded-xl bg-[#0F5C7E] hover:bg-[#0B4A66] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>سجّل يوم جديد</span>
          </button>
        </div>
      </div>

      {/* شريط اختيار الشهر */}
      <MonthBar
        selectedMonth={selectedMonth}
        onSelectMonth={onSelectMonth}
        totalHoursLabel={`مجموع ساعات ${formatArabicMonthLabel(selectedMonth)}: ${payroll.totalAllWorkedHours.toFixed(1)} ساعة (${payroll.workedDays} يوم)`}
      />

      {/* ملخص الشهر */}
      <section className="grid grid-cols-2 lg:grid-cols-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-100 dark:divide-slate-800">
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            مجموع ساعات الشغل الشهر ده
          </div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-[#0F5C7E] dark:text-sky-400">
            {payroll.totalAllWorkedHours.toFixed(1)}{' '}
            <span className="text-xs font-sans font-normal text-slate-500">
              ساعة ({payroll.totalWorkedHours.toFixed(1)} أساسي +{' '}
              {(payroll.dayOvertimeHours + payroll.nightOvertimeHours).toFixed(1)} إضافي)
            </span>
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">ورديات نهارية</div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400">
            {payroll.dayShiftCount}{' '}
            <span className="text-xs font-sans font-normal text-slate-500">
              · بدل {formatEGP(payroll.dayShiftAllowanceTotal)} ج
            </span>
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">ورديات ليلية</div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-indigo-700 dark:text-indigo-400">
            {payroll.nightShiftCount}{' '}
            <span className="text-xs font-sans font-normal text-slate-500">
              · بدل {formatEGP(payroll.nightShiftAllowanceTotal)} ج
            </span>
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">التأخير والغياب</div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-rose-700 dark:text-rose-400">
            {payroll.totalLateMinutes} د{' '}
            <span className="text-xs font-sans font-normal text-slate-500">
              · {payroll.absentDays} غياب
            </span>
          </div>
        </div>
      </section>

      {/* فلتر الورديات */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 overflow-x-auto max-w-full">
          {(
            [
              { id: 'all', label: 'الكل' },
              { id: 'day', label: 'نهاري' },
              { id: 'night', label: 'ليلي' },
              { id: 'overtime', label: 'إضافي' },
              { id: 'holiday', label: 'أعياد ×2' },
              { id: 'late', label: 'تأخير' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`min-h-[38px] px-3.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-[#0F5C7E] dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* قائمة الأيام */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 px-6 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              مفيش أيام متسجلة في الشهر ده لسه.
            </p>
            <button
              type="button"
              onClick={openAddSheet}
              className="min-h-[44px] px-5 rounded-xl bg-[#0F5C7E] text-white text-xs font-bold cursor-pointer"
            >
              سجّل أول يوم شغل
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filtered.map((rec) => {
              const meta = STATUS_LABELS[rec.status];
              const dayOtValue =
                rec.overtimeHours *
                (rec.shift === 'night'
                  ? payroll.nightOvertimeRate
                  : payroll.dayOvertimeRate);

              return (
                <div
                  key={rec.id}
                  className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        rec.shift === 'night'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                          : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {rec.shift === 'night' ? (
                        <Moon className="w-4 h-4" />
                      ) : (
                        <Sun className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                        <span>{getArabicWeekday(rec.date)}</span>
                        <span className="font-mono tabular-nums text-xs font-medium text-slate-500">
                          {rec.date}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className={`text-xs font-semibold ${meta.colorClass}`}>
                          {meta.label}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                        <span>{rec.shift === 'night' ? 'وردية ليلية' : 'وردية نهارية'}</span>
                        {rec.checkIn && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              حضور {rec.checkIn} / انصراف {rec.checkOut ?? '—'}
                            </span>
                          </>
                        )}
                        {rec.workedHours > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{rec.workedHours} ساعة</span>
                          </>
                        )}
                      </div>

                      {rec.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate max-w-md">
                          {rec.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="text-right sm:text-left">
                      {rec.status === 'holiday' && (
                        <div className="text-xs font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                          عيد ×2 (
                          {formatEGP(
                            Math.round(
                              (rec.workedHours > 0 ? rec.workedHours : effectiveDailyHours) *
                                payroll.holidayHourlyRate
                            )
                          )}{' '}
                          ج)
                        </div>
                      )}
                      {rec.overtimeHours > 0 && (
                        <div className="text-xs font-bold font-mono tabular-nums text-[#0F5C7E] dark:text-sky-400">
                          +{rec.overtimeHours} س ({formatEGP(Math.round(dayOtValue))} ج)
                        </div>
                      )}
                      {rec.lateMinutes > 0 && (
                        <div className="text-xs font-semibold font-mono tabular-nums text-amber-700 dark:text-amber-400">
                          تأخير {rec.lateMinutes} دقيقة
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditSheet(rec)}
                        className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        aria-label="تعديل اليوم"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteRecord(rec.id)}
                        className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-400 cursor-pointer"
                        aria-label="مسح اليوم"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* شاشة تسجيل / تعديل يوم الشغل (كل المربعات فاضية وسهلة الكتابة) */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sm:hidden w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingId ? 'تعديل يوم الشغل' : 'سجّل يوم شغل جديد'}
              </h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="min-w-[44px] min-h-[44px] -ml-2 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="قفل"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  نوع الوردية
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShift('day')}
                    className={`min-h-[46px] rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                      shift === 'day'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    <span>وردية نهارية</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShift('night')}
                    className={`min-h-[46px] rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                      shift === 'night'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span>وردية ليلية</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    التاريخ
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    حالة اليوم
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as DayRecordStatus)}
                    className="w-full min-h-[44px] px-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                  >
                    <option value="present">حضور عادي</option>
                    <option value="overtime">حضور + إضافي</option>
                    <option value="holiday">شغل في عيد / إجازة رسمية (×2)</option>
                    <option value="late">تأخير</option>
                    <option value="leave">إجازة</option>
                    <option value="absent">غياب (بيتخصم من المرتب)</option>
                  </select>
                </div>
              </div>

              {status !== 'leave' && status !== 'absent' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        وقت الحضور (اختياري)
                      </label>
                      <input
                        type="time"
                        value={checkIn}
                        onChange={(e) => {
                          setCheckIn(e.target.value);
                          syncHoursFromTimes(e.target.value, checkOut, shift);
                        }}
                        className="w-full min-h-[44px] px-3 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        وقت الانصراف (اختياري)
                      </label>
                      <input
                        type="time"
                        value={checkOut}
                        onChange={(e) => {
                          setCheckOut(e.target.value);
                          syncHoursFromTimes(checkIn, e.target.value, shift);
                        }}
                        className="w-full min-h-[44px] px-3 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        ساعات الشغل
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={workedHours}
                        onChange={(e) => setWorkedHours(normalizeNumericInput(e.target.value))}
                        placeholder="مثال: 8"
                        className="w-full min-h-[44px] px-3 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        ساعات الإضافي
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={overtimeHours}
                        onChange={(e) => setOvertimeHours(normalizeNumericInput(e.target.value))}
                        placeholder="مثال: 2"
                        className="w-full min-h-[44px] px-3 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        تأخير (دقيقة)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={lateMinutes}
                        onChange={(e) => setLateMinutes(normalizeNumericInput(e.target.value))}
                        placeholder="مثال: 15"
                        className="w-full min-h-[44px] px-3 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  ملاحظات (اختياري)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="اكتب أي ملاحظة لليوم ده..."
                  className="w-full min-h-[44px] px-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 min-h-[48px] rounded-xl bg-[#0F5C7E] hover:bg-[#0B4A66] text-white text-sm font-bold cursor-pointer"
                >
                  احفظ اليوم
                </button>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="min-h-[48px] px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
