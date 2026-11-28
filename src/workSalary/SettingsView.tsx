import React, { useRef, useState } from 'react';
import { Check, Clock, Download, Lock, ShieldCheck, Unlock, Upload } from 'lucide-react';
import {
  ARABIC_WEEKDAYS,
  CURRENCY_OPTIONS,
  InsuranceMode,
  OvertimeCalcRule,
  SalaryMode,
  SalarySettings,
  WorkSalaryState,
} from './types';
import {
  formatCleanNum,
  formatMoney,
  getOfficialShiftSpanHours,
} from './calculations';
import { RemindersSection } from './RemindersSection';
import {
  formatTimeAr12h,
  getNormalizedReminders,
  minutesToHHMM,
  parseTimeToMinutes,
} from './reminderUtils';
import { GpsCheckInSection } from './GpsCheckInSection';
import { GpsLiveState, getNormalizedWorkLocation } from './gpsUtils';

interface SettingsViewProps {
  settings: SalarySettings;
  fullState: WorkSalaryState;
  gpsState: GpsLiveState;
  pinCode: string | null;
  onUpdateSettings: (patch: Partial<SalarySettings>) => void;
  onSetPin: (pin: string | null) => void;
  onLockNow: () => void;
  onTestReminder: () => void;
  onCheckGpsNow: () => void;
  onImportState: (imported: WorkSalaryState) => void;
  onResetAllData: () => void;
}

const SALARY_MODES: Array<{ id: SalaryMode; label: string; desc: string }> = [
  { id: 'monthly', label: 'مرتب شهري', desc: 'راتب ثابت ويُخصم منه الغياب ويُضاف له الإضافي' },
  { id: 'daily', label: 'باليومية', desc: 'يتحسب على عدد أيام الحضور الفعلية × أجر اليوم' },
  { id: 'hourly', label: 'بالساعة', desc: 'يتحسب على إجمالي ساعات العمل × أجر الساعة' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  fullState,
  gpsState,
  pinCode,
  onUpdateSettings,
  onSetPin,
  onLockNow,
  onTestReminder,
  onCheckGpsNow,
  onImportState,
  onResetAllData,
}) => {
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pinDraft, setPinDraft] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const notify = (msg: string) => {
    setSavedNotice(msg);
    window.setTimeout(() => setSavedNotice(null), 2600);
  };

  const numPatch = (key: keyof SalarySettings, raw: string) => {
    const val = Math.max(0, parseFloat(raw) || 0);
    onUpdateSettings({ [key]: val } as Partial<SalarySettings>);
  };

  const workingDays = Math.max(1, settings.workingDaysPerMonth || 26);
  const dailyHours = Math.max(1, settings.dailyWorkHours || 8);
  const previewDaily =
    settings.salaryMode === 'monthly'
      ? settings.baseAmount / workingDays
      : settings.salaryMode === 'daily'
      ? settings.baseAmount
      : settings.baseAmount * dailyHours;
  const previewHourly = previewDaily / dailyHours;
  const previewOtHour =
    settings.customOvertimeHourRate > 0
      ? settings.customOvertimeHourRate
      : previewHourly * (settings.overtimeMultiplier || 1.5);
  const rem = getNormalizedReminders(settings.reminders);
  const overtimeRule: OvertimeCalcRule = settings.overtimeCalcRule ?? 'after_end_time';
  const officialShiftSpan = getOfficialShiftSpanHours(rem.workStartTime, rem.workEndTime);
  const samplePlusTwoEnd = minutesToHHMM(parseTimeToMinutes(rem.workEndTime) + 120);

  const handleExportBackup = () => {
    const blob = new Blob([JSON.stringify(fullState, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `نسخة-احتياطية-شغلي-ومرتبي-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('تم تحميل النسخة الاحتياطية على جهازك بنجاح.');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as WorkSalaryState;
        if (parsed && parsed.settings && parsed.months && Array.isArray(parsed.transactions)) {
          onImportState(parsed);
          notify('تم استعادة بيانات شغلك ومرتبك بنجاح.');
        } else {
          notify('الملف غير مطابق لتنسيق النسخة الاحتياطية.');
        }
      } catch {
        notify('تعذّر قراءة الملف. تأكد إنه ملف JSON صحيح.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Offline GPS Auto Check-In Section */}
      <GpsCheckInSection
        workLocation={getNormalizedWorkLocation(settings.workLocation)}
        gpsState={gpsState}
        onUpdateWorkLocation={(next) => onUpdateSettings({ workLocation: next })}
        onCheckGpsNow={onCheckGpsNow}
      />

      {/* Manual Work Schedule Reminders */}
      <RemindersSection
        reminders={getNormalizedReminders(settings.reminders)}
        onUpdateReminders={(next) => onUpdateSettings({ reminders: next })}
        onTestReminder={onTestReminder}
      />

      {/* Main Salary Mode & Profile */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              إعدادات الشغل والمرتب
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              كل التعديلات بتتحفظ أوتوماتيك على جهازك وتتحدث فوراً في الحسابات
            </p>
          </div>
          {savedNotice && (
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>{savedNotice}</span>
            </span>
          )}
        </div>

        {/* Name / Job / Currency */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label
              htmlFor="emp-name"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              اسمك (يظهر في كشف الواتساب)
            </label>
            <input
              id="emp-name"
              type="text"
              value={settings.employeeName}
              onChange={(e) => onUpdateSettings({ employeeName: e.target.value })}
              placeholder="مثلاً: محمد أحمد"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="emp-job"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              المسمى الوظيفي (اختياري)
            </label>
            <input
              id="emp-job"
              type="text"
              value={settings.jobTitle}
              onChange={(e) => onUpdateSettings({ jobTitle: e.target.value })}
              placeholder="مثلاً: فني إنتاج / محاسب"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="emp-currency"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              العملة
            </label>
            <select
              id="emp-currency"
              value={settings.currency}
              onChange={(e) => onUpdateSettings({ currency: e.target.value })}
              className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Salary Calculation Mode */}
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            نظام حساب المرتب
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {SALARY_MODES.map((m) => {
              const active = settings.salaryMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onUpdateSettings({ salaryMode: m.id })}
                  className={`p-3.5 rounded-xl border text-start transition-colors ${
                    active
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/35 border-emerald-500 text-emerald-950 dark:text-emerald-100'
                      : 'bg-slate-50/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="text-sm font-bold">{m.label}</div>
                  <div className="text-xs opacity-80 mt-0.5">{m.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Core Numeric Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label
              htmlFor="base-amount"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              {settings.salaryMode === 'monthly'
                ? `المرتب الأساسي الشهري (${settings.currency})`
                : settings.salaryMode === 'daily'
                ? `أجر اليوم الواحد (${settings.currency})`
                : `أجر الساعة الواحدة (${settings.currency})`}
            </label>
            <input
              id="base-amount"
              type="number"
              min="0"
              step="any"
              value={settings.baseAmount}
              onChange={(e) => numPatch('baseAmount', e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="work-days-month"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              أيام العمل بالشهر (26 أو 30)
            </label>
            <input
              id="work-days-month"
              type="number"
              min="1"
              max="31"
              value={settings.workingDaysPerMonth}
              onChange={(e) => numPatch('workingDaysPerMonth', e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="daily-hours"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              ساعات العمل اليومية
            </label>
            <input
              id="daily-hours"
              type="number"
              min="1"
              max="24"
              step="0.5"
              value={settings.dailyWorkHours}
              onChange={(e) => numPatch('dailyWorkHours', e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="weekly-off"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              يوم الراحة الأسبوعية
            </label>
            <select
              id="weekly-off"
              value={settings.weeklyOffDay}
              onChange={(e) => onUpdateSettings({ weeklyOffDay: Number(e.target.value) })}
              className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              {ARABIC_WEEKDAYS.map((dayName, idx) => (
                <option key={dayName} value={idx}>
                  {dayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Payroll Cycle, Payday & Annual Leave Quotas */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="cycle-start-day"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                يوم بداية دورة المرتب (1–28)
              </label>
              <input
                id="cycle-start-day"
                type="number"
                min="1"
                max="28"
                value={settings.cycleStartDay ?? 1}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(28, Math.round(parseFloat(e.target.value) || 1)));
                  onUpdateSettings({ cycleStartDay: v });
                }}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="payday-day"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                يوم القبض في الشهر (1–31)
              </label>
              <input
                id="payday-day"
                type="number"
                min="1"
                max="31"
                value={settings.paydayDayOfMonth ?? 1}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(31, Math.round(parseFloat(e.target.value) || 1)));
                  onUpdateSettings({ paydayDayOfMonth: v });
                }}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="annual-leave-quota"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                رصيد الإجازات السنوية (أيام)
              </label>
              <input
                id="annual-leave-quota"
                type="number"
                min="0"
                max="90"
                value={settings.annualLeaveQuota ?? 21}
                onChange={(e) => numPatch('annualLeaveQuota', e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="casual-leave-quota"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                رصيد الإجازات العارضة (أيام)
              </label>
              <input
                id="casual-leave-quota"
                type="number"
                min="0"
                max="30"
                value={settings.casualLeaveQuota ?? 6}
                onChange={(e) => numPatch('casualLeaveQuota', e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {(settings.cycleStartDay ?? 1) === 1
              ? 'دورة المرتب الحالية: شهر ميلادي عادي (من يوم 1 حتى آخر الشهر). غيّر يوم البداية مثلاً لـ 25 لو شركتك بتقفل الشهر يوم 24.'
              : `دورة المرتب المخصّصة مفعّلة: يتحسب كل شهر من يوم ${
                  settings.cycleStartDay
                } في الشهر السابق حتى يوم ${(settings.cycleStartDay ?? 1) - 1} في الشهر الحالي.`}
          </p>
        </div>

        {/* Official Work Start / End Schedule & Auto Overtime Rule */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              <Clock className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span>مواعيد العمل الرسمية وحساب الإضافي التلقائي</span>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
              مدة الدوام: {formatCleanNum(officialShiftSpan)} ساعة ({formatTimeAr12h(rem.workStartTime)}{' '}
              – {formatTimeAr12h(rem.workEndTime)})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <label
                htmlFor="official-start-time"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                بداية الشغل الرسمية (مثلاً 8 ص)
              </label>
              <input
                id="official-start-time"
                type="time"
                value={rem.workStartTime}
                onChange={(e) =>
                  onUpdateSettings({
                    reminders: { ...rem, workStartTime: e.target.value || '08:00' },
                  })
                }
                className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="official-end-time"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                نهاية الشغل الرسمية (مثلاً 5 م)
              </label>
              <input
                id="official-end-time"
                type="time"
                value={rem.workEndTime}
                onChange={(e) =>
                  onUpdateSettings({
                    reminders: { ...rem, workEndTime: e.target.value || '17:00' },
                  })
                }
                className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                قاعدة حساب الإضافي تلقائياً
              </span>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ overtimeCalcRule: 'after_end_time' })}
                  className={`min-h-[38px] px-2.5 rounded-lg text-xs font-bold transition-colors ${
                    overtimeRule === 'after_end_time'
                      ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  بعد ميعاد الانصراف ({formatTimeAr12h(rem.workEndTime)})
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ overtimeCalcRule: 'after_daily_hours' })}
                  className={`min-h-[38px] px-2.5 rounded-lg text-xs font-bold transition-colors ${
                    overtimeRule === 'after_daily_hours'
                      ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  الزيادة عن {formatCleanNum(dailyHours)} ساعات عمل
                </button>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 rounded-xl px-3 py-2 tabular-nums">
            {overtimeRule === 'after_end_time' ? (
              <>
                أي وقت تقعده بعد <strong>{formatTimeAr12h(rem.workEndTime)}</strong> يتحسب إضافي
                لوحده — مثلاً لو مشيت الساعة <strong>{formatTimeAr12h(samplePlusTwoEnd)}</strong>{' '}
                يتحسبلك تلقائياً <strong>+2 ساعة إضافي</strong> (+
                {formatMoney(previewOtHour * 2, settings.currency)}).
              </>
            ) : (
              <>
                أي ساعات زيادة عن <strong>{formatCleanNum(dailyHours)} ساعات</strong> في اليوم تتحسب
                إضافي لوحدها — مثلاً شغل من <strong>{formatTimeAr12h(rem.workStartTime)}</strong>{' '}
                إلى <strong>{formatTimeAr12h(rem.workEndTime)}</strong> ({formatCleanNum(officialShiftSpan)}{' '}
                س) ={' '}
                <strong>
                  +{formatCleanNum(Math.max(0, officialShiftSpan - dailyHours))} ساعة إضافي
                </strong>{' '}
                (+{formatMoney(previewOtHour * Math.max(0, officialShiftSpan - dailyHours), settings.currency)}).
              </>
            )}
          </p>
        </div>

        {/* Live Calculated Preview */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
          <span>
            قيمة اليوم:{' '}
            <strong className="font-mono text-slate-900 dark:text-slate-100">
              {formatMoney(previewDaily, settings.currency)}
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            قيمة الساعة العادية:{' '}
            <strong className="font-mono text-slate-900 dark:text-slate-100">
              {formatMoney(previewHourly, settings.currency)}
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            قيمة ساعة الإضافي:{' '}
            <strong className="font-mono text-emerald-700 dark:text-emerald-400">
              {formatMoney(previewOtHour, settings.currency)}
            </strong>
          </span>
        </div>
      </section>

      {/* Overtime, Extra Day & Absence Multipliers */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
          قواعد الإضافي والغياب والبدلات الثابتة
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label
              htmlFor="ot-mult"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              معامل ساعة الإضافي (مثلاً 1.5)
            </label>
            <input
              id="ot-mult"
              type="number"
              min="0.5"
              max="5"
              step="0.05"
              value={settings.overtimeMultiplier}
              onChange={(e) => numPatch('overtimeMultiplier', e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="ot-custom"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              أو سعر ساعة إضافي ثابت (0 = تلقائي)
            </label>
            <input
              id="ot-custom"
              type="number"
              min="0"
              step="any"
              value={settings.customOvertimeHourRate}
              onChange={(e) => numPatch('customOvertimeHourRate', e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="extra-day-mult"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              أجر يوم العطلة / الجمعة (مضاعف)
            </label>
            <input
              id="extra-day-mult"
              type="number"
              min="1"
              max="4"
              step="0.5"
              value={settings.extraDayMultiplier}
              onChange={(e) => numPatch('extraDayMultiplier', e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="absence-mult"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              خصم يوم الغياب (1 = يوم / 2 = يومين)
            </label>
            <input
              id="absence-mult"
              type="number"
              min="0"
              max="3"
              step="0.5"
              value={settings.absencePenaltyMultiplier}
              onChange={(e) => numPatch('absencePenaltyMultiplier', e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Allowances & Other Fixed Deduction */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label
              htmlFor="alw-transport"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
            >
              بدل مواصلات ({settings.currency})
            </label>
            <input
              id="alw-transport"
              type="number"
              min="0"
              step="any"
              value={settings.transportAllowance || ''}
              onChange={(e) => numPatch('transportAllowance', e.target.value)}
              placeholder="0"
              className="w-full min-h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="alw-meal"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
            >
              بدل وجبة / وردية ({settings.currency})
            </label>
            <input
              id="alw-meal"
              type="number"
              min="0"
              step="any"
              value={settings.mealAllowance || ''}
              onChange={(e) => numPatch('mealAllowance', e.target.value)}
              placeholder="0"
              className="w-full min-h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="alw-other"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
            >
              بدلات أخرى ({settings.currency})
            </label>
            <input
              id="alw-other"
              type="number"
              min="0"
              step="any"
              value={settings.otherAllowance || ''}
              onChange={(e) => numPatch('otherAllowance', e.target.value)}
              placeholder="0"
              className="w-full min-h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="ded-other"
              className="block text-xs font-semibold text-rose-600 dark:text-rose-400"
            >
              استقطاع ثابت آخر ({settings.currency})
            </label>
            <input
              id="ded-other"
              type="number"
              min="0"
              step="any"
              value={settings.otherFixedDeduction || ''}
              onChange={(e) => numPatch('otherFixedDeduction', e.target.value)}
              placeholder="0"
              className="w-full min-h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </section>

      {/* Dedicated Manual Social Insurance Section */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              التأمينات الاجتماعية (إدخال يدوي)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              اكتب مبلغ التأمينات الشهري بنفسك أو احسبه كنسبة مئوية — وتقدر تغيّره يدوياً لكل شهر
              من كشف المرتب مباشرة
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950">
            {(
              [
                { id: 'fixed', label: 'مبلغ يدوي ثابت' },
                { id: 'percent', label: 'نسبة مئوية (%)' },
              ] as Array<{ id: InsuranceMode; label: string }>
            ).map((mode) => {
              const active = (settings.insuranceMode ?? 'fixed') === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onUpdateSettings({ insuranceMode: mode.id })}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>

        {(settings.insuranceMode ?? 'fixed') === 'fixed' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div className="space-y-1">
              <label
                htmlFor="ded-insurance-fixed"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                قيمة التأمينات الشهرية ({settings.currency})
              </label>
              <input
                id="ded-insurance-fixed"
                type="number"
                min="0"
                step="any"
                value={settings.socialInsurance || ''}
                onChange={(e) => numPatch('socialInsurance', e.target.value)}
                placeholder="اكتب قيمة التأمينات يدوياً (مثلاً 450)"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 pb-2 tabular-nums">
              يُخصم شهرياً:{' '}
              <strong className="font-mono text-rose-600 dark:text-rose-400">
                -{formatMoney(settings.socialInsurance || 0, settings.currency)}
              </strong>{' '}
              (اكتب 0 لو مفيش تأمينات)
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div className="space-y-1">
              <label
                htmlFor="ded-insurance-percent"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                نسبة التأمينات من المرتب الأساسي (%)
              </label>
              <input
                id="ded-insurance-percent"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={settings.insurancePercent ?? 11}
                onChange={(e) => numPatch('insurancePercent', e.target.value)}
                placeholder="مثلاً: 11"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 pb-2 tabular-nums">
              قيمة الخصم التقريبية شهرياً:{' '}
              <strong className="font-mono text-rose-600 dark:text-rose-400">
                -
                {formatMoney(
                  (settings.salaryMode === 'monthly'
                    ? settings.baseAmount
                    : previewDaily * workingDays) *
                    ((settings.insurancePercent ?? 11) / 100),
                  settings.currency
                )}
              </strong>
            </p>
          </div>
        )}
      </section>

      {/* Privacy PIN Lock Section */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                قفل التطبيق برقم سري (PIN)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                احمِ بيانات مرتبك وسُلفك برقم سري من 4 أرقام يُطلب عند فتح التطبيق
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-bold ${
              pinCode
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {pinCode ? 'القفل مفعّل (4 أرقام)' : 'غير مفعّل'}
          </span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^\d{4}$/.test(pinDraft)) {
              setPinError('اكتب 4 أرقام بالضبط (مثلاً 1234).');
              return;
            }
            setPinError(null);
            onSetPin(pinDraft);
            setPinDraft('');
            notify(pinCode ? 'تم تحديث الرقم السري بنجاح.' : 'تم تفعيل قفل التطبيق برقم سري.');
          }}
          className="flex flex-wrap items-center gap-2.5"
        >
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinDraft}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
              setPinDraft(digits);
              setPinError(null);
            }}
            placeholder={pinCode ? 'رقم سري جديد (4 أرقام)' : 'اكتب رقم سري من 4 أرقام'}
            className="flex-1 min-w-[190px] min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold tracking-widest text-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            className="min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{pinCode ? 'تغيير الرقم السري' : 'تفعيل القفل'}</span>
          </button>

          {pinCode && (
            <>
              <button
                type="button"
                onClick={onLockNow}
                className="min-h-[44px] px-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 whitespace-nowrap"
              >
                قفل التطبيق الآن
              </button>
              <button
                type="button"
                onClick={() => {
                  onSetPin(null);
                  setPinDraft('');
                  notify('تم إلغاء القفل بالرقم السري.');
                }}
                className="min-h-[44px] px-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>إلغاء القفل</span>
              </button>
            </>
          )}
        </form>

        {pinError && (
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{pinError}</p>
        )}
      </section>

      {/* Backup, Restore & Reset */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            النسخ الاحتياطي وإدارة البيانات
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            بياناتك محفوظة على جهازك بدون إنترنت — تقدر تحفظ نسخة احتياطية وتنقلها لأي موبايل تاني
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>حفظ نسخة احتياطية</span>
          </button>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>استعادة نسخة</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            onChange={handleImportBackup}
            className="hidden"
          />

          {confirmReset ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onResetAllData();
                  setConfirmReset(false);
                  notify('تم مسح كل البيانات والبدء من الصفر.');
                }}
                className="min-h-[40px] px-3.5 rounded-xl bg-rose-600 text-white text-xs font-bold whitespace-nowrap"
              >
                تأكيد المسح الكامل
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300"
              >
                إلغاء
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="min-h-[40px] px-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 whitespace-nowrap"
            >
              تصفير كل البيانات
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
