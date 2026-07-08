// Vercel Serverless Function — proxies Yahoo Finance chart API server-side
// to bypass browser CORS restrictions. No API key required.
import type { VercelRequest, VercelResponse } from '@vercel/node';

const YF_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const symbol = (req.query.symbol as string || '').toUpperCase();
  const range = (req.query.range as string) || '1y';
  const interval = (req.query.interval as string) || '1d';

  if (!symbol) {
    return res.status(400).json({ error: 'Missing symbol parameter' });
  }

  // Auto-append .NS for Indian NSE stocks if no exchange suffix
  let resolved = symbol;
  if (!symbol.endsWith('.NS') && !symbol.endsWith('.BO') && !symbol.startsWith('^')) {
    resolved = `${symbol}.NS`;
  }

  const url = `${YF_CHART}/${encodeURIComponent(resolved)}?interval=${interval}&range=${range}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Yahoo Finance returned ${response.status}` });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Failed to reach Yahoo Finance', detail: String(err) });
  }
}
