import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

// Local dev middleware — handles /api/* routes server-side by proxying
// to Yahoo Finance. On Vercel, the /api serverless functions handle these
// routes instead, so this middleware only runs during `vite dev`.
function yahooProxyPlugin(): Plugin {
  return {
    name: 'yahoo-finance-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '', 'http://localhost');
        const pathname = url.pathname;

        if (!pathname.startsWith('/api/')) {
          return next();
        }

        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json',
        };

        if (req.method === 'OPTIONS') {
          res.writeHead(200, corsHeaders);
          res.end();
          return;
        }

        res.setHeader('Access-Control-Allow-Origin', '*');

        try {
          let yfUrl = '';
          const symbol = (url.searchParams.get('symbol') || '').toUpperCase();
          const q = url.searchParams.get('q') || '';

          if (pathname === '/api/stock') {
            const range = url.searchParams.get('range') || '1y';
            const interval = url.searchParams.get('interval') || '1d';
            let resolved = symbol;
            if (!symbol.endsWith('.NS') && !symbol.endsWith('.BO') && !symbol.startsWith('^')) {
              resolved = `${symbol}.NS`;
            }
            yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(resolved)}?interval=${interval}&range=${range}`;
          } else if (pathname === '/api/fundamentals') {
            const modules = url.searchParams.get('modules') || 'summaryDetail,defaultKeyStatistics,financialData';
            let resolved = symbol;
            if (!symbol.endsWith('.NS') && !symbol.endsWith('.BO') && !symbol.startsWith('^')) {
              resolved = `${symbol}.NS`;
            }
            yfUrl = `https://query1.finance.yahoo.com/v7/finance/quoteSummary/${encodeURIComponent(resolved)}?modules=${modules}`;
          } else if (pathname === '/api/search') {
            const newsCount = url.searchParams.get('newsCount') || '12';
            const quotesCount = url.searchParams.get('quotesCount') || '15';
            yfUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=${quotesCount}&newsCount=${newsCount}`;
          } else {
            res.writeHead(404, corsHeaders);
            res.end(JSON.stringify({ error: 'Not found' }));
            return;
          }

          const yfRes = await fetch(yfUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          });

          if (!yfRes.ok) {
            res.writeHead(yfRes.status, corsHeaders);
            res.end(JSON.stringify({ error: `Yahoo Finance returned ${yfRes.status}` }));
            return;
          }

          const data = await yfRes.text();
          res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
          res.end(data);
        } catch (err) {
          res.writeHead(502, corsHeaders);
          res.end(JSON.stringify({ error: 'Proxy failed', detail: String(err) }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), yahooProxyPlugin()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
