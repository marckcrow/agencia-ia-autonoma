# Vozes: player na Sala de Direção, alternativas femininas e arquitetura

**Data:** 05/11/2026 · **Nenhum crédito gasto · nenhuma ferramenta nova instalada · nenhum vídeo produzido**

---

## 1. Player de áudio na Sala de Direção ✅

Nova aba **Vozes** no painel, validada em navegador real:

| Item | Resultado |
|---|---|
| Aba "Vozes" | carrega sem erro |
| Cartões por canal | **3** (IA na Prática, Você Sabia?, Poder 50+) |
| Players de áudio | **8** (4 amostras × 2 lugares: cartão + tabela) |
| Arquivos servidos | HTTP 200, `audio/mpeg`, com suporte a *Range* (206) |
| Durações lidas | cadu 15,88s · jeff 14,84s · faber 12,27s · Maria 17,60s |
| Erros de console | **zero** |

Cada cartão mostra também os **parâmetros de voz** (velocidade, variação, expressividade e pausa entre frases) e a **licença** de cada amostra.

**Status das vozes:** todas continuam como **candidatas**. Nenhuma foi marcada como definitiva — a coluna "vozAtual" segue vazia para os três canais.

---

## 2. Alternativas de voz feminina pt-BR — pesquisa

### 2.1 Kokoro TTS — a mais promissora

| Item | Detalhe |
|---|---|
| **Vozes pt_BR** | **1 feminina (`pf_dora`)** e 2 masculinas (`pm_alex`, `pm_santa`) |
| **Licença dos pesos** | **Apache 2.0** — permite uso comercial explicitamente |
| **Licença do software** | Apache 2.0 (o pacote `kokoro`) |
| **Dados de treino** | declaradamente "permissivo/não protegido por direitos autorais" |
| **Tamanho** | 82 milhões de parâmetros — leve, roda em CPU |
| **Qualidade** | 82M bem avaliado; comparável a modelos maiores |

**Ponto crítico que você pediu para verificar separadamente:** a licença Apache 2.0 vale para **os pesos do modelo**. As **vozes individuais** não têm licença própria listada no VOICES.md — apenas uma classificação de qualidade e o hash SHA256. Ou seja: **a licença do software não deve ser automaticamente estendida às vozes**; o que existe é a Apache 2.0 do pacote de pesos, que cobre o conjunto.

**Ressalva honesta:** `pf_dora` é a **única** voz feminina pt-BR do Kokoro. Se ela não agradar, não há segunda opção no mesmo modelo.

**Atenção a sites falsos:** a página oficial do modelo avisa que domínios com "kokoro" no nome (ex.: `kokorottsai.com`) **não são afiliados** e podem ser golpe. Só usar o repositório oficial.

### 2.2 Outras opções avaliadas

| Solução | Voz feminina pt-BR | Licença | Situação |
|---|---|---|---|
| **Kokoro 82M** | ✅ `pf_dora` | Apache 2.0 | **requer instalação** (não autorizada) |
| **Chatterbox** | não confirmado pt-BR | MIT | requer instalação; foco em clonagem |
| **Magpie TTS Multilingual (NVIDIA)** | não confirmado pt-BR | permissiva | pesado, exige GPU |
| **Piper TTS** | ❌ nenhuma confirmada | MIT/CC0 | **já instalado** |
| **Microsoft Maria** | ✅ | **licença Windows — não cobre redistribuição comercial** | **já instalado, provisório** |
| **gTTS (Google Translate)** | ✅ | termos do Google, uso comercial limitado | requer pip + internet |
| **Notevibes / SpeechGen / AnySpeech** | ✅ várias | comerciais, mediante plano | **pagos** |
| **ElevenLabs / Azure TTS** | ✅ dezenas | comerciais | **pagos** |

**Conclusão da pesquisa:** a única voz feminina pt-BR **gratuita, neural e com licença comercialmente permissiva** que encontrei é **`pf_dora` do Kokoro**. Todas as demais são pagas, ou têm restrição de licença, ou não confirmam suporte a pt-BR.

---

## 3. Comparação de naturalidade, expressividade, integração, custo e qualidade

| | **Piper cadu/jeff/faber** | **Kokoro pf_dora** | **Microsoft Maria** | **TTS pago** |
|---|---|---|---|---|
| **Naturalidade** | ★★★☆ | ★★★★ | ★★☆☆ | ★★★★★ |
| **Expressividade** | ★★☆ | ★★★★ | ★★☆ | ★★★★★ |
| **Facilidade de integração** | ★★★★★ já instalado | ★★★ precisa instalar | ★★★★★ já instalado | ★★★ exige conta e chave |
| **Custo** | R$ 0 | R$ 0 | R$ 0 (mas licença restrita) | US$ 5–22/mês |
| **Qualidade geral** | boa, "medium" | boa, acima do Piper | fraca, robótica | excelente |
| **Licença comercial** | MIT/CC0 — **ok, sem garantia** | Apache 2.0 — **ok** | **não cobre** | conforme plano |
| **Vozes disponíveis pt-BR** | 3 masculinas | **1 feminina + 2 masculinas** | 1 feminina | dezenas |
| **Roda offline** | ✅ | ✅ | ✅ | ❌ |

**Leitura:** o Kokoro seria superior ao Piper em naturalidade **e** resolveria o problema da voz feminina. É a única opção gratuita que atende os três canais com qualidade acima da atual.

---

## 4. Arquitetura de voz fixa por canal

### 4.1 Modelo de dados (já implementado no banco)

```json
"vozes": {
  "canais": {
    "ia-na-pratica": {
      "vozAtual": null,
      "candidatas": ["cadu", "jeff"],
      "parametros": { "lengthScale": 0.95, "noiseScale": 0.667,
                      "noiseW": 0.8, "sentenceSilence": 0.25 }
    }
  }
}
```

| Parâmetro | O que controla | Efeito prático |
|---|---|---|
| **lengthScale** | velocidade | < 1 = mais rápido; > 1 = mais lento |
| **noiseScale** | variação de tom | maior = mais expressivo, menor = mais estável |
| **noiseW** | variação de duração | controla o "balanço" da fala |
| **sentenceSilence** | pausa entre frases | respiro dramático |

### 4.2 Presets propostos

| Canal | lengthScale | noiseScale | noiseW | Pausa | Racional |
|---|---|---|---|---|---|
| **IA na Prática** | **0,95** | 0,667 | 0,8 | **0,25s** | ritmo ágil, pausas curtas, dicção firme |
| **Você Sabia?** | **1,00** | **0,70** | **0,85** | **0,35s** | mais expressividade, pausa antes das revelações |
| **Poder 50+** | **1,08** | **0,60** | **0,70** | **0,45s** | ritmo lento, tom estável, pausas longas |

### 4.3 Pronúncia e consistência

- **Dicionário de pronúncia por canal:** termos técnicos (Gemini, Argon, API, agente) com grafia fonética fixa, para que a mesma palavra soe igual em todos os vídeos.
- **Normalização de áudio:** todas as narrações saem em **-16 LUFS**, para que o volume seja idêntico entre vídeos — identidade sonora inclui volume constante.
- **Bloqueio de troca acidental:** o campo `vozAtual` só muda por decisão explícita sua; o pipeline de produção lê esse campo e recusa gerar com voz diferente.

### 4.4 O que falta implementar

O pipeline de geração já aceita os parâmetros. Falta:
1. O **dicionário de pronúncia** por canal (posso montar, custo zero).
2. A **validação** que impede renderizar com voz não aprovada.
3. O **motor Kokoro** — depende de instalação autorizada.

---

## 5. O que preciso de você

| Decisão | Opções |
|---|---|
| **Voz do IA na Prática** | cadu ou jeff |
| **Voz do Poder 50+** | faber (única candidata masculina madura) |
| **Voz do Você Sabia?** | **instalar Kokoro** (pf_dora) · manter Maria provisória · gravação humana · TTS pago |

**Se autorizar o Kokoro:** é `pip install kokoro` + dependências (~2 a 3 GB com PyTorch), roda offline, Apache 2.0. Tempo de instalação: 15 a 30 minutos. **Custo: R$ 0.**

---

## 6. Preservação

- Os três roteiros seguem intactos em **versão 2**, "Aguardando aprovação".
- 18 itens no banco · 89 registros de histórico · 7 decisões · backups preservados.
- Nada foi publicado, nenhum vídeo produzido, nenhum serviço contratado.
