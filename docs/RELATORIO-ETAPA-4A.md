# Relatório da Etapa 4A — Estabilização e correções de consistência

**Data:** 06/11/2026 · **Branch:** `dev/integracoes-agentes` (a partir de `main` sincronizada)
**Servidor principal:** `http://localhost:4599` (mantido operacional)
**Custo:** 0 créditos de IA · nenhum serviço pago · nenhuma publicação · nenhuma credencial

---

## 1. Backup e integridade

| Item | Valor |
|---|---|
| Arquivo | `data/db.pre-etapa4a-20261106-122533.json` |
| SHA-256 (original = cópia) | `2FB56D22488593E03746F037F6D2245BDBDB6E92B3F7E5863D4BFB1281105AE6` |
| Conteúdos preservados | 18 |
| Decisões preservadas | 7 |
| Execuções preservadas | 3 |
| Avaliações preservadas | 15 |
| Snapshots existentes | 19 (nenhum apagado ou alterado) |

O backup foi conferido por hash antes de qualquer alteração de código ou de dados.

## 2. Correções realizadas

### 2.1 Vocabulário de status — `aprovado` × `aprovado_final`

O sistema tinha **dois vocabulários para a mesma coisa**: a Sala de Direção legado gravava
`aprovado`, e o fluxo de 4 etapas gravava `aprovado_final` — que não existia no mapa de status.
Consequência: o item aprovado final não tinha rótulo e não era protegido contra nova decisão.

- `server/services/conteudos.js`: `aprovado_final` entrou no mapa `STATUS`; `validarDecisao()`
  agora **recusa** (HTTP 409) qualquer nova decisão sobre conteúdo com aprovação final.
- `server/services/indicadores.js`: `aprovado_final` entrou na lista de status e nos indicadores.
- `public/js/painel.js`: rótulo "Aprovado para publicação" + coluna "Aprovado (final)" no quadro
  de produção.

### 2.2 `podePublicar()` e publicação (agora coerente)

Antes, `podePublicar()` só aceitava `aprovado` — ou seja, **o conteúdo com aprovação final
nunca ficava publicável**, e a trava de "aprovação final obrigatória" ficava sem efeito prático.

Agora:
- `aprovado_final` → publicável **somente** se `aprovacoes.final.status === 'aprovada'`;
- `aprovado` (fluxo legado, sem as 4 etapas) → publicável, como antes;
- `aprovado` com fluxo de 4 etapas iniciado, mas sem aprovação final → **não** publicável;
- qualquer outro status → não publicável.

`publicacaoAutomatica`, `servicosPagosAutorizados` (false) e `aprovacaoObrigatoria` (true)
permanecem **inalterados**. Não existe rota de publicação.

### 2.3 Associação entre conteúdo aprovado e slot do calendário

Novo serviço em `server/services/calendario.js`: `agendar()` e `desagendar()`.
Novo endpoint `POST /api/conteudos/:id/slot` e `DELETE /api/conteudos/:id/slot`.

Regras:
- só conteúdo **aprovado** pode ser agendado (`podeAgendar`: `pauta_aprovada`, `aprovado`,
  `aprovado_final`) — senão HTTP 409;
- o slot precisa existir na grade do canal (dia/hora) — senão HTTP 400;
- um slot aceita **um** conteúdo por vez — senão HTTP 409;
- agendar é **plano**, não publicação: nada é enviado a nenhuma rede;
- o calendário expõe `prontoParaPublicar` por slot.

### 2.4 Serialização das transações (`server/store.js`)

- Transações agora passam por uma **fila única**: nenhum read-modify-write concorrente se
  sobrescreve. Antes, duas requisições simultâneas podiam partir do mesmo estado.
- O cache é invalidado quando `data/db.json` muda **por fora do processo** (edição manual,
  script, outra instância). Antes, a próxima gravação do servidor apagava silenciosamente a
  edição externa.
- A gravação continua atômica (`tmp` + `rename`).

### 2.5 Metadados dos agentes (`scripts/estabilizar-etapa4a.js`)

| Agente | Antes | Agora | Base factual |
|---|---|---|---|
| A1 Pesquisador de tendências | `nao_implementado` | `implementado` | código em `server/services/agentes.js`, execução registrada (15 itens, 42 créditos) |
| A2 Estrategista de conteúdo | `nao_implementado` | `implementado` | código próprio, execução registrada (15 avaliações, 18 créditos) |
| A3 Roteirista criativo | `nao_implementado` | `implementado` | código próprio, execução registrada (3 roteiros, 64 créditos) |
| A4 / A5 / A6 | `nao_implementado` | `nao_implementado` | **apenas especificação, sem código** |

Cada agente ganhou um campo `escopo` com o que existe de fato. O painel deixou de afirmar
"os seis agentes estão especificados, não implementados".

### 2.6 Contabilização de créditos (auditável)

`db.meta.creditosConsumidos` estava em **0**, embora as execuções somassem **124**.
Agora o número é **derivado** de `db.execucoes` (fonte declarada em `db.meta.creditosFonte`)
e o script de estabilização é idempotente — nada foi digitado à mão.

### 2.7 Snapshots e indicadores

`scripts/gerar-snapshot.js` foi executado **depois** da validação dos 85 testes:
18 arquivos em `public/api/` refletem o estado corrigido (o snapshot anterior era de 05/11).

## 3. Testes

| Suíte | Verificações | Resultado |
|---|---|---|
| `scripts/testar-etapa2.js` | 25 | ✅ todas passaram |
| `scripts/testar-integridade.js` | 21 | ✅ todas passaram |
| `scripts/testar-etapa4a.js` (novo) | 39 | ✅ todas passaram |
| **Total** | **85** | **✅ 85/85** |

A nova suíte cobre: vocabulário de status, obrigatoriedade da aprovação final, bloqueio de
decisão duplicada, vínculo com o slot (válido, inválido, duplicado, liberação), leitura do
slot no calendário, 20 gravações concorrentes pela API, 25 transações concorrentes na camada
de persistência, detecção de alteração externa do arquivo e conferência dos metadados do
banco real (18 conteúdos, 7 decisões, 3 execuções, 15 avaliações preservados).

## 4. Achado operacional (fora do escopo do código)

Havia um **segundo processo do painel** rodando desde 05/11 07:49 na porta **4321** (padrão),
com uma cópia antiga do banco em memória: ele servia **0 conteúdos** (o banco real tem 18) e,
por estar com o código antigo, qualquer gravação nele teria **apagado** o banco de produção.
Esse processo foi reiniciado com o código novo: hoje as duas portas (4321 e 4599) servem os
mesmos 18 conteúdos e o `db.json` ficou com o hash inalterado após a operação.

## 5. Riscos remanescentes

1. **Duas instâncias do painel** apontam para o mesmo `data/db.json` (4321 e 4599). Com a
   serialização agora em vigor e a invalidação de cache por mtime, o risco caiu muito, mas
   duas gravações simultâneas em processos diferentes ainda podem colidir. Recomendação:
   deixar **uma** instância canônica.
2. `data/db.json` continua **fora do Git** (`.gitignore`): o histórico do banco depende dos
   snapshots manuais em `data/`.
3. O cache externo detecta mudanças por `mtime + tamanho`; uma edição externa com o mesmo
   tamanho no mesmo milissegundo passaria despercebida (risco teórico).
4. O snapshot estático (`public/api/`) passa a divergir do banco assim que houver nova escrita
   até o próximo `gerar-snapshot.js`.
5. Aprovação final e agendamento continuam sendo passos manuais da Direção — a Etapa 4B é
   justamente a interface dos agentes A1, A2 e A3.
6. `ffmpeg.exe` continua instalado dentro de `C:\Program Files\nodejs\` (risco em upgrade do
   Node) e o Piper depende do Python 3.14 do sistema.

## 6. O que NÃO foi feito (por decisão)

- Nada foi mergeado na `main` e **nada foi enviado ao GitHub** (`git push` não executado).
- Nenhuma rota de publicação criada; nenhum serviço pago acionado; nenhuma credencial gerada
  ou enviada.
- Nenhum dado, backup ou snapshot foi excluído.
- A4, A5 e A6 continuam sem código — declarar o contrário seria inventar funcionalidade.
- Nenhuma interface nova para os agentes (é a Etapa 4B).
