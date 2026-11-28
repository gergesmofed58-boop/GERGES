import React, { useEffect, useState } from 'react';
import { Calculator, Check, Clock, Trash2, X } from 'lucide-react';
import {
  DAY_STATUS_META,
  DayLogEntry,
  DayStatus,
  LEAVE_KIND_LABELS,
  LeaveKind,
  SHIFT_PERIOD_LABELS,
  SalarySettings,
  ShiftPeriod,
  formatDayDateAr,
  getCurrentHHMM,
} from './types';
import { calculateShiftTimes, formatCleanNum } from './calculations';
import { formatTimeAr12h, getNormalizedReminders } from './reminderUtils';

interface DayEntryModalProps {
  dateIso: string | null;
  existingEntry?: DayLogEntry;
  settings: SalarySettings;
  onSave: (entry: DayLogEntry) => void;
  onDelete: (dateIso: string) => void;
  onClose: () => void;
}

const STATUS_ORDER: DayStatus[] = [
  'present',
  'half_day',
  'extra_day',
  'paid_leave',
  'absent',
  'weekly_off',
];

const SHIFT_ORDER: ShiftPeriod[] = ['morning', 'evening', 'night'];
const LEAVE_KINDS: LeaveKind[] = ['annual', 'casual', 'sick'];
const QUICK_OT_HOURS = [0, 1, 2, 3, 4];

export const DayEntryModal: React.FC<DayEntryModalProps> = ({
  dateIso,
  existingEntry,
  settings,
  onSave,
  onDelete,
  onClose,
}) => {
  const [status, setStatus] = useState<DayStatus>('present');
  const [shift, setShift] = useState<ShiftPeriod>('morning');
  const [leaveKind, setLeaveKind] = useState<LeaveKind>('annual');
  const [checkInTime, setCheckInTime] = useState<string>('');
  const [checkOutTime, setCheckOutTime] = useState<string>('');
  const [lateMinutes, setLateMinutes] = useState<string>('0');
  const [workHours, setWorkHours] = useState<string>(String(settings.dailyWorkHours));
  const [overtimeHours, setOvertimeHours] = useState<string>('0');
  const [dailyBonus, setDailyBonus] = useState<string>('0');
  const [dailyDeduction, setDailyDeduction] = useState<string>('0');
  const [note, setNote] = useState<string>('');
  const [calcHint, setCalcHint] = useState<string | null>(null);

  useEffect(() => {
    if (!dateIso) return;
    setCalcHint(null);
    if (existingEntry) {
      setStatus(existingEntry.status);
      setShift(existingEntry.shift);
      setLeaveKind(existingEntry.leaveKind ?? 'annual');
      setCheckInTime(existingEntry.checkInTime ?? '');
      setCheckOutTime(existingEntry.checkOutTime ?? '');
      setLateMinutes(String(existingEntry.lateMinutes || 0));
      setWorkHours(String(existingEntry.workHours ?? settings.dailyWorkHours));
      setOvertimeHours(String(existingEntry.overtimeHours || 0));
      setDailyBonus(String(existingEntry.dailyBonus || 0));
      setDailyDeduction(String(existingEntry.dailyDeduction || 0));
      setNote(existingEntry.note ?? '');
    } else {
      setStatus('present');
      setShift('morning');
      setLeaveKind('annual');
      setCheckInTime('');
      setCheckOutTime('');
      setLateMinutes('0');
      setWorkHours(String(settings.dailyWorkHours));
      setOvertimeHours('0');
      setDailyBonus('0');
      setDailyDeduction('0');
      setNote('');
    }
  }, [dateIso, existingEntry, settings.dailyWorkHours]);

  if (!dateIso) return null;

  const isWorkingStatus =
    status === 'present' || status === 'half_day' || status === 'extra_day';

  const rem = getNormalizedReminders(settings.reminders);
  const overtimeRule = settings.overtimeCalcRule ?? 'after_end_time';

  const applyAutoTimeCalc = (inVal: string, outVal: string) => {
    if (!inVal || !outVal) return;
    const res = calculateShiftTimes(
      inVal,
      outVal,
      rem.workStartTime,
      settings.dailyWorkHours,
      rem.workEndTime,
      overtimeRule
    );
    setOvertimeHours(String(res.overtimeHours));
    setLateMinutes(String(res.lateMinutes));
    if (settings.salaryMode === 'hourly') {
      setWorkHours(String(res.workedHours));
    }
    setCalcHint(
      `إجمالي الشغل: ${formatCleanNum(res.workedHours)} ساعة · إضافي تلقائي: ${formatCleanNum(
        res.overtimeHours
      )} س${res.lateMinutes > 0 ? ` · تأخير: ${res.lateMinutes} دقيقة` : ''}`
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedLate = Math.max(0, parseInt(lateMinutes, 10) || 0);
    onSave({
      dateIso,
      status,
      shift,
      leaveKind: status === 'paid_leave' ? leaveKind : undefined,
      checkInTime: isWorkingStatus && checkInTime ? checkInTime : undefined,
      checkOutTime: isWorkingStatus && checkOutTime ? checkOutTime : undefined,
      lateMinutes: isWorkingStatus && parsedLate > 0 ? parsedLate : undefined,
      workHours:
        settings.salaryMode === 'hourly' && isWorkingStatus
          ? Math.max(0, parseFloat(workHours) || 0)
          : undefined,
      overtimeHours: isWorkingStatus ? Math.max(0, parseFloat(overtimeHours) || 0) : 0,
      dailyBonus: Math.max(0, parseFloat(dailyBonus) || 0),
      dailyDeduction: Math.max(0, parseFloat(dailyDeduction) || 0),
      note: note.trim() || undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/55 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              تسجيل يوم {formatDayDateAr(dateIso)}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
              {dateIso}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-5">
          {/* Status Grid */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              حالة اليوم
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STATUS_ORDER.map((st) => {
                const meta = DAY_STATUS_META[st];
                const active = status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold transition-colors text-center ${
                      active
                        ? `${meta.bg} ${meta.text} ${meta.border} ring-2 ring-emerald-600/30`
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paid Leave Kind (Annual / Casual / Sick) */}
          {status === 'paid_leave' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                نوع الإجازة (تُخصم تلقائياً من رصيدك السنوي)
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950">
                {LEAVE_KINDS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setLeaveKind(kind)}
                    className={`min-h-[40px] rounded-lg text-xs font-bold transition-colors ${
                      leaveKind === kind
                        ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    إجازة {LEAVE_KIND_LABELS[kind]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isWorkingStatus && (
            <>
              {/* Shift Period */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  الوردية
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950">
                  {SHIFT_ORDER.map((sh) => (
                    <button
                      key={sh}
                      type="button"
                      onClick={() => setShift(sh)}
                      className={`min-h-[40px] rounded-lg text-xs font-bold transition-colors ${
                        shift === sh
                          ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {SHIFT_PERIOD_LABELS[sh]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Check-in / Check-out Times + Automatic Overtime & Late Calculation */}
              <div className="rounded-xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      ساعة الحضور والانصراف (حساب تلقائي للإضافي والتأخير)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                      ميعادك الرسمي: {formatTimeAr12h(rem.workStartTime)} –{' '}
                      {formatTimeAr12h(rem.workEndTime)}
                      {overtimeRule === 'after_end_time'
                        ? ` (الإضافي بعد ${formatTimeAr12h(rem.workEndTime)})`
                        : ` (الإضافي بعد ${settings.dailyWorkHours} ساعات)`}
                    </span>
                  </div>
                  {checkInTime && checkOutTime && (
                    <button
                      type="button"
                      onClick={() => applyAutoTimeCalc(checkInTime, checkOutTime)}
                      className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>احسب الآن</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="day-checkin"
                        className="text-[11px] font-semibold text-slate-600 dark:text-slate-400"
                      >
                        الدخول
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const now = getCurrentHHMM();
                          setCheckInTime(now);
                          if (checkOutTime) applyAutoTimeCalc(now, checkOutTime);
                        }}
                        className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400"
                      >
                        الآن
                      </button>
                    </div>
                    <input
                      id="day-checkin"
                      type="time"
                      value={checkInTime}
                      onChange={(e) => {
                        setCheckInTime(e.target.value);
                        if (e.target.value && checkOutTime) {
                          applyAutoTimeCalc(e.target.value, checkOutTime);
                        }
                      }}
                      className="w-full min-h-[40px] px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="day-checkout"
                        className="text-[11px] font-semibold text-slate-600 dark:text-slate-400"
                      >
                        الخروج
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const now = getCurrentHHMM();
                          const inToUse = checkInTime || rem.workStartTime;
                          if (!checkInTime) setCheckInTime(inToUse);
                          setCheckOutTime(now);
                          applyAutoTimeCalc(inToUse, now);
                        }}
                        className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400"
                      >
                        الآن
                      </button>
                    </div>
                    <input
                      id="day-checkout"
                      type="time"
                      value={checkOutTime}
                      onChange={(e) => {
                        const outVal = e.target.value;
                        setCheckOutTime(outVal);
                        if (outVal) {
                          const inToUse = checkInTime || rem.workStartTime;
                          if (!checkInTime) setCheckInTime(inToUse);
                          applyAutoTimeCalc(inToUse, outVal);
                        }
                      }}
                      className="w-full min-h-[40px] px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {calcHint && (
                  <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {calcHint}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  <label
                    htmlFor="day-late-mins"
                    className="text-[11px] font-semibold text-slate-600 dark:text-slate-400"
                  >
                    دقائق التأخير (اختياري)
                  </label>
                  <input
                    id="day-late-mins"
                    type="number"
                    min="0"
                    max="480"
                    value={lateMinutes === '0' ? '' : lateMinutes}
                    onChange={(e) => setLateMinutes(e.target.value || '0')}
                    placeholder="0"
                    className="w-24 min-h-[34px] px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-center tabular-nums text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Work Hours (only shown for hourly salary mode) */}
              {settings.salaryMode === 'hourly' && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="day-work-hours"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    ساعات العمل الأساسية في هذا اليوم
                  </label>
                  <input
                    id="day-work-hours"
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={workHours}
                    onChange={(e) => setWorkHours(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              {/* Overtime Quick Picker + Custom Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="day-ot-hours"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span>ساعات الإضافي (أوفر تايم)</span>
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    بالساعة
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {QUICK_OT_HOURS.map((h) => {
                    const active = parseFloat(overtimeHours) === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setOvertimeHours(String(h))}
                        className={`min-h-[40px] min-w-[48px] px-3 rounded-xl border text-xs font-mono font-bold tabular-nums transition-colors ${
                          active
                            ? 'bg-emerald-700 border-emerald-700 text-white'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {h === 0 ? 'بدون' : `+${h} س`}
                      </button>
                    );
                  })}
                  <input
                    id="day-ot-hours"
                    type="number"
                    step="0.25"
                    min="0"
                    max="16"
                    value={overtimeHours}
                    onChange={(e) => setOvertimeHours(e.target.value)}
                    aria-label="ساعات إضافي مخصصة"
                    className="w-20 min-h-[40px] px-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-center tabular-nums text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </>
          )}

          {/* Optional Daily Bonus & Deduction */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="day-bonus"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                مكافأة اليوم ({settings.currency})
              </label>
              <input
                id="day-bonus"
                type="number"
                min="0"
                step="any"
                value={dailyBonus === '0' ? '' : dailyBonus}
                onChange={(e) => setDailyBonus(e.target.value || '0')}
                placeholder="0"
                className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="day-deduction"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                خصم / تأخير ({settings.currency})
              </label>
              <input
                id="day-deduction"
                type="number"
                min="0"
                step="any"
                value={dailyDeduction === '0' ? '' : dailyDeduction}
                onChange={(e) => setDailyDeduction(e.target.value || '0')}
                placeholder="0"
                className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label
              htmlFor="day-note"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              ملاحظة (اختياري)
            </label>
            <input
              id="day-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثلاً: سهرة تسليم / استئذان ساعة..."
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="submit"
              className="flex-1 min-h-[48px] px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>حفظ اليوم</span>
            </button>

            {existingEntry && (
              <button
                type="button"
                onClick={() => {
                  onDelete(dateIso);
                  onClose();
                }}
                aria-label="مسح تسجيل اليوم"
                className="min-h-[48px] px-4 rounded-xl border border-rose-200 dark:border-rose-900/70 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>مسح</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
