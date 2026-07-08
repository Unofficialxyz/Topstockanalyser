import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Loader2, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { fetchGainersLosers, type IndexQuote } from '../services/api';

interface TopMoversProps {
  onSelectStock?: (symbol: string) => void;
}

export function TopMovers({ onSelectStock }: TopMoversProps) {
  const [gainers, setGainers] = useState<IndexQuote[]>([]);
  const [losers, setLosers] = useState<IndexQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'gainers' | 'losers'>('gainers');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { gainers: g, losers: l } = await fetchGainersLosers();
      setGainers(g);
      setLosers(l);
    } catch (err) {
      console.error('Failed to fetch movers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getSymbol = (symbol: string) => symbol.replace('.NS', '').replace('.BO', '').replace('.L', '').replace('.T', '').replace('.HK', '');

  const current = activeView === 'gainers' ? gainers : losers;
  const Icon = activeView === 'gainers' ? TrendingUp : TrendingDown;
  const color = activeView === 'gainers' ? 'emerald' : 'red';

  return (
    <div className="backdrop-blur-md bg-slate-900/80 border border-slate-700/40 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 text-${color}-400`} />
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Top Movers</h3>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 text-slate-400 hover:text-slate-300 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4">
        <button
          onClick={() => setActiveView('gainers')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            activeView === 'gainers'
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
              : 'bg-slate-800/40 border border-slate-700/30 text-slate-500 hover:bg-slate-700/40'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          Gainers
        </button>
        <button
          onClick={() => setActiveView('losers')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            activeView === 'losers'
              ? 'bg-red-500/20 border border-red-500/40 text-red-400'
              : 'bg-slate-800/40 border border-slate-700/30 text-slate-500 hover:bg-slate-700/40'
          }`}
        >
          <ArrowDownRight className="w-3.5 h-3.5" />
          Losers
        </button>
      </div>

      {/* Content */}
      {loading && current.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {current.map((stock, index) => {
            const isUp = stock.changePercent >= 0;
            return (
              <button
                key={stock.symbol}
                onClick={() => onSelectStock?.(stock.symbol)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 hover:bg-slate-700/40 border border-slate-700/30 hover:border-slate-600/50 transition-all group"
              >
                {/* Rank */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  index === 0
                    ? activeView === 'gainers'
                      ? 'bg-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/30 text-red-300'
                    : 'bg-slate-700/50 text-slate-500'
                }`}>
                  {index + 1}
                </div>

                {/* Stock details */}
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-slate-200 group-hover:text-white truncate">
                    {getSymbol(stock.symbol)}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">{stock.name}</p>
                </div>

                {/* Price & Change */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-slate-200">
                    ₹{stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className={`flex items-center gap-1 justify-end text-xs font-semibold ${
                    isUp ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                  </div>
                </div>
              </button>
            );
          })}

          {current.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p className="text-xs">No {activeView} found at the moment</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
