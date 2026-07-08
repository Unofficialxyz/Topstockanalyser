import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, TrendingDown, Info, Target, Clock, DollarSign, BarChart3, Layers, ArrowRight, Lightbulb } from 'lucide-react';
import type { Forecast } from '../utils/forecast';

interface InvestmentProjectionPanelProps {
  forecast: Forecast;
  currentPrice: number;
  currency?: string;
  stockName?: string;
}

export function InvestmentProjectionPanel({ forecast, currentPrice, currency = 'INR', stockName }: InvestmentProjectionPanelProps) {
  const [investment, setInvestment] = useState(10000);
  const [selectedHorizon, setSelectedHorizon] = useState<'short' | 'medium' | 'long'>('medium');
  const [showComparison, setShowComparison] = useState(false);

  const symbol = currency === 'USD' || currency === 'EUR' ? '$' : currency === 'GBP' ? '£' : currency === 'JPY' ? '¥' : '₹';

  const projections = useMemo(() => {
    const selectedForecast = selectedHorizon === 'short'
      ? forecast.shortTerm
      : selectedHorizon === 'medium'
        ? forecast.mediumTerm
        : forecast.longTerm;

    // Calculate shares
    const sharesCount = currentPrice > 0 ? investment / currentPrice : 0;

    // Different scenarios based on forecast
    const scenarios = {
      conservative: {
        return: selectedForecast.expectedReturn * 0.5,
        label: 'Conservative',
        description: 'Assuming 50% of expected return',
      },
      expected: {
        return: selectedForecast.expectedReturn,
        label: 'Expected',
        description: 'Based on technical analysis',
      },
      optimistic: {
        return: selectedForecast.expectedReturn * 1.5,
        label: 'Optimistic',
        description: 'Assuming 150% of expected return',
      },
    };

    const results = {
      sharesCount,
      targetPrice: selectedForecast.targetPrice,
      expectedReturn: selectedForecast.expectedReturn,
      scenarios: {
        conservative: {
          ...scenarios.conservative,
          finalValue: investment * (1 + scenarios.conservative.return / 100),
          profit: investment * (scenarios.conservative.return / 100),
        },
        expected: {
          ...scenarios.expected,
          finalValue: investment * (1 + scenarios.expected.return / 100),
          profit: investment * (scenarios.expected.return / 100),
        },
        optimistic: {
          ...scenarios.optimistic,
          finalValue: investment * (1 + scenarios.optimistic.return / 100),
          profit: investment * (scenarios.optimistic.return / 100),
        },
      },
      riskLevel: selectedForecast.riskLevel,
      probability: selectedForecast.probability,
      confidence: selectedForecast.confidence,
      recommendation: selectedForecast.recommendation,
      range: selectedForecast.range,
      investmentScore: forecast.investmentScore,
    };

    // Calculate time-based projections
    const months = selectedHorizon === 'short' ? 0.25 : selectedHorizon === 'medium' ? 2 : 12;
    const monthlyGrowthRate = results.expectedReturn / months;

    return {
      ...results,
      monthlyProjections: Array.from({ length: Math.ceil(months) }, (_, i) => ({
        month: i + 1,
        value: investment * Math.pow(1 + (monthlyGrowthRate / 100), i + 1),
      })),
    };
  }, [investment, currentPrice, selectedHorizon, forecast]);

  const isBullishRec = projections.recommendation === 'STRONG BUY' || projections.recommendation === 'BUY';

  // Time value of money calculations
  const yearlyProjection = useMemo(() => {
    const yearlyReturn = forecast.longTerm.expectedReturn;
    return {
      oneYear: investment * (1 + yearlyReturn / 100 * 0.25),
      threeYears: investment * Math.pow(1 + yearlyReturn / 100 * 0.8, 3),
      fiveYears: investment * Math.pow(1 + yearlyReturn / 100 * 0.6, 5),
      tenYears: investment * Math.pow(1 + yearlyReturn / 100 * 0.4, 10),
    };
  }, [investment, forecast]);

  return (
    <div className="backdrop-blur-md bg-slate-900/80 border border-slate-700/40 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Calculator className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Investment Projection</h3>
            <p className="text-[10px] text-slate-500">If I invest {symbol}{investment.toLocaleString()}, it returns...</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
            isBullishRec ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
          }`}>
            {projections.recommendation}
          </span>
        </div>
      </div>

      {/* Investment Amount Input */}
      <div className="mb-5 p-4 rounded-xl bg-slate-800/40 border border-slate-700/30">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs text-slate-400 font-medium">Investment Amount</label>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">{symbol}</span>
            <input
              type="number"
              value={investment}
              onChange={(e) => setInvestment(Math.max(100, Math.min(10000000, Number(e.target.value))))}
              className="w-32 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-600/50 text-sm text-slate-200 text-right focus:outline-none focus:border-emerald-500/50 font-semibold"
            />
          </div>
        </div>

        {/* Slider */}
        <input
          type="range"
          min="500"
          max="1000000"
          step="500"
          value={investment}
          onChange={(e) => setInvestment(Number(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />

        {/* Quick Amount Buttons */}
        <div className="flex flex-wrap gap-2 mt-3">
          {[1000, 5000, 10000, 25000, 50000, 100000, 500000].map((amt) => (
            <button
              key={amt}
              onClick={() => setInvestment(amt)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                investment === amt
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-700/40 border border-slate-600/30 text-slate-500 hover:bg-slate-700/60'
              }`}
            >
              {symbol}{amt >= 100000 ? `${(amt / 100000).toFixed(amt % 100000 === 0 ? 0 : 1)}L` : `${(amt / 1000).toFixed(0)}K`}
            </button>
          ))}
        </div>
      </div>

      {/* Horizon Selection */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {(['short', 'medium', 'long'] as const).map((h) => {
          const label = h === 'short' ? '1-7 Days' : h === 'medium' ? '1-3 Months' : '1 Year+';
          const sublabel = h === 'short' ? 'Quick Trade' : h === 'medium' ? 'Position Trade' : 'Investment';
          const isSelected = selectedHorizon === h;
          const horizonData = h === 'short' ? forecast.shortTerm : h === 'medium' ? forecast.mediumTerm : forecast.longTerm;

          return (
            <button
              key={h}
              onClick={() => setSelectedHorizon(h)}
              className={`p-3 rounded-xl text-center transition-all ${
                isSelected
                  ? 'bg-emerald-500/20 border border-emerald-500/40'
                  : 'bg-slate-800/40 border border-slate-700/30 hover:bg-slate-700/40'
              }`}
            >
              <Clock className={`w-4 h-4 mx-auto mb-1 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
              <p className={`text-xs font-semibold ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`}>{label}</p>
              <p className="text-[9px] text-slate-500">{sublabel}</p>
              <p className={`text-sm font-bold mt-1 ${horizonData.expectedReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {horizonData.expectedReturn >= 0 ? '+' : ''}{horizonData.expectedReturn.toFixed(1)}%
              </p>
            </button>
          );
        })}
      </div>

      {/* Main Projection Display */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 mb-4">
        <div className="text-center mb-4">
          <p className="text-xs text-slate-500 mb-1">If you invest</p>
          <p className="text-3xl font-bold text-white mb-2">{symbol}{investment.toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-500">in {stockName || 'this stock'}</p>
        </div>

        <div className="flex items-center justify-center gap-4 my-4">
          <ArrowRight className="w-6 h-6 text-emerald-400" />
        </div>

        {/* Three Scenarios */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {Object.entries(projections.scenarios).map(([key, scenario]) => {
            const isExpected = key === 'expected';
            const isProfit = scenario.profit >= 0;
            return (
              <div
                key={key}
                className={`p-3 rounded-xl text-center ${
                  isExpected
                    ? 'bg-emerald-500/10 border border-emerald-500/30'
                    : 'bg-slate-800/40 border border-slate-700/30'
                }`}
              >
                <p className="text-[9px] text-slate-500 uppercase mb-1">{scenario.label}</p>
                <p className={`text-lg font-bold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                  {symbol}{scenario.finalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
                <p className={`text-xs font-semibold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isProfit ? '+' : ''}{scenario.profit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
                <p className={`text-[10px] mt-1 ${isProfit ? 'text-emerald-500' : 'text-red-500'}`}>
                  ({isProfit ? '+' : ''}{scenario.return.toFixed(1)}%)
                </p>
              </div>
            );
          })}
        </div>

        {/* Investment Details */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900/60">
          <div>
            <p className="text-[10px] text-slate-500">Shares</p>
            <p className="text-sm font-semibold text-slate-200">{projections.sharesCount.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">Current Price</p>
            <p className="text-sm font-semibold text-slate-200">{symbol}{currentPrice.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">Target Price</p>
            <p className="text-sm font-semibold text-slate-200">{symbol}{projections.targetPrice.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">Risk Level</p>
            <p className={`text-sm font-semibold ${
              projections.riskLevel === 'Very Low' || projections.riskLevel === 'Low' ? 'text-emerald-400' :
              projections.riskLevel === 'Medium' ? 'text-amber-400' : 'text-red-400'
            }`}>{projections.riskLevel}</p>
          </div>
        </div>
      </div>

      {/* Long-term Projections Toggle */}
      <button
        onClick={() => setShowComparison(!showComparison)}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/30 hover:bg-slate-700/40 transition-all mb-4"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-slate-300">Long-term Projections</span>
        </div>
        <span className="text-xs text-emerald-400">View</span>
      </button>

      {/* Long-term Comparison */}
      {showComparison && (
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/30 mb-4">
          <p className="text-xs text-slate-400 mb-3">What {symbol}{investment.toLocaleString()} could become:</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 rounded-lg bg-slate-900/60 text-center">
              <p className="text-[9px] text-slate-500">1 Year</p>
              <p className="text-md font-bold text-slate-200">{symbol}{yearlyProjection.oneYear.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/60 text-center">
              <p className="text-[9px] text-slate-500">3 Years</p>
              <p className="text-md font-bold text-slate-200">{symbol}{yearlyProjection.threeYears.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/60 text-center">
              <p className="text-[9px] text-slate-500">5 Years</p>
              <p className="text-md font-bold text-slate-200">{symbol}{yearlyProjection.fiveYears.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/60 text-center">
              <p className="text-[9px] text-slate-500">10 Years</p>
              <p className="text-md font-bold text-slate-200">{symbol}{yearlyProjection.tenYears.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>
      )}

      {/* Probability & Confidence */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/30 text-center">
          <Target className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <p className="text-[10px] text-slate-500">Probability</p>
          <p className="text-xl font-bold text-slate-200">{projections.probability}%</p>
        </div>
        <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/30 text-center">
          <BarChart3 className="w-4 h-4 text-blue-400 mx-auto mb-1" />
          <p className="text-[10px] text-slate-500">Confidence</p>
          <p className="text-xl font-bold text-slate-200">{projections.confidence}%</p>
        </div>
      </div>

      {/* Investment Score */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-300">Investment Score</span>
          </div>
          <span className={`text-2xl font-bold ${
            projections.investmentScore >= 70 ? 'text-emerald-400' :
            projections.investmentScore >= 50 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {projections.investmentScore}/100
          </span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
        <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-300/80 leading-relaxed">
          These projections are based on technical analysis and historical data. Past performance does not guarantee future results. This is not financial advice.
        </p>
      </div>
    </div>
  );
}
