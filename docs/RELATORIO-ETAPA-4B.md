# Etapa 4B — Interfaces operacionais dos agentes A1, A2 e A3

**Branch:** `dev/integracoes-agentes`
**Base:** commit `fec2fd3` (Etapa 4A) sobre `main` em `fba12d6`
**Servidor oficial:** `http://localhost:4599`
**Data:** 06/11/2026

---

## 1. Objetivo

Dar interface funcional aos agentes A1 (pauta), A2 (avaliação e calendário) e A3 (roteiro e slot),
permitindo execução manual pelo painel, com reaproveitamento das APIs já existentes, sem
expor credenciais, sem publicação automática e sem depender de serviço externo para o
funcionamento básico.

## 2. O que foi entregue

### 2.1 Backend

| Arquivo | Papel |
|---|---|
| `server/services/ia.js` | Camada de provedor de IA. Lê `IA_PROVEDOR`, `IA_BASE_URL`, `IA_API_KEY`, `IA_MODELO`, `IA_TEMPERATURA`, `IA_TIMEOUT_MS` do ambiente. `status()` devolve somente dados públicos (provedor, modelo, host). `chamar()` fala com endpoints compatíveis com `/chat/completions`. Sem provedor → erro 503. |
| `server/services/redacao.js` | Rascunhos assistidos: `rascunhoPauta`, `rascunhoRoteiro`, `rascunhoAvaliacao`. Cada rascunho passa pelas validações determinísticas de `agentes.js` e volta com a lista de pendências. **Nunca salva nada.** |
| `server/services/agendador.js` | Agendador semanal do A1. **Desativado por padrão** (`AGENDADOR_ATIVO=1` é requisito para ligar). Só cria rascunhos na fila de aprovação; nunca publica nem aprova. |
| `server/services/agentes.js` | `criarPauta`, `criarRoteiro` e `avaliarPauta` agora guardam `execucaoId`; nova função `registrarItemGerado`; `encerrarExecucao` registra `uso` (tokens) e `chamadasProvedor`. |
| `server/index.js` | Novas rotas (ver 2.2) e `registrarItemGerado` ligado às rotas de registro. |

### 2.2 Rotas novas

| Método | Rota | Comportamento |
|---|---|---|
| GET | `/api/agentes/provedor` | Status público do provedor. **Nunca devolve a chave.** |
| GET | `/api/agentes/agendador` | Estado do agendador (`ativo`, `habilitadoPorAmbiente`, `proximaExecucao`, `publicaSozinho: false`). |
| POST | `/api/agentes/agendador` | Liga/desliga. **HTTP 409** enquanto o servidor não subir com `AGENDADOR_ATIVO=1`. |
| POST | `/api/agentes/rascunho/pauta` | Rascunho de pauta. **HTTP 503** sem provedor (modo determinístico). |
| POST | `/api/agentes/rascunho/roteiro` | Rascunho de roteiro (só sobre pauta aprovada). **HTTP 503** sem provedor. |
| POST | `/api/agentes/rascunho/avaliacao` | Rascunho de parecer do A2. **HTTP 503** sem provedor. |
| GET | `/api/execucoes/:id` | Detalhe da execução: entrada, saída (conteúdos + fontes), pareceres, histórico, créditos e uso do provedor. |

Rotas reaproveitadas (sem contrato novo): `POST /api/agentes/pautas`,
`POST /api/agentes/pautas/:id/roteiro`, `POST /api/agentes/pautas/:id/avaliacao`,
`POST /api/agentes/calendario`, `POST /api/agentes/execucoes`,
`POST /api/conteudos/:id/slot`, `DELETE /api/conteudos/:id/slot`.

### 2.3 Frontend

- **`public/js/agentes-ui.js` (novo, ~700 linhas):** console completo dos agentes, isolado do
  painel monolítico. `painel.js` ganhou apenas um gancho (`window.AgentesUI.montar(...)`) —
  nenhuma lógica de agente foi para dentro do arquivo grande.
- **Aba “Agentes”:** cartões de status do provedor e do agendador; console **A1** (formulário de
  pauta, potencial 0–10, fontes), **A2** (critérios 0–10, nota final, veredito, verificação,
  alertas, título sugerido + proposta de calendário), **A3** (cinco blocos de roteiro, legenda,
  hashtags + reserva/libeção de slot) e painel de **execuções** com detalhe por execução.
- **`public/js/api.js`:** `statusProvedor`, `statusAgendador`, `rascunhoPauta`, `rascunhoRoteiro`,
  `rascunhoAvaliacao`, `alternarAgendador`, `execucao(id)`; erros agora carregam `detalhes`
  (pendências de validação) para exibição no console.
- **`public/index.html`:** carrega `/js/agentes-ui.js` antes do `painel.js`.
- **`public/css/painel.css`:** estilos do console (`.console`, `.console-agentes`,
  `.console-resultado`, `.tabela-wrap`).

### 2.4 Ferramentas

- `scripts/verificar-segredos.js` — varredura local do conteúdo versionado (chaves OpenAI/GitHub/
  AWS/Google/Vercel/JWT, arquivos `.env`/`*.pem`/`*credentials*`, pastas `data/` e `public/api/`).
  Falha com código 1 se encontrar material sensível.
- `scripts/testar-etapa4b.js` — 71 verificações de regressão da etapa.
- `scripts/gerar-snapshot.js` — passou a gravar `agentes-provedor.json` e `agentes-agendador.json`
  (20 arquivos de snapshot).

## 3. Garantias preservadas

- `publicacaoAutomatica = false`, `servicosPagosAutorizados = false`,
  `aprovacaoObrigatoria = true` — verificado por teste.
- As quatro etapas de aprovação continuam intactas; conteúdo recém-criado tem
  `podePublicar = false`.
- Nenhum conteúdo existente foi alterado ou excluído.
- Nenhuma chamada a rede social no servidor (teste automatizado varre `server/`).
- Nenhuma chave no frontend: sem `process.env`, sem `Bearer`, sem padrão de chave (teste
  automatizado varre `public/js/`).
- Agendador desligado por padrão e recusado por API sem `AGENDADOR_ATIVO=1`.
- Sem provedor, os agentes funcionam em modo determinístico: o operador preenche e registra.
  **Nenhum resultado fictício é apresentado como real** — sem provedor as rotas de rascunho
  devolvem 503.

## 4. Testes

| Script | Resultado |
|---|---|
| `scripts/testar-etapa2.js` | 25/25 |
| `scripts/testar-integridade.js` | 21/21 |
| `scripts/testar-etapa4a.js` | 39/39 |
| `scripts/testar-etapa4b.js` | 71/71 |
| **Total** | **156/156** |

Verificação em execução (porta 4599, código novo):
`/api/estado`, `/api/agentes/provedor`, `/api/agentes/agendador`, `/api/execucoes`,
`/api/execucoes/:id`, `/api/calendario` → HTTP 200; `/js/agentes-ui.js` → HTTP 200.

Verificação no navegador (aba “Agentes”): 2 cartões, 5 formulários, 13 botões de ação,
títulos `Provedor de IA`, `Agendador automático`, `A1 — Pauta`, `A2 — Avaliação e calendário`,
`A3 — Roteiro e slot`, `Execuções dos agentes`. Sem erro de console do painel.

Integridade do banco: `data/db.json` com SHA-256
`9622E50BEEF05D6EB96D1BA2D756F4530EFB005C3A7A1D1D9AC0DC27C85F6032` **antes e depois** da etapa
(inclusive com o servidor parado para regenerar os snapshots).

## 5. Como ligar um provedor de IA (opcional)

No servidor, antes de iniciar:

```powershell
$env:IA_PROVEDOR = 'openai'
$env:IA_BASE_URL = 'https://api.openai.com/v1'
$env:IA_API_KEY  = '<sua chave>'
$env:IA_MODELO   = 'gpt-4o-mini'
node server/index.js
```

A chave fica apenas no processo do servidor. O painel mostra apenas provedor, modelo e host.
Com o provedor configurado, os botões “Gerar rascunho com IA” passam a produzir rascunhos
**que ainda precisam da sua conferência e do registro manual**.

## 6. Riscos e pendências

1. **Duas instâncias do servidor** jáConviveram no passado: a 4321 foi encerrada com segurança
   (sem conexões ativas, `db.json` intocado). A 4599 é a instância canônica.
2. `data/db.json` continua fora do Git (`.gitignore`) — o backup permanece em
   `data/db.pre-etapa4a-20261106-122533.json`.
3. Os snapshots estáticos divergem após qualquer escrita no banco até rodar
   `scripts/gerar-snapshot.js`.
4. O console de agentes só aparece na aba “Agentes”; a Sala de Direção e o Calendário continuam
   como estavam (o console conversa com eles pelas mesmas APIs e pelo mesmo banco).
5. O agendador ainda não tem interface para cadastrar os temas da rodada — sem temas
   configurados em `db.agendador.temas` ele não gera nada (comportamento proposital).

## 7. Próximo passo (aguardando autorização)

**Etapa 4C — Produção audiovisual com Piper, Kokoro, A4 e A5.**
