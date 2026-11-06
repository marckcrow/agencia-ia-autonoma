# Agência de IA Autônoma — pacote de auditoria

Painel local de gestão editorial para três canais (IA na Prática, Você Sabia?, Poder 50+).
Sem dependências externas no servidor: apenas Node.js e módulos nativos.

## Requisitos

- Node.js 20 ou superior
- Python 3.10+ (opcional, só para gerar artes e narração)
- FFmpeg (opcional, só para render de vídeo)

## Como executar

```bash
cd agencia-ia
node server/index.js            # porta 4321 por padrão
# ou
PORTA=4599 node server/index.js
```

Abrir em `http://localhost:4321`.

Para dados isolados (recomendado em teste):

```bash
DB_ARQUIVO=/caminho/db.teste.json node server/index.js
```

## Como reproduzir os testes

```bash
node scripts/testar-etapa2.js       # 25 verificações: decisões, validação, persistência
node scripts/testar-integridade.js  # 21 verificações: vínculos pauta→roteiro→arte
```

Ambos criam um banco temporário próprio e **não alteram** `data/db.json`.

## Estrutura

```
agencia-ia/
├── data/db.json            banco de dados único (JSON)
├── data/db.*.json          cópias históricas por etapa
├── server/
│   ├── index.js            servidor HTTP + rotas
│   ├── store.js            persistência atômica
│   └── services/           calendário, indicadores, conteúdos, agentes, integrações
├── public/                 interface (HTML, CSS, JS puro)
│   ├── artes/              artes PNG geradas
│   ├── videos/             cenas e MP4 renderizados
│   ├── api/                snapshot estático para modo offline
│   └── js/                 icones, api, calendario, painel
├── scripts/                testes, geradores, snapshot
├── vozes/                  modelos Piper, venv Kokoro, amostras
└── docs/                   documentação técnica
```

## Rotas principais

| Método | Rota | Função |
|---|---|---|
| GET | `/api/estado` | estado completo + indicadores |
| GET | `/api/conteudos` | lista com filtros `canal`, `status` |
| POST | `/api/conteudos` | registrar conteúdo |
| POST | `/api/conteudos/:id/decisao` | aprovar / ajustes / rejeitar |
| POST | `/api/conteudos/:id/etapa` | aprovar etapa individual |
| POST | `/api/conteudos/:id/publicacao` | aprovação final (bloqueada se etapas pendentes) |
| GET | `/api/produtos` · POST | gestão multiproduto |
| GET | `/api/previas` | prévias de vídeo |
| GET | `/api/vozes` | amostras de voz |
| GET | `/api/estudio` | identidade visual, formatos, publicações |

## Regras de segurança implementadas

- Aprovar pauta, roteiro ou produção **não** autoriza publicação.
- Só a aprovação final libera agendamento — e exige as três etapas aprovadas.
- Qualquer decisão que não seja aprovação invalida a aprovação final.
- Nenhuma rota publica em rede social; não existe código de publicação.
- Escrita do banco é atômica (arquivo temporário + rename).

## O que este pacote NÃO contém

- Credenciais, tokens ou arquivos `.env` (não existem no projeto)
- Ambientes virtuais (`vozes/venv-kokoro`, ~1,2 GB)
- Modelos de voz binários (`vozes/piper/*.onnx`, ~190 MB)
- Artefatos de mídia pesados (MP4, WAV) — apenas manifesto com os nomes
