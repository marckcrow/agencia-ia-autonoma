# Relatório — Etapa 2: Sala de Direção

**Data:** 05/11/2026 · **Versão:** 2.0.0 · **Fuso:** America/Sao_Paulo
**Autorização:** exclusivamente a Etapa 2. Etapa 3 não iniciada.

---

## 1. Cópia de segurança da Etapa 1 (feita antes de qualquer alteração)

| Item | Caminho |
|---|---|
| Pasta completa da Etapa 1 | `agencia-ia-etapa1-backup/` |
| Arquivo compactado | `backups/agencia-ia-etapa1-20261105-0756.tar.gz` |

Restaurar, se algo der errado:

```bash
cd C:/Users/Administrador/.abacusai-bot/session-home
rm -rf agencia-ia && cp -r agencia-ia-etapa1-backup agencia-ia
```

---

## 2. O que foi implementado

### Sala de Direção
- Fila com uma ficha por conteúdo pendente: canal, título, status, versão, resumo, roteiro completo e data da última atualização.
- **Três botões:** Aprovar · Solicitar ajustes · Rejeitar, mais o botão Detalhes.
- **Ajustes e rejeição exigem orientação escrita** — o sistema recusa (HTTP 400) sem ela. É assim que você devolve um roteiro com suas orientações.
- A orientação fica gravada no próprio conteúdo (`orientacoes` / `motivoRejeicao`) e no histórico.

### Biblioteca de conteúdos
- Todos os conteúdos com busca por título/roteiro, filtro por canal e por status.
- Ações contextuais: decidir itens pendentes e **reenviar para aprovação** itens em ajuste (versão incrementa).
- Formulário para registrar conteúdo manualmente — mesma rota que os agentes usarão.

### Persistência
- Toda decisão vai para `data/db.json` via `store.transacao` (escrita atômica: arquivo temporário + rename).
- **Log imutável** em `decisoes`: decisão, status anterior, status novo, orientação, autor e data.
- Histórico legível em `historico`, exibido no painel.
- Indicador no rodapé do menu mostra se o painel está **gravando no banco** ou em **somente leitura**.

### Estrutura para agentes e integrações futuras
- `POST /api/conteudos` registra a saída de qualquer agente com `origem` e `agenteAtual`.
- `POST /api/conteudos/:id/decisao` e `/reenviar` são as únicas vias de mudança de status.
- `services/conteudos.js` centraliza as regras — os agentes não terão acesso a publicação.

### Travas mantidas
- **Não existe rota de publicação** no servidor.
- Nenhuma conta externa conectada; nenhum serviço pago chamado.
- `config.publicacaoAutomatica = false` e `config.servicosPagosAutorizados = false`.

---

## 3. Testes executados

### Automáticos — `node scripts/testar-etapa2.js`
**25 de 25 verificações passaram.** Banco temporário, sem tocar nos dados reais.

| Grupo | Verificado |
|---|---|
| Leitura | estado, biblioteca com 3 itens, fila com 3 pendentes |
| Aprovar | status vira `aprovado`, data de aprovação registrada |
| Ajustes | sem orientação → HTTP 400; com orientação → status `ajuste` e texto gravado |
| Rejeitar | sem motivo → HTTP 400; com motivo → status `rejeitado` |
| Validações | decisão inexistente recusada; aprovar duas vezes → HTTP 409 |
| Reenvio | volta para `aprovacao`, versão 1 → 2 |
| Disco | os três status conferidos direto no arquivo do banco |
| Reinício | servidor morto e reaberto: status e log continuam íntegros |
| Publicação | `POST /api/conteudos/publicar` → HTTP 404 (rota não existe) |

### No navegador (painel real, porta 4599)
Executado ponta a ponta e **confirmado**:

| Ação | Resultado |
|---|---|
| Abrir Sala de Direção | 3 fichas com os três botões |
| Aprovar 1º item | notificação de sucesso; item saiu da fila |
| Solicitar ajustes sem texto | erro "Descreva as orientações antes de continuar." |
| Ajustes com orientação | registrado; item saiu da fila |
| Rejeitar com motivo | registrado; fila vazia |
| Biblioteca | 3 itens: Rejeitado · Em ajuste · Aprovado |
| Reenviar | "Conteúdo reenviado para aprovação", versão v2 |
| **F5 (recarregar)** | **status idênticos aos de antes** — persistência confirmada |
| Visão geral | Aguardando 1 · Aprovados 1 · Em ajuste 0 · Rejeitados 1 · 4 decisões |
| Console | nenhum erro |

### Estado atual do banco após os testes
| Conteúdo | Status | Versão |
|---|---|---|
| 3 tarefas do seu dia que uma IA já faz melhor que você | aprovado | 1 |
| O motivo real pelo qual o céu fica rosa ao entardecer | aguardando aprovação | 2 |
| O hábito de 10 minutos que muda a força depois dos 50 | rejeitado | 1 |

---

## 4. Correções feitas durante o teste

1. O indicador de status do rodapé mostrava "Etapa 1 · somente leitura" mesmo gravando — corrigido; agora exibe o modo real (gravando / somente leitura).
2. O script de teste não era repetível (partia do banco já alterado) — agora usa semente limpa.
3. O servidor aceita `DB_ARQUIVO` para isolar testes sem tocar nos dados reais.

---

## 5. O que permanece pendente

- Agentes A1 a A6 gerando conteúdo automaticamente (Etapas 3 a 5).
- Geração de vídeo, narração e edição por IA (Etapa 4).
- Conexão de contas e publicação nas redes (Etapa 5) — **não existe código de publicação**.
- Monetização com dados reais (Etapa 6).
- Operação 24/7 com o computador desligado.

---

## 6. Créditos consumidos

**Nenhum crédito.** Toda a Etapa 2 foi construída com código local e processamento nesta máquina.
Saldo: **2.000 de 2.000** (válido até 05/12). Nenhuma conta externa foi conectada e nenhum serviço pago foi acionado.

---

## 7. Rascunhos de demonstração — REMOVIDOS a pedido da direção

Os três rascunhos criados para testar os botões (marcados com `origem: "direcao"`) foram
**removidos da biblioteca** em 05/11/2026, com autorização do administrador.

| Item | Resultado |
|---|---|
| Conteúdos na biblioteca | 3 → **0** |
| Histórico de decisões (`decisoes`) | 4 → **4** — **preservado** |
| Histórico geral (`historico`) | 6 → **7** (+1 registro da própria limpeza) |
| Backup da Etapa 1 | intacto |
| Demais dados (canais, agentes, config, integrações) | intactos |

Script usado (idempotente e com modo simulação): `node scripts/limpar-rascunhos.js [--simular]`.
O log de decisões mantém a referência aos ids removidos, como registro histórico.
