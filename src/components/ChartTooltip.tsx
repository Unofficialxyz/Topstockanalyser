import type { ChartPoint } from '../services/api';

interface TooltipPayload {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string; dataKey: string }>;
  label?: string;
}

export function GlassTooltip({ active, payload, label }: TooltipPayload) {
  if (!active || !payload || payload.length === 0) return null;

  const price = payload.find((p) => p.dataKey === 'price')?.value ?? 0;
  const volume = payload.find((p) => p.dataKey === 'volume')?.value ?? 0;

  return (
    <div className="backdrop-blur-md bg-slate-900/90 border border-emerald-500/30 rounded-xl px-4 py-3 shadow-2xl shadow-emerald-500/10">
      <p className="text-xs font-medium text-slate-400 mb-2">{label}</p>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" />
        <span className="text-sm font-semibold text-white">₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      {volume > 0 && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-xs text-slate-300">Vol: {(volume / 1_000_000).toFixed(2)}M</span>
        </div>
      )}
    </div>
  );
}

export function VolumeTooltip({ active, payload, label }: TooltipPayload) {
  if (!active || !payload || payload.length === 0) return null;
  const vol = payload[0]?.value ?? 0;
  return (
    <div className="backdrop-blur-md bg-slate-900/90 border border-amber-500/30 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs font-medium text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-amber-300">{(vol / 1_000_000).toFixed(2)}M shares</p>
    </div>
  );
}

export type { ChartPoint };
