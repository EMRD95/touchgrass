import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHUNK_GRASS_BASE,
  CHUNK_GRASS_EXTRA_CHANCE,
  CHUNK_GRASS_MAX,
  CHUNK_GRASS_MIN,
  MAX_GRASS,
  LOW_PRESSURE_EXTRA_GRASS_CHANCE,
  getChunkGrassCount,
  getExpectedChunkGrassCount,
  getExpectedPostCollectGrassSpawnCount,
  getPostCollectGrassSpawnCount,
} from '../src/grass-density.js';

test('grass density cap is reduced by one third from the original 72 cap', () => {
  assert.equal(MAX_GRASS, 48);
});

test('chunk grass generation averages two thirds of the previous 3-5 tufts per chunk', () => {
  assert.equal(CHUNK_GRASS_MIN, 2);
  assert.equal(CHUNK_GRASS_MAX, 3);
  assert.equal(CHUNK_GRASS_BASE, 2);
  assert.equal(CHUNK_GRASS_EXTRA_CHANCE, 2 / 3);
  assert.equal(getExpectedChunkGrassCount(), 8 / 3);

  assert.equal(getChunkGrassCount(() => 0), 3);
  assert.equal(getChunkGrassCount(() => 0.66), 3);
  assert.equal(getChunkGrassCount(() => 0.67), 2);
});

test('post-collection grass replenishment is reduced by one third on expectation', () => {
  assert.equal(LOW_PRESSURE_EXTRA_GRASS_CHANCE, 1 / 3);
  assert.equal(getExpectedPostCollectGrassSpawnCount(0), 4 / 3);
  assert.equal(getExpectedPostCollectGrassSpawnCount(100), 2);

  assert.equal(getPostCollectGrassSpawnCount(0, () => 0), 2);
  assert.equal(getPostCollectGrassSpawnCount(0, () => 0.34), 1);
  assert.equal(getPostCollectGrassSpawnCount(100, () => 0), 2);
  assert.equal(getPostCollectGrassSpawnCount(100, () => 0.99), 2);
});
