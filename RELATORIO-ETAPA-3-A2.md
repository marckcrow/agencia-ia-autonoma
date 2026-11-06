# Relatório — Etapa 3: Agente A2 executado

**Data:** 05/11/2026 · **Versão:** 3.1.0 · **Fuso:** America/Sao_Paulo
**Escopo:** apenas A2 (avaliação das 15 pautas do A1 + calendário proposto). A3 **não executado**.

---

## 1. Créditos

| Item | Valor |
|---|---|
| Teto autorizado para o A2 | **60 créditos** |
| **Consumido** | **18 créditos** |
| Margem não usada | 42 |
| A1 (rodada anterior) | 42 de 120 |
| **Total gasto em agentes até agora** | **60 créditos** |
| Saldo estimado da conta | **≈ 1.940** de 2.000 |

O A2 não fez pesquisa nova: trabalhou sobre as 15 pautas do A1, com **9 fontes primárias relidas** para verificação pontual. Ficou em 30% do teto. **Nenhuma operação excedeu limite.**

## 2. Resultado da avaliação

**15 pautas avaliadas · 13 sem impedimento factual · 2 exigem correção antes do roteiro · 9 prioridades sugeridas (3 por canal).**

### Achados importantes (correções factuais)

| Pauta | Problema encontrado | Gravidade |
|---|---|---|
| **Sora 2** | A página oficial da OpenAI informa que o produto **Sora foi descontinuado em 26/04/2026**. A pauta estava no presente, como se a ferramenta estivesse disponível | **Alta — erro factual** |
| **Gemini 4 Argon** | O preço introdutório (US$ 2/US$ 10 por milhão de tokens) **termina em 30/11/2026** e sobe para US$ 4/US$ 20. Citar sem a data vira informação errada em poucas semanas | Média |
| **Fungo do Oregon** | "9 quilômetros" é aproximação de perímetro; a medida oficial é **2.200 acres / 3,4 milhas quadradas** (USDA) | Média |
| **Sono na maturidade** | A página do PubMed (PMID 41658045) **bloqueou leitura** por cookies. O resumo é suficiente para a pauta, **insuficiente para números** — sinalizada como não verificada | Média |
| **Azeite antes do carboidrato** | Estudo **em camundongos** (Diabetes, DOI 10.2337/db26-0531), relevância humana não testada. Risco alto de distorção no gancho | Alta (editorial) |
| **Zonas azuis** | A fonte da OMS serve de contraponto de hábitos, **não sustenta a tese** das zonas azuis. Não dizer "é fraude" | Média |

### Títulos exagerados sinalizados
- "o que muda na prática" (Gemini) — promete mais do que 60 segundos entregam.
- "o que já é possível" (Sora) — sugere disponibilidade atual, que não existe.
- "o maior ser vivo do planeta" (fungo) — correto apenas como "maior organismo vivo já medido".

Cada pauta recebeu um **título sugerido** já ajustado.

## 3. Classificação das 15 pautas

| # | Pauta | A1 | A2 | Veredito |
|---|---|---|---|---|
| 1 | Agentes de IA em segundo plano | 73 | **88** | Sem impedimento |
| 2 | Solidão mata cerca de 100 pessoas por hora (OMS) | 83 | **88** | Sem impedimento |
| 3 | O maior ser vivo já medido é um fungo | 67 | **88** | Sem impedimento (ajustar medida) |
| 4 | Zonas azuis: o que caiu e o que continua valendo | 80 | **84** | Sem impedimento |
| 5 | Nobel de Medicina 2026: ligar neurônio com luz | 67 | **84** | Sem impedimento |
| 6 | 90 minutos de força: 147 mil pessoas em 30 anos | 77 | **84** | Sem impedimento |
| 7 | Caminhar não basta: OMS e força | 80 | **82** | Sem impedimento |
| 8 | Marte tem um campo de favos de mel | 80 | **80** | Sem impedimento |
| 9 | 3 tarefas que a IA faz em 30 segundos | 77 | **78** | Sem impedimento |
| 10 | O vulcão que destruiu metano | 73 | **78** | Sem impedimento |
| 11 | Sora 2 mostrou o futuro — e foi descontinuado | 77 | **78** | **Corrigir antes** |
| 12 | Gemini 4 Argon: 3 tarefas em que ganha tempo | 83 | **78** | **Corrigir antes** |
| 13 | Azeite antes do carboidrato (estudo em camundongos) | 77 | **76** | Sem impedimento, com ressalva forte |
| 14 | 3 testes rápidos para saber se o vídeo é falso | 70 | **72** | Sem impedimento |
| 15 | Uma noite ruim de sono muda seu dia | 80 | **72** | Sem impedimento, fonte parcial |

**Por que a nota do A2 diverge da nota do A1:** o A1 mede potencial de audiência; o A2 mede potencial **e** risco editorial. Pautas com fonte frágil (sono, azeite) caem; pautas com fonte primária forte e gancho original (fungo, agentes, solidão) sobem.

## 4. Prioridades sugeridas (não aprovadas)

**IA na Prática:** Agentes de IA em segundo plano · 3 tarefas em 30 segundos · 3 testes para vídeo falso
**Você Sabia?:** Fungo do Oregon · Vulcão que destruiu metano · Azeite (com ressalva de estudo animal)
**Poder 50+:** Solidão (OMS) · Caminhar não basta (OMS) · 90 minutos de força (Harvard/BJSM)

## 5. Calendário editorial proposto

**Semana 1 (16–22/11)** — abertura com as pautas de maior nota e menor risco: solidão, favos de mel em Marte, Gemini Argon, OMS e força, vulcão, 3 tarefas, 90 minutos de força, Nobel, agentes.

**Semana 2 (23–29/11)** — temas que exigem correção antes do roteiro: sono, azeite, deepfake, zonas azuis, fungo, Sora 2.

Status: **proposta**. Nada foi agendado no calendário real; os 9 slots semanais continuam como vagas vazias.

## 6. Funcionalidades implementadas

- **Serviço de avaliação (A2):** 5 critérios de 0 a 10, nota final, veredito, parecer de verificação, alertas e título sugerido — validados no servidor.
- **A2 não muda status.** O servidor não tem rota que aprove pauta pelo agente. As 15 continuam `aprovacao`.
- **Proposta de calendário** gravada em `calendarios` com status fixo `proposta`.
- **Interface:** cada pauta na aba Pautas agora mostra o selo do A2 (nota, veredito, verificação, alertas e título sugerido) e a proposta de calendário em tabela por semana.
- **Novas rotas:** `POST /api/agentes/pautas/:id/avaliacao`, `POST /api/agentes/calendario`, `GET /api/avaliacoes`, `GET /api/calendarios`.
- **Histórico:** +16 registros de avaliação e +1 de calendário. Nada foi apagado.

## 7. Verificação de integridade

- 25/25 testes automáticos passando.
- 15 pautas preservadas, todas ainda em `aprovacao`.
- 4 decisões históricas da Etapa 2 intactas; backups intactos.
- Nenhum vídeo gerado, nenhuma publicação, nenhum serviço externo contratado.

## 8. Pendente

- **A3 (Roteirista)** — não executado; depende da sua aprovação das pautas.
- Geração de vídeo, narração e edição.
- Conexão de contas e publicação.
- Monetização com dados reais.

**A seleção definitiva é sua.** O A2 sugeriu prioridades e um calendário; nenhuma pauta foi aprovada automaticamente.
