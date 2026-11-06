"""Testa parâmetros de velocidade nos três canais com o Kokoro."""
import numpy as np, soundfile as sf
from kokoro import KPipeline

TEXTOS = {
 'ia-na-pratica': "Seu assistente de IA só responde. O que já existe hoje vai lá e faz. A diferença se chama agente, e ele já roda sozinho no seu trabalho. A pergunta não é se a IA pensa melhor. É se ela termina o que começou.",
 'voce-sabia': "Existe um fungo no Oregon que ocupa quase nove quilômetros quadrados. É o maior organismo vivo já medido, e ele está debaixo do chão, numa floresta. O que você vê na superfície são só os cogumelos.",
 'poder-50': "Noventa minutos por semana. Num estudo de trinta anos, esse foi o grupo com menor risco observado. Não é uma prova de causa, é uma associação. E o melhor resultado apareceu quando a força caminhou junto com a atividade aeróbica.",
}
VOZES = {'ia-na-pratica': 'pm_alex', 'voce-sabia': 'pf_dora', 'poder-50': 'pm_alex'}
VELOCIDADES = {'ia-na-pratica': [1.05, 1.15], 'voce-sabia': [0.92, 1.0], 'poder-50': [0.88, 0.95]}

pipe = KPipeline(lang_code='p')
for canal, texto in TEXTOS.items():
    for sp in VELOCIDADES[canal]:
        linhas = "\n".join(texto.split('. '))
        pedacos = [a for (_g,_p,a) in pipe(linhas, voice=VOZES[canal], speed=sp)]
        audio = np.concatenate(pedacos)
        dur = len(audio)/24000
        nome = f"vozes/amostras/ritmo-{canal}-{sp}.wav"
        sf.write(nome, audio, 24000)
        print(f"{canal:14s} voz={VOZES[canal]:8s} speed={sp} -> {dur:.2f}s")
