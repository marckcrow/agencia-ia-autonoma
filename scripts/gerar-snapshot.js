/**
 * Gerador de snapshot estático da API (modo leitura).
 *
 * Na Etapa 2 as decisões exigem um servidor com escrita — use `node server/index.js`.
 * Este script continua útil para publicar uma vitrine estática do painel na nuvem.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const { store } = require('../server/store');
const calendario = require('../server/services/calendario');
const indicadoresSvc = require('../server/services/indicadores');
const { integracoes } = require('../server/services/integracoes');
const agentesSvc = require('../server/services/agentes');
const iaSvc = require('../server/services/ia');
const agendadorSvc = require('../server/services/agendador');

const SAIDA = path.join(__dirname, '..', 'public', 'api');

async function principal() {
  fs.mkdirSync(SAIDA, { recursive: true });
  const db = await store.ler();
  const semana = calendario.gerarSemana(db);

  const arquivos = {
    'estado.json': {
      meta: db.meta,
      config: db.config,
      canais: db.canais,
      agentes: db.agentes,
      semana,
      indicadores: indicadoresSvc.indicadores(db, semana),
      integracoes,
      historico: (db.historico || []).slice(-40).reverse(),
    },
    'canais.json': db.canais,
    'agentes.json': db.agentes,
    'calendario.json': semana,
    'integracoes.json': integracoes,
    'conteudos.json': (db.conteudos || []).slice().reverse(),
    'pendentes.json': indicadoresSvc.indicadores(db, semana).pendentes,
    'decisoes.json': (db.decisoes || []).slice().reverse(),
    'execucoes.json': (db.execucoes || []).slice().reverse(),
    'vozes.json': db.vozes || { canais: {}, amostras: [] },
    'produtos.json': db.produtos || { itens: [] },
    'backups.json': { backups: (() => {
      const fs2 = require('fs'); const p2 = require('path');
      const dir = p2.join(__dirname, '..', 'public', 'downloads');
      try {
        return fs2.readdirSync(dir)
          .filter((f) => f.startsWith('Agencia_IA_Backup_') && f.endsWith('.zip'))
          .map((f) => {
            const st = fs2.statSync(p2.join(dir, f));
            const sp = p2.join(dir, f + '.sha256');
            return { arquivo: f, bytes: st.size, mb: Math.round(st.size / 1048576 * 10) / 10,
                     criadoEm: st.mtime.toISOString(),
                     sha256: fs2.existsSync(sp) ? fs2.readFileSync(sp, 'utf8').trim().split(/\s+/)[0] : null,
                     tipo: f.includes('Completo') ? 'completo' : 'codigo' };
          }).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
      } catch (_) { return []; }
    })() },
    'previas.json': db.previas || {},
    'aprovacoes.json': db.fluxoAprovacao || null,
    'estudio.json': {
      identidade: db.identidadeVisual || null,
      estudio: db.estudioArtes || null,
      central: db.centralPublicacoes || null,
    },
    'avaliacoes.json': (db.avaliacoes || []).slice().reverse(),
    'calendarios.json': (db.calendarios || []).slice().reverse(),
    'agentes-provedor.json': iaSvc.status(),
    'agentes-agendador.json': agendadorSvc.status(),
    'regras-agentes.json': {
      blocosRoteiro: agentesSvc.BLOCOS_ROTEIRO,
      fontesConfiaveis: agentesSvc.FONTES_CONFIAVEIS,
      regraA3: 'Roteiro só é aceito sobre pauta com status pauta_aprovada.',
      regraFontes: 'Toda afirmação factual exige fonte verificável; redes sociais e blogs são recusados.',
      regraSaude: 'Poder 50+: exige fonte científica ou oficial; promessa de resultado é proibida.',
    },
  };

  for (const [nome, conteudo] of Object.entries(arquivos)) {
    fs.writeFileSync(path.join(SAIDA, nome), JSON.stringify(conteudo, null, 2), 'utf8');
  }
  console.log(`Snapshot gerado em ${SAIDA} (${Object.keys(arquivos).length} arquivos)`);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
