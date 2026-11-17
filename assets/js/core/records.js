// Personal records in localStorage. Keys keep the V15 naming (and old difficulty ids) so
// records saved before the difficulty rename still appear.
import { LEGACY_DIFFICULTY } from './songs.js';

const PREFIX = 'the-whistles-v15';
const storedDiff = diff => LEGACY_DIFFICULTY[diff] || diff;

export const recordKey = (trackId, artist, diff) => `${PREFIX}:record:${trackId}:${artist}:${storedDiff(diff)}`;
export const duoRecordKey = (trackId, diff) => `${PREFIX}:duo:${trackId}:${storedDiff(diff)}`;

export function createRecordStore(getStorage) {
  const cache = new Map();
  const read = key => {
    try { return JSON.parse(getStorage().getItem(key) || 'null') || cache.get(key) || null; }
    catch (e) { return cache.get(key) || null; }
  };
  const write = key => rec => {
    cache.set(key, rec);
    try { getStorage().setItem(key, JSON.stringify(rec)); }
    catch (e) { console.warn('Recorde não pôde ser salvo', e); }
  };
  return {
    load: (track, artist, diff) => read(recordKey(track.id, artist, diff)),
    save: (track, artist, diff, rec) => write(recordKey(track.id, artist, diff))(rec),
    loadDuo: (track, diff) => read(duoRecordKey(track.id, diff)),
    saveDuo: (track, diff, rec) => write(duoRecordKey(track.id, diff))(rec),
  };
}

// Merges a finished show into the previous best.
export function mergeRecord(prev, { accuracy, score, bestCombo, stars, difficulty }) {
  prev = prev || {};
  return {
    bestAccuracy: Math.max(accuracy, prev.bestAccuracy || 0),
    bestScore: Math.max(score, prev.bestScore || 0),
    bestCombo: Math.max(bestCombo, prev.bestCombo || 0),
    stars: Math.max(stars, prev.stars || 0),
    plays: (prev.plays || 0) + 1,
    clears: (prev.clears || 0) + 1,
    ...(difficulty ? { lastDifficulty: difficulty } : {}),
    lastPlayed: new Date().toISOString(),
  };
}

export const isImprovement = (prev, accuracy, score) =>
  accuracy > (prev?.bestAccuracy || 0) || score > (prev?.bestScore || 0);
