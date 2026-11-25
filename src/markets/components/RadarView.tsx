import React, { useMemo, useState } from 'react';
import { Flame, Gauge, Swords } from 'lucide-react';
import { SECTOR_LABELS } from '../marketData';
import { MarketAsset, SectorId } from '../types';
import { MarketStore } from '../useMarketStore';

interface Props {
  store: MarketStore;
  onSelectAsset: (asset: MarketAsset) => void;
  onFilterBySector: (sector: SectorId) => void;
}

export const RadarView: React.FC<Props> = ({
  store,
  onSelectAsset,
  onFilterBySector,
}) => {
  const isAr = store.locale === 'ar';
  const [battleAId, setBattleAId] = useState<string>('us_nvda');
  const [battleBId, setBattleBId] = useState<string>('egx_comi');

  // Whale Volume Spike Radar: assets trading >= 1.8x their daily average volume
  const whaleSpikes = useMemo(() => {
    return [...store.assets]
      .map((a) => ({
        asset: a,
        ratio: a.volume / Math.max(1, a.avgVolume),
      }))
      .filter((x) => x.ratio >= 1.5)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 6);
  }, [store.assets]);

  // Sector Heatmap Aggregation
  const sectorHeat = useMemo(() => {
    const map = new Map<SectorId, { sumPct: number; count: number; topSymbol: string }>();
    for (const a of store.assets) {
      const cur = map.get(a.sector) ?? { sumPct: 0, count: 0, topSymbol: a.symbol };
      cur.sumPct += a.changePct;
      cur.count += 1;
      map.set(a.sector, cur);
    }
    return Array.from(map.entries()).map(([sector, data]) => ({
      sector,
      avgPct: Number((data.sumPct / Math.max(1, data.count)).toFixed(2)),
      count: data.count,
      topSymbol: data.topSymbol,
    }));
  }, [store.assets]);

  const assetA = store.assets.find((a) => a.id === battleAId) ?? store.assets[0];
  const assetB = store.assets.find((a) => a.id === battleBId) ?? store.assets[1];

  // Fear & Greed text label
  const fgScore = store.fearGreedScore;
  const fgLabel =
    fgScore >= 75
      ? isAr
        ? 'طمع شديد — احذر جني الأرباح'
        : 'Extreme Greed'
      : fgScore >= 55
        ? isAr
          ? 'طمع وتفاؤل شرائي'
          : 'Greed / Bullish'
        : fgScore >= 45
          ? isAr
            ? 'سوق متوازن (محايد)'
            : 'Neutral'
          : fgScore >= 25
            ? isAr
              ? 'خوف وحذر — فرص تجميع'
              : 'Fear'
            : isAr
              ? 'خوف شديد — فرص تاريخية'
              : 'Extreme Fear';

  // Gauge needle angle (-90deg to +90deg)
  const needleAngle = -90 + (fgScore / 100) * 180;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Split: Fear & Greed Gauge + Interactive Sector Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Fear & Greed Gauge */}
        <section className="lg:col-span-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {isAr
                ? 'مؤشر الخوف والطمع العالمي'
                : 'Global Fear & Greed Index'}
            </h2>
          </div>

          <div className="flex flex-col items-center justify-center py-2">
            <svg viewBox="0 0 220 125" className="w-56 h-32 overflow-visible">
              {/* Background arc segments */}
              <path
                d="M 20 110 A 90 90 0 0 1 65 32"
                fill="none"
                stroke="#EF4444"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <path
                d="M 70 29 A 90 90 0 0 1 150 29"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="14"
              />
              <path
                d="M 155 32 A 90 90 0 0 1 200 110"
                fill="none"
                stroke="#10B981"
                strokeWidth="14"
                strokeLinecap="round"
              />
              {/* Needle */}
              <g transform={`translate(110, 110) rotate(${needleAngle})`}>
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="-72"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="text-slate-900 dark:text-slate-100"
                />
                <circle
                  cx="0"
                  cy="0"
                  r="6"
                  fill="currentColor"
                  className="text-slate-900 dark:text-slate-100"
                />
              </g>
            </svg>
            <p className="font-mono tabular-nums text-3xl font-bold text-slate-900 dark:text-slate-100 -mt-1">
              {fgScore}
              <span className="text-sm font-normal text-slate-400"> / 100</span>
            </p>
            <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 mt-1">
              {fgLabel}
            </p>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {isAr
              ? 'يتحسب تلقائياً من اتساع الصعود في كل البورصات العالمية ومتوسط مؤشر القوة النسبية (RSI).'
              : 'Computed dynamically from global market breadth and average RSI momentum.'}
          </p>
        </section>

        {/* Interactive Sector Heatmap */}
        <section className="lg:col-span-7 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {isAr
                  ? 'الخريطة الحرارية للقطاعات (اضغط لعرض أسهم القطاع)'
                  : 'Live Sector Heatmap (Tap to Filter)'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'أخضر = سيولة شرائية قوية · أحمر = ضغط بيعي'
                  : 'Green = buying inflow · Red = selling pressure'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1">
            {sectorHeat.map((item) => {
              const strongUp = item.avgPct >= 1.5;
              const up = item.avgPct >= 0;
              const bg = strongUp
                ? 'bg-emerald-600 text-white border-emerald-500'
                : up
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900'
                  : 'bg-red-50 dark:bg-red-950/50 text-red-900 dark:text-red-200 border-red-200 dark:border-red-900';

              return (
                <button
                  key={item.sector}
                  type="button"
                  onClick={() => onFilterBySector(item.sector)}
                  className={`rounded-xl border p-3.5 text-start flex flex-col justify-between gap-2 transition-transform hover:-translate-y-0.5 ${bg}`}
                >
                  <span className="text-xs font-bold leading-snug">
                    {isAr
                      ? SECTOR_LABELS[item.sector].ar
                      : SECTOR_LABELS[item.sector].en}
                  </span>
                  <div className="flex items-end justify-between gap-1">
                    <span className="font-mono tabular-nums text-base font-bold">
                      {up ? '+' : ''}
                      {item.avgPct}%
                    </span>
                    <span className="text-[11px] opacity-80 font-mono">
                      {item.count} {isAr ? 'أصل' : 'assets'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Whale Volume Spike Radar */}
      <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {isAr
                ? 'رادار الحيتان والسيولة المفاجئة (Volume Spike Radar)'
                : 'Whale Volume Spike Radar'}
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? 'أسهم دخلت عليها سيولة أعلى من 1.5x متوسط التداول اليومي'
              : 'Assets trading above 1.5x normal daily volume'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {whaleSpikes.map(({ asset, ratio }) => {
            const up = asset.changePct >= 0;
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => onSelectAsset(asset)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B1120] p-3.5 text-start hover:border-teal-500 transition-colors flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                      {asset.symbol}{' '}
                      <span className="text-[11px] font-normal text-slate-500">
                        · {asset.exchange}
                      </span>
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      {isAr ? asset.nameAr : asset.nameEn}
                    </p>
                  </div>
                  <span className="font-mono tabular-nums text-xs font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                    {ratio.toFixed(1)}x {isAr ? 'سيولة' : 'Vol'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-slate-800 text-xs font-mono tabular-nums">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {asset.price} {asset.currency}
                  </span>
                  <span
                    className={
                      up
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                        : 'text-red-600 dark:text-red-400 font-semibold'
                    }
                  >
                    {up ? '+' : ''}
                    {asset.changePct.toFixed(2)}%
                  </span>
                  <span className="text-slate-500">RSI {asset.rsi14}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Side-by-Side Stock Battle Comparator */}
      <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {isAr
              ? 'مقارنة سهمين وجهاً لوجه (Stock Battle)'
              : 'Side-by-Side Stock Battle'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={battleAId}
            onChange={(e) => setBattleAId(e.target.value)}
            className="h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs font-semibold text-slate-900 dark:text-slate-100"
          >
            {store.assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.symbol} — {isAr ? a.nameAr : a.nameEn} ({a.exchange})
              </option>
            ))}
          </select>

          <select
            value={battleBId}
            onChange={(e) => setBattleBId(e.target.value)}
            className="h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs font-semibold text-slate-900 dark:text-slate-100"
          >
            {store.assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.symbol} — {isAr ? a.nameAr : a.nameEn} ({a.exchange})
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 text-start">{isAr ? 'المعيار' : 'Metric'}</th>
                <th className="py-2.5 text-end font-mono font-bold text-slate-900 dark:text-slate-100">
                  {assetA.symbol}
                </th>
                <th className="py-2.5 text-end font-mono font-bold text-slate-900 dark:text-slate-100">
                  {assetB.symbol}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono tabular-nums">
              <tr>
                <td className="py-2.5 font-sans text-slate-600 dark:text-slate-400">
                  {isAr ? 'السعر الحالي' : 'Current Price'}
                </td>
                <td className="py-2.5 text-end font-bold">
                  {assetA.price} {assetA.currency}
                </td>
                <td className="py-2.5 text-end font-bold">
                  {assetB.price} {assetB.currency}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-sans text-slate-600 dark:text-slate-400">
                  {isAr ? 'الأداء اليومي' : 'Daily Change'}
                </td>
                <td
                  className={`py-2.5 text-end font-bold ${
                    assetA.changePct >= assetB.changePct
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {assetA.changePct >= 0 ? '+' : ''}
                  {assetA.changePct.toFixed(2)}%
                </td>
                <td
                  className={`py-2.5 text-end font-bold ${
                    assetB.changePct > assetA.changePct
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {assetB.changePct >= 0 ? '+' : ''}
                  {assetB.changePct.toFixed(2)}%
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-sans text-slate-600 dark:text-slate-400">
                  {isAr ? 'مكرر الربحية (P/E — الأقل أفضل)' : 'P/E Ratio (Lower = Cheaper)'}
                </td>
                <td className="py-2.5 text-end">
                  {assetA.peRatio ? `${assetA.peRatio}x` : '—'}
                </td>
                <td className="py-2.5 text-end">
                  {assetB.peRatio ? `${assetB.peRatio}x` : '—'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-sans text-slate-600 dark:text-slate-400">
                  {isAr ? 'عائد التوزيعات النقدية' : 'Dividend Yield'}
                </td>
                <td
                  className={`py-2.5 text-end font-bold ${
                    assetA.dividendYieldPct >= assetB.dividendYieldPct &&
                    assetA.dividendYieldPct > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : ''
                  }`}
                >
                  {assetA.dividendYieldPct.toFixed(2)}%
                </td>
                <td
                  className={`py-2.5 text-end font-bold ${
                    assetB.dividendYieldPct > assetA.dividendYieldPct
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : ''
                  }`}
                >
                  {assetB.dividendYieldPct.toFixed(2)}%
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-sans text-slate-600 dark:text-slate-400">
                  {isAr ? 'الزخم (RSI 14)' : 'Momentum (RSI 14)'}
                </td>
                <td className="py-2.5 text-end">{assetA.rsi14}</td>
                <td className="py-2.5 text-end">{assetB.rsi14}</td>
              </tr>
              <tr>
                <td className="py-2.5 font-sans text-slate-600 dark:text-slate-400">
                  {isAr ? 'التوافق الشرعي' : 'Shariah Compliant'}
                </td>
                <td className="py-2.5 text-end font-sans">
                  {assetA.isShariahCompliant
                    ? isAr
                      ? 'نعم (متوافق)'
                      : 'Yes'
                    : isAr
                      ? 'غير متوافق'
                      : 'No'}
                </td>
                <td className="py-2.5 text-end font-sans">
                  {assetB.isShariahCompliant
                    ? isAr
                      ? 'نعم (متوافق)'
                      : 'Yes'
                    : isAr
                      ? 'غير متوافق'
                      : 'No'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
