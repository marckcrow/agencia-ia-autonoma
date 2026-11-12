/**
 * Testes de regressão da Etapa 4B — Interfaces operacionais dos agentes A1, A2 e A3.
 *
 * Roda em banco temporário próprio (nunca toca em data/db.json) e cobre:
 *   1. Camada de provedor de IA: status público SEM chave, erro 503 sem provedor.
 *   2. Redação assistida: sem provedor não existe rascunho (nada fictício).
 *   3. Agendador: nasce desligado e não liga por API.
 *   4. Execuções: vínculo com pauta, contagem de itens, uso do provedor.
 *   5. Rotas novas: provedor, agendador, rascunhos e detalhe de execução.
 *   6. Publicação: continua bloqueada sem aprovação humana.
 *   7. Frontend: módulo isolado, sem chave e sem publicação no cliente.
 *
 * Uso: node scripts/testar-etapa4b.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const PORTA = 4591;
const BASE = `http://127.0.0.1:${PORTA}`;
const DB_TESTE = path.join(RAIZ, 'data', 'db.etapa4b.json');
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

/** Ambiente sem provedor: garante o modo determinístico nos testes. */
function ambienteLimpo() {
  const env = Object.assign({}, process.env);
  delete env.IA_PROVEDOR;
  delete env.IA_BASE_URL;
  delete env.IA_API_KEY;
  delete env.IA_MODELO;
  delete env.IA_MODEL;
  delete env.AGENDADOR_ATIVO;
  return env;
}

async function principal() {
  console.log('\n=== TESTE DE REGRESSÃO — ETAPA 4B (INTERFACES DOS AGENTES) ===\n');

  /* ---------------- 1. Camada de provedor de IA ---------------- */
  console.log('1. Camada de provedor de IA');
  const ia = require(path.join(RAIZ, 'server', 'services', 'ia.js'));
  ok(ia.configurado() === false, 'sem variáveis de ambiente o provedor fica desligado');
  const statusVazio = ia.status();
  ok(statusVazio.configurado === false, 'status público informa que não há provedor');
  ok(!('apiKey' in statusVazio), 'status público não tem campo de chave');
  ok(!JSON.stringify(statusVazio).toLowerCase().includes('apikey'), 'status público não menciona a chave');

  ok(ia.extrairJson('```json\n{"a":1}\n```') && ia.extrairJson('```json\n{"a":1}\n```').a === 1, 'extrairJson entende JSON cercado');
  ok(ia.extrairJson('texto antes {"b":2} depois').b === 2, 'extrairJson acha o objeto no meio do texto');
  let erroJson = null;
  try { ia.extrairJson('nada de json aqui'); } catch (e) { erroJson = e; }
  ok(!!erroJson && erroJson.status === 502, 'extrairJson falha alto quando a resposta não é JSON');

  let erroChamada = null;
  try { await ia.chamar('teste'); } catch (e) { erroChamada = e; }
  ok(!!erroChamada && erroChamada.status === 503, 'chamar sem provedor devolve 503 (não inventa resultado)');

  // Status com chave definida: a chave NÃO pode aparecer em lugar nenhum do JSON.
  const segredo = 'SEGREDO_DE_TESTE_NAO_VAZAR_123';
  const child = spawnSync(process.execPath, ['-e', `
    const ia = require(${JSON.stringify(path.join(RAIZ, 'server', 'services', 'ia.js'))});
    console.log(JSON.stringify(ia.status()));
  `], {
    cwd: RAIZ,
    encoding: 'utf8',
    env: Object.assign({}, process.env, {
      IA_PROVEDOR: 'openai',
      IA_BASE_URL: 'https://exemplo.invalid/v1',
      IA_API_KEY: segredo,
      IA_MODELO: 'modelo-teste',
    }),
  });
  const statusComChave = (child.stdout || '').trim();
  ok(child.status === 0 && statusComChave.length > 0, 'processo filho com provedor configurado respondeu');
  ok(!statusComChave.includes(segredo), 'a chave NÃO aparece no status público');
  ok(statusComChave.includes('exemplo.invalid'), 'o status público mostra apenas o host do endpoint');
  ok(!statusComChave.includes('IA_API_KEY='), 'o status público nunca devolve valor de variável de ambiente');
  ok(statusComChave.includes('IA_API_KEY'), 'o status público lista o NOME das variáveis (sem valor), para guiar a configuração');

  /* ---------------- 2. Redação assistida ---------------- */
  console.log('\n2. Redação assistida (rascunhos)');
  const redacao = require(path.join(RAIZ, 'server', 'services', 'redacao.js'));
  let erroRascunho = null;
  try { await redacao.rascunhoPauta({ canalId: 'ia-na-pratica', tema: 'teste' }); }
  catch (e) { erroRascunho = e; }
  ok(!!erroRascunho && erroRascunho.status === 503, 'sem provedor não existe rascunho de pauta');

  let erroRascunho2 = null;
  try { await redacao.rascunhoRoteiro({ canalId: 'ia-na-pratica', titulo: 'x' }); }
  catch (e) { erroRascunho2 = e; }
  ok(!!erroRascunho2 && erroRascunho2.status === 503, 'sem provedor não existe rascunho de roteiro');

  let erroRascunho3 = null;
  try { await redacao.rascunhoAvaliacao({ canalId: 'ia-na-pratica', titulo: 'x' }); }
  catch (e) { erroRascunho3 = e; }
  ok(!!erroRascunho3 && erroRascunho3.status === 503, 'sem provedor não existe parecer do A2');

  /* ---------------- 3. Agendador ---------------- */
  console.log('\n3. Agendador automático');
  const agendador = require(path.join(RAIZ, 'server', 'services', 'agendador.js'));
  ok(agendador.HABILITADO_POR_AMBIENTE === false, 'agendador nasce desativado por padrão');
  const stAg = agendador.status();
  ok(stAg.ativo === false, 'agendador começa parado');
  ok(stAg.publicaSozinho === false, 'agendador declara que não publica sozinho');
  ok(stAg.exigeProvedorIA === true, 'agendador exige provedor de IA configurado');
  const inicio = agendador.iniciar();
  ok(!!inicio.erro && /AGENDADOR_ATIVO/.test(inicio.erro), 'iniciar sem habilitação do ambiente é recusado');
  ok(agendador.status().ativo === false, 'agendador continua desligado depois da recusa');
  ok(agendador.parar().ativo === false, 'parar o agendador é seguro');

  /* ---------------- 4. Execuções e vínculo com conteúdo ---------------- */
  console.log('\n4. Execuções e vínculo com conteúdo');
  const agentesSvc = require(path.join(RAIZ, 'server', 'services', 'agentes.js'));
  const dbFake = {
    conteudos: [], execucoes: [], historico: [], decisoes: [], avaliacoes: [],
    canais: [{ id: 'ia-na-pratica', nome: 'IA na Prática' }],
  };
  const exec = agentesSvc.abrirExecucao(dbFake, { agente: 'A1', descricao: 'execução de teste' });
  ok(!!exec.id && exec.status === 'em_andamento', 'abrirExecucao cria execução em andamento');
  const pauta = agentesSvc.criarPauta(dbFake, {
    canalId: 'ia-na-pratica',
    titulo: 'Pauta de teste unitário',
    resumo: 'Resumo do teste unitário.',
    corpo: 'Corpo.',
    publicoAlvo: 'Profissionais',
    monetizacao: 'Afiliados',
    justificativa: 'Teste.',
    potencial: { originalidade: 7, engajamento: 6, monetizacao: 5 },
    fontes: [{ titulo: 'MDN', url: 'https://developer.mozilla.org/pt-BR/docs/Web/API' }],
    origem: 'a1',
    execucaoId: exec.id,
  });
  ok(pauta.execucaoId === exec.id, 'a pauta guarda o id da execução que a produziu');
  agentesSvc.registrarItemGerado(dbFake, exec.id);
  ok(dbFake.execucoes[0].itensGerados === 1, 'registrarItemGerado conta o item na execução');
  const encerrada = agentesSvc.encerrarExecucao(dbFake, exec.id, {
    creditos: 0, itensGerados: 1, status: 'concluida', observacao: 'fim',
    uso: { total_tokens: 120 }, chamadasProvedor: 1,
  });
  ok(encerrada.uso && encerrada.uso.total_tokens === 120, 'a execução guarda o uso real do provedor');
  ok(encerrada.chamadasProvedor === 1, 'a execução conta as chamadas ao provedor');
  ok(encerrada.status === 'concluida', 'a execução fecha com status');

  /* ---------------- 5. Servidor em porta de teste ---------------- */
  console.log('\n5. Rotas novas no servidor (banco temporário)');
  const semente = JSON.parse(fs.readFileSync(DB_REAL, 'utf8'));
  semente.conteudos = [];
  semente.decisoes = [];
  semente.historico = [];
  semente.execucoes = [];
  semente.avaliacoes = [];
  fs.writeFileSync(DB_TESTE, JSON.stringify(semente, null, 2), 'utf8');

  const srv = spawn(process.execPath, [path.join(RAIZ, 'server', 'index.js')], {
    cwd: RAIZ,
    env: Object.assign(ambienteLimpo(), { PORTA: String(PORTA), DB_ARQUIVO: DB_TESTE }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  srv.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));

  try {
    await esperar(900);

    const provedor = await req('GET', '/api/agentes/provedor');
    ok(provedor.status === 200, 'GET /api/agentes/provedor responde 200');
    ok(provedor.corpo.configurado === false, 'provedor aparece como desligado no painel');
    ok(!('apiKey' in provedor.corpo), 'a rota do provedor não devolve chave');

    const agStatus = await req('GET', '/api/agentes/agendador');
    ok(agStatus.status === 200, 'GET /api/agentes/agendador responde 200');
    ok(agStatus.corpo.ativo === false, 'agendador aparece como desligado');
    ok(agStatus.corpo.publicaSozinho === false, 'agendador declara que não publica sozinho');

    const ligar = await req('POST', '/api/agentes/agendador', { ativo: true });
    ok(ligar.status === 409, 'ligar o agendador por API é recusado (HTTP 409)', ligar.status);

    for (const [rota, nome] of [
      ['/api/agentes/rascunho/pauta', 'pauta'],
      ['/api/agentes/rascunho/roteiro', 'roteiro'],
      ['/api/agentes/rascunho/avaliacao', 'avaliacao'],
    ]) {
      const r = await req('POST', rota, { canalId: 'ia-na-pratica', tema: 'teste', pautaId: 'inexistente' });
      ok(r.status === 503 && r.corpo.modo === 'deterministico', `rascunho de ${nome} exige provedor (HTTP 503)`, r.status);
    }

    const pautaOk = await req('POST', '/api/agentes/pautas', {
      canalId: 'ia-na-pratica',
      titulo: 'Pauta criada pelo teste 4B',
      resumo: 'Resumo do teste 4B.',
      corpo: 'Corpo do teste.',
      publicoAlvo: 'Profissionais de tecnologia',
      monetizacao: 'Afiliados de ferramentas de IA',
      justificativa: 'Verificar o fluxo do console.',
      potencial: { originalidade: 7, engajamento: 6, monetizacao: 5 },
      fontes: [{ titulo: 'MDN', url: 'https://developer.mozilla.org/pt-BR/docs/Web/API' }],
      origem: 'a1',
    });
    ok(pautaOk.status === 201, 'pauta válida é registrada pela mesma API', pautaOk.status);
    const pautaId = pautaOk.corpo.id;

    const pautaRuim = await req('POST', '/api/agentes/pautas', {
      canalId: 'ia-na-pratica',
      titulo: 'Pauta com fonte ruim',
      resumo: 'Resumo.',
      corpo: 'Corpo.',
      publicoAlvo: 'Público.',
      monetizacao: 'Monetização.',
      potencial: { originalidade: 5, engajamento: 5, monetizacao: 5 },
      fontes: [{ titulo: 'Rede social', url: 'https://facebook.com/qualquer-coisa' }],
    });
    ok(pautaRuim.status === 422, 'pauta com fonte não confiável é recusada (HTTP 422)', pautaRuim.status);
    ok(Array.isArray(pautaRuim.corpo.detalhes) && pautaRuim.corpo.detalhes.length > 0, 'a recusa explica o motivo');

    const execAberta = await req('POST', '/api/agentes/execucoes', { agente: 'A1', descricao: 'execução de teste 4B' });
    ok(execAberta.status === 201 || execAberta.status === 200, 'execução pode ser aberta pela API', execAberta.status);
    const execId = execAberta.corpo.id;

    const pautaLigada = await req('POST', '/api/agentes/pautas', {
      canalId: 'ia-na-pratica',
      titulo: 'Pauta ligada à execução',
      resumo: 'Resumo.',
      corpo: 'Corpo.',
      publicoAlvo: 'Público.',
      monetizacao: 'Monetização.',
      potencial: { originalidade: 5, engajamento: 5, monetizacao: 5 },
      fontes: [{ titulo: 'MDN', url: 'https://developer.mozilla.org/pt-BR/docs/Web/API' }],
      execucaoId: execId,
    });
    ok(pautaLigada.status === 201, 'pauta com execucaoId é registrada', pautaLigada.status);

    const detalhe = await req('GET', `/api/execucoes/${execId}`);
    ok(detalhe.status === 200, 'GET /api/execucoes/:id responde 200', detalhe.status);
    ok(detalhe.corpo.execucao && detalhe.corpo.execucao.id === execId, 'o detalhe devolve a execução');
    ok(Array.isArray(detalhe.corpo.conteudos), 'o detalhe devolve os conteúdos gerados');
    ok(detalhe.corpo.conteudos.some((c) => c.id === pautaLigada.corpo.id), 'o detalhe inclui a pauta produzida naquela execução');

    const execInexistente = await req('GET', '/api/execucoes/nao-existe');
    ok(execInexistente.status === 404, 'execução inexistente devolve 404', execInexistente.status);

    const estado = await req('GET', '/api/estado');
    ok(estado.corpo.config.publicacaoAutomatica === false, 'publicação automática continua desligada');
    ok(estado.corpo.config.servicosPagosAutorizados === false, 'serviços pagos continuam desligados');
    ok(estado.corpo.config.aprovacaoObrigatoria === true, 'aprovação humana continua obrigatória');

    const detalheConteudo = await req('GET', `/api/conteudos/${pautaId}`);
    ok(detalheConteudo.corpo.podePublicar === false, 'pauta recém-criada não pode ser publicada');
  } finally {
    srv.kill();
    await esperar(300);
    try { fs.unlinkSync(DB_TESTE); } catch (_) {}
  }

  /* ---------------- 6. Frontend ---------------- */
  console.log('\n6. Frontend do console dos agentes');
  const jsAgentes = fs.readFileSync(path.join(RAIZ, 'public', 'js', 'agentes-ui.js'), 'utf8');
  const jsPainel = fs.readFileSync(path.join(RAIZ, 'public', 'js', 'painel.js'), 'utf8');
  const jsApi = fs.readFileSync(path.join(RAIZ, 'public', 'js', 'api.js'), 'utf8');
  const html = fs.readFileSync(path.join(RAIZ, 'public', 'index.html'), 'utf8');

  ok(jsAgentes.includes('window.AgentesUI'), 'existe o módulo isolado do console (agentes-ui.js)');
  ok(jsPainel.includes('window.AgentesUI.montar'), 'o painel.js só faz a chamada de montagem (módulo separado)');
  ok(html.includes('/js/agentes-ui.js'), 'o index.html carrega o módulo do console');
  ['rascunho-pauta', 'salvar-pauta', 'rascunho-avaliacao', 'salvar-avaliacao', 'rascunho-roteiro', 'salvar-roteiro', 'agendar-slot', 'ver-execucao']
    .forEach((a) => ok(jsAgentes.includes(`data-ag="${a}"`) || jsAgentes.includes(`'${a}'`), `ação "${a}" existe no console`));
  ok(jsAgentes.includes('prontoParaPublicar') === false, 'o console não decide publicação');

  const jsPublicos = fs.readdirSync(path.join(RAIZ, 'public', 'js'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => fs.readFileSync(path.join(RAIZ, 'public', 'js', f), 'utf8'));
  const todoFrontend = jsPublicos.join('\n');
  ok(!/Bearer\s/.test(todoFrontend), 'nenhum arquivo do frontend monta cabeçalho de autorização');
  ok(!/process\.env/.test(todoFrontend), 'nenhum arquivo do frontend lê variáveis de ambiente do servidor');
  ok(!/sk-[A-Za-z0-9]{16,}/.test(todoFrontend), 'nenhuma chave aparece no frontend');
  ok(!todoFrontend.includes('IA_API_KEY='), 'nenhuma variável de ambiente com chave é atribuída no frontend');
  ok(jsApi.includes('statusProvedor') && jsApi.includes('execucao:'), 'o cliente de API expõe as rotas novas');

  const servidor = [];
  const anda = (dir) => {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) anda(p);
      else if (e.name.endsWith('.js')) servidor.push(fs.readFileSync(p, 'utf8'));
    });
  };
  anda(path.join(RAIZ, 'server'));
  const todoServidor = servidor.join('\n');
  ok(!/graph\.facebook\.com|graph\.instagram\.com|youtube\.com\/v3|api\.telegram\.org/.test(todoServidor),
    'o servidor não chama nenhuma rede social (nenhuma publicação real)');

  console.log(`\n=== RESULTADO: ${passos - falhas}/${passos} verificações passaram ===\n`);
  if (falhas) process.exit(1);
}

principal().catch((e) => { console.error(e); process.exit(1); });
