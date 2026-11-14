// Note judgement helpers. Pure functions: callers pass the clock time and tuning values.

export function beginHit(note, multiplier) {
  note.hit = true;
  const group = note.group || (note.group = { size: 1, hits: 0, missed: false, multiplier: 0 });
  if (!group.hits) group.multiplier = multiplier;
  group.hits++;
  return { multiplier: group.multiplier, complete: !group.missed && group.hits === group.size };
}

// Returns true only for the first miss of a group, so a missed chord is one penalty.
export function missEvent(note) {
  note.miss = true;
  if (note.group?.missed) return false;
  if (note.group) note.group.missed = true;
  return true;
}

export function makeHold(note, now) {
  return { note, end: note.t + note.hold, lane: note.lane, last: Math.max(note.t, now), fraction: 0 };
}

// Awards tail points as the audio advances. Releasing never removes points already earned.
// A release closer than 0.10 s to the end, or inside the resume grace period, is forgiven.
export function advanceHolds(holds, pressed, t, multiplier, award, { pointsPerSecond, graceUntil = 0 }) {
  for (let i = holds.length - 1; i >= 0; i--) {
    const h = holds[i], until = Math.min(t, h.end);
    if (!pressed.has(h.lane) && t < h.end - 0.10 && t > graceUntil) { holds.splice(i, 1); continue; }
    if (until > h.last) {
      h.fraction += (until - h.last) * pointsPerSecond * multiplier();
      const points = Math.floor(h.fraction + 1e-8);
      h.fraction -= points; h.last = until;
      if (points) award(points);
    }
    if (t >= h.end) holds.splice(i, 1);
  }
}

// Closest unjudged note on a lane within the window, scanning forward from `from`.
export function closestNote(notes, from, lane, t, window) {
  let closest = null, best = window;
  for (let i = from; i < notes.length; i++) {
    const n = notes[i];
    if (n.t > t + window) break;
    if (n.hit || n.miss || n.lane !== lane) continue;
    const d = Math.abs(n.t - t);
    if (d < best) { best = d; closest = n; }
  }
  return closest;
}
