/**
 * Camada de persistência — banco local em JSON.
 *
 * Por que JSON em disco? Para a Etapa 1 não há dependências externas nem custo.
 * A interface `store` é intencionalmente assíncrona para que, numa futura
 * migração para nuvem, basta trocar a implementação (ex.: Postgres, Supabase)
 * sem alterar nenhum serviço de domínio.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_ARQUIVO
  ? path.resolve(process.env.DB_ARQUIVO)
  : path.join(__dirname, '..', 'data', 'db.json');

let cache = null;

function carregar() {
  if (cache) return cache;
  const bruto = fs.readFileSync(DB_PATH, 'utf8');
  cache = JSON.parse(bruto);
  return cache;
}

function salvar(db) {
  cache = db;
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_PATH);
}

/** Interface assíncrona — pronta para troca por um banco remoto. */
const store = {
  async ler() {
    return JSON.parse(JSON.stringify(carregar()));
  },
  async transacao(fn) {
    const db = carregar();
    const resultado = await fn(db);
    salvar(db);
    return resultado;
  },
};

module.exports = { store, DB_PATH };
