/**
 * Etapa 4A — Estabilização: alinha os metadados do banco com a realidade
 * auditada do código, sem inventar consumo e sem tocar em decisões.
 *
 * O que este script corrige (idempotente):
 *   1. `db.agentes[*].status`: A1, A2 e A3 passam de "nao_implementado" para
 *      "implementado" — eles têm código próprio em `server/services/agentes.js`
 *      e execuções registradas no banco. A4, A5 e A6 continuam
 *      "nao_implementado": são apenas especificação, sem código.
 *   2. `db.agentes[*].escopo`: descrição curta e auditável do que existe.
 *   3. `db.meta.creditosConsumidos`: passa a ser a SOMA REAL dos créditos
 *      registrados em `db.execucoes` (nunca um número digitado à mão).
 *      `db.meta.creditosFonte` guarda a origem do número, para auditoria.
 *   4. `db.meta.etapaAtual` = "4A" (a Etapa 3 continua registrada em `etapa`).
 *
 * O script NÃO altera: conteúdos, decisões, histórico anterior, avaliações,
 * execuções, produtos, canais, vozes, estúdio e prévias.
 *
 * Uso: node scripts/estabilizar-etapa4a.js [caminho_do_banco]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ALVO = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', 'data', 'db.json');

const ESCOPO = {
  a1: 'Implementado: validação de pauta com fontes verificáveis, nota de potencial e registro pela API. Sem interface própria e sem agendamento automático.',
  a2: 'Implementado: avaliação de pauta (5 critérios), veredito, alertas e proposta de calendário. Sem interface própria.',
  a3: 'Implementado: roteiro de 5 blocos obrigatórios, aceito apenas sobre pauta aprovada. Sem interface própria.',
  a4: 'Somente especificação: sem código. Geração de storyboard, prompts e pacote de produção.',
  a5: 'Somente especificação: sem código. Edição 9:16, legendas queimadas, capa e export.',
  a6: 'Somente especificação: sem código. Agendamento e publicação (nenhuma rede conectada).',
};

function main() {
  const bruto = fs.readFileSync(ALVO, 'utf8');
  const db = JSON.parse(bruto);

  const mudancas = [];

  /* ---------- 1 e 2: metadados dos agentes ---------- */
  let mudadosAgentes = 0;
  for (const agente of db.agentes || []) {
    const statusReal = ['a1', 'a2', 'a3'].includes(agente.id) ? 'implementado' : 'nao_implementado';
    if (agente.status !== statusReal) {
      mudancas.push(`agente ${agente.id}: status "${agente.status}" -> "${statusReal}"`);
      agente.status = statusReal;
      mudadosAgentes++;
    }
    if (ESCOPO[agente.id] && agente.escopo !== ESCOPO[agente.id]) {
      agente.escopo = ESCOPO[agente.id];
      mudancas.push(`agente ${agente.id}: escopo registrado`);
    }
  }

  /* ---------- 3 e 4: créditos auditáveis e etapa atual ---------- */
  const creditosAuditados = (db.execucoes || []).reduce((t, e) => t + (Number(e.creditos) || 0), 0);
  db.meta = db.meta || {};
  if (Number(db.meta.creditosConsumidos) !== creditosAuditados) {
    mudancas.push(
      `meta.creditosConsumidos: ${db.meta.creditosConsumidos} -> ${creditosAuditados} (soma de ${(db.execucoes || []).length} execuções)`
    );
    db.meta.creditosConsumidos = creditosAuditados;
  }
  if (db.meta.creditosFonte !== 'execucoes') {
    db.meta.creditosFonte = 'execucoes';
    mudancas.push('meta.creditosFonte: "execucoes"');
  }
  if (db.meta.etapaAtual !== '4A') {
    db.meta.etapaAtual = '4A';
    mudancas.push('meta.etapaAtual: "4A"');
  }
  db.meta.creditosAuditadoEm = new Date().toISOString();
  db.meta.observacao =
    `Etapa ${db.meta.etapa} (${db.meta.etapaAtual} — estabilização e correções de consistência): ` +
    'A1, A2 e A3 implementados pela API; A4, A5 e A6 apenas especificação. ' +
    `Créditos consumidos = ${creditosAuditados} (soma auditável de db.execucoes). ` +
    'Nenhuma publicação automática, nenhuma credencial, nenhum serviço pago.';

  /* ---------- registro de auditoria no histórico ---------- */
  db.historico = db.historico || [];
  const marca = 'estabilizacao-4a';
  const jaRegistrado = db.historico.some((h) => h.marca === marca);
  if (!jaRegistrado && mudancas.length) {
    db.historico.push({
      em: new Date().toISOString(),
      tipo: 'estabilizacao',
      marca,
      texto:
        `Etapa 4A aplicada: ${mudancas.length} ajuste(s) de metadados ` +
        `(agentes A1-A3 implementados, créditos auditados = ${creditosAuditados}). ` +
        'Conteúdos, decisões e aprovações não foram alterados.',
    });
  }

  const tmp = ALVO + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, ALVO);

  console.log(JSON.stringify({
    arquivo: ALVO,
    mudancas,
    totalMudancas: mudancas.length,
    conteudos: (db.conteudos || []).length,
    decisoes: (db.decisoes || []).length,
    historico: (db.historico || []).length,
    execucoes: (db.execucoes || []).length,
    creditosAuditados,
  }, null, 2));
}

main();
