// Scoring rules shared by Solo and Duo. Values match V15; later phases tune them by playtest.

export const POINTS_PER_NOTE = 50;
export const SUSTAIN_POINTS_PER_BEAT = 25;
export const MAX_COMBO_MULTIPLIER = 4;
export const COMBO_STEP = 10;
export const POWER_SECONDS = 12;
export const POWER_FULL = 100;
export const CROWD_START = 76;

// Seconds before (early) or after (late) the note in which a press still counts. Players
// anticipate notes more often than they drag behind them, so the early side is wider.
export const HIT_WINDOWS = {
  easy: { early: 0.20, late: 0.16 },
  medium: { early: 0.17, late: 0.135 },
  hard: { early: 0.145, late: 0.115 },
};
// A note is counted as missed this long after its late window closes.
export const MISS_GRACE = 0.015;
// Classic mode: frets may settle this long after the strum and still count.
export const FORM_TOLERANCE = 0.045;

export function hitTier(delta) {
  const a = Math.abs(delta);
  return a < 0.06 ? 'PERFECT' : a < 0.118 ? 'GREAT' : 'GOOD';
}

export function comboMultiplier(combo) {
  return Math.min(MAX_COMBO_MULTIPLIER, Math.floor(combo / COMBO_STEP) + 1);
}

export function starsFor(accuracy) {
  return accuracy >= 96 ? 5 : accuracy >= 85 ? 4 : accuracy >= 70 ? 3 : accuracy >= 50 ? 2 : accuracy >= 25 ? 1 : 0;
}

export function accuracyOf(hits, possible, emptyPresses) {
  const total = possible + emptyPresses;
  return total ? Math.round(hits / total * 100) : 0;
}

export const POWER_GAIN = { PERFECT: 2.3, GREAT: 1.5, GOOD: 1.5 };

// Crowd energy (0–100). Duo shares one meter between two players, so steps are smaller.
export const CROWD = {
  solo: {
    hit: { PERFECT: 1.05, GREAT: 0.82, GOOD: 0.62 },
    miss: { easy: 2.7, medium: 3.5, hard: 4.0 },
    empty: { easy: 2.6, medium: 4.1, hard: 5.4 },
  },
  duo: {
    hit: { PERFECT: 0.55, GREAT: 0.40, GOOD: 0.40 },
    miss: { easy: 1.5, medium: 1.95, hard: 2.25 },
    empty: { easy: 1.4, medium: 2.3, hard: 3.0 },
  },
};

export function isStreakMilestone(combo) {
  return combo === 50 || combo === 100 || (combo >= 200 && combo % 100 === 0);
}
