import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, TrendingDown, Star, Loader2, RefreshCw, Zap } from 'lucide-react';
import { TRENDING_STOCKS, fetchTrendingQuotes, type IndexQuote } from '../services/api';

interface StockPick {
  symbol: string;
  name: string;
  country: string;
  price: number;
  change: number;
  changePercent: number;
  score: number;
  reasons: string[];
}

export function StockOfTheDay() {
  const [pick, setPick] = useState<StockPick | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const analyzeAndPick = async () => {
    setLoading(true);
    try {
      const quotes = await fetchTrendingQuotes();

      // Score each stock based on momentum, volatility pattern, and trend
      const scored = quotes.map((q) => {
        let score = 0;
        const reasons: string[] = [];

        // Strong uptrend (+20 to +40)
        if (q.changePercent > 3) {
          score += 40;
          reasons.push('Strong bullish momentum');
        } else if (q.changePercent > 1.5) {
          score += 25;
          reasons.push('Positive momentum');
        } else if (q.changePercent > 0) {
          score += 15;
          reasons.push('Upward trend');
        }

        // Reasonable volatility (not too extreme)
        if (Math.abs(q.changePercent) >= 0.5 && Math.abs(q.changePercent) <= 3) {
          score += 20;
          reasons.push('Balanced volatility');
        }

        // Large cap preference (based on known stocks)
        const isLargeCap = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS'].includes(q.symbol);
        if (isLargeCap) {
          score += 15;
          reasons.push('Large-cap stability');
        }

        // Country diversification bonus
        if (q.country === 'India') {
          score += 10;
          reasons.push('Emerging market growth');
        }

        return {
          ...q,
          score,
          reasons: reasons.length > 0 ? reasons : ['Technical analysis favorable'],
        };
      });

      // Pick the highest scoring stock
      const bestPick = scored.sort((a, b) => b.score - a.score)[0];
      if (bestPick) {
        setPick(bestPick);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to analyze stocks for pick:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    analyzeAndPick();
    // Refresh every 5 minutes
    const interval = setInterval(analyzeAndPick, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !pick) {
    return (
      <div className="backdrop-blur-md bg-gradient-to-br from-amber-500/10 to-amber-700/5 border border-amber-500/30 rounded-2xl p-5">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!pick) return null;

  const isUp = pick.changePercent >= 0;

  return (
    <div className="backdrop-blur-md bg-gradient-to-br from-amber-500/10 to-amber-700/5 border border-amber-500/30 rounded-2xl p-5 relative overflow-hidden">
      {/* Trophy decoration */}
      <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-amber-500/10 blur-2xl" />
      <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-amber-500/5 blur-xl" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-300">Stock of the Day</h3>
              <p className="text-[10px] text-amber-500/70">AI-Selected Best Pick</p>
            </div>
          </div>
          <button
            onClick={analyzeAndPick}
            disabled={loading}
            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 transition-all"
            title="Refresh pick"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Pick Details */}
        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/40">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="text-lg font-bold text-white">{pick.name}</h4>
              <p className="text-xs text-slate-500">{pick.symbol} • {pick.country}</p>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-[10px] font-semibold text-amber-300">TOP PICK</span>
            </div>
          </div>

          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-2xl font-bold text-white">
                {pick.country === 'USA' ? '$' : '₹'}{pick.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className={`flex items-center gap-1 mt-1 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-sm font-semibold">
                  {isUp ? '+' : ''}{pick.change.toFixed(2)} ({isUp ? '+' : ''}{pick.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase">AI Score</p>
              <p className="text-xl font-bold text-amber-400">{pick.score}</p>
            </div>
          </div>

          {/* Reasons */}
          <div className="space-y-1.5 pt-3 border-t border-slate-700/50">
            <p className="text-[10px] text-slate-500 uppercase font-medium">Why this stock?</p>
            {pick.reasons.map((reason, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                <Zap className="w-3 h-3 text-amber-400 flex-shrink-0" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timestamp */}
        {lastUpdated && (
          <p className="text-[10px] text-slate-600 mt-2 text-right">
            Updated {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}
