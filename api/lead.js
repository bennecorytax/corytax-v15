/**
 * CORYTAX V20 — /api/lead.js atualizado
 * Envia dados do diagnóstico para Google Apps Script → Gmail
 */

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbznAZSBFat6Pv6UdE0O_mB49rY8TjP59w6PNMdu09c5pkC_joM4w_i0U150dP8p6m0v/exec';
const TIMEOUT_MS = 15000;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORYTAX_ALLOW_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido.' });

  const body = req.body || {};

  // Validar email mínimo
  const email = (body.email || '').trim();
  const nome  = (body.nome || body.razaoSocial || '').trim();

  if (!email && !nome) {
    return res.status(400).json({ ok: false, error: 'Dados insuficientes para envio.' });
  }

  if (!APPS_SCRIPT_URL) {
    return res.status(200).json({
      ok: true,
      stored: false,
      message: 'APPS_SCRIPT_URL não configurada. Configure nas variáveis de ambiente da Vercel.',
    });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const upstream = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome,
        email,
        cnpj:        body.cnpj        || '',
        telefone:    body.telefone    || '',
        cargo:       body.cargo       || '',
        scoreFiscal: body.scoreFiscal || '',
        laudoResumo: body.laudoResumo || '',
        origem:      'CORYTAX-V20-Vercel',
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const data = await upstream.json().catch(() => ({}));
    return res.status(200).json({ ok: true, stored: true, ...data });

  } catch (err) {
    const isTimeout = err && err.name === 'AbortError';
    return res.status(isTimeout ? 504 : 502).json({
      ok: false,
      error: isTimeout ? 'Timeout ao enviar email.' : 'Falha ao enviar email.',
      detail: err && err.message ? err.message : String(err),
    });
  }
};
