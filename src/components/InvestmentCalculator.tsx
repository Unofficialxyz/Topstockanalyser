import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import type { Forecast } from '../utils/forecast';

interface InvestmentCalculatorProps {
  forecast: Forecast;
  currentPrice: number;
  currency?: string;
}

export function InvestmentCalculator({ forecast, currentPrice, currency = 'INR' }: InvestmentCalculatorProps) {
  const [investment, setInvestment] = useState(10000);
  const [selectedHorizon, setSelectedHorizon] = useState<'short' | 'medium' | 'long'>('medium');

  const symbol = currency === 'USD' || currency === 'EUR' ? '$' : currency === 'GBP' ? '£' : currency === 'JPY' ? '¥' : '₹';

  const calculations = useMemo(() => {
    const selectedForecast = selectedHorizon === 'short'
      ? forecast.shortTerm
      : selectedHorizon === 'medium'
        ? forecast.mediumTerm
        : forecast.longTerm;

    const sharesCount = currentPrice > 0 ? investment / currentPrice : 0;
    const targetPrice = selectedForecast.targetPrice;
    const expectedReturn = selectedForecast.expectedReturn;
    const finalValue = investment * (1 + expectedReturn / 100);
    const profitLoss = finalValue - investment;
    const isProfit = profitLoss >= 0;

    const riskScore = (100 - selectedForecast.probability) + (100 - selectedForecast.confidence) / 2;
    const riskLevel = riskScore > 50 ? 'High' : riskScore > 25 ? 'Medium' : 'Low';

    return {
      sharesCount,
      targetPrice,
      expectedReturn,
      finalValue,
      profitLoss,
      isProfit,
      riskLevel,
      recommendation: selectedForecast.recommendation,
      probability: selectedForecast.probability,
      confidence: selectedForecast.confidence,
      range: selectedForecast.range,
    };
  }, [investment, currentPrice, selectedHorizon, forecast]);

  const isBullishRec = calculations.recommendation === 'STRONG BUY' || calculations.recommendation === 'BUY';
  const recColor = isBullishRec ? 'text-emerald-400' : calculations.recommendation === 'STRONG SELL' || calculations.recommendation === 'SELL' ? 'text-red-400' : 'text-amber-400';

  const RecIcon = isBullishRec ? TrendingUp : calculations.recommendation === 'STRONG SELL' || calculations.recommendation === 'SELL' ? TrendingDown : Minus;

  return (
    <div className="backdrop-blur-md bg-slate-900/80 border border-slate-700/40 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Investment Calculator</h3>
      </div>

      {/* Investment Amount Slider */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-slate-400">Investment Amount</label>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">{symbol}</span>
            <input
              type="number"
              value={investment}
              onChange={(e) => setInvestment(Math.max(100, Math.min(10000000, Number(e.target.value))))}
              className="w-28 px-2 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-sm text-slate-200 text-right focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>
        <input
          type="range"
          min="100"
          max="1000000"
          step="100"
          value={investment}
          onChange={(e) => setInvestment(Number(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer slider-thumb"
        />
        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
          <span>{symbol}100</span>
          <span>{symbol}10L</span>
        </div>

        {/* Quick amount buttons */}
        <div className="flex gap-2 mt-3">
          {[1000, 5000, 10000, 50000, 100000, 500000].map((amt) => (
            <button
              key={amt}
              onClick={() => setInvestment(amt)}
              className={`px-2 py-1 rounded-md text-[10px] transition-all ${
                investment === amt
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-800/40 border border-slate-700/30 text-slate-500 hover:bg-slate-700/40'
              }`}
            >
              {amt >= 100000 ? `${symbol}${(amt / 100000).toFixed(0)}L` : `${symbol}${(amt / 1000).toFixed(0)}K`}
            </button>
          ))}
        </div>
      </div>

      {/* Horizon Selection */}
      <div className="mb-5">
        <label className="text-xs text-slate-400 block mb-2">Investment Horizon</label>
        <div className="grid grid-cols-3 gap-2">
          {(['short', 'medium', 'long'] as const).map((h) => {
            const label = h === 'short' ? 'Short-term' : h === 'medium' ? 'Medium-term' : 'Long-term';
            const isSelected = selectedHorizon === h;
            return (
              <button
                key={h}
                onClick={() => setSelectedHorizon(h)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-800/40 border border-slate-700/30 text-slate-500 hover:bg-slate-700/40'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-600 mt-1.5 text-center">{calculations.range}</p>
      </div>

      {/* Results */}
      <div className="space-y-3 p-4 rounded-xl bg-slate-800/40 border border-slate-700/30">
        {/* Shares */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Shares at current price</span>
          <span className="text-sm text-slate-300 font-medium">
            {calculations.sharesCount.toFixed(2)} shares @ {symbol}{currentPrice.toFixed(2)}
          </span>
        </div>

        {/* Target Price */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Target Price ({calculations.range})</span>
          <span className="text-sm text-slate-300 font-medium">{symbol}{calculations.targetPrice.toFixed(2)}</span>
        </div>

        {/* Expected Return */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Expected Return</span>
          <span className={`text-sm font-semibold ${calculations.expectedReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {calculations.expectedReturn >= 0 ? '+' : ''}{calculations.expectedReturn.toFixed(2)}%
          </span>
        </div>

        <div className="h-px bg-slate-700/50 my-2" />

        {/* Final Value */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Projected Value</span>
          <span className={`text-lg font-bold ${calculations.isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
            {symbol}{calculations.finalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>

        {/* Profit/Loss */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Projected {calculations.isProfit ? 'Profit' : 'Loss'}</span>
          <span className={`text-sm font-semibold ${calculations.isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
            {calculations.isProfit ? '+' : ''}{symbol}{calculations.profitLoss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>

        {/* Recommendation */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-700/30">
          <span className="text-xs text-slate-500">Recommendation</span>
          <div className={`flex items-center gap-1.5 ${recColor}`}>
            <RecIcon className="w-4 h-4" />
            <span className="text-sm font-bold">{calculations.recommendation}</span>
          </div>
        </div>

        {/* Probability & Confidence */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="text-center">
            <p className="text-[10px] text-slate-600 uppercase">Probability</p>
            <p className="text-base font-semibold text-slate-200">{calculations.probability}%</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-600 uppercase">Confidence</p>
            <p className="text-base font-semibold text-slate-200">{calculations.confidence}%</p>
          </div>
        </div>

        {/* Risk Level */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-700/30">
          <span className="text-xs text-slate-500">Risk Level</span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
            calculations.riskLevel === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
            calculations.riskLevel === 'Medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
            'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}>
            {calculations.riskLevel} Risk
          </span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 mt-3 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
        <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-300/80 leading-relaxed">
          This calculator provides projections based on technical indicators and historical data. Actual returns may vary significantly. This is not financial advice.
        </p>
      </div>
    </div>
  );
}
