# Vídeo-piloto IA na Prática — planejamento técnico

**Data:** 05/11/2026 · **Nenhum vídeo renderizado · nada publicado · custo R$ 0**
**Roteiro:** v2 · **Voz:** Kokoro `pm_alex` speed 1,15 (provisória, definida pela direção)

---

## 1. Narração já medida — 59,83 s

Gerei a narração completa para medir o tempo real antes de desenhar o storyboard.

| Item | Valor |
|---|---|
| Duração real | **59,83 s** |
| Meta do roteiro | 55 s |
| Diferença | +4,83 s (**+8,8%**) |
| Arquivo | `vozes/amostras/ia-na-pratica-narracao-v2.mp3` (disponível na aba Vozes) |
| Normalização | -16 LUFS |

**Como fechar nos 55 s** (três opções, sua escolha):

| Opção | Efeito |
|---|---|
| **A. Aumentar speed para 1,22** | ~55 s, sem cortar texto — a dicção fica mais apertada |
| **B. Cortar 2 frases** | Remover "Um chatbot espera você perguntar" e "Salva pra ver depois" |
| **C. Aceitar 60 s** | Fica dentro do limite de Shorts/Reels/TikTok (até 3 min) e preserva o roteiro |

**Minha recomendação: C.** 60 segundos é natural para esse conteúdo e não compromete a qualidade. Mas a decisão é sua.

---

## 2. Texto final da narração (15 blocos, com tempos reais)

| # | Tempo | Narração |
|---|---|---|
| 1 | 0–3s | "Seu assistente de IA só responde." |
| 2 | 3–6s | "O que já existe hoje vai lá e faz." |
| 3 | 6–9s | "A diferença se chama agente." |
| 4 | 9–12s | "Um chatbot espera você perguntar." |
| 5 | 12–18s | "Um agente recebe um objetivo, quebra em etapas e executa, muitas vezes sem ninguém olhando." |
| 6 | 18–26s | "Um exemplo real: o próprio Google usou o Gemini 4 Argon, num teste interno da empresa, para otimizar uma biblioteca de código." |
| 7 | 26–36s | "Segundo o anúncio oficial do modelo, o trabalho reduziu o tempo de preparação de sessão em 40 por cento, e acelerou a inicialização em 21 por cento." |
| 8 | 36–43s | "Guarda o contexto: isso foi um teste interno do Google, numa tarefa específica de engenharia." |
| 9 | 43–49s | "Não é o que você deve esperar no seu dia a dia, mas mostra até onde a autonomia já chega." |
| 10 | 49–54s | "E não é só código: o app Gemini conecta mais de 40 aplicativos, e executa tarefas em vez de só sugerir." |
| 11 | 54–57s | "O ganho não é ter uma IA mais inteligente." |
| 12 | 57–60s | "É ter uma IA que termina o que começou." |
| 13 | 60–63s | "E o risco também muda de lugar: quem autoriza o quê." |
| 14 | 63–67s | "Comenta: você deixaria um agente agir sozinho no seu trabalho?" |
| 15 | 67–70s | "Salva pra ver depois." |

> Tempos proporcionais à duração medida. Na renderização, os tempos exatos saem do alinhamento forçado do áudio.

---

## 3. Storyboard — 8 cenas

| Cena | Tempo | Visual | Movimento | Transição |
|---|---|---|---|---|
| **1** | 0–6s | Fundo `#0B0E14` com grade sutil. Caixa de texto vazia no centro, cursor piscando. | Cursor pisca a cada 0,5s | fade-in do preto |
| **2** | 6–12s | Título "Chatbot × Agente" e três colunas surgindo: responde / planeja / executa | colunas entram da esquerda, 0,3s cada | slide horizontal |
| **3** | 12–18s | Ícone de engrenagem girando sobre um fluxo de etapas (objetivo → etapas → execução) | engrenagem gira 180° | zoom in suave |
| **4** | 18–36s | Print do blog oficial do Google com o trecho do Agent Development Kit destacado; **tarja lateral "TESTE INTERNO DO GOOGLE"** | destaque pulsa em roxo | wipe diagonal |
| **5** | 36–43s | Cartelas grandes: **"40%"** e **"21%"** em Montserrat bold, com a legenda "resultado interno do Google" | números contam de 0 até o valor | corte seco |
| **6** | 43–49s | Selo "teste interno · tarefa de engenharia" + ícone de lupa sobre o texto | selo aparece com escala 0,8 → 1 | fade |
| **7** | 49–57s | Split screen: lista de tarefas com check verde (esquerda) × cadeado "AUTORIZAÇÃO" (direita) | checks aparecem em sequência | slide vertical |
| **8** | 57–70s | Cartela final: logo "IA NA PRÁTICA", tagline, e CTA "Comenta · Salva" | fade do logo + botão pulsando | fade-out |

**Ritmo:** corte a cada 2–3 s nas cenas 1–3; cenas 4–6 mais lentas (dado importante); cena 8 com respiro.

---

## 4. Legendas dinâmicas

- **Estilo:** Montserrat Bold, corpo 64 px, branco, contorno preto de 6 px, posicionadas a 78% da altura (acima da zona de UI das plataformas).
- **Destaque:** a palavra-chave de cada frase em **amarelo `#F0B429`** (ex.: *agente*, *40%*, *21%*, *autoriza*).
- **Sincronização:** geradas por alinhamento forçado do áudio, 2 a 5 palavras por cartela.
- **Formato:** arquivo `.ass` (libass) — permite estilo por palavra, diferente do `.srt`.

---

## 5. Recursos visuais necessários

| # | Recurso | Como obtenho | Status |
|---|---|---|---|
| 1 | Fundo com grade | Pillow (gerado) | ✅ ferramenta pronta |
| 2 | Cursor e caixa de texto | Pillow | ✅ |
| 3 | Três colunas com ícones | Pillow | ✅ |
| 4 | Engrenagem e fluxo | Pillow (formas) | ✅ |
| 5 | **Print do blog do Google** | **captura de tela da página pública** | ⚠️ **precisa da sua autorização** |
| 6 | Tarja "teste interno" | Pillow sobre o print | ✅ |
| 7 | Cartelas 40% / 21% | Pillow | ✅ |
| 8 | Selo e lupa | Pillow | ✅ |
| 9 | Checks e cadeado | Pillow | ✅ |
| 10 | Logo "IA na Prática" | Pillow (tipográfico) | ✅ |
| 11 | **Trilha sonora** | biblioteca livre (YouTube Audio Library / Pixabay) | ⚠️ **precisa escolher a faixa** |
| 12 | Fonte Montserrat | já instalada em `C:/Windows/Fonts` | ✅ |

---

## 6. Identidade visual aplicada

| Elemento | Valor |
|---|---|
| Cor primária | `#6C5CE7` (roxo) |
| Cor secundária | `#8B7CF0` |
| Fundo | `#0B0E14` |
| Tipografia | Montserrat Bold (títulos) / Montserrat Regular (corpo) |
| Tom | escuro, técnico, alto contraste |
| Elementos fixos | grade sutil de fundo, barra de progresso inferior |

---

## 7. Pipeline de renderização

```
1. narracao.mp3       ✅ já existe (59,83s)
2. alinhamento        → timestamps por palavra (via transcrição forçada)
3. cenas/*.png        → 8 cenas 1080×1920 geradas com Pillow
4. legendas.ass       → sincronizadas, com destaque amarelo
5. trilha.mp3         → volume em -22 dB sob a narração
6. montagem FFmpeg    → zoompan + xfade + overlay + subtitles
7. final.mp4          → H.264, CRF 20, 1080×1920, 30 fps, AAC 128k
```

**Comando-base** (componentes já testados nesta máquina):

```bash
ffmpeg -f concat -i cenas.txt -i narracao.mp3 -i trilha.mp3 \
  -filter_complex "[0:v]scale=1080:1920,fps=30[v]; \
                   [2:a]volume=0.08[t]; \
                   [1:a][t]amix=inputs=2:duration=first[a]" \
  -map "[v]" -map "[a]" \
  -vf "subtitles=legendas.ass:fontsdir=C\\:/Windows/Fonts" \
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -shortest final.mp4
```

---

## 8. Previsão de tempo e custo

| Etapa | Tempo estimado |
|---|---|
| Gerar as 8 cenas com Pillow | 40 min |
| Captura de tela do blog + tarja | 10 min |
| Alinhamento e legendas `.ass` | 30 min |
| Montagem e render | 15 min |
| Ajustes finais | 20 min |
| **Total** | **≈ 1h55** |

| Recurso | Custo |
|---|---|
| Narração Kokoro | R$ 0 |
| Cenas Pillow | R$ 0 |
| Legendas FFmpeg | R$ 0 |
| Trilha livre | R$ 0 |
| Render | R$ 0 |
| **Total** | **R$ 0** |

**Créditos de IA: 0.** Toda a produção é local.

---

## 9. O que preciso antes de renderizar

| # | Decisão | Opções |
|---|---|---|
| 1 | **Duração** | A) speed 1,22 → 55s · B) cortar 2 frases · **C) aceitar 60s** (recomendo) |
| 2 | **Print do Google** | autorizar captura da página pública · ou usar apenas cartelas tipográficas |
| 3 | **Trilha** | escolher faixa da biblioteca livre, ou seguir sem trilha no piloto |
| 4 | **Autorização final** | liberar a renderização |

Com esses quatro pontos resolvidos, o vídeo fica pronto em cerca de 2 horas, sem custo e sem publicação.
