import { useState, useEffect, useCallback } from 'react';
import { Flag, TrendingUp, TrendingDown, Loader2, RefreshCw, Crown, ChevronDown, ChevronUp, Star, Zap, Target } from 'lucide-react';
import { fetchTrendingQuotes, type IndexQuote } from '../services/api';

interface CountryStock {
  symbol: string;
  name: string;
  country: string;
  price: number;
  change: number;
  changePercent: number;
  score: number;
  recommendation: string;
  reasons: string[];
}

const COUNTRY_FLAGS: Record<string, string> = {
  'India': '🇮🇳',
  'USA': '🇺🇸',
  'UK': '🇬🇧',
  'Japan': '🇯🇵',
  'Hong Kong': '🇭🇰',
  'Germany': '🇩🇪',
  'France': '🇫🇷',
  'Netherlands': '🇳🇱',
  'Canada': '🇨🇦',
  'Australia': '🇦🇺',
  'South Korea': '🇰🇷',
  'Brazil': '🇧🇷',
  'China': '🇨🇳',
  'Taiwan': '🇹🇼',
  'Singapore': '🇸🇬',
  'Spain': '🇪🇸',
  'Italy': '🇮🇹',
  'Sweden': '🇸🇪',
};

function calculateStockScore(stock: { symbol: string; name: string; country: string; price: number; change: number; changePercent: number }): CountryStock {
  let score = 50;
  const reasons: string[] = [];

  // Momentum scoring
  if (stock.changePercent > 3) {
    score += 25;
    reasons.push('Strong bullish momentum');
  } else if (stock.changePercent > 1.5) {
    score += 18;
    reasons.push('Positive momentum');
  } else if (stock.changePercent > 0.5) {
    score += 12;
    reasons.push('Upward trend');
  } else if (stock.changePercent > 0) {
    score += 8;
    reasons.push('Minor gains');
  } else if (stock.changePercent > -1) {
    score += 5;
    reasons.push('Consolidating');
  } else {
    score -= 5;
    reasons.push('Downward pressure');
  }

  // Volatility check (moderate is good)
  const absChange = Math.abs(stock.changePercent);
  if (absChange < 2) {
    score += 10;
    reasons.push('Low volatility - stable');
  } else if (absChange < 4) {
    score += 5;
    reasons.push('Moderate volatility');
  }

  // Price position check
  if (stock.changePercent > 0 && stock.changePercent < 3) {
    score += 10;
    reasons.push('Sustainable growth pattern');
  }

  score = Math.max(0, Math.min(100, score));

  let recommendation = 'HOLD';
  if (score >= 85) recommendation = 'STRONG BUY';
  else if (score >= 70) recommendation = 'BUY';
  else if (score >= 50) recommendation = 'HOLD';
  else if (score >= 35) recommendation = 'SELL';
  else recommendation = 'STRONG SELL';

  return {
    ...stock,
    score,
    recommendation,
    reasons: reasons.slice(0, 3),
  };
}

interface BestStockByCountryProps {
  onSelectStock?: (symbol: string) => void;
}

export function BestStockByCountry({ onSelectStock }: BestStockByCountryProps) {
  const [countryStocks, setCountryStocks] = useState<Record<string, CountryStock[]>>({});
  const [bestByCountry, setBestByCountry] = useState<Record<string, CountryStock>>({});
  const [loading, setLoading] = useState(true);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const analyzeByCountry = useCallback(async () => {
    setLoading(true);
    try {
      const quotes = await fetchTrendingQuotes();

      // Group by country
      const byCountry: Record<string, CountryStock[]> = {};
      quotes.forEach((q) => {
        const scored = calculateStockScore(q);
        if (!byCountry[q.country]) byCountry[q.country] = [];
        byCountry[q.country].push(scored);
      });

      // Sort each country's stocks by score
      Object.keys(byCountry).forEach((country) => {
        byCountry[country].sort((a, b) => b.score - a.score);
      });

      // Get best stock for each country
      const best: Record<string, CountryStock> = {};
      Object.keys(byCountry).forEach((country) => {
        if (byCountry[country].length > 0) {
          best[country] = byCountry[country][0];
        }
      });

      setCountryStocks(byCountry);
      setBestByCountry(best);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to analyze stocks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    analyzeByCountry();
    const interval = setInterval(analyzeByCountry, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [analyzeByCountry]);

  const countries = Object.keys(bestByCountry).sort();

  const getSymbol = (symbol: string) => symbol.replace('.NS', '').replace('.BO', '').replace('.L', '').replace('.T', '').replace('.HK', '').replace('.DE', '').replace('.PA', '').replace('.AS', '').replace('.TO', '').replace('.AX', '');

  return (
    <div className="backdrop-blur-md bg-slate-900/80 border border-slate-700/40 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Flag className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Best Stock by Country</h3>
            <p className="text-[10px] text-slate-500">AI picks for each market</p>
          </div>
        </div>
        <button
          onClick={analyzeByCountry}
          disabled={loading}
          className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 text-slate-400 hover:text-slate-300 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && Object.keys(bestByCountry).length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scroll">
          {countries.map((country) => {
            const best = bestByCountry[country];
            const flag = COUNTRY_FLAGS[country] || '🌍';
            const isExpanded = expandedCountry === country;
            const allStocks = countryStocks[country] || [];
            const isUp = best.changePercent >= 0;

            const recColor = best.recommendation === 'STRONG BUY' ? 'text-emerald-400' :
                             best.recommendation === 'BUY' ? 'text-green-400' :
                             best.recommendation === 'HOLD' ? 'text-amber-400' :
                             best.recommendation === 'SELL' ? 'text-orange-400' : 'text-red-400';

            return (
              <div
                key={country}
                className="rounded-xl bg-slate-800/40 border border-slate-700/30 hover:border-slate-600/50 transition-all"
              >
                {/* Country Header */}
                <button
                  onClick={() => setExpandedCountry(isExpanded ? null : country)}
                  className="w-full p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{flag}</span>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold text-slate-200">{country}</p>
                      <p className="text-[10px] text-slate-500">{allStocks.length} stocks analyzed</p>
                    </div>

                    {/* Best Stock */}
                    <div className="text-center min-w-[80px]">
                      <div className="flex items-center gap-1 justify-center">
                        <Crown className="w-3 h-3 text-yellow-400" />
                        <span className="text-[10px] text-yellow-400">BEST</span>
                      </div>
                      <p className="text-sm font-bold text-slate-200">{getSymbol(best.symbol)}</p>
                      <p className={`text-xs font-semibold ${recColor}`}>{best.recommendation}</p>
                    </div>

                    <div className="text-right min-w-[70px]">
                      <p className="text-sm font-semibold text-slate-200">
                        {best.score}<span className="text-[10px] text-slate-500">/100</span>
                      </p>
                      <div className={`flex items-center gap-1 justify-end text-[10px] ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{isUp ? '+' : ''}{best.changePercent.toFixed(2)}%</span>
                      </div>
                    </div>

                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>

                  {/* Quick reasons */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {best.reasons.slice(0, 2).map((reason, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[9px] text-emerald-300">
                        {reason}
                      </span>
                    ))}
                  </div>
                </button>

                {/* Expanded: All stocks for this country */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t border-slate-700/30">
                    <div className="space-y-2 mt-3">
                      {allStocks.slice(0, 5).map((stock, index) => {
                        const stockIsUp = stock.changePercent >= 0;
                        const stockRecColor = stock.recommendation === 'STRONG BUY' ? 'text-emerald-400' :
                                              stock.recommendation === 'BUY' ? 'text-green-400' :
                                              stock.recommendation === 'HOLD' ? 'text-amber-400' :
                                              stock.recommendation === 'SELL' ? 'text-orange-400' : 'text-red-400';

                        return (
                          <button
                            key={stock.symbol}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectStock?.(stock.symbol);
                            }}
                            className="w-full flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800/60 transition-all group"
                          >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              index === 0 ? 'bg-yellow-500/30 text-yellow-300' : 'bg-slate-700/50 text-slate-500'
                            }`}>
                              {index + 1}
                            </span>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-xs font-semibold text-slate-200 truncate">{getSymbol(stock.symbol)}</p>
                              <p className="text-[9px] text-slate-500 truncate">{stock.name}</p>
                            </div>
                            <div className="text-center min-w-[50px]">
                              <p className="text-sm font-bold text-slate-200">{stock.score}</p>
                            </div>
                            <span className={`text-[10px] font-semibold ${stockRecColor}`}>{stock.recommendation}</span>
                            <div className={`flex items-center gap-1 text-[10px] ${stockIsUp ? 'text-emerald-400' : 'text-red-400'}`}>
                              {stockIsUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              <span>{stockIsUp ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {lastUpdated && (
        <p className="text-[10px] text-slate-600 mt-3 text-center">
          Updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
