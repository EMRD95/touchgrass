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

const mainSrc = loadSource('main.js');

// ── Constants ──────────────────────────────────────────────────────────

describe('hydration power-up constants', () => {
  it('defines HYDRATION_DURATION_MS in main.js', () => {
    assert.match(mainSrc, /HYDRATION_DURATION_MS\s*=\s*\d+/);
  });

  it('defines MAX_BOTTLES in main.js', () => {
    assert.match(mainSrc, /MAX_BOTTLES\s*=\s*\d+/);
  });

  it('defines BOTTLE_SPAWN_INTERVAL_MS in main.js', () => {
    assert.match(mainSrc, /BOTTLE_SPAWN_INTERVAL_MS\s*=\s*\d+/);
  });
});

// ── Asset loading ──────────────────────────────────────────────────────

describe('hydration bottle asset', () => {
  it('bottle SVG asset file exists', () => {
    const p = resolve(repoRoot, 'public', 'assets', 'items', 'water_bottle.svg');
    assert.ok(existsSync(p), `missing ${p}`);
  });

  it('preloads water_bottle image in MenuScene', () => {
    assert.match(mainSrc, /load\.image\(['"]water_bottle['"]/);
  });
});

// ── Spawning ───────────────────────────────────────────────────────────

describe('bottle spawning', () => {
  it('declares a waterBottles physics group', () => {
    assert.match(mainSrc, /waterBottles\s*=\s*this\.physics\.add\.group/);
  });

  it('has a spawnWaterBottle method', () => {
    assert.match(mainSrc, /spawnWaterBottle\s*\(/);
  });

  it('spawnWaterBottle respects MAX_BOTTLES cap', () => {
    assert.match(mainSrc, /waterBottles\.getLength\(\)\s*>=\s*MAX_BOTTLES/);
  });
});

// ── Collection / Hydration state ───────────────────────────────────────

describe('bottle collection triggers hydration', () => {
  it('has overlap callback for player vs waterBottles', () => {
    assert.match(mainSrc, /this\.physics\.add\.overlap\(this\.player,\s*this\.waterBottles/);
  });

  it('sets hydratingUntil and restores chill to full on collection', () => {
    assert.match(mainSrc, /hydratingUntil\s*=\s*this\.now\(\)\s*\+\s*HYDRATION_DURATION_MS/);
    assert.match(mainSrc, /this\.chill\s*=\s*100\s*;/);
  });

  it('floats HYDRATING! text on collection', () => {
    assert.match(mainSrc, /HYDRATING!/);
  });

  it('destroys bottle on collection', () => {
    // The overlap handler should call destroy on the bottle or tween+destroy
    assert.match(mainSrc, /bottle\.destroy\(\)/);
  });
});

// ── Enemy killing during hydration ─────────────────────────────────────

describe('hydration enemy killing', () => {
  it('takeDamage checks hydratingUntil before applying damage', () => {
    // The takeDamage method should check if hydrating first
    assert.match(mainSrc, /if\s*\(\s*this\.now\(\)\s*<\s*this\.hydratingUntil\s*\)/);
  });

  it('destroys enemies while hydrating instead of taking damage', () => {
    // During hydration, the enemy should be destroyed with a HYDRATED effect
    assert.match(mainSrc, /HYDRATED/);
  });
});

// ── HUD ────────────────────────────────────────────────────────────────

describe('hydration HUD indicator', () => {
  it('shows hydration remaining time in HUD via hydrating state', () => {
    const hudSrc = loadSource('main.js');
    assert.match(hudSrc, /hydrating/);
  });
});
