import numpy as np, soundfile as sf
from kokoro import KPipeline
TEXTOS = {
 'voce-sabia': "Existe um fungo no Oregon que ocupa quase nove quilômetros quadrados. É o maior organismo vivo já medido, e ele está debaixo do chão, numa floresta. O que você vê na superfície são só os cogumelos.",
 'poder-50': "Noventa minutos por semana. Num estudo de trinta anos, esse foi o grupo com menor risco observado. Não é uma prova de causa, é uma associação. E o melhor resultado apareceu quando a força caminhou junto com a atividade aeróbica.",
}
VOZES = {'voce-sabia': 'pf_dora', 'poder-50': 'pm_alex'}
VEL = {'voce-sabia': [1.0], 'poder-50': [0.88, 0.95]}
pipe = KPipeline(lang_code='p')
for canal, texto in TEXTOS.items():
    for sp in VEL[canal]:
        linhas = "\n".join(texto.split('. '))
        audio = np.concatenate([a for (_g,_p,a) in pipe(linhas, voice=VOZES[canal], speed=sp)])
        sf.write(f"vozes/amostras/ritmo-{canal}-{sp}.wav", audio, 24000)
        print(f"{canal:12s} {VOZES[canal]:8s} speed={sp} -> {len(audio)/24000:.2f}s")
