import Phaser from 'phaser';
import {
  PLAYER_BASE_SPEED,
  STRAIGHT_ANGLE_EPS,
  STRAIGHT_GRACE_MS,
  getChillDrainRate as calculateChillDrainRate,
  getNoGrassSeconds as calculateNoGrassSeconds,
  getPlayerSpeed as calculatePlayerSpeed,
  getPressure as calculatePressure,
  getSpeedChillDrainMultiplier,
} from './balance.js';
import {
  MAX_GRASS,
  getChunkGrassCount,
  getPostCollectGrassSpawnCount,
} from './grass-density.js';
import {
  CORPORATE_ENEMY_TYPES,
  MAX_CORPORATE_ENEMIES,
  getCorporateEnemyProfile,
  getCorporateStrategy,
  getTargetCorporateEnemyCount,
  pickCorporateEnemyType,
} from './corporate-enemies.js';
import './style.css';

const GAME_W = 1376;
const GAME_H = 768;
const CHUNK_SIZE = 900;
const CHUNK_RADIUS = 2;
const CHUNK_CULL_RADIUS = 3;
const BREATHE_CORE_RADIUS = 210;
const BREATHE_OUTER_RADIUS = 390;
const BREATHE_FORCE = 360;
const BREATHE_REPEL_MS = 430;
const RESTART_LOCK_MS = 2500;

const MEMES = [
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
];

const HAZARD_MEMES = [
  'BRAND AGGRO',
  'ALGORITHM LOCKED ON',
  'NOTIFICATION CRIT!',
  'ENGAGEMENT LOOP DAMAGE',
  'THE TIMELINE BITES BACK',
  'SERVER PINGED YOUR SOUL',
];

const ASSET = (path) => `assets/${path}?v=5`;

function formatDuration(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function chunkSeed(cx, cy) {
  let h = 0x811c9dc5;
  h = Math.imul(h ^ (cx | 0), 0x01000193);
  h = Math.imul(h ^ (cy | 0), 0x01000193);
  h = Math.imul(h ^ 0x9e3779b9, 0x01000193);
  return h >>> 0;
}

function seededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randFloat(rng, min, max) {
  return min + rng() * (max - min);
}

function randInt(rng, min, max) {
  return Math.floor(randFloat(rng, min, max + 1));
}

function randPick(rng, values) {
  return values[Math.floor(rng() * values.length) % values.length];
}

class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  preload() {
    const loaderLabel = this.add.text(GAME_W / 2, GAME_H - 42, 'loading grass...', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '18px',
      color: '#f7f0bb',
      stroke: '#0d1a0f',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.load.on('progress', (value) => loaderLabel.setText(`loading grass... ${Math.round(value * 100)}%`));
    this.load.on('complete', () => loaderLabel.destroy());

    this.load.image('reference', ASSET('reference/grass_touching_simulator.webp'));
    this.load.image('reference_mobile', ASSET('reference/grass_touching_simulator_mobile.png'));
    this.load.image('grass0', ASSET('tiny-town/grass_0.png'));
    this.load.image('grass1', ASSET('tiny-town/grass_1.png'));
    this.load.image('grass2', ASSET('tiny-town/grass_2.png'));
    this.load.image('flowers', ASSET('tiny-town/grass_flowers.png'));
    this.load.image('path', ASSET('tiny-town/path_0.png'));
    this.load.image('tree0', ASSET('tiny-town/tree_0.png'));
    this.load.image('tree1', ASSET('tiny-town/tree_1.png'));
    this.load.image('tree2', ASSET('tiny-town/tree_2.png'));
    ['tuft_0', 'tuft_1', 'tuft_2', 'tuft_3'].forEach((key) => this.load.image(key, ASSET(`foliage/${key}.png`)));
    this.load.image('player_stand', ASSET('characters/player_stand.png'));
    this.load.image('player_walk1', ASSET('characters/player_walk1.png'));
    this.load.image('player_walk2', ASSET('characters/player_walk2.png'));
    this.load.image('player_cheer', ASSET('characters/player_cheer.png'));
    this.load.image('player_hurt', ASSET('characters/player_hurt.png'));
    this.load.image('logo_tiktok', ASSET('corporate/tiktok.svg'));
    this.load.image('logo_youtube', ASSET('corporate/youtube.svg'));
    this.load.image('logo_chatgpt', ASSET('corporate/chatgpt.svg'));
    this.load.image('logo_discord', ASSET('corporate/discord.svg'));
    this.load.image('logo_google', ASSET('corporate/google.svg'));
    this.load.image('logo_wikipedia', ASSET('corporate/wikipedia.svg'));
    this.load.image('logo_gmail', ASSET('corporate/gmail.svg'));
    this.load.image('logo_instagram', ASSET('corporate/instagram.svg'));
    this.load.image('logo_facebook', ASSET('corporate/facebook.svg'));
    this.load.image('logo_linkedin', ASSET('corporate/linkedin.svg'));
    this.load.image('logo_teams', ASSET('corporate/teams.svg'));
    this.load.image('logo_whatsapp', ASSET('corporate/whatsapp.svg'));
    this.load.image('logo_twitter', ASSET('corporate/twitter.svg'));
    this.load.image('enemy_hermes_walk1', ASSET('characters/hermes_walk1.png'));
    this.load.image('enemy_hermes_walk2', ASSET('characters/hermes_walk2.png'));
    this.load.audio('foot0', ASSET('audio/footstep_grass_000.ogg'));
    this.load.audio('foot1', ASSET('audio/footstep_grass_001.ogg'));
    this.load.audio('touch', ASSET('audio/touch.ogg'));
    this.load.audio('notification', ASSET('audio/notification_chime.ogg'));
  }

  create() {
    window.__GTS_READY__ = 'menu';
    window.__GTS_MENU_EXACT_IMAGE__ = true;

    const cw = this.scale.width;
    const ch = this.scale.height;
    const isPortrait = ch > cw;
    const bgKey = isPortrait ? 'reference_mobile' : 'reference';
    const refW = isPortrait ? 941 : GAME_W;
    const refH = isPortrait ? 1672 : GAME_H;

    const scale = Math.max(cw / refW, ch / refH);
    const bg = this.add.image(cw / 2, ch / 2, bgKey)
      .setDisplaySize(refW * scale, refH * scale)
      .setDepth(0);

    bg.setInteractive({ useHandCursor: true });
    this.input.setDefaultCursor('pointer');

    const start = () => this.scene.start('GameScene');
    bg.on('pointerdown', start);
    this.input.keyboard.on('keydown-SPACE', start);
    this.input.keyboard.on('keydown-ENTER', start);

    this.scale.on('resize', (gameSize) => {
      const p = gameSize.height > gameSize.width;
      const rw = p ? 941 : GAME_W;
      const rh = p ? 1672 : GAME_H;
      const s = Math.max(gameSize.width / rw, gameSize.height / rh);
      if (bg.texture?.key !== (p ? 'reference_mobile' : 'reference')) {
        bg.setTexture(p ? 'reference_mobile' : 'reference');
      }
      bg.setPosition(gameSize.width / 2, gameSize.height / 2);
      bg.setDisplaySize(rw * s, rh * s);
    });
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  now() {
    return this.runTimeMs ?? 0;
  }

  initializeRunClock(time) {
    if (this.clockInitialized) return;
    this.clockInitialized = true;
    this.lastGrassTouchAt = time;
    this.invulnerableUntil = time + 3000;
    this.lastStep = time;
    this.nextWorldUpdateAt = time;
    this.nextGrassMaintainAt = time + 900;
    this.nextThreatMaintainAt = time + 700;
    this.corporateEnemies?.getChildren().forEach((hazard) => {
      const profile = getCorporateEnemyProfile(hazard.getData('type'));
      hazard.setData('nextStrategyAt', time + Phaser.Math.Between(8000, 17000));
      hazard.setData('lungeAt', time + Phaser.Math.Between(profile.lungeBaseMinMs, profile.lungeBaseMaxMs));
      hazard.setData('lungeUntil', 0);
      hazard.setData('repelledUntil', 0);
      hazard.setData('retargetAt', 0);
    });
  }

  create() {
    window.__GTS_READY__ = 'game';
    window.__GTS_SCENE__ = this;

    this.score = 0;
    this.bestCombo = 0;
    this.combo = 0;
    this.chill = 76;
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
    this.gameEnded = false;
    this.pointerTarget = null;
    this.nextWorldUpdateAt = 0;
    this.nextGrassMaintainAt = 0;
    this.nextThreatMaintainAt = 0;
    this.playerSpeed = PLAYER_BASE_SPEED;
    this.chunks = new Map();

    // Bodies are not clamped to a finite arena. The grassland streams around the player.
    this.physics.world.setBounds(-100000000, -100000000, 200000000, 200000000);

    this.createInfiniteBackdrop();

    this.player = this.physics.add.sprite(0, 0, 'player_stand')
      .setScale(0.62)
      .setDepth(90)
      .setCollideWorldBounds(false);
    this.player.body.setSize(38, 78).setOffset(21, 28);

    if (!this.anims.exists('player_walk')) {
      this.anims.create({ key: 'player_walk', frames: [{ key: 'player_walk1' }, { key: 'player_walk2' }], frameRate: 7, repeat: -1 });
    }
    if (!this.anims.exists('hermes_walk')) {
      this.anims.create({ key: 'hermes_walk', frames: [{ key: 'enemy_hermes_walk1' }, { key: 'enemy_hermes_walk2' }], frameRate: 6, repeat: -1 });
    }

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(80, 60);

    this.grass = this.physics.add.group({ allowGravity: false, immovable: true });
    this.corporateEnemies = this.physics.add.group({ allowGravity: false });

    this.updateWorldChunks(true);
    for (let i = 0; i < 9; i += 1) this.spawnCorporateEnemy();

    this.physics.add.overlap(this.player, this.grass, (_, tuft) => this.collectGrass(tuft));
    this.physics.add.overlap(this.player, this.corporateEnemies, (_, hazard) => this.takeDamage(hazard));

    this.keys = this.input.keyboard.addKeys('W,A,S,D,SHIFT,R,SPACE');
    this.ctrlKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.on('pointerdown', (pointer) => {
      if (this.gameEnded) return;
      const worldPoint = pointer.positionToCamera(this.cameras.main);
      this.pointerTarget = new Phaser.Math.Vector2(worldPoint.x, worldPoint.y);
      this.floatText(worldPoint.x, worldPoint.y - 30, 'going outside...', '#f7f0bb', 16);
    });

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
      if (window.__GTS_SCENE__ === this) window.__GTS_SCENE__ = null;
    });

    this.createHud();
    this.floatText(this.player.x, this.player.y - 80, 'INFINITE GRASS. INFINITE CONSEQUENCES.', '#fff2a8', 18);
    this.refreshHud();
  }

  createInfiniteBackdrop() {
    const cw = this.scale.width;
    const ch = this.scale.height;
    this.backdropLayers = [
      this.add.tileSprite(0, 0, cw, ch, 'grass0').setOrigin(0).setScrollFactor(0).setDepth(-80).setData('scrollScale', 1),
      this.add.tileSprite(0, 0, cw, ch, 'grass1').setOrigin(0).setScrollFactor(0).setDepth(-79).setAlpha(0.18).setData('scrollScale', 1.05).setData('offsetX', 7).setData('offsetY', 11),
      this.add.tileSprite(0, 0, cw, ch, 'grass2').setOrigin(0).setScrollFactor(0).setDepth(-78).setAlpha(0.12).setData('scrollScale', 0.94).setData('offsetX', 17).setData('offsetY', 3),
    ];
    this.scrollBackdrop();
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

  resizeBackdrop(gameSize = this.scale) {
    if (!this.backdropLayers) return;
    this.backdropLayers.forEach((layer) => layer.setSize(gameSize.width, gameSize.height));
    this.scrollBackdrop();
  }

  handleResize(gameSize) {
    this.resizeBackdrop(gameSize);
    if (this.hud) {
      this.hud.destroy(true);
      this.hud = null;
      this.createHud();
      this.refreshHud();
    }
  }

  createChunk(cx, cy) {
    const key = `${cx},${cy}`;
    if (this.chunks.has(key)) return;

    const rng = seededRng(chunkSeed(cx, cy));
    const x0 = cx * CHUNK_SIZE;
    const y0 = cy * CHUNK_SIZE;
    const objects = [];
    const decoKeys = ['flowers', 'grass1', 'grass2', 'path'];
    const decoCount = randInt(rng, 18, 32);

    for (let i = 0; i < decoCount; i += 1) {
      const decoKey = randPick(rng, decoKeys);
      const img = this.add.image(
        x0 + randFloat(rng, 20, CHUNK_SIZE - 20),
        y0 + randFloat(rng, 20, CHUNK_SIZE - 20),
        decoKey,
      ).setDepth(randInt(rng, -45, 8));
      img.setScale(decoKey === 'path' ? randFloat(rng, 1.35, 2.7) : randFloat(rng, 1.0, 2.25));
      img.setAlpha(decoKey === 'path' ? randFloat(rng, 0.18, 0.42) : randFloat(rng, 0.22, 0.86));
      img.setAngle(randInt(rng, 0, 3) * 90);
      objects.push(img);
    }

    const treeCount = randInt(rng, 3, 8);
    for (let i = 0; i < treeCount; i += 1) {
      const tree = this.add.image(
        x0 + randFloat(rng, 45, CHUNK_SIZE - 45),
        y0 + randFloat(rng, 45, CHUNK_SIZE - 45),
        randPick(rng, ['tree0', 'tree1', 'tree2']),
      ).setDepth(42);
      tree.setScale(randFloat(rng, 2.2, 3.8));
      tree.setAlpha(randFloat(rng, 0.82, 1));
      tree.setAngle(randInt(rng, -2, 2));
      objects.push(tree);
    }

    // Grass tufts — pre-generated per chunk so grass exists before the player arrives.
    const grassCount = getChunkGrassCount(rng);
    const grassKeys = ['tuft_0', 'tuft_1', 'tuft_2', 'tuft_3'];
    const grassTints = [0x74c857, 0x93d867, 0xb7e66f, 0x5eac48];
    for (let i = 0; i < grassCount; i += 1) {
      const tuft = this.physics.add.image(
        x0 + randFloat(rng, 30, CHUNK_SIZE - 30),
        y0 + randFloat(rng, 30, CHUNK_SIZE - 30),
        randPick(rng, grassKeys),
      )
        .setScale(randFloat(rng, 0.045, 0.065))
        .setTint(randPick(rng, grassTints))
        .setDepth(45)
        .setAlpha(0.96);
      tuft.body.setAllowGravity(false);
      tuft.body.setSize(300, 250, true);
      tuft.setData('picked', false);
      this.grass.add(tuft);
      this.tweens.add({ targets: tuft, angle: randInt(rng, -7, 7), duration: randInt(rng, 900, 1300), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      objects.push(tuft);
    }

    this.chunks.set(key, { cx, cy, objects });
  }

  updateWorldChunks(force = false) {
    if (!force && this.now() < this.nextWorldUpdateAt) return;
    this.nextWorldUpdateAt = this.now() + 450;

    const pcx = Math.floor(this.player.x / CHUNK_SIZE);
    const pcy = Math.floor(this.player.y / CHUNK_SIZE);
    for (let dx = -CHUNK_RADIUS; dx <= CHUNK_RADIUS; dx += 1) {
      for (let dy = -CHUNK_RADIUS; dy <= CHUNK_RADIUS; dy += 1) {
        this.createChunk(pcx + dx, pcy + dy);
      }
    }

    this.chunks.forEach((chunk, key) => {
      if (Math.abs(chunk.cx - pcx) > CHUNK_CULL_RADIUS || Math.abs(chunk.cy - pcy) > CHUNK_CULL_RADIUS) {
        chunk.objects.forEach((obj) => obj.destroy());
        this.chunks.delete(key);
      }
    });
  }

  createHud() {
    const cw = this.cameras.main.width;
    const narrow = cw < 600;
    const panelW = Math.min(narrow ? cw - 24 : 928, cw - 32);
    const panelH = narrow ? 88 : 86;
    const font = narrow ? '13px' : '21px';
    const small = narrow ? '10px' : '13px';

    this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(2000);
    const panel = this.add.rectangle(12, 12, panelW, panelH, 0x102013, 0.74)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xf7f0bb, 0.32);

    this.scoreText = this.add.text(22, 16, '', {
      fontFamily: 'Inter, sans-serif', fontSize: font, fontStyle: '900', color: '#fff2a8',
      stroke: '#071008', strokeThickness: 3,
    });
    this.timerText = this.add.text(panelW - 4, 16, '', {
      fontFamily: 'Inter, sans-serif', fontSize: font, fontStyle: '900', color: '#fff2a8',
      stroke: '#071008', strokeThickness: 3,
    }).setOrigin(1, 0);

    const row2y = narrow ? 56 : 62;
    this.meterLabel = this.add.text(22, row2y, 'chill', {
      fontFamily: 'Inter, sans-serif', fontSize: small, fontStyle: '900', color: '#cfe99d',
    });
    const meterX = narrow ? 68 : 92;
    const meterW = narrow ? Math.max(74, Math.min(160, panelW - 198)) : 330;
    this.meterBg = this.add.rectangle(meterX, row2y + 7, meterW, narrow ? 10 : 16, 0x071008, 0.8).setOrigin(0, 0.5);
    this.meterBar = this.add.rectangle(meterX, row2y + 7, meterW * 0.57, narrow ? 10 : 16, 0x91d969, 1).setOrigin(0, 0.5);
    this.breathText = this.add.text(meterX + meterW + 8, row2y + 1, '', {
      fontFamily: 'Inter, sans-serif', fontSize: small, fontStyle: '900', color: '#f7f0bb',
    });
    this.swarmText = this.add.text(panelW - 8, row2y + 1, '', {
      fontFamily: 'Inter, sans-serif', fontSize: small, fontStyle: '900', color: '#ffb38f',
    }).setOrigin(1, 0);
    this.hud.add([panel, this.scoreText, this.timerText, this.meterLabel, this.meterBg, this.meterBar, this.breathText, this.swarmText]);

    this._meterW = meterW;
    this._narrow = narrow;
  }

  getPressure() {
    return calculatePressure({ score: this.score, survivalTime: this.survivalTime });
  }

  getPlayerSpeed() {
    return calculatePlayerSpeed({ score: this.score, survivalTime: this.survivalTime });
  }

  getNoGrassSeconds(time = this.now()) {
    return calculateNoGrassSeconds({ time, lastGrassTouchAt: this.lastGrassTouchAt });
  }

  updateStraightRun(time, vx, vy) {
    if (Math.hypot(vx, vy) <= 0.01) {
      this.lastMoveAngle = null;
      this.straightRunStartedAt = null;
      this.straightRunSeconds = 0;
      return;
    }
    const angle = Math.atan2(vy, vx);
    if (typeof this.lastMoveAngle !== 'number') {
      this.lastMoveAngle = angle;
      this.straightRunStartedAt = time;
      this.straightRunSeconds = 0;
      return;
    }
    const turn = Math.abs(Phaser.Math.Angle.Wrap(angle - this.lastMoveAngle));
    if (turn > STRAIGHT_ANGLE_EPS) {
      this.lastMoveAngle = angle;
      this.straightRunStartedAt = time;
      this.straightRunSeconds = 0;
      return;
    }
    this.lastMoveAngle = Phaser.Math.Angle.RotateTo(this.lastMoveAngle, angle, 0.05);
    this.straightRunSeconds = Math.max(0, (time - (this.straightRunStartedAt ?? time) - STRAIGHT_GRACE_MS) / 1000);
  }

  getStraightRunSeconds(time = this.now()) {
    if (this.straightRunStartedAt == null) return 0;
    return Math.max(this.straightRunSeconds ?? 0, (time - this.straightRunStartedAt - STRAIGHT_GRACE_MS) / 1000);
  }

  getChillDrainRate(time = this.now()) {
    return calculateChillDrainRate({
      score: this.score,
      survivalTime: this.survivalTime,
      playerSpeed: this.playerSpeed || this.getPlayerSpeed(),
      noGrassSeconds: this.getNoGrassSeconds(time),
      straightSeconds: this.getStraightRunSeconds(time),
    });
  }

  capThreatSpeed(speed, ratio = 0.94) {
    const playerSpeed = this.playerSpeed || this.getPlayerSpeed();
    return Math.min(speed, Math.max(90, playerSpeed * ratio));
  }

  getThreatSpeed() {
    const pressure = this.getPressure();
    const ratio = Math.min(0.972, 0.905 + pressure * 0.0023);
    return this.capThreatSpeed(215 + pressure * 4.45, ratio);
  }

  getCorporateSpeed() {
    return this.getThreatSpeed();
  }

  targetCorporateEnemyCount() {
    return getTargetCorporateEnemyCount({ score: this.score, survivalTime: this.survivalTime });
  }

  spawnGrass(count = 1, minDistance = 130, maxDistance = 980) {
    const room = Math.max(0, MAX_GRASS - this.grass.getLength());
    const toSpawn = Math.min(count, room);
    for (let i = 0; i < toSpawn; i += 1) {
      const { x, y } = this.randomGrassPointAroundPlayer(minDistance, maxDistance);
      const key = Phaser.Math.RND.pick(['tuft_0', 'tuft_1', 'tuft_2', 'tuft_3']);
      const tuft = this.physics.add.image(x, y, key)
        .setScale(Phaser.Math.FloatBetween(0.045, 0.065))
        .setTint(Phaser.Math.RND.pick([0x74c857, 0x93d867, 0xb7e66f, 0x5eac48]))
        .setDepth(45)
        .setAlpha(0.96);
      tuft.body.setAllowGravity(false);
      tuft.body.setSize(300, 250, true);
      tuft.setData('picked', false);
      this.grass.add(tuft);
      this.tweens.add({ targets: tuft, angle: Phaser.Math.Between(-7, 7), duration: Phaser.Math.Between(900, 1300), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }

  randomPointAroundPlayer(minDistance = 420, maxDistance = 1200) {
    const cx = this.player?.x ?? 0;
    const cy = this.player?.y ?? 0;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const inner = minDistance * minDistance;
    const outer = maxDistance * maxDistance;
    const radius = Math.sqrt(Phaser.Math.FloatBetween(inner, outer));
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  }

  randomGrassPointAroundPlayer(minDistance = 420, maxDistance = 1200) {
    const straightSeconds = this.getStraightRunSeconds(this.now());
    const avoidAngle = typeof this.lastMoveAngle === 'number' && straightSeconds > 1.8 ? this.lastMoveAngle : null;
    let fallback = null;
    for (let i = 0; i < 8; i += 1) {
      const p = this.randomPointAroundPlayer(minDistance, maxDistance);
      fallback = fallback ?? p;
      if (avoidAngle == null || !this.player) return p;
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, p.x, p.y);
      const delta = Math.abs(Phaser.Math.Angle.Wrap(angle - avoidAngle));
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
      // When the player holds one direction for a while, avoid only the narrow forward-lane far away.
      // Grass still appears ahead nearby and in all other directions.
      if (!(delta < 0.30 && dist > maxDistance * 0.65)) return p;
    }
    return fallback ?? this.randomPointAroundPlayer(minDistance, maxDistance);
  }

  randomSpawnPointNearEdge(extraMin = 0) {
    const cam = this.cameras.main;
    const minDistance = Math.max(430 + extraMin, Math.max(cam.width, cam.height) * 0.58);
    const maxDistance = minDistance + 560;
    return this.randomPointAroundPlayer(minDistance, maxDistance);
  }

  spawnCorporateEnemy(type = pickCorporateEnemyType(Math.random)) {
    if (this.corporateEnemies.getLength() >= MAX_CORPORATE_ENEMIES) return;
    const profile = getCorporateEnemyProfile(type);
    const { x, y } = this.randomSpawnPointNearEdge(profile.type === 'youtube' ? 90 : 45);
    const pressure = this.getPressure();
    const strategy = getCorporateStrategy(profile, Math.random);
    const displaySize = profile.size + Math.min(9, pressure / 85);
    const displayWidth = (profile.displayWidth ?? profile.size) + Math.min(9, pressure / 85);
    const displayHeight = (profile.displayHeight ?? profile.size) + Math.min(9, pressure / 85);
    const enemy = profile.animationKey
      ? this.physics.add.sprite(x, y, profile.textureKey)
      : this.physics.add.image(x, y, profile.textureKey);
    enemy
      .setDisplaySize(displayWidth || displaySize, displayHeight || displaySize)
      .setDepth(95)
      .setAlpha(0.98);
    if (profile.defaultFlipX !== undefined) enemy.setFlipX(profile.defaultFlipX);
    if (profile.animationKey) {
      enemy.play(profile.animationKey);
      enemy.anims.timeScale = profile.animationTimeScale ?? 1;
    }
    enemy.body.setAllowGravity(false);
    enemy.body.setSize(profile.bodyWidth ?? profile.bodySize, profile.bodyHeight ?? profile.bodySize, true);
    enemy.setData('type', profile.type);
    enemy.setData('label', profile.label);
    enemy.setData('strategy', strategy);
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
    });
  }

  aimHazardAtPlayer(hazard, speed, jitter = 0) {
    if (!hazard?.body || !this.player) return;
    const target = Phaser.Math.Angle.Between(hazard.x, hazard.y, this.player.x, this.player.y) + Phaser.Math.FloatBetween(-jitter, jitter);
    hazard.body.setVelocity(Math.cos(target) * speed, Math.sin(target) * speed);
  }

  moveHazardToward(hazard, target, speed) {
    if (!hazard?.body) return;
    const dx = target.x - hazard.x;
    const dy = target.y - hazard.y;
    const targetDist = Math.max(1, Math.hypot(dx, dy));
    let rawAngle = Math.atan2(dy, dx);
    const playerDist = this.player
      ? Phaser.Math.Distance.Between(hazard.x, hazard.y, this.player.x, this.player.y)
      : targetDist;

    // If a strategic side/cutoff target is already reached, do not snap left/right
    // every frame. Glide toward the player and smooth the turn instead.
    if (targetDist < 58 && playerDist > 92 && this.player) {
      rawAngle = Phaser.Math.Angle.Between(hazard.x, hazard.y, this.player.x, this.player.y);
    }

    const previous = hazard.getData('moveAngle');
    const angle = typeof previous === 'number'
      ? Phaser.Math.Angle.RotateTo(previous, rawAngle, 0.16)
      : rawAngle;
    hazard.setData('moveAngle', angle);
    hazard.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  getPlayerMoveIntent(hazard, time) {
    const vx = this.player?.body?.velocity?.x ?? 0;
    const vy = this.player?.body?.velocity?.y ?? 0;
    if (Math.hypot(vx, vy) > 12) {
      if (hazard) hazard.setData('idleMoveAngle', null);
      return { angle: Math.atan2(vy, vx), moving: true };
    }
    if (this.pointerTarget) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.pointerTarget.x, this.pointerTarget.y);
      if (dist > 32) {
        if (hazard) hazard.setData('idleMoveAngle', null);
        return { angle: Phaser.Math.Angle.Between(this.player.x, this.player.y, this.pointerTarget.x, this.pointerTarget.y), moving: true };
      }
    }
    if (!hazard) return { angle: this.player?.flipX ? Math.PI : 0, moving: false };

    let idleAngle = hazard.getData('idleMoveAngle');
    const refreshAt = hazard.getData('idleMoveAngleRefreshAt') ?? 0;
    if (typeof idleAngle !== 'number' || time > refreshAt) {
      idleAngle = Phaser.Math.Angle.Between(hazard.x, hazard.y, this.player.x, this.player.y);
      hazard.setData('idleMoveAngle', idleAngle);
      hazard.setData('idleMoveAngleRefreshAt', time + Phaser.Math.Between(1800, 3200));
    }
    return { angle: idleAngle, moving: false };
  }

  rotateThreatStrategy(hazard, strategies, time) {
    if (time <= (hazard.getData('nextStrategyAt') ?? 0)) return;
    hazard.setData('strategy', Phaser.Math.RND.pick(strategies));
    hazard.setData('side', Phaser.Math.RND.pick([-1, 1]));
    hazard.setData('phase', Phaser.Math.FloatBetween(0, Math.PI * 2));
    hazard.setData('idleMoveAngle', null);
    hazard.setData('idleMoveAngleRefreshAt', 0);
    hazard.setData('nextStrategyAt', time + Phaser.Math.Between(9000, 18000));
  }

  getGrassRouteNodes(limit = 18) {
    if (!this.grass || !this.player) return [];
    const px = this.player.x;
    const py = this.player.y;
    return this.grass.getChildren()
      .filter((tuft) => tuft.active && !tuft.getData('picked'))
      .map((tuft) => ({
        x: tuft.x,
        y: tuft.y,
        tuft,
        dist: Phaser.Math.Distance.Between(px, py, tuft.x, tuft.y),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, limit);
  }

  getLikelyGrassTarget(time) {
    const nodes = this.getGrassRouteNodes(20);
    if (nodes.length === 0) return null;
    const intent = this.getPlayerMoveIntent(null, time);
    let best = null;
    nodes.forEach((node) => {
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, node.x, node.y);
      const forward = intent.moving ? Math.max(0, Math.cos(Phaser.Math.Angle.Wrap(angle - intent.angle))) : 0;
      const straightTrap = typeof this.lastMoveAngle === 'number'
        ? Math.max(0, Math.cos(Phaser.Math.Angle.Wrap(angle - this.lastMoveAngle))) * Math.min(220, this.getStraightRunSeconds(time) * 70)
        : 0;
      const score = node.dist - forward * 190 - straightTrap;
      if (!best || score < best.score) best = { ...node, score };
    });
    return best;
  }

  getRouteContext(hazard, time) {
    const grassTarget = this.getLikelyGrassTarget(time);
    const intent = this.getPlayerMoveIntent(hazard, time);
    const px = this.player.x;
    const py = this.player.y;
    const routeAngle = grassTarget
      ? Phaser.Math.Angle.Between(px, py, grassTarget.x, grassTarget.y)
      : intent.angle;
    const fx = Math.cos(routeAngle);
    const fy = Math.sin(routeAngle);
    const side = hazard.getData('side') ?? 1;
    const sx = -fy * side;
    const sy = fx * side;
    const routeDistance = grassTarget ? grassTarget.dist : 760;
    const leadDistance = Math.min(routeDistance, (this.playerSpeed || this.getPlayerSpeed()) * (1.1 + Math.min(1.25, this.getPressure() / 95)));
    const lead = { x: px + fx * leadDistance, y: py + fy * leadDistance };
    const goal = grassTarget ? { x: grassTarget.x, y: grassTarget.y } : lead;
    const routeNodes = [0.28, 0.46, 0.64, 0.82, 1].map((t) => ({
      x: px + fx * routeDistance * t,
      y: py + fy * routeDistance * t,
      routeT: t,
    }));
    this.getGrassRouteNodes(10).forEach((node) => routeNodes.push({ x: node.x, y: node.y, routeT: 1, grass: true }));
    return { grassTarget, intent, px, py, fx, fy, sx, sy, routeDistance, lead, goal, routeNodes };
  }

  chooseGraphCutNode(hazard, route, sideOffset = 0) {
    const threatSpeed = Math.max(1, this.getThreatSpeed());
    const playerSpeed = Math.max(1, this.playerSpeed || this.getPlayerSpeed());
    const goal = route.goal;
    let best = null;
    route.routeNodes.forEach((node) => {
      const candidates = [node];
      if (sideOffset !== 0) candidates.push({ x: node.x + route.sx * sideOffset, y: node.y + route.sy * sideOffset, routeT: node.routeT });
      candidates.forEach((candidate) => {
        const playerDist = Phaser.Math.Distance.Between(route.px, route.py, candidate.x, candidate.y);
        const threatDist = Phaser.Math.Distance.Between(hazard.x, hazard.y, candidate.x, candidate.y);
        const playerEta = playerDist / playerSpeed;
        const threatEta = threatDist / threatSpeed;
        const latePenalty = Math.max(0, threatEta - playerEta) * 320;
        const timingScore = Math.abs(threatEta - playerEta) * 115;
        const goalScore = Phaser.Math.Distance.Between(candidate.x, candidate.y, goal.x, goal.y) * 0.09;
        const aheadBonus = (candidate.routeT ?? 0.5) * 95;
        const score = latePenalty + timingScore + goalScore - aheadBonus;
        if (!best || score < best.score) best = { ...candidate, score, playerEta, threatEta };
      });
    });
    return best ?? route.lead;
  }

  getCorporateThreatTarget(hazard, profile, time) {
    const pressure = this.getPressure();
    const strategy = hazard.getData('strategy') ?? profile.strategies[0];
    const phase = hazard.getData('phase') ?? 0;
    const route = this.getRouteContext(hazard, time);
    const intent = route.intent;
    const idleScale = intent.moving ? 1 : 0.42;
    const wiggle = Math.sin(time / (intent.moving ? 720 : 1500) + phase) * idleScale;
    const sideOffset = 160 + Math.min(185, pressure * 1.65);
    const cut = this.chooseGraphCutNode(hazard, route, 0);
    hazard.setData('graphTargetX', Math.round(cut.x));
    hazard.setData('graphTargetY', Math.round(cut.y));
    hazard.setData('graphPlayerEta', Number((cut.playerEta ?? 0).toFixed(2)));
    hazard.setData('graphThreatEta', Number((cut.threatEta ?? 0).toFixed(2)));
    hazard.setData('graphPattern', profile.primaryPattern);
    const routeNodes = route.routeNodes ?? [];
    const hopIndex = routeNodes.length
      ? Math.floor(Math.abs(Math.sin(time / 1150 + phase)) * routeNodes.length) % routeNodes.length
      : -1;
    const routeHop = routeNodes[hopIndex] ?? route.lead;
    const gridSize = 110;
    const snapToMeetingGrid = (point) => ({
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize,
    });

    if (strategy === 'sweeper') {
      const sweep = this.chooseGraphCutNode(hazard, route, sideOffset * 0.95);
      return { x: sweep.x - route.fx * 60, y: sweep.y - route.fy * 60 };
    }
    if (strategy === 'zigzag') {
      const zig = Math.sin(time / 260 + phase) * sideOffset * 0.85;
      const surge = Math.cos(time / 430 + phase) * 95;
      return { x: route.lead.x + route.sx * zig + route.fx * surge, y: route.lead.y + route.sy * zig + route.fy * surge };
    }
    if (strategy === 'cutoff') {
      const cutoff = this.chooseGraphCutNode(hazard, route, sideOffset * 0.55);
      return { x: cutoff.x + route.sx * wiggle * 90, y: cutoff.y + route.sy * wiggle * 90 };
    }
    if (strategy === 'orbiter') {
      const orbit = hazard.getData('orbitRadius') ?? 260;
      const anchor = route.grassTarget ?? route.lead;
      return { x: anchor.x + route.sx * orbit + route.fx * wiggle * 95, y: anchor.y + route.sy * orbit + route.fy * wiggle * 95 };
    }
    if (strategy === 'flanker') {
      const flank = this.chooseGraphCutNode(hazard, route, sideOffset);
      return { x: flank.x - route.fx * 75, y: flank.y - route.fy * 75 };
    }
    if (strategy === 'pack') {
      const packAngle = phase + time / 1100;
      const radius = 145 + Math.min(140, pressure * 1.25);
      return { x: route.px + Math.cos(packAngle) * radius + route.sx * wiggle * 110, y: route.py + Math.sin(packAngle) * radius + route.sy * wiggle * 110 };
    }
    if (strategy === 'predictor') {
      const predictive = this.chooseGraphCutNode(hazard, route, sideOffset * 0.2);
      return { x: predictive.x + route.fx * 135 + route.sx * wiggle * 45, y: predictive.y + route.fy * 135 + route.sy * wiggle * 45 };
    }
    if (strategy === 'mirror') {
      const mirrorLead = Math.min(route.routeDistance, (this.playerSpeed || this.getPlayerSpeed()) * 1.55);
      return { x: route.px + route.fx * mirrorLead - route.sx * sideOffset * 0.8, y: route.py + route.fy * mirrorLead - route.sy * sideOffset * 0.8 };
    }
    if (strategy === 'ambusher') {
      const ambush = this.chooseGraphCutNode(hazard, route, sideOffset * 0.35);
      return { x: ambush.x + route.fx * 60 + route.sx * wiggle * 70, y: ambush.y + route.fy * 60 + route.sy * wiggle * 70 };
    }
    if (strategy === 'herder') {
      return { x: route.px - route.fx * 110 + route.sx * (sideOffset * 0.55 + wiggle * 75), y: route.py - route.fy * 110 + route.sy * (sideOffset * 0.55 + wiggle * 75) };
    }
    if (strategy === 'search-crawler') {
      const crawlOffset = Math.sin(time / 360 + phase) * sideOffset * 0.65;
      return { x: routeHop.x + route.sx * crawlOffset - route.fx * 45, y: routeHop.y + route.sy * crawlOffset - route.fy * 45 };
    }
    if (strategy === 'rank-cutoff') {
      const rankStep = Math.floor(time / 900 + phase) % 4;
      const ranked = this.chooseGraphCutNode(hazard, route, sideOffset * (0.25 + rankStep * 0.23));
      return { x: ranked.x + route.fx * 35, y: ranked.y + route.fy * 35 };
    }
    if (strategy === 'map-pin') {
      const pin = route.grassTarget ?? route.goal;
      const pulse = Math.sin(time / 430 + phase) * 85;
      return { x: pin.x + route.sx * pulse, y: pin.y + route.sy * pulse };
    }
    if (strategy === 'citation-web') {
      const citation = routeHop;
      const web = Math.cos(time / 520 + phase) * sideOffset * 0.5;
      return { x: citation.x + route.sx * web + route.fx * 70, y: citation.y + route.sy * web + route.fy * 70 };
    }
    if (strategy === 'archive-cage') {
      const cage = this.chooseGraphCutNode(hazard, route, sideOffset * 0.75);
      const bar = Math.sin(time / 840 + phase) > 0 ? 1 : -1;
      return { x: cage.x - route.fx * 95 * bar + route.sx * sideOffset * 0.35, y: cage.y - route.fy * 95 * bar + route.sy * sideOffset * 0.35 };
    }
    if (strategy === 'knowledge-orbit') {
      const anchor = route.grassTarget ?? route.lead;
      const angle = time / 920 + phase;
      const radius = 135 + Math.min(150, pressure * 1.1);
      return { x: anchor.x + Math.cos(angle) * radius, y: anchor.y + Math.sin(angle) * radius };
    }
    if (strategy === 'inbox-pincer') {
      const pincer = this.chooseGraphCutNode(hazard, route, sideOffset * 0.45);
      const flap = Math.sin(time / 300 + phase) > 0 ? 1 : -1;
      return { x: pincer.x + route.sx * sideOffset * 0.45 * flap, y: pincer.y + route.sy * sideOffset * 0.45 * flap };
    }
    if (strategy === 'reply-all-flank') {
      const flank = this.chooseGraphCutNode(hazard, route, sideOffset * 1.15);
      return { x: flank.x - route.fx * 125 + route.sx * wiggle * 65, y: flank.y - route.fy * 125 + route.sy * wiggle * 65 };
    }
    if (strategy === 'spam-filter') {
      return { x: route.px + route.fx * 85 - route.sx * sideOffset * 0.9, y: route.py + route.fy * 85 - route.sy * sideOffset * 0.9 };
    }
    if (strategy === 'story-ring') {
      const ringAngle = time / 640 + phase;
      const ring = 170 + Math.min(150, pressure * 1.3);
      return { x: route.px + Math.cos(ringAngle) * ring + route.fx * 85, y: route.py + Math.sin(ringAngle) * ring + route.fy * 85 };
    }
    if (strategy === 'reels-zigzag') {
      const reel = Math.sin(time / 210 + phase) * sideOffset;
      return { x: route.lead.x + route.sx * reel + route.fx * Math.cos(time / 310 + phase) * 120, y: route.lead.y + route.sy * reel + route.fy * Math.cos(time / 310 + phase) * 120 };
    }
    if (strategy === 'influencer-herd') {
      return { x: route.px - route.fx * 145 + route.sx * (sideOffset * 0.75 + wiggle * 120), y: route.py - route.fy * 145 + route.sy * (sideOffset * 0.75 + wiggle * 120) };
    }
    if (strategy === 'feed-herd') {
      return { x: route.px - route.fx * 85 + route.sx * (sideOffset * 0.65 + wiggle * 90), y: route.py - route.fy * 85 + route.sy * (sideOffset * 0.65 + wiggle * 90) };
    }
    if (strategy === 'friend-request-pack') {
      const packAngle = phase + time / 1250;
      const packRadius = 115 + Math.min(160, pressure * 1.1);
      return { x: route.px + Math.cos(packAngle) * packRadius + route.sx * 95, y: route.py + Math.sin(packAngle) * packRadius + route.sy * 95 };
    }
    if (strategy === 'memory-ambush') {
      const memory = this.chooseGraphCutNode(hazard, route, sideOffset * 0.1);
      return { x: memory.x - route.fx * 160 + route.sx * wiggle * 85, y: memory.y - route.fy * 160 + route.sy * wiggle * 85 };
    }
    if (strategy === 'career-ladder') {
      const rung = routeNodes[Math.floor((time / 820 + phase) % Math.max(1, routeNodes.length))] ?? route.lead;
      return { x: rung.x + route.sx * (sideOffset * 0.5), y: rung.y + route.sy * (sideOffset * 0.5) };
    }
    if (strategy === 'recruiter-cutoff') {
      const recruiter = this.chooseGraphCutNode(hazard, route, sideOffset * 0.7);
      return { x: recruiter.x + route.fx * 95, y: recruiter.y + route.fy * 95 };
    }
    if (strategy === 'network-flank') {
      const network = this.chooseGraphCutNode(hazard, route, sideOffset * 1.25);
      return { x: network.x - route.fx * 35 + route.sx * wiggle * 50, y: network.y - route.fy * 35 + route.sy * wiggle * 50 };
    }
    if (strategy === 'meeting-gridlock') {
      const snapped = snapToMeetingGrid(routeHop);
      return { x: snapped.x + route.sx * 55, y: snapped.y + route.sy * 55 };
    }
    if (strategy === 'calendar-block') {
      const block = this.chooseGraphCutNode(hazard, route, sideOffset * 0.35);
      const snapped = snapToMeetingGrid(block);
      return { x: snapped.x + route.fx * 60, y: snapped.y + route.fy * 60 };
    }
    if (strategy === 'status-mirror') {
      const mirrorLead = Math.min(route.routeDistance, (this.playerSpeed || this.getPlayerSpeed()) * 1.35);
      return { x: route.px + route.fx * mirrorLead + route.sx * Math.sin(time / 600 + phase) * sideOffset, y: route.py + route.fy * mirrorLead + route.sy * Math.sin(time / 600 + phase) * sideOffset };
    }
    if (strategy === 'message-bounce') {
      const bounce = Math.sin(time / 360 + phase);
      return { x: route.lead.x + route.sx * bounce * sideOffset + route.fx * Math.abs(bounce) * 95, y: route.lead.y + route.sy * bounce * sideOffset + route.fy * Math.abs(bounce) * 95 };
    }
    if (strategy === 'group-chat-pack') {
      const packAngle = phase + time / 780;
      const packRadius = 125 + Math.min(165, pressure * 1.2);
      return { x: route.px + Math.cos(packAngle) * packRadius + route.sx * wiggle * 70, y: route.py + Math.sin(packAngle) * packRadius + route.sy * wiggle * 70 };
    }
    if (strategy === 'double-tick') {
      const tick = this.chooseGraphCutNode(hazard, route, sideOffset * 0.32);
      const secondTick = Math.sin(time / 260 + phase) > 0 ? 42 : 104;
      return { x: tick.x + route.fx * secondTick + route.sx * 42, y: tick.y + route.fy * secondTick + route.sy * 42 };
    }
    if (strategy === 'doomscroll-dive') {
      const dive = this.chooseGraphCutNode(hazard, route, sideOffset * 0.18);
      const swoop = Math.sin(time / 390 + phase) * 155;
      return { x: dive.x + route.fx * 160 + route.sx * swoop, y: dive.y + route.fy * 160 + route.sy * swoop };
    }
    if (strategy === 'quote-retweet-cutoff') {
      const quote = this.chooseGraphCutNode(hazard, route, sideOffset * 0.9);
      return { x: quote.x - route.fx * 70 - route.sx * wiggle * 110, y: quote.y - route.fy * 70 - route.sy * wiggle * 110 };
    }
    if (strategy === 'trend-sweep') {
      const sweep = this.chooseGraphCutNode(hazard, route, sideOffset * 1.2);
      return { x: sweep.x + route.sx * Math.sin(time / 240 + phase) * 125, y: sweep.y + route.sy * Math.sin(time / 240 + phase) * 125 };
    }
    return { x: route.lead.x + route.sx * wiggle * 32, y: route.lead.y + route.sy * wiggle * 32 };
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

  collectGrass(tuft) {
    if (!tuft.active || tuft.getData('picked') || this.gameEnded) return;
    tuft.setData('picked', true);
    this.score += 1;
    this.lastGrassTouchAt = this.now();
    this.combo = Math.min(this.combo + 1, 99);
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.chill = Math.min(100, this.chill + 5.2 + Math.min(8, this.combo * 0.45));
    this.sound.play('touch', { volume: 0.25, detune: Phaser.Math.Between(-200, 250) });

    const msg = Phaser.Math.RND.pick(MEMES);
    this.floatText(tuft.x, tuft.y - 38, `${msg}\ncombo x${this.combo}`, '#fff2a8', 16 + Math.min(this.combo, 10));
    this.cameras.main.flash(80, 194, 237, 117, false);

    this.tweens.add({
      targets: tuft,
      scale: 0,
      alpha: 0,
      angle: tuft.angle + 80,
      duration: 180,
      ease: 'Back.in',
      onComplete: () => tuft.destroy(),
    });

    const pressure = this.getPressure();
    this.spawnGrass(getPostCollectGrassSpawnCount(pressure, Math.random), 200, 1900);
    if (this.score % 4 === 0) this.spawnCorporateEnemy();
    if (this.score % 5 === 0) this.spawnCorporateEnemy();
    if (this.score % 12 === 0) {
      this.spawnCorporateEnemy();
      this.spawnCorporateEnemy();
      this.floatText(this.player.x, this.player.y - 110, 'THE BRAND SWARM ESCALATES', '#ffb38f', 22);
    }
    this.refreshHud();
  }

  takeDamage(hazard) {
    if (this.gameEnded) return;
    if (this.now() < this.invulnerableUntil) {
      this.repelHazard(hazard, 340, 520);
      return;
    }
    const pressure = this.getPressure();
    const profile = getCorporateEnemyProfile(hazard?.getData('type') ?? 'youtube');
    this.invulnerableUntil = this.now() + Math.max(560, 940 - pressure * 4.2);
    this.combo = 0;
    const damage = profile.damageBase + pressure * profile.damagePressure;
    this.chill = Math.max(0, this.chill - damage);
    this.sound.play('notification', { volume: 0.42, detune: Phaser.Math.Between(-25, 35) });
    this.player.setTexture('player_hurt').setTint(0xffb5a8);
    this.cameras.main.shake(170, 0.008 + Math.min(0.012, pressure / 15000));
    this.floatText(this.player.x, this.player.y - 90, `${profile.label.toUpperCase()} ${Phaser.Math.RND.pick(HAZARD_MEMES)}`, '#ffb38f', 21);
    if (hazard?.body) this.repelHazard(hazard, 285 + pressure * 0.85, 360);
    this.time.delayedCall(170, () => this.player.clearTint());
    if (this.chill <= 0) this.endGame(false, 'THE BRAND NOTIFICATION SWARM FINALLY DRAGGED YOU BACK INSIDE');
    this.refreshHud();
  }

  deepBreath() {
    if (this.gameEnded || this.now() < this.breatheReadyAt) return;
    const pressure = this.getPressure();
    this.breatheReadyAt = this.now() + Math.max(6800, 8600 - pressure * 6);
    this.invulnerableUntil = Math.max(this.invulnerableUntil, this.now() + 320);
    this.chill = Math.min(100, this.chill + 8);
    this.combo = Math.min(99, this.combo + 1);
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.floatText(this.player.x, this.player.y - 92, 'INHALE... EXHALE...\nSMALL OPENING', '#b9f28e', 20);
    const ring = this.add.circle(this.player.x, this.player.y, 24, 0xb9f28e, 0.11).setStrokeStyle(3, 0xf7f0bb, 0.72).setDepth(70);
    this.tweens.add({ targets: ring, radius: BREATHE_OUTER_RADIUS, alpha: 0, duration: 480, ease: 'Sine.out', onComplete: () => ring.destroy() });
    this.corporateEnemies.getChildren().forEach((hazard) => {
      if (!hazard.body) return;
      const dist = Phaser.Math.Distance.Between(hazard.x, hazard.y, this.player.x, this.player.y);
      if (dist > BREATHE_OUTER_RADIUS) return;
      const falloff = dist <= BREATHE_CORE_RADIUS ? 1 : 1 - ((dist - BREATHE_CORE_RADIUS) / (BREATHE_OUTER_RADIUS - BREATHE_CORE_RADIUS)) * 0.75;
      this.repelHazard(hazard, BREATHE_FORCE * falloff, BREATHE_REPEL_MS);
    });
    this.refreshHud();
  }

  floatText(x, y, message, color = '#fff2a8', size = 18) {
    const text = this.add.text(x, y, message, {
      fontFamily: 'Inter, sans-serif',
      fontSize: `${size}px`,
      fontStyle: '900',
      color,
      align: 'center',
      stroke: '#071008',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(3000);
    this.tweens.add({
      targets: text,
      y: y - 54,
      alpha: 0,
      scale: 1.08,
      duration: 980,
      ease: 'Cubic.out',
      onComplete: () => text.destroy(),
    });
  }

  refreshHud() {
    if (!this.scoreText || !this.timerText || !this.meterBar) return;
    this.scoreText.setText(`score: ${this.score}   combo: x${Math.max(1, this.combo)}`);
    this.timerText.setText(`survived: ${formatDuration(this.survivalTime)}`);
    const chillPct = Phaser.Math.Clamp(this.chill, 0, 100);
    const barW = (this._meterW || 330) * (chillPct / 100);
    const barH = this._narrow ? 10 : 16;
    this.meterBar.setDisplaySize(barW, barH);
    this.meterBar.setFillStyle(this.chill > 55 ? 0x91d969 : this.chill > 25 ? 0xffd36e : 0xff7f6e, 1);
    const breathWait = Math.max(0, (this.breatheReadyAt - this.now()) / 1000);
    const breathLabel = this._narrow
      ? (breathWait > 0 ? `${breathWait.toFixed(1)}s` : 'ready')
      : (breathWait > 0 ? `ctrl breathe ${breathWait.toFixed(1)}s` : 'ctrl/breathe ready');
    this.breathText.setText(breathLabel);
    const corporateCount = this.corporateEnemies?.getLength() ?? 0;
    this.swarmText.setText(this._narrow ? `⚠ ${corporateCount}` : `brand swarm: ${corporateCount}`);
    const corporateEnemyCounts = Object.fromEntries(
      CORPORATE_ENEMY_TYPES.map((type) => [
        type,
        this.corporateEnemies?.getChildren().filter((hazard) => hazard.getData('type') === type).length ?? 0,
      ]),
    );
    window.__GTS_STATE__ = {
      score: this.score,
      bestCombo: this.bestCombo,
      chill: Math.round(this.chill),
      survived: Number(this.survivalTime.toFixed(1)),
      playerSpeed: Math.round(this.playerSpeed),
      threatSpeed: Math.round(this.getThreatSpeed()),
      speedDrainMultiplier: Number(getSpeedChillDrainMultiplier(this.playerSpeed || this.getPlayerSpeed()).toFixed(2)),
      noGrassSeconds: Number(this.getNoGrassSeconds(this.now()).toFixed(1)),
      straightRunSeconds: Number(this.getStraightRunSeconds(this.now()).toFixed(1)),
      chillDrainRate: Number(this.getChillDrainRate(this.now()).toFixed(2)),
      corporateEnemies: corporateCount,
      corporateEnemyCounts,
      chunks: this.chunks?.size ?? 0,
      ended: this.gameEnded,
      breathReady: breathWait <= 0,
    };
  }

  maintainGrassField(time) {
    if (time < this.nextGrassMaintainAt) return;
    this.nextGrassMaintainAt = time + 600;
    // Chunks handle base grass population and culling.
    // Only clean up orphan tufts that drifted beyond chunk range (replenishment leftovers).
    const maxDistance = CHUNK_SIZE * (CHUNK_CULL_RADIUS + 1);
    this.grass.getChildren().forEach((tuft) => {
      if (!tuft.active) return;
      const d = Phaser.Math.Distance.Between(tuft.x, tuft.y, this.player.x, this.player.y);
      if (d > maxDistance) tuft.destroy();
    });
  }

  maintainThreatLevel(time) {
    if (time < this.nextThreatMaintainAt) return;
    const pressure = this.getPressure();
    this.nextThreatMaintainAt = time + Math.max(280, 980 - pressure * 12);

    const despawnDistance = 2500 + Math.min(760, pressure * 13);
    this.corporateEnemies.getChildren().forEach((hazard) => {
      if (Phaser.Math.Distance.Between(hazard.x, hazard.y, this.player.x, this.player.y) > despawnDistance) hazard.destroy();
    });

    const burst = 1 + Math.floor(Math.min(5, pressure / 27));
    let budget = burst;
    while (this.corporateEnemies.getLength() < this.targetCorporateEnemyCount() && budget > 0) {
      this.spawnCorporateEnemy();
      budget -= 1;
    }
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
    const pressure = this.getPressure();
    this.playerSpeed = this.getPlayerSpeed();

    this.scrollBackdrop();
    this.updateWorldChunks();
    this.maintainGrassField(time);

    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;
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

    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy);
      vx /= len; vy /= len;
      this.player.setVelocity(vx * this.playerSpeed, vy * this.playerSpeed);
      this.player.setFlipX(vx < -0.05);
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'player_walk') this.player.play('player_walk');
      this.player.anims.timeScale = Math.min(2.4, 1 + (this.playerSpeed - PLAYER_BASE_SPEED) / 240);
      if (time - this.lastStep > Math.max(130, 250 - (this.playerSpeed - PLAYER_BASE_SPEED) * 0.35)) {
        this.lastStep = time;
        this.sound.play(Phaser.Math.RND.pick(['foot0', 'foot1']), { volume: 0.045, detune: Phaser.Math.Between(-80, 80) });
      }
    } else {
      this.player.setVelocity(0, 0);
      this.player.stop().setTexture('player_stand');
    }

    this.updateStraightRun(time, vx, vy);
    this.chill = Math.max(0, this.chill - dt * this.getChillDrainRate(time));

    if (Phaser.Input.Keyboard.JustDown(this.keys.SHIFT) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.ctrlKey) || window.__GTS_MINPUT__?.breathe) {
      if (window.__GTS_MINPUT__) window.__GTS_MINPUT__.breathe = false;
      this.deepBreath();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) this.scene.restart();

    this.updateHazards(time);
    this.maintainThreatLevel(time);

    if (this.chill <= 0) this.endGame(false, 'CHILL METER EMPTY: THE SWARM DRAGGED YOU BACK INSIDE');
    this.refreshHud();
  }

  updateHazards(time) {
    const pressure = this.getPressure();
    const threatSpeed = this.getThreatSpeed();

    this.corporateEnemies.getChildren().forEach((enemy) => {
      if (!enemy.body) return;
      const d = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      if (d > 3500) {
        enemy.destroy();
        return;
      }

      if (time < (enemy.getData('repelledUntil') ?? 0)) return;

      const profile = getCorporateEnemyProfile(enemy.getData('type'));
      this.rotateThreatStrategy(enemy, profile.strategies, time);
      if (time > enemy.getData('lungeAt')) {
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
        const target = this.getCorporateThreatTarget(enemy, profile, time);
        enemy.setData('targetX', target.x);
        enemy.setData('targetY', target.y);
      }
      const target = {
        x: enemy.getData('targetX') ?? this.player.x,
        y: enemy.getData('targetY') ?? this.player.y,
      };
      this.moveHazardToward(enemy, target, threatSpeed);
      // Restore original Hermes walking animation: dynamic flip + timeScale
      if (profile.animationKey) {
        enemy.setFlipX(enemy.body.velocity.x >= 0);
        enemy.anims.timeScale = Math.min(2.8, 1 + pressure / 62);
      }
    });
  }

  endGame(won, reason) {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.physics.pause();
    this.player.setTexture('player_hurt');
    this.cameras.main.stopFollow();
    window.__GTS_STATE__ = {
      score: this.score,
      bestCombo: this.bestCombo,
      chill: Math.round(this.chill),
      survived: Number(this.survivalTime.toFixed(1)),
      ended: true,
      won: false,
      breathReady: false,
    };

    const cw = this.cameras.main.width;
    const ch = this.cameras.main.height;
    const narrow = cw < 600;
    const panelW = narrow ? cw - 40 : 720;
    const panelH = narrow ? 250 : 330;
    const titleFont = narrow ? '24px' : '42px';
    const bodyFont = narrow ? '15px' : '22px';
    const footFont = narrow ? '13px' : '20px';
    const wrapW = panelW - 60;

    const overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(5000);
    overlay.add(this.add.rectangle(cw / 2, ch / 2, cw, ch, 0x071008, 0.78));
    overlay.add(this.add.rectangle(cw / 2, ch / 2, panelW, panelH, 0x351b16, 0.93)
      .setStrokeStyle(narrow ? 3 : 4, 0xffb38f, 0.9));
    overlay.add(this.add.text(cw / 2, ch / 2 - panelH * 0.29, 'SWARMED', {
      fontFamily: 'Inter, sans-serif', fontSize: titleFont, fontStyle: '900', color: '#ffb38f',
      stroke: '#071008', strokeThickness: narrow ? 4 : 8,
    }).setOrigin(0.5));
    overlay.add(this.add.text(cw / 2, ch / 2 - panelH * 0.08, reason, {
      fontFamily: 'Inter, sans-serif', fontSize: bodyFont, fontStyle: '800', color: '#f7f0bb', align: 'center',
      wordWrap: { width: wrapW }, stroke: '#071008', strokeThickness: narrow ? 3 : 5,
    }).setOrigin(0.5));

    const foot = this.add.text(cw / 2, ch / 2 + panelH * 0.22, `final score: ${this.score}\nsurvived: ${formatDuration(this.survivalTime)}   best combo: x${Math.max(1, this.bestCombo)}\nrestart unlocks in ${(RESTART_LOCK_MS / 1000).toFixed(1)}s`, {
      fontFamily: 'Inter, sans-serif', fontSize: footFont, fontStyle: '900', color: '#bde48b', align: 'center', lineSpacing: narrow ? 4 : 6,
      stroke: '#071008', strokeThickness: narrow ? 3 : 5,
    }).setOrigin(0.5);
    overlay.add(foot);

    const restart = () => this.scene.restart();
    this.time.delayedCall(RESTART_LOCK_MS, () => {
      if (!this.scene.isActive()) return;
      foot.setText(`final score: ${this.score}\nsurvived: ${formatDuration(this.survivalTime)}   best combo: x${Math.max(1, this.bestCombo)}\npress R or click to restart`);
      this.input.keyboard.once('keydown-R', restart);
      this.input.once('pointerdown', restart);
    });
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#122414',
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
  },
  scene: [MenuScene, GameScene],
};

document.fonts.ready.then(() => {
  window.__GTS_BOOTING__ = true;
  window.__GTS_GAME__ = new Phaser.Game(config);
});
