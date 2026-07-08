import { computeTechnicalIndicators, TechnicalIndicators } from '../utils/indicators';
import { generateForecast, Forecast } from '../utils/forecast';
import { generateReasoning, ReasoningPoint } from '../utils/reasoning';

// All requests go through our own serverless API routes (/api/*) which proxy
// Yahoo Finance server-side. This completely bypasses browser CORS restrictions.
// On Vercel these are deployed as Serverless Functions. In local dev, the Vite
// proxy forwards /api requests to the dev server.

export interface QuoteData {
  symbol: string;
  shortName: string;
  longName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketOpen: number;
  regularMarketPreviousClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap: number;
  trailingPE: number;
  forwardPE: number;
  priceToBook: number;
  debtToEquity: number;
  returnOnEquity: number;
  earningsGrowth: number;
  trailingEps: number;
  currency: string;
  exchange: string;
}

export interface ChartPoint {
  date: string;
  price: number;
  volume: number;
}

export interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  type: string;
}

export interface StockAnalysis {
  quote: QuoteData;
  chart: ChartPoint[];
  indicators: TechnicalIndicators;
  forecast: Forecast;
  reasoning: ReasoningPoint[];
  news: NewsItem[];
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

function normalizeSymbol(symbol: string): string {
  const trimmed = symbol.trim().toUpperCase();
  // Already suffixed or index
  if (trimmed.endsWith('.NS') || trimmed.endsWith('.BO') || trimmed.startsWith('^')) return trimmed;
  // US stocks - no suffix needed for Yahoo Finance
  if (['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA', 'AMD', 'NFLX', 'DIS', 'BA', 'JPM', 'V', 'MA', 'WMT', 'KO', 'PEP', 'MCD', 'NKE', 'SBUX', 'COST', 'INTC', 'CSCO', 'ORCL', 'IBM', 'CRM', 'ADBE', 'PYPL', 'QCOM', 'TXN', 'AVGO', 'COST'].includes(trimmed)) return trimmed;
  // UK stocks
  if (trimmed.endsWith('.L')) return trimmed;
  // Japan stocks
  if (trimmed.endsWith('.T')) return trimmed;
  // Hong Kong stocks
  if (trimmed.endsWith('.HK')) return trimmed;
  // European stocks
  if (trimmed.endsWith('.PA') || trimmed.endsWith('.DE') || trimmed.endsWith('.SW')) return trimmed;
  // Canada
  if (trimmed.endsWith('.TO')) return trimmed;
  // Default to NSE for Indian stocks
  return `${trimmed}.NS`;
}

function safeNumber(val: unknown, fallback = 0): number {
  if (typeof val === 'number' && !isNaN(val) && isFinite(val)) return val;
  if (typeof val === 'string') {
    const n = parseFloat(val);
    if (!isNaN(n) && isFinite(n)) return n;
  }
  return fallback;
}

function safeString(val: unknown, fallback = ''): string {
  if (typeof val === 'string' && val.length > 0) return val;
  return fallback;
}

interface ChartResult {
  quote: QuoteData;
  chart: ChartPoint[];
}

function parseChartResponse(raw: any, requestedSymbol: string): ChartResult {
  const result = raw?.chart?.result?.[0];
  if (!result) {
    throw new Error(`No chart data returned for "${requestedSymbol}". The symbol may be invalid or the market is closed.`);
  }

  const meta = result.meta ?? {};
  const timestamps: number[] = result.timestamp ?? [];
  const quoteInd = result.indicators?.quote?.[0] ?? {};
  const closes: (number | null)[] = quoteInd.close ?? [];
  const opens: (number | null)[] = quoteInd.open ?? [];
  const highs: (number | null)[] = quoteInd.high ?? [];
  const lows: (number | null)[] = quoteInd.low ?? [];
  const volumes: (number | null)[] = quoteInd.volume ?? [];

  // Build chart points from the historical array
  const chart: ChartPoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close == null || isNaN(close)) continue;
    chart.push({
      date: new Date(timestamps[i] * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      price: safeNumber(close),
      volume: safeNumber(volumes[i]),
    });
  }

  // Derive quote from meta + last valid candle
  const lastValidClose = [...closes].reverse().find((c) => c != null && !isNaN(c)) ?? 0;
  const lastValidHigh = [...highs].reverse().find((h) => h != null && !isNaN(h)) ?? 0;
  const lastValidLow = [...lows].reverse().find((l) => l != null && !isNaN(l)) ?? 0;
  const lastValidOpen = [...opens].reverse().find((o) => o != null && !isNaN(o)) ?? 0;
  const lastValidVolume = [...volumes].reverse().find((v) => v != null && !isNaN(v)) ?? 0;

  const regularMarketPrice = safeNumber(meta.regularMarketPrice, safeNumber(lastValidClose));
  const previousClose = safeNumber(meta.previousClose ?? meta.chartPreviousClose, safeNumber(lastValidClose));
  const change = safeNumber(meta.regularMarketChange, regularMarketPrice - previousClose);
  const changePercent = safeNumber(meta.regularMarketChangePercent, previousClose > 0 ? ((regularMarketPrice - previousClose) / previousClose) * 100 : 0);

  // 52-week range from meta or from chart data
  const allCloses = closes.filter((c): c is number => c != null && !isNaN(c));
  const yearHigh = safeNumber(meta.fiftyTwoWeekHigh, allCloses.length > 0 ? Math.max(...allCloses) : 0);
  const yearLow = safeNumber(meta.fiftyTwoWeekLow, allCloses.length > 0 ? Math.min(...allCloses) : 0);

  const shortName = safeString(meta.shortName ?? meta.symbol, requestedSymbol.replace('.NS', ''));
  const longName = safeString(meta.longName, shortName);

  const quote: QuoteData = {
    symbol: safeString(meta.symbol, requestedSymbol),
    shortName,
    longName,
    regularMarketPrice,
    regularMarketChange: change,
    regularMarketChangePercent: changePercent,
    regularMarketVolume: safeNumber(meta.regularMarketVolume, safeNumber(lastValidVolume)),
    regularMarketDayHigh: safeNumber(meta.regularMarketDayHigh, safeNumber(lastValidHigh)),
    regularMarketDayLow: safeNumber(meta.regularMarketDayLow, safeNumber(lastValidLow)),
    regularMarketOpen: safeNumber(meta.regularMarketOpen, safeNumber(lastValidOpen)),
    regularMarketPreviousClose: previousClose,
    fiftyTwoWeekHigh: yearHigh,
    fiftyTwoWeekLow: yearLow,
    marketCap: safeNumber(meta.marketCap),
    trailingPE: 0,
    forwardPE: 0,
    priceToBook: 0,
    debtToEquity: 0,
    returnOnEquity: 0,
    earningsGrowth: 0,
    trailingEps: 0,
    currency: safeString(meta.currency, 'INR'),
    exchange: safeString(meta.exchangeName, safeString(meta.fullExchangeName, 'NSI')),
  };

  return { quote, chart };
}

async function fetchFundamentals(symbol: string, quote: QuoteData): Promise<Partial<QuoteData>> {
  const modules = 'summaryDetail,defaultKeyStatistics,financialData';
  const url = `/api/fundamentals?symbol=${encodeURIComponent(symbol)}&modules=${modules}`;

  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return {};
    const raw = await res.json();
    const result = raw?.quoteSummary?.result?.[0] ?? {};
    const sd = result.summaryDetail ?? {};
    const dk = result.defaultKeyStatistics ?? {};
    const fd = result.financialData ?? {};

    return {
      trailingPE: safeNumber(sd.trailingPE?.raw ?? sd.trailingPE),
      forwardPE: safeNumber(sd.forwardPE?.raw ?? sd.forwardPE),
      priceToBook: safeNumber(dk.priceToBook?.raw ?? dk.priceToBook),
      debtToEquity: safeNumber(fd.debtToEquity?.raw ?? fd.debtToEquity),
      returnOnEquity: safeNumber(fd.returnOnEquity?.raw ?? fd.returnOnEquity),
      earningsGrowth: safeNumber(fd.earningsGrowth?.raw ?? dk.earningsGrowth?.raw),
      trailingEps: safeNumber(dk.trailingEps?.raw ?? dk.trailingEps),
      marketCap: quote.marketCap || safeNumber(sd.marketCap?.raw ?? sd.marketCap),
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || safeNumber(sd.fiftyTwoWeekHigh?.raw ?? sd.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow || safeNumber(sd.fiftyTwoWeekLow?.raw ?? sd.fiftyTwoWeekLow),
    };
  } catch {
    return {};
  }
}

async function fetchNews(symbol: string): Promise<NewsItem[]> {
  const url = `/api/search?q=${encodeURIComponent(symbol.replace('.NS', '').replace('.BO', ''))}&newsCount=12&quotesCount=0`;

  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return [];
    const raw = await res.json();
    const items = raw?.news ?? [];
    if (!Array.isArray(items)) return [];

    const positiveWords = ['surge', 'jump', 'gain', 'profit', 'record', 'high', 'approve', 'acquire', 'boost', 'rally', 'upgrade', 'beat', 'rise', 'up', 'growth'];
    const negativeWords = ['fall', 'drop', 'loss', 'decline', 'miss', 'low', 'cut', 'sell', 'downgrade', 'debt', 'probe', 'fraud', 'plunge', 'crash', 'down', 'slide'];

    return items.slice(0, 12).map((item: any) => {
      const title = safeString(item?.title, 'Untitled');
      const lower = title.toLowerCase();
      let sentiment: NewsItem['sentiment'] = 'neutral';
      const posHits = positiveWords.filter((w) => lower.includes(w)).length;
      const negHits = negativeWords.filter((w) => lower.includes(w)).length;
      if (posHits > negHits) sentiment = 'positive';
      else if (negHits > posHits) sentiment = 'negative';
      return {
        title,
        publisher: safeString(item?.publisher, 'Yahoo Finance'),
        link: safeString(item?.link, '#'),
        providerPublishTime: safeNumber(item?.providerPublishTime, Date.now() / 1000),
        sentiment,
        type: safeString(item?.type, 'Article'),
      };
    });
  } catch {
    return [];
  }
}

export async function fetchStockAnalysis(symbol: string): Promise<StockAnalysis> {
  const nsSymbol = normalizeSymbol(symbol);

  // 1. Fetch chart data (1-year daily) — primary data source
  const chartUrl = `/api/stock?symbol=${encodeURIComponent(nsSymbol)}&range=1y&interval=1d`;
  const chartRes = await fetch(chartUrl, { method: 'GET' });
  if (!chartRes.ok) {
    throw new Error(`Data fetch failed (${chartRes.status}). The server may be temporarily unavailable.`);
  }
  const chartRaw = await chartRes.json();
  const { quote, chart } = parseChartResponse(chartRaw, nsSymbol);

  if (quote.regularMarketPrice === 0 && chart.length === 0) {
    throw new Error(`No data returned for "${symbol}". Verify the ticker is a valid NSE/BSE stock (e.g. RELIANCE, TCS, INFY).`);
  }

  // 2. Fetch fundamentals — optional, non-blocking
  const fundamentals = await fetchFundamentals(nsSymbol, quote);
  const fullQuote: QuoteData = { ...quote, ...fundamentals };

  // 3. Fetch news — optional
  const news = await fetchNews(nsSymbol);

  // 4. Compute technical indicators, forecast, and reasoning
  const indicators = computeTechnicalIndicators(fullQuote, chart);
  const forecast = generateForecast(fullQuote, indicators);
  const reasoning = generateReasoning(fullQuote, indicators, forecast);

  return { quote: fullQuote, chart, indicators, forecast, reasoning, news };
}

// ─── Symbol Search ───────────────────────────────────────────────

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const url = `/api/search?q=${encodeURIComponent(query)}&quotesCount=25&newsCount=0`;

  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return [];
    const raw = await res.json();
    const quotes = raw?.quotes ?? [];
    if (!Array.isArray(quotes)) return [];

    // Accept international exchanges: India (.NS, .BO), US (no suffix), UK (.L), Japan (.T), Hong Kong (.HK), Europe (.PA, .DE, .SW), Canada (.TO)
    return quotes
      .filter((q: any) => {
        const sym = safeString(q?.symbol, '');
        const exch = safeString(q?.exchange, '');
        const isValidExchange =
          sym.endsWith('.NS') || sym.endsWith('.BO') ||
          sym.startsWith('^') || // indices like ^DJI, ^GSPC
          sym.endsWith('.L') || // London
          sym.endsWith('.T') || // Tokyo
          sym.endsWith('.HK') || // Hong Kong
          sym.endsWith('.PA') || sym.endsWith('.DE') || sym.endsWith('.SW') || // Europe
          sym.endsWith('.TO') || // Toronto
          exch.includes('NSI') || exch.includes('BSE') ||
          exch.includes('NMS') || exch.includes('NYQ') || exch.includes('NAS') || // US exchanges
          exch.includes('LSE') || // London
          exch.includes('JPX') || exch.includes('TSE') || // Japan
          exch.includes('HKG') || // Hong Kong
          exch.includes('PAR') || exch.includes('GER') || exch.includes('SWX') || // Europe
          exch.includes('TOR'); // Toronto
        // Also accept US stocks without suffix (typically short alphanumeric symbols)
        const isLikelyUS = /^[A-Z]{1,5}$/.test(sym) && !sym.includes('.');
        return isValidExchange || isLikelyUS;
      })
      .map((q: any) => ({
        symbol: safeString(q?.symbol),
        name: safeString(q?.shortname ?? q?.longname, safeString(q?.symbol)),
        exchange: safeString(q?.exchange, safeString(q?.exchDisp)),
        type: safeString(q?.quoteType, 'EQUITY'),
      }))
      .slice(0, 15);
  } catch {
    return [];
  }
}

// ─── Index / Movers Ticker ──────────────────────────────────────

export interface IndexQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  country?: string;
  flag?: string;
}

const INDEX_SYMBOLS = [
  // India
  { symbol: '^NSEI', name: 'NIFTY 50', country: 'India' },
  { symbol: '^BSESN', name: 'SENSEX', country: 'India' },
  { symbol: '^NSEBANK', name: 'NIFTY BANK', country: 'India' },
  { symbol: 'RELIANCE.NS', name: 'RELIANCE', country: 'India' },
  { symbol: 'TCS.NS', name: 'TCS', country: 'India' },
  { symbol: 'INFY.NS', name: 'INFY', country: 'India' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC BANK', country: 'India' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI BANK', country: 'India' },
  { symbol: 'SBIN.NS', name: 'SBI', country: 'India' },
  { symbol: 'ITC.NS', name: 'ITC', country: 'India' },
];

// Global Indices for Market Overview
export const GLOBAL_INDICES = [
  { symbol: '^NSEI', name: 'NIFTY 50', country: 'India', flag: '🇮🇳' },
  { symbol: '^BSESN', name: 'SENSEX', country: 'India', flag: '🇮🇳' },
  { symbol: '^GSPC', name: 'S&P 500', country: 'USA', flag: '🇺🇸' },
  { symbol: '^DJI', name: 'DOW JONES', country: 'USA', flag: '🇺🇸' },
  { symbol: '^IXIC', name: 'NASDAQ', country: 'USA', flag: '🇺🇸' },
  { symbol: '^FTSE', name: 'FTSE 100', country: 'UK', flag: '🇬🇧' },
  { symbol: '^N225', name: 'NIKKEI 225', country: 'Japan', flag: '🇯🇵' },
  { symbol: '^HSI', name: 'HANG SENG', country: 'Hong Kong', flag: '🇭🇰' },
  { symbol: '^FCHI', name: 'CAC 40', country: 'France', flag: '🇫🇷' },
  { symbol: '^GDAXI', name: 'DAX', country: 'Germany', flag: '🇩🇪' },
  { symbol: '^AXJO', name: 'ASX 200', country: 'Australia', flag: '🇦🇺' },
  { symbol: '^KS11', name: 'KOSPI', country: 'South Korea', flag: '🇰🇷' },
];

// Popular international stocks - Expanded list with Anand Rathi and more
export const TRENDING_STOCKS = [
  // ========== USA - Tech Giants ==========
  { symbol: 'AAPL', name: 'Apple Inc.', country: 'USA' },
  { symbol: 'MSFT', name: 'Microsoft', country: 'USA' },
  { symbol: 'GOOGL', name: 'Alphabet (Google)', country: 'USA' },
  { symbol: 'AMZN', name: 'Amazon', country: 'USA' },
  { symbol: 'NVDA', name: 'NVIDIA', country: 'USA' },
  { symbol: 'TSLA', name: 'Tesla', country: 'USA' },
  { symbol: 'META', name: 'Meta (Facebook)', country: 'USA' },
  { symbol: 'AMD', name: 'AMD', country: 'USA' },
  { symbol: 'NFLX', name: 'Netflix', country: 'USA' },
  { symbol: 'CRM', name: 'Salesforce', country: 'USA' },
  { symbol: 'ORCL', name: 'Oracle', country: 'USA' },
  { symbol: 'INTC', name: 'Intel', country: 'USA' },
  { symbol: 'CSCO', name: 'Cisco', country: 'USA' },
  { symbol: 'ADBE', name: 'Adobe', country: 'USA' },
  { symbol: 'PYPL', name: 'PayPal', country: 'USA' },
  // ========== USA - Finance ==========
  { symbol: 'JPM', name: 'JPMorgan Chase', country: 'USA' },
  { symbol: 'BAC', name: 'Bank of America', country: 'USA' },
  { symbol: 'WFC', name: 'Wells Fargo', country: 'USA' },
  { symbol: 'GS', name: 'Goldman Sachs', country: 'USA' },
  { symbol: 'MS', name: 'Morgan Stanley', country: 'USA' },
  { symbol: 'V', name: 'Visa', country: 'USA' },
  { symbol: 'MA', name: 'Mastercard', country: 'USA' },
  { symbol: 'AXP', name: 'American Express', country: 'USA' },
  { symbol: 'BLK', name: 'BlackRock', country: 'USA' },
  // ========== USA - Healthcare ==========
  { symbol: 'JNJ', name: 'Johnson & Johnson', country: 'USA' },
  { symbol: 'UNH', name: 'UnitedHealth', country: 'USA' },
  { symbol: 'PFE', name: 'Pfizer', country: 'USA' },
  { symbol: 'MRK', name: 'Merck', country: 'USA' },
  { symbol: 'ABBV', name: 'AbbVie', country: 'USA' },
  { symbol: 'LLY', name: 'Eli Lilly', country: 'USA' },
  { symbol: 'MRNA', name: 'Moderna', country: 'USA' },
  // ========== USA - Retail & Consumer ==========
  { symbol: 'WMT', name: 'Walmart', country: 'USA' },
  { symbol: 'COST', name: 'Costco', country: 'USA' },
  { symbol: 'TGT', name: 'Target', country: 'USA' },
  { symbol: 'HD', name: 'Home Depot', country: 'USA' },
  { symbol: 'NKE', name: 'Nike', country: 'USA' },
  { symbol: 'KO', name: 'Coca-Cola', country: 'USA' },
  { symbol: 'PEP', name: 'PepsiCo', country: 'USA' },
  { symbol: 'MCD', name: "McDonald's", country: 'USA' },
  { symbol: 'SBUX', name: 'Starbucks', country: 'USA' },
  { symbol: 'DIS', name: 'Disney', country: 'USA' },
  // ========== USA - Energy & Industrial ==========
  { symbol: 'XOM', name: 'ExxonMobil', country: 'USA' },
  { symbol: 'CVX', name: 'Chevron', country: 'USA' },
  { symbol: 'BA', name: 'Boeing', country: 'USA' },
  { symbol: 'CAT', name: 'Caterpillar', country: 'USA' },
  { symbol: 'GE', name: 'General Electric', country: 'USA' },
  { symbol: 'HON', name: 'Honeywell', country: 'USA' },

  // ========== INDIA - Nifty 50 Blue Chips ==========
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', country: 'India' },
  { symbol: 'TCS.NS', name: 'TCS', country: 'India' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', country: 'India' },
  { symbol: 'INFY.NS', name: 'Infosys', country: 'India' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel', country: 'India' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank', country: 'India' },
  { symbol: 'SBIN.NS', name: 'State Bank of India', country: 'India' },
  { symbol: 'ITC.NS', name: 'ITC Ltd.', country: 'India' },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Bank', country: 'India' },
  { symbol: 'LT.NS', name: 'Larsen & Toubro', country: 'India' },
  { symbol: 'AXISBANK.NS', name: 'Axis Bank', country: 'India' },
  // ========== INDIA - Auto ==========
  { symbol: 'MARUTI.NS', name: 'Maruti Suzuki', country: 'India' },
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors', country: 'India' },
  { symbol: 'M&M.NS', name: 'Mahindra & Mahindra', country: 'India' },
  { symbol: 'BAJAJ-AUTO.NS', name: 'Bajaj Auto', country: 'India' },
  { symbol: 'HEROMOTOCO.NS', name: 'Hero MotoCorp', country: 'India' },
  { symbol: 'EICHERMOT.NS', name: 'Eicher Motors', country: 'India' },
  // ========== INDIA - IT Services ==========
  { symbol: 'WIPRO.NS', name: 'Wipro', country: 'India' },
  { symbol: 'HCLTECH.NS', name: 'HCL Technologies', country: 'India' },
  { symbol: 'TECHM.NS', name: 'Tech Mahindra', country: 'India' },
  { symbol: 'LTIM.NS', name: 'LTIMindtree', country: 'India' },
  { symbol: 'COFORGE.NS', name: 'Coforge', country: 'India' },
  { symbol: 'PERSISTENT.NS', name: 'Persistent Systems', country: 'India' },
  // ========== INDIA - Pharma ==========
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharma', country: 'India' },
  { symbol: 'DRREDDY.NS', name: "Dr. Reddy's Labs", country: 'India' },
  { symbol: 'CIPLA.NS', name: 'Cipla', country: 'India' },
  { symbol: 'LUPIN.NS', name: 'Lupin', country: 'India' },
  { symbol: 'BIOCON.NS', name: 'Biocon', country: 'India' },
  { symbol: 'DIVISLAB.NS', name: 'Divis Labs', country: 'India' },
  // ========== INDIA - Metals & Mining ==========
  { symbol: 'TATASTEEL.NS', name: 'Tata Steel', country: 'India' },
  { symbol: 'HINDALCO.NS', name: 'Hindalco', country: 'India' },
  { symbol: 'JSWSTEEL.NS', name: 'JSW Steel', country: 'India' },
  { symbol: 'COALINDIA.NS', name: 'Coal India', country: 'India' },
  { symbol: 'VEDL.NS', name: 'Vedanta', country: 'India' },
  // ========== INDIA - Energy & Power ==========
  { symbol: 'NTPC.NS', name: 'NTPC', country: 'India' },
  { symbol: 'POWERGRID.NS', name: 'Power Grid Corp', country: 'India' },
  { symbol: 'ONGC.NS', name: 'ONGC', country: 'India' },
  { symbol: 'BPCL.NS', name: 'BPCL', country: 'India' },
  { symbol: 'GAIL.NS', name: 'GAIL', country: 'India' },
  // ========== INDIA - Finance ==========
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance', country: 'India' },
  { symbol: 'BAJAJFINSV.NS', name: 'Bajaj Finserv', country: 'India' },
  { symbol: 'HDFC.NS', name: 'HDFC Ltd', country: 'India' },
  { symbol: 'PIDILITIND.NS', name: 'Pidilite Industries', country: 'India' },
  // ========== INDIA - FMCG & Consumer ==========
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever', country: 'India' },
  { symbol: 'ASIANPAINT.NS', name: 'Asian Paints', country: 'India' },
  { symbol: 'NESTLEIND.NS', name: 'Nestle India', country: 'India' },
  { symbol: 'BRITANNIA.NS', name: 'Britannia', country: 'India' },
  { symbol: 'DABUR.NS', name: 'Dabur India', country: 'India' },
  { symbol: 'MARICO.NS', name: 'Marico', country: 'India' },
  { symbol: 'GODREJCP.NS', name: 'Godrej Consumer', country: 'India' },
  // ========== INDIA - Cement ==========
  { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement', country: 'India' },
  { symbol: 'SHREECEM.NS', name: 'Shree Cement', country: 'India' },
  { symbol: 'AMBUJACEM.NS', name: 'Ambuja Cement', country: 'India' },
  { symbol: 'ACC.NS', name: 'ACC', country: 'India' },
  // ========== INDIA - Retail & Services ==========
  { symbol: 'DMART.NS', name: 'Avenue Supermarts (DMart)', country: 'India' },
  { symbol: 'TRENT.NS', name: 'Trent Ltd', country: 'India' },
  { symbol: 'INDIGO.NS', name: 'InterGlobe Aviation', country: 'India' },
  // ========== INDIA - New Age/Digital ==========
  { symbol: 'ZOMATO.NS', name: 'Zomato', country: 'India' },
  { symbol: 'PAYTM.NS', name: 'Paytm (One97)', country: 'India' },
  { symbol: 'NYKAA.NS', name: 'FSN E-Commerce (Nykaa)', country: 'India' },
  { symbol: 'POLICYBZR.NS', name: 'PolicyBazaar', country: 'India' },
  // ========== INDIA - Wealth & Broking ==========
  { symbol: 'ANANDRATHI.NS', name: 'Anand Rathi Wealth', country: 'India' },
  { symbol: 'MOTILALOFS.NS', name: 'Motilal Oswal', country: 'India' },
  { symbol: 'Angelone.NS', name: 'Angel One', country: 'India' },
  { symbol: 'GROWW.NS', name: 'Groww', country: 'India' },
  // ========== INDIA - Adani Group ==========
  { symbol: 'ADANIENT.NS', name: 'Adani Enterprises', country: 'India' },
  { symbol: 'ADANIPORTS.NS', name: 'Adani Ports', country: 'India' },
  { symbol: 'ADANIGREEN.NS', name: 'Adani Green Energy', country: 'India' },
  { symbol: 'ADANITOTAL.NS', name: 'Adani Total Gas', country: 'India' },
  { symbol: 'ADANIPOWER.NS', name: 'Adani Power', country: 'India' },
  // ========== INDIA - Midcap/Smallcap Picks ==========
  { symbol: 'TATAELXSI.NS', name: 'Tata Elxsi', country: 'India' },
  { symbol: 'ABCAPITAL.NS', name: 'Aditya Birla Capital', country: 'India' },
  { symbol: 'APOLLOHOSP.NS', name: 'Apollo Hospitals', country: 'India' },
  { symbol: 'BANDHANBNK.NS', name: 'Bandhan Bank', country: 'India' },
  { symbol: 'CHOLAFIN.NS', name: 'Cholamandalam Finance', country: 'India' },
  { symbol: 'DEEPAKNTR.NS', name: 'Deepak Nitrite', country: 'India' },
  { symbol: 'GODREJPROP.NS', name: 'Godrej Properties', country: 'India' },
  { symbol: 'HINDPETRO.NS', name: 'Hindustan Petroleum', country: 'India' },
  { symbol: 'PIIND.NS', name: 'PI Industries', country: 'India' },
  { symbol: 'SRF.NS', name: 'SRF Ltd', country: 'India' },

  // ========== UK ==========
  { symbol: 'SHEL.L', name: 'Shell', country: 'UK' },
  { symbol: 'HSBA.L', name: 'HSBC', country: 'UK' },
  { symbol: 'BP.L', name: 'BP', country: 'UK' },
  { symbol: 'VOD.L', name: 'Vodafone', country: 'UK' },
  { symbol: 'GSK.L', name: 'GSK', country: 'UK' },
  { symbol: 'AZN.L', name: 'AstraZeneca', country: 'UK' },
  { symbol: 'RIO.L', name: 'Rio Tinto', country: 'UK' },
  { symbol: 'BHP.L', name: 'BHP Group', country: 'UK' },
  { symbol: 'ULVR.L', name: 'Unilever', country: 'UK' },
  { symbol: 'DGE.L', name: 'Diageo', country: 'UK' },
  { symbol: 'NG.L', name: 'National Grid', country: 'UK' },
  { symbol: 'TSCO.L', name: 'Tesco', country: 'UK' },

  // ========== Japan ==========
  { symbol: '7203.T', name: 'Toyota Motor', country: 'Japan' },
  { symbol: '6758.T', name: 'Sony Group', country: 'Japan' },
  { symbol: '9984.T', name: 'SoftBank Group', country: 'Japan' },
  { symbol: '6702.T', name: 'Fujitsu', country: 'Japan' },
  { symbol: '4519.T', name: 'Chugai Pharma', country: 'Japan' },
  { symbol: '6501.T', name: 'Hitachi', country: 'Japan' },
  { symbol: '6752.T', name: 'Panasonic', country: 'Japan' },
  { symbol: '8306.T', name: 'Mitsubishi UFJ', country: 'Japan' },
  { symbol: '8411.T', name: 'Mizuho Financial', country: 'Japan' },
  { symbol: '4502.T', name: 'Takeda Pharma', country: 'Japan' },
  { symbol: '6861.T', name: 'Keyence', country: 'Japan' },
  { symbol: '8035.T', name: 'Tokyo Electron', country: 'Japan' },

  // ========== Hong Kong ==========
  { symbol: '0700.HK', name: 'Tencent', country: 'Hong Kong' },
  { symbol: '9988.HK', name: 'Alibaba', country: 'Hong Kong' },
  { symbol: '3690.HK', name: 'Meituan', country: 'Hong Kong' },
  { symbol: '1810.HK', name: 'Xiaomi', country: 'Hong Kong' },
  { symbol: '0941.HK', name: 'China Mobile', country: 'Hong Kong' },
  { symbol: '1299.HK', name: 'AIA Group', country: 'Hong Kong' },
  { symbol: '2318.HK', name: 'Ping An Insurance', country: 'Hong Kong' },
  { symbol: '0939.HK', name: 'CCB', country: 'Hong Kong' },
  { symbol: '1398.HK', name: 'ICBC', country: 'Hong Kong' },
  { symbol: '3988.HK', name: 'Bank of China', country: 'Hong Kong' },
  { symbol: '0883.HK', name: 'CNOOC', country: 'Hong Kong' },

  // ========== Germany ==========
  { symbol: 'SAP.DE', name: 'SAP SE', country: 'Germany' },
  { symbol: 'SIE.DE', name: 'Siemens', country: 'Germany' },
  { symbol: 'VOW3.DE', name: 'Volkswagen', country: 'Germany' },
  { symbol: 'BMW.DE', name: 'BMW', country: 'Germany' },
  { symbol: 'DTE.DE', name: 'Deutsche Telekom', country: 'Germany' },
  { symbol: 'ALLIANZ.DE', name: 'Allianz', country: 'Germany' },
  { symbol: 'BAS.DE', name: 'BASF', country: 'Germany' },
  { symbol: 'BAYN.DE', name: 'Bayer', country: 'Germany' },
  { symbol: 'MUV2.DE', name: 'Munich Re', country: 'Germany' },

  // ========== France ==========
  { symbol: 'MC.PA', name: 'LVMH', country: 'France' },
  { symbol: 'OR.PA', name: "L'Oreal", country: 'France' },
  { symbol: 'TTE.PA', name: 'TotalEnergies', country: 'France' },
  { symbol: 'AIR.PA', name: 'Airbus', country: 'France' },
  { symbol: 'SAN.PA', name: 'Sanofi', country: 'France' },
  { symbol: 'BNP.PA', name: 'BNP Paribas', country: 'France' },

  // ========== Netherlands ==========
  { symbol: 'ASML.AS', name: 'ASML Holding', country: 'Netherlands' },
  { symbol: 'HEIA.AS', name: 'Heineken', country: 'Netherlands' },
  { symbol: 'INGA.AS', name: 'ING Group', country: 'Netherlands' },
  { symbol: 'PHIA.AS', name: 'Philips', country: 'Netherlands' },

  // ========== Switzerland ==========
  { symbol: 'NESN.SW', name: 'Nestle', country: 'Switzerland' },
  { symbol: 'ROG.SW', name: 'Roche', country: 'Switzerland' },
  { symbol: 'NOVN.SW', name: 'Novartis', country: 'Switzerland' },
  { symbol: 'UBSG.SW', name: 'UBS Group', country: 'Switzerland' },

  // ========== Canada ==========
  { symbol: 'SHOP.TO', name: 'Shopify', country: 'Canada' },
  { symbol: 'RY.TO', name: 'RBC', country: 'Canada' },
  { symbol: 'TD.TO', name: 'TD Bank', country: 'Canada' },
  { symbol: 'BMO.TO', name: 'BMO', country: 'Canada' },
  { symbol: 'CNQ.TO', name: 'Canadian Natural', country: 'Canada' },
  { symbol: 'SU.TO', name: 'Suncor Energy', country: 'Canada' },

  // ========== Australia ==========
  { symbol: 'BHP.AX', name: 'BHP Group', country: 'Australia' },
  { symbol: 'CBA.AX', name: 'CommBank', country: 'Australia' },
  { symbol: 'ANZ.AX', name: 'ANZ Bank', country: 'Australia' },
  { symbol: 'WBC.AX', name: 'Westpac', country: 'Australia' },
  { symbol: 'NAB.AX', name: 'NAB', country: 'Australia' },
  { symbol: 'CSL.AX', name: 'CSL Ltd', country: 'Australia' },
  { symbol: 'RIO.AX', name: 'Rio Tinto', country: 'Australia' },

  // ========== South Korea ==========
  { symbol: '005930.KS', name: 'Samsung Electronics', country: 'South Korea' },
  { symbol: '000660.KS', name: 'SK Hynix', country: 'South Korea' },
  { symbol: '035420.KS', name: 'NAVER', country: 'South Korea' },
  { symbol: '005935.KS', name: 'Samsung Preferred', country: 'South Korea' },
  { symbol: '035720.KS', name: 'Kakao Corp', country: 'South Korea' },
  { symbol: '207940.KS', name: 'Samsung Biologics', country: 'South Korea' },

  // ========== Brazil ==========
  { symbol: 'PETR4.SA', name: 'Petrobras', country: 'Brazil' },
  { symbol: 'VALE3.SA', name: 'Vale', country: 'Brazil' },
  { symbol: 'ITUB4.SA', name: 'Itau Unibanco', country: 'Brazil' },
  { symbol: 'ABEV3.SA', name: 'Ambev', country: 'Brazil' },

  // ========== China ADRs (US Listed) ==========
  { symbol: 'BABA', name: 'Alibaba (ADR)', country: 'China' },
  { symbol: 'JD', name: 'JD.com (ADR)', country: 'China' },
  { symbol: 'PDD', name: 'PDD Holdings', country: 'China' },
  { symbol: 'BIDU', name: 'Baidu (ADR)', country: 'China' },
  { symbol: 'NIO', name: 'NIO (ADR)', country: 'China' },
  { symbol: 'BILI', name: 'Bilibili (ADR)', country: 'China' },
  { symbol: 'LI', name: 'Li Auto (ADR)', country: 'China' },
  { symbol: 'XPEV', name: 'XPeng (ADR)', country: 'China' },
  { symbol: 'TME', name: 'Tencent Music (ADR)', country: 'China' },
  { symbol: 'NTES', name: 'NetEase (ADR)', country: 'China' },

  // ========== Taiwan ==========
  { symbol: '2330.TW', name: 'TSMC', country: 'Taiwan' },
  { symbol: '2454.TW', name: 'MediaTek', country: 'Taiwan' },
  { symbol: '2308.TW', name: 'Foxconn', country: 'Taiwan' },

  // ========== Singapore ==========
  { symbol: 'D05.SI', name: 'DBS Group', country: 'Singapore' },
  { symbol: 'O39.SI', name: 'OCBC Bank', country: 'Singapore' },
  { symbol: 'U11.SI', name: 'UOB', country: 'Singapore' },

  // ========== Spain ==========
  { symbol: 'SAN.MC', name: 'Santander', country: 'Spain' },
  { symbol: 'BBVA.MC', name: 'BBVA', country: 'Spain' },
  { symbol: 'ITX.MC', name: 'Inditex (Zara)', country: 'Spain' },
  { symbol: 'IBE.MC', name: 'Iberdrola', country: 'Spain' },

  // ========== Italy ==========
  { symbol: 'ENI.MI', name: 'Eni', country: 'Italy' },
  { symbol: 'ISP.MI', name: 'Intesa Sanpaolo', country: 'Italy' },
  { symbol: 'FERRARI.MI', name: 'Ferrari', country: 'Italy' },

  // ========== Sweden ==========
  { symbol: 'VOLV-B.ST', name: 'Volvo', country: 'Sweden' },
  { symbol: 'ERIC-B.ST', name: 'Ericsson', country: 'Sweden' },

  // ========== India - Additional Sectors ==========
  { symbol: 'IRCTC.NS', name: 'IRCTC', country: 'India' },
  { symbol: 'INDUSINDBK.NS', name: 'IndusInd Bank', country: 'India' },
  { symbol: 'MOTHERSON.NS', name: 'Motherson Sumi', country: 'India' },
  { symbol: 'BALKRISIND.NS', name: 'Balkrishna Industries', country: 'India' },
  { symbol: 'MUTHOOTFIN.NS', name: 'Muthoot Finance', country: 'India' },
  { symbol: 'MPHASIS.NS', name: 'Mphasis', country: 'India' },
  { symbol: 'OFSS.NS', name: 'Oracle Fin Services', country: 'India' },
  { symbol: 'POLYCAB.NS', name: 'Polycab India', country: 'India' },
  { symbol: 'BEL.NS', name: 'Bharat Electronics', country: 'India' },
  { symbol: 'HAL.NS', name: 'Hindustan Aeronautics', country: 'India' },
  { symbol: 'INDHOTEL.NS', name: 'Indian Hotels', country: 'India' },
  { symbol: 'JUBLFOOD.NS', name: 'Jubilant FoodWorks', country: 'India' },
  { symbol: 'PGHH.NS', name: 'PG Health & Hygiene', country: 'India' },
  { symbol: 'COLPAL.NS', name: 'Colgate Palmolive', country: 'India' },
  { symbol: 'SIEMENS.NS', name: 'Siemens India', country: 'India' },
  { symbol: 'ABB.NS', name: 'ABB India', country: 'India' },
  { symbol: 'PFC.NS', name: 'Power Finance Corp', country: 'India' },
  { symbol: 'RECLTD.NS', name: 'REC Limited', country: 'India' },
  { symbol: 'CONCOR.NS', name: 'Container Corp', country: 'India' },
  { symbol: 'NAVINFLUOR.NS', name: 'Navin Fluorine', country: 'India' },
  { symbol: 'BALRAMCHIN.NS', name: 'Balrampur Chini', country: 'India' },
  { symbol: 'EIHOTEL.NS', name: 'EIH Hotels (Oberoi)', country: 'India' },
  { symbol: 'MAXHEALTH.NS', name: 'Max Healthcare', country: 'India' },
  { symbol: 'LALPATHLAB.NS', name: 'Dr Lal PathLabs', country: 'India' },
  { symbol: 'METROPOLIS.NS', name: 'Metropolis Healthcare', country: 'India' },

  // ========== USA - Additional ==========
  { symbol: 'UBER', name: 'Uber', country: 'USA' },
  { symbol: 'LYFT', name: 'Lyft', country: 'USA' },
  { symbol: 'ABNB', name: 'Airbnb', country: 'USA' },
  { symbol: 'SQ', name: 'Block (Square)', country: 'USA' },
  { symbol: 'SHOP', name: 'Shopify (US)', country: 'USA' },
  { symbol: 'SNOW', name: 'Snowflake', country: 'USA' },
  { symbol: 'PLTR', name: 'Palantir', country: 'USA' },
  { symbol: 'COIN', name: 'Coinbase', country: 'USA' },
  { symbol: 'RBLX', name: 'Roblox', country: 'USA' },
  { symbol: 'U', name: 'Unity Software', country: 'USA' },
  { symbol: 'F', name: 'Ford Motor', country: 'USA' },
  { symbol: 'GM', name: 'General Motors', country: 'USA' },
  { symbol: 'RIVN', name: 'Rivian', country: 'USA' },
  { symbol: 'LCID', name: 'Lucid Motors', country: 'USA' },
  { symbol: 'SOFI', name: 'SoFi Technologies', country: 'USA' },
  { symbol: 'DKNG', name: 'DraftKings', country: 'USA' },
  { symbol: 'ETSY', name: 'Etsy', country: 'USA' },
  { symbol: 'ZM', name: 'Zoom Video', country: 'USA' },
  { symbol: 'DOCU', name: 'DocuSign', country: 'USA' },
  { symbol: 'WDAY', name: 'Workday', country: 'USA' },
  { symbol: 'NOW', name: 'ServiceNow', country: 'USA' },
  { symbol: 'TEAM', name: 'Atlassian', country: 'USA' },
  { symbol: 'TWLO', name: 'Twilio', country: 'USA' },
  { symbol: 'SHOP', name: 'Shopify', country: 'USA' },
  { symbol: 'PLUG', name: 'Plug Power', country: 'USA' },
  { symbol: 'ENPH', name: 'Enphase Energy', country: 'USA' },
  { symbol: 'FSLR', name: 'First Solar', country: 'USA' },
  { symbol: 'RUN', name: 'Sunrun', country: 'USA' },
  { symbol: 'MU', name: 'Micron Technology', country: 'USA' },
  { symbol: 'NXPI', name: 'NXP Semiconductors', country: 'USA' },
  { symbol: 'ON', name: 'ON Semiconductor', country: 'USA' },
  { symbol: 'LRCX', name: 'Lam Research', country: 'USA' },
  { symbol: 'AMAT', name: 'Applied Materials', country: 'USA' },
  { symbol: 'KLAC', name: 'KLA Corp', country: 'USA' },
  { symbol: 'MRVL', name: 'Marvell Technology', country: 'USA' },
  { symbol: 'CRWD', name: 'CrowdStrike', country: 'USA' },
  { symbol: 'PANW', name: 'Palo Alto Networks', country: 'USA' },
  { symbol: 'FTNT', name: 'Fortinet', country: 'USA' },
  { symbol: 'ZS', name: 'Zscaler', country: 'USA' },
  { symbol: 'NET', name: 'Cloudflare', country: 'USA' },
  { symbol: 'DDOG', name: 'Datadog', country: 'USA' },
  { symbol: 'MDB', name: 'MongoDB', country: 'USA' },
  { symbol: 'ESTC', name: 'Elastic', country: 'USA' },
  { symbol: 'S', name: 'SentinelOne', country: 'USA' },
];

// Commodity/Asset prices
export const COMMODITY_SYMBOLS = [
  { symbol: 'GC=F', name: 'Gold', type: 'Commodity' },
  { symbol: 'SI=F', name: 'Silver', type: 'Commodity' },
  { symbol: 'CL=F', name: 'Crude Oil', type: 'Energy' },
  { symbol: 'NG=F', name: 'Natural Gas', type: 'Energy' },
  { symbol: 'BTC-USD', name: 'Bitcoin', type: 'Crypto' },
  { symbol: 'ETH-USD', name: 'Ethereum', type: 'Crypto' },
];

export async function fetchIndexQuotes(): Promise<IndexQuote[]> {
  const results: IndexQuote[] = [];

  await Promise.all(
    INDEX_SYMBOLS.map(async (idx) => {
      try {
        const url = `/api/stock?symbol=${encodeURIComponent(idx.symbol)}&range=5d&interval=1d`;
        const res = await fetch(url, { method: 'GET' });
        if (!res.ok) return;
        const raw = await res.json();
        const meta = raw?.chart?.result?.[0]?.meta ?? {};
        const price = safeNumber(meta.regularMarketPrice);
        const prevClose = safeNumber(meta.previousClose ?? meta.chartPreviousClose);
        const change = price > 0 && prevClose > 0 ? price - prevClose : 0;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
        if (price > 0) {
          results.push({ symbol: idx.symbol, name: idx.name, price, change, changePercent });
        }
      } catch {
        // individual index failures are non-fatal
      }
    })
  );

  return INDEX_SYMBOLS.map((idx) => results.find((r) => r.symbol === idx.symbol)).filter((r): r is IndexQuote => r !== undefined);
}

// Fetch global market indices
export async function fetchGlobalIndices(): Promise<IndexQuote[]> {
  const results: IndexQuote[] = [];

  await Promise.all(
    GLOBAL_INDICES.map(async (idx) => {
      try {
        const url = `/api/stock?symbol=${encodeURIComponent(idx.symbol)}&range=5d&interval=1d`;
        const res = await fetch(url, { method: 'GET' });
        if (!res.ok) return;
        const raw = await res.json();
        const meta = raw?.chart?.result?.[0]?.meta ?? {};
        const price = safeNumber(meta.regularMarketPrice);
        const prevClose = safeNumber(meta.previousClose ?? meta.chartPreviousClose);
        const change = price > 0 && prevClose > 0 ? price - prevClose : 0;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
        if (price > 0) {
          results.push({
            symbol: idx.symbol,
            name: idx.name,
            price,
            change,
            changePercent,
            country: idx.country,
            flag: idx.flag
          });
        }
      } catch {
        // individual failures are non-fatal
      }
    })
  );

  return GLOBAL_INDICES.map((idx) => results.find((r) => r.symbol === idx.symbol)).filter((r): r is IndexQuote => r !== undefined);
}

// Fetch trending stocks quotes
export async function fetchTrendingQuotes(): Promise<(IndexQuote & { country: string })[]> {
  const results: (IndexQuote & { country: string })[] = [];

  await Promise.all(
    TRENDING_STOCKS.map(async (stock) => {
      try {
        const url = `/api/stock?symbol=${encodeURIComponent(stock.symbol)}&range=5d&interval=1d`;
        const res = await fetch(url, { method: 'GET' });
        if (!res.ok) return;
        const raw = await res.json();
        const meta = raw?.chart?.result?.[0]?.meta ?? {};
        const price = safeNumber(meta.regularMarketPrice);
        const prevClose = safeNumber(meta.previousClose ?? meta.chartPreviousClose);
        const change = price > 0 && prevClose > 0 ? price - prevClose : 0;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
        if (price > 0) {
          results.push({
            symbol: stock.symbol,
            name: stock.name,
            price,
            change,
            changePercent,
            country: stock.country,
          });
        }
      } catch {
        // individual failures are non-fatal
      }
    })
  );

  // Sort by absolute change percent (most volatile first)
  return results.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
}

// Fetch commodity prices
export async function fetchCommodities(): Promise<(IndexQuote & { type: string })[]> {
  const results: (IndexQuote & { type: string })[] = [];

  await Promise.all(
    COMMODITY_SYMBOLS.map(async (commodity) => {
      try {
        const url = `/api/stock?symbol=${encodeURIComponent(commodity.symbol)}&range=5d&interval=1d`;
        const res = await fetch(url, { method: 'GET' });
        if (!res.ok) return;
        const raw = await res.json();
        const meta = raw?.chart?.result?.[0]?.meta ?? {};
        const price = safeNumber(meta.regularMarketPrice);
        const prevClose = safeNumber(meta.previousClose ?? meta.chartPreviousClose);
        const change = price > 0 && prevClose > 0 ? price - prevClose : 0;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
        if (price > 0) {
          results.push({
            symbol: commodity.symbol,
            name: commodity.name,
            price,
            change,
            changePercent,
            type: commodity.type,
          });
        }
      } catch {
        // individual failures are non-fatal
      }
    })
  );

  return COMMODITY_SYMBOLS.map((c) => results.find((r) => r.symbol === c.symbol)).filter((r): r is IndexQuote & { type: string } => r !== undefined);
}

// Get top gainers and losers from trending stocks
export async function fetchGainersLosers(): Promise<{ gainers: IndexQuote[]; losers: IndexQuote[] }> {
  const quotes = await fetchTrendingQuotes();

  const sorted = [...quotes].sort((a, b) => b.changePercent - a.changePercent);
  const gainers = sorted.filter(q => q.changePercent > 0).slice(0, 5);
  const losers = sorted.filter(q => q.changePercent < 0).slice(-5).reverse();

  return { gainers, losers };
}
