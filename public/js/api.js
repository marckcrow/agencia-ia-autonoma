/* Cliente de dados do painel — Etapa 2.
 *
 * Modo padrão: API ao vivo (permite gravar decisões de direção).
 * Modo alternativo: snapshot estático em /api/*.json (somente leitura),
 * usado apenas quando não há servidor disponível — por exemplo numa vitrine
 * estática publicada na nuvem. A interface avisa quando está nesse modo.
 */
window.Api = (function () {
  let modo = 'desconhecido'; // 'vivo' | 'estatico'
  const ouvintes = [];

  function avisarModo() {
    ouvintes.forEach((fn) => {
      try { fn(modo); } catch (_) {}
    });
  }

  const paraVivo = () => new URLSearchParams(location.search).get('api') !== 'estatica';

  async function requisitar(caminho, opcoes) {
    const r = await fetch('/api' + caminho, Object.assign(
      { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } },
      opcoes || {}
    ));
    const texto = await r.text();
    let corpo = null;
    try { corpo = texto ? JSON.parse(texto) : null; } catch (_) { corpo = null; }
    if (!r.ok) {
      const msg = (corpo && corpo.erro) || `Falha (HTTP ${r.status})`;
      throw Object.assign(new Error(msg), { status: r.status, detalhes: corpo && corpo.detalhes, corpo });
    }
    return corpo;
  }

  async function estatico(arquivo) {
    const r = await fetch('/api/' + arquivo, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`Não foi possível carregar ${arquivo} (HTTP ${r.status})`);
    return r.json();
  }

  /** Lê da API ao vivo; se não existir, cai no snapshot estático. */
  async function ler(caminho, arquivo, valido) {
    if (paraVivo()) {
      try {
        const j = await requisitar(caminho);
        if (!valido || valido(j)) {
          if (modo !== 'vivo') { modo = 'vivo'; avisarModo(); }
          return j;
        }
      } catch (e) {
        if (e.status === 400 || e.status === 404 || e.status === 409) throw e;
        /* servidor ausente: tenta o snapshot */
      }
    }
    const j2 = await estatico(arquivo);
    if (valido && !valido(j2)) throw new Error(`Dados inválidos em ${arquivo}`);
    if (modo !== 'estatico') { modo = 'estatico'; avisarModo(); }
    return j2;
  }

  /** Escreve apenas via API ao vivo — gravação exige servidor. */
  function escrever(caminho, corpo) {
    if (!paraVivo()) {
      return Promise.reject(new Error('Modo estático: gravação indisponível. Inicie o servidor do painel.'));
    }
    return requisitar(caminho, { method: 'POST', body: JSON.stringify(corpo || {}) });
  }

  /** Remove (DELETE) apenas via API ao vivo. */
  function remover(caminho) {
    if (!paraVivo()) {
      return Promise.reject(new Error('Modo estatico: gravacao indisponivel. Inicie o servidor do painel.'));
    }
    return requisitar(caminho, { method: 'DELETE' });
  }

  return {
    modo: () => modo,
    aoMudarModo: (fn) => ouvintes.push(fn),

    estado: (semana) =>
      ler(`/estado${semana ? '?semana=' + semana : ''}`, 'estado.json',
        (j) => j && j.semana && j.indicadores),
    calendario: (semana) =>
      ler(`/calendario${semana ? '?semana=' + semana : ''}`, 'calendario.json',
        (j) => j && Array.isArray(j.slots)),
    canais: () => ler('/canais', 'canais.json', Array.isArray),
    agentes: () => ler('/agentes', 'agentes.json', Array.isArray),
    integracoes: () => ler('/integracoes', 'integracoes.json', Array.isArray),
    pendentes: () => ler('/pendentes', 'pendentes.json', Array.isArray),
    conteudos: (filtro) => {
      const q = filtro ? '?' + new URLSearchParams(filtro).toString() : '';
      return ler('/conteudos' + q, 'conteudos.json', Array.isArray);
    },
    conteudo: (id) => ler(`/conteudos/${encodeURIComponent(id)}`, 'conteudos.json',
      (j) => Array.isArray(j) || (j && j.conteudo)),
    decisoes: () => ler('/decisoes', 'decisoes.json', Array.isArray),
    execucoes: () => ler('/execucoes', 'execucoes.json', Array.isArray),
    avaliacoes: () => ler('/avaliacoes', 'avaliacoes.json', Array.isArray),
    calendarios: () => ler('/calendarios', 'calendarios.json', Array.isArray),
    vozes: () => ler('/vozes', 'vozes.json', (j) => j && j.canais),
    estudio: () => ler('/estudio', 'estudio.json', (j) => j && j.estudio),
    produtos: () => ler('/produtos', 'produtos.json', (j) => j && j.itens),
    previas: () => ler('/previas', 'previas.json', (j) => j && typeof j === 'object'),
    aprovacoes: () => ler('/aprovacoes', 'aprovacoes.json', (j) => j && j.etapas),
    backups: () => ler('/backups', 'backups.json', (j) => j && j.backups),
    gerarBackup: (tipo) => escrever('/backup/gerar', { tipo }),
    regrasAgentes: () => ler('/agentes/regras', 'regras-agentes.json', (j) => j && j.blocosRoteiro),
    historico: () => ler('/historico', 'estado.json', (j) => j && j.historico),

    criarConteudo: (dados) => escrever('/conteudos', dados),
    decidir: (id, dados) => escrever(`/conteudos/${encodeURIComponent(id)}/decisao`, dados),
    reenviar: (id, dados) => escrever(`/conteudos/${encodeURIComponent(id)}/reenviar`, dados),
    agendarSlot: (id, dados) => escrever(`/conteudos/${encodeURIComponent(id)}/slot`, dados),
    desagendarSlot: (id) => remover(`/conteudos/${encodeURIComponent(id)}/slot`),

    criarPauta: (dados) => escrever('/agentes/pautas', dados),
    criarRoteiro: (pautaId, dados) => escrever(`/agentes/pautas/${encodeURIComponent(pautaId)}/roteiro`, dados),
    avaliarPauta: (pautaId, dados) => escrever(`/agentes/pautas/${encodeURIComponent(pautaId)}/avaliacao`, dados),
    registrarCalendario: (dados) => escrever('/agentes/calendario', dados),
    criarProduto: (dados) => escrever('/produtos', dados),
    atualizarProduto: (id, dados) => escrever(`/produtos/${encodeURIComponent(id)}`, dados),
    decidirPublicacao: (id, dados) => escrever(`/conteudos/${encodeURIComponent(id)}/publicacao`, dados),
    aprovarEtapa: (id, dados) => escrever(`/conteudos/${encodeURIComponent(id)}/etapa`, dados),
    abrirExecucao: (dados) => escrever('/agentes/execucoes', dados),
    encerrarExecucao: (id, dados) => escrever(`/agentes/execucoes/${encodeURIComponent(id)}/encerrar`, dados),

    /* ----- Etapa 4B: interfaces dos agentes ----- */
    statusProvedor: () => ler('/agentes/provedor', 'agentes-provedor.json', (j) => j && typeof j.configurado === 'boolean'),
    statusAgendador: () => ler('/agentes/agendador', 'agentes-agendador.json', (j) => j && typeof j.ativo === 'boolean'),
    rascunhoPauta: (dados) => escrever('/agentes/rascunho/pauta', dados),
    rascunhoRoteiro: (dados) => escrever('/agentes/rascunho/roteiro', dados),
    rascunhoAvaliacao: (dados) => escrever('/agentes/rascunho/avaliacao', dados),
    alternarAgendador: (dados) => escrever('/agentes/agendador', dados),
    execucao: (id) => ler(`/execucoes/${encodeURIComponent(id)}`, 'execucoes.json', (j) => j && j.execucao),
  };
})();
