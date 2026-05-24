const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || '';
const TIMEOUT_MS = Number(process.env.LEAD_TIMEOUT_MS || 20000);

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORYTAX_ALLOW_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Accept,X-Requested-With');
  res.setHeader('X-CORYTAX-Lead', 'v15-vercel-lead');
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Método não permitido.' });

  if (!APPS_SCRIPT_URL) {
    return res.status(200).json({
      ok:true,
      stored:false,
      message:'Lead recebido no front-end, mas APPS_SCRIPT_URL não foi configurada nas variáveis de ambiente. Configure para encaminhar à planilha/CRM.'
    });
  }

  try {
    const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const upstream = await fetch(APPS_SCRIPT_URL, {
      method:'POST',
      headers:{ 'Content-Type':'text/plain;charset=utf-8' },
      body:payload,
      signal:controller.signal,
    });
    clearTimeout(timer);
    const text = await upstream.text().catch(() => '');
    return res.status(upstream.ok ? 200 : upstream.status).json({ ok:upstream.ok, stored:upstream.ok, status:upstream.status, response:text.slice(0, 500) });
  } catch (error) {
    return res.status(error && error.name === 'AbortError' ? 504 : 502).json({
      ok:false,
      stored:false,
      error:'Falha ao encaminhar lead pelo backend CORYTAX.',
      detail:error && error.message ? error.message : String(error),
    });
  }
};
