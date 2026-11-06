/**
 * Remove EXCLUSIVAMENTE os três rascunhos de teste criados pela direção.
 *
 * O que é apagado:  os 3 registros em `conteudos` cujos ids começam com "ex-".
 * O que é preservado: `decisoes` (histórico imutável), `historico`, canais,
 *                     agentes, configuração e todos os demais dados.
 *
 * Uso: node scripts/limpar-rascunhos.js          (executa)
 *      node scripts/limpar-rascunhos.js --simular (mostra o que faria)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DB = path.join(__dirname, '..', 'data', 'db.json');
const SIMULAR = process.argv.includes('--simular');
const IDS = ['ex-roteiro-ia-01', 'ex-roteiro-sabia-01', 'ex-roteiro-50-01'];

const db = JSON.parse(fs.readFileSync(DB, 'utf8'));
const antes = {
  conteudos: db.conteudos.length,
  decisoes: (db.decisoes || []).length,
  historico: (db.historico || []).length,
};

const removidos = db.conteudos.filter((c) => IDS.includes(c.id));
const naoEncontrados = IDS.filter((id) => !removidos.some((c) => c.id === id));

console.log('\nRascunhos encontrados:');
removidos.forEach((c) => console.log(`  - ${c.id} | ${c.titulo}`));
if (naoEncontrados.length) {
  console.log(`  (já ausentes: ${naoEncontrados.join(', ')})`);
}

db.conteudos = db.conteudos.filter((c) => !IDS.includes(c.id));

db.historico.push({
  em: new Date().toISOString(),
  tipo: 'limpeza',
  texto:
    'Rascunhos de teste da direção removidos da biblioteca a pedido do administrador: ' +
    removidos.map((c) => `"${c.titulo}"`).join('; ') +
    '. Histórico de decisões preservado.',
});

const depois = {
  conteudos: db.conteudos.length,
  decisoes: (db.decisoes || []).length,
  historico: (db.historico || []).length,
};

console.log('\nAntes → depois');
console.log(`  conteúdos: ${antes.conteudos} → ${depois.conteudos}`);
console.log(`  decisões:  ${antes.decisoes} → ${depois.decisoes}  (preservadas)`);
console.log(`  histórico: ${antes.historico} → ${depois.historico}  (+1 registro de limpeza)`);

if (SIMULAR) {
  console.log('\n[simulação] Nada foi gravado.\n');
  process.exit(0);
}

const tmp = DB + '.tmp';
fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
fs.renameSync(tmp, DB);
console.log('\nBanco atualizado.\n');
