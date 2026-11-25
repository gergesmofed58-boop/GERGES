export type MarketLocale = 'ar' | 'en';
export type MarketTheme = 'dark' | 'light';
export type DisplayCurrency = 'EGP' | 'USD' | 'SAR';

export type ExchangeRegion =
  | 'all'
  | 'EGX'
  | 'US'
  | 'MENA'
  | 'EU_ASIA'
  | 'COMMODITIES'
  | 'FOREX'
  | 'CRYPTO';

export type SectorId =
  | 'tech'
  | 'banking'
  | 'energy'
  | 'realestate'
  | 'consumer'
  | 'metals'
  | 'currencies'
  | 'crypto';

export type MarketTab = 'markets' | 'radar' | 'portfolio' | 'tools' | 'apk';

export type TechnicalSignal =
  | 'strong_buy'
  | 'buy'
  | 'neutral'
  | 'sell'
  | 'strong_sell';

export interface MarketAsset {
  id: string;
  symbol: string;
  nameAr: string;
  nameEn: string;
  exchange: string;
  region: Exclude<ExchangeRegion, 'all'>;
  sector: SectorId;
  currency: 'USD' | 'EGP' | 'SAR' | 'AED' | 'EUR' | 'JPY' | 'HKD';
  price: number;
  prevClose: number;
  changePct: number;
  high24h: number;
  low24h: number;
  volume: number;
  avgVolume: number;
  marketCapBillion: number;
  peRatio: number | null;
  dividendYieldPct: number;
  rsi14: number;
  macdValue: number;
  support: number;
  resistance: number;
  signal: TechnicalSignal;
  isShariahCompliant: boolean;
  history: number[];
  coingeckoId?: string;
}

export interface GlobalIndex {
  id: string;
  symbol: string;
  nameAr: string;
  nameEn: string;
  region: string;
  value: number;
  changePct: number;
}

export interface Holding {
  id: string;
  assetId: string;
  quantity: number;
  avgPrice: number;
  addedAt: string;
}

export interface PriceAlert {
  id: string;
  assetId: string;
  condition: 'above' | 'below' | 'move_pct';
  targetValue: number;
  triggered: boolean;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  assetSymbol: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  reason: string;
  outcome: 'open' | 'win' | 'loss';
  date: string;
}

export interface CalendarEvent {
  id: string;
  date: string;
  type: 'dividend' | 'earnings' | 'macro';
  symbol: string;
  titleAr: string;
  titleEn: string;
  detailAr: string;
  detailEn: string;
  impact: 'high' | 'medium';
}

export interface ExchangeClockInfo {
  id: string;
  nameAr: string;
  nameEn: string;
  code: string;
  timezoneOffsetHours: number;
  openHour: number;
  openMin: number;
  closeHour: number;
  closeMin: number;
  /** 0=Sun..6=Sat */
  tradingDays: number[];
}

export interface FxRates {
  USD_EGP: number;
  USD_SAR: number;
  USD_AED: number;
  USD_EUR: number;
  USD_JPY: number;
  USD_HKD: number;
  lastUpdated: string;
  isLiveApi: boolean;
}
