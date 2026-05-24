/**
 * CORYTAX V15 — Proxy serverless para Anthropic Claude API
 * Rota: /api/claude/chat
 * Model padrão: claude-sonnet-4-6 (conforme docs.anthropic.com — maio 2026)
 *
 * Variáveis de ambiente necessárias (Vercel > Settings > Environment Variables):
 *   ANTHROPIC_API_KEY   — sua chave em console.anthropic.com/settings/keys
 *   CORYTAX_ALLOW_ORIGIN — domínio do frontend (ex: https://seu-projeto.vercel.app)
 *   CLAUDE_MODEL        — opcional, padrão: claude-sonnet-4-6
 *   CLAUDE_MAX_TOKENS   — opcional, padrão: 1024
 *   CLAUDE_TIMEOUT_MS   — opcional, padrão: 60000
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL     = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOK   = 1024;
const DEFAULT_TIMEOUT   = 60000;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin',  process.env.CORYTAX_ALLOW_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Accept,X-Requested-With');
  res.setHeader('X-CORYTAX-Proxy', 'v15-vercel-claude');
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ ok: false, error: 'Método não permitido.' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      error: 'ANTHROPIC_API_KEY não configurada nas variáveis de ambiente da Vercel.',
      hint: 'Acesse Vercel > Settings > Environment Variables e adicione ANTHROPIC_API_KEY.',
    });
  }

  /* ── Payload enviado pelo frontend ─────────────────────────────────────
     Esperado:
     {
       system?: string,           // system prompt opcional
       messages: [                // obrigatório
         { role: "user"|"assistant", content: string }
       ],
       model?: string,            // opcional, sobrescreve DEFAULT_MODEL
       max_tokens?: number,       // opcional
       stream?: boolean           // opcional — habilita streaming SSE
     }
  ─────────────────────────────────────────────────────────────────────── */
  const body = req.body || {};

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ ok: false, error: 'Campo "messages" obrigatório e não pode ser vazio.' });
  }

  const model      = body.model      || process.env.CLAUDE_MODEL      || DEFAULT_MODEL;
  const max_tokens = body.max_tokens || Number(process.env.CLAUDE_MAX_TOKENS || DEFAULT_MAX_TOK);
  const stream     = body.stream === true;
  const timeout    = Number(process.env.CLAUDE_TIMEOUT_MS || DEFAULT_TIMEOUT);

  const anthropicPayload = {
    model,
    max_tokens,
    messages: body.messages,
    ...(body.system ? { system: body.system } : {}),
    ...(stream      ? { stream: true }        : {}),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const upstream = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'User-Agent':        'CORYTAX-Claude-Proxy/15.0',
      },
      body:   JSON.stringify(anthropicPayload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (stream) {
      // Repassa o stream SSE diretamente para o cliente
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.status(upstream.status);
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      return res.end();
    }

    // Resposta normal (não-stream)
    const data = await upstream.json();
    return res.status(upstream.status).json({ ok: upstream.ok, ...data });

  } catch (err) {
    clearTimeout(timer);
    const isAbort = err && err.name === 'AbortError';
    return res.status(isAbort ? 504 : 502).json({
      ok:     false,
      error:  isAbort ? 'Timeout ao consultar Claude API.' : 'Falha ao consultar Claude API.',
      detail: err && err.message ? err.message : String(err),
      hint:   'Verifique ANTHROPIC_API_KEY e conectividade com api.anthropic.com.',
    });
  }
};
