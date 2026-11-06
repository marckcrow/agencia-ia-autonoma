# Etapa 4 — Planejamento técnico da automação audiovisual e gráfica

**Data:** 05/11/2026 · **Versão:** 2.2 → 3.0 (planejada)
**Nenhuma mudança estrutural executada. Nenhum crédito consumido. Nenhum serviço contratado.**

---

## 0. Resumo executivo

Hoje a produção é **semi-manual**: eu gero artes e vídeos rodando scripts Python + FFmpeg. O painel registra o resultado, mas não produz. A Etapa 4 transforma isso em **serviço do servidor**, acionável por botão e auditável.

| Hoje | Depois da Etapa 4 |
|---|---|
| `python scripts/gerar-artes.py` (manual) | `POST /api/producao/arte` → PNG no disco + registro no banco |
| `python scripts/gerar-previa-video.py` + FFmpeg (manual) | `POST /api/producao/video` → MP4 + pacote de produção |
| 1 estilo visual | **5 estilos por canal** |
| Arquivos soltos em `public/artes` | **Biblioteca indexada por ID** |
| Prévia só quando existe arquivo | Prévia obrigatória e vinculada |

**Custo em créditos de IA: 0.** Todo o pipeline é local (Pillow, FFmpeg, TTS já instalado). O único custo é tempo de CPU.

---

## 1. Arquitetura proposta

```
┌──────────────────────────────────────────────────────────────┐
│  INTERFACE (public/js)                                       │
│  Botões: "Gerar arte" · "Gerar vídeo" · "Escolher estilo"    │
└───────────────────────────┬──────────────────────────────────┘
                            │ POST /api/producao/*
┌───────────────────────────▼──────────────────────────────────┐
│  SERVIDOR (server/index.js)                                  │
│  · valida estado do conteúdo (só roteiro aprovado)           │
│  · enfileira job e devolve 202 Accepted                      │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│  FILA DE JOBS (server/services/fila.js)  ← NOVO              │
│  estado: pendente → rodando → concluido | erro               │
└───────┬───────────────────────────────────┬──────────────────┘
        │                                   │
┌───────▼──────────────┐          ┌─────────▼────────────────┐
│ A4 — PRODUTOR        │          │ A5 — EDITOR              │
│ services/produtor.js │          │ services/editor.js       │
│ · roteiro → cenas    │          │ · cenas → MP4            │
│ · narração TTS       │          │ · legendas ASS           │
│ · pacote produção    │          │ · trilha + mixagem       │
└───────┬──────────────┘          └─────────┬────────────────┘
        │                                   │
┌───────▼───────────────────────────────────▼────────────────┐
│  MOTORES LOCAIS                                             │
│  gerador-artes.js (5 estilos) · narrador.js (Piper/Kokoro)  │
│  renderizador.js (FFmpeg)                                   │
└───────┬─────────────────────────────────────────────────────┘
        │
┌───────▼─────────────────────────────────────────────────────┐
│  BIBLIOTECA (services/biblioteca.js) ← NOVO                 │
│  indexa MP4, PNG, JPG, WAV/MP3, thumbnails por ID           │
│  vínculo: produto → conteúdo → arquivo → versão             │
└─────────────────────────────────────────────────────────────┘
```

### Princípio de isolamento

Cada job recebe um **diretório próprio**: `midia/<produtoId>/<conteudoId>/v<N>/`. Um job nunca escreve na pasta de outro conteúdo — é a mesma correção do bug de associação, aplicada à produção.

---

## 2. Agente A4 — Produtor

### 2.1 Entrada

| Campo | Origem | Obrigatório |
|---|---|---|
| `roteiroId` | conteúdo aprovado na etapa "Roteiro" | sim |
| `estilo` | escolhido pelo administrador | sim |
| `voz` | definida no produto | sim |
| `duracaoAlvo` | 30, 45 ou 60s | não (padrão 60) |

### 2.2 Saída — pacote de produção (JSON)

```json
{
  "id": "prod-<uuid>",
  "roteiroId": "ad3c0543-...",
  "produtoId": "ia-na-pratica",
  "versao": 1,
  "estilo": "tech-grid",
  "voz": { "motor": "kokoro", "nome": "pm_alex", "speed": 1.15 },
  "narracao": { "arquivo": "midia/ia-na-pratica/ad3c0543/v1/narracao.wav", "duracao": 59.83 },
  "cenas": [
    { "ordem": 1, "inicio": 0, "fim": 6,
      "texto": "Seu assistente de IA só responde.",
      "visual": "cursor piscando em caixa de texto",
      "arquivo": "midia/.../cena1.png" }
  ],
  "legendas": "midia/.../legendas.ass",
  "status": "pronto_para_edicao"
}
```

### 2.3 Como o A4 gera as cenas

| Etapa | Técnica | Determinístico? |
|---|---|---|
| Dividir o roteiro em frases e atribuir tempo | proporcional ao áudio medido | sim |
| Escolher layout por tipo de frase (gancho, dado, CTA) | regras por palavra-chave | sim |
| Renderizar a cena | Pillow, 1080×1920 | sim |
| Gerar narração | Piper/Kokoro já instalados | sim |

**Não usa IA generativa de imagem.** As cenas são compostas com tipografia, formas e capturas reais — o que mantém custo zero e resultado reproduzível. Se quiser imagens geradas por IA, isso é outro caminho (plano pago).

---

## 3. Agente A5 — Editor

### 3.1 Entrada

Pacote de produção do A4.

### 3.2 Saída

| Arquivo | Formato | Uso |
|---|---|---|
| `video-9x16.mp4` | 1080×1920, H.264 CRF 18 | Shorts, Reels, TikTok |
| `video-1x1.mp4` | 1080×1080 | Feed quadrado |
| `video-4x5.mp4` | 1080×1350 | Feed vertical |
| `thumb.png` | 1080×1920 | capa |
| `legendas.srt` | texto | upload separado |

### 3.3 Pipeline

```
1. medir narração (ffprobe)
2. calcular timeline por frase
3. gerar legendas .ass com destaque
4. concat das cenas + zoompan leve
5. mixar narração (-16 LUFS) + trilha (-22 dB)
6. renderizar 3 formatos
7. extrair thumbnail do frame 2s
8. registrar na biblioteca
```

**Tempo estimado:** 3 a 6 minutos por vídeo nesta máquina (CPU, sem GPU). Os 3 formatos saem do mesmo master — não há re-render da composição.

---

## 4. Gerador de artes — 5 estilos

Cada canal terá 5 estilos selecionáveis por publicação.

### IA na Prática — estética tecnológica

| Estilo | Descrição visual |
|---|---|
| **tech-grid** | grade de circuitos, alto contraste, roxo `#6C5CE7` sobre fundo escuro |
| **terminal** | tipografia monoespaçada, verde sobre preto, simula linha de comando |
| **data-viz** | gráficos de barras e números grandes, cartelas de métrica |
| **glass-panel** | cartões translúcidos com desfoque, gradiente suave |
| **blueprint** | linhas técnicas finas, marcações de medida, azul elétrico |

### Você Sabia? — estética documental

| Estilo | Descrição visual |
|---|---|
| **documental** | faixa de papel, tipografia editorial, laranja `#E17055` |
| **mapa** | recorte cartográfico, marcação de local, escala |
| **lupa** | círculo de destaque sobre detalhe, fundo escurecido |
| **revista** | colunas, capitular, citação em destaque |
| **ficha-tecnica** | tabela de dados verificados, selo de fonte |

### Poder 50+ — estética humana

| Estilo | Descrição visual |
|---|---|
| **editorial** | layout de revista, verde `#00B894`, muito respiro |
| **acolhedor** | blocos arredondados, tons claros, tipografia grande |
| **numero-grande** | um dado dominante, resto discreto |
| **guia-pratico** | passos numerados, ícones simples |
| **depoimento** | espaço para foto de pessoa, citação e nome |

**Total: 15 estilos.** Cada estilo é uma função de composição em `gerador-artes.js`, recebendo o mesmo conteúdo e o mesmo ID — só a aparência muda.

---

## 5. Biblioteca de arquivos

### 5.1 Modelo de dados

```json
"biblioteca": {
  "itens": [
    {
      "id": "arq-<uuid>",
      "produtoId": "ia-na-pratica",
      "conteudoId": "ad3c0543-...",
      "tipo": "video | imagem | audio | thumbnail",
      "formato": "mp4 | png | jpg | wav | mp3",
      "arquivo": "midia/ia-na-pratica/ad3c0543/v1/video-9x16.mp4",
      "bytes": 3481920,
      "largura": 1080, "altura": 1920, "duracao": 59.83,
      "versao": 1,
      "origem": "A5",
      "criadoEm": "2026-11-05T..."
    }
  ]
}
```

### 5.2 Garantias

- **ID único por arquivo** — nenhum arquivo é referenciado por caminho solto.
- **Vínculo obrigatório** com `produtoId` e `conteudoId` — impossível um arquivo aparecer em outro conteúdo.
- **Versão** — cada nova geração cria `v2`, `v3`; nada é sobrescrito.
- **Verificação de integridade** — rota `GET /api/biblioteca/:id` confere se o arquivo existe no disco antes de servir.

---

## 6. Arquivos que serão modificados ou criados

### Novos

| Arquivo | Responsabilidade | Linhas estimadas |
|---|---|---|
| `server/services/fila.js` | fila de jobs com estado e log | ~120 |
| `server/services/produtor.js` | **A4** — roteiro → pacote de produção | ~260 |
| `server/services/editor.js` | **A5** — pacote → MP4 nos 3 formatos | ~300 |
| `server/services/biblioteca.js` | indexação e integridade de mídia | ~150 |
| `server/services/narrador.js` | wrapper Piper/Kokoro por produto | ~90 |
| `server/services/gerador-artes.js` | 15 estilos de composição | ~600 |
| `scripts/testar-producao.js` | testes ponta a ponta | ~200 |

### Modificados

| Arquivo | Mudança | Risco |
|---|---|---|
| `server/index.js` | +8 rotas de produção e biblioteca | baixo |
| `server/services/agentes.js` | A4/A5 passam a chamar os serviços | médio |
| `server/services/indicadores.js` | contadores de jobs e mídia | baixo |
| `public/js/painel.js` | botões, seleção de estilo, galeria | médio |
| `public/js/api.js` | novos métodos | baixo |
| `public/css/painel.css` | estilos da galeria e do seletor | baixo |
| `data/db.json` | novos campos `biblioteca`, `jobs` | **médio — exige migração** |

### Preservado sem alteração

`calendario.js`, `integracoes.js`, `store.js`, `scripts/gerar-snapshot.js`, toda a Ajuda Inteligente, roteiros v2, vozes e artes existentes.

---

## 7. Dependências

| Dependência | Já instalada? | Ação |
|---|---|---|
| Node.js 24 | ✅ | nenhuma |
| FFmpeg 8.1 | ✅ | nenhuma |
| Python 3.14 + Pillow | ✅ | nenhuma |
| Piper TTS 1.8 | ✅ | nenhuma |
| Kokoro 0.2.2 (venv) | ✅ | nenhuma |
| numpy | ✅ | nenhuma |
| **Nada novo** | — | **zero instalações** |

O servidor Node chamará Python por `child_process` — mesmo padrão que já uso nos scripts, mas disparado pelo painel.

**Risco de bloqueio:** se o Node aguardar o Python terminar, a requisição HTTP demora 3–6 min e o navegador pode expirar. Por isso a **fila assíncrona** é obrigatória, não opcional.

---

## 8. Custos estimados

| Item | Custo |
|---|---|
| Créditos de IA | **0** |
| Serviços externos | **R$ 0** |
| Licenças de mídia | **R$ 0** (trilha sintetizada local; imagens compostas) |
| **Total financeiro** | **R$ 0** |
| Tempo de desenvolvimento | **14 a 20 horas** |
| Tempo por arte | 2–4 segundos |
| Tempo por vídeo (3 formatos) | 3–6 minutos |
| Espaço em disco por vídeo | ~10 MB (3 formatos) |

**Se a produção crescer:** 9 vídeos/semana × 10 MB = 90 MB/semana, ~360 MB/mês. Cabe folgado nos 9,8 GB livres.

---

## 9. Testes necessários

### Automáticos

| # | Teste | Critério |
|---|---|---|
| 1 | A4 gera pacote a partir de roteiro aprovado | 5 blocos, ≥5 cenas, narração com duração > 0 |
| 2 | A4 **recusa** roteiro não aprovado | HTTP 409 |
| 3 | A5 gera os 3 formatos | 3 arquivos com dimensões corretas |
| 4 | Legendas sincronizadas | última legenda ≤ duração do áudio |
| 5 | Áudio final | −16 LUFS ±1, pico ≤ −1 dB |
| 6 | Biblioteca indexa e recupera por ID | arquivo existe no disco |
| 7 | **Isolamento entre produtos** | job do produto A não escreve na pasta do produto B |
| 8 | Versão incrementa sem sobrescrever | v1 e v2 coexistem |
| 9 | Fila: estado final | `concluido` ou `erro`, nunca preso em `rodando` |
| 10 | 15 estilos renderizam | nenhum erro, PNG válido 1080×1350 |
| 11 | Testes não tocam o banco de produção | hash MD5 inalterado |
| 12 | Aprovação final continua bloqueada | HTTP 409 sem as 3 etapas |

### Manuais (navegador)

1. Gerar arte pelos 5 estilos de um canal e comparar
2. Gerar vídeo pelo painel e assistir ao MP4
3. Aprovar etapa de produção e verificar indicador
4. Tentar aprovar publicação sem produção → bloqueado
5. Biblioteca: filtrar por produto, formato e data
6. Ajuda Inteligente continua funcionando em todas as abas

---

## 10. Ordem de execução proposta

| Fase | Entrega | Tempo | Risco |
|---|---|---|---|
| **1** | Biblioteca + migração do banco | 3 h | médio — mexe no `db.json` |
| **2** | Gerador de artes com 15 estilos | 5 h | baixo |
| **3** | A4 (produtor) + fila | 4 h | médio |
| **4** | A5 (editor) + 3 formatos | 5 h | médio |
| **5** | Interface: botões, seletor, galeria | 3 h | baixo |

Cada fase termina com os testes passando e **backup antes de tocar o banco**.

---

## 11. O que continua fora

| Item | Motivo |
|---|---|
| Publicação automática | não autorizado; sem integração |
| Conexão com redes sociais | não autorizado |
| Operação com o computador desligado | exige infraestrutura em nuvem |
| Imagens geradas por IA | exige plano pago |
| A6 — gestor de publicações | depende de integração |

---

## 12. Riscos identificados

| Risco | Impacto | Mitigação |
|---|---|---|
| Requisição HTTP longa expira no navegador | alto | fila assíncrona com polling |
| Migração do `db.json` corromper dados | alto | backup + cópia `.pre-etapa4` + script de migração idempotente |
| FFmpeg falhar em fonte com acento no caminho | médio | copiar arquivos para pasta sem acento antes do render |
| Python não disponível no PATH do servidor | médio | caminho absoluto configurável |
| Dois jobs simultâneos disputarem CPU | médio | fila com concorrência 1 |
| Crescimento do `db.json` | baixo | mover biblioteca para arquivo separado se passar de 1 MB |

---

## 13. Aprovação necessária

Para começar, preciso de autorização explícita para:

1. **Criar os 7 arquivos novos** e modificar os 6 existentes
2. **Migrar o banco** com backup prévio obrigatório
3. **Executar a Fase 1** (biblioteca + migração)

Nada é alterado antes disso. O banco de produção segue intacto, com os 18 conteúdos, 3 produtos, 3 artes e a prévia do vídeo.
