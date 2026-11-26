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
  NIGHT_SHIFT_LABEL,
  SHIFT_GROUP_LABELS,
  ShiftGroupId,
  TrackerState,
  WeekRecord,
  WorkLine,
  Worker,
  createBlank40Workers,
  createEmptyWeek,
  createInitialDemoState,
  getSaturdayIso,
  getTodayDayKey,
  getWorkerFixedLineIds,
  getWorkerGroupId,
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

function ensureTwoGroupsAndNightShift(parsed: Partial<TrackerState>): TrackerState {
  const activeWeekIso = parsed.activeWeekIso || getSaturdayIso();
  const rawWeeks = parsed.weeks ?? {};
  const weeks: Record<string, WeekRecord> = {};
  for (const [k, w] of Object.entries(rawWeeks)) {
    weeks[k] = {
      ...w,
      shiftType: 'night',
      activeGroupId: w.activeGroupId ?? 'groupA',
    };
  }
  if (!weeks[activeWeekIso]) {
    weeks[activeWeekIso] = createEmptyWeek(activeWeekIso, 'groupA');
  }

  let lines = Array.isArray(parsed.lines) ? parsed.lines : DEFAULT_LINES;
  if ((parsed.schemaVersion ?? 0) < 3 && !lines.some((l) => l.id === 'drops_line')) {
    const dropsDef = DEFAULT_LINES.find((l) => l.id === 'drops_line');
    if (dropsDef) {
      const bbcIdx = lines.findIndex((l) => l.id === 'bbc');
      const insertAt = bbcIdx >= 0 ? bbcIdx + 1 : lines.length;
      lines = [...lines.slice(0, insertAt), dropsDef, ...lines.slice(insertAt)];
    }
  }

  // Ensure every existing worker has groupId and that Group B has its own 40 workers ready
  let workers: Worker[] = (parsed.workers ?? []).map((w) => ({
    ...w,
    groupId: getWorkerGroupId(w),
  }));

  const hasGroupB = workers.some((w) => getWorkerGroupId(w) === 'groupB');
  if (!hasGroupB) {
    workers = [...workers, ...createBlank40Workers('groupB')];
  }

  const activeGroupId: ShiftGroupId =
    parsed.activeGroupId === 'groupB' ? 'groupB' : 'groupA';

  return {
    workers,
    lines,
    weeks,
    activeWeekIso,
    activeGroupId,
    isDemoData: Boolean(parsed.isDemoData),
    schemaVersion: 4,
  };
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
        return ensureTwoGroupsAndNightShift(parsed);
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
        return ensureTwoGroupsAndNightShift({
          ...parsed,
          lines: mergeLinesWithDefaults(parsed.lines),
          isDemoData: false,
        });
      }
    }
  } catch {
    // fall back to fresh 40+40 night-shift demo data
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

  const activeGroupId: ShiftGroupId = state.activeGroupId === 'groupB' ? 'groupB' : 'groupA';
  const activeGroupLabel = SHIFT_GROUP_LABELS[activeGroupId];

  const groupACount = useMemo(
    () => state.workers.filter((w) => getWorkerGroupId(w) === 'groupA').length,
    [state.workers]
  );
  const groupBCount = useMemo(
    () => state.workers.filter((w) => getWorkerGroupId(w) === 'groupB').length,
    [state.workers]
  );

  const activeGroupWorkers = useMemo(
    () => state.workers.filter((w) => getWorkerGroupId(w) === activeGroupId),
    [state.workers, activeGroupId]
  );

  const activeWeek = useMemo(() => {
    return state.weeks[state.activeWeekIso] ?? createEmptyWeek(state.activeWeekIso, activeGroupId);
  }, [state.weeks, state.activeWeekIso, activeGroupId]);

  // Look back up to 3 weeks to find the most recent recorded week for the active group (supports week-on / week-off alternation!)
  const lastGroupWeekIso = useMemo(() => {
    const groupWorkerIds = new Set(activeGroupWorkers.map((w) => w.id));
    for (const delta of [-7, -14, -21]) {
      const candidateIso = shiftIsoDays(state.activeWeekIso, delta);
      const cw = state.weeks[candidateIso];
      if (!cw) continue;
      const hasData = Object.entries(cw.assignments).some(
        ([wid, days]) => groupWorkerIds.has(wid) && Object.keys(days ?? {}).length > 0
      );
      if (hasData) return candidateIso;
    }
    return null;
  }, [state.weeks, state.activeWeekIso, activeGroupWorkers]);

  const hasPreviousWeekData = lastGroupWeekIso !== null;

  const activeSummaries = useMemo(
    () => computeWeekWorkerSummaries(activeGroupWorkers, state.lines, activeWeek),
    [activeGroupWorkers, state.lines, activeWeek]
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

  const handleSwitchGroup = (nextGroup: ShiftGroupId) => {
    setSelectedWorkerId(null);
    setState((prev) => {
      const current = prev.weeks[prev.activeWeekIso] ?? createEmptyWeek(prev.activeWeekIso, nextGroup);
      return {
        ...prev,
        activeGroupId: nextGroup,
        weeks: {
          ...prev.weeks,
          [prev.activeWeekIso]: {
            ...current,
            activeGroupId: nextGroup,
          },
        },
      };
    });
  };

  const handleChangeWeek = (newSatIso: string) => {
    setSelectedWorkerId(null);
    setState((prev) => {
      const currGroup: ShiftGroupId = prev.activeGroupId === 'groupB' ? 'groupB' : 'groupA';
      const existingTarget = prev.weeks[newSatIso];
      if (existingTarget) {
        const targetGroup: ShiftGroupId = existingTarget.activeGroupId ?? currGroup;
        return {
          ...prev,
          activeWeekIso: newSatIso,
          activeGroupId: targetGroup,
        };
      }
      // Brand-new week: automatically alternate Group A <-> Group B (أسبوع وأسبوع)
      const alternatedGroup: ShiftGroupId = currGroup === 'groupA' ? 'groupB' : 'groupA';
      return {
        ...prev,
        activeWeekIso: newSatIso,
        activeGroupId: alternatedGroup,
        weeks: {
          ...prev.weeks,
          [newSatIso]: createEmptyWeek(newSatIso, alternatedGroup),
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
      const grp: ShiftGroupId = prev.activeGroupId === 'groupB' ? 'groupB' : 'groupA';
      const current = prev.weeks[prev.activeWeekIso] ?? createEmptyWeek(prev.activeWeekIso, grp);
      const nextAssignments = { ...current.assignments };
      for (const worker of prev.workers) {
        if (getWorkerGroupId(worker) !== grp) continue;
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
    if (!lastGroupWeekIso) return;
    setState((prev) => {
      const prevW = prev.weeks[lastGroupWeekIso];
      if (!prevW) return prev;
      pushUndoSnapshot(prev.weeks);
      const grp: ShiftGroupId = prev.activeGroupId === 'groupB' ? 'groupB' : 'groupA';
      const groupIds = new Set(
        prev.workers.filter((w) => getWorkerGroupId(w) === grp).map((w) => w.id)
      );
      const current = prev.weeks[prev.activeWeekIso] ?? createEmptyWeek(prev.activeWeekIso, grp);
      const nextAssignments: WeekRecord['assignments'] = { ...current.assignments };
      for (const [workerId, days] of Object.entries(prevW.assignments)) {
        if (!groupIds.has(workerId)) continue;
        nextAssignments[workerId] = {};
        for (const [dayKey, entry] of Object.entries(days ?? {})) {
          if (entry && entry.lineId !== 'absent' && entry.lineId !== 'leave') {
            nextAssignments[workerId][dayKey as DayKey] = {
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
            assignments: nextAssignments,
          },
        },
      };
    });
  };

  const handleApplyDefaultsForDay = (dayKey: DayKey) => {
    setState((prev) => {
      pushUndoSnapshot(prev.weeks);
      const grp: ShiftGroupId = prev.activeGroupId === 'groupB' ? 'groupB' : 'groupA';
      const current = prev.weeks[prev.activeWeekIso] ?? createEmptyWeek(prev.activeWeekIso, grp);
      const nextAssignments = { ...current.assignments };
      for (const worker of prev.workers) {
        if (getWorkerGroupId(worker) !== grp) continue;
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
      activeGroupWorkers,
      state.lines,
      activeWeek,
      dayKey,
      targets,
      overwriteExisting
    );
    if (result.totalAssigned === 0) return result;

    setState((prev) => {
      pushUndoSnapshot(prev.weeks);
      const grp: ShiftGroupId = prev.activeGroupId === 'groupB' ? 'groupB' : 'groupA';
      const current = prev.weeks[prev.activeWeekIso] ?? createEmptyWeek(prev.activeWeekIso, grp);
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
      groupId: workerData.groupId ?? activeGroupId,
      id: `w_${activeGroupId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
      groupId: activeGroupId,
      defaultLineId: 'antinal',
    });
  };

  const handleBulkAddWorkers = (names: string[]) => {
    const now = Date.now();
    const added: Worker[] = names.map((name, i) => ({
      id: `w_${activeGroupId}_${now}_${i}`,
      name,
      role: 'عامل إنتاج',
      groupId: activeGroupId,
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
      const grp: ShiftGroupId = prev.activeGroupId === 'groupB' ? 'groupB' : 'groupA';
      const currentGroupCount = prev.workers.filter((w) => getWorkerGroupId(w) === grp).length;
      const needed = 40 - currentGroupCount;
      if (needed <= 0) return prev;
      const now = Date.now();
      const prefix = grp === 'groupA' ? 'أ' : 'ب';
      const extra: Worker[] = Array.from({ length: needed }, (_, i) => {
        const idx = currentGroupCount + i + 1;
        return {
          id: `w_${grp}_${now}_${idx}`,
          name: `عامل ${prefix} ${idx}`,
          role: 'عامل إنتاج',
          groupId: grp,
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
      workers: prev.workers.map((w) => {
        const nextFixed = getWorkerFixedLineIds(w).filter((fid) => fid !== id);
        return {
          ...w,
          fixedLineId: undefined,
          fixedLineIds: nextFixed.length > 0 ? nextFixed : undefined,
        };
      }),
    }));
  };

  const handleClearDemoData = () => {
    const currentSat = getSaturdayIso();
    setUndoStack([]);
    setState({
      workers: [
        ...createBlank40Workers('groupA'),
        ...createBlank40Workers('groupB'),
      ],
      lines: DEFAULT_LINES,
      weeks: {
        [currentSat]: createEmptyWeek(currentSat, 'groupA'),
      },
      activeWeekIso: currentSat,
      activeGroupId: 'groupA',
      isDemoData: false,
      schemaVersion: 4,
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
      return buildDailyWhatsappReport(
        activeGroupWorkers,
        state.lines,
        activeWeek,
        validDay,
        activeGroupLabel
      );
    }
    return buildWeeklyWhatsappReport(
      activeSummaries,
      state.lines,
      activeWeek,
      activeGroupLabel
    );
  }, [
    showReportModal,
    reportTab,
    activeGroupWorkers,
    state.lines,
    activeWeek,
    activeSummaries,
    activeGroupLabel,
  ]);

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

      <main className="flex-1 max-w-[1320px] w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* Alternating Night-Shift Group Switcher (2 Groups × 40 Workers, Week-on / Week-off) */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 print:hidden">
          <div className="flex items-center gap-2 text-xs">
            <Moon className="w-4 h-4 text-indigo-700 dark:text-indigo-400 shrink-0" />
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {NIGHT_SHIFT_LABEL}
            </span>
            <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
              · تبديل أسبوع وأسبوع بين المجموعتين
            </span>
          </div>

          <div className="grid grid-cols-2 sm:inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleSwitchGroup('groupA')}
              className={`min-h-[36px] px-3.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors tabular-nums ${
                activeGroupId === 'groupA'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {SHIFT_GROUP_LABELS.groupA} ({groupACount})
            </button>
            <button
              type="button"
              onClick={() => handleSwitchGroup('groupB')}
              className={`min-h-[36px] px-3.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors tabular-nums ${
                activeGroupId === 'groupB'
                  ? 'bg-indigo-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {SHIFT_GROUP_LABELS.groupB} ({groupBCount})
            </button>
          </div>
        </div>

        {activeTab === 'weekly' && (
          <WeeklyGridView
            workers={activeGroupWorkers}
            lines={state.lines}
            week={activeWeek}
            groupLabel={activeGroupLabel}
            hasPreviousWeekData={hasPreviousWeekData}
            canUndo={undoStack.length > 0}
            isDemoData={state.isDemoData}
            onChangeWeek={handleChangeWeek}
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
            workers={activeGroupWorkers}
            lines={state.lines}
            week={activeWeek}
            groupLabel={activeGroupLabel}
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
            workers={activeGroupWorkers}
            lines={state.lines}
            activeWeek={activeWeek}
            allWeeks={state.weeks}
            groupLabel={activeGroupLabel}
            selectedWorkerId={selectedWorkerId}
            onSelectWorker={setSelectedWorkerId}
          />
        )}

        {activeTab === 'team' && (
          <WorkersLinesView
            workers={activeGroupWorkers}
            lines={state.lines}
            fullState={state}
            groupLabel={activeGroupLabel}
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
              setState(ensureTwoGroupsAndNightShift(imported));
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
