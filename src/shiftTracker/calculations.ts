import {
  AssignmentEntry,
  DayKey,
  NIGHT_SHIFT_LABEL,
  WEEK_DAYS,
  WeekRecord,
  WorkLine,
  Worker,
  formatArabicShortDate,
  formatWeekRangeAr,
  getWorkerFixedLineIds,
  isLightRestLine,
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
  restAssignedCount: number;
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
 * Capacity-Aware & Effort-Aware Fair Rotation Distributor:
 * 1. Keeps anyone marked absent/leave today (and any already-assigned worker unless overwriteExistingWork=true).
 * 2. Multi-Line Fixed Operators (`worker.fixedLineIds`): Whenever ANY of their fixed lines is running today,
 *    they stay outside fair rotation and are placed directly onto their running fixed line (deducted from its slots).
 *    If NONE of their fixed lines are running today, they join the rotating pool normally.
 * 3. Heavy Lines vs Light/Rest Stations (e.g., التغليف اليدوي = rest/light):
 *    - Workers who worked HARDER (most consecutive heavy-line days & fewest light/rest days this week)
 *      and did NOT miss yesterday or rest yesterday earn the available rest/light slots first.
 *    - Workers who missed yesterday (e.g., absent/off Saturday) or rested on light work yesterday
 *      get top priority onto MAIN HEAVY production lines today (never given rest twice in a row!).
 * 4. Strict Anti-Repeat Line Rotation + Pairwise Swap Polish across heavy lines so workers move to a
 *    different production line than yesterday whenever possible.
 */
export function suggestFairDayAssignments(
  workers: Worker[],
  lines: WorkLine[],
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
      restAssignedCount: 0,
      returnedFromOffCount: 0,
      rotatedToNewLineCount: 0,
      repeatedLineCount: 0,
      remainingReserveCount: 0,
    };
  }

  const lineMap = new Map(lines.map((l) => [l.id, l]));
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

  // Step 1: Separate absent/leave, multi-line fixed operators whose line(s) run today, already-assigned, and eligible rotating pool
  const eligibleWorkers: Worker[] = [];
  for (const worker of workers) {
    const existing = week.assignments[worker.id]?.[targetDay];
    if (existing?.lineId === 'absent' || existing?.lineId === 'leave') {
      continue;
    }

    const fixedIds = getWorkerFixedLineIds(worker);
    const runningFixedIds = fixedIds.filter((id) => runningLineIdSet.has(id));

    if (runningFixedIds.length > 0) {
      if (existing && !overwriteExistingWork) {
        if (remainingSlots[existing.lineId] !== undefined) {
          remainingSlots[existing.lineId] = Math.max(0, remainingSlots[existing.lineId] - 1);
        }
        if (runningFixedIds.includes(existing.lineId)) {
          fixedLockedCount += 1;
        }
        continue;
      }

      // If fixed on 2+ lines that are both running today, pick the one that still needs slots most
      const openFixedIds = runningFixedIds.filter((id) => (remainingSlots[id] ?? 0) > 0);
      const pool = openFixedIds.length > 0 ? openFixedIds : runningFixedIds;
      const chosenFixedId = pool.reduce((best, curr) =>
        (remainingSlots[curr] ?? 0) > (remainingSlots[best] ?? 0) ? curr : best
      );

      assignments[worker.id] = { lineId: chosenFixedId };
      remainingSlots[chosenFixedId] = Math.max(0, (remainingSlots[chosenFixedId] ?? 0) - 1);
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
    wasLightRestYesterday: boolean;
    heavyDays: number;
    lightRestDays: number;
    consecutiveHeavyBeforeToday: number;
    totalWorkedSoFar: number;
  }

  const metas: WorkerMeta[] = eligibleWorkers.map((worker) => {
    const lineCounts: Record<string, number> = {};
    let totalWorkedSoFar = 0;
    let heavyDays = 0;
    let lightRestDays = 0;

    for (const d of visibleDays) {
      if (d.key === targetDay) continue;
      const e = week.assignments[worker.id]?.[d.key];
      if (!e) continue;
      const primary = lineMap.get(e.lineId);
      const secondary =
        e.secondLineId && e.secondLineId !== e.lineId
          ? lineMap.get(e.secondLineId)
          : undefined;

      if (e.lineId !== 'absent' && e.lineId !== 'leave') {
        totalWorkedSoFar += 1;
      }

      const addEffort = (ln: WorkLine | undefined, w: number) => {
        if (!ln || ln.category === 'absence') return;
        if (isLightRestLine(ln)) lightRestDays += w;
        else heavyDays += w;
      };

      if (secondary) {
        lineCounts[e.lineId] = (lineCounts[e.lineId] ?? 0) + 0.5;
        lineCounts[secondary.id] = (lineCounts[secondary.id] ?? 0) + 0.5;
        addEffort(primary, 0.5);
        addEffort(secondary, 0.5);
      } else {
        lineCounts[e.lineId] = (lineCounts[e.lineId] ?? 0) + 1;
        addEffort(primary, 1);
      }
    }

    // Count consecutive heavy-line days immediately preceding targetDay
    let consecutiveHeavyBeforeToday = 0;
    for (let i = targetIdx - 1; i >= 0; i--) {
      const e = week.assignments[worker.id]?.[visibleDays[i].key];
      if (!e) break;
      const ln = lineMap.get(e.lineId);
      if (!ln || ln.category === 'absence' || isLightRestLine(ln)) break;
      consecutiveHeavyBeforeToday += 1;
    }

    const prevEntry = prevDayKey ? week.assignments[worker.id]?.[prevDayKey] : undefined;
    const prevLineIds = new Set<string>();
    let wasOffYesterday = false;
    let wasLightRestYesterday = false;

    if (prevDayKey) {
      if (!prevEntry || prevEntry.lineId === 'absent' || prevEntry.lineId === 'leave') {
        wasOffYesterday = true;
      } else {
        prevLineIds.add(prevEntry.lineId);
        if (prevEntry.secondLineId) prevLineIds.add(prevEntry.secondLineId);
        const prevPrimary = lineMap.get(prevEntry.lineId);
        const prevSecondary = prevEntry.secondLineId
          ? lineMap.get(prevEntry.secondLineId)
          : undefined;
        if (
          isLightRestLine(prevPrimary) &&
          (!prevSecondary || isLightRestLine(prevSecondary))
        ) {
          wasLightRestYesterday = true;
        }
      }
    }

    return {
      worker,
      lineCounts,
      prevLineIds,
      wasOffYesterday,
      wasLightRestYesterday,
      heavyDays,
      lightRestDays,
      consecutiveHeavyBeforeToday,
      totalWorkedSoFar,
    };
  });

  const heavyTargets = activeTargets.filter((t) => !isLightRestLine(lineMap.get(t.lineId)));
  const lightTargets = activeTargets.filter((t) => isLightRestLine(lineMap.get(t.lineId)));

  const totalOpenHeavySlots = heavyTargets.reduce(
    (sum, t) => sum + (remainingSlots[t.lineId] ?? 0),
    0
  );
  const totalOpenLightSlots = lightTargets.reduce(
    (sum, t) => sum + (remainingSlots[t.lineId] ?? 0),
    0
  );

  // Step 2: Reserve the most-tired deserving workers for Light / Rest stations (e.g., التغليف اليدوي)
  // while ensuring main heavy production lines are never starved when total workers are tight.
  const restQuota =
    totalOpenLightSlots === 0
      ? 0
      : totalOpenHeavySlots === 0
      ? Math.min(totalOpenLightSlots, metas.length)
      : Math.max(0, Math.min(totalOpenLightSlots, metas.length - totalOpenHeavySlots));

  const restWorkerIds = new Set<string>();
  const restSelectedMetas: WorkerMeta[] = [];

  if (restQuota > 0) {
    const restRanked = [...metas].sort((a, b) => {
      // Never give rest to someone who missed yesterday if other workers are available
      if (a.wasOffYesterday !== b.wasOffYesterday) {
        return a.wasOffYesterday ? 1 : -1;
      }
      // Never give rest two days in a row if other workers are available
      if (a.wasLightRestYesterday !== b.wasLightRestYesterday) {
        return a.wasLightRestYesterday ? 1 : -1;
      }
      // Fewest rest/light days so far this week gets rest first
      if (a.lightRestDays !== b.lightRestDays) {
        return a.lightRestDays - b.lightRestDays;
      }
      // Most consecutive heavy-line days immediately before today gets rest first
      if (a.consecutiveHeavyBeforeToday !== b.consecutiveHeavyBeforeToday) {
        return b.consecutiveHeavyBeforeToday - a.consecutiveHeavyBeforeToday;
      }
      // Most total heavy-line days so far this week gets rest first
      if (a.heavyDays !== b.heavyDays) {
        return b.heavyDays - a.heavyDays;
      }
      return b.totalWorkedSoFar - a.totalWorkedSoFar;
    });

    for (let i = 0; i < restQuota && i < restRanked.length; i++) {
      restWorkerIds.add(restRanked[i].worker.id);
      restSelectedMetas.push(restRanked[i]);
    }
  }

  // Step 3: Sort remaining rotating workers for MAIN HEAVY production lines:
  // 1) Missed yesterday (absent / leave / unassigned Saturday -> MUST go straight onto a heavy line Sunday!)
  // 2) Rested on light station yesterday (التغليف اليدوي yesterday -> MUST go onto a heavy line today!)
  // 3) Fewest heavy-line days so far this week
  // 4) Workers whose yesterday heavy line IS running today (so they rotate cleanly to another heavy line)
  const heavyLineIdSet = new Set(heavyTargets.map((t) => t.lineId));
  const heavyPoolMetas = metas.filter((m) => !restWorkerIds.has(m.worker.id));

  heavyPoolMetas.sort((a, b) => {
    if (a.wasOffYesterday !== b.wasOffYesterday) {
      return a.wasOffYesterday ? -1 : 1;
    }
    if (a.wasLightRestYesterday !== b.wasLightRestYesterday) {
      return a.wasLightRestYesterday ? -1 : 1;
    }
    if (a.heavyDays !== b.heavyDays) {
      return a.heavyDays - b.heavyDays;
    }
    if (a.totalWorkedSoFar !== b.totalWorkedSoFar) {
      return a.totalWorkedSoFar - b.totalWorkedSoFar;
    }
    const aNeedsRotation = [...a.prevLineIds].some((id) => heavyLineIdSet.has(id));
    const bNeedsRotation = [...b.prevLineIds].some((id) => heavyLineIdSet.has(id));
    if (aNeedsRotation !== bNeedsRotation) {
      return aNeedsRotation ? -1 : 1;
    }
    return 0;
  });

  const assignedHeavyByWorker = new Map<string, string>();
  const metaByWorkerId = new Map(metas.map((m) => [m.worker.id, m]));

  for (const meta of heavyPoolMetas) {
    const openHeavy = heavyTargets.filter((t) => (remainingSlots[t.lineId] ?? 0) > 0);
    if (openHeavy.length === 0) break;

    let bestLineId = openHeavy[0].lineId;
    let bestScore = Infinity;

    for (const candidate of openHeavy) {
      const workedSameYesterday = meta.prevLineIds.has(candidate.lineId);
      const weeklyOnCandidate = meta.lineCounts[candidate.lineId] ?? 0;
      let score = (workedSameYesterday ? 1000 : 0) + weeklyOnCandidate * 10;
      score -= (remainingSlots[candidate.lineId] ?? 0) * 0.15;
      if (score < bestScore) {
        bestScore = score;
        bestLineId = candidate.lineId;
      }
    }

    assignedHeavyByWorker.set(meta.worker.id, bestLineId);
    remainingSlots[bestLineId] -= 1;
  }

  // Pairwise Swap Polish across heavy lines (fixed operators & rest workers are never touched)
  const heavyAssignedIds = Array.from(assignedHeavyByWorker.keys());
  for (let i = 0; i < heavyAssignedIds.length; i++) {
    const idA = heavyAssignedIds[i];
    const metaA = metaByWorkerId.get(idA)!;
    const lineA = assignedHeavyByWorker.get(idA)!;
    if (!metaA.prevLineIds.has(lineA)) continue;

    for (let j = 0; j < heavyAssignedIds.length; j++) {
      if (i === j) continue;
      const idB = heavyAssignedIds[j];
      const metaB = metaByWorkerId.get(idB)!;
      const lineB = assignedHeavyByWorker.get(idB)!;
      if (lineA === lineB) continue;

      if (!metaA.prevLineIds.has(lineB) && !metaB.prevLineIds.has(lineA)) {
        assignedHeavyByWorker.set(idA, lineB);
        assignedHeavyByWorker.set(idB, lineA);
        break;
      }
    }
  }

  // Step 4: Assign reserved rest workers to Light / Rest stations (e.g., التغليف اليدوي)
  let restAssignedCount = 0;
  const assignedLightByWorker = new Map<string, string>();
  for (const meta of restSelectedMetas) {
    const openLight = lightTargets.filter((t) => (remainingSlots[t.lineId] ?? 0) > 0);
    if (openLight.length === 0) break;
    const bestLight = openLight.reduce((best, curr) =>
      (meta.lineCounts[curr.lineId] ?? 0) < (meta.lineCounts[best.lineId] ?? 0) ? curr : best
    );
    assignedLightByWorker.set(meta.worker.id, bestLight.lineId);
    remainingSlots[bestLight.lineId] -= 1;
    restAssignedCount += 1;
  }

  // Finalize assignments & detailed counts
  let returnedFromOffCount = 0;
  let rotatedToNewLineCount = 0;
  let repeatedLineCount = 0;

  for (const [workerId, lineId] of assignedHeavyByWorker.entries()) {
    assignments[workerId] = { lineId };
    const meta = metaByWorkerId.get(workerId)!;
    if (meta.wasOffYesterday) {
      returnedFromOffCount += 1;
    } else if (meta.prevLineIds.size > 0) {
      if (meta.prevLineIds.has(lineId)) repeatedLineCount += 1;
      else rotatedToNewLineCount += 1;
    }
  }

  for (const [workerId, lineId] of assignedLightByWorker.entries()) {
    assignments[workerId] = { lineId };
  }

  const totalAssigned = Object.keys(assignments).length;
  const totalRotatingAssigned = assignedHeavyByWorker.size + assignedLightByWorker.size;
  const remainingReserveCount = Math.max(0, eligibleWorkers.length - totalRotatingAssigned);

  return {
    assignments,
    totalAssigned,
    fixedLockedCount,
    restAssignedCount,
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
  periodLabel: string,
  groupLabel?: string
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
    `${NIGHT_SHIFT_LABEL}${groupLabel ? ` (${groupLabel})` : ''} · الفترة: ${periodLabel}`,
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
  dayKey: DayKey,
  groupLabel?: string
): string {
  const dayInfo = WEEK_DAYS.find((d) => d.key === dayKey) ?? WEEK_DAYS[0];
  const dateLabel = formatArabicShortDate(
    shiftIsoDays(week.weekStartIso, dayInfo.offsetFromSat)
  );
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
    `${NIGHT_SHIFT_LABEL}${groupLabel ? ` — ${groupLabel}` : ''} | قوة المجموعة: ${workers.length} فرد`,
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
  week: WeekRecord,
  groupLabel?: string
): string {
  const range = formatWeekRangeAr(week.weekStartIso, week.includeFriday);
  const out: string[] = [
    `الملخص الأسبوعي لخطوط الإنتاج`,
    `${NIGHT_SHIFT_LABEL}${groupLabel ? ` — ${groupLabel}` : ''} | الأسبوع: ${range}`,
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
  periodLabel: string,
  groupLabel?: string
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
  const suffix = groupLabel ? `-${groupLabel.replace(/\s+/g, '-')}` : '';
  a.download = `تقرير-الوردية-الليلية${suffix}-${periodLabel.replace(/\s+/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
