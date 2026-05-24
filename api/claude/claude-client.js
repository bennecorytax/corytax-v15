/**
 * CORYTAX V15 — Exemplo de integração com /api/claude/chat
 * Inclua este script no public/index.html ou como módulo separado.
 *
 * Model IDs válidos (Anthropic, maio 2026):
 *   claude-opus-4-6        — mais capaz, uso pesado
 *   claude-sonnet-4-6      — recomendado: custo x desempenho (padrão aqui)
 *   claude-haiku-4-5       — mais rápido e barato
 */

// ─── Configuração ────────────────────────────────────────────────────────────
const CLAUDE_PROXY = window.CORYTAX_CLAUDE_API_URL || '/api/claude/chat';

// ─── 1. Chamada simples (sem stream) ─────────────────────────────────────────
async function consultarClaude(pergunta, systemPrompt = '') {
  const payload = {
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: pergunta }],
    ...(systemPrompt ? { system: systemPrompt } : {}),
  };

  const res = await fetch(CLAUDE_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

  // A API retorna content[0].text para respostas de texto
  return data.content?.[0]?.text ?? '';
}

// ─── 2. Chamada com stream (resposta palavra por palavra) ─────────────────────
async function consultarClaudeStream(pergunta, onChunk, systemPrompt = '') {
  const payload = {
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    stream: true,
    messages: [{ role: 'user', content: pergunta }],
    ...(systemPrompt ? { system: systemPrompt } : {}),
  };

  const res = await fetch(CLAUDE_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Anthropic stream: cada linha é "data: {...}" ou "data: [DONE]"
    const lines = buffer.split('\n');
    buffer = lines.pop(); // guarda linha incompleta

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') return;
      try {
        const evt = JSON.parse(raw);
        // Evento com texto delta
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          onChunk(evt.delta.text);
        }
      } catch (_) { /* linha malformada, ignora */ }
    }
  }
}

// ─── 3. Conversa multi-turno (histórico no front) ────────────────────────────
const historicoConversa = [];

async function enviarMensagem(texto) {
  historicoConversa.push({ role: 'user', content: texto });

  const payload = {
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: 'Você é o assistente fiscal CORYTAX. Responda em português, de forma objetiva.',
    messages: historicoConversa,
  };

  const res  = await fetch(CLAUDE_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

  const resposta = data.content?.[0]?.text ?? '';
  historicoConversa.push({ role: 'assistant', content: resposta });
  return resposta;
}

// ─── Exemplos de uso ─────────────────────────────────────────────────────────

// Simples:
// consultarClaude('O que é CST IBS/CBS?').then(console.log);

// Stream:
// consultarClaudeStream('Explique cálculo de tributos', chunk => process.stdout.write(chunk));

// Multi-turno:
// await enviarMensagem('Qual o prazo de apuração do IBS?');
// await enviarMensagem('E no caso de microempresas?');
