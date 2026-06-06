import Phaser from 'phaser';
import {
  GAME_W, GAME_H, CHUNK_SIZE, CHUNK_RADIUS, CHUNK_CULL_RADIUS,
  BREATHE_CORE_RADIUS, BREATHE_OUTER_RADIUS, BREATHE_FORCE, BREATHE_REPEL_MS,
  RESTART_LOCK_MS, HYDRATION_DURATION_MS, MAX_BOTTLES, BOTTLE_SPAWN_INTERVAL_MS,
  MAX_GRASS, MEMES, HAZARD_MEMES, WAVE_NAMES, ASSET, RARITY, POWERUP_DURATION,
} from '../utils/constants.js';
import {
  chunkSeed, seededRng, randFloat, randInt, randPick, formatDuration,
  getPressure, getPlayerSpeed, getNoGrassSeconds, getSpeedChillDrainMultiplier,
  getChillDrainRate, getTargetCorporateEnemyCount, getChunkGrassCount,
  getPostCollectGrassSpawnCount, pickRarity, isExpandingGrassRarity, getWaveEnemyBurstCount, clamp,
} from '../utils/helpers.js';
import { auth } from '../systems/Auth.js';
import { progression } from '../systems/Progression.js';
import { achievements } from '../systems/Achievements.js';
import { AudioManager } from '../systems/AudioManager.js';
import { Effects } from '../systems/Effects.js';
import { PowerUpManager, POWERUP_TYPES } from '../systems/PowerUpManager.js';
import { leaderboard } from '../systems/LeaderboardManager.js';
import { HUD } from '../ui/HUD.js';
import { getMovementDirectionsFromKeyboardEvent } from '../utils/input.js';

const CORPORATE_ENEMY_TYPES = [
  'tiktok', 'youtube', 'chatgpt', 'discord', 'google', 'wikipedia',
  'gmail', 'instagram', 'facebook', 'linkedin', 'teams', 'whatsapp', 'twitter',
  'hermes_walk1', 'hermes_walk2',
];

const CORPORATE_ENEMY_PROFILES = {
  tiktok: { label: 'TikTok', textureKey: 'logo_tiktok', damageBase: 12.2, damagePressure: 0.066, size: 54, bodySize: 86, jitter: 0.58, retargetBaseMs: 600, retargetPressureMs: 6.2, lungeMinMs: 640, lungeBaseMinMs: 1300, lungeBaseMaxMs: 2500, lungePressureMs: 8.4, pulseScale: 1.18, pulseMs: 410, color: 0x00f2ea, strategies: ['sweeper', 'zigzag', 'cutoff'] },
  youtube: { label: 'YouTube', textureKey: 'logo_youtube', damageBase: 12.8, damagePressure: 0.071, size: 62, bodySize: 92, jitter: 0.36, retargetBaseMs: 820, retargetPressureMs: 4.8, lungeMinMs: 820, lungeBaseMinMs: 1800, lungeBaseMaxMs: 3100, lungePressureMs: 7.2, pulseScale: 1.12, pulseMs: 620, color: 0xff0033, strategies: ['cutoff', 'herder', 'ambusher'] },
  chatgpt: { label: 'ChatGPT', textureKey: 'logo_chatgpt', damageBase: 11.9, damagePressure: 0.069, size: 58, bodySize: 88, jitter: 0.24, retargetBaseMs: 760, retargetPressureMs: 5.6, lungeMinMs: 740, lungeBaseMinMs: 1500, lungeBaseMaxMs: 2800, lungePressureMs: 7.8, pulseScale: 1.15, pulseMs: 540, color: 0x10a37f, strategies: ['predictor', 'ambusher', 'mirror'] },
  discord: { label: 'Discord', textureKey: 'logo_discord', damageBase: 11.6, damagePressure: 0.064, size: 56, bodySize: 88, jitter: 0.46, retargetBaseMs: 700, retargetPressureMs: 5.8, lungeMinMs: 700, lungeBaseMinMs: 1600, lungeBaseMaxMs: 2900, lungePressureMs: 7.4, pulseScale: 1.2, pulseMs: 500, color: 0x5865f2, strategies: ['orbiter', 'flanker', 'pack'] },
  google: { label: 'Google', textureKey: 'logo_google', damageBase: 11.8, damagePressure: 0.069, size: 60, bodySize: 90, jitter: 0.3, retargetBaseMs: 680, retargetPressureMs: 5.9, lungeMinMs: 720, lungeBaseMinMs: 1450, lungeBaseMaxMs: 2750, lungePressureMs: 7.6, pulseScale: 1.13, pulseMs: 560, color: 0x4285f4, strategies: ['sweeper', 'cutoff', 'herder'] },
  wikipedia: { label: 'Wikipedia', textureKey: 'logo_wikipedia', damageBase: 11.2, damagePressure: 0.064, size: 60, bodySize: 88, jitter: 0.2, retargetBaseMs: 980, retargetPressureMs: 4.1, lungeMinMs: 920, lungeBaseMinMs: 2000, lungeBaseMaxMs: 3400, lungePressureMs: 6.2, pulseScale: 1.09, pulseMs: 720, color: 0xf2f2f2, strategies: ['orbiter', 'ambusher', 'predictor'] },
  gmail: { label: 'Gmail', textureKey: 'logo_gmail', damageBase: 12.1, damagePressure: 0.068, size: 60, bodySize: 90, jitter: 0.34, retargetBaseMs: 720, retargetPressureMs: 5.4, lungeMinMs: 720, lungeBaseMinMs: 1500, lungeBaseMaxMs: 2800, lungePressureMs: 7.5, pulseScale: 1.14, pulseMs: 520, color: 0xea4335, strategies: ['cutoff', 'flanker', 'herder'] },
  instagram: { label: 'Instagram', textureKey: 'logo_instagram', damageBase: 12.0, damagePressure: 0.067, size: 58, bodySize: 88, jitter: 0.52, retargetBaseMs: 620, retargetPressureMs: 6.1, lungeMinMs: 680, lungeBaseMinMs: 1350, lungeBaseMaxMs: 2600, lungePressureMs: 8.2, pulseScale: 1.2, pulseMs: 450, color: 0xe1306c, strategies: ['orbiter', 'zigzag', 'pack'] },
  facebook: { label: 'Facebook', textureKey: 'logo_facebook', damageBase: 11.7, damagePressure: 0.065, size: 58, bodySize: 88, jitter: 0.42, retargetBaseMs: 760, retargetPressureMs: 5.1, lungeMinMs: 760, lungeBaseMinMs: 1600, lungeBaseMaxMs: 3000, lungePressureMs: 7.0, pulseScale: 1.16, pulseMs: 560, color: 0x1877f2, strategies: ['pack', 'sweeper', 'ambusher'] },
  linkedin: { label: 'LinkedIn', textureKey: 'logo_linkedin', damageBase: 11.4, damagePressure: 0.063, size: 58, bodySize: 88, jitter: 0.28, retargetBaseMs: 860, retargetPressureMs: 4.6, lungeMinMs: 840, lungeBaseMinMs: 1800, lungeBaseMaxMs: 3200, lungePressureMs: 6.8, pulseScale: 1.1, pulseMs: 680, color: 0x0a66c2, strategies: ['predictor', 'cutoff', 'mirror'] },
  teams: { label: 'Teams', textureKey: 'logo_teams', damageBase: 11.9, damagePressure: 0.067, size: 60, bodySize: 90, jitter: 0.22, retargetBaseMs: 900, retargetPressureMs: 4.4, lungeMinMs: 880, lungeBaseMinMs: 1900, lungeBaseMaxMs: 3300, lungePressureMs: 6.5, pulseScale: 1.11, pulseMs: 700, color: 0x6264a7, strategies: ['mirror', 'orbiter', 'herder'] },
  whatsapp: { label: 'WhatsApp', textureKey: 'logo_whatsapp', damageBase: 11.6, damagePressure: 0.065, size: 58, bodySize: 88, jitter: 0.5, retargetBaseMs: 640, retargetPressureMs: 5.9, lungeMinMs: 680, lungeBaseMinMs: 1400, lungeBaseMaxMs: 2700, lungePressureMs: 7.9, pulseScale: 1.18, pulseMs: 490, color: 0x25d366, strategies: ['zigzag', 'pack', 'sweeper'] },
  twitter: { label: 'Twitter', textureKey: 'logo_twitter', damageBase: 11.8, damagePressure: 0.068, size: 58, bodySize: 88, jitter: 0.54, retargetBaseMs: 590, retargetPressureMs: 6.3, lungeMinMs: 650, lungeBaseMinMs: 1300, lungeBaseMaxMs: 2550, lungePressureMs: 8.5, pulseScale: 1.19, pulseMs: 430, color: 0x1da1f2, strategies: ['sweeper', 'zigzag', 'cutoff'] },
  hermes_walk1: { label: 'Hermes', textureKey: 'enemy_hermes_walk1', animationKey: 'hermes_walk', damageBase: 12.4, damagePressure: 0.07, size: 60, displayWidth: 50, displayHeight: 70, bodySize: 78, bodyWidth: 50, bodyHeight: 76, jitter: 0.3, retargetBaseMs: 700, retargetPressureMs: 5.5, lungeMinMs: 700, lungeBaseMinMs: 1450, lungeBaseMaxMs: 2750, lungePressureMs: 7.8, pulseScale: 1.08, pulseMs: 520, color: 0xffb38f, defaultFlipX: true, strategies: ['ambusher', 'flanker', 'mirror'] },
  hermes_walk2: { label: 'Hermes', textureKey: 'enemy_hermes_walk2', animationKey: 'hermes_walk', damageBase: 12.0, damagePressure: 0.068, size: 60, displayWidth: 50, displayHeight: 70, bodySize: 78, bodyWidth: 50, bodyHeight: 76, jitter: 0.42, retargetBaseMs: 640, retargetPressureMs: 5.9, lungeMinMs: 680, lungeBaseMinMs: 1350, lungeBaseMaxMs: 2650, lungePressureMs: 8.1, pulseScale: 1.1, pulseMs: 480, color: 0xffd36e, defaultFlipX: true, strategies: ['sweeper', 'zigzag', 'cutoff'] },
  boss: { label: 'Mega-Corporate', textureKey: 'logo_tiktok', damageBase: 18.0, damagePressure: 0.08, size: 96, bodySize: 110, jitter: 0.2, retargetBaseMs: 500, retargetPressureMs: 3.0, lungeMinMs: 800, lungeBaseMinMs: 2000, lungeBaseMaxMs: 3500, lungePressureMs: 5.0, pulseScale: 1.3, pulseMs: 700, color: 0xff3333, strategies: ['cutoff', 'herder', 'ambusher'] },
};

function getProfile(type) {
  const p = CORPORATE_ENEMY_PROFILES[type];
  if (!p) {
    // Defensive fallback — if an enemy has no valid type, treat it as a basic youtube clone
    return CORPORATE_ENEMY_PROFILES.youtube;
  }
  return p;
}
function pickType(rng = Math.random) { return CORPORATE_ENEMY_TYPES[Math.floor(rng() * CORPORATE_ENEMY_TYPES.length)]; }
function pickStrategy(profile, rng = Math.random) { return profile.strategies[Math.floor(rng() * profile.strategies.length)]; }

const BACKDROP_PAD = 160;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.mode = data.mode || 'survival';
    this.dailySeed = data.dailySeed || null;
  }

  now() { return this.runTimeMs ?? 0; }
  getPressure() { return getPressure({ score: this.score, survivalTime: this.survivalTime }); }

  create() {
    window.__GTS_READY__ = 'game';
    window.__GTS_SCENE__ = this;

    this.progression = progression;
    this.skillEffects = this.progression.getSkillEffects();

    this.score = this.skillEffects.startScore;
    this.combo = 0;
    this.bestCombo = 0;
    this.chill = 76 + this.skillEffects.chillBonus;
    this.survivalTime = 0;
    this.runTimeMs = 0;
    this.clockInitialized = false;
    this.lastGrassTouchAt = null;
    this.lastMoveAngle = null;
    this.straightRunStartedAt = null;
    this.straightRunSeconds = 0;
    this.lastStep = 0;
    this.invulnerableUntil = Number.POSITIVE_INFINITY;
    this.breatheReadyAt = 0;
    this.breatheBaseCooldown = 8600;
    this.gameEnded = false;
    this.pointerTarget = null;
    this.nextWorldUpdateAt = 0;
    this.nextGrassMaintainAt = 0;
    this.nextThreatMaintainAt = 0;
    this.hydratingUntil = 0;
    this.nextHydrationPulseAt = 0;
    this.lastBottleSpawnAt = 0;
    this.playerSpeed = getPlayerSpeed({ score: this.score, survivalTime: 0 }) + this.skillEffects.speedBonus;
    this.chunks = new Map();

    // Wave system
    this.wave = 1;
    this.nextWaveAt = 30000;
    this.waveStartedAt = 0;
    this.bossActive = false;
    this.bossKills = 0;

    // Stats tracking
    this.runStats = {
      score: this.score, survivalTime: 0, bestCombo: 0, grassCollected: 0,
      enemiesDestroyed: 0, powerupsCollected: 0, powerupTypes: [],
      rareCollected: 0, epicCollected: 0, legendaryCollected: 0,
      hydrated: false, breathesUsed: 0, waveReached: 1, bossesDefeated: 0,
      longestNoDamage: 0, lastDamageAt: 0,
    };

    this.physics.world.setBounds(-100000000, -100000000, 200000000, 200000000);

    this.audio = new AudioManager(this);
    this.fx = new Effects(this);
    this.powerups = new PowerUpManager(this);

    this.createInfiniteBackdrop();

    this.player = this.physics.add.sprite(0, 0, 'player_stand')
      .setScale(0.62)
      .setDepth(90)
      .setCollideWorldBounds(false);
    this.player.body.setSize(38, 78).setOffset(21, 28);

    this.cameras.main.setBackgroundColor(0x122414);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);
    this.cameras.main.setDeadzone(80, 60);

    this.grass = this.physics.add.group({ allowGravity: false, immovable: true });
    this.corporateEnemies = this.physics.add.group({ allowGravity: false });
    this.waterBottles = this.physics.add.group({ allowGravity: false, immovable: true });

    this.updateWorldChunks(true);
    for (let i = 0; i < 9; i++) this.spawnCorporateEnemy();

    this.physics.add.overlap(this.player, this.grass, (_, tuft) => this.collectGrass(tuft));
    this.physics.add.overlap(this.player, this.corporateEnemies, (_, hazard) => this.takeDamage(hazard));
    this.physics.add.overlap(this.player, this.waterBottles, (_, bottle) => this.collectWaterBottle(bottle));
    this.physics.add.overlap(this.player, this.powerups.group, (_, pu) => this.collectPowerUp(pu));

    this.keys = this.input.keyboard.addKeys('W,A,S,D,Z,Q,SHIFT,R,SPACE');
    this.ctrlKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.movementKeysDown = { up: new Set(), down: new Set(), left: new Set(), right: new Set() };
    this.input.keyboard.on('keydown', this.handleMovementKeyDown, this);
    this.input.keyboard.on('keyup', this.handleMovementKeyUp, this);
    this.input.on('pointerdown', (pointer) => {
      if (this.gameEnded) return;
      const worldPoint = pointer.positionToCamera(this.cameras.main);
      this.pointerTarget = new Phaser.Math.Vector2(worldPoint.x, worldPoint.y);
      this.fx.floatText(worldPoint.x, worldPoint.y - 30, 'going outside...', '#f7f0bb', 16);
    });

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
      this.input.keyboard.off('keydown', this.handleMovementKeyDown, this);
      this.input.keyboard.off('keyup', this.handleMovementKeyUp, this);
      if (window.__GTS_SCENE__ === this) window.__GTS_SCENE__ = null;
    });

    this.hud = new HUD(this);
    this.fx.floatText(this.player.x, this.player.y - 80, 'INFINITE GRASS. INFINITE CONSEQUENCES.', '#fff2a8', 18);

    // Wave announcement
    this.announceWave(1);
  }

  createInfiniteBackdrop() {
    const cw = this.scale.width;
    const ch = this.scale.height;
    this.backdropLayers = [
      this.add.tileSprite(-BACKDROP_PAD, -BACKDROP_PAD, cw + BACKDROP_PAD * 2, ch + BACKDROP_PAD * 2, 'grass0').setOrigin(0).setScrollFactor(0).setDepth(-80).setData('scrollScale', 1),
      this.add.tileSprite(-BACKDROP_PAD, -BACKDROP_PAD, cw + BACKDROP_PAD * 2, ch + BACKDROP_PAD * 2, 'grass1').setOrigin(0).setScrollFactor(0).setDepth(-79).setAlpha(0.18).setData('scrollScale', 1.05).setData('offsetX', 7).setData('offsetY', 11),
      this.add.tileSprite(-BACKDROP_PAD, -BACKDROP_PAD, cw + BACKDROP_PAD * 2, ch + BACKDROP_PAD * 2, 'grass2').setOrigin(0).setScrollFactor(0).setDepth(-78).setAlpha(0.12).setData('scrollScale', 0.94).setData('offsetX', 17).setData('offsetY', 3),
    ];
    this.resizeBackdrop();
  }

  scrollBackdrop() {
    if (!this.backdropLayers) return;
    const cam = this.cameras.main;
    this.backdropLayers.forEach((layer) => {
      const scale = layer.getData('scrollScale') ?? 1;
      const ox = layer.getData('offsetX') ?? 0;
      const oy = layer.getData('offsetY') ?? 0;
      layer.tilePositionX = cam.scrollX * scale + ox;
      layer.tilePositionY = cam.scrollY * scale + oy;
    });
  }

  resizeBackdrop(gs = this.scale) {
    if (!this.backdropLayers) return;
    const zoom = this.cameras?.main?.zoom || 1;
    const pad = BACKDROP_PAD;
    const layerW = (gs.width + pad * 2) / zoom + 8;
    const layerH = (gs.height + pad * 2) / zoom + 8;
    const layerX = -pad / zoom - 4;
    const layerY = -pad / zoom - 4;
    this.backdropLayers.forEach((layer) => layer.setPosition(layerX, layerY).setSize(layerW, layerH));
    this.scrollBackdrop();
  }

  handleResize(gs) {
    this.resizeBackdrop(gs);
    if (this.hud) this.hud.resize();
  }

  getMovementEventId(event) {
    return event?.code || String(event?.key || '').toLowerCase();
  }

  handleMovementKeyDown(event) {
    this.recordMovementKey(event, true);
  }

  handleMovementKeyUp(event) {
    this.recordMovementKey(event, false);
  }

  recordMovementKey(event, isDown) {
    if (!this.movementKeysDown) return;
    const dirs = getMovementDirectionsFromKeyboardEvent(event);
    if (dirs.length === 0) return;

    const id = this.getMovementEventId(event);
    dirs.forEach((dir) => {
      if (!this.movementKeysDown[dir]) return;
      if (isDown) this.movementKeysDown[dir].add(id);
      else this.movementKeysDown[dir].delete(id);
    });

    // Stop browser/OS scroll or focus movement for arrows/space-like movement keys.
    event?.preventDefault?.();
  }

  isMovementDown(dir) {
    if (this.movementKeysDown?.[dir]?.size > 0) return true;
    if (dir === 'left') return !!(this.keys?.A?.isDown || this.keys?.Q?.isDown);
    if (dir === 'right') return !!this.keys?.D?.isDown;
    if (dir === 'up') return !!(this.keys?.W?.isDown || this.keys?.Z?.isDown);
    if (dir === 'down') return !!this.keys?.S?.isDown;
    return false;
  }

  updateCameraZoom() {
    if (!this.cameras?.main) return;
    const speedProgress = clamp((this.playerSpeed - 225) / (560 - 225), 0, 1);
    const speedBoostBonus = this.powerups?.isActive('speed') ? 0.04 : 0;
    const targetZoom = clamp(1 - speedProgress * 0.18 - speedBoostBonus, 0.78, 1);
    const nextZoom = Phaser.Math.Linear(this.cameras.main.zoom || 1, targetZoom, 0.045);
    this.cameras.main.setZoom(nextZoom);
    this.resizeBackdrop();

    // The game camera zooms the world; counter-scale fixed HUD objects so UI stays readable.
    if (this.hud?.container) this.hud.container.setScale(1 / nextZoom);
  }

  createChunk(cx, cy) {
    const key = `${cx},${cy}`;
    if (this.chunks.has(key)) return;
    const rng = seededRng(chunkSeed(cx, cy));
    const x0 = cx * CHUNK_SIZE;
    const y0 = cy * CHUNK_SIZE;
    const objects = [];
    const decoKeys = ['flowers', 'grass1', 'grass2', 'path'];
    for (let i = 0; i < randInt(rng, 18, 32); i++) {
      const k = randPick(rng, decoKeys);
      const img = this.add.image(x0 + randFloat(rng, 20, CHUNK_SIZE - 20), y0 + randFloat(rng, 20, CHUNK_SIZE - 20), k)
        .setDepth(randInt(rng, -45, 8))
        .setScale(k === 'path' ? randFloat(rng, 1.35, 2.7) : randFloat(rng, 1.0, 2.25))
        .setAlpha(k === 'path' ? randFloat(rng, 0.18, 0.42) : randFloat(rng, 0.22, 0.86))
        .setAngle(randInt(rng, 0, 3) * 90);
      objects.push(img);
    }
    for (let i = 0; i < randInt(rng, 3, 8); i++) {
      const tree = this.add.image(x0 + randFloat(rng, 45, CHUNK_SIZE - 45), y0 + randFloat(rng, 45, CHUNK_SIZE - 45), randPick(rng, ['tree0', 'tree1', 'tree2']))
        .setDepth(42)
        .setScale(randFloat(rng, 2.2, 3.8))
        .setAlpha(randFloat(rng, 0.82, 1))
        .setAngle(randInt(rng, -2, 2));
      objects.push(tree);
    }
    const grassCount = getChunkGrassCount(rng);
    const grassKeys = ['tuft_0', 'tuft_1', 'tuft_2', 'tuft_3'];
    for (let i = 0; i < grassCount; i++) {
      const tuft = this.createTuft(x0 + randFloat(rng, 30, CHUNK_SIZE - 30), y0 + randFloat(rng, 30, CHUNK_SIZE - 30), rng);
      objects.push(tuft);
    }
    this.chunks.set(key, { cx, cy, objects });
  }

  createTuft(x, y, rng = Math.random) {
    const rarityId = pickRarity(rng);
    const rarity = RARITY[rarityId];
    const key = randPick(rng, ['tuft_0', 'tuft_1', 'tuft_2', 'tuft_3']);
    const expanding = isExpandingGrassRarity(rarity);
    const baseScale = randFloat(rng, 0.045, 0.065);
    const visualScale = expanding ? baseScale * rarity.pulse * 1.55 : baseScale;
    const tuft = this.physics.add.image(x, y, key)
      .setScale(visualScale)
      .setTint(rarity.tint)
      .setDepth(45)
      .setAlpha(0.96);
    tuft.body.setAllowGravity(false);
    tuft.setData('picked', false);
    tuft.setData('rarity', rarityId);
    tuft.setData('expandingGrass', expanding);
    this.refreshGrassBody(tuft);

    if (expanding) {
      this.tweens.add({
        targets: tuft,
        scaleX: visualScale * rarity.pulse,
        scaleY: visualScale * rarity.pulse,
        alpha: 0.88,
        duration: 820,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
        onUpdate: () => this.refreshGrassBody(tuft),
      });
    }

    this.grass.add(tuft);
    this.tweens.add({ targets: tuft, angle: randInt(rng, -7, 7), duration: randInt(rng, 900, 1300), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return tuft;
  }

  refreshGrassBody(tuft) {
    if (!tuft?.body) return;
    const rarityId = tuft.getData?.('rarity') || 'common';
    const rarity = RARITY[rarityId] || RARITY.common;

    const sx = Math.max(0.001, Math.abs(tuft.scaleX));
    const sy = Math.max(0.001, Math.abs(tuft.scaleY));

    // Visual size = textureSize * scale. Texture is 1024x1024.
    // Make physics body track the visible grass closely. Common grass is slightly strict;
    // rarer/larger grass keeps a small forgiveness buffer without allowing off-grass grabs.
    const mult = this.getGrassHitboxMultiplier(rarityId);

    const visualW = 1024 * sx;
    const visualH = 1024 * sy;
    const bodyW = visualW * mult;
    const bodyH = visualH * mult;
    this.refreshFixedBody(tuft, bodyW, bodyH);
  }

  getGrassHitboxMultiplier(rarityId = 'common') {
    return rarityId === 'legendary' ? 1.65
      : rarityId === 'epic' ? 1.35
      : rarityId === 'rare' ? 1.18
      : 0.92;
  }

  refreshFixedBody(sprite, bodyW, bodyH) {
    if (!sprite?.body) return;
    const sx = Math.max(0.001, Math.abs(sprite.scaleX));
    const sy = Math.max(0.001, Math.abs(sprite.scaleY));

    // Phaser 3.90: width = sourceWidth * scaleX. Set source size to preserve the desired world hitbox.
    sprite.body.sourceWidth = bodyW / sx;
    sprite.body.sourceHeight = bodyH / sy;

    // Force current dimensions immediately.
    sprite.body.width = bodyW;
    sprite.body.height = bodyH;
    sprite.body.halfWidth = bodyW * 0.5;
    sprite.body.halfHeight = bodyH * 0.5;

    // Center body on sprite: offset = displayOrigin - halfWidth/scale
    sprite.body.offset.x = sprite.displayOriginX - sprite.body.halfWidth / sx;
    sprite.body.offset.y = sprite.displayOriginY - sprite.body.halfHeight / sy;

    // Keep the body centered immediately, not only after the next Arcade preUpdate.
    sprite.body.position.x = sprite.x - sprite.body.halfWidth;
    sprite.body.position.y = sprite.y - sprite.body.halfHeight;
    sprite.body.updateCenter();
  }

  destroyGrassTuft(tuft) {
    if (!tuft) return;
    if (tuft.active) tuft.destroy();
  }

  updateWorldChunks(force = false) {
    if (!force && this.now() < this.nextWorldUpdateAt) return;
    this.nextWorldUpdateAt = this.now() + 450;
    const pcx = Math.floor(this.player.x / CHUNK_SIZE);
    const pcy = Math.floor(this.player.y / CHUNK_SIZE);
    for (let dx = -CHUNK_RADIUS; dx <= CHUNK_RADIUS; dx++) {
      for (let dy = -CHUNK_RADIUS; dy <= CHUNK_RADIUS; dy++) {
        this.createChunk(pcx + dx, pcy + dy);
      }
    }
    this.chunks.forEach((chunk, key) => {
      if (Math.abs(chunk.cx - pcx) > CHUNK_CULL_RADIUS || Math.abs(chunk.cy - pcy) > CHUNK_CULL_RADIUS) {
        chunk.objects.forEach((obj) => {
          if (obj?.getData?.('rarity') !== undefined) this.destroyGrassTuft(obj);
          else obj?.destroy?.();
        });
        this.chunks.delete(key);
      }
    });
  }

  // ── Spawning ──

  randomPointAroundPlayer(min = 420, max = 1200) {
    const cx = this.player?.x ?? 0;
    const cy = this.player?.y ?? 0;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radius = Math.sqrt(Phaser.Math.FloatBetween(min * min, max * max));
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  }

  randomGrassPointAroundPlayer(min = 130, max = 980) {
    const avoidAngle = typeof this.lastMoveAngle === 'number' && this.straightRunSeconds > 1.8 ? this.lastMoveAngle : null;
    let fallback = null;
    for (let i = 0; i < 8; i++) {
      const p = this.randomPointAroundPlayer(min, max);
      fallback = fallback ?? p;
      if (avoidAngle == null || !this.player) return p;
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, p.x, p.y);
      const delta = Math.abs(Phaser.Math.Angle.Wrap(angle - avoidAngle));
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
      if (!(delta < 0.30 && dist > max * 0.65)) return p;
    }
    return fallback ?? this.randomPointAroundPlayer(min, max);
  }

  randomSpawnPointNearEdge(extraMin = 0) {
    const cam = this.cameras.main;
    const min = Math.max(430 + extraMin, Math.max(cam.width, cam.height) * 0.58);
    const max = min + 560;
    return this.randomPointAroundPlayer(min, max);
  }

  spawnGrass(count = 1, minDistance = 130, maxDistance = 980) {
    const room = Math.max(0, MAX_GRASS - this.grass.getLength());
    const toSpawn = Math.min(count, room);
    for (let i = 0; i < toSpawn; i++) {
      const { x, y } = this.randomGrassPointAroundPlayer(minDistance, maxDistance);
      this.createTuft(x, y);
    }
  }

  spawnCorporateEnemy(type = pickType(Math.random)) {
    if (this.corporateEnemies.getLength() >= 150) return;
    const profile = getProfile(type);
    const { x, y } = this.randomSpawnPointNearEdge(type === 'youtube' ? 90 : 45);
    const pressure = getPressure({ score: this.score, survivalTime: this.survivalTime });
    const displaySize = profile.size + Math.min(9, pressure / 85);
    const dw = (profile.displayWidth ?? profile.size) + Math.min(9, pressure / 85);
    const dh = (profile.displayHeight ?? profile.size) + Math.min(9, pressure / 85);
    const enemy = profile.animationKey
      ? this.physics.add.sprite(x, y, profile.textureKey)
      : this.physics.add.image(x, y, profile.textureKey);
    enemy.setDisplaySize(dw || displaySize, dh || displaySize).setDepth(95).setAlpha(0.98);
    if (profile.defaultFlipX !== undefined) enemy.setFlipX(profile.defaultFlipX);
    if (profile.animationKey) {
      enemy.play(profile.animationKey);
      enemy.anims.timeScale = profile.animationTimeScale ?? 1;
    }
    enemy.body.setAllowGravity(false);
    const enemyBodyW = profile.bodyWidth ?? profile.bodySize;
    const enemyBodyH = profile.bodyHeight ?? profile.bodySize;
    this.refreshFixedBody(enemy, enemyBodyW, enemyBodyH);
    enemy.setData('type', type);
    enemy.setData('label', profile.label);
    enemy.setData('strategy', pickStrategy(profile, Math.random));
    enemy.setData('side', Phaser.Math.RND.pick([-1, 1]));
    enemy.setData('phase', Phaser.Math.FloatBetween(0, Math.PI * 2));
    enemy.setData('orbitRadius', Phaser.Math.Between(185, 365));
    enemy.setData('nextStrategyAt', this.now() + Phaser.Math.Between(8000, 17000));
    enemy.setData('retargetAt', 0);
    enemy.setData('lungeAt', this.now() + Phaser.Math.Between(profile.lungeBaseMinMs, profile.lungeBaseMaxMs));
    enemy.setData('lungeUntil', 0);
    enemy.setData('repelledUntil', 0);
    enemy.setData('moveAngle', Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y));
    enemy.setData('idleMoveAngle', null);
    enemy.setData('idleMoveAngleRefreshAt', 0);
    this.aimHazardAtPlayer(enemy, this.getThreatSpeed(), profile.jitter);
    this.corporateEnemies.add(enemy);
    this.tweens.add({
      targets: enemy,
      angle: Phaser.Math.Between(-9, 9),
      scaleX: enemy.scaleX * profile.pulseScale,
      scaleY: enemy.scaleY * profile.pulseScale,
      duration: profile.pulseMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      onUpdate: () => this.refreshFixedBody(enemy, enemyBodyW, enemyBodyH),
    });
  }

  spawnWaterBottle() {
    if (this.waterBottles.getLength() >= MAX_BOTTLES) return;
    const { x, y } = this.randomSpawnPointNearEdge(60);
    const bottle = this.physics.add.image(x, y, 'water_bottle').setDisplaySize(36, 48).setDepth(85).setAlpha(0.92);
    bottle.body.setAllowGravity(false);
    const bottleBodyW = 44;
    const bottleBodyH = 56;
    this.refreshFixedBody(bottle, bottleBodyW, bottleBodyH);

    bottle.setData('beacon', this.createBottleBeacon(x, y));

    this.waterBottles.add(bottle);
    const bottleBaseScaleX = bottle.scaleX;
    const bottleBaseScaleY = bottle.scaleY;
    this.tweens.add({
      targets: bottle,
      angle: 12,
      scaleX: bottleBaseScaleX * 1.08,
      scaleY: bottleBaseScaleY * 1.08,
      duration: 640,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      onUpdate: () => this.refreshFixedBody(bottle, bottleBodyW, bottleBodyH),
    });
  }

  createBottleBeacon(x, y) {
    // Keep the marker centered on the actual bottle. The old detached blue halo looked
    // like random empty circles when emoji/text fallback failed on some systems.
    const halo = this.add.circle(0, 0, 34, 0x4dc9f6, 0.08).setStrokeStyle(3, 0x4dc9f6, 0.82);
    const icon = this.add.image(0, 0, 'water_bottle').setDisplaySize(24, 32).setAlpha(0.92);
    const label = this.add.text(0, -46, 'WATER', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '13px',
      fontStyle: '900',
      color: '#dff8ff',
      stroke: '#071008',
      strokeThickness: 4,
    }).setOrigin(0.5);
    const beacon = this.add.container(x, y, [halo, icon, label]).setDepth(84).setAlpha(0.96);
    this.tweens.add({
      targets: beacon,
      scale: 1.06,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.tweens.add({
      targets: halo,
      scale: 1.22,
      alpha: 0.28,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    return beacon;
  }

  destroyBottle(bottle) {
    if (!bottle) return;
    const beacon = bottle.getData?.('beacon');
    if (beacon?.active) beacon.destroy(true);
    if (bottle.active) bottle.destroy();
  }

  spawnBoss() {
    if (this.bossActive) return;
    this.bossActive = true;
    const { x, y } = this.randomSpawnPointNearEdge(100);
    const boss = this.physics.add.sprite(x, y, 'logo_tiktok').setDisplaySize(96, 96).setDepth(98).setAlpha(1);
    boss.body.setAllowGravity(false);
    const bossBodyW = 110;
    const bossBodyH = 110;
    this.refreshFixedBody(boss, bossBodyW, bossBodyH);
    boss.setData('isBoss', true);
    boss.setData('type', 'boss');
    boss.setData('hp', 5 + Math.floor(this.wave / 2));
    boss.setData('label', 'Mega-Corporate');
    boss.setData('strategy', 'chase');
    boss.setData('repelledUntil', 0);
    boss.setData('moveAngle', Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y));
    this.corporateEnemies.add(boss);
    const bossBaseScaleX = boss.scaleX;
    const bossBaseScaleY = boss.scaleY;
    this.tweens.add({
      targets: boss,
      scaleX: bossBaseScaleX * 1.25,
      scaleY: bossBaseScaleY * 1.25,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      onUpdate: () => this.refreshFixedBody(boss, bossBodyW, bossBodyH),
    });
    this.fx.floatText(this.player.x, this.player.y - 120, `WAVE ${this.wave} BOSS INCOMING`, '#ff7f6e', 26);
    this.audio.playBossAlert();
  }

  // ── Collection ──

  collectGrass(tuft) {
    if (!tuft.active || tuft.getData('picked') || this.gameEnded) return;
    tuft.setData('picked', true);

    const rarityId = tuft.getData('rarity') || 'common';
    const rarity = RARITY[rarityId];

    // Magnet check
    if (this.powerups.isActive('magnet')) {
      // Already pulled, collect normally
    }

    let points = rarity.score;
    if (this.powerups.isActive('multiplier')) points *= 2;
    points = Math.floor(points * this.skillEffects.scoreMultiplier);

    this.score += points;
    this.lastGrassTouchAt = this.now();
    this.combo = Math.min(this.combo + 1, 99);
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.chill = Math.min(100, this.chill + rarity.chill + Math.min(8, this.combo * 0.45));

    this.runStats.grassCollected += 1;
    if (rarityId === 'rare') this.runStats.rareCollected += 1;
    if (rarityId === 'epic') this.runStats.epicCollected += 1;
    if (rarityId === 'legendary') this.runStats.legendaryCollected += 1;

    // SFX
    if (rarityId === 'legendary') this.audio.playLegendary();
    else this.audio.playTouch(Phaser.Math.Between(-200, 250));

    const msg = rarityId === 'common' ? Phaser.Math.RND.pick(MEMES) : `${rarity.label.toUpperCase()} GRASS!`;
    this.fx.floatText(tuft.x, tuft.y - 38, `${msg}\n+${points}  combo x${this.combo}`, rarityId === 'common' ? '#fff2a8' : `#${rarity.color.toString(16).padStart(6, '0')}`, 16 + Math.min(this.combo, 10));
    this.fx.screenFlash(80, rarity.color >> 16, (rarity.color >> 8) & 0xff, rarity.color & 0xff);
    this.fx.burst(tuft.x, tuft.y, rarity.color, 8 + Math.min(12, this.combo));

    this.tweens.add({
      targets: tuft, scale: 0, alpha: 0, angle: tuft.angle + 80, duration: 180, ease: 'Back.in',
      onComplete: () => this.destroyGrassTuft(tuft),
    });

    // Legendary AOE heal / destroy
    if (rarityId === 'legendary') {
      this.fx.shockwave(tuft.x, tuft.y, 300, rarity.color);
      this.corporateEnemies.getChildren().slice().forEach((e) => {
        if (!e.active || e.getData?.('destroying') || !e.body) return;
        const d = Phaser.Math.Distance.Between(e.x, e.y, tuft.x, tuft.y);
        if (d < 300) this.destroyEnemy(e, 'COSMIC ERASURE');
      });
    }

    const pressure = getPressure({ score: this.score, survivalTime: this.survivalTime });
    this.spawnGrass(getPostCollectGrassSpawnCount(pressure, Math.random), 200, 1900);

    // Score milestones spawn enemies
    if (this.score % 4 === 0) this.spawnCorporateEnemy();
    if (this.score % 5 === 0) this.spawnCorporateEnemy();
    if (this.score % 12 === 0) {
      this.spawnCorporateEnemy();
      this.spawnCorporateEnemy();
      this.fx.floatText(this.player.x, this.player.y - 110, 'THE BRAND SWARM ESCALATES', '#ffb38f', 22);
    }
    if (this.score % 100 === 0 && this.score > 0) {
      this.spawnBoss();
    }
  }

  collectWaterBottle(bottle) {
    if (!bottle.active || bottle.getData('picked') || this.gameEnded) return;
    bottle.setData('picked', true);
    this.hydratingUntil = this.now() + HYDRATION_DURATION_MS;
    this.nextHydrationPulseAt = this.now();
    this.invulnerableUntil = Math.max(this.invulnerableUntil, this.now() + 900);
    this.chill = 100;
    this.combo = Math.min(99, this.combo + 2);
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.runStats.hydrated = true;
    this.audio.playPowerUp();
    // Drinking sound — low pitch gulp
    this.sound.play('touch', { volume: 0.35, detune: -600 });
    this.fx.floatText(this.player.x, this.player.y - 60, 'HYDRATING!', '#4dc9f6', 26);
    this.fx.screenFlash(120, 77, 201, 246);
    this.fx.shockwave(this.player.x, this.player.y, 360, 0x4dc9f6);
    this.pulseHydrationAura(true);
    this.player.setTint(0x7ad8ff);
    this.tweens.add({
      targets: bottle, scaleX: 0, scaleY: 0, alpha: 0, angle: bottle.angle + 120, duration: 220, ease: 'Back.in',
      onComplete: () => this.destroyBottle(bottle),
    });
  }

  pulseHydrationAura(force = false) {
    if (this.gameEnded || this.now() >= this.hydratingUntil) return;
    const now = this.now();
    if (!force && now < this.nextHydrationPulseAt) return;
    this.nextHydrationPulseAt = now + 160;

    const killRadius = 230;
    const repelRadius = 560;
    this.corporateEnemies.getChildren().slice().forEach((hazard) => {
      if (!hazard?.active || hazard.getData?.('destroying') || !hazard.body) return;
      const d = Phaser.Math.Distance.Between(hazard.x, hazard.y, this.player.x, this.player.y);
      if (d <= killRadius) {
        this.destroyEnemy(hazard, 'HYDRATED!');
      } else if (d <= repelRadius) {
        const falloff = 1 - ((d - killRadius) / Math.max(1, repelRadius - killRadius)) * 0.45;
        this.repelHazard(hazard, 560 * falloff, 560);
      }
    });
  }

  collectPowerUp(pu) {
    if (!pu.active || pu.getData('picked') || this.gameEnded) return;
    pu.setData('picked', true);
    const id = pu.getData('powerupId');
    const label = pu.getData('label');
    const color = pu.getData('color');
    this.powerups.activate(id);
    this.runStats.powerupsCollected += 1;
    if (!this.runStats.powerupTypes.includes(id)) this.runStats.powerupTypes.push(id);
    this.audio.playPowerUp();
    this.fx.floatText(this.player.x, this.player.y - 70, `${label.toUpperCase()}!`, `#${color.toString(16).padStart(6, '0')}`, 22);
    this.fx.burst(pu.x, pu.y, color, 12);

    if (id === 'speed') {
      this.player.setTint(0xff7f6e);
    }
    if (id === 'timewarp') {
      this.time.timeScale = 0.5;
    }
    if (id === 'bomb') {
      this.fx.shockwave(this.player.x, this.player.y, 400, 0xff3333);
      this.corporateEnemies.getChildren().slice().forEach((e) => {
        if (!e.active || e.getData?.('destroying') || !e.body) return;
        const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
        if (d < 400) this.destroyEnemy(e, 'PIXEL BOMBED');
      });
    }

    const ring = pu.getData('ring');
    if (ring?.active) this.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 180, ease: 'Cubic.out' });
    const badge = pu.getData('badge');
    if (badge?.active) this.tweens.add({ targets: badge, scale: 0, alpha: 0, duration: 180, ease: 'Back.in' });
    this.tweens.add({
      targets: pu,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 180,
      ease: 'Back.in',
      onComplete: () => this.powerups.destroyCollectible(pu),
    });
  }

  // ── Damage ──

  takeDamage(hazard) {
    if (this.gameEnded || hazard?.getData?.('destroying')) return;

    if (this.now() < this.hydratingUntil) {
      if (hazard?.body) this.destroyEnemy(hazard, 'HYDRATED!');
      return;
    }

    // Shield absorbs one hit
    if (this.powerups.isActive('shield')) {
      this.powerups.active.delete('shield');
      this.fx.floatText(this.player.x, this.player.y - 70, 'SHIELD BROKEN', '#ffd36e', 22);
      this.fx.shockwave(this.player.x, this.player.y, 150, 0xffd36e);
      if (hazard?.body) this.repelHazard(hazard, 500, 600);
      return;
    }

    if (this.now() < this.invulnerableUntil) {
      this.repelHazard(hazard, 340, 520);
      return;
    }

    const pressure = getPressure({ score: this.score, survivalTime: this.survivalTime });
    const profile = getProfile(hazard?.getData('type') ?? 'youtube');
    this.invulnerableUntil = this.now() + Math.max(560, 940 - pressure * 4.2);
    this.combo = 0;
    const damage = profile.damageBase + pressure * profile.damagePressure;
    this.chill = Math.max(0, this.chill - damage);
    this.audio.playNotification();
    this.player.setTexture('player_hurt').setTint(0xffb5a8);
    this.fx.screenShake(170, 0.008 + Math.min(0.012, pressure / 15000));
    this.fx.floatText(this.player.x, this.player.y - 90, `${profile.label.toUpperCase()} ${Phaser.Math.RND.pick(HAZARD_MEMES)}`, '#ffb38f', 21);
    if (hazard?.body) this.repelHazard(hazard, 285 + pressure * 0.85, 360);
    this.time.delayedCall(170, () => this.player.clearTint());
    if (this.chill <= 0) this.endGame(false, 'THE BRAND NOTIFICATION SWARM FINALLY DRAGGED YOU BACK INSIDE');

    // Update no-damage tracking
    const timeSinceDamage = (this.now() - this.runStats.lastDamageAt) / 1000;
    if (this.runStats.lastDamageAt > 0) {
      this.runStats.longestNoDamage = Math.max(this.runStats.longestNoDamage, timeSinceDamage);
    }
    this.runStats.lastDamageAt = this.now();
  }

  destroyEnemy(enemy, reason) {
    if (!enemy?.active || enemy.getData?.('destroying')) return;
    enemy.setData('destroying', true);
    const wasBoss = !!enemy.getData('isBoss');
    const burstScaleX = enemy.scaleX * 1.8;
    const burstScaleY = enemy.scaleY * 1.8;

    // Disable the Arcade body immediately. Otherwise killed enemies keep overlapping
    // during their death tween and can create the post-hydration swarm/death bug.
    if (enemy.body) {
      enemy.body.stop();
      enemy.body.enable = false;
    }
    this.corporateEnemies.remove(enemy);
    enemy.setActive(false);

    this.runStats.enemiesDestroyed += 1;
    this.fx.floatText(enemy.x, enemy.y - 30, reason, '#4dc9f6', 18);
    this.fx.screenShake(80, 0.004);
    this.fx.burst(enemy.x, enemy.y, 0x4dc9f6, 10);
    this.tweens.add({
      targets: enemy, scaleX: burstScaleX, scaleY: burstScaleY, alpha: 0, angle: enemy.angle + Phaser.Math.Between(-90, 90),
      duration: 250, ease: 'Cubic.out', onComplete: () => enemy.destroy(),
    });
    if (wasBoss) {
      this.bossActive = false;
      this.runStats.bossesDefeated += 1;
      this.bossKills += 1;
      this.fx.floatText(this.player.x, this.player.y - 130, 'BOSS DEFEATED!', '#ffd36e', 30);
      this.chill = Math.min(100, this.chill + 25);
      this.score += 20;
    }
  }

  // ── Breathe ──

  deepBreath() {
    if (this.gameEnded || this.now() < this.breatheReadyAt) return;
    const pressure = getPressure({ score: this.score, survivalTime: this.survivalTime });
    const cdReduction = this.skillEffects.breatheCooldownReduction;
    this.breatheReadyAt = this.now() + Math.max(4500, this.breatheBaseCooldown - pressure * 6) * (1 - cdReduction);
    this.invulnerableUntil = Math.max(this.invulnerableUntil, this.now() + 320);
    this.chill = Math.min(100, this.chill + 8);
    this.combo = Math.min(99, this.combo + 1);
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.runStats.breathesUsed += 1;
    this.fx.floatText(this.player.x, this.player.y - 92, 'INHALE... EXHALE...\nSMALL OPENING', '#b9f28e', 20);
    this.fx.shockwave(this.player.x, this.player.y, BREATHE_OUTER_RADIUS, 0xb9f28e);
    this.corporateEnemies.getChildren().slice().forEach((hazard) => {
      if (!hazard.body || hazard.getData?.('destroying')) return;
      const dist = Phaser.Math.Distance.Between(hazard.x, hazard.y, this.player.x, this.player.y);
      if (dist > BREATHE_OUTER_RADIUS) return;
      const falloff = dist <= BREATHE_CORE_RADIUS ? 1 : 1 - ((dist - BREATHE_CORE_RADIUS) / (BREATHE_OUTER_RADIUS - BREATHE_CORE_RADIUS)) * 0.75;
      this.repelHazard(hazard, BREATHE_FORCE * falloff, BREATHE_REPEL_MS);
    });
  }

  // ── Wave system ──

  announceWave(n) {
    const name = WAVE_NAMES[Math.min(n - 1, WAVE_NAMES.length - 1)] || `Wave ${n}`;
    this.fx.floatText(this.player.x, this.player.y - 140, `WAVE ${n}: ${name.toUpperCase()}`, '#fff2a8', 24);
    this.audio.playWaveStart();
  }

  updateWave(time) {
    if (time >= this.nextWaveAt) {
      this.wave += 1;
      this.runStats.waveReached = Math.max(this.runStats.waveReached, this.wave);
      this.nextWaveAt = time + Math.max(20000, 30000 - this.wave * 800);
      this.announceWave(this.wave);
      // Spawn extra enemies for new wave
      const extra = getWaveEnemyBurstCount(this.wave);
      for (let i = 0; i < extra; i++) this.spawnCorporateEnemy();
      if (this.wave % 3 === 0) this.spawnBoss();
    }
  }

  // ── Hazards ──

  capThreatSpeed(speed, ratio = 0.94) {
    return Math.min(speed, Math.max(90, this.playerSpeed * ratio));
  }

  getThreatSpeed() {
    const pressure = getPressure({ score: this.score, survivalTime: this.survivalTime });
    const ratio = Math.min(0.972, 0.905 + pressure * 0.0023);
    return this.capThreatSpeed(215 + pressure * 4.45, ratio);
  }

  aimHazardAtPlayer(hazard, speed, jitter = 0) {
    if (!hazard?.body || !this.player) return;
    const target = Phaser.Math.Angle.Between(hazard.x, hazard.y, this.player.x, this.player.y) + Phaser.Math.FloatBetween(-jitter, jitter);
    hazard.body.setVelocity(Math.cos(target) * speed, Math.sin(target) * speed);
  }

  repelHazard(hazard, force = 320, duration = 420) {
    if (!hazard?.body) return;
    const dx = hazard.x - this.player.x;
    const dy = hazard.y - this.player.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    hazard.setData('repelledUntil', this.now() + duration);
    hazard.setData('retargetAt', this.now() + duration + 120);
    hazard.setData('lungeUntil', 0);
    hazard.body.setVelocity((dx / len) * force, (dy / len) * force);
  }

  updateHazards(time) {
    const pressure = getPressure({ score: this.score, survivalTime: this.survivalTime });
    const threatSpeed = this.getThreatSpeed();
    const timeScale = this.powerups.isActive('timewarp') ? 0.5 : 1;

    this.corporateEnemies.getChildren().forEach((enemy) => {
      if (!enemy.body || enemy.getData?.('destroying')) return;
      const d = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      if (d > 3500) { enemy.destroy(); return; }
      if (time < (enemy.getData('repelledUntil') ?? 0)) return;

      const profile = getProfile(enemy.getData('type'));
      // Strategy rotation
      if (time > (enemy.getData('nextStrategyAt') ?? 0)) {
        enemy.setData('strategy', pickStrategy(profile, Math.random));
        enemy.setData('side', Phaser.Math.RND.pick([-1, 1]));
        enemy.setData('phase', Phaser.Math.FloatBetween(0, Math.PI * 2));
        enemy.setData('nextStrategyAt', time + Phaser.Math.Between(9000, 18000));
      }
      if (time > (enemy.getData('lungeAt') ?? 0)) {
        enemy.setData('lungeAt', time + Math.max(profile.lungeMinMs, Phaser.Math.Between(profile.lungeBaseMinMs, profile.lungeBaseMaxMs) - pressure * profile.lungePressureMs));
        enemy.setData('lungeUntil', time + Math.min(520, 220 + pressure * 4.5));
        enemy.setData('retargetAt', 0);
      }
      const lunging = time < (enemy.getData('lungeUntil') ?? 0);
      if (lunging) {
        enemy.setData('targetX', this.player.x);
        enemy.setData('targetY', this.player.y);
      } else if (time > (enemy.getData('retargetAt') ?? 0)) {
        const interval = Math.max(240, profile.retargetBaseMs - pressure * profile.retargetPressureMs);
        enemy.setData('retargetAt', time + interval);
        const target = this.getThreatTarget(enemy, profile, time);
        enemy.setData('targetX', target.x);
        enemy.setData('targetY', target.y);
      }
      const tx = enemy.getData('targetX') ?? this.player.x;
      const ty = enemy.getData('targetY') ?? this.player.y;
      this.moveHazardToward(enemy, { x: tx, y: ty }, threatSpeed * timeScale);
      if (profile.animationKey) {
        enemy.setFlipX(enemy.body.velocity.x >= 0);
        enemy.anims.timeScale = Math.min(2.8, 1 + pressure / 62);
      }
    });
  }

  moveHazardToward(hazard, target, speed) {
    if (!hazard?.body) return;
    const dx = target.x - hazard.x;
    const dy = target.y - hazard.y;
    const targetDist = Math.max(1, Math.hypot(dx, dy));
    let rawAngle = Math.atan2(dy, dx);
    const playerDist = this.player ? Phaser.Math.Distance.Between(hazard.x, hazard.y, this.player.x, this.player.y) : targetDist;
    if (targetDist < 58 && playerDist > 92 && this.player) {
      rawAngle = Phaser.Math.Angle.Between(hazard.x, hazard.y, this.player.x, this.player.y);
    }
    const previous = hazard.getData('moveAngle');
    const angle = typeof previous === 'number' ? Phaser.Math.Angle.RotateTo(previous, rawAngle, 0.16) : rawAngle;
    hazard.setData('moveAngle', angle);
    hazard.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  getThreatTarget(hazard, profile, time) {
    const pressure = getPressure({ score: this.score, survivalTime: this.survivalTime });
    const strategy = hazard.getData('strategy') ?? profile.strategies[0];
    const phase = hazard.getData('phase') ?? 0;
    const side = hazard.getData('side') ?? 1;
    const px = this.player.x;
    const py = this.player.y;
    const fx = Math.cos(this.lastMoveAngle ?? 0);
    const fy = Math.sin(this.lastMoveAngle ?? 0);
    const sx = -fy * side;
    const sy = fx * side;
    const leadDist = Math.min(600, this.playerSpeed * 1.2);
    const lead = { x: px + fx * leadDist, y: py + fy * leadDist };
    const sideOffset = 160 + Math.min(185, pressure * 1.65);
    const wiggle = Math.sin(time / 720 + phase) * 0.5;

    switch (strategy) {
      case 'sweeper': return { x: lead.x + sx * sideOffset * 0.8, y: lead.y + sy * sideOffset * 0.8 };
      case 'zigzag': return { x: lead.x + sx * Math.sin(time / 260 + phase) * sideOffset, y: lead.y + sy * Math.sin(time / 260 + phase) * sideOffset };
      case 'cutoff': return { x: lead.x + fx * 120 + sx * wiggle * 90, y: lead.y + fy * 120 + sy * wiggle * 90 };
      case 'orbiter': {
        const orbit = hazard.getData('orbitRadius') ?? 260;
        const angle = time / 920 + phase;
        return { x: px + Math.cos(angle) * orbit, y: py + Math.sin(angle) * orbit };
      }
      case 'flanker': return { x: lead.x + sx * sideOffset * 1.1, y: lead.y + sy * sideOffset * 1.1 };
      case 'pack': {
        const packAngle = phase + time / 1100;
        const radius = 145 + Math.min(140, pressure * 1.25);
        return { x: px + Math.cos(packAngle) * radius + sx * wiggle * 110, y: py + Math.sin(packAngle) * radius + sy * wiggle * 110 };
      }
      case 'predictor': return { x: lead.x + fx * 135 + sx * wiggle * 45, y: lead.y + fy * 135 + sy * wiggle * 45 };
      case 'mirror': return { x: px + fx * leadDist - sx * sideOffset * 0.8, y: py + fy * leadDist - sy * sideOffset * 0.8 };
      case 'ambusher': return { x: lead.x + fx * 60 + sx * wiggle * 70, y: lead.y + fy * 60 + sy * wiggle * 70 };
      case 'herder': return { x: px - fx * 110 + sx * (sideOffset * 0.55 + wiggle * 75), y: py - fy * 110 + sy * (sideOffset * 0.55 + wiggle * 75) };
      default: return { x: lead.x + sx * wiggle * 32, y: lead.y + sy * wiggle * 32 };
    }
  }

  // ── Maintenance ──

  maintainGrassField(time) {
    if (time < this.nextGrassMaintainAt) return;
    this.nextGrassMaintainAt = time + 600;
    const maxDistance = CHUNK_SIZE * (CHUNK_CULL_RADIUS + 1);
    this.grass.getChildren().forEach((tuft) => {
      if (!tuft.active) return;
      if (Phaser.Math.Distance.Between(tuft.x, tuft.y, this.player.x, this.player.y) > maxDistance) this.destroyGrassTuft(tuft);
    });
  }

  maintainThreatLevel(time) {
    if (time < this.nextThreatMaintainAt) return;
    const pressure = getPressure({ score: this.score, survivalTime: this.survivalTime });
    this.nextThreatMaintainAt = time + Math.max(280, 980 - pressure * 12);
    const despawnDistance = 2500 + Math.min(760, pressure * 13);
    this.corporateEnemies.getChildren().forEach((hazard) => {
      if (Phaser.Math.Distance.Between(hazard.x, hazard.y, this.player.x, this.player.y) > despawnDistance) hazard.destroy();
    });
    this.waterBottles.getChildren().forEach((bottle) => {
      if (Phaser.Math.Distance.Between(bottle.x, bottle.y, this.player.x, this.player.y) > despawnDistance) {
        this.destroyBottle(bottle);
      }
    });
    this.powerups.group.getChildren().forEach((pu) => {
      if (Phaser.Math.Distance.Between(pu.x, pu.y, this.player.x, this.player.y) > despawnDistance) {
        this.powerups.destroyCollectible(pu);
      }
    });
    if (time < this.hydratingUntil) return;
    const burst = 1 + Math.floor(Math.min(5, pressure / 27));
    let budget = burst;
    while (this.corporateEnemies.getLength() < getTargetCorporateEnemyCount({ score: this.score, survivalTime: this.survivalTime }) && budget > 0) {
      this.spawnCorporateEnemy();
      budget -= 1;
    }
  }

  // ── Update ──

  initializeRunClock(time) {
    if (this.clockInitialized) return;
    this.clockInitialized = true;
    this.lastGrassTouchAt = time;
    this.invulnerableUntil = time + 3000;
    this.lastStep = time;
    this.nextWorldUpdateAt = time;
    this.nextGrassMaintainAt = time + 900;
    this.nextThreatMaintainAt = time + 700;
    this.waveStartedAt = time;
    this.nextWaveAt = time + 30000;
  }

  update(time, deltaMs) {
    if (this.gameEnded) return;
    if (!this.clockInitialized) {
      this.initializeRunClock(0);
      deltaMs = Math.min(deltaMs, 16.67);
    }
    const clampedDeltaMs = Math.min(deltaMs, 50);
    this.runTimeMs += clampedDeltaMs;
    time = this.now();
    const dt = clampedDeltaMs / 1000;
    this.survivalTime += dt;
    this.playerSpeed = getPlayerSpeed({ score: this.score, survivalTime: this.survivalTime }) + this.skillEffects.speedBonus;
    this.updateCameraZoom();

    this.scrollBackdrop();
    this.updateWorldChunks();
    this.maintainGrassField(time);
    this.updateWave(time);

    // Input
    const left = this.cursors.left.isDown || this.isMovementDown('left');
    const right = this.cursors.right.isDown || this.isMovementDown('right');
    const up = this.cursors.up.isDown || this.isMovementDown('up');
    const down = this.cursors.down.isDown || this.isMovementDown('down');
    let vx = (right ? 1 : 0) - (left ? 1 : 0);
    let vy = (down ? 1 : 0) - (up ? 1 : 0);

    if ((vx !== 0 || vy !== 0) && this.pointerTarget) this.pointerTarget = null;
    if (vx === 0 && vy === 0 && this.pointerTarget) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.pointerTarget.x, this.pointerTarget.y);
      if (dist > 8) {
        vx = (this.pointerTarget.x - this.player.x) / dist;
        vy = (this.pointerTarget.y - this.player.y) / dist;
      } else {
        this.pointerTarget = null;
      }
    }

    // Speed boost
    let moveSpeed = this.playerSpeed;
    if (this.powerups.isActive('speed')) moveSpeed *= 1.6;

    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy);
      vx /= len; vy /= len;
      this.player.setVelocity(vx * moveSpeed, vy * moveSpeed);
      this.player.setFlipX(vx < -0.05);
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'player_walk') this.player.play('player_walk');
      this.player.anims.timeScale = Math.min(2.4, 1 + (this.playerSpeed - 225) / 240);
      if (time - this.lastStep > Math.max(130, 250 - (this.playerSpeed - 225) * 0.35)) {
        this.lastStep = time;
        this.audio.playFootstep(this.playerSpeed);
      }
    } else {
      this.player.setVelocity(0, 0);
      this.player.stop().setTexture('player_stand');
    }

    this.updateStraightRun(time, vx, vy);
    this.chill = Math.max(0, this.chill - dt * getChillDrainRate({
      score: this.score, survivalTime: this.survivalTime, playerSpeed: this.playerSpeed,
      noGrassSeconds: getNoGrassSeconds({ time, lastGrassTouchAt: this.lastGrassTouchAt }),
      straightSeconds: this.getStraightRunSeconds(time),
    }));

    // Water bottles
    if (time - this.lastBottleSpawnAt > BOTTLE_SPAWN_INTERVAL_MS) {
      this.lastBottleSpawnAt = time;
      this.spawnWaterBottle();
    }

    // Hydration expiration
    if (this.hydratingUntil > 0 && time >= this.hydratingUntil) {
      this.hydratingUntil = 0;
      this.player.clearTint();
      this.fx.floatText(this.player.x, this.player.y - 54, 'DEHYDRATED', '#ffb38f', 20);
    }

    // Magnet pull
    if (this.powerups.isActive('magnet')) {
      this.grass.getChildren().forEach((tuft) => {
        if (!tuft.active || tuft.getData('picked')) return;
        const d = Phaser.Math.Distance.Between(tuft.x, tuft.y, this.player.x, this.player.y);
        if (d < 250 && d > 30) {
          const angle = Phaser.Math.Angle.Between(tuft.x, tuft.y, this.player.x, this.player.y);
          tuft.x += Math.cos(angle) * 6;
          tuft.y += Math.sin(angle) * 6;
        }
      });
    }

    // Input actions
    if (Phaser.Input.Keyboard.JustDown(this.keys.SHIFT) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.ctrlKey) || window.__GTS_MINPUT__?.breathe) {
      if (window.__GTS_MINPUT__) window.__GTS_MINPUT__.breathe = false;
      this.deepBreath();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) this.scene.restart();

    this.pulseHydrationAura();
    this.updateHazards(time);
    this.maintainThreatLevel(time);
    this.powerups.update(time, clampedDeltaMs);

    if (this.chill <= 0) this.endGame(false, 'CHILL METER EMPTY: THE SWARM DRAGGED YOU BACK INSIDE');

    // Track longest no-damage during run
    if (this.runStats.lastDamageAt === 0) {
      this.runStats.longestNoDamage = this.survivalTime;
    } else {
      this.runStats.longestNoDamage = Math.max(this.runStats.longestNoDamage, (time - this.runStats.lastDamageAt) / 1000);
    }

    this.refreshHud();
  }

  updateStraightRun(time, vx, vy) {
    if (Math.hypot(vx, vy) <= 0.01) {
      this.lastMoveAngle = null; this.straightRunStartedAt = null; this.straightRunSeconds = 0; return;
    }
    const angle = Math.atan2(vy, vx);
    if (typeof this.lastMoveAngle !== 'number') {
      this.lastMoveAngle = angle; this.straightRunStartedAt = time; this.straightRunSeconds = 0; return;
    }
    const turn = Math.abs(Phaser.Math.Angle.Wrap(angle - this.lastMoveAngle));
    if (turn > 0.24) {
      this.lastMoveAngle = angle; this.straightRunStartedAt = time; this.straightRunSeconds = 0; return;
    }
    this.lastMoveAngle = Phaser.Math.Angle.RotateTo(this.lastMoveAngle, angle, 0.05);
    this.straightRunSeconds = Math.max(0, (time - (this.straightRunStartedAt ?? time) - 1100) / 1000);
  }

  getStraightRunSeconds(time = this.now()) {
    if (this.straightRunStartedAt == null) return 0;
    return Math.max(this.straightRunSeconds ?? 0, (time - this.straightRunStartedAt - 1100) / 1000);
  }

  refreshHud() {
    this.hud.refresh({
      score: this.score, combo: this.combo, survivalTime: this.survivalTime,
      chill: this.chill, now: this.now(), breatheReadyAt: this.breatheReadyAt,
      hydratingUntil: this.hydratingUntil, wave: this.wave,
      enemyCount: this.corporateEnemies.getLength(),
      activePowerups: this.powerups.getActiveList(),
      activeMultiplier: this.powerups.isActive('multiplier'),
    });
    window.__GTS_STATE__ = {
      score: this.score, bestCombo: this.bestCombo, chill: Math.round(this.chill),
      survived: Number(this.survivalTime.toFixed(1)), playerSpeed: Math.round(this.playerSpeed),
      wave: this.wave, ended: this.gameEnded, breathReady: (this.breatheReadyAt - this.now()) <= 0,
    };
  }

  // ── Game Over ──

  endGame(won, reason) {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.physics.pause();
    this.player.setTexture('player_hurt');
    this.cameras.main.stopFollow();

    // Finalize stats
    this.runStats.score = this.score;
    this.runStats.survivalTime = this.survivalTime;
    this.runStats.bestCombo = this.bestCombo;
    this.runStats.waveReached = this.wave;

    // Record progression
    const xpGain = progression.recordRun(this.runStats);

    // Check achievements
    const unlocked = achievements.check(this.runStats, {
      runsTotal: progression.data.totalRuns,
      streak: progression.data.playStreak,
      prestige: progression.data.prestige,
    });

    leaderboard.submit(this.score, this.runStats);

    this.scene.launch('GameOverScene', {
      score: this.score, survivalTime: this.survivalTime, bestCombo: this.bestCombo,
      wave: this.wave, reason, xpGain, unlocked, runStats: this.runStats,
    });
  }
}
