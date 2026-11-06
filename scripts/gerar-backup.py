#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador de backup da Agência de IA Autônoma.

Duas modalidades:
  --completo   código + banco + mídias + modelos de voz Piper (ZIP grande)
  --codigo     apenas código, testes, docs e snapshot do banco (ZIP leve)

Sempre gera SHA-256 ao lado do ZIP. Nunca inclui .env, venv ou backups antigos.
Uso: python scripts/gerar-backup.py --completo
"""
import argparse, hashlib, json, os, sys, zipfile
from datetime import datetime

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, "public", "downloads")

# pastas que nunca entram no ZIP
EXCLUIR_DIRS = {
    "venv-kokoro", "node_modules", "__pycache__", ".git", "backups",
    "downloads", ".abacusai-bot", "cena", "cenas",
}
# extensões de arquivo que nunca entram (segredos e temporários)
EXCLUIR_EXT = {".env", ".tmp", ".log"}
EXCLUIR_NOMES = {".env", ".env.local", ".env.production", "db.tmp"}

CODIGO = ["server", "public/js", "public/css", "public/index.html",
          "scripts", "docs"]
MIDIA = ["public/artes", "public/videos", "vozes/amostras"]
MODELOS = ["vozes/piper"]

RELATORIOS = [f for f in os.listdir(RAIZ) if f.endswith(".md") and f != "README.md"]
README = ["README.md"]


def bytes_de(caminho):
    total = 0
    for raiz, dirs, files in os.walk(caminho):
        dirs[:] = [d for d in dirs if d not in EXCLUIR_DIRS]
        for f in files:
            if os.path.splitext(f)[1].lower() in EXCLUIR_EXT or f in EXCLUIR_NOMES:
                continue
            total += os.path.getsize(os.path.join(raiz, f))
    return total


def adicionar(z, caminho, manifesto):
    if not os.path.exists(caminho):
        return
    if os.path.isfile(caminho):
        z.write(caminho, os.path.relpath(caminho, RAIZ).replace("\\", "/"))
        manifesto.append(os.path.relpath(caminho, RAIZ).replace("\\", "/"))
        return
    for raiz, dirs, files in os.walk(caminho):
        dirs[:] = sorted(d for d in dirs if d not in EXCLUIR_DIRS)
        for f in sorted(files):
            ext = os.path.splitext(f)[1].lower()
            if ext in EXCLUIR_EXT or f in EXCLUIR_NOMES or f.startswith(".env"):
                continue
            p = os.path.join(raiz, f)
            rel = os.path.relpath(p, RAIZ).replace("\\", "/")
            z.write(p, rel)
            manifesto.append(rel)


def principal():
    ap = argparse.ArgumentParser()
    ap.add_argument("--completo", action="store_true", help="inclui mídias e modelos de voz")
    ap.add_argument("--codigo", action="store_true", help="somente código e documentação")
    args = ap.parse_args()
    completo = args.completo and not args.codigo

    os.makedirs(SAIDA, exist_ok=True)
    agora = datetime.now()
    tipo = "Completo" if completo else "CodigoFonte"
    nome = f"Agencia_IA_Backup_{tipo}_{agora.strftime('%Y-%m-%d_%H%M')}.zip"
    destino = os.path.join(SAIDA, nome)

    manifesto = []
    grupos = {"codigo": [], "midia": [], "modelos": [], "banco": []}

    with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        # 1. código, testes e documentação
        for item in README + CODIGO + RELATORIOS:
            antes = len(manifesto)
            adicionar(z, os.path.join(RAIZ, item), manifesto)
            grupos["codigo"] += manifesto[antes:]

        # 2. banco de dados — cópia consistente
        db_src = os.path.join(RAIZ, "data", "db.json")
        if os.path.exists(db_src):
            with open(db_src, encoding="utf-8") as fh:
                db = json.load(fh)
            z.writestr("data/db.json", json.dumps(db, ensure_ascii=False, indent=2))
            manifesto.append("data/db.json")
            grupos["banco"].append("data/db.json")
            # cópias históricas por etapa (sem duplicar o atual)
            for arq in sorted(os.listdir(os.path.join(RAIZ, "data"))):
                if arq.startswith("db.") and arq.endswith(".json"):
                    p = os.path.join(RAIZ, "data", arq)
                    z.write(p, f"data/historico/{arq}")
                    manifesto.append(f"data/historico/{arq}")
                    grupos["banco"].append(f"data/historico/{arq}")

        # 3. mídias e modelos (somente no completo)
        if completo:
            for item in MIDIA:
                antes = len(manifesto)
                adicionar(z, os.path.join(RAIZ, item), manifesto)
                grupos["midia"] += manifesto[antes:]
            for item in MODELOS:
                antes = len(manifesto)
                adicionar(z, os.path.join(RAIZ, item), manifesto)
                grupos["modelos"] += manifesto[antes:]

        # 4. arquivos de apoio
        z.writestr(".env.example", """# Variáveis de ambiente — nenhuma é obrigatória para rodar localmente
PORTA=4599                 # porta do servidor (padrão 4321)
DB_ARQUIVO=./data/db.json  # caminho do banco de dados
# Chaves de provedores de IA (opcionais, não incluídas neste backup)
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
""")
        z.writestr("MANIFESTO.json", json.dumps({
            "geradoEm": agora.isoformat(),
            "tipo": tipo,
            "versao": "3.0",
            "arquivos": len(manifesto) + 2,
            "grupos": {k: len(v) for k, v in grupos.items()},
            "lista": manifesto,
            "observacao": "Modelos de voz Piper: licença MIT/CC0 — redistribuição permitida. Kokoro não é incluído (ambiente virtual de 1,2 GB); reinstalar com `pip install kokoro soundfile`.",
        }, ensure_ascii=False, indent=2))
        z.writestr("RESTAURAR.md", """# Como restaurar este backup

1. Descompacte o ZIP em uma pasta de sua escolha.
2. Instale o Node.js 20+ (obrigatório).
3. Opcional, para gerar artes e vídeos: Python 3.10+ com Pillow e numpy, e FFmpeg no PATH.
4. Rode o servidor:
   ```bash
   cd agencia-ia
   node server/index.js
   ```
5. Abra http://localhost:4321
6. Confira os dados: a pasta `data/` contém o banco atual e o histórico por etapa.
7. Para reproduzir as vozes:
   - Piper: os modelos estão em `vozes/piper/` (incluídos neste backup completo).
   - Kokoro: reinstale com `python -m venv vozes/venv-kokoro` e
     `vozes/venv-kokoro/Scripts/pip install kokoro soundfile`.
8. Rode os testes: `node scripts/testar-etapa2.js` e `node scripts/testar-integridade.js`.

## O que depende do Abacus AI

Este projeto roda localmente e não depende do Abacus AI para funcionar.
O Abacus AI foi usado apenas como assistente de desenvolvimento. A geração de
imagens/vídeos por IA e a operação 24/7 sem computador ligado exigiriam serviços
proprietários — não estão incluídas aqui.
""")

    # hash de integridade
    h = hashlib.sha256()
    with open(destino, "rb") as fh:
        for bloco in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(bloco)
    with open(destino + ".sha256", "w", encoding="utf-8") as fh:
        fh.write(f"{h.hexdigest()}  {nome}\n")

    tam = os.path.getsize(destino)
    print(json.dumps({
        "arquivo": nome,
        "bytes": tam,
        "mb": round(tam / 1024 / 1024, 2),
        "arquivos": len(manifesto) + 2,
        "sha256": h.hexdigest(),
        "tipo": tipo,
    }, ensure_ascii=False))


if __name__ == "__main__":
    principal()
