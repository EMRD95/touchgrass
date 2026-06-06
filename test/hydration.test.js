import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

function loadSource(filename) {
  return readFileSync(resolve(repoRoot, 'src', filename), 'utf-8');
}

const constSrc = loadSource('utils/constants.js');
const gameSrc = loadSource('scenes/GameScene.js');

describe('hydration power-up constants', () => {
  it('defines HYDRATION_DURATION_MS in constants.js', () => {
    assert.match(constSrc, /HYDRATION_DURATION_MS\s*=\s*\d+/);
  });

  it('defines MAX_BOTTLES in constants.js', () => {
    assert.match(constSrc, /MAX_BOTTLES\s*=\s*\d+/);
  });

  it('defines BOTTLE_SPAWN_INTERVAL_MS in constants.js', () => {
    assert.match(constSrc, /BOTTLE_SPAWN_INTERVAL_MS\s*=\s*\d+/);
  });
});

describe('hydration bottle asset', () => {
  it('bottle SVG asset file exists', () => {
    const p = resolve(repoRoot, 'public', 'assets', 'items', 'water_bottle.svg');
    assert.ok(existsSync(p), `missing ${p}`);
  });

  it('preloads water_bottle image in BootScene', () => {
    const bootSrc = loadSource('scenes/BootScene.js');
    assert.match(bootSrc, /load\.image\(['"]water_bottle['"]/);
  });
});

describe('bottle spawning', () => {
  it('declares a waterBottles physics group', () => {
    assert.match(gameSrc, /waterBottles\s*=\s*this\.physics\.add\.group/);
  });

  it('has a spawnWaterBottle method', () => {
    assert.match(gameSrc, /spawnWaterBottle\s*\(/);
  });

  it('spawnWaterBottle respects MAX_BOTTLES cap', () => {
    assert.match(gameSrc, /waterBottles\.getLength\(\)\s*>=\s*MAX_BOTTLES/);
  });
});

describe('bottle collection triggers hydration', () => {
  it('has overlap callback for player vs waterBottles', () => {
    assert.match(gameSrc, /this\.physics\.add\.overlap\(this\.player,\s*this\.waterBottles/);
  });

  it('sets hydratingUntil and restores chill to full on collection', () => {
    assert.match(gameSrc, /hydratingUntil\s*=\s*this\.now\(\)\s*\+\s*HYDRATION_DURATION_MS/);
    assert.match(gameSrc, /this\.chill\s*=\s*100\s*;/);
  });

  it('floats HYDRATING! text on collection', () => {
    assert.match(gameSrc, /HYDRATING!/);
  });

  it('destroys bottle on collection', () => {
    assert.match(gameSrc, /bottle\.destroy\(\)/);
  });
});

describe('hydration enemy killing', () => {
  it('takeDamage checks hydratingUntil before applying damage', () => {
    assert.match(gameSrc, /if\s*\(\s*this\.now\(\)\s*<\s*this\.hydratingUntil\s*\)/);
  });

  it('destroys enemies while hydrating instead of taking damage', () => {
    assert.match(gameSrc, /HYDRATED!/);
  });
});
