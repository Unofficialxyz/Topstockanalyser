import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Loader2, AlertCircle, TrendingUp, TrendingDown, LineChart, IndianRupee, DollarSign, Globe, RefreshCw } from 'lucide-react';
import { fetchStockAnalysis, searchSymbols, type StockAnalysis, type SearchResult } from './services/api';
import { PriceChart } from './components/PriceChart';
import { AnalysisGrid } from './components/AnalysisGrid';
import { ForecastPanel } from './components/ForecastPanel';
import { ReasoningPanel } from './components/ReasoningPanel';
import { NewsPanel } from './components/NewsPanel';
import { TickerPanel } from './components/TickerPanel';
import { InvestmentProjectionPanel } from './components/InvestmentProjectionPanel';
import { BestStockToInvest } from './components/BestStockToInvest';
import { BestStockByCountry } from './components/BestStockByCountry';
import { TrendingStocksPanel } from './components/TrendingStocksPanel';
import { MarketOverview } from './components/MarketOverview';
import { WatchlistPanel } from './components/WatchlistPanel';

const POPULAR_SYMBOLS = [
  // India - Top
  'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'ITC',
  'ANANDRATHI', 'BHARTIARTL', 'WIPRO', 'ZOMATO', 'TATAMOTORS', 'BAJFINANCE',
  'HCLTECH', 'LT', 'AXISBANK', 'MARUTI', 'SUNPHARMA', 'TITAN', 'ASIANPAINT',
  // USA - Top
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'JPM',
  'NFLX', 'AMD', 'INTC', 'DIS', 'BA', 'V', 'MA', 'PYPL', 'UBER', 'SHOP',
  // Europe
  'SAP', 'SIE.DE', 'AIR.PA', 'ASML.AS', 'NESN.SW', 'NOVO-B.CO',
  // Asia
  '2330.TW', '005930.KS', '0700.HK', '9988.HK', 'BABA', 'JD',
];

export default function App() {
  const [symbolInput, setSymbolInput] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live symbol search with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!symbolInput.trim() || symbolInput.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await searchSymbols(symbolInput);
      setSuggestions(results);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [symbolInput]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !analysis) return;
    const interval = setInterval(() => {
      handleSearch(analysis.quote.symbol, true);
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, analysis]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = useCallback(async (sym?: string, silent = false) => {
    const symbol = (sym ?? symbolInput).trim();
    if (!symbol) return;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await fetchStockAnalysis(symbol);
      if (result.quote.regularMarketPrice === 0 && result.chart.length === 0) {
        if (!silent) setError(`No data returned for "${symbol}". Verify the ticker is valid.`);
      } else {
        setAnalysis(result);
      }
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : 'Failed to fetch stock data.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [symbolInput]);

  // Determine currency based on exchange
  const getCurrencySymbol = () => {
    if (!analysis) return '₹';
    const exch = analysis.quote.exchange.toLowerCase();
    if (exch.includes('nms') || exch.includes('nyq') || exch.includes('nas')) return '$';
    if (exch.includes('lse')) return '£';
    if (exch.includes('tse')) return '¥';
    return '₹';
  };

  const CurrencyIcon = getCurrencySymbol() === '$' ? DollarSign : IndianRupee;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Ambient background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/60">
        <div className="px-4 lg:px-6 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 mr-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">GlobalTerminal</h1>
              <p className="text-[10px] text-slate-500 -mt-0.5">International Market Analyzer</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px] max-w-md relative" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
            <input
              type="text"
              value={symbolInput}
              onChange={(e) => { setSymbolInput(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setShowSuggestions(false); handleSearch(); } }}
              placeholder="Search any stock (India, US, UK, Japan, Europe...)"
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-700/50 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/50 shadow-2xl z-50 max-h-72 overflow-y-auto custom-scroll">
                {suggestions.map((s) => (
                  <button
                    key={s.symbol}
                    onClick={() => {
                      const display = s.symbol.replace('.NS', '').replace('.BO', '').replace('.L', '').replace('.T', '').replace('.HK', '');
                      setSymbolInput(display);
                      setShowSuggestions(false);
                      handleSearch(s.symbol);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-emerald-500/10 transition-all text-left border-b border-slate-800/40 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-500">{s.symbol} · {s.exchange}</p>
                    </div>
                    <span className="text-[9px] text-slate-600 uppercase flex-shrink-0 ml-2">{s.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold text-white transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Analyze
          </button>
        </div>

        {/* Popular tickers */}
        <div className="px-4 lg:px-6 pb-2.5 flex items-center gap-2 overflow-x-auto custom-scroll-x">
          <span className="text-[10px] text-slate-600 uppercase tracking-wider flex-shrink-0">Popular:</span>
          {POPULAR_SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => { setSymbolInput(s); handleSearch(s); }}
              className="flex-shrink-0 px-2.5 py-1 rounded-md bg-slate-800/50 hover:bg-emerald-500/10 border border-slate-700/40 hover:border-emerald-500/30 text-[11px] text-slate-400 hover:text-emerald-400 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-4 px-4 lg:px-6 py-4 relative">
        {/* Left Sidebar */}
        <aside className="w-full lg:w-80 flex-shrink-0 space-y-4 order-2 lg:order-1">
          <BestStockToInvest onSelectStock={(symbol) => { setSymbolInput(symbol.replace('.NS', '')); handleSearch(symbol); }} />
          <BestStockByCountry onSelectStock={(symbol) => { setSymbolInput(symbol.replace('.NS', '')); handleSearch(symbol); }} />
          <WatchlistPanel onSelectStock={(symbol) => { setSymbolInput(symbol.replace('.NS', '')); handleSearch(symbol); }} />
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 space-y-4 order-1 lg:order-2">
          {error && (
            <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {!analysis && !loading && !error && (
            <WelcomeState />
          )}

          {loading && !analysis && (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
              <p className="text-sm text-slate-400">Fetching live market data & computing analytics...</p>
            </div>
          )}

          {analysis && (
            <>
              {/* Stock Header */}
              <StockHeader analysis={analysis} autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} />

              {/* Price Chart */}
              <div className="backdrop-blur-md bg-slate-900/80 border border-slate-700/40 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Price & Volume History</h3>
                  </div>
                  <div className="flex items-center gap-4 text-[10px]">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-400" /> 50 DMA</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-400" /> 200 DMA</span>
                  </div>
                </div>
                <PriceChart data={analysis.chart} dma50={analysis.indicators.dma50} dma200={analysis.indicators.dma200} />
              </div>

              {/* Analysis Grid */}
              <AnalysisGrid quote={analysis.quote} indicators={analysis.indicators} />

              {/* Investment Projection + Forecast */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <InvestmentProjectionPanel
                  forecast={analysis.forecast}
                  currentPrice={analysis.quote.regularMarketPrice}
                  currency={getCurrencySymbol() === '$' ? 'USD' : 'INR'}
                  stockName={analysis.quote.shortName}
                />
                <ForecastPanel forecast={analysis.forecast} />
              </div>

              {/* Reasoning + News */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <ReasoningPanel reasoning={analysis.reasoning} />
                </div>
                <div>
                  <NewsPanel news={analysis.news} />
                </div>
              </div>
            </>
          )}
        </main>

        {/* Right Sidebar */}
        <aside className="w-full lg:w-72 flex-shrink-0 space-y-4 order-3">
          <TickerPanel />
          <MarketOverview />
          <TrendingStocksPanel onSelectStock={(symbol) => { setSymbolInput(symbol.replace('.NS', '')); handleSearch(symbol); }} />
        </aside>
      </div>
    </div>
  );
}

function StockHeader({ analysis, autoRefresh, setAutoRefresh }: { analysis: StockAnalysis; autoRefresh: boolean; setAutoRefresh: (v: boolean) => void }) {
  const q = analysis.quote;
  const isUp = q.regularMarketChange >= 0;
  const changeColor = isUp ? 'text-emerald-400' : 'text-red-400';
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  const currencySymbol = q.exchange.toLowerCase().includes('nms') || q.exchange.toLowerCase().includes('nyq') || q.exchange.toLowerCase().includes('nas') ? '$' : '₹';

  return (
    <div className="backdrop-blur-md bg-slate-900/80 border border-slate-700/40 rounded-2xl p-5">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-white">{q.shortName || q.symbol}</h2>
            <span className="px-2 py-0.5 rounded-md bg-slate-800/60 text-[10px] text-slate-400 border border-slate-700/40">{q.exchange}</span>
          </div>
          <p className="text-xs text-slate-500">{q.longName || q.symbol}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-slate-300">{currencySymbol}</span>
            <span className="text-2xl font-bold text-white">{q.regularMarketPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className={`flex items-center gap-1.5 justify-end mt-1 ${changeColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm font-semibold">{isUp ? '+' : ''}{q.regularMarketChange.toFixed(2)} ({isUp ? '+' : ''}{q.regularMarketChangePercent.toFixed(2)}%)</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/60">
        <div>
          <p className="text-[10px] text-slate-500 uppercase">Day Range</p>
          <p className="text-xs text-slate-300">{currencySymbol}{q.regularMarketDayLow.toFixed(2)} - {currencySymbol}{q.regularMarketDayHigh.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase">52W Range</p>
          <p className="text-xs text-slate-300">{currencySymbol}{q.fiftyTwoWeekLow.toFixed(2)} - {currencySymbol}{q.fiftyTwoWeekHigh.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase">Market Cap</p>
          <p className="text-xs text-slate-300">{q.marketCap > 0 ? `${currencySymbol}${(q.marketCap / 1e12).toFixed(2)}T` : 'N/A'}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase">Volume</p>
          <p className="text-xs text-slate-300">{q.regularMarketVolume > 0 ? `${(q.regularMarketVolume / 1e6).toFixed(2)}M` : 'N/A'}</p>
        </div>
      </div>

      {/* Auto-refresh toggle */}
      <div className="flex items-center justify-end mt-4 pt-3 border-t border-slate-800/60">
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            autoRefresh
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
              : 'bg-slate-800/50 border border-slate-700/40 text-slate-500 hover:bg-slate-700/50'
          }`}
        >
          <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} />
          {autoRefresh ? 'Live Updates ON' : 'Enable Live Updates'}
        </button>
      </div>
    </div>
  );
}

function WelcomeState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/20 flex items-center justify-center mb-6">
        <Globe className="w-8 h-8 text-emerald-400" />
      </div>
      <h2 className="text-2xl font-bold text-slate-200 mb-2">GlobalTerminal</h2>
      <p className="text-sm text-slate-500 max-w-xl mb-6">
        Search any stock from India, USA, UK, Japan, Hong Kong, or Europe to get real-time analysis,
        predictive forecasts, and institutional reasoning. Data is fetched live from Yahoo Finance.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 max-w-3xl w-full mb-8">
        <FeatureCard title="60+ Countries" desc="Stocks from global exchanges" />
        <FeatureCard title="Investment Calc" desc="Slider to project returns" />
        <FeatureCard title="Stock of the Day" desc="AI-selected best picks" />
        <FeatureCard title="Live Updates" desc="Auto-refresh every 30s" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full">
        <FeatureCard title="Quant Engine" desc="RSI, MACD, DMA50/200, volume spikes" />
        <FeatureCard title="Forecast Matrix" desc="Short, medium & long-term probability scoring" />
        <FeatureCard title="Reasoning AI" desc="Data-backed institutional analysis" />
      </div>
    </div>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="backdrop-blur-md bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 text-left">
      <h3 className="text-sm font-semibold text-emerald-400 mb-1">{title}</h3>
      <p className="text-xs text-slate-500">{desc}</p>
    </div>
  );
}
