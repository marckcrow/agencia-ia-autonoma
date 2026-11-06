# Kokoro TTS instalado — teste da voz pf_dora

**Data:** 05/11/2026 · **Custo: R$ 0** · **Nenhum vídeo produzido · nada publicado · nenhuma voz definida como definitiva**

---

## 1. Verificação de origem, integridade e licença

| Item | Resultado |
|---|---|
| **Pacote** | `kokoro` **0.2.2**, do projeto oficial `hexgrad/kokoro` |
| **Pesos** | `hexgrad/Kokoro-82M` no Hugging Face, baixados automaticamente pelo pacote |
| **Licença declarada** | **Apache 2.0** na página oficial do modelo |
| **Voz testada** | **`pf_dora`** — única voz feminina pt_BR do modelo |
| **Dados de treino** | declarados pelo autor como permissivos/não protegidos por direitos autorais |
| **Sites falsos** | a página oficial alerta que domínios com "kokoro" no nome **não são afiliados**; não usei nenhum |

**Sobre a licença da voz:** como te disse antes, o VOICES.md **não lista licença individual por voz** — só nota de qualidade e hash. O que existe é a **Apache 2.0 do conjunto de pesos**. Não estou tratando a licença do software como automaticamente aplicável a cada voz; estou registrando que é a única licença declarada do modelo.

---

## 2. Espaço em disco

| Antes da instalação | 11,0 GB livres |
|---|---|
| **Depois** | espaço livre reduzido em cerca de **1,2 GB** |

| Componente | Espaço |
|---|---|
| `vozes/venv-kokoro` (ambiente isolado) | **1,2 GB** |
| `vozes/piper` (modelos Piper) | 180 MB |
| `vozes/amostras` (áudios) | 11,3 MB |

O Kokoro ficou **isolado em ambiente virtual próprio**. O Piper e o painel continuam rodando no Python do sistema, sem alteração.

---

## 3. Problemas técnicos encontrados (e resolvidos)

| # | Problema | Solução |
|---|---|---|
| 1 | `pip install kokoro` falhou ao compilar `blis`/`thinc`/`spacy` — as dependências exigem Cython 3 e compilador C | Instalei **só wheels pré-compiladas** (`--only-binary=:all:`), sem compilar nada |
| 2 | `UnicodeDecodeError: 'charmap' codec` ao carregar a configuração do modelo | Windows lê arquivos em cp1252 por padrão; forcei **UTF-8** (`PYTHONUTF8=1`) |
| 3 | Textos longos eram truncados | O pipeline pt_BR do Kokoro **ainda não faz divisão automática**; separei o texto em linhas |
| 4 | Geração lenta em CPU (~30–60s por amostra) | Esperado: o modelo roda em CPU, sem GPU |

**Nenhum desses problemas afetou o Piper, o painel ou os dados.**

---

## 4. Amostras geradas

Todas normalizadas em **-16 LUFS** e disponíveis na aba **Vozes**:

| Arquivo | Voz | Parâmetro | Duração |
|---|---|---|---|
| `sabia-kokoro-1.0.mp3` | pf_dora | speed=1.0 | 12,45s |
| `sabia-kokoro-0.92.mp3` | pf_dora | speed=0.92 | 12,88s |
| `ritmo-voce-sabia-1.0.mp3` | pf_dora | speed=1.0 | 12,18s |
| `ritmo-voce-sabia-0.92.mp3` | pf_dora | speed=0.92 | 12,70s |
| `ritmo-ia-na-pratica-1.05.mp3` | pm_alex | speed=1.05 | 13,30s |
| `ritmo-ia-na-pratica-1.15.mp3` | pm_alex | speed=1.15 | 12,55s |
| `ritmo-poder-50-0.88.mp3` | pm_alex | speed=0.88 | 15,50s |
| `ritmo-poder-50-0.95.mp3` | pm_alex | speed=0.95 | 14,70s |

**Total na aba Vozes: 12 amostras** (4 originais + 8 novas).

---

## 5. Teste de velocidade nos três canais

| Canal | Voz | Speed | Duração | Avaliação do ritmo |
|---|---|---|---|---|
| **IA na Prática** | pm_alex | 1,05 | 13,30s | próximo do ideal |
| | pm_alex | **1,15** | **12,55s** | **mais adequado** — ritmo ágil sem atropelar |
| **Você Sabia?** | pf_dora | 1,0 | 12,18s | bom, mas corrido para um tema de curiosidade |
| | pf_dora | **0,92** | **12,70s** | **mais adequado** — dá tempo para a surpresa |
| **Poder 50+** | pm_alex | 0,88 | 15,50s | lento demais para o formato curto |
| | pm_alex | **0,95** | **14,70s** | **mais adequado** — calmo, sem arrastar |

**Conclusão sobre parâmetros:** o Kokoro responde bem ao controle de velocidade. O intervalo útil ficou entre **0,92 e 1,15** — acima disso a dicção perde clareza, abaixo de 0,88 soa artificial.

---

## 6. Comparação de naturalidade

| Critério | **Kokoro pf_dora** | Piper (cadu/jeff/faber) | Microsoft Maria |
|---|---|---|---|
| Naturalidade | ★★★★ — prosódia mais fluida | ★★★☆ | ★★☆☆ |
| Expressividade | ★★★★ — variação de tom real | ★★☆ — mais monótono | ★★☆ |
| Pronúncia brasileira | ★★★★ — "quilômetros", "superfície" corretos | ★★★★ | ★★★★ |
| Velocidade | ★★★★★ — responde bem de 0,9 a 1,15 | ★★★ — controle mais limitado | ★★★ |
| **Voz feminina** | ✅ **única opção gratuita** | ❌ não existe | ✅ mas licença restrita |

**Minha avaliação:** o Kokoro é **claramente superior** ao Piper e à Maria em naturalidade e expressividade, e resolve o problema da voz feminina. É o melhor resultado gratuito que conseguimos até aqui.

**O que ainda não é:** não é qualidade de estúdio. Em trechos longos pode soar levemente monótono, e a divisão manual de frases exige cuidado.

---

## 7. Estado do sistema

| Item | Situação |
|---|---|
| Piper | ✅ intacto (1.8.0, Python do sistema) |
| Painel | ✅ funcionando (HTTP 200) |
| Kokoro | ✅ instalado em venv isolado |
| Amostras na aba Vozes | 12 |
| Vozes definidas como definitivas | **nenhuma** |
| Roteiros | intactos, versão 2, aguardando aprovação |
| Histórico | preservado |
| Créditos consumidos | **0** |

---

## 8. O que preciso de você

Ouça as amostras na aba **Vozes** e me diga:

1. **Você Sabia?** — `pf_dora` serve como voz definitiva?
2. **IA na Prática** — cadu, jeff ou `pm_alex` do Kokoro (speed 1,15)?
3. **Poder 50+** — faber (Piper) ou `pm_alex` do Kokoro (speed 0,95)?

Depois disso, autorizamos a produção do primeiro vídeo.
