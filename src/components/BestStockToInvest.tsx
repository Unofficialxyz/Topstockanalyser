import { useState, useEffect, useCallback } from 'react';
import { Crown, TrendingUp, TrendingDown, Target, Shield, BarChart3, Loader2, RefreshCw, ChevronDown, ChevronUp, Star, Zap, Clock, DollarSign } from 'lucide-react';
import { TRENDING_STOCKS, fetchTrendingQuotes, type IndexQuote } from '../services/api';

interface StockScore {
  symbol: string;
  name: string;
  country: string;
  price: number;
  change: number;
  changePercent: number;
  totalScore: number;
  categories: {
    momentum: { score: number; label: string; details: string };
    trend: { score: number; label: string; details: string };
    risk: { score: number; label: string; details: string };
    growth: { score: number; label: string; details: string };
  };
  recommendation: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG SELL';
  confidence: number;
  suggestedInvestment: number;
  expectedReturn: number;
  timeHorizon: string;
  reasons: string[];
  warnings: string[];
}

function calculateStockScore(stock: { symbol: string; name: string; country: string; price: number; change: number; changePercent: number }): StockScore {
  let totalScore = 0;
  const reasons: string[] = [];
  const warnings: string[] = [];

  // Momentum Score (0-25 points)
  let momentumScore = 0;
  const momentumDetails = [];
  if (stock.changePercent > 5) {
    momentumScore = 25;
    momentumDetails.push('Exceptional bullish momentum');
    reasons.push('Strong upward momentum detected');
  } else if (stock.changePercent > 2.5) {
    momentumScore = 20;
    momentumDetails.push('Strong bullish momentum');
    reasons.push('Good momentum building');
  } else if (stock.changePercent > 1) {
    momentumScore = 15;
    momentumDetails.push('Positive momentum');
    reasons.push('Positive price movement');
  } else if (stock.changePercent > 0) {
    momentumScore = 10;
    momentumDetails.push('Slight positive');
  } else if (stock.changePercent > -1) {
    momentumScore = 8;
    momentumDetails.push('Consolidating');
    warnings.push('Stock is consolidating');
  } else if (stock.changePercent > -2.5) {
    momentumScore = 5;
    momentumDetails.push('Slight weakness');
    warnings.push('Showing some weakness');
  } else {
    momentumScore = 0;
    momentumDetails.push('Bearish momentum');
    warnings.push('Negative momentum detected');
  }

  // Trend Score (0-25 points)
  let trendScore = 0;
  const trendDetails = [];
  const absChange = Math.abs(stock.changePercent);
  if (stock.changePercent > 0 && absChange < 3) {
    trendScore = 25;
    trendDetails.push('Healthy uptrend');
    reasons.push('Healthy sustainable trend');
  } else if (stock.changePercent > 0) {
    trendScore = 20;
    trendDetails.push('Strong uptrend');
    reasons.push('Strong upward trend');
  } else if (absChange < 0.5) {
    trendScore = 15;
    trendDetails.push('Stable/sideways');
    reasons.push('Price stability');
  } else if (stock.changePercent < -3) {
    trendScore = 5;
    trendDetails.push('Sharp decline');
    warnings.push('Sharp decline in progress');
  } else {
    trendScore = 10;
    trendDetails.push('Correction phase');
    warnings.push('In correction phase');
  }

  // Risk Score (0-25 points) - inverse logic, lower volatility = higher score for conservative
  let riskScore = 0;
  const riskDetails = [];
  if (absChange < 1) {
    riskScore = 25;
    riskDetails.push('Low volatility');
    reasons.push('Low risk profile');
  } else if (absChange < 2) {
    riskScore = 20;
    riskDetails.push('Moderate volatility');
    reasons.push('Moderate risk');
  } else if (absChange < 4) {
    riskScore = 12;
    riskDetails.push('Higher volatility');
    warnings.push('Higher volatility expected');
  } else {
    riskScore = 5;
    riskDetails.push('High volatility');
    warnings.push('High risk - volatile');
  }

  // Growth Potential Score (0-25 points)
  let growthScore = 0;
  const growthDetails = [];
  if (stock.changePercent > 0 && stock.changePercent < 5) {
    growthScore = 25;
    growthDetails.push('Sustainable growth');
    reasons.push('Sustainable growth pattern');
  } else if (stock.changePercent > 0) {
    growthScore = 18;
    growthDetails.push('Rapid growth');
    reasons.push('Rapid growth potential');
    warnings.push('May be overextended');
  } else if (stock.changePercent > -2) {
    growthScore = 12;
    growthDetails.push('Recovery potential');
    reasons.push('Potential recovery play');
  } else {
    growthScore = 8;
    growthDetails.push('Value opportunity');
    warnings.push('Wait for reversal signal');
  }

  totalScore = momentumScore + trendScore + riskScore + growthScore;

  // Determine recommendation
  let recommendation: StockScore['recommendation'];
  let confidence: number;
  let timeHorizon: string;
  let expectedReturn: number;
  let suggestedInvestment: number;

  if (totalScore >= 85) {
    recommendation = 'STRONG BUY';
    confidence = 85 + Math.min(10, totalScore - 85);
    timeHorizon = '1-3 months';
    expectedReturn = 8 + (totalScore - 85) * 0.5;
    suggestedInvestment = 50000;
    reasons.unshift('TOP PICK - Excellent setup');
  } else if (totalScore >= 70) {
    recommendation = 'BUY';
    confidence = 70 + Math.min(15, totalScore - 70);
    timeHorizon = '2-4 months';
    expectedReturn = 5 + (totalScore - 70) * 0.3;
    suggestedInvestment = 30000;
    reasons.unshift('Good investment opportunity');
  } else if (totalScore >= 50) {
    recommendation = 'HOLD';
    confidence = 50 + Math.min(20, totalScore - 50);
    timeHorizon = '3-6 months';
    expectedReturn = 2 + (totalScore - 50) * 0.1;
    suggestedInvestment = 15000;
  } else if (totalScore >= 35) {
    recommendation = 'SELL';
    confidence = 40 + Math.min(10, 35 - totalScore);
    timeHorizon = 'Exit soon';
    expectedReturn = -5 - (50 - totalScore) * 0.2;
    suggestedInvestment = 0;
    warnings.unshift('Consider reducing position');
  } else {
    recommendation = 'STRONG SELL';
    confidence = 30;
    timeHorizon = 'Exit immediately';
    expectedReturn = -10 - (35 - totalScore) * 0.5;
    suggestedInvestment = 0;
    warnings.unshift('High risk - avoid');
  }

  return {
    ...stock,
    totalScore,
    categories: {
      momentum: { score: momentumScore, label: momentumDetails.join(', ') || 'Neutral', details: `${momentumScore}/25` },
      trend: { score: trendScore, label: trendDetails.join(', ') || 'Neutral', details: `${trendScore}/25` },
      risk: { score: riskScore, label: riskDetails.join(', ') || 'Neutral', details: `${riskScore}/25` },
      growth: { score: growthScore, label: growthDetails.join(', ') || 'Neutral', details: `${growthScore}/25` },
    },
    recommendation,
    confidence: Math.min(95, confidence),
    suggestedInvestment,
    expectedReturn,
    timeHorizon,
    reasons: reasons.slice(0, 4),
    warnings: warnings.slice(0, 3),
  };
}

interface BestStockToInvestProps {
  onSelectStock?: (symbol: string) => void;
}

export function BestStockToInvest({ onSelectStock }: BestStockToInvestProps) {
  const [stocks, setStocks] = useState<StockScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedStock, setExpandedStock] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'STRONG BUY' | 'BUY'>('all');

  const analyzeStocks = useCallback(async () => {
    setLoading(true);
    try {
      const quotes = await fetchTrendingQuotes();
      const scored = quotes
        .map((q) => calculateStockScore(q))
        .sort((a, b) => b.totalScore - a.totalScore);
      setStocks(scored);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to analyze stocks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    analyzeStocks();
    const interval = setInterval(analyzeStocks, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [analyzeStocks]);

  const topPick = stocks[0];
  const buyStocks = stocks.filter(s => s.recommendation === 'STRONG BUY' || s.recommendation === 'BUY');
  const filtered = filter === 'all' ? stocks : buyStocks;

  const getRecColor = (rec: StockScore['recommendation']) => {
    switch (rec) {
      case 'STRONG BUY': return { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-400', glow: 'shadow-emerald-500/30' };
      case 'BUY': return { bg: 'bg-green-500/15', border: 'border-green-500/40', text: 'text-green-400', glow: 'shadow-green-500/20' };
      case 'HOLD': return { bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-400', glow: '' };
      case 'SELL': return { bg: 'bg-orange-500/15', border: 'border-orange-500/40', text: 'text-orange-400', glow: '' };
      case 'STRONG SELL': return { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400', glow: 'shadow-red-500/20' };
    }
  };

  const getSymbol = (symbol: string) => symbol.replace('.NS', '').replace('.BO', '').replace('.L', '').replace('.T', '').replace('.HK', '');

  return (
    <div className="space-y-4">
      {/* Top Pick Banner */}
      {topPick && !loading && (
        <div className={`relative overflow-hidden rounded-2xl ${getRecColor(topPick.recommendation).bg} border ${getRecColor(topPick.recommendation).border} p-5`}>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-emerald-500/10 blur-2xl" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Best Stock to Invest Now</h3>
                <p className="text-[10px] text-slate-400">AI-Powered Real-Time Analysis</p>
              </div>
            </div>

            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h4 className="text-xl font-bold text-white">{topPick.name}</h4>
                <p className="text-xs text-slate-500">{topPick.symbol} • {topPick.country}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  {topPick.country === 'USA' ? <DollarSign className="w-4 h-4 text-slate-400" /> : <span className="text-slate-400">₹</span>}
                  <span className="text-xl font-bold text-white">{topPick.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className={`flex items-center gap-1 justify-end mt-1 ${topPick.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {topPick.changePercent >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  <span className="text-sm font-semibold">{topPick.changePercent >= 0 ? '+' : ''}{topPick.changePercent.toFixed(2)}%</span>
                </div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {Object.entries(topPick.categories).map(([key, cat]) => (
                <div key={key} className="rounded-lg bg-slate-900/60 p-2 text-center">
                  <p className="text-[10px] text-slate-500 uppercase">{key}</p>
                  <p className="text-lg font-bold text-slate-200">{cat.score}</p>
                  <p className="text-[9px] text-slate-600">/25</p>
                </div>
              ))}
            </div>

            {/* Total Score */}
            <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-slate-900/60 border border-slate-700/40">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                <span className="text-sm text-slate-300">Total AI Score</span>
              </div>
              <span className="text-3xl font-bold text-emerald-400">{topPick.totalScore}<span className="text-base text-slate-500">/100</span></span>
            </div>

            {/* Action Box */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg bg-slate-800/60 p-3 text-center">
                <p className="text-[10px] text-slate-500 uppercase mb-1">Recommendation</p>
                <p className={`text-sm font-bold ${getRecColor(topPick.recommendation).text}`}>{topPick.recommendation}</p>
              </div>
              <div className="rounded-lg bg-slate-800/60 p-3 text-center">
                <p className="text-[10px] text-slate-500 uppercase mb-1">Expected Return</p>
                <p className={`text-sm font-bold ${topPick.expectedReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {topPick.expectedReturn >= 0 ? '+' : ''}{topPick.expectedReturn.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-lg bg-slate-800/60 p-3 text-center">
                <p className="text-[10px] text-slate-500 uppercase mb-1">Time Horizon</p>
                <p className="text-sm font-bold text-slate-200">{topPick.timeHorizon}</p>
              </div>
            </div>

            {/* Reasons */}
            {topPick.reasons.length > 0 && (
              <div className="mb-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-[10px] text-emerald-300 uppercase mb-2 flex items-center gap-1">
                  <Star className="w-3 h-3" /> Why this stock?
                </p>
                <div className="space-y-1">
                  {topPick.reasons.map((reason, i) => (
                    <p key={i} className="text-xs text-emerald-200 flex items-start gap-2">
                      <Zap className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {reason}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {topPick.warnings.length > 0 && (
              <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] text-amber-300 uppercase mb-2">Risks to consider:</p>
                <div className="space-y-1">
                  {topPick.warnings.map((warning, i) => (
                    <p key={i} className="text-xs text-amber-200">{warning}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => onSelectStock?.(topPick.symbol)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Full Analysis
              </button>
              <button
                onClick={analyzeStocks}
                disabled={loading}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-sm font-medium transition-all flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {lastUpdated && (
              <p className="text-[10px] text-slate-600 mt-3 text-center">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* All Stocks List */}
      <div className="backdrop-blur-md bg-slate-900/80 border border-slate-700/40 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">All Stock Rankings</h3>
          </div>
          <div className="flex gap-1.5">
            {(['all', 'BUY', 'STRONG BUY'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                  filter === f
                    ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400'
                    : 'bg-slate-800/40 border border-slate-700/30 text-slate-500 hover:bg-slate-700/40'
                }`}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
        </div>

        {loading && stocks.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto custom-scroll">
            {filtered.slice(0, 10).map((stock, index) => {
              const colors = getRecColor(stock.recommendation);
              const isExpanded = expandedStock === stock.symbol;

              return (
                <div key={stock.symbol} className="rounded-xl bg-slate-800/40 border border-slate-700/30 hover:border-slate-600/50 transition-all">
                  <button
                    onClick={() => setExpandedStock(isExpanded ? null : stock.symbol)}
                    className="w-full flex items-center gap-3 p-3"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      index === 0 ? 'bg-yellow-500/30 text-yellow-300' :
                      index === 1 ? 'bg-slate-400/30 text-slate-300' :
                      index === 2 ? 'bg-amber-600/30 text-amber-300' :
                      'bg-slate-700/50 text-slate-500'
                    }`}>
                      {index + 1}
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold text-slate-200">{getSymbol(stock.symbol)}</p>
                      <p className="text-[10px] text-slate-500 truncate">{stock.name}</p>
                    </div>

                    <div className="text-center min-w-[60px]">
                      <p className="text-xl font-bold text-slate-200">{stock.totalScore}</p>
                      <p className="text-[9px] text-slate-600">/100</p>
                    </div>

                    <span className={`px-2 py-1 rounded-md text-[10px] font-semibold ${colors.bg} ${colors.text} border ${colors.border}`}>
                      {stock.recommendation}
                    </span>

                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 border-t border-slate-700/30">
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="p-2 rounded-lg bg-slate-900/60">
                          <p className="text-[10px] text-slate-500">Momentum</p>
                          <p className="text-sm font-bold text-slate-200">{stock.categories.momentum.score}/25</p>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-900/60">
                          <p className="text-[10px] text-slate-500">Trend</p>
                          <p className="text-sm font-bold text-slate-200">{stock.categories.trend.score}/25</p>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-900/60">
                          <p className="text-[10px] text-slate-500">Risk</p>
                          <p className="text-sm font-bold text-slate-200">{stock.categories.risk.score}/25</p>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-900/60">
                          <p className="text-[10px] text-slate-500">Growth</p>
                          <p className="text-sm font-bold text-slate-200">{stock.categories.growth.score}/25</p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectStock?.(stock.symbol); }}
                          className="flex-1 px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 text-xs font-medium transition-all"
                        >
                          Analyze
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
