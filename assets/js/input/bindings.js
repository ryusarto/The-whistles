// Default input bindings. Lanes are numbered left to right.

// Tap mode: pressing a lane plays it.
export const SOLO_KEYS = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3 };
export const DUO_KEYS = [SOLO_KEYS, { KeyQ: 0, KeyW: 1, KeyO: 2, KeyP: 3 }];
export const KEY_LABELS = ['D', 'F', 'J', 'K'];

// Classic mode (Solo keyboard): left hand holds the frets, right hand strums.
export const CLASSIC_KEYS = { KeyA: 0, KeyS: 1, KeyD: 2, KeyF: 3 };
export const CLASSIC_KEY_LABELS = ['A', 'S', 'D', 'F'];
export const STRUM_KEYS = new Set(['ArrowUp', 'ArrowDown']);

// Gamepad API "standard" mapping: L2, L1, R1, R2.
export const PAD_FRETS = [6, 4, 5, 7];
export const PAD_LABELS = ['L2', 'L1', 'R1', 'R2'];
export const PAD = { CROSS: 0, CIRCLE: 1, OPTIONS: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
// Classic mode on a gamepad: hold the shoulder frets and strum with the D-pad.
export const PAD_STRUM = [PAD.UP, PAD.DOWN];
export const PAD_BUTTON_COUNT = 18;

export function padPressed(pad, button) {
  const b = pad.buttons && pad.buttons[button];
  return !!(b && (b.pressed || b.value > 0.55));
}
