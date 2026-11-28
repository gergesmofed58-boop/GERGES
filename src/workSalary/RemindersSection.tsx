import React, { useState } from 'react';
import { Bell, BellRing, Plus, Trash2, Volume2, VolumeX } from 'lucide-react';
import {
  CALENDAR_HEADERS_SAT_FIRST,
  CustomReminder,
  WorkReminderSettings,
} from './types';
import {
  formatTimeAr12h,
  getNextReminderSummary,
  minutesToHHMM,
  parseTimeToMinutes,
} from './reminderUtils';

interface RemindersSectionProps {
  reminders: WorkReminderSettings;
  onUpdateReminders: (next: WorkReminderSettings) => void;
  onTestReminder: () => void;
}

const BEFORE_PRESETS = [0, 15, 30, 45, 60];

export const RemindersSection: React.FC<RemindersSectionProps> = ({
  reminders,
  onUpdateReminders,
  onTestReminder,
}) => {
  const [customTime, setCustomTime] = useState('07:15');
  const [customLabel, setCustomLabel] = useState('');
  const [notifPerm, setNotifPerm] = useState<string>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  const patch = (partial: Partial<WorkReminderSettings>) => {
    onUpdateReminders({ ...reminders, ...partial });
  };

  const toggleDay = (jsDay: number) => {
    const exists = reminders.activeDays.includes(jsDay);
    const nextDays = exists
      ? reminders.activeDays.filter((d) => d !== jsDay)
      : [...reminders.activeDays, jsDay];
    patch({ activeDays: nextDays });
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTime) return;
    const newItem: CustomReminder = {
      id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      time: customTime,
      label: customLabel.trim() || 'تنبيه موعد عمل',
      enabled: true,
    };
    patch({ customReminders: [...reminders.customReminders, newItem] });
    setCustomLabel('');
  };

  const toggleCustom = (id: string) => {
    patch({
      customReminders: reminders.customReminders.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      ),
    });
  };

  const deleteCustom = (id: string) => {
    patch({
      customReminders: reminders.customReminders.filter((r) => r.id !== id),
    });
  };

  const handleRequestNotif = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const res = await Notification.requestPermission();
      setNotifPerm(res);
    } catch {
      // ignore
    }
  };

  const calculatedStartAlertHHMM = minutesToHHMM(
    parseTimeToMinutes(reminders.workStartTime) - Math.max(0, reminders.remindBeforeMinutes || 0)
  );

  return (
    <section
      id="work-reminders-section"
      className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-5"
    >
      {/* Header + Master Switch */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Bell className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              تنبيهات ومواعيد العمل (ضبط يدوي)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              {getNextReminderSummary(reminders)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => patch({ enabled: !reminders.enabled })}
          className={`min-h-[42px] px-4 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
            reminders.enabled
              ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          {reminders.enabled ? 'التنبيهات مفعّلة (اضغط للإيقاف)' : 'التنبيهات متوقفة (اضغط للتفعيل)'}
        </button>
      </div>

      {/* Start & End Work Time Manual Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
        {/* Work Start Card */}
        <div className="rounded-xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
              <input
                type="checkbox"
                checked={reminders.remindStartEnabled}
                onChange={(e) => patch({ remindStartEnabled: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
              />
              <span>ميعاد بداية العمل</span>
            </label>
            <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              التنبيه: {formatTimeAr12h(calculatedStartAlertHHMM)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="rem-start-time"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                ساعة بداية الشغل (يدوي)
              </label>
              <input
                id="rem-start-time"
                type="time"
                value={reminders.workStartTime}
                onChange={(e) => patch({ workStartTime: e.target.value })}
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="rem-before-mins"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                نبّهني قبلها بكام دقيقة
              </label>
              <input
                id="rem-before-mins"
                type="number"
                min="0"
                max="240"
                step="5"
                value={reminders.remindBeforeMinutes}
                onChange={(e) =>
                  patch({ remindBeforeMinutes: Math.max(0, parseInt(e.target.value, 10) || 0) })
                }
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {BEFORE_PRESETS.map((mins) => {
              const active = reminders.remindBeforeMinutes === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => patch({ remindBeforeMinutes: mins })}
                  className={`min-h-[34px] px-2.5 rounded-lg border text-xs font-bold tabular-nums transition-colors ${
                    active
                      ? 'bg-emerald-700 border-emerald-700 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {mins === 0 ? 'في الميعاد' : `قبل ${mins} د`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Work End Card */}
        <div className="rounded-xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminders.remindEndEnabled}
                  onChange={(e) => patch({ remindEndEnabled: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                />
                <span>ميعاد نهاية العمل (تذكير بتسجيل اليوم)</span>
              </label>
              <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {formatTimeAr12h(reminders.workEndTime)}
              </span>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="rem-end-time"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                ساعة الانصراف (يدوي)
              </label>
              <input
                id="rem-end-time"
                type="time"
                value={reminders.workEndTime}
                onChange={(e) => patch({ workEndTime: e.target.value })}
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            في الميعاد ده هيظهرلك تنبيه يفكرك تسجّل حضور النهاردة أو ساعات الإضافي عشان المرتب يفضل
            مظبوط أول بأول.
          </p>
        </div>
      </div>

      {/* Active Work Days Manual Picker */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          أيام العمل اللي يشتغل فيها التنبيه (اختر يدوياً)
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
          {CALENDAR_HEADERS_SAT_FIRST.map((day) => {
            const active = reminders.activeDays.includes(day.jsDay);
            return (
              <button
                key={day.jsDay}
                type="button"
                onClick={() => toggleDay(day.jsDay)}
                className={`min-h-[42px] px-2 rounded-xl border text-xs font-bold transition-colors ${
                  active
                    ? 'bg-emerald-700 border-emerald-700 text-white'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Additional Custom Manual Reminders */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            تنبيهات يدوية إضافية ({reminders.customReminders.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            أضف أي ميعاد إضافي يهمك (مثلاً: ميعاد المواصلات، استراحة، تسليم الوردية)
          </p>
        </div>

        <form onSubmit={handleAddCustom} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <input
            type="time"
            aria-label="وقت التنبيه الإضافي"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            className="sm:col-span-3 min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-slate-100"
          />
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="عنوان التنبيه (مثلاً: ميعاد أتوبيس الشغل)..."
            className="sm:col-span-6 min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            className="sm:col-span-3 min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة تنبيه</span>
          </button>
        </form>

        {reminders.customReminders.length > 0 && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {reminders.customReminders.map((item) => (
              <div
                key={item.id}
                className="px-3.5 py-2.5 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-3"
              >
                <label className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={() => toggleCustom(item.id)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 shrink-0"
                  />
                  <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">
                    {formatTimeAr12h(item.time)}
                  </span>
                  <span
                    className={`text-sm font-semibold truncate ${
                      item.enabled
                        ? 'text-slate-900 dark:text-slate-100'
                        : 'text-slate-400 line-through'
                    }`}
                  >
                    {item.label}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => deleteCustom(item.id)}
                  aria-label={`حذف تنبيه ${item.label}`}
                  className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 flex items-center justify-center shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sound, Browser Notification Permission & Live Test */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => patch({ soundEnabled: !reminders.soundEnabled })}
            className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap"
          >
            {reminders.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
            <span>{reminders.soundEnabled ? 'نغمة التنبيه: شغّالة' : 'نغمة التنبيه: صامت'}</span>
          </button>

          {notifPerm !== 'unsupported' && notifPerm !== 'granted' && (
            <button
              type="button"
              onClick={handleRequestNotif}
              className="min-h-[40px] px-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5 whitespace-nowrap"
            >
              <BellRing className="w-4 h-4" />
              <span>
                {notifPerm === 'denied'
                  ? 'الإشعارات محظورة من المتصفح'
                  : 'تفعيل إشعارات الجهاز'}
              </span>
            </button>
          )}

          {notifPerm === 'granted' && (
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 px-1">
              إشعارات الجهاز مفعّلة
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onTestReminder}
          className="min-h-[40px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 whitespace-nowrap"
        >
          <BellRing className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <span>تجربة التنبيه الآن</span>
        </button>
      </div>
    </section>
  );
};
