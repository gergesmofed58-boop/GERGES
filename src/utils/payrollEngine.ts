import type {
  AttendanceRecord,
  ComputedPayroll,
  MonthlyAdjustment,
  SalaryConfig,
  TaxBracketBreakdown,
} from '../types/workApp';

// حدود أجر الاشتراك التأميني في مصر (تقريبي قابل للتعديل)
const MIN_INSURED_WAGE = 2300;
const MAX_INSURED_WAGE = 14500;

// الإعفاء الشخصي السنوي طبقًا لقانون الضرائب المصري رقم 7 لسنة 2024
const ANNUAL_PERSONAL_EXEMPTION = 20000;

/**
 * يحوّل الأرقام العربية/الهندية (٠١٢٣٤٥٦٧٨٩) لأرقام إنجليزية عشان الكيبورد العربي يشتغل بسلاسة
 */
export function normalizeNumericInput(raw: string): string {
  return raw
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/٫/g, '.')
    .replace(/,/g, '.')
    .replace(/[^0-9.]/g, '');
}

export function parseNumericString(raw: string): number {
  const cleaned = normalizeNumericInput(raw);
  if (!cleaned) return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

/**
 * حساب ضريبة كسب العمل المصرية التصاعدية السنوية (قانون 7 لسنة 2024)
 */
export function computeEgyptianAnnualTax(annualTaxableBase: number): {
  annualTax: number;
  brackets: TaxBracketBreakdown[];
} {
  if (annualTaxableBase <= 0) {
    return { annualTax: 0, brackets: [] };
  }

  const bands: { limit: number; rate: number; label: string }[] = [
    { limit: 40000, rate: 0, label: 'الشريحة الأولى (معفية لحد 40,000 جنيه)' },
    { limit: 55000, rate: 0.1, label: 'الشريحة التانية (10%)' },
    { limit: 70000, rate: 0.15, label: 'الشريحة التالتة (15%)' },
    { limit: 200000, rate: 0.2, label: 'الشريحة الرابعة (20%)' },
    { limit: 400000, rate: 0.225, label: 'الشريحة الخامسة (22.5%)' },
    { limit: 1200000, rate: 0.25, label: 'الشريحة السادسة (25%)' },
    { limit: Infinity, rate: 0.275, label: 'الشريحة السابعة (27.5%)' },
  ];

  let previousLimit = 0;
  let totalTax = 0;
  const breakdown: TaxBracketBreakdown[] = [];

  for (const band of bands) {
    if (annualTaxableBase <= previousLimit) break;
    const upper = Math.min(annualTaxableBase, band.limit);
    const slice = Math.max(0, upper - previousLimit);

    let effectiveRate = band.rate;
    let effectiveLabel = band.label;

    if (annualTaxableBase > 600000 && previousLimit === 0) {
      effectiveRate = 0.1;
      effectiveLabel = 'الشريحة الأولى (10% عشان الدخل فوق 600 ألف)';
    }

    const taxForSlice = slice * effectiveRate;
    totalTax += taxForSlice;

    if (slice > 0) {
      breakdown.push({
        label: effectiveLabel,
        ratePercent: Number((effectiveRate * 100).toFixed(1)),
        taxableAmount: Math.round(slice),
        taxAmount: Math.round(taxForSlice),
      });
    }

    previousLimit = band.limit;
  }

  return {
    annualTax: Math.round(totalTax),
    brackets: breakdown,
  };
}

export function calculatePayrollForMonth(
  config: SalaryConfig,
  monthRecords: AttendanceRecord[],
  monthAdjustments: MonthlyAdjustment[],
  extraSimulation?: {
    extraNightShifts?: number;
    extraDayOvertimeHours?: number;
    extraNightOvertimeHours?: number;
  }
): ComputedPayroll {
  const safeDays = config.monthWorkDays > 0 ? config.monthWorkDays : 30;
  const safeHoursPerDay = config.dailyShiftHours > 0 ? config.dailyShiftHours : 8;
  const basicSalary = Math.max(0, config.basicSalary || 0);
  const monthlyIncentive = Math.max(0, config.monthlyIncentive || 0);
  const incentiveDeduction = Math.max(0, config.incentiveDeduction || 0);
  const includeIncentiveInDeductions = config.includeIncentiveInDeductions !== false;

  const dayOtMult =
    config.dayOvertimeMultiplier > 0 ? config.dayOvertimeMultiplier : 1.35;
  const nightOtMult =
    config.nightOvertimeMultiplier > 0 ? config.nightOvertimeMultiplier : 1.7;
  const holidayMult =
    config.holidayMultiplier > 0 ? config.holidayMultiplier : 2.0;

  const dailyRate = basicSalary / safeDays;
  const hourlyRate = dailyRate / safeHoursPerDay;
  const dayOvertimeRate = hourlyRate * dayOtMult;
  const nightOvertimeRate = hourlyRate * nightOtMult;
  const holidayHourlyRate = hourlyRate * holidayMult;

  const workedRecords = monthRecords.filter(
    (r) =>
      r.status === 'present' ||
      r.status === 'overtime' ||
      r.status === 'late' ||
      r.status === 'holiday'
  );
  const holidayRecords = monthRecords.filter((r) => r.status === 'holiday');
  const absentDays = monthRecords.filter((r) => r.status === 'absent').length;

  const dayShiftCount = workedRecords.filter((r) => r.shift === 'day').length;
  const nightShiftCount =
    workedRecords.filter((r) => r.shift === 'night').length +
    (extraSimulation?.extraNightShifts ?? 0);

  const workedDays = workedRecords.length;
  const holidayDays = holidayRecords.length;
  const holidayHours = holidayRecords.reduce(
    (sum, r) => sum + (r.workedHours > 0 ? r.workedHours : safeHoursPerDay),
    0
  );
  const totalWorkedHours = workedRecords.reduce((sum, r) => sum + r.workedHours, 0);

  const dayOvertimeHours =
    workedRecords
      .filter((r) => r.shift === 'day')
      .reduce((sum, r) => sum + r.overtimeHours, 0) +
    (extraSimulation?.extraDayOvertimeHours ?? 0);

  const nightOvertimeHours =
    workedRecords
      .filter((r) => r.shift === 'night')
      .reduce((sum, r) => sum + r.overtimeHours, 0) +
    (extraSimulation?.extraNightOvertimeHours ?? 0);

  const totalLateMinutes = workedRecords.reduce((sum, r) => sum + r.lateMinutes, 0);

  const dayShiftAllowanceTotal = dayShiftCount * Math.max(0, config.dayShiftAllowance || 0);
  const nightShiftAllowanceTotal =
    nightShiftCount * Math.max(0, config.nightShiftAllowance || 0);
  const totalShiftAllowance = dayShiftAllowanceTotal + nightShiftAllowanceTotal;

  const dayOvertimePay = dayOvertimeHours * dayOvertimeRate;
  const nightOvertimePay = nightOvertimeHours * nightOvertimeRate;
  const totalOvertimePay = dayOvertimePay + nightOvertimePay;
  const holidayWorkPay = holidayHours * holidayHourlyRate;

  const customBonusesTotal = monthAdjustments
    .filter((a) => a.kind === 'bonus')
    .reduce((sum, a) => sum + a.amount, 0);

  const fixedAllowances = Math.max(0, config.fixedAllowances || 0);

  const grossSalary =
    basicSalary +
    monthlyIncentive +
    fixedAllowances +
    totalShiftAllowance +
    totalOvertimePay +
    holidayWorkPay +
    customBonusesTotal;

  // الحافز بيدخل في أجر التأمينات والضرايب والاستقطاعات لما الاختيار مفعّل
  const incentiveForDeductions = includeIncentiveInDeductions ? monthlyIncentive : 0;
  const baseForInsurance = basicSalary + incentiveForDeductions + fixedAllowances;
  const hasAnySalaryBase =
    baseForInsurance > 0 || (config.insuredWageOverride ?? 0) > 0;

  const rawInsured =
    config.insuredWageOverride && config.insuredWageOverride > 0
      ? config.insuredWageOverride
      : hasAnySalaryBase
      ? Math.min(MAX_INSURED_WAGE, Math.max(MIN_INSURED_WAGE, baseForInsurance))
      : 0;

  const insuredWage = config.enableSocialInsurance && grossSalary > 0 ? rawInsured : 0;
  const socialInsuranceEmployee =
    config.enableSocialInsurance && insuredWage > 0
      ? Math.round(insuredWage * ((config.socialInsuranceRate || 11) / 100))
      : 0;

  const lateDeduction = Math.round((totalLateMinutes / 60) * hourlyRate);
  const absenceDeduction = Math.round(absentDays * dailyRate);

  // إجمالي المبلغ الخاضع للضريبة وصندوق الشهداء (بيشمل الحافز وبيخصم منه خصم الحافز والتأمينات والتأخير والغياب)
  const taxableGrossBase = includeIncentiveInDeductions
    ? grossSalary
    : Math.max(0, grossSalary - monthlyIncentive);

  const netMonthlyBeforeTax = Math.max(
    0,
    taxableGrossBase -
      socialInsuranceEmployee -
      lateDeduction -
      absenceDeduction -
      incentiveDeduction
  );
  const annualTaxableIncome =
    taxableGrossBase > 0
      ? Math.max(0, netMonthlyBeforeTax * 12 - ANNUAL_PERSONAL_EXEMPTION)
      : 0;

  const taxResult =
    config.enableIncomeTax && taxableGrossBase > 0
      ? computeEgyptianAnnualTax(annualTaxableIncome)
      : { annualTax: 0, brackets: [] };

  const monthlyIncomeTax = Math.round(taxResult.annualTax / 12);
  const martyrsFundDeduction =
    config.enableMartyrsFund && taxableGrossBase > 0
      ? Math.round(taxableGrossBase * 0.0005)
      : 0;

  const customDeductionsTotal = monthAdjustments
    .filter((a) => a.kind === 'deduction')
    .reduce((sum, a) => sum + a.amount, 0);

  const totalDeductions =
    socialInsuranceEmployee +
    monthlyIncomeTax +
    martyrsFundDeduction +
    incentiveDeduction +
    lateDeduction +
    absenceDeduction +
    customDeductionsTotal;

  const netSalary = Math.max(0, Math.round(grossSalary - totalDeductions));

  return {
    dailyRate,
    hourlyRate,
    dayOvertimeRate,
    nightOvertimeRate,
    holidayHourlyRate,

    workedDays,
    dayShiftCount,
    nightShiftCount,
    holidayDays,
    holidayHours,
    absentDays,
    totalWorkedHours,
    dayOvertimeHours,
    nightOvertimeHours,
    totalAllWorkedHours:
      Math.round((totalWorkedHours + dayOvertimeHours + nightOvertimeHours) * 100) / 100,
    totalLateMinutes,

    basicSalary,
    monthlyIncentive,
    fixedAllowances,
    dayShiftAllowanceTotal,
    nightShiftAllowanceTotal,
    totalShiftAllowance,
    dayOvertimePay,
    nightOvertimePay,
    totalOvertimePay,
    holidayWorkPay,
    customBonusesTotal,
    grossSalary: Math.round(grossSalary),

    insuredWage,
    socialInsuranceEmployee,
    annualTaxableIncome: Math.round(annualTaxableIncome),
    annualPersonalExemption: ANNUAL_PERSONAL_EXEMPTION,
    annualIncomeTax: taxResult.annualTax,
    monthlyIncomeTax,
    taxBrackets: taxResult.brackets,
    martyrsFundDeduction,
    incentiveDeduction,
    lateDeduction,
    absenceDeduction,
    customDeductionsTotal,
    totalDeductions: Math.round(totalDeductions),

    netSalary,
  };
}

/**
 * يحسب فاضل كام يوم على يوم القبض الشهري
 */
export function getDaysUntilPayday(paydayDay: number): number | null {
  if (!paydayDay || paydayDay < 1 || paydayDay > 31) return null;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysInThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const clampedThisMonthDay = Math.min(paydayDay, daysInThisMonth);

  let target = new Date(now.getFullYear(), now.getMonth(), clampedThisMonthDay);
  if (target < todayStart) {
    const nextMonthDays = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();
    target = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      Math.min(paydayDay, nextMonthDays)
    );
  }
  const diffMs = target.getTime() - todayStart.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function formatEGP(value: number, decimals = 0): string {
  const safeVal = Number.isFinite(value) ? value : 0;
  return safeVal.toLocaleString('ar-EG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function calculateDiffHours(
  checkIn: string,
  checkOut: string,
  shift: 'day' | 'night'
): number {
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  if (
    Number.isNaN(inH) ||
    Number.isNaN(inM) ||
    Number.isNaN(outH) ||
    Number.isNaN(outM)
  ) {
    return 0;
  }
  const startMins = inH * 60 + inM;
  let endMins = outH * 60 + outM;
  if (endMins <= startMins || (shift === 'night' && endMins < startMins)) {
    endMins += 24 * 60;
  }
  const hrs = (endMins - startMins) / 60;
  return Math.max(0.25, Math.round(hrs * 4) / 4);
}

export function calculateCalendarDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

const ARABIC_WEEKDAYS = [
  'الحد',
  'الاتنين',
  'التلات',
  'الأربع',
  'الخميس',
  'الجمعة',
  'السبت',
];

export function getArabicWeekday(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return 'يوم شغل';
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return ARABIC_WEEKDAYS[d.getDay()] ?? 'يوم شغل';
}

const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export function formatArabicMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return monthKey;
  return `${ARABIC_MONTHS[m - 1]} ${y}`;
}

export function shiftMonthKey(monthKey: string, deltaMonths: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  const d = new Date(y, m - 1 + deltaMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
