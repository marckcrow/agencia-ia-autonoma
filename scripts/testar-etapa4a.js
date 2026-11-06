/**
 * Testes de regressão da Etapa 4A — Estabilização e correções de consistência.
 *
 * Roda em banco temporário próprio (nunca toca em data/db.json) e cobre:
 *   1. Vocabulário de status: "aprovado" e "aprovado_final" coexistem.
 *   2. Aprovação final continua obrigatória para liberar publicação.
 *   3. Vínculo com o slot do calendário (inclui SLOT → CONTEÚDO e CONTEÚDO → SLOT).
 *   4. Serialização das transações: escritas concorrentes não se perdem.
 *   5. Detecção de alteração externa do arquivo do banco.
 *   6. Metadados dos agentes e créditos auditáveis (leitura do banco real).
 *
 * Uso: node scripts/testar-etapa4a.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const PORTA = 4590;
const BASE = `http://127.0.0.1:${PORTA}`;
const DB_TESTE = path.join(RAIZ, 'data', 'db.etapa4a.json');
const DB_UNIT = path.join(RAIZ, 'data', 'db.etapa4a-unit.json');
const DB_REAL = path.join(RAIZ, 'data', 'db.json');

let passos = 0;
let falhas = 0;
const ok = (cond, msg, extra) => {
  passos++;
  if (cond) console.log(`  ✓ ${msg}`);
  else { falhas++; console.log(`  ✗ ${msg}${extra !== undefined ? ' → ' + JSON.stringify(extra) : ''}`); }
};

function req(metodo, caminho, corpo) {
  return new Promise((res, rej) => {
    const dados = corpo ? JSON.stringify(corpo) : null;
    const r = http.request(BASE + caminho, {
      method: metodo,
      headers: dados ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(dados) } : {},
    }, (x) => {
      let t = '';
      x.on('data', (c) => (t += c));
      x.on('end', () => {
        let j = null;
        try { j = t ? JSON.parse(t) : null; } catch (_) { j = t; }
        res({ status: x.statusCode, corpo: j });
      });
    });
    r.on('error', rej);
    if (dados) r.write(dados);
    r.end();
  });
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Terça-feira da semana corrente (o canal IA na Prática publica ter/qui/sáb). */
function tercaDaSemanaAtual() {
  const d = new Date();
  const dow = d.getDay();
  const delta = dow === 0 ? -6 : 1 - dow; // deslocamento até a segunda
  d.setDate(d.getDate() + delta + 1); // segunda + 1 = terça
  return d.toISOString().slice(0, 10);
}

async function principal() {
  console.log('\n=== TESTE DE REGRESSÃO — ETAPA 4A (ESTABILIZAÇÃO) ===\n');

  /* ---------------- 0. Banco de teste isolado ---------------- */
  const semente = JSON.parse(fs.readFileSync(DB_REAL, 'utf8'));
  semente.conteudos = [];
  semente.decisoes = [];
  semente.historico = [];
  semente.execucoes = [];
  fs.writeFileSync(DB_TESTE, JSON.stringify(semente, null, 2), 'utf8');

  const srv = spawn(process.execPath, [path.join(RAIZ, 'server', 'index.js')], {
    cwd: RAIZ,
    env: Object.assign({}, process.env, { PORTA: String(PORTA), DB_ARQUIVO: DB_TESTE }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  srv.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));

  try {
    await esperar(900);

    console.log('1. Vocabulário de status e aprovação final');
    const estado = await req('GET', '/api/estado');
    ok(estado.status === 200, 'GET /api/estado responde 200');
    ok(estado.corpo.config.publicacaoAutomatica === false, 'publicação automática continua desligada');
    ok(estado.corpo.config.servicosPagosAutorizados === false, 'serviços pagos continuam desligados');
    ok(estado.corpo.config.aprovacaoObrigatoria === true, 'aprovação humana continua obrigatória');

    const criado = await req('POST', '/api/conteudos', {
      canalId: 'ia-na-pratica', tipo: 'roteiro', titulo: 'Conteúdo de teste 4A',
      resumo: 'teste', corpo: 'teste',
    });
    ok(criado.status === 201, 'conteúdo de teste criado', criado.status);
    const id = criado.corpo.id;

    const semAprovacao = await req('GET', `/api/conteudos/${id}`);
    ok(semAprovacao.corpo.podePublicar === false, 'conteúdo novo não pode ser publicado');

    const slotRecusado = await req('POST', `/api/conteudos/${id}/slot`, { data: tercaDaSemanaAtual(), hora: '18:00' });
    ok(slotRecusado.status === 409, 'slot é recusado para conteúdo ainda não aprovado (HTTP 409)', slotRecusado.status);

    for (const etapa of ['pauta', 'roteiro', 'producao']) {
      const e = await req('POST', `/api/conteudos/${id}/etapa`, { etapa, decisao: 'aprovar' });
      ok(e.status === 200, `etapa "${etapa}" aprovada`, e.status);
    }
    const finalBloqueado = await req('POST', `/api/conteudos/${id}/publicacao`, { decisao: 'aprovar' });
    ok(finalBloqueado.status === 200, 'aprovação final liberada com as três etapas aprovadas', finalBloqueado.status);
    ok(finalBloqueado.corpo.conteudo.status === 'aprovado_final', 'status final é "aprovado_final"', finalBloqueado.corpo.conteudo.status);
    ok(!!finalBloqueado.corpo.conteudo.aprovadoEm, 'aprovação final registra a data');

    const depoisFinal = await req('GET', `/api/conteudos/${id}`);
    ok(depoisFinal.corpo.podePublicar === true, 'aprovação final libera a publicação (podePublicar = true)');
    ok(depoisFinal.corpo.podeAgendar === true, 'conteúdo aprovado pode ser agendado (podeAgendar = true)');

    const decisaoDuplicada = await req('POST', `/api/conteudos/${id}/decisao`, { decisao: 'aprovar' });
    ok(decisaoDuplicada.status === 409, 'decisão nova sobre conteúdo com aprovação final é bloqueada (HTTP 409)', decisaoDuplicada.status);

    console.log('\n2. Vínculo com o slot do calendário');
    const dataTerca = tercaDaSemanaAtual();
    const horarioErrado = await req('POST', `/api/conteudos/${id}/slot`, { data: dataTerca, hora: '03:17' });
    ok(horarioErrado.status === 400, 'hora fora da grade do canal é recusada (HTTP 400)', horarioErrado.status);

    const dataInvalida = await req('POST', `/api/conteudos/${id}/slot`, { data: '06/11/2026', hora: '18:00' });
    ok(dataInvalida.status === 400, 'data fora do formato AAAA-MM-DD é recusada (HTTP 400)', dataInvalida.status);

    const agendado = await req('POST', `/api/conteudos/${id}/slot`, { data: dataTerca, hora: '18:00' });
    ok(agendado.status === 200, 'conteúdo aprovado é vinculado ao slot', agendado.status);
    ok(agendado.corpo.slot && agendado.corpo.slot.data === dataTerca && agendado.corpo.slot.hora === '18:00',
      'slot gravado no conteúdo', agendado.corpo.slot);

    const calendario = await req('GET', `/api/calendario?semana=${dataTerca}`);
    const slot = calendario.corpo.slots.find((s) => s.conteudoId === id);
    ok(Boolean(slot), 'o slot do calendário aponta para o conteúdo');
    ok(slot && slot.prontoParaPublicar === true, 'o slot marca o conteúdo como pronto para publicar');

    const segundo = await req('POST', '/api/conteudos', {
      canalId: 'ia-na-pratica', tipo: 'roteiro', titulo: 'Conteúdo de teste 4B',
      resumo: 'teste', corpo: 'teste',
    });
    const id2 = segundo.corpo.id;
    for (const etapa of ['pauta', 'roteiro', 'producao']) {
      await req('POST', `/api/conteudos/${id2}/etapa`, { etapa, decisao: 'aprovar' });
    }
    await req('POST', `/api/conteudos/${id2}/publicacao`, { decisao: 'aprovar' });
    const duplicado = await req('POST', `/api/conteudos/${id2}/slot`, { data: dataTerca, hora: '18:00' });
    ok(duplicado.status === 409, 'slot já ocupado é recusado (HTTP 409)', duplicado.status);

    const liberado = await req('DELETE', `/api/conteudos/${id}/slot`);
    ok(liberado.status === 200 && liberado.corpo.slot === null, 'DELETE libera o slot', liberado.corpo && liberado.corpo.slot);
    const depoisLiberar = await req('GET', `/api/conteudos/${id}`);
    ok(depoisLiberar.corpo.podePublicar === true, 'liberar o slot não altera a aprovação');

    console.log('\n3. Serialização das transações (gravação concorrente)');
    const antes = (await req('GET', '/api/conteudos')).corpo.length;
    const criacao = await Promise.all(Array.from({ length: 20 }, (_, i) => req('POST', '/api/conteudos', {
      canalId: 'voce-sabia', tipo: 'roteiro', titulo: `Concorrente ${i}`, resumo: 't', corpo: 't',
    })));
    ok(criacao.every((r) => r.status === 201), '20 criações concorrentes respondem 201');
    const depois = (await req('GET', '/api/conteudos')).corpo.length;
    ok(depois - antes === 20, 'nenhuma escrita concorrente foi perdida', { antes, depois });
    const noArquivo = JSON.parse(fs.readFileSync(DB_TESTE, 'utf8')).conteudos.length;
    ok(noArquivo === depois, 'o arquivo em disco tem exatamente o mesmo número de conteúdos', { noArquivo, depois });

    console.log('\n4. Estado real do banco de produção (somente leitura)');
    const real = JSON.parse(fs.readFileSync(DB_REAL, 'utf8'));
    const creditos = (real.execucoes || []).reduce((t, e) => t + (Number(e.creditos) || 0), 0);
    ok(Number(real.meta.creditosConsumidos) === creditos,
      'meta.creditosConsumidos = soma auditável de db.execucoes', { meta: real.meta.creditosConsumidos, creditos });
    ok(real.meta.creditosFonte === 'execucoes', 'meta.creditosFonte declara a origem do número');
    const statusAgentes = Object.fromEntries((real.agentes || []).map((a) => [a.id, a.status]));
    ok(statusAgentes.a1 === 'implementado' && statusAgentes.a2 === 'implementado' && statusAgentes.a3 === 'implementado',
      'A1, A2 e A3 constam como implementados', statusAgentes);
    ok(statusAgentes.a4 === 'nao_implementado' && statusAgentes.a5 === 'nao_implementado' && statusAgentes.a6 === 'nao_implementado',
      'A4, A5 e A6 continuam como não implementados (sem código)', statusAgentes);
    ok(real.conteudos.length === 18, 'os 18 conteúdos originais foram preservados', real.conteudos.length);
    ok((real.decisoes || []).length === 7, 'as 7 decisões originais foram preservadas', (real.decisoes || []).length);
    ok((real.execucoes || []).length === 3 && (real.avaliacoes || []).length === 15, 'execuções e avaliações preservadas');
    const statusValidos = new Set(['pauta', 'roteiro', 'producao', 'edicao', 'aprovacao', 'ajuste',
      'pauta_aprovada', 'em_roteiro', 'aprovado', 'aprovado_final', 'rejeitado', 'publicado']);
    ok(real.conteudos.every((c) => statusValidos.has(c.status)), 'todo status gravado existe no mapa de status');
  } catch (e) {
    falhas++;
    console.error('Erro inesperado no teste:', e);
  } finally {
    try { srv.kill(); } catch (_) {}
    try { fs.unlinkSync(DB_TESTE); } catch (_) {}
  }

  console.log('\n5. Camada de persistência (unidade, banco isolado)');
  try {
    fs.writeFileSync(DB_UNIT, JSON.stringify({ conteudos: [], historico: [] }, null, 2), 'utf8');
    process.env.DB_ARQUIVO = DB_UNIT;
    const { store } = require(path.join(RAIZ, 'server', 'store.js'));

    fs.writeFileSync(DB_UNIT, JSON.stringify({ conteudos: [{ id: 'externo' }], historico: [] }, null, 2), 'utf8');
    const lido = await store.ler();
    ok(lido.conteudos.length === 1 && lido.conteudos[0].id === 'externo',
      'alteração externa do arquivo é detectada (cache invalidado)');

    await Promise.all(Array.from({ length: 25 }, (_, i) => store.transacao((d) => {
      d.conteudos.push({ id: `tx-${i}` });
      return i;
    })));
    const final = await store.ler();
    ok(final.conteudos.length === 26, '25 transações concorrentes na camada de persistência não se perderam', final.conteudos.length);

    const disco = JSON.parse(fs.readFileSync(DB_UNIT, 'utf8'));
    ok(disco.conteudos.length === 26, 'o disco tem o mesmo conteúdo após as transações concorrentes', disco.conteudos.length);
  } catch (e) {
    falhas++;
    console.error('Erro inesperado no teste da persistência:', e);
  } finally {
    try { fs.unlinkSync(DB_UNIT); } catch (_) {}
  }

  console.log(`\n=== ${passos - falhas}/${passos} verificações passaram ===`);
  console.log(falhas === 0 ? 'RESULTADO: ETAPA 4A SEM REGRESSÕES\n' : `RESULTADO: ${falhas} FALHA(S)\n`);
  process.exit(falhas === 0 ? 0 : 1);
}

principal();
