/**
 * Teste de ponta a ponta da Etapa 2.
 *
 * Sobe o servidor numa porta isolada e usa um banco temporário, para não tocar
 * nos dados reais do painel. Verifica:
 *   1. Os três botões de direção (aprovar, ajustes, rejeitar).
 *   2. As travas de segurança (ajustes/rejeição exigem orientação).
 *   3. A persistência em disco (reabrir o banco depois de decidir).
 *   4. O reenvio para aprovação depois de um ajuste.
 *   5. Que nenhuma rota de publicação existe.
 *
 * Uso: node scripts/testar-etapa2.js
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const RAIZ = path.join(__dirname, '..');
const PORTA = 4577;
const DB_ORIGINAL = path.join(RAIZ, 'data', 'db.json');
const DB_TESTE = path.join(RAIZ, 'data', 'db.teste.json');
const URL_BASE = `http://127.0.0.1:${PORTA}`;

let falhas = 0;
let passos = 0;
const ok = (cond, msg, extra) => {
  passos++;
  if (cond) {
    console.log(`  ✔ ${msg}`);
  } else {
    falhas++;
    console.log(`  ✘ ${msg}${extra ? ' → ' + JSON.stringify(extra) : ''}`);
  }
};

function requisitar(metodo, caminho, corpo) {
  return new Promise((resolve, reject) => {
    const dados = corpo ? JSON.stringify(corpo) : null;
    const req = http.request(
      URL_BASE + caminho,
      {
        method: metodo,
        headers: dados
          ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(dados) }
          : {},
      },
      (res) => {
        let txt = '';
        res.on('data', (c) => (txt += c));
        res.on('end', () => {
          let j = null;
          try { j = txt ? JSON.parse(txt) : null; } catch (_) { j = txt; }
          resolve({ status: res.statusCode, corpo: j });
        });
      }
    );
    req.on('error', reject);
    if (dados) req.write(dados);
    req.end();
  });
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function principal() {
  console.log('\n=== TESTE DA ETAPA 2 — Sala de Direção ===\n');

  // banco de teste isolado: parte de uma cópia limpa com os 3 rascunhos
  // pendentes e nenhuma decisão, para o teste ser repetível.
  const semente = JSON.parse(fs.readFileSync(DB_ORIGINAL, 'utf8'));
  const FIXOS = [
    { id: 'teste-ia', canalId: 'ia-na-pratica', titulo: 'Conteúdo de teste A' },
    { id: 'teste-sabia', canalId: 'voce-sabia', titulo: 'Conteúdo de teste B' },
    { id: 'teste-50', canalId: 'poder-50', titulo: 'Conteúdo de teste C' },
  ];
  semente.conteudos = FIXOS.map((f) => Object.assign({
    tipo: 'roteiro', resumo: 'Item criado pelo teste automatizado.', corpo: 'GANCHO / CORPO / CTA',
    origem: 'teste', agenteAtual: null, status: 'aprovacao', slot: null,
    criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(),
    aprovadoEm: null, rejeitadoEm: null, versao: 1,
  }, f));
  semente.decisoes = [];
  fs.writeFileSync(DB_TESTE, JSON.stringify(semente, null, 2), 'utf8');

  let servidorFinal = null;
  const servidor = spawn(process.execPath, [path.join(RAIZ, 'server', 'index.js')], {
    cwd: RAIZ,
    env: Object.assign({}, process.env, { PORTA: String(PORTA), DB_ARQUIVO: DB_TESTE }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  servidor.stderr.on('data', (d) => process.stderr.write('[servidor] ' + d));

  try {
    await esperar(900);

    console.log('1. Leitura inicial');
    const estado = await requisitar('GET', '/api/estado');
    ok(estado.status === 200, 'GET /api/estado responde 200');
    const conteudosIniciais = await requisitar('GET', '/api/conteudos');
    ok(Array.isArray(conteudosIniciais.corpo) && conteudosIniciais.corpo.length === 3,
      'biblioteca do teste tem os 3 itens de teste', conteudosIniciais.corpo && conteudosIniciais.corpo.length);
    const pendentes = await requisitar('GET', '/api/pendentes');
    ok(pendentes.corpo.length === 3, 'Sala de Direção recebe 3 itens', pendentes.corpo.length);

    const [c1, c2, c3] = conteudosIniciais.corpo;
    const idAprovar = c1.id;
    const idAjustes = c2.id;
    const idRejeitar = c3.id;

    console.log('\n2. Botão APROVAR');
    const ap = await requisitar('POST', `/api/conteudos/${idAprovar}/decisao`, { decisao: 'aprovar' });
    ok(ap.status === 200 && ap.corpo.conteudo.status === 'aprovado',
      'aprovar muda o status para "aprovado"', ap.corpo && ap.corpo.conteudo && ap.corpo.conteudo.status);
    ok(!!ap.corpo.conteudo.aprovadoEm, 'registra a data de aprovação');

    console.log('\n3. Botão SOLICITAR AJUSTES — validações');
    const semOrientacao = await requisitar('POST', `/api/conteudos/${idAjustes}/decisao`, { decisao: 'ajustes' });
    ok(semOrientacao.status === 400, 'ajustes sem orientação é recusado (HTTP 400)', semOrientacao.status);

    const ajuste = await requisitar('POST', `/api/conteudos/${idAjustes}/decisao`, {
      decisao: 'ajustes',
      orientacoes: 'Trocar o gancho: começar com a pergunta, não com a afirmação.',
    });
    ok(ajuste.status === 200 && ajuste.corpo.conteudo.status === 'ajuste',
      'ajustes muda o status para "ajuste"', ajuste.corpo && ajuste.corpo.conteudo && ajuste.corpo.conteudo.status);
    ok(ajuste.corpo.conteudo.orientacoes.includes('gancho'), 'orientação fica gravada no conteúdo');

    console.log('\n4. Botão REJEITAR — validações');
    const rejeitarSemMotivo = await requisitar('POST', `/api/conteudos/${idRejeitar}/decisao`, { decisao: 'rejeitar' });
    ok(rejeitarSemMotivo.status === 400, 'rejeição sem motivo é recusada (HTTP 400)', rejeitarSemMotivo.status);

    const rejeicao = await requisitar('POST', `/api/conteudos/${idRejeitar}/decisao`, {
      decisao: 'rejeitar',
      orientacoes: 'Tema já coberto por concorrente grande nesta semana.',
    });
    ok(rejeicao.status === 200 && rejeicao.corpo.conteudo.status === 'rejeitado',
      'rejeitar muda o status para "rejeitado"');

    console.log('\n5. Decisão inválida e decisão repetida');
    const invalida = await requisitar('POST', `/api/conteudos/${idAprovar}/decisao`, { decisao: 'publicar' });
    ok(invalida.status === 400 || invalida.status === 409, 'decisão inexistente é recusada', invalida.status);
    const repetida = await requisitar('POST', `/api/conteudos/${idAprovar}/decisao`, { decisao: 'aprovar' });
    ok(repetida.status === 409, 'aprovar duas vezes é recusado (HTTP 409)', repetida.status);

    console.log('\n6. Reenvio depois do ajuste');
    const reen = await requisitar('POST', `/api/conteudos/${idAjustes}/reenviar`, {});
    ok(reen.status === 200 && reen.corpo.status === 'aprovacao',
      'conteúdo em ajuste volta para a fila de aprovação');
    ok(reen.corpo.versao === 2, 'versão incrementa ao reenviar', reen.corpo.versao);
    // referência: 3 decisões + 1 reenvio = 4 registros no log

    console.log('\n7. Persistência em disco');
    const bruto = JSON.parse(fs.readFileSync(DB_TESTE, 'utf8'));
    const salvo = (id) => bruto.conteudos.find((c) => c.id === id);
    ok(salvo(idAprovar).status === 'aprovado', 'status aprovado está no arquivo do banco');
    ok(salvo(idAjustes).status === 'aprovacao', 'reenvio persistiu no arquivo do banco');
    ok(salvo(idRejeitar).status === 'rejeitado', 'status rejeitado está no arquivo do banco');
    ok((bruto.decisoes || []).length === 4, 'log imutável tem 4 registros', (bruto.decisoes || []).length);
    ok(bruto.decisoes.some((d) => d.decisao === 'reenvio'), 'reenvio também entra no log');

    console.log('\n8. Reinício do servidor (persistência após reabrir)');
    servidor.kill();
    await esperar(500);
    const servidor2 = spawn(process.execPath, [path.join(RAIZ, 'server', 'index.js')], {
      cwd: RAIZ,
      env: Object.assign({}, process.env, { PORTA: String(PORTA), DB_ARQUIVO: DB_TESTE }),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await esperar(900);
    try {
      const aposReinicio = await requisitar('GET', '/api/conteudos');
      const porId = (id) => aposReinicio.corpo.find((c) => c.id === id);
      ok(porId(idAprovar).status === 'aprovado', 'após reiniciar, o aprovado continua aprovado');
      ok(porId(idAjustes).status === 'aprovacao', 'após reiniciar, o reenviado continua na fila');
      ok(porId(idRejeitar).status === 'rejeitado', 'após reiniciar, o rejeitado continua rejeitado');
      const decisoes = await requisitar('GET', '/api/decisoes');
      ok(decisoes.corpo.length === 4, 'após reiniciar, o histórico de decisões continua íntegro',
        decisoes.corpo.length);
    } finally {
      // servidor2 segue vivo para o teste da trava de publicação
      servidorFinal = servidor2;
    }

    console.log('\n9. Trava de publicação');
    const tentativaPublicar = await requisitar('POST', '/api/conteudos/publicar', {});
    ok(tentativaPublicar.status === 404, 'não existe rota de publicação (HTTP 404)');
    const detalhe = await requisitar('GET', `/api/conteudos/${idAprovar}`);
    ok(detalhe.corpo.podePublicar === true && detalhe.corpo.conteudo.status === 'aprovado',
      'serviço expõe podePublicar, mas nenhuma rota executa publicação');
  } catch (e) {
    falhas++;
    console.error('Erro inesperado no teste:', e);
  } finally {
    try { servidor.kill(); } catch (_) {}
    try { if (servidorFinal) servidorFinal.kill(); } catch (_) {}
    try { fs.unlinkSync(DB_TESTE); } catch (_) {}
    console.log(`\n=== ${passos - falhas}/${passos} verificações passaram ===`);
    console.log(falhas === 0 ? 'RESULTADO: TODOS OS TESTES PASSARAM\n' : `RESULTADO: ${falhas} FALHA(S)\n`);
    process.exit(falhas === 0 ? 0 : 1);
  }
}

principal();
