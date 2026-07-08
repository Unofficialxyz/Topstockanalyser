import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { fetchIndexQuotes, type IndexQuote } from '../services/api';

interface TickerPanelProps {}

const FALLBACK_TICKERS: IndexQuote[] = [
  { symbol: '^NSEI', name: 'NIFTY 50', price: 0, change: 0, changePercent: 0 },
  { symbol: '^BSESN', name: 'SENSEX', price: 0, change: 0, changePercent: 0 },
  { symbol: '^NSEBANK', name: 'NIFTY BANK', price: 0, change: 0, changePercent: 0 },
  { symbol: 'RELIANCE.NS', name: 'RELIANCE', price: 0, change: 0, changePercent: 0 },
  { symbol: 'TCS.NS', name: 'TCS', price: 0, change: 0, changePercent: 0 },
  { symbol: 'INFY.NS', name: 'INFY', price: 0, change: 0, changePercent: 0 },
  { symbol: 'HDFCBANK.NS', name: 'HDFC BANK', price: 0, change: 0, changePercent: 0 },
  { symbol: 'ICICIBANK.NS', name: 'ICICI BANK', price: 0, change: 0, changePercent: 0 },
];

export function TickerPanel({}: TickerPanelProps) {
  const [tickers, setTickers] = useState<IndexQuote[]>(FALLBACK_TICKERS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchIndexQuotes()
      .then((data) => {
        if (!cancelled && data.length > 0) {
          setTickers(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Activity className="w-4 h-4 text-emerald-400" />
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Live Market Ticker</h3>
      </div>
      <div className="space-y-1.5 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1 custom-scroll">
        {tickers.map((t) => {
          const isUp = t.changePercent >= 0;
          const hasData = t.price > 0;
          return (
            <div
              key={t.symbol}
              className="flex items-center justify-between rounded-lg bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/40 px-3 py-2.5 transition-all duration-200 cursor-default group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isUp ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                  {isUp ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">{t.name || t.symbol}</p>
                  <p className="text-[10px] text-slate-500">{t.symbol}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {hasData ? (
                  <>
                    <p className="text-xs font-semibold text-white">{t.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className={`text-[10px] font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isUp ? '+' : ''}{t.changePercent.toFixed(2)}%
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] text-slate-600 italic">Awaiting data</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {loading && (
        <p className="text-[10px] text-slate-500 text-center animate-pulse">Syncing live quotes…</p>
      )}
    </div>
  );
}
