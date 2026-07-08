import type { QuoteData } from '../services/api';
import type { TechnicalIndicators } from './indicators';

export type Recommendation = 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG SELL';

export interface HorizonForecast {
  label: string;
  range: string;
  recommendation: Recommendation;
  probability: number;
  confidence: number;
  targetPrice: number;
  expectedReturn: number;
  riskLevel: 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';
  priceScenarios: {
    bullish: number;
    base: number;
    bearish: number;
  };
  keyFactors: string[];
}

export interface Forecast {
  shortTerm: HorizonForecast;
  mediumTerm: HorizonForecast;
  longTerm: HorizonForecast;
  overall: Recommendation;
  overallProbability: number;
  investmentScore: number;
}

function classify(score: number): Recommendation {
  if (score >= 30) return 'STRONG BUY';
  if (score >= 15) return 'BUY';
  if (score <= -30) return 'STRONG SELL';
  if (score <= -15) return 'SELL';
  return 'HOLD';
}

function probabilityFromScore(score: number, base: number): number {
  const normalized = (score + 100) / 200;
  const prob = base + normalized * (95 - base);
  return Math.round(Math.max(45, Math.min(95, prob)));
}

function assessRisk(indicators: TechnicalIndicators, volatility: number): HorizonForecast['riskLevel'] {
  const riskFactors = [
    indicators.rsi > 70 || indicators.rsi < 30,
    Math.abs(indicators.macdHistogram) > 2,
    volatility > 3,
    Math.abs(indicators.volumeSpikePercent) > 50,
  ].filter(Boolean).length;

  if (riskFactors >= 3) return 'Very High';
  if (riskFactors >= 2) return 'High';
  if (riskFactors >= 1) return 'Medium';
  if (volatility > 1.5) return 'Low';
  return 'Very Low';
}

function generateKeyFactors(quote: QuoteData, indicators: TechnicalIndicators, score: number): string[] {
  const factors: string[] = [];

  // RSI factors
  if (indicators.rsi < 30) factors.push('RSI oversold - bounce likely');
  else if (indicators.rsi > 70) factors.push('RSI overbought - potential pullback');
  else if (indicators.rsi > 45 && indicators.rsi < 55) factors.push('RSI neutral - room to move');

  // MACD factors
  if (indicators.macdHistogram > 0 && indicators.macd > indicators.macdSignal) {
    factors.push('MACD bullish crossover active');
  } else if (indicators.macdHistogram < 0 && indicators.macd < indicators.macdSignal) {
    factors.push('MACD bearish crossover active');
  }

  // DMA factors
  if (indicators.priceVsDma50 === 'above' && indicators.priceVsDma200 === 'above') {
    factors.push('Price above both DMAs - strong trend');
  } else if (indicators.priceVsDma50 === 'below' && indicators.priceVsDma200 === 'below') {
    factors.push('Price below both DMAs - downtrend');
  }

  // Volume factors
  if (indicators.volumeSpikePercent > 30) {
    factors.push('High volume - strong conviction');
  } else if (indicators.volumeSpikePercent < -20) {
    factors.push('Low volume - weak conviction');
  }

  // Fundamentals
  if (quote.trailingPE > 0 && quote.trailingPE < 15) factors.push('P/E attractive - undervalued');
  else if (quote.trailingPE > 40) factors.push('P/E high - possibly overvalued');

  if (quote.returnOnEquity > 20) factors.push('Strong ROE - efficient company');
  else if (quote.returnOnEquity < 5) factors.push('Weak ROE - low profitability');

  return factors.length > 0 ? factors : ['Market forces in balance'];
}

export function generateForecast(quote: QuoteData, indicators: TechnicalIndicators): Forecast {
  const price = quote.regularMarketPrice || 0;
  const changePct = quote.regularMarketChangePercent || 0;
  const volatility = indicators.volatility || 2;

  // Enhanced scoring with multiple factors

  // Short-term (1-7 days): RSI momentum, intraday patterns, volume changes
  const shortTermScore =
    (indicators.rsi - 50) * 0.4 + // RSI deviation
    (indicators.macdHistogram > 0 ? 15 : -15) + // MACD momentum
    Math.max(-25, Math.min(25, changePct * 5)) + // Daily momentum
    Math.max(-10, Math.min(10, indicators.volumeSpikePercent * 0.1)) + // Volume conviction
    (indicators.dayRangePosition > 70 ? 8 : indicators.dayRangePosition < 30 ? -8 : 0); // Day range positioning

  // Medium-term (1-3 months): Trend structure, DMA alignment, momentum quality
  const mediumTermScore =
    (indicators.momentumScore * 0.45) + // Overall momentum
    (indicators.priceVsDma50 === 'above' ? 20 : indicators.priceVsDma50 === 'below' ? -20 : 0) +
    (indicators.macd > indicators.macdSignal ? 12 : -12) +
    (indicators.rsi > 50 && indicators.rsi < 70 ? 10 : indicators.rsi >= 70 ? -8 : -5) +
    (indicators.priceVsDma200 === 'above' ? 10 : -10);

  // Long-term (1 year+): Fundamental quality, long-term trend, growth potential
  const longTermScore =
    (indicators.priceVsDma200 === 'above' ? 30 : indicators.priceVsDma200 === 'below' ? -30 : 0) +
    (indicators.momentumScore * 0.35) +
    (quote.returnOnEquity > 20 ? 18 : quote.returnOnEquity > 12 ? 8 : quote.returnOnEquity < 5 ? -15 : 0) +
    (quote.trailingPE > 0 && quote.trailingPE < 20 ? 15 : quote.trailingPE > 35 ? -12 : quote.trailingPE < 10 ? 8 : 0) +
    (quote.earningsGrowth > 0.15 ? 15 : quote.earningsGrowth > 0.05 ? 8 : quote.earningsGrowth < 0 ? -15 : 0) +
    (quote.debtToEquity > 0 && quote.debtToEquity < 0.5 ? 10 : quote.debtToEquity > 2 ? -12 : 0);

  const shortRec = classify(shortTermScore);
  const mediumRec = classify(mediumTermScore);
  const longRec = classify(longTermScore);

  const shortProb = probabilityFromScore(shortTermScore, 58);
  const mediumProb = probabilityFromScore(mediumTermScore, 55);
  const longProb = probabilityFromScore(longTermScore, 52);

  // Calculate target prices with scenarios
  const shortTarget = price > 0 ? price * (1 + (changePct * 0.3 + shortTermScore * 0.002)) : 0;
  const mediumTarget = price > 0 ? price * (1 + mediumTermScore * 0.006) : 0;
  const longTarget = price > 0 ? price * (1 + longTermScore * 0.015) : 0;

  // Create scenario analysis
  const shortScenarios = {
    bullish: shortTarget * 1.03,
    base: shortTarget,
    bearish: shortTarget * 0.97,
  };

  const mediumScenarios = {
    bullish: mediumTarget * 1.08,
    base: mediumTarget,
    bearish: mediumTarget * 0.92,
  };

  const longScenarios = {
    bullish: longTarget * 1.15,
    base: longTarget,
    bearish: longTarget * 0.85,
  };

  const overallScore = (shortTermScore + mediumTermScore + longTermScore) / 3;
  const overall = classify(overallScore);
  const overallProbability = probabilityFromScore(overallScore, 55);

  // Investment score (0-100) for quick reference
  const investmentScore = Math.round(Math.max(0, Math.min(100, 50 + overallScore)));

  return {
    shortTerm: {
      label: 'Short-Term',
      range: '1-7 Days',
      recommendation: shortRec,
      probability: shortProb,
      confidence: Math.round(Math.min(95, 62 + Math.abs(shortTermScore) * 0.4)),
      targetPrice: Math.max(0, shortTarget),
      expectedReturn: price > 0 ? ((shortTarget - price) / price) * 100 : 0,
      riskLevel: assessRisk(indicators, volatility),
      priceScenarios: shortScenarios,
      keyFactors: generateKeyFactors(quote, indicators, shortTermScore).slice(0, 3),
    },
    mediumTerm: {
      label: 'Medium-Term',
      range: '1-3 Months',
      recommendation: mediumRec,
      probability: mediumProb,
      confidence: Math.round(Math.min(95, 60 + Math.abs(mediumTermScore) * 0.35)),
      targetPrice: Math.max(0, mediumTarget),
      expectedReturn: price > 0 ? ((mediumTarget - price) / price) * 100 : 0,
      riskLevel: assessRisk(indicators, volatility * 0.8),
      priceScenarios: mediumScenarios,
      keyFactors: generateKeyFactors(quote, indicators, mediumTermScore).slice(0, 3),
    },
    longTerm: {
      label: 'Long-Term',
      range: '1 Year+',
      recommendation: longRec,
      probability: longProb,
      confidence: Math.round(Math.min(95, 58 + Math.abs(longTermScore) * 0.3)),
      targetPrice: Math.max(0, longTarget),
      expectedReturn: price > 0 ? ((longTarget - price) / price) * 100 : 0,
      riskLevel: assessRisk(indicators, volatility * 0.5),
      priceScenarios: longScenarios,
      keyFactors: generateKeyFactors(quote, indicators, longTermScore).slice(0, 3),
    },
    overall,
    overallProbability,
    investmentScore,
  };
}
