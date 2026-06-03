export const PLAYER_BASE_SPEED = 225;
export const PLAYER_SPEED_PER_SCORE = 1.45;
export const PLAYER_SPEED_PER_SECOND = 0.21;
export const PLAYER_SPEED_CAP = 560;

export const GRASS_TOUCH_GRACE_MS = 750;
export const NO_GRASS_DRAIN_PER_SEC = 1.05;
export const NO_GRASS_DRAIN_CAP = 8.5;
export const STRAIGHT_GRACE_MS = 1100;
export const STRAIGHT_ANGLE_EPS = 0.24;
export const STRAIGHT_DRAIN_PER_SEC = 0.82;
export const STRAIGHT_DRAIN_CAP = 5.6;

// As player speed rises, the player can sweep through the map and find grass faster.
// Scale the whole chill drain stack with that speed curve so late-game movement
// does not become a free sustain bonus. Keep it bounded to preserve fair recovery.
export const CHILL_DRAIN_SPEED_MAX_MULTIPLIER = 1.9;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function finiteOr(value, fallback) {
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
    PLAYER_SPEED_CAP,
    PLAYER_BASE_SPEED + safeScore * PLAYER_SPEED_PER_SCORE + safeSurvivalTime * PLAYER_SPEED_PER_SECOND,
  );
}

export function getNoGrassSeconds({ time = 0, lastGrassTouchAt = time } = {}) {
  const safeTime = finiteOr(time, 0);
  const safeLastTouch = finiteOr(lastGrassTouchAt, safeTime);
  return Math.max(0, (safeTime - safeLastTouch - GRASS_TOUCH_GRACE_MS) / 1000);
}

export function getSpeedChillDrainMultiplier(playerSpeed = PLAYER_BASE_SPEED) {
  const safeSpeed = finiteOr(playerSpeed, PLAYER_BASE_SPEED);
  const speedProgress = clamp(
    (safeSpeed - PLAYER_BASE_SPEED) / (PLAYER_SPEED_CAP - PLAYER_BASE_SPEED),
    0,
    1,
  );
  return 1 + speedProgress * (CHILL_DRAIN_SPEED_MAX_MULTIPLIER - 1);
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
  const noGrassPenalty = Math.min(NO_GRASS_DRAIN_CAP, safeNoGrassSeconds * NO_GRASS_DRAIN_PER_SEC);
  const straightPenalty = Math.min(STRAIGHT_DRAIN_CAP, safeStraightSeconds * STRAIGHT_DRAIN_PER_SEC);
  const speedMultiplier = getSpeedChillDrainMultiplier(playerSpeed);
  return (baseline + noGrassPenalty + straightPenalty) * speedMultiplier;
}
