/**
 * Agentes A1, A2 e A3 — regras de domínio.
 *
 * Regras invioláveis:
 *   - A3 só roda sobre pauta com status `pauta_aprovada` (trava no servidor).
 *   - Pauta com afirmação factual sem fonte verificável é recusada.
 *   - Tema de saúde sem evidência científica é recusado; promessa de resultado é proibida.
 *   - Roteiro só é aceito com os cinco blocos obrigatórios.
 *   - Nenhum crédito é gasto aqui: estes agentes apenas validam e persistem o
 *     que foi produzido numa execução dedicada.
 */
'use strict';

const { randomUUID } = require('crypto');

const BLOCOS_ROTEIRO = [
  { chave: 'abertura', label: 'Abertura impactante' },
  { chave: 'desenvolvimento', label: 'Desenvolvimento' },
  { chave: 'encerramento', label: 'Encerramento' },
  { chave: 'visual', label: 'Sugestões visuais' },
  { chave: 'cta', label: 'Chamada para ação' },
];

const ACENTOS = {
  originalidade: 'originalidade', confiabilidade: 'confiabilidade',
  audiencia: 'audiência', relevancia: 'relevância', monetizacao: 'monetização',
};

const valorCritico = (c, k) => (c && c[k] != null ? c[k] : c ? c[ACENTOS[k]] : undefined);

const PROMESSAS_PROIBIDAS = [
  'cura garantida', 'cura definitiva', 'elimina a doença', 'acaba com a dor para sempre',
  'resultado garantido', 'garantido em 7 dias', 'sem contraindicação', 'milagroso',
  'substitui o médico', 'substitui remédio', 'emagrece sem esforço',
];

const FONTES_CONFIAVEIS = [
  'who.int', 'paho.org', 'gov.br', 'nih.gov', 'ncbi.nlm.nih.gov', 'pubmed.ncbi.nlm.nih.gov',
  'cochrane.org', 'cochranelibrary.com', 'nature.com', 'science.org', 'sciencedirect.com',
  'thelancet.com', 'nejm.org', 'bmj.com', 'jamanetwork.com', 'springer.com', 'cell.com',
  'arxiv.org', 'acm.org', 'ieee.org', 'w3.org', 'ietf.org', 'developer.mozilla.org',
  'openai.com', 'anthropic.com', 'deepmind.google', 'ai.google', 'microsoft.com',
  'huggingface.co', 'github.com', 'nasa.gov', 'esa.int', 'noaa.gov', 'usgs.gov',
  'un.org', 'unesco.org', 'worldbank.org', 'ibge.gov.br', 'ipea.gov.br', 'inpe.br',
  'fiocruz.br', 'butantan.gov.br', 'scielo.br', 'reuters.com', 'apnews.com', 'bbc.com',
  'statnews.com', 'technologyreview.com', 'ieee-spectrum.org',
  'blog.google', 'cloud.google.com', 'mittechreview.com.br', 'sciencedaily.com',
  'medicalxpress.com', 'medicalnewstoday.com', 'cnn.com', 'opb.org', 'oregonencyclopedia.org',
  'nobelprize.org', 'scientificamerican.com', 'phys.org', 'sciencealert.com', 'usda.gov',
  'health.harvard.edu', 'harvardhealth.org', 'bmj.com', 'bmjgroup.com', 'eurekalert.org',
  'nature.com', 'scitechdaily.com',
];

const DOMINIOS_BLOQUEADOS = [
  'facebook.com', 'instagram.com', 'tiktok.com', 'x.com', 'twitter.com', 'pinterest.com',
  'quora.com', 'reddit.com', 'medium.com', 'blogspot.com', 'wordpress.com',
];

const UNIDADES = ['A1', 'A2', 'A3'];

function agora() {
  return new Date().toISOString();
}

function dominioDe(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch (_) {
    return null;
  }
}

/** Classifica a fonte: primária/oficial, confiável ou não confiável. */
/** Classifica a fonte em: oficial/científica, confiável ou recusada. */
function classificarFonte(url) {
  const d = dominioDe(url);
  if (!d) return { ok: false, motivo: 'URL inválida' };
  if (DOMINIOS_BLOQUEADOS.some((b) => d === b || d.endsWith('.' + b))) {
    return { ok: false, motivo: 'Rede social/blog: não é fonte verificável', dominio: d };
  }
  const confiavel = FONTES_CONFIAVEIS.some((c) => d === c || d.endsWith('.' + c));
  if (!confiavel) {
    return { ok: false, motivo: 'Domínio fora da lista de fontes confiáveis', dominio: d };
  }
  // "científica/oficial" é reservado a evidência primária: órgão de saúde/ciência,
  // periódico revisado por pares ou repositório acadêmico. Blogs corporativos e
  // veículos de notícia contam como confiáveis, mas não como evidência científica.
  const CIENTIFICOS = [
    'who.int', 'paho.org', 'nih.gov', 'ncbi.nlm.nih.gov', 'pubmed.ncbi.nlm.nih.gov',
    'cochrane.org', 'cochranelibrary.com', 'nature.com', 'science.org', 'sciencedirect.com',
    'thelancet.com', 'nejm.org', 'bmj.com', 'jamanetwork.com', 'springer.com', 'cell.com',
    'scielo.br', 'fiocruz.br', 'butantan.gov.br', 'nasa.gov', 'nobelprize.org', 'usda.gov',
  ];
  const cientifica = CIENTIFICOS.some((c) => d === c || d.endsWith('.' + c));
  const orgaoPublico = /\.gov(\.|$)|\.edu(\.|$)/.test(d) || d.endsWith('.gov.br');
  return {
    ok: true,
    tipo: cientifica || orgaoPublico ? 'oficial/científica' : 'confiável',
    dominio: d,
  };
}

/* ------------------------------ validação de pauta ------------------------------ */

function validarPauta(dados) {
  const erros = [];
  if (!dados.titulo || !String(dados.titulo).trim()) erros.push('Título obrigatório');
  if (!dados.resumo || !String(dados.resumo).trim()) erros.push('Resumo obrigatório');
  if (!dados.publicoAlvo) erros.push('Público-alvo obrigatório');
  if (!dados.monetizacao) erros.push('Oportunidade de monetização obrigatória');

  const pot = dados.potencial || {};
  ['originalidade', 'engajamento', 'monetizacao'].forEach((k) => {
    const v = Number(pot[k]);
    if (!Number.isFinite(v) || v < 0 || v > 10) erros.push(`Potencial "${k}" deve ser de 0 a 10`);
  });

  const fontes = Array.isArray(dados.fontes) ? dados.fontes : [];
  if (dados.temAfirmacaoFactual !== false && fontes.length === 0) {
    erros.push('Afirmação factual sem fonte verificável');
  }
  fontes.forEach((f) => {
    const c = classificarFonte(f.url);
    if (!c.ok) erros.push(`Fonte recusada (${f.url || 'sem URL'}): ${c.motivo || 'domínio não confiável'}`);
  });

  const texto = [dados.titulo, dados.resumo, dados.justificativa].filter(Boolean).join(' ').toLowerCase();
  PROMESSAS_PROIBIDAS.forEach((p) => {
    if (texto.includes(p)) erros.push(`Promessa de resultado proibida: "${p}"`);
  });

  if (dados.canalId === 'poder-50' || /sa[uú]de|sono|exerc[ií]cio|nutri|doen[cç]a|rem[eé]dio|rem[eé]dios|medicament/i.test(texto)) {
    const cientifica = fontes.some((f) => {
      const c = classificarFonte(f.url);
      return c.ok && c.tipo === 'oficial/científica';
    });
    if (!cientifica) {
      erros.push('Tema de saúde: exige ao menos uma fonte científica ou oficial (órgão de saúde, estudo revisado por pares)');
    }
  }

  return erros;
}

/* ------------------------------ criação de pauta ------------------------------ */

function criarPauta(db, dados) {
  const canal = db.canais.find((c) => c.id === dados.canalId);
  if (!canal) throw Object.assign(new Error('Canal inexistente'), { status: 400 });

  const erros = validarPauta(dados);
  if (erros.length) {
    throw Object.assign(new Error('Pauta recusada'), { status: 422, detalhes: erros });
  }

  const pot = dados.potencial;
  const nota = Math.round(
    ((Number(pot.originalidade) + Number(pot.engajamento) + Number(pot.monetizacao)) / 30) * 100
  );

  const pauta = {
    id: randomUUID(),
    canalId: canal.id,
    titulo: String(dados.titulo).trim().slice(0, 160),
    tipo: 'pauta',
    resumo: String(dados.resumo).trim().slice(0, 2000),
    corpo: String(dados.corpo || dados.resumo || '').slice(0, 20000),
    publicoAlvo: String(dados.publicoAlvo).slice(0, 400),
    monetizacao: String(dados.monetizacao).slice(0, 400),
    justificativa: String(dados.justificativa || '').slice(0, 2000),
    potencial: {
      originalidade: Number(pot.originalidade),
      engajamento: Number(pot.engajamento),
      monetizacao: Number(pot.monetizacao),
      nota,
    },
    fontes: (dados.fontes || []).map((f) => {
      const c = classificarFonte(f.url);
      return {
        titulo: String(f.titulo || '').slice(0, 200),
        url: String(f.url),
        tipo: c.tipo,
        dominio: c.dominio,
        consultadaEm: f.consultadaEm || agora(),
      };
    }),
    origem: dados.origem || 'a1',
    agenteAtual: dados.origem === 'a1' ? 'A1' : dados.agenteAtual || 'A1',
    execucaoId: dados.execucaoId || null,
    status: dados.status || 'aprovacao',
    slot: null,
    criadoEm: agora(),
    atualizadoEm: agora(),
    aprovadoEm: null,
    rejeitadoEm: null,
    versao: 1,
  };

  db.conteudos.push(pauta);
  db.historico.push({
    em: agora(),
    tipo: 'pauta',
    conteudoId: pauta.id,
    texto: `Pauta do A1 registrada: "${pauta.titulo}" (${canal.nome}, nota ${nota}/100).`,
  });
  return pauta;
}

/* ------------------------------ roteiro (A3) ------------------------------ */

function validarRoteiro(dados) {
  const erros = [];
  const blocos = dados.blocos || {};
  BLOCOS_ROTEIRO.forEach((b) => {
    if (!blocos[b.chave] || !String(blocos[b.chave]).trim()) {
      erros.push(`Bloco obrigatório ausente: ${b.label}`);
    }
  });
  return erros;
}

function criarRoteiro(db, pautaId, dados) {
  const pauta = db.conteudos.find((c) => c.id === pautaId);
  if (!pauta) throw Object.assign(new Error('Pauta não encontrada'), { status: 404 });
  if (pauta.status !== 'pauta_aprovada') {
    throw Object.assign(
      new Error('O A3 só produz roteiro sobre pauta aprovada pela direção.'),
      { status: 409 }
    );
  }
  const erros = validarRoteiro(dados);
  if (erros.length) throw Object.assign(new Error('Roteiro recusado'), { status: 422, detalhes: erros });

  const blocos = dados.blocos;
  const corpo = BLOCOS_ROTEIRO.map((b) => `${b.label.toUpperCase()}\n${blocos[b.chave]}`).join('\n\n');

  const roteiro = {
    id: randomUUID(),
    canalId: pauta.canalId,
    pautaId: pauta.id,
    titulo: dados.titulo || pauta.titulo,
    tipo: 'roteiro',
    resumo: dados.resumo || pauta.resumo,
    corpo,
    blocos: {
      abertura: String(blocos.abertura),
      desenvolvimento: String(blocos.desenvolvimento),
      encerramento: String(blocos.encerramento),
      visual: String(blocos.visual),
      cta: String(blocos.cta),
    },
    duracaoSegundos: dados.duracaoSegundos || null,
    legenda: dados.legenda || null,
    hashtags: dados.hashtags || null,
    fontes: pauta.fontes || [],
    origem: 'a3',
    agenteAtual: 'A3',
    execucaoId: dados.execucaoId || null,
    status: 'aprovacao',
    slot: null,
    criadoEm: agora(),
    atualizadoEm: agora(),
    aprovadoEm: null,
    rejeitadoEm: null,
    versao: 1,
  };

  db.conteudos.push(roteiro);
  pauta.status = 'em_roteiro';
  pauta.atualizadoEm = agora();
  db.historico.push({
    em: agora(),
    tipo: 'roteiro',
    conteudoId: roteiro.id,
    texto: `Roteiro do A3 produzido a partir da pauta "${pauta.titulo}".`,
  });
  return roteiro;
}

/* ------------------------------ avaliação (A2) ------------------------------ */

const CRITERIOS_A2 = ['originalidade', 'confiabilidade', 'audiencia', 'relevancia', 'monetizacao'];

function validarAvaliacao(dados) {
  const erros = [];
  const c = dados.criticos || {};
  CRITERIOS_A2.forEach((k) => {
    // aceita a chave sem acento ou com acento (compatibilidade com o cliente)
    const valor = c[k] != null ? c[k] : c[ACENTOS[k]];
    const v = Number(valor);
    if (!Number.isFinite(v) || v < 0 || v > 10) erros.push(`Critério "${k}" deve ser de 0 a 10`);
  });
  const nota = Number(dados.notaFinal);
  if (!Number.isFinite(nota) || nota < 0 || nota > 100) erros.push('Nota final deve ser de 0 a 100');
  if (!['aprovavel', 'corrigir_antes', 'nao_recomendada'].includes(dados.veredito)) {
    erros.push('Veredito inválido');
  }
  if (!dados.verificacao) erros.push('Parecer de verificação obrigatório');
  return erros;
}

/** A2 avalia uma pauta do A1. Não aprova nada: só registra parecer. */
function avaliarPauta(db, pautaId, dados) {
  const pauta = db.conteudos.find((c) => c.id === pautaId);
  if (!pauta) throw Object.assign(new Error('Pauta não encontrada'), { status: 404 });
  if (pauta.tipo !== 'pauta') {
    throw Object.assign(new Error('O A2 só avalia pautas'), { status: 400 });
  }
  const erros = validarAvaliacao(dados);
  if (erros.length) throw Object.assign(new Error('Avaliação recusada'), { status: 422, detalhes: erros });

  const avaliacao = {
    id: randomUUID(),
    pautaId,
    critico: {
      originalidade: Number(valorCritico(dados.criticos, 'originalidade')),
      confiabilidade: Number(valorCritico(dados.criticos, 'confiabilidade')),
      audiencia: Number(valorCritico(dados.criticos, 'audiencia')),
      relevancia: Number(valorCritico(dados.criticos, 'relevancia')),
      monetizacao: Number(valorCritico(dados.criticos, 'monetizacao')),
    },
    notaFinal: Number(dados.notaFinal),
    veredito: dados.veredito,
    verificacao: String(dados.verificacao).slice(0, 4000),
    alertas: (dados.alertas || []).map((a) => String(a).slice(0, 500)),
    tituloSugerido: dados.tituloSugerido ? String(dados.tituloSugerido).slice(0, 160) : null,
    prioridade: Boolean(dados.prioridade),
    motivoPrioridade: dados.motivoPrioridade ? String(dados.motivoPrioridade).slice(0, 500) : null,
    execucaoId: dados.execucaoId || null,
    agente: 'A2',
    em: agora(),
  };

  db.avaliacoes = db.avaliacoes || [];
  db.avaliacoes.push(avaliacao);

  pauta.avaliacao = {
    notaFinal: avaliacao.notaFinal,
    veredito: avaliacao.veredito,
    alertas: avaliacao.alertas,
    verificacao: avaliacao.verificacao,
    tituloSugerido: avaliacao.tituloSugerido,
    prioridade: avaliacao.prioridade,
    motivoPrioridade: avaliacao.motivoPrioridade,
    avaliadaEm: avaliacao.em,
    agente: 'A2',
  };
  pauta.atualizadoEm = agora();
  // A2 nunca muda o status: a decisão continua exclusivamente da direção.

  db.historico.push({
    em: agora(),
    tipo: 'avaliacao',
    conteudoId: pauta.id,
    texto: `A2 avaliou "${pauta.titulo}": nota ${avaliacao.notaFinal}/100, veredito ${avaliacao.veredito}` +
      (avaliacao.alertas.length ? `, ${avaliacao.alertas.length} alerta(s)` : '') + '.',
  });
  return avaliacao;
}

/**
 * Revisão final de pauta: aplica título definitivo, público, justificativa,
 * monetização e fontes verificadas. NUNCA aprova — o status volta (ou permanece)
 * em `aprovacao`, e a decisão é exclusivamente da direção.
 */
function revisarPauta(db, pautaId, dados) {
  const pauta = db.conteudos.find((c) => c.id === pautaId);
  if (!pauta) throw Object.assign(new Error('Pauta não encontrada'), { status: 404 });
  if (pauta.tipo !== 'pauta') throw Object.assign(new Error('Só pautas podem ser revisadas'), { status: 400 });

  const erros = [];
  if (!dados.tituloDefinitivo || !String(dados.tituloDefinitivo).trim()) erros.push('Título definitivo obrigatório');
  if (!dados.publicoAlvo) erros.push('Público-alvo obrigatório');
  if (!dados.justificativa) erros.push('Justificativa editorial obrigatória');
  if (!dados.monetizacao) erros.push('Oportunidade de monetização obrigatória');
  const fontes = Array.isArray(dados.fontes) ? dados.fontes : [];
  if (!fontes.length) erros.push('Pauta precisa de ao menos uma fonte verificada');
  fontes.forEach((f) => {
    const c = classificarFonte(f.url);
    if (!c.ok) erros.push(`Fonte recusada (${f.url}): ${c.motivo || 'domínio não confiável'}`);
  });
  const textoPauta = [dados.tituloDefinitivo, dados.justificativa].filter(Boolean).join(' ');
  const temaSaude = /sa[uú]de|sono|exerc[ií]cio|for[cç]a|nutri|doen[cç]a|rem[eé]dio|medicament|solid[aã]o/i.test(textoPauta);
  if (pauta.canalId === 'poder-50' || temaSaude) {
    const cientifica = fontes.some((f) => {
      const c = classificarFonte(f.url);
      return c.ok && c.tipo === 'oficial/científica';
    });
    if (!cientifica) erros.push('Tema de saúde: exige ao menos uma fonte científica ou oficial');
  }
  if (erros.length) throw Object.assign(new Error('Revisão recusada'), { status: 422, detalhes: erros });

  const anterior = pauta.titulo;
  pauta.tituloAnterior = pauta.tituloAnterior || pauta.titulo;
  pauta.titulo = String(dados.tituloDefinitivo).trim().slice(0, 160);
  pauta.publicoAlvo = String(dados.publicoAlvo).slice(0, 400);
  pauta.justificativa = String(dados.justificativa).slice(0, 2000);
  pauta.monetizacao = String(dados.monetizacao).slice(0, 400);
  pauta.fontes = fontes.map((f) => {
    const c = classificarFonte(f.url);
    return {
      titulo: String(f.titulo || '').slice(0, 220),
      url: String(f.url),
      papel: f.papel ? String(f.papel).slice(0, 400) : null,
      tipo: c.tipo,
      dominio: c.dominio,
      consultadaEm: agora(),
    };
  });
  pauta.correcoes = (dados.correcoes || []).map((x) => String(x).slice(0, 600));
  pauta.ressalvaSaude = dados.ressalvaSaude ? String(dados.ressalvaSaude).slice(0, 800) : null;
  pauta.revisaoFinal = {
    em: agora(),
    por: dados.autor || 'Direção',
    vereditoAnterior: pauta.avaliacao ? pauta.avaliacao.veredito : null,
  };
  pauta.versao = (pauta.versao || 1) + 1;
  pauta.atualizadoEm = agora();
  // Status volta para a fila: a revisão nunca aprova nada.
  pauta.status = 'aprovacao';
  pauta.aprovadoEm = null;

  db.historico.push({
    em: agora(),
    tipo: 'revisao_final',
    conteudoId: pauta.id,
    texto: `Revisão final aplicada: "${anterior}" → "${pauta.titulo}". ${pauta.fontes.length} fonte(s) verificada(s), ` +
      `${pauta.correcoes.length} correção(ões). Status mantido em aguardando aprovação.`,
  });
  return pauta;
}

function registrarCalendario(db, dados) {
  const plano = {
    id: randomUUID(),
    agente: 'A2',
    observacao: String(dados.observacao || '').slice(0, 2000),
    semanas: (dados.semanas || []).map((s) => ({
      semana: String(s.semana),
      foco: String(s.foco || ''),
      slots: (s.slots || []).map((x) => ({
        canalId: x.canalId,
        dia: String(x.dia || ''),
        hora: String(x.hora || ''),
        pautaId: x.pautaId || null,
        titulo: String(x.titulo || ''),
      })),
    })),
    status: 'proposta', // nunca 'aprovado': a direção decide
    em: agora(),
  };
  db.calendarios = db.calendarios || [];
  db.calendarios.push(plano);
  db.historico.push({
    em: agora(),
    tipo: 'calendario',
    texto: `A2 propôs calendário editorial com ${plano.semanas.reduce((t, s) => t + s.slots.length, 0)} slots em ${plano.semanas.length} semana(s) — proposta, não aprovada.`,
  });
  return plano;
}

/* ------------------------------ execuções ------------------------------ */

function abrirExecucao(db, { agente, descricao, tetoCreditos }) {
  if (!UNIDADES.includes(agente)) {
    throw Object.assign(new Error('Agente inválido'), { status: 400 });
  }
  const exec = {
    id: randomUUID(),
    agente,
    descricao: descricao || '',
    iniciadaEm: agora(),
    encerradaEm: null,
    tetoCreditos: Number(tetoCreditos) || null,
    creditos: 0,
    itensGerados: 0,
    status: 'em_andamento',
  };
  db.execucoes = db.execucoes || [];
  db.execucoes.push(exec);
  return exec;
}

function encerrarExecucao(db, execucaoId, { creditos, itensGerados, status, observacao, uso, chamadasProvedor }) {
  const exec = (db.execucoes || []).find((e) => e.id === execucaoId);
  if (!exec) throw Object.assign(new Error('Execução não encontrada'), { status: 404 });
  exec.encerradaEm = agora();
  exec.creditos = Number(creditos) || 0;
  exec.itensGerados = Number(itensGerados) || 0;
  exec.status = status || 'concluida';
  if (observacao) exec.observacao = String(observacao).slice(0, 2000);
  if (uso) exec.uso = uso;
  if (Number(chamadasProvedor) > 0) exec.chamadasProvedor = Number(chamadasProvedor);
  if (exec.tetoCreditos && exec.creditos > exec.tetoCreditos) {
    exec.status = 'excedeu_teto';
  }
  return exec;
}

/** Soma um item gerado à execução que o produziu (auditoria). */
function registrarItemGerado(db, execucaoId) {
  if (!execucaoId) return null;
  const exec = (db.execucoes || []).find((e) => e.id === execucaoId);
  if (!exec) return null;
  exec.itensGerados = (exec.itensGerados || 0) + 1;
  return exec;
}

module.exports = {
  avaliarPauta,
  validarAvaliacao,
  revisarPauta,
  registrarCalendario,
  CRITERIOS_A2,
  criarPauta,
  validarPauta,
  criarRoteiro,
  validarRoteiro,
  abrirExecucao,
  encerrarExecucao,
  registrarItemGerado,
  classificarFonte,
  BLOCOS_ROTEIRO,
  FONTES_CONFIAVEIS,
};
