
const IBGE_BASE = 'https://servicodados.ibge.gov.br/api/v2/cnae';
const TIMEOUT_MS = Number(process.env.IBGE_TIMEOUT_MS || 20000);

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORYTAX_ALLOW_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Accept,X-Requested-With');
  res.setHeader('X-CORYTAX-Proxy', 'v15-vercel-ibge-cnae');
}

function safePath(req) {
  const raw = req.query.path;
  const parts = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const clean = parts.map(part => String(part || '').replace(/^\/+|\/+$/g, '')).filter(Boolean);
  if (clean.some(part => part === '..' || part.includes('..'))) throw new Error('Caminho inválido para API CNAE IBGE.');
  const first = clean[0] || '';
  const allowed = ['secoes', 'divisoes', 'grupos', 'classes', 'subclasses'];
  if (!allowed.includes(first)) throw new Error('Rota CNAE IBGE não permitida.');
  return `/${clean.join('/')}`;
}

function queryString(req) {
  const qs = new URLSearchParams();
  Object.entries(req.query || {}).forEach(([key, value]) => {
    if (key === 'path') return;
    if (Array.isArray(value)) value.forEach(v => qs.append(key, v));
    else if (value !== undefined && value !== null) qs.append(key, value);
  });
  const out = qs.toString();
  return out ? `?${out}` : '';
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok:false, error:'Método não permitido.' });

  let targetUrl = '';
  try {
    targetUrl = `${IBGE_BASE}${safePath(req)}${queryString(req)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const upstream = await fetch(targetUrl, {
      method:'GET',
      headers:{ Accept:'application/json', 'User-Agent':'CORYTAX-IBGE-CNAE-Proxy/15.0' },
      signal:controller.signal,
    });
    clearTimeout(timer);
    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', contentType);
    return res.send(text);
  } catch (error) {
    return res.status(error && error.name === 'AbortError' ? 504 : 502).json({
      ok:false,
      error:'Falha ao consultar API CNAE IBGE pelo backend CORYTAX.',
      detail:error && error.message ? error.message : String(error),
      target:targetUrl,
    });
  }
};
