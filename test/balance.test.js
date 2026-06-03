import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PLAYER_BASE_SPEED,
  PLAYER_SPEED_CAP,
  getChillDrainRate,
  getPlayerSpeed,
  getSpeedChillDrainMultiplier,
} from '../src/balance.js';

test('player speed progression is capped at the declared maximum', () => {
  assert.equal(getPlayerSpeed({ score: 0, survivalTime: 0 }), PLAYER_BASE_SPEED);
  assert.equal(getPlayerSpeed({ score: 9999, survivalTime: 9999 }), PLAYER_SPEED_CAP);
});

test('speed drain multiplier starts neutral and rises with player speed', () => {
  const baseMultiplier = getSpeedChillDrainMultiplier(PLAYER_BASE_SPEED);
  const midSpeed = PLAYER_BASE_SPEED + (PLAYER_SPEED_CAP - PLAYER_BASE_SPEED) * 0.5;
  const midMultiplier = getSpeedChillDrainMultiplier(midSpeed);
  const capMultiplier = getSpeedChillDrainMultiplier(PLAYER_SPEED_CAP);

  assert.equal(baseMultiplier, 1);
  assert.ok(midMultiplier > baseMultiplier, 'mid-game speed must drain chill faster than base speed');
  assert.ok(capMultiplier > midMultiplier, 'late-game capped speed must drain chill faster than mid-game speed');
  assert.ok(capMultiplier >= 1.85, 'capped player speed should nearly double passive chill drain');
  assert.ok(capMultiplier <= 2.1, 'speed matching should stay bounded so the meter does not become impossible');
});

test('chill drain rate scales from player speed even when pressure is held constant', () => {
  const calmState = { score: 0, survivalTime: 0, noGrassSeconds: 0, straightSeconds: 0 };
  const baseDrain = getChillDrainRate({ ...calmState, playerSpeed: PLAYER_BASE_SPEED });
  const fastDrain = getChillDrainRate({ ...calmState, playerSpeed: PLAYER_SPEED_CAP });

  assert.ok(fastDrain >= baseDrain * 1.85, `expected fast drain ${fastDrain} to be at least 1.85x base drain ${baseDrain}`);
});

test('speed matching scales the full drain stack, including no-grass and straight-run penalties', () => {
  const penaltyState = { score: 0, survivalTime: 0, noGrassSeconds: 6, straightSeconds: 5 };
  const baseDrain = getChillDrainRate({ ...penaltyState, playerSpeed: PLAYER_BASE_SPEED });
  const fastDrain = getChillDrainRate({ ...penaltyState, playerSpeed: PLAYER_SPEED_CAP });

  assert.ok(fastDrain >= baseDrain * 1.85, `expected fast penalty drain ${fastDrain} to scale with base penalty drain ${baseDrain}`);
});
