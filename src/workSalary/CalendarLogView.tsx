import React, { useMemo, useState } from 'react';
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  RotateCcw,
} from 'lucide-react';
import {
  ARABIC_MONTHS,
  CALENDAR_HEADERS_SAT_FIRST,
  DAY_STATUS_META,
  DayLogEntry,
  LEAVE_KIND_LABELS,
  MonthRecord,
  SHIFT_PERIOD_LABELS,
  SalarySettings,
  formatDayDateAr,
  formatPayrollPeriodLabelAr,
  getDayEntryFromAllMonths,
  getJsDayFromIso,
  getPayrollPeriodDates,
  getTodayIso,
  shiftMonthKey,
} from './types';
import { MonthlyPayrollSummary, formatCleanNum, formatMoney } from './calculations';
import { formatTimeAr12h } from './reminderUtils';

interface CalendarLogViewProps {
  settings: SalarySettings;
  activeMonthKey: string;
  allMonths: Record<string, MonthRecord>;
  summary: MonthlyPayrollSummary;
  onChangeMonth: (monthKey: string) => void;
  onOpenDayEditor: (dateIso: string) => void;
  onFillMonthPresent: () => void;
  onClearMonthDays: () => void;
}

export const CalendarLogView: React.FC<CalendarLogViewProps> = ({
  settings,
  activeMonthKey,
  allMonths,
  summary,
  onChangeMonth,
  onOpenDayEditor,
  onFillMonthPresent,
  onClearMonthDays,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);
  const todayIso = getTodayIso();
  const cycleStartDay = settings.cycleStartDay ?? 1;

  const periodDates = useMemo(
    () => getPayrollPeriodDates(activeMonthKey, cycleStartDay),
    [activeMonthKey, cycleStartDay]
  );

  const calendarCells = useMemo(() => {
    if (periodDates.length === 0) return [];
    const firstJsDay = getJsDayFromIso(periodDates[0]);
    const leadingEmptyCount = (firstJsDay + 1) % 7;
    const cells: Array<string | null> = [];
    for (let i = 0; i < leadingEmptyCount; i++) cells.push(null);
    for (const d of periodDates) cells.push(d);
    return cells;
  }, [periodDates]);

  const loggedEntries = useMemo(() => {
    const list: DayLogEntry[] = [];
    for (const d of periodDates) {
      const e = getDayEntryFromAllMonths(allMonths, d);
      if (e) list.push(e);
    }
    return list.reverse();
  }, [periodDates, allMonths]);

  const periodTitle = formatPayrollPeriodLabelAr(activeMonthKey, cycleStartDay);

  return (
    <div className="space-y-6">
      {/* Month Bar & Quick Bulk Helpers */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeMonth(shiftMonthKey(activeMonthKey, -1))}
              aria-label="الشهر السابق"
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="px-1">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                سجل أيام العمل — {periodTitle}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                حضور: {summary.presentDays} · إضافي: {formatCleanNum(summary.totalOvertimeHours)} س
                · غياب: {summary.absentDays} · صافي:{' '}
                {formatMoney(summary.netSalary, settings.currency)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChangeMonth(shiftMonthKey(activeMonthKey, 1))}
              aria-label="الشهر التالي"
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onFillMonthPresent}
              className="min-h-[40px] px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>تسجيل الفترة حضور تلقائي</span>
            </button>

            {confirmClear ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onClearMonthDays();
                    setConfirmClear(false);
                  }}
                  className="min-h-[40px] px-3 rounded-xl bg-rose-600 text-white text-xs font-bold whitespace-nowrap"
                >
                  تأكيد المسح
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  تراجع
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تصفير الفترة</span>
              </button>
            )}
          </div>
        </div>

        {/* Clean Unboxed Legend */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400">
          <span>اضغط على أي يوم في التقويم لتسجيل الحضور أو ساعات الدخول والخروج أو الغياب:</span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">حضور</span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-amber-700 dark:text-amber-400">نص يوم</span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-indigo-700 dark:text-indigo-400">يوم إضافي/عطلة</span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-sky-700 dark:text-sky-400">إجازة مدفوعة</span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-rose-600 dark:text-rose-400">غياب</span>
        </div>

        {/* 7-Column Interactive Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {CALENDAR_HEADERS_SAT_FIRST.map((h) => (
            <div
              key={h.label}
              className="text-center text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 py-1.5"
            >
              {h.label}
            </div>
          ))}

          {calendarCells.map((dateIso, idx) => {
            if (!dateIso) {
              return <div key={`empty-${idx}`} className="min-h-[64px] sm:min-h-[84px]" />;
            }
            const dayNum = Number(dateIso.slice(8, 10));
            const monthNum = Number(dateIso.slice(5, 7));
            const entry = getDayEntryFromAllMonths(allMonths, dateIso);
            const meta = entry ? DAY_STATUS_META[entry.status] : null;
            const isToday = dateIso === todayIso;
            const showMonthTag = cycleStartDay > 1 && (dayNum === 1 || dateIso === periodDates[0]);

            return (
              <button
                key={dateIso}
                type="button"
                onClick={() => onOpenDayEditor(dateIso)}
                className={`min-h-[64px] sm:min-h-[84px] p-1.5 sm:p-2 rounded-xl border text-center flex flex-col items-center justify-between transition-colors ${
                  meta
                    ? `${meta.bg} ${meta.border} ${meta.text} hover:brightness-95`
                    : 'bg-slate-50/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                } ${isToday ? 'ring-2 ring-emerald-600 dark:ring-emerald-400' : ''}`}
              >
                <div className="flex items-center justify-center gap-0.5 leading-none">
                  <span className="text-xs sm:text-sm font-mono font-bold tabular-nums">
                    {dayNum}
                  </span>
                  {showMonthTag && (
                    <span className="text-[9px] font-semibold opacity-75">
                      {ARABIC_MONTHS[(monthNum - 1) % 12]?.slice(0, 3)}
                    </span>
                  )}
                </div>

                <span className="text-[10px] sm:text-xs font-bold truncate max-w-full leading-tight">
                  {meta ? meta.shortLabel : '—'}
                </span>

                <span className="text-[9px] sm:text-[10px] font-mono font-bold tabular-nums leading-none min-h-[12px]">
                  {entry?.overtimeHours && entry.overtimeHours > 0
                    ? `+${formatCleanNum(entry.overtimeHours)}س`
                    : entry?.lateMinutes && entry.lateMinutes > 0
                    ? `تأخير ${entry.lateMinutes}د`
                    : entry?.dailyBonus
                    ? `+${formatCleanNum(entry.dailyBonus)}`
                    : entry?.dailyDeduction
                    ? `-${formatCleanNum(entry.dailyDeduction)}`
                    : ''}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Scrollable Detailed Daily Log */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            تفصيل الأيام المسجّلة ({loggedEntries.length} يوم)
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            اضغط على أي يوم للتعديل
          </span>
        </div>

        {loggedEntries.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            مفيش أيام مسجّلة في {periodTitle} لسه — اضغط على أي رقم في التقويم فوق أو استخدم «تسجيل
            الفترة حضور تلقائي».
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {loggedEntries.map((entry) => {
              const meta = DAY_STATUS_META[entry.status];
              return (
                <button
                  key={entry.dateIso}
                  type="button"
                  onClick={() => onOpenDayEditor(entry.dateIso)}
                  className="w-full px-4 sm:px-5 py-3.5 text-start flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {formatDayDateAr(entry.dateIso)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums">
                      <span className={`font-bold ${meta.text}`}>
                        {meta.label}
                        {entry.status === 'paid_leave' && entry.leaveKind
                          ? ` (${LEAVE_KIND_LABELS[entry.leaveKind]})`
                          : ''}
                      </span>
                      {(entry.status === 'present' ||
                        entry.status === 'half_day' ||
                        entry.status === 'extra_day') && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>وردية {SHIFT_PERIOD_LABELS[entry.shift]}</span>
                        </>
                      )}
                      {(entry.checkInTime || entry.checkOutTime) && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>
                            {entry.checkInTime ? formatTimeAr12h(entry.checkInTime) : '—'} –{' '}
                            {entry.checkOutTime ? formatTimeAr12h(entry.checkOutTime) : '—'}
                          </span>
                        </>
                      )}
                      {entry.lateMinutes && entry.lateMinutes > 0 ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-700 dark:text-amber-400 font-semibold">
                            تأخير {entry.lateMinutes} د
                          </span>
                        </>
                      ) : null}
                      {entry.note && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate max-w-[220px]">{entry.note}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-left shrink-0 tabular-nums space-y-0.5">
                    {entry.overtimeHours > 0 && (
                      <div className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        <span>+{formatCleanNum(entry.overtimeHours)} س إضافي</span>
                      </div>
                    )}
                    {entry.dailyBonus > 0 && (
                      <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        +{formatMoney(entry.dailyBonus, settings.currency)}
                      </div>
                    )}
                    {entry.dailyDeduction > 0 && (
                      <div className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                        -{formatMoney(entry.dailyDeduction, settings.currency)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
