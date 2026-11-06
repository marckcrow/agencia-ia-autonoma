# Relatório — Etapa 3: A3 executado (3 roteiros piloto)

**Data:** 05/11/2026 · **Versão:** 3.4.0 · **Fuso:** America/Sao_Paulo
**Escopo:** apenas os 3 roteiros piloto das pautas aprovadas. Nenhum vídeo gerado. Nada publicado.

---

## 1. Créditos

| Agente | Teto autorizado | Consumido | Itens |
|---|---|---|---|
| A1 — Pesquisador | 120 | **42** | 15 pautas |
| A2 — Estrategista | 60 | **18** | 15 avaliações |
| **A3 — Roteirista** | **96** | **64** | **3 roteiros** |
| **Total em agentes** | — | **124** | — |

Saldo estimado da conta: **≈ 1.876** de 2.000.
O A3 ficou em **67% do teto** e **não houve interrupção nem estouro**.

## 2. Pautas aprovadas pela direção

| Canal | Pauta | Status |
|---|---|---|
| IA na Prática | Agentes de IA saíram do chat: o que já roda sozinho hoje | `pauta_aprovada` |
| Você Sabia? | O maior ser vivo já medido é um fungo de 8,9 km² no Oregon | `pauta_aprovada` |
| Poder 50+ | 90 minutos de força por semana foram associados a 13% menos risco de morte em 30 anos | `pauta_aprovada` |

As outras **12 pautas** continuam em `aprovacao`, disponíveis para decisão individual.

## 3. Os três roteiros

Todos com **5 blocos obrigatórios** (validados pelo servidor), **narração em pt-BR**, **legendas**, **hashtags**, **fontes preservadas** e **ressalva registrada**.

### 3.1 IA na Prática — 55 segundos

**Abertura (0–3s):** "Seu assistente de IA só responde. O que já existe hoje vai lá e faz."
**Desenvolvimento:** diferença entre chatbot e agente; exemplo documentado do Google (40% menos tempo de preparação de sessão, 21% mais velocidade na inicialização); mais de 40 apps conectados.
**Encerramento:** "O ganho não é ter uma IA mais inteligente. É ter uma IA que termina o que começou. E o risco também muda de lugar: quem autoriza o quê."
**Cenas:** cursor piscando → três colunas (responde / planeja / executa) → print do blog oficial com o número circulado → split screen tarefas concluídas × cadeado.
**CTA:** "Comenta: você deixaria um agente agir sozinho no seu trabalho? Salva pra ver depois."
**Fontes:** blog.google, Google app, MIT Technology Review.
**Ressalva:** os números são relatos do próprio Google sobre uso interno — não são ganho garantido para o usuário comum.

### 3.2 Você Sabia? — 50 segundos

**Abertura (0–3s):** "O maior ser vivo do planeta não é uma baleia. É um fungo. E ele está no chão de uma floresta."
**Desenvolvimento:** Armillaria ostoyae no Parque Nacional Malheur; 8,9 km²; "mais de 1.200 campos de futebol"; quase tudo subterrâneo; só os cogumelos aparecem.
**Encerramento:** "O maior ser vivo já medido é também um dos mais destrutivos" — é praga florestal.
**Cenas:** drone descendo até o solo → mapa do Oregon → quadrado de 8,9 km² sobre uma cidade → corte do solo com filamentos → árvore morta.
**CTA:** "Manda pra alguém que acha que sabe tudo de natureza."
**Fontes:** USDA (2.200 acres), OPB.
**Ressalva:** conversão com a medida oficial FIFA — 2.200 ÷ 1,76 ≈ 1.250; o roteiro diz "mais de 1.200" para não dar precisão falsa.

### 3.3 Poder 50+ — 58 segundos

**Abertura (0–3s):** "Noventa minutos por semana. É o que separou dois grupos num estudo de trinta anos."
**Desenvolvimento:** 147 mil pessoas, até 30 anos; 90–119 min/semana → **13%** menos risco de morte por qualquer causa, **19%** cardiovascular, **27%** neurológica; **acima de 120 min não houve ganho adicional**.
**Encerramento:** "O melhor resultado apareceu na combinação: força somada à atividade aeróbica. Não é escolher uma. É fazer as duas."
**Cenas:** cronômetro + halter → cartelas 13/19/27% → selo "estudo observacional" com **"associado ≠ causa"** → gráfico com o teto de 120 min → dois ícones se somando → cartela "não substitui orientação médica".
**CTA:** "Salva este vídeo e começa com dois dias de força por semana, como a OMS recomenda. Converse com seu médico antes."
**Fontes:** BMJ Group, BJSM (DOI 10.1136/bjsports-2025-110503), Harvard Health, OMS.
**Ressalva:** linguagem de associação em **todo** o roteiro — a frase "foram associados a" aparece na narração, na legenda e na cena do selo. Nenhuma promessa de resultado individual.

## 4. Reforço pedido: associação × causalidade

O roteiro de saúde traz a distinção **três vezes**:
1. **Na narração:** "Atenção à palavra certa: foram associados a. É um estudo observacional — ele mostra relação, não prova que a força seja a causa."
2. **Na cena:** selo "estudo observacional" com a frase **"associado ≠ causa"** em destaque.
3. **Na legenda:** "foram ASSOCIADOS a 13% menos risco... É estudo observacional: mostra relação, não causa."
4. **Bônus:** o dado de 45% da combinação com aeróbico **não foi citado no vídeo** — justamente para não confundir o público.

## 5. Estado na Sala de Direção

- **3 roteiros** em **Aguardando aprovação** (`aprovacao`), prontos para sua análise e eventuais ajustes.
- **12 pautas** ainda em `aprovacao`.
- **3 pautas** em `pauta_aprovada` / `em_roteiro`.
- Total: 18 itens no banco · histórico com 82 registros · 25/25 testes passando.
- Backup: `data/db.etapa3-roteiros.json`.

## 6. O que não foi feito

- Nenhum vídeo gerado (nem cena, nem áudio, nem render).
- Nenhuma publicação.
- Nenhum outro agente executado.
- Nenhum serviço externo contratado.

## 7. Próximo passo sugerido

Avaliar os três roteiros e decidir:
1. **Aprovar como está** → planejamos o estúdio audiovisual (cenas, narração, edição, formato 9:16).
2. **Pedir ajustes** → devolvo com suas orientações pela Sala de Direção.
3. **Liberar as outras 6 pautas** → mais roteiros numa próxima rodada, com orçamento apresentado antes.
