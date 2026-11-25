import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  Check,
  ClipboardCheck,
  Copy,
  Moon,
  Share2,
  Sun,
  Users,
  X,
} from 'lucide-react';
import {
  AssignmentEntry,
  DEFAULT_LINES,
  DayKey,
  ShiftType,
  TrackerState,
  WeekRecord,
  WorkLine,
  Worker,
  createBlank40Workers,
  createEmptyWeek,
  createInitialDemoState,
  getSaturdayIso,
  getTodayDayKey,
  shiftIsoDays,
} from './types';
import {
  FairDistributionResult,
  LineDistributionTarget,
  buildDailyWhatsappReport,
  buildWeeklyWhatsappReport,
  computeWeekWorkerSummaries,
  suggestFairDayAssignments,
} from './calculations';
import { WeeklyGridView } from './WeeklyGridView';
import { DailyRollCallView } from './DailyRollCallView';
import { SummaryReportsView } from './SummaryReportsView';
import { WorkersLinesView } from './WorkersLinesView';

const STORAGE_KEY = 'pharma_line_shift_tracker_v2';
const LEGACY_STORAGE_KEY = 'pharma_line_shift_tracker_v1';
const THEME_KEY = 'pharma_line_shift_theme_v1';

type ActiveTab = 'weekly' | 'daily' | 'summary' | 'team';

function mergeLinesWithDefaults(savedLines: WorkLine[]): WorkLine[] {
  const byId = new Map(savedLines.map((l) => [l.id, l]));
  const result: WorkLine[] = [];
  for (const dl of DEFAULT_LINES) {
    const existing = byId.get(dl.id);
    if (existing) {
      result.push({
        ...dl,
        ...existing,
        requiredWorkers:
          existing.requiredWorkers !== undefined
            ? existing.requiredWorkers
            : dl.requiredWorkers,
      });
      byId.delete(dl.id);
    } else {
      result.push(dl);
    }
  }
  for (const custom of byId.values()) {
    result.push(custom);
  }
  return result;
}

function loadInitialState(): TrackerState {
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Partial<TrackerState>;
      if (
        parsed &&
        Array.isArray(parsed.workers) &&
        Array.isArray(parsed.lines) &&
        parsed.weeks &&
        typeof parsed.weeks === 'object'
      ) {
        const activeWeekIso = parsed.activeWeekIso || getSaturdayIso();
        const weeks = { ...parsed.weeks };
        if (!weeks[activeWeekIso]) {
          weeks[activeWeekIso] = createEmptyWeek(activeWeekIso);
        }
        let lines = parsed.lines;
        if ((parsed.schemaVersion ?? 0) < 3 && !lines.some((l) => l.id === 'drops_line')) {
          const dropsDef = DEFAULT_LINES.find((l) => l.id === 'drops_line');
          if (dropsDef) {
            const bbcIdx = lines.findIndex((l) => l.id === 'bbc');
            const insertAt = bbcIdx >= 0 ? bbcIdx + 1 : lines.length;
            lines = [...lines.slice(0, insertAt), dropsDef, ...lines.slice(insertAt)];
          }
        }
        return {
          workers: parsed.workers,
          lines,
          weeks,
          activeWeekIso,
          isDemoData: Boolean(parsed.isDemoData),
          schemaVersion: 3,
        };
      }
    }

    // Migrate custom (non-demo) user data smoothly from v1 if present
    const rawV1 = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawV1) {
      const parsed = JSON.parse(rawV1) as Partial<TrackerState>;
      if (
        parsed &&
        !parsed.isDemoData &&
        Array.isArray(parsed.workers) &&
        parsed.workers.length > 0 &&
        Array.isArray(parsed.lines) &&
        parsed.weeks
      ) {
        const activeWeekIso = parsed.activeWeekIso || getSaturdayIso();
        const weeks = { ...parsed.weeks };
        if (!weeks[activeWeekIso]) {
          weeks[activeWeekIso] = createEmptyWeek(activeWeekIso);
        }
        return {
          workers: parsed.workers,
          lines: mergeLinesWithDefaults(parsed.lines),
          weeks,
          activeWeekIso,
          isDemoData: false,
        };
      }
    }
  } catch {
    // fall back to fresh 40-worker demo data
  }
  return createInitialDemoState();
}

export const ShiftTrackerApp: React.FC = () => {
  const [state, setState] = useState<TrackerState>(() => loadInitialState());
  const [undoStack, setUndoStack] = useState<Record<string, WeekRecord>[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('weekly');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTab, setReportTab] = useState<'weekly' | 'daily'>('weekly');
  const [copiedModal, setCopiedModal] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage quota error
    }
  }, [state]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [darkMode]);

  const activeWeek = useMemo(() => {
    return state.weeks[state.activeWeekIso] ?? createEmptyWeek(state.activeWeekIso);
  }, [state.weeks, state.activeWeekIso]);

  const prevWeekIso = shiftIsoDays(state.activeWeekIso, -7);
  const hasPreviousWeekData = useMemo(() => {
    const pw = state.weeks[prevWeekIso];
    if (!pw) return false;
    return Object.values(pw.assignments).some((days) => Object.keys(days ?? {}).length > 0);
  }, [state.weeks, prevWeekIso]);

  const activeSummaries = useMemo(
    () => computeWeekWorkerSummaries(state.workers, state.lines, activeWeek),
    [state.workers, state.lines, activeWeek]
  );

  const pushUndoSnapshot = (weeksSnapshot: Record<string, WeekRecord>) => {
    setUndoStack((prev) => [...prev.slice(-14), weeksSnapshot]);
  };

  const handleUndo = () => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const lastWeeks = prev[prev.length - 1];
      setState((curr) => ({ ...curr, weeks: lastWeeks }));
      return prev.slice(0, -1);
    });
  };

  const handleChangeWeek = (newSatIso: string) => {
    setState((prev) => ({
      ...prev,
      activeWeekIso: newSatIso,
      weeks: prev.weeks[newSatIso]
        ? prev.weeks
        : {
            ...prev.weeks,
            [newSatIso]: createEmptyWeek(
              newSatIso,
              prev.weeks[prev.activeWeekIso]?.shiftType ?? 'morning'
            ),
          },
    }));
  };

  const handleChangeShiftType = (shiftType: ShiftType) => {
    setState((prev) => {
      const current = prev.weeks[prev.activeWeekIso] ?? createEmptyWeek(prev.activeWeekIso);
      return {
        ...prev,
        weeks: {
          ...prev.weeks,
          [prev.activeWeekIso]: {
            ...current,
            shiftType,
          },
        },
      };
    });
  };

  const handleToggleFriday = () => {
    setState((prev) => {
      const current = prev.weeks[prev.activeWeekIso] ?? createEmptyWeek(prev.activeWeekIso);
      return {
        ...prev,
        weeks: {
          ...prev.weeks,
          [prev.activeWeekIso]: {
            ...current,
            includeFriday: !current.includeFriday,
          },
        },
      };
    });
  };

  const handleSetAssignment = (
    workerId: string,
    dayKey: DayKey,
    entry: AssignmentEntry | null
  ) => {
    setState((prev) => {
      pushUndoSnapshot(prev.weeks);
      const current = prev.weeks[prev.activeWeekIso] ?? createEmptyWeek(prev.activeWeekIso);
      const prevWorkerDays = { ...(current.assignments[workerId] ?? {}) };
      if (entry === null) {
        delete prevWorkerDays[dayKey];
      } else {
        prevWorkerDays[dayKey] = entry;
      }
      return {
        ...prev,
        isDemoData: false,
        weeks: {
          ...prev.weeks,
          [prev.activeWeekIso]: {
            ...current,
            assignments: {
              ...current.assignments,
              [workerId]: prevWorkerDays,
            },
          },
        },
      };
    });
  };

  const handleCopyDayToDay = (fromDay: DayKey, toDay: DayKey) => {
    setState((prev) => {
      pushUndoSnapshot(prev.weeks);
      const current = prev.weeks[prev.activeWeekIso] ?? createEmptyWeek(prev.activeWeekIso);
      const nextAssignments = { ...current.assignments };
      for (const worker of prev.workers) {
        const src = current.assignments[worker.id]?.[fromDay];
        if (src) {
          nextAssignments[worker.id] = {
            ...(nextAssignments[worker.id] ?? {}),
            [toDay]: { ...src },
          };
        }
      }
      return {
        ...prev,
        isDemoData: false,
        weeks: {
          ...prev.weeks,
          [prev.activeWeekIso]: {
            ...current,
            assignments: nextAssignments,
          },
        },
      };
    });
  };

  const handleCopyFromPreviousWeek = () => {
    setState((prev) => {
      const prevW = prev.weeks[shiftIsoDays(prev.activeWeekIso, -7)];
      if (!prevW) return prev;
      pushUndoSnapshot(prev.weeks);
      const current = prev.weeks[prev.activeWeekIso] ?? createEmptyWeek(prev.activeWeekIso);
      const clonedAssignments: WeekRecord['assignments'] = {};
      for (const [workerId, days] of Object.entries(prevW.assignments)) {
        clonedAssignments[workerId] = {};
        for (const [dayKey, entry] of Object.entries(days ?? {})) {
          if (entry && entry.lineId !== 'absent' && entry.lineId !== 'leave') {
            clonedAssignments[workerId][dayKey as DayKey] = {
              lineId: entry.lineId,
              ...(entry.secondLineId ? { secondLineId: entry.secondLineId } : {}),
            };
          }
        }
      }
      return {
        ...prev,
        isDemoData: false,
        weeks: {
          ...prev.weeks,
          [prev.activeWeekIso]: {
            ...current,
            assignments: clonedAssignments,
          },
        },
      };
    });
  };

  const handleApplyDefaultsForDay = (dayKey: DayKey) => {
    setState((prev) => {
      pushUndoSnapshot(prev.weeks);
      const current = prev.weeks[prev.activeWeekIso] ?? createEmptyWeek(prev.activeWeekIso);
      const nextAssignments = { ...current.assignments };
      for (const worker of prev.workers) {
        if (worker.defaultLineId && !current.assignments[worker.id]?.[dayKey]) {
          nextAssignments[worker.id] = {
            ...(nextAssignments[worker.id] ?? {}),
            [dayKey]: { lineId: worker.defaultLineId },
          };
        }
      }
      return {
        ...prev,
        isDemoData: false,
        weeks: {
          ...prev.weeks,
          [prev.activeWeekIso]: {
            ...current,
            assignments: nextAssignments,
          },
        },
      };
    });
  };

  const handleSuggestFairRotation = (
    dayKey: DayKey,
    targets: LineDistributionTarget[],
    overwriteExisting: boolean
  ): FairDistributionResult => {
    const result = suggestFairDayAssignments(
      state.workers,
      activeWeek,
      dayKey,
      targets,
      overwriteExisting
    );
    if (result.totalAssigned === 0) return result;

    setState((prev) => {
      pushUndoSnapshot(prev.weeks);
      const current = prev.weeks[prev.activeWeekIso] ?? createEmptyWeek(prev.activeWeekIso);
      const nextAssignments = { ...current.assignments };
      for (const [workerId, entry] of Object.entries(result.assignments)) {
        nextAssignments[workerId] = {
          ...(nextAssignments[workerId] ?? {}),
          [dayKey]: entry,
        };
      }
      return {
        ...prev,
        isDemoData: false,
        weeks: {
          ...prev.weeks,
          [prev.activeWeekIso]: {
            ...current,
            assignments: nextAssignments,
          },
        },
      };
    });

    return result;
  };

  const handleUpdateDayNote = (dayKey: DayKey, text: string) => {
    setState((prev) => {
      const current = prev.weeks[prev.activeWeekIso] ?? createEmptyWeek(prev.activeWeekIso);
      return {
        ...prev,
        weeks: {
          ...prev.weeks,
          [prev.activeWeekIso]: {
            ...current,
            dayNotes: {
              ...(current.dayNotes ?? {}),
              [dayKey]: text,
            },
          },
        },
      };
    });
  };

  const handleAddWorker = (workerData: Omit<Worker, 'id' | 'active'>) => {
    const newWorker: Worker = {
      ...workerData,
      id: `w_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      active: true,
    };
    setState((prev) => ({
      ...prev,
      isDemoData: false,
      workers: [...prev.workers, newWorker],
    }));
  };

  const handleQuickAddWorker = (name: string) => {
    handleAddWorker({
      name,
      role: 'عامل إنتاج',
      defaultLineId: 'antinal',
    });
  };

  const handleBulkAddWorkers = (names: string[]) => {
    const now = Date.now();
    const added: Worker[] = names.map((name, i) => ({
      id: `w_${now}_${i}`,
      name,
      role: 'عامل إنتاج',
      defaultLineId: 'antinal',
      active: true,
    }));
    setState((prev) => ({
      ...prev,
      isDemoData: false,
      workers: [...prev.workers, ...added],
    }));
  };

  const handleFillUpTo40Workers = () => {
    setState((prev) => {
      const needed = 40 - prev.workers.length;
      if (needed <= 0) return prev;
      const now = Date.now();
      const extra: Worker[] = Array.from({ length: needed }, (_, i) => {
        const idx = prev.workers.length + i + 1;
        return {
          id: `w_${now}_${idx}`,
          name: `عامل ${idx}`,
          role: 'عامل إنتاج',
          defaultLineId: idx <= 18 ? 'antinal' : idx <= 38 ? 'apidone' : 'printing',
          active: true,
        };
      });
      return {
        ...prev,
        isDemoData: false,
        workers: [...prev.workers, ...extra],
      };
    });
  };

  const handleUpdateWorker = (id: string, patch: Partial<Omit<Worker, 'id'>>) => {
    setState((prev) => ({
      ...prev,
      isDemoData: false,
      workers: prev.workers.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    }));
  };

  const handleDeleteWorker = (id: string) => {
    setState((prev) => ({
      ...prev,
      isDemoData: false,
      workers: prev.workers.filter((w) => w.id !== id),
    }));
    if (selectedWorkerId === id) setSelectedWorkerId(null);
  };

  const handleAddLine = (lineData: Omit<WorkLine, 'id'>) => {
    const newLine: WorkLine = {
      ...lineData,
      id: `line_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    };
    setState((prev) => ({
      ...prev,
      lines: [...prev.lines, newLine],
    }));
  };

  const handleUpdateLine = (id: string, patch: Partial<Omit<WorkLine, 'id'>>) => {
    setState((prev) => ({
      ...prev,
      lines: prev.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  };

  const handleDeleteLine = (id: string) => {
    setState((prev) => ({
      ...prev,
      lines: prev.lines.filter((l) => l.id !== id || l.isProtected),
      workers: prev.workers.map((w) =>
        w.fixedLineId === id ? { ...w, fixedLineId: undefined } : w
      ),
    }));
  };

  const handleClearDemoData = () => {
    const currentSat = getSaturdayIso();
    setUndoStack([]);
    setState({
      workers: createBlank40Workers(),
      lines: DEFAULT_LINES,
      weeks: {
        [currentSat]: createEmptyWeek(currentSat),
      },
      activeWeekIso: currentSat,
      isDemoData: false,
    });
    setActiveTab('team');
  };

  const handleOpenWorkerDetails = (workerId: string) => {
    setSelectedWorkerId(workerId);
    setActiveTab('summary');
  };

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    mobileLabel: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    {
      id: 'weekly',
      label: 'الجدول الأسبوعي',
      mobileLabel: 'الجدول',
      icon: CalendarDays,
    },
    {
      id: 'daily',
      label: 'تسجيل اليوم',
      mobileLabel: 'اليوم',
      icon: ClipboardCheck,
    },
    {
      id: 'summary',
      label: 'ملخص الحساب',
      mobileLabel: 'الحساب',
      icon: BarChart3,
    },
    {
      id: 'team',
      label: 'العمال والخطوط',
      mobileLabel: 'الفريق',
      icon: Users,
    },
  ];

  const modalReportText = useMemo(() => {
    if (!showReportModal) return '';
    if (reportTab === 'daily') {
      const todayKey = getTodayDayKey();
      const validDay: DayKey =
        todayKey === 'fri' && !activeWeek.includeFriday ? 'thu' : todayKey;
      return buildDailyWhatsappReport(state.workers, state.lines, activeWeek, validDay);
    }
    return buildWeeklyWhatsappReport(activeSummaries, state.lines, activeWeek);
  }, [showReportModal, reportTab, state.workers, state.lines, activeWeek, activeSummaries]);

  const handleCopyModalReport = async () => {
    try {
      await navigator.clipboard.writeText(modalReportText);
      setCopiedModal(true);
      window.setTimeout(() => setCopiedModal(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 transition-colors pb-[calc(76px+env(safe-area-inset-bottom,0px))] lg:pb-10"
    >
      {/* Top Bar Contract: strictly 3 clean zones, single row */}
      <header className="sticky top-0 z-40 pt-safe bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 print:hidden">
        <div className="max-w-[1320px] mx-auto h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('weekly')}
            className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            متابع خطوط الإنتاج
          </button>

          <nav
            aria-label="أقسام البرنامج"
            className="hidden lg:flex items-center gap-7"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-2 text-sm font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                    active
                      ? 'border-teal-700 text-teal-800 dark:border-teal-400 dark:text-teal-300'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="min-h-[38px] px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              <span>تقرير واتساب</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1320px] w-full mx-auto px-3.5 sm:px-6 py-5 sm:py-6">
        {activeTab === 'weekly' && (
          <WeeklyGridView
            workers={state.workers}
            lines={state.lines}
            week={activeWeek}
            hasPreviousWeekData={hasPreviousWeekData}
            canUndo={undoStack.length > 0}
            isDemoData={state.isDemoData}
            onChangeWeek={handleChangeWeek}
            onChangeShiftType={handleChangeShiftType}
            onToggleFriday={handleToggleFriday}
            onSetAssignment={handleSetAssignment}
            onQuickAddWorker={handleQuickAddWorker}
            onCopyDayToDay={handleCopyDayToDay}
            onCopyFromPreviousWeek={handleCopyFromPreviousWeek}
            onUndo={handleUndo}
            onClearDemoData={handleClearDemoData}
            onSelectWorkerDetails={handleOpenWorkerDetails}
          />
        )}

        {activeTab === 'daily' && (
          <DailyRollCallView
            workers={state.workers}
            lines={state.lines}
            week={activeWeek}
            onSetAssignment={handleSetAssignment}
            onCopyDayToDay={handleCopyDayToDay}
            onApplyDefaultsForDay={handleApplyDefaultsForDay}
            onSuggestFairRotation={handleSuggestFairRotation}
            onUpdateDayNote={handleUpdateDayNote}
            onUpdateWorker={handleUpdateWorker}
          />
        )}

        {activeTab === 'summary' && (
          <SummaryReportsView
            workers={state.workers}
            lines={state.lines}
            activeWeek={activeWeek}
            allWeeks={state.weeks}
            selectedWorkerId={selectedWorkerId}
            onSelectWorker={setSelectedWorkerId}
          />
        )}

        {activeTab === 'team' && (
          <WorkersLinesView
            workers={state.workers}
            lines={state.lines}
            fullState={state}
            onAddWorker={handleAddWorker}
            onBulkAddWorkers={handleBulkAddWorkers}
            onFillUpTo40Workers={handleFillUpTo40Workers}
            onUpdateWorker={handleUpdateWorker}
            onDeleteWorker={handleDeleteWorker}
            onAddLine={handleAddLine}
            onUpdateLine={handleUpdateLine}
            onDeleteLine={handleDeleteLine}
            onImportState={(imported) => {
              setUndoStack([]);
              setState(imported);
            }}
          />
        )}
      </main>

      <footer className="max-w-[1320px] w-full mx-auto px-4 sm:px-6 pt-2 pb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-800/80 print:hidden">
        <span>جميع البيانات محفوظة تلقائياً على جهازك وتعمل بدون إنترنت.</span>
        <button
          type="button"
          onClick={() => setDarkMode((v) => !v)}
          className="min-h-[36px] px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          <span>{darkMode ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
        </button>
      </footer>

      {showReportModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-0 sm:p-4 print:hidden"
          onClick={() => setShowReportModal(false)}
        >
          <div
            className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-5 pb-safe space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                تقرير جاهز للنسخ على واتساب
              </h3>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                aria-label="إغلاق"
                className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 w-full">
              <button
                type="button"
                onClick={() => setReportTab('weekly')}
                className={`flex-1 min-h-[36px] rounded-lg text-xs font-bold transition-colors ${
                  reportTab === 'weekly'
                    ? 'bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                التقرير الأسبوعي الشامل
              </button>
              <button
                type="button"
                onClick={() => setReportTab('daily')}
                className={`flex-1 min-h-[36px] rounded-lg text-xs font-bold transition-colors ${
                  reportTab === 'daily'
                    ? 'bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                توزيع النهاردة
              </button>
            </div>

            <textarea
              readOnly
              rows={10}
              value={modalReportText}
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs leading-6 text-slate-800 dark:text-slate-200 font-sans"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={handleCopyModalReport}
                className="min-h-[42px] px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5"
              >
                {copiedModal ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copiedModal ? 'اتنسخ التقرير!' : 'نسخ التقرير'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="التنقل السريع للموبايل"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 print:hidden"
      >
        <div className="h-16 grid grid-cols-4 items-center px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
                  active
                    ? 'text-teal-700 dark:text-teal-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 font-medium'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[11px] leading-none whitespace-nowrap">
                  {item.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
