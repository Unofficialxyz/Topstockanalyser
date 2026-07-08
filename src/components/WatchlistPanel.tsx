import { useState, useEffect } from 'react';
import { Star, Trash2, Plus, TrendingUp, TrendingDown, Loader2, RefreshCw } from 'lucide-react';

interface WatchlistPanelProps {
  onSelectStock?: (symbol: string) => void;
}

interface WatchlistQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  country?: string;
}

const STORAGE_KEY = 'stock_watchlist';

export function WatchlistPanel({ onSelectStock }: WatchlistPanelProps) {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<WatchlistQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');

  // Load watchlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save watchlist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  // Fetch quotes for watchlist
  const fetchWatchlistQuotes = async () => {
    if (watchlist.length === 0) {
      setQuotes([]);
      return;
    }

    setLoading(true);
    try {
      const results: WatchlistQuote[] = [];

      await Promise.all(
        watchlist.map(async (symbol) => {
          try {
            const url = `/api/stock?symbol=${encodeURIComponent(symbol)}&range=5d&interval=1d`;
            const res = await fetch(url, { method: 'GET' });
            if (!res.ok) return;
            const raw = await res.json();
            const meta = raw?.chart?.result?.[0]?.meta ?? {};
            const price = meta.regularMarketPrice ?? 0;
            const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? 0;
            const change = price > 0 && prevClose > 0 ? price - prevClose : 0;
            const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

            if (price > 0) {
              results.push({
                symbol,
                name: meta.shortName || meta.symbol || symbol,
                price,
                change,
                changePercent,
                country: meta.exchangeName?.includes('NSI') ? 'India' :
                         meta.exchangeName?.includes('NYQ') || meta.exchangeName?.includes('NMS') ? 'USA' : undefined,
              });
            }
          } catch {
            // Individual failures are non-fatal
          }
        })
      );

      setQuotes(watchlist.map((s) => results.find((r) => r.symbol === s)).filter((r): r is WatchlistQuote => r !== undefined));
    } catch (err) {
      console.error('Failed to fetch watchlist quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlistQuotes();
  }, [watchlist]);

  const addToWatchlist = (symbol: string) => {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized || watchlist.includes(normalized)) return;

    const finalSymbol = normalized.includes('.') ? normalized :
      ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX', 'DIS', 'BA', 'JPM', 'V', 'MA'].includes(normalized) ? normalized :
      `${normalized}.NS`;

    setWatchlist([...watchlist, finalSymbol]);
    setNewSymbol('');
    setAdding(false);
  };

  const removeFromWatchlist = (symbol: string) => {
    setWatchlist(watchlist.filter((s) => s !== symbol));
  };

  const getSymbol = (symbol: string) => symbol.replace('.NS', '').replace('.BO', '').replace('.L', '').replace('.T', '');

  return (
    <div className="backdrop-blur-md bg-slate-900/80 border border-slate-700/40 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400" />
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Watchlist</h3>
          <span className="px-1.5 py-0.5 rounded-md bg-slate-800/60 text-[10px] text-slate-500">
            {watchlist.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchWatchlistQuotes}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 text-slate-400 hover:text-slate-300 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setAdding(true)}
            className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Add Symbol Input */}
      {adding && (
        <div className="mb-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
          <div className="flex gap-2">
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addToWatchlist(newSymbol);
                if (e.key === 'Escape') { setAdding(false); setNewSymbol(''); }
              }}
              placeholder="Enter symbol (e.g., RELIANCE, AAPL)"
              className="flex-1 px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-600/50 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              autoFocus
            />
            <button
              onClick={() => addToWatchlist(newSymbol)}
              disabled={!newSymbol.trim()}
              className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all"
            >
              Add
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Indian stocks auto-add .NS suffix. US stocks use ticker only.
          </p>
        </div>
      )}

      {/* Watchlist Content */}
      {loading && quotes.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      ) : watchlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
          <Star className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-xs text-center mb-3">Your watchlist is empty</p>
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 text-xs font-medium transition-all"
          >
            Add your first stock
          </button>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto custom-scroll">
          {quotes.map((stock) => {
            const isUp = stock.changePercent >= 0;
            return (
              <div
                key={stock.symbol}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 hover:bg-slate-700/40 border border-slate-700/30 group"
              >
                <button
                  onClick={() => onSelectStock?.(stock.symbol)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm font-semibold text-slate-200 group-hover:text-white truncate">
                    {getSymbol(stock.symbol)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-slate-500 truncate">{stock.name}</p>
                    {stock.country && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-slate-700/50 text-slate-600">
                        {stock.country}
                      </span>
                    )}
                  </div>
                </button>

                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-slate-200">
                    ₹{stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className={`flex items-center gap-1 justify-end text-[10px] font-medium ${
                    isUp ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromWatchlist(stock.symbol);
                  }}
                  className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-red-500/20 border border-slate-600/30 hover:border-red-500/30 text-slate-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {quotes.length > 0 && (
        <p className="text-[10px] text-slate-600 mt-3 text-center">
          Auto-refreshes every minute
        </p>
      )}
    </div>
  );
}
