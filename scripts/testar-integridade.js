/**
 * Testes de integridade das associações: produto → pauta → roteiro → arte/vídeo.
 * Roda em banco temporário, sem tocar nos dados reais.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const RAIZ = path.join(__dirname, '..');
const PORTA = 4588;
const BASE = `http://127.0.0.1:${PORTA}`;
const DB = path.join(RAIZ, 'data', 'db.integridade.json');

let passos = 0, falhas = 0;
const ok = (c, m, x) => { passos++; c ? console.log(`  ✔ ${m}`) : (falhas++, console.log(`  ✘ ${m}${x ? ' → ' + JSON.stringify(x) : ''}`)); };

function req(metodo, caminho, corpo) {
  return new Promise((res, rej) => {
    const d = corpo ? JSON.stringify(corpo) : null;
    const r = http.request(BASE + caminho, { method: metodo, headers: d ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(d) } : {} }, (x) => {
      let t = ''; x.on('data', (c) => t += c); x.on('end', () => { let j = null; try { j = t ? JSON.parse(t) : null; } catch (_) { j = t; } res({ status: x.statusCode, corpo: j }); });
    });
    r.on('error', rej); if (d) r.write(d); r.end();
  });
}
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log('\n=== TESTE DE INTEGRIDADE DAS ASSOCIAÇÕES ===\n');
  fs.copyFileSync(path.join(RAIZ, 'data', 'db.json'), DB);
  const srv = spawn(process.execPath, [path.join(RAIZ, 'server', 'index.js')], {
    cwd: RAIZ, env: Object.assign({}, process.env, { PORTA: String(PORTA), DB_ARQUIVO: DB }), stdio: ['ignore', 'pipe', 'pipe'],
  });
  srv.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));

  try {
    await esperar(900);
    const conteudos = (await req('GET', '/api/conteudos')).corpo;
    const est = (await req('GET', '/api/estudio')).corpo;
    const pecas = (est.estudio && est.estudio.pecas) || [];

    console.log('1. Unicidade dos identificadores');
    const ids = conteudos.map((c) => c.id);
    ok(new Set(ids).size === ids.length, 'nenhum conteúdo com ID duplicado', ids.length);
    const pids = pecas.map((p) => p.id);
    ok(new Set(pids).size === pids.length, 'nenhuma peça com ID duplicado', pids.length);

    console.log('\n2. Toda arte aponta para uma pauta existente');
    for (const p of pecas) {
      const alvo = conteudos.find((c) => c.id === p.pautaId);
      ok(Boolean(alvo), `arte "${p.id}" → pauta válida`, p.pautaId);
      if (alvo) ok(alvo.canalId === p.canalId, `arte "${p.id}" está no mesmo canal da pauta (${alvo.canalId})`, p.canalId);
    }

    console.log('\n3. Nenhuma arte é exibida em conteúdo de OUTRA pauta');
    const tonga = conteudos.find((c) => c.titulo.includes('Tonga'));
    ok(!tonga.pautaId || !pecas.some((p) => p.pautaId === tonga.pautaId), 'ficha de Tonga não recebe a arte do fungo');
    const fungo = conteudos.find((c) => c.tipo === 'roteiro' && c.titulo.includes('fungo'));
    ok(Boolean(fungo) && (fungo.pecas || []).includes('arte-voce-sabia'), 'roteiro do fungo recebe a arte correta');

    console.log('\n4. Prévia vinculada apenas ao roteiro de origem');
    const comPrevia = conteudos.filter((c) => c.previa);
    ok(comPrevia.length === 1 && comPrevia[0].tipo === 'roteiro', 'apenas 1 prévia e ela está no roteiro', comPrevia.length);
    ok(comPrevia[0].canalId === 'ia-na-pratica', 'a prévia pertence ao canal correto', comPrevia[0].canalId);

    console.log('\n5. Produtos isolados entre si');
    const prods = (await req('GET', '/api/produtos')).corpo.itens;
    ok(prods.length === 3, '3 produtos preservados', prods.length);
    for (const p of prods) {
      const doProd = conteudos.filter((c) => c.produtoId === p.id);
      ok(doProd.every((c) => c.canalId === p.id), `produto "${p.nome}": nenhum conteúdo de outro produto`, doProd.length);
    }

    console.log('\n6. Travas de publicação no backend');
    const alvo = conteudos.find((c) => c.tipo === 'roteiro');
    const r1 = await req('POST', `/api/conteudos/${alvo.id}/publicacao`, { decisao: 'aprovar' });
    ok(r1.status === 409, 'aprovação final bloqueada com etapas pendentes (HTTP 409)', r1.status);

    console.log('\n7. Arquivos existem no disco');
    for (const p of pecas) {
      ok(fs.existsSync(path.join(RAIZ, 'public', p.arquivo)), `arte "${p.id}" existe no disco`, p.arquivo);
    }
    const prev = (await req('GET', '/api/previas')).corpo['ia-na-pratica-piloto'];
    ok(fs.existsSync(path.join(RAIZ, 'public', prev.arquivo)), 'vídeo existe no disco', prev.arquivo);
  } catch (e) {
    falhas++; console.error('Erro inesperado:', e);
  } finally {
    try { srv.kill(); } catch (_) {}
    try { fs.unlinkSync(DB); } catch (_) {}
    console.log(`\n=== ${passos - falhas}/${passos} verificações passaram ===`);
    console.log(falhas === 0 ? 'RESULTADO: INTEGRIDADE OK\n' : `RESULTADO: ${falhas} FALHA(S)\n`);
    process.exit(falhas === 0 ? 0 : 1);
  }
})();
