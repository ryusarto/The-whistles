# THE WHISTLES 🎸

Jogo de ritmo de guitarra e baixo, inspirado na era PS2. **V15 — Mobile Stage.**

**[Jogar no navegador](https://ryusarto.github.io/The-whistles/)**

## Jogar

Escolha uma das cinco faixas, guitarra (Franco) ou baixo (Ryuchi), e a dificuldade **Fácil, Médio ou Difícil**. Cada partida toca a música completa, do início, na velocidade original. Não há modo treino.

- Nexus, Summertime, Ruthless, Sem Tu e Minha Fonte.
- Mapas separados para guitarra e baixo, em cada dificuldade.
- Solo e Duo Local: pistas, combos e especiais independentes; energia da plateia compartilhada no Duo.
- Notas longas dão pontos enquanto são sustentadas. Soltar antes do fim interrompe os próximos pontos e mantém os já conquistados.
- Acordes completos contam como um evento de combo. Multiplicador sobe a cada dez eventos acertados, até ×4; Whistle Mode dobra até ×8.
- As janelas de acerto ficam progressivamente mais exigentes em Fácil, Médio e Difícil.

## Controles

| Ação | Solo / Jogador 1 | Jogador 2 | DualSense |
| --- | --- | --- | --- |
| Pistas 1–4 | D F J K | Q W O P | L2 L1 R1 R2 |
| Especial | Espaço | Enter | ✕ |
| Pausa | Esc | Esc | Options |

**Celular na vertical:** quatro botões coloridos na área abaixo do palco. **Na horizontal:** quatro áreas invisíveis na parte inferior das laterais — pistas 1 e 2 à esquerda, 3 e 4 à direita. A ordem acompanha as notas, da esquerda para a direita. É possível tocar acordes com vários dedos e segurar notas longas. Esses quatro controles comandam o instrumento selecionado no Solo ou o jogador 1 no Duo; o jogador 2 usa teclado ou controle.

Os botões **Especial P1/P2** ativam o Whistle Mode quando a barra está cheia. Volume, efeitos e calibração são ajustáveis. Pausar, perder o foco ou mudar a orientação solta os botões, evitando notas presas.

Conecte até dois controles por USB ou Bluetooth e pressione um botão para o navegador detectá-los. **Testar controles** permite vincular P1/P2 e conferir os quatro gatilhos. A compatibilidade depende do navegador e do mapeamento do controle.

## Recordes

Os recordes ficam no navegador, separados por faixa, dificuldade, instrumento e modo Solo/Duo. A V15 tem uma tabela própria porque a fórmula de pontos mudou. Os dados antigos continuam armazenados, sem misturar pontuações calculadas por regras diferentes.

## Desenvolvimento local

Sem build ou dependências. Python 3.10+:

```sh
python3 tools/serve.py
```

Abra http://127.0.0.1:8765/. O jogo usa módulos ES e carrega os mapas em JSON, então precisa ser servido por HTTP (abrir o `index.html` direto do disco não funciona). O servidor oferece HTTP Range para áudio. Para os testes do motor, Node.js 20+:

```sh
node tests/regression.mjs
```

Os testes usam o código real com mídia e entradas simuladas. A verificação de layout no navegador complementa esses testes; aparelhos e controles físicos exigem uma conferência no dispositivo.

## Arquivos e publicação

- `index.html`: telas e interface.
- `assets/songs/<id>.json`: mapas de cada música no formato 2 (ver `assets/songs/README.md`).
- `assets/js/game.js`: telas, estado da partida, desenho da pista e roteamento das entradas.
- `assets/js/core/`: catálogo e formato dos mapas (`songs.js`), relógio da música (`clock.js`) e recordes (`records.js`).
- `assets/js/rules/`: regras de pontuação, janelas e plateia (`scoring.js`) e julgamento das notas (`notes.js`).
- `assets/js/input/bindings.js`: teclas e botões padrão.
- `assets/js/ui/calibration.js`: teste guiado de atraso de áudio e vídeo.
- `assets/css/game.css`: layout e áreas de toque por orientação.
- `assets/audio/` e `assets/images/`: músicas e arte do The Whistles.
- `tests/regression.mjs`: testes sem dependências.
- `tools/serve.py`: servidor local.

GitHub Pages publica **main**, pasta **/(root)**. Todos os caminhos são relativos para funcionar em `/The-whistles/`. Acompanhe **pages build and deployment** na aba Actions depois de cada atualização.

## Mapas e referências

Os mapas e áudios instrumentais existentes foram preservados. Algumas partes de guitarra interpretam a stem OTHER, que inclui outros timbres; músicas importadas recebem mapas automáticos provisórios. As regras do motor são implementadas em JavaScript para o The Whistles. A imagem de disco comercial e seus arquivos extraídos não fazem parte deste repositório.

## Créditos

Projeto THE WHISTLES. Áudio e arte fornecidos pelo autor do jogo.
