import type { ReasoningPoint } from '../utils/reasoning';
import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, BarChart3, Activity } from 'lucide-react';

interface ReasoningPanelProps {
  reasoning: ReasoningPoint[];
}

const CATEGORY_ICON = {
  technical: BarChart3,
  momentum: Activity,
  fundamental: TrendingUp,
  sentiment: Brain,
  risk: AlertTriangle,
};

const TONE_STYLE = {
  bullish: { color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', icon: TrendingUp },
  bearish: { color: 'text-red-400', bg: 'bg-red-500/5', border: 'border-red-500/20', icon: TrendingDown },
  neutral: { color: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/20', icon: Minus },
};

export function ReasoningPanel({ reasoning }: ReasoningPanelProps) {
  if (!reasoning || reasoning.length === 0) {
    return (
      <div className="backdrop-blur-md bg-slate-900/80 border border-slate-700/40 rounded-2xl p-5">
        <p className="text-sm text-slate-500">No reasoning data available.</p>
      </div>
    );
  }

  return (
    <div className="backdrop-blur-md bg-slate-900/80 border border-slate-700/40 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-emerald-400" />
        <h3 className="text-base font-semibold text-slate-100">Institutional Reasoning Summary</h3>
        <span className="ml-auto text-[10px] text-slate-500 uppercase tracking-wider">{reasoning.length} signals</span>
      </div>
      <div className="space-y-2.5">
        {reasoning.map((point, idx) => {
          const tone = TONE_STYLE[point.tone];
          const ToneIcon = tone.icon;
          const CatIcon = CATEGORY_ICON[point.category];
          return (
            <div key={idx} className={`flex items-start gap-3 rounded-xl ${tone.bg} border ${tone.border} px-4 py-3 transition-all hover:scale-[1.01]`}>
              <div className={`flex-shrink-0 w-7 h-7 rounded-lg ${tone.bg} flex items-center justify-center`}>
                <CatIcon className={`w-3.5 h-3.5 ${tone.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] uppercase tracking-wider font-semibold ${tone.color}`}>{point.category}</span>
                  <ToneIcon className={`w-3 h-3 ${tone.color}`} />
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{point.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
