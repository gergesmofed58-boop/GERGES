import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Check,
  Copy,
  Download,
  LayoutGrid,
  Printer,
  Search,
  Share2,
  Table2,
} from 'lucide-react';
import {
  LINE_COLOR_STYLES,
  NIGHT_SHIFT_LABEL,
  WeekRecord,
  WorkLine,
  Worker,
  formatWeekRangeAr,
} from './types';
import {
  WorkerSummary,
  buildWeeklyWhatsappReport,
  buildWorkerWhatsappText,
  computeCumulativeWorkerSummaries,
  computeWeekWorkerSummaries,
  exportWeeklyCsv,
  formatDaysArabic,
  formatNumClean,
} from './calculations';

interface SummaryReportsViewProps {
  workers: Worker[];
  lines: WorkLine[];
  activeWeek: WeekRecord;
  allWeeks: Record<string, WeekRecord>;
  groupLabel: string;
  selectedWorkerId: string | null;
  onSelectWorker: (workerId: string | null) => void;
}

export const SummaryReportsView: React.FC<SummaryReportsViewProps> = ({
  workers,
  lines,
  activeWeek,
  allWeeks,
  groupLabel,
  selectedWorkerId,
  onSelectWorker,
}) => {
  const [scope, setScope] = useState<'week' | 'all'>('week');
  const [search, setSearch] = useState('');
  const [mobileLayout, setMobileLayout] = useState<'cards' | 'table'>('cards');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const weekCount = Object.keys(allWeeks).length;
  const periodLabel =
    scope === 'week'
      ? formatWeekRangeAr(activeWeek.weekStartIso, activeWeek.includeFriday)
      : `تراكمي (${weekCount} ${weekCount === 1 ? 'أسبوع' : 'أسابيع'} مسجّلة)`;

  const summaries: WorkerSummary[] = useMemo(() => {
    if (scope === 'week') {
      return computeWeekWorkerSummaries(workers, lines, activeWeek);
    }
    return computeCumulativeWorkerSummaries(workers, lines, allWeeks);
  }, [scope, workers, lines, activeWeek, allWeeks]);

  const filteredSummaries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return summaries;
    return summaries.filter(
      (s) =>
        s.worker.name.toLowerCase().includes(q) ||
        s.worker.role.toLowerCase().includes(q)
    );
  }, [summaries, search]);

  const totalsByLine = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const l of lines) {
      totals[l.id] =
        Math.round(
          summaries.reduce((acc, s) => acc + (s.countsByLine[l.id] ?? 0), 0) * 10
        ) / 10;
    }
    return totals;
  }, [lines, summaries]);

  const maxLineTotal = useMemo(
    () => Math.max(1, ...Object.values(totalsByLine)),
    [totalsByLine]
  );

  const totalWorkedAll = useMemo(
    () => Math.round(summaries.reduce((acc, s) => acc + s.totalWorkedDays, 0) * 10) / 10,
    [summaries]
  );
  const totalAbsentAll = useMemo(
    () => Math.round(summaries.reduce((acc, s) => acc + s.absentDays, 0) * 10) / 10,
    [summaries]
  );
  const totalOvertimeAll = useMemo(
    () => Math.round(summaries.reduce((acc, s) => acc + s.totalOvertimeHours, 0) * 10) / 10,
    [summaries]
  );

  const rotationAlerts = useMemo(
    () =>
      scope === 'week'
        ? summaries.filter((s) => s.maxConsecutiveSameLine !== null)
        : [],
    [scope, summaries]
  );

  const activeWorkerSummary = useMemo(
    () => summaries.find((s) => s.worker.id === selectedWorkerId) ?? null,
    [summaries, selectedWorkerId]
  );

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Export Bar */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              ملخص حساب الأيام لكل فرد
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              {NIGHT_SHIFT_LABEL} · {groupLabel} · {periodLabel} · إجمالي الشغل:{' '}
              {formatNumClean(totalWorkedAll)} يوم/فرد · الغياب:{' '}
              {formatNumClean(totalAbsentAll)} يوم
              {totalOvertimeAll > 0 ? ` · إضافي: ${formatNumClean(totalOvertimeAll)} ساعة` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Scope Toggle */}
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setScope('week')}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  scope === 'week'
                    ? 'bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                الأسبوع الحالي
              </button>
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  scope === 'all'
                    ? 'bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                كل الأسابيع ({weekCount})
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                copyText(
                  'weekly-all',
                  buildWeeklyWhatsappReport(summaries, lines, activeWeek, groupLabel)
                )
              }
              className="min-h-[38px] px-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              {copiedKey === 'weekly-all' ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span>
                {copiedKey === 'weekly-all' ? 'اتنسخ للواتساب!' : 'نسخ التقرير للواتساب'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => exportWeeklyCsv(summaries, lines, periodLabel, groupLabel)}
              className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              <span>تصدير Excel</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hidden sm:flex items-center gap-1.5 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>طباعة</span>
            </button>
          </div>
        </div>
      </section>

      {/* Selected Worker Detail Card */}
      {activeWorkerSummary && (
        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-800 p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                تفاصيل عمل: {activeWorkerSummary.worker.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {activeWorkerSummary.worker.role} · شغل:{' '}
                {formatDaysArabic(activeWorkerSummary.totalWorkedDays)} · غياب:{' '}
                {formatDaysArabic(activeWorkerSummary.absentDays)}
                {activeWorkerSummary.totalOvertimeHours > 0
                  ? ` · إضافي: +${formatNumClean(activeWorkerSummary.totalOvertimeHours)} س`
                  : ''}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  copyText(
                    `worker-${activeWorkerSummary.worker.id}`,
                    buildWorkerWhatsappText(activeWorkerSummary, lines, periodLabel, groupLabel)
                  )
                }
                className="min-h-[36px] px-3 rounded-xl bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5"
              >
                {copiedKey === `worker-${activeWorkerSummary.worker.id}` ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>
                  {copiedKey === `worker-${activeWorkerSummary.worker.id}`
                    ? 'اتنسخ!'
                    : 'نسخ تقرير العامل'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectWorker(null)}
                className="min-h-[36px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                إغلاق
              </button>
            </div>
          </div>

          {/* Exact Line Counts for this Worker */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {lines
              .filter((l) => (activeWorkerSummary.countsByLine[l.id] ?? 0) > 0)
              .map((line) => {
                const count = activeWorkerSummary.countsByLine[line.id] ?? 0;
                const styles = LINE_COLOR_STYLES[line.color];
                return (
                  <div
                    key={line.id}
                    className={`rounded-xl border px-3 py-2.5 ${styles.cellBg} ${styles.cellBorder} ${styles.cellText}`}
                  >
                    <div className="text-xs font-semibold">{line.name}</div>
                    <div className="text-lg font-bold tabular-nums mt-0.5">
                      {formatDaysArabic(count)}
                    </div>
                  </div>
                );
              })}
          </div>

          {scope === 'week' && activeWorkerSummary.dayDetails.length > 0 && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                ترتيب أيام الأسبوع:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {activeWorkerSummary.dayDetails.map((d) => (
                  <div
                    key={d.dayKey}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3 py-2"
                  >
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {d.dayLabel}
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                      {d.line
                        ? d.secondLine
                          ? `${d.line.shortName} + ${d.secondLine.shortName}`
                          : d.line.name
                        : 'غير مسجل'}
                    </div>
                    {d.overtimeHours > 0 && (
                      <div className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        +{d.overtimeHours} س إضافي
                      </div>
                    )}
                    {d.note && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {d.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Full Per-Worker × Per-Line Automatic Summary (Mobile Cards + Desktop Matrix) */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-3.5 sm:px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                كشف الحساب التلقائي (عدد الأيام لكل خط)
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                اضغط على أي عامل لعرض تفصيلة أيامه أو نسخ تقريره للواتساب
              </p>
            </div>

            <div className="inline-flex lg:hidden items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 shrink-0">
              <button
                type="button"
                onClick={() => setMobileLayout('cards')}
                className={`min-h-[32px] px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                  mobileLayout === 'cards'
                    ? 'bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>كروت</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileLayout('table')}
                className={`min-h-[32px] px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                  mobileLayout === 'table'
                    ? 'bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>جدول</span>
              </button>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="تصفية بالاسم..."
              className="w-full min-h-[38px] pr-9 pl-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Mobile Cards View (Zero sideways scrolling on phone screens) */}
        {mobileLayout === 'cards' && (
          <div className="lg:hidden p-3 space-y-2.5 bg-slate-50/70 dark:bg-slate-950/30">
            {filteredSummaries.map((s) => {
              const rowNum = workers.findIndex((w) => w.id === s.worker.id) + 1;
              const isSelected = s.worker.id === selectedWorkerId;
              const activeItems = lines
                .map((l) => ({ line: l, count: s.countsByLine[l.id] ?? 0 }))
                .filter((item) => item.count > 0);

              return (
                <button
                  key={s.worker.id}
                  type="button"
                  onClick={() => onSelectWorker(isSelected ? null : s.worker.id)}
                  className={`w-full text-start rounded-xl border p-3 space-y-2 transition-colors ${
                    isSelected
                      ? 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-400 dark:border-teal-700'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-mono font-bold text-slate-400 w-5 shrink-0 tabular-nums">
                        {rowNum}
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {s.worker.name}
                      </span>
                    </div>
                    <div className="text-left shrink-0 tabular-nums">
                      <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
                        {formatNumClean(s.totalWorkedDays)} يوم شغل
                      </span>
                      {s.totalOvertimeHours > 0 && (
                        <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 mr-2">
                          +{formatNumClean(s.totalOvertimeHours)} س
                        </span>
                      )}
                    </div>
                  </div>

                  {activeItems.length > 0 ? (
                    <div className="space-y-1">
                      {activeItems.map(({ line, count }) => {
                        const styles = LINE_COLOR_STYLES[line.color];
                        const isAbsent = line.id === 'absent';
                        return (
                          <div
                            key={line.id}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={`w-2 h-2 rounded-[2px] shrink-0 ${styles.barBg}`}
                              />
                              <span
                                className={`truncate ${
                                  isAbsent
                                    ? 'font-bold text-rose-600 dark:text-rose-400'
                                    : 'text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {line.name}
                              </span>
                            </span>
                            <span
                              className={`font-mono font-bold tabular-nums whitespace-nowrap ${
                                isAbsent
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {formatNumClean(count)} يوم
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">لم يُسجّل عمل في هذه الفترة</p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className={mobileLayout === 'cards' ? 'hidden lg:block overflow-x-auto' : 'overflow-x-auto'}>
          <table className="w-full border-collapse min-w-[920px] text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <th className="sticky right-0 z-10 bg-slate-50 dark:bg-slate-950 text-start font-bold px-4 py-3 border-l border-slate-200 dark:border-slate-800 min-w-[165px]">
                  الاسم
                </th>
                {lines.map((line) => (
                  <th
                    key={line.id}
                    className="text-center font-bold px-2 py-3 whitespace-nowrap"
                  >
                    {line.shortName}
                  </th>
                ))}
                <th className="text-center font-bold px-3 py-3 border-r border-slate-200 dark:border-slate-800 text-teal-800 dark:text-teal-300 whitespace-nowrap">
                  إجمالي الشغل
                </th>
                <th className="text-center font-bold px-3 py-3 text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                  إضافي (س)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
              {filteredSummaries.map((s) => {
                const rowNum = workers.findIndex((w) => w.id === s.worker.id) + 1;
                const isSelected = s.worker.id === selectedWorkerId;
                return (
                  <tr
                    key={s.worker.id}
                    onClick={() => onSelectWorker(isSelected ? null : s.worker.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-teal-50/70 dark:bg-teal-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="sticky right-0 z-10 bg-white dark:bg-slate-900 px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100 border-l border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-400 w-5 shrink-0">
                          {rowNum}
                        </span>
                        <span className="truncate max-w-[130px]">{s.worker.name}</span>
                      </div>
                    </td>

                    {lines.map((line) => {
                      const val = s.countsByLine[line.id] ?? 0;
                      const isAbsent = line.id === 'absent';
                      return (
                        <td
                          key={line.id}
                          className={`text-center px-2 py-2.5 font-mono ${
                            val === 0
                              ? 'text-slate-300 dark:text-slate-700'
                              : isAbsent
                              ? 'font-bold text-rose-600 dark:text-rose-400'
                              : 'font-bold text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {val === 0 ? '—' : formatNumClean(val)}
                        </td>
                      );
                    })}

                    <td className="text-center px-3 py-2.5 font-mono font-bold text-teal-700 dark:text-teal-400 border-r border-slate-200 dark:border-slate-800">
                      {formatNumClean(s.totalWorkedDays)}
                    </td>

                    <td
                      className={`text-center px-3 py-2.5 font-mono ${
                        s.totalOvertimeHours > 0
                          ? 'font-bold text-indigo-700 dark:text-indigo-400'
                          : 'text-slate-300 dark:text-slate-700'
                      }`}
                    >
                      {s.totalOvertimeHours > 0 ? `+${formatNumClean(s.totalOvertimeHours)}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr className="bg-slate-50 dark:bg-slate-950/70 border-t-2 border-slate-200 dark:border-slate-800 font-bold tabular-nums">
                <td className="sticky right-0 z-10 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-slate-800 dark:text-slate-200 border-l border-slate-200 dark:border-slate-800">
                  الإجمالي الكلي
                </td>
                {lines.map((line) => (
                  <td
                    key={line.id}
                    className={`text-center px-2 py-3 font-mono ${
                      line.id === 'absent' && (totalsByLine[line.id] ?? 0) > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {formatNumClean(totalsByLine[line.id] ?? 0)}
                  </td>
                ))}
                <td className="text-center px-3 py-3 font-mono text-teal-700 dark:text-teal-400 border-r border-slate-200 dark:border-slate-800">
                  {formatNumClean(totalWorkedAll)}
                </td>
                <td className="text-center px-3 py-3 font-mono text-indigo-700 dark:text-indigo-400">
                  {formatNumClean(totalOvertimeAll)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Bottom 2-Column Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              توزيع أيام الشغل على الخطوط والأقسام
            </h2>
          </div>

          <div className="space-y-3">
            {lines.map((line) => {
              const total = totalsByLine[line.id] ?? 0;
              const pct = Math.round((total / maxLineTotal) * 100);
              const styles = LINE_COLOR_STYLES[line.color];
              return (
                <div key={line.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {line.name}
                    </span>
                    <span className="font-mono font-bold text-slate-600 dark:text-slate-400 tabular-nums">
                      {formatNumClean(total)} يوم/فرد
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${styles.barBg}`}
                      style={{ width: `${total > 0 ? Math.max(6, pct) : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              تنبيهات التدوير العادل والغياب
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            {rotationAlerts.length > 0 ? (
              <div className="space-y-2">
                <p className="font-semibold text-slate-600 dark:text-slate-400">
                  أفراد شغالين 4 أيام متتالية أو أكتر على نفس الخط (يُفضّل تدويرهم):
                </p>
                {rotationAlerts.map((s) => (
                  <div
                    key={s.worker.id}
                    className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/25 px-3.5 py-2.5 flex items-center justify-between gap-2"
                  >
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {s.worker.name}
                    </span>
                    <span className="text-amber-900 dark:text-amber-200 tabular-nums">
                      {s.maxConsecutiveSameLine?.lineName} ·{' '}
                      {s.maxConsecutiveSameLine?.days} أيام متتالية
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-3.5 py-3 text-slate-600 dark:text-slate-400">
                توزيع الخطوط متوازن — مفيش حد متركّز على خط واحد 4 أيام ورا بعض في الأسبوع الحالي.
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <p className="font-semibold text-slate-600 dark:text-slate-400">
                ملخص الغياب في الفترة المحددة:
              </p>
              {summaries.filter((s) => s.absentDays > 0).length === 0 ? (
                <p className="text-teal-700 dark:text-teal-400 font-semibold">
                  التزام كامل — لا يوجد غياب مسجّل في الفترة دي.
                </p>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[260px] overflow-y-auto">
                  {summaries
                    .filter((s) => s.absentDays > 0)
                    .sort((a, b) => b.absentDays - a.absentDays)
                    .map((s) => (
                      <div
                        key={s.worker.id}
                        className="px-3.5 py-2.5 flex items-center justify-between bg-white dark:bg-slate-900"
                      >
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {s.worker.name}
                        </span>
                        <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                          {formatDaysArabic(s.absentDays)} غياب
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
