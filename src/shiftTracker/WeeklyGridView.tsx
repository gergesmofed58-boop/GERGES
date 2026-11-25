import React, { useMemo, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Filter,
  MessageSquare,
  Pin,
  Plus,
  Search,
  Sparkles,
  Undo2,
  UserPlus,
} from 'lucide-react';
import {
  AssignmentEntry,
  DayKey,
  LINE_COLOR_STYLES,
  SHIFT_LABELS,
  ShiftType,
  WeekRecord,
  WorkLine,
  Worker,
  formatArabicShortDate,
  formatWeekRangeAr,
  getSaturdayIso,
  getTodayDayKey,
  shiftIsoDays,
} from './types';
import {
  computeWeekDayCoverage,
  computeWeekWorkerSummaries,
  formatNumClean,
  getVisibleDays,
} from './calculations';
import { LinePickerModal } from './LinePickerModal';

interface WeeklyGridViewProps {
  workers: Worker[];
  lines: WorkLine[];
  week: WeekRecord;
  hasPreviousWeekData: boolean;
  canUndo: boolean;
  isDemoData: boolean;
  onChangeWeek: (newSatIso: string) => void;
  onChangeShiftType: (shiftType: ShiftType) => void;
  onToggleFriday: () => void;
  onSetAssignment: (workerId: string, dayKey: DayKey, entry: AssignmentEntry | null) => void;
  onQuickAddWorker: (name: string) => void;
  onCopyDayToDay: (fromDay: DayKey, toDay: DayKey) => void;
  onCopyFromPreviousWeek: () => void;
  onUndo: () => void;
  onClearDemoData: () => void;
  onSelectWorkerDetails: (workerId: string) => void;
}

export const WeeklyGridView: React.FC<WeeklyGridViewProps> = ({
  workers,
  lines,
  week,
  hasPreviousWeekData,
  canUndo,
  isDemoData,
  onChangeWeek,
  onChangeShiftType,
  onToggleFriday,
  onSetAssignment,
  onQuickAddWorker,
  onCopyDayToDay,
  onCopyFromPreviousWeek,
  onUndo,
  onClearDemoData,
  onSelectWorkerDetails,
}) => {
  const [search, setSearch] = useState('');
  const [lineFilter, setLineFilter] = useState<string>('all');
  const [quickName, setQuickName] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<{
    workerId: string;
    workerName: string;
    dayKey: DayKey;
    dayLabel: string;
    dateLabel: string;
  } | null>(null);

  const visibleDays = useMemo(() => getVisibleDays(week.includeFriday), [week.includeFriday]);
  const lineMap = useMemo(() => new Map(lines.map((l) => [l.id, l])), [lines]);
  const currentSatIso = getSaturdayIso();
  const todayKey = getTodayDayKey();
  const isCurrentWeek = week.weekStartIso === currentSatIso;

  const summaries = useMemo(
    () => computeWeekWorkerSummaries(workers, lines, week),
    [workers, lines, week]
  );

  const summaryByWorker = useMemo(
    () => new Map(summaries.map((s) => [s.worker.id, s])),
    [summaries]
  );

  const filteredWorkers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workers.filter((w) => {
      if (q && !w.name.toLowerCase().includes(q) && !w.role.toLowerCase().includes(q)) {
        return false;
      }
      if (lineFilter !== 'all') {
        const s = summaryByWorker.get(w.id);
        if (!s || (s.countsByLine[lineFilter] ?? 0) <= 0) return false;
      }
      return true;
    });
  }, [workers, search, lineFilter, summaryByWorker]);

  const coverage = useMemo(
    () => computeWeekDayCoverage(workers, lines, week),
    [workers, lines, week]
  );

  const totalWeekWorkDays = useMemo(
    () => Math.round(summaries.reduce((acc, s) => acc + s.totalWorkedDays, 0) * 10) / 10,
    [summaries]
  );
  const totalWeekAbsentDays = useMemo(
    () => Math.round(summaries.reduce((acc, s) => acc + s.absentDays, 0) * 10) / 10,
    [summaries]
  );
  const totalWeekOvertime = useMemo(
    () => Math.round(summaries.reduce((acc, s) => acc + s.totalOvertimeHours, 0) * 10) / 10,
    [summaries]
  );

  const isWeekEmpty = totalWeekWorkDays === 0 && totalWeekAbsentDays === 0;

  const notify = (msg: string) => {
    setActionFeedback(msg);
    window.setTimeout(() => setActionFeedback(null), 2600);
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickName.trim();
    if (!trimmed) return;
    onQuickAddWorker(trimmed);
    setQuickName('');
    setShowQuickAdd(false);
  };

  const handleCopyPreviousDay = () => {
    const idx = visibleDays.findIndex((d) => d.key === todayKey);
    const targetIdx = idx > 0 ? idx : 1;
    const fromDay = visibleDays[targetIdx - 1];
    const toDay = visibleDays[targetIdx];
    if (!fromDay || !toDay) return;
    onCopyDayToDay(fromDay.key, toDay.key);
    notify(`تم نسخ توزيع ${fromDay.label} إلى ${toDay.label}`);
  };

  const handleCopyPrevWeek = () => {
    onCopyFromPreviousWeek();
    notify('تم نسخ جدول الأسبوع السابق بالكامل وتقدر تعدّل أي يوم فيه');
  };

  return (
    <div className="space-y-6">
      {/* Demo data notice */}
      {isDemoData && (
        <div className="rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/70 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-teal-950 dark:text-teal-100">
            <span className="font-bold">بيانات تجريبية للتوضيح:</span>{' '}
            <span className="text-teal-800 dark:text-teal-200">
              اضغط على أي خانة لتغيير الخط أو تسجيل أوفر تايم أو خطين في نفس اليوم، أو امسح البيانات التجريبية وابدأ بأسماء فريقك.
            </span>
          </div>
          <button
            type="button"
            onClick={onClearDemoData}
            className="min-h-[38px] px-3.5 rounded-lg bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-800 text-xs font-bold text-teal-800 dark:text-teal-200 hover:bg-teal-100/60 dark:hover:bg-teal-900/40 whitespace-nowrap shrink-0 transition-colors"
          >
            مسح البيانات التجريبية والبدء من الصفر
          </button>
        </div>
      )}

      {/* Week Controller + High-level KPI Strip */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Week Navigation */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeWeek(shiftIsoDays(week.weekStartIso, -7))}
              aria-label="الأسبوع السابق"
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="px-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatWeekRangeAr(week.weekStartIso, week.includeFriday)}
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {isCurrentWeek ? 'الأسبوع الحالي' : 'أسبوع محفوظ'} ·{' '}
                {SHIFT_LABELS[week.shiftType ?? 'morning']} · {workers.length} فرد
              </p>
            </div>

            <button
              type="button"
              onClick={() => onChangeWeek(shiftIsoDays(week.weekStartIso, 7))}
              aria-label="الأسبوع التالي"
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {!isCurrentWeek && (
              <button
                type="button"
                onClick={() => onChangeWeek(currentSatIso)}
                className="min-h-[38px] px-3 rounded-xl border border-teal-200 dark:border-teal-800 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/30 whitespace-nowrap shrink-0"
              >
                الأسبوع الحالي
              </button>
            )}
          </div>

          {/* Practical Toolbar Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Shift selector */}
            <select
              aria-label="اختيار الوردية"
              value={week.shiftType ?? 'morning'}
              onChange={(e) => onChangeShiftType(e.target.value as ShiftType)}
              className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="morning">الوردية الصباحية</option>
              <option value="evening">الوردية المسائية</option>
              <option value="night">الوردية الليلية</option>
            </select>

            {canUndo && (
              <button
                type="button"
                onClick={() => {
                  onUndo();
                  notify('تم التراجع عن آخر تعديل');
                }}
                className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Undo2 className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                <span>تراجع</span>
              </button>
            )}

            {isWeekEmpty && hasPreviousWeekData ? (
              <button
                type="button"
                onClick={handleCopyPrevWeek}
                className="min-h-[40px] px-3.5 rounded-xl border border-teal-300 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-xs font-bold text-teal-800 dark:text-teal-200 flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ من الأسبوع السابق</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCopyPreviousDay}
                className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                <span>نسخ توزيع اليوم السابق</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleFriday}
              className={`min-h-[40px] px-3 rounded-xl border text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                week.includeFriday
                  ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {week.includeFriday ? 'إخفاء الجمعة' : '+ الجمعة'}
            </button>

            <button
              type="button"
              onClick={() => setShowQuickAdd((v) => !v)}
              className="min-h-[40px] px-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>إضافة اسم</span>
            </button>
          </div>
        </div>

        {actionFeedback && (
          <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">
            {actionFeedback}
          </p>
        )}

        {/* Inline Quick-Add Worker Bar */}
        {showQuickAdd && (
          <form
            onSubmit={handleQuickAddSubmit}
            className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2"
          >
            <input
              type="text"
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              placeholder="اكتب اسم العامل الجديد (مثلاً: أحمد مصطفى)..."
              autoFocus
              className="flex-1 min-w-[200px] min-h-[42px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600/40 focus:border-teal-600"
            />
            <button
              type="submit"
              className="min-h-[42px] px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>حفظ بالجدول</span>
            </button>
            <button
              type="button"
              onClick={() => setShowQuickAdd(false)}
              className="min-h-[42px] px-3 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              إلغاء
            </button>
          </form>
        )}

        {/* Clean Unboxed KPI Row separated by hairline dividers */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">إجمالي الفريق</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
              {workers.length} <span className="text-xs font-normal text-slate-500">فرد</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">أيام شغل مسجّلة</p>
            <p className="text-xl font-bold text-teal-700 dark:text-teal-400 tabular-nums mt-0.5">
              {formatNumClean(totalWeekWorkDays)}{' '}
              <span className="text-xs font-normal text-slate-500">يوم/فرد</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">إجمالي ساعات الإضافي</p>
            <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400 tabular-nums mt-0.5">
              {formatNumClean(totalWeekOvertime)}{' '}
              <span className="text-xs font-normal text-slate-500">ساعة</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">إجمالي أيام الغياب</p>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
              {formatNumClean(totalWeekAbsentDays)}{' '}
              <span className="text-xs font-normal text-slate-500">يوم</span>
            </p>
          </div>
        </div>
      </section>

      {/* Main Weekly Schedule Table */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Table Header Bar */}
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              جدول توزيع الخطوط الأسبوعي
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              اضغط على أي خانة لتسجيل الخط أو نص يوم على خطين أو ساعات أوفر تايم
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-52">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث باسم العامل..."
                className="w-full min-h-[38px] pr-9 pl-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600/40 focus:border-teal-600"
              />
            </div>

            <div className="relative flex items-center">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
              <select
                aria-label="تصفية حسب الخط"
                value={lineFilter}
                onChange={(e) => setLineFilter(e.target.value)}
                className="min-h-[38px] pr-8 pl-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="all">كل الخطوط</option>
                {lines.map((l) => (
                  <option key={l.id} value={l.id}>
                    اشتغل: {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {workers.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              مفيش أسماء مسجلة لسه في الجدول
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              اضغط «إضافة اسم» فوق أو روح لتبويب «العمال والخطوط» عشان تضيف فريقك مرة واحدة.
            </p>
            <button
              type="button"
              onClick={() => setShowQuickAdd(true)}
              className="min-h-[42px] px-4 rounded-xl bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة أول عامل</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  <th className="sticky right-0 z-20 bg-slate-50 dark:bg-slate-950 text-start font-bold px-4 py-3 border-l border-slate-200 dark:border-slate-800 min-w-[165px]">
                    اسم العامل
                  </th>
                  {visibleDays.map((day) => {
                    const dateStr = formatArabicShortDate(
                      shiftIsoDays(week.weekStartIso, day.offsetFromSat)
                    );
                    const isToday = isCurrentWeek && day.key === todayKey;
                    return (
                      <th
                        key={day.key}
                        className={`text-center font-bold px-2 py-2.5 min-w-[110px] ${
                          isToday
                            ? 'bg-teal-50/80 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200'
                            : ''
                        }`}
                      >
                        <div className="whitespace-nowrap">
                          {day.label}
                          {isToday && (
                            <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300 mr-1">
                              (اليوم)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400 tabular-nums">
                          {dateStr}
                        </div>
                      </th>
                    );
                  })}
                  <th className="text-start font-bold px-3 py-3 border-r border-slate-200 dark:border-slate-800 min-w-[190px]">
                    ملخص الأسبوع التلقائي
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredWorkers.map((worker) => {
                  const summary = summaryByWorker.get(worker.id);
                  const breakdownItems = summary
                    ? lines
                        .map((line) => ({
                          line,
                          count: summary.countsByLine[line.id] ?? 0,
                        }))
                        .filter((item) => item.count > 0)
                    : [];

                  return (
                    <tr
                      key={worker.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Sticky Worker Name with Row Number */}
                      <td className="sticky right-0 z-10 bg-white dark:bg-slate-900 px-3.5 py-2.5 border-l border-slate-200 dark:border-slate-800 align-top">
                        <button
                          type="button"
                          onClick={() => onSelectWorkerDetails(worker.id)}
                          className="text-start group w-full flex items-start gap-2"
                        >
                          <span className="text-[11px] font-mono font-bold text-slate-400 dark:text-slate-500 w-5 shrink-0 pt-0.5 tabular-nums">
                            {workers.findIndex((w) => w.id === worker.id) + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors truncate max-w-[135px]">
                              {worker.name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[135px]">
                              {worker.role}
                            </div>
                            {worker.fixedLineId && lineMap.get(worker.fixedLineId) && (
                              <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-0.5 truncate max-w-[135px] mt-0.5">
                                <Pin className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">
                                  أساسي · {lineMap.get(worker.fixedLineId)!.shortName}
                                </span>
                              </div>
                            )}
                          </div>
                        </button>
                      </td>

                      {/* Day Cells */}
                      {visibleDays.map((day) => {
                        const entry = week.assignments[worker.id]?.[day.key];
                        const line = entry ? lineMap.get(entry.lineId) : undefined;
                        const secondLine =
                          entry?.secondLineId && entry.secondLineId !== entry.lineId
                            ? lineMap.get(entry.secondLineId)
                            : undefined;
                        const styles = line ? LINE_COLOR_STYLES[line.color] : null;
                        const dateStr = formatArabicShortDate(
                          shiftIsoDays(week.weekStartIso, day.offsetFromSat)
                        );
                        const isToday = isCurrentWeek && day.key === todayKey;

                        return (
                          <td
                            key={day.key}
                            className={`px-1.5 py-2 text-center align-top ${
                              isToday ? 'bg-teal-50/30 dark:bg-teal-950/15' : ''
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setPickerTarget({
                                  workerId: worker.id,
                                  workerName: worker.name,
                                  dayKey: day.key,
                                  dayLabel: day.label,
                                  dateLabel: dateStr,
                                })
                              }
                              className={`w-full min-h-[46px] px-2 py-1.5 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center justify-center gap-0.5 ${
                                line && styles
                                  ? `${styles.cellBg} ${styles.cellText} ${styles.cellBorder} hover:brightness-95 dark:hover:brightness-110`
                                  : 'bg-slate-50/80 dark:bg-slate-950/50 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-teal-500 hover:text-teal-700 dark:hover:text-teal-400'
                              }`}
                            >
                              <span className="truncate max-w-[96px]">
                                {line ? line.shortName : '+ تسجيل'}
                              </span>
                              {secondLine && (
                                <span className="text-[10px] font-bold opacity-90 truncate max-w-[96px]">
                                  + {secondLine.shortName}
                                </span>
                              )}
                              {entry?.overtimeHours && entry.overtimeHours > 0 ? (
                                <span className="text-[10px] font-mono font-bold opacity-90 flex items-center gap-0.5 tabular-nums">
                                  <Clock className="w-2.5 h-2.5 shrink-0" />
                                  <span>+{entry.overtimeHours} س</span>
                                </span>
                              ) : null}
                              {entry?.note && (
                                <span
                                  title={entry.note}
                                  className="text-[10px] opacity-80 flex items-center gap-0.5 truncate max-w-[92px]"
                                >
                                  <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">{entry.note}</span>
                                </span>
                              )}
                            </button>
                          </td>
                        );
                      })}

                      {/* Automatic Per-Worker Summary Column (Vertically Stacked Lines) */}
                      <td className="px-3 py-2.5 border-r border-slate-200 dark:border-slate-800 align-top">
                        {summary && (
                          <div className="flex flex-col gap-1 min-w-[165px]">
                            <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800 text-xs font-bold tabular-nums">
                              <span className="text-teal-700 dark:text-teal-400">
                                إجمالي الشغل
                              </span>
                              <span className="font-mono text-teal-700 dark:text-teal-400">
                                {formatNumClean(summary.totalWorkedDays)} يوم
                              </span>
                            </div>

                            {breakdownItems.length > 0 ? (
                              <div className="flex flex-col gap-1 pt-0.5">
                                {breakdownItems.map(({ line, count }) => {
                                  const styles = LINE_COLOR_STYLES[line.color];
                                  const isAbsent = line.id === 'absent';
                                  return (
                                    <div
                                      key={line.id}
                                      className="flex items-center justify-between gap-2 text-[11px] leading-snug"
                                    >
                                      <span className="flex items-center gap-1.5 min-w-0">
                                        <span
                                          className={`w-2 h-2 rounded-[2px] shrink-0 ${styles.barBg}`}
                                          aria-hidden="true"
                                        />
                                        <span
                                          className={`truncate ${
                                            isAbsent
                                              ? 'font-bold text-rose-600 dark:text-rose-400'
                                              : 'font-medium text-slate-700 dark:text-slate-300'
                                          }`}
                                        >
                                          {line.name}
                                        </span>
                                      </span>
                                      <span
                                        className={`font-mono font-bold tabular-nums whitespace-nowrap shrink-0 ${
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

                                {summary.totalOvertimeHours > 0 && (
                                  <div className="flex items-center justify-between gap-2 text-[11px] leading-snug pt-0.5 mt-0.5 border-t border-slate-100 dark:border-slate-800">
                                    <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                                      ساعات إضافي
                                    </span>
                                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 tabular-nums">
                                      +{formatNumClean(summary.totalOvertimeHours)} س
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
                                لم يُسجّل عمل بعد
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Daily Headcount Footer Row */}
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-950/70 border-t-2 border-slate-200 dark:border-slate-800 text-xs">
                  <td className="sticky right-0 z-10 bg-slate-50 dark:bg-slate-950 px-4 py-3 font-bold text-slate-800 dark:text-slate-200 border-l border-slate-200 dark:border-slate-800">
                    قوة اليوم (حضور / غياب)
                  </td>
                  {coverage.map((dayCov) => (
                    <td
                      key={dayCov.dayKey}
                      className="px-2 py-2.5 text-center tabular-nums"
                    >
                      <div className="font-bold text-teal-700 dark:text-teal-400">
                        حضور: {dayCov.presentCount}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {dayCov.absentCount > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">
                            غياب: {dayCov.absentCount}
                          </span>
                        ) : (
                          'بدون غياب'
                        )}
                      </div>
                      {dayCov.totalOvertimeHours > 0 && (
                        <div className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                          إضافي: +{dayCov.totalOvertimeHours} س
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 border-r border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                    اضغط على أي اسم لعرض تفصيلة أيامه
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Clean Line Color Reference Strip */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-700 dark:text-slate-300">
          <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
            الخطوط والأقسام المسجّلة:
          </span>
          {lines.map((line) => (
            <span key={line.id} className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span
                className={`w-2.5 h-2.5 rounded-sm ${LINE_COLOR_STYLES[line.color].barBg}`}
                aria-hidden="true"
              />
              <span>{line.name}</span>
            </span>
          ))}
        </div>
      </section>

      {pickerTarget && (
        <LinePickerModal
          workerName={pickerTarget.workerName}
          dayLabel={pickerTarget.dayLabel}
          dateLabel={pickerTarget.dateLabel}
          currentEntry={week.assignments[pickerTarget.workerId]?.[pickerTarget.dayKey]}
          lines={lines}
          onSelect={(entry) => {
            onSetAssignment(pickerTarget.workerId, pickerTarget.dayKey, entry);
            setPickerTarget(null);
          }}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </div>
  );
};
