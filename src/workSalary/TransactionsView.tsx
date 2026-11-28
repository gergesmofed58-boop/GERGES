import React, { useMemo, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import {
  MonthlyCommitment,
  SalarySettings,
  SalaryTransaction,
  TRANSACTION_META,
  TransactionType,
  formatDayDateAr,
  formatPayrollPeriodLabelAr,
  getPayrollPeriodDates,
  getTodayIso,
} from './types';
import {
  MonthlyPayrollSummary,
  computeCommitmentsSummary,
  formatMoney,
} from './calculations';

interface TransactionsViewProps {
  settings: SalarySettings;
  activeMonthKey: string;
  transactions: SalaryTransaction[];
  commitments: MonthlyCommitment[];
  summary: MonthlyPayrollSummary;
  onAddTransaction: (tx: Omit<SalaryTransaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  onAddCommitment: (title: string, amount: number) => void;
  onToggleCommitmentPaid: (id: string) => void;
  onDeleteCommitment: (id: string) => void;
}

const TX_TYPES: TransactionType[] = ['advance', 'bonus', 'deduction'];

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  settings,
  activeMonthKey,
  transactions,
  commitments,
  summary,
  onAddTransaction,
  onDeleteTransaction,
  onAddCommitment,
  onToggleCommitmentPaid,
  onDeleteCommitment,
}) => {
  const [sectionMode, setSectionMode] = useState<'ledger' | 'budget'>('ledger');

  const cycleStartDay = settings.cycleStartDay ?? 1;
  const periodDates = useMemo(
    () => getPayrollPeriodDates(activeMonthKey, cycleStartDay),
    [activeMonthKey, cycleStartDay]
  );
  const periodStartIso = periodDates[0] ?? `${activeMonthKey}-01`;
  const periodEndIso = periodDates[periodDates.length - 1] ?? `${activeMonthKey}-28`;

  const todayIso = getTodayIso();
  const defaultDate =
    todayIso >= periodStartIso && todayIso <= periodEndIso ? todayIso : periodStartIso;

  // Ledger state
  const [type, setType] = useState<TransactionType>('advance');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [dateIso, setDateIso] = useState(defaultDate);
  const [note, setNote] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Commitments state
  const [comTitle, setComTitle] = useState('');
  const [comAmount, setComAmount] = useState('');

  const periodTitle = formatPayrollPeriodLabelAr(activeMonthKey, cycleStartDay);

  const monthList = useMemo(
    () =>
      transactions
        .filter((t) =>
          cycleStartDay === 1
            ? t.monthKey === activeMonthKey
            : t.dateIso >= periodStartIso && t.dateIso <= periodEndIso
        )
        .sort((a, b) => b.dateIso.localeCompare(a.dateIso)),
    [transactions, activeMonthKey, cycleStartDay, periodStartIso, periodEndIso]
  );

  const filteredList = useMemo(() => {
    if (filterType === 'all') return monthList;
    return monthList.filter((t) => t.type === filterType);
  }, [monthList, filterType]);

  const totals = useMemo(() => {
    const advance = monthList
      .filter((t) => t.type === 'advance')
      .reduce((s, t) => s + t.amount, 0);
    const bonus = monthList
      .filter((t) => t.type === 'bonus')
      .reduce((s, t) => s + t.amount, 0);
    const deduction = monthList
      .filter((t) => t.type === 'deduction')
      .reduce((s, t) => s + t.amount, 0);
    return { advance, bonus, deduction };
  }, [monthList]);

  const commitSummary = useMemo(
    () => computeCommitmentsSummary(commitments, activeMonthKey),
    [commitments, activeMonthKey]
  );
  const freeAfterCommitments = summary.netSalary - commitSummary.total;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!Number.isFinite(num) || num <= 0) return;

    const cleanDate = dateIso || defaultDate;
    const txMonthKey = cleanDate.slice(0, 7);
    const cleanTitle =
      title.trim() ||
      (type === 'advance'
        ? 'سلفة نقدية'
        : type === 'bonus'
        ? 'مكافأة / حافز'
        : 'خصم / جزاء');

    onAddTransaction({
      type,
      amount: num,
      title: cleanTitle,
      dateIso: cleanDate,
      monthKey: txMonthKey,
      note: note.trim() || undefined,
    });

    setAmount('');
    setTitle('');
    setNote('');
  };

  const handleAddCommitmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(comAmount);
    if (!comTitle.trim() || !Number.isFinite(num) || num <= 0) return;
    onAddCommitment(comTitle.trim(), num);
    setComTitle('');
    setComAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher: Advances/Bonuses vs Post-Salary Commitments */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800/80 max-w-lg">
        <button
          type="button"
          onClick={() => setSectionMode('ledger')}
          className={`min-h-[42px] px-3 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
            sectionMode === 'ledger'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          السُلف والمكافآت والخصومات
        </button>
        <button
          type="button"
          onClick={() => setSectionMode('budget')}
          className={`min-h-[42px] px-3 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
            sectionMode === 'budget'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          التزامات وميزانية بعد القبض ({commitments.length})
        </button>
      </div>

      {sectionMode === 'ledger' ? (
        <>
          {/* Totals Strip */}
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                السُلف والمكافآت والخصومات — {periodTitle}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                أي سلفة أو مكافأة أو خصم تسجله هنا بيتحسب أوتوماتيك في صافي مرتب الفترة
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">إجمالي السُلف</p>
                <p className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-0.5">
                  -{formatMoney(totals.advance, settings.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  إجمالي المكافآت والحوافز
                </p>
                <p className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                  +{formatMoney(totals.bonus, settings.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  إجمالي الخصومات والجزاءات
                </p>
                <p className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                  -{formatMoney(totals.deduction, settings.currency)}
                </p>
              </div>
            </div>
          </section>

          {/* Add New Transaction Form */}
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              تسجيل حركة جديدة
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950">
                {TX_TYPES.map((t) => {
                  const active = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`min-h-[42px] rounded-lg text-xs font-bold transition-colors ${
                        active
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {TRANSACTION_META[t].label}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="tx-amount"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
                  >
                    المبلغ ({settings.currency})
                  </label>
                  <input
                    id="tx-amount"
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="مثلاً: 500"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1 lg:col-span-2">
                  <label
                    htmlFor="tx-title"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
                  >
                    البيان / السبب
                  </label>
                  <input
                    id="tx-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      type === 'advance'
                        ? 'مثلاً: سلفة منتصف الشهر'
                        : type === 'bonus'
                        ? 'مثلاً: حافز إنتاج / بونص'
                        : 'مثلاً: خصم تأخير / جزاء'
                    }
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="tx-date"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
                  >
                    التاريخ
                  </label>
                  <input
                    id="tx-date"
                    type="date"
                    value={dateIso}
                    onChange={(e) => setDateIso(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ملاحظة إضافية (اختياري)..."
                  className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة إلى كشف الشهر</span>
                </button>
              </div>
            </form>
          </section>

          {/* Ledger List */}
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                سجل الحركات ({filteredList.length})
              </h2>

              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950">
                {(
                  [
                    { id: 'all', label: 'الكل' },
                    { id: 'advance', label: 'سُلف' },
                    { id: 'bonus', label: 'مكافآت' },
                    { id: 'deduction', label: 'خصومات' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterType(tab.id)}
                    className={`min-h-[34px] px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                      filterType === tab.id
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredList.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                لا توجد حركات مطابقة في هذه الفترة.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredList.map((tx) => {
                  const meta = TRANSACTION_META[tx.type];
                  const isConfirming = confirmDeleteId === tx.id;
                  return (
                    <div
                      key={tx.id}
                      className="px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {tx.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                          <span className={`font-bold ${meta.text}`}>{meta.label}</span>
                          {' · '}
                          {formatDayDateAr(tx.dateIso)}
                          {tx.note ? ` · ${tx.note}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-sm sm:text-base font-mono font-bold tabular-nums whitespace-nowrap ${meta.text}`}
                        >
                          {meta.sign}
                          {formatMoney(tx.amount, settings.currency)}
                        </span>

                        {isConfirming ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteTransaction(tx.id);
                                setConfirmDeleteId(null);
                              }}
                              className="min-h-[36px] px-2.5 rounded-lg bg-rose-600 text-white text-xs font-bold"
                            >
                              حذف
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="min-h-[36px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(tx.id)}
                            aria-label={`حذف ${tx.title}`}
                            className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:border-rose-300 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : (
        /* POST-SALARY COMMITMENTS & BUDGET PLANNER */
        <>
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                التزامات وميزانية المرتب بعد القبض — {periodTitle}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                سجّل التزاماتك الشهرية الثابتة (إيجار، جمعية، فواتير، أقساط) وشوف الصافي الحقيقي
                المتبقي في إيدك بعد القبض
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">صافي المرتب المستحق</p>
                <p className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                  {formatMoney(summary.netSalary, settings.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  إجمالي الالتزامات (اتدفع {formatMoney(commitSummary.paid, settings.currency)})
                </p>
                <p className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                  -{formatMoney(commitSummary.total, settings.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  المتبقي الحقيقي بعد الالتزامات
                </p>
                <p
                  className={`text-xl font-bold font-mono mt-0.5 ${
                    freeAfterCommitments >= 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatMoney(freeAfterCommitments, settings.currency)}
                </p>
              </div>
            </div>
          </section>

          {/* Add Commitment Form */}
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              إضافة التزام شهري جديد
            </h2>
            <form
              onSubmit={handleAddCommitmentSubmit}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2.5"
            >
              <input
                type="text"
                required
                value={comTitle}
                onChange={(e) => setComTitle(e.target.value)}
                placeholder="اسم الالتزام (مثلاً: إيجار / جمعية / فاتورة نت)..."
                className="sm:col-span-6 min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
              />
              <input
                type="number"
                required
                min="0"
                step="any"
                value={comAmount}
                onChange={(e) => setComAmount(e.target.value)}
                placeholder={`المبلغ (${settings.currency})`}
                className="sm:col-span-3 min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100"
              />
              <button
                type="submit"
                className="sm:col-span-3 min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة الالتزام</span>
              </button>
            </form>
          </section>

          {/* Commitments Checklist */}
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                قائمة الالتزامات ({commitments.length})
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                علّم على اللي دفعته هذا الشهر
              </span>
            </div>

            {commitments.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                لا توجد التزامات شهرية مسجّلة بعد — أضف التزاماتك فوق عشان تتابع المتبقي من مرتبك.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {commitments.map((c) => {
                  const isPaid = Boolean(c.paidMonths?.[activeMonthKey]);
                  return (
                    <div
                      key={c.id}
                      className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3"
                    >
                      <button
                        type="button"
                        onClick={() => onToggleCommitmentPaid(c.id)}
                        className="flex items-center gap-3 min-w-0 flex-1 text-start"
                      >
                        <span
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                            isPaid
                              ? 'bg-emerald-700 border-emerald-700 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950'
                          }`}
                        >
                          {isPaid && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <div className="min-w-0">
                          <div
                            className={`text-sm font-bold truncate ${
                              isPaid
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {c.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {isPaid ? 'تم السداد هذا الشهر' : 'لم يُسدد بعد'}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm sm:text-base font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {formatMoney(c.amount, settings.currency)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteCommitment(c.id)}
                          aria-label={`حذف ${c.title}`}
                          className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};
