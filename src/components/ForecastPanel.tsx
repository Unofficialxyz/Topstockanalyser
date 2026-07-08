import type { Forecast, HorizonForecast, Recommendation } from '../utils/forecast';
import { Target, Clock, TrendingUp, Zap, Shield, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface ForecastPanelProps {
  forecast: Forecast;
}

const REC_CONFIG: Record<Recommendation, { color: string; bg: string; border: string; glow: string; label: string; intensity: number }> = {
  'STRONG BUY': { color: '#10B981', bg: 'bg-emerald-500/15', border: 'border-emerald-500/50', glow: 'shadow-emerald-500/30', label: 'STRONG BUY', intensity: 100 },
  'BUY': { color: '#22C55E', bg: 'bg-green-500/10', border: 'border-green-500/40', glow: 'shadow-green-500/20', label: 'BUY', intensity: 75 },
  'HOLD': { color: '#F59E0B', bg: 'bg-amber-500/10', border: 'border-amber-500/40', glow: 'shadow-amber-500/10', label: 'HOLD', intensity: 50 },
  'SELL': { color: '#F97316', bg: 'bg-orange-500/10', border: 'border-orange-500/40', glow: '', label: 'SELL', intensity: 25 },
  'STRONG SELL': { color: '#EF4444', bg: 'bg-red-500/15', border: 'border-red-500/50', glow: 'shadow-red-500/30', label: 'STRONG SELL', intensity: 0 },
};

const RISK_CONFIG: Record<string, { color: string; icon: typeof Shield }> = {
  'Very Low': { color: 'text-emerald-400', icon: Shield },
  'Low': { color: 'text-green-400', icon: Shield },
  'Medium': { color: 'text-amber-400', icon: AlertTriangle },
  'High': { color: 'text-orange-400', icon: AlertTriangle },
  'Very High': { color: 'text-red-400', icon: AlertTriangle },
};

function HorizonCard({ horizon }: { horizon: HorizonForecast }) {
  const cfg = REC_CONFIG[horizon.recommendation];
  const riskCfg = RISK_CONFIG[horizon.riskLevel] || RISK_CONFIG['Medium'];
  const Icon = horizon.range.includes('Day') ? Zap : horizon.range.includes('Month') ? TrendingUp : Target;
  const RiskIcon = riskCfg.icon;
  const [showScenarios, setShowScenarios] = useState(false);

  return (
    <div className={`backdrop-blur-md bg-slate-900/80 border ${cfg.border} rounded-2xl p-5 transition-all hover:scale-[1.02] shadow-lg ${cfg.glow}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color: cfg.color }} />
          <div>
            <h4 className="text-sm font-semibold text-slate-200">{horizon.label}</h4>
            <p className="text-[10px] text-slate-500 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {horizon.range}</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-lg ${cfg.bg} border ${cfg.border}`}>
          <span className="text-xs font-bold tracking-wider" style={{ color: cfg.color }}>{cfg.label}</span>
        </div>
      </div>

      <div className="space-y-3">
        {/* Probability Bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Trend Probability</span>
            <span className="text-sm font-bold" style={{ color: cfg.color }}>{horizon.probability}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${horizon.probability}%`, backgroundColor: cfg.color, boxShadow: `0 0 8px ${cfg.color}` }}
            />
          </div>
        </div>

        {/* Target & Return */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="rounded-lg bg-slate-800/40 px-3 py-2">
            <p className="text-[9px] text-slate-500 uppercase">Target Price</p>
            <p className="text-sm font-semibold text-slate-200">₹{horizon.targetPrice.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-slate-800/40 px-3 py-2">
            <p className="text-[9px] text-slate-500 uppercase">Expected Return</p>
            <p className="text-sm font-semibold" style={{ color: horizon.expectedReturn >= 0 ? '#10B981' : '#EF4444' }}>
              {horizon.expectedReturn >= 0 ? '+' : ''}{horizon.expectedReturn.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Risk Level */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30">
          <div className="flex items-center gap-1.5">
            <RiskIcon className={`w-3.5 h-3.5 ${riskCfg.color}`} />
            <span className="text-[10px] text-slate-500">Risk Level</span>
          </div>
          <span className={`text-xs font-semibold ${riskCfg.color}`}>{horizon.riskLevel}</span>
        </div>

        {/* Key Factors */}
        {horizon.keyFactors && horizon.keyFactors.length > 0 && (
          <div className="p-2 rounded-lg bg-slate-800/20 border border-slate-700/30">
            <p className="text-[9px] text-slate-500 uppercase mb-1.5">Key Factors</p>
            <div className="space-y-1">
              {horizon.keyFactors.map((factor, i) => (
                <p key={i} className="text-[10px] text-slate-400">{factor}</p>
              ))}
            </div>
          </div>
        )}

        {/* Scenario Toggle */}
        {horizon.priceScenarios && (
          <>
            <button
              onClick={() => setShowScenarios(!showScenarios)}
              className="w-full flex items-center justify-between text-[10px] text-slate-500 hover:text-slate-400 transition-all py-1.5"
            >
              <span>Price Scenarios</span>
              {showScenarios ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showScenarios && (
              <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-slate-800/30">
                <div className="text-center">
                  <p className="text-[9px] text-emerald-400 uppercase">Bullish</p>
                  <p className="text-xs font-semibold text-slate-200">₹{horizon.priceScenarios.bullish.toFixed(2)}</p>
                </div>
                <div className="text-center border-x border-slate-700/50">
                  <p className="text-[9px] text-slate-400 uppercase">Base</p>
                  <p className="text-xs font-semibold text-slate-300">₹{horizon.priceScenarios.base.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-red-400 uppercase">Bearish</p>
                  <p className="text-xs font-semibold text-slate-200">₹{horizon.priceScenarios.bearish.toFixed(2)}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Confidence & Confidence Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-700/30">
          <span className="text-[10px] text-slate-500">Confidence</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-slate-400"
                style={{ width: `${horizon.confidence}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-400">{horizon.confidence}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ForecastPanel({ forecast }: ForecastPanelProps) {
  const overallCfg = REC_CONFIG[forecast.overall];
  const investmentScore = forecast.investmentScore || 50;

  // Score ring visualization
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (investmentScore / 100) * circumference;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-semibold text-slate-100">Future Predictions</h3>
        </div>
        <div className={`px-4 py-1.5 rounded-xl ${overallCfg.bg} border ${overallCfg.border} shadow-lg ${overallCfg.glow}`}>
          <span className="text-xs text-slate-400 mr-2">Overall:</span>
          <span className="text-sm font-bold tracking-wider" style={{ color: overallCfg.color }}>{forecast.overall}</span>
          <span className="text-xs text-slate-400 ml-2">{forecast.overallProbability}%</span>
        </div>
      </div>

      {/* Investment Score Ring */}
      <div className="flex items-center justify-center gap-6 p-4 rounded-xl bg-slate-800/40 border border-slate-700/30">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="45"
              stroke="#1e293b"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="48"
              cy="48"
              r="45"
              stroke={overallCfg.color}
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-slate-200">{investmentScore}</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-300">Investment Score</p>
          <p className="text-xs text-slate-500 mt-1">Based on technical & fundamental analysis</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: overallCfg.color }} />
            <span className="text-xs text-slate-400">{forecast.overall}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HorizonCard horizon={forecast.shortTerm} />
        <HorizonCard horizon={forecast.mediumTerm} />
        <HorizonCard horizon={forecast.longTerm} />
      </div>
    </div>
  );
}
