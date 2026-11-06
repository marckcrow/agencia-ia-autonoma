# -*- coding: utf-8 -*-
"""Gera as artes 1080x1350 do Estúdio com Pillow."""
import os, json
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1350
FONT_DIR = "C:/Windows/Fonts"
OUT = "public/artes"
os.makedirs(OUT, exist_ok=True)

def fonte(nome, tam):
    return ImageFont.truetype(os.path.join(FONT_DIR, nome), tam)

def gradiente(cor1, cor2):
    img = Image.new("RGB", (W, H), cor1)
    d = ImageDraw.Draw(img)
    c1 = tuple(int(cor1[i:i+2], 16) for i in (1, 3, 5))
    c2 = tuple(int(cor2[i:i+2], 16) for i in (1, 3, 5))
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(int(c1[i] + (c2[i]-c1[i])*t) for i in range(3)))
    return img

def grade(img, cor="#ffffff", alpha=14, passo=54):
    ov = Image.new("RGBA", (W, H), (0,0,0,0))
    d = ImageDraw.Draw(ov)
    for x in range(0, W, passo):
        d.line([(x,0),(x,H)], fill=(255,255,255,alpha))
    for y in range(0, H, passo):
        d.line([(0,y),(W,y)], fill=(255,255,255,alpha))
    img.paste(Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB"), (0,0))
    return img

def quebrar(texto, f, largura):
    palavras, linhas, atual = texto.split(), [], ""
    for p in palavras:
        teste = (atual + " " + p).strip()
        if f.getlength(teste) <= largura:
            atual = teste
        else:
            linhas.append(atual); atual = p
    if atual: linhas.append(atual)
    return linhas

def escrever(d, xy, texto, f, cor, largura=None, espaco=12, maxlin=None):
    x, y = xy
    linhas = quebrar(texto, f, largura) if largura else [texto]
    if maxlin: linhas = linhas[:maxlin]
    for l in linhas:
        d.text((x, y), l, font=f, fill=cor)
        y += f.size + espaco
    return y

def rodape(img, d, canal, cor):
    d.rectangle([0, H-8, W, H], fill=cor)
    f = fonte("Montserrat-Regular.ttf", 22)
    linhas = quebrar(canal.upper(), f, 968)
    y = H - 48 - (len(linhas) * 30)
    for l in linhas:
        d.text((56, y), l, font=f, fill=(235,238,245,210))
        y += 30

def salvar(img, nome):
    caminho = os.path.join(OUT, nome)
    img.save(caminho, "PNG", optimize=True)
    print(nome, os.path.getsize(caminho)//1024, "KB")

# ---------- ARTE 1 — IA na Prática ----------
img = gradiente("#0B0E14", "#161029")
img = grade(img)
d = ImageDraw.Draw(img)
ROXO = "#6C5CE7"

d.rectangle([56, 72, 232, 122], fill=ROXO)
d.text((72, 82), "IA NA PRÁTICA", font=fonte("Montserrat-Regular.ttf", 24), fill=(255,255,255))

y = 210
y = escrever(d, (56, y), "A IA não apenas responde.", fonte("Montserrat-Regular.ttf", 66), (255,255,255), largura=960)
y = escrever(d, (56, y+8), "Agora ela executa tarefas.", fonte("Montserrat-Regular.ttf", 66), ROXO, largura=960)

# comparativo
caixa_y = y + 70
for i, (titulo, itens, cor) in enumerate([
    ("CHATBOT", ["espera você perguntar", "responde uma vez", "não continua sozinho"], "#3A4356"),
    ("AGENTE", ["recebe um objetivo", "quebra em etapas", "executa até terminar"], ROXO),
]):
    x = 56 + i*484
    d.rounded_rectangle([x, caixa_y, x+452, caixa_y+340], radius=20, fill="#151A25", outline=cor, width=3)
    d.text((x+28, caixa_y+26), titulo, font=fonte("Montserrat-Regular.ttf", 34), fill=cor)
    yy = caixa_y + 92
    for it in itens:
        d.ellipse([x+28, yy+9, x+40, yy+21], fill=cor)
        d.text((x+56, yy), it, font=fonte("Montserrat-Regular.ttf", 27), fill=(220,226,238))
        yy += 52

# dado verificado
dy = caixa_y + 390
d.rounded_rectangle([56, dy, 1024, dy+150], radius=16, fill="#151A25", outline="#2A3242", width=2)
d.text((84, dy+24), "40% e 21%", font=fonte("Montserrat-Regular.ttf", 46), fill=ROXO)
escrever(d, (84, dy+84), "resultado de um teste interno do Google (Gemini 4 Argon) — não é ganho garantido", fonte("Montserrat-Regular.ttf", 24), (170,180,200), largura=900)

# CTA
cta_y = dy + 210
d.rounded_rectangle([56, cta_y, 1024, cta_y+150], radius=16, fill=ROXO)
d.text((84, cta_y+28), "Você deixaria um agente agir sozinho?", font=fonte("Montserrat-Regular.ttf", 34), fill=(255,255,255))
d.text((84, cta_y+86), "Comenta aí e salva pra ver depois.", font=fonte("Montserrat-Regular.ttf", 26), fill=(232,226,255))

rodape(img, d, "IA na Prática · fonte: blog.google", ROXO)
salvar(img, "arte-ia-na-pratica.png")

# ---------- ARTE 2 — Você Sabia? ----------
img = gradiente("#120F0D", "#2A1A12")
img = grade(img)
d = ImageDraw.Draw(img)
LARANJA = "#E17055"

d.rectangle([56, 72, 214, 122], fill=LARANJA)
d.text((72, 82), "VOCÊ SABIA?", font=fonte("Montserrat-Regular.ttf", 24), fill=(255,255,255))

y = 200
y = escrever(d, (56, y), "O maior organismo vivo já medido", fonte("Montserrat-Regular.ttf", 58), (255,255,255), largura=960)
y = escrever(d, (56, y+6), "ocupa 8,9 km²", fonte("Montserrat-Regular.ttf", 96), LARANJA, largura=960)

# bloco de área
by = y + 50
d.rounded_rectangle([56, by, 1024, by+210], radius=20, fill="#1C1512", outline=LARANJA, width=3)
d.text((84, by+26), "2.200 acres", font=fonte("Montserrat-Regular.ttf", 54), fill=LARANJA)
escrever(d, (84, by+96), "Parque Nacional Malheur, Oregon (EUA) — Armillaria ostoyae, o cogumelo-do-mel", fonte("Montserrat-Regular.ttf", 26), (216,200,190), largura=900)
d.text((84, by+166), "≈ 1.250 campos de futebol de área", font=fonte("Montserrat-Regular.ttf", 24), fill=(170,150,140))

# curiosidade
cy = by + 260
for i, (num, txt) in enumerate([("1", "quase todo o corpo está sob o solo"), ("2", "na superfície aparecem só os cogumelos"), ("3", "é também uma praga florestal")]):
    yy = cy + i*84
    d.ellipse([56, yy, 106, yy+50], fill=LARANJA)
    d.text((72, yy+10), num, font=fonte("Montserrat-Regular.ttf", 28), fill=(20,16,14))
    d.text((126, yy+8), txt, font=fonte("Montserrat-Regular.ttf", 30), fill=(230,220,212))

# selo de verificação
sy = cy + 3*84 + 40
d.rounded_rectangle([56, sy, 1024, sy+150], radius=16, fill="#1C1512", outline="#3A2A22", width=2)
d.text((84, sy+26), "Verificado em fonte primária", font=fonte("Montserrat-Regular.ttf", 28), fill=LARANJA)
escrever(d, (84, sy+72), "USDA · 3,4 milhas quadradas = 2.200 acres no Parque Nacional Malheur", fonte("Montserrat-Regular.ttf", 23), (200,186,178), largura=900)

rodape(img, d, "Você Sabia? · fonte: USDA", LARANJA)
salvar(img, "arte-voce-sabia.png")

# ---------- ARTE 3 — Poder 50+ ----------
img = gradiente("#0D1211", "#0F241F")
img = grade(img)
d = ImageDraw.Draw(img)
VERDE = "#00B894"

d.rectangle([56, 72, 206, 122], fill=VERDE)
d.text((72, 82), "PODER 50+", font=fonte("Montserrat-Regular.ttf", 24), fill=(255,255,255))

y = 200
y = escrever(d, (56, y), "Depois dos 50, fortalecer os músculos", fonte("Montserrat-Regular.ttf", 56), (255,255,255), largura=960)
y = escrever(d, (56, y+6), "é investir em qualidade de vida.", fonte("Montserrat-Regular.ttf", 56), VERDE, largura=960)

by = y + 60
d.rounded_rectangle([56, by, 1024, by+260], radius=20, fill="#101B18", outline=VERDE, width=3)
d.text((84, by+24), "90 a 119 min por semana", font=fonte("Montserrat-Regular.ttf", 40), fill=VERDE)
d.text((84, by+84), "foram ASSOCIADOS a 13% menos risco", font=fonte("Montserrat-Regular.ttf", 32), fill=(220,238,232))
escrever(d, (84, by+140), "Estudo observacional com 147 mil pessoas ao longo de 30 anos. Associação não é causa.", fonte("Montserrat-Regular.ttf", 26), (170,200,190), largura=900)
d.text((84, by+214), "Acima de 120 min não houve ganho adicional.", font=fonte("Montserrat-Regular.ttf", 22), fill=(140,175,165))

cy = by + 310
d.rounded_rectangle([56, cy, 1024, cy+120], radius=16, fill="#101B18", outline="#1E3A33", width=2)
d.text((84, cy+26), "O melhor resultado veio da combinação:", font=fonte("Montserrat-Regular.ttf", 28), fill=(200,225,218))
d.text((84, cy+68), "força + atividade aeróbica", font=fonte("Montserrat-Regular.ttf", 34), fill=VERDE)

# aviso de saúde
ay = cy + 165
d.rounded_rectangle([56, ay, 1024, ay+150], radius=16, fill="#0A1512", outline="#1E3A33", width=2)
d.text((84, ay+26), "Este conteúdo não substitui orientação médica.", font=fonte("Montserrat-Regular.ttf", 27), fill=(200,225,218))
escrever(d, (84, ay+72), "Consulte um profissional antes de iniciar treino de força.", fonte("Montserrat-Regular.ttf", 23), (150,185,175), largura=900)

rodape(img, d, "Poder 50+ · fontes: BMJ / Harvard", VERDE)
salvar(img, "arte-poder-50.png")
