/**
 * Serviço de indicadores de produção.
 *
 * REGRA DE HONESTIDADE: todo número aqui é derivado de conteúdo REAL existente
 * no banco. Não há dados fictícios, nem preenchimento de zeros com valores de
 * exemplo. Quando não há conteúdo, o indicador mostra 0 e a origem é declarada.
 */
'use strict';

const STATUS = [
  { id: 'pauta', label: 'Pauta', agente: 'a1' },
  { id: 'roteiro', label: 'Roteiro', agente: 'a3' },
  { id: 'producao', label: 'Produção', agente: 'a4' },
  { id: 'edicao', label: 'Edição', agente: 'a5' },
  { id: 'aprovacao', label: 'Aguardando aprovação', agente: 'a6' },
  { id: 'aprovado', label: 'Aprovado', agente: 'a6' },
  { id: 'publicado', label: 'Publicado', agente: 'a6' },
  { id: 'ajuste', label: 'Em ajuste', agente: 'a3' },
  { id: 'pauta_aprovada', label: 'Pauta aprovada', agente: 'a3' },
  { id: 'em_roteiro', label: 'Em roteiro', agente: 'a3' },
  { id: 'rejeitado', label: 'Rejeitado', agente: null },
  { id: 'vazio', label: 'Slot vazio', agente: null },
];

function statusInfo(id) {
  return STATUS.find((s) => s.id === id) || { id, label: id, agente: null };
}

function indicadores(db, semana) {
  const conteudos = db.conteudos || [];
  const meta = db.config.metaSemanal;

  const porStatus = {};
  for (const s of STATUS) porStatus[s.id] = 0;
  for (const c of conteudos) porStatus[c.status] = (porStatus[c.status] || 0) + 1;

  // Ocupação dos slots: quantos dos 9 slots da semana já têm conteúdo vinculado.
  const slotsPreenchidos = semana.slots.filter((s) => s.conteudoId).length;
  const slotsVazios = semana.slots.length - slotsPreenchidos;

  const porCanal = db.canais.map((canal) => {
    const doCanal = conteudos.filter((c) => c.canalId === canal.id);
    const slotsCanal = semana.slots.filter((s) => s.canalId === canal.id);
    return {
      canalId: canal.id,
      nome: canal.nome,
      cor: canal.cor,
      meta: canal.metaSemanal,
      slotsNaSemana: slotsCanal.length,
      comConteudo: slotsCanal.filter((s) => s.conteudoId).length,
      totalConteudos: doCanal.length,
      publicados: doCanal.filter((c) => c.status === 'publicado').length,
      aguardandoAprovacao: doCanal.filter((c) => c.status === 'aprovacao').length,
    };
  });

  const pendentes = conteudos
    .filter((c) => c.status === 'aprovacao' || c.status === 'ajuste')
    .map((c) => ({
      id: c.id,
      titulo: c.titulo,
      canalId: c.canalId,
      canalNome: (db.canais.find((x) => x.id === c.canalId) || {}).nome || c.canalId,
      canalCor: (db.canais.find((x) => x.id === c.canalId) || {}).cor || '#888',
      status: c.status,
      statusLabel: statusInfo(c.status).label,
      atualizadoEm: c.atualizadoEm,
      agente: c.agenteAtual,
      tipo: c.tipo,
      previa: c.previa || null,
      pecas: c.pecas || [],
      pautaId: c.pautaId || null,
      aprovacoes: c.aprovacoes || null,
      versao: c.versao || 1,
      origem: c.origem,
    }))
    .sort((a, b) => (a.atualizadoEm || '').localeCompare(b.atualizadoEm || ''));

  const decisoes = db.decisoes || [];
  const resumoDecisoes = {
    total: decisoes.length,
    aprovados: decisoes.filter((d) => d.decisao === 'aprovar').length,
    ajustes: decisoes.filter((d) => d.decisao === 'ajustes').length,
    rejeitados: decisoes.filter((d) => d.decisao === 'rejeitar').length,
    reenvios: decisoes.filter((d) => d.decisao === 'reenvio').length,
    ultimaEm: decisoes.length ? decisoes[decisoes.length - 1].em : null,
  };

  return {
    metaSemanal: meta,
    totalConteudos: conteudos.length,
    resumoDecisoes,
    prontosParaPublicar: conteudos.filter((c) => c.status === 'aprovado').length,
    emAjuste: conteudos.filter((c) => c.status === 'ajuste').length,
    pautasAguardando: conteudos.filter((c) => c.tipo === 'pauta' && c.status === 'aprovacao').length,
    pautasAvaliadas: conteudos.filter((c) => c.tipo === 'pauta' && c.avaliacao).length,
    pautasPrioritarias: (db.avaliacoes || []).filter((a) => a.prioridade).length,
    calendariosPropostos: (db.calendarios || []).length,
    pautasAprovadas: conteudos.filter((c) => c.status === 'pauta_aprovada').length,
    roteirosAguardando: conteudos.filter((c) => c.tipo === 'roteiro' && c.status === 'aprovacao').length,
    execucoes: (db.execucoes || []).map((e) => ({
      id: e.id, agente: e.agente, iniciadaEm: e.iniciadaEm, encerradaEm: e.encerradaEm,
      creditos: e.creditos, tetoCreditos: e.tetoCreditos, itensGerados: e.itensGerados,
      status: e.status, descricao: e.descricao, observacao: e.observacao || null,
    })),
    creditosConsumidosAgentes: (db.execucoes || []).reduce((t, e) => t + (e.creditos || 0), 0),
    rejeitados: conteudos.filter((c) => c.status === 'rejeitado').length,
    slotsNaSemana: semana.slots.length,
    slotsPreenchidos,
    slotsVazios,
    ocupacaoPct: semana.slots.length ? Math.round((slotsPreenchidos / semana.slots.length) * 100) : 0,
    porStatus,
    porCanal,
    pendentes,
    origemDosDados:
      conteudos.length === 0
        ? 'Nenhum conteúdo produzido ainda — todos os indicadores estão em zero por ausência real de dados.'
        : `${conteudos.length} conteúdo(s) registrado(s) no banco local.`,
  };
}

module.exports = { indicadores, STATUS, statusInfo };
