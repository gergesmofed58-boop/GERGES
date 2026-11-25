import 'dotenv/config';
import dns from 'dns/promises';
import net from 'net';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

// Strict allowlist regex for global exchange tickers (e.g. AAPL, COMI.CA, 2222.SR, ^GSPC, BTC-USD, GC=F)
const VALID_SYMBOL_REGEX = /^[A-Z0-9.\-^=]{1,18}$/;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function sanitizeText(value: unknown, maxLen = 120): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, maxLen);
}

function isSafeHttpUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isPrivateOrReservedIp(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized.startsWith('::ffff:')) {
    return isPrivateOrReservedIp(normalized.slice(7));
  }
  if (net.isIPv4(normalized)) {
    const parts = normalized.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }
  if (net.isIPv6(normalized)) {
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;
    return false;
  }
  return true;
}

async function assertSafePublicUrl(rawUrl: string): Promise<URL> {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('UNSAFE_URL');
  }
  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal'
  ) {
    throw new Error('UNSAFE_URL');
  }
  if (net.isIP(host)) {
    if (isPrivateOrReservedIp(host)) throw new Error('UNSAFE_URL');
    return parsed;
  }
  const records = await dns.lookup(host, { all: true });
  if (!records.length) throw new Error('UNSAFE_URL');
  for (const rec of records) {
    if (isPrivateOrReservedIp(rec.address)) {
      throw new Error('UNSAFE_URL');
    }
  }
  return parsed;
}

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

async function fetchPublicImageAsBase64(
  initialUrl: string
): Promise<{ base64: string; mimeType: string; finalUrl: string }> {
  let currentUrl = initialUrl;
  for (let hop = 0; hop < 4; hop++) {
    const safeUrl = await assertSafePublicUrl(currentUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const resp = await fetch(safeUrl.toString(), {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OstaNagar3D/1.0)',
          Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8',
        },
        signal: controller.signal,
      });

      if (resp.status >= 300 && resp.status < 400) {
        const loc = resp.headers.get('location');
        if (!loc) throw new Error('IMAGE_FETCH_FAILED');
        currentUrl = new URL(loc, safeUrl).toString();
        continue;
      }

      if (!resp.ok) {
        throw new Error('IMAGE_FETCH_FAILED');
      }

      const contentType = (resp.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!ALLOWED_IMAGE_MIMES.has(contentType)) {
        throw new Error('NOT_AN_IMAGE');
      }

      const contentLen = Number(resp.headers.get('content-length') || 0);
      if (contentLen > 5 * 1024 * 1024) {
        throw new Error('IMAGE_TOO_LARGE');
      }

      const arrayBuf = await resp.arrayBuffer();
      if (arrayBuf.byteLength === 0) throw new Error('IMAGE_FETCH_FAILED');
      if (arrayBuf.byteLength > 5 * 1024 * 1024) throw new Error('IMAGE_TOO_LARGE');

      const mimeType = contentType === 'image/jpg' ? 'image/jpeg' : contentType;
      return {
        base64: Buffer.from(arrayBuf).toString('base64'),
        mimeType,
        finalUrl: safeUrl.toString(),
      };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('IMAGE_FETCH_FAILED');
}

interface GroundingSource {
  title: string;
  url: string;
}

function extractGroundingSources(response: unknown): GroundingSource[] {
  const r = response as {
    candidates?: Array<{
      groundingMetadata?: {
        groundingChunks?: Array<{
          web?: { uri?: string; title?: string };
        }>;
      };
    }>;
  };
  const chunks = r?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: GroundingSource[] = [];
  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    const title = chunk?.web?.title;
    if (isSafeHttpUrl(uri) && !seen.has(uri)) {
      seen.add(uri);
      sources.push({
        title: (title || new URL(uri).hostname).slice(0, 120),
        url: uri,
      });
    }
  }
  return sources.slice(0, 8);
}

function extractJsonBlock(rawText: string): string {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

function computeRsi(closes: number[], period = 14): number {
  if (closes.length < 3) return 50;
  const effectivePeriod = Math.min(period, closes.length - 1);
  let gains = 0;
  let losses = 0;
  const start = closes.length - effectivePeriod;
  for (let i = start; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / effectivePeriod;
  const avgLoss = losses / effectivePeriod;
  if (avgLoss === 0) return avgGain === 0 ? 50 : 88;
  const rs = avgGain / avgLoss;
  return Number((100 - 100 / (1 + rs)).toFixed(1));
}

function computeSma(closes: number[], windowSize: number): number {
  if (closes.length === 0) return 0;
  const slice = closes.slice(-Math.min(windowSize, closes.length));
  const sum = slice.reduce((acc, v) => acc + v, 0);
  return Number((sum / slice.length).toFixed(2));
}

function mapGeminiError(err: unknown): { status: number; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg === 'GEMINI_API_KEY_MISSING') {
    return {
      status: 503,
      message:
        'مفتاح التحليل المباشر غير مفعّل بعد — راجع Settings > Secrets للتأكد من إعداد GEMINI_API_KEY.',
    };
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'تم الوصول للحد المؤقت لطلبات التحليل المباشر — جرّب تاني بعد دقيقة.',
    };
  }
  if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message: 'تعذّر التحقق من مفتاح الخدمة — يرجى مراجعة Settings > Secrets.',
    };
  }
  return {
    status: 502,
    message: 'تعذّر الاتصال بخدمة التحليل الحي حالياً — حاول تاني بعد لحظات.',
  };
}

async function createServer() {
  const app = express();
  const smallJson = express.json({ limit: '64kb' });
  app.use((req, res, next) => {
    if (req.path === '/api/carpentry/analyze-photo') {
      next();
      return;
    }
    smallJson(req, res, next);
  });

  // Strict allowlisted CORS for installed Capacitor Android APK origins on carpentry endpoints
  const ALLOWED_NATIVE_ORIGINS = new Set([
    'https://localhost',
    'http://localhost',
    'capacitor://localhost',
    'ionic://localhost',
  ]);
  app.use('/api/carpentry', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && ALLOWED_NATIVE_ORIGINS.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // 1. Live Global Quote & Historical Chart Endpoint (Yahoo Finance public endpoint, strict symbol allowlist)
  app.get('/api/stocks/quote', async (req: Request, res: Response) => {
    const rawSymbol = sanitizeText(req.query.symbol, 18).toUpperCase();
    const rawRange = sanitizeText(req.query.range, 6);
    const allowedRanges = new Set(['5d', '1mo', '3mo', '6mo', '1y']);
    const range = allowedRanges.has(rawRange) ? rawRange : '3mo';
    const interval = range === '5d' ? '60m' : '1d';

    if (!rawSymbol || !VALID_SYMBOL_REGEX.test(rawSymbol)) {
      res.status(400).json({ error: 'رمز السهم غير صالح (مثال: AAPL أو COMI.CA أو 2222.SR).' });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const targetUrl = new URL(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(rawSymbol)}`
      );
      targetUrl.searchParams.set('range', range);
      targetUrl.searchParams.set('interval', interval);

      const upstream = await fetch(targetUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BorsaPulse/1.0)',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!upstream.ok) {
        res.status(upstream.status === 404 ? 404 : 502).json({
          error: `تعذر جلب السعر الحي للرمز ${rawSymbol} حالياً.`,
        });
        return;
      }

      const payload = (await upstream.json()) as {
        chart?: {
          result?: Array<{
            meta?: {
              symbol?: string;
              shortName?: string;
              longName?: string;
              currency?: string;
              exchangeName?: string;
              regularMarketPrice?: number;
              chartPreviousClose?: number;
              previousClose?: number;
              regularMarketVolume?: number;
              fiftyTwoWeekHigh?: number;
              fiftyTwoWeekLow?: number;
            };
            timestamp?: number[];
            indicators?: {
              quote?: Array<{
                close?: Array<number | null>;
                high?: Array<number | null>;
                low?: Array<number | null>;
                volume?: Array<number | null>;
              }>;
            };
          }>;
        };
      };

      const result = payload?.chart?.result?.[0];
      const meta = result?.meta;
      if (!result || !meta || typeof meta.regularMarketPrice !== 'number') {
        res.status(404).json({ error: `لم يتم العثور على بيانات للسهم ${rawSymbol}.` });
        return;
      }

      const timestamps = result.timestamp ?? [];
      const quote = result.indicators?.quote?.[0];
      const closesRaw = quote?.close ?? [];
      const volumesRaw = quote?.volume ?? [];

      const history: Array<{ date: string; price: number; volume: number }> = [];
      for (let i = 0; i < timestamps.length; i++) {
        const c = closesRaw[i];
        if (typeof c === 'number' && Number.isFinite(c)) {
          const dt = new Date(timestamps[i] * 1000);
          const label =
            range === '5d'
              ? `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, '0')}:00`
              : `${dt.getMonth() + 1}/${dt.getDate()}`;
          history.push({
            date: label,
            price: Number(c.toFixed(2)),
            volume: typeof volumesRaw[i] === 'number' ? Math.round(volumesRaw[i] as number) : 0,
          });
        }
      }

      const price = Number(meta.regularMarketPrice.toFixed(2));
      const prevClose = Number(
        (meta.previousClose ?? meta.chartPreviousClose ?? price).toFixed(2)
      );
      const change = Number((price - prevClose).toFixed(2));
      const changePct = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;

      const closes = history.map((h) => h.price);
      const recent20 = closes.slice(-20);
      const support =
        recent20.length > 0
          ? Number((Math.min(...recent20) * 0.99).toFixed(2))
          : Number((price * 0.94).toFixed(2));
      const resistance =
        recent20.length > 0
          ? Number((Math.max(...recent20) * 1.01).toFixed(2))
          : Number((price * 1.06).toFixed(2));
      const rsi14 = computeRsi(closes, 14);
      const sma20 = computeSma(closes, 20);
      const sma50 = computeSma(closes, 50);

      const vols = history.map((h) => h.volume).filter((v) => v > 0);
      const avgVol =
        vols.length > 0 ? Math.round(vols.reduce((a, b) => a + b, 0) / vols.length) : 1;
      const latestVol = meta.regularMarketVolume ?? vols[vols.length - 1] ?? avgVol;

      res.json({
        symbol: meta.symbol ?? rawSymbol,
        name: meta.shortName || meta.longName || rawSymbol,
        currency: meta.currency || 'USD',
        exchangeName: meta.exchangeName || 'Global',
        price,
        previousClose: prevClose,
        change,
        changePct,
        volume: latestVol,
        avgVolume: avgVol,
        high52w: meta.fiftyTwoWeekHigh ? Number(meta.fiftyTwoWeekHigh.toFixed(2)) : resistance,
        low52w: meta.fiftyTwoWeekLow ? Number(meta.fiftyTwoWeekLow.toFixed(2)) : support,
        rsi14,
        sma20,
        sma50,
        support,
        resistance,
        history: history.slice(-60),
        fetchedAt: new Date().toISOString(),
      });
    } catch (err) {
      const aborted = err instanceof Error && err.name === 'AbortError';
      res.status(aborted ? 504 : 502).json({
        error: aborted
          ? 'انتهت مهلة الاتصال بسوق الأسهم — جرّب تاني.'
          : 'تعذر جلب السعر الحي حالياً.',
      });
    } finally {
      clearTimeout(timeout);
    }
  });

  // 2. Live AI Stock Forecast, Sentiment & Grounded News Analysis (Gemini + Google Search Grounding)
  app.post('/api/stocks/analyze', async (req: Request, res: Response) => {
    const symbol = sanitizeText(req.body?.symbol, 24);
    const companyName = sanitizeText(req.body?.companyName, 80);
    const exchange = sanitizeText(req.body?.exchange, 40);
    const locale = req.body?.locale === 'en' ? 'en' : 'ar';

    if (!symbol && !companyName) {
      res.status(400).json({ error: 'اكتب رمز السهم أو اسم الشركة الأول.' });
      return;
    }

    try {
      const ai = getGeminiClient();
      const langPrompt =
        locale === 'ar'
          ? 'Write all descriptive fields in clear, natural Egyptian-friendly Modern Arabic suitable for retail & pro investors.'
          : 'Write all descriptive fields in crisp, concise institutional English.';

      const prompt = `Search the live web for the latest market price, recent financial news, earnings results, and analyst consensus for stock: "${symbol}" (${companyName || symbol}, Exchange: ${exchange || 'Global'}).
${langPrompt}
Important: This is informational financial data analysis, NOT guaranteed financial advice.
Return ONLY a valid JSON object (no markdown outside JSON) with this exact structure:
{
  "resolvedSymbol": "ticker symbol e.g. AAPL or COMI.CA",
  "resolvedName": "official company name",
  "exchange": "exchange name e.g. NASDAQ, EGX, Tadawul, LSE",
  "currency": "USD/EGP/SAR/AED/EUR/GBP",
  "latestPriceEstimate": number or null,
  "sentiment": "bullish" | "bearish" | "neutral",
  "signalLabel": "short verdict e.g. زخم إيجابي / تجميع / حذر مؤقت",
  "confidencePct": number between 45 and 92,
  "summary": "2-3 sentence executive summary of current price drivers and latest catalysts",
  "bullCase": "2 crisp sentences on upside scenario and key catalyst",
  "bearCase": "2 crisp sentences on downside risks to watch",
  "shortTermOutlook": "1-2 sentences on 1-4 week technical/news outlook",
  "mediumTermOutlook": "1-2 sentences on 3-12 month fundamental outlook",
  "supportLevels": [number, number],
  "resistanceLevels": [number, number],
  "analystTargetMean": number or null,
  "latestHeadlines": [
    {
      "title": "headline title",
      "impact": "bullish" | "bearish" | "neutral",
      "takeaway": "1 sentence on why it matters for the stock price",
      "date": "relative or ISO date"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const rawText = response.text ?? '';
      const sources = extractGroundingSources(response);

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(extractJsonBlock(rawText)) as Record<string, unknown>;
      } catch {
        parsed = {
          resolvedSymbol: symbol || companyName,
          resolvedName: companyName || symbol,
          exchange: exchange || 'Global',
          currency: 'USD',
          latestPriceEstimate: null,
          sentiment: 'neutral',
          signalLabel: locale === 'ar' ? 'متابعة الأخبار' : 'Neutral Watch',
          confidencePct: 65,
          summary: rawText.slice(0, 600),
          bullCase: '',
          bearCase: '',
          shortTermOutlook: '',
          mediumTermOutlook: '',
          supportLevels: [],
          resistanceLevels: [],
          analystTargetMean: null,
          latestHeadlines: [],
        };
      }

      res.json({
        analysis: parsed,
        sources,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // 3. Live Breaking Global Market News Radar (Gemini + Google Search Grounding)
  app.post('/api/stocks/news', async (req: Request, res: Response) => {
    const market = sanitizeText(req.body?.market, 40) || 'Global';
    const query = sanitizeText(req.body?.query, 80);
    const locale = req.body?.locale === 'en' ? 'en' : 'ar';

    try {
      const ai = getGeminiClient();
      const langPrompt =
        locale === 'ar'
          ? 'Write headlines, summaries, and impact explanations in clear, punchy Arabic.'
          : 'Write headlines, summaries, and impact explanations in crisp English.';

      const focus = query
        ? `specifically about "${query}" in ${market} stock markets`
        : `across ${market} stock exchanges (major stocks, central bank/macro catalysts, earnings, commodities)`;

      const prompt = `Search the live web for the 6 most important breaking stock market news stories today/this week ${focus}.
${langPrompt}
Return ONLY a valid JSON object:
{
  "marketPulse": "1-2 sentence overall market mood summary",
  "items": [
    {
      "id": "unique string",
      "title": "short sharp headline",
      "summary": "2-sentence clear summary of the news and why traders care",
      "impact": "bullish" | "bearish" | "neutral",
      "impactNote": "short 5-8 word note e.g. داعم لأسهم البنوك والتكنولوجيا",
      "symbols": ["TICKER1", "TICKER2"],
      "market": "US" | "EGX" | "TADAWUL" | "UAE" | "EUROPE" | "ASIA" | "COMMODITIES",
      "sourceName": "publication name",
      "publishedAt": "e.g. منذ ساعتين or Today"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const rawText = response.text ?? '';
      const sources = extractGroundingSources(response);

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(extractJsonBlock(rawText)) as Record<string, unknown>;
      } catch {
        parsed = { marketPulse: rawText.slice(0, 300), items: [] };
      }

      res.json({
        marketPulse: parsed.marketPulse ?? '',
        items: Array.isArray(parsed.items) ? parsed.items : [],
        sources,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // 4. Head-to-Head Stock Comparison (Gemini + Google Search Grounding)
  app.post('/api/stocks/compare', async (req: Request, res: Response) => {
    const symbolA = sanitizeText(req.body?.symbolA, 24);
    const symbolB = sanitizeText(req.body?.symbolB, 24);
    const locale = req.body?.locale === 'en' ? 'en' : 'ar';

    if (!symbolA || !symbolB) {
      res.status(400).json({ error: 'اختار سهمين للمقارنة الأول.' });
      return;
    }

    try {
      const ai = getGeminiClient();
      const langPrompt =
        locale === 'ar'
          ? 'Write all commentary in clear, practical Arabic.'
          : 'Write all commentary in concise English.';

      const prompt = `Search the live web and compare these two stocks head-to-head: "${symbolA}" vs "${symbolB}" across valuation, growth catalysts, dividend/cash flow, risk profile, and momentum.
${langPrompt}
Return ONLY a valid JSON object:
{
  "headline": "short comparison verdict title",
  "growthEdge": "${symbolA} or ${symbolB}",
  "safetyEdge": "${symbolA} or ${symbolB}",
  "incomeEdge": "${symbolA} or ${symbolB}",
  "verdict": "3 sentences summarizing which profile fits aggressive growth investors vs conservative/income investors",
  "keyDifferences": ["point 1", "point 2", "point 3", "point 4"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const rawText = response.text ?? '';
      const sources = extractGroundingSources(response);

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(extractJsonBlock(rawText)) as Record<string, unknown>;
      } catch {
        parsed = {
          headline: `${symbolA} vs ${symbolB}`,
          growthEdge: symbolA,
          safetyEdge: symbolB,
          incomeEdge: symbolB,
          verdict: rawText.slice(0, 450),
          keyDifferences: [],
        };
      }

      res.json({
        comparison: parsed,
        sources,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // 5. Live Wood Sheet Market Prices (Gemini + Google Search Grounding for Carpentry Workshop)
  app.post('/api/carpentry/wood-prices', async (req: Request, res: Response) => {
    const rawRegion = sanitizeText(req.body?.region, 16).toLowerCase();
    const allowedRegions = new Set(['egypt', 'saudi', 'uae']);
    const region = allowedRegions.has(rawRegion) ? rawRegion : 'egypt';
    const locale = req.body?.locale === 'en' ? 'en' : 'ar';

    const regionConfig: Record<
      string,
      { nameAr: string; nameEn: string; currency: string; queryHint: string }
    > = {
      egypt: {
        nameAr: 'السوق المصري (مصر)',
        nameEn: 'Egypt Market',
        currency: 'EGP',
        queryHint:
          'أسعار ألواح الخشب في مصر اليوم 122×244 سم (كونتر جود وود 18مم، MDF إسباني 18مم، كونتر قشرة أرو 18مم، قشرة جوز تركي، خشب زان أحمر روماني، خشب موسكي سويدي، أبلكاش سه/ثري 6مم، شريط حرف PVC بالمتر) بالجنيه المصري',
      },
      saudi: {
        nameAr: 'السوق السعودي (السعودية)',
        nameEn: 'Saudi Arabia Market',
        currency: 'SAR',
        queryHint:
          'أسعار ألواح الخشب في السعودية اليوم 122×244 سم (كونتر/بلوك بورد 18مم، MDF 18مم، قشرة سنديان/أرو، قشرة جوز، خشب زان، خشب سويدي، أبلكاش 6مم، شريط PVC) بالريال السعودي',
      },
      uae: {
        nameAr: 'السوق الإماراتي (الإمارات)',
        nameEn: 'UAE Market',
        currency: 'AED',
        queryHint:
          'wood sheet prices in UAE today 122x244cm (18mm blockboard, 18mm MDF, oak veneer, walnut veneer, beech wood, pine wood, 6mm plywood, PVC edge banding per meter) in AED',
      },
    };

    const cfg = regionConfig[region];

    try {
      const ai = getGeminiClient();
      const langRule =
        locale === 'ar'
          ? 'Write marketNote and tips in concise practical Arabic suitable for a carpenter.'
          : 'Write marketNote and tips in concise practical English suitable for a carpenter.';

      const prompt = `Search the live web for current carpenter market sheet prices (standard 122×244 cm sheet) in ${cfg.nameEn} (${cfg.currency}):
${cfg.queryHint}
${langRule}
Convert lumber quotes (like beech/pine per cubic meter) into an equivalent workshop panel/project unit price for a 122×244cm equivalent board at 22mm thickness so the carpenter can price furniture consistently.
Return ONLY a valid JSON object (no markdown outside JSON) with this exact schema:
{
  "currency": "${cfg.currency}",
  "marketNote": "1-2 short sentences about current wood market prices & trends in ${cfg.nameEn}",
  "prices": {
    "oak18": number,
    "walnut18": number,
    "counter18": number,
    "mdf18": number,
    "beech22": number,
    "pine22": number,
    "backSheet6mm": number,
    "edgeBandingPerMeter": number
  }
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const rawText = response.text ?? '';
      const sources = extractGroundingSources(response);

      const fallbackDefaults: Record<string, Record<string, number>> = {
        egypt: {
          oak18: 2050,
          walnut18: 2350,
          counter18: 1750,
          mdf18: 1400,
          beech22: 2950,
          pine22: 1550,
          backSheet6mm: 600,
          edgeBandingPerMeter: 20,
        },
        saudi: {
          oak18: 210,
          walnut18: 245,
          counter18: 165,
          mdf18: 125,
          beech22: 310,
          pine22: 155,
          backSheet6mm: 65,
          edgeBandingPerMeter: 3,
        },
        uae: {
          oak18: 205,
          walnut18: 240,
          counter18: 160,
          mdf18: 120,
          beech22: 300,
          pine22: 150,
          backSheet6mm: 62,
          edgeBandingPerMeter: 3,
        },
      };

      const clampPrice = (val: unknown, fallback: number, maxVal = 50000): number => {
        const n = typeof val === 'number' ? val : Number(val);
        if (!Number.isFinite(n) || n <= 0 || n > maxVal) return fallback;
        return Math.round(n);
      };

      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(extractJsonBlock(rawText)) as Record<string, unknown>;
      } catch {
        parsed = {};
      }

      const rawPrices = (parsed.prices ?? {}) as Record<string, unknown>;
      const fb = fallbackDefaults[region];

      const prices = {
        oak18: clampPrice(rawPrices.oak18, fb.oak18),
        walnut18: clampPrice(rawPrices.walnut18, fb.walnut18),
        counter18: clampPrice(rawPrices.counter18, fb.counter18),
        mdf18: clampPrice(rawPrices.mdf18, fb.mdf18),
        beech22: clampPrice(rawPrices.beech22, fb.beech22),
        pine22: clampPrice(rawPrices.pine22, fb.pine22),
        backSheet6mm: clampPrice(rawPrices.backSheet6mm, fb.backSheet6mm, 20000),
        edgeBandingPerMeter: clampPrice(rawPrices.edgeBandingPerMeter, fb.edgeBandingPerMeter, 500),
      };

      res.json({
        region,
        regionNameAr: cfg.nameAr,
        regionNameEn: cfg.nameEn,
        currency: cfg.currency,
        marketNote:
          typeof parsed.marketNote === 'string' && parsed.marketNote.trim()
            ? parsed.marketNote.trim().slice(0, 320)
            : locale === 'ar'
            ? `متوسط أسعار ألواح الخشب (122×244 سم) المحدّثة من السوق في ${cfg.nameAr}.`
            : `Updated 122×244cm wood sheet average prices in ${cfg.nameEn}.`,
        prices,
        sources,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // 6. Photo-to-Carpentry Blueprint & Egyptian Colloquial Breakdown (Internet URL or Uploaded Image)
  app.post(
    '/api/carpentry/analyze-photo',
    express.json({ limit: '8mb' }),
    async (req: Request, res: Response) => {
      const rawImageUrl = sanitizeText(req.body?.imageUrl, 1000);
      const rawBase64 = typeof req.body?.imageBase64 === 'string' ? req.body.imageBase64.trim() : '';
      const rawMime = sanitizeText(req.body?.imageMimeType, 40).toLowerCase();

      const fitModeRaw = sanitizeText(req.body?.fitMode, 16);
      const fitMode =
        fitModeRaw === 'room' || fitModeRaw === 'free' ? fitModeRaw : 'custom';

      const clampInt = (val: unknown, min: number, max: number, fallback: number): number => {
        const n = Number(val);
        if (!Number.isFinite(n)) return fallback;
        return Math.round(Math.max(min, Math.min(max, n)));
      };

      const targetWidthCm = clampInt(req.body?.targetWidthCm, 35, 420, 180);
      const targetHeightCm = clampInt(req.body?.targetHeightCm, 35, 300, 220);
      const targetDepthCm = clampInt(req.body?.targetDepthCm, 22, 220, 60);

      const roomLengthCm = clampInt(req.body?.roomLengthCm, 120, 900, 380);
      const roomWidthCm = clampInt(req.body?.roomWidthCm, 100, 800, 340);
      const roomCeilingCm = clampInt(req.body?.roomCeilingCm, 210, 400, 280);
      const roomType = sanitizeText(req.body?.roomType, 40) || 'غرفة نوم';
      const userNotes = sanitizeText(req.body?.userNotes, 600);
      const sheetPriceEgp = clampInt(req.body?.sheetPriceEgp, 200, 25000, 1950);
      const currencyLabel = sanitizeText(req.body?.currencyLabel, 12) || 'جنيه';

      let imageBase64 = '';
      let imageMimeType = 'image/jpeg';
      let previewDataUrl: string | null = null;

      try {
        if (rawBase64) {
          const cleanBase64 = rawBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
          if (cleanBase64.length > 7_500_000) {
            res.status(400).json({
              error: 'الصورة كبيرة أوي — جرب صورة أصغر أو صغّر حجمها شوية.',
            });
            return;
          }
          const normalizedMime = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
          if (!ALLOWED_IMAGE_MIMES.has(normalizedMime)) {
            res.status(400).json({
              error: 'نوع الصورة مش مدعوم — ابعت صورة JPG أو PNG أو WebP.',
            });
            return;
          }
          imageBase64 = cleanBase64;
          imageMimeType = normalizedMime;
        } else if (rawImageUrl) {
          const fetched = await fetchPublicImageAsBase64(rawImageUrl);
          imageBase64 = fetched.base64;
          imageMimeType = fetched.mimeType;
          previewDataUrl = `data:${fetched.mimeType};base64,${fetched.base64}`;
        } else {
          res.status(400).json({
            error: 'ابعت رابط صورة من النت أو ارفع صورة من موبايلك الأول يا أسطى.',
          });
          return;
        }
      } catch (err) {
        const code = err instanceof Error ? err.message : '';
        if (code === 'UNSAFE_URL') {
          res.status(400).json({
            error: 'الرابط ده مش صالح — لازم يكون رابط صورة مباشر من الإنترنت (يبدأ بـ https://).',
          });
          return;
        }
        if (code === 'NOT_AN_IMAGE') {
          res.status(400).json({
            error: 'الرابط ده مش رابط صورة مباشر (افتح الصورة واعمل "نسخ عنوان الصورة" أو احفظها وارفعها من جهازك).',
          });
          return;
        }
        if (code === 'IMAGE_TOO_LARGE') {
          res.status(400).json({
            error: 'حجم الصورة على النت أكبر من 5 ميجا — احفظها وارفعها من جهازك عشان نصغرها أوتوماتيك.',
          });
          return;
        }
        res.status(400).json({
          error: 'معرفناش نسحب الصورة من الرابط ده (ممكن الموقع مانع السحب) — احفظ الصورة على موبايلك وارفعها من زر «اختار صورة من جهازك».',
        });
        return;
      }

      try {
        const ai = getGeminiClient();

        const modeInstruction =
          fitMode === 'custom'
            ? `العميل عاوز يظبّط القطعة اللي في الصورة على المقاس ده بالظبط:
- العرض المطلوب: ${targetWidthCm} سنتي
- الارتفاع المطلوب: ${targetHeightCm} سنتي
- العمق المطلوب: ${targetDepthCm} سنتي`
            : fitMode === 'room'
            ? `العميل عاوز يظبّط القطعة اللي في الصورة عشان تناسب الأوضة دي:
- نوع الأوضة / المكان: ${roomType}
- طول الأوضة: ${roomLengthCm} سنتي × عرض الأوضة: ${roomWidthCm} سنتي × ارتفاع السقف: ${roomCeilingCm} سنتي
اختار أنسب مقاس (عرض × ارتفاع × عمق بالسنتي) للقطعة اللي في الصورة بحيث تركب مرتاحة في الأوضة وتسيب ممر حركة مريح (على الأقل 70-80 سنتي) وماتقفلش الباب ولا الشباك.`
            : `العميل كاتب طلبه ومقاساته بكلامه الحر — استنتج المقاسات بالظبط من كلامه ومن نسب الصورة.`;

        const extraNotes = userNotes
          ? `كلام وطلبات العميل الإضافية (لازم تنفذها بالحرف): "${userNotes}"`
          : 'مفيش ملاحظات إضافية — ظبّط التفاصيل على أصول النجارة المصرية.';

        const prompt = `إنت أسطى نجار مصري محترف وخبير تفصيل موبيليا ومطابخ ودواليب ودريسينج.
بص كويس جداً في الصورة المرفقة وحلل كل تفصيلة فيها (نوع القطعة، عدد الضلف، عدد الأدراج، الرفوف، القواطيع، الوزرة، الرجلين، نوع الخشب واللون، والتشطيب).

${modeInstruction}
${extraNotes}
سعر لوح الخشب 122×244 سنتي في الورشة دلوقتي: ${sheetPriceEgp} ${currencyLabel}.

قواعد مهمة جداً لازم تلتزم بيها 100%:
1. كل الكتابة تكون باللهجة المصرية العامية الطبيعية بتاعة الأسطوات والورش (زي: "تخانة 18 مللي"، "مترين و20 سنتي"، "جنبين يمين وشمال"، "ضلفة"، "درج"، "وزرة"، "شريط حرف"، "خلي بالك"، "مسمار برمة"، "غراء أبيض"). ممنوع الفصحى الرسمية الناشفة.
2. حتى المقاسات اكتبها بالمصري العامي بوضوح (مثال: "طول مترين و20 سنتي (220 سنتي) × عرض 60 سنتي — تخانة 18 مللي").
3. ادّي تفاصيل كتير وحقيقية تنفع تتنفذ فوراً في الورشة: كل حتة خشب بمقاسها المظبوط (بعد خصم التخانة والخلوصات)، الخردوات والمفصلات والمجاري بالعدد، خطوات التجميع بالتفصيل، الدهان والتشطيب، والغلطات اللي تاخد بالك منها.
4. اختار أقرب قالب أساسي في fittedDimensions.mappedTemplateId من القائمة دي فقط:
   wardrobe, dressing, bed, nightstand, dresser, kitchen, buffet, table, tv_unit, bookshelf, desk, shoe_rack
5. اختار أقرب نوع خشب في recommendedWoodType من القائمة دي فقط:
   oak18, walnut18, counter18, mdf18, beech22, pine22

رجّع النتيجة JSON مظبوط فقط حسب الـ schema المطلوب.`;

        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: imageMimeType,
                  data: imageBase64,
                },
              },
              { text: prompt },
            ],
          },
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                detectedTitleEg: { type: Type.STRING },
                styleSummaryEg: { type: Type.STRING },
                fitExplanationEg: { type: Type.STRING },
                dimensionsSpokenEg: { type: Type.STRING },
                mappedTemplateId: { type: Type.STRING },
                recommendedWoodType: { type: Type.STRING },
                recommendedWoodNameEg: { type: Type.STRING },
                fittedDimensions: {
                  type: Type.OBJECT,
                  properties: {
                    widthCm: { type: Type.NUMBER },
                    heightCm: { type: Type.NUMBER },
                    depthCm: { type: Type.NUMBER },
                    doorsCount: { type: Type.INTEGER },
                    shelvesCount: { type: Type.INTEGER },
                    drawersCount: { type: Type.INTEGER },
                    dividersCount: { type: Type.INTEGER },
                    plinthHeightCm: { type: Type.NUMBER },
                    boardThicknessMm: { type: Type.INTEGER },
                  },
                },
                detailedCutList: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      code: { type: Type.STRING },
                      nameEg: { type: Type.STRING },
                      lengthCm: { type: Type.NUMBER },
                      widthCm: { type: Type.NUMBER },
                      thicknessMm: { type: Type.INTEGER },
                      qty: { type: Type.INTEGER },
                      spokenSizeEg: { type: Type.STRING },
                      edgeBandingEg: { type: Type.STRING },
                      noteEg: { type: Type.STRING },
                      isExtraSpecialPiece: { type: Type.BOOLEAN },
                    },
                  },
                },
                hardwareListEg: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      nameEg: { type: Type.STRING },
                      qtyTextEg: { type: Type.STRING },
                      specEg: { type: Type.STRING },
                      approxCostEgp: { type: Type.NUMBER },
                    },
                  },
                },
                assemblyStepsEg: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      stepNumber: { type: Type.INTEGER },
                      titleEg: { type: Type.STRING },
                      detailsEg: { type: Type.STRING },
                      masterTipEg: { type: Type.STRING },
                    },
                  },
                },
                finishingAndPaintEg: { type: Type.STRING },
                commonMistakesEg: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                estimatedSheetsCount: { type: Type.INTEGER },
                estimatedTotalCostEgp: { type: Type.NUMBER },
                estimatedWorkHours: { type: Type.NUMBER },
                carpenterVerdictEg: { type: Type.STRING },
              },
            },
          },
        });

        const rawText = (response.text ?? '').trim();
        const parsed = JSON.parse(extractJsonBlock(rawText)) as Record<string, unknown>;

        const allowedTemplates = new Set([
          'wardrobe',
          'dressing',
          'bed',
          'nightstand',
          'dresser',
          'kitchen',
          'buffet',
          'table',
          'tv_unit',
          'bookshelf',
          'desk',
          'shoe_rack',
        ]);
        const allowedWoods = new Set([
          'oak18',
          'walnut18',
          'counter18',
          'mdf18',
          'beech22',
          'pine22',
        ]);

        const rawDims = (parsed.fittedDimensions ?? {}) as Record<string, unknown>;
        const mappedTemplateId = allowedTemplates.has(String(parsed.mappedTemplateId))
          ? String(parsed.mappedTemplateId)
          : 'wardrobe';
        const recommendedWoodType = allowedWoods.has(String(parsed.recommendedWoodType))
          ? String(parsed.recommendedWoodType)
          : 'oak18';

        const sanitized = {
          detectedTitleEg: String(parsed.detectedTitleEg || 'قطعة أثاث متفصلة من الصورة'),
          styleSummaryEg: String(parsed.styleSummaryEg || ''),
          fitExplanationEg: String(parsed.fitExplanationEg || ''),
          dimensionsSpokenEg: String(parsed.dimensionsSpokenEg || ''),
          mappedTemplateId,
          recommendedWoodType,
          recommendedWoodNameEg: String(parsed.recommendedWoodNameEg || 'كونتر قشرة أرو تخانة 18 مللي'),
          fittedDimensions: {
            widthCm: clampInt(rawDims.widthCm, 40, 420, targetWidthCm),
            heightCm: clampInt(rawDims.heightCm, 38, 280, targetHeightCm),
            depthCm: clampInt(rawDims.depthCm, 24, 220, targetDepthCm),
            doorsCount: clampInt(rawDims.doorsCount, 0, 6, 2),
            shelvesCount: clampInt(rawDims.shelvesCount, 0, 14, 3),
            drawersCount: clampInt(rawDims.drawersCount, 0, 10, 2),
            dividersCount: clampInt(rawDims.dividersCount, 0, 4, 1),
            plinthHeightCm: clampInt(rawDims.plinthHeightCm, 0, 20, 8),
            boardThicknessMm: [16, 18, 22, 25].includes(Number(rawDims.boardThicknessMm))
              ? Number(rawDims.boardThicknessMm)
              : 18,
          },
          detailedCutList: Array.isArray(parsed.detailedCutList)
            ? parsed.detailedCutList.slice(0, 32).map((row: Record<string, unknown>, idx: number) => ({
                code: String(row.code || `P${idx + 1}`).slice(0, 8),
                nameEg: String(row.nameEg || 'حتة خشب').slice(0, 120),
                lengthCm: Math.max(5, Math.min(244, Math.round(Number(row.lengthCm || 60) * 10) / 10)),
                widthCm: Math.max(5, Math.min(122, Math.round(Number(row.widthCm || 40) * 10) / 10)),
                thicknessMm: clampInt(row.thicknessMm, 4, 45, 18),
                qty: clampInt(row.qty, 1, 40, 1),
                spokenSizeEg: String(row.spokenSizeEg || '').slice(0, 180),
                edgeBandingEg: String(row.edgeBandingEg || 'حرف واحد طويل').slice(0, 100),
                noteEg: String(row.noteEg || '').slice(0, 220),
                isExtraSpecialPiece: Boolean(row.isExtraSpecialPiece),
              }))
            : [],
          hardwareListEg: Array.isArray(parsed.hardwareListEg)
            ? parsed.hardwareListEg.slice(0, 20).map((h: Record<string, unknown>) => ({
                nameEg: String(h.nameEg || '').slice(0, 120),
                qtyTextEg: String(h.qtyTextEg || '').slice(0, 60),
                specEg: String(h.specEg || '').slice(0, 180),
                approxCostEgp: clampInt(h.approxCostEgp, 0, 50000, 0),
              }))
            : [],
          assemblyStepsEg: Array.isArray(parsed.assemblyStepsEg)
            ? parsed.assemblyStepsEg.slice(0, 12).map((s: Record<string, unknown>, i: number) => ({
                stepNumber: clampInt(s.stepNumber, 1, 20, i + 1),
                titleEg: String(s.titleEg || '').slice(0, 140),
                detailsEg: String(s.detailsEg || '').slice(0, 500),
                masterTipEg: String(s.masterTipEg || '').slice(0, 260),
              }))
            : [],
          finishingAndPaintEg: String(parsed.finishingAndPaintEg || '').slice(0, 600),
          commonMistakesEg: Array.isArray(parsed.commonMistakesEg)
            ? parsed.commonMistakesEg.slice(0, 8).map((m: unknown) => String(m).slice(0, 220))
            : [],
          estimatedSheetsCount: clampInt(parsed.estimatedSheetsCount, 1, 30, 3),
          estimatedTotalCostEgp: clampInt(parsed.estimatedTotalCostEgp, 0, 500000, 0),
          estimatedWorkHours: Math.max(1, Math.min(200, Number(parsed.estimatedWorkHours || 8))),
          carpenterVerdictEg: String(parsed.carpenterVerdictEg || '').slice(0, 400),
        };

        res.json({
          result: sanitized,
          previewDataUrl,
          analyzedAt: new Date().toISOString(),
        });
      } catch (err) {
        const mapped = mapGeminiError(err);
        res.status(mapped.status).json({ error: mapped.message });
      }
    }
  );

  // Frontend mounting: Vite dev middlewares in development, static dist/ in production
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OstaNagar 3D Carpentry server running on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
