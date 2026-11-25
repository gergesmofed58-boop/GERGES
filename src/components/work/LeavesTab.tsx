import React, { useMemo, useState } from 'react';
import { CalendarPlus, Settings2, Trash2, X } from 'lucide-react';
import type { LeaveCategory, LeaveQuotas, LeaveRecord } from '../../types/workApp';
import {
  calculateCalendarDays,
  normalizeNumericInput,
  parseNumericString,
} from '../../utils/payrollEngine';

interface LeavesTabProps {
  leaves: LeaveRecord[];
  quotas: LeaveQuotas;
  todayDate: string;
  showAddSheet: boolean;
  onSetShowAddSheet: (open: boolean) => void;
  onAddLeave: (payload: {
    type: LeaveCategory;
    startDate: string;
    endDate: string;
    notes: string;
  }) => void;
  onDeleteLeave: (id: string) => void;
  onUpdateQuotas: (quotas: LeaveQuotas) => void;
}

const LEAVE_LABELS: Record<LeaveCategory, string> = {
  annual: 'إجازة اعتيادي',
  casual: 'إجازة عارضة',
  sick: 'إجازة مرضي',
  compensatory: 'بدل راحة',
};

const QUOTA_PLACEHOLDERS: Record<LeaveCategory, string> = {
  annual: 'مثال: 21',
  casual: 'مثال: 6',
  sick: 'مثال: 15',
  compensatory: 'مثال: 4',
};

export const LeavesTab: React.FC<LeavesTabProps> = ({
  leaves,
  quotas,
  todayDate,
  showAddSheet,
  onSetShowAddSheet,
  onAddLeave,
  onDeleteLeave,
  onUpdateQuotas,
}) => {
  const [filterType, setFilterType] = useState<'all' | LeaveCategory>('all');
  const [editingQuotas, setEditingQuotas] = useState(false);
  const [draftQuotaText, setDraftQuotaText] = useState<Record<LeaveCategory, string>>({
    annual: '',
    casual: '',
    sick: '',
    compensatory: '',
  });

  // نموذج إضافة إجازة
  const [type, setType] = useState<LeaveCategory>('annual');
  const [startDate, setStartDate] = useState(todayDate);
  const [endDate, setEndDate] = useState(todayDate);
  const [notes, setNotes] = useState('');

  const usedByCategory = useMemo(() => {
    const map: Record<LeaveCategory, number> = {
      annual: 0,
      casual: 0,
      sick: 0,
      compensatory: 0,
    };
    leaves.forEach((l) => {
      map[l.type] += l.days;
    });
    return map;
  }, [leaves]);

  const filteredLeaves = useMemo(
    () =>
      filterType === 'all'
        ? leaves
        : leaves.filter((l) => l.type === filterType),
    [leaves, filterType]
  );

  const computedDays = useMemo(
    () => calculateCalendarDays(startDate, endDate),
    [startDate, endDate]
  );

  const remainingForSelected = Math.max(0, quotas[type] - usedByCategory[type]);

  const openQuotaEditor = () => {
    setDraftQuotaText({
      annual: quotas.annual > 0 ? String(quotas.annual) : '',
      casual: quotas.casual > 0 ? String(quotas.casual) : '',
      sick: quotas.sick > 0 ? String(quotas.sick) : '',
      compensatory: quotas.compensatory > 0 ? String(quotas.compensatory) : '',
    });
    setEditingQuotas((v) => !v);
  };

  const handleSaveLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (computedDays <= 0) return;
    onAddLeave({ type, startDate, endDate, notes });
    setNotes('');
    onSetShowAddSheet(false);
  };

  const handleSaveQuotas = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateQuotas({
      annual: Math.round(parseNumericString(draftQuotaText.annual)),
      casual: Math.round(parseNumericString(draftQuotaText.casual)),
      sick: Math.round(parseNumericString(draftQuotaText.sick)),
      compensatory: Math.round(parseNumericString(draftQuotaText.compensatory)),
    });
    setEditingQuotas(false);
  };

  const categories: LeaveCategory[] = ['annual', 'casual', 'sick', 'compensatory'];

  return (
    <div className="space-y-5">
      {/* العنوان */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            إجازاتك والرصيد اللي باقي
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            اكتب رصيد إجازاتك في السنة وسجّل كل إجازة تاخدها عشان تعرف باقيلك كام يوم.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openQuotaEditor}
            className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Settings2 className="w-4 h-4" />
            <span>عدّل رصيدك</span>
          </button>
          <button
            type="button"
            onClick={() => onSetShowAddSheet(true)}
            className="min-h-[44px] px-4 rounded-xl bg-[#0F5C7E] hover:bg-[#0B4A66] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>سجّل إجازة جديدة</span>
          </button>
        </div>
      </div>

      {/* تعديل رصيد الإجازات (مربعات فاضية وسهلة الكتابة) */}
      {editingQuotas && (
        <form
          onSubmit={handleSaveQuotas}
          className="bg-white dark:bg-slate-900 border border-[#0F5C7E]/40 rounded-2xl p-5 space-y-4"
        >
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            اكتب رصيد إجازاتك السنوي حسب نظام شركتك
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {categories.map((cat) => (
              <div key={cat}>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {LEAVE_LABELS[cat]}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={draftQuotaText[cat]}
                  onChange={(e) =>
                    setDraftQuotaText((prev) => ({
                      ...prev,
                      [cat]: normalizeNumericInput(e.target.value),
                    }))
                  }
                  placeholder={QUOTA_PLACEHOLDERS[cat]}
                  className="w-full min-h-[42px] px-3 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingQuotas(false)}
              className="min-h-[40px] px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-5 rounded-xl bg-[#0F5C7E] text-white text-xs font-bold cursor-pointer"
            >
              احفظ الرصيد
            </button>
          </div>
        </form>
      )}

      {/* 4 كروت لأرصدة الإجازات */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {categories.map((cat) => {
          const total = quotas[cat];
          const used = usedByCategory[cat];
          const remaining = Math.max(0, total - used);
          const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

          return (
            <div
              key={cat}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {LEAVE_LABELS[cat]}
                </span>
                <span className="text-[11px] font-mono tabular-nums text-slate-500">
                  {used}/{total}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {remaining}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">يوم باقي</span>
              </div>

              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-[#0F5C7E] dark:bg-sky-500 rounded-full transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </section>

      {/* فلتر الإجازات */}
      <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 overflow-x-auto max-w-full">
        {(
          [
            { id: 'all', label: 'الكل' },
            { id: 'annual', label: 'اعتيادي' },
            { id: 'casual', label: 'عارضة' },
            { id: 'sick', label: 'مرضي' },
            { id: 'compensatory', label: 'بدل راحة' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilterType(t.id)}
            className={`min-h-[38px] px-3.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              filterType === t.id
                ? 'bg-white dark:bg-slate-900 text-[#0F5C7E] dark:text-sky-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* قائمة الإجازات المحفوظة */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        {filteredLeaves.length === 0 ? (
          <div className="py-12 px-6 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              مفيش إجازات متسجلة هنا لسه.
            </p>
            <button
              type="button"
              onClick={() => onSetShowAddSheet(true)}
              className="min-h-[44px] px-5 rounded-xl bg-[#0F5C7E] text-white text-xs font-bold cursor-pointer"
            >
              سجّل أول إجازة
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredLeaves.map((lv) => (
              <div
                key={lv.id}
                className="p-4 sm:px-5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                    <span>{LEAVE_LABELS[lv.type]}</span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="font-mono tabular-nums text-xs text-[#0F5C7E] dark:text-sky-400">
                      {lv.days} يوم
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                    من {lv.startDate} لحد {lv.endDate}
                  </div>
                  {lv.notes && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {lv.notes}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteLeave(lv.id)}
                  className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-400 shrink-0 cursor-pointer"
                  aria-label="مسح الإجازة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* شاشة تسجيل إجازة جديدة */}
      {showAddSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sm:hidden w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                سجّل إجازة جديدة
              </h2>
              <button
                type="button"
                onClick={() => onSetShowAddSheet(false)}
                className="min-w-[44px] min-h-[44px] -ml-2 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="قفل"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLeave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  نوع الإجازة
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as LeaveCategory)}
                  className="w-full min-h-[44px] px-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0F5C7E]"
                >
                  <option value="annual">إجازة اعتيادي</option>
                  <option value="casual">إجازة عارضة</option>
                  <option value="sick">إجازة مرضي</option>
                  <option value="compensatory">بدل راحة</option>
                </select>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  اللي باقيلك في الرصيد:{' '}
                  <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
                    {remainingForSelected} يوم
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    من يوم
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (e.target.value > endDate) setEndDate(e.target.value);
                    }}
                    className="w-full min-h-[44px] px-3 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    لحد يوم
                  </label>
                  <input
                    type="date"
                    required
                    min={startDate}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300">عدد الأيام</span>
                <span className="font-mono tabular-nums font-bold text-sm text-[#0F5C7E] dark:text-sky-400">
                  {computedDays} يوم
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  سبب الإجازة أو ملاحظات (اختياري)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="اكتب السبب لو حابب..."
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 min-h-[48px] rounded-xl bg-[#0F5C7E] hover:bg-[#0B4A66] text-white text-sm font-bold cursor-pointer"
                >
                  احفظ الإجازة
                </button>
                <button
                  type="button"
                  onClick={() => onSetShowAddSheet(false)}
                  className="min-h-[48px] px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
