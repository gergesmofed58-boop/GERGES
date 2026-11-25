export type MarketLocale = 'ar' | 'en';
export type MarketTheme = 'light' | 'dark';

export type ExchangeRegion =
  | 'ALL'
  | 'US'
  | 'EGX'
  | 'TADAWUL'
  | 'UAE'
  | 'EUROPE'
  | 'ASIA'
  | 'COMMODITIES';

export type SentimentDirection = 'bullish' | 'bearish' | 'neutral';

export type MarketTab =
  | 'markets'
  | 'news'
  | 'alerts'
  | 'portfolio'
  | 'compare';

export interface PricePoint {
  date: string;
  price: number;
  volume: number;
}

export interface GlobalStock {
  symbol: string;
  nameAr: string;
  nameEn: string;
  exchange: string;
  region: Exclude<ExchangeRegion, 'ALL'>;
  currency: string;
  sectorAr: string;
  sectorEn: string;
  price: number;
  previousClose: number;
  change: number;
  changePct: number;
  volume: number;
  avgVolume: number;
  marketCapLabel: string;
  peRatio: number | null;
  dividendYieldPct: number;
  shariahCompliant: boolean;
  rsi14: number;
  macdSignal: SentimentDirection;
  sma20: number;
  sma50: number;
  support: number;
  resistance: number;
  targetPrice: number;
  high52w: number;
  low52w: number;
  analystVerdictAr: string;
  analystVerdictEn: string;
  sentiment: SentimentDirection;
  history: PricePoint[];
  isLiveSynced?: boolean;
  lastSyncedAt?: string;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface AiStockAnalysis {
  resolvedSymbol: string;
  resolvedName: string;
  exchange: string;
  currency: string;
  latestPriceEstimate: number | null;
  sentiment: SentimentDirection;
  signalLabel: string;
  confidencePct: number;
  summary: string;
  bullCase: string;
  bearCase: string;
  shortTermOutlook: string;
  mediumTermOutlook: string;
  supportLevels: number[];
  resistanceLevels: number[];
  analystTargetMean: number | null;
  latestHeadlines: Array<{
    title: string;
    impact: SentimentDirection;
    takeaway: string;
    date: string;
  }>;
  sources: GroundingSource[];
  generatedAt: string;
}

export interface MarketNewsItem {
  id: string;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  impact: SentimentDirection;
  impactNoteAr: string;
  impactNoteEn: string;
  symbols: string[];
  region: Exclude<ExchangeRegion, 'ALL'>;
  sourceName: string;
  publishedAtAr: string;
  publishedAtEn: string;
  url?: string;
}

export type AlertConditionType =
  | 'price_above'
  | 'price_below'
  | 'change_pct_above'
  | 'rsi_oversold'
  | 'rsi_overbought'
  | 'volume_spike';

export interface StockAlertRule {
  id: string;
  symbol: string;
  stockName: string;
  currency: string;
  condition: AlertConditionType;
  threshold: number;
  note: string;
  active: boolean;
  triggered: boolean;
  triggeredAt?: string;
  createdAt: string;
}

export interface TriggeredAlertLog {
  id: string;
  symbol: string;
  titleAr: string;
  titleEn: string;
  detailAr: string;
  detailEn: string;
  time: string;
  read: boolean;
  severity: 'bullish' | 'bearish' | 'warning';
}

export interface PortfolioPosition {
  id: string;
  symbol: string;
  shares: number;
  avgCost: number;
  commissionPct: number;
  mode: 'real' | 'paper';
  addedAt: string;
}

export interface CalendarEvent {
  id: string;
  symbol: string;
  companyAr: string;
  companyEn: string;
  region: Exclude<ExchangeRegion, 'ALL'>;
  type: 'dividend' | 'earnings';
  date: string;
  valueLabelAr: string;
  valueLabelEn: string;
  dividendPerShare?: number;
  currency: string;
}

export interface AiComparisonResult {
  headline: string;
  growthEdge: string;
  safetyEdge: string;
  incomeEdge: string;
  verdict: string;
  keyDifferences: string[];
  sources: GroundingSource[];
  generatedAt: string;
}
