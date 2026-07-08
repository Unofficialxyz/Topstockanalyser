import type { QuoteData } from '../services/api';
import type { TechnicalIndicators } from './indicators';
import type { Forecast } from './forecast';

export interface ReasoningPoint {
  category: 'technical' | 'momentum' | 'fundamental' | 'sentiment' | 'risk';
  text: string;
  tone: 'bullish' | 'bearish' | 'neutral';
}

export function generateReasoning(
  quote: QuoteData,
  indicators: TechnicalIndicators,
  forecast: Forecast
): ReasoningPoint[] {
  const points: ReasoningPoint[] = [];
  const changePct = quote.regularMarketChangePercent || 0;

  // RSI-based reasoning
  if (indicators.rsi >= 70) {
    points.push({
      category: 'technical',
      text: `RSI at ${indicators.rsi.toFixed(1)} indicates overbought conditions — momentum is stretched and a pullback is possible.`,
      tone: 'bearish',
    });
  } else if (indicators.rsi >= 55) {
    points.push({
      category: 'technical',
      text: `RSI at ${indicators.rsi.toFixed(1)} reflects strong buyer velocity without entering overbought territory, supporting continued upside.`,
      tone: 'bullish',
    });
  } else if (indicators.rsi <= 30) {
    points.push({
      category: 'technical',
      text: `RSI at ${indicators.rsi.toFixed(1)} signals oversold conditions — potential reversal zone for contrarian entry.`,
      tone: 'bullish',
    });
  } else if (indicators.rsi < 45) {
    points.push({
      category: 'technical',
      text: `RSI at ${indicators.rsi.toFixed(1)} shows weakening momentum with sellers in control.`,
      tone: 'bearish',
    });
  } else {
    points.push({
      category: 'technical',
      text: `RSI at ${indicators.rsi.toFixed(1)} is neutral, suggesting equilibrium between buyers and sellers.`,
      tone: 'neutral',
    });
  }

  // MACD reasoning
  if (indicators.macd > indicators.macdSignal && indicators.macdHistogram > 0) {
    points.push({
      category: 'technical',
      text: `MACD bullish crossover confirmed — histogram at ${indicators.macdHistogram.toFixed(3)} indicates accelerating upward momentum.`,
      tone: 'bullish',
    });
  } else if (indicators.macd < indicators.macdSignal && indicators.macdHistogram < 0) {
    points.push({
      category: 'technical',
      text: `MACD bearish crossover active — histogram at ${indicators.macdHistogram.toFixed(3)} signals downward pressure building.`,
      tone: 'bearish',
    });
  } else {
    points.push({
      category: 'technical',
      text: `MACD is converging near the signal line, indicating trend exhaustion or pending direction.`,
      tone: 'neutral',
    });
  }

  // DMA positioning
  if (indicators.priceVsDma50 === 'above' && indicators.priceVsDma200 === 'above') {
    points.push({
      category: 'technical',
      text: `Price trades above both 50 DMA (₹${indicators.dma50.toFixed(2)}) and 200 DMA (₹${indicators.dma200.toFixed(2)}) — classic golden-trend structure confirming institutional accumulation.`,
      tone: 'bullish',
    });
  } else if (indicators.priceVsDma50 === 'below' && indicators.priceVsDma200 === 'below') {
    points.push({
      category: 'technical',
      text: `Price has broken below both 50 DMA (₹${indicators.dma50.toFixed(2)}) and 200 DMA (₹${indicators.dma200.toFixed(2)}) — critical support floors have failed, signaling distribution.`,
      tone: 'bearish',
    });
  } else if (indicators.priceVsDma50 === 'below') {
    points.push({
      category: 'technical',
      text: `Price is below the 50 DMA (₹${indicators.dma50.toFixed(2)}) but above the 200 DMA — short-term weakness within a longer-term uptrend.`,
      tone: 'neutral',
    });
  } else {
    points.push({
      category: 'technical',
      text: `Price holds above the 50 DMA (₹${indicators.dma50.toFixed(2)}) but sits below the 200 DMA — short-term bounce within a broader downtrend.`,
      tone: 'neutral',
    });
  }

  // Volume / momentum
  if (indicators.volumeSpikePercent > 20) {
    points.push({
      category: 'momentum',
      text: `Trading volume exceeds the 20-day average by ${indicators.volumeSpikePercent.toFixed(1)}% — institutional participation is amplifying the current move.`,
      tone: changePct >= 0 ? 'bullish' : 'bearish',
    });
  } else if (indicators.volumeSpikePercent < -30) {
    points.push({
      category: 'momentum',
      text: `Volume is ${Math.abs(indicators.volumeSpikePercent).toFixed(1)}% below the 20-day average — low conviction in the current price action.`,
      tone: 'neutral',
    });
  } else {
    points.push({
      category: 'momentum',
      text: `Volume is in line with the 20-day average (${indicators.volumeSpikePercent.toFixed(1)}% deviation) — no abnormal participation detected.`,
      tone: 'neutral',
    });
  }

  // Day range positioning
  if (indicators.dayRangePosition > 80) {
    points.push({
      category: 'momentum',
      text: `Price is closing near the day's high (${indicators.dayRangePosition.toFixed(0)}% of range) — buyers dominated the session.`,
      tone: 'bullish',
    });
  } else if (indicators.dayRangePosition < 20) {
    points.push({
      category: 'momentum',
      text: `Price is closing near the day's low (${indicators.dayRangePosition.toFixed(0)}% of range) — sellers controlled the session.`,
      tone: 'bearish',
    });
  }

  // Fundamental reasoning
  if (quote.trailingPE > 0) {
    if (quote.trailingPE < 15) {
      points.push({
        category: 'fundamental',
        text: `Trailing P/E of ${quote.trailingPE.toFixed(1)} is below the market average — stock appears undervalued relative to earnings.`,
        tone: 'bullish',
      });
    } else if (quote.trailingPE > 40) {
      points.push({
        category: 'fundamental',
        text: `Trailing P/E of ${quote.trailingPE.toFixed(1)} is elevated — premium pricing requires sustained earnings growth to justify.`,
        tone: 'bearish',
      });
    } else {
      points.push({
        category: 'fundamental',
        text: `Trailing P/E of ${quote.trailingPE.toFixed(1)} is within a reasonable valuation band.`,
        tone: 'neutral',
      });
    }
  }

  if (quote.returnOnEquity > 0) {
    if (quote.returnOnEquity > 18) {
      points.push({
        category: 'fundamental',
        text: `Return on Equity at ${(quote.returnOnEquity).toFixed(1)}% demonstrates efficient capital deployment — a quality compounder characteristic.`,
        tone: 'bullish',
      });
    } else if (quote.returnOnEquity < 8) {
      points.push({
        category: 'fundamental',
        text: `Return on Equity at ${(quote.returnOnEquity).toFixed(1)}% is suboptimal — capital efficiency concerns weigh on long-term outlook.`,
        tone: 'bearish',
      });
    }
  }

  if (quote.debtToEquity > 0) {
    if (quote.debtToEquity > 200) {
      points.push({
        category: 'risk',
        text: `Debt-to-Equity ratio at ${(quote.debtToEquity).toFixed(0)}% is elevated — leverage risk is a headwind in rising-rate environments.`,
        tone: 'bearish',
      });
    } else if (quote.debtToEquity < 50) {
      points.push({
        category: 'fundamental',
        text: `Debt-to-Equity at ${(quote.debtToEquity).toFixed(0)}% reflects a conservatively leveraged balance sheet.`,
        tone: 'bullish',
      });
    }
  }

  if (quote.earningsGrowth !== 0) {
    if (quote.earningsGrowth > 0.15) {
      points.push({
        category: 'fundamental',
        text: `Year-over-year EPS growth of ${(quote.earningsGrowth * 100).toFixed(1)}% signals robust earnings expansion.`,
        tone: 'bullish',
      });
    } else if (quote.earningsGrowth < 0) {
      points.push({
        category: 'fundamental',
        text: `Year-over-year EPS growth of ${(quote.earningsGrowth * 100).toFixed(1)}% shows earnings contraction — a red flag for forward returns.`,
        tone: 'bearish',
      });
    }
  }

  // Volatility risk
  if (indicators.volatility > 3) {
    points.push({
      category: 'risk',
      text: `Daily volatility at ${indicators.volatility.toFixed(2)}% is elevated — expect wider price swings and size positions accordingly.`,
      tone: 'neutral',
    });
  }

  // Overall forecast summary
  const isBullishRec = forecast.overall === 'BUY' || forecast.overall === 'STRONG BUY';
  const isBearishRec = forecast.overall === 'SELL' || forecast.overall === 'STRONG SELL';

  const overallText = isBullishRec
    ? `Aggregating all signals, the composite momentum matrix favors an accumulation stance with a ${forecast.overallProbability}% probability of the current trend continuing. Investment score: ${forecast.investmentScore}/100.`
    : isBearishRec
    ? `Aggregating all signals, the composite momentum matrix favors a reduction stance with a ${forecast.overallProbability}% probability of further downside. Investment score: ${forecast.investmentScore}/100.`
    : `Aggregating all signals, the composite momentum matrix is mixed — a patient hold is warranted with a ${forecast.overallProbability}% probability of trend continuation. Investment score: ${forecast.investmentScore}/100.`;

  points.push({
    category: 'sentiment',
    text: overallText,
    tone: isBullishRec ? 'bullish' : isBearishRec ? 'bearish' : 'neutral',
  });

  return points;
}
