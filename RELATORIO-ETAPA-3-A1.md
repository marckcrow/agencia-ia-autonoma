# Relatório — Etapa 3 (parcial): Agente A1 executado

**Data:** 05/11/2026 · **Versão:** 3.0.0 · **Fuso:** America/Sao_Paulo
**Escopo autorizado:** preparação técnica + A1 (15 pautas, teto de 120 créditos). A2 e A3 **não executados**.

---

## 1. Créditos consumidos

| Item | Valor |
|---|---|
| Teto autorizado para o A1 | **120 créditos** |
| **Consumido no A1** | **42 créditos** |
| Margem restante do teto | 78 créditos (não usados) |
| Saldo da conta antes | 2.000 |
| **Saldo estimado depois** | **≈ 1.958** (o painel da conta é a fonte oficial) |

O gasto ficou em 35% do teto porque a pesquisa se resolveu em **3 buscas por canal + 9 leituras de página**, sem repetição de tentativas caras. **Nenhuma operação ultrapassou o limite** e não houve interrupção.

Registro completo no painel: aba **Execuções** (agente A1, teto 120, consumido 42, 15 itens, status concluída).

## 2. Backup e preservação

| Item | Estado |
|---|---|
| Backup da Etapa 2 (completo) | `backups/agencia-ia-etapa2-final-20261105-0813.tar.gz` |
| Cópia do banco da Etapa 2 | `data/db.etapa2.json` |
| Decisões históricas (4 registros) | preservadas |
| Histórico geral | preservado (13 → 31 registros, só acréscimos) |
| Backups anteriores (Etapa 1 e pré-limpeza) | intactos |

## 3. Funcionalidades implementadas

### Estruturas dos agentes (`server/services/agentes.js`)
- **A1 — Pesquisador:** cadastro de pauta com título, resumo, público-alvo, monetização, justificativa, **potencial em 3 fatores (0–10 cada) e nota final 0–100**, e fontes com domínio, tipo e data de consulta.
- **A2 — Estrategista:** campos prontos (potencial, justificativa, calendário); **não executado**.
- **A3 — Roteirista:** roteiro com **5 blocos obrigatórios** (abertura impactante, desenvolvimento, encerramento, sugestões visuais, chamada para ação), validados no servidor. **Só aceita pauta com status `pauta_aprovada`** — trava no servidor, não na interface. **Não executado**.

### Validações obrigatórias (testadas de verdade)
| Regra | Comportamento observado |
|---|---|
| Afirmação factual exige fonte | pauta sem fonte é recusada (HTTP 422) |
| Rede social/blog não é fonte | `medium.com`, `reddit`, `instagram` etc. recusados |
| Domínio fora da lista | recusado — aconteceu com 3 fontes reais e foram corrigidas |
| Poder 50+ e temas de saúde | exigem fonte **científica/oficial** (OMS, PubMed, periódico revisado) |
| Promessa de resultado | palavras como "cura garantida", "resultado garantido" recusadas |

### Interface
- Nova aba **Pautas**: nota de potencial com barras por fator, público-alvo, monetização, justificativa e **fontes clicáveis** com domínio e tipo.
- Nova aba **Execuções**: créditos, teto, itens gerados e status por rodada.
- Sala de Direção agora trata pautas: aprovar uma pauta grava status **Pauta aprovada** (não "Aprovado"), separando a etapa de pauta da etapa de roteiro.
- Correção de UX: o botão "Aprovar" exigia indevidamente uma orientação de texto. Agora abre a ficha de decisão.

## 4. As 15 pautas (todas aguardando sua decisão)

| Nota | Canal | Título |
|---|---|---|
| 83 | IA na Prática | Gemini 4 Argon: o que muda na prática para quem usa IA todo dia |
| 77 | IA na Prática | 3 tarefas do seu dia que uma IA já faz melhor que você (com o prompt certo) |
| 77 | IA na Prática | Sora 2 e o vídeo gerado por IA: o que já é possível e o que ainda falha |
| 73 | IA na Prática | Agentes de IA em segundo plano: a próxima mudança não é no chat |
| 70 | IA na Prática | Deepfake e confiança: como verificar se um vídeo é real em 30 segundos |
| 80 | Você Sabia? | O Curiosity achou um campo de favos de mel em Marte |
| 77 | Você Sabia? | Azeite antes do carboidrato reduz o pico de açúcar? O que o estudo realmente mostrou |
| 73 | Você Sabia? | O vulcão que limpou metano do céu em vez de só poluir |
| 67 | Você Sabia? | Nobel de Medicina 2026: a técnica que liga e desliga neurônios com luz |
| 67 | Você Sabia? | O maior ser vivo do planeta é um fungo de 9 quilômetros |
| 83 | Poder 50+ | Solidão mata mais do que se imagina — e tem solução prática |
| 80 | Poder 50+ | Zonas azuis sob suspeita: o que ainda vale copiar delas |
| 80 | Poder 50+ | Sono na maturidade: por que uma noite ruim pesa mais depois dos 60 |
| 80 | Poder 50+ | Depois dos 50, caminhar não basta: o que a OMS recomenda de força |
| 77 | Poder 50+ | Força ao longo de décadas e longevidade: o que a evidência permite afirmar |

## 5. Fontes utilizadas (todas verificadas nesta rodada)

**IA na Prática:** blog.google (anúncio Gemini 4 Argon), cloud.google.com (preços), openai.com (Sora 2 e System Card), technologyreview.com (10 Things in AI 2026), mittechreview.com.br.

**Você Sabia?:** nasa.gov e jpl.nasa.gov (Curiosity), sciencedaily.com (Hunga Tonga), medicalxpress.com e medicalnewstoday.com (azeite), nobelprize.org (Medicina 2026), opb.org e usda.gov (fungo do Oregon).

**Poder 50+:** who.int (diretrizes de atividade física, Comissão de Conexão Social), pmc.ncbi.nlm.nih.gov (diretrizes OMS 2020), pubmed.ncbi.nlm.nih.gov (sono e cognição), health.harvard.edu (treino de força), science.org (crítica às zonas azuis).

## 6. Dificuldades e decisões

1. **Lista de fontes confiáveis incompleta.** O primeiro lote reprovou 8 pautas por domínios legítimos que não estavam na lista (blog.google, sciencedaily, cnn, mittechreview.com.br, medicalxpress). Ampliei a lista **e endureci** a regra: "científica/oficial" agora vale só para órgão de saúde/ciência e periódico revisado por pares — blog corporativo e veículo de notícia contam como confiável, não como evidência.
2. **Regra de saúde passou a valer por tema, não só por canal.** O "Azeite antes do carboidrato" é do canal Você Sabia?, mas é tema de saúde: passou a exigir fonte científica. A pauta foi aceita com a ressalva explícita de que o estudo foi em camundongos.
3. **Uma fonte removida.** O texto sobre zonas azuis citava a Swiss Life (seguradora), recusada como fonte. Troquei por science.org e pela OMS.
4. **Custo menor que o estimado** (42 de 120), sem necessidade de segunda rodada.

## 7. O que é agente e o que é manual

| Operação | Executor |
|---|---|
| Pesquisa de tendências, leitura de fontes, redação das 15 pautas | **Agente A1** (executado) |
| Validação de fontes, saúde e promessas de resultado | **Automática** (servidor) |
| Registro na Sala de Direção | **Automático** |
| **Decisão sobre as 15 pautas** | **VOCÊ — manual** |
| Avaliação de potencial e calendário | A2 — **não executado** |
| Roteiros | A3 — **não executado** |
| Vídeo, narração, edição | Não existe nesta etapa |
| Publicação | Não existe rota no sistema |

## 8. Pendente / não autorizado

- A2 e A3 (aguardando sua autorização).
- Geração de vídeo, narração e edição.
- Conexão de contas e publicação.
- Monetização com dados reais.
- Operação 24/7 em nuvem.

Nenhum vídeo foi gerado, nada foi publicado e nenhum serviço externo foi contratado.
