
const TARGET_BASE = (process.env.TRIBUTOS_TARGET_BASE || 'https://consumo.tributos.gov.br:60442/servico/calcular-tributos-consumo/api').replace(/\/$/, '');
const TIMEOUT_MS = Number(process.env.TRIBUTOS_TIMEOUT_MS || 30000);
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 6 * 1024 * 1024);

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORYTAX_ALLOW_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Accept,Authorization,X-Requested-With');
  res.setHeader('Access-Control-Expose-Headers', 'x-warning-dados-simulados,content-type,x-corytax-proxy');
  res.setHeader('X-CORYTAX-Proxy', 'v15-vercel-tributos');
}

function safePath(req) {
  const raw = req.query.path;
  const parts = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const clean = parts.map(part => String(part || '').replace(/^\/+|\/+$/g, '')).filter(Boolean);
  if (clean.some(part => part === '..' || part.includes('..'))) {
    throw new Error('Caminho inválido para proxy.');
  }
  const path = `/${clean.join('/')}`;
  if (!path.startsWith('/calculadora/')) {
    throw new Error('Rota não permitida. Use apenas endpoints /calculadora da API oficial.');
  }
  return path;
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

function bodyToUpstream(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  if (req.body === undefined || req.body === null) return undefined;
  if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) return req.body;
  const text = JSON.stringify(req.body);
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) throw new Error(`Payload acima do limite permitido (${MAX_BODY_BYTES} bytes).`);
  return text;
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ ok:false, error:'Método não permitido.' });
  }

  let targetUrl = '';
  try {
    const upstreamPath = safePath(req);
    targetUrl = `${TARGET_BASE}${upstreamPath}${queryString(req)}`;
    const body = bodyToUpstream(req);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const upstream = await fetch(targetUrl, {
      method:req.method,
      headers:{
        Accept:req.headers.accept || 'application/json',
        ...(body ? { 'Content-Type': req.headers['content-type'] || 'application/json' } : {}),
        'User-Agent':'CORYTAX-Tributos-Proxy/15.0',
      },
      body,
      signal:controller.signal,
    });
    clearTimeout(timer);

    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
    const warning = upstream.headers.get('x-warning-dados-simulados') || '';
    const responseText = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', contentType);
    if (warning) res.setHeader('x-warning-dados-simulados', warning);
    return res.send(responseText);
  } catch (error) {
    const isAbort = error && error.name === 'AbortError';
    return res.status(isAbort ? 504 : 502).json({
      ok:false,
      error:isAbort ? 'Timeout ao consultar API oficial.' : 'Falha ao consultar API oficial pelo backend CORYTAX.',
      detail:error && error.message ? error.message : String(error),
      target:targetUrl,
      hint:'Confirme se a função serverless consegue acessar consumo.tributos.gov.br na porta 60442. Se o provedor bloquear essa porta, será necessário usar outro backend ou a calculadora oficial offline.'
    });
  }
};
