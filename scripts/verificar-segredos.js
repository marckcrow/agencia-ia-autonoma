/**
 * Verificação de segredos e de dados privados antes de publicar a branch.
 *
 *   node scripts/verificar-segredos.js
 *
 * Analisa apenas os arquivos VERSIONADOS (git ls-files) e falha com código 1
 * se encontrar credencial aparente ou arquivo de dado privado.
 *
 * Regras:
 *   - Nenhum arquivo .env, *.pem, *.key, credentials*.json ou secrets*.json
 *     pode estar versionado.
 *   - Nenhum padrão de chave (OpenAI, GitHub, AWS, Google, Vercel, JWT) pode
 *     aparecer no conteúdo versionado.
 *   - Nenhuma pasta de dado local (data/, public/api/) pode estar versionada.
 *
 * Não envia nada para lugar nenhum: a varredura é 100% local.
 */
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const BINARIOS = new Set(['.onnx', '.png', '.jpg', '.jpeg', '.mp4', '.wav', '.mp3', '.zip', '.gz', '.pdf']);

const PADROES = [
  ['openai', /sk-[A-Za-z0-9_-]{16,}/g],
  ['github', /gh[pousr]_[A-Za-z0-9]{20,}/g],
  ['aws', /AKIA[0-9A-Z]{16}/g],
  ['google', /AIza[0-9A-Za-z_-]{30,}/g],
  ['vercel', /vcp_[A-Za-z0-9]{20,}/g],
  ['jwt', /eyJhbGciOi[A-Za-z0-9_.-]{40,}/g],
  ['supabase-jwt', /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g],
  ['atribuicao-de-chave', /\b(api[_-]?key|apikey|secret|senha|password|token)\b\s*[:=]\s*["'][^"']{12,}["']/gi],
  ['atribuicao-dotenv', /^\s*[A-Z_]*(KEY|TOKEN|SECRET|PASSWORD)[A-Z_]*\s*=\s*["'][^"']{8,}["']/gm],
];

const NOMES_PROIBIDOS = [
  /^\.env(\.|$)/i,
  /\.pem$/i,
  /\.key$/i,
  /credential/i,
  /secret/i,
  /^data\//i,
  /^public\/api\//i,
  /\.sqlite3?$/i,
];

function main() {
  const arquivos = execFileSync('git', ['ls-files'], { cwd: RAIZ, encoding: 'utf8' })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const problemas = [];
  let analisados = 0;

  for (const rel of arquivos) {
    for (const regra of NOMES_PROIBIDOS) {
      if (regra.test(rel)) problemas.push({ arquivo: rel, tipo: 'arquivo privado versionado', detalhe: regra.toString() });
    }
    const ext = path.extname(rel).toLowerCase();
    if (BINARIOS.has(ext)) continue;
    let texto = '';
    try {
      texto = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
    } catch (_) {
      continue;
    }
    analisados++;
    for (const [nome, padrao] of PADROES) {
      padrao.lastIndex = 0;
      const achados = texto.match(padrao);
      if (achados && achados.length) {
        problemas.push({
          arquivo: rel,
          tipo: 'possivel credencial',
          detalhe: `${nome}: ${achados.slice(0, 3).map((a) => a.slice(0, 12) + '…').join(', ')}`,
        });
      }
    }
  }

  console.log(`Arquivos versionados analisados: ${analisados}`);
  if (problemas.length) {
    console.log(`\nPROBLEMAS ENCONTRADOS (${problemas.length}):`);
    for (const p of problemas) console.log(`  ✗ ${p.arquivo} — ${p.tipo} — ${p.detalhe}`);
    console.log('\nRESULTADO: NÃO PUBLICAR — há material sensível versionado.\n');
    process.exit(1);
  }
  console.log('Nenhuma credencial e nenhum dado privado encontrado no conteúdo versionado.');
  console.log('RESULTADO: SEGURO PARA PUBLICAR A BRANCH.\n');
  process.exit(0);
}

main();
