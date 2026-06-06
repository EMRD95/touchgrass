import test from 'node:test';
import assert from 'node:assert/strict';
import { getMovementDirectionsFromKeyboardEvent } from '../src/utils/input.js';

const dirs = (event) => getMovementDirectionsFromKeyboardEvent(event).sort();

test('movement maps physical WASD positions independent of keyboard language/layout', () => {
  assert.deepEqual(dirs({ code: 'KeyW', key: 'z' }), ['up'], 'AZERTY Z key uses physical KeyW and typed z');
  assert.deepEqual(dirs({ code: 'KeyA', key: 'q' }), ['left'], 'AZERTY Q key uses physical KeyA and typed q');
  assert.deepEqual(dirs({ code: 'KeyS', key: 's' }), ['down']);
  assert.deepEqual(dirs({ code: 'KeyD', key: 'd' }), ['right']);
  assert.deepEqual(dirs({ code: 'KeyW', key: 'ц' }), ['up'], 'Cyrillic/localized key labels still work from physical code');
  assert.deepEqual(dirs({ code: 'KeyA', key: 'ф' }), ['left'], 'non-Latin left physical key still works');
});

test('movement also supports literal WASD, literal ZQSD, and arrows', () => {
  assert.deepEqual(dirs({ code: 'Unidentified', key: 'w' }), ['up']);
  assert.deepEqual(dirs({ code: 'Unidentified', key: 'z' }), ['up']);
  assert.deepEqual(dirs({ code: 'Unidentified', key: 'a' }), ['left']);
  assert.deepEqual(dirs({ code: 'Unidentified', key: 'q' }), ['left']);
  assert.deepEqual(dirs({ code: 'Unidentified', key: 's' }), ['down']);
  assert.deepEqual(dirs({ code: 'Unidentified', key: 'd' }), ['right']);
  assert.deepEqual(dirs({ code: 'ArrowLeft', key: 'ArrowLeft' }), ['left']);
  assert.deepEqual(dirs({ code: 'ArrowUp', key: 'ArrowUp' }), ['up']);
});
