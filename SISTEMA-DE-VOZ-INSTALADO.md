# Sistema de voz instalado — 4 amostras geradas

**Data:** 05/11/2026 · **Custo: R$ 0** · **Nenhum vídeo produzido · nada publicado**

---

## 1. O que foi instalado (autorizado por você)

| Item | Detalhe |
|---|---|
| **piper-tts** | versão **1.8.0**, do projeto oficial `OHF-voice/piper1-gpl` |
| **onnxruntime** | 1.27.0 (dependência do Piper) |
| **Origem dos modelos** | repositório oficial **rhasspy/piper-voices** no Hugging Face |
| **Vozes baixadas** | cadu, faber, jeff — qualidade *medium*, pt_BR |
| **Tamanho total** | ~189 MB de modelos |

### Verificação de integridade (feita antes de usar)

| Voz | SHA-256 (início) | Idioma declarado | Sample rate | Falantes |
|---|---|---|---|---|
| cadu | `765f0809a6ea9035…` | **pt_BR** | 22.050 Hz | 1 |
| faber | `858555e3a064209c…` | **pt_BR** | 22.050 Hz | 1 |
| jeff | `3a6f4c46355813c2…` | **pt_BR** | 22.050 Hz | 1 |

Todos os arquivos de configuração confirmam **pt_BR** e **1 falante**. Nenhum arquivo corrompido, nenhum redirecionamento suspeito.

---

## 2. Licenças — resposta direta à sua pergunta

**Sim, as licenças permitem uso comercial e monetização.** Com uma ressalva que você deve conhecer.

| Camada | Licença | Uso comercial |
|---|---|---|
| **Código do Piper** (piper-tts) | **GPL** | ✅ Sim |
| **Modelos de voz** (cadu, faber, jeff) | **MIT** | ✅ Sim |
| **Dataset de treino** (voice-datasets) | **CC0** (domínio público) | ✅ Sim |

**A ressalva:** o projeto declara textualmente que *"o Piper é destinado a uso pessoal e pesquisa de TTS; não impomos restrições adicionais aos modelos de voz"*. Traduzindo: a licença jurídica é permissiva (MIT/CC0), mas **o projeto não oferece garantia para uso comercial** e recomenda uso pessoal. Não há proibição — há ausência de garantia.

**Para monetização:** as licenças não impedem. O que você assume é o risco de uma recomendação informal do projeto, não uma violação legal.

**Microsoft Maria:** é uma voz **do sistema Windows**, licenciada com o sistema operacional. **Não é licenciada para redistribuição comercial do áudio gerado.** Uso provisório para teste é aceitável; **usar em vídeo monetizado é zona cinzenta** — recomendo não fazer.

---

## 3. As quatro amostras geradas

Todas com o texto de 15 segundos do canal correspondente, normalizadas em **-16 LUFS** (padrão de podcast e redes sociais).

| Arquivo | Voz | Canal | Duração |
|---|---|---|---|
| **`vozes/amostras/ia-cadu.mp3`** | Piper cadu | IA na Prática | 15,9s |
| **`vozes/amostras/ia-jeff.mp3`** | Piper jeff | IA na Prática | 14,8s |
| **`vozes/amostras/poder-faber.mp3`** | Piper faber | Poder 50+ | 12,3s |
| **`vozes/amostras/sabia-maria.mp3`** | Microsoft Maria | Você Sabia? (provisório) | 17,6s |

Os `.wav` originais também estão lá, caso queira editar.

### Configuração usada

| Canal | Voz | Ajuste |
|---|---|---|
| IA na Prática | cadu **e** jeff | ritmo padrão — para comparar qual soa mais dinâmico |
| Poder 50+ | faber | ritmo padrão — o modelo já tem cadência mais lenta |
| Você Sabia? | Maria | velocidade **+1** para dar mais energia |

---

## 4. Minha leitura das vozes (para você comparar com a sua)

**cadu** — soa mais aberto e articulado. Tende a funcionar melhor em texto explicativo.
**jeff** — timbre ligeiramente mais grave e fechado. Pode dar mais autoridade.
**faber** — cadência mais lenta e densa, que combina com o tom maduro do Poder 50+.
**Maria** — a mais robótica das quatro, com prosódia previsível. Serve provisoriamente, não como identidade.

**Sobre a diferença entre elas:** são três modelos *medium* ajustados da mesma base inglesa. A distinção é real, mas menor do que a de vozes de estúdio. Isso é o teto do gratuito — e você deve ouvir para julgar se é suficiente.

---

## 5. O que ainda não está resolvido

**O "Você Sabia?" continua sem voz feminina natural.** O Piper não tem voz feminina pt_BR confirmada. As opções reais:

| Caminho | Qualidade | Custo | Situação |
|---|---|---|---|
| Microsoft Maria | ★★☆☆ | R$ 0 | ⚠️ licença não cobre redistribuição comercial |
| Gravação humana | ★★★★★ | R$ 0 | depende de pessoa a cada vídeo |
| TTS pago (ElevenLabs, Azure) | ★★★★★ | US$ 5–22/mês | exige contratação |
| Aguardar voz feminina pt_BR no Piper | ? | R$ 0 | não há previsão |

**Não vou apresentar a Maria como escolha definitiva** — ela é provisória e tem problema de licença para monetização.

---

## 6. Preservação

- Os três roteiros seguem intactos na **versão 2**, em "Aguardando aprovação".
- Painel, histórico e backups não foram tocados.
- Tudo o que instalei fica isolado em `agencia-ia/vozes/`.
- **Nenhum vídeo produzido. Nenhum conteúdo publicado. Nenhum serviço pago contratado.**

---

## 7. O que preciso de você

1. **Ouça as quatro amostras.**
2. Diga qual voz fica com **IA na Prática** (cadu ou jeff) e se **faber** serve para o **Poder 50+**.
3. Decida o caminho do **Você Sabia?**: aceitar a Maria provisoriamente, gravar você, ou considerar um TTS pago depois.

Depois disso, autorizamos a produção do primeiro vídeo.
