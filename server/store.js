/**
 * Camada de persistência — banco local em JSON.
 *
 * Por que JSON em disco? Para a Etapa 1 não há dependências externas nem custo.
 * A interface `store` é intencionalmente assíncrona para que, numa futura
 * migração para nuvem, basta trocar a implementação (ex.: Postgres, Supabase)
 * sem alterar nenhum serviço de domínio.
 *
 * ETAPA 4A — Estabilização:
 *   1. As transações são SERIALIZADAS (fila única). Antes, duas requisições
 *      simultâneas podiam ler o mesmo estado e sobrescrever uma à outra,
 *      porque o read-modify-write não tinha trava.
 *   2. O cache é invalidado quando o arquivo muda por fora do processo
 *      (data/db.json editado à mão, por script ou por outra instância).
 *      Sem isso, uma edição externa era silenciosamente apagada pela próxima
 *      gravação do servidor.
 *   3. A gravação continua atômica (arquivo temporário + rename).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_ARQUIVO
  ? path.resolve(process.env.DB_ARQUIVO)
  : path.join(__dirname, '..', 'data', 'db.json');

let cache = null;
let assinaturaCache = null;

/** Fila de transações: garante uma escrita por vez, sem perder alterações. */
let fila = Promise.resolve();

/** Assinatura do arquivo em disco (mtime + tamanho) para detectar mudança externa. */
function assinaturaDoArquivo() {
  try {
    const st = fs.statSync(DB_PATH);
    return `${st.mtimeMs}:${st.size}`;
  } catch (_) {
    return null;
  }
}

function carregar() {
  const assinaturaAtual = assinaturaDoArquivo();
  // Cache válido somente se o arquivo não mudou por fora do processo.
  if (cache && assinaturaAtual && assinaturaAtual === assinaturaCache) return cache;

  const bruto = fs.readFileSync(DB_PATH, 'utf8');
  const novo = JSON.parse(bruto);
  cache = novo;
  assinaturaCache = assinaturaDoArquivo();
  return cache;
}

function salvar(db) {
  cache = db;
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_PATH);
  assinaturaCache = assinaturaDoArquivo();
}

/** Interface assíncrona — pronta para troca por um banco remoto. */
const store = {
  async ler() {
    return JSON.parse(JSON.stringify(carregar()));
  },
  /**
   * Executa `fn(db)` com o banco travado: nenhuma outra transação entra
   * enquanto esta não terminar (e vice-versa). Se `fn` lançar, a fila segue
   * intacta para as próximas chamadas.
   */
  async transacao(fn) {
    const execucao = fila.then(async () => {
      const db = carregar();
      const resultado = await fn(db);
      salvar(db);
      return resultado;
    });
    fila = execucao.then(() => {}, () => {});
    return execucao;
  },
  /** Invalida o cache (uso em testes e manutenção manual do arquivo). */
  invalidarCache() {
    cache = null;
    assinaturaCache = null;
  },
};

module.exports = { store, DB_PATH };
