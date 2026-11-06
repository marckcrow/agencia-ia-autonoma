"""Gera amostras de voz com Kokoro TTS (voz pt-BR pf_dora) em ambiente isolado."""
import os
import numpy as np
import soundfile as sf
from kokoro import KPipeline

# dividido por linha: o pipeline do pt-br ainda não faz chunking automático
TEXTO = "\n".join([
    "Existe um fungo no Oregon que ocupa quase nove quilômetros quadrados.",
    "É o maior organismo vivo já medido, e ele está debaixo do chão, numa floresta.",
    "O que você vê na superfície são só os cogumelos.",
])

def gerar(saida, speed=1.0, voz='pf_dora'):
    pipe = KPipeline(lang_code='p')
    pedacos = [a for (_gs, _ps, a) in pipe(TEXTO, voice=voz, speed=speed)]
    audio = np.concatenate(pedacos) if len(pedacos) > 1 else pedacos[0]
    sf.write(saida, audio, 24000)
    dur = len(audio) / 24000
    print(f"{os.path.basename(saida)} | speed={speed} | {dur:.2f}s")
    return dur

if __name__ == '__main__':
    gerar('vozes/amostras/sabia-kokoro-1.0.wav', 1.0)
    gerar('vozes/amostras/sabia-kokoro-0.92.wav', 0.92)
