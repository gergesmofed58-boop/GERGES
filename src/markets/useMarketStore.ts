import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  convertToDisplayCurrency,
  DEFAULT_FX_RATES,
  INITIAL_ASSETS,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_GLOBAL_INDICES,
} from './marketData';
import {
  DisplayCurrency,
  FxRates,
  GlobalIndex,
  Holding,
  JournalEntry,
  MarketAsset,
  MarketLocale,
  MarketTheme,
  PriceAlert,
} from './types';

const STORAGE_KEY = 'marketpulse_global_v1';

interface PersistedState {
  locale: MarketLocale;
  theme: MarketTheme;
  displayCurrency: DisplayCurrency;
  watchlist: string[];
  realHoldings: Holding[];
  paperHoldings: Holding[];
  paperCashUsd: number;
  alerts: PriceAlert[];
  journal: JournalEntry[];
  pinEnabled: boolean;
  pinCode: string;
  cachedAssets?: MarketAsset[];
  cachedFx?: FxRates;
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      return {
        locale: parsed.locale ?? 'ar',
        theme: parsed.theme ?? 'dark',
        displayCurrency: parsed.displayCurrency ?? 'EGP',
        watchlist: parsed.watchlist ?? ['egx_comi', 'us_nvda', 'cmd_gold', 'sa_aramco', 'cry_btc'],
        realHoldings: parsed.realHoldings ?? [
          { id: 'rh_1', assetId: 'egx_comi', quantity: 120, avgPrice: 77.5, addedAt: '2026-10-12' },
          { id: 'rh_2', assetId: 'us_nvda', quantity: 5, avgPrice: 132.0, addedAt: '2026-10-28' },
          { id: 'rh_3', assetId: 'cmd_gold', quantity: 0.5, avgPrice: 2560, addedAt: '2026-11-02' },
        ],
        paperHoldings: parsed.paperHoldings ?? [
          { id: 'ph_1', assetId: 'us_aapl', quantity: 25, avgPrice: 224.0, addedAt: '2026-11-01' },
          { id: 'ph_2', assetId: 'egx_tmgh', quantity: 400, avgPrice: 54.5, addedAt: '2026-11-08' },
        ],
        paperCashUsd: parsed.paperCashUsd ?? 89200,
        alerts: parsed.alerts ?? [
          { id: 'al_1', assetId: 'cmd_gold', condition: 'above', targetValue: 2700, triggered: false, createdAt: '2026-11-18' },
          { id: 'al_2', assetId: 'egx_comi', condition: 'above', targetValue: 85, triggered: false, createdAt: '2026-11-19' },
        ],
        journal: parsed.journal ?? [
          {
            id: 'j_1',
            assetSymbol: 'TMGH',
            side: 'buy',
            entryPrice: 55.2,
            targetPrice: 64.0,
            stopLoss: 52.0,
            reason: 'اختراق مقاومة مع دخول سيولة مؤسساتية عالية (3 أضعاف المتوسط)',
            outcome: 'open',
            date: '2026-11-16',
          },
        ],
        pinEnabled: parsed.pinEnabled ?? false,
        pinCode: parsed.pinCode ?? '1234',
        cachedAssets: parsed.cachedAssets,
        cachedFx: parsed.cachedFx,
      };
    }
  } catch {
    // fallback to defaults
  }
  return {
    locale: 'ar',
    theme: 'dark',
    displayCurrency: 'EGP',
    watchlist: ['egx_comi', 'us_nvda', 'cmd_gold', 'sa_aramco', 'cry_btc'],
    realHoldings: [
      { id: 'rh_1', assetId: 'egx_comi', quantity: 120, avgPrice: 77.5, addedAt: '2026-10-12' },
      { id: 'rh_2', assetId: 'us_nvda', quantity: 5, avgPrice: 132.0, addedAt: '2026-10-28' },
      { id: 'rh_3', assetId: 'cmd_gold', quantity: 0.5, avgPrice: 2560, addedAt: '2026-11-02' },
    ],
    paperHoldings: [
      { id: 'ph_1', assetId: 'us_aapl', quantity: 25, avgPrice: 224.0, addedAt: '2026-11-01' },
      { id: 'ph_2', assetId: 'egx_tmgh', quantity: 400, avgPrice: 54.5, addedAt: '2026-11-08' },
    ],
    paperCashUsd: 89200,
    alerts: [
      { id: 'al_1', assetId: 'cmd_gold', condition: 'above', targetValue: 2700, triggered: false, createdAt: '2026-11-18' },
      { id: 'al_2', assetId: 'egx_comi', condition: 'above', targetValue: 85, triggered: false, createdAt: '2026-11-19' },
    ],
    journal: [
      {
        id: 'j_1',
        assetSymbol: 'TMGH',
        side: 'buy',
        entryPrice: 55.2,
        targetPrice: 64.0,
        stopLoss: 52.0,
        reason: 'اختراق مقاومة مع دخول سيولة مؤسساتية عالية (3 أضعاف المتوسط)',
        outcome: 'open',
        date: '2026-11-16',
      },
    ],
    pinEnabled: false,
    pinCode: '1234',
  };
}

export function useMarketStore() {
  const initial = useMemo(() => loadInitialState(), []);

  const [locale, setLocale] = useState<MarketLocale>(initial.locale);
  const [theme, setTheme] = useState<MarketTheme>(initial.theme);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>(initial.displayCurrency);
  const [assets, setAssets] = useState<MarketAsset[]>(
    initial.cachedAssets && initial.cachedAssets.length >= INITIAL_ASSETS.length
      ? initial.cachedAssets
      : INITIAL_ASSETS
  );
  const [indices, setIndices] = useState<GlobalIndex[]>(INITIAL_GLOBAL_INDICES);
  const [fxRates, setFxRates] = useState<FxRates>(initial.cachedFx ?? DEFAULT_FX_RATES);
  const [watchlist, setWatchlist] = useState<string[]>(initial.watchlist);
  const [realHoldings, setRealHoldings] = useState<Holding[]>(initial.realHoldings);
  const [paperHoldings, setPaperHoldings] = useState<Holding[]>(initial.paperHoldings);
  const [paperCashUsd, setPaperCashUsd] = useState<number>(initial.paperCashUsd);
  const [alerts, setAlerts] = useState<PriceAlert[]>(initial.alerts);
  const [journal, setJournal] = useState<JournalEntry[]>(initial.journal);
  const [pinEnabled, setPinEnabled] = useState<boolean>(initial.pinEnabled);
  const [pinCode, setPinCode] = useState<string>(initial.pinCode);
  const [isLocked, setIsLocked] = useState<boolean>(initial.pinEnabled);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncingLive, setIsSyncingLive] = useState<boolean>(false);
  const [lastSyncLabel, setLastSyncLabel] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Track browser online/offline state cleanly
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Sync live public FX & Crypto quotes (works when online, degrades seamlessly offline)
  const syncLiveQuotes = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    setIsSyncingLive(true);
    try {
      const [fxRes, cryptoRes] = await Promise.allSettled([
        fetch('https://open.er-api.com/v6/latest/USD'),
        fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true'
        ),
      ]);

      let nextFx = fxRates;
      if (fxRes.status === 'fulfilled' && fxRes.value.ok) {
        const fxJson = (await fxRes.value.json()) as {
          rates?: Record<string, number>;
        };
        if (fxJson.rates?.EGP && fxJson.rates?.SAR) {
          nextFx = {
            USD_EGP: Number(fxJson.rates.EGP.toFixed(2)),
            USD_SAR: Number(fxJson.rates.SAR.toFixed(2)),
            USD_AED: Number((fxJson.rates.AED ?? 3.67).toFixed(4)),
            USD_EUR: Number((fxJson.rates.EUR ?? 0.92).toFixed(4)),
            USD_JPY: Number((fxJson.rates.JPY ?? 153.8).toFixed(2)),
            USD_HKD: Number((fxJson.rates.HKD ?? 7.78).toFixed(2)),
            lastUpdated: new Date().toISOString(),
            isLiveApi: true,
          };
          setFxRates(nextFx);
        }
      }

      let cryptoData: Record<string, { usd?: number; usd_24h_change?: number }> | null =
        null;
      if (cryptoRes.status === 'fulfilled' && cryptoRes.value.ok) {
        cryptoData = (await cryptoRes.value.json()) as Record<
          string,
          { usd?: number; usd_24h_change?: number }
        >;
      }

      setAssets((prev) =>
        prev.map((a) => {
          if (a.id === 'fx_usdegp' && nextFx.isLiveApi) {
            const pct = Number(
              (((nextFx.USD_EGP - a.prevClose) / a.prevClose) * 100).toFixed(2)
            );
            return {
              ...a,
              price: nextFx.USD_EGP,
              changePct: pct,
              history: [...a.history.slice(1), nextFx.USD_EGP],
            };
          }
          if (a.id === 'fx_eurusd' && nextFx.isLiveApi && nextFx.USD_EUR > 0) {
            const eurUsd = Number((1 / nextFx.USD_EUR).toFixed(4));
            const pct = Number(
              (((eurUsd - a.prevClose) / a.prevClose) * 100).toFixed(2)
            );
            return {
              ...a,
              price: eurUsd,
              changePct: pct,
              history: [...a.history.slice(1), eurUsd],
            };
          }
          if (a.coingeckoId && cryptoData?.[a.coingeckoId]?.usd) {
            const livePrice = Number(cryptoData[a.coingeckoId].usd!.toFixed(2));
            const livePct = Number(
              (cryptoData[a.coingeckoId].usd_24h_change ?? a.changePct).toFixed(2)
            );
            return {
              ...a,
              price: livePrice,
              changePct: livePct,
              history: [...a.history.slice(1), livePrice],
            };
          }
          return a;
        })
      );

      const nowStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      setLastSyncLabel(nowStr);
    } catch {
      // Offline / network blocked gracefully ignored
    } finally {
      setIsSyncingLive(false);
    }
  }, [fxRates]);

  useEffect(() => {
    syncLiveQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gentle real-time market tick pulse when online so live prices breathe naturally
  useEffect(() => {
    const id = window.setInterval(() => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      setAssets((prev) =>
        prev.map((a) => {
          const drift = (Math.random() - 0.495) * 0.0022;
          const decimals = a.price < 10 ? 3 : a.price < 200 ? 2 : 1;
          const nextPrice = Number(Math.max(0.01, a.price * (1 + drift)).toFixed(decimals));
          const nextPct = Number(
            (((nextPrice - a.prevClose) / a.prevClose) * 100).toFixed(2)
          );
          return {
            ...a,
            price: nextPrice,
            changePct: nextPct,
            history: [...a.history.slice(1), nextPrice],
          };
        })
      );
      setIndices((prev) =>
        prev.map((idx) => {
          const drift = (Math.random() - 0.495) * 0.0012;
          const nextVal = Number((idx.value * (1 + drift)).toFixed(1));
          const nextPct = Number((idx.changePct + drift * 100).toFixed(2));
          return { ...idx, value: nextVal, changePct: nextPct };
        })
      );
    }, 4500);
    return () => window.clearInterval(id);
  }, []);

  // Evaluate price alerts automatically whenever asset prices tick
  useEffect(() => {
    setAlerts((prev) => {
      let changed = false;
      const next = prev.map((al) => {
        if (al.triggered) return al;
        const asset = assets.find((a) => a.id === al.assetId);
        if (!asset) return al;
        const hit =
          (al.condition === 'above' && asset.price >= al.targetValue) ||
          (al.condition === 'below' && asset.price <= al.targetValue) ||
          (al.condition === 'move_pct' && Math.abs(asset.changePct) >= al.targetValue);
        if (hit) {
          changed = true;
          showToast(
            locale === 'ar'
              ? `تنبيه سعري: ${asset.symbol} وصل لـ ${asset.price}`
              : `Price Alert: ${asset.symbol} reached ${asset.price}`
          );
          return { ...al, triggered: true };
        }
        return al;
      });
      return changed ? next : prev;
    });
  }, [assets, locale, showToast]);

  // Persist everything offline in localStorage
  useEffect(() => {
    try {
      const payload: PersistedState = {
        locale,
        theme,
        displayCurrency,
        watchlist,
        realHoldings,
        paperHoldings,
        paperCashUsd,
        alerts,
        journal,
        pinEnabled,
        pinCode,
        cachedAssets: assets,
        cachedFx: fxRates,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore quota errors
    }
  }, [
    locale,
    theme,
    displayCurrency,
    watchlist,
    realHoldings,
    paperHoldings,
    paperCashUsd,
    alerts,
    journal,
    pinEnabled,
    pinCode,
    assets,
    fxRates,
  ]);

  const toggleWatchlist = useCallback((assetId: string) => {
    setWatchlist((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  }, []);

  const addHolding = useCallback(
    (mode: 'real' | 'paper', assetId: string, quantity: number, price: number) => {
      if (quantity <= 0 || price <= 0) return;
      const asset = assets.find((a) => a.id === assetId);
      if (!asset) return;

      if (mode === 'paper') {
        const costUsd = convertToDisplayCurrency(quantity * price, asset.currency, 'USD', fxRates);
        if (costUsd > paperCashUsd) {
          showToast(
            locale === 'ar'
              ? 'الرصيد التجريبي غير كافٍ لهذه الصفقة'
              : 'Insufficient paper trading cash balance'
          );
          return;
        }
        setPaperCashUsd((c) => Number((c - costUsd).toFixed(2)));
      }

      const setter = mode === 'real' ? setRealHoldings : setPaperHoldings;
      setter((prev) => {
        const existing = prev.find((h) => h.assetId === assetId);
        if (existing) {
          const totalQty = existing.quantity + quantity;
          const nextAvg =
            (existing.quantity * existing.avgPrice + quantity * price) / totalQty;
          return prev.map((h) =>
            h.assetId === assetId
              ? { ...h, quantity: Number(totalQty.toFixed(4)), avgPrice: Number(nextAvg.toFixed(2)) }
              : h
          );
        }
        return [
          ...prev,
          {
            id: `${mode}_${Date.now()}`,
            assetId,
            quantity: Number(quantity.toFixed(4)),
            avgPrice: Number(price.toFixed(2)),
            addedAt: new Date().toISOString().slice(0, 10),
          },
        ];
      });
      showToast(
        locale === 'ar'
          ? `تمت إضافة ${quantity} من ${asset.symbol} للمحفظة`
          : `Added ${quantity} ${asset.symbol} to portfolio`
      );
    },
    [assets, fxRates, locale, paperCashUsd, showToast]
  );

  const removeHolding = useCallback(
    (mode: 'real' | 'paper', holdingId: string) => {
      if (mode === 'paper') {
        const target = paperHoldings.find((h) => h.id === holdingId);
        const asset = target ? assets.find((a) => a.id === target.assetId) : undefined;
        if (target && asset) {
          const proceedsUsd = convertToDisplayCurrency(
            target.quantity * asset.price,
            asset.currency,
            'USD',
            fxRates
          );
          setPaperCashUsd((c) => Number((c + proceedsUsd).toFixed(2)));
        }
        setPaperHoldings((prev) => prev.filter((h) => h.id !== holdingId));
      } else {
        setRealHoldings((prev) => prev.filter((h) => h.id !== holdingId));
      }
    },
    [assets, fxRates, paperHoldings]
  );

  const resetPaperAccount = useCallback(() => {
    setPaperHoldings([]);
    setPaperCashUsd(100000);
    showToast(
      locale === 'ar'
        ? 'تمت إعادة شحن المحفظة التجريبية إلى $100,000'
        : 'Paper account reset to $100,000'
    );
  }, [locale, showToast]);

  const addAlert = useCallback(
    (assetId: string, condition: PriceAlert['condition'], targetValue: number) => {
      if (targetValue <= 0) return;
      setAlerts((prev) => [
        {
          id: `al_${Date.now()}`,
          assetId,
          condition,
          targetValue,
          triggered: false,
          createdAt: new Date().toISOString().slice(0, 10),
        },
        ...prev,
      ]);
      showToast(locale === 'ar' ? 'تم حفظ التنبيه السعري' : 'Price alert created');
    },
    [locale, showToast]
  );

  const deleteAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addJournalEntry = useCallback(
    (entry: Omit<JournalEntry, 'id' | 'date'>) => {
      setJournal((prev) => [
        {
          ...entry,
          id: `j_${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
        },
        ...prev,
      ]);
      showToast(locale === 'ar' ? 'تم تسجيل الصفقة في المفكرة' : 'Trade logged in journal');
    },
    [locale, showToast]
  );

  const updateJournalOutcome = useCallback(
    (id: string, outcome: JournalEntry['outcome']) => {
      setJournal((prev) => prev.map((j) => (j.id === id ? { ...j, outcome } : j)));
    },
    []
  );

  const deleteJournalEntry = useCallback((id: string) => {
    setJournal((prev) => prev.filter((j) => j.id !== id));
  }, []);

  // Fear & Greed computed dynamically from market breadth
  const fearGreedScore = useMemo(() => {
    const gainers = assets.filter((a) => a.changePct > 0).length;
    const avgRsi = assets.reduce((sum, a) => sum + a.rsi14, 0) / Math.max(1, assets.length);
    const breadth = (gainers / Math.max(1, assets.length)) * 100;
    return Math.min(95, Math.max(10, Math.round(breadth * 0.55 + avgRsi * 0.45)));
  }, [assets]);

  // Egyptian Gold Karats derived directly from live XAU/USD + USD/EGP
  const egyptGoldKarats = useMemo(() => {
    const goldOunceUsd = assets.find((a) => a.id === 'cmd_gold')?.price ?? 2684.5;
    const gram24Usd = goldOunceUsd / 31.1035;
    const gram24Egp = Math.round(gram24Usd * fxRates.USD_EGP);
    const gram21Egp = Math.round((gram24Egp * 21) / 24);
    const gram18Egp = Math.round((gram24Egp * 18) / 24);
    const goldPoundEgp = Math.round(gram21Egp * 8);
    return { goldOunceUsd, gram24Egp, gram21Egp, gram18Egp, goldPoundEgp };
  }, [assets, fxRates.USD_EGP]);

  return {
    locale,
    setLocale,
    theme,
    setTheme,
    displayCurrency,
    setDisplayCurrency,
    assets,
    indices,
    fxRates,
    calendarEvents: INITIAL_CALENDAR_EVENTS,
    watchlist,
    toggleWatchlist,
    realHoldings,
    paperHoldings,
    paperCashUsd,
    addHolding,
    removeHolding,
    resetPaperAccount,
    alerts,
    addAlert,
    deleteAlert,
    journal,
    addJournalEntry,
    updateJournalOutcome,
    deleteJournalEntry,
    pinEnabled,
    setPinEnabled,
    pinCode,
    setPinCode,
    isLocked,
    setIsLocked,
    isOnline,
    isSyncingLive,
    lastSyncLabel,
    syncLiveQuotes,
    fearGreedScore,
    egyptGoldKarats,
    toastMessage,
    showToast,
  };
}

export type MarketStore = ReturnType<typeof useMarketStore>;
