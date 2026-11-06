# Auditoria técnica — Agência de IA Autônoma v2.2

**Data:** 05/11/2026 · **Ambiente:** Windows, Node.js 24.19, Python 3.14
**Custo desta auditoria:** 0 créditos de IA · nenhum serviço contratado

---

## 1. Classificação das 15 funcionalidades

Legenda: **FUNCIONAL** = testada de ponta a ponta · **PARCIAL** = funciona com limitação · **SIMULADA** = demonstra sem executar · **NÃO IMPLEMENTADA** = só planejada · **COM ERRO** = falha identificada

| # | Funcionalidade | Estado | Evidência do teste |
|---|---|---|---|
| 1 | **Painel principal e indicadores** | **FUNCIONAL** | `GET /api/estado` retorna 200 com indicadores calculados do banco real. Navegador: 8 abas carregam, 0 erros de console. |
| 2 | **Gestão de produtos e canais** | **FUNCIONAL** | `POST /api/produtos` criou produto com 5 redes, calendário e biblioteca (testado e removido). `POST /api/produtos/:id` alterou status. 3 produtos preservados. |
| 3 | **Agentes A1 a A6** | **PARCIAL** | A1 e A3 executaram de fato (15 pautas, 3 roteiros) e estão registrados em `execucoes` com créditos. A2 avaliou 15 pautas. **A4, A5 e A6 não têm código** — são especificação. |
| 4 | **Pesquisa de tendências** | **PARCIAL** | A1 usou busca web real e registrou 20 fontes com URL e trecho literal. **Não há rotina agendada** — a execução é disparada manualmente. |
| 5 | **Geração de pautas e roteiros** | **FUNCIONAL** | 15 pautas com validação de fontes (HTTP 422 para fonte recusada) e 3 roteiros com 5 blocos obrigatórios. Roteiro sem bloco é recusado. |
| 6 | **Estúdio de Artes** | **PARCIAL** | 3 PNGs 1080×1350 gerados por `scripts/gerar-artes.py` e servidos com HTTP 200. **A geração é por script, não por botão no painel.** |
| 7 | **Produção e edição audiovisual** | **PARCIAL** | Vídeo de 59,83s renderizado com FFmpeg (H.264 CRF 18, 1080×1920, legendas ASS). **O pipeline é script manual**, não um serviço do painel. |
| 8 | **Narração (Piper e Kokoro)** | **FUNCIONAL** | Piper 1.8.0 (3 vozes) e Kokoro 0.2.2 (`pf_dora`, `pm_alex`) instalados. 13 amostras geradas, normalizadas a -16 LUFS e reproduzíveis pela aba Vozes. |
| 9 | **Biblioteca de arquivos** | **PARCIAL** | A aba Biblioteca lista conteúdos do banco e filtra por canal/status. **Não lista os arquivos de mídia** (artes e vídeos) como itens próprios. |
| 10 | **Sala de Direção e aprovações** | **FUNCIONAL** | Fluxo de 4 etapas, prévia, simulação por rede, botões de decisão. Backend retorna **HTTP 409** ao tentar aprovar publicação com etapas pendentes. |
| 11 | **Calendário editorial** | **PARCIAL** | `GET /api/calendario` gera 9 slots semanais navegáveis. **Os slots não são preenchidos** automaticamente pelos conteúdos; a ligação slot↔conteúdo existe mas nenhum conteúdo está agendado. |
| 12 | **Central de Publicações** | **SIMULADA** | 5 plataformas listadas, **0 conectadas**. `publicacaoReal: false`. A simulação mostra formato e legenda por rede, sem enviar nada. |
| 13 | **Integrações com redes sociais** | **NÃO IMPLEMENTADA** | Nenhuma conta conectada, nenhum token, nenhuma chamada a API externa. Só a estrutura de dados. |
| 14 | **Agendamentos e automações** | **NÃO IMPLEMENTADA** | Não há scheduler, cron ou fila. As execuções de agente foram disparadas manualmente nesta sessão. |
| 15 | **Segurança, persistência e backups** | **FUNCIONAL** | Escrita atômica (tmp + rename) em `store.js`. Backups `.tar.gz` em `backups/`. Testes rodam em banco temporário isolado. Aprovação final bloqueada no backend. |

### Resumo

| Estado | Quantidade |
|---|---|
| FUNCIONAL | **5** |
| PARCIAL | **6** |
| SIMULADA | **1** |
| NÃO IMPLEMENTADA | **2** |
| COM ERRO | **1** (corrigido nesta auditoria) |

---

## 2. Correções verificadas

### Bug 1 — Arte de outra pauta na ficha

**Sintoma:** a ficha da erupção de Tonga exibia a arte do fungo do Oregon.

**Causa:** busca por canal em vez de vínculo por pauta.

**Antes** (`public/js/painel.js`, linha 1364):
```js
const peca = estado.dados.estudio.estudio.pecas
  .find((p) => p.produtoId === c.canalId);
```

**Depois** (`public/js/painel.js`, linha ~1394):
```js
const vinculadas = c.pecas || [];
const peca = todasPecas.find((p) => vinculadas.includes(p.id)) || null;
```

**Vínculo em cadeia gravado no banco:**
```
pauta (id) → roteiro (pautaId) → arte/vídeo (pecas[])
```

**Teste:** `scripts/testar-integridade.js` verifica que Tonga **não** recebe arte e que o roteiro do fungo **recebe** a arte correta. ✔

### Bug 2 — Registros duplicados de pauta

**Sintoma:** o fungo, os Agentes e os 90 minutos apareciam duas vezes (18 itens em vez de 15).

**Causa:** o script `testar-etapa2.js` rodava contra `data/db.json` em versões anteriores e recriava os itens.

**Correção:**
1. O script agora usa `DB_ARQUIVO=data/db.teste.json` — banco temporário.
2. As 3 duplicatas foram removidas mantendo o ID original.
3. Os 3 roteiros, apagados junto por engano, foram restaurados do backup.

**Verificação de isolamento dos testes:**
```
scripts/testar-etapa2.js:24   DB_TESTE = data/db.teste.json
scripts/testar-integridade.js:14  DB    = data/db.integridade.json
```

**Confirmação:** o hash MD5 de `data/db.json` é idêntico ao do backup `db.auditoria.json` — os testes **não tocaram** o banco de produção.

`4c43f2276cb9744c3d1ed15b051fd3de` (db.json) = `4c43f2276cb9744c3d1ed15b051fd3de` (db.auditoria.json)

### Estado preservado

| Item | Valor |
|---|---|
| Conteúdos | **18** (15 pautas + 3 roteiros) |
| Produtos | 3 |
| Artes | 3 |
| Prévia de vídeo | 1 |
| Histórico | 106 registros |
| Decisões | 7 |

---

## 3. Ajuda Inteligente — resultados

| Recurso | Teste | Resultado |
|---|---|---|
| Botão flutuante | presente no DOM em todas as abas | ✔ |
| Tutorial de primeiro acesso | abre automaticamente, 15 etapas, barra de progresso | ✔ |
| Navegação do tutorial | Próximo/Voltar/Pular/Concluir alteram etapa e destacam o menu | ✔ |
| Busca por "vídeo" | retorna 5 respostas com botão "Ir para a funcionalidade" | ✔ |
| Ajuda contextual | 15 abas mapeadas com texto próprio | ✔ |
| FAQ | 15 perguntas | ✔ |
| Custo | nenhuma chamada de IA — base local | ✔ |

---

## 4. Pendências por prioridade

### P1 — Bloqueia uso real
1. **Agendamento e publicação automática** — não existe scheduler. Sem isso a agência não publica sozinha.
2. **Conexão com APIs das redes** — Instagram, Facebook, TikTok, YouTube e WhatsApp não têm integração. Central de Publicações é simulação.
3. **Operação com o computador desligado** — hoje todo o sistema roda localmente; rotinas param quando a máquina desliga.

### P2 — Limita a operação
4. **A4, A5 e A6 sem código** — produção de vídeo e gestão de publicação são scripts manuais, não agentes.
5. **Pipeline audiovisual manual** — as 8 cenas foram geradas por script Python + FFmpeg, não por botão no painel.
6. **Biblioteca não indexa mídia** — só conteúdos do banco.
7. **Calendário não preenche slots** com os conteúdos existentes.

### P3 — Melhoria
8. **Editais de design diferenciados** — as 3 artes usam a mesma estrutura (Etapa 5 do pedido anterior, não executada).
9. **Tutorial destacar o elemento físico** — hoje destaca o item de menu, não o botão específico.
10. **Identidades visuais configuráveis pela interface** — hoje estão no JSON.

---

## 5. Arquivos e funções responsáveis

| Área | Arquivo | Função principal |
|---|---|---|
| Servidor / API | `server/index.js` | roteamento e endpoints |
| Persistência | `server/store.js` | `ler()`, `transacao()` |
| Conteúdos e decisões | `server/services/conteudos.js` | `criarConteudo`, `decidir`, `reenviar`, `podePublicar` |
| Agentes A1–A3 | `server/services/agentes.js` | `criarPauta`, `avaliarPauta`, `criarRoteiro`, `revisarPauta`, `validarPauta` |
| Indicadores | `server/services/indicadores.js` | `indicadores()` |
| Calendário | `server/services/calendario.js` | `gerarSemana()` |
| Interface | `public/js/painel.js` | render das abas, `abrirPreview()`, `abrirAjuda()`, `abrirTutorial()` |
| Cliente HTTP | `public/js/api.js` | camada de acesso, fallback estático |
| Artes | `scripts/gerar-artes.py` | geração PNG com Pillow |
| Vídeo | `scripts/gerar-previa-video.py` + FFmpeg | cenas e render |
| Testes | `scripts/testar-etapa2.js` | 25 verificações |
| Testes | `scripts/testar-integridade.js` | 21 verificações |
