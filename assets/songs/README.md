# Mapas das músicas — formato 2

Um arquivo por música, `assets/songs/<id>.json`, carregado pelo jogo ao abrir.

```json
{
  "format": 2,
  "id": "nexus",
  "title": "NEXUS",
  "duration": 184.666,
  "bpm": 118,
  "beatAnchor": 29.9918,
  "lanes": { "easy": 4, "medium": 4, "hard": 4 },
  "envelope": [0.004, 0.01, ...],
  "charts": {
    "franco": { "easy": [ ... ], "medium": [ ... ], "hard": [ ... ] },
    "ryuchi": { "easy": [ ... ], "medium": [ ... ], "hard": [ ... ] }
  }
}
```

- `beatAnchor`: tempo (s) de uma batida de referência; as linhas de compasso da pista partem dele.
- `envelope`: energia da música por segundo, usada na iluminação do palco.
- `lanes`: número de pistas por dificuldade. O Expert de cinco pistas entra numa fase futura.
- `sections` (opcional): `[[tempo, "nome"], ...]`.

Cada nota:

```json
{ "t": 26.687, "frets": [3] }
{ "t": 30.1, "frets": [0, 2] }
{ "t": 31.5, "frets": [1], "len": 1.2 }
```

- `t`: tempo em segundos no áudio.
- `frets`: pistas tocadas, da esquerda (0) para a direita. Mais de uma pista é um acorde e conta como um evento de combo.
- `len` (opcional): duração da nota longa em segundos.

O jogo valida cada arquivo ao carregar. Campos novos (hammer-on, frases) serão opcionais, para que arquivos antigos continuem funcionando.
