import React, { useMemo, useState } from 'react';
import { BellPlus, Briefcase, ShieldCheck, Star, X } from 'lucide-react';
import { MarketAsset } from '../types';
import { MarketStore } from '../useMarketStore';
import { DetailedAssetChart } from './SparklineChart';

interface Props {
  asset: MarketAsset;
  store: MarketStore;
  onClose: () => void;
}

export const AssetDetailModal: React.FC<Props> = ({ asset, store, onClose }) => {
  const isAr = store.locale === 'ar';
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '1Y'>('1M');
  const [buyMode, setBuyMode] = useState<'real' | 'paper'>('paper');
  const [qty, setQty] = useState<string>('10');
  const [alertTarget, setAlertTarget] = useState<string>(
    String(Number((asset.price * 1.03).toFixed(2)))
  );

  const up = asset.changePct >= 0;
  const starred = store.watchlist.includes(asset.id);

  // Derive realistic timeframe series from asset history
  const chartData = useMemo(() => {
    const base = asset.history;
    if (timeframe === '1D') return base;
    if (timeframe === '1W')
      return base.map((v, i) => Number((v * (0.985 + i * 0.0018)).toFixed(2)));
    if (timeframe === '1M')
      return base.map((v, i) => Number((v * (0.94 + i * 0.0068)).toFixed(2)));
    return base.map((v, i) => Number((v * (0.82 + i * 0.02)).toFixed(2)));
  }, [asset.history, timeframe]);

  const rsiText =
    asset.rsi14 >= 70
      ? isAr
        ? 'تشبع شرائي (حذر)'
        : 'Overbought'
      : asset.rsi14 <= 30
        ? isAr
          ? 'تشبع بيعي (فرصة ارتداد)'
          : 'Oversold'
        : isAr
          ? 'نطاق صحي متوازن'
          : 'Healthy Momentum';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                {asset.symbol}
              </span>
              <span>·</span>
              <span>{asset.exchange}</span>
              {asset.isShariahCompliant && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {isAr ? 'متوافق شرعياً' : 'Shariah Compliant'}
                  </span>
                </>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {isAr ? asset.nameAr : asset.nameEn}
            </h2>
            <div className="flex items-baseline gap-2.5 mt-1 font-mono tabular-nums">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {asset.price.toLocaleString('en-US', {
                  maximumFractionDigits: asset.price < 10 ? 3 : 2,
                })}{' '}
                <span className="text-xs font-normal text-slate-500">
                  {asset.currency}
                </span>
              </span>
              <span
                className={`text-sm font-bold ${
                  up
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {up ? '+' : ''}
                {asset.changePct.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => store.toggleWatchlist(asset.id)}
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800"
              aria-label="Toggle watchlist"
            >
              <Star
                className={`w-4 h-4 ${
                  starred ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                }`}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Timeframe Controls + Price Chart with Support & Resistance */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              {(['1D', '1W', '1M', '1Y'] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-colors ${
                    timeframe === tf
                      ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              H: {asset.high24h} · L: {asset.low24h}
            </span>
          </div>

          <DetailedAssetChart
            data={chartData}
            support={asset.support}
            resistance={asset.resistance}
            positive={up}
            supportLabel={isAr ? 'دعم' : 'Support'}
            resistanceLabel={isAr ? 'مقاومة' : 'Resistance'}
          />
        </div>

        {/* Technical Analysis Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-500 dark:text-slate-400">RSI (14)</span>
            <span className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-slate-100">
              {asset.rsi14}
            </span>
            <span className="text-[11px] text-teal-700 dark:text-teal-400">
              {rsiText}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-500 dark:text-slate-400">MACD</span>
            <span
              className={`font-mono tabular-nums text-sm font-bold ${
                asset.macdValue >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {asset.macdValue >= 0 ? '+' : ''}
              {asset.macdValue}
            </span>
            <span className="text-[11px] text-slate-500">
              {asset.macdValue >= 0
                ? isAr
                  ? 'تقاطع إيجابي'
                  : 'Bullish Cross'
                : isAr
                  ? 'زخم هابط'
                  : 'Bearish Cross'}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-500 dark:text-slate-400">
              {isAr ? 'مكرر الربحية P/E' : 'P/E Ratio'}
            </span>
            <span className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-slate-100">
              {asset.peRatio ? `${asset.peRatio}x` : '—'}
            </span>
            <span className="text-[11px] text-slate-500">
              {isAr ? 'التوزيع:' : 'Div:'} {asset.dividendYieldPct}%
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-500 dark:text-slate-400">
              {isAr ? 'الدعم / المقاومة' : 'Support / Res.'}
            </span>
            <span className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-slate-100">
              {asset.support} / {asset.resistance}
            </span>
            <span className="text-[11px] text-slate-500">{asset.currency}</span>
          </div>
        </div>

        {/* Quick Actions: Add to Real/Paper Portfolio & Quick Price Alert */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Quick Buy */}
          <div className="rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                <Briefcase className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                {isAr ? 'شراء وإضافة للمحفظة' : 'Quick Buy'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setBuyMode('paper')}
                  className={`px-2 py-0.5 rounded text-[11px] ${
                    buyMode === 'paper'
                      ? 'bg-teal-600 text-white'
                      : 'text-slate-500'
                  }`}
                >
                  {isAr ? 'تجريبي' : 'Paper'}
                </button>
                <button
                  type="button"
                  onClick={() => setBuyMode('real')}
                  className={`px-2 py-0.5 rounded text-[11px] ${
                    buyMode === 'real'
                      ? 'bg-teal-600 text-white'
                      : 'text-slate-500'
                  }`}
                >
                  {isAr ? 'حقيقي' : 'Real'}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.01"
                step="any"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder={isAr ? 'الكمية' : 'Qty'}
                className="w-24 h-10 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] font-mono tabular-nums text-xs text-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => {
                  store.addHolding(buyMode, asset.id, Number(qty) || 0, asset.price);
                  onClose();
                }}
                className="flex-1 h-10 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                {isAr ? 'تنفيذ الشراء الآن' : 'Execute Buy'}
              </button>
            </div>
          </div>

          {/* Quick Alert */}
          <div className="rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col gap-2.5">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
              <BellPlus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              {isAr ? 'تنبيه سعري سريع' : 'Quick Price Alert'}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                value={alertTarget}
                onChange={(e) => setAlertTarget(e.target.value)}
                className="w-28 h-10 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] font-mono tabular-nums text-xs text-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => {
                  const target = Number(alertTarget);
                  if (target > 0) {
                    store.addAlert(
                      asset.id,
                      target >= asset.price ? 'above' : 'below',
                      target
                    );
                  }
                }}
                className="flex-1 h-10 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold transition-colors whitespace-nowrap"
              >
                {isAr ? 'ضبط التنبيه' : 'Set Alert'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
