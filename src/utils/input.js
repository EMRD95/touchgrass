export const MOVEMENT_CODE_DIRECTIONS = Object.freeze({
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',

  // Physical QWERTY WASD positions. KeyboardEvent.code stays stable on
  // AZERTY, Cyrillic, Arabic, IME, and other localized layouts.
  KeyW: 'up',
  KeyA: 'left',
  KeyS: 'down',
  KeyD: 'right',

  // Extra physical support for players who deliberately use ZQSD on QWERTY.
  KeyZ: 'up',
  KeyQ: 'left',
});

export const MOVEMENT_KEY_DIRECTIONS = Object.freeze({
  // Typed Latin labels: supports WASD and French ZQSD when the key value is Latin.
  w: 'up',
  z: 'up',
  a: 'left',
  q: 'left',
  s: 'down',
  d: 'right',
});

export function getMovementDirectionsFromKeyboardEvent(event) {
  const dirs = new Set();
  const codeDir = MOVEMENT_CODE_DIRECTIONS[event?.code];
  if (codeDir) dirs.add(codeDir);

  const key = String(event?.key || '').trim().toLowerCase();
  const keyDir = MOVEMENT_KEY_DIRECTIONS[key];
  if (keyDir) dirs.add(keyDir);

  return Array.from(dirs);
}
