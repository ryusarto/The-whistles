# Histórico

## V16 — Fase 0: base técnica (em desenvolvimento)

- Mapas fora do `index.html`: cada música tem `assets/songs/<id>.json` no formato 2 (notas com tempo, pistas e duração; acordes como lista de pistas). O `index.html` caiu de 118 KB para 17 KB.
- Envelope de energia e alinhamento das batidas de cada música passaram para os arquivos de mapa.
- Código dividido em módulos ES: catálogo e formato dos mapas, relógio, recordes, regras de pontuação, julgamento das notas e controles.
- Relógio da música suavizado: entre as atualizações do áudio o tempo avança pelo relógio do navegador, sem andar para trás nem contar o tempo pausado.
- Cada toque é julgado no instante do próprio evento (teclado, toque e controle), não no quadro seguinte.
- Dificuldades renomeadas internamente para `easy`, `medium` e `hard`, abrindo espaço para o Expert de cinco pistas. Os recordes já salvos continuam valendo.
- Faixas importadas e salvas pela V15 são convertidas automaticamente ao abrir.
- Testes importam o módulo real do jogo; 25 verificações, incluindo relógio e horário do evento.

## V15 — Mobile Stage

- Removidos o modo ensaio, a seleção de velocidade, início por trecho e o pulo de introdução. As partidas tocam a faixa completa a 100%.
- Dificuldades apresentadas como Fácil, Médio e Difícil, com janelas de acerto progressivas.
- Quatro botões de toque abaixo do palco na vertical e quatro áreas invisíveis nos cantos inferiores na horizontal.
- Captura de múltiplos dedos, soltura por cancelamento, pausa e mudança de orientação; fontes de entrada compartilhadas sem acertos duplicados.
- Pontuação progressiva de sustains, preservando os pontos anteriores à soltura.
- Acorde completo conta uma vez para o combo; multiplicador calculado antes de avançar o combo.
- Tabela de recordes V15 separada para a nova fórmula de pontuação; dados antigos preservados.
- Removidos atalhos públicos de depuração que alteravam pontuação ou pulavam a música.

## V14 — Rehearsal & Stage

- Ensaio em qualquer faixa e instrumento, inclusive Duo, com início selecionável e velocidades de 50% a 100%.
- Ensaio sem eliminação e sem salvar recordes; reinício preserva suas opções.
- Correção do pulo de introdução: notas anteriores ficam excluídas, não viram falhas e não alteram recordes oficiais.
- Pausa limpa entradas de teclado, toque e controle; mantém sustains com breve tolerância ao retomar.
- Carregamento cancelável, proteção contra respostas atrasadas de reprodução e erros recuperáveis de áudio.
- Comparação correta do endereço do áudio para evitar recarregar a mesma faixa desnecessariamente.
- Janela de acerto e tempo de aproximação consistentes em velocidade reduzida.
- Progresso usa a duração real do áudio quando disponível.
- Guia dentro do jogo, volume e efeitos persistentes, botões de especial na tela, foco e estados de seleção acessíveis.
- Menus adaptados à orientação vertical; palco preserva proporções e coordenadas de toque.
- Lista de músicas exibe recordes do modo selecionado, Solo ou Duo.
- Código e estilos separados em arquivos próprios; mapas, músicas e arte da V13 preservados.
- Dez testes de integração sem dependências e servidor local com suporte a HTTP Range.

## V13

- Versão original publicada com cinco faixas, Solo, Duo Local, DualSense e cache de renderização.
