import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from 'recharts';
import type { ChartPoint } from '../services/api';
import { GlassTooltip, VolumeTooltip } from './ChartTooltip';

interface PriceChartProps {
  data: ChartPoint[];
  dma50?: number;
  dma200?: number;
}

export function PriceChart({ data, dma50, dma200 }: PriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        No historical data available for this symbol.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} minTickGap={30} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} width={60} tickFormatter={(v) => `₹${v.toFixed(0)}`} />
          <Tooltip content={<GlassTooltip />} />
          {dma50 && dma50 > 0 && <ReferenceLine y={dma50} stroke="#F59E0B" strokeDasharray="4 4" strokeOpacity={0.6} />}
          {dma200 && dma200 > 0 && <ReferenceLine y={dma200} stroke="#EF4444" strokeDasharray="4 4" strokeOpacity={0.6} />}
          <Area type="monotone" dataKey="price" stroke="#10B981" strokeWidth={2} fill="url(#priceGradient)" activeDot={{ r: 5, fill: '#10B981', stroke: '#0f172a', strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
      <ResponsiveContainer width="100%" height={80}>
        <BarChart data={data} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="date" tick={false} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
          <Tooltip content={<VolumeTooltip />} cursor={{ fill: '#1e293b40' }} />
          <Bar dataKey="volume" fill="#334155" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
