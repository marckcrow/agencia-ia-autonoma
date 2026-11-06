import numpy as np, soundfile as sf
from kokoro import KPipeline
TEXTO = "\n".join([
 "Seu assistente de IA só responde.",
 "O que já existe hoje vai lá e faz.",
 "A diferença se chama agente.",
 "Um chatbot espera você perguntar.",
 "Um agente recebe um objetivo, quebra em etapas e executa, muitas vezes sem ninguém olhando.",
 "Um exemplo real: o próprio Google usou o Gemini 4 Argon, num teste interno da empresa, para otimizar uma biblioteca de código.",
 "Segundo o anúncio oficial do modelo, o trabalho reduziu o tempo de preparação de sessão em 40 por cento, e acelerou a inicialização em 21 por cento.",
 "Guarda o contexto: isso foi um teste interno do Google, numa tarefa específica de engenharia.",
 "Não é o que você deve esperar no seu dia a dia, mas mostra até onde a autonomia já chega.",
 "E não é só código: o app Gemini conecta mais de 40 aplicativos, e executa tarefas em vez de só sugerir.",
 "O ganho não é ter uma IA mais inteligente.",
 "É ter uma IA que termina o que começou.",
 "E o risco também muda de lugar: quem autoriza o quê.",
 "Comenta: você deixaria um agente agir sozinho no seu trabalho?",
 "Salva pra ver depois.",
])
pipe = KPipeline(lang_code='p')
audio = np.concatenate([a for (_g,_p,a) in pipe(TEXTO, voice='pm_alex', speed=1.15)])
sf.write('vozes/amostras/ia-na-pratica-narracao-v2.wav', audio, 24000)
print(f"DURACAO={len(audio)/24000:.2f}")
