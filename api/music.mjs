// Copyrighted audio is not proxied: only search metadata and official preview URLs.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  const q = String(req.query.q || '').trim().slice(0, 120);
  const country = String(req.query.country || 'US').toUpperCase();
  if (q.length < 2 || !['US','JP','KZ','GB','RU'].includes(country))
    return res.status(400).json({ error: 'Invalid query or country', results: [] });
  const params = new URLSearchParams({term:q,country,media:'music',entity:'song',limit:'50'});
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 7000);
  try {
    const r = await fetch('https://itunes.apple.com/search?' + params, {signal:abort.signal,headers:{accept:'application/json'}});
    if (!r.ok) throw Error('Upstream: ' + r.status);
    const data = await r.json();
    return res.status(200).json({results:Array.isArray(data.results)?data.results:[],source:'itunes'});
  } catch (e) {
    return res.status(502).json({error:'Music catalog unavailable',results:[]});
  } finally { clearTimeout(timer); }
}
