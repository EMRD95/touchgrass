import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getChunkGrassCount,
  getPostCollectGrassSpawnCount,
} from '../src/utils/helpers.js';

import {
  MAX_GRASS,
  CHUNK_GRASS_BASE,
} from '../src/utils/constants.js';

test('grass density cap exists', () => {
  assert.equal(MAX_GRASS, 60);
});

test('chunk grass generation returns expected values', () => {
  assert.ok(getChunkGrassCount(() => 0) >= CHUNK_GRASS_BASE);
  assert.ok(getChunkGrassCount(() => 0.99) >= CHUNK_GRASS_BASE);
});

test('post-collection grass replenishment respects pressure', () => {
  assert.ok(getPostCollectGrassSpawnCount(0, () => 0) >= 1);
  assert.ok(getPostCollectGrassSpawnCount(100, () => 0) >= 2);
});
