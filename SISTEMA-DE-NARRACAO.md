# Sistema de narração — três vozes para três canais

**Data:** 05/11/2026 · **Nenhum crédito gasto · nada instalado · nenhum vídeo produzido**

---

## 1. Resumo executivo

O sistema atual desta máquina tem **três vozes em português brasileiro** e **nenhuma delas é neural**. A melhor disponível é a **Microsoft Maria Desktop** (voz do Windows, pt-BR feminina), claramente superior à eSpeak, mas ainda **sintética** — não é qualidade de estúdio.

**Para chegar na qualidade que você descreveu** (dinâmica, envolvente, acolhedora), a única opção gratuita local é o **Piper TTS com modelos pt_BR**, que exige **instalação** — e por isso **peço sua autorização antes**.

**O que já consegui produzir de graça:** duas amostras de demonstração (eSpeak e Microsoft Maria). Estão nos arquivos entregues.

---

## 2. O que está REALMENTE disponível agora

### 2.1 Testado nesta máquina

| Voz | Motor | Idioma | Gênero | Estado | Qualidade |
|---|---|---|---|---|---|
| **Microsoft Maria Desktop** | SAPI Windows | **pt-BR** | Feminina | ✅ Funciona | ★★★☆ — a melhor local atual |
| Portuguese (Brazil) | eSpeak NG | pt-BR | Masculina | ✅ Funciona | ★☆☆☆ — robótica |
| Brazilian-Mbrola-1 | eSpeak NG | pt-BR | Masculina | ❌ **Falha**: `Could not load mbrola.dll` | indisponível |
| Brazilian-Mbrola-2 / 4 | eSpeak NG | pt-BR | Femininas | ❌ **Mesma falha** | indisponível |
| Zira / David | SAPI Windows | **en-US** | F / M | ✅ Funcionam | ❌ inglês — não serve |

**Detalhe técnico importante:** as vozes Mbrola aparecem na lista do eSpeak mas **não carregam** — falta a biblioteca `mbrola.dll`. Não é problema de configuração, é dependência ausente.

### 2.2 A limitação honesta

**Não existe nenhuma voz neural pt-BR instalada nesta máquina.** As três identidades que você descreveu não podem ser criadas com o que está aqui hoje.

---

## 3. Opções avaliadas

| Opção | pt-BR | Neural? | Custo | Licença comercial | Instalação |
|---|---|---|---|---|---|
| **Microsoft Maria** (já instalada) | ✅ | ❌ | R$ 0 | Uso local do Windows | **nenhuma** |
| **eSpeak NG** (já instalada) | ✅ | ❌ | R$ 0 | GPL — uso livre | **nenhuma** |
| **Piper TTS** | ✅ 3 vozes | ✅ | R$ 0 | **MIT** (código) + modelos com dataset **CC0** | **~65 MB por voz** |
| Google gTTS | ✅ | ✅ | R$ 0 | Exige internet; uso comercial limitado pelos termos | pip |
| ElevenLabs / Azure TTS | ✅ | ✅ | **Pago** | Comercial mediante plano | — |
| Abacus (plano) | ✅ | ✅ | **Pago** | Conforme plano | — |
| Gravação humana | ✅ | — | R$ 0 | Direitos seus | — |

---

## 4. Piper TTS — a opção recomendada

### 4.1 Vozes pt_BR que existem de verdade

Confirmei no repositório oficial `rhasspy/piper-voices`:

| Voz | Qualidade | Tamanho | Download |
|---|---|---|---|
| **cadu** | medium | 63,0 MB | disponível |
| **faber** | medium | 63,2 MB | disponível |
| **jeff** | medium | 63,0 MB | disponível |

**Uma quarta voz (`edresson`, low) não é confiável** — há relato documentado de erro de inferência. Não vou usá-la.

### 4.2 Licenças — verificado no MODEL_CARD oficial

Cada voz declara:
- **Dataset: CC0** (domínio público) — uso comercial livre
- **Modelo: MIT**
- **Amostragem: 22.050 Hz, mono**
- Todas foram ajustadas a partir da voz inglesa *lessac* de qualidade medium

**Aviso do próprio projeto:** o Piper é destinado a uso pessoal e pesquisa de TTS. A organização **não impõe restrições adicionais** aos modelos — mas a recomendação de uso pessoal está no texto oficial, e você deve conhecê-la antes de decidir.

### 4.3 Limitação honesta sobre as três vozes

As três são modelos **medium** ajustados da mesma base inglesa. Isso significa que **a distinção entre elas é menor do que a de vozes de estúdio** — não espere a diferença entre uma narradora de documentário e um locutor de tecnologia. Dá para diferenciar com **ritmo e tom** (o Piper aceita controle de velocidade e pausa), mas é o limite do gratuito.

**E o gênero:** os cards não declaram gênero. Pelos nomes e amostras públicas, `cadu`, `faber` e `jeff` são percebidos como **masculinos**. **Não há voz feminina pt_BR medium confirmada no conjunto.** Isso é um problema real para o "Você Sabia?", que você quer feminino.

### 4.4 O que isso significa para os três narradores

| Canal | Voz desejada | Situação real |
|---|---|---|
| **IA na Prática** | masculina dinâmica | ✅ cadu ou jeff + velocidade maior |
| **Você Sabia?** | feminina envolvente | ⚠️ **só a Microsoft Maria** (feminina pt-BR) ou gravação humana |
| **Poder 50+** | masculina madura | ✅ faber + velocidade menor |

**A solução mais realista sem gastar:** Maria (Windows) para o Você Sabia?, Piper para os dois masculinos, e ajuste fino de ritmo em cada um.

---

## 5. Amostras geradas gratuitamente

Consegui produzir **duas** amostras com o que já está instalado — sem instalar nada e sem gastar crédito:

| Arquivo | Voz | Texto |
|---|---|---|
| `vozes/testes/esp-ptbr.wav` | eSpeak NG pt-BR (masculina) | trecho do roteiro do IA na Prática |
| `vozes/testes/windows-maria.wav` | Microsoft Maria (feminina pt-BR) | mesmo trecho |
| `vozes/testes/windows-maria-rapida.wav` | Maria com ritmo acelerado | mesmo trecho |

**Não consegui gerar as três amostras neurais** porque o Piper não está instalado. Para isso preciso da sua autorização.

---

## 6. O que estou pedindo

Para entregar as três vozes que você descreveu, preciso de autorização para **uma** destas opções:

### Opção A — Instalar Piper TTS (recomendada)
- **O que instala:** `pip install piper-tts` (~20 MB) + 3 modelos (~190 MB no total)
- **Custo:** **R$ 0** — tudo open source
- **Tempo:** 10 a 15 minutos
- **Resultado:** vozes neurais medium, duas masculinas e uma alternativa para o feminino
- **Risco:** baixo; fica isolado em `agencia-ia/vozes/`

### Opção B — Usar só o que está instalado
- **Custo:** R$ 0, **nada instala**
- **Resultado:** Maria (feminina) + eSpeak (masculina) — **não atende** a descrição das três personalidades
- **Serve apenas** para protótipo interno, não para publicação

### Opção C — Gravação humana
- **Custo:** R$ 0
- **Resultado:** a melhor qualidade possível, com a sua voz ou de alguém da equipe
- **Limitação:** depende de pessoa disponível a cada vídeo

### Opção D — TTS pago (não recomendada agora)
- **Custo:** a partir de US$ 5–22/mês dependendo do serviço
- **Resultado:** qualidade de estúdio com vozes femininas e masculinas naturais
- **Recomendação:** só depois de validar o formato com as opções gratuitas

---

## 7. Textos de demonstração de 15 segundos

### Narrador 1 — IA na Prática (masculino, dinâmico, tecnológico)
> "Seu assistente de IA só responde. O que já existe hoje vai lá e faz. A diferença se chama agente — e ele já roda sozinho no seu trabalho. A pergunta não é se a IA pensa melhor. É se ela termina o que começou."

### Narradora 2 — Você Sabia? (feminino, curioso, envolvente)
> "Existe um fungo no Oregon que ocupa quase nove quilômetros quadrados. É o maior organismo vivo já medido — e ele está debaixo do chão, numa floresta. O que você vê na superfície são só os cogumelos."

### Narrador 3 — Poder 50+ (masculino, maduro, acolhedor)
> "Noventa minutos por semana. Num estudo de trinta anos, esse foi o grupo com menor risco observado. Não é uma prova de causa — é uma associação. E o melhor resultado apareceu quando a força caminhou junto com a atividade aeróbica."

---

## 8. O que preservo

Os três roteiros seguem intactos na versão 2, em "Aguardando aprovação". O painel, os backups e o histórico não foram tocados. **Nenhum vídeo foi produzido e nenhum conteúdo foi publicado.**

**Aguardo sua decisão sobre a Opção A, B, C ou D.**
