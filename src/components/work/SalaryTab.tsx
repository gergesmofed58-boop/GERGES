import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Plus,
  Printer,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import type { MonthlyArchiveRow } from '../../hooks/useWorkAppStore';
import type {
  AdjustmentKind,
  AttendanceRecord,
  ComputedPayroll,
  MonthlyAdjustment,
  SalaryConfig,
} from '../../types/workApp';
import {
  calculatePayrollForMonth,
  formatArabicMonthLabel,
  formatEGP,
  normalizeNumericInput,
  parseNumericString,
} from '../../utils/payrollEngine';
import { MonthBar } from './MonthBar';

interface SalaryTabProps {
  config: SalaryConfig;
  payroll: ComputedPayroll;
  monthAttendance: AttendanceRecord[];
  adjustments: MonthlyAdjustment[];
  selectedMonth: string;
  monthlySummaries: MonthlyArchiveRow[];
  onSelectMonth: (monthKey: string) => void;
  onUpdateConfig: (
    patch: Partial<SalaryConfig>,
    options?: { applyAsDefault?: boolean; notifyMsg?: string }
  ) => void;
  onAddAdjustment: (title: string, amount: number, kind: AdjustmentKind) => void;
  onDeleteAdjustment: (id: string) => void;
}

type NumericFieldKey =
  | 'basicSalary'
  | 'monthlyIncentive'
  | 'incentiveDeduction'
  | 'monthWorkDays'
  | 'dailyShiftHours'
  | 'dayShiftAllowance'
  | 'nightShiftAllowance'
  | 'fixedAllowances'
  | 'insuredWageOverride'
  | 'paydayDay'
  | 'dayOvertimeMultiplier'
  | 'nightOvertimeMultiplier';

function numToBoxText(val: number | null | undefined): string {
  return val && val > 0 ? String(val) : '';
}

function buildTextDraft(cfg: SalaryConfig): Record<NumericFieldKey, string> {
  return {
    basicSalary: numToBoxText(cfg.basicSalary),
    monthlyIncentive: numToBoxText(cfg.monthlyIncentive),
    incentiveDeduction: numToBoxText(cfg.incentiveDeduction),
    monthWorkDays: numToBoxText(cfg.monthWorkDays),
    dailyShiftHours: numToBoxText(cfg.dailyShiftHours),
    dayShiftAllowance: numToBoxText(cfg.dayShiftAllowance),
    nightShiftAllowance: numToBoxText(cfg.nightShiftAllowance),
    fixedAllowances: numToBoxText(cfg.fixedAllowances),
    insuredWageOverride: numToBoxText(cfg.insuredWageOverride),
    paydayDay: numToBoxText(cfg.paydayDay),
    dayOvertimeMultiplier: numToBoxText(cfg.dayOvertimeMultiplier),
    nightOvertimeMultiplier: numToBoxText(cfg.nightOvertimeMultiplier),
  };
}

export const SalaryTab: React.FC<SalaryTabProps> = ({
  config,
  payroll,
  monthAttendance,
  adjustments,
  selectedMonth,
  monthlySummaries,
  onSelectMonth,
  onUpdateConfig,
  onAddAdjustment,
  onDeleteAdjustment,
}) => {
  const [fields, setFields] = useState<Record<NumericFieldKey, string>>(() =>
    buildTextDraft(config)
  );
  const [showTaxBrackets, setShowTaxBrackets] = useState(true);
  const [adjTitle, setAdjTitle] = useState('');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjKind, setAdjKind] = useState<AdjustmentKind>('deduction');
  const [copiedSummary, setCopiedSummary] = useState(false);

  // محاكي «مرتبي هيزيد كام؟»
  const [simNightShifts, setSimNightShifts] = useState(0);
  const [simDayOvertime, setSimDayOvertime] = useState(0);
  const [simNightOvertime, setSimNightOvertime] = useState(0);

  useEffect(() => {
    setFields(buildTextDraft(config));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  useEffect(() => {
    const allZero =
      config.basicSalary === 0 &&
      config.monthlyIncentive === 0 &&
      config.incentiveDeduction === 0 &&
      config.monthWorkDays === 0 &&
      config.dailyShiftHours === 0 &&
      config.dayShiftAllowance === 0 &&
      config.nightShiftAllowance === 0 &&
      config.fixedAllowances === 0 &&
      !config.insuredWageOverride &&
      config.paydayDay === 0;
    if (allZero) {
      setFields((prev) => {
        const hasAny = Object.values(prev).some((v) => v !== '');
        return hasAny ? buildTextDraft(config) : prev;
      });
    }
  }, [config]);

  const handleFieldChange = (key: NumericFieldKey, rawValue: string) => {
    const cleaned = normalizeNumericInput(rawValue);
    setFields((prev) => ({ ...prev, [key]: cleaned }));
    const parsed = parseNumericString(cleaned);

    if (key === 'insuredWageOverride') {
      onUpdateConfig({ insuredWageOverride: parsed > 0 ? parsed : null });
      return;
    }
    if (key === 'paydayDay') {
      const clampedDay = parsed > 0 ? Math.min(31, Math.round(parsed)) : 0;
      onUpdateConfig({ paydayDay: clampedDay });
      return;
    }
    onUpdateConfig({ [key]: parsed });
  };

  const simulatedPayroll = useMemo(() => {
    if (simNightShifts === 0 && simDayOvertime === 0 && simNightOvertime === 0) {
      return null;
    }
    return calculatePayrollForMonth(config, monthAttendance, adjustments, {
      extraNightShifts: simNightShifts,
      extraDayOvertimeHours: simDayOvertime,
      extraNightOvertimeHours: simNightOvertime,
    });
  }, [config, monthAttendance, adjustments, simNightShifts, simDayOvertime, simNightOvertime]);

  const handleAddAdj = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseNumericString(adjAmount);
    if (!adjTitle.trim() || val <= 0) return;
    onAddAdjustment(adjTitle, val, adjKind);
    setAdjTitle('');
    setAdjAmount('');
  };

  const handleCopyMonthSummary = async () => {
    const monthName = formatArabicMonthLabel(selectedMonth);
    const lines = [
      `ملخص مرتب شهر ${monthName} — شغلي ومرتبي`,
      `------------------------`,
      `أيام الشغل: ${payroll.workedDays} يوم (${payroll.totalAllWorkedHours.toFixed(1)} ساعة)`,
      `المرتب الأساسي: ${formatEGP(payroll.basicSalary)} جنيه`,
      ...(payroll.monthlyIncentive > 0
        ? [`الحافز الشهري: ${formatEGP(payroll.monthlyIncentive)} جنيه`]
        : []),
      ...(payroll.fixedAllowances > 0
        ? [`البدلات الثابتة: ${formatEGP(payroll.fixedAllowances)} جنيه`]
        : []),
      ...(payroll.totalShiftAllowance > 0
        ? [`بدل الورديات: ${formatEGP(payroll.totalShiftAllowance)} جنيه`]
        : []),
      ...(payroll.totalOvertimePay > 0
        ? [`الإضافي: ${formatEGP(Math.round(payroll.totalOvertimePay))} جنيه`]
        : []),
      ...(payroll.holidayWorkPay > 0
        ? [`شغل أعياد وإجازات (×2): ${formatEGP(Math.round(payroll.holidayWorkPay))} جنيه`]
        : []),
      `إجمالي قبل الخصم: ${formatEGP(payroll.grossSalary)} جنيه`,
      `التأمينات والضرايب والخصومات: -${formatEGP(payroll.totalDeductions)} جنيه`,
      `------------------------`,
      `صافي المرتب اللي هتقبضه: ${formatEGP(payroll.netSalary)} جنيه`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 2400);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const handleExportPayslipCsv = () => {
    const rows = [
      ['البند', 'المبلغ (جنيه)'],
      ['الشهر', selectedMonth],
      ['المرتب الأساسي', String(payroll.basicSalary)],
      ['الحافز الشهري', String(payroll.monthlyIncentive)],
      ['البدلات الثابتة', String(payroll.fixedAllowances)],
      ['بدل الورديات النهارية', String(payroll.dayShiftAllowanceTotal)],
      ['بدل الورديات الليلية', String(payroll.nightShiftAllowanceTotal)],
      ['إضافي نهاري', String(Math.round(payroll.dayOvertimePay))],
      ['إضافي ليلي', String(Math.round(payroll.nightOvertimePay))],
      ['شغل أعياد وإجازات رسمية (×2)', String(Math.round(payroll.holidayWorkPay))],
      ['مكافآت وحوافز تانية', String(payroll.customBonusesTotal)],
      ['إجمالي اللي ليك قبل الخصم', String(payroll.grossSalary)],
      ['التأمينات الاجتماعية', String(-payroll.socialInsuranceEmployee)],
      ['ضريبة كسب العمل في الشهر', String(-payroll.monthlyIncomeTax)],
      ['صندوق الشهداء', String(-payroll.martyrsFundDeduction)],
      ['خصم من الحافز / جزاء', String(-payroll.incentiveDeduction)],
      ['خصم التأخير', String(-payroll.lateDeduction)],
      ['خصم الغياب', String(-payroll.absenceDeduction)],
      ['سلف وخصومات تانية', String(-payroll.customDeductionsTotal)],
      ['إجمالي الخصومات', String(-payroll.totalDeductions)],
      ['صافي المرتب اللي هتقبضه', String(payroll.netSalary)],
    ];
    const csv = '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslip_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const calcDays = config.monthWorkDays > 0 ? config.monthWorkDays : 30;
  const calcHours = config.dailyShiftHours > 0 ? config.dailyShiftHours : 8;
  const calcDayOt = config.dayOvertimeMultiplier > 0 ? config.dayOvertimeMultiplier : 1.35;
  const calcNightOt = config.nightOvertimeMultiplier > 0 ? config.nightOvertimeMultiplier : 1.7;
  const calcHoliday = config.holidayMultiplier > 0 ? config.holidayMultiplier : 2.0;

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            حاسبة المرتب والحافز والضرايب
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            اكتب الأساسي والحافز وبدلات الوردية، والبرنامج هيحسبلك صافي مرتبك وسعر الساعة والاستقطاعات والضرايب لوحده أوفلاين.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handleCopyMonthSummary}
            className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            {copiedSummary ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>اتنسخ الملخص</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>انسخ ملخص الشهر</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleExportPayslipCsv}
            className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>نزّل إكسل</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[44px] px-3.5 rounded-xl bg-[#0F5C7E] hover:bg-[#0B4A66] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>اطبع الكشف</span>
          </button>
        </div>
      </div>

      {/* اختيار الشهر */}
      <MonthBar
        selectedMonth={selectedMonth}
        onSelectMonth={onSelectMonth}
        totalHoursLabel={`مجموع ساعات ${formatArabicMonthLabel(selectedMonth)}: ${payroll.totalAllWorkedHours.toFixed(1)} ساعة (${payroll.workedDays} يوم)`}
      />

      {/* شريط حساب سعر اليوم وساعة الشغل */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            سعر اليوم وساعة الشغل{' '}
            {config.basicSalary > 0
              ? `(على أساسي ${formatEGP(config.basicSalary)} جنيه)`
              : '(اكتب الأساسي تحت)'}
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {calcDays} يوم × {calcHours} ساعات = {calcDays * calcHours} ساعة/شهر
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-100 dark:divide-slate-800">
          <div className="p-4">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">سعر اليوم</div>
            <div className="mt-1 text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {formatEGP(payroll.dailyRate, 1)}{' '}
              <span className="text-xs font-sans font-normal text-slate-500">جنيه</span>
            </div>
          </div>
          <div className="p-4">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">ساعة الشغل العادية</div>
            <div className="mt-1 text-lg font-bold font-mono tabular-nums text-[#0F5C7E] dark:text-sky-400">
              {formatEGP(payroll.hourlyRate, 2)}{' '}
              <span className="text-xs font-sans font-normal text-slate-500">جنيه</span>
            </div>
          </div>
          <div className="p-4">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              إضافي نهاري ({calcDayOt}×)
            </div>
            <div className="mt-1 text-lg font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400">
              {formatEGP(payroll.dayOvertimeRate, 2)}{' '}
              <span className="text-xs font-sans font-normal text-slate-500">جنيه</span>
            </div>
          </div>
          <div className="p-4">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              إضافي ليلي ({calcNightOt}×)
            </div>
            <div className="mt-1 text-lg font-bold font-mono tabular-nums text-indigo-700 dark:text-indigo-400">
              {formatEGP(payroll.nightOvertimeRate, 2)}{' '}
              <span className="text-xs font-sans font-normal text-slate-500">جنيه</span>
            </div>
          </div>
          <div className="p-4 col-span-2 sm:col-span-1">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              ساعة الأعياد والإجازات ({calcHoliday}×)
            </div>
            <div className="mt-1 text-lg font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
              {formatEGP(payroll.holidayHourlyRate, 2)}{' '}
              <span className="text-xs font-sans font-normal text-slate-500">جنيه</span>
            </div>
          </div>
        </div>
      </section>

      {/* إدخال البيانات + كشف المرتب الصافي */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 print:hidden">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              اكتب الأساسي والحافز وبدل الوردية وساعات الشغل
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              أي رقم بتكتبه بيتحسب ويتحفظ فورًا لشهر{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {formatArabicMonthLabel(selectedMonth)}
              </strong>{' '}
              لوحده.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                المرتب الأساسي في الشهر (جنيه)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={fields.basicSalary}
                onChange={(e) => handleFieldChange('basicSalary', e.target.value)}
                placeholder="اكتب مرتبك الأساسي هنا..."
                className="w-full min-h-[44px] px-3.5 text-base font-bold font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
              />
            </div>

            {/* بند الحافز الشهري المستقل + خصم من الحافز */}
            <div>
              <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">
                الحافز الشهري (جنيه)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={fields.monthlyIncentive}
                onChange={(e) => handleFieldChange('monthlyIncentive', e.target.value)}
                placeholder="اكتب الحافز الشهري..."
                className="w-full min-h-[44px] px-3 text-sm font-bold font-mono rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-rose-700 dark:text-rose-400 mb-1.5">
                خصم من الحافز / جزاء (اختياري)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={fields.incentiveDeduction}
                onChange={(e) => handleFieldChange('incentiveDeduction', e.target.value)}
                placeholder="لو فيه خصم من الحافز..."
                className="w-full min-h-[44px] px-3 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                عدد أيام الشهر في الحسبة
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={fields.monthWorkDays}
                onChange={(e) => handleFieldChange('monthWorkDays', e.target.value)}
                placeholder="مثال: 30"
                className="w-full min-h-[44px] px-3 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                ساعات الشغل في اليوم
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={fields.dailyShiftHours}
                onChange={(e) => handleFieldChange('dailyShiftHours', e.target.value)}
                placeholder="مثال: 8"
                className="w-full min-h-[44px] px-3 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                بدل الوردية النهارية (لليوم)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={fields.dayShiftAllowance}
                onChange={(e) => handleFieldChange('dayShiftAllowance', e.target.value)}
                placeholder="مثال: 35"
                className="w-full min-h-[44px] px-3 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                بدل الوردية الليلية (لليوم)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={fields.nightShiftAllowance}
                onChange={(e) => handleFieldChange('nightShiftAllowance', e.target.value)}
                placeholder="مثال: 95"
                className="w-full min-h-[44px] px-3 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                بدلات ثابتة كل شهر (مواصلات / وجبة / طبيعة شغل)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={fields.fixedAllowances}
                onChange={(e) => handleFieldChange('fixedAllowances', e.target.value)}
                placeholder="اكتب مجموع البدلات الثابتة لو فيه..."
                className="w-full min-h-[44px] px-3 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                أجر التأمينات (لو مختلف — اختياري)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={fields.insuredWageOverride}
                onChange={(e) => handleFieldChange('insuredWageOverride', e.target.value)}
                placeholder="سيبه فاضي يحسب تلقائي"
                className="w-full min-h-[44px] px-3 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                يوم القبض في الشهر (اختياري)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={fields.paydayDay}
                onChange={(e) => handleFieldChange('paydayDay', e.target.value)}
                placeholder="مثال: 25"
                className="w-full min-h-[44px] px-3 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                حسبة ساعة الإضافي النهاري
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={fields.dayOvertimeMultiplier}
                onChange={(e) => handleFieldChange('dayOvertimeMultiplier', e.target.value)}
                placeholder="افتراضي: 1.35"
                className="w-full min-h-[44px] px-3 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                حسبة ساعة الإضافي الليلي
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={fields.nightOvertimeMultiplier}
                onChange={(e) => handleFieldChange('nightOvertimeMultiplier', e.target.value)}
                placeholder="افتراضي: 1.7"
                className="w-full min-h-[44px] px-3 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
              />
            </div>
          </div>

          {/* مفاتيح التأمينات والضرايب والحافز */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <label className="flex items-center justify-between gap-3 min-h-[40px] cursor-pointer">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                دخّل الحافز في الاستقطاعات (التأمينات والضرايب)
              </span>
              <input
                type="checkbox"
                checked={config.includeIncentiveInDeductions !== false}
                onChange={(e) =>
                  onUpdateConfig({ includeIncentiveInDeductions: e.target.checked })
                }
                className="w-5 h-5 rounded border-slate-300 text-[#0F5C7E] focus:ring-[#0F5C7E]"
              />
            </label>

            <label className="flex items-center justify-between gap-3 min-h-[40px] cursor-pointer">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                احسب التأمينات الاجتماعية ({config.socialInsuranceRate}%)
              </span>
              <input
                type="checkbox"
                checked={config.enableSocialInsurance}
                onChange={(e) =>
                  onUpdateConfig({ enableSocialInsurance: e.target.checked })
                }
                className="w-5 h-5 rounded border-slate-300 text-[#0F5C7E] focus:ring-[#0F5C7E]"
              />
            </label>

            <label className="flex items-center justify-between gap-3 min-h-[40px] cursor-pointer">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                احسب ضريبة كسب العمل المصرية
              </span>
              <input
                type="checkbox"
                checked={config.enableIncomeTax}
                onChange={(e) => onUpdateConfig({ enableIncomeTax: e.target.checked })}
                className="w-5 h-5 rounded border-slate-300 text-[#0F5C7E] focus:ring-[#0F5C7E]"
              />
            </label>

            <label className="flex items-center justify-between gap-3 min-h-[40px] cursor-pointer">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                احسب خصم صندوق الشهداء (0.05%)
              </span>
              <input
                type="checkbox"
                checked={config.enableMartyrsFund}
                onChange={(e) => onUpdateConfig({ enableMartyrsFund: e.target.checked })}
                className="w-5 h-5 rounded border-slate-300 text-[#0F5C7E] focus:ring-[#0F5C7E]"
              />
            </label>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() =>
                onUpdateConfig(config, {
                  applyAsDefault: false,
                  notifyMsg: `اتحفظت أرقام شهر ${formatArabicMonthLabel(selectedMonth)} لوحده.`,
                })
              }
              className="min-h-[44px] px-3.5 rounded-xl bg-[#0F5C7E] hover:bg-[#0B4A66] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>احفظ للشهر ده</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateConfig(config, {
                  applyAsDefault: true,
                  notifyMsg: 'اتحفظت الأرقام وهتتطبق على الشهور الجاية كمان.',
                })
              }
              className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold cursor-pointer"
            >
              طبّق على الشهور الجاية
            </button>
          </div>
        </section>

        {/* كشف المرتب الصافي وتفصيل الضريبة */}
        <div className="lg:col-span-7 space-y-5">
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>صافي المرتب اللي هتقبضه ·</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {formatArabicMonthLabel(selectedMonth)}
                  </span>
                </div>
                <div className="mt-1 text-3xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatEGP(payroll.netSalary)}{' '}
                  <span className="text-sm font-sans font-semibold text-slate-600 dark:text-slate-300">
                    جنيه مصري
                  </span>
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0F5C7E] dark:text-sky-400">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>بيتحسب لوحده أوفلاين من غير نت</span>
                </div>
              </div>

              <div className="text-right sm:text-left text-xs space-y-1">
                <div className="text-slate-600 dark:text-slate-300">
                  إجمالي اللي ليك قبل الخصم:{' '}
                  <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatEGP(payroll.grossSalary)} جنيه
                  </strong>
                </div>
                <div className="text-rose-700 dark:text-rose-400">
                  إجمالي الخصومات والضرايب:{' '}
                  <strong className="font-mono tabular-nums">
                    -{formatEGP(payroll.totalDeductions)} جنيه
                  </strong>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-100 dark:divide-slate-800">
              {/* اللي ليك */}
              <div className="p-5 space-y-3">
                <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  اللي ليك (المرتب والحافز والبدلات)
                </h3>
                <dl className="space-y-2.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-600 dark:text-slate-300">المرتب الأساسي</dt>
                    <dd className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                      {formatEGP(payroll.basicSalary)} جنيه
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-600 dark:text-slate-300 font-semibold">
                      الحافز الشهري
                    </dt>
                    <dd className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                      {formatEGP(payroll.monthlyIncentive)} جنيه
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-600 dark:text-slate-300">البدلات الثابتة</dt>
                    <dd className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                      {formatEGP(payroll.fixedAllowances)} جنيه
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-600 dark:text-slate-300">
                      بدل الورديات النهارية ({payroll.dayShiftCount} يوم)
                    </dt>
                    <dd className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                      {formatEGP(payroll.dayShiftAllowanceTotal)} جنيه
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-600 dark:text-slate-300">
                      بدل الورديات الليلية ({payroll.nightShiftCount} يوم)
                    </dt>
                    <dd className="font-mono tabular-nums font-semibold text-indigo-700 dark:text-indigo-400">
                      {formatEGP(payroll.nightShiftAllowanceTotal)} جنيه
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-600 dark:text-slate-300">
                      إضافي نهاري ({payroll.dayOvertimeHours} س)
                    </dt>
                    <dd className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                      {formatEGP(Math.round(payroll.dayOvertimePay))} جنيه
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-600 dark:text-slate-300">
                      إضافي ليلي ({payroll.nightOvertimeHours} س)
                    </dt>
                    <dd className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                      {formatEGP(Math.round(payroll.nightOvertimePay))} جنيه
                    </dd>
                  </div>
                  {payroll.holidayWorkPay > 0 && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-600 dark:text-slate-300">
                        شغل أعياد وإجازات ({payroll.holidayDays} يوم ×2)
                      </dt>
                      <dd className="font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                        {formatEGP(Math.round(payroll.holidayWorkPay))} جنيه
                      </dd>
                    </div>
                  )}
                  {payroll.customBonusesTotal > 0 && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-600 dark:text-slate-300">مكافآت وإضافات تانية</dt>
                      <dd className="font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                        {formatEGP(payroll.customBonusesTotal)} جنيه
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* اللي عليك */}
              <div className="p-5 space-y-3">
                <h3 className="text-xs font-bold text-rose-700 dark:text-rose-400">
                  اللي بيتخصم (الضرايب والاستقطاعات)
                </h3>
                <dl className="space-y-2.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-600 dark:text-slate-300">
                      التأمينات الاجتماعية{' '}
                      {payroll.insuredWage > 0 ? `(على ${formatEGP(payroll.insuredWage)})` : ''}
                    </dt>
                    <dd className="font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                      -{formatEGP(payroll.socialInsuranceEmployee)} جنيه
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-600 dark:text-slate-300">
                      ضريبة كسب العمل في الشهر
                    </dt>
                    <dd className="font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                      -{formatEGP(payroll.monthlyIncomeTax)} جنيه
                    </dd>
                  </div>
                  {payroll.martyrsFundDeduction > 0 && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-600 dark:text-slate-300">
                        صندوق الشهداء (0.05%)
                      </dt>
                      <dd className="font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                        -{formatEGP(payroll.martyrsFundDeduction)} جنيه
                      </dd>
                    </div>
                  )}
                  {payroll.incentiveDeduction > 0 && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-600 dark:text-slate-300 font-semibold">
                        خصم من الحافز / جزاء
                      </dt>
                      <dd className="font-mono tabular-nums font-bold text-rose-700 dark:text-rose-400">
                        -{formatEGP(payroll.incentiveDeduction)} جنيه
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-600 dark:text-slate-300">
                      خصم التأخير ({payroll.totalLateMinutes} دقيقة)
                    </dt>
                    <dd className="font-mono tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                      -{formatEGP(payroll.lateDeduction)} جنيه
                    </dd>
                  </div>
                  {payroll.absenceDeduction > 0 && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-600 dark:text-slate-300">
                        خصم الغياب ({payroll.absentDays} يوم)
                      </dt>
                      <dd className="font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                        -{formatEGP(payroll.absenceDeduction)} جنيه
                      </dd>
                    </div>
                  )}
                  {payroll.customDeductionsTotal > 0 && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-600 dark:text-slate-300">سلف وخصومات تانية</dt>
                      <dd className="font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                        -{formatEGP(payroll.customDeductionsTotal)} جنيه
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </section>

          {/* تفصيل ضريبة كسب العمل */}
          {config.enableIncomeTax && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowTaxBrackets((v) => !v)}
                className="w-full px-5 py-4 flex items-center justify-between gap-3 text-right hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    تفصيل حسبة ضريبة كسب العمل (بالسنة والشهر)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    الإعفاء الشخصي {formatEGP(payroll.annualPersonalExemption)} جنيه/سنة · اللي بيتحسب عليه ضريبة في السنة{' '}
                    <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                      {formatEGP(payroll.annualTaxableIncome)} جنيه
                    </span>
                  </p>
                </div>
                {showTaxBrackets ? (
                  <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                )}
              </button>

              {showTaxBrackets && (
                <div className="border-t border-slate-100 dark:border-slate-800 p-5 space-y-2.5">
                  {payroll.taxBrackets.length === 0 ? (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                      {payroll.grossSalary === 0
                        ? 'اكتب مرتبك الأساسي والحافز فوق عشان يظهرلك تفصيل الضريبة.'
                        : 'مرتبك جوه حد الإعفاء الضريبي — مفيش عليك ضريبة كسب عمل (0 جنيه).'}
                    </p>
                  ) : (
                    <>
                      {payroll.taxBrackets.map((b, i) => (
                        <div
                          key={i}
                          className="flex flex-wrap items-center justify-between gap-2 text-xs py-1.5 border-b last:border-b-0 border-slate-100 dark:border-slate-800/70"
                        >
                          <span className="text-slate-700 dark:text-slate-300">
                            {b.label} — على مبلغ{' '}
                            <span className="font-mono tabular-nums">
                              {formatEGP(b.taxableAmount)}
                            </span>{' '}
                            جنيه
                          </span>
                          <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                            {formatEGP(b.taxAmount)} جنيه/سنة
                          </span>
                        </div>
                      ))}
                      <div className="pt-2 flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                        <span>مجموع الضريبة في السنة ÷ 12 شهر</span>
                        <span className="font-mono tabular-nums text-rose-700 dark:text-rose-400">
                          {formatEGP(payroll.annualIncomeTax)} ÷ 12 ={' '}
                          {formatEGP(payroll.monthlyIncomeTax)} جنيه/شهر
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* السلف والمكافآت + محاكي الزيادة */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              سلف وخصومات أو مكافآت الشهر ده
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              سجّل أي سلفة أو قسط أو تأمين طبي أو مكافأة وهتتخصم أو تتضاف على صافي المرتب لوحدها.
            </p>
          </div>

          <form onSubmit={handleAddAdj} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjKind('deduction')}
                className={`min-h-[42px] rounded-xl border text-xs font-bold cursor-pointer ${
                  adjKind === 'deduction'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                خصم / سلفة (-)
              </button>
              <button
                type="button"
                onClick={() => setAdjKind('bonus')}
                className={`min-h-[42px] rounded-xl border text-xs font-bold cursor-pointer ${
                  adjKind === 'bonus'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                مكافأة / منحة (+)
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                required
                value={adjTitle}
                onChange={(e) => setAdjTitle(e.target.value)}
                placeholder="اكتب السبب (مثلاً: سلفة / منحة)"
                className="flex-1 min-h-[44px] px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
              />
              <input
                type="text"
                inputMode="decimal"
                required
                value={adjAmount}
                onChange={(e) => setAdjAmount(normalizeNumericInput(e.target.value))}
                placeholder="المبلغ"
                className="w-full sm:w-28 min-h-[44px] px-3 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
              />
              <button
                type="submit"
                className="min-h-[44px] px-4 rounded-xl bg-[#0F5C7E] hover:bg-[#0B4A66] text-white text-xs font-bold inline-flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>ضيف</span>
              </button>
            </div>
          </form>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {adjustments.length === 0 ? (
              <p className="py-4 text-xs text-slate-500 dark:text-slate-400 text-center">
                مفيش سلف ولا مكافآت متسجلة الشهر ده لسه.
              </p>
            ) : (
              adjustments.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {item.kind === 'bonus' ? 'بتتضاف للمرتب' : 'بتتخصم من المرتب'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-bold font-mono tabular-nums ${
                        item.kind === 'bonus'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {item.kind === 'bonus' ? '+' : '-'}
                      {formatEGP(item.amount)} جنيه
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteAdjustment(item.id)}
                      className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 cursor-pointer"
                      aria-label="مسح البند"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white inline-flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#0F5C7E] dark:text-sky-400" />
                <span>جرّب: مرتبي هيزيد كام؟</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                حرّك الشريط وشوف لو زودت ورديات ليلية أو إضافي هتقبض زيادة كام صافي بعد الضريبة.
              </p>
            </div>
            {simulatedPayroll && (
              <button
                type="button"
                onClick={() => {
                  setSimNightShifts(0);
                  setSimDayOvertime(0);
                  setSimNightOvertime(0);
                }}
                className="text-xs font-semibold text-[#0F5C7E] dark:text-sky-400 hover:underline cursor-pointer"
              >
                تصفير
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-700 dark:text-slate-300">ورديات ليلية زيادة</span>
                <span className="font-mono tabular-nums font-bold text-indigo-700 dark:text-indigo-400">
                  +{simNightShifts} وردية
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                value={simNightShifts}
                onChange={(e) => setSimNightShifts(Number(e.target.value))}
                className="w-full accent-[#0F5C7E]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-700 dark:text-slate-300">ساعات إضافي نهاري</span>
                <span className="font-mono tabular-nums font-bold text-amber-700 dark:text-amber-400">
                  +{simDayOvertime} ساعة
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={simDayOvertime}
                onChange={(e) => setSimDayOvertime(Number(e.target.value))}
                className="w-full accent-[#0F5C7E]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-700 dark:text-slate-300">ساعات إضافي ليلي</span>
                <span className="font-mono tabular-nums font-bold text-[#0F5C7E] dark:text-sky-400">
                  +{simNightOvertime} ساعة
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={simNightOvertime}
                onChange={(e) => setSimNightOvertime(Number(e.target.value))}
                className="w-full accent-[#0F5C7E]"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              {simulatedPayroll ? (
                <>
                  الصافي المتوقع بعد التجربة:{' '}
                  <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatEGP(simulatedPayroll.netSalary)} جنيه
                  </strong>
                </>
              ) : (
                'حرّك أي شريط فوق عشان تعرف الزيادة الصافية فورًا.'
              )}
            </div>
            {simulatedPayroll && (
              <div className="text-sm font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                +{formatEGP(simulatedPayroll.netSalary - payroll.netSalary)} جنيه صافي
              </div>
            )}
          </div>
        </section>
      </div>

      {/* جدول ملخص كل شهر لوحده */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden print:hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            حسبة كل شهر لوحده (الساعات والأساسي والحافز والصافي)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            اضغط على أي شهر عشان تفتحه وتشوف ساعاته ومرتبه لوحده.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">الشهر</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">الأيام</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">الساعات</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">الأساسي</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">الحافز</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">بدل الورديات</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">صافي المرتب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {monthlySummaries.map((row) => {
                const isSelected = row.monthKey === selectedMonth;
                return (
                  <tr
                    key={row.monthKey}
                    onClick={() => onSelectMonth(row.monthKey)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-sky-50/70 dark:bg-sky-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatArabicMonthLabel(row.monthKey)}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {row.workedDays} يوم
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums font-semibold text-[#0F5C7E] dark:text-sky-400 whitespace-nowrap">
                      {row.totalAllWorkedHours.toFixed(1)} س
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatEGP(row.basicSalary)} ج
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      {formatEGP(row.monthlyIncentive)} ج
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatEGP(row.totalShiftAllowance)} ج
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      {formatEGP(row.netSalary)} ج
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
