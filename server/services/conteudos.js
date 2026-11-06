/**
 * Serviço de conteúdos e decisões de direção.
 *
 * Toda alteração passa por aqui e é gravada no banco local via `store`.
 * Regras invioláveis desta etapa:
 *   - Nenhuma publicação.
 *   - Nenhuma conexão externa.
 *   - Toda decisão gera registro imutável em `decisoes`.
 *   - Conteúdo só entra na biblioteca com autoria declarada (agente ou manual).
 */
'use strict';

const { randomUUID } = require('crypto');

const STATUS = {
  pauta: { label: 'Pauta', agente: 'A1' },
  roteiro: { label: 'Roteiro', agente: 'A3' },
  producao: { label: 'Produção', agente: 'A4' },
  edicao: { label: 'Edição', agente: 'A5' },
  aprovacao: { label: 'Aguardando aprovação', agente: 'A6' },
  ajuste: { label: 'Em ajuste', agente: 'A3' },
  pauta_aprovada: { label: 'Pauta aprovada', agente: 'A3' },
  em_roteiro: { label: 'Em roteiro', agente: 'A3' },
  aprovado: { label: 'Aprovado', agente: 'A6' },
  rejeitado: { label: 'Rejeitado', agente: null },
  publicado: { label: 'Publicado', agente: 'A6' },
};

const TIPOS = ['roteiro', 'video', 'pauta', 'legenda'];

function agora() {
  return new Date().toISOString();
}

function validarDecisao(statusAtual, decisao) {
  if (!['aprovar', 'ajustes', 'rejeitar'].includes(decisao)) {
    return 'Decisão inválida. Use aprovar, ajustes ou rejeitar.';
  }
  if (statusAtual === 'publicado') {
    return 'Conteúdo já publicado não pode ser alterado nesta etapa.';
  }
  if (decisao === 'aprovar' && (statusAtual === 'aprovado' || statusAtual === 'pauta_aprovada')) {
    return 'Este item já está aprovado.';
  }
  if (statusAtual === 'em_roteiro') {
    return 'Este item já gerou roteiro e não recebe nova decisão de pauta.';
  }
  if (decisao === 'rejeitar' && statusAtual === 'rejeitado') {
    return 'Este conteúdo já está rejeitado.';
  }
  return null;
}

/** Cria um conteúdo. Usado pela biblioteca e, futuramente, pelos agentes. */
function criarConteudo(db, dados) {
  const canal = db.canais.find((c) => c.id === dados.canalId);
  if (!canal) throw Object.assign(new Error('Canal inexistente'), { status: 400 });

  const tipo = TIPOS.includes(dados.tipo) ? dados.tipo : 'roteiro';
  if (!dados.titulo || !String(dados.titulo).trim()) {
    throw Object.assign(new Error('O título é obrigatório'), { status: 400 });
  }

  const conteudo = {
    id: randomUUID(),
    canalId: canal.id,
    titulo: String(dados.titulo).trim().slice(0, 160),
    tipo,
    resumo: String(dados.resumo || '').trim().slice(0, 2000),
    corpo: String(dados.corpo || '').trim().slice(0, 20000),
    origem: dados.origem || 'manual',
    agenteAtual: dados.agenteAtual || null,
    status: dados.status && STATUS[dados.status] ? dados.status : 'aprovacao',
    slot: dados.slot || null,
    criadoEm: agora(),
    atualizadoEm: agora(),
    aprovadoEm: null,
    rejeitadoEm: null,
    versao: 1,
  };
  db.conteudos.push(conteudo);
  registrarHistorico(db, {
    tipo: 'criacao',
    conteudoId: conteudo.id,
    texto: `Conteúdo criado: "${conteudo.titulo}" (${canal.nome}).`,
  });
  return conteudo;
}

function registrarHistorico(db, entrada) {
  db.historico = db.historico || [];
  db.historico.push(Object.assign({ em: agora() }, entrada));
  db.historico = db.historico.map((h) => h);
  if (db.historico.length > 500) db.historico = db.historico.slice(-500);
}

/** Aplica uma decisão de direção a um conteúdo. */
function decidir(db, conteudoId, { decisao, orientacoes, autor }) {
  const conteudo = db.conteudos.find((c) => c.id === conteudoId);
  if (!conteudo) throw Object.assign(new Error('Conteúdo não encontrado'), { status: 404 });

  const erro = validarDecisao(conteudo.status, decisao);
  if (erro) throw Object.assign(new Error(erro), { status: 409 });

  const texto = String(orientacoes || '').trim().slice(0, 4000);
  if ((decisao === 'ajustes' || decisao === 'rejeitar') && !texto) {
    throw Object.assign(
      new Error(decisao === 'ajustes'
        ? 'Descreva as orientações para devolver o conteúdo em ajustes.'
        : 'Informe o motivo da rejeição.'),
      { status: 400 }
    );
  }

  const anterior = conteudo.status;
  const mapa = {
    aprovar: { status: conteudo.tipo === 'pauta' ? 'pauta_aprovada' : 'aprovado', campoData: 'aprovadoEm' },
    ajustes: { status: 'ajuste', campoData: null },
    rejeitar: { status: 'rejeitado', campoData: 'rejeitadoEm' },
  };
  const alvo = mapa[decisao];

  conteudo.status = alvo.status;
  conteudo.atualizadoEm = agora();
  if (alvo.campoData) conteudo[alvo.campoData] = agora();
  if (decisao === 'aprovar') conteudo.rejeitadoEm = null;
  if (decisao === 'ajustes') {
    conteudo.ajustesSolicitados = (conteudo.ajustesSolicitados || 0) + 1;
    conteudo.orientacoes = texto;
    conteudo.aprovadoEm = null;
  }
  if (decisao === 'rejeitar') {
    conteudo.motivoRejeicao = texto;
    conteudo.aprovadoEm = null;
  }

  const decisaoRegistro = {
    id: randomUUID(),
    conteudoId,
    decisao,
    statusAnterior: anterior,
    statusNovo: alvo.status,
    orientacoes: texto || null,
    autor: autor || 'Direção',
    em: agora(),
  };
  db.decisoes = db.decisoes || [];
  db.decisoes.push(decisaoRegistro);

  const rotulo = { aprovar: 'Aprovado', ajustes: 'Devolvido para ajustes', rejeitar: 'Rejeitado' }[decisao];
  registrarHistorico(db, {
    tipo: 'decisao',
    conteudoId,
    texto: `${rotulo}: "${conteudo.titulo}"${texto ? ` — ${texto.slice(0, 140)}` : ''}`,
  });

  return { conteudo, decisao: decisaoRegistro };
}

/** Reenvia para aprovação um conteúdo que estava em ajustes. */
function reenviar(db, conteudoId, { corpo, orientacoes }) {
  const conteudo = db.conteudos.find((c) => c.id === conteudoId);
  if (!conteudo) throw Object.assign(new Error('Conteúdo não encontrado'), { status: 404 });
  if (conteudo.status !== 'ajuste') {
    throw Object.assign(new Error('Somente conteúdos em ajuste podem ser reenviados'), { status: 409 });
  }
  if (corpo != null) conteudo.corpo = String(corpo).trim().slice(0, 20000);
  conteudo.status = 'aprovacao';
  conteudo.versao = (conteudo.versao || 1) + 1;
  conteudo.atualizadoEm = agora();
  conteudo.reenviadoEm = agora();
  db.decisoes.push({
    id: randomUUID(),
    conteudoId,
    decisao: 'reenvio',
    statusAnterior: 'ajuste',
    statusNovo: 'aprovacao',
    orientacoes: String(orientacoes || '').trim() || null,
    autor: 'Direção',
    em: agora(),
  });
  registrarHistorico(db, {
    tipo: 'reenvio',
    conteudoId,
    texto: `Reenviado para aprovação: "${conteudo.titulo}" (versão ${conteudo.versao}).`,
  });
  return conteudo;
}

/** Só conteúdo aprovado pode ser agendado. Trava de segurança do sistema. */
function podePublicar(conteudo) {
  return Boolean(conteudo && conteudo.status === 'aprovado' && conteudo.aprovadoEm);
}

module.exports = { criarConteudo, decidir, reenviar, podePublicar, STATUS, TIPOS };
