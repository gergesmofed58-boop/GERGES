import React, { useMemo, useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  FileText,
  Layers,
  MessageSquare,
  Minus,
  Pin,
  Plus,
  RotateCcw,
  Share2,
  Shuffle,
  X,
} from 'lucide-react';
import {
  AssignmentEntry,
  DayKey,
  LINE_COLOR_STYLES,
  SHIFT_LABELS,
  WeekRecord,
  WorkLine,
  Worker,
  formatArabicShortDate,
  getTodayDayKey,
  shiftIsoDays,
} from './types';
import {
  FairDistributionResult,
  LineDistributionTarget,
  buildDailyWhatsappReport,
  formatNumClean,
  getVisibleDays,
} from './calculations';

interface DailyRollCallViewProps {
  workers: Worker[];
  lines: WorkLine[];
  week: WeekRecord;
  onSetAssignment: (workerId: string, dayKey: DayKey, entry: AssignmentEntry | null) => void;
  onCopyDayToDay: (fromDay: DayKey, toDay: DayKey) => void;
  onApplyDefaultsForDay: (dayKey: DayKey) => void;
  onSuggestFairRotation: (
    dayKey: DayKey,
    targets: LineDistributionTarget[],
    overwriteExisting: boolean
  ) => FairDistributionResult;
  onUpdateDayNote: (dayKey: DayKey, text: string) => void;
  onUpdateWorker: (id: string, patch: Partial<Omit<Worker, 'id'>>) => void;
}

export const DailyRollCallView: React.FC<DailyRollCallViewProps> = ({
  workers,
  lines,
  week,
  onSetAssignment,
  onCopyDayToDay,
  onApplyDefaultsForDay,
  onSuggestFairRotation,
  onUpdateDayNote,
  onUpdateWorker,
}) => {
  const visibleDays = useMemo(() => getVisibleDays(week.includeFriday), [week.includeFriday]);
  const todayKey = getTodayDayKey();
  const initialDay: DayKey = visibleDays.some((d) => d.key === todayKey)
    ? todayKey
    : visibleDays[0].key;

  const [selectedDay, setSelectedDay] = useState<DayKey>(initialDay);
  const [filterMode, setFilterMode] = useState<'all' | 'unassigned' | 'absent'>('all');
  const [copiedDayReport, setCopiedDayReport] = useState(false);
  const [rotationFeedback, setRotationFeedback] = useState<string | null>(null);
  const [editingNoteWorkerId, setEditingNoteWorkerId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  // Capacity-Aware Fair Distribution panel state
  const [showFairPanel, setShowFairPanel] = useState(false);
  const [showFixedManager, setShowFixedManager] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>(['antinal', 'apidone']);
  const [customCounts, setCustomCounts] = useState<Record<string, number>>({});

  const productionLines = useMemo(
    () => lines.filter((l) => l.category === 'production'),
    [lines]
  );

  const activeDayInfo =
    visibleDays.find((d) => d.key === selectedDay) ?? visibleDays[0];
  const activeDayIdx = visibleDays.findIndex((d) => d.key === activeDayInfo.key);
  const activeDateStr = formatArabicShortDate(
    shiftIsoDays(week.weekStartIso, activeDayInfo.offsetFromSat)
  );
  const lineMap = useMemo(() => new Map(lines.map((l) => [l.id, l])), [lines]);

  // Live headcounts for selected day
  const dayCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of lines) map[l.id] = 0;
    let unassigned = 0;
    let present = 0;
    let overtimeTotal = 0;

    for (const w of workers) {
      const entry = week.assignments[w.id]?.[activeDayInfo.key];
      if (!entry) {
        unassigned += 1;
        continue;
      }
      overtimeTotal += entry.overtimeHours ?? 0;
      const primary = lineMap.get(entry.lineId);
      const secondary =
        entry.secondLineId && entry.secondLineId !== entry.lineId
          ? lineMap.get(entry.secondLineId)
          : undefined;

      if (secondary) {
        map[entry.lineId] = Math.round(((map[entry.lineId] ?? 0) + 0.5) * 10) / 10;
        map[secondary.id] = Math.round(((map[secondary.id] ?? 0) + 0.5) * 10) / 10;
        if (primary?.category !== 'absence' || secondary.category !== 'absence') {
          present += 1;
        }
      } else {
        map[entry.lineId] = (map[entry.lineId] ?? 0) + 1;
        if (primary && primary.category !== 'absence') present += 1;
      }
    }
    return { map, unassigned, present, overtimeTotal };
  }, [workers, lines, lineMap, week, activeDayInfo.key]);

  const prevDayInfo = activeDayIdx > 0 ? visibleDays[activeDayIdx - 1] : null;

  const fixedWorkersByLine = useMemo(() => {
    const map = new Map<string, Worker[]>();
    for (const w of workers) {
      if (!w.fixedLineId) continue;
      const list = map.get(w.fixedLineId) ?? [];
      list.push(w);
      map.set(w.fixedLineId, list);
    }
    return map;
  }, [workers]);

  const fixedActiveTodayWorkers = useMemo(() => {
    const selectedSet = new Set(selectedLineIds);
    return workers.filter((w) => {
      if (!w.fixedLineId || !selectedSet.has(w.fixedLineId)) return false;
      const todayEntry = week.assignments[w.id]?.[activeDayInfo.key];
      if (todayEntry?.lineId === 'absent' || todayEntry?.lineId === 'leave') return false;
      return true;
    });
  }, [workers, selectedLineIds, week, activeDayInfo.key]);

  const offYesterdayReturningToday = useMemo(() => {
    if (!prevDayInfo) return 0;
    const selectedSet = new Set(selectedLineIds);
    return workers.filter((w) => {
      const todayEntry = week.assignments[w.id]?.[activeDayInfo.key];
      if (todayEntry?.lineId === 'absent' || todayEntry?.lineId === 'leave') return false;
      if (w.fixedLineId && selectedSet.has(w.fixedLineId)) return false;
      const prevEntry = week.assignments[w.id]?.[prevDayInfo.key];
      return !prevEntry || prevEntry.lineId === 'absent' || prevEntry.lineId === 'leave';
    }).length;
  }, [workers, week, prevDayInfo, activeDayInfo.key, selectedLineIds]);

  const availableForFairCount = useMemo(() => {
    return workers.filter((w) => {
      const e = week.assignments[w.id]?.[activeDayInfo.key];
      if (e?.lineId === 'absent' || e?.lineId === 'leave') return false;
      if (!overwriteExisting && e) return false;
      return true;
    }).length;
  }, [workers, week, activeDayInfo.key, overwriteExisting]);

  const getLineTarget = (line: WorkLine) =>
    customCounts[line.id] ?? line.requiredWorkers ?? 10;

  const selectedTargets: LineDistributionTarget[] = useMemo(
    () =>
      productionLines
        .filter((l) => selectedLineIds.includes(l.id))
        .map((l) => ({
          lineId: l.id,
          targetCount: customCounts[l.id] ?? l.requiredWorkers ?? 10,
        })),
    [productionLines, selectedLineIds, customCounts]
  );

  const totalRequestedForFair = useMemo(
    () => selectedTargets.reduce((acc, t) => acc + t.targetCount, 0),
    [selectedTargets]
  );

  const toggleLineForFair = (lineId: string) => {
    setSelectedLineIds((prev) =>
      prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId]
    );
  };

  const adjustLineTarget = (line: WorkLine, delta: number) => {
    const curr = getLineTarget(line);
    const next = Math.max(1, Math.min(100, curr + delta));
    setCustomCounts((prev) => ({ ...prev, [line.id]: next }));
  };

  const handleApplyFairDistribution = () => {
    if (selectedTargets.length === 0) return;
    const res = onSuggestFairRotation(
      activeDayInfo.key,
      selectedTargets,
      overwriteExisting
    );

    if (res.totalAssigned === 0) {
      setRotationFeedback(
        'مفيش أفراد غير مسجّلين لتوزيعهم اليوم — لو عاوز تعيد توزيع كل الحاضرين فعّل خيار «إعادة توزيع الحاضرين».'
      );
    } else {
      const details: string[] = [`تم توزيع ${res.totalAssigned} عامل على خطوط ${activeDayInfo.label}`];
      if (res.fixedLockedCount > 0) {
        details.push(
          `${res.fixedLockedCount} عمالة أساسية نزلوا على خطهم تلقائي (خارج التدوير)`
        );
      }
      if (res.returnedFromOffCount > 0 && prevDayInfo) {
        details.push(
          `${res.returnedFromOffCount} عامل كانوا غياب/إجازة يوم ${prevDayInfo.label} نزلوا أوتوماتيك على الخطوط`
        );
      }
      if (res.rotatedToNewLineCount > 0) {
        details.push(`تم تبديل ${res.rotatedToNewLineCount} عامل على خط مختلف عن اليوم اللي قبله`);
      }
      if (res.remainingReserveCount > 0) {
        details.push(`متبقي ${res.remainingReserveCount} احتياطي`);
      }
      setRotationFeedback(details.join(' · '));
    }
    setShowFairPanel(false);
    window.setTimeout(() => setRotationFeedback(null), 6000);
  };

  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      const entry = week.assignments[w.id]?.[activeDayInfo.key];
      if (filterMode === 'unassigned') return !entry;
      if (filterMode === 'absent')
        return entry?.lineId === 'absent' || entry?.lineId === 'leave';
      return true;
    });
  }, [workers, week, activeDayInfo.key, filterMode]);

  const handleCopyDayWhatsapp = async () => {
    const text = buildDailyWhatsappReport(workers, lines, week, activeDayInfo.key);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedDayReport(true);
      window.setTimeout(() => setCopiedDayReport(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const openNoteEditor = (workerId: string, existingNote?: string) => {
    setEditingNoteWorkerId(workerId);
    setNoteDraft(existingNote ?? '');
  };

  const saveNote = (workerId: string) => {
    const existing = week.assignments[workerId]?.[activeDayInfo.key];
    if (!existing) {
      setEditingNoteWorkerId(null);
      return;
    }
    const clean = noteDraft.trim();
    onSetAssignment(workerId, activeDayInfo.key, {
      ...existing,
      note: clean || undefined,
    });
    setEditingNoteWorkerId(null);
  };

  const cycleOvertime = (workerId: string, existing: AssignmentEntry) => {
    const curr = existing.overtimeHours ?? 0;
    const next = curr >= 4 ? 0 : curr + 1;
    onSetAssignment(workerId, activeDayInfo.key, {
      ...existing,
      overtimeHours: next > 0 ? next : undefined,
    });
  };

  const currentDayNote = week.dayNotes?.[activeDayInfo.key] ?? '';

  return (
    <div className="space-y-5">
      {/* Day Selector + Quick Bulk Helpers */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              تسجيل اليوم السريع — {activeDayInfo.label} {activeDateStr}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              {SHIFT_LABELS[week.shiftType ?? 'morning']} · حضور: {dayCounts.present} · غياب:{' '}
              {formatNumClean(dayCounts.map['absent'] ?? 0)} · غير مسجل: {dayCounts.unassigned}
              {dayCounts.overtimeTotal > 0 ? ` · إضافي: ${dayCounts.overtimeTotal} س` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeDayIdx > 0 && (
              <button
                type="button"
                onClick={() =>
                  onCopyDayToDay(visibleDays[activeDayIdx - 1].key, activeDayInfo.key)
                }
                className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                <span>نسخ من {visibleDays[activeDayIdx - 1].label}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowFairPanel((v) => !v)}
              className={`min-h-[38px] px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                showFairPanel
                  ? 'bg-teal-700 border-teal-700 text-white'
                  : 'border-teal-300 dark:border-teal-800 bg-teal-50/80 dark:bg-teal-950/35 text-teal-800 dark:text-teal-200 hover:bg-teal-100/80'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>التوزيع العادل للخطوط</span>
            </button>

            <button
              type="button"
              onClick={() => onApplyDefaultsForDay(activeDayInfo.key)}
              className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              <span>الخط الأساسي</span>
            </button>

            <button
              type="button"
              onClick={handleCopyDayWhatsapp}
              className="min-h-[38px] px-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              {copiedDayReport ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span>{copiedDayReport ? 'اتنسخ تقرير اليوم!' : 'نسخ توزيع اليوم'}</span>
            </button>
          </div>
        </div>

        {rotationFeedback && (
          <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">
            {rotationFeedback}
          </p>
        )}

        {/* Capacity-Aware Fair Distribution Builder Panel */}
        {showFairPanel && (
          <div className="rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/40 dark:bg-teal-950/20 p-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  التوزيع العادل للخطوط — يوم {activeDayInfo.label}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  اختر الخطوط الشغالة النهاردة: اللي كان شغال على خط امبارح بيتنقل تلقائي لخط تاني، واللي مجاش{' '}
                  {prevDayInfo ? `يوم ${prevDayInfo.label}` : 'اليوم اللي قبله'} بينزل أوتوماتيك على الخط بأولوية أولى.
                </p>
                {prevDayInfo && offYesterdayReturningToday > 0 && (
                  <p className="text-xs font-bold text-teal-800 dark:text-teal-300 mt-1 tabular-nums">
                    أولوية تلقائية: {offYesterdayReturningToday} عامل مجوش يوم {prevDayInfo.label} وهينزلوا أوتوماتيك على الخطوط النهاردة
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowFairPanel(false)}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Factory Presets */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">
                تشكيلات سريعة:
              </span>
              <button
                type="button"
                onClick={() => setSelectedLineIds(['antinal', 'apidone'])}
                className="min-h-[32px] px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 hover:border-teal-500"
              >
                انتينال (18) + ابيدون (20)
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedLineIds(['enemax_pack', 'tamper_enemax', 'drops_line'])
                }
                className="min-h-[32px] px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 hover:border-teal-500"
              >
                انماكس تعبئة (24) + تمبر (8) + النقط (5)
              </button>
              <button
                type="button"
                onClick={() => setSelectedLineIds(['antinal', 'bbc', 'tamper_enemax'])}
                className="min-h-[32px] px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 hover:border-teal-500"
              >
                انتينال (18) + بي بي سي (12) + تمبر (8)
              </button>
            </div>

            {/* Selectable Production Lines + +/- Target Workers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {productionLines.map((line) => {
                const isActive = selectedLineIds.includes(line.id);
                const count = getLineTarget(line);
                const styles = LINE_COLOR_STYLES[line.color];
                const fixedOnThisLine = fixedWorkersByLine.get(line.id) ?? [];
                return (
                  <div
                    key={line.id}
                    className={`rounded-xl border p-2.5 flex items-center justify-between gap-2 transition-colors ${
                      isActive
                        ? `${styles.cellBg} ${styles.cellBorder}`
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleLineForFair(line.id)}
                      className="flex items-center gap-2 text-start min-w-0 flex-1"
                    >
                      <span
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-teal-700 border-teal-700 text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950'
                        }`}
                      >
                        {isActive && <Check className="w-3.5 h-3.5" />}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {line.name}
                        </div>
                        {fixedOnThisLine.length > 0 && (
                          <div className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 truncate tabular-nums">
                            أساسي ثابت: {fixedOnThisLine.length}{' '}
                            {fixedOnThisLine.length === 1
                              ? `(${fixedOnThisLine[0].name})`
                              : 'عمال'}
                          </div>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0" dir="ltr">
                      <button
                        type="button"
                        onClick={() => adjustLineTarget(line, -1)}
                        aria-label="تنقيص العدد"
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {count}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustLineTarget(line, 1)}
                        aria-label="زيادة العدد"
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Fixed Key Operators (Outside Fair Rotation When Their Line Runs) */}
            <div className="rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-white/90 dark:bg-slate-900/90 p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <Pin className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                  <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    العمالة الأساسية المثبّتة على خطوط اليوم: {fixedActiveTodayWorkers.length} عامل
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
                    (خارج التوزيع العادل لو خطهم شغال)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFixedManager((v) => !v)}
                  className="min-h-[30px] px-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 text-[11px] font-bold text-amber-900 dark:text-amber-200 whitespace-nowrap"
                >
                  {showFixedManager ? 'إخفاء الإدارة' : 'تحديد / تعديل العمالة الأساسية'}
                </button>
              </div>

              {showFixedManager && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    حدّد أكتر من عامل أساسي لكل خط (مثلاً مشغّل ماكينة). أي عامل هنا ينزل على خطه مباشرة وبرة التوزيع العادل طالما خطه شغال، ولو خطه واقف النهاردة يتوزّع بالعدل عادي.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {productionLines
                      .filter(
                        (l) => selectedLineIds.length === 0 || selectedLineIds.includes(l.id)
                      )
                      .map((line) => {
                        const pinned = fixedWorkersByLine.get(line.id) ?? [];
                        const candidates = workers.filter((w) => w.fixedLineId !== line.id);
                        return (
                          <div
                            key={line.id}
                            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-2.5 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <span
                                  className={`w-2.5 h-2.5 rounded-sm ${LINE_COLOR_STYLES[line.color].barBg}`}
                                />
                                {line.name}
                              </span>
                              <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                                {pinned.length} أساسي
                              </span>
                            </div>

                            {pinned.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {pinned.map((w) => (
                                  <span
                                    key={w.id}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/70 text-[11px] font-semibold text-slate-800 dark:text-slate-200"
                                  >
                                    <span>{w.name}</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onUpdateWorker(w.id, { fixedLineId: undefined })
                                      }
                                      aria-label={`فك تثبيت ${w.name}`}
                                      className="text-slate-400 hover:text-rose-600"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                لا يوجد عمال أساسيين مثبّتين على هذا الخط
                              </p>
                            )}

                            <select
                              aria-label={`إضافة عامل أساسي على ${line.name}`}
                              value=""
                              onChange={(e) => {
                                if (!e.target.value) return;
                                onUpdateWorker(e.target.value, { fixedLineId: line.id });
                              }}
                              className="w-full min-h-[34px] px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                            >
                              <option value="">+ تثبيت عامل أساسي على {line.shortName}...</option>
                              {candidates.map((w) => {
                                const prevFixed = w.fixedLineId
                                  ? lineMap.get(w.fixedLineId)?.shortName
                                  : null;
                                return (
                                  <option key={w.id} value={w.id}>
                                    {w.name} ({w.role}
                                    {prevFixed ? ` · حالياً أساسي ${prevFixed}` : ''})
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Summary & Execute Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-teal-200/70 dark:border-teal-800/60">
              <div className="space-y-1 text-xs">
                <div className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  المطلوب للخطوط المختارة: {totalRequestedForFair} عامل · المتاح للتوزيع الآن:{' '}
                  {availableForFairCount} عامل
                  {totalRequestedForFair > availableForFairCount ? (
                    <span className="text-amber-700 dark:text-amber-400 mr-2">
                      (عجز {totalRequestedForFair - availableForFairCount} عامل)
                    </span>
                  ) : (
                    <span className="text-teal-700 dark:text-teal-400 mr-2">
                      (متبقي {availableForFairCount - totalRequestedForFair} احتياطي)
                    </span>
                  )}
                </div>
                <label className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                  />
                  <span>
                    إعادة توزيع كل الحاضرين اليوم (عدا العمالة الأساسية اللي خطها شغال)
                  </span>
                </label>
              </div>

              <button
                type="button"
                disabled={selectedTargets.length === 0}
                onClick={handleApplyFairDistribution}
                className="min-h-[42px] px-4 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-45 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
              >
                <Shuffle className="w-4 h-4" />
                <span>تطبيق التوزيع العادل الآن</span>
              </button>
            </div>
          </div>
        )}

        {/* Segmented Day Picker */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 rounded-xl bg-slate-100 dark:bg-slate-950">
          {visibleDays.map((day) => {
            const active = day.key === activeDayInfo.key;
            const dateLabel = formatArabicShortDate(
              shiftIsoDays(week.weekStartIso, day.offsetFromSat)
            );
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedDay(day.key)}
                className={`flex-1 min-w-[82px] min-h-[42px] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <div>{day.label}</div>
                <div className="text-[10px] opacity-75 tabular-nums">{dateLabel}</div>
              </button>
            );
          })}
        </div>

        {/* Live Line Headcount Bar (Showing Assigned / Required Capacity) */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2.5">
            <Layers className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
            <span>قوة كل خط يوم {activeDayInfo.label} (المسجّل / طاقة الخط):</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {lines.map((line) => {
              const count = dayCounts.map[line.id] ?? 0;
              const req = line.requiredWorkers ?? 0;
              const styles = LINE_COLOR_STYLES[line.color];
              return (
                <div
                  key={line.id}
                  className={`rounded-xl border px-2.5 py-2 text-center ${
                    count > 0
                      ? `${styles.cellBg} ${styles.cellBorder} ${styles.cellText}`
                      : 'bg-slate-50/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <div className="text-[11px] font-semibold truncate">{line.shortName}</div>
                  <div className="text-sm sm:text-base font-bold font-mono tabular-nums mt-0.5">
                    {formatNumClean(count)}
                    {req > 0 && (
                      <span className="text-[11px] font-normal opacity-75"> / {req}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Shift Log / Production Notes */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
          <label
            htmlFor="daily-shift-note"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            <FileText className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
            <span>
              ملاحظات وردية {activeDayInfo.label} (تتضاف تلقائياً في تقرير واتساب اليومي):
            </span>
          </label>
          <input
            id="daily-shift-note"
            type="text"
            value={currentDayNote}
            onChange={(e) => onUpdateDayNote(activeDayInfo.key, e.target.value)}
            placeholder="مثلاً: تشغيل الانتينال والابيدون بكامل الطاقة · توقف خط للصيانة..."
            className="w-full min-h-[40px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600/40 focus:border-teal-600"
          />
        </div>
      </section>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80">
          {(
            [
              { id: 'all', label: `الكل (${workers.length})` },
              { id: 'unassigned', label: `غير مسجل (${dayCounts.unassigned})` },
              {
                id: 'absent',
                label: `غياب وإجازة (${formatNumClean(
                  (dayCounts.map['absent'] ?? 0) + (dayCounts.map['leave'] ?? 0)
                )})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterMode(tab.id)}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filterMode === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          اضغط على اسم الخط قدام كل عامل لتسجيله فوراً، أو استخدم «التوزيع العادل للخطوط» فوق
        </p>
      </div>

      {/* Fast 1-Tap Roll-Call List */}
      <div className="space-y-3">
        {filteredWorkers.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            مفيش عمال مطابقين للفلتر ده يوم {activeDayInfo.label}.
          </div>
        ) : (
          filteredWorkers.map((worker) => {
            const rowNum = workers.findIndex((w) => w.id === worker.id) + 1;
            const currentEntry = week.assignments[worker.id]?.[activeDayInfo.key];
            const currentLine = currentEntry ? lineMap.get(currentEntry.lineId) : undefined;
            const secondLine =
              currentEntry?.secondLineId && currentEntry.secondLineId !== currentEntry.lineId
                ? lineMap.get(currentEntry.secondLineId)
                : undefined;
            const isEditingNote = editingNoteWorkerId === worker.id;
            const isWorking = currentLine && currentLine.category !== 'absence';

            return (
              <div
                key={worker.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 w-6 text-center tabular-nums">
                      {rowNum}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                          {worker.name}
                        </h3>
                        {worker.fixedLineId && lineMap.get(worker.fixedLineId) && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                            <Pin className="w-3 h-3" />
                            <span>أساسي · {lineMap.get(worker.fixedLineId)!.shortName}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {worker.role}
                        {currentLine
                          ? secondLine
                            ? ` · نص يوم ${currentLine.shortName} + نص يوم ${secondLine.shortName}`
                            : ` · مسجّل على: ${currentLine.name}`
                          : ' · لم يُسجّل بعد'}
                        {currentEntry?.overtimeHours
                          ? ` · +${currentEntry.overtimeHours} س إضافي`
                          : ''}
                        {currentEntry?.note ? ` · ملاحظة: ${currentEntry.note}` : ''}
                      </p>
                    </div>
                  </div>

                  {currentEntry && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isWorking && (
                        <button
                          type="button"
                          onClick={() => cycleOvertime(worker.id, currentEntry)}
                          className={`min-h-[34px] px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1 tabular-nums ${
                            currentEntry.overtimeHours
                              ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {currentEntry.overtimeHours
                              ? `+${currentEntry.overtimeHours} س إضافي`
                              : '+ إضافي'}
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openNoteEditor(worker.id, currentEntry.note)}
                        className="min-h-[34px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{currentEntry.note ? 'تعديل الملاحظة' : 'ملاحظة'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetAssignment(worker.id, activeDayInfo.key, null)}
                        aria-label="مسح التسجيل"
                        className="min-h-[34px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>مسح</span>
                      </button>
                    </div>
                  )}
                </div>

                {isEditingNote && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="مثلاً: استئذان ساعة / تبديل..."
                      autoFocus
                      className="flex-1 min-h-[38px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => saveNote(worker.id)}
                      className="min-h-[38px] px-3.5 rounded-xl bg-teal-700 text-white text-xs font-bold"
                    >
                      حفظ
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingNoteWorkerId(null)}
                      className="min-h-[38px] px-2.5 text-xs text-slate-500"
                    >
                      إلغاء
                    </button>
                  </div>
                )}

                {/* 1-Tap Line Buttons */}
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5">
                  {lines.map((line) => {
                    const selected =
                      currentEntry?.lineId === line.id ||
                      currentEntry?.secondLineId === line.id;
                    const styles = LINE_COLOR_STYLES[line.color];
                    return (
                      <button
                        key={line.id}
                        type="button"
                        onClick={() =>
                          onSetAssignment(worker.id, activeDayInfo.key, {
                            lineId: line.id,
                            ...(currentEntry?.overtimeHours && line.category !== 'absence'
                              ? { overtimeHours: currentEntry.overtimeHours }
                              : {}),
                            ...(currentEntry?.note ? { note: currentEntry.note } : {}),
                          })
                        }
                        className={`min-h-[40px] px-2 py-1.5 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap truncate ${
                          selected
                            ? styles.activeBtn
                            : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        {line.shortName}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
