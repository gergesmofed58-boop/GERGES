import {
  AssignmentEntry,
  DayKey,
  SHIFT_LABELS,
  WEEK_DAYS,
  WeekRecord,
  WorkLine,
  Worker,
  formatArabicShortDate,
  formatWeekRangeAr,
  shiftIsoDays,
} from './types';

export interface WorkerSummary {
  worker: Worker;
  countsByLine: Record<string, number>;
  totalWorkedDays: number;
  productionDays: number;
  otherDeptDays: number;
  absentDays: number;
  leaveDays: number;
  unassignedDays: number;
  totalOvertimeHours: number;
  dayDetails: Array<{
    dayKey: DayKey;
    dayLabel: string;
    line: WorkLine | null;
    secondLine: WorkLine | null;
    overtimeHours: number;
    note?: string;
  }>;
  maxConsecutiveSameLine: {
    lineId: string;
    lineName: string;
    days: number;
  } | null;
}

export interface DayCoverage {
  dayKey: DayKey;
  dayLabel: string;
  dateLabel: string;
  countsByLine: Record<string, number>;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  unassignedCount: number;
  totalOvertimeHours: number;
}

export interface LineDistributionTarget {
  lineId: string;
  targetCount: number;
}

export interface FairDistributionResult {
  assignments: Record<string, AssignmentEntry>;
  totalAssigned: number;
  fixedLockedCount: number;
  returnedFromOffCount: number;
  rotatedToNewLineCount: number;
  repeatedLineCount: number;
  remainingReserveCount: number;
}

export function getVisibleDays(includeFriday: boolean) {
  return includeFriday ? WEEK_DAYS : WEEK_DAYS.filter((d) => d.key !== 'fri');
}

export function formatNumClean(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function accumulateLineWeight(
  line: WorkLine,
  weight: number,
  countsByLine: Record<string, number>,
  totals: {
    totalWorkedDays: number;
    productionDays: number;
    otherDeptDays: number;
    absentDays: number;
    leaveDays: number;
  }
) {
  countsByLine[line.id] = Math.round(((countsByLine[line.id] ?? 0) + weight) * 10) / 10;
  if (line.category === 'production') {
    totals.totalWorkedDays += weight;
    totals.productionDays += weight;
  } else if (line.category === 'department') {
    totals.totalWorkedDays += weight;
    totals.otherDeptDays += weight;
  } else if (line.id === 'absent') {
    totals.absentDays += weight;
  } else {
    totals.leaveDays += weight;
  }
}

export function computeWeekWorkerSummaries(
  workers: Worker[],
  lines: WorkLine[],
  week: WeekRecord
): WorkerSummary[] {
  const lineMap = new Map(lines.map((l) => [l.id, l]));
  const visibleDays = getVisibleDays(week.includeFriday);

  return workers.map((worker) => {
    const countsByLine: Record<string, number> = {};
    for (const line of lines) countsByLine[line.id] = 0;

    const totals = {
      totalWorkedDays: 0,
      productionDays: 0,
      otherDeptDays: 0,
      absentDays: 0,
      leaveDays: 0,
    };
    let unassignedDays = 0;
    let totalOvertimeHours = 0;

    const workerDays = week.assignments[worker.id] ?? {};
    const dayDetails: WorkerSummary['dayDetails'] = [];

    let streakLineId = '';
    let streakLen = 0;
    let bestStreak: WorkerSummary['maxConsecutiveSameLine'] = null;

    for (const day of visibleDays) {
      const entry = workerDays[day.key];
      const line = entry ? lineMap.get(entry.lineId) ?? null : null;
      const secondLine =
        entry?.secondLineId && entry.secondLineId !== entry.lineId
          ? lineMap.get(entry.secondLineId) ?? null
          : null;
      const ot = entry?.overtimeHours ?? 0;

      dayDetails.push({
        dayKey: day.key,
        dayLabel: day.label,
        line,
        secondLine,
        overtimeHours: ot,
        note: entry?.note,
      });

      if (!line) {
        unassignedDays += 1;
        streakLineId = '';
        streakLen = 0;
        continue;
      }

      totalOvertimeHours += ot;

      if (secondLine) {
        accumulateLineWeight(line, 0.5, countsByLine, totals);
        accumulateLineWeight(secondLine, 0.5, countsByLine, totals);
        streakLineId = '';
        streakLen = 0;
      } else {
        accumulateLineWeight(line, 1, countsByLine, totals);
        if (line.category !== 'absence') {
          if (line.id === streakLineId) {
            streakLen += 1;
          } else {
            streakLineId = line.id;
            streakLen = 1;
          }
          if (streakLen >= 4 && (!bestStreak || streakLen > bestStreak.days)) {
            bestStreak = { lineId: line.id, lineName: line.name, days: streakLen };
          }
        } else {
          streakLineId = '';
          streakLen = 0;
        }
      }
    }

    return {
      worker,
      countsByLine,
      totalWorkedDays: Math.round(totals.totalWorkedDays * 10) / 10,
      productionDays: Math.round(totals.productionDays * 10) / 10,
      otherDeptDays: Math.round(totals.otherDeptDays * 10) / 10,
      absentDays: Math.round(totals.absentDays * 10) / 10,
      leaveDays: Math.round(totals.leaveDays * 10) / 10,
      unassignedDays,
      totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
      dayDetails,
      maxConsecutiveSameLine: bestStreak,
    };
  });
}

export function computeCumulativeWorkerSummaries(
  workers: Worker[],
  lines: WorkLine[],
  weeks: Record<string, WeekRecord>
): WorkerSummary[] {
  const lineMap = new Map(lines.map((l) => [l.id, l]));
  const allWeeks = Object.values(weeks);

  return workers.map((worker) => {
    const countsByLine: Record<string, number> = {};
    for (const line of lines) countsByLine[line.id] = 0;

    const totals = {
      totalWorkedDays: 0,
      productionDays: 0,
      otherDeptDays: 0,
      absentDays: 0,
      leaveDays: 0,
    };
    let unassignedDays = 0;
    let totalOvertimeHours = 0;

    for (const week of allWeeks) {
      const visibleDays = getVisibleDays(week.includeFriday);
      const workerDays = week.assignments[worker.id] ?? {};
      for (const day of visibleDays) {
        const entry = workerDays[day.key];
        const line = entry ? lineMap.get(entry.lineId) ?? null : null;
        const secondLine =
          entry?.secondLineId && entry.secondLineId !== entry.lineId
            ? lineMap.get(entry.secondLineId) ?? null
            : null;
        if (!line) {
          unassignedDays += 1;
          continue;
        }
        totalOvertimeHours += entry?.overtimeHours ?? 0;
        if (secondLine) {
          accumulateLineWeight(line, 0.5, countsByLine, totals);
          accumulateLineWeight(secondLine, 0.5, countsByLine, totals);
        } else {
          accumulateLineWeight(line, 1, countsByLine, totals);
        }
      }
    }

    return {
      worker,
      countsByLine,
      totalWorkedDays: Math.round(totals.totalWorkedDays * 10) / 10,
      productionDays: Math.round(totals.productionDays * 10) / 10,
      otherDeptDays: Math.round(totals.otherDeptDays * 10) / 10,
      absentDays: Math.round(totals.absentDays * 10) / 10,
      leaveDays: Math.round(totals.leaveDays * 10) / 10,
      unassignedDays,
      totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
      dayDetails: [],
      maxConsecutiveSameLine: null,
    };
  });
}

export function computeWeekDayCoverage(
  workers: Worker[],
  lines: WorkLine[],
  week: WeekRecord
): DayCoverage[] {
  const lineMap = new Map(lines.map((l) => [l.id, l]));
  const visibleDays = getVisibleDays(week.includeFriday);

  return visibleDays.map((day) => {
    const countsByLine: Record<string, number> = {};
    for (const line of lines) countsByLine[line.id] = 0;

    let presentCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let unassignedCount = 0;
    let totalOvertimeHours = 0;

    for (const worker of workers) {
      const entry = week.assignments[worker.id]?.[day.key];
      const line = entry ? lineMap.get(entry.lineId) ?? null : null;
      const secondLine =
        entry?.secondLineId && entry.secondLineId !== entry.lineId
          ? lineMap.get(entry.secondLineId) ?? null
          : null;

      if (!line) {
        unassignedCount += 1;
        continue;
      }

      totalOvertimeHours += entry?.overtimeHours ?? 0;

      if (secondLine) {
        countsByLine[line.id] = Math.round(((countsByLine[line.id] ?? 0) + 0.5) * 10) / 10;
        countsByLine[secondLine.id] =
          Math.round(((countsByLine[secondLine.id] ?? 0) + 0.5) * 10) / 10;
        if (line.category !== 'absence' || secondLine.category !== 'absence') {
          presentCount += 1;
        }
      } else {
        countsByLine[line.id] = (countsByLine[line.id] ?? 0) + 1;
        if (line.category === 'absence') {
          if (line.id === 'absent') absentCount += 1;
          else leaveCount += 1;
        } else {
          presentCount += 1;
        }
      }
    }

    const iso = shiftIsoDays(week.weekStartIso, day.offsetFromSat);
    return {
      dayKey: day.key,
      dayLabel: day.label,
      dateLabel: formatArabicShortDate(iso),
      countsByLine,
      presentCount,
      absentCount,
      leaveCount,
      unassignedCount,
      totalOvertimeHours,
    };
  });
}

/**
 * Capacity-Aware Fair Rotation Distributor:
 * 1. Keeps anyone marked absent/leave today (and any already-assigned worker unless overwriteExistingWork=true).
 * 2. Fixed Line Operators (`worker.fixedLineId`): Whenever their fixed line IS running today, they stay
 *    outside fair rotation — placed directly onto their own fixed line and deducted from its required slots.
 *    If their fixed line is NOT running today, they join the rotating pool normally.
 * 3. Priority #1: Workers who were ABSENT, ON LEAVE, or OFF the previous day (e.g., missed Saturday)
 *    are automatically prioritized to go straight onto today's running lines (e.g., Sunday).
 * 4. Strict Anti-Repeat Rotation: Workers who worked on Line X yesterday are routed to a DIFFERENT
 *    running line today, balancing weekly line counts fairly.
 * 5. Pairwise Swap Polish: Eliminates any avoidable repeat of yesterday's line across all running lines.
 */
export function suggestFairDayAssignments(
  workers: Worker[],
  week: WeekRecord,
  targetDay: DayKey,
  targets: LineDistributionTarget[],
  overwriteExistingWork = false
): FairDistributionResult {
  const activeTargets = targets.filter((t) => t.targetCount > 0);
  if (activeTargets.length === 0) {
    return {
      assignments: {},
      totalAssigned: 0,
      fixedLockedCount: 0,
      returnedFromOffCount: 0,
      rotatedToNewLineCount: 0,
      repeatedLineCount: 0,
      remainingReserveCount: 0,
    };
  }

  const visibleDays = getVisibleDays(week.includeFriday);
  const targetIdx = visibleDays.findIndex((d) => d.key === targetDay);
  const prevDayKey = targetIdx > 0 ? visibleDays[targetIdx - 1].key : null;

  const runningLineIdSet = new Set(activeTargets.map((t) => t.lineId));

  // Remaining slots needed per selected running line
  const remainingSlots: Record<string, number> = {};
  for (const t of activeTargets) {
    remainingSlots[t.lineId] = t.targetCount;
  }

  const assignments: Record<string, AssignmentEntry> = {};
  let fixedLockedCount = 0;

  // Step 1: Separate absent/leave, fixed operators whose line is running today, already-assigned, and eligible rotating pool
  const eligibleWorkers: Worker[] = [];
  for (const worker of workers) {
    const existing = week.assignments[worker.id]?.[targetDay];
    if (existing?.lineId === 'absent' || existing?.lineId === 'leave') {
      continue;
    }

    const isFixedAndRunningToday =
      Boolean(worker.fixedLineId) && runningLineIdSet.has(worker.fixedLineId!);

    if (isFixedAndRunningToday) {
      const fixedId = worker.fixedLineId!;
      if (existing && !overwriteExistingWork) {
        // Respect supervisor's manual entry for today and count their slot
        if (remainingSlots[existing.lineId] !== undefined) {
          remainingSlots[existing.lineId] = Math.max(0, remainingSlots[existing.lineId] - 1);
        }
        if (existing.lineId === fixedId) {
          fixedLockedCount += 1;
        }
        continue;
      }
      // Automatically place fixed operator directly onto their fixed line (outside fair rotation)
      assignments[worker.id] = { lineId: fixedId };
      remainingSlots[fixedId] = Math.max(0, (remainingSlots[fixedId] ?? 0) - 1);
      fixedLockedCount += 1;
      continue;
    }

    if (existing && !overwriteExistingWork) {
      if (remainingSlots[existing.lineId] !== undefined) {
        remainingSlots[existing.lineId] = Math.max(0, remainingSlots[existing.lineId] - 1);
      }
      continue;
    }

    eligibleWorkers.push(worker);
  }

  interface WorkerMeta {
    worker: Worker;
    lineCounts: Record<string, number>;
    prevLineIds: Set<string>;
    wasOffYesterday: boolean;
    totalWorkedSoFar: number;
  }

  const metas: WorkerMeta[] = eligibleWorkers.map((worker) => {
    const lineCounts: Record<string, number> = {};
    let totalWorkedSoFar = 0;

    for (const d of visibleDays) {
      if (d.key === targetDay) continue;
      const e = week.assignments[worker.id]?.[d.key];
      if (!e) continue;
      if (e.lineId !== 'absent' && e.lineId !== 'leave') {
        totalWorkedSoFar += 1;
      }
      if (e.secondLineId && e.secondLineId !== e.lineId) {
        lineCounts[e.lineId] = (lineCounts[e.lineId] ?? 0) + 0.5;
        lineCounts[e.secondLineId] = (lineCounts[e.secondLineId] ?? 0) + 0.5;
      } else {
        lineCounts[e.lineId] = (lineCounts[e.lineId] ?? 0) + 1;
      }
    }

    const prevEntry = prevDayKey ? week.assignments[worker.id]?.[prevDayKey] : undefined;
    const prevLineIds = new Set<string>();
    let wasOffYesterday = false;

    if (prevDayKey) {
      if (!prevEntry || prevEntry.lineId === 'absent' || prevEntry.lineId === 'leave') {
        wasOffYesterday = true;
      } else {
        prevLineIds.add(prevEntry.lineId);
        if (prevEntry.secondLineId) prevLineIds.add(prevEntry.secondLineId);
      }
    }

    return {
      worker,
      lineCounts,
      prevLineIds,
      wasOffYesterday,
      totalWorkedSoFar,
    };
  });

  // Sort eligible rotating workers strictly by priority:
  // 1) Workers who missed yesterday (absent / leave / unassigned on Saturday -> go straight onto Sunday's lines!)
  // 2) Workers with fewer total worked days so far this week
  // 3) Workers whose yesterday line IS running today (so they get placed onto a DIFFERENT line before open slots run out)
  metas.sort((a, b) => {
    if (a.wasOffYesterday !== b.wasOffYesterday) {
      return a.wasOffYesterday ? -1 : 1;
    }
    if (a.totalWorkedSoFar !== b.totalWorkedSoFar) {
      return a.totalWorkedSoFar - b.totalWorkedSoFar;
    }
    const aNeedsRotation = [...a.prevLineIds].some((id) => runningLineIdSet.has(id));
    const bNeedsRotation = [...b.prevLineIds].some((id) => runningLineIdSet.has(id));
    if (aNeedsRotation !== bNeedsRotation) {
      return aNeedsRotation ? -1 : 1;
    }
    return 0;
  });

  const assignedLineByWorker = new Map<string, string>();
  const metaByWorkerId = new Map(metas.map((m) => [m.worker.id, m]));

  // Assign each prioritized rotating worker to the fairest open running line (strongly avoiding yesterday's line)
  for (const meta of metas) {
    const openLines = activeTargets.filter((t) => (remainingSlots[t.lineId] ?? 0) > 0);
    if (openLines.length === 0) break;

    let bestLineId = openLines[0].lineId;
    let bestScore = Infinity;

    for (const candidate of openLines) {
      const workedSameYesterday = meta.prevLineIds.has(candidate.lineId);
      const weeklyOnCandidate = meta.lineCounts[candidate.lineId] ?? 0;
      // Massive penalty (+1000) for repeating yesterday's line so they ALWAYS move to a different line if possible
      let score = (workedSameYesterday ? 1000 : 0) + weeklyOnCandidate * 10;
      // Favor lines that still need more workers so big lines fill smoothly alongside smaller lines
      score -= (remainingSlots[candidate.lineId] ?? 0) * 0.15;
      if (score < bestScore) {
        bestScore = score;
        bestLineId = candidate.lineId;
      }
    }

    assignedLineByWorker.set(meta.worker.id, bestLineId);
    remainingSlots[bestLineId] -= 1;
  }

  // Pairwise Swap Polish (only across rotating pool — fixed operators are never touched)
  const assignedIds = Array.from(assignedLineByWorker.keys());
  for (let i = 0; i < assignedIds.length; i++) {
    const idA = assignedIds[i];
    const metaA = metaByWorkerId.get(idA)!;
    const lineA = assignedLineByWorker.get(idA)!;
    if (!metaA.prevLineIds.has(lineA)) continue;

    for (let j = 0; j < assignedIds.length; j++) {
      if (i === j) continue;
      const idB = assignedIds[j];
      const metaB = metaByWorkerId.get(idB)!;
      const lineB = assignedLineByWorker.get(idB)!;
      if (lineA === lineB) continue;

      if (!metaA.prevLineIds.has(lineB) && !metaB.prevLineIds.has(lineA)) {
        assignedLineByWorker.set(idA, lineB);
        assignedLineByWorker.set(idB, lineA);
        break;
      }
    }
  }

  let returnedFromOffCount = 0;
  let rotatedToNewLineCount = 0;
  let repeatedLineCount = 0;

  for (const [workerId, lineId] of assignedLineByWorker.entries()) {
    assignments[workerId] = { lineId };
    const meta = metaByWorkerId.get(workerId)!;
    if (meta.wasOffYesterday) {
      returnedFromOffCount += 1;
    } else if (meta.prevLineIds.size > 0) {
      if (meta.prevLineIds.has(lineId)) repeatedLineCount += 1;
      else rotatedToNewLineCount += 1;
    }
  }

  const totalAssigned = Object.keys(assignments).length;
  const remainingReserveCount = Math.max(0, eligibleWorkers.length - assignedLineByWorker.size);

  return {
    assignments,
    totalAssigned,
    fixedLockedCount,
    returnedFromOffCount,
    rotatedToNewLineCount,
    repeatedLineCount,
    remainingReserveCount,
  };
}

export function formatDaysArabic(n: number): string {
  const clean = Math.round(n * 10) / 10;
  if (clean === 0) return '0 يوم';
  if (clean === 0.5) return 'نص يوم';
  if (clean === 1) return 'يوم واحد';
  if (clean === 2) return 'يومين';
  if (Number.isInteger(clean) && clean <= 10) return `${clean} أيام`;
  return `${formatNumClean(clean)} يوم`;
}

export function buildWorkerWhatsappText(
  summary: WorkerSummary,
  lines: WorkLine[],
  periodLabel: string
): string {
  const parts: string[] = [];
  for (const line of lines) {
    const count = summary.countsByLine[line.id] ?? 0;
    if (count > 0) {
      parts.push(`• ${line.name}: ${formatDaysArabic(count)}`);
    }
  }

  return [
    `تقرير عمل — ${summary.worker.name}`,
    `الفترة: ${periodLabel}`,
    `إجمالي أيام الشغل: ${formatDaysArabic(summary.totalWorkedDays)} | الغياب: ${formatDaysArabic(summary.absentDays)}${
      summary.totalOvertimeHours > 0
        ? ` | إضافي: ${formatNumClean(summary.totalOvertimeHours)} ساعة`
        : ''
    }`,
    '--- التفاصيل ---',
    ...(parts.length > 0 ? parts : ['لا توجد أيام مسجلة بعد']),
  ].join('\n');
}

export function buildDailyWhatsappReport(
  workers: Worker[],
  lines: WorkLine[],
  week: WeekRecord,
  dayKey: DayKey
): string {
  const dayInfo = WEEK_DAYS.find((d) => d.key === dayKey) ?? WEEK_DAYS[0];
  const dateLabel = formatArabicShortDate(
    shiftIsoDays(week.weekStartIso, dayInfo.offsetFromSat)
  );
  const shiftLabel = SHIFT_LABELS[week.shiftType ?? 'morning'];
  const lineMap = new Map(lines.map((l) => [l.id, l]));

  const grouped = new Map<string, string[]>();
  const unassigned: string[] = [];

  for (const worker of workers) {
    const entry = week.assignments[worker.id]?.[dayKey];
    if (!entry) {
      unassigned.push(worker.name);
      continue;
    }
    const secondLine =
      entry.secondLineId && entry.secondLineId !== entry.lineId
        ? lineMap.get(entry.secondLineId)
        : undefined;
    const extras: string[] = [];
    if (secondLine) extras.push(`نص يوم + ${secondLine.shortName}`);
    if (entry.overtimeHours && entry.overtimeHours > 0) {
      extras.push(`+${entry.overtimeHours} س إضافي`);
    }
    if (entry.note) extras.push(entry.note);
    const label = extras.length > 0 ? `${worker.name} (${extras.join(' · ')})` : worker.name;

    const list = grouped.get(entry.lineId) ?? [];
    list.push(label);
    grouped.set(entry.lineId, list);
  }

  const out: string[] = [
    `توزيع خطوط الإنتاج — ${dayInfo.label} ${dateLabel}`,
    `${shiftLabel} | إجمالي الفريق: ${workers.length} فرد`,
    '------------------------',
  ];

  for (const line of lines) {
    const names = grouped.get(line.id);
    if (names && names.length > 0) {
      const cap =
        line.requiredWorkers && line.requiredWorkers > 0
          ? ` / المطلوب ${line.requiredWorkers}`
          : '';
      out.push(`${line.name} (${names.length}${cap}): ${names.join('، ')}`);
    }
  }

  if (unassigned.length > 0) {
    out.push(`غير مسجل (${unassigned.length}): ${unassigned.join('، ')}`);
  }

  const dayNote = week.dayNotes?.[dayKey]?.trim();
  if (dayNote) {
    out.push('------------------------');
    out.push(`ملاحظات الوردية: ${dayNote}`);
  }

  return out.join('\n');
}

export function buildWeeklyWhatsappReport(
  summaries: WorkerSummary[],
  lines: WorkLine[],
  week: WeekRecord
): string {
  const range = formatWeekRangeAr(week.weekStartIso, week.includeFriday);
  const shiftLabel = SHIFT_LABELS[week.shiftType ?? 'morning'];
  const out: string[] = [
    `الملخص الأسبوعي لخطوط الإنتاج`,
    `${shiftLabel} — الأسبوع: ${range}`,
    '========================',
  ];

  for (const s of summaries) {
    const lineBreakdown = lines
      .map((l) => {
        const c = s.countsByLine[l.id] ?? 0;
        return c > 0 ? `   - ${l.name}: ${formatNumClean(c)} يوم` : null;
      })
      .filter(Boolean);

    const otPart =
      s.totalOvertimeHours > 0
        ? ` | إضافي: ${formatNumClean(s.totalOvertimeHours)} س`
        : '';

    out.push(
      `• ${s.worker.name} (شغل ${formatNumClean(s.totalWorkedDays)} يوم${
        s.absentDays > 0 ? ` | غياب ${formatNumClean(s.absentDays)}` : ''
      }${otPart}):`
    );
    if (lineBreakdown.length > 0) {
      out.push(...(lineBreakdown as string[]));
    } else {
      out.push('   - لم يُسجّل عمل بعد');
    }
  }

  out.push('------------------------');
  out.push('إجمالي أيام الخطوط في الأسبوع:');
  for (const line of lines) {
    const total = summaries.reduce((acc, s) => acc + (s.countsByLine[line.id] ?? 0), 0);
    if (total > 0) {
      out.push(`- ${line.name}: ${formatNumClean(total)} يوم/فرد`);
    }
  }

  return out.join('\n');
}

export function exportWeeklyCsv(
  summaries: WorkerSummary[],
  lines: WorkLine[],
  periodLabel: string
) {
  const headers = [
    'م',
    'الاسم',
    'الوظيفة',
    ...lines.map((l) => l.name),
    'إجمالي أيام الشغل',
    'أيام الغياب',
    'ساعات الإضافي',
  ];

  const rows = summaries.map((s, idx) => [
    String(idx + 1),
    s.worker.name,
    s.worker.role,
    ...lines.map((l) => formatNumClean(s.countsByLine[l.id] ?? 0)),
    formatNumClean(s.totalWorkedDays),
    formatNumClean(s.absentDays),
    formatNumClean(s.totalOvertimeHours),
  ]);

  const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
  const csvContent =
    '\uFEFF' +
    [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `تقرير-خطوط-الإنتاج-${periodLabel.replace(/\s+/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
