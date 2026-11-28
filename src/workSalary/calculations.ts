import {
  DAY_STATUS_META,
  DayLogEntry,
  MonthRecord,
  MonthlyCommitment,
  OvertimeCalcRule,
  SalarySettings,
  SalaryTransaction,
  formatDayDateAr,
  formatPayrollPeriodLabelAr,
  getDayEntryFromAllMonths,
  getPayrollPeriodDates,
} from './types';
import { parseTimeToMinutes } from './reminderUtils';

export interface MonthlyPayrollSummary {
  monthKey: string;
  periodStartIso: string;
  periodEndIso: string;
  presentDays: number;
  halfDays: number;
  extraDays: number;
  paidLeaveDays: number;
  absentDays: number;
  weeklyOffDays: number;
  loggedDaysCount: number;
  totalDaysInMonth: number;
  totalWorkedDaysEquivalent: number;
  totalWorkHours: number;
  totalOvertimeHours: number;
  totalLateMinutes: number;

  // Derived rates
  effectiveDailyRate: number;
  effectiveHourlyRate: number;
  effectiveOvertimeHourRate: number;

  // Earnings
  basePay: number;
  allowancesTotal: number;
  overtimePay: number;
  extraDaysPay: number;
  dailyBonusesTotal: number;
  ledgerBonusesTotal: number;
  totalBonuses: number;
  grossEarnings: number;

  // Deductions
  absenceDeduction: number;
  halfDayDeduction: number;
  socialInsuranceDeduction: number;
  otherFixedDeduction: number;
  fixedDeductionsTotal: number;
  dailyDeductionsTotal: number;
  ledgerDeductionsTotal: number;
  advancesTotal: number;
  totalDeductions: number;

  // Final Net
  netSalary: number;
}

export interface AnnualLeaveBalance {
  year: string;
  annualQuota: number;
  annualUsed: number;
  annualRemaining: number;
  casualQuota: number;
  casualUsed: number;
  casualRemaining: number;
  sickUsed: number;
}

export interface ShiftTimeCalculation {
  workedHours: number;
  overtimeHours: number;
  lateMinutes: number;
}

export function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function formatMoney(amount: number, currency: string): string {
  const safe = Number.isFinite(amount) ? round2(amount) : 0;
  const formatted = safe.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(safe) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency}`;
}

export function formatCleanNum(val: number): string {
  const r = round2(val);
  return Number.isInteger(r) ? String(r) : r.toFixed(1).replace(/\.0$/, '');
}

/**
 * Returns the span in hours between official work start and end times (handles overnight shifts).
 */
export function getOfficialShiftSpanHours(
  startHHMM: string,
  endHHMM: string
): number {
  const startMins = parseTimeToMinutes(startHHMM || '08:00');
  let endMins = parseTimeToMinutes(endHHMM || '17:00');
  if (endMins <= startMins) {
    endMins += 1440;
  }
  return round2((endMins - startMins) / 60);
}

/**
 * Calculates total worked hours, automatic overtime hours, and late minutes
 * from check-in & check-out HH:MM strings (supports overnight/night shifts).
 * - 'after_end_time': overtime is any time worked past official expectedEndHHMM (e.g., 17:00).
 * - 'after_daily_hours': overtime is any total duration exceeding dailyWorkHours (e.g., 8h).
 */
export function calculateShiftTimes(
  checkInHHMM: string,
  checkOutHHMM: string,
  expectedStartHHMM: string,
  dailyWorkHours: number,
  expectedEndHHMM?: string,
  overtimeCalcRule: OvertimeCalcRule = 'after_end_time'
): ShiftTimeCalculation {
  const expectedStart = parseTimeToMinutes(expectedStartHHMM || '08:00');
  let expectedEnd = parseTimeToMinutes(expectedEndHHMM || '17:00');
  if (expectedEnd <= expectedStart) {
    expectedEnd += 1440;
  }

  let inMins = parseTimeToMinutes(checkInHHMM);
  let outMins = parseTimeToMinutes(checkOutHHMM);
  if (expectedEnd > 1440 && inMins < expectedStart - 360) {
    inMins += 1440;
  }
  if (outMins <= inMins) {
    outMins += 1440; // Overnight shift crossing midnight
  }

  const workedMins = Math.max(0, outMins - inMins);
  const workedHours = round2(workedMins / 60);

  let rawExtraMins = 0;
  if (overtimeCalcRule === 'after_end_time' && expectedEndHHMM) {
    rawExtraMins = Math.max(0, outMins - expectedEnd);
  } else {
    const standardMins = Math.max(60, (dailyWorkHours || 8) * 60);
    rawExtraMins = Math.max(0, workedMins - standardMins);
  }
  const overtimeHours = rawExtraMins > 0 ? round2(rawExtraMins / 60) : 0;

  // Compute late arrival minutes relative to configured workStartTime (ignore if > 4h diff e.g. different shift)
  const diffFromExpected = inMins - expectedStart;
  const lateMinutes =
    diffFromExpected > 0 && diffFromExpected <= 240 ? diffFromExpected : 0;

  return { workedHours, overtimeHours, lateMinutes };
}

/**
 * Computes how many days remain until the next payday.
 */
export function computeDaysUntilPayday(paydayDayOfMonth = 1): {
  daysLeft: number;
  label: string;
} {
  const targetDay = Math.max(1, Math.min(31, Math.round(paydayDayOfMonth || 1)));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const makeClampedDate = (year: number, monthIndex: number, day: number) => {
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    return new Date(year, monthIndex, Math.min(day, lastDay));
  };

  let nextPayday = makeClampedDate(today.getFullYear(), today.getMonth(), targetDay);
  if (nextPayday < today) {
    nextPayday = makeClampedDate(today.getFullYear(), today.getMonth() + 1, targetDay);
  }

  const diffDays = Math.round((nextPayday.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) {
    return { daysLeft: 0, label: 'النهاردة يوم القبض!' };
  }
  if (diffDays === 1) {
    return { daysLeft: 1, label: 'بكرة يوم القبض' };
  }
  return { daysLeft: diffDays, label: `فاضل ${diffDays} يوم على القبض` };
}

/**
 * Calculates annual & casual leave balances for a given calendar year across all saved months.
 */
export function computeAnnualLeaveBalance(
  settings: SalarySettings,
  allMonths: Record<string, MonthRecord>,
  year: string
): AnnualLeaveBalance {
  const annualQuota = Math.max(0, settings.annualLeaveQuota ?? 21);
  const casualQuota = Math.max(0, settings.casualLeaveQuota ?? 6);
  let annualUsed = 0;
  let casualUsed = 0;
  let sickUsed = 0;

  for (const [mk, rec] of Object.entries(allMonths)) {
    if (!mk.startsWith(`${year}-`)) continue;
    for (const entry of Object.values(rec.days)) {
      if (entry.status !== 'paid_leave') continue;
      if (entry.leaveKind === 'casual') casualUsed += 1;
      else if (entry.leaveKind === 'sick') sickUsed += 1;
      else annualUsed += 1;
    }
  }

  return {
    year,
    annualQuota,
    annualUsed,
    annualRemaining: Math.max(0, annualQuota - annualUsed),
    casualQuota,
    casualUsed,
    casualRemaining: Math.max(0, casualQuota - casualUsed),
    sickUsed,
  };
}

export function computeCommitmentsSummary(
  commitments: MonthlyCommitment[] | undefined,
  monthKey: string
): { total: number; paid: number; remaining: number } {
  const list = commitments ?? [];
  let total = 0;
  let paid = 0;
  for (const c of list) {
    const amt = Math.max(0, c.amount || 0);
    total += amt;
    if (c.paidMonths?.[monthKey]) paid += amt;
  }
  return {
    total: round2(total),
    paid: round2(paid),
    remaining: round2(total - paid),
  };
}

export function computeMonthlyPayroll(
  settings: SalarySettings,
  allMonths: Record<string, MonthRecord>,
  monthKey: string,
  allTransactions: SalaryTransaction[]
): MonthlyPayrollSummary {
  const cycleStartDay = Math.max(1, Math.min(28, settings.cycleStartDay ?? 1));
  const allDates = getPayrollPeriodDates(monthKey, cycleStartDay);
  const totalDaysInMonth = allDates.length;
  const periodStartIso = allDates[0] ?? `${monthKey}-01`;
  const periodEndIso = allDates[allDates.length - 1] ?? `${monthKey}-28`;
  const activeMonthMeta = allMonths[monthKey];

  let presentDays = 0;
  let halfDays = 0;
  let extraDays = 0;
  let paidLeaveDays = 0;
  let absentDays = 0;
  let weeklyOffDays = 0;
  let loggedDaysCount = 0;
  let totalWorkHours = 0;
  let totalOvertimeHours = 0;
  let totalLateMinutes = 0;
  let dailyBonusesTotal = 0;
  let dailyDeductionsTotal = 0;

  for (const dateIso of allDates) {
    const entry: DayLogEntry | undefined = getDayEntryFromAllMonths(allMonths, dateIso);
    if (!entry) continue;
    loggedDaysCount += 1;

    const hrs =
      entry.workHours !== undefined && entry.workHours >= 0
        ? entry.workHours
        : entry.status === 'half_day'
        ? settings.dailyWorkHours / 2
        : entry.status === 'present' || entry.status === 'extra_day'
        ? settings.dailyWorkHours
        : 0;

    if (entry.status === 'present') {
      presentDays += 1;
      totalWorkHours += hrs;
    } else if (entry.status === 'half_day') {
      halfDays += 1;
      totalWorkHours += hrs;
    } else if (entry.status === 'extra_day') {
      extraDays += 1;
      totalWorkHours += hrs;
    } else if (entry.status === 'paid_leave') {
      paidLeaveDays += 1;
    } else if (entry.status === 'absent') {
      absentDays += 1;
    } else if (entry.status === 'weekly_off') {
      weeklyOffDays += 1;
    }

    totalOvertimeHours += Math.max(0, entry.overtimeHours || 0);
    totalLateMinutes += Math.max(0, entry.lateMinutes || 0);
    dailyBonusesTotal += Math.max(0, entry.dailyBonus || 0);
    dailyDeductionsTotal += Math.max(0, entry.dailyDeduction || 0);
  }

  const workingDaysDivisor = Math.max(1, settings.workingDaysPerMonth || 26);
  const dailyHoursDivisor = Math.max(1, settings.dailyWorkHours || 8);

  let effectiveDailyRate = 0;
  let effectiveHourlyRate = 0;

  if (settings.salaryMode === 'monthly') {
    effectiveDailyRate = settings.baseAmount / workingDaysDivisor;
    effectiveHourlyRate = effectiveDailyRate / dailyHoursDivisor;
  } else if (settings.salaryMode === 'daily') {
    effectiveDailyRate = settings.baseAmount;
    effectiveHourlyRate = effectiveDailyRate / dailyHoursDivisor;
  } else {
    effectiveHourlyRate = settings.baseAmount;
    effectiveDailyRate = effectiveHourlyRate * dailyHoursDivisor;
  }

  const effectiveOvertimeHourRate =
    settings.customOvertimeHourRate > 0
      ? settings.customOvertimeHourRate
      : effectiveHourlyRate * Math.max(0.5, settings.overtimeMultiplier || 1.5);

  const monthTransactions = allTransactions.filter((t) =>
    cycleStartDay === 1
      ? t.monthKey === monthKey
      : t.dateIso >= periodStartIso && t.dateIso <= periodEndIso
  );

  const advancesTotal = round2(
    monthTransactions
      .filter((t) => t.type === 'advance')
      .reduce((sum, t) => sum + Math.max(0, t.amount), 0)
  );
  const ledgerBonusesTotal = round2(
    monthTransactions
      .filter((t) => t.type === 'bonus')
      .reduce((sum, t) => sum + Math.max(0, t.amount), 0)
  );
  const ledgerDeductionsTotal = round2(
    monthTransactions
      .filter((t) => t.type === 'deduction')
      .reduce((sum, t) => sum + Math.max(0, t.amount), 0)
  );

  let basePay = 0;
  let absenceDeduction = 0;
  let halfDayDeduction = 0;
  let extraDaysPay = 0;

  if (settings.salaryMode === 'monthly') {
    basePay = round2(settings.baseAmount);
    absenceDeduction = round2(
      absentDays * effectiveDailyRate * Math.max(0, settings.absencePenaltyMultiplier ?? 1)
    );
    halfDayDeduction = round2(halfDays * 0.5 * effectiveDailyRate);
    extraDaysPay = round2(
      extraDays * effectiveDailyRate * Math.max(1, settings.extraDayMultiplier || 2)
    );
  } else if (settings.salaryMode === 'daily') {
    basePay = round2(
      (presentDays + paidLeaveDays + halfDays * 0.5) * effectiveDailyRate
    );
    extraDaysPay = round2(
      extraDays * effectiveDailyRate * Math.max(1, settings.extraDayMultiplier || 2)
    );
    const extraPenaltyFactor = Math.max(0, (settings.absencePenaltyMultiplier ?? 1) - 1);
    absenceDeduction = round2(absentDays * effectiveDailyRate * extraPenaltyFactor);
  } else {
    const regularHoursWorked = Math.max(0, totalWorkHours - extraDays * dailyHoursDivisor);
    basePay = round2(
      (regularHoursWorked + paidLeaveDays * dailyHoursDivisor) * effectiveHourlyRate
    );
    extraDaysPay = round2(
      extraDays *
        dailyHoursDivisor *
        effectiveHourlyRate *
        Math.max(1, settings.extraDayMultiplier || 2)
    );
    absenceDeduction = 0;
  }

  const allowancesTotal = round2(
    Math.max(0, settings.transportAllowance || 0) +
      Math.max(0, settings.mealAllowance || 0) +
      Math.max(0, settings.otherAllowance || 0)
  );

  const overtimePay = round2(totalOvertimeHours * effectiveOvertimeHourRate);
  const totalBonuses = round2(dailyBonusesTotal + ledgerBonusesTotal);

  const grossEarnings = round2(
    basePay + allowancesTotal + overtimePay + extraDaysPay + totalBonuses
  );

  const socialInsuranceDeduction =
    activeMonthMeta?.manualInsurance !== undefined
      ? round2(Math.max(0, activeMonthMeta.manualInsurance))
      : settings.insuranceMode === 'percent'
      ? round2(basePay * (Math.max(0, settings.insurancePercent ?? 0) / 100))
      : round2(Math.max(0, settings.socialInsurance || 0));

  const otherFixedDeduction = round2(Math.max(0, settings.otherFixedDeduction || 0));
  const fixedDeductionsTotal = round2(socialInsuranceDeduction + otherFixedDeduction);

  const totalDeductions = round2(
    absenceDeduction +
      halfDayDeduction +
      fixedDeductionsTotal +
      dailyDeductionsTotal +
      ledgerDeductionsTotal +
      advancesTotal
  );

  const netSalary = round2(grossEarnings - totalDeductions);
  const totalWorkedDaysEquivalent = round2(presentDays + halfDays * 0.5 + extraDays);

  return {
    monthKey,
    periodStartIso,
    periodEndIso,
    presentDays,
    halfDays,
    extraDays,
    paidLeaveDays,
    absentDays,
    weeklyOffDays,
    loggedDaysCount,
    totalDaysInMonth,
    totalWorkedDaysEquivalent,
    totalWorkHours: round2(totalWorkHours),
    totalOvertimeHours: round2(totalOvertimeHours),
    totalLateMinutes,
    effectiveDailyRate: round2(effectiveDailyRate),
    effectiveHourlyRate: round2(effectiveHourlyRate),
    effectiveOvertimeHourRate: round2(effectiveOvertimeHourRate),
    basePay,
    allowancesTotal,
    overtimePay,
    extraDaysPay,
    dailyBonusesTotal: round2(dailyBonusesTotal),
    ledgerBonusesTotal,
    totalBonuses,
    grossEarnings,
    absenceDeduction,
    halfDayDeduction,
    socialInsuranceDeduction,
    otherFixedDeduction,
    fixedDeductionsTotal,
    dailyDeductionsTotal: round2(dailyDeductionsTotal),
    ledgerDeductionsTotal,
    advancesTotal,
    totalDeductions,
    netSalary,
  };
}

export function buildWhatsappPayslip(
  settings: SalarySettings,
  summary: MonthlyPayrollSummary
): string {
  const c = settings.currency;
  const periodTitle = formatPayrollPeriodLabelAr(summary.monthKey, settings.cycleStartDay ?? 1);
  const lines: string[] = [];
  lines.push(`*كشف شغلي ومرتبي — ${periodTitle}*`);
  if (settings.employeeName.trim()) {
    lines.push(
      `الاسم: ${settings.employeeName.trim()}${
        settings.jobTitle.trim() ? ` (${settings.jobTitle.trim()})` : ''
      }`
    );
  }
  lines.push('────────────────');
  lines.push(
    `الحضور: ${summary.presentDays} يوم${
      summary.halfDays > 0 ? ` · نص يوم: ${summary.halfDays}` : ''
    }${summary.extraDays > 0 ? ` · أيام إضافية: ${summary.extraDays}` : ''}${
      summary.absentDays > 0 ? ` · غياب: ${summary.absentDays}` : ''
    }`
  );
  if (summary.totalOvertimeHours > 0) {
    lines.push(`ساعات الإضافي: ${formatCleanNum(summary.totalOvertimeHours)} ساعة`);
  }
  if (summary.totalLateMinutes > 0) {
    lines.push(`إجمالي التأخير: ${summary.totalLateMinutes} دقيقة`);
  }
  lines.push('');
  lines.push('*المستحقات:*');
  lines.push(`• الأساسي: ${formatMoney(summary.basePay, c)}`);
  if (summary.allowancesTotal > 0) {
    lines.push(`• البدلات الثابتة: ${formatMoney(summary.allowancesTotal, c)}`);
  }
  if (summary.overtimePay > 0) {
    lines.push(
      `• الإضافي (${formatCleanNum(summary.totalOvertimeHours)} س): ${formatMoney(
        summary.overtimePay,
        c
      )}`
    );
  }
  if (summary.extraDaysPay > 0) {
    lines.push(
      `• أيام العطلات/الجمعة (${summary.extraDays} يوم): ${formatMoney(summary.extraDaysPay, c)}`
    );
  }
  if (summary.totalBonuses > 0) {
    lines.push(`• المكافآت والحوافز: ${formatMoney(summary.totalBonuses, c)}`);
  }

  if (summary.totalDeductions > 0) {
    lines.push('');
    lines.push('*الاستقطاعات والسُلف:*');
    if (summary.advancesTotal > 0) {
      lines.push(`• السُلف: -${formatMoney(summary.advancesTotal, c)}`);
    }
    if (summary.absenceDeduction > 0) {
      lines.push(
        `• خصم الغياب (${summary.absentDays} يوم): -${formatMoney(summary.absenceDeduction, c)}`
      );
    }
    if (summary.halfDayDeduction > 0) {
      lines.push(`• خصم نص يوم: -${formatMoney(summary.halfDayDeduction, c)}`);
    }
    if (summary.socialInsuranceDeduction > 0) {
      lines.push(`• التأمينات الاجتماعية: -${formatMoney(summary.socialInsuranceDeduction, c)}`);
    }
    if (summary.otherFixedDeduction > 0) {
      lines.push(`• استقطاعات ثابتة أخرى: -${formatMoney(summary.otherFixedDeduction, c)}`);
    }
    if (summary.dailyDeductionsTotal + summary.ledgerDeductionsTotal > 0) {
      lines.push(
        `• خصومات وجزاءات: -${formatMoney(
          summary.dailyDeductionsTotal + summary.ledgerDeductionsTotal,
          c
        )}`
      );
    }
  }

  lines.push('────────────────');
  lines.push(`*صافي المرتب المستحق: ${formatMoney(summary.netSalary, c)}*`);
  return lines.join('\n');
}

export function exportMonthPayrollCsv(
  settings: SalarySettings,
  allMonths: Record<string, MonthRecord>,
  monthKey: string,
  summary: MonthlyPayrollSummary
): void {
  const periodTitle = formatPayrollPeriodLabelAr(monthKey, settings.cycleStartDay ?? 1);
  const rows: string[][] = [
    ['كشف شغلي ومرتبي', periodTitle, settings.employeeName || ''],
    [
      'التاريخ',
      'اليوم',
      'الحالة',
      'الدخول',
      'الخروج',
      'تأخير (دقيقة)',
      'ساعات إضافي',
      'مكافأة يومية',
      'خصم يومي',
      'ملاحظات',
    ],
  ];

  const allDates = getPayrollPeriodDates(monthKey, settings.cycleStartDay ?? 1);
  for (const dateIso of allDates) {
    const entry = getDayEntryFromAllMonths(allMonths, dateIso);
    if (!entry) continue;
    rows.push([
      dateIso,
      formatDayDateAr(dateIso),
      DAY_STATUS_META[entry.status].label,
      entry.checkInTime ?? '',
      entry.checkOutTime ?? '',
      String(entry.lateMinutes || 0),
      String(entry.overtimeHours || 0),
      String(entry.dailyBonus || 0),
      String(entry.dailyDeduction || 0),
      entry.note ?? '',
    ]);
  }

  rows.push([]);
  rows.push(['ملخص المرتب', 'القيمة', settings.currency]);
  rows.push(['الأساسي', String(summary.basePay), settings.currency]);
  rows.push(['البدلات', String(summary.allowancesTotal), settings.currency]);
  rows.push(['الإضافي', String(summary.overtimePay), settings.currency]);
  rows.push(['أيام العطلات', String(summary.extraDaysPay), settings.currency]);
  rows.push(['المكافآت', String(summary.totalBonuses), settings.currency]);
  rows.push(['السُلف', String(-summary.advancesTotal), settings.currency]);
  rows.push(['خصم الغياب', String(-summary.absenceDeduction), settings.currency]);
  rows.push(['التأمينات الاجتماعية', String(-summary.socialInsuranceDeduction), settings.currency]);
  if (summary.otherFixedDeduction > 0) {
    rows.push(['استقطاعات ثابتة أخرى', String(-summary.otherFixedDeduction), settings.currency]);
  }
  rows.push([
    'خصومات وجزاءات',
    String(-(summary.dailyDeductionsTotal + summary.ledgerDeductionsTotal)),
    settings.currency,
  ]);
  rows.push(['صافي المرتب', String(summary.netSalary), settings.currency]);

  const csvContent =
    '\uFEFF' +
    rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `شغلي-ومرتبي-${monthKey}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
