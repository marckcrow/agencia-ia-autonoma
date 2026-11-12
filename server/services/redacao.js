/**
 * Redação assistida dos agentes — Etapa 4B.
 *
 * Este módulo liga o provedor de IA (`ia.js`) às regras determinísticas do
 * sistema (`agentes.js`). Ele produz RASCUNHOS: nada é gravado aqui.
 *
 * O rascunho volta para o operador com a lista de pendências das validações
 * determinísticas (fonte não confiável, bloco de roteiro faltando, promessa
 * proibida...). Só depois da conferência humana o rascunho é salvo pela rota
 * de registro correspondente, que roda as mesmas validações.
 *
 * Regra de ouro: a IA propõe, o sistema valida, a pessoa decide.
 */
'use strict';

const ia = require('./ia');
const agentesSvc = require('./agentes');

const SISTEMA = [
  'Você é o redator da Agência de IA Autônoma. Responda SEMPRE com um único objeto JSON válido,',
  'sem texto antes ou depois, sem comentários e sem cercas de código.',
  'Escreva em português brasileiro claro, direto, sem promessa de resultado e sem linguagem médica.',
].join(' ');

/** Normaliza o rascunho da pauta para o formato aceito por `validarPauta`. */
function normalizarPauta(bruto, entrada) {
  const p = bruto && typeof bruto === 'object' ? bruto : {};
  const potencial = p.potencial || {};
  const fontes = Array.isArray(p.fontes) ? p.fontes : [];
  return {
    canalId: entrada.canalId,
    titulo: String(p.titulo || entrada.tema || '').trim(),
    resumo: String(p.resumo || '').trim(),
    corpo: String(p.corpo || p.resumo || '').trim(),
    publicoAlvo: String(p.publicoAlvo || '').trim(),
    monetizacao: String(p.monetizacao || '').trim(),
    justificativa: String(p.justificativa || '').trim(),
    potencial: {
      originalidade: Number(potencial.originalidade),
      engajamento: Number(potencial.engajamento),
      monetizacao: Number(potencial.monetizacao),
    },
    fontes: fontes.map((f) => ({
      titulo: String(f.titulo || '').trim(),
      url: String(f.url || '').trim(),
    })),
    origem: 'a1-ia',
    agenteAtual: 'A1',
  };
}

/** Rascunho de pauta (A1). */
async function rascunhoPauta(entrada) {
  const tema = String(entrada.tema || '').trim();
  if (!tema) throw Object.assign(new Error('Informe o tema da pauta.'), { status: 400 });

  const canal = entrada.canal || null;
  const prompt = [
    `Monte uma pauta editorial para o canal "${canal || entrada.canalId}".`,
    `Tema pedido: ${tema}`,
    entrada.contexto ? `Contexto adicional do operador: ${entrada.contexto}` : '',
    '',
    'Responda com JSON exatamente neste formato:',
    '{',
    '  "titulo": "string",',
    '  "resumo": "string (2 a 4 frases)",',
    '  "corpo": "string (o roteiro de produção da pauta)",',
    '  "publicoAlvo": "string",',
    '  "monetizacao": "string (como este conteúdo pode gerar receita)",',
    '  "justificativa": "string (por que vale publicar agora)",',
    '  "potencial": { "originalidade": 0, "engajamento": 0, "monetizacao": 0 },',
    '  "fontes": [ { "titulo": "string", "url": "https://..." } ]',
    '}',
    '',
    'Regras: potencial de 0 a 10; cite apenas fontes que você tem certeza existirem, com URL completa',
    'de domínio confiável (governo, Door, Nature, NIH, documentação oficial). Se não tiver certeza da URL,',
    'deixe a lista de fontes vazia — é melhor do que inventar endereço.',
  ].filter(Boolean).join('\n');

  const { texto, uso } = await ia.chamar(prompt, { sistema: SISTEMA });
  const rascunho = normalizarPauta(ia.extrairJson(texto), entrada);
  const erros = agentesSvc.validarPauta(rascunho);
  return { rascunho, validacao: { ok: erros.length === 0, erros }, uso: uso || null };
}

/** Rascunho de roteiro (A3) a partir de uma pauta já aprovada. */
async function rascunhoRoteiro(pauta) {
  const prompt = [
    `Escreva o roteiro de um vídeo curto (30 a 60 segundos) para a pauta aprovada abaixo.`,
    `Canal: ${pauta.canalId}`,
    `Título da pauta: ${pauta.titulo}`,
    `Resumo: ${pauta.resumo || ''}`,
    `Público-alvo: ${pauta.publicoAlvo || ''}`,
    '',
    'Responda com JSON exatamente neste formato:',
    '{',
    '  "blocos": {',
    '    "abertura": "gancho de até 3 segundos",',
    '    "desenvolvimento": "corpo do vídeo",',
    '    "encerramento": "virada ou conclusão",',
    '    "visual": "sugestões visuais cena a cena",',
    '    "cta": "chamada para ação"',
    '  },',
    '  "legenda": "texto da legenda",',
    '  "hashtags": ["#tag1", "#tag2"]',
    '}',
  ].join('\n');

  const { texto, uso } = await ia.chamar(prompt, { sistema: SISTEMA });
  const bruto = ia.extrairJson(texto);
  const blocos = bruto.blocos || bruto;
  const rascunho = {
    blocos: {
      abertura: String(blocos.abertura || '').trim(),
      desenvolvimento: String(blocos.desenvolvimento || '').trim(),
      encerramento: String(blocos.encerramento || '').trim(),
      visual: String(blocos.visual || '').trim(),
      cta: String(blocos.cta || '').trim(),
    },
    legenda: String(bruto.legenda || '').trim(),
    hashtags: Array.isArray(bruto.hashtags) ? bruto.hashtags.map((h) => String(h).trim()).filter(Boolean) : [],
  };
  const erros = agentesSvc.validarRoteiro({ blocos: rascunho.blocos });
  return { rascunho, validacao: { ok: erros.length === 0, erros }, uso: uso || null };
}

/** Rascunho de parecer do A2 sobre uma pauta. */
async function rascunhoAvaliacao(pauta) {
  const prompt = [
    `Avalie a pauta abaixo como estrategista de conteúdo.`,
    `Canal: ${pauta.canalId}`,
    `Título: ${pauta.titulo}`,
    `Resumo: ${pauta.resumo || ''}`,
    `Público-alvo: ${pauta.publicoAlvo || ''}`,
    `Monetização: ${pauta.monetizacao || ''}`,
    `Fontes: ${(pauta.fontes || []).map((f) => f.url).join(', ') || 'nenhuma'}`,
    '',
    'Responda com JSON exatamente neste formato:',
    '{',
    '  "criticos": { "originalidade": 0, "confiabilidade": 0, "audiencia": 0, "relevancia": 0, "monetizacao": 0 },',
    '  "notaFinal": 0,',
    '  "veredito": "aprovavel | corrigir_antes | nao_recomendada",',
    '  "verificacao": "parecer curto e concreto",',
    '  "alertas": ["string"],',
    '  "tituloSugerido": "string",',
    '  "prioridade": false,',
    '  "motivoPrioridade": "string"',
    '}',
    '',
    'Cada critério vai de 0 a 10; a nota final vai de 0 a 100. Se faltarem fontes verificáveis,',
    'use o veredito "corrigir_antes" e explique no parecer.',
  ].join('\n');

  const { texto, uso } = await ia.chamar(prompt, { sistema: SISTEMA });
  const bruto = ia.extrairJson(texto);
  const criticos = bruto.criticos || {};
  const rascunho = {
    criticos: {
      originalidade: Number(criticos.originalidade),
      confiabilidade: Number(criticos.confiabilidade),
      audiencia: Number(criticos.audiencia),
      relevancia: Number(criticos.relevancia),
      monetizacao: Number(criticos.monetizacao),
    },
    notaFinal: Number(bruto.notaFinal),
    veredito: bruto.veredito,
    verificacao: String(bruto.verificacao || '').trim(),
    alertas: Array.isArray(bruto.alertas) ? bruto.alertas.map((a) => String(a).trim()).filter(Boolean) : [],
    tituloSugerido: bruto.tituloSugerido ? String(bruto.tituloSugerido).trim() : null,
    prioridade: Boolean(bruto.prioridade),
    motivoPrioridade: bruto.motivoPrioridade ? String(bruto.motivoPrioridade).trim() : null,
  };
  const erros = agentesSvc.validarAvaliacao(rascunho);
  return { rascunho, validacao: { ok: erros.length === 0, erros }, uso: uso || null };
}

module.exports = { rascunhoPauta, rascunhoRoteiro, rascunhoAvaliacao };
