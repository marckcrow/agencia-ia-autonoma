# -*- coding: utf-8 -*-
"""Gera a prévia completa do vídeo-piloto IA na Prática (8 cenas, 1080x1920)."""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
FONT_DIR = "C:/Windows/Fonts"
OUT = "public/videos/cenas"
os.makedirs(OUT, exist_ok=True)

ROXO = "#6C5CE7"; ROXO2 = "#8B7CF0"; FUNDO = "#0B0E14"; CARTAO = "#151A25"

def f(nome, tam): return ImageFont.truetype(os.path.join(FONT_DIR, nome), tam)
def base(cor1=FUNDO, cor2="#161029"):
    img = Image.new("RGB", (W, H), cor1)
    d = ImageDraw.Draw(img)
    c1 = tuple(int(cor1[i:i+2],16) for i in (1,3,5)); c2 = tuple(int(cor2[i:i+2],16) for i in (1,3,5))
    for y in range(H):
        t = y/H
        d.line([(0,y),(W,y)], fill=tuple(int(c1[i]+(c2[i]-c1[i])*t) for i in range(3)))
    ov = Image.new("RGBA",(W,H),(0,0,0,0)); do = ImageDraw.Draw(ov)
    for x in range(0,W,60): do.line([(x,0),(x,H)], fill=(255,255,255,12))
    for y in range(0,H,60): do.line([(0,y),(W,y)], fill=(255,255,255,12))
    return Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")

def quebrar(txt, fo, larg):
    palavras, linhas, atual = txt.split(), [], ""
    for p in palavras:
        teste = (atual+" "+p).strip()
        if fo.getlength(teste) <= larg: atual = teste
        else: linhas.append(atual); atual = p
    if atual: linhas.append(atual)
    return linhas

def escrever(d, xy, txt, fo, cor, larg=None, esp=14):
    x,y = xy
    for l in (quebrar(txt, fo, larg) if larg else [txt]):
        d.text((x,y), l, font=fo, fill=cor); y += fo.size + esp
    return y

def rodape(img, d, txt):
    d.rectangle([0,H-10,W,H], fill=ROXO)
    d.text((56, H-72), txt, font=f("Montserrat-Regular.ttf", 24), fill=(200,205,220))

# 1 — cursor
img = base(); d = ImageDraw.Draw(img)
d.rounded_rectangle([140, 780, 940, 1080], radius=24, fill=CARTAO, outline="#2A3242", width=3)
d.text((180, 830), "O que sua IA fez hoje?", font=f("Montserrat-Regular.ttf", 34), fill=(120,128,145))
d.rectangle([180, 900, 188, 980], fill=ROXO)
rodape(img, d, "IA NA PRÁTICA"); img.save(f"{OUT}/cena1.png")

# 2 — chatbot x agente
img = base(); d = ImageDraw.Draw(img)
d.text((56, 260), "CHATBOT", font=f("Montserrat-Regular.ttf", 46), fill=(120,128,145))
d.text((56, 360), "espera você perguntar", font=f("Montserrat-Regular.ttf", 34), fill=(190,198,214))
d.text((56, 430), "responde uma vez", font=f("Montserrat-Regular.ttf", 34), fill=(190,198,214))
d.text((56, 500), "não continua sozinho", font=f("Montserrat-Regular.ttf", 34), fill=(190,198,214))
d.line([(56, 600), (1024, 600)], fill="#2A3242", width=3)
d.text((56, 680), "AGENTE", font=f("Montserrat-Regular.ttf", 46), fill=ROXO)
d.text((56, 780), "recebe um objetivo", font=f("Montserrat-Regular.ttf", 34), fill=(230,232,240))
d.text((56, 850), "quebra em etapas", font=f("Montserrat-Regular.ttf", 34), fill=(230,232,240))
d.text((56, 920), "executa até terminar", font=f("Montserrat-Regular.ttf", 34), fill=(230,232,240))
rodape(img, d, "IA NA PRÁTICA"); img.save(f"{OUT}/cena2.png")

# 3 — fluxo
img = base(); d = ImageDraw.Draw(img)
for i, t in enumerate(["objetivo", "etapas", "execução"]):
    y = 620 + i*260
    d.rounded_rectangle([160, y, 920, y+180], radius=20, fill=CARTAO, outline=ROXO, width=3)
    d.text((210, y+60), t, font=f("Montserrat-Regular.ttf", 44), fill=(235,232,255))
    if i < 2:
        d.line([(540, y+180), (540, y+260)], fill=ROXO, width=6)
rodape(img, d, "IA NA PRÁTICA"); img.save(f"{OUT}/cena3.png")

# 4 — dado do Google
img = base(); d = ImageDraw.Draw(img)
d.rectangle([56, 200, 400, 260], fill="#F0B429")
d.text((76, 214), "TESTE INTERNO", font=f("Montserrat-Regular.ttf", 26), fill=(20,20,20))
y = escrever(d, (56, 340), "O próprio Google usou o Gemini 4 Argon", f("Montserrat-Regular.ttf", 54), (255,255,255), larg=960)
escrever(d, (56, y+20), "para otimizar uma biblioteca de código, num teste interno da empresa.", f("Montserrat-Regular.ttf", 34), (200,208,224), larg=960)
d.rounded_rectangle([56, 900, 1024, 1200], radius=22, fill=CARTAO, outline="#2A3242", width=3)
d.text((96, 950), "40%", font=f("Montserrat-Regular.ttf", 90), fill=ROXO)
d.text((96, 1060), "menos tempo de preparação", font=f("Montserrat-Regular.ttf", 30), fill=(200,208,224))
d.text((560, 950), "21%", font=f("Montserrat-Regular.ttf", 90), fill=ROXO)
d.text((560, 1060), "inicialização mais rápida", font=f("Montserrat-Regular.ttf", 30), fill=(200,208,224))
rodape(img, d, "IA NA PRÁTICA · fonte: blog.google"); img.save(f"{OUT}/cena4.png")

# 5 — contexto
img = base(); d = ImageDraw.Draw(img)
y = escrever(d, (56, 700), "Guarda o contexto:", f("Montserrat-Regular.ttf", 58), "#F0B429", larg=960)
escrever(d, (56, y+30), "foi um teste interno do Google, numa tarefa específica de engenharia. Não é o que você deve esperar no seu dia a dia.", f("Montserrat-Regular.ttf", 38), (210,216,230), larg=960)
rodape(img, d, "IA NA PRÁTICA"); img.save(f"{OUT}/cena5.png")

# 6 — 40 apps
img = base(); d = ImageDraw.Draw(img)
y = escrever(d, (56, 640), "E não é só código:", f("Montserrat-Regular.ttf", 54), (255,255,255), larg=960)
escrever(d, (56, y+30), "o app Gemini conecta mais de 40 aplicativos e executa tarefas em vez de só sugerir.", f("Montserrat-Regular.ttf", 40), (200,208,224), larg=960)
d.rounded_rectangle([56, 1180, 1024, 1360], radius=20, fill=CARTAO, outline=ROXO, width=3)
d.text((96, 1240), "+40 apps", font=f("Montserrat-Regular.ttf", 56), fill=ROXO)
rodape(img, d, "IA NA PRÁTICA"); img.save(f"{OUT}/cena6.png")

# 7 — autorização
img = base(); d = ImageDraw.Draw(img)
d.text((56, 480), "O risco muda de lugar:", font=f("Montserrat-Regular.ttf", 46), fill=(210,216,230))
d.text((56, 620), "quem autoriza o quê.", font=f("Montserrat-Regular.ttf", 62), fill=ROXO)
d.rounded_rectangle([300, 900, 780, 1320], radius=26, fill=CARTAO, outline="#F0B429", width=4)
d.arc([390, 900, 690, 1120], 180, 360, fill="#F0B429", width=18)
d.text((430, 1150), "AUTORIZAÇÃO", font=f("Montserrat-Regular.ttf", 34), fill="#F0B429")
rodape(img, d, "IA NA PRÁTICA"); img.save(f"{OUT}/cena7.png")

# 8 — CTA
img = base(); d = ImageDraw.Draw(img)
d.text((56, 620), "IA NA PRÁTICA", font=f("Montserrat-Regular.ttf", 60), fill=ROXO)
y = escrever(d, (56, 760), "A IA que termina o que começou.", f("Montserrat-Regular.ttf", 46), (255,255,255), larg=960)
d.rounded_rectangle([56, 1080, 1024, 1250], radius=20, fill=ROXO)
d.text((96, 1120), "Comenta: você deixaria um agente", font=f("Montserrat-Regular.ttf", 32), fill=(255,255,255))
d.text((96, 1172), "agir sozinho no seu trabalho?", font=f("Montserrat-Regular.ttf", 32), fill=(255,255,255))
rodape(img, d, "Salve este vídeo"); img.save(f"{OUT}/cena8.png")

print("8 cenas geradas")
