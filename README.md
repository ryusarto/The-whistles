# THE WHISTLES 🎸

Jogo de ritmo de guitarra e baixo, inspirado na era PS2. **V14 — Rehearsal & Stage.**

**[Jogar no navegador](https://ryusarto.github.io/The-whistles/)**

## O que está no jogo

- Cinco músicas completas: Nexus, Summertime, Ruthless, Sem Tu e Minha Fonte.
- Franco na guitarra e Ryuchi no baixo, com mapas próprios em Easy, Normal e Expert.
- Solo e Duo Local com pistas, combos, pontuação e especiais independentes. No Duo, a energia da plateia é compartilhada.
- Ensaio para qualquer música: início em qualquer segundo, velocidade de 50%, 75%, 90% ou 100%, sem eliminação e sem salvar recordes. Reiniciar mantém trecho e velocidade.
- Guia de controles, volume persistente, calibração e opção de reduzir efeitos.
- Recordes por música, instrumento e dificuldade; recordes do Duo separados dos do Solo, salvos no navegador.
- Importação local de áudio com mapas automáticos provisórios e armazenamento no navegador quando disponível.

## Controles

| Ação | Teclado Solo / P1 | Teclado P2 | DualSense |
| --- | --- | --- | --- |
| Pistas 1–4 | D F J K | Q W O P | L2 L1 R1 R2 |
| Especial | Espaço | Enter | ✕ |
| Pausa | Esc | Esc | Options |

Toque na pista para jogar na tela sensível ao toque; os botões **Especial P1/P2** ativam o Whistle Mode. Notas longas exigem segurar; acordes exigem as duas pistas ao mesmo tempo. Recomendamos a orientação horizontal no celular.

Conecte até dois controles por USB ou Bluetooth e pressione um botão para o navegador detectá-los. O painel **Testar controles** permite vincular P1/P2 e conferir os quatro gatilhos. O suporte depende do navegador e do mapeamento do controle. Não requer instalação nem conta.

## Desenvolvimento local

Sem build, npm ou dependências. Python 3.10+:

```sh
python3 tools/serve.py
```

Abra http://127.0.0.1:8765/. O servidor implementa requisições HTTP Range para que o ensaio possa avançar no MP3. Abrir por `file://` ou usar um servidor sem suporte a Range pode impedir o avanço de áudio em alguns navegadores.

Para os testes de integração, Node.js 20+:

```sh
node tests/regression.mjs
```

Os testes usam o motor real com relógio de mídia simulado, cobrindo os 30 mapas, Solo/Duo, exclusão das notas puladas, ensaio, recordes, pausa/sustains, cancelamento de carregamento, falha de reprodução e renderização. O teste automatizado não substitui uma conferência com controles físicos.

## Estrutura e GitHub Pages

- `index.html`: telas e dados dos mapas/envelopes originais.
- `assets/js/game.js`: motor, controles, áudio, ensaio e recordes.
- `assets/css/game.css`: interface e layouts responsivos.
- `assets/audio/`: cinco MP3 completos.
- `assets/images/`: capa e personagens.
- `tests/regression.mjs`: testes sem dependências.
- `tools/serve.py`: servidor local com suporte a áudio.

Pages publica a branch **main**, pasta **/(root)**. A entrada é `index.html`; todos os caminhos são relativos e funcionam em `/The-whistles/`. `.nojekyll` evita processamento Jekyll. Ao atualizar a branch, acompanhe o workflow **pages build and deployment** na aba Actions.

## Sobre os mapas

Os mapas instrumentais e o áudio da V13 foram preservados nesta atualização. Algumas partes de guitarra foram interpretadas a partir da stem OTHER, que contém outros timbres; faixas importadas recebem mapas automáticos e precisam de revisão musical. V14 não representa uma nova transcrição instrumental das músicas.

## Créditos

Projeto THE WHISTLES. Áudio e arte fornecidos pelo autor do jogo.
