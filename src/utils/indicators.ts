import type { QuoteData, ChartPoint } from '../services/api';

export interface TechnicalIndicators {
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  dma50: number;
  dma200: number;
  priceVsDma50: 'above' | 'below' | 'near';
  priceVsDma200: 'above' | 'below' | 'near';
  volumeAvg20: number;
  volumeSpikePercent: number;
  dayRangePosition: number; // 0-100, where in the day's range the price sits
  volatility: number;
  momentumScore: number; // -100 to 100
}

function sma(values: number[], period: number): number {
  if (values.length < period) return values.reduce((a, b) => a + b, 0) / (values.length || 1);
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function ema(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const k = 2 / (period + 1);
  let emaVal = values[0];
  for (let i = 1; i < values.length; i++) {
    emaVal = values[i] * k + emaVal * (1 - k);
  }
  return emaVal;
}

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  const slice = closes.slice(-(period + 1));
  for (let i = 1; i < slice.length; i++) {
    const diff = slice[i] - slice[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calcMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  if (closes.length < 26) {
    return { macd: 0, signal: 0, histogram: 0 };
  }
  const ema12 = ema(closes.slice(-50), 12);
  const ema26 = ema(closes.slice(-50), 26);
  const macd = ema12 - ema26;

  // approximate signal line with EMA of recent MACD values
  const macdSeries: number[] = [];
  const window = Math.min(closes.length, 60);
  for (let i = window - 9; i >= 0; i--) {
    const sub = closes.slice(i, i + 26 + 9 > closes.length ? closes.length : i + 35);
    if (sub.length < 26) continue;
    const e12 = ema(sub.slice(-50), 12);
    const e26 = ema(sub.slice(-50), 26);
    macdSeries.push(e12 - e26);
  }
  const signal = macdSeries.length > 0 ? ema(macdSeries, 9) : macd;
  return { macd, signal, histogram: macd - signal };
}

function calcVolatility(closes: number[]): number {
  if (closes.length < 2) return 0;
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] !== 0) returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * 100;
}

export function computeTechnicalIndicators(quote: QuoteData, chart: ChartPoint[]): TechnicalIndicators {
  const closes = chart.length > 0 ? chart.map((c) => c.price) : [quote.regularMarketPreviousClose, quote.regularMarketPrice];
  const volumes = chart.length > 0 ? chart.map((c) => c.volume) : [quote.regularMarketVolume];

  const rsi = calcRSI(closes);
  const { macd, signal, histogram } = calcMACD(closes);
  const dma50 = sma(closes, Math.min(50, closes.length));
  const dma200 = sma(closes, Math.min(200, closes.length));

  const price = quote.regularMarketPrice || (closes.length > 0 ? closes[closes.length - 1] : 0);

  const diff50 = dma50 > 0 ? ((price - dma50) / dma50) * 100 : 0;
  const diff200 = dma200 > 0 ? ((price - dma200) / dma200) * 100 : 0;

  const priceVsDma50: TechnicalIndicators['priceVsDma50'] = Math.abs(diff50) < 1 ? 'near' : diff50 > 0 ? 'above' : 'below';
  const priceVsDma200: TechnicalIndicators['priceVsDma200'] = Math.abs(diff200) < 1 ? 'near' : diff200 > 0 ? 'above' : 'below';

  const volumeAvg20 = sma(volumes, Math.min(20, volumes.length));
  const volumeSpikePercent = volumeAvg20 > 0 ? ((quote.regularMarketVolume - volumeAvg20) / volumeAvg20) * 100 : 0;

  const dayRange = quote.regularMarketDayHigh - quote.regularMarketDayLow;
  const dayRangePosition = dayRange > 0 ? ((price - quote.regularMarketDayLow) / dayRange) * 100 : 50;

  const volatility = calcVolatility(closes);

  // Momentum score: weighted blend of RSI deviation, MACD direction, DMA position, volume spike
  const rsiScore = (rsi - 50) * 0.4;
  const macdScore = macd > signal ? Math.min(20, Math.abs(histogram) * 10) : -Math.min(20, Math.abs(histogram) * 10);
  const dmaScore = (priceVsDma50 === 'above' ? 15 : priceVsDma50 === 'below' ? -15 : 0) + (priceVsDma200 === 'above' ? 15 : priceVsDma200 === 'below' ? -15 : 0);
  const volScore = Math.max(-10, Math.min(10, volumeSpikePercent * 0.1));
  const momentumScore = Math.max(-100, Math.min(100, rsiScore + macdScore + dmaScore + volScore));

  return {
    rsi,
    macd,
    macdSignal: signal,
    macdHistogram: histogram,
    dma50,
    dma200,
    priceVsDma50,
    priceVsDma200,
    volumeAvg20,
    volumeSpikePercent,
    dayRangePosition,
    volatility,
    momentumScore,
  };
}
