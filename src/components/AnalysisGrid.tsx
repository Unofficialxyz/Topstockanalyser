import type { QuoteData } from '../services/api';
import type { TechnicalIndicators } from '../utils/indicators';
import { Gauge, BarChart3, TrendingUp, Activity, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface AnalysisGridProps {
  quote: QuoteData;
  indicators: TechnicalIndicators;
}

function MetricCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'bullish' | 'bearish' | 'neutral' }) {
  const color = tone === 'bullish' ? 'text-emerald-400' : tone === 'bearish' ? 'text-red-400' : 'text-amber-400';
  const glow = tone === 'bullish' ? 'shadow-emerald-500/20' : tone === 'bearish' ? 'shadow-red-500/20' : 'shadow-amber-500/20';
  return (
    <div className={`rounded-xl bg-slate-800/40 border border-slate-700/40 p-3.5 transition-all hover:border-slate-600/60 hover:bg-slate-800/60`}>
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1">{label}</p>
      <p className={`text-lg font-bold ${color} drop-shadow-[0_0_8px_currentColor] ${glow}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function rsiTone(rsi: number): 'bullish' | 'bearish' | 'neutral' {
  if (rsi >= 55 && rsi < 70) return 'bullish';
  if (rsi <= 45 && rsi > 30) return 'bearish';
  return 'neutral';
}

function macdTone(ind: TechnicalIndicators): 'bullish' | 'bearish' | 'neutral' {
  if (ind.macd > ind.macdSignal && ind.macdHistogram > 0) return 'bullish';
  if (ind.macd < ind.macdSignal && ind.macdHistogram < 0) return 'bearish';
  return 'neutral';
}

export function AnalysisGrid({ quote, indicators }: AnalysisGridProps) {
  const dma50Tone = indicators.priceVsDma50 === 'above' ? 'bullish' : indicators.priceVsDma50 === 'below' ? 'bearish' : 'neutral';
  const dma200Tone = indicators.priceVsDma200 === 'above' ? 'bullish' : indicators.priceVsDma200 === 'below' ? 'bearish' : 'neutral';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Technical Indicators */}
      <div className="backdrop-blur-md bg-slate-900/80 border border-slate-700/40 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Gauge className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Technical Indicators</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="RSI (14)" value={indicators.rsi.toFixed(1)} sub={indicators.rsi >= 70 ? 'Overbought' : indicators.rsi <= 30 ? 'Oversold' : 'Neutral'} tone={rsiTone(indicators.rsi)} />
          <MetricCard label="MACD" value={indicators.macd.toFixed(3)} sub={`Signal: ${indicators.macdSignal.toFixed(3)}`} tone={macdTone(indicators)} />
          <MetricCard label="50 DMA" value={`₹${indicators.dma50.toFixed(2)}`} sub={`Price ${indicators.priceVsDma50} DMA`} tone={dma50Tone} />
          <MetricCard label="200 DMA" value={`₹${indicators.dma200.toFixed(2)}`} sub={`Price ${indicators.priceVsDma200} DMA`} tone={dma200Tone} />
        </div>
      </div>

      {/* Fundamental Metrics */}
      <div className="backdrop-blur-md bg-slate-900/80 border border-slate-700/40 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Fundamental Metrics</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="P/E Ratio" value={quote.trailingPE > 0 ? quote.trailingPE.toFixed(1) : 'N/A'} sub={quote.trailingPE > 0 ? (quote.trailingPE < 20 ? 'Undervalued' : 'Premium') : 'No data'} tone={quote.trailingPE > 0 && quote.trailingPE < 20 ? 'bullish' : quote.trailingPE > 40 ? 'bearish' : 'neutral'} />
          <MetricCard label="Debt/Equity" value={quote.debtToEquity > 0 ? `${quote.debtToEquity.toFixed(0)}%` : 'N/A'} sub={quote.debtToEquity > 200 ? 'High leverage' : 'Healthy'} tone={quote.debtToEquity > 200 ? 'bearish' : quote.debtToEquity > 0 && quote.debtToEquity < 50 ? 'bullish' : 'neutral'} />
          <MetricCard label="ROE" value={quote.returnOnEquity > 0 ? `${quote.returnOnEquity.toFixed(1)}%` : 'N/A'} sub={quote.returnOnEquity > 15 ? 'Strong' : 'Weak'} tone={quote.returnOnEquity > 15 ? 'bullish' : quote.returnOnEquity > 0 && quote.returnOnEquity < 8 ? 'bearish' : 'neutral'} />
          <MetricCard label="EPS Growth (YoY)" value={quote.earningsGrowth !== 0 ? `${(quote.earningsGrowth * 100).toFixed(1)}%` : 'N/A'} sub={quote.earningsGrowth > 0.1 ? 'Expanding' : 'Contracting'} tone={quote.earningsGrowth > 0.1 ? 'bullish' : quote.earningsGrowth < 0 ? 'bearish' : 'neutral'} />
        </div>
      </div>

      {/* Momentum Analysis */}
      <div className="backdrop-blur-md bg-slate-900/80 border border-slate-700/40 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Momentum Analysis</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Volume" value={quote.regularMarketVolume > 0 ? `${(quote.regularMarketVolume / 1_000_000).toFixed(2)}M` : 'N/A'} sub={`Avg: ${(indicators.volumeAvg20 / 1_000_000).toFixed(2)}M`} tone={indicators.volumeSpikePercent > 20 ? 'bullish' : 'neutral'} />
          <MetricCard label="Volume Spike" value={`${indicators.volumeSpikePercent > 0 ? '+' : ''}${indicators.volumeSpikePercent.toFixed(1)}%`} sub="vs 20-day avg" tone={indicators.volumeSpikePercent > 20 ? 'bullish' : indicators.volumeSpikePercent < -30 ? 'bearish' : 'neutral'} />
          <MetricCard label="Day High" value={`₹${quote.regularMarketDayHigh.toFixed(2)}`} sub={`Open: ₹${quote.regularMarketOpen.toFixed(2)}`} tone="neutral" />
          <MetricCard label="Day Low" value={`₹${quote.regularMarketDayLow.toFixed(2)}`} sub={`Prev: ₹${quote.regularMarketPreviousClose.toFixed(2)}`} tone="neutral" />
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Day Range Position</span>
            <span className="text-xs font-semibold text-slate-300">{indicators.dayRangePosition.toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-gradient-to-r from-red-500/30 via-amber-500/30 to-emerald-500/30 relative">
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-900 shadow-lg" style={{ left: `${indicators.dayRangePosition}%`, transform: 'translate(-50%, -50%)' }} />
          </div>
        </div>
      </div>

      {/* Market Sentiment */}
      <div className="backdrop-blur-md bg-slate-900/80 border border-slate-700/40 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Market Sentiment</h3>
        </div>
        <SentimentGauge momentumScore={indicators.momentumScore} changePct={quote.regularMarketChangePercent} />
      </div>
    </div>
  );
}

function SentimentGauge({ momentumScore, changePct }: { momentumScore: number; changePct: number }) {
  const isBullish = momentumScore > 15;
  const isBearish = momentumScore < -15;
  const color = isBullish ? '#10B981' : isBearish ? '#EF4444' : '#F59E0B';
  const label = isBullish ? 'Bullish' : isBearish ? 'Bearish' : 'Neutral';
  const Icon = isBullish ? ArrowUpRight : isBearish ? ArrowDownRight : Minus;

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <div className="relative w-32 h-32 mb-3">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="#1e293b" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${Math.abs(momentumScore) * 3.14} 314`}
            style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="w-6 h-6 mb-1" style={{ color }} />
          <p className="text-2xl font-bold" style={{ color }}>{Math.abs(momentumScore).toFixed(0)}</p>
        </div>
      </div>
      <p className="text-sm font-semibold" style={{ color }}>{label} Sentiment</p>
      <p className="text-[10px] text-slate-500 mt-1">Day change: {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%</p>
    </div>
  );
}
