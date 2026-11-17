// Song catalog and chart format.
//
// Format 2 (assets/songs/<id>.json):
//   { format: 2, id, title, duration, bpm, beatAnchor, lanes: { <difficulty>: 4|5 },
//     envelope: [rms per second], sections?: [[time, label]],
//     charts: { franco: { easy: [note], medium: [...], hard: [...] }, ryuchi: {...} } }
//   note = { t: seconds, frets: [lane, ...], len?: seconds held }
// Later phases add optional note fields (hopo, phrase) without breaking older files.
//
// Format 1 (V13–V15 inline charts and imported tracks saved in IndexedDB):
//   row = [t, lane, type, hold]; type 0 = single, 1 = chord (lane and lane+2), 2 = sustain.

export const SONG_IDS = ['nexus', 'summertime', 'ruthless', 'sem-tu', 'minha-fonte'];
export const DIFFICULTIES = ['easy', 'medium', 'hard'];
// Old difficulty ids used by format 1 charts and by stored records.
export const LEGACY_DIFFICULTY = { easy: 'easy', medium: 'normal', hard: 'expert' };
const FROM_LEGACY = { easy: 'easy', normal: 'medium', expert: 'hard' };

export function normalizeRow(row) {
  if (!Array.isArray(row)) return row;
  const [t, lane, type, hold] = row;
  const note = { t, frets: type === 1 ? [lane, (lane + 2) % 4].sort((a, b) => a - b) : [lane] };
  if (type === 2 && hold > 0) note.len = hold;
  return note;
}

// Runtime notes: one entry per fret. Frets of a chord share a group, so the chord is one
// combo event even though each fret is judged on its own.
export function compileChart(rows) {
  const all = [];
  for (const raw of rows) {
    const row = normalizeRow(raw);
    const group = { size: row.frets.length, hits: 0, missed: false, multiplier: 0 };
    row.frets.forEach((lane, i) => {
      all.push({ t: row.t, lane, hold: i === 0 && row.len > 0 ? row.len : 0, hit: false, miss: false, group });
    });
  }
  return all.sort((a, b) => a.t - b.t || a.lane - b.lane);
}

export function countNotes(rows) {
  return rows.reduce((n, raw) => n + normalizeRow(raw).frets.length, 0);
}

// Upgrades charts stored by V15 (old difficulty ids, format 1 rows) to the current layout.
export function upgradeCharts(charts) {
  const out = {};
  for (const [artist, byDiff] of Object.entries(charts || {})) {
    out[artist] = {};
    for (const [diff, rows] of Object.entries(byDiff || {})) {
      out[artist][FROM_LEGACY[diff] || diff] = rows.map(normalizeRow);
    }
  }
  return out;
}

export function validateSong(song, id) {
  const fail = msg => { throw new Error(`Música ${id}: ${msg}`); };
  if (!song || song.format !== 2) fail('formato desconhecido');
  if (song.id !== id) fail('id não confere');
  for (const key of ['duration', 'bpm', 'beatAnchor']) if (!Number.isFinite(song[key])) fail(key + ' inválido');
  for (const artist of ['franco', 'ryuchi']) {
    for (const diff of DIFFICULTIES) {
      const rows = song.charts?.[artist]?.[diff];
      if (!Array.isArray(rows) || !rows.length) fail(`mapa ${artist}/${diff} ausente`);
      const lanes = song.lanes?.[diff] ?? 4;
      for (const n of rows) {
        if (!Number.isFinite(n.t) || n.t < 0) fail('nota com tempo inválido');
        if (!Array.isArray(n.frets) || !n.frets.length || n.frets.some(f => !Number.isInteger(f) || f < 0 || f >= lanes)) fail('nota com pista inválida');
        if (n.len !== undefined && !(n.len > 0)) fail('nota com duração inválida');
      }
    }
  }
  return song;
}

export async function loadSongs(baseURI, fetchImpl = fetch) {
  return Promise.all(SONG_IDS.map(async id => {
    const url = new URL('./assets/songs/' + id + '.json', baseURI).href;
    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`Não foi possível carregar ${id} (${response.status})`);
    const song = validateSong(await response.json(), id);
    return {
      ...song,
      audioUrl: './assets/audio/' + id + '.mp3',
      builtIn: true,
      provisional: false,
    };
  }));
}
