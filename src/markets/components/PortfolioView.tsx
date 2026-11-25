import React, { useMemo, useState } from 'react';
import { Briefcase, Plus, RotateCcw, Trash2, Wallet } from 'lucide-react';
import { convertToDisplayCurrency } from '../marketData';
import { DisplayCurrency, MarketAsset } from '../types';
import { MarketStore } from '../useMarketStore';

interface Props {
  store: MarketStore;
  onSelectAsset: (asset: MarketAsset) => void;
}

export const PortfolioView: React.FC<Props> = ({ store, onSelectAsset }) => {
  const isAr = store.locale === 'ar';
  const [mode, setMode] = useState<'real' | 'paper'>('real');
  const [selectedAssetId, setSelectedAssetId] = useState<string>(
    store.assets[0]?.id ?? 'egx_comi'
  );
  const [qtyInput, setQtyInput] = useState<string>('');
  const [priceInput, setPriceInput] = useState<string>('');

  const holdings = mode === 'real' ? store.realHoldings : store.paperHoldings;
  const selectedAsset = store.assets.find((a) => a.id === selectedAssetId);

  const summary = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;

    const rows = holdings
      .map((h) => {
        const asset = store.assets.find((a) => a.id === h.assetId);
        if (!asset) return null;
        const valDisplay = convertToDisplayCurrency(
          h.quantity * asset.price,
          asset.currency,
          store.displayCurrency,
          store.fxRates
        );
        const costDisplay = convertToDisplayCurrency(
          h.quantity * h.avgPrice,
          asset.currency,
          store.displayCurrency,
          store.fxRates
        );
        const pnl = valDisplay - costDisplay;
        const pnlPct = costDisplay > 0 ? (pnl / costDisplay) * 100 : 0;
        totalValue += valDisplay;
        totalCost += costDisplay;
        return { holding: h, asset, valDisplay, costDisplay, pnl, pnlPct };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const cashDisplay =
      mode === 'paper'
        ? convertToDisplayCurrency(
            store.paperCashUsd,
            'USD',
            store.displayCurrency,
            store.fxRates
          )
        : 0;

    const totalPnl = totalValue - totalCost;
    const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    return {
      rows,
      totalValue,
      totalCost,
      cashDisplay,
      netWorth: totalValue + cashDisplay,
      totalPnl,
      totalPnlPct,
    };
  }, [holdings, store.assets, store.displayCurrency, store.fxRates, store.paperCashUsd, mode]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const q = Number(qtyInput);
    const p = Number(priceInput) || selectedAsset?.price || 0;
    if (q <= 0 || p <= 0) return;
    store.addHolding(mode, selectedAssetId, q, p);
    setQtyInput('');
    setPriceInput('');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Mode Switcher (Real Portfolio vs Paper Trading) + Currency Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={() => setMode('real')}
            className={`min-h-[40px] px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              mode === 'real'
                ? 'bg-white dark:bg-[#111827] text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>{isAr ? 'محفظتي الحقيقية' : 'Real Portfolio'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('paper')}
            className={`min-h-[40px] px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              mode === 'paper'
                ? 'bg-white dark:bg-[#111827] text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>
              {isAr ? 'تداول تجريبي (Paper Trading)' : 'Paper Trading ($100k)'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {isAr ? 'توحيد العملة:' : 'Unified Currency:'}
          </span>
          <div className="flex items-center p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800/80">
            {(['EGP', 'USD', 'SAR'] as DisplayCurrency[]).map((cur) => (
              <button
                key={cur}
                type="button"
                onClick={() => store.setDisplayCurrency(cur)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-colors ${
                  store.displayCurrency === cur
                    ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {cur}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Unified Net Worth KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {mode === 'paper'
              ? isAr
                ? 'إجمالي المحفظة التجريبية (أسهم + كاش)'
                : 'Total Paper Equity (Stocks + Cash)'
              : isAr
                ? 'إجمالي قيمة استثماراتك'
                : 'Total Portfolio Value'}
          </span>
          <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-slate-100">
            {summary.netWorth.toLocaleString('en-US', {
              maximumFractionDigits: 1,
            })}{' '}
            <span className="text-xs font-normal text-slate-500">
              {store.displayCurrency}
            </span>
          </p>
          {mode === 'paper' && (
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {isAr ? 'كاش متاح للشراء:' : 'Available Cash:'}{' '}
              {summary.cashDisplay.toLocaleString('en-US', {
                maximumFractionDigits: 0,
              })}{' '}
              {store.displayCurrency}
            </span>
          )}
        </div>

        <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {isAr ? 'إجمالي الربح / الخسارة المفتوحة' : 'Unrealized P&L'}
          </span>
          <p
            className={`font-mono tabular-nums text-2xl font-bold ${
              summary.totalPnl >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {summary.totalPnl >= 0 ? '+' : ''}
            {summary.totalPnl.toLocaleString('en-US', {
              maximumFractionDigits: 1,
            })}{' '}
            <span className="text-xs font-normal">{store.displayCurrency}</span>
          </p>
          <span
            className={`text-xs font-mono tabular-nums font-semibold ${
              summary.totalPnlPct >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {summary.totalPnlPct >= 0 ? '+' : ''}
            {summary.totalPnlPct.toFixed(2)}%
          </span>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-2">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isAr ? 'عدد الأصول في المحفظة' : 'Active Positions'}
            </span>
            <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-slate-100">
              {summary.rows.length}
            </p>
          </div>
          {mode === 'paper' && (
            <button
              type="button"
              onClick={store.resetPaperAccount}
              className="self-start text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                {isAr
                  ? 'تصفير وإعادة شحن $100,000'
                  : 'Reset Paper Account ($100k)'}
              </span>
            </button>
          )}
        </div>
      </section>

      {/* Add New Position Form */}
      <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {mode === 'paper'
            ? isAr
              ? 'تنفيذ صفقة شراء تجريبية من أي بورصة'
              : 'Execute Paper Buy Order'
            : isAr
              ? 'إضافة سهم أو ذهب لمحفظتك الحقيقية'
              : 'Log Real Holding'}
        </h3>
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
        >
          <div className="sm:col-span-5 flex flex-col gap-1">
            <label className="text-[11px] text-slate-500 dark:text-slate-400">
              {isAr ? 'السهم / الأصل' : 'Instrument'}
            </label>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs font-semibold text-slate-900 dark:text-slate-100"
            >
              {store.assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.symbol} — {isAr ? a.nameAr : a.nameEn} ({a.price}{' '}
                  {a.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 flex flex-col gap-1">
            <label className="text-[11px] text-slate-500 dark:text-slate-400">
              {isAr ? 'الكمية' : 'Quantity'}
            </label>
            <input
              type="number"
              step="any"
              min="0.001"
              required
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              placeholder={isAr ? 'مثلاً: 50' : 'e.g. 50'}
              className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono tabular-nums text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="sm:col-span-3 flex flex-col gap-1">
            <label className="text-[11px] text-slate-500 dark:text-slate-400">
              {isAr
                ? `سعر الشراء (${selectedAsset?.currency ?? ''}) — اتركه فاضي للسعر الحالي`
                : `Buy Price (${selectedAsset?.currency ?? ''})`}
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder={
                selectedAsset ? String(selectedAsset.price) : ''
              }
              className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] font-mono tabular-nums text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full h-10 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'إضافة' : 'Add'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Holdings Table */}
      <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {isAr ? 'مكونات المحفظة' : 'Positions Breakdown'}
        </h3>

        {summary.rows.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? 'مفيش أسهم مضافة هنا لسه — أضف أول سهم من النموذج فوق.'
              : 'No positions yet — add your first instrument above.'}
          </p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full border-collapse min-w-[680px] text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 text-start">{isAr ? 'الأصل' : 'Asset'}</th>
                  <th className="py-2.5 text-end">{isAr ? 'الكمية' : 'Qty'}</th>
                  <th className="py-2.5 text-end">{isAr ? 'متوسط الشراء' : 'Avg Cost'}</th>
                  <th className="py-2.5 text-end">{isAr ? 'السعر الحالي' : 'Market'}</th>
                  <th className="py-2.5 text-end">
                    {isAr
                      ? `القيمة (${store.displayCurrency})`
                      : `Value (${store.displayCurrency})`}
                  </th>
                  <th className="py-2.5 text-end">{isAr ? 'الربح / الخسارة' : 'P&L'}</th>
                  <th className="py-2.5 text-end w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono tabular-nums">
                {summary.rows.map(({ holding, asset, valDisplay, pnl, pnlPct }) => {
                  const up = pnl >= 0;
                  return (
                    <tr
                      key={holding.id}
                      onClick={() => onSelectAsset(asset)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                    >
                      <td className="py-3 font-sans">
                        <p className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {asset.symbol}{' '}
                          <span className="font-normal text-[11px] text-slate-500">
                            · {asset.exchange}
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                          {isAr ? asset.nameAr : asset.nameEn}
                        </p>
                      </td>
                      <td className="py-3 text-end font-semibold text-slate-800 dark:text-slate-200">
                        {holding.quantity}
                      </td>
                      <td className="py-3 text-end text-slate-600 dark:text-slate-400">
                        {holding.avgPrice} {asset.currency}
                      </td>
                      <td className="py-3 text-end font-bold text-slate-900 dark:text-slate-100">
                        {asset.price} {asset.currency}
                      </td>
                      <td className="py-3 text-end font-bold text-slate-900 dark:text-slate-100">
                        {valDisplay.toLocaleString('en-US', {
                          maximumFractionDigits: 1,
                        })}
                      </td>
                      <td
                        className={`py-3 text-end font-bold ${
                          up
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {up ? '+' : ''}
                        {pnl.toLocaleString('en-US', {
                          maximumFractionDigits: 1,
                        })}{' '}
                        ({up ? '+' : ''}
                        {pnlPct.toFixed(1)}%)
                      </td>
                      <td
                        className="py-3 text-end"
                        onClick={(e) => {
                          e.stopPropagation();
                          store.removeHolding(mode, holding.id);
                        }}
                      >
                        <button
                          type="button"
                          className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                          title={isAr ? 'بيع / حذف' : 'Close / Remove'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
