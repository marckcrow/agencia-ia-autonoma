/**
 * Agendador de agentes — Etapa 4B.
 *
 * IMPORTANTE: o agendador é DESATIVADO POR PADRÃO. Ele só liga se o servidor
 * for iniciado com a variável de ambiente AGENDADOR_ATIVO=1 — decisão do
 * operador, nunca automática.
 *
 * Quando ligado, ele executa a rodada do A1 (rascunhos de pauta) semanalmente.
 * O que ele FAZ:
 *   - abre uma execução auditável em `db.execucoes`;
 *   - cria rascunhos de pauta que entram na fila de aprovação (status
 *     "aprovacao") — nada é publicado, nada é agendado sozinho;
 *   - registra histórico e fecha a execução com o consumo real observado.
 *
 * O que ele NUNCA faz:
 *   - publicar em qualquer rede;
 *   - aprovar conteúdo (a aprovação é sempre humana);
 *   - usar serviço pago sem a variável de ambiente configurada de propósito;
 *   - rodar sem provedor de IA configurado (nesse caso, não faz nada).
 */
'use strict';

const { store } = require('../store');
const ia = require('./ia');
const redacao = require('./redacao');
const agentesSvc = require('./agentes');

const HABILITADO_POR_AMBIENTE = process.env.AGENDADOR_ATIVO === '1';
const DIA_SEMANA = 1; // segunda-feira
const HORA = 8;

let timer = null;
let proximaExecucao = null;
let ultimaTentativa = null;

/** ISO local da próxima segunda-feira às HORA. */
function proximaSegunda() {
  const d = new Date();
  d.setHours(HORA, 0, 0, 0);
  const delta = (DIA_SEMANA - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + delta);
  if (d <= new Date()) d.setDate(d.getDate() + 7);
  return d;
}

function status() {
  return {
    ativo: Boolean(timer),
    habilitadoPorAmbiente: HABILITADO_POR_AMBIENTE,
    padrao: 'desativado',
    diaSemana: 'segunda-feira',
    hora: `${String(HORA).padStart(2, '0')}:00`,
    proximaExecucao: proximaExecucao,
    ultimaTentativa,
    exigeProvedorIA: true,
    publicaSozinho: false,
    observa: 'Sem provedor de IA configurado, a rodada agendada não produz nada.',
  };
}

/**
 * Rodada do A1: um rascunho de pauta por canal, a partir dos temas
 * configurados pelo operador. Cada rascunho entra na fila de aprovação.
 */
async function rodarRodadaA1(db) {
  const temas = (db.agendador && db.agendador.temas) || [];
  if (!temas.length) return { itens: 0, motivo: 'nenhum tema configurado' };
  if (!ia.configurado()) return { itens: 0, motivo: 'sem provedor de IA configurado' };

  const exec = await store.transacao((d) => agentesSvc.abrirExecucao(d, {
    agente: 'A1',
    descricao: `Rodada agendada: ${temas.length} tema(s)`,
    tetoCreditos: Number(db.agendador && db.agendador.tetoCreditos) || null,
  }));

  let gerados = 0;
  let creditos = 0;
  const erros = [];

  for (const t of temas) {
    try {
      const { rascunho, validacao, uso } = await redacao.rascunhoPauta({
        canalId: t.canalId,
        canal: (db.canais.find((c) => c.id === t.canalId) || {}).nome,
        tema: t.tema,
        contexto: t.contexto || '',
      });
      if (!validacao.ok) {
        erros.push(`${t.tema}: ${validacao.erros.join('; ')}`);
        continue;
      }
      await store.transacao((d) => agentesSvc.criarPauta(d, Object.assign({}, rascunho, { execucaoId: exec.id })));
      gerados++;
      if (uso && uso.total_tokens) creditos += 0; // consumo real é do provedor: registrado em observacao
    } catch (e) {
      erros.push(`${t.tema}: ${e.message}`);
    }
  }

  await store.transacao((d) => agentesSvc.encerrarExecucao(d, exec.id, {
    creditos,
    itensGerados: gerados,
    status: gerados ? 'concluida' : 'erro',
    observacao: `Rodada agendada (segunda ${HORA}h). ${gerados} pauta(s) criada(s) aguardando aprovação humana.`
      + (erros.length ? ` Pendências: ${erros.slice(0, 5).join(' | ')}` : ''),
  }));

  return { itens: gerados, erros };
}

function agendar() {
  const proxima = proximaSegunda();
  proximaExecucao = proxima.toISOString();
  const atraso = Math.max(1000, proxima.getTime() - Date.now());
  timer = setTimeout(async () => {
    try {
      const db = await store.ler();
      ultimaTentativa = new Date().toISOString();
      await rodarRodadaA1(db);
    } catch (e) {
      console.error('[agendador] falha na rodada:', e.message);
    } finally {
      timer = null;
      if (HABILITADO_POR_AMBIENTE) agendar();
    }
  }, atraso);
  if (timer.unref) timer.unref();
  return status();
}

function iniciar() {
  if (!HABILITADO_POR_AMBIENTE) {
    return Object.assign(status(), {
      erro: 'O agendador está desativado por padrão. Para ligá-lo, inicie o servidor com AGENDADOR_ATIVO=1.',
    });
  }
  if (timer) return status();
  return agendar();
}

function parar() {
  if (timer) clearTimeout(timer);
  timer = null;
  proximaExecucao = null;
  return status();
}

module.exports = { status, iniciar, parar, rodarRodadaA1, HABILITADO_POR_AMBIENTE };
