/**
 * Servidor HTTP do painel — Etapa 2.
 *
 * Novidades em relação à Etapa 1:
 *  - Escrita persistente (POST) para criar conteúdo e registrar decisões.
 *  - Sala de Direção: aprovar / solicitar ajustes / rejeitar.
 *  - Nenhuma publicação, nenhuma conexão externa, nenhum serviço pago.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const { store } = require('./store');
const calendario = require('./services/calendario');
const indicadoresSvc = require('./services/indicadores');
const { integracoes } = require('./services/integracoes');
const conteudosSvc = require('./services/conteudos');
const agentesSvc = require('./services/agentes');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const VOZES_DIR = path.join(__dirname, '..', 'vozes');
const PORTA = Number(process.env.PORTA || 4321);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
};

function json(res, codigo, corpo) {
  res.writeHead(codigo, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(corpo));
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let dados = '';
    req.on('data', (c) => {
      dados += c;
      if (dados.length > 2e6) reject(new Error('corpo muito grande'));
    });
    req.on('end', () => {
      if (!dados) return resolve({});
      try {
        resolve(JSON.parse(dados));
      } catch (e) {
        reject(Object.assign(new Error('JSON inválido'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

/* ---------------------------- rotas da API ---------------------------- */

async function api(rota, req, res, url) {
  const db = await store.ler();
  const metodo = req.method;

  /* ----- leitura ----- */
  if (metodo === 'GET') {
    if (rota === '/api/estado') {
      const semana = calendario.gerarSemana(db, url.searchParams.get('semana'));
      return json(res, 200, {
        meta: db.meta,
        config: db.config,
        canais: db.canais,
        agentes: db.agentes,
        semana,
        indicadores: indicadoresSvc.indicadores(db, semana),
        integracoes,
        historico: (db.historico || []).slice(-40).reverse(),
      });
    }
    if (rota === '/api/calendario') {
      return json(res, 200, calendario.gerarSemana(db, url.searchParams.get('semana')));
    }
    if (rota === '/api/canais') return json(res, 200, db.canais);
    if (rota === '/api/agentes') return json(res, 200, db.agentes);
    if (rota === '/api/integracoes') return json(res, 200, integracoes);
    if (rota === '/api/indicadores') {
      return json(res, 200, indicadoresSvc.indicadores(db, calendario.gerarSemana(db)));
    }
    if (rota === '/api/conteudos') {
      const canal = url.searchParams.get('canal');
      const status = url.searchParams.get('status');
      let lista = db.conteudos || [];
      if (canal) lista = lista.filter((c) => c.canalId === canal);
      if (status) lista = lista.filter((c) => c.status === status);
      return json(res, 200, lista.slice().reverse());
    }
    const mConteudo = rota.match(/^\/api\/conteudos\/([^/]+)$/);
    if (mConteudo) {
      const c = (db.conteudos || []).find((x) => x.id === mConteudo[1]);
      if (!c) return json(res, 404, { erro: 'Conteúdo não encontrado' });
      const decisoes = (db.decisoes || []).filter((d) => d.conteudoId === c.id).slice().reverse();
      const podePublicar = conteudosSvc.podePublicar(c);
      return json(res, 200, { conteudo: c, decisoes, podePublicar });
    }
    if (rota === '/api/pendentes') {
      const ind = indicadoresSvc.indicadores(db, calendario.gerarSemana(db));
      return json(res, 200, ind.pendentes);
    }
    if (rota === '/api/decisoes') {
      return json(res, 200, (db.decisoes || []).slice().reverse());
    }
    if (rota === '/api/execucoes') {
      return json(res, 200, (db.execucoes || []).slice().reverse());
    }
    if (rota === '/api/produtos') {
      return json(res, 200, db.produtos || { itens: [] });
    }
    if (rota === '/api/backups') {
      const dir = path.join(PUBLIC_DIR, 'downloads');
      let lista = [];
      try {
        lista = fs.readdirSync(dir)
          .filter((f) => f.startsWith('Agencia_IA_Backup_') && f.endsWith('.zip'))
          .map((f) => {
            const st = fs.statSync(path.join(dir, f));
            const shaPath = path.join(dir, f + '.sha256');
            const sha = fs.existsSync(shaPath)
              ? fs.readFileSync(shaPath, 'utf8').trim().split(/\s+/)[0] : null;
            return { arquivo: f, bytes: st.size, mb: Math.round(st.size / 1048576 * 10) / 10,
                     criadoEm: st.mtime.toISOString(), sha256: sha,
                     tipo: f.includes('Completo') ? 'completo' : 'codigo' };
          })
          .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
      } catch (_) {}
      return json(res, 200, { backups: lista });
    }
    if (rota === '/api/previas') {
      return json(res, 200, db.previas || {});
    }
    if (rota === '/api/aprovacoes') {
      return json(res, 200, db.fluxoAprovacao || null);
    }
    if (rota === '/api/estudio') {
      return json(res, 200, {
        identidade: db.identidadeVisual || null,
        estudio: db.estudioArtes || null,
        central: db.centralPublicacoes || null,
      });
    }
    if (rota === '/api/vozes') {
      return json(res, 200, db.vozes || { canais: {}, amostras: [] });
    }
    if (rota === '/api/avaliacoes') {
      return json(res, 200, (db.avaliacoes || []).slice().reverse());
    }
    if (rota === '/api/calendarios') {
      return json(res, 200, (db.calendarios || []).slice().reverse());
    }
    if (rota === '/api/agentes/regras') {
      return json(res, 200, {
        blocosRoteiro: agentesSvc.BLOCOS_ROTEIRO,
        fontesConfiaveis: agentesSvc.FONTES_CONFIAVEIS,
        regraA3: 'Roteiro só é aceito sobre pauta com status pauta_aprovada.',
        regraFontes: 'Toda afirmação factual exige fonte verificável; redes sociais e blogs são recusados.',
        regraSaude: 'Poder 50+: exige fonte científica ou oficial; promessa de resultado é proibida.',
      });
    }
    if (rota === '/api/historico') {
      return json(res, 200, (db.historico || []).slice(-100).reverse());
    }
    return json(res, 404, { erro: 'Rota não encontrada', rota });
  }

  /* ----- escrita ----- */
  if (metodo === 'POST') {
    const corpo = await lerCorpo(req);

    if (rota === '/api/conteudos') {
      const criado = await store.transacao((d) => conteudosSvc.criarConteudo(d, corpo));
      return json(res, 201, criado);
    }

    const mDecisao = rota.match(/^\/api\/conteudos\/([^/]+)\/decisao$/);
    if (mDecisao) {
      const resultado = await store.transacao((d) => conteudosSvc.decidir(d, mDecisao[1], corpo));
      return json(res, 200, resultado);
    }

    const mReenvio = rota.match(/^\/api\/conteudos\/([^/]+)\/reenviar$/);
    if (mReenvio) {
      const c = await store.transacao((d) => conteudosSvc.reenviar(d, mReenvio[1], corpo));
      return json(res, 200, c);
    }

    /* ----- agentes ----- */
    if (rota === '/api/agentes/pautas') {
      const pauta = await store.transacao((d) => agentesSvc.criarPauta(d, corpo));
      return json(res, 201, pauta);
    }

    const mRoteiro = rota.match(/^\/api\/agentes\/pautas\/([^/]+)\/roteiro$/);
    if (mRoteiro) {
      const roteiro = await store.transacao((d) => agentesSvc.criarRoteiro(d, mRoteiro[1], corpo));
      return json(res, 201, roteiro);
    }

    const mAvaliar = rota.match(/^\/api\/agentes\/pautas\/([^/]+)\/avaliacao$/);
    if (mAvaliar) {
      const avaliacao = await store.transacao((d) => agentesSvc.avaliarPauta(d, mAvaliar[1], corpo));
      return json(res, 201, avaliacao);
    }

    const mRevisao = rota.match(/^\/api\/agentes\/pautas\/([^/]+)\/revisao-final$/);
    if (mRevisao) {
      const pauta = await store.transacao((d) => agentesSvc.revisarPauta(d, mRevisao[1], corpo));
      return json(res, 200, pauta);
    }

    /* ----- produtos ----- */
    if (rota === '/api/produtos') {
      const p = corpo;
      if (!p.nome || !String(p.nome).trim()) {
        return json(res, 400, { erro: 'Nome do produto é obrigatório' });
      }
      const id = String(p.id || p.nome).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const lista = (db.produtos && db.produtos.itens) || [];
      if (lista.some((x) => x.id === id)) {
        return json(res, 409, { erro: 'Já existe um produto com esse identificador' });
      }
      const novo = {
        id,
        nome: String(p.nome).trim(),
        descricao: String(p.descricao || ''),
        status: 'ativo',
        cor: p.cor || '#6C5CE7',
        corSecundaria: p.corSecundaria || p.cor || '#8B7CF0',
        tipografia: p.tipografia || 'Montserrat',
        site: p.site || null,
        logotipo: null,
        redes: {
          instagram: { ativo: true, conectado: false },
          facebook: { ativo: true, conectado: false },
          tiktok: { ativo: true, conectado: false },
          youtube: { ativo: true, conectado: false },
          whatsapp: { ativo: true, conectado: false, numeroCompartilhado: true },
        },
        voz: { motor: null, nome: null, speed: null, status: 'nao_definida' },
        calendario: { dias: ['Terça', 'Quinta', 'Sábado'], hora: p.hora || '18:00', metaSemanal: 3 },
        agentes: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'],
        biblioteca: { artes: 0, videos: 0, roteiros: 0 },
        criadoEm: new Date().toISOString(),
      };
      await store.transacao((d) => {
        d.produtos = d.produtos || { itens: [] };
        d.produtos.itens.push(novo);
        d.historico = d.historico || [];
        d.historico.push({ em: new Date().toISOString(), tipo: 'produto',
          texto: `Produto criado: "${novo.nome}" (${novo.id}) — calendário, biblioteca e configurações próprias preparados.` });
      });
      return json(res, 201, novo);
    }

    const mProduto = rota.match(/^\/api\/produtos\/([^/]+)$/);
    if (mProduto) {
      const id = mProduto[1];
      const campos = corpo || {};
      const atualizado = await store.transacao((d) => {
        const item = ((d.produtos && d.produtos.itens) || []).find((x) => x.id === id);
        if (!item) return null;
        ['nome', 'descricao', 'status', 'cor', 'corSecundaria', 'tipografia', 'site'].forEach((k) => {
          if (campos[k] !== undefined) item[k] = campos[k];
        });
        if (campos.redes) item.redes = Object.assign({}, item.redes, campos.redes);
        if (campos.voz) item.voz = Object.assign({}, item.voz, campos.voz);
        if (campos.calendario) item.calendario = Object.assign({}, item.calendario, campos.calendario);
        d.historico = d.historico || [];
        d.historico.push({ em: new Date().toISOString(), tipo: 'produto',
          texto: `Produto atualizado: "${item.nome}".` });
        return item;
      });
      if (!atualizado) return json(res, 404, { erro: 'Produto não encontrado' });
      return json(res, 200, atualizado);
    }

    /* ----- gerar backup ----- */
    if (rota === '/api/backup/gerar') {
      const tipo = (corpo && corpo.tipo === 'codigo') ? '--codigo' : '--completo';
      const { execFile } = require('child_process');
      const py = process.env.PYTHON_BIN || 'python';
      const script = path.join(__dirname, '..', 'scripts', 'gerar-backup.py');
      try {
        const saida = require('child_process').execFileSync(py, [script, tipo], {
          cwd: path.join(__dirname, '..'),
          timeout: 20 * 60 * 1000,
          encoding: 'utf8',
          env: Object.assign({}, process.env, { PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' }),
        });
        const linha = saida.trim().split('\n').filter((l) => l.startsWith('{')).pop();
        const info = JSON.parse(linha);
        await store.transacao((d) => {
          d.historico = d.historico || [];
          d.historico.push({ em: new Date().toISOString(), tipo: 'backup',
            texto: `Backup ${info.tipo} gerado: ${info.arquivo} (${info.mb} MB, ${info.arquivos} arquivos).` });
        });
        return json(res, 201, info);
      } catch (e) {
        return json(res, 500, { erro: 'Falha ao gerar backup', detalhe: String(e.message || e) });
      }
    }

    /* ----- aprovação por etapa ----- */
    const mEtapa = rota.match(/^\/api\/conteudos\/([^/]+)\/etapa$/);
    if (mEtapa) {
      const id = mEtapa[1];
      const { etapa, decisao, orientacoes, versao } = corpo || {};
      if (!['pauta', 'roteiro', 'producao'].includes(etapa)) {
        return json(res, 400, { erro: 'Etapa inválida' });
      }
      const r = await store.transacao((d) => {
        const c = (d.conteudos || []).find((x) => x.id === id);
        if (!c) return { erro: 'Conteúdo não encontrado', status: 404 };
        c.aprovacoes = c.aprovacoes || {};
        const acao = decisao || 'aprovar';
        const em = new Date().toISOString();
        c.aprovacoes[etapa] = {
          status: acao === 'aprovar' ? 'aprovada' : acao === 'ajustes' ? 'ajuste' : 'rejeitada',
          em,
          autor: corpo.autor || 'Direção',
          versao: c.versao || 1,
          versaoInformada: versao || null,
          orientacoes: String(orientacoes || '') || null,
        };
        c.atualizadoEm = em;
        // qualquer decisão que não seja aprovação invalida a aprovação final
        if (acao !== 'aprovar' && c.aprovacoes.final) c.aprovacoes.final = { status: 'pendente', em: null };
        d.decisoes = d.decisoes || [];
        d.decisoes.push({ id: 'etapa-' + Date.now(), conteudoId: id, decisao: 'etapa_' + etapa + '_' + acao,
          statusNovo: c.aprovacoes[etapa].status, autor: corpo.autor || 'Direção', versao: c.versao || 1,
          orientacoes: String(orientacoes || '') || null, em });
        d.historico.push({ em, tipo: 'etapa', conteudoId: id,
          texto: `Etapa "${etapa}" ${c.aprovacoes[etapa].status} (v${c.versao || 1}) — "${c.titulo}".` });
        return { conteudo: c };
      });
      if (r.erro) return json(res, r.status || 400, r);
      return json(res, 200, r);
    }

    /* ----- aprovação final de publicação ----- */
    const mPub = rota.match(/^\/api\/conteudos\/([^/]+)\/publicacao$/);
    if (mPub) {
      const id = mPub[1];
      const { decisao, orientacoes } = corpo || {};
      if (!['aprovar', 'ajustes', 'rejeitar'].includes(decisao)) {
        return json(res, 400, { erro: 'Decisão inválida' });
      }
      const r = await store.transacao((d) => {
        const c = (d.conteudos || []).find((x) => x.id === id);
        if (!c) return { erro: 'Conteúdo não encontrado', status: 404 };
        c.aprovacoes = c.aprovacoes || {};
        const etapas = ['pauta', 'roteiro', 'producao'];
        const pendentes = etapas.filter((e) => !c.aprovacoes[e] || c.aprovacoes[e].status !== 'aprovada');
        if (decisao === 'aprovar' && pendentes.length) {
          return { erro: 'Aprovação final bloqueada: etapas pendentes', detalhes: pendentes, status: 409 };
        }
        if (decisao !== 'aprovar' && !String(orientacoes || '').trim()) {
          return { erro: 'Descreva as orientações', status: 400 };
        }
        const em = new Date().toISOString();
        c.aprovacoes.final = { status: decisao === 'aprovar' ? 'aprovada' : decisao === 'ajustes' ? 'ajuste' : 'rejeitada', em };
        c.status = decisao === 'aprovar' ? 'aprovado_final' : decisao === 'ajustes' ? 'ajuste' : 'rejeitado';
        c.atualizadoEm = em;
        if (decisao !== 'aprovar') c.aprovacoes.producao = { status: 'pendente', em: null };
        d.decisoes = d.decisoes || [];
        d.decisoes.push({ id: 'pub-' + Date.now(), conteudoId: id, decisao: 'publicacao_' + decisao,
          orientacoes: String(orientacoes || '') || null, autor: 'Direção', em });
        d.historico.push({ em, tipo: 'publicacao', conteudoId: id,
          texto: `Aprovação final: ${decisao} — "${c.titulo}".` });
        return { conteudo: c };
      });
      if (r.erro) return json(res, r.status || 400, r);
      return json(res, 200, r);
    }

    if (rota === '/api/agentes/calendario') {
      const plano = await store.transacao((d) => agentesSvc.registrarCalendario(d, corpo));
      return json(res, 201, plano);
    }

    if (rota === '/api/agentes/execucoes') {
      const exec = await store.transacao((d) => agentesSvc.abrirExecucao(d, corpo));
      return json(res, 201, exec);
    }

    const mExecFim = rota.match(/^\/api\/agentes\/execucoes\/([^/]+)\/encerrar$/);
    if (mExecFim) {
      const exec = await store.transacao((d) => agentesSvc.encerrarExecucao(d, mExecFim[1], corpo));
      return json(res, 200, exec);
    }

    return json(res, 404, { erro: 'Rota não encontrada', rota });
  }

  return json(res, 405, {
    erro: 'Método não permitido',
    detalhe: 'O painel aceita GET para leitura e POST para decisões de direção. Publicação não existe nesta etapa.',
  });
}

/* ---------------------------- arquivos estáticos ---------------------------- */

function estatico(caminho, res, req) {
  const rel = caminho === '/' ? '/index.html' : caminho;

  // /vozes/* serve as amostras de áudio (somente leitura)
  if (rel.startsWith('/vozes/')) {
    const alvoVoz = path.join(VOZES_DIR, path.normalize(rel.replace('/vozes/', '')).replace(/^(\.\.[/\\])+/, ''));
    if (!alvoVoz.startsWith(VOZES_DIR)) { res.writeHead(403); return res.end('Acesso negado'); }
    return enviarArquivo(alvoVoz, res, req);
  }

  const alvo = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!alvo.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Acesso negado');
  }
  return enviarArquivo(alvo, res, req);
}

/** Envia um arquivo com suporte a Range (necessário para o player de áudio). */
function enviarArquivo(alvo, res, req) {
  fs.stat(alvo, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Arquivo não encontrado');
    }
    const tipo = MIME[path.extname(alvo).toLowerCase()] || 'application/octet-stream';
    const range = req && req.headers && req.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      let inicio = m && m[1] ? parseInt(m[1], 10) : 0;
      let fim = m && m[2] ? parseInt(m[2], 10) : st.size - 1;
      if (inicio >= st.size) {
        res.writeHead(416, { 'Content-Range': `bytes */${st.size}` });
        return res.end();
      }
      if (fim >= st.size) fim = st.size - 1;
      res.writeHead(206, {
        'Content-Type': tipo,
        'Content-Length': fim - inicio + 1,
        'Content-Range': `bytes ${inicio}-${fim}/${st.size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      });
      return fs.createReadStream(alvo, { start: inicio, end: fim }).pipe(res);
    }
    res.writeHead(200, {
      'Content-Type': tipo,
      'Content-Length': st.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    });
    return fs.createReadStream(alvo).pipe(res);
  });
}

/* ---------------------------- servidor ---------------------------- */

const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const rota = url.pathname;
    if (rota.startsWith('/api/')) return await api(rota, req, res, url);
    return estatico(rota, res, req);
  } catch (e) {
    const codigo = e.status || 500;
    if (codigo === 500) console.error(e);
    return json(res, codigo, { erro: e.message || 'Erro interno', detalhes: e.detalhes || null });
  }
});

servidor.listen(PORTA, '127.0.0.1', () => {
  console.log(`Painel da Agência de IA Autônoma em http://localhost:${PORTA}`);
});
