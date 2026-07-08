import { useState, useEffect } from 'react';
import { Globe, TrendingUp, TrendingDown, Loader2, RefreshCw, Coins, Droplets } from 'lucide-react';
import { fetchGlobalIndices, fetchCommodities, type IndexQuote } from '../services/api';

export function MarketOverview() {
  const [indices, setIndices] = useState<IndexQuote[]>([]);
  const [commodities, setCommodities] = useState<(IndexQuote & { type: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'indices' | 'commodities'>('indices');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [indicesData, commoditiesData] = await Promise.all([
        fetchGlobalIndices(),
        fetchCommodities(),
      ]);
      setIndices(indicesData);
      setCommodities(commoditiesData);
    } catch (err) {
      console.error('Failed to fetch market data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="backdrop-blur-md bg-slate-900/80 border border-slate-700/40 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Global Markets</h3>
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
          onClick={() => setActiveTab('indices')}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'indices'
              ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400'
              : 'bg-slate-800/40 border border-slate-700/30 text-slate-500 hover:bg-slate-700/40'
          }`}
        >
          Indices
        </button>
        <button
          onClick={() => setActiveTab('commodities')}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'commodities'
              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
              : 'bg-slate-800/40 border border-slate-700/30 text-slate-500 hover:bg-slate-700/40'
          }`}
        >
          Commodities
        </button>
      </div>

      {/* Content */}
      {loading && indices.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      ) : activeTab === 'indices' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto custom-scroll">
          {indices.map((idx) => {
            const isUp = idx.changePercent >= 0;
            return (
              <div
                key={idx.symbol}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/30"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{idx.flag}</span>
                    <span className="text-xs font-semibold text-slate-200 truncate">{idx.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">{idx.country}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-slate-200">
                    {idx.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className={`flex items-center gap-1 justify-end text-[10px] font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{isUp ? '+' : ''}{idx.changePercent.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto custom-scroll">
          {commodities.map((commodity) => {
            const isUp = commodity.changePercent >= 0;
            const Icon = commodity.type === 'Crypto' ? Coins : commodity.type === 'Energy' ? Droplets : Coins;
            return (
              <div
                key={commodity.symbol}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/30"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    commodity.type === 'Crypto' ? 'bg-orange-500/20' :
                    commodity.type === 'Energy' ? 'bg-yellow-500/20' : 'bg-amber-500/20'
                  }`}>
                    <Icon className={`w-4 h-4 ${
                      commodity.type === 'Crypto' ? 'text-orange-400' :
                      commodity.type === 'Energy' ? 'text-yellow-400' : 'text-amber-400'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{commodity.name}</p>
                    <p className="text-[10px] text-slate-500">{commodity.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-200">
                    ${commodity.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className={`flex items-center gap-1 justify-end text-[10px] font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{isUp ? '+' : ''}{commodity.changePercent.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
