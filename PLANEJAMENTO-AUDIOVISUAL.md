# Planejamento técnico — Do roteiro ao vídeo vertical 9:16

**Data:** 05/11/2026 · **Versão:** 3.5.0
**Nenhum vídeo gerado. Nenhum serviço contratado. Nenhum crédito gasto nesta tarefa.**

---

## 1. O que existe hoje e o que falta

| Etapa da produção | Temos agora | Como resolver |
|---|---|---|
| Roteiro, narração escrita, cenas, legendas | ✅ **Pronto** (3 roteiros aprovados internamente) | — |
| Voz sintética (TTS pt-BR) | ❌ Não disponível nesta conta | Plano Basic (no Abacus AI Agent na web) ou gravação humana |
| Imagens / cenas visuais | ❌ Não disponível nesta conta | Plano Basic, banco de imagens livre, ou material próprio |
| Trilha sonora | ❌ Não disponível | Biblioteca de música livre de royalties |
| Edição, corte, legendas queimadas, 9:16 | ⚠️ Ferramenta local possível | `ffmpeg` nesta máquina (custo zero) |
| Publicação nas redes | ❌ Não existe rota no sistema | Manual ou API paga (não autorizada) |

**Resumo:** o gargalo não é a edição — é **voz, imagem e trilha**. A montagem final pode ser feita de graça aqui.

## 2. Modelos e limites — o que o plano oferece

O plano **não especifica nomes de modelos de vídeo nem durações máximas** na descrição oficial. O que está documentado:

| Item | Situação |
|---|---|
| Geração de vídeos | ✅ Incluída no **Basic** (e Pro e Max), em **Abacus AI Agent na web** |
| Modelos de vídeo disponíveis | Não declarados na lista do plano — precisam ser verificados dentro do Agent após ativar |
| Duração máxima por clipe | Não declarada — a verificar |
| Formato vertical 9:16 | Não declarado — a verificar |
| Voz sintética / narração | Não declarada como recurso separado — a verificar |

> **Honestidade:** não vou inventar nomes de modelo nem limites que não constam na documentação. Esses três pontos só podem ser confirmados **dentro do Abacus AI Agent na web**, depois de ativar o plano. Se você quiser, no primeiro acesso eu faço essa verificação antes de qualquer produção.

O que **está** confirmado nos modelos de texto: GPT-6.1 Sol, GPT-6.1 Terra, GPT-6 Luna, GPT-6 Astra, Claude Sonnet 5.5, Claude Opus 5.5, Claude Fable 5.1 e Gemini 3.8 Flash.

## 3. Consumo estimado de créditos por vídeo

**Aviso importante:** o plano **não publica a taxa de conversão de créditos por segundo de vídeo gerado**. Qualquer número abaixo é **estimativa por ordem de grandeza**, não medição.

| Etapa | Consumo estimado | Base |
|---|---|---|
| 3 a 5 clipes de vídeo gerados (4–8s cada) | **300–800 créditos** | faixa típica de geradores de vídeo por IA |
| Narração TTS de ~55s | **30–80 créditos** | custo de áudio costuma ser fração do vídeo |
| Imagens de apoio (5 a 8) | **40–120 créditos** | geração de imagem é mais barata que vídeo |
| **Total por vídeo** | **≈ 370–1.000 créditos** | |

### Comparando com o plano

| | Basic | Pro | Max |
|---|---|---|---|
| Créditos/mês | 14.000 (1º mês), depois 20.000 | 30.000 | 120.000 |
| **Vídeos/mês (a 700 créditos cada)** | **≈ 20 a 28** | **≈ 42** | **≈ 170** |

Para a meta de **9 vídeos/semana = 36/mês**, a estimativa aponta para:
- **Basic:** apertado (28 vídeos no primeiro mês com 14 mil créditos) — serviria com 4 a 6 vídeos/mês, não 36.
- **Pro (US$ 20/mês, 30.000 créditos):** cerca de 42 vídeos/mês — **é o que comporta a meta**.
- **Max (US$ 100/mês):** folga grande, só se houver mais canais.

> A estimativa é a maior incerteza deste plano. A primeira geração real vai revelar o custo verdadeiro por vídeo — e aí o número deixa de ser estimativa.

## 4. Como integrar à Agência

### 4.1 Arquitetura proposta

```
Roteiro aprovado (banco local)
        │
        ▼
┌───────────────────────────────────────────┐
│  A4 — Produtor de vídeos                  │
│  · quebra o roteiro em cenas numeradas    │
│  · gera os prompts de imagem/vídeo        │
│  · produz o texto de narração com marcação│
│  · define a trilha por bloco              │
└───────────────┬───────────────────────────┘
                │ pacote de produção (JSON)
                ▼
┌───────────────────────────────────────────┐
│  A5 — Editor audiovisual                  │
│  · chama TTS e geração de cenas           │
│  · monta timeline 9:16 (ffmpeg local)     │
│  · queima legendas                        │
│  · exporta MP4 1080×1920                  │
└───────────────┬───────────────────────────┘
                │ MP4 + capa
                ▼
   Biblioteca de vídeos → Sala de Direção
   (status: Aguardando aprovação)
```

### 4.2 O que o painel já tem para receber isso

- Tabela `conteudos` com campo de vídeo e versão — **pronto**.
- Rota `POST /api/conteudos` para registrar a saída do A4/A5 — **pronta**.
- Sala de Direção para você aprovar ou devolver — **pronta**.
- Aba Execuções para registrar o custo real por rodada — **pronta**.
- Aba Integrações com o item "Geração de vídeos por IA" já mapeado — **pronta**.

O que falta é **o motor de geração** — não a estrutura que o recebe.

### 4.3 Os agentes podem executar automaticamente?

**Hoje, não.** Os agentes A4 e A5 rodam **dentro deste app**, nesta máquina, e não têm acesso a geração de vídeo ou voz.

**Com o plano ativado, sim — com uma ressalva importante:** a geração de vídeo acontece no **Abacus AI Agent na web**, não aqui. Então o fluxo automático completo teria duas partes:

| Parte | Onde roda | Automação |
|---|---|---|
| Roteiro → prompts, cenas, narração escrita | Aqui (agentes A4) | ✅ Totalmente automático |
| Geração de clipes, voz e imagens | Abacus AI Agent na web | ⚠️ Automático **dentro do Agent**, não aqui |
| Montagem, legendas, 9:16 | Aqui (`ffmpeg`) | ✅ Totalmente automático |
| Registro no painel | Aqui (API) | ✅ Totalmente automático |
| Aprovação e publicação | Você | ❌ Sempre manual |

**Traduzindo:** dá para ter a agência produzindo sozinha do roteiro até o MP4 montado, mas a "fábrica de cenas" fica no Agent na web — o painel entrega o pacote, recebe o material e monta. A ponte entre os dois é manual ou via rotina agendada, e é o único ponto de atrito do desenho.

## 5. Alternativas externas — comparação honesta

Você pediu para comparar. Estes são os caminhos que **você** pode escolher; eu não contrato nenhum sem sua ordem.

| Caminho | Custo estimado | Vantagem | Limitação |
|---|---|---|---|
| **Abacus Basic** | US$ 7 no 1º mês, depois US$ 10/mês | Integrado ao painel; vídeo + imagem no mesmo lugar | ~20 a 28 vídeos/mês — não cobre 36 |
| **Abacus Pro** | US$ 20/mês | 30.000 créditos — **comporta a meta de 36/mês** | Produção de vídeo no Agent na web |
| **Gravação humana** | R$ 0 a R$ 150 por vídeo | Voz com credibilidade, sem artefato de IA | Tempo e dependência de pessoa |
| **Banco de imagens livre** | R$ 0 (Pexels, Unsplash, Pixabay) | Sem custo, qualidade alta | Menos específico; exige curadoria |
| **Trilha livre** | R$ 0 (YouTube Audio Library, Pixabay Music) | Sem custo, sem problema de direitos | Biblioteca limitada |
| **Edição local (`ffmpeg`)** | R$ 0 | Rápido, repetível, scriptável | Exige montagem técnica |

### Recomendação técnica

**Caminho de menor custo e maior controle — "modo estúdio enxuto":**
1. Narração **humana** (ou TTS quando houver plano)
2. Imagens de **banco livre** + capturas de tela reais (os três roteiros já preveem isso)
3. Trilha de **biblioteca livre**
4. Montagem com **`ffmpeg`** aqui, legendas queimadas, 9:16

**Custo: R$ 0 por vídeo.** A limitação é tempo de montagem — estimo 40 a 60 minutos por vídeo na primeira vez, caindo para 15 a 20 com o script pronto.

**Se quiser cenas geradas por IA:** o Pro (US$ 20/mês) é o único que comporta 36 vídeos/mês pela estimativa. O Basic serve para piloto de 3 a 5 vídeos.

## 6. Próximos passos — nada executado

1. Você lê os três roteiros completos e decide se viram vídeo.
2. Escolhe o caminho de produção (enxuto gratuito, Basic para piloto, ou Pro para escala).
3. Autoriza o custo antes de qualquer execução.

**Não contrato nada, não gero nada e não gasto crédito sem sua autorização.**
