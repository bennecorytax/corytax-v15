const IBGE_BASE = 'https://servicodados.ibge.gov.br/api/v2/cnae';
const TIMEOUT_MS = Number(process.env.IBGE_TIMEOUT_MS || 20000);

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORYTAX_ALLOW_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Accept,X-Requested-With');
  res.setHeader('X-CORYTAX-Proxy', 'v15-vercel-ibge-cnae');
}

function extractPath(req) {
  // Vercel pode passar como req.query.path (array) ou via req.url
  let parts = [];
  if (req.query && req.query.path) {
    const raw = req.query.path;
    parts = Array.isArray(raw) ? raw : [raw];
  } else if (req.url) {
    // fallback: extrair da URL diretamente
    const url = req.url.split('?')[0];
    parts = url.replace(/^\/api\/ibge\/?/, '').split('/').filter(Boolean);
  }
  return parts.map(p => String(p).replace(/^\/+|\/+$/g, '')).filter(Boolean);
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Metodo nao permitido.' });

  const parts = extractPath(req);
  const first = parts[0] || '';
  const allowed = ['secoes', 'divisoes', 'grupos', 'classes', 'subclasses'];

  if (!first || !allowed.includes(first)) {
    return res.status(400).json({
      ok: false,
      error: 'Rota CNAE IBGE nao permitida.',
      received: parts,
      query: req.query,
      url: req.url
    });
  }

  if (parts.some(p => p === '..' || p.includes('..'))) {
    return res.status(400).json({ ok: false, error: 'Caminho invalido.' });
  }

  const qs = new URLSearchParams();
  Object.entries(req.query || {}).forEach(([key, value]) => {
    if (key === 'path') return;
    if (Array.isArray(
