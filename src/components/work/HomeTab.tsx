import React, { useState } from 'react';
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  Moon,
  ShieldCheck,
  Smartphone,
  Sun,
  Wallet,
} from 'lucide-react';
import { useBackgroundShift } from '../../hooks/useBackgroundShift';
import type { ActiveClockInState } from '../../hooks/useWorkAppStore';
import type {
  AppTab,
  AttendanceRecord,
  ComputedPayroll,
  LeaveQuotas,
  LeaveRecord,
  SalaryConfig,
  UserProfile,
  WorkShift,
} from '../../types/workApp';
import {
  formatArabicMonthLabel,
  formatEGP,
  getArabicWeekday,
  getDaysUntilPayday,
  normalizeNumericInput,
  parseNumericString,
} from '../../utils/payrollEngine';
import { MonthBar } from './MonthBar';

interface HomeTabProps {
  profile: UserProfile;
  salaryConfig: SalaryConfig;
  payroll: ComputedPayroll;
  monthAttendance: AttendanceRecord[];
  leaves: LeaveRecord[];
  leaveQuotas: LeaveQuotas;
  activeClockIn: ActiveClockInState | null;
  todayDate: string;
  selectedMonth: string;
  onSelectMonth: (monthKey: string) => void;
  onClockIn: (shift: WorkShift) => void;
  onClockOut: () => void;
  onCancelActiveShift: () => void;
  onQuickUpdateSalary: (patch: Partial<SalaryConfig>) => void;
  onNavigate: (tab: AppTab) => void;
  onQuickAddLeave: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  profile,
  salaryConfig,
  payroll,
  monthAttendance,
  leaves,
  leaveQuotas,
  activeClockIn,
  todayDate,
  selectedMonth,
  onSelectMonth,
  onClockIn,
  onClockOut,
  onCancelActiveShift,
  onQuickUpdateSalary,
  onNavigate,
  onQuickAddLeave,
}) => {
  const [selectedShift, setSelectedShift] = useState<WorkShift>(
    profile.defaultShift
  );
  const [quickBasicText, setQuickBasicText] = useState('');
  const [quickIncentiveText, setQuickIncentiveText] = useState('');
  const [quickHoursText, setQuickHoursText] = useState('');

  const {
    nowMs,
    wakeLockActive,
    supportsWakeLock,
    supportsNotifications,
    notifPermission,
    requestNotifications,
    toggleWakeLock,
  } = useBackgroundShift(activeClockIn);

  const currentClock = new Date(nowMs).toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const elapsedSec = activeClockIn
    ? Math.max(0, Math.floor((nowMs - activeClockIn.startedAtMs) / 1000))
    : 0;

  const elapsedText = (() => {
    if (!activeClockIn) return null;
    const h = Math.floor(elapsedSec / 3600);
    const m = Math.floor((elapsedSec % 3600) / 60);
    const s = elapsedSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  })();

  const runningShiftHours = elapsedSec / 3600;
  const runningShiftAllowance = activeClockIn
    ? activeClockIn.shift === 'night'
      ? salaryConfig.nightShiftAllowance
      : salaryConfig.dayShiftAllowance
    : 0;
  const runningTargetHrs =
    activeClockIn?.targetHours || salaryConfig.dailyShiftHours || 8;
  const runningOvertimeHrs = Math.max(0, runningShiftHours - runningTargetHrs);
  const runningOvertimePay =
    runningOvertimeHrs *
    (activeClockIn?.shift === 'night'
      ? payroll.nightOvertimeRate
      : payroll.dayOvertimeRate);

  const annualUsed = leaves
    .filter((l) => l.type === 'annual')
    .reduce((sum, l) => sum + l.days, 0);
  const annualRemaining = Math.max(0, leaveQuotas.annual - annualUsed);

  const effectiveMonthDays = salaryConfig.monthWorkDays > 0 ? salaryConfig.monthWorkDays : 30;
  const effectiveDailyHours = salaryConfig.dailyShiftHours > 0 ? salaryConfig.dailyShiftHours : 8;
  const targetMonthlyHours = Math.min(26, effectiveMonthDays) * effectiveDailyHours;
  const hoursProgress = Math.min(
    100,
    Math.round((payroll.totalWorkedHours / Math.max(1, targetMonthlyHours)) * 100)
  );

  const daysUntilPayday = getDaysUntilPayday(salaryConfig.paydayDay);
  const recentLogs = monthAttendance.slice(0, 4);

  const handleQuickSalarySave = (e: React.FormEvent) => {
    e.preventDefault();
    const basic = parseNumericString(quickBasicText);
    const inc = parseNumericString(quickIncentiveText);
    const hrs = parseNumericString(quickHoursText);
    if (basic <= 0 && inc <= 0 && hrs <= 0) return;
    onQuickUpdateSalary({
      ...(basic > 0 ? { basicSalary: basic } : {}),
      ...(inc > 0 ? { monthlyIncentive: inc } : {}),
      ...(hrs > 0 ? { dailyShiftHours: hrs } : {}),
    });
    setQuickBasicText('');
    setQuickIncentiveText('');
    setQuickHoursText('');
  };

  return (
    <div className="space-y-5">
      {/* كارت تسجيل الحضور والانصراف والعداد اللي بيفضل شغال في الخلفية */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              {profile.companyName && (
                <>
                  <span>{profile.companyName}</span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span>{getArabicWeekday(todayDate)}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{todayDate}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight text-balance">
              {profile.name.trim() ? `أهلاً يا ${profile.name}` : 'أهلاً بيك في شغلي ومرتبي'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              {profile.jobTitle.trim() || profile.employeeCode.trim() ? (
                <>
                  {profile.jobTitle}
                  {profile.jobTitle && profile.employeeCode ? ' — كود ' : ''}
                  {profile.employeeCode && (
                    <span className="font-mono tabular-nums font-semibold">
                      {profile.employeeCode}
                    </span>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate('profile')}
                  className="text-[#0F5C7E] dark:text-sky-400 font-semibold hover:underline cursor-pointer"
                >
                  اكتب اسمك وبياناتك من صفحة «بياناتي»
                </button>
              )}
            </p>
          </div>

          {/* الساعة + اختيار الوردية + زرار البدء والقفل */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between sm:block sm:pl-4 sm:border-l border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {activeClockIn
                    ? `وردية شغالة (${
                        activeClockIn.shift === 'night' ? 'ليلية' : 'نهارية'
                      }) من الساعة ${activeClockIn.checkInTime}`
                    : 'الساعة دلوقتي'}
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                  {activeClockIn ? elapsedText : currentClock}
                </div>
              </div>

              {!activeClockIn && (
                <div
                  className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 sm:mt-2"
                  role="group"
                  aria-label="اختار نوع الوردية"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedShift('day')}
                    className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      selectedShift === 'day'
                        ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>نهاري</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedShift('night')}
                    className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      selectedShift === 'night'
                        ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>ليلي</span>
                  </button>
                </div>
              )}
            </div>

            {activeClockIn ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={onClockOut}
                  className="min-h-[48px] px-6 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>اقفل الوردية واحفظها</span>
                </button>
                <button
                  type="button"
                  onClick={onCancelActiveShift}
                  className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onClockIn(selectedShift)}
                className="min-h-[48px] px-6 rounded-xl bg-[#0F5C7E] hover:bg-[#0B4A66] active:scale-[0.98] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  ابدأ الوردية ({selectedShift === 'night' ? 'ليلية' : 'نهارية'})
                </span>
              </button>
            )}
          </div>
        </div>

        {/* شريط حالة الاستمرار في الخلفية حتى لو البرنامج مقفول */}
        {activeClockIn && (
          <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                العداد شغال في الخلفية حتى لو قفلت البرنامج أو الشاشة — اشتغلت لحد دلوقتي{' '}
                <span className="font-mono tabular-nums font-bold">
                  {runningShiftHours.toFixed(2)} س
                </span>
                {(runningShiftAllowance > 0 || runningOvertimePay > 0) && (
                  <>
                    {' '}
                    (بدل + إضافي متوقع:{' '}
                    <span className="font-mono tabular-nums font-bold">
                      {formatEGP(Math.round(runningShiftAllowance + runningOvertimePay))} ج
                    </span>
                    )
                  </>
                )}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {supportsNotifications && notifPermission !== 'granted' && (
                <button
                  type="button"
                  onClick={requestNotifications}
                  className="min-h-[36px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5 text-[#0F5C7E] dark:text-sky-400" />
                  <span>نبّهني لما الوردية تخلص</span>
                </button>
              )}

              {supportsWakeLock && (
                <button
                  type="button"
                  onClick={toggleWakeLock}
                  className={`min-h-[36px] px-3 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                    wakeLockActive
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{wakeLockActive ? 'الشاشة مفتوحة' : 'خلّي الشاشة منورة'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* عدّاد ميعاد القبض (يظهر لما المستخدم يحدد يوم القبض) */}
      {daysUntilPayday !== null && (
        <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
            <CalendarClock className="w-4 h-4 shrink-0" />
            <span>
              {daysUntilPayday === 0
                ? 'النهارده يوم القبض — مبروك مقدمًا!'
                : daysUntilPayday === 1
                ? 'بكرة يوم القبض (فاضل يوم واحد)'
                : `فاضل ${daysUntilPayday} يوم على القبض (يوم ${salaryConfig.paydayDay} من الشهر)`}
            </span>
          </div>
          <span className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
            المتوقع: {formatEGP(payroll.netSalary)} جنيه صافي
          </span>
        </div>
      )}

      {/* كارت البداية السريعة (مربعات فاضية تمامًا للأساسي والحافز وساعات اليوم) */}
      {salaryConfig.basicSalary === 0 && salaryConfig.monthlyIncentive === 0 && (
        <form
          onSubmit={handleQuickSalarySave}
          className="bg-sky-50/80 dark:bg-sky-950/30 border border-[#0F5C7E]/30 rounded-2xl p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                اكتب مرتبك الأساسي والحافز عشان البرنامج يحسبلك الصافي لوحده أوفلاين
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                كل المربعات فاضية ومستنياك تكتب أرقامك الحقيقية براحتك.
              </p>
            </div>
            <ShieldCheck className="w-5 h-5 text-[#0F5C7E] dark:text-sky-400 shrink-0" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <input
              type="text"
              inputMode="decimal"
              value={quickBasicText}
              onChange={(e) => setQuickBasicText(normalizeNumericInput(e.target.value))}
              placeholder="المرتب الأساسي (جنيه)"
              className="min-h-[44px] px-3.5 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
            />
            <input
              type="text"
              inputMode="decimal"
              value={quickIncentiveText}
              onChange={(e) => setQuickIncentiveText(normalizeNumericInput(e.target.value))}
              placeholder="الحافز الشهري (جنيه)"
              className="min-h-[44px] px-3.5 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
            />
            <input
              type="text"
              inputMode="decimal"
              value={quickHoursText}
              onChange={(e) => setQuickHoursText(normalizeNumericInput(e.target.value))}
              placeholder="ساعات اليوم (مثال: 8)"
              className="min-h-[44px] px-3.5 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
            />
            <button
              type="submit"
              className="min-h-[44px] px-4 rounded-xl bg-[#0F5C7E] hover:bg-[#0B4A66] text-white text-xs font-bold cursor-pointer"
            >
              احسبلي صافي مرتبي
            </button>
          </div>
        </form>
      )}

      {/* شريط اختيار الشهر لوحده */}
      <MonthBar
        selectedMonth={selectedMonth}
        onSelectMonth={onSelectMonth}
        totalHoursLabel={`مجموع ساعات ${formatArabicMonthLabel(selectedMonth)}: ${payroll.totalAllWorkedHours.toFixed(1)} ساعة (${payroll.workedDays} يوم شغل)`}
      />

      {/* 4 أرقام رئيسية (بتتحسب أوفلاين لحظيًا) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => onNavigate('salary')}
          className="text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#0F5C7E]/50 rounded-2xl p-4 sm:p-5 transition-colors cursor-pointer"
        >
          <div className="text-xs text-slate-500 dark:text-slate-400">
            صافي مرتبك — {formatArabicMonthLabel(selectedMonth)}
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatEGP(payroll.netSalary)}
            <span className="text-xs font-sans font-normal text-slate-500 mr-1">جنيه</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {salaryConfig.basicSalary > 0 || salaryConfig.monthlyIncentive > 0
              ? `أساسي ${formatEGP(salaryConfig.basicSalary)}${
                  salaryConfig.monthlyIncentive > 0
                    ? ` + حافز ${formatEGP(salaryConfig.monthlyIncentive)}`
                    : ''
                }`
              : 'اضغط هنا واكتب الأساسي والحافز'}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('attendance')}
          className="text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#0F5C7E]/50 rounded-2xl p-4 sm:p-5 transition-colors cursor-pointer"
        >
          <div className="text-xs text-slate-500 dark:text-slate-400">
            ساعات شغلك الشهر ده
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#0F5C7E] dark:text-sky-400">
            {payroll.totalAllWorkedHours.toFixed(1)}
            <span className="text-xs font-sans font-normal text-slate-500 mr-1">ساعة</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {payroll.totalWorkedHours.toFixed(1)} أساسي +{' '}
            {(payroll.dayOvertimeHours + payroll.nightOvertimeHours).toFixed(1)} إضافي
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('salary')}
          className="text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#0F5C7E]/50 rounded-2xl p-4 sm:p-5 transition-colors cursor-pointer"
        >
          <div className="text-xs text-slate-500 dark:text-slate-400">
            بدل الورديات وسعر الساعة
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatEGP(payroll.totalShiftAllowance)}
            <span className="text-xs font-sans font-normal text-slate-500 mr-1">جنيه</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            الساعة {formatEGP(payroll.hourlyRate, 1)} ج · {payroll.nightShiftCount} ليلية
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('leaves')}
          className="text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#0F5C7E]/50 rounded-2xl p-4 sm:p-5 transition-colors cursor-pointer"
        >
          <div className="text-xs text-slate-500 dark:text-slate-400">
            باقي إجازاتك الاعتيادي
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {annualRemaining}
            <span className="text-xs font-sans font-normal text-slate-500 mr-1">يوم</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {leaveQuotas.annual > 0
              ? `من إجمالي ${leaveQuotas.annual} يوم في السنة`
              : 'اضغط واكتب رصيدك'}
          </div>
        </button>
      </section>

      {/* متابعة الساعات والاستقطاعات + أحدث أيام الشغل */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                ملخص الشهر والخصومات
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('salary')}
                className="text-xs font-semibold text-[#0F5C7E] dark:text-sky-400 hover:underline whitespace-nowrap cursor-pointer"
              >
                افتح كشف المرتب
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300">
                  ساعات الشغل المتسجلة
                </span>
                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                  {payroll.totalWorkedHours.toFixed(1)} / {targetMonthlyHours} ساعة
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-[#0F5C7E] dark:bg-sky-500 rounded-full transition-all"
                  style={{ width: `${hoursProgress}%` }}
                />
              </div>
            </div>

            <dl className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-slate-500 dark:text-slate-400">الحافز الشهري</dt>
                <dd className="font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                  +{formatEGP(payroll.monthlyIncentive)} جنيه
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-slate-500 dark:text-slate-400">فلوس الإضافي والأعياد</dt>
                <dd className="font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                  +{formatEGP(Math.round(payroll.totalOvertimePay + payroll.holidayWorkPay))} جنيه
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-slate-500 dark:text-slate-400">
                  التأمينات الاجتماعية ({salaryConfig.socialInsuranceRate}%)
                </dt>
                <dd className="font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                  -{formatEGP(payroll.socialInsuranceEmployee)} جنيه
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-slate-500 dark:text-slate-400">ضريبة كسب العمل في الشهر</dt>
                <dd className="font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                  -{formatEGP(payroll.monthlyIncomeTax)} جنيه
                </dd>
              </div>
              {payroll.incentiveDeduction > 0 && (
                <div className="py-2.5 flex items-center justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">خصم من الحافز / جزاء</dt>
                  <dd className="font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                    -{formatEGP(payroll.incentiveDeduction)} جنيه
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={onQuickAddLeave}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CalendarPlus className="w-4 h-4 text-[#0F5C7E] dark:text-sky-400" />
              <span>سجّل إجازة</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('salary')}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Wallet className="w-4 h-4 text-[#0F5C7E] dark:text-sky-400" />
              <span>احسب المرتب</span>
            </button>
          </div>
        </section>

        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                آخر أيام الحضور والانصراف
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                وردياتك النهارية والليلية وساعات الإضافي والأعياد
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F5C7E] dark:text-sky-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>السجل كله</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 flex-1">
            {recentLogs.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  مفيش أيام متسجلة في شهر {formatArabicMonthLabel(selectedMonth)} لسه.
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  اضغط «ابدأ الوردية» فوق أو ضيف يوم شغل يدوي من صفحة الحضور.
                </p>
              </div>
            ) : (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-3 min-h-[60px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        log.shift === 'night'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                          : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {log.shift === 'night' ? (
                        <Moon className="w-4 h-4" />
                      ) : (
                        <Sun className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {getArabicWeekday(log.date)} ·{' '}
                        <span className="font-mono tabular-nums text-xs font-normal text-slate-500">
                          {log.date}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span>{log.shift === 'night' ? 'وردية ليلية' : 'وردية نهارية'}</span>
                        {log.checkIn && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {log.checkIn} – {log.checkOut ?? 'شغالة'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    {log.status === 'holiday' ? (
                      <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        شغل عيد ×2
                      </div>
                    ) : log.overtimeHours > 0 ? (
                      <div className="text-xs font-bold font-mono tabular-nums text-[#0F5C7E] dark:text-sky-400">
                        +{log.overtimeHours} س إضافي
                      </div>
                    ) : log.status === 'leave' ? (
                      <div className="text-xs font-semibold text-slate-500">إجازة</div>
                    ) : log.status === 'late' ? (
                      <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 font-mono tabular-nums">
                        تأخير {log.lateMinutes} د
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-mono tabular-nums">{log.workedHours} س</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
