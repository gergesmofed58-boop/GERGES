import React, { useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  Calculator,
  Calendar,
  Lock,
  Plus,
  Trash2,
} from 'lucide-react';
import { PriceAlert } from '../types';
import { MarketStore } from '../useMarketStore';

interface Props {
  store: MarketStore;
}

export const ToolsView: React.FC<Props> = ({ store }) => {
  const isAr = store.locale === 'ar';

  // 1. Average Down Calculator state (empty-ready)
  const [curShares, setCurShares] = useState<string>('');
  const [curAvg, setCurAvg] = useState<string>('');
  const [marketPrice, setMarketPrice] = useState<string>('');
  const [targetAvg, setTargetAvg] = useState<string>('');

  const avgResult = useMemo(() => {
    const q = Number(curShares);
    const a = Number(curAvg);
    const m = Number(marketPrice);
    const t = Number(targetAvg);
    if (q <= 0 || a <= 0 || m <= 0 || t <= 0) return null;
    if (m >= a) {
      return {
        error: isAr
          ? 'السعر الحالي أعلى من أو يساوي متوسطك — مش محتاج تعديل لتحت.'
          : 'Current price must be lower than your current average.',
      };
    }
    if (t <= m || t >= a) {
      return {
        error: isAr
          ? 'المتوسط المستهدف لازم يكون رقم بين السعر الحالي ومتوسطك القديم.'
          : 'Target average must sit strictly between current price and old average.',
      };
    }
    const neededShares = (q * (a - t)) / (t - m);
    const neededCash = neededShares * m;
    return {
      neededShares: Math.ceil(neededShares),
      neededCash: Number(neededCash.toFixed(2)),
      totalShares: Math.ceil(q + neededShares),
    };
  }, [curShares, curAvg, marketPrice, targetAvg, isAr]);

  // 2. Price Alert form state
  const [alertAssetId, setAlertAssetId] = useState<string>('cmd_gold');
  const [alertCond, setAlertCond] = useState<PriceAlert['condition']>('above');
  const [alertVal, setAlertVal] = useState<string>('');

  // 3. Trading Journal form state
  const [jSymbol, setJSymbol] = useState<string>('');
  const [jSide, setJSide] = useState<'buy' | 'sell'>('buy');
  const [jEntry, setJEntry] = useState<string>('');
  const [jTarget, setJTarget] = useState<string>('');
  const [jStop, setJStop] = useState<string>('');
  const [jReason, setJReason] = useState<string>('');

  return (
    <div className="flex flex-col gap-6">
      {/* Row 1: Average Down Calculator + Smart Price Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Average Down Calculator */}
        <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {isAr
                  ? 'حاسبة تعديل متوسط السعر (Average Down)'
                  : 'Average Down Calculator'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'اعرف تشتري كام سهم بكام عشان تنزل متوسط سعرك للرقم اللي عاوزه.'
                  : 'Calculate exact shares and cash needed to reach your target average price.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="text-slate-500 dark:text-slate-400">
                {isAr ? 'عدد أسهمك الحالية' : 'Current Shares'}
              </label>
              <input
                type="number"
                step="any"
                value={curShares}
                onChange={(e) => setCurShares(e.target.value)}
                placeholder="100"
                className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-slate-500 dark:text-slate-400">
                {isAr ? 'متوسط الشراء القديم' : 'Current Avg Price'}
              </label>
              <input
                type="number"
                step="any"
                value={curAvg}
                onChange={(e) => setCurAvg(e.target.value)}
                placeholder="100"
                className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-slate-500 dark:text-slate-400">
                {isAr ? 'سعر السهم دلوقتي' : 'Current Market Price'}
              </label>
              <input
                type="number"
                step="any"
                value={marketPrice}
                onChange={(e) => setMarketPrice(e.target.value)}
                placeholder="70"
                className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-slate-500 dark:text-slate-400">
                {isAr ? 'المتوسط اللي عاوز توصله' : 'Target Average'}
              </label>
              <input
                type="number"
                step="any"
                value={targetAvg}
                onChange={(e) => setTargetAvg(e.target.value)}
                placeholder="80"
                className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {avgResult && (
            <div className="rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 p-3.5 text-xs">
              {'error' in avgResult ? (
                <p className="text-amber-600 dark:text-amber-400 font-semibold">
                  {avgResult.error}
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 font-mono tabular-nums">
                  <div className="flex flex-col">
                    <span className="font-sans text-[11px] text-slate-500">
                      {isAr ? 'تشتري كام سهم' : 'Shares to Buy'}
                    </span>
                    <span className="text-base font-bold text-teal-700 dark:text-teal-400">
                      {avgResult.neededShares.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-sans text-[11px] text-slate-500">
                      {isAr ? 'التكلفة المطلوبة' : 'Cash Needed'}
                    </span>
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {avgResult.neededCash.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-sans text-[11px] text-slate-500">
                      {isAr ? 'إجمالي أسهمك' : 'Total Shares'}
                    </span>
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {avgResult.totalShares.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Smart Price Alerts */}
        <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {isAr
                  ? 'تنبيهات الأسعار والحركة المفاجئة'
                  : 'Smart Price & % Move Alerts'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'تنبيه فوري لو سهم أو ذهب كسر سعر معين أو اتحرك بنسبة مئوية.'
                  : 'Trigger alerts on target price or sudden % volatility.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
            <select
              value={alertAssetId}
              onChange={(e) => setAlertAssetId(e.target.value)}
              className="sm:col-span-5 h-10 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-semibold text-slate-900 dark:text-slate-100"
            >
              {store.assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.symbol} ({a.price})
                </option>
              ))}
            </select>
            <select
              value={alertCond}
              onChange={(e) =>
                setAlertCond(e.target.value as PriceAlert['condition'])
              }
              className="sm:col-span-3 h-10 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100"
            >
              <option value="above">{isAr ? 'أعلى من' : 'Above'}</option>
              <option value="below">{isAr ? 'أقل من' : 'Below'}</option>
              <option value="move_pct">{isAr ? 'تغير %' : 'Move %'}</option>
            </select>
            <input
              type="number"
              step="any"
              value={alertVal}
              onChange={(e) => setAlertVal(e.target.value)}
              placeholder={alertCond === 'move_pct' ? '5' : '2700'}
              className="sm:col-span-2 h-10 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={() => {
                const v = Number(alertVal);
                if (v > 0) {
                  store.addAlert(alertAssetId, alertCond, v);
                  setAlertVal('');
                }
              }}
              className="sm:col-span-2 h-10 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {store.alerts.length === 0 ? (
              <p className="py-4 text-center text-slate-500">
                {isAr ? 'لا توجد تنبيهات نشطة حالياً' : 'No active alerts'}
              </p>
            ) : (
              store.alerts.map((al) => {
                const asset = store.assets.find((a) => a.id === al.assetId);
                return (
                  <div
                    key={al.id}
                    className="py-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {asset?.symbol ?? al.assetId}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {al.condition === 'above'
                          ? isAr
                            ? 'أعلى من'
                            : '≥'
                          : al.condition === 'below'
                            ? isAr
                              ? 'أقل من'
                              : '≤'
                            : isAr
                              ? 'حركة ±'
                              : 'Move ±'}{' '}
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {al.targetValue}
                          {al.condition === 'move_pct' ? '%' : ''}
                        </span>
                      </span>
                      {al.triggered && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          · {isAr ? 'اتحقق!' : 'Triggered'}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => store.deleteAlert(al.id)}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Row 2: Dividends & Economic Calendar + Trading Journal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Dividends & Earnings Calendar */}
        <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {isAr
                ? 'تقويم الكوبونات ونتائج الأعمال والفائدة'
                : 'Dividends, Earnings & Macro Calendar'}
            </h2>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {store.calendarEvents.map((ev) => (
              <div key={ev.id} className="py-3 flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                      {ev.symbol}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono tabular-nums text-slate-500">
                      {ev.date}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span
                      className={
                        ev.impact === 'high'
                          ? 'font-semibold text-amber-600 dark:text-amber-400'
                          : 'text-slate-500'
                      }
                    >
                      {ev.type === 'dividend'
                        ? isAr
                          ? 'توزيع أرباح'
                          : 'Dividend'
                        : ev.type === 'earnings'
                          ? isAr
                            ? 'نتائج أعمال'
                            : 'Earnings'
                          : isAr
                            ? 'قرار اقتصادي'
                            : 'Macro'}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    {isAr ? ev.titleAr : ev.titleEn}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {isAr ? ev.detailAr : ev.detailEn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trading Journal */}
        <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {isAr
                ? 'مفكرة صفقاتك (Trading Journal)'
                : 'Personal Trading Journal'}
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <input
              type="text"
              value={jSymbol}
              onChange={(e) => setJSymbol(e.target.value.toUpperCase())}
              placeholder={isAr ? 'الرمز (NVDA)' : 'Symbol'}
              className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono text-slate-900 dark:text-slate-100"
            />
            <select
              value={jSide}
              onChange={(e) => setJSide(e.target.value as 'buy' | 'sell')}
              className="h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100"
            >
              <option value="buy">{isAr ? 'شراء' : 'Buy'}</option>
              <option value="sell">{isAr ? 'بيع' : 'Sell'}</option>
            </select>
            <input
              type="number"
              step="any"
              value={jEntry}
              onChange={(e) => setJEntry(e.target.value)}
              placeholder={isAr ? 'سعر الدخول' : 'Entry'}
              className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
            <input
              type="number"
              step="any"
              value={jTarget}
              onChange={(e) => setJTarget(e.target.value)}
              placeholder={isAr ? 'الهدف' : 'Target'}
              className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex gap-2 text-xs">
            <input
              type="number"
              step="any"
              value={jStop}
              onChange={(e) => setJStop(e.target.value)}
              placeholder={isAr ? 'وقف الخسارة' : 'Stop Loss'}
              className="w-28 h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
            <input
              type="text"
              value={jReason}
              onChange={(e) => setJReason(e.target.value)}
              placeholder={
                isAr ? 'ليه دخلت الصفقة دي؟ (اختياري)' : 'Trade thesis / reason'
              }
              className="flex-1 h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={() => {
                if (!jSymbol.trim() || !jEntry) return;
                store.addJournalEntry({
                  assetSymbol: jSymbol.trim(),
                  side: jSide,
                  entryPrice: Number(jEntry),
                  targetPrice: Number(jTarget) || 0,
                  stopLoss: Number(jStop) || 0,
                  reason: jReason.trim(),
                  outcome: 'open',
                });
                setJSymbol('');
                setJEntry('');
                setJTarget('');
                setJStop('');
                setJReason('');
              }}
              className="h-9 px-3.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold whitespace-nowrap shrink-0"
            >
              {isAr ? 'تسجيل' : 'Log'}
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {store.journal.map((j) => (
              <div key={j.id} className="py-2.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {j.assetSymbol}
                    </span>
                    <span
                      className={
                        j.side === 'buy'
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'text-red-600 dark:text-red-400 font-semibold'
                      }
                    >
                      {j.side === 'buy'
                        ? isAr
                          ? 'شراء'
                          : 'BUY'
                        : isAr
                          ? 'بيع'
                          : 'SELL'}
                    </span>
                    <span className="text-slate-500">@{j.entryPrice}</span>
                    {j.targetPrice > 0 && (
                      <span className="text-slate-400">→ {j.targetPrice}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {(['open', 'win', 'loss'] as const).map((o) => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => store.updateJournalOutcome(j.id, o)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          j.outcome === o
                            ? o === 'win'
                              ? 'bg-emerald-600 text-white'
                              : o === 'loss'
                                ? 'bg-red-600 text-white'
                                : 'bg-slate-700 text-white'
                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {o === 'open'
                          ? isAr
                            ? 'مفتوحة'
                            : 'Open'
                          : o === 'win'
                            ? isAr
                              ? 'ربح'
                              : 'Win'
                            : isAr
                              ? 'خسارة'
                              : 'Loss'}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => store.deleteJournalEntry(j.id)}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {j.reason && (
                  <p className="text-slate-600 dark:text-slate-400">{j.reason}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Privacy PIN Lock Card */}
      <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {isAr
                ? 'قفل المحفظة برقم سري (PIN / بصمة على الأندرويد)'
                : 'Privacy PIN & Biometric Portfolio Lock'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? 'اخفي أرقام محفظتك وصفقاتك برقم سري من 4 أرقام.'
                : 'Protect your portfolio balances behind a 4-digit PIN.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-semibold">
            <input
              type="checkbox"
              checked={store.pinEnabled}
              onChange={(e) => store.setPinEnabled(e.target.checked)}
              className="w-4 h-4 accent-teal-600"
            />
            <span>{isAr ? 'تفعيل القفل' : 'Enable Lock'}</span>
          </label>
          <input
            type="password"
            maxLength={4}
            value={store.pinCode}
            onChange={(e) =>
              store.setPinCode(e.target.value.replace(/\D/g, '').slice(0, 4))
            }
            placeholder="PIN"
            className="w-20 h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono text-center text-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={() => store.setIsLocked(true)}
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            {isAr ? 'اقفل دلوقتي' : 'Lock Now'}
          </button>
        </div>
      </section>
    </div>
  );
};
