export function chunkSeed(cx, cy) {
  let h = 0x811c9dc5;
  h = Math.imul(h ^ (cx | 0), 0x01000193);
  h = Math.imul(h ^ (cy | 0), 0x01000193);
  h = Math.imul(h ^ 0x9e3779b9, 0x01000193);
  return h >>> 0;
}

export function seededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randFloat(rng, min, max) {
  return min + rng() * (max - min);
}

export function randInt(rng, min, max) {
  return Math.floor(randFloat(rng, min, max + 1));
}

export function randPick(rng, values) {
  return values[Math.floor(rng() * values.length) % values.length];
}

export function formatDuration(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export function getPressure({ score = 0, survivalTime = 0 } = {}) {
  const safeScore = Math.max(0, finiteOr(score, 0));
  const safeSurvivalTime = Math.max(0, finiteOr(survivalTime, 0));
  return safeScore * 0.42 + safeSurvivalTime * 0.055;
}

export function getPlayerSpeed({ score = 0, survivalTime = 0 } = {}) {
  const safeScore = Math.max(0, finiteOr(score, 0));
  const safeSurvivalTime = Math.max(0, finiteOr(survivalTime, 0));
  return Math.min(
    560,
    225 + safeScore * 1.45 + safeSurvivalTime * 0.21,
  );
}

export function getNoGrassSeconds({ time = 0, lastGrassTouchAt = time } = {}) {
  const safeTime = finiteOr(time, 0);
  const safeLastTouch = finiteOr(lastGrassTouchAt, safeTime);
  return Math.max(0, (safeTime - safeLastTouch - 750) / 1000);
}

export function getSpeedChillDrainMultiplier(playerSpeed = 225) {
  const safeSpeed = finiteOr(playerSpeed, 225);
  const speedProgress = clamp(
    (safeSpeed - 225) / (560 - 225),
    0,
    1,
  );
  return 1 + speedProgress * (1.9 - 1);
}

export function getChillDrainRate({
  score = 0,
  survivalTime = 0,
  playerSpeed = getPlayerSpeed({ score, survivalTime }),
  noGrassSeconds = 0,
  straightSeconds = 0,
} = {}) {
  const pressure = getPressure({ score, survivalTime });
  const safeNoGrassSeconds = Math.max(0, finiteOr(noGrassSeconds, 0));
  const safeStraightSeconds = Math.max(0, finiteOr(straightSeconds, 0));
  const baseline = 0.95 + pressure * 0.018;
  const noGrassPenalty = Math.min(8.5, safeNoGrassSeconds * 1.05);
  const straightPenalty = Math.min(5.6, safeStraightSeconds * 0.82);
  const speedMultiplier = getSpeedChillDrainMultiplier(playerSpeed);
  return (baseline + noGrassPenalty + straightPenalty) * speedMultiplier;
}

export function getTargetCorporateEnemyCount({ score = 0, survivalTime = 0 } = {}) {
  const safeScore = Math.max(0, finiteOr(score, 0));
  const safeSurvivalTime = Math.max(0, finiteOr(survivalTime, 0));
  return Math.min(110, 9 + Math.floor(safeScore / 8) + Math.floor(safeSurvivalTime / 16));
}

export function getWaveEnemyBurstCount(wave = 1) {
  const safeWave = Math.max(1, Math.floor(finiteOr(wave, 1)));
  if (safeWave < 4) return 1;
  if (safeWave < 7) return 1;
  return Math.min(4, 1 + Math.floor((safeWave - 7) / 3));
}

export function getChunkGrassCount(rng = Math.random) {
  return 2 + (Math.min(0.999999999999, Math.max(0, Number.isFinite(rng()) ? rng() : 0)) < (2 / 3) ? 1 : 0);
}

export function getPostCollectGrassSpawnCount(pressure = 0, rng = Math.random) {
  const safePressure = Math.max(0, finiteOr(pressure, 0));
  if (safePressure > 50) return 2;
  return 1 + (Math.min(0.999999999999, Math.max(0, Number.isFinite(rng()) ? rng() : 0)) < (1 / 3) ? 1 : 0);
}

export function simpleHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function isExpandingGrassRarity(rarity) {
  return Number.isFinite(rarity?.pulse) && rarity.pulse > 1;
}

export function pickRarity(rng = Math.random) {
  const roll = rng();
  if (roll < 0.02) return 'legendary';
  if (roll < 0.10) return 'epic';
  if (roll < 0.30) return 'rare';
  return 'common';
}
