import { useState, useEffect } from 'react';
import { Flame, TrendingUp, TrendingDown, Loader2, RefreshCw, Globe } from 'lucide-react';
import { fetchTrendingQuotes, type IndexQuote } from '../services/api';

interface TrendingStocksPanelProps {
  onSelectStock?: (symbol: string) => void;
}

export function TrendingStocksPanel({ onSelectStock }: TrendingStocksPanelProps) {
  const [stocks, setStocks] = useState<(IndexQuote & { country: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'India' | 'USA' | 'Europe' | 'Asia' | 'Latin America' | 'Oceania'>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const quotes = await fetchTrendingQuotes();
      setStocks(quotes);
    } catch (err) {
      console.error('Failed to fetch trending stocks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const filtered = stocks.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'Asia') return ['India', 'Japan', 'Hong Kong', 'South Korea', 'China', 'Taiwan', 'Singapore'].includes(s.country);
    if (filter === 'Europe') return ['UK', 'Germany', 'France', 'Netherlands', 'Spain', 'Italy', 'Sweden'].includes(s.country);
    if (filter === 'Latin America') return ['Brazil'].includes(s.country);
    if (filter === 'Oceania') return ['Australia'].includes(s.country);
    return s.country === filter;
  });

  const getSymbol = (symbol: string) => symbol.replace('.NS', '').replace('.BO', '').replace('.L', '').replace('.T', '').replace('.HK', '').replace('.DE', '').replace('.PA', '').replace('.TO', '');

  return (
    <div className="backdrop-blur-md bg-slate-900/80 border border-slate-700/40 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Trending Stocks</h3>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 text-slate-400 hover:text-slate-300 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto custom-scroll-x pb-1">
        {(['all', 'India', 'USA', 'Europe', 'Asia', 'Latin America', 'Oceania'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-all ${
              filter === f
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                : 'bg-slate-800/40 border border-slate-700/30 text-slate-500 hover:bg-slate-700/40'
            }`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {/* Stock List */}
      {loading && stocks.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto custom-scroll">
          {filtered.slice(0, 15).map((stock) => {
            const isUp = stock.changePercent >= 0;
            return (
              <button
                key={stock.symbol}
                onClick={() => onSelectStock?.(stock.symbol)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-700/40 border border-slate-700/30 hover:border-slate-600/50 transition-all group"
              >
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-200 group-hover:text-white">
                      {getSymbol(stock.symbol)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-500">
                      {stock.country}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{stock.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-slate-200">
                    {stock.country === 'USA' ? '$' : stock.country === 'UK' ? '£' : stock.country === 'Japan' ? '¥' : '₹'}
                    {stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className={`flex items-center gap-1 justify-end text-xs font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                  </div>
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
              <Globe className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs">No stocks found for this filter</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
