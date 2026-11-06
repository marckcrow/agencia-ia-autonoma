# Agência de IA Autônoma — Painel Central

**Etapa 1** — painel central de administração dos três canais (somente leitura).
**Etapa 2** — Sala de Direção com aprovar / solicitar ajustes / rejeitar, biblioteca de
conteúdos e persistência real das decisões.

Nenhuma conta externa é conectada, nada é publicado e nenhum serviço pago é acionado.

## Como abrir

**Opção 1 — servidor local (recomendada, API ao vivo):**

```bash
cd agencia-ia
node server/index.js          # porta 4321 (ou PORTA=4599 node server/index.js)
# abre em http://localhost:4321
```

> As decisões de direção **exigem** este servidor. Sem ele, o painel cai em modo
> somente leitura sobre o snapshot em `public/api/`.

**Opção 2 — site estático (pronto para a nuvem):**
sirva a pasta `public/`. O painel lê o snapshot em `public/api/*.json`.

Depois de qualquer alteração nos dados, regenere o snapshot:

```bash
node scripts/gerar-snapshot.js
```

## Testes

```bash
node scripts/testar-etapa2.js
```

Roda 25 verificações num banco temporário (sem tocar nos dados reais): os três botões,
as travas de validação, o reenvio, a gravação em disco, a persistência após reiniciar o
servidor e a ausência de qualquer rota de publicação.

## Estrutura

```
agencia-ia/
├── data/db.json                  # banco local (canais, agentes, conteúdos, histórico)
├── server/
│   ├── index.js                  # servidor HTTP + rotas da API (sem dependências)
│   ├── store.js                  # camada de persistência assíncrona (troca por banco na nuvem)
│   └── services/
│       ├── calendario.js         # grade semanal de slots
│       ├── indicadores.js        # indicadores derivados de dados reais
│       ├── conteudos.js          # criação, decisões e reenvio (regras de direção)
│       └── integracoes.js        # registro das integrações futuras
├── scripts/
│   ├── gerar-snapshot.js         # gera public/api/*.json
│   └── testar-etapa2.js          # 25 verificações automáticas
└── public/                       # interface (HTML, CSS, JS puro, sem CDN)
    ├── index.html
    ├── css/painel.css
    ├── js/{icones,calendario,api,painel}.js
    └── api/                      # snapshot JSON consumido pelo painel
```

## API

| Rota | Descrição |
|---|---|
| `GET /api/estado` | Estado completo: canais, agentes, semana, indicadores, integrações |
| `GET /api/calendario?semana=AAAA-MM-DD` | Grade semanal de 9 slots |
| `GET /api/canais` | Os três canais |
| `GET /api/agentes` | Os seis agentes |
| `GET /api/indicadores` | Indicadores de produção |
| `GET /api/conteudos` | Conteúdos registrados |
| `GET /api/conteudos` | Biblioteca (filtros `canal` e `status`) |
| `GET /api/conteudos/:id` | Detalhe + histórico de decisões + `podePublicar` |
| `POST /api/conteudos` | Registrar conteúdo (rota que os agentes vão usar) |
| `POST /api/conteudos/:id/decisao` | Aprovar · solicitar ajustes · rejeitar |
| `POST /api/conteudos/:id/reenviar` | Devolver para a fila após ajustes |
| `GET /api/decisoes` | Log imutável de todas as decisões |
| `GET /api/pendentes` | Fila de aprovação |
| `GET /api/integracoes` | Integrações futuras |

**Não existe rota de publicação.** O servidor não tem código capaz de publicar em rede social.

## Preparado para a nuvem

| Camada | Hoje | Na nuvem |
|---|---|---|
| Interface | `public/` estático | mesmo conteúdo publicado como site |
| API | Node nativo local | mesmo código em servidor |
| Persistência | JSON via `store` assíncrono | banco gerenciado — só troca a implementação |
| Serviços | `calendario`, `indicadores`, `integracoes` | inalterados |
| Agentes | especificados | rotinas agendadas |

## Regras embutidas

- `config.publicacaoAutomatica = false` — o sistema não publica.
- Ajustes e rejeições **exigem** orientação escrita; toda decisão gera registro imutável.
- `config.servicosPagosAutorizados = false` — nenhum serviço pago é usado.
- `config.aprovacaoObrigatoria = true` — só conteúdo com status `aprovado` poderá ser agendado.
- Nenhum indicador é preenchido com dado fictício: sem conteúdo real, tudo aparece em zero.
