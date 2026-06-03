export const MAX_GRASS = 48;
export const CHUNK_GRASS_BASE = 2;
export const CHUNK_GRASS_EXTRA_CHANCE = 2 / 3;
export const CHUNK_GRASS_MIN = CHUNK_GRASS_BASE;
export const CHUNK_GRASS_MAX = CHUNK_GRASS_BASE + 1;
export const POST_COLLECT_GRASS_PRESSURE_THRESHOLD = 50;
export const LOW_PRESSURE_EXTRA_GRASS_CHANCE = 1 / 3;

function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function nextRandom(rng) {
  return finiteOr(rng(), 0);
}

function chance(rng, probability) {
  const roll = Math.min(0.999999999999, Math.max(0, nextRandom(rng)));
  return roll < probability;
}

export function getExpectedChunkGrassCount() {
  return CHUNK_GRASS_BASE + CHUNK_GRASS_EXTRA_CHANCE;
}

export function getChunkGrassCount(rng = Math.random) {
  return CHUNK_GRASS_BASE + (chance(rng, CHUNK_GRASS_EXTRA_CHANCE) ? 1 : 0);
}

export function getExpectedPostCollectGrassSpawnCount(pressure = 0) {
  const safePressure = Math.max(0, finiteOr(pressure, 0));
  return safePressure > POST_COLLECT_GRASS_PRESSURE_THRESHOLD
    ? 2
    : 1 + LOW_PRESSURE_EXTRA_GRASS_CHANCE;
}

export function getPostCollectGrassSpawnCount(pressure = 0, rng = Math.random) {
  const safePressure = Math.max(0, finiteOr(pressure, 0));
  if (safePressure > POST_COLLECT_GRASS_PRESSURE_THRESHOLD) return 2;
  return 1 + (chance(rng, LOW_PRESSURE_EXTRA_GRASS_CHANCE) ? 1 : 0);
}
