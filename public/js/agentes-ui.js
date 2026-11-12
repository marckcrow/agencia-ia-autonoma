/* ============================================================
   Console dos agentes A1, A2 e A3 — Etapa 4B.

   Módulo isolado: o painel.js só chama `AgentesUI.montar(raiz, ctx)`.
   Nada aqui publica, nada aqui aprova e nada aqui apaga conteúdo.
   O agente escreve rascunho; a validação determinística do servidor
   continua sendo o filtro; a decisão continua sendo humana.

   O provedor de IA é configurado por variável de ambiente no SERVIDOR
   (IA_PROVEDOR, IA_BASE_URL, IA_API_KEY, IA_MODELO). A chave nunca chega
   ao navegador: este módulo só recebe status público do provedor.
   ============================================================ */
window.AgentesUI = (function () {
  'use strict';

  const DIAS_NOME = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  let ctx = null;            // { aba, dados, recarregar, toast }
  let provedor = null;       // status público do provedor
  let agendador = null;      // status do agendador
  let semana = null;         // grade do calendário da semana
  let execucoes = [];        // histórico de execuções
  let alvo = null;           // container onde o console é desenhado

  /* ------------------------------ utilidades ------------------------------ */

  const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const num = (v, padrao) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : padrao;
  };

  const dataHora = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch (_) {
      return String(iso);
    }
  };

  const toast = (msg, tipo) => { if (ctx && ctx.toast) ctx.toast(msg, tipo); };

  function mensagemErro(e) {
    const det = e && e.detalhes;
    if (Array.isArray(det) && det.length) return `${e.message} — ${det.join('; ')}`;
    return (e && e.message) || 'Falha inesperada';
  }

  function canais() {
    return (ctx && ctx.dados && ctx.dados.canais) || [];
  }

  function conteudos() {
    return (ctx && ctx.dados && ctx.dados.conteudosDetalhe) || [];
  }

  function canal(id) {
    return canais().find((c) => c.id === id) || null;
  }

  function conteudo(id) {
    return conteudos().find((c) => c.id === id) || null;
  }

  /* ------------------------------ blocos HTML ------------------------------ */

  function blocoProvedor() {
    if (!provedor) {
      return `<div class="card"><div class="secao-titulo"><h2>Provedor de IA</h2></div>
        <p class="ficha-resumo">Carregando status…</p></div>`;
    }
    if (!provedor.configurado) {
      return `<div class="card">
        <div class="secao-titulo"><h2>Provedor de IA</h2><span class="chip">modo determinístico</span></div>
        <p class="ficha-resumo">Nenhum provedor configurado no servidor. Os agentes continuam
        funcionando de forma determinística: você preenche o formulário e registra na mão.
        Para ativar o rascunho automático, configure no servidor as variáveis
        <code>IA_PROVEDOR</code>, <code>IA_BASE_URL</code>, <code>IA_API_KEY</code> e <code>IA_MODELO</code>
        e reinicie o processo. A chave nunca é enviada ao navegador.</p>
      </div>`;
    }
    return `<div class="card">
      <div class="secao-titulo"><h2>Provedor de IA</h2><span class="chip">ativo</span></div>
      <div class="pauta-campos">
        <div><b>Provedor</b><span>${esc(provedor.provedor || '—')}</span></div>
        <div><b>Modelo</b><span>${esc(provedor.modelo || '—')}</span></div>
        <div><b>Endpoint</b><span>${esc(provedor.host || '—')}</span></div>
      </div>
      <p class="ficha-resumo">O rascunho gerado ainda passa pelas validações do servidor
      (fontes verificáveis, blocos de roteiro obrigatórios, alertas do A2) e só é salvo
      quando você confirma. A chave fica no servidor.</p>
    </div>`;
  }

  function blocoAgendador() {
    const a = agendador || {};
    return `<div class="card">
      <div class="secao-titulo"><h2>Agendador automático</h2>
        <span class="chip ${a.ativo ? 'moeda' : ''}">${a.ativo ? 'ligado' : 'desligado'}</span></div>
      <p class="ficha-resumo">${esc(a.observacao || 'O agendador cria apenas rascunhos de pauta para a fila de aprovação humana — nunca publica e nunca aprova.')}
        ${a.proximaExecucao ? ` Próxima rodada: ${esc(dataHora(a.proximaExecucao))}.` : ''}</p>
      <div class="topo-acoes">
        <button type="button" class="btn btn-fantasma btn-sm" data-ag="alternar-agendador">
          ${a.ativo ? 'Desligar agendador' : 'Tentar ligar agendador'}
        </button>
      </div>
      <p class="ficha-resumo">Por padrão ele nasce desligado. Ligar exige
      <code>AGENDADOR_ATIVO=1</code> na inicialização do servidor — decisão consciente do operador.</p>
    </div>`;
  }

  function opcoesCanais(selecionado) {
    return canais().map((c) => `<option value="${esc(c.id)}" ${c.id === selecionado ? 'selected' : ''}>${esc(c.nome)}</option>`).join('');
  }

  function seletorPauta(id, filtroFn, vazio) {
    const lista = conteudos().filter((c) => c.tipo === 'pauta' && (!filtroFn || filtroFn(c)));
    if (!lista.length) return `<option value="">${esc(vazio || 'nenhuma pauta disponível')}</option>`;
    return lista.map((c) => `<option value="${esc(c.id)}" ${c.id === id ? 'selected' : ''}>${esc(c.titulo)}</option>`).join('');
  }

  function consoleA1() {
    return `<section class="console" data-console="A1">
      <div class="secao-titulo"><h2>A1 — Pauta</h2>
        <span class="dica">entrada: tema e canal · saída: pauta validada na fila de aprovação</span></div>
      <div class="grade grade-2">
        <form class="form-grade" id="form-a1">
          <label>Canal
            <select name="canalId">${opcoesCanais()}</select>
          </label>
          <label>Tema
            <input name="tema" type="text" placeholder="ex.: como usar IA para organizar a agenda da equipe" />
          </label>
          <label class="campo-largo">Contexto do operador
            <textarea name="contexto" rows="2" placeholder="Ângulo, restrições, o que não falar…"></textarea>
          </label>
          <label class="campo-largo">Título
            <input name="titulo" type="text" placeholder="(pode ser gerado pela IA)" />
          </label>
          <label class="campo-largo">Resumo
            <textarea name="resumo" rows="3"></textarea>
          </label>
          <label class="campo-largo">Corpo da pauta
            <textarea name="corpo" rows="4"></textarea>
          </label>
          <label>Público-alvo
            <input name="publicoAlvo" type="text" />
          </label>
          <label>Monetização
            <input name="monetizacao" type="text" />
          </label>
          <label class="campo-largo">Por que publicar agora
            <textarea name="justificativa" rows="2"></textarea>
          </label>
          <label>Potencial — originalidade (0-10)
            <input name="potOriginalidade" type="number" min="0" max="10" step="1" value="5" />
          </label>
          <label>Potencial — engajamento (0-10)
            <input name="potEngajamento" type="number" min="0" max="10" step="1" value="5" />
          </label>
          <label>Potencial — monetização (0-10)
            <input name="potMonetizacao" type="number" min="0" max="10" step="1" value="5" />
          </label>
          <label class="campo-largo">Fontes (uma por linha: URL | título)
            <textarea name="fontes" rows="3" placeholder="https://www.gov.br/... | Título da fonte"></textarea>
          </label>
          <div class="campo-largo topo-acoes">
            <button type="button" class="btn btn-primario btn-sm" data-ag="rascunho-pauta">
              Gerar rascunho com IA
            </button>
            <button type="button" class="btn btn-ok btn-sm" data-ag="salvar-pauta">
              Registrar pauta
            </button>
          </div>
        </form>
        <div class="console-resultado" id="a1-resultado"></div>
      </div>
    </section>`;
  }

  function consoleA2() {
    return `<section class="console" data-console="A2">
      <div class="secao-titulo"><h2>A2 — Avaliação e calendário</h2>
        <span class="dica">entrada: pauta do A1 · saída: parecer e proposta de calendário</span></div>
      <div class="grade grade-2">
        <form class="form-grade" id="form-a2">
          <label class="campo-largo">Pauta avaliada
            <select name="pautaId">${seletorPauta(null, (c) => ['aprovacao', 'corrigir_antes', 'pauta_aprovada'].includes(c.status), 'nenhuma pauta aguardando parecer')}</select>
          </label>
          <label>Originalidade (0-10)<input name="c_originalidade" type="number" min="0" max="10" value="5" /></label>
          <label>Confiabilidade (0-10)<input name="c_confiabilidade" type="number" min="0" max="10" value="5" /></label>
          <label>Audiência (0-10)<input name="c_audiencia" type="number" min="0" max="10" value="5" /></label>
          <label>Relevância (0-10)<input name="c_relevancia" type="number" min="0" max="10" value="5" /></label>
          <label>Monetização (0-10)<input name="c_monetizacao" type="number" min="0" max="10" value="5" /></label>
          <label>Nota final (0-100)<input name="notaFinal" type="number" min="0" max="100" value="50" /></label>
          <label>Veredito
            <select name="veredito">
              <option value="aprovavel">aprovavel</option>
              <option value="corrigir_antes">corrigir_antes</option>
              <option value="nao_recomendada">nao_recomendada</option>
            </select>
          </label>
          <label class="campo-largo">Verificação (obrigatória)
            <textarea name="verificacao" rows="3" placeholder="O que foi conferido, o que não foi, quais as ressalvas…"></textarea>
          </label>
          <label class="campo-largo">Alertas (um por linha)
            <textarea name="alertas" rows="2"></textarea>
          </label>
          <label class="campo-largo">Título sugerido
            <input name="tituloSugerido" type="text" />
          </label>
          <label>Prioridade
            <select name="prioridade"><option value="false">não</option><option value="true">sim</option></select>
          </label>
          <label class="campo-largo">Motivo da prioridade
            <input name="motivoPrioridade" type="text" />
          </label>
          <div class="campo-largo topo-acoes">
            <button type="button" class="btn btn-primario btn-sm" data-ag="rascunho-avaliacao">
              Gerar parecer com IA
            </button>
            <button type="button" class="btn btn-ok btn-sm" data-ag="salvar-avaliacao">
              Registrar parecer
            </button>
          </div>
        </form>
        <div class="console-resultado" id="a2-resultado"></div>
      </div>

      <div class="secao-titulo"><h3>Proposta de calendário editorial</h3>
        <span class="dica">a proposta fica registrada; nada é agendado sem sua decisão</span></div>
      <form class="form-grade" id="form-a2-cal">
        <label>Semana de referência (segunda-feira)
          <input name="semana" type="date" />
        </label>
        <label>Canal
          <select name="canalId">${opcoesCanais()}</select>
        </label>
        <label>Dia
          <select name="dia">
            <option value="1">Segunda</option><option value="2">Terça</option><option value="3">Quarta</option>
            <option value="4">Quinta</option><option value="5">Sexta</option><option value="6">Sábado</option>
            <option value="7">Domingo</option>
          </select>
        </label>
        <label>Hora
          <input name="hora" type="time" value="18:00" />
        </label>
        <label class="campo-largo">Pauta
          <select name="pautaId">${seletorPauta(null, (c) => c.status === 'pauta_aprovada', 'nenhuma pauta aprovada pela direção')}</select>
        </label>
        <label class="campo-largo">Observação
          <input name="observacao" type="text" placeholder="Por que este encaixe" />
        </label>
        <div class="campo-largo topo-acoes">
          <button type="button" class="btn btn-primario btn-sm" data-ag="propor-calendario">
            Registrar proposta de calendário
          </button>
        </div>
      </form>
    </section>`;
  }

  function consoleA3() {
    const aprovadas = conteudos().filter((c) => c.tipo === 'pauta' && c.status === 'pauta_aprovada');
    return `<section class="console" data-console="A3">
      <div class="secao-titulo"><h2>A3 — Roteiro e slot</h2>
        <span class="dica">entrada: pauta aprovada pela Direção · saída: roteiro validado</span></div>
      <div class="grade grade-2">
        <form class="form-grade" id="form-a3">
          <label class="campo-largo">Pauta aprovada
            <select name="pautaId">${seletorPauta(null, (c) => c.status === 'pauta_aprovada', 'nenhuma pauta aprovada ainda')}</select>
          </label>
          <label class="campo-largo">Abertura impactante
            <textarea name="b_abertura" rows="2"></textarea>
          </label>
          <label class="campo-largo">Desenvolvimento
            <textarea name="b_desenvolvimento" rows="4"></textarea>
          </label>
          <label class="campo-largo">Encerramento
            <textarea name="b_encerramento" rows="2"></textarea>
          </label>
          <label class="campo-largo">Sugestões visuais
            <textarea name="b_visual" rows="3"></textarea>
          </label>
          <label class="campo-largo">Chamada para ação
            <textarea name="b_cta" rows="2"></textarea>
          </label>
          <label class="campo-largo">Legenda
            <input name="legenda" type="text" />
          </label>
          <label class="campo-largo">Hashtags (separadas por espaço)
            <input name="hashtags" type="text" placeholder="#ia #automacao" />
          </label>
          <div class="campo-largo topo-acoes">
            <button type="button" class="btn btn-primario btn-sm" data-ag="rascunho-roteiro">
              Gerar roteiro com IA
            </button>
            <button type="button" class="btn btn-ok btn-sm" data-ag="salvar-roteiro">
              Registrar roteiro
            </button>
          </div>
        </form>
        <div class="console-resultado" id="a3-resultado"></div>
      </div>

      <div class="secao-titulo"><h3>Vincular conteúdo aprovado ao calendário</h3>
        <span class="dica">agendar não é publicar: o slot fica reservado para a produção</span></div>
      <form class="form-grade" id="form-a3-slot">
        <label class="campo-largo">Conteúdo aprovado
          <select name="conteudoId">
            ${conteudos()
              .filter((c) => ['aprovado', 'aprovado_final', 'pauta_aprovada'].includes(c.status))
              .map((c) => `<option value="${esc(c.id)}">${esc(c.titulo)} — ${esc((canal(c.canalId) || {}).nome || c.canalId)}</option>`)
              .join('') || '<option value="">nenhum conteúdo aprovado</option>'}
          </select>
        </label>
        <label class="campo-largo">Slot da semana
          <select name="slot">
            ${slotsLivres()}
          </select>
        </label>
        <div class="campo-largo topo-acoes">
          <button type="button" class="btn btn-primario btn-sm" data-ag="agendar-slot">Reservar slot</button>
          <button type="button" class="btn btn-fantasma btn-sm" data-ag="desagendar-slot">Liberar slot do conteúdo</button>
        </div>
      </form>
      ${listaAgendados()}
    </section>`;
  }

  function slotsLivres() {
    const slots = (semana && semana.slots) || [];
    const livres = slots.filter((s) => !s.conteudoId);
    if (!livres.length) return '<option value="">nenhum slot livre nesta semana</option>';
    return livres.map((s) => `<option value="${esc(s.data)}|${esc(s.hora)}">${esc(s.diaSemana)} ${esc(s.data)} ${esc(s.hora)} — ${esc(s.canalNome)}</option>`).join('');
  }

  function listaAgendados() {
    const agendados = conteudos().filter((c) => c.slot);
    if (!agendados.length) {
      return '<p class="ficha-resumo">Nenhum conteúdo vinculado a um slot nesta semana.</p>';
    }
    return `<div class="tabela-wrap"><table class="tabela">
      <thead><tr><th>Conteúdo</th><th>Canal</th><th>Slot</th><th>Status</th><th></th></tr></thead>
      <tbody>${agendados.map((c) => `<tr>
        <td>${esc(c.titulo)}</td>
        <td>${esc((canal(c.canalId) || {}).nome || c.canalId)}</td>
        <td>${esc(c.slot.data)} ${esc(c.slot.hora)}</td>
        <td>${esc(c.status)}</td>
        <td><button type="button" class="btn btn-fantasma btn-sm" data-ag="desagendar-slot" data-id="${esc(c.id)}">Liberar</button></td>
      </tr>`).join('')}</tbody></table></div>`;
  }

  function blocoExecucoes() {
    const lista = (execucoes || []).slice().reverse();
    if (!lista.length) {
      return `<section class="console" data-console="execucoes">
        <div class="secao-titulo"><h2>Execuções dos agentes</h2></div>
        <p class="ficha-resumo">Nenhuma execução registrada ainda.</p></section>`;
    }
    return `<section class="console" data-console="execucoes">
      <div class="secao-titulo"><h2>Execuções dos agentes</h2>
        <span class="dica">entrada, saída, fontes, custo e status de cada rodada</span></div>
      <div class="tabela-wrap"><table class="tabela">
        <thead><tr><th>Agente</th><th>Entrada</th><th>Início</th><th>Fim</th><th>Créditos</th><th>Itens</th><th>Status</th><th></th></tr></thead>
        <tbody>${lista.map((e) => `<tr>
          <td><b>${esc(e.agente)}</b></td>
          <td>${esc(e.descricao || '—')}</td>
          <td>${esc(dataHora(e.iniciadaEm))}</td>
          <td>${esc(dataHora(e.encerradaEm))}</td>
          <td>${esc(e.creditos || 0)}</td>
          <td>${esc(e.itensGerados || 0)}</td>
          <td>${esc(e.status || '—')}</td>
          <td><button type="button" class="btn btn-fantasma btn-sm" data-ag="ver-execucao" data-id="${esc(e.id)}">Detalhes</button></td>
        </tr>`).join('')}</tbody></table></div>
      <div class="console-resultado" id="exec-detalhe"></div>
    </section>`;
  }

  function html() {
    return `<div class="console-agentes">
      <div class="grade grade-2">
        ${blocoProvedor()}
        ${blocoAgendador()}
      </div>
      ${consoleA1()}
      ${consoleA2()}
      ${consoleA3()}
      ${blocoExecucoes()}
      <div class="aviso neutro">
        <span>⚠</span>
        <div><b>Nenhuma ação deste console publica conteúdo.</b> Os agentes produzem rascunhos,
        o servidor valida e você decide. As quatro etapas de aprovação continuam valendo e a
        <code>publicacaoAutomatica</code> permanece <code>false</code>.</div>
      </div>
    </div>`;
  }

  /* ------------------------------ ações ------------------------------ */

  function formValores(id) {
    const f = document.getElementById(id);
    if (!f) return {};
    const out = {};
    new FormData(f).forEach((v, k) => { out[k] = v; });
    return out;
  }

  function setValor(id, nome, valor) {
    const f = document.getElementById(id);
    if (!f) return;
    const el = f.elements[nome];
    if (el) el.value = valor;
  }

  function resultado(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function avisoPendencias(pendencias) {
    if (!pendencias || !pendencias.length) {
      return '<div class="aviso"><span>✔</span><div>Rascunho pronto e dentro das regras do servidor.</div></div>';
    }
    return `<div class="aviso"><span>⚠</span><div><b>Pendências do servidor:</b>
      <ul>${pendencias.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
      Corrija antes de registrar — o servidor vai recusar de novo.</div></div>`;
  }

  function lerFontes(texto) {
    return String(texto || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [url, ...resto] = l.split('|');
        return { url: (url || '').trim(), titulo: resto.join('|').trim() || (url || '').trim() };
      })
      .filter((f) => f.url);
  }

  async function acaoRascunhoPauta() {
    const v = formValores('form-a1');
    if (!v.tema) { toast('Informe o tema da pauta.', 'erro'); return; }
    const c = canal(v.canalId);
    try {
      const r = await Api.rascunhoPauta({
        canalId: v.canalId,
        canal: c ? c.nome : v.canalId,
        tema: v.tema,
        contexto: v.contexto || '',
      });
      const b = r.rascunho || {};
      setValor('form-a1', 'titulo', b.titulo || '');
      setValor('form-a1', 'resumo', b.resumo || '');
      setValor('form-a1', 'corpo', b.corpo || '');
      setValor('form-a1', 'publicoAlvo', b.publicoAlvo || '');
      setValor('form-a1', 'monetizacao', b.monetizacao || '');
      setValor('form-a1', 'justificativa', b.justificativa || '');
      setValor('form-a1', 'potOriginalidade', num(b.potencial && b.potencial.originalidade, 5));
      setValor('form-a1', 'potEngajamento', num(b.potencial && b.potencial.engajamento, 5));
      setValor('form-a1', 'potMonetizacao', num(b.potencial && b.potencial.monetizacao, 5));
      setValor('form-a1', 'fontes', (b.fontes || []).map((f) => `${f.url} | ${f.titulo || ''}`).join('\n'));
      resultado('a1-resultado',
        `${avisoPendencias(r.validacao && r.validacao.erros)}<p class="ficha-resumo">Rascunho gerado pela IA e
        <b>não salvo</b>. Confira, ajuste e clique em “Registrar pauta”. Execução: ${esc(r.execucaoId || '')}.</p>`);
      toast('Rascunho gerado. Revise antes de registrar.');
    } catch (e) {
      resultado('a1-resultado', `<div class="aviso"><span>⚠</span><div>${esc(mensagemErro(e))}</div></div>`);
      toast(mensagemErro(e), 'erro');
    }
  }

  async function acaoSalvarPauta() {
    const v = formValores('form-a1');
    const payload = {
      canalId: v.canalId,
      titulo: (v.titulo || '').trim(),
      resumo: (v.resumo || '').trim(),
      corpo: (v.corpo || '').trim(),
      publicoAlvo: (v.publicoAlvo || '').trim(),
      monetizacao: (v.monetizacao || '').trim(),
      justificativa: (v.justificativa || '').trim(),
      potencial: {
        originalidade: num(v.potOriginalidade, 0),
        engajamento: num(v.potEngajamento, 0),
        monetizacao: num(v.potMonetizacao, 0),
      },
      fontes: lerFontes(v.fontes),
      origem: 'a1',
    };
    try {
      const pauta = await Api.criarPauta(payload);
      resultado('a1-resultado', `<div class="aviso"><span>✔</span><div>Pauta registrada (${esc(pauta.id)}).
        Ela entra na fila de aprovação humana — nada foi publicado.</div></div>`);
      toast('Pauta registrada na fila de aprovação.');
      recarregar();
    } catch (e) {
      resultado('a1-resultado', `<div class="aviso"><span>⚠</span><div>${esc(mensagemErro(e))}</div></div>`);
      toast(mensagemErro(e), 'erro');
    }
  }

  async function acaoRascunhoAvaliacao() {
    const v = formValores('form-a2');
    if (!v.pautaId) { toast('Escolha a pauta a avaliar.', 'erro'); return; }
    try {
      const r = await Api.rascunhoAvaliacao({ pautaId: v.pautaId });
      const b = r.rascunho || {};
      const crit = b.criticos || {};
      setValor('form-a2', 'c_originalidade', num(crit.originalidade, 5));
      setValor('form-a2', 'c_confiabilidade', num(crit.confiabilidade, 5));
      setValor('form-a2', 'c_audiencia', num(crit.audiencia, 5));
      setValor('form-a2', 'c_relevancia', num(crit.relevancia, 5));
      setValor('form-a2', 'c_monetizacao', num(crit.monetizacao, 5));
      setValor('form-a2', 'notaFinal', num(b.notaFinal, 50));
      setValor('form-a2', 'veredito', b.veredito || 'corrigir_antes');
      setValor('form-a2', 'verificacao', b.verificacao || '');
      setValor('form-a2', 'alertas', (b.alertas || []).join('\n'));
      setValor('form-a2', 'tituloSugerido', b.tituloSugerido || '');
      setValor('form-a2', 'prioridade', b.prioridade ? 'true' : 'false');
      setValor('form-a2', 'motivoPrioridade', b.motivoPrioridade || '');
      resultado('a2-resultado',
        `${avisoPendencias(r.validacao && r.validacao.erros)}<p class="ficha-resumo">Parecer rascunhado e
        <b>não salvo</b>. O A2 não aprova nada: o registro do parecer é apenas o parecer.</p>`);
      toast('Parecer rascunhado. Revise antes de registrar.');
    } catch (e) {
      resultado('a2-resultado', `<div class="aviso"><span>⚠</span><div>${esc(mensagemErro(e))}</div></div>`);
      toast(mensagemErro(e), 'erro');
    }
  }

  async function acaoSalvarAvaliacao() {
    const v = formValores('form-a2');
    if (!v.pautaId) { toast('Escolha a pauta a avaliar.', 'erro'); return; }
    const payload = {
      criticos: {
        originalidade: num(v.c_originalidade, 0),
        confiabilidade: num(v.c_confiabilidade, 0),
        audiencia: num(v.c_audiencia, 0),
        relevancia: num(v.c_relevancia, 0),
        monetizacao: num(v.c_monetizacao, 0),
      },
      notaFinal: num(v.notaFinal, 0),
      veredito: v.veredito || 'corrigir_antes',
      verificacao: (v.verificacao || '').trim(),
      alertas: String(v.alertas || '').split('\n').map((s) => s.trim()).filter(Boolean),
      tituloSugerido: (v.tituloSugerido || '').trim() || null,
      prioridade: v.prioridade === 'true',
      motivoPrioridade: (v.motivoPrioridade || '').trim() || null,
    };
    try {
      const aval = await Api.avaliarPauta(v.pautaId, payload);
      resultado('a2-resultado', `<div class="aviso"><span>✔</span><div>Parecer registrado (${esc(aval.id)}).
        A decisão continua na Sala de Direção.</div></div>`);
      toast('Parecer do A2 registrado.');
      recarregar();
    } catch (e) {
      resultado('a2-resultado', `<div class="aviso"><span>⚠</span><div>${esc(mensagemErro(e))}</div></div>`);
      toast(mensagemErro(e), 'erro');
    }
  }

  async function acaoRascunhoRoteiro() {
    const v = formValores('form-a3');
    if (!v.pautaId) { toast('Escolha a pauta aprovada.', 'erro'); return; }
    try {
      const r = await Api.rascunhoRoteiro({ pautaId: v.pautaId });
      const b = (r.rascunho && r.rascunho.blocos) || {};
      setValor('form-a3', 'b_abertura', b.abertura || '');
      setValor('form-a3', 'b_desenvolvimento', b.desenvolvimento || '');
      setValor('form-a3', 'b_encerramento', b.encerramento || '');
      setValor('form-a3', 'b_visual', b.visual || '');
      setValor('form-a3', 'b_cta', b.cta || '');
      setValor('form-a3', 'legenda', (r.rascunho && r.rascunho.legenda) || '');
      setValor('form-a3', 'hashtags', ((r.rascunho && r.rascunho.hashtags) || []).join(' '));
      resultado('a3-resultado',
        `${avisoPendencias(r.validacao && r.validacao.erros)}<p class="ficha-resumo">Roteiro rascunhado e
        <b>não salvo</b>. Os cinco blocos são obrigatórios.</p>`);
      toast('Roteiro rascunhado. Revise antes de registrar.');
    } catch (e) {
      resultado('a3-resultado', `<div class="aviso"><span>⚠</span><div>${esc(mensagemErro(e))}</div></div>`);
      toast(mensagemErro(e), 'erro');
    }
  }

  async function acaoSalvarRoteiro() {
    const v = formValores('form-a3');
    if (!v.pautaId) { toast('Escolha a pauta aprovada.', 'erro'); return; }
    const payload = {
      blocos: {
        abertura: (v.b_abertura || '').trim(),
        desenvolvimento: (v.b_desenvolvimento || '').trim(),
        encerramento: (v.b_encerramento || '').trim(),
        visual: (v.b_visual || '').trim(),
        cta: (v.b_cta || '').trim(),
      },
      legenda: (v.legenda || '').trim() || null,
      hashtags: String(v.hashtags || '').split(/[\s,]+/).filter(Boolean),
    };
    try {
      const r = await Api.criarRoteiro(v.pautaId, payload);
      resultado('a3-resultado', `<div class="aviso"><span>✔</span><div>Roteiro registrado (${esc(r.id)}).
        Ele entra na fila de aprovação — nada foi publicado.</div></div>`);
      toast('Roteiro registrado na fila de aprovação.');
      recarregar();
    } catch (e) {
      resultado('a3-resultado', `<div class="aviso"><span>⚠</span><div>${esc(mensagemErro(e))}</div></div>`);
      toast(mensagemErro(e), 'erro');
    }
  }

  async function acaoProporCalendario() {
    const v = formValores('form-a2-cal');
    const semanaRef = v.semana || '';
    const pauta = conteudo(v.pautaId);
    try {
      const proposta = await Api.registrarCalendario({
        observacao: (v.observacao || '').trim() || 'Proposta registrada pelo console de agentes.',
        semanas: [{
          semana: semanaRef,
          foco: (v.observacao || '').trim(),
          slots: [{
            canalId: v.canalId,
            dia: v.dia,
            hora: v.hora,
            pautaId: v.pautaId || null,
            titulo: pauta ? pauta.titulo : '',
          }],
        }],
      });
      toast(`Proposta de calendário registrada (${proposta.id}). Ela não agenda nada sozinha.`);
      recarregar();
    } catch (e) {
      toast(mensagemErro(e), 'erro');
    }
  }

  async function acaoAgendarSlot() {
    const v = formValores('form-a3-slot');
    if (!v.conteudoId) { toast('Escolha o conteúdo aprovado.', 'erro'); return; }
    if (!v.slot) { toast('Escolha um slot livre.', 'erro'); return; }
    const [data, hora] = String(v.slot).split('|');
    try {
      await Api.agendarSlot(v.conteudoId, { data, hora });
      toast('Slot reservado. Agendar não é publicar.');
      recarregar();
    } catch (e) {
      toast(mensagemErro(e), 'erro');
    }
  }

  async function acaoDesagendarSlot(id) {
    const conteudoId = id || formValores('form-a3-slot').conteudoId;
    if (!conteudoId) { toast('Escolha o conteúdo a liberar.', 'erro'); return; }
    try {
      await Api.desagendarSlot(conteudoId);
      toast('Slot liberado. O conteúdo e as decisões continuam no banco.');
      recarregar();
    } catch (e) {
      toast(mensagemErro(e), 'erro');
    }
  }

  async function acaoVerExecucao(id) {
    try {
      const r = await Api.execucao(id);
      const e = r.execucao || {};
      const gerados = r.conteudos || [];
      const avals = r.avaliacoes || [];
      const hist = r.historico || [];
      resultado('exec-detalhe', `
        <div class="card">
          <div class="secao-titulo"><h3>Execução ${esc(e.agente || '')} — ${esc(e.status || '')}</h3></div>
          <div class="pauta-campos">
            <div><b>Entrada</b><span>${esc(e.descricao || '—')}</span></div>
            <div><b>Início</b><span>${esc(dataHora(e.iniciadaEm))}</span></div>
            <div><b>Fim</b><span>${esc(dataHora(e.encerradaEm))}</span></div>
            <div><b>Créditos consumidos</b><span>${esc(e.creditos || 0)}</span></div>
            <div><b>Itens gerados</b><span>${esc(e.itensGerados || 0)}</span></div>
            <div><b>Chamadas ao provedor</b><span>${esc(e.chamadasProvedor || 0)}</span></div>
          </div>
          ${e.observacao ? `<p class="ficha-resumo">${esc(e.observacao)}</p>` : ''}
          ${e.uso ? `<p class="ficha-resumo">Uso do provedor: ${esc(JSON.stringify(e.uso))}</p>` : ''}
          ${gerados.length ? `<h4>Saídas</h4>${gerados.map((c) => `<div class="ficha">
            <header class="ficha-topo"><div><h3>${esc(c.titulo)}</h3></div><span class="etiqueta st-${esc(c.status)}">${esc(c.status)}</span></header>
            <p class="ficha-resumo">${esc(c.resumo || '')}</p>
            <div class="pauta-fontes">${(c.fontes || []).length
              ? (c.fontes || []).map((f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">${esc(f.titulo || f.url)}</a> <span class="fonte-dominio">${esc(f.dominio || '')}</span>`).join(' · ')
              : '<span class="fonte-vazia">sem fonte registrada</span>'}</div>
          </div>`).join('')}` : '<p class="ficha-resumo">Esta execução não deixou conteúdo salvo.</p>'}
          ${avals.length ? `<h4>Pareceres do A2</h4>${avals.map((a) => `<div class="ficha">
            <p class="ficha-resumo"><b>${esc(a.veredito)}</b> — nota ${esc(a.notaFinal)}</p>
            <p class="ficha-resumo">${esc(a.verificacao || '')}</p></div>`).join('')}` : ''}
          ${hist.length ? `<h4>Histórico</h4><ul class="lista-pendentes">${hist.map((h) => `<li>${esc(dataHora(h.em))} — ${esc(h.texto)}</li>`).join('')}</ul>` : ''}
        </div>`);
    } catch (e) {
      toast(mensagemErro(e), 'erro');
    }
  }

  async function acaoAlternarAgendador() {
    try {
      const novo = await Api.alternarAgendador({ ativo: !(agendador && agendador.ativo) });
      agendador = novo;
      desenhar();
      toast(novo.ativo ? 'Agendador ligado.' : 'Agendador desligado.');
    } catch (e) {
      toast(mensagemErro(e), 'erro');
      const el = document.getElementById('exec-detalhe');
      if (el) el.innerHTML = `<div class="aviso"><span>⚠</span><div>${esc(mensagemErro(e))}</div></div>`;
    }
  }

  /* ------------------------------ orquestração ------------------------------ */

  function recarregar() {
    if (ctx && ctx.recarregar) ctx.recarregar();
  }

  function desenhar() {
    if (!alvo) return;
    alvo.innerHTML = html();
  }

  async function carregarStatus() {
    try { provedor = await Api.statusProvedor(); }
    catch (e) { provedor = { configurado: false, erro: e.message }; }
    try { agendador = await Api.statusAgendador(); }
    catch (e) { agendador = { ativo: false, erro: e.message }; }
    try {
      const ref = ctx.dados && ctx.dados.semana ? ctx.dados.semana.inicioSemana : null;
      semana = await Api.calendario(ref);
    } catch (e) { semana = { slots: [] }; }
    try { execucoes = await Api.execucoes(); }
    catch (e) { execucoes = []; }
    desenhar();
  }

  const ACOES = {
    'rascunho-pauta': acaoRascunhoPauta,
    'salvar-pauta': acaoSalvarPauta,
    'rascunho-avaliacao': acaoRascunhoAvaliacao,
    'salvar-avaliacao': acaoSalvarAvaliacao,
    'rascunho-roteiro': acaoRascunhoRoteiro,
    'salvar-roteiro': acaoSalvarRoteiro,
    'propor-calendario': acaoProporCalendario,
    'agendar-slot': acaoAgendarSlot,
    'desagendar-slot': acaoDesagendarSlot,
    'ver-execucao': acaoVerExecucao,
    'alternar-agendador': acaoAlternarAgendador,
  };

  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest && ev.target.closest('[data-ag]');
    if (!btn) return;
    const acao = ACOES[btn.getAttribute('data-ag')];
    if (!acao) return;
    ev.preventDefault();
    btn.disabled = true;
    Promise.resolve(acao(btn.getAttribute('data-id')))
      .catch((e) => toast(mensagemErro(e), 'erro'))
      .finally(() => { btn.disabled = false; });
  });

  /** Chamado pelo painel.js a cada render. */
  function montar(raiz, contexto) {
    ctx = contexto || ctx;
    if (!ctx || ctx.aba !== 'agentes') { alvo = null; return; }
    alvo = document.getElementById('console-agentes');
    if (!alvo) {
      alvo = document.createElement('div');
      alvo.id = 'console-agentes';
      raiz.appendChild(alvo);
    }
    carregarStatus();
  }

  return { montar, desenhar };
})();
