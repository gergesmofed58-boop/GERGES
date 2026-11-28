import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Calculator,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Edit3,
  LogIn,
  LogOut,
  MapPin,
  PlusCircle,
  Printer,
  Share2,
  SlidersHorizontal,
} from 'lucide-react';
import {
  DAY_STATUS_META,
  DayLogEntry,
  DayStatus,
  LEAVE_KIND_LABELS,
  MonthRecord,
  MonthlyCommitment,
  SalarySettings,
  SalaryTransaction,
  TRANSACTION_META,
  formatDayDateAr,
  formatMonthLabelAr,
  formatPayrollPeriodLabelAr,
  getCurrentMonthKey,
  getDayEntryFromAllMonths,
  getTodayIso,
  shiftMonthKey,
} from './types';
import {
  MonthlyPayrollSummary,
  calculateShiftTimes,
  computeAnnualLeaveBalance,
  computeCommitmentsSummary,
  computeDaysUntilPayday,
  computeMonthlyPayroll,
  exportMonthPayrollCsv,
  formatCleanNum,
  formatMoney,
} from './calculations';
import {
  formatTimeAr12h,
  getNextReminderSummary,
  getNormalizedReminders,
} from './reminderUtils';
import {
  GpsLiveState,
  formatDistanceAr,
  getNormalizedWorkLocation,
} from './gpsUtils';

interface DashboardViewProps {
  settings: SalarySettings;
  activeMonth: MonthRecord;
  allMonths: Record<string, MonthRecord>;
  transactions: SalaryTransaction[];
  commitments: MonthlyCommitment[];
  summary: MonthlyPayrollSummary;
  gpsState: GpsLiveState;
  isDemoData: boolean;
  onChangeMonth: (monthKey: string) => void;
  onQuickLogToday: (status: DayStatus, overtimeHours?: number) => void;
  onPunchTodayIn: () => void;
  onPunchTodayOut: () => void;
  onSaveTodayShiftTimes: (checkInTime: string, checkOutTime: string) => void;
  onOpenDayEditor: (dateIso: string) => void;
  onSetMonthInsurance: (amount: number | undefined) => void;
  onCheckGpsNow: () => void;
  onNavigateTab: (tab: 'dashboard' | 'calendar' | 'transactions' | 'settings') => void;
  onCopyWhatsappPayslip: () => void;
  onClearDemoData: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  settings,
  activeMonth,
  allMonths,
  transactions,
  commitments,
  summary,
  gpsState,
  isDemoData,
  onChangeMonth,
  onQuickLogToday,
  onPunchTodayIn,
  onPunchTodayOut,
  onSaveTodayShiftTimes,
  onOpenDayEditor,
  onSetMonthInsurance,
  onCheckGpsNow,
  onNavigateTab,
  onCopyWhatsappPayslip,
  onClearDemoData,
}) => {
  const [editingInsurance, setEditingInsurance] = useState(false);
  const [insuranceDraft, setInsuranceDraft] = useState('');
  const [savedShiftNotice, setSavedShiftNotice] = useState(false);
  const todayIso = getTodayIso();
  const currentMonthKey = getCurrentMonthKey();
  const isCurrentMonth = activeMonth.monthKey === currentMonthKey;
  const todayEntry: DayLogEntry | undefined = getDayEntryFromAllMonths(allMonths, todayIso);
  const currency = settings.currency;
  const remSettings = getNormalizedReminders(settings.reminders);
  const overtimeRule = settings.overtimeCalcRule ?? 'after_end_time';

  const [shiftInDraft, setShiftInDraft] = useState<string>(
    () => todayEntry?.checkInTime || remSettings.workStartTime
  );
  const [shiftOutDraft, setShiftOutDraft] = useState<string>(
    () => todayEntry?.checkOutTime || remSettings.workEndTime
  );

  useEffect(() => {
    setShiftInDraft(todayEntry?.checkInTime || remSettings.workStartTime);
  }, [todayEntry?.checkInTime, remSettings.workStartTime]);

  useEffect(() => {
    setShiftOutDraft(todayEntry?.checkOutTime || remSettings.workEndTime);
  }, [todayEntry?.checkOutTime, remSettings.workEndTime]);

  const liveShiftPreview = useMemo(() => {
    if (!shiftInDraft || !shiftOutDraft) return null;
    return calculateShiftTimes(
      shiftInDraft,
      shiftOutDraft,
      remSettings.workStartTime,
      settings.dailyWorkHours,
      remSettings.workEndTime,
      overtimeRule
    );
  }, [
    shiftInDraft,
    shiftOutDraft,
    remSettings.workStartTime,
    remSettings.workEndTime,
    settings.dailyWorkHours,
    overtimeRule,
  ]);
  const cycleStartDay = settings.cycleStartDay ?? 1;
  const periodLabel = formatPayrollPeriodLabelAr(activeMonth.monthKey, cycleStartDay);
  const paydayInfo = computeDaysUntilPayday(settings.paydayDayOfMonth ?? 1);
  const leaveBalance = useMemo(
    () => computeAnnualLeaveBalance(settings, allMonths, activeMonth.monthKey.slice(0, 4)),
    [settings, allMonths, activeMonth.monthKey]
  );
  const commitmentsSummary = useMemo(
    () => computeCommitmentsSummary(commitments, activeMonth.monthKey),
    [commitments, activeMonth.monthKey]
  );
  const netAfterCommitments = summary.netSalary - commitmentsSummary.total;

  const monthTransactions = useMemo(
    () =>
      transactions
        .filter((t) =>
          cycleStartDay === 1
            ? t.monthKey === activeMonth.monthKey
            : t.dateIso >= summary.periodStartIso && t.dateIso <= summary.periodEndIso
        )
        .sort((a, b) => b.dateIso.localeCompare(a.dateIso))
        .slice(0, 5),
    [
      transactions,
      activeMonth.monthKey,
      cycleStartDay,
      summary.periodStartIso,
      summary.periodEndIso,
    ]
  );

  // Recent months summary comparison
  const recentMonthsHistory = useMemo(() => {
    const keys = Object.keys(allMonths).sort((a, b) => b.localeCompare(a)).slice(0, 6);
    return keys.map((mk) => {
      const s = computeMonthlyPayroll(settings, allMonths, mk, transactions);
      return { monthKey: mk, summary: s };
    });
  }, [allMonths, settings, transactions]);

  const progressPct = Math.min(
    100,
    Math.round(
      (summary.totalWorkedDaysEquivalent / Math.max(1, settings.workingDaysPerMonth)) * 100
    )
  );

  const salaryModeLabel =
    settings.salaryMode === 'monthly'
      ? `شهري (${formatMoney(settings.baseAmount, currency)})`
      : settings.salaryMode === 'daily'
      ? `يومية (${formatMoney(settings.baseAmount, currency)} / يوم)`
      : `بالساعة (${formatMoney(settings.baseAmount, currency)} / ساعة)`;

  return (
    <div className="space-y-6">
      {/* Demo data banner */}
      {isDemoData && (
        <div className="rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/70 px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-emerald-950 dark:text-emerald-100">
            <span className="font-bold">بيانات تجريبية للتوضيح:</span>{' '}
            <span className="text-emerald-800 dark:text-emerald-200">
              عدّل مرتبك من «إعدادات المرتب» أو امسح البيانات التجريبية وابدأ تسجّل شغلك الحقيقي.
            </span>
          </div>
          <button
            type="button"
            onClick={onClearDemoData}
            className="min-h-[40px] px-4 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 whitespace-nowrap shrink-0 transition-colors"
          >
            مسح البيانات التجريبية والبدء من الصفر
          </button>
        </div>
      )}

      {/* Month Switcher + Hero Net Salary Anchor */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeMonth(shiftMonthKey(activeMonth.monthKey, -1))}
              aria-label="الشهر السابق"
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="px-1">
              <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {periodLabel}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {settings.employeeName.trim() ? `${settings.employeeName.trim()} · ` : ''}
                {salaryModeLabel} ·{' '}
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {paydayInfo.label}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => onChangeMonth(shiftMonthKey(activeMonth.monthKey, 1))}
              aria-label="الشهر التالي"
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {!isCurrentMonth && (
              <button
                type="button"
                onClick={() => onChangeMonth(currentMonthKey)}
                className="min-h-[38px] px-3 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 whitespace-nowrap"
              >
                الشهر الحالي
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                exportMonthPayrollCsv(settings, allMonths, activeMonth.monthKey, summary)
              }
              className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>تصدير Excel</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:inline-flex min-h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 items-center gap-1.5 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>طباعة</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('settings')}
              className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>تعديل المرتب</span>
            </button>
          </div>
        </div>

        {/* Dominant Focal Anchor: Net Salary */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              صافي المرتب المستحق ({periodLabel})
            </p>
            <p
              className={`text-3xl sm:text-5xl font-bold font-mono tabular-nums tracking-tight mt-1 ${
                summary.netSalary >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatMoney(summary.netSalary, currency)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 tabular-nums">
              أجر اليوم: {formatMoney(summary.effectiveDailyRate, currency)} · ساعة الإضافي:{' '}
              {formatMoney(summary.effectiveOvertimeHourRate, currency)}
            </p>
            {commitmentsSummary.total > 0 && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 tabular-nums">
                المتبقي بعد الالتزامات ({formatMoney(commitmentsSummary.total, currency)}):{' '}
                <strong
                  className={`font-mono ${
                    netAfterCommitments >= 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatMoney(netAfterCommitments, currency)}
                </strong>{' '}
                ·{' '}
                <button
                  type="button"
                  onClick={() => onNavigateTab('transactions')}
                  className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  تفاصيل الميزانية
                </button>
              </p>
            )}
          </div>

          {/* Progress toward monthly working days target */}
          <div className="w-full lg:w-80 space-y-2">
            <div className="flex items-center justify-between text-xs tabular-nums">
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                أيام الشغل المسجّلة
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {formatCleanNum(summary.totalWorkedDaysEquivalent)} / {settings.workingDaysPerMonth} يوم ({progressPct}%)
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-200"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* 4-Column Full-Width KPI Strip */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">إجمالي المستحقات</p>
            <p className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
              {formatMoney(summary.grossEarnings, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              قيمة الإضافي ({formatCleanNum(summary.totalOvertimeHours)} س)
            </p>
            <p className="text-lg sm:text-xl font-bold font-mono text-indigo-700 dark:text-indigo-400 mt-0.5">
              +{formatMoney(summary.overtimePay + summary.extraDaysPay, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">السُلف المسحوبة</p>
            <p className="text-lg sm:text-xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-0.5">
              -{formatMoney(summary.advancesTotal, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              إجمالي الخصومات والغياب
            </p>
            <p className="text-lg sm:text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
              -{formatMoney(summary.totalDeductions - summary.advancesTotal, currency)}
            </p>
          </div>
        </div>
      </section>

      {/* Quick 1-Tap Today Check-in (Shown when viewing current month) */}
      {isCurrentMonth && (
        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                تسجيل شغل النهاردة — {formatDayDateAr(todayIso)}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {todayEntry
                  ? `الحالة الحالية: ${DAY_STATUS_META[todayEntry.status].label}${
                      todayEntry.status === 'paid_leave' && todayEntry.leaveKind
                        ? ` (${LEAVE_KIND_LABELS[todayEntry.leaveKind]})`
                        : ''
                    }${
                      todayEntry.checkInTime
                        ? ` · دخول ${formatTimeAr12h(todayEntry.checkInTime)}`
                        : ''
                    }${
                      todayEntry.checkOutTime
                        ? ` · خروج ${formatTimeAr12h(todayEntry.checkOutTime)}`
                        : ''
                    }${
                      todayEntry.overtimeHours > 0
                        ? ` · +${formatCleanNum(todayEntry.overtimeHours)} س إضافي`
                        : ''
                    }${
                      todayEntry.lateMinutes && todayEntry.lateMinutes > 0
                        ? ` · تأخير ${todayEntry.lateMinutes} د`
                        : ''
                    }`
                  : 'لم يتم تسجيل اليوم بعد — اضغط لتسجيل دخولك أو حالتك فوراً'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateTab('settings')}
                className="min-h-[38px] px-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/70 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>ضبط المنبّه</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenDayEditor(todayIso)}
                className="min-h-[38px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                تفاصيل أكتر لليوم
              </button>
            </div>
          </div>

          {/* Quiet inline work schedule, next reminder & offline GPS line */}
          {(() => {
            const rem = getNormalizedReminders(settings.reminders);
            const loc = getNormalizedWorkLocation(settings.workLocation);
            const hasCoords = loc.latitude !== null && loc.longitude !== null;
            return (
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    مواعيد العمل: {formatTimeAr12h(rem.workStartTime)} –{' '}
                    {formatTimeAr12h(rem.workEndTime)}
                  </span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {getNextReminderSummary(rem)}
                  </span>
                </div>

                {loc.enabled && hasCoords && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/70">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      {gpsState.errorMsg ? (
                        <span className="text-rose-600 dark:text-rose-400">
                          {gpsState.errorMsg}
                        </span>
                      ) : gpsState.distanceMeters !== null ? (
                        <span
                          className={
                            gpsState.isInside
                              ? 'font-bold text-emerald-700 dark:text-emerald-400'
                              : ''
                          }
                        >
                          {gpsState.isInside
                            ? `داخل نطاق ${loc.placeName || 'العمل'} (${formatDistanceAr(
                                gpsState.distanceMeters
                              )})`
                            : `تبعد عن ${loc.placeName || 'العمل'}: ${formatDistanceAr(
                                gpsState.distanceMeters
                              )}`}
                        </span>
                      ) : (
                        <span>
                          الـ GPS الأوفلاين جاهز ({loc.placeName || 'مقر العمل'} · نطاق{' '}
                          {loc.radiusMeters}م)
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={onCheckGpsNow}
                      className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
                    >
                      فحص موقعي الآن
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 1-Tap Live Punch-In / Punch-Out Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onPunchTodayIn}
              className="min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>
                {todayEntry?.checkInTime
                  ? `تحديث وقت الدخول (${formatTimeAr12h(todayEntry.checkInTime)})`
                  : 'تسجيل دخول الشغل الآن'}
              </span>
            </button>
            <button
              type="button"
              onClick={onPunchTodayOut}
              className="min-h-[44px] px-4 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/35 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>
                {todayEntry?.checkOutTime
                  ? `تحديث الخروج (${formatTimeAr12h(todayEntry.checkOutTime)})`
                  : 'تسجيل خروج الآن (يحسب الإضافي تلقائياً)'}
              </span>
            </button>
          </div>

          {/* Inline Work Time -> Auto Overtime Calculator & 1-Tap Save */}
          <div className="rounded-xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>احسب الإضافي تلقائياً بوقت اليوم (من — إلى)</span>
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                {overtimeRule === 'after_end_time'
                  ? `الإضافي يُحسب بعد ${formatTimeAr12h(remSettings.workEndTime)}`
                  : `الإضافي يُحسب بعد ${formatCleanNum(settings.dailyWorkHours)} ساعات عمل`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-12 gap-2.5 items-end">
              <div className="sm:col-span-3 space-y-1">
                <label
                  htmlFor="dash-shift-in"
                  className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400"
                >
                  وقت الدخول
                </label>
                <input
                  id="dash-shift-in"
                  type="time"
                  value={shiftInDraft}
                  onChange={(e) => setShiftInDraft(e.target.value)}
                  className="w-full min-h-[40px] px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label
                  htmlFor="dash-shift-out"
                  className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400"
                >
                  وقت الخروج
                </label>
                <input
                  id="dash-shift-out"
                  type="time"
                  value={shiftOutDraft}
                  onChange={(e) => setShiftOutDraft(e.target.value)}
                  className="w-full min-h-[40px] px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="col-span-2 sm:col-span-6 flex flex-wrap items-center justify-between gap-2">
                {liveShiftPreview && (
                  <div className="text-xs tabular-nums">
                    <span className="text-slate-600 dark:text-slate-400">
                      المدة: <strong className="font-mono">{formatCleanNum(liveShiftPreview.workedHours)} س</strong> · الإضافي:{' '}
                    </span>
                    <strong
                      className={`font-mono ${
                        liveShiftPreview.overtimeHours > 0
                          ? 'text-indigo-700 dark:text-indigo-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {liveShiftPreview.overtimeHours > 0
                        ? `+${formatCleanNum(liveShiftPreview.overtimeHours)} س (+${formatMoney(
                            liveShiftPreview.overtimeHours * summary.effectiveOvertimeHourRate,
                            currency
                          )})`
                        : '0 س'}
                    </strong>
                    {liveShiftPreview.lateMinutes > 0 && (
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">
                        {' '}
                        · تأخير {liveShiftPreview.lateMinutes} د
                      </span>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!shiftInDraft || !shiftOutDraft) return;
                    onSaveTodayShiftTimes(shiftInDraft, shiftOutDraft);
                    setSavedShiftNotice(true);
                    window.setTimeout(() => setSavedShiftNotice(false), 2000);
                  }}
                  className="min-h-[40px] px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{savedShiftNotice ? 'اتسجّل اليوم!' : 'حفظ الوقت والإضافي'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <button
              type="button"
              onClick={() => onQuickLogToday('present', 0)}
              className={`min-h-[44px] px-3 rounded-xl border text-xs font-bold transition-colors ${
                todayEntry?.status === 'present' && todayEntry.overtimeHours === 0
                  ? 'bg-emerald-700 border-emerald-700 text-white'
                  : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/70'
              }`}
            >
              حضور عادي
            </button>
            <button
              type="button"
              onClick={() => onQuickLogToday('present', 2)}
              className={`min-h-[44px] px-3 rounded-xl border text-xs font-bold transition-colors ${
                todayEntry?.status === 'present' && todayEntry.overtimeHours === 2
                  ? 'bg-indigo-700 border-indigo-700 text-white'
                  : 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/70 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100/70'
              }`}
            >
              حضور + 2 س إضافي
            </button>
            <button
              type="button"
              onClick={() => onQuickLogToday('half_day', 0)}
              className={`min-h-[44px] px-3 rounded-xl border text-xs font-bold transition-colors ${
                todayEntry?.status === 'half_day'
                  ? 'bg-amber-600 border-amber-600 text-white'
                  : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/70 text-amber-800 dark:text-amber-300 hover:bg-amber-100/70'
              }`}
            >
              نص يوم
            </button>
            <button
              type="button"
              onClick={() => onQuickLogToday('extra_day', 0)}
              className={`min-h-[44px] px-3 rounded-xl border text-xs font-bold transition-colors ${
                todayEntry?.status === 'extra_day'
                  ? 'bg-indigo-700 border-indigo-700 text-white'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
              }`}
            >
              يوم عطلة / جمعة
            </button>
            <button
              type="button"
              onClick={() => onQuickLogToday('paid_leave', 0)}
              className={`min-h-[44px] px-3 rounded-xl border text-xs font-bold transition-colors ${
                todayEntry?.status === 'paid_leave'
                  ? 'bg-sky-700 border-sky-700 text-white'
                  : 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/70 text-sky-800 dark:text-sky-300'
              }`}
            >
              إجازة مدفوعة
            </button>
            <button
              type="button"
              onClick={() => onQuickLogToday('absent', 0)}
              className={`min-h-[44px] px-3 rounded-xl border text-xs font-bold transition-colors ${
                todayEntry?.status === 'absent'
                  ? 'bg-rose-600 border-rose-600 text-white'
                  : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/70 text-rose-700 dark:text-rose-300'
              }`}
            >
              غياب
            </button>
          </div>
        </section>
      )}

      {/* 2-Column Balanced Detail Split: Payslip Breakdown + Recent Ledger & Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Column 1: Detailed Transparent Payslip */}
        <section className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  تفصيل كشف المرتب الشهري
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  حساب تلقائي واضح لكل بند من المستحقات والاستقطاعات
                </p>
              </div>
              <button
                type="button"
                onClick={onCopyWhatsappPayslip}
                className="min-h-[38px] px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>نسخ للواتساب</span>
              </button>
            </div>

            {/* Earnings Group */}
            <div className="space-y-2.5 text-sm">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                أولاً: المستحقات والإضافات
              </p>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                <div className="py-2 flex items-center justify-between gap-2">
                  <span className="text-slate-700 dark:text-slate-300">
                    {settings.salaryMode === 'monthly'
                      ? 'المرتب الأساسي الشهري'
                      : settings.salaryMode === 'daily'
                      ? `أجر أيام الحضور (${formatCleanNum(
                          summary.presentDays + summary.paidLeaveDays + summary.halfDays * 0.5
                        )} يوم)`
                      : `أجر ساعات العمل (${formatCleanNum(summary.totalWorkHours)} س)`}
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatMoney(summary.basePay, currency)}
                  </span>
                </div>

                {summary.allowancesTotal > 0 && (
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-700 dark:text-slate-300">
                      البدلات الثابتة (مواصلات / وجبة / أخرى)
                    </span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      +{formatMoney(summary.allowancesTotal, currency)}
                    </span>
                  </div>
                )}

                {summary.overtimePay > 0 && (
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-700 dark:text-slate-300">
                      ساعات الإضافي ({formatCleanNum(summary.totalOvertimeHours)} س ×{' '}
                      {formatMoney(summary.effectiveOvertimeHourRate, currency)})
                    </span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      +{formatMoney(summary.overtimePay, currency)}
                    </span>
                  </div>
                )}

                {summary.extraDaysPay > 0 && (
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-700 dark:text-slate-300">
                      أيام العطلات / الجمعة ({summary.extraDays} يوم × {settings.extraDayMultiplier}x)
                    </span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      +{formatMoney(summary.extraDaysPay, currency)}
                    </span>
                  </div>
                )}

                {summary.totalBonuses > 0 && (
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-700 dark:text-slate-300">المكافآت والحوافز</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      +{formatMoney(summary.totalBonuses, currency)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Deductions Group */}
            <div className="space-y-2.5 text-sm pt-2">
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                ثانياً: السُلف والتأمينات والخصومات
              </p>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {/* Manual Social Insurance Row (Always accessible directly on payslip) */}
                <div className="py-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        التأمينات الاجتماعية
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {activeMonth.manualInsurance !== undefined
                          ? '(يدوي لهذا الشهر)'
                          : settings.insuranceMode === 'percent'
                          ? `(${settings.insurancePercent ?? 11}% من الأساسي)`
                          : '(ثابت شهرياً)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          summary.socialInsuranceDeduction > 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {summary.socialInsuranceDeduction > 0
                          ? `-${formatMoney(summary.socialInsuranceDeduction, currency)}`
                          : `0 ${currency}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setInsuranceDraft(
                            summary.socialInsuranceDeduction > 0
                              ? String(summary.socialInsuranceDeduction)
                              : ''
                          );
                          setEditingInsurance((v) => !v);
                        }}
                        className="min-h-[32px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 whitespace-nowrap"
                      >
                        <Edit3 className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                        <span>إدخال يدوي</span>
                      </button>
                    </div>
                  </div>

                  {editingInsurance && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const parsed = parseFloat(insuranceDraft);
                        onSetMonthInsurance(
                          Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
                        );
                        setEditingInsurance(false);
                      }}
                      className="flex flex-wrap items-center gap-2 pt-1"
                    >
                      <input
                        type="number"
                        min="0"
                        step="any"
                        autoFocus
                        value={insuranceDraft}
                        onChange={(e) => setInsuranceDraft(e.target.value)}
                        placeholder={`اكتب مبلغ التأمينات (${currency})...`}
                        className="flex-1 min-w-[150px] min-h-[38px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-emerald-400 dark:border-emerald-700 text-xs font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100"
                      />
                      <button
                        type="submit"
                        className="min-h-[38px] px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>حفظ</span>
                      </button>
                      {activeMonth.manualInsurance !== undefined && (
                        <button
                          type="button"
                          onClick={() => {
                            onSetMonthInsurance(undefined);
                            setEditingInsurance(false);
                          }}
                          className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap"
                        >
                          رجوع للافتراضي
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingInsurance(false)}
                        className="min-h-[38px] px-2.5 rounded-xl text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        إلغاء
                      </button>
                    </form>
                  )}
                </div>

                {summary.advancesTotal > 0 && (
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-700 dark:text-slate-300">السُلف المسحوبة</span>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                      -{formatMoney(summary.advancesTotal, currency)}
                    </span>
                  </div>
                )}
                {summary.absenceDeduction > 0 && (
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-700 dark:text-slate-300">
                      خصم الغياب ({summary.absentDays} يوم × {settings.absencePenaltyMultiplier}x)
                    </span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      -{formatMoney(summary.absenceDeduction, currency)}
                    </span>
                  </div>
                )}
                {summary.halfDayDeduction > 0 && (
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-700 dark:text-slate-300">
                      خصم نص يوم ({summary.halfDays} يوم)
                    </span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      -{formatMoney(summary.halfDayDeduction, currency)}
                    </span>
                  </div>
                )}
                {summary.otherFixedDeduction > 0 && (
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-700 dark:text-slate-300">
                      استقطاعات ثابتة أخرى
                    </span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      -{formatMoney(summary.otherFixedDeduction, currency)}
                    </span>
                  </div>
                )}
                {summary.dailyDeductionsTotal + summary.ledgerDeductionsTotal > 0 && (
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-700 dark:text-slate-300">
                      خصومات التأخير والجزاءات
                    </span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      -
                      {formatMoney(
                        summary.dailyDeductionsTotal + summary.ledgerDeductionsTotal,
                        currency
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Final Net Footer Line */}
          <div className="pt-3.5 border-t-2 border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
            <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              صافي المرتب النهائي
            </span>
            <span
              className={`text-lg sm:text-2xl font-bold font-mono tabular-nums ${
                summary.netSalary >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatMoney(summary.netSalary, currency)}
            </span>
          </div>
        </section>

        {/* Column 2: Attendance Breakdown + Latest Advances/Bonuses */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Attendance Breakdown */}
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                ملخص الحضور والأيام
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('calendar')}
                className="min-h-[36px] px-3 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-1 whitespace-nowrap"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>فتح التقويم</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 tabular-nums text-center">
              <div className="rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 p-3">
                <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  حضور
                </div>
                <div className="text-xl font-bold font-mono text-emerald-900 dark:text-emerald-200 mt-0.5">
                  {summary.presentDays}
                </div>
              </div>
              <div className="rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 p-3">
                <div className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">
                  إضافي (س)
                </div>
                <div className="text-xl font-bold font-mono text-indigo-900 dark:text-indigo-200 mt-0.5">
                  {formatCleanNum(summary.totalOvertimeHours)}
                </div>
              </div>
              <div className="rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 p-3">
                <div className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                  غياب
                </div>
                <div className="text-xl font-bold font-mono text-rose-700 dark:text-rose-300 mt-0.5">
                  {summary.absentDays}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums pt-1">
              <span>نص يوم: {summary.halfDays}</span>
              <span aria-hidden="true">·</span>
              <span>أيام عطلات مشتغلة: {summary.extraDays}</span>
              <span aria-hidden="true">·</span>
              <span>إجازات مدفوعة: {summary.paidLeaveDays}</span>
              {summary.totalLateMinutes > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-700 dark:text-amber-400 font-semibold">
                    تأخير: {summary.totalLateMinutes} دقيقة
                  </span>
                </>
              )}
            </div>

            {/* Annual & Casual Leave Balance */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs tabular-nums">
              <div className="flex items-center justify-between gap-2 text-slate-700 dark:text-slate-300 font-bold">
                <span>رصيد إجازاتك السنوية ({leaveBalance.year})</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400">
                  سنوية: {leaveBalance.annualRemaining}/{leaveBalance.annualQuota} · عارضة:{' '}
                  {leaveBalance.casualRemaining}/{leaveBalance.casualQuota}
                </span>
              </div>
              {leaveBalance.sickUsed > 0 && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  إجازات مرضية مسجّلة هذا العام: {leaveBalance.sickUsed} يوم
                </p>
              )}
            </div>
          </section>

          {/* Latest Transactions in Month */}
          <section className="flex-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  آخر السُلف والمكافآت والخصومات
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigateTab('transactions')}
                  className="min-h-[36px] px-3 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-1 whitespace-nowrap"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>إضافة حركة</span>
                </button>
              </div>

              {monthTransactions.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                  لا توجد سلف أو مكافآت مسجّلة هذا الشهر بعد.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {monthTransactions.map((tx) => {
                    const meta = TRANSACTION_META[tx.type];
                    return (
                      <div
                        key={tx.id}
                        className="py-2.5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {tx.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            {meta.label} · {formatDayDateAr(tx.dateIso)}
                          </div>
                        </div>
                        <div
                          className={`text-sm font-mono font-bold tabular-nums whitespace-nowrap shrink-0 ${meta.text}`}
                        >
                          {meta.sign}
                          {formatMoney(tx.amount, currency)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {recentMonthsHistory.length > 1 && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>مقارنة الشهور المحفوظة</span>
                </div>
                <div className="space-y-1.5">
                  {recentMonthsHistory.map((item) => (
                    <button
                      key={item.monthKey}
                      type="button"
                      onClick={() => onChangeMonth(item.monthKey)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                        item.monthKey === activeMonth.monthKey
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 font-bold text-emerald-900 dark:text-emerald-200'
                          : 'bg-slate-50/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <span>{formatMonthLabelAr(item.monthKey)}</span>
                      <span className="font-mono font-bold tabular-nums">
                        {formatMoney(item.summary.netSalary, currency)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
