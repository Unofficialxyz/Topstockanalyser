// Vercel Serverless Function — proxies Yahoo Finance search + news API
import type { VercelRequest, VercelResponse } from '@vercel/node';

const YF_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const q = (req.query.q as string || '').trim();
  const newsCount = (req.query.newsCount as string) || '12';
  const quotesCount = (req.query.quotesCount as string) || '15';

  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  const url = `${YF_SEARCH}?q=${encodeURIComponent(q)}&quotesCount=${quotesCount}&newsCount=${newsCount}`;

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
