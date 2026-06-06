export const GAME_W = 1376;
export const GAME_H = 768;
export const CHUNK_SIZE = 900;
export const CHUNK_RADIUS = 2;
export const CHUNK_CULL_RADIUS = 3;

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
export const CHILL_DRAIN_SPEED_MAX_MULTIPLIER = 1.9;

export const BREATHE_CORE_RADIUS = 210;
export const BREATHE_OUTER_RADIUS = 390;
export const BREATHE_FORCE = 360;
export const BREATHE_REPEL_MS = 430;
export const RESTART_LOCK_MS = 2500;
export const HYDRATION_DURATION_MS = 7000;
export const MAX_BOTTLES = 3;
export const BOTTLE_SPAWN_INTERVAL_MS = 22000;

export const MAX_GRASS = 60;
export const CHUNK_GRASS_BASE = 2;
export const CHUNK_GRASS_EXTRA_CHANCE = 2 / 3;

export const MAX_CORPORATE_ENEMIES = 150;

export const POWERUP_DURATION = {
  magnet: 8000,
  shield: 10000,
  speed: 5000,
  timewarp: 6000,
  bomb: 0,
  multiplier: 10000,
};

export const RARITY = {
  common: { id: 'common', label: 'Common', chance: 0.70, score: 1, chill: 5.2, color: 0x91d969, tint: 0x74c857, pulse: 1 },
  rare: { id: 'rare', label: 'Rare', chance: 0.20, score: 3, chill: 12, color: 0xffd36e, tint: 0xffd36e, pulse: 1.15 },
  epic: { id: 'epic', label: 'Epic', chance: 0.08, score: 5, chill: 22, color: 0xc084fc, tint: 0xc084fc, pulse: 1.3 },
  legendary: { id: 'legendary', label: 'Legendary', chance: 0.02, score: 10, chill: 45, color: 0x4dc9f6, tint: 0x4dc9f6, pulse: 1.5 },
};

export const MEMES = [
  'PHOTOSYNTHESIS +1',
  'YOU HAVE LOGGED OFF THE MATRIX',
  'THE GRASS ACCEPTS YOUR APOLOGY',
  'DOPAMINE WITHOUT WI-FI?',
  'ACHIEVEMENT: LEFT CHAIR',
  'OUTSIDE DLC UNLOCKED',
  'BUG FIXED: VITAMIN D NULL POINTER',
  'LINKEDIN CANNOT REACH YOU HERE',
  'SYSTEM: BREATHE.EXE RUNNING',
  'NPC ARC CANCELLED',
  'GRASS.FOUND === TRUE',
  'TOUCHED GRASS, REGRET NOTHING',
  'NATURE PATCH APPLIED',
  'SERVER 404: INDOORS NOT FOUND',
  'DEPLOYED TO PROD(UCTION FIELD)',
  'REALITY RENDERER: 60FPS',
  'COMMIT: went_outside.js',
  'PING: 1ms TO NATURE',
  'DNS RESOLVED TO FOREST',
  'TLS HANDSHAKE WITH TREE',
];

export const HAZARD_MEMES = [
  'BRAND AGGRO',
  'ALGORITHM LOCKED ON',
  'NOTIFICATION CRIT!',
  'ENGAGEMENT LOOP DAMAGE',
  'THE TIMELINE BITES BACK',
  'SERVER PINGED YOUR SOUL',
  'TERMS OF SERVICE VIOLATION',
  'COOKIE CONSENT REVOKED',
  'PUSH NOTIFICATION HIT',
  'ALGO-RHYTHM DISTURBANCE',
];

export const WAVE_NAMES = [
  'The Seedling',
  'Sprouting',
  ' photosynthesis Intensifies',
  'The Bramble Wall',
  'Corporate Mowing Squad',
  'Doomscrolling Horde',
  'Algorithmic Winter',
  'The Great Firewall of Grass',
  'Nature vs Networks',
  'Digital Apocalypse',
  'Grass Eternal',
];

export const ASSET = (path) => `assets/${path}?v=7`;
