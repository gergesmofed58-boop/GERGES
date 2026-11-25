import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
} from 'lucide-react';
import {
  convertToDisplayCurrency,
  evaluateExchangeStatus,
  WORLD_EXCHANGE_CLOCKS,
} from '../marketData';
import { ExchangeRegion, MarketAsset, SectorId } from '../types';
import { MarketStore } from '../useMarketStore';
import { SparklineChart } from './SparklineChart';

interface Props {
  store: MarketStore;
  onSelectAsset: (asset: MarketAsset) => void;
  initialSectorFilter?: SectorId | null;
  onClearSectorFilter?: () => void;
}

export const MarketsView: React.FC<Props> = ({
  store,
  onSelectAsset,
  initialSectorFilter,
  onClearSectorFilter,
}) => {
  const isAr = store.locale === 'ar';
  const [region, setRegion] = useState<ExchangeRegion>('all');
  const [search, setSearch] = useState('');
  const [onlyShariah, setOnlyShariah] = useState(false);
  const [onlyDividends, setOnlyDividends] = useState(false);
  const [onlyWatchlist, setOnlyWatchlist] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const regionTabs: { id: ExchangeRegion; label: string }[] = [
    { id: 'all', label: isAr ? 'كل الأسواق' : 'All Markets' },
    { id: 'EGX', label: isAr ? 'مصر (EGX)' : 'Egypt (EGX)' },
    { id: 'US', label: isAr ? 'أمريكا (US)' : 'US Stocks' },
    { id: 'MENA', label: isAr ? 'السعودية والإمارات' : 'Saudi & UAE' },
    { id: 'EU_ASIA', label: isAr ? 'أوروبا وآسيا' : 'Europe & Asia' },
    { id: 'COMMODITIES', label: isAr ? 'الذهب والسلع' : 'Gold & Oil' },
    { id: 'FOREX', label: isAr ? 'العملات' : 'Forex' },
    { id: 'CRYPTO', label: isAr ? 'الكريبتو' : 'Crypto' },
  ];

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return store.assets.filter((a) => {
      if (region !== 'all' && a.region !== region) return false;
      if (initialSectorFilter && a.sector !== initialSectorFilter) return false;
      if (onlyShariah && !a.isShariahCompliant) return false;
      if (onlyDividends && a.dividendYieldPct < 2) return false;
      if (onlyWatchlist && !store.watchlist.includes(a.id)) return false;
      if (!q) return true;
      return (
        a.symbol.toLowerCase().includes(q) ||
        a.nameAr.toLowerCase().includes(q) ||
        a.nameEn.toLowerCase().includes(q) ||
        a.exchange.toLowerCase().includes(q)
      );
    });
  }, [
    store.assets,
    region,
    initialSectorFilter,
    onlyShariah,
    onlyDividends,
    onlyWatchlist,
    store.watchlist,
    search,
  ]);

  const signalLabel = (sig: MarketAsset['signal']) => {
    if (isAr) {
      if (sig === 'strong_buy') return 'شراء قوي';
      if (sig === 'buy') return 'شراء';
      if (sig === 'sell') return 'بيع';
      if (sig === 'strong_sell') return 'بيع قوي';
      return 'محايد';
    }
    if (sig === 'strong_buy') return 'Strong Buy';
    if (sig === 'buy') return 'Buy';
    if (sig === 'sell') return 'Sell';
    if (sig === 'strong_sell') return 'Strong Sell';
    return 'Neutral';
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Global Indices Strip */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {store.indices.map((idx) => {
          const up = idx.changePct >= 0;
          return (
            <div
              key={idx.id}
              className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col gap-1"
            >
              <div className="flex items-center justify-between gap-1 text-xs">
                <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                  {idx.symbol}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {idx.region}
                </span>
              </div>
              <p className="font-mono tabular-nums text-base font-bold text-slate-900 dark:text-slate-100">
                {idx.value.toLocaleString('en-US', { maximumFractionDigits: 1 })}
              </p>
              <div
                className={`flex items-center gap-0.5 text-xs font-mono tabular-nums font-semibold ${
                  up
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {up ? (
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>
                  {up ? '+' : ''}
                  {idx.changePct.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Two-column strip: World Market Clocks + Egyptian Gold Live Board */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        {/* Live World Market Clocks */}
        <section className="xl:col-span-7 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {isAr
                  ? 'مواعيد فتح وإغلاق البورصات العالمية الآن'
                  : 'Live World Exchange Market Clocks'}
              </h2>
            </div>
            <button
              type="button"
              onClick={store.syncLiveQuotes}
              disabled={store.isSyncingLive}
              className="min-h-[34px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${store.isSyncingLive ? 'animate-spin' : ''}`}
              />
              <span>{isAr ? 'تحديث الأسعار' : 'Sync Live'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {WORLD_EXCHANGE_CLOCKS.map((clk) => {
              const st = evaluateExchangeStatus(clk, now);
              return (
                <div
                  key={clk.id}
                  className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B1120] border border-slate-200/70 dark:border-slate-800 flex flex-col gap-1"
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {isAr ? clk.nameAr : clk.nameEn}
                  </span>
                  <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
                    {st.localTime}
                  </span>
                  <span
                    className={`text-[11px] font-semibold ${
                      st.isOpen
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {st.isOpen
                      ? isAr
                        ? `مفتوحة · باقي ${st.remainingHours}س ${st.remainingMins}د`
                        : `Open · ${st.remainingHours}h ${st.remainingMins}m`
                      : st.opensTodaySoon
                        ? isAr
                          ? `تفتح خلال ${st.remainingHours}س ${st.remainingMins}د`
                          : `Opens in ${st.remainingHours}h ${st.remainingMins}m`
                        : isAr
                          ? 'مغلقة حالياً'
                          : 'Closed'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Egyptian Gold Live Karats Board */}
        <section className="xl:col-span-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {isAr
                  ? 'الذهب في مصر والعالم (حساب مباشر)'
                  : 'Live Gold Karats (Egypt & Global)'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                XAU: ${store.egyptGoldKarats.goldOunceUsd.toFixed(1)} · USD/EGP:{' '}
                {store.fxRates.USD_EGP.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {isAr ? 'عيار 24' : '24K'}
              </span>
              <span className="font-mono tabular-nums text-sm font-bold text-amber-600 dark:text-amber-400">
                {store.egyptGoldKarats.gram24Egp.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">EGP</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {isAr ? 'عيار 21' : '21K'}
              </span>
              <span className="font-mono tabular-nums text-sm font-bold text-amber-600 dark:text-amber-400">
                {store.egyptGoldKarats.gram21Egp.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">EGP</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {isAr ? 'عيار 18' : '18K'}
              </span>
              <span className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-slate-100">
                {store.egyptGoldKarats.gram18Egp.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">EGP</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {isAr ? 'الجنيه الذهب' : 'Gold Pound'}
              </span>
              <span className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-slate-100">
                {store.egyptGoldKarats.goldPoundEgp.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">EGP</span>
            </div>
          </div>
        </section>
      </div>

      {/* Filters & Search Bar */}
      <section className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3.5">
        {/* Region Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {regionTabs.map((tab) => {
            const active = region === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRegion(tab.id)}
                className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search + Smart Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isAr
                  ? 'ابحث بالرمز أو اسم الشركة (مثال: NVDA, COMI, أرامكو, ذهب)...'
                  : 'Search symbol, company, or exchange...'
              }
              className="w-full h-10 ps-9 pe-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyShariah((v) => !v)}
              className={`min-h-[38px] px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                onlyShariah
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isAr ? 'أسهم متوافقة شرعياً' : 'Shariah Compliant'}</span>
            </button>

            <button
              type="button"
              onClick={() => setOnlyDividends((v) => !v)}
              className={`min-h-[38px] px-3 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                onlyDividends
                  ? 'bg-teal-600 border-teal-600 text-white'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {isAr ? 'توزيعات أرباح +2%' : 'Dividends 2%+'}
            </button>

            <button
              type="button"
              onClick={() => setOnlyWatchlist((v) => !v)}
              className={`min-h-[38px] px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                onlyWatchlist
                  ? 'bg-amber-600 border-amber-600 text-white'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>{isAr ? 'المفضلة' : 'Watchlist'}</span>
            </button>

            {initialSectorFilter && onClearSectorFilter && (
              <button
                type="button"
                onClick={onClearSectorFilter}
                className="min-h-[38px] px-3 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold whitespace-nowrap shrink-0"
              >
                {isAr ? 'إلغاء فلتر القطاع' : 'Clear Sector'}
              </button>
            )}
          </div>
        </div>

        {/* High-Density Market Grid Table */}
        <div className="overflow-x-auto -mx-4 px-4">
          {filteredAssets.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              {isAr
                ? 'مفيش أسهم مطابقة للفلتر ده — جرّب تغيّر البحث أو البورصة.'
                : 'No instruments match the selected filters.'}
            </div>
          ) : (
            <table className="w-full border-collapse min-w-[740px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 text-start w-8"></th>
                  <th className="py-2.5 text-start">
                    {isAr ? 'الأصل / البورصة' : 'Asset / Exchange'}
                  </th>
                  <th className="py-2.5 text-end">
                    {isAr ? 'السعر الحالي' : 'Price'}
                  </th>
                  <th className="py-2.5 text-end">
                    {isAr
                      ? `المعادل (${store.displayCurrency})`
                      : `In ${store.displayCurrency}`}
                  </th>
                  <th className="py-2.5 text-end">
                    {isAr ? 'التغير اليومي' : '24h %'}
                  </th>
                  <th className="py-2.5 text-center">
                    {isAr ? 'الحركة' : 'Trend'}
                  </th>
                  <th className="py-2.5 text-end">
                    {isAr ? 'السيولة / RSI' : 'Vol / RSI'}
                  </th>
                  <th className="py-2.5 text-end">
                    {isAr ? 'القراءة الفنية' : 'Signal'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {filteredAssets.map((asset) => {
                  const up = asset.changePct >= 0;
                  const starred = store.watchlist.includes(asset.id);
                  const volRatio = asset.volume / Math.max(1, asset.avgVolume);
                  const converted = convertToDisplayCurrency(
                    asset.price,
                    asset.currency,
                    store.displayCurrency,
                    store.fxRates
                  );

                  return (
                    <tr
                      key={asset.id}
                      onClick={() => onSelectAsset(asset)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td
                        className="py-3 pe-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          store.toggleWatchlist(asset.id);
                        }}
                      >
                        <button
                          type="button"
                          aria-label="Watchlist toggle"
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              starred
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-400'
                            }`}
                          />
                        </button>
                      </td>

                      <td className="py-3 pe-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                              {asset.symbol}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {asset.exchange}
                            </span>
                            {asset.isShariahCompliant && (
                              <>
                                <span className="text-slate-400">·</span>
                                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                                  {isAr ? 'شرعي' : 'Halal'}
                                </span>
                              </>
                            )}
                          </div>
                          <span className="text-slate-600 dark:text-slate-300 truncate max-w-[230px]">
                            {isAr ? asset.nameAr : asset.nameEn}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-2 text-end font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {asset.price.toLocaleString('en-US', {
                          maximumFractionDigits: asset.price < 10 ? 3 : 2,
                        })}{' '}
                        <span className="text-[10px] font-normal text-slate-500">
                          {asset.currency}
                        </span>
                      </td>

                      <td className="py-3 px-2 text-end font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {converted.toLocaleString('en-US', {
                          maximumFractionDigits: converted < 10 ? 2 : 1,
                        })}
                      </td>

                      <td className="py-3 px-2 text-end font-mono tabular-nums font-bold whitespace-nowrap">
                        <span
                          className={
                            up
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }
                        >
                          {up ? '+' : ''}
                          {asset.changePct.toFixed(2)}%
                        </span>
                      </td>

                      <td className="py-3 px-2">
                        <div className="flex justify-center">
                          <SparklineChart
                            data={asset.history}
                            positive={up}
                          />
                        </div>
                      </td>

                      <td className="py-3 px-2 text-end font-mono tabular-nums whitespace-nowrap">
                        <div className="flex flex-col items-end">
                          <span
                            className={
                              volRatio >= 2
                                ? 'text-amber-600 dark:text-amber-400 font-bold'
                                : 'text-slate-600 dark:text-slate-300'
                            }
                          >
                            {volRatio.toFixed(1)}x Vol
                          </span>
                          <span className="text-[11px] text-slate-500">
                            RSI {asset.rsi14}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 ps-2 text-end whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            asset.signal === 'strong_buy' || asset.signal === 'buy'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : asset.signal === 'sell' || asset.signal === 'strong_sell'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {signalLabel(asset.signal)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};
