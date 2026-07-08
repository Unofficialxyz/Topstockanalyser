import type { NewsItem } from '../services/api';
import { Newspaper, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface NewsPanelProps {
  news: NewsItem[];
}

const SENTIMENT_STYLE = {
  positive: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: TrendingUp, label: 'Positive' },
  negative: { color: 'text-red-400', bg: 'bg-red-500/10', icon: TrendingDown, label: 'Negative' },
  neutral: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Minus, label: 'Neutral' },
};

export function NewsPanel({ news }: NewsPanelProps) {
  const positive = news.filter((n) => n.sentiment === 'positive').length;
  const negative = news.filter((n) => n.sentiment === 'negative').length;
  const neutral = news.filter((n) => n.sentiment === 'neutral').length;
  const total = news.length || 1;

  return (
    <div className="backdrop-blur-md bg-slate-900/80 border border-slate-700/40 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">News & Sentiment Feed</h3>
      </div>

      {news.length === 0 ? (
        <p className="text-xs text-slate-500 italic">No news data available for this symbol.</p>
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            <div className="flex-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-center">
              <p className="text-lg font-bold text-emerald-400">{positive}</p>
              <p className="text-[9px] text-slate-500 uppercase">Positive</p>
            </div>
            <div className="flex-1 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-center">
              <p className="text-lg font-bold text-amber-400">{neutral}</p>
              <p className="text-[9px] text-slate-500 uppercase">Neutral</p>
            </div>
            <div className="flex-1 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-center">
              <p className="text-lg font-bold text-red-400">{negative}</p>
              <p className="text-[9px] text-slate-500 uppercase">Negative</p>
            </div>
          </div>

          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden flex mb-4">
            <div className="h-full bg-emerald-500" style={{ width: `${(positive / total) * 100}%` }} />
            <div className="h-full bg-amber-500" style={{ width: `${(neutral / total) * 100}%` }} />
            <div className="h-full bg-red-500" style={{ width: `${(negative / total) * 100}%` }} />
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scroll">
            {news.map((item, idx) => {
              const style = SENTIMENT_STYLE[item.sentiment];
              const Icon = style.icon;
              return (
                <a
                  key={idx}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/30 px-3 py-2.5 transition-all group"
                >
                  <div className={`flex-shrink-0 w-6 h-6 rounded-md ${style.bg} flex items-center justify-center`}>
                    <Icon className={`w-3 h-3 ${style.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-300 leading-snug group-hover:text-white transition-colors line-clamp-2">{item.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{item.publisher}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
