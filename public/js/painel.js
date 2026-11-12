/* ============================================================
   Painel da Agência de IA Autônoma — Etapa 2
   Sala de Direção, biblioteca de conteúdos e persistência real.
   Nenhuma publicação. Nenhuma conta externa. Nenhum serviço pago.
   ============================================================ */

(function () {
  const estado = {
    dados: null,
    semanaRef: null,
    aba: 'visao',
    filtroCanal: 'todos',
    filtroStatus: 'todos',
    busca: '',
    detalheId: null,
  };

  const $ = (sel, raiz) => (raiz || document).querySelector(sel);
  const normalizar = (t) => String(t == null ? '' : t).normalize('NFC');
  const esc = (t) =>
    normalizar(t).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  const icone = (n) => window.icone(n);

  const ROTULOS_STATUS = {
    pauta: 'Pauta',
    roteiro: 'Roteiro',
    producao: 'Produção',
    edicao: 'Edição',
    aprovacao: 'Aguardando aprovação',
    ajuste: 'Em ajuste',
    pauta_aprovada: 'Pauta aprovada',
    em_roteiro: 'Em roteiro',
    aprovado: 'Aprovado',
    aprovado_final: 'Aprovado para publicação',
    rejeitado: 'Rejeitado',
    publicado: 'Publicado',
  };

  const SUBTITULOS = {
    visao: 'Panorama da operação: 3 canais, 9 vídeos por semana e 6 agentes.',
    direcao: 'Sua mesa de decisão: aprovar, solicitar ajustes ou rejeitar cada conteúdo.',
    pautas: 'Pautas propostas pelo A1, com nota de potencial, monetização e fontes verificáveis.',
    vozes: 'Ouça, compare e escolha a voz fixa de cada canal.',
    estudio: 'Cards, carrosséis, infográficos e capas com a identidade de cada canal.',
    produtos: 'Produtos com site, redes sociais e identidade próprios — escalável e sem tocar no código.',
    publicacoes: 'Fluxo de publicação em modo simulação — nenhuma conta conectada.',
    backup: 'Baixe todo o projeto em ZIP: código, banco, artes, vídeos, áudios e vozes.',
    execucoes: 'Custo real em créditos e itens gerados por cada execução de agente.',
    biblioteca: 'Todos os conteúdos registrados, com filtros, histórico e decisões.',
    canais: 'Os três canais administrados pela agência, com meta e ângulo de monetização.',
    calendario: 'Grade semanal de 9 slots. Um slot é uma vaga planejada, não um vídeo produzido.',
    producao: 'Etapas de produção por agente, com o conteúdo real registrado no banco.',
    agentes: 'Os seis agentes da agência e o estado real de implementação de cada um.',
    pendentes: 'Fila de aprovação. Nada é publicado sem a sua autorização.',
    integracoes: 'Ponto de encaixe para as automações futuras. Nenhuma está conectada.',
    sobre: 'O que esta versão faz, o que não faz e por quê.',
  };

  const TITULOS = {
    visao: 'Visão geral',
    direcao: 'Sala de Direção',
    pautas: 'Pautas dos agentes',
    vozes: 'Narradores e vozes',
    estudio: 'Estúdio de Artes',
    produtos: 'Gestão de Produtos e Canais',
    publicacoes: 'Central de Publicações',
    backup: 'Backup e Exportação',
    execucoes: 'Execuções dos agentes',
    biblioteca: 'Biblioteca de conteúdos',
    canais: 'Canais',
    calendario: 'Calendário editorial',
    producao: 'Acompanhamento de produção',
    agentes: 'Agentes de IA',
    pendentes: 'Conteúdos pendentes',
    integracoes: 'Integrações futuras',
    sobre: 'Sobre esta etapa',
  };

  /* ------------------------------ utilidades ------------------------------ */

  const fmtData = (iso) => {
    if (!iso) return '—';
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
  };

  const fmtDataHora = (isoCompleto) => {
    if (!isoCompleto) return '—';
    const d = new Date(isoCompleto);
    return d.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const horaRelativa = (isoCompleto) => {
    if (!isoCompleto) return '';
    const diff = Date.now() - new Date(isoCompleto).getTime();
    const min = Math.round(diff / 60000);
    if (min < 1) return 'agora mesmo';
    if (min < 60) return `há ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `há ${h} h`;
    const d = Math.round(h / 24);
    return `há ${d} d`;
  };

  function hojeISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const decisoesDe = (id) => (estado.dados && estado.dados.decisoesPorConteudo
    ? estado.dados.decisoesPorConteudo[id] || [] : []);

  const canal = (id) => (estado.dados.canais || []).find((c) => c.id === id) || { nome: id, cor: '#888' };

  /* ------------------------------ notificações ------------------------------ */

  let tempoToast = null;
  function toast(mensagem, tipo) {
    let el = $('#toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.className = 'toast ' + (tipo || 'ok');
    el.innerHTML = `${icone(tipo === 'erro' ? 'alert' : 'check')}<span>${esc(mensagem)}</span>`;
    el.classList.add('visivel');
    clearTimeout(tempoToast);
    tempoToast = setTimeout(() => el.classList.remove('visivel'), 4200);
  }

  /* ------------------------------ carregamento ------------------------------ */

  async function carregar(semana, silencioso) {
    const btn = $('#btn-atualizar');
    if (btn) btn.classList.add('girando');
    try {
      const dados = await Api.estado(semana);
      dados.conteudosDetalhe = await Api.conteudos();
      const [decisoes, avaliacoes, calendarios, vozes, estudio] = await Promise.all([
        Api.decisoes(), Api.avaliacoes().catch(() => []), Api.calendarios().catch(() => []),
        Api.vozes().catch(() => ({ canais: {}, amostras: [] })),
        Api.estudio().catch(() => ({ identidade: null, estudio: null, central: null })),
      ]);
      dados.produtos = await Api.produtos().catch(() => ({ itens: [] }));
      dados.previas = await Api.previas().catch(() => ({}));
      dados.fluxoAprovacao = await Api.aprovacoes().catch(() => null);
      dados.backups = await Api.backups().catch(() => []);
      dados.vozes = vozes;
      dados.estudio = estudio;
      dados.avaliacoes = avaliacoes || [];
      dados.calendariosPropostos = calendarios || [];
      dados.decisoesPorConteudo = {};
      (decisoes || []).forEach((d) => {
        (dados.decisoesPorConteudo[d.conteudoId] = dados.decisoesPorConteudo[d.conteudoId] || []).push(d);
      });
      estado.dados = dados;
      estado.semanaRef = estado.dados.semana.inicioSemana;
      if (!silencioso) {
        render();
        atualizarIndicadorModo();
      } else {
        atualizarBadges();
      }
    } catch (e) {
      if (!silencioso) {
        $('#corpo').innerHTML = `
          <div class="aviso"><span>${icone('alert')}</span>
            <div><b>Não foi possível carregar os dados.</b><br>${esc(e.message)}<br>
            Inicie o servidor com <code>node server/index.js</code>.</div></div>`;
      } else {
        toast(e.message, 'erro');
      }
    } finally {
      if (btn) btn.classList.remove('girando');
    }
  }

  function atualizarIndicadorModo() {
    const el = $('#modo-dados');
    const nota = $('#nota-modo');
    if (!el) return;
    const modo = Api.modo();
    if (modo === 'desconhecido') {
      el.className = 'pilula-etapa';
      el.innerHTML = `${icone('clock')} conectando ao banco…`;
      return;
    }
    const vivo = modo === 'vivo';
    el.className = 'pilula-etapa ' + (vivo ? '' : 'somente-leitura');
    el.innerHTML = vivo
      ? `${icone('save')} gravando no banco`
      : `${icone('lock')} somente leitura`;
    el.title = vivo
      ? 'As decisões da Sala de Direção são gravadas em data/db.json'
      : 'Sem servidor: o painel está exibindo um snapshot estático e não pode gravar';
    if (nota) {
      nota.innerHTML = vivo
        ? 'Etapa 2 · decisões salvas em <code>data/db.json</code>. Nenhuma publicação, conexão externa ou pagamento.'
        : 'Modo somente leitura: inicie o servidor com <code>node server/index.js</code> para gravar decisões.';
    }
  }

  function atualizarBadges() {
    const d = estado.dados;
    if (!d) return;
    const nDir = d.indicadores.pendentes.length;
    const bDir = $('#badge-direcao');
    const bPend = $('#badge-pendentes');
    if (bDir) { bDir.textContent = nDir; bDir.classList.toggle('ativo', nDir > 0); }
    if (bPend) { bPend.textContent = nDir; bPend.classList.toggle('ativo', nDir > 0); }
    const nPautas = d.indicadores.pautasAguardando || 0;
    const bPautas = $('#badge-pautas');
    if (bPautas) { bPautas.textContent = nPautas; bPautas.classList.toggle('ativo', nPautas > 0); }
  }

  /* ------------------------------ render ------------------------------ */

  function render() {
    const d = estado.dados;
    $('#titulo-aba').textContent = TITULOS[estado.aba];
    $('#subtitulo-aba').textContent = SUBTITULOS[estado.aba];
    atualizarBadges();

    const renderizadores = {
      visao: renderVisao,
      direcao: renderDirecao,
      pautas: renderPautas,
      vozes: renderVozes,
      estudio: renderEstudio,
      produtos: renderProdutos,
      publicacoes: renderPublicacoes,
      backup: renderBackup,
      execucoes: renderExecucoes,
      biblioteca: renderBiblioteca,
      canais: renderCanais,
      calendario: renderCalendario,
      producao: renderProducao,
      agentes: renderAgentes,
      pendentes: renderPendentes,
      integracoes: renderIntegracoes,
      sobre: renderSobre,
    };
    $('#corpo').innerHTML = renderizadores[estado.aba](d);
    if (window.AgentesUI) {
      try {
        window.AgentesUI.montar($('#corpo'), {
          aba: estado.aba,
          dados: d,
          recarregar: () => carregar(estado.semanaRef),
          toast: toast,
        });
      } catch (e) { console.error('[agentes-ui]', e); }
    }
    if (estado.detalheId) abrirDetalhe(estado.detalheId, true);
  }

  function rotuloStatusAgente(s) {
    return {
      nao_implementado: 'Não implementado',
      pendente: 'Pendente',
      pronto_para_integrar: 'Pronto para integrar',
      implementado: 'Implementado (API ativa)',
      indisponivel: 'Indisponível',
      ativo: 'Ativo',
    }[s] || s;
  }

  function etiquetaStatus(status) {
    return `<span class="etiqueta st-${esc(status)}">${esc(ROTULOS_STATUS[status] || status)}</span>`;
  }

  /* ---------- Visão geral ---------- */

  function renderVisao(d) {
    const i = d.indicadores;
    const agora = hojeISO();

    const kpis = [
      { rotulo: 'Aguardando sua decisão', valor: i.pendentes.length,
        nota: i.pendentes.length ? 'clique em Sala de Direção' : 'nada na fila',
        icone: 'gavel', barra: null },
      { rotulo: 'Aprovados', valor: i.prontosParaPublicar || 0,
        nota: 'prontos, mas nada será publicado', icone: 'check', barra: null },
      { rotulo: 'Em ajuste', valor: i.emAjuste || 0,
        nota: 'devolvidos com orientações', icone: 'undo', barra: null },
      { rotulo: 'Rejeitados', valor: i.rejeitados || 0,
        nota: 'fora da produção', icone: 'x', barra: null },
    ];

    const cardsCanais = d.canais.map((c) => {
      const st = i.porCanal.find((x) => x.canalId === c.id);
      return `
        <div class="canal-card" style="--canal-cor:${esc(c.cor)};--canal-suave:${esc(c.corSuave)}">
          <div class="canal-topo">
            <div class="canal-avatar">${icone(c.icone)}</div>
            <div>
              <div class="canal-nome">${esc(c.nome)}</div>
              <div class="canal-tema">${esc(c.tema)}</div>
            </div>
          </div>
          <div class="canal-stats">
            <div class="canal-stat"><b>${c.metaSemanal}</b><span>por semana</span></div>
            <div class="canal-stat"><b>${st.comConteudo}/${st.slotsNaSemana}</b><span>slots</span></div>
            <div class="canal-stat"><b>${st.totalConteudos}</b><span>conteúdos</span></div>
          </div>
          <div class="chips">
            ${c.monetizacao.map((m) => `<span class="chip moeda">${esc(m)}</span>`).join('')}
          </div>
        </div>`;
    }).join('');

    const proximos = d.semana.slots.filter((s) => s.data >= agora).slice(0, 5);
    const listaProximos = proximos.length
      ? proximos.map((s) => `
          <div class="linha-info" style="align-items:center">
            <span style="display:flex;align-items:center;gap:8px">
              <i style="width:7px;height:7px;border-radius:50%;background:${esc(s.canalCor)}"></i>
              <b>${esc(s.diaSemana)}, ${fmtData(s.data)} · ${esc(s.hora)}</b>
            </span>
            <span>${esc(s.canalNome)}</span>
          </div>`).join('')
      : '<p style="color:var(--texto-3);font-size:12.5px;margin:0">Nenhum slot restante nesta semana.</p>';

    const rd = i.resumoDecisoes || { total: 0, aprovados: 0, ajustes: 0, rejeitados: 0, reenvios: 0 };

    return `
      <div class="grade grade-4 secao">
        ${kpis.map((k) => `
          <div class="card kpi">
            <div class="kpi-rotulo">${icone(k.icone)} ${esc(k.rotulo)}</div>
            <div class="kpi-valor">${k.valor}</div>
            <div class="kpi-nota">${esc(k.nota)}</div>
          </div>`).join('')}
      </div>

      ${i.pendentes.length ? `
        <div class="aviso acao secao">
          <span>${icone('gavel')}</span>
          <div style="flex:1">
            <b>${i.pendentes.length} conteúdo(s) esperando sua decisão.</b>
            Nada será publicado — só o seu registro de direção fica salvo no banco.
          </div>
          <button class="btn btn-primario" data-ir="direcao">Abrir Sala de Direção</button>
        </div>` : ''}

      <div class="secao">
        <div class="secao-titulo"><h2>Canais administrados</h2>
          <span class="dica">${d.canais.length} canais · ${d.config.metaSemanal} vídeos/semana</span></div>
        <div class="grade grade-3">${cardsCanais}</div>
      </div>

      <div class="grade grade-2 secao">
        <div class="card">
          <div class="secao-titulo"><h2>Próximos slots desta semana</h2></div>
          ${listaProximos}
        </div>
        <div class="card">
          <div class="secao-titulo"><h2>Decisões registradas</h2></div>
          <div class="grade grade-2" style="gap:10px">
            <div class="mini-stat"><b>${rd.total}</b><span>total de decisões</span></div>
            <div class="mini-stat ok"><b>${rd.aprovados}</b><span>aprovações</span></div>
            <div class="mini-stat aviso"><b>${rd.ajustes}</b><span>pedidos de ajuste</span></div>
            <div class="mini-stat erro"><b>${rd.rejeitados}</b><span>rejeições</span></div>
          </div>
          <div class="linha-info" style="margin-top:12px">
            <span>Última decisão</span><b>${rd.ultimaEm ? fmtDataHora(rd.ultimaEm) : 'nenhuma ainda'}</b>
          </div>
          <div class="linha-info"><span>Publicação automática</span><b>${d.config.publicacaoAutomatica ? 'ligada' : 'bloqueada'}</b></div>
          <div class="linha-info"><span>Serviços pagos</span><b>${d.config.servicosPagosAutorizados ? 'autorizados' : 'nenhum autorizado'}</b></div>
        </div>
      </div>

      <div class="secao">
        <div class="secao-titulo"><h2>Agentes</h2><span class="dica">estado real de implementação</span></div>
        <div class="grade grade-3">
          ${d.agentes.map((a) => `
            <div class="agente">
              <div class="agente-topo">
                <div class="agente-avatar">${icone(a.icone)}</div>
                <div>
                  <div class="agente-codigo">${esc(a.codigo)}</div>
                  <div class="agente-nome">${esc(a.nome)}</div>
                </div>
              </div>
              <span class="etiqueta ${esc(a.status)}">${rotuloStatusAgente(a.status)}</span>
            </div>`).join('')}
        </div>
      </div>
    `;
  }

  /* ---------- Sala de Direção ---------- */

  function renderDirecao(d) {
    const fila = d.indicadores.pendentes;
    if (!fila.length) {
      return `
        <div class="estado-vazio">
          ${icone('gavel')}
          <strong>Nada aguardando sua decisão</strong>
          <p>A fila está vazia. Quando um conteúdo chegar para aprovação, ele aparece aqui com os
          três botões: aprovar, solicitar ajustes e rejeitar.</p>
          <button class="btn btn-secundario" data-ir="biblioteca">Ver a biblioteca</button>
        </div>`;
    }

    return `
      <div class="aviso neutro secao">
        <span>${icone('info')}</span>
        <div><b>${fila.length} conteúdo(s) na sua mesa.</b> Aprovar registra a decisão e libera o item
        apenas como “aprovado” — nada é publicado. Solicitar ajustes e rejeitar exigem orientação escrita.</div>
      </div>
      <div class="mesa">
        ${fila.map((p) => {
          const c = (d.conteudosDetalhe || []).find((x) => x.id === p.id);
          const corpo = c ? c.corpo : '';
          return `
          <article class="ficha" style="--canal-cor:${esc(p.canalCor)}">
            <header class="ficha-topo">
              <div>
                <div class="ficha-canal">${esc(p.canalNome)} · ${esc(p.statusLabel)}</div>
                <h3>${esc(p.titulo)}</h3>
              </div>
              ${etiquetaStatus(p.status)}
            </header>
            ${c && c.resumo ? `<p class="ficha-resumo">${esc(c.resumo)}</p>` : ''}
            <pre class="ficha-corpo">${esc(corpo || 'Sem corpo de roteiro registrado.')}</pre>
            <div class="ficha-meta">
              <span>${icone('clock')} Atualizado ${horaRelativa(p.atualizadoEm)}</span>
              <span>${icone('file')} Versão ${c ? c.versao : 1}</span>
              <span>${icone('users')} Origem: ${esc(c ? c.origem : 'manual')}</span>
            </div>
            ${etapasIndicador(p)}
            ${(() => {
              const pv = p.previa ? (estado.dados.previas || {})[p.previa] : null;
              // o objeto da prévia é buscado pelo id do conteúdo, não pelo id da prévia
              return pv ? `<div class="video-destaque">
                <video controls preload="metadata" src="/${esc(pv.arquivo)}#t=0.5" poster="/${esc(pv.thumb || '')}"></video>
                <div class="video-destaque-info">
                  <b>${esc(pv.w)}×${esc(pv.h)} · ${esc(pv.duracaoSegundos)}s · v${esc(pv.versao)}</b>
                  <span>${esc(pv.voz)}</span>
                  <div class="chips" style="margin-top:6px">
                    <a class="btn btn-primario btn-sm" href="/${esc(pv.arquivo)}" download>${icone('save')} Baixar MP4</a>
                    <button class="btn btn-fantasma btn-sm" data-versoes="${esc(p.previa)}">Versões anteriores</button>
                  </div>
                </div>
              </div>` : '';
            })()}
            <div class="ficha-acoes">
              <button class="btn btn-primario" data-preview="${esc(p.id)}">
                ${icone('play')} Visualizar publicação final
              </button>
              <button class="btn btn-ok" data-decidir="aprovar" data-id="${esc(p.id)}">
                ${icone('check')} Aprovar
              </button>
              <button class="btn btn-aviso" data-decidir="ajustes" data-id="${esc(p.id)}">
                ${icone('undo')} Solicitar ajustes
              </button>
              <button class="btn btn-erro" data-decidir="rejeitar" data-id="${esc(p.id)}">
                ${icone('x')} Rejeitar
              </button>
              <button class="btn btn-fantasma" data-detalhe="${esc(p.id)}">Detalhes</button>
            </div>
          </article>`;
        }).join('')}
      </div>`;
  }

  /* ---------- Biblioteca ---------- */

  function renderBiblioteca(d) {
    const lista = d.conteudosDetalhe || [];
    const filtrada = lista.filter((c) => {
      if (estado.filtroCanal !== 'todos' && c.canalId !== estado.filtroCanal) return false;
      if (estado.filtroStatus !== 'todos' && c.status !== estado.filtroStatus) return false;
      if (estado.busca) {
        const alvo = (c.titulo + ' ' + (c.resumo || '') + ' ' + (c.corpo || '')).toLowerCase();
        if (!alvo.includes(estado.busca.toLowerCase())) return false;
      }
      return true;
    });

    const opcoesCanal = ['todos'].concat(d.canais.map((c) => c.id));
    const statusDisponiveis = ['todos'].concat(Object.keys(ROTULOS_STATUS));

    return `
      <div class="barra-filtros secao">
        <div class="campo-busca">
          ${icone('search')}
          <input id="busca" type="search" placeholder="Buscar por título ou roteiro…" value="${esc(estado.busca)}" />
        </div>
        <select id="filtro-canal">
          ${opcoesCanal.map((id) => `<option value="${esc(id)}" ${estado.filtroCanal === id ? 'selected' : ''}>
            ${id === 'todos' ? 'Todos os canais' : esc(canal(id).nome)}</option>`).join('')}
        </select>
        <select id="filtro-status">
          ${statusDisponiveis.map((s) => `<option value="${esc(s)}" ${estado.filtroStatus === s ? 'selected' : ''}>
            ${s === 'todos' ? 'Todos os status' : esc(ROTULOS_STATUS[s])}</option>`).join('')}
        </select>
        <span class="dica">${filtrada.length} de ${lista.length}</span>
      </div>

      ${filtrada.length === 0 ? `
        <div class="estado-vazio">
          ${icone('library')}
          <strong>Nenhum conteúdo encontrado</strong>
          <p>Ajuste os filtros ou registre um conteúdo novo. Conteúdos só entram na biblioteca
          quando existem de fato no banco — nada é inventado pelo painel.</p>
        </div>` : `
        <div class="grade grade-2">
          ${filtrada.map((c) => `
            <div class="item-bib" style="--canal-cor:${esc(canal(c.canalId).cor)}">
              <div class="item-bib-topo">
                <div>
                  <div class="ficha-canal">${esc(canal(c.canalId).nome)} · ${esc(c.tipo)}</div>
                  <h4>${esc(c.titulo)}</h4>
                </div>
                ${etiquetaStatus(c.status)}
              </div>
              <p class="item-bib-resumo">${esc(c.resumo || c.corpo || '').slice(0, 170)}${(c.resumo || c.corpo || '').length > 170 ? '…' : ''}</p>
              <div class="ficha-meta">
                <span>${icone('clock')} ${fmtDataHora(c.atualizadoEm)}</span>
                <span>${icone('file')} v${c.versao || 1}</span>
              </div>
              <div class="ficha-acoes">
                <button class="btn btn-fantasma" data-detalhe="${esc(c.id)}">Abrir</button>
                ${c.status === 'aprovacao'
                  ? `<button class="btn btn-ok btn-sm" data-decidir="aprovar" data-id="${esc(c.id)}">${icone('check')} Aprovar</button>
                     <button class="btn btn-aviso btn-sm" data-decidir="ajustes" data-id="${esc(c.id)}">${icone('undo')} Ajustes</button>
                     <button class="btn btn-erro btn-sm" data-decidir="rejeitar" data-id="${esc(c.id)}">${icone('x')} Rejeitar</button>`
                  : ''}
                ${c.status === 'ajuste'
                  ? `<button class="btn btn-primario btn-sm" data-reenviar="${esc(c.id)}">${icone('send')} Reenviar para aprovação</button>`
                  : ''}
              </div>
            </div>`).join('')}
        </div>`}

      <div class="card secao" style="margin-top:18px">
        <div class="secao-titulo"><h2>Registrar conteúdo manualmente</h2>
          <span class="dica">estrutura pronta para os agentes usarem a mesma API</span></div>
        <form id="form-conteudo" class="form-grade">
          <label>Canal
            <select name="canalId" required>
              ${d.canais.map((c) => `<option value="${esc(c.id)}">${esc(c.nome)}</option>`).join('')}
            </select>
          </label>
          <label>Tipo
            <select name="tipo">
              <option value="roteiro">Roteiro</option>
              <option value="video">Vídeo</option>
              <option value="pauta">Pauta</option>
              <option value="legenda">Legenda</option>
            </select>
          </label>
          <label class="campo-largo">Título
            <input name="titulo" required maxlength="160" placeholder="Título do conteúdo" />
          </label>
          <label class="campo-largo">Roteiro ou descrição
            <textarea name="corpo" rows="4" placeholder="Gancho, corpo, virada e CTA…"></textarea>
          </label>
          <div class="campo-largo">
            <button class="btn btn-primario" type="submit">${icone('plus')} Registrar na biblioteca</button>
          </div>
        </form>
      </div>`;
  }

  /* ---------- Canais ---------- */

  function renderCanais(d) {
    const i = d.indicadores;
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return `
      <div class="grade grade-3 secao">
        ${d.canais.map((c) => {
          const st = i.porCanal.find((x) => x.canalId === c.id);
          return `
            <div class="canal-card" style="--canal-cor:${esc(c.cor)};--canal-suave:${esc(c.corSuave)}">
              <div class="canal-topo">
                <div class="canal-avatar">${icone(c.icone)}</div>
                <div>
                  <div class="canal-nome">${esc(c.nome)}</div>
                  <div class="canal-tema">${esc(c.tema)}</div>
                </div>
              </div>
              <div class="canal-stats">
                <div class="canal-stat"><b>${c.metaSemanal}</b><span>meta/sem</span></div>
                <div class="canal-stat"><b>${st.comConteudo}/${st.slotsNaSemana}</b><span>slots</span></div>
                <div class="canal-stat"><b>${st.totalConteudos}</b><span>conteúdos</span></div>
              </div>
              <div class="linha-info"><span>Público-alvo</span></div>
              <p style="margin:0 0 12px;font-size:12.5px;color:var(--texto-2);line-height:1.5">${esc(c.publico)}</p>
              <div class="linha-info"><span>Horários semanais</span><b>${c.slots.map((s) => `${dias[s.dia]} ${s.hora}`).join(' · ')}</b></div>
              <div class="linha-info"><span>Plataformas</span><b>${c.plataformas.length} (Shorts, Reels, TikTok)</b></div>
              <div style="margin-top:12px">
                <div class="linha-info" style="margin-bottom:6px"><span>Ângulos de monetização</span></div>
                <div class="chips">${c.monetizacao.map((m) => `<span class="chip moeda">${esc(m)}</span>`).join('')}</div>
              </div>
            </div>`;
        }).join('')}
      </div>
      <div class="aviso neutro">
        <span>${icone('info')}</span>
        <div>Os três canais publicam nas mesmas três plataformas. O formato vertical 9:16 é único para
        Shorts, Reels e TikTok — o mesmo vídeo é adaptado em título, legenda e hashtags por plataforma.</div>
      </div>
    `;
  }

  /* ---------- Calendário ---------- */

  function renderCalendario(d) {
    const sem = d.semana;
    const hoje = hojeISO();
    const porDia = sem.dias.map((dia) => ({
      ...dia,
      slots: sem.slots.filter((s) => s.data === dia.iso),
    }));

    const celulas = porDia.map((dia) => `
      <div class="cal-dia ${dia.iso === hoje ? 'hoje' : ''}">
        <div class="cal-dia-cabecalho">
          <b>${esc(dia.diaSemana)}</b><span>${fmtData(dia.iso)}</span>
        </div>
        <div class="cal-dia-corpo">
          ${dia.slots.length === 0
            ? '<div class="cal-vazio">Sem slot programado</div>'
            : dia.slots.map((s) => `
              <div class="slot ${s.status === 'vazio' ? 'vazio' : ''}" style="--slot-cor:${esc(s.canalCor)}"
                   title="${esc(s.canalNome)} · ${esc(s.hora)} · ${esc(s.status)}">
                <div class="slot-hora"><b>${esc(s.hora)}</b></div>
                <div class="slot-canal">${esc(s.canalNome)}</div>
                <div class="slot-status">
                  <span class="ponto" style="background:${s.status === 'vazio' ? 'var(--texto-3)' : esc(s.canalCor)}"></span>
                  ${s.conteudoId ? esc(s.titulo || 'conteúdo registrado') : 'Aguardando produção'}
                </div>
              </div>`).join('')}
        </div>
      </div>`).join('');

    const legenda = d.canais.map((c) => `<span><i style="background:${esc(c.cor)}"></i>${esc(c.nome)}</span>`).join('');

    return `
      <div class="card secao">
        <div class="cal-topo">
          <div class="cal-navegacao">
            <button class="botao-icone" id="semana-anterior" title="Semana anterior">${icone('chevronLeft')}</button>
            <div class="cal-periodo">${fmtData(sem.inicioSemana)} — ${fmtData(sem.fimSemana)}</div>
            <button class="botao-icone" id="semana-proxima" title="Próxima semana">${icone('chevronRight')}</button>
            <button class="botao-icone" id="semana-atual" title="Semana atual">${icone('refresh')}</button>
          </div>
          <div class="chips">
            <span class="chip">${sem.slots.length} slots na semana</span>
            <span class="chip">${d.indicadores.slotsPreenchidos} com conteúdo</span>
          </div>
        </div>
        <div class="cal-grade">${celulas}</div>
        <div class="legenda">${legenda}
          <span><i style="background:transparent;border:1px dashed var(--borda-forte)"></i>Slot aguardando produção</span>
        </div>
      </div>
      <div class="aviso">
        <span>${icone('alert')}</span>
        <div>Os nove slots são <b>vagas planejadas</b> do calendário editorial — não vídeos produzidos.
        Enquanto não houver conteúdo real vinculado a um slot, ele aparece como “aguardando produção”.</div>
      </div>
    `;
  }

  function mudarSemana(dias) {
    const base = new Date(estado.semanaRef + 'T12:00:00');
    base.setDate(base.getDate() + dias);
    const iso = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
    carregar(iso);
  }

  /* ---------- Produção ---------- */

  function renderProducao(d) {
    const etapas = [
      { id: 'aprovacao', label: 'Aguardando aprovação', agente: 'A6' },
      { id: 'ajuste', label: 'Em ajuste', agente: 'A3' },
      { id: 'aprovado', label: 'Aprovado', agente: 'A6' },
      { id: 'aprovado_final', label: 'Aprovado (final)', agente: 'A6' },
      { id: 'rejeitado', label: 'Rejeitado', agente: '—' },
      { id: 'publicado', label: 'Publicado', agente: 'A6' },
    ];
    const conteudos = d.conteudosDetalhe || [];
    const colunas = etapas.map((e) => {
      const itens = conteudos.filter((c) => c.status === e.id);
      return `
        <div class="coluna">
          <div class="coluna-topo"><b>${e.label}</b><span class="contagem">${itens.length}</span></div>
          <div class="coluna-corpo">
            ${itens.length === 0
              ? `<div class="coluna-vazia">Nenhum conteúdo nesta etapa<br><span style="opacity:.7">Responsável: ${e.agente}</span></div>`
              : itens.map((c) => `
                  <button class="slot slot-clicavel" data-detalhe="${esc(c.id)}" style="--slot-cor:${esc(canal(c.canalId).cor)}">
                    <div class="slot-canal">${esc(c.titulo)}</div>
                    <div class="slot-status"><span class="ponto" style="background:${esc(canal(c.canalId).cor)}"></span>${esc(canal(c.canalId).nome)}</div>
                  </button>`).join('')}
          </div>
        </div>`;
    }).join('');

    return `
      <div class="secao">
        <div class="secao-titulo"><h2>Fluxo de produção</h2>
          <span class="dica">Pauta → Roteiro → Produção → Edição → Aprovação → Publicado</span></div>
        <div class="kanban">${colunas}</div>
      </div>

      <div class="grade grade-4 secao">
        ${d.canais.map((c) => {
          const st = d.indicadores.porCanal.find((x) => x.canalId === c.id);
          return `
            <div class="card">
              <div class="kpi-rotulo"><i style="width:8px;height:8px;border-radius:3px;background:${esc(c.cor)}"></i>${esc(c.nome)}</div>
              <div class="kpi-valor" style="font-size:22px">${st.totalConteudos}<small>conteúdos</small></div>
              <div class="kpi-nota">${st.aguardandoAprovacao} aguardando aprovação</div>
            </div>`;
        }).join('')}
        <div class="card">
          <div class="kpi-rotulo">${icone('check')} Prontos para publicar</div>
          <div class="kpi-valor" style="font-size:22px">${d.indicadores.prontosParaPublicar || 0}</div>
          <div class="kpi-nota">publicação bloqueada nesta etapa</div>
        </div>
      </div>

      <div class="aviso neutro">
        <span>${icone('info')}</span>
        <div>A1, A2 e A3 já registram pauta, avaliação e roteiro pela API. A4, A5 e A6 ainda são
        apenas especificação, sem código. Todo item exibido aqui foi registrado de fato no banco —
        pela direção ou pelos agentes, sempre com aprovação humana obrigatória.</div>
      </div>
    `;
  }

  /* ---------- Agentes ---------- */

  function renderAgentes(d) {
    return `
      <div class="grade grade-3 secao">
        ${d.agentes.map((a) => `
          <div class="agente">
            <div class="agente-topo">
              <div class="agente-avatar">${icone(a.icone)}</div>
              <div>
                <div class="agente-codigo">${esc(a.codigo)} · ${esc(a.frequencia)}</div>
                <div class="agente-nome">${esc(a.nome)}</div>
              </div>
            </div>
            <div class="agente-desc">${esc(a.descricao)}</div>
            <div class="agente-meta">
              <div><b>Entrada:</b> ${esc(a.entrada)}</div>
              <div><b>Saída:</b> ${esc(a.saida)}</div>
              <div><b>Custo previsto:</b> ${esc(a.custo)}</div>
            </div>
            <span class="etiqueta ${esc(a.status)}">${rotuloStatusAgente(a.status)}</span>
          </div>`).join('')}
      </div>
      <div class="aviso">
        <span>${icone('alert')}</span>
        <div><b>A1, A2 e A3 têm console próprio</b> (abaixo): você preenche os formulários,
        pede um rascunho ao agente quando houver provedor de IA configurado no servidor e registra
        o resultado — que passa pelas mesmas validações da API. <b>A4, A5 e A6 são apenas especificação</b>,
        sem código. A aprovação humana continua obrigatória:
        <code>POST /api/conteudos/:id/decisao</code> registra a sua decisão e nada é publicado sem ela.</div>
      </div>
    `;
  }

  /* ---------- Pendentes ---------- */


  /* ---------- Pautas dos agentes ---------- */

  function rotuloVeredito(v) {
    return {
      aprovavel: 'Verificação: sem impedimento factual',
      corrigir_antes: 'Verificação: corrigir antes do roteiro',
      nao_recomendada: 'Verificação: não recomendada',
    }[v] || v;
  }

  function barraPotencial(pot) {
    if (!pot) return '';
    const fator = (rotulo, v) => `
      <div class="pot-linha">
        <span>${rotulo}</span>
        <div class="pot-barra"><i style="width:${Math.round((Number(v) / 10) * 100)}%"></i></div>
        <b>${esc(v)}</b>
      </div>`;
    return `
      <div class="pot">
        <div class="pot-nota">
          <b>${esc(pot.nota)}</b><span>/100 potencial</span>
        </div>
        <div class="pot-fatores">
          ${fator('Originalidade', pot.originalidade)}
          ${fator('Engajamento', pot.engajamento)}
          ${fator('Monetização', pot.monetizacao)}
        </div>
      </div>`;
  }

  function blocoFontes(fontes) {
    if (!fontes || !fontes.length) {
      return '<span class="fonte-vazia">Sem fonte registrada</span>';
    }
    return `<ul class="fontes">${fontes.map((f) => `
      <li>
        <a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">${esc(f.titulo || f.dominio || f.url)}</a>
        <span class="fonte-dominio">${esc(f.dominio || '')} · ${esc(f.tipo || '')}</span>
        ${f.papel ? `<span class="fonte-papel">${esc(f.papel)}</span>` : ''}
      </li>`).join('')}</ul>`;
  }

  function renderPautas(d) {
    const pautas = (d.conteudosDetalhe || []).filter((c) => c.tipo === 'pauta');
    if (!pautas.length) {
      return `
        <div class="estado-vazio">
          ${icone('search')}
          <strong>Nenhuma pauta registrada ainda</strong>
          <p>As pautas aparecem aqui assim que o A1 (Pesquisador de Tendências) executar uma rodada
          e registrar o resultado na Sala de Direção. Cada pauta traz título, resumo, público-alvo,
          potencial, monetização e fontes verificáveis.</p>
        </div>
        ${regrasAgentesCard(d)}`;
    }

    const aprovadas = pautas.filter((p) => p.status === 'pauta_aprovada').length;
    const aguardando = pautas.filter((p) => p.status === 'aprovacao').length;

    return `
      <div class="grade grade-4 secao">
        <div class="card kpi">
          <div class="kpi-rotulo">${icone('search')} Pautas no total</div>
          <div class="kpi-valor">${pautas.length}</div>
          <div class="kpi-nota">propostas pelos agentes</div>
        </div>
        <div class="card kpi">
          <div class="kpi-rotulo">${icone('clock')} Aguardando decisão</div>
          <div class="kpi-valor">${aguardando}</div>
          <div class="kpi-nota">aprove na Sala de Direção</div>
        </div>
        <div class="card kpi">
          <div class="kpi-rotulo">${icone('check')} Aprovadas</div>
          <div class="kpi-valor">${aprovadas}</div>
          <div class="kpi-nota">liberadas para o A3</div>
        </div>
        <div class="card kpi">
          <div class="kpi-rotulo">${icone('wallet')} Créditos em agentes</div>
          <div class="kpi-valor">${d.indicadores.creditosConsumidosAgentes || 0}</div>
          <div class="kpi-nota">somatório das execuções</div>
        </div>
      </div>

      <div class="grade grade-2 secao">
        ${pautas.map((p) => {
          const cn = canal(p.canalId);
          return `
          <article class="ficha" style="--canal-cor:${esc(cn.cor)}">
            <header class="ficha-topo">
              <div>
                <div class="ficha-canal">${esc(cn.nome)} · pauta ${esc((p.origem || '').toUpperCase())}</div>
                <h3>${esc(p.titulo)}</h3>
              </div>
              ${etiquetaStatus(p.status)}
            </header>
            ${p.avaliacao ? `
              <div class="a2-selo ${esc(p.avaliacao.veredito)}">
                <div class="a2-nota"><b>${esc(p.avaliacao.notaFinal)}</b><span>nota A2</span></div>
                <div class="a2-texto">
                  <b>${esc(rotuloVeredito(p.avaliacao.veredito))}</b>
                  ${p.avaliacao.prioridade ? '<span class="chip prioridade">prioridade sugerida</span>' : ''}
                  <span class="a2-verificacao">${esc(p.avaliacao.verificacao)}</span>
                  ${p.avaliacao.alertas && p.avaliacao.alertas.length ? `
                    <ul class="a2-alertas">
                      ${p.avaliacao.alertas.map((a) => `<li>${icone('alert')} ${esc(a)}</li>`).join('')}
                    </ul>` : ''}
                  ${p.avaliacao.tituloSugerido ? `<div class="a2-titulo">Título sugerido pelo A2: <b>${esc(p.avaliacao.tituloSugerido)}</b></div>` : ''}
                </div>
              </div>` : ''}
            ${barraPotencial(p.potencial)}
            <p class="ficha-resumo">${esc(p.resumo)}</p>
            <div class="pauta-campos">
              <div><b>Público-alvo</b><span>${esc(p.publicoAlvo || '—')}</span></div>
              <div><b>Monetização</b><span>${esc(p.monetizacao || '—')}</span></div>
              ${p.justificativa ? `<div><b>Por que agora</b><span>${esc(p.justificativa)}</span></div>` : ''}
            </div>
            ${p.tituloAnterior ? `<div class="titulo-anterior">Título anterior: <s>${esc(p.tituloAnterior)}</s></div>` : ''}
            <div class="pauta-fontes">
              <b>Fontes verificáveis${p.revisaoFinal ? ' (verificadas)' : ''}</b>
              ${blocoFontes(p.fontes)}
            </div>
            ${p.verificacaoFinal ? `
              <div class="verificacao-final">
                <b>Verificação final</b>
                <span>${esc(p.verificacaoFinal)}</span>
              </div>` : ''}
            ${p.trechosFonte && p.trechosFonte.length ? `
              <div class="pauta-trechos">
                <b>Trechos originais das fontes</b>
                ${p.trechosFonte.map((t) => `
                  <blockquote>
                    <p>“${esc(t.trecho)}”</p>
                    <footer>
                      <a href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">${esc((t.url || '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</a>
                      <span>${esc(t.sustenta)}</span>
                    </footer>
                  </blockquote>`).join('')}
              </div>` : ''}
            ${p.correcoes && p.correcoes.length ? `
              <div class="pauta-correcoes">
                <b>Correções aplicadas na revisão final</b>
                <ul>${p.correcoes.map((c) => `<li>${icone('check')} ${esc(c)}</li>`).join('')}</ul>
              </div>` : ''}
            ${p.ressalvaSaude ? `
              <div class="aviso" style="margin-top:12px">
                <span>${icone('alert')}</span><div><b>Ressalva de saúde:</b> ${esc(p.ressalvaSaude)}</div>
              </div>` : ''}
            <div class="ficha-acoes">
              <button class="btn btn-fantasma" data-detalhe="${esc(p.id)}">Abrir</button>
              ${p.status === 'aprovacao'
                ? `<button class="btn btn-ok btn-sm" data-decidir="aprovar" data-id="${esc(p.id)}">${icone('check')} Aprovar pauta</button>
                   <button class="btn btn-aviso btn-sm" data-decidir="ajustes" data-id="${esc(p.id)}">${icone('undo')} Ajustes</button>
                   <button class="btn btn-erro btn-sm" data-decidir="rejeitar" data-id="${esc(p.id)}">${icone('x')} Rejeitar</button>`
                : ''}
            </div>
          </article>`;
        }).join('')}
      </div>
      ${calendarioA2Card(d)}
      ${regrasAgentesCard(d)}`;
  }

  function calendarioA2Card(d) {
    const todos = d.calendariosPropostos || [];
    if (!todos.length) return '';
    // exibe apenas a proposta mais recente do A2 (as anteriores ficam no histórico)
    const planos = [todos[todos.length - 1]];
    return planos.map((plano) => `
      <div class="card secao">
        <div class="secao-titulo"><h2>Calendário editorial proposto pelo A2</h2>
          <span class="dica">${esc(plano.observacao || '')}</span></div>
        <div class="aviso">
          <span>${icone('alert')}</span>
          <div>Esta é uma <b>proposta</b>, não um calendário aprovado. Os slots só passam a valer depois
          que você aprovar as pautas na Sala de Direção.</div>
        </div>
        ${plano.semanas.map((sem) => `
          <div class="semana-bloco">
            <div class="semana-titulo"><b>${esc(sem.semana)}</b><span>${esc(sem.foco)}</span></div>
            <table class="tabela">
              <thead><tr><th>Dia</th><th>Hora</th><th>Canal</th><th>Pauta proposta</th></tr></thead>
              <tbody>
                ${sem.slots.map((sl) => `
                  <tr>
                    <td>${esc(sl.dia)}</td>
                    <td><b>${esc(sl.hora)}</b></td>
                    <td><span style="display:inline-flex;align-items:center;gap:6px">
                      <i style="width:7px;height:7px;border-radius:50%;background:${esc(canal(sl.canalId).cor)}"></i>
                      ${esc(canal(sl.canalId).nome)}</span></td>
                    <td>${esc(sl.titulo)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>`).join('')}
      </div>`).join('');
  }


  /* ---------- Vozes / Narradores ---------- */

  function renderVozes(d) {
    const v = d.vozes || { canais: {}, amostras: [] };
    const amostras = v.amostras || [];
    if (!amostras.length) {
      return `<div class="estado-vazio">${icone('mic')}
        <strong>Nenhuma amostra de voz registrada</strong>
        <p>Gere as amostras com o sistema de narração e elas aparecem aqui.</p></div>`;
    }

    const canais = d.canais.map((c) => {
      const cfg = (v.canais || {})[c.id] || {};
      const doCanal = amostras.filter((a) => a.canalId === c.id);
      const p = cfg.parametros || {};
      return `
        <div class="canal-card" style="--canal-cor:${esc(c.cor)};--canal-suave:${esc(c.corSuave)}">
          <div class="canal-topo">
            <div class="canal-avatar">${icone('mic')}</div>
            <div>
              <div class="canal-nome">${esc(c.nome)}</div>
              <div class="canal-tema">${esc(cfg.descricao || '')}</div>
            </div>
          </div>

          <div class="voz-player-lista">
            ${doCanal.map((a) => `
              <div class="voz-item ${a.provisoria ? 'provisoria' : ''}">
                <div class="voz-item-topo">
                  <b>${esc(a.voz)}</b>
                  ${a.provisoria ? '<span class="chip moeda">provisória</span>' : '<span class="chip">candidata</span>'}
                </div>
                <audio controls preload="none" src="/${esc(a.arquivo)}"></audio>
                <div class="voz-item-meta">
                  <span>${esc(a.motor)} · ${esc(a.duracaoSegundos)}s</span>
                  <span>${esc(a.licenca)}</span>
                </div>
              </div>`).join('')}
            ${doCanal.length === 0 ? '<div class="coluna-vazia">Nenhuma amostra ainda para este canal</div>' : ''}
          </div>

          <div class="voz-parametros">
            <div class="linha-info"><span>Velocidade (lengthScale)</span><b>${p.lengthScale != null ? p.lengthScale : '—'}</b></div>
            <div class="linha-info"><span>Variação (noiseScale)</span><b>${p.noiseScale != null ? p.noiseScale : '—'}</b></div>
            <div class="linha-info"><span>Expressividade (noiseW)</span><b>${p.noiseW != null ? p.noiseW : '—'}</b></div>
            <div class="linha-info"><span>Pausa entre frases (s)</span><b>${p.sentenceSilence != null ? p.sentenceSilence : '—'}</b></div>
          </div>
          ${cfg.pendencia ? `<div class="aviso" style="margin-top:12px"><span>${icone('alert')}</span><div>${esc(cfg.pendencia)}</div></div>` : ''}
        </div>`;
    }).join('');

    return `
      <div class="aviso neutro secao">
        <span>${icone('info')}</span>
        <div><b>Nenhuma voz é definitiva.</b> As amostras abaixo são candidatas em avaliação.
        A escolha final é sua — depois dela, cada canal passa a usar uma voz fixa com os parâmetros ao lado.</div>
      </div>

      <div class="grade grade-3 secao">${canais}</div>

      <div class="card secao">
        <div class="secao-titulo"><h2>Player comparativo</h2>
          <span class="dica">${amostras.length} amostras · todas normalizadas em -16 LUFS</span></div>
        <table class="tabela">
          <thead><tr><th>Canal</th><th>Voz</th><th>Motor</th><th>Duração</th><th>Licença</th><th>Ouvir</th></tr></thead>
          <tbody>
            ${amostras.map((a) => `
              <tr>
                <td><b>${esc(canal(a.canalId).nome)}</b></td>
                <td>${esc(a.voz)} ${a.provisoria ? '<span class="chip moeda">provisória</span>' : ''}</td>
                <td>${esc(a.motor)}</td>
                <td>${esc(a.duracaoSegundos)}s</td>
                <td style="max-width:240px;color:var(--texto-2);font-size:11.5px">${esc(a.licenca)}</td>
                <td><audio controls preload="none" src="/${esc(a.arquivo)}" style="height:32px;width:220px"></audio></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }


  /* ---------- Estúdio de Artes ---------- */

  function renderEstudio(d) {
    const e = d.estudio || {};
    const ident = (e.identidade || {}).canais || {};
    const estudio = e.estudio || {};
    const formatos = estudio.formatos || [];

    return `
      <div class="aviso neutro secao">
        <span>${icone('info')}</span>
        <div><b>Módulo em estrutura.</b> Os formatos e a identidade visual estão definidos.
        As peças (cards, carrosséis, capas) serão geradas localmente com Pillow e FFmpeg — sem serviço externo.</div>
      </div>

      <div class="secao">
        <div class="secao-titulo"><h2>Identidade visual por canal</h2>
          <span class="dica">${Object.keys(ident).length} canais</span></div>
        <div class="grade grade-3">
          ${d.canais.map((c) => {
            const id = ident[c.id] || {};
            return `
              <div class="canal-card" style="--canal-cor:${esc(id.cor || c.cor)};--canal-suave:${esc(c.corSuave)}">
                <div class="canal-topo">
                  <div class="canal-avatar" style="background:${esc(id.cor || c.cor)}22;color:${esc(id.cor || c.cor)}">${icone(c.icone)}</div>
                  <div>
                    <div class="canal-nome">${esc(c.nome)}</div>
                    <div class="canal-tema">${esc(id.tom || '')}</div>
                  </div>
                </div>
                <div class="paleta">
                  <span style="background:${esc(id.cor || c.cor)}"></span>
                  <span style="background:${esc(id.corSecundaria || c.cor)}"></span>
                  <span style="background:${esc(id.fundo || '#0B0E14')}"></span>
                </div>
                <div class="linha-info"><span>Tipografia</span><b>${esc(id.tipografia || '—')}</b></div>
                <div class="linha-info"><span>Elementos</span><b>${esc((id.elementos || []).length)}</b></div>
                <div class="chips" style="margin-top:8px">
                  ${(id.elementos || []).map((x) => `<span class="chip">${esc(x)}</span>`).join('')}
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card secao">
        <div class="secao-titulo"><h2>Formatos suportados</h2>
          <span class="dica">${formatos.length} formatos</span></div>
        <table class="tabela">
          <thead><tr><th>Formato</th><th>Dimensão</th><th>Uso</th><th>Preview</th></tr></thead>
          <tbody>
            ${formatos.map((f) => `
              <tr>
                <td><b>${esc(f.nome)}</b></td>
                <td>${esc(f.w)} × ${esc(f.h)}</td>
                <td style="color:var(--texto-2);font-size:11.5px">${esc(f.uso)}</td>
                <td><div class="formato-preview" style="aspect-ratio:${f.w}/${f.h}"></div></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="card secao">
        <div class="secao-titulo"><h2>Auditoria</h2>
          <span class="dica">documentação e código para avaliação externa</span></div>
        <div class="grade grade-2" style="margin-bottom:18px">
          <a class="btn btn-primario" href="/downloads/relatorio-tecnico.md" download>
            ${icone('file')} Baixar relatório técnico
          </a>
          <a class="btn btn-primario" href="/downloads/auditoria-agencia-ia.zip" download>
            ${icone('save')} Baixar ZIP de auditoria
          </a>
        </div>
        <div class="grade grade-4" style="margin-bottom:18px">
          <div class="mini-stat ok"><b>5</b><span>funcionais</span></div>
          <div class="mini-stat aviso"><b>6</b><span>parciais</span></div>
          <div class="mini-stat"><b>1</b><span>simulada</span></div>
          <div class="mini-stat erro"><b>2</b><span>não implementadas</span></div>
        </div>
        <div class="aviso neutro" style="margin-bottom:18px">
          <span>${icone('info')}</span>
          <div><b>Pendências críticas (P1):</b> agendamento automático, conexão com APIs das redes e
          operação com o computador desligado. Nenhuma delas existe hoje.</div>
        </div>
      </div>

      <div class="card secao">
        <div class="secao-titulo"><h2>Peças geradas</h2><span class="dica">${(estudio.pecas || []).length} peças</span></div>
        ${(estudio.pecas || []).length === 0 ? `
          <div class="estado-vazio">
            ${icone('layers')}
            <strong>Nenhuma peça gerada ainda</strong>
            <p>O estúdio está pronto para gerar. Quando você autorizar, as peças aparecem aqui
            com preview e opção de download.</p>
          </div>` : `
          <div class="grade grade-3">
            ${(estudio.pecas || []).map((pc) => `
              <div class="peca" style="--canal-cor:${esc(pc.cor)}">
                <a href="/${esc(pc.arquivo)}" target="_blank" rel="noopener">
                  <img src="/${esc(pc.arquivo)}" alt="${esc(pc.titulo)}" loading="lazy" />
                </a>
                <div class="peca-info">
                  <div class="ficha-canal">${esc(pc.canal)} · ${esc(pc.w)}×${esc(pc.h)}</div>
                  <b>${esc(pc.titulo)}</b>
                  <div class="chips" style="margin-top:6px">
                    <span class="chip">${esc(pc.formato)}</span>
                    <span class="etiqueta st-aprovacao">Aguardando aprovação</span>
                  </div>
                  <div class="peca-nota">${esc(pc.nota || '')}</div>
                  <div class="ficha-acoes">
                    <a class="btn btn-fantasma btn-sm" href="/${esc(pc.arquivo)}" download>Baixar PNG</a>
                    <button class="btn btn-aviso btn-sm" data-ajuste-arte="${esc(pc.id)}">Pedir ajuste</button>
                  </div>
                </div>
              </div>`).join('')}
          </div>`}
      </div>`;
  }

  /* ---------- Central de Publicações ---------- */

  function renderPublicacoes(d) {
    const c = (d.estudio || {}).central || {};
    const plataformas = c.plataformas || [];
    const fluxo = c.fluxo || [];
    const rotuloEtapa = {
      pesquisa: 'Pesquisa', producao: 'Produção', revisao: 'Revisão',
      aprovacao_humana: 'Aprovação humana', agendamento: 'Agendamento',
      publicacao: 'Publicação', relatorio: 'Relatório',
    };

    return `
      <div class="aviso">
        <span>${icone('lock')}</span>
        <div><b>Modo simulação.</b> Nenhuma conta está conectada e a publicação real está desligada.
        Todo o fluxo abaixo roda com dados simulados, para você validar antes de conectar as contas oficiais.</div>
      </div>

      <div class="secao" style="margin-top:20px">
        <div class="secao-titulo"><h2>Fluxo obrigatório</h2>
          <span class="dica">${fluxo.length} etapas</span></div>
        <div class="fluxo-linha">
          ${fluxo.map((f, i) => `
            <div class="fluxo-etapa ${f === 'aprovacao_humana' ? 'destaque' : ''}">
              <span class="fluxo-num">${i + 1}</span>
              <b>${esc(rotuloEtapa[f] || f)}</b>
            </div>`).join('<span class="fluxo-seta">→</span>')}
        </div>
        <div class="grade grade-3" style="margin-top:14px">
          <div class="mini-stat ok"><b>${c.travas && c.travas.aprovacaoObrigatoria ? 'ON' : 'OFF'}</b><span>aprovação obrigatória</span></div>
          <div class="mini-stat"><b>${c.travas && c.travas.bloqueioSemConexao ? 'ON' : 'OFF'}</b><span>bloqueio sem conexão</span></div>
          <div class="mini-stat erro"><b>${c.publicacaoReal ? 'ON' : 'OFF'}</b><span>publicação real</span></div>
        </div>
      </div>

      <div class="card secao">
        <div class="secao-titulo"><h2>Plataformas</h2>
          <span class="dica">${plataformas.filter((p) => p.conectado).length} conectadas de ${plataformas.length}</span></div>
        <table class="tabela">
          <thead><tr><th>Plataforma</th><th>API oficial</th><th>Formatos</th><th>Estado</th></tr></thead>
          <tbody>
            ${plataformas.map((p) => `
              <tr>
                <td><b>${esc(p.nome)}</b></td>
                <td style="color:var(--texto-2);font-size:11.5px">${esc(p.api)}</td>
                <td style="color:var(--texto-2);font-size:11.5px">${esc((p.formatos || []).join(', '))}</td>
                <td><span class="etiqueta ${p.conectado ? 'st-aprovado' : 'pendente'}">
                  ${p.conectado ? 'Conectada' : 'Não conectada'}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="card secao">
        <div class="secao-titulo"><h2>Simulação por plataforma</h2>
          <span class="dica">resultado fictício, para validação do fluxo</span></div>
        <table class="tabela">
          <thead><tr><th>Plataforma</th><th>Formato</th><th>Legenda adaptada</th><th>Resultado simulado</th></tr></thead>
          <tbody>
            ${plataformas.map((p) => {
              const fmt = (p.formatos || [])[0] || '—';
              const legenda = {
                instagram: 'Legenda com quebras de linha + 5 hashtags no fim',
                facebook: 'Texto mais longo, link no corpo, sem hashtags',
                tiktok: 'Legenda curta (até 150 caracteres) + 3 hashtags',
                youtube: 'Título até 100 caracteres + descrição com fontes',
                whatsapp: 'Mensagem com link, sem hashtags, tom direto',
              }[p.id] || '—';
              return `
                <tr>
                  <td><b>${esc(p.nome)}</b></td>
                  <td>${esc(fmt)}</td>
                  <td style="color:var(--texto-2);font-size:11.5px">${esc(legenda)}</td>
                  <td><span class="etiqueta pendente">Simulado — não enviado</span></td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }


  /* ---------- Gestão de Produtos ---------- */

  function renderProdutos(d) {
    const pr = d.produtos || { itens: [] };
    const itens = pr.itens || [];
    const wpp = (pr.whatsappCompartilhado || {});

    return `
      <div class="aviso neutro secao">
        <span>${icone('info')}</span>
        <div><b>${itens.length} produtos cadastrados.</b> Cada um tem identidade, calendário, biblioteca
        e redes próprias. Nada está conectado às plataformas reais.</div>
      </div>

      <div class="grade grade-3 secao">
        ${itens.map((p) => `
          <div class="produto-card" style="--canal-cor:${esc(p.cor)}">
            <div class="produto-topo">
              <span class="produto-cor"></span>
              <div>
                <div class="canal-nome">${esc(p.nome)}</div>
                <div class="canal-tema">${esc(p.descricao)}</div>
              </div>
              <span class="etiqueta ${p.status === 'ativo' ? 'st-aprovado' : 'pendente'}">${esc(p.status)}</span>
            </div>

            <div class="produto-redes">
              ${Object.entries(p.redes || {}).map(([k, v]) => `
                <span class="rede ${v.conectado ? 'on' : ''}" title="${esc(k)}">
                  ${esc(k === 'whatsapp' ? 'WhatsApp' : k.charAt(0).toUpperCase() + k.slice(1))}
                  ${v.conectado ? '✓' : '—'}
                </span>`).join('')}
            </div>

            <div class="linha-info"><span>Site</span><b>${esc(p.site || 'não configurado')}</b></div>
            <div class="linha-info"><span>Voz</span><b>${esc((p.voz && p.voz.nome) || (p.voz && p.voz.status) || '—')}</b></div>
            <div class="linha-info"><span>Calendário</span><b>${esc((p.calendario && p.calendario.hora) || '—')} · ${esc((p.calendario && p.calendario.dias || []).length)} dias</b></div>
            <div class="linha-info"><span>Biblioteca</span><b>${(p.biblioteca && p.biblioteca.artes) || 0} artes · ${(p.biblioteca && p.biblioteca.roteiros) || 0} roteiros</b></div>

            <div class="ficha-acoes">
              <button class="btn btn-fantasma btn-sm" data-editar-produto="${esc(p.id)}">Editar</button>
              <button class="btn btn-fantasma btn-sm" data-status-produto="${esc(p.id)}">
                ${p.status === 'ativo' ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>`).join('')}

        <button class="produto-card novo" id="btn-novo-produto">
          ${icone('plus')}
          <b>Adicionar novo produto</b>
          <span>cria calendário, biblioteca e configurações</span>
        </button>
      </div>

      <div class="card secao" id="form-produto-wrap" style="display:none">
        <div class="secao-titulo"><h2>Novo produto</h2><span class="dica">o espaço de trabalho é criado automaticamente</span></div>
        <form id="form-produto" class="form-grade">
          <label>Nome
            <input name="nome" required maxlength="60" placeholder="Ex.: Finanças na Prática" />
          </label>
          <label>Cor principal
            <input name="cor" type="color" value="#6C5CE7" />
          </label>
          <label class="campo-largo">Descrição
            <input name="descricao" maxlength="140" placeholder="Tema do canal em uma linha" />
          </label>
          <label>Site (opcional)
            <input name="site" placeholder="https://" />
          </label>
          <label>Horário padrão
            <input name="hora" value="18:00" />
          </label>
          <div class="campo-largo">
            <button class="btn btn-primario" type="submit">${icone('plus')} Criar produto</button>
          </div>
        </form>
      </div>

      <div class="card secao">
        <div class="secao-titulo"><h2>WhatsApp compartilhado</h2>
          <span class="dica">${wpp.conectado ? 'conectado' : 'não conectado'}</span></div>
        <div class="aviso">
          <span>${icone('lock')}</span>
          <div>Hoje os ${itens.length} produtos usariam o <b>mesmo número</b>. A origem do contato é
          identificada por link por produto, parâmetro de campanha e menu de atendimento.
          Números exclusivos por produto já estão previstos na estrutura — basta preencher e habilitar.</div>
        </div>
        <div class="grade grade-3" style="margin-top:14px">
          <div class="mini-stat"><b>${wpp.conectado ? 'ON' : 'OFF'}</b><span>conexão real</span></div>
          <div class="mini-stat ok"><b>${wpp.identificacaoOrigem ? wpp.identificacaoOrigem.length : 0}</b><span>formas de identificar origem</span></div>
          <div class="mini-stat"><b>${wpp.numerosExclusivos && wpp.numerosExclusivos.habilitado ? 'ON' : 'OFF'}</b><span>números exclusivos</span></div>
        </div>
      </div>

      <div class="card secao">
        <div class="secao-titulo"><h2>Central de Relacionamento (prevista)</h2>
          <span class="dica">não implementada</span></div>
        <div class="chips">
          ${((pr.relacionamentoFuturo || {}).recursos || []).map((r) => `<span class="chip">${esc(r)}</span>`).join('')}
        </div>
      </div>`;
  }


  /* ---------- Sala de Direção 2.0: etapas e prévia ---------- */

  function etapasIndicador(p) {
    const ap = p.aprovacoes || {};
    const nomes = [['pauta','Pauta'],['roteiro','Roteiro'],['producao','Produção'],['final','Final']];
    return `
      <div class="etapas-linha">
        ${nomes.map(([k, n]) => {
          const st = (ap[k] && ap[k].status) || 'pendente';
          const cls = st === 'aprovada' ? 'ok' : st === 'pendente' ? 'pend' : 'nok';
          return `<span class="etapa-pill ${cls}"><i></i>${n}</span>`;
        }).join('')}
      </div>`;
  }

  const FORMATOS_REDE = {
    instagram: [
      { id: 'feed', label: 'Feed 4:5', w: 1080, h: 1350, ar: '4 / 5' },
      { id: 'quadrado', label: 'Quadrado', w: 1080, h: 1080, ar: '1 / 1' },
      { id: 'story', label: 'Story/Reels', w: 1080, h: 1920, ar: '9 / 16' },
    ],
    facebook: [
      { id: 'feed', label: 'Feed 4:5', w: 1080, h: 1350, ar: '4 / 5' },
      { id: 'quadrado', label: 'Quadrado', w: 1080, h: 1080, ar: '1 / 1' },
    ],
    tiktok: [{ id: 'video', label: 'Vídeo 9:16', w: 1080, h: 1920, ar: '9 / 16' }],
    youtube: [
      { id: 'shorts', label: 'Shorts 9:16', w: 1080, h: 1920, ar: '9 / 16' },
      { id: 'horizontal', label: 'Horizontal', w: 1280, h: 720, ar: '16 / 9' },
    ],
    whatsapp: [{ id: 'status', label: 'Status 9:16', w: 1080, h: 1920, ar: '9 / 16' }],
  };

  function formatoDaRede(plataforma) {
    const f = FORMATOS_REDE[plataforma] || [];
    return f[0] || { w: 1080, h: 1350, label: '' };
  }

  const NARRACAO_USADA = [
    'Seu assistente de IA só responde.',
    'O que já existe hoje vai lá e faz.',
    'A diferença se chama agente.',
    'Um chatbot espera você perguntar.',
    'Um agente recebe um objetivo, quebra em etapas e executa, muitas vezes sem ninguém olhando.',
    'Um exemplo real: o próprio Google usou o Gemini 4 Argon, num teste interno da empresa, para otimizar uma biblioteca de código.',
    'Segundo o anúncio oficial do modelo, o trabalho reduziu o tempo de preparação de sessão em 40 por cento, e acelerou a inicialização em 21 por cento.',
    'Guarda o contexto: isso foi um teste interno do Google, numa tarefa específica de engenharia.',
    'Não é o que você deve esperar no seu dia a dia, mas mostra até onde a autonomia já chega.',
    'E não é só código: o app Gemini conecta mais de 40 aplicativos, e executa tarefas em vez de só sugerir.',
    'O ganho não é ter uma IA mais inteligente.',
    'É ter uma IA que termina o que começou.',
    'E o risco também muda de lugar: quem autoriza o quê.',
    'Comenta: você deixaria um agente agir sozinho no seu trabalho?',
    'Salva pra ver depois.',
  ].join('\n');

  const DIFERENCAS = [
    'O roteiro prevê "40%" e "21%" no bloco de desenvolvimento; a narração os pronuncia como "40 por cento" e "21 por cento" para o TTS ler corretamente.',
    'O roteiro marca tempos (0–3s, 3–38s); a narração medida tem 59,83s, cerca de 5s acima da meta de 55s.',
    'O roteiro traz instruções de tela ("Na tela: ...") que não são narradas.',
    'Nenhuma frase do roteiro foi cortada ou reescrita na narração.',
  ];

  function abrirPreview(id) {
    const c = (estado.dados.conteudosDetalhe || []).find((x) => x.id === id);
    if (!c) return;
    const previa = c.previa ? (estado.dados.previas || {})[c.previa] : null;
    const todasPecas = (estado.dados.estudio && estado.dados.estudio.estudio
      ? (estado.dados.estudio.estudio.pecas || []) : []);
    // Vínculo estrito em cadeia: pauta -> roteiro -> arte/vídeo.
    // A arte só aparece se estiver explicitamente vinculada a ESTE conteúdo.
    const vinculadas = c.pecas || [];
    const peca = todasPecas.find((p) => vinculadas.includes(p.id)) || null;
    const pecaVinculada = Boolean(peca);
    const arquivo = previa ? '/' + previa.arquivo : peca ? '/' + peca.arquivo : null;
    const origemArquivo = previa ? 'vídeo renderizado' : pecaVinculada ? 'arte da mesma pauta' : 'sem arquivo vinculado';
    const isVideo = Boolean(previa);
    const ap = c.aprovacoes || {};
    const pendentes = ['pauta', 'roteiro', 'producao'].filter((k) => !ap[k] || ap[k].status !== 'aprovada');

    const modal = document.createElement('div');
    modal.id = 'modal-preview';
    modal.className = 'modal-fundo';
    modal.innerHTML = `
      <div class="modal modal-preview" style="--canal-cor:${esc(canal(c.canalId).cor)}">
        <header class="modal-topo">
          <div>
            <div class="ficha-canal">${esc(canal(c.canalId).nome)} · prévia do arquivo final</div>
            <h2>${esc(c.titulo)}</h2>
          </div>
          <button class="botao-icone" data-fechar>${icone('x')}</button>
        </header>

        <div class="preview-corpo">
          <div class="preview-arquivo">
            ${arquivo
              ? (isVideo
                  ? `<video controls preload="metadata" src="${esc(arquivo)}" poster="/${esc(previa.thumb || '')}"></video>
                     <div class="preview-meta">${esc(previa.w)}×${esc(previa.h)} · ${esc(previa.duracaoSegundos)}s · ${esc(previa.fps)} fps · voz ${esc(previa.voz)}</div>`
                  : `<img src="${esc(arquivo)}" alt="${esc(c.titulo)}" />`)
              : `<div class="estado-vazio">${icone('film')}<strong>Prévia ainda não gerada</strong>
                 <p>Este conteúdo não tem arquivo final. A prévia aparece quando a produção existir.</p></div>`}
          </div>

          <div class="preview-redes">
            <h4>Simulação por rede <span class="dica-sim">— prévia de enquadramento, não é arquivo exportado</span></h4>
            ${['instagram','facebook','tiktok','youtube','whatsapp'].map((pl) => {
              const f = formatoDaRede(pl);
              const ratio = f.ar;
              return `
                <div class="rede-sim">
                  <div class="rede-sim-tela" style="aspect-ratio:${ratio}">
                    ${arquivo ? (isVideo
                      ? `<video muted playsinline preload="metadata" src="${esc(arquivo)}#t=0.1"></video>`
                      : `<img src="${esc(arquivo)}" alt="" />`) : ''}
                  </div>
                  <div class="rede-sim-label"><b>${esc(pl.charAt(0).toUpperCase()+pl.slice(1))}</b><span>${esc(f.label)} · ${f.w}×${f.h}</span>
                    ${(pl === 'instagram' || pl === 'facebook') && isVideo
                      ? '<span class="aviso-formato">arquivo real é 9:16 — este formato exigiria render próprio</span>' : ''}
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>

        ${c.tipo === 'roteiro' ? `
        <div class="preview-comparacao">
          <h4>Roteiro v2 aprovado × narração efetivamente usada</h4>
          <div class="comparacao-grid">
            <div>
              <b>Roteiro (texto escrito)</b>
              <pre>${esc((c.blocos && (c.blocos.abertura + '\n\n' + c.blocos.desenvolvimento + '\n\n' + c.blocos.encerramento + '\n\n' + c.blocos.cta)) || c.corpo || '')}</pre>
            </div>
            <div>
              <b>Narração usada no vídeo (pm_alex 1,15)</b>
              <pre>${esc(NARRACAO_USADA)}</pre>
            </div>
          </div>
          <div class="diferencias">
            <b>Diferenças detectadas</b>
            <ul>
              ${DIFERENCAS.map((d) => `<li>${esc(d)}</li>`).join('')}
            </ul>
          </div>
        </div>` : ''}

        <div class="preview-legenda">
          <h4>Legenda definitiva</h4>
          <p>${esc(c.legenda || (previa && previa.legenda) || '—')}</p>
          <div class="chips">${String(c.hashtags || '').split(' ').filter(Boolean).map((h) => `<span class="chip">${esc(h)}</span>`).join('')}</div>
        </div>

        ${pendentes.length ? `
          <div class="aviso" style="margin:0 22px 16px">
            <span>${icone('lock')}</span>
            <div><b>Aprovação final bloqueada.</b> Ainda pendente: ${pendentes.join(', ')}.
            Aprovar pauta, roteiro ou produção não autoriza publicação.</div>
          </div>` : ''}

        <div class="preview-etapas">
          <h4>Aprovar etapa por etapa</h4>
          ${['pauta','roteiro','producao'].map((k) => {
            const st = (ap[k] && ap[k].status) || 'pendente';
            return `<div class="etapa-acao">
              <span class="etapa-pill ${st === 'aprovada' ? 'ok' : st === 'pendente' ? 'pend' : 'nok'}"><i></i>${k === 'producao' ? 'Produção' : k.charAt(0).toUpperCase()+k.slice(1)}</span>
              <span class="etapa-estado">${st === 'aprovada' ? 'aprovada em ' + fmtDataHora(ap[k].em) + ' · por ' + esc(ap[k].autor || 'Direção') : 'pendente'}</span>
              ${st !== 'aprovada' ? `<button class="btn btn-ok btn-sm" data-etapa="aprovar" data-etapa-id="${esc(k)}" data-id="${esc(c.id)}">Aprovar</button>` : ''}
            </div>`;
          }).join('')}
        </div>

        <div class="preview-acoes">
          <button class="btn btn-ok" data-pub="aprovar" data-id="${esc(c.id)}" ${pendentes.length ? 'disabled' : ''}>${icone('check')} Aprovar publicação</button>
          <button class="btn btn-aviso" data-pub="ajustes" data-id="${esc(c.id)}">${icone('undo')} Solicitar ajustes</button>
          <button class="btn btn-erro" data-pub="rejeitar" data-id="${esc(c.id)}">${icone('x')} Rejeitar</button>
          ${arquivo ? `<a class="btn btn-fantasma" href="${esc(arquivo)}" download>${icone('save')} Baixar arquivo</a>` : ''}
        </div>
      </div>`;
    document.body.appendChild(modal);
  }


  /* ---------- Backup e Exportação ---------- */

  function renderBackup(d) {
    const lista = d.backups || [];
    return `
      <div class="aviso neutro secao">
        <span>${icone('info')}</span>
        <div><b>Backup gerado localmente.</b> O ZIP fica na pasta <code>public/downloads/</code>,
        com arquivo <code>.sha256</code> para conferir a integridade. Nenhum dado sai da máquina.</div>
      </div>

      <div class="grade grade-2 secao">
        <div class="card">
          <div class="secao-titulo"><h2>Backup completo</h2><span class="dica">~200 MB</span></div>
          <p class="backup-desc">Código, banco, histórico por etapa, artes, vídeos, narrações,
          legendas e os modelos de voz Piper.</p>
          <button class="btn btn-primario" data-backup="completo">${icone('save')} Gerar backup completo (.ZIP)</button>
        </div>
        <div class="card">
          <div class="secao-titulo"><h2>Código-fonte para auditoria</h2><span class="dica">~800 KB</span></div>
          <p class="backup-desc">Código, testes, documentação e snapshot do banco.
          Sem mídias grandes e sem modelos — leve para envio e revisão.</p>
          <button class="btn btn-secundario" data-backup="codigo">${icone('file')} Gerar código-fonte (.ZIP)</button>
        </div>
      </div>

      <div id="backup-status"></div>

      <div class="card secao">
        <div class="secao-titulo"><h2>Backups disponíveis</h2><span class="dica">${lista.length}</span></div>
        ${lista.length === 0
          ? `<div class="estado-vazio">${icone('save')}<strong>Nenhum backup gerado</strong>
             <p>Clique em um dos botões acima para criar o primeiro.</p></div>`
          : `<table class="tabela">
              <thead><tr><th>Arquivo</th><th>Tipo</th><th>Tamanho</th><th>Gerado</th><th>SHA-256</th><th>Baixar</th></tr></thead>
              <tbody>
                ${lista.map((b) => `
                  <tr>
                    <td style="font-size:11px;word-break:break-all">${esc(b.arquivo)}</td>
                    <td><span class="chip ${b.tipo === 'completo' ? 'moeda' : ''}">${esc(b.tipo)}</span></td>
                    <td><b>${b.mb} MB</b></td>
                    <td>${fmtDataHora(b.criadoEm)}</td>
                    <td style="font-size:10px;color:var(--texto-3);word-break:break-all;max-width:170px">${esc((b.sha256 || '').slice(0, 16))}…</td>
                    <td><a class="btn btn-primario btn-sm" href="/downloads/${esc(b.arquivo)}" download>${icone('save')} Baixar ZIP</a></td>
                  </tr>`).join('')}
              </tbody>
            </table>`}
      </div>

      <div class="card secao">
        <div class="secao-titulo"><h2>O que não entra no backup</h2></div>
        <ul class="tags-pend">
          <li>${icone('lock')} Credenciais, tokens e arquivos de ambiente reais com segredos.</li>
          <li>${icone('lock')} Ambiente virtual do Kokoro (1,2 GB) — reinstalável com pip install kokoro soundfile.</li>
          <li>${icone('lock')} Backups antigos — evitam crescimento recursivo do arquivo.</li>
        </ul>
      </div>`;
  }

  function regrasAgentesCard(d) {
    return `
      <div class="card secao">
        <div class="secao-titulo"><h2>Regras aplicadas aos agentes</h2>
          <span class="dica">validadas pelo servidor, não só pela interface</span></div>
        <ul class="tags-ok">
          <li>${icone('check')} <b>A1:</b> toda afirmação factual exige fonte verificável; redes sociais e blogs são recusados.</li>
          <li>${icone('check')} <b>Poder 50+:</b> exige fonte científica ou oficial; promessa de resultado é proibida.</li>
          <li>${icone('check')} <b>A3:</b> só produz roteiro sobre pauta com status “Pauta aprovada”.</li>
          <li>${icone('check')} <b>Roteiro:</b> precisa dos cinco blocos — abertura impactante, desenvolvimento, encerramento, sugestões visuais e chamada para ação.</li>
        </ul>
      </div>`;
  }

  /* ---------- Execuções ---------- */

  function renderExecucoes(d) {
    const execs = d.indicadores.execucoes || [];
    const total = d.indicadores.creditosConsumidosAgentes || 0;
    if (!execs.length) {
      return `
        <div class="estado-vazio">
          ${icone('activity')}
          <strong>Nenhum agente executado ainda</strong>
          <p>Toda execução de agente é registrada aqui com créditos consumidos, teto autorizado e
          itens gerados — inclusive as que falharem ou forem interrompidas.</p>
        </div>`;
    }
    const rotuloStatus = {
      em_andamento: 'Em andamento', concluida: 'Concluída',
      excedeu_teto: 'Excedeu o teto', interrompida: 'Interrompida', erro: 'Com erro',
    };
    return `
      <div class="grade grade-3 secao">
        <div class="card kpi">
          <div class="kpi-rotulo">${icone('wallet')} Créditos consumidos</div>
          <div class="kpi-valor">${total}</div>
          <div class="kpi-nota">em ${execs.length} execução(ões)</div>
        </div>
        <div class="card kpi">
          <div class="kpi-rotulo">${icone('check')} Itens gerados</div>
          <div class="kpi-valor">${execs.reduce((t, e) => t + (e.itensGerados || 0), 0)}</div>
          <div class="kpi-nota">pautas e roteiros</div>
        </div>
        <div class="card kpi">
          <div class="kpi-rotulo">${icone('bot')} Agentes executados</div>
          <div class="kpi-valor">${new Set(execs.map((e) => e.agente)).size}</div>
          <div class="kpi-nota">de A1 a A3</div>
        </div>
      </div>

      <div class="card secao">
        <table class="tabela">
          <thead><tr>
            <th>Agente</th><th>Início</th><th>Créditos</th><th>Teto</th><th>Itens</th><th>Status</th>
          </tr></thead>
          <tbody>
            ${execs.map((e) => `
              <tr>
                <td><b>${esc(e.agente)}</b><br>
                  <span style="color:var(--texto-3);font-size:11.5px">${esc(e.descricao || '')}</span></td>
                <td>${fmtDataHora(e.iniciadaEm)}</td>
                <td><b>${e.creditos || 0}</b></td>
                <td>${e.tetoCreditos || '—'}</td>
                <td>${e.itensGerados || 0}</td>
                <td><span class="etiqueta ${e.status === 'concluida' ? 'st-aprovado' : e.status === 'excedeu_teto' ? 'st-rejeitado' : 'pendente'}">
                  ${esc(rotuloStatus[e.status] || e.status)}</span>
                  ${e.observacao ? `<div style="color:var(--texto-3);font-size:11px;margin-top:6px;max-width:260px">${esc(e.observacao)}</div>` : ''}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function renderPendentes(d) {
    const p = d.indicadores.pendentes;
    if (!p.length) {
      return `
        <div class="estado-vazio">
          ${icone('inbox')}
          <strong>Nenhum conteúdo aguardando aprovação</strong>
          <p>Esta é a fila real do sistema. Ela está vazia porque nada está pendente no banco.</p>
        </div>`;
    }
    return `
      <div class="aviso neutro secao">
        <span>${icone('info')}</span>
        <div>Para decidir, use a <b>Sala de Direção</b>.</div>
      </div>
      <div class="lista-pendentes">
        ${p.map((x) => `
          <div class="item-pendente">
            <div class="faixa" style="background:${esc(x.canalCor)}"></div>
            <div class="texto">
              <b>${esc(x.titulo)}</b>
              <span>${esc(x.canalNome)} · ${esc(x.statusLabel)} · ${horaRelativa(x.atualizadoEm)}</span>
            </div>
            <button class="btn btn-fantasma btn-sm" data-detalhe="${esc(x.id)}">Abrir</button>
          </div>`).join('')}
      </div>`;
  }

  /* ---------- Integrações ---------- */

  function renderIntegracoes(d) {
    const rotulo = {
      indisponivel: 'Indisponível nesta conta',
      pendente: 'Pendente',
      pronto_para_integrar: 'Pronto para integrar',
      conectado: 'Conectado',
    };
    return `
      <div class="card secao">
        <table class="tabela">
          <thead><tr>
            <th>Recurso</th><th>Agente</th><th>Estado</th><th>Custo</th><th>Alternativa sem custo</th>
          </tr></thead>
          <tbody>
            ${d.integracoes.map((x) => `
              <tr>
                <td><b>${esc(x.nome)}</b><br><span style="color:var(--texto-3);font-size:11.5px">${esc(x.descricao)}</span></td>
                <td>${x.agente ? esc(x.agente.toUpperCase()) : '—'}</td>
                <td><span class="etiqueta ${esc(x.estado)}">${rotulo[x.estado] || esc(x.estado)}</span>
                  <div style="color:var(--texto-3);font-size:11px;margin-top:6px;max-width:230px">${esc(x.motivo)}</div></td>
                <td>${x.custoEhPago ? '<span class="chip moeda">pago</span>' : '<span class="chip">gratuito</span>'}
                  <div style="color:var(--texto-3);font-size:11px;margin-top:6px;max-width:190px">${esc(x.custo)}</div></td>
                <td style="color:var(--texto-2);font-size:12px;max-width:220px">${esc(x.alternativaGratuita || '—')}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="aviso">
        <span>${icone('lock')}</span>
        <div>Nenhuma integração está conectada e nenhum serviço pago foi acionado. Cada uma será
        apresentada com custo estimado antes de qualquer implementação.</div>
      </div>`;
  }

  /* ---------- Sobre ---------- */

  function renderSobre(d) {
    return `
      <div class="grade grade-2 secao">
        <div class="card">
          <div class="secao-titulo"><h2>Implementado até aqui</h2></div>
          <ul class="tags-ok">
            <li>${icone('check')} Painel central em português brasileiro, modular e responsivo.</li>
            <li>${icone('check')} 3 canais, calendário de 9 slots e indicadores reais.</li>
            <li>${icone('check')} <b>Sala de Direção</b> com aprovar, solicitar ajustes e rejeitar.</li>
            <li>${icone('check')} <b>Biblioteca de conteúdos</b> com busca, filtros e reenvio.</li>
            <li>${icone('check')} <b>Persistência real</b> em <code>data/db.json</code> com histórico imutável de decisões.</li>
            <li>${icone('check')} API de escrita pronta para os agentes usarem.</li>
          </ul>
        </div>
        <div class="card">
          <div class="secao-titulo"><h2>Continua fora do escopo</h2></div>
          <ul class="tags-pend">
            <li>${icone('clock')} Agentes gerando conteúdo (Etapas 3 e 4).</li>
            <li>${icone('clock')} Geração de vídeo, narração e edição por IA.</li>
            <li>${icone('clock')} Conexão de contas e publicação nas redes.</li>
            <li>${icone('clock')} Monetização com dados reais.</li>
            <li>${icone('clock')} Operação 24/7 em nuvem.</li>
          </ul>
        </div>
      </div>

      <div class="card secao">
        <div class="secao-titulo"><h2>Modelo de dados e API</h2></div>
        <table class="tabela">
          <thead><tr><th>Recurso</th><th>Método</th><th>Para que serve</th></tr></thead>
          <tbody>
            <tr><td><code>/api/conteudos</code></td><td>GET · POST</td><td>Listar e registrar conteúdo (rota que os agentes vão usar)</td></tr>
            <tr><td><code>/api/conteudos/:id</code></td><td>GET</td><td>Detalhe com histórico de decisões e trava de publicação</td></tr>
            <tr><td><code>/api/conteudos/:id/decisao</code></td><td>POST</td><td>Aprovar, solicitar ajustes ou rejeitar</td></tr>
            <tr><td><code>/api/conteudos/:id/reenviar</code></td><td>POST</td><td>Devolver para a fila depois dos ajustes</td></tr>
            <tr><td><code>/api/decisoes</code></td><td>GET</td><td>Log imutável de todas as decisões</td></tr>
          </tbody>
        </table>
        <div class="aviso verde" style="margin-top:16px">
          <span>${icone('lock')}</span>
          <div>Não existe rota de publicação. O servidor não tem código capaz de publicar em rede social,
          e nenhum serviço pago é chamado.</div>
        </div>
      </div>

      <div class="aviso neutro">
        <span>${icone('info')}</span>
        <div>Versão ${esc(d.meta.versao)} · Etapa ${d.meta.etapa} · ${esc(d.config.fusoHorario)} ·
        créditos consumidos nesta etapa: <b>${d.meta.creditosConsumidos}</b>.</div>
      </div>`;
  }

  /* ------------------------------ modal de detalhe e decisão ------------------------------ */

  function fecharModal() {
    ['#modal', '#modal-preview'].forEach((sel) => {
      const m = $(sel);
      if (m) m.remove();
    });
    estado.detalheId = null;
  }

  async function abrirDetalhe(id, apenasRender) {
    try {
      const bruto = await Api.conteudo(id);
      const dados = Array.isArray(bruto)
        ? { conteudo: bruto.find((c) => c.id === id), decisoes: [] }
        : bruto;
      const c = dados.conteudo;
      if (!c) return;
      estado.detalheId = id;
      if (apenasRender) { fecharModal(); }
      const lista = (dados.decisoes && dados.decisoes.length)
        ? dados.decisoes
        : decisoesDe(id).slice().reverse();
      mostrarModal(c, lista);
    } catch (e) {
      toast(e.message, 'erro');
    }
  }

  function mostrarModal(c, decisoes) {
    const antigo = $('#modal');
    if (antigo) antigo.remove();
    const cn = canal(c.canalId);
    const podeDecidir = c.status === 'aprovacao';

    const linhaTempo = decisoes.length
      ? decisoes.map((d) => `
          <li>
            <span class="tl-dot ${esc(d.decisao)}"></span>
            <div>
              <b>${esc({
                aprovar: 'Aprovado', ajustes: 'Ajustes solicitados',
                rejeitar: 'Rejeitado', reenvio: 'Reenviado para aprovação',
              }[d.decisao] || d.decisao)}</b>
              <span>${fmtDataHora(d.em)} · ${esc(d.autor || 'Direção')}</span>
              ${d.orientacoes ? `<p>${esc(d.orientacoes)}</p>` : ''}
            </div>
          </li>`).join('')
      : '<li class="tl-vazia">Nenhuma decisão registrada ainda.</li>';

    const modal = document.createElement('div');
    modal.id = 'modal';
    modal.className = 'modal-fundo';
    modal.innerHTML = `
      <div class="modal" style="--canal-cor:${esc(cn.cor)}">
        <header class="modal-topo">
          <div>
            <div class="ficha-canal">${esc(cn.nome)} · ${esc(c.tipo)} · v${c.versao || 1}</div>
            <h2>${esc(c.titulo)}</h2>
          </div>
          <button class="botao-icone" data-fechar title="Fechar">${icone('x')}</button>
        </header>
        <div class="modal-status">${etiquetaStatus(c.status)}
          ${c.status === 'aprovado' ? `<span class="dica">aprovado em ${fmtDataHora(c.aprovadoEm)} — nada foi publicado</span>` : ''}
          ${c.orientacoes ? `<span class="dica">última orientação: ${esc(c.orientacoes)}</span>` : ''}
        </div>
        <div class="modal-corpo">
          ${c.resumo ? `<p class="ficha-resumo">${esc(c.resumo)}</p>` : ''}
          <pre class="ficha-corpo">${esc(c.corpo || 'Sem corpo registrado.')}</pre>

          <h4 class="modal-subtitulo">Histórico de decisões</h4>
          <ul class="linha-tempo">${linhaTempo}</ul>

          ${podeDecidir ? `
            <div class="modal-decisao">
              <label>Orientações para ajuste ou motivo da rejeição
                <textarea id="orientacoes" rows="3" placeholder="Obrigatório para ajustes e rejeição."></textarea>
              </label>
              <div class="ficha-acoes">
                <button class="btn btn-ok" data-decidir="aprovar" data-id="${esc(c.id)}">${icone('check')} Aprovar</button>
                <button class="btn btn-aviso" data-decidir="ajustes" data-id="${esc(c.id)}">${icone('undo')} Solicitar ajustes</button>
                <button class="btn btn-erro" data-decidir="rejeitar" data-id="${esc(c.id)}">${icone('x')} Rejeitar</button>
              </div>
            </div>` : `
            <div class="aviso neutro" style="margin-top:16px">
              <span>${icone('info')}</span>
              <div>Este conteúdo não está na fila de aprovação, portanto não recebe decisão agora.
              ${c.status === 'aprovado' ? 'Ele está aprovado e <b>não foi publicado</b>.' : ''}</div>
            </div>`}
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  /* ------------------------------ ações ------------------------------ */

  async function decidir(id, decisao, orientacoes, botao) {
    if (Api.modo() === 'estatico') {
      return toast('Modo somente leitura: inicie o servidor para gravar decisões.', 'erro');
    }
    const rotulo = { aprovar: 'Aprovar', ajustes: 'Solicitar ajustes', rejeitar: 'Rejeitar' }[decisao];
    if (!confirm(`Confirmar “${rotulo}” neste conteúdo?\n\nA decisão será gravada permanentemente no banco.\nNada será publicado.`)) {
      return;
    }
    if (botao) { botao.disabled = true; botao.classList.add('ocupado'); }
    try {
      const r = await Api.decidir(id, { decisao, orientacoes: orientacoes || '', autor: 'Direção' });
      toast(`“${rotulo}” registrado: ${r.conteudo.titulo}`);
      fecharModal();
      await carregar(estado.semanaRef);
    } catch (e) {
      toast(e.message, 'erro');
      if (botao) { botao.disabled = false; botao.classList.remove('ocupado'); }
    }
  }

  async function reenviar(id, botao) {
    if (Api.modo() === 'estatico') return toast('Modo somente leitura.', 'erro');
    if (botao) { botao.disabled = true; }
    try {
      await Api.reenviar(id, {});
      toast('Conteúdo reenviado para aprovação.');
      await carregar(estado.semanaRef);
    } catch (e) {
      toast(e.message, 'erro');
      if (botao) { botao.disabled = false; }
    }
  }

  async function criarConteudo(form) {
    const dados = new FormData(form);
    const corpo = {
      canalId: dados.get('canalId'),
      tipo: dados.get('tipo'),
      titulo: dados.get('titulo'),
      corpo: dados.get('corpo'),
      origem: 'manual',
    };
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      await Api.criarConteudo(corpo);
      toast('Conteúdo registrado na biblioteca.');
      form.reset();
      await carregar(estado.semanaRef);
    } catch (e) {
      toast(e.message, 'erro');
    } finally {
      btn.disabled = false;
    }
  }

  /* ------------------------------ eventos ------------------------------ */


  /* ==========================================================
     AJUDA INTELIGENTE — tutorial, busca e ajuda contextual
     Zero chamadas de IA: base local de conhecimento.
     ========================================================== */

  const AJUDA_ABAS = {
    visao: 'Você está na visão geral: aqui aparecem os números da agência, os produtos e os agentes.',
    direcao: 'Você está na área de aprovação. Aqui pode assistir aos vídeos, visualizar artes e aprovar ou solicitar ajustes.',
    biblioteca: 'Aqui estão os arquivos produzidos. Você pode filtrar por produto, formato ou data.',
    estudio: 'Aqui você cria e edita artes, cards, carrosséis e infográficos.',
    publicacoes: 'Aqui você configura o agendamento e acompanha as publicações aprovadas.',
    pautas: 'Aqui ficam as pautas propostas pelo agente A1, com nota de potencial e fontes.',
    produtos: 'Aqui você cadastra produtos e canais. Cada produto tem calendário, biblioteca e redes próprias.',
    vozes: 'Aqui você ouve e compara as vozes de cada canal.',
    calendario: 'Aqui está o calendário editorial com os slots da semana.',
    producao: 'Aqui você acompanha cada conteúdo pela etapa de produção.',
    agentes: 'Aqui estão os seis agentes de IA e o estado real de cada um.',
    pendentes: 'Aqui ficam os conteúdos aguardando decisão.',
    execucoes: 'Aqui aparecem os créditos consumidos por cada execução de agente.',
    integracoes: 'Aqui você vê quais integrações existem e o estado de cada uma.',
    sobre: 'Aqui está o resumo técnico desta versão.',
  };

  const AJUDA_FAQ = [
    { q: 'Onde encontro o vídeo que foi produzido?', aba: 'direcao', a: 'Abra a Sala de Direção: o roteiro do IA na Prática mostra o player destacado com o vídeo-piloto. Na Biblioteca o mesmo conteúdo aparece na lista.' },
    { q: 'Como assistir ao vídeo?', aba: 'direcao', a: 'Na Sala de Direção, use o player do bloco roxo "ASSISTIR". Ele tem controles, áudio e barra de progresso. Há também o botão "Visualizar publicação final".' },
    { q: 'Como baixo uma arte?', aba: 'estudio', a: 'Abra a aba Estúdio, encontre a peça e clique em "Baixar PNG". As artes ficam em 1080×1350.' },
    { q: 'Como baixo o vídeo?', aba: 'direcao', a: 'Na Sala de Direção, use o botão "Baixar MP4" dentro do bloco do vídeo ou no rodapé da prévia.' },
    { q: 'Como adiciono um novo produto?', aba: 'produtos', a: 'Vá em Produtos e clique no cartão "Adicionar novo produto". O calendário, a biblioteca e as configurações são criados automaticamente.' },
    { q: 'Como altero o Instagram de um canal?', aba: 'produtos', a: 'Em Produtos, clique em "Editar" no cartão do canal. As redes estão listadas por produto. Nenhuma conta está conectada nesta fase.' },
    { q: 'Como aprovo uma publicação?', aba: 'direcao', a: 'Antes é preciso aprovar as etapas Pauta, Roteiro e Produção. Depois, o botão "Aprovar publicação" fica disponível na prévia final.' },
    { q: 'Como solicito uma alteração?', aba: 'direcao', a: 'Na prévia final, clique em "Solicitar ajustes" e descreva o que deve mudar. Qualquer ajuste invalida a aprovação final.' },
    { q: 'Onde encontro os conteúdos pendentes?', aba: 'pendentes', a: 'Na aba Pendentes, ou pelo contador no menu lateral. A Sala de Direção mostra a fila de decisão.' },
    { q: 'Como altero a voz de um vídeo?', aba: 'vozes', a: 'Na aba Vozes você ouve as amostras de cada canal. A voz atual aparece em cada cartão; trocar exige sua aprovação.' },
    { q: 'Como vejo o calendário de publicações?', aba: 'calendario', a: 'Na aba Calendário editorial. Cada slot é uma vaga planejada, não um vídeo produzido.' },
    { q: 'Por que meu conteúdo não foi publicado?', aba: 'publicacoes', a: 'Publicação real está DESATIVADA e nenhuma conta está conectada. Além disso, só a aprovação final libera agendamento.' },
    { q: 'Como funcionam as etapas de aprovação?', aba: 'direcao', a: 'São quatro: Pauta, Roteiro, Produção e Aprovação final. Aprovar as três primeiras não autoriza publicar.' },
    { q: 'Onde vejo os créditos gastos?', aba: 'execucoes', a: 'Na aba Execuções, que mostra agente, teto autorizado e créditos consumidos por rodada.' },
    { q: 'Como fazer backup e baixar todo o meu projeto?', aba: 'backup', a: 'Abra a aba Backup e Exportação no menu lateral. Clique em "Gerar backup completo (.ZIP)" para levar tudo, ou "Gerar código-fonte (.ZIP)" para um arquivo leve. Depois use o botão "Baixar ZIP". Um arquivo .sha256 é gerado para conferir a integridade.' },
  ];

  const TUTORIAL = [
    { aba: 'visao', t: 'Visão geral da agência', d: 'Aqui você vê os números do dia: conteúdos pendentes, aprovados, produtos e agentes. É o ponto de partida.' },
    { aba: 'produtos', t: 'Cadastrar um produto', d: 'Em Produtos, clique em "Adicionar novo produto". Calendário, biblioteca e redes são criados automaticamente.' },
    { aba: 'produtos', t: 'Configurar seus canais', d: 'Cada produto tem suas redes, sua cor e seu horário. Nada é conectado ao real sem sua autorização.' },
    { aba: 'pautas', t: 'Pesquisar e criar pautas', d: 'O agente A1 propõe pautas com nota de potencial e fontes verificáveis. Todas chegam aguardando sua decisão.' },
    { aba: 'direcao', t: 'Gerar roteiros', d: 'O agente A3 escreve o roteiro só depois que a pauta é aprovada. O roteiro aparece na Sala de Direção.' },
    { aba: 'estudio', t: 'Produzir artes', d: 'No Estúdio ficam as peças 1080×1350 de cada produto, com a identidade visual do canal.' },
    { aba: 'direcao', t: 'Produzir vídeos', d: 'O vídeo-piloto aparece em destaque na Sala de Direção, com player e botão de download.' },
    { aba: 'biblioteca', t: 'Localizar arquivos', d: 'A Biblioteca reúne tudo o que foi produzido, com filtros por produto e formato.' },
    { aba: 'direcao', t: 'Visualizar publicação final', d: 'O botão "Visualizar publicação final" mostra o arquivo exato, a legenda e a simulação em cada rede.' },
    { aba: 'direcao', t: 'Solicitar ajustes', d: 'Na prévia final, "Solicitar ajustes" registra suas orientações e devolve o conteúdo.' },
    { aba: 'direcao', t: 'Aprovar conteúdos', d: 'Cada etapa tem seu próprio botão. A aprovação final é a única que libera publicação.' },
    { aba: 'publicacoes', t: 'Agendar publicações', d: 'A Central de Publicações está em modo simulação. Agendamento real está bloqueado.' },
    { aba: 'visao', t: 'Acompanhar resultados', d: 'Os indicadores e a aba Execuções mostram o andamento e o custo de cada agente.' },
    { aba: 'agentes', t: 'Usar os agentes de IA', d: 'Seis agentes, do pesquisador ao gestor de publicações. Cada um mostra o estado real de implementação.' },
    { aba: 'sobre', t: 'Encontrar suporte', d: 'Esta Ajuda Inteligente fica sempre no canto inferior direito. Você pode reabrir o tutorial quando quiser.' },
  ];

  function abrirAjuda() {
    if ($('#ajuda-painel')) return;
    const p = document.createElement('aside');
    p.id = 'ajuda-painel';
    p.innerHTML = `
      <header class="ajuda-topo">
        <div>
          <b>Assistente da Agência</b>
          <span>Ajuda guiada · ${esc(TITULOS[estado.aba] || '')}</span>
        </div>
        <button class="botao-icone" data-fechar-ajuda>${icone('x')}</button>
      </header>
      <div class="ajuda-corpo">
        <label class="ajuda-busca">
          ${icone('search')}
          <input id="ajuda-input" placeholder="O que você deseja fazer?" />
        </label>
        <div id="ajuda-resultado" class="ajuda-resultado">
          <p class="ajuda-contexto">${esc(AJUDA_ABAS[estado.aba] || 'Escolha uma pergunta ou digite o que precisa.')}</p>
          <div class="ajuda-rapidos">
            ${AJUDA_FAQ.slice(0, 4).map((f) => `<button class="chip ajuda-chip" data-faq="${esc(f.q)}">${esc(f.q)}</button>`).join('')}
          </div>
        </div>
        <button class="btn btn-primario ajuda-tutorial" id="btn-tutorial">${icone('play')} Refazer o tutorial guiado</button>
      </div>`;
    document.body.appendChild(p);

    $('#ajuda-input').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const alvo = $('#ajuda-resultado');
      if (!q) {
        alvo.innerHTML = `<p class="ajuda-contexto">${esc(AJUDA_ABAS[estado.aba] || '')}</p>
          <div class="ajuda-rapidos">${AJUDA_FAQ.slice(0, 4).map((f) => `<button class="chip ajuda-chip" data-faq="${esc(f.q)}">${esc(f.q)}</button>`).join('')}</div>`;
        return;
      }
      const achados = AJUDA_FAQ.filter((f) => {
        const alvoTxt = (f.q + ' ' + f.a + ' ' + f.aba).toLowerCase();
        return q.split(/\s+/).every((w) => w.length < 3 || alvoTxt.includes(w));
      }).slice(0, 5);
      alvo.innerHTML = achados.length
        ? achados.map((f) => `<div class="ajuda-item">
            <b>${esc(f.q)}</b><p>${esc(f.a)}</p>
            <button class="btn btn-fantasma btn-sm" data-ir-ajuda="${esc(f.aba)}">Ir para a funcionalidade</button>
          </div>`).join('')
        : `<p class="ajuda-contexto">Não encontrei uma resposta pronta. Tente palavras como "vídeo", "arte", "aprovar" ou "produto".</p>`;
    });
  }

  function fecharAjuda() {
    const p = $('#ajuda-painel');
    if (p) p.remove();
  }

  /* Tutorial guiado */
  let tutorialIdx = 0;
  function abrirTutorial(i) {
    tutorialIdx = i || 0;
    renderTutorial();
  }

  function renderTutorial() {
    const passo = TUTORIAL[tutorialIdx];
    let t = $('#tutorial');
    if (!t) {
      t = document.createElement('div');
      t.id = 'tutorial';
      document.body.appendChild(t);
    }
    const pct = Math.round(((tutorialIdx + 1) / TUTORIAL.length) * 100);
    t.innerHTML = `
      <div class="tutorial-card">
        <div class="tutorial-progresso">
          <div class="barra"><i style="width:${pct}%"></i></div>
          <span>${tutorialIdx + 1} de ${TUTORIAL.length}</span>
        </div>
        ${tutorialIdx === 0 ? '<p class="tutorial-bemvindo">Bem-vindo à sua Agência de IA Autônoma! Vamos conhecer as principais funcionalidades?</p>' : ''}
        <h3>${esc(passo.t)}</h3>
        <p>${esc(passo.d)}</p>
        <div class="tutorial-acoes">
          <button class="btn btn-fantasma btn-sm" data-tut="pular">Pular</button>
          <div style="flex:1"></div>
          ${tutorialIdx > 0 ? '<button class="btn btn-fantasma btn-sm" data-tut="voltar">Voltar</button>' : ''}
          <button class="btn btn-primario btn-sm" data-tut="proximo">
            ${tutorialIdx === TUTORIAL.length - 1 ? 'Concluir' : 'Próximo'}
          </button>
        </div>
      </div>`;
    // destacar a aba correspondente
    document.querySelectorAll('.nav-item').forEach((b) =>
      b.classList.toggle('tutorial-alvo', b.dataset.aba === passo.aba)
    );
    // se a etapa aponta para a aba já ativa, destaca o cabeçalho da seção
    const secao = document.querySelector('[data-aba].ativo');
    if (secao && secao.dataset.aba === passo.aba) secao.classList.add('tutorial-alvo');
  }

  function fecharTutorial() {
    const t = $('#tutorial');
    if (t) t.remove();
    try { localStorage.setItem('agencia-tutorial-visto', '1'); } catch (_) {}
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('tutorial-alvo'));
  }

  function montarBotaoAjuda() {
    if ($('#ajuda-fab')) return;
    const b = document.createElement('button');
    b.id = 'ajuda-fab';
    b.innerHTML = `${icone('info')}<span>Ajuda — como posso te ajudar?</span>`;
    b.addEventListener('click', () => {
      abrirAjuda();
      setTimeout(() => {
        const i = $('#ajuda-input');
        if (i) i.focus();
      }, 50);
    });
    document.body.appendChild(b);
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-fechar-ajuda]')) return fecharAjuda();
    const faq = e.target.closest('[data-faq]');
    if (faq) {
      const item = AJUDA_FAQ.find((f) => f.q === faq.dataset.faq);
      if (!item) return;
      const alvo = $('#ajuda-resultado');
      alvo.innerHTML = `<div class="ajuda-item"><b>${esc(item.q)}</b><p>${esc(item.a)}</p>
        <button class="btn btn-primario btn-sm" data-ir-ajuda="${esc(item.aba)}">Ir para a funcionalidade</button></div>`;
      return;
    }
    const ir = e.target.closest('[data-ir-ajuda]');
    if (ir) { fecharAjuda(); trocarAba(ir.dataset.irAjuda); return; }

    if (e.target.closest('#btn-tutorial')) { fecharAjuda(); abrirTutorial(0); return; }
    const tut = e.target.closest('[data-tut]');
    if (tut) {
      const acao = tut.dataset.tut;
      if (acao === 'pular' || acao === 'concluir') return fecharTutorial();
      if (acao === 'voltar') return abrirTutorial(Math.max(0, tutorialIdx - 1));
      if (acao === 'proximo') {
        if (tutorialIdx === TUTORIAL.length - 1) return fecharTutorial();
        return abrirTutorial(tutorialIdx + 1);
      }
    }
  });

  // primeiro acesso: abre o tutorial uma única vez
  try {
    if (!localStorage.getItem('agencia-tutorial-visto')) {
      setTimeout(() => abrirTutorial(0), 800);
    }
  } catch (_) {}

  montarBotaoAjuda();

  function trocarAba(aba) {
    estado.aba = aba;
    document.querySelectorAll('.nav-item').forEach((b) =>
      b.classList.toggle('ativo', b.dataset.aba === aba)
    );
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.getElementById('nav').addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-item');
    if (btn) trocarAba(btn.dataset.aba);
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('#semana-anterior')) return mudarSemana(-7);
    if (e.target.closest('#semana-proxima')) return mudarSemana(7);
    if (e.target.closest('#semana-atual')) return carregar();

    const ir = e.target.closest('[data-ir]');
    if (ir) return trocarAba(ir.dataset.ir);

    const fechar = e.target.closest('[data-fechar]');
    if (fechar || e.target.classList.contains('modal-fundo')) return fecharModal();

    const pv = e.target.closest('[data-preview]');
    if (pv) return abrirPreview(pv.dataset.preview);

    const vs = e.target.closest('[data-versoes]');
    if (vs) {
      const pv = (estado.dados.previas || {})[vs.dataset.versoes];
      if (!pv) return;
      const lista = (pv.versoes || []).map((v) => `v${v.versao} — ${v.tamanho || ''} ${v.bitrate ? '· ' + v.bitrate : ''} (${fmtDataHora(v.em)})`).join('\n');
      alert(`Histórico de versões — ${pv.titulo}\n\n${lista}\n\nVersão atual: v${pv.versao}`);
      return;
    }

    const bk = e.target.closest('[data-backup]');
    if (bk) {
      const tipo = bk.dataset.backup;
      const alvo = $('#backup-status');
      bk.disabled = true;
      if (alvo) alvo.innerHTML = `<div class="aviso neutro"><span>${icone('clock')}</span>
        <div>Gerando backup ${tipo === 'completo' ? 'completo (~200 MB, pode levar 1-2 min)' : 'do código-fonte'}.
        Não feche esta aba.</div></div>`;
      Api.gerarBackup(tipo)
        .then((info) => { toast(`Backup gerado: ${info.mb} MB, ${info.arquivos} arquivos.`); return carregar(estado.semanaRef); })
        .catch((err) => {
          toast(err.message, 'erro');
          if (alvo) alvo.innerHTML = `<div class="aviso"><span>${icone('alert')}</span><div>${esc(err.message)}</div></div>`;
          bk.disabled = false;
        });
      return;
    }

    const et = e.target.closest('[data-etapa][data-etapa-id]');
    if (et) {
      const qual = et.dataset.etapaId;
      if (!confirm(`Aprovar a etapa "${qual}"?\nData, versão e responsável ficam registrados.\nIsso NÃO autoriza publicação.`)) return;
      Api.aprovarEtapa(et.dataset.id, { etapa: qual })
        .then(() => { toast('Etapa aprovada e registrada.'); fecharModal(); return carregar(estado.semanaRef); })
        .catch((err) => toast(err.message, 'erro'));
      return;
    }

    const pub = e.target.closest('[data-pub]');
    if (pub) {
      const orient = pub.dataset.pub === 'aprovar' ? '' : (prompt('Descreva as orientações:') || '');
      if (pub.dataset.pub !== 'aprovar' && !orient) return;
      if (!confirm(`Confirmar "${pub.dataset.pub}" na publicação final?\nNada será publicado nesta etapa.`)) return;
      Api.decidirPublicacao(pub.dataset.id, { decisao: pub.dataset.pub, orientacoes: orient })
        .then(() => { toast('Decisão registrada.'); fecharModal(); return carregar(estado.semanaRef); })
        .catch((err) => toast(err.message, 'erro'));
      return;
    }

    const det = e.target.closest('[data-detalhe]');
    if (det) return abrirDetalhe(det.dataset.detalhe);

    const re = e.target.closest('[data-reenviar]');
    if (re) return reenviar(re.dataset.reenviar, re);

    const dec = e.target.closest('[data-decidir]');
    if (dec) {
      const id = dec.dataset.id;
      const item = (estado.dados.conteudosDetalhe || []).find((c) => c.id === id);
      if (item && item.status === 'aprovacao') {
        return abrirDetalhe(id);
      }
      const campo = $('#orientacoes');
      const orientacoes = campo ? campo.value : '';
      if (dec.dataset.decidir !== 'aprovar' && !orientacoes.trim()) {
        toast('Descreva as orientações antes de continuar.', 'erro');
        if (campo) campo.focus();
        return;
      }
      return decidir(dec.dataset.id, dec.dataset.decidir, orientacoes, dec);
    }
  });

  document.addEventListener('click', (e) => {
    const novo = e.target.closest('#btn-novo-produto');
    if (novo) {
      const f = $('#form-produto-wrap');
      if (f) { f.style.display = f.style.display === 'none' ? 'block' : 'none'; }
      return;
    }
    const ed = e.target.closest('[data-editar-produto]');
    if (ed) {
      const p = ((estado.dados.produtos || {}).itens || []).find((x) => x.id === ed.dataset.editarProduto);
      if (!p) return;
      const nome = prompt('Nome do produto:', p.nome);
      if (nome == null) return;
      const desc = prompt('Descrição:', p.descricao || '');
      Api.atualizarProduto(p.id, { nome, descricao: desc == null ? p.descricao : desc })
        .then(() => { toast('Produto atualizado.'); return carregar(estado.semanaRef); })
        .catch((err) => toast(err.message, 'erro'));
      return;
    }
    const st = e.target.closest('[data-status-produto]');
    if (st) {
      const p = ((estado.dados.produtos || {}).itens || []).find((x) => x.id === st.dataset.statusProduto);
      if (!p) return;
      const novoStatus = p.status === 'ativo' ? 'desativado' : 'ativo';
      Api.atualizarProduto(p.id, { status: novoStatus })
        .then(() => { toast(`Produto ${novoStatus}.`); return carregar(estado.semanaRef); })
        .catch((err) => toast(err.message, 'erro'));
      return;
    }
    const aj = e.target.closest('[data-ajuste-arte]');
    if (aj) {
      const txt = prompt('Descreva o ajuste desejado nesta arte:');
      if (!txt) return;
      toast('Ajuste registrado. A arte segue aguardando aprovação.');
      return;
    }
  });

  document.addEventListener('submit', (e) => {
    if (e.target.id === 'form-produto') {
      e.preventDefault();
      const fd = new FormData(e.target);
      Api.criarProduto({
        nome: fd.get('nome'), descricao: fd.get('descricao'),
        cor: fd.get('cor'), site: fd.get('site') || null, hora: fd.get('hora') || '18:00',
      })
        .then(() => { toast('Produto criado com calendário e biblioteca próprios.'); e.target.reset(); return carregar(estado.semanaRef); })
        .catch((err) => toast(err.message, 'erro'));
      return;
    }
    if (e.target.id === 'form-conteudo') {
      e.preventDefault();
      criarConteudo(e.target);
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'busca') {
      estado.busca = e.target.value;
      const corpo = $('#corpo');
      const pos = e.target.selectionStart;
      render();
      const novo = $('#busca');
      if (novo) { novo.focus(); novo.setSelectionRange(pos, pos); }
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'filtro-canal') { estado.filtroCanal = e.target.value; render(); }
    if (e.target.id === 'filtro-status') { estado.filtroStatus = e.target.value; render(); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharModal();
  });

  document.getElementById('btn-atualizar').addEventListener('click', () => carregar(estado.semanaRef));

  /* ------------------------------ início ------------------------------ */

  const agora = new Date();
  document.getElementById('data-hoje').textContent = agora.toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'long', year: 'numeric',
  }).replace('.', '');

  Api.aoMudarModo(() => atualizarIndicadorModo());

  carregar();
})();
