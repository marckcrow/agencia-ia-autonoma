/**
 * Camada de provedor de IA — Etapa 4B.
 *
 * Objetivo: permitir que os agentes A1, A2 e A3 produzam rascunhos usando um
 * provedor de IA, SEM expor chave nenhuma no navegador e SEM transformar o
 * sistema em dependência externa.
 *
 * Regras inegociáveis desta camada:
 *   1. A chave vive apenas em variável de ambiente do SERVIDOR
 *      (IA_API_KEY). Ela nunca é lida pelo frontend nem devolvida por rota.
 *   2. Sem provedor configurado, tudo continua funcionando no modo
 *      determinístico: as validações de `agentes.js` seguem valendo e o
 *      operador preenche o conteúdo manualmente.
 *   3. Nenhum serviço pago é habilitado automaticamente. O provedor só é
 *      usado se alguém configurar as variáveis de ambiente de propósito.
 *   4. O rascunho gerado NUNCA é salvo automaticamente: passa pelas mesmas
 *      validações determinísticas e só entra no banco pela rota explícita
 *      de registro (POST /api/agentes/pautas, .../roteiro, .../avaliacao).
 *
 * Variáveis de ambiente reconhecidas:
 *   IA_PROVEDOR      "openai" (qualquer endpoint compatível com /chat/completions)
 *   IA_BASE_URL      ex.: https://api.openai.com/v1
 *   IA_API_KEY       chave do provedor (NUNCA sai do servidor)
 *   IA_MODELO        ex.: gpt-4o-mini
 *   IA_TEMPERATURA   padrão 0.7
 *   IA_TIMEOUT_MS    padrão 60000
 */
'use strict';

const CONFIG = {
  provedor: process.env.IA_PROVEDOR || null,
  baseUrl: process.env.IA_BASE_URL || null,
  apiKey: process.env.IA_API_KEY || null,
  modelo: process.env.IA_MODELO || process.env.IA_MODEL || null,
  temperatura: Number(process.env.IA_TEMPERATURA || 0.7),
  timeoutMs: Number(process.env.IA_TIMEOUT_MS || 60000),
};

/** Só a verdade: existe provedor utilizável? */
function configurado() {
  return Boolean(CONFIG.provedor && CONFIG.baseUrl && CONFIG.apiKey && CONFIG.modelo);
}

/**
 * Estado público do provedor.
 * NÃO INCLUI a chave. Só mostra o host do endpoint, para o operador conferir
 * qual serviço está em uso.
 */
function status() {
  let host = null;
  if (CONFIG.baseUrl) {
    try {
      host = new URL(CONFIG.baseUrl).host;
    } catch (_) {
      host = null;
    }
  }
  return {
    configurado: configurado(),
    provedor: CONFIG.provedor || null,
    modelo: CONFIG.modelo || null,
    host,
    temperatura: CONFIG.temperatura,
    variaveis: ['IA_PROVEDOR', 'IA_BASE_URL', 'IA_API_KEY', 'IA_MODELO'],
  };
}

/** Extrai JSON de uma resposta possivelmente envolvida em texto ou cercas. */
function extrairJson(texto) {
  const limpo = String(texto || '').trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    return JSON.parse(limpo);
  } catch (_) {
    const inicio = limpo.indexOf('{');
    const fim = limpo.lastIndexOf('}');
    if (inicio >= 0 && fim > inicio) {
      try {
        return JSON.parse(limpo.slice(inicio, fim + 1));
      } catch (_) { /* segue para o erro abaixo */ }
    }
    throw Object.assign(
      new Error('O provedor não devolveu JSON válido.'),
      { status: 502 }
    );
  }
}

/**
 * Uma chamada de chat com o provedor. Lança erro 503 quando não há provedor
 * configurado — o painel trata isso como "modo determinístico".
 */
async function chamar(prompt, { sistema, temperatura } = {}) {
  if (!configurado()) {
    throw Object.assign(
      new Error('Nenhum provedor de IA configurado no servidor (IA_PROVEDOR, IA_BASE_URL, IA_API_KEY, IA_MODELO).'),
      { status: 503 }
    );
  }

  const url = `${String(CONFIG.baseUrl).replace(/\/+$/, '')}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.timeoutMs);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: CONFIG.modelo,
        temperature: temperatura === undefined ? CONFIG.temperatura : temperatura,
        messages: [
          { role: 'system', content: sistema || 'Você é um assistente que responde apenas em JSON válido.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const detalhe = await resp.text().catch(() => '');
      throw Object.assign(
        new Error(`Provedor respondeu HTTP ${resp.status}: ${detalhe.slice(0, 200)}`),
        { status: 502 }
      );
    }

    const json = await resp.json();
    const conteudo = json?.choices?.[0]?.message?.content || '';
    return { texto: conteudo, uso: json.usage || null };
  } catch (e) {
    if (e.name === 'AbortError') {
      throw Object.assign(new Error('O provedor demorou demais e a chamada foi cancelada.'), { status: 504 });
    }
    if (e.status) throw e;
    throw Object.assign(new Error(`Falha ao falar com o provedor: ${e.message}`), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { configurado, status, chamar, extrairJson, CONFIG };
