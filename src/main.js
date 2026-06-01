import Phaser from 'phaser';
import './style.css';

const GAME_W = 1376;
const GAME_H = 768;
const WORLD_W = 2200;
const WORLD_H = 1400;
const WIN_TOUCHES = 30;

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
  'DOOMSCROLL DAMAGE',
  'PHONE AGGRO',
  'ALGORITHM CRIT!',
  'INDOOR GOBLIN BITES',
  'NOTIFICATION PARALYSIS',
];

const ASSET = (path) => `assets/${path}`;

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
    this.load.image('zombie_walk1', ASSET('characters/zombie_walk1.png'));
    this.load.image('zombie_walk2', ASSET('characters/zombie_walk2.png'));
    this.load.audio('foot0', ASSET('audio/footstep_grass_000.ogg'));
    this.load.audio('foot1', ASSET('audio/footstep_grass_001.ogg'));
    this.load.audio('touch', ASSET('audio/touch.ogg'));
    this.load.audio('hit', ASSET('audio/hit.ogg'));
  }

  create() {
    window.__GTS_READY__ = 'menu';
    window.__GTS_MENU_EXACT_IMAGE__ = true;

    const bg = this.add.image(GAME_W / 2, GAME_H / 2, 'reference')
      .setDisplaySize(GAME_W, GAME_H)
      .setDepth(0);

    // Keep the menu visually identical to the supplied 1376x768 reference image.
    // Interaction is deliberately invisible: the image itself is the UI.
    bg.setInteractive({ useHandCursor: true });
    this.input.setDefaultCursor('pointer');

    const start = () => this.scene.start('GameScene');
    bg.on('pointerdown', start);
    this.input.keyboard.on('keydown-SPACE', start);
    this.input.keyboard.on('keydown-ENTER', start);
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    window.__GTS_READY__ = 'game';
    this.score = 0;
    this.chill = 82;
    this.timeLeft = 90;
    this.combo = 0;
    this.lastStep = 0;
    this.invulnerableUntil = this.time.now + 20000;
    this.breatheReadyAt = 0;
    this.gameEnded = false;
    this.pointerTarget = null;

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    this.add.tileSprite(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 'grass0').setDepth(-50);
    this.add.tileSprite(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 'grass1')
      .setAlpha(0.18).setDepth(-49).setTilePosition(7, 11);
    this.add.tileSprite(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 'grass2')
      .setAlpha(0.12).setDepth(-48).setTilePosition(17, 3);

    this.decorateWorld();

    this.player = this.physics.add.sprite(WORLD_W / 2, WORLD_H / 2, 'player_stand')
      .setScale(0.62)
      .setDepth(90)
      .setCollideWorldBounds(true);
    this.player.body.setSize(38, 78).setOffset(21, 28);

    this.anims.create({ key: 'player_walk', frames: [{ key: 'player_walk1' }, { key: 'player_walk2' }], frameRate: 7, repeat: -1 });
    this.anims.create({ key: 'doom_walk', frames: [{ key: 'zombie_walk1' }, { key: 'zombie_walk2' }], frameRate: 5, repeat: -1 });

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(80, 60);

    this.grass = this.physics.add.group({ allowGravity: false, immovable: true });
    this.hazards = this.physics.add.group({ allowGravity: false });
    this.phones = this.physics.add.group({ allowGravity: false });

    this.spawnGrass(20);
    for (let i = 0; i < 4; i += 1) this.spawnDoomGoblin();
    for (let i = 0; i < 3; i += 1) this.spawnPhone();

    this.physics.add.overlap(this.player, this.grass, (_, tuft) => this.collectGrass(tuft));
    this.physics.add.overlap(this.player, this.hazards, (_, hazard) => this.takeDamage('goblin', hazard));
    this.physics.add.overlap(this.player, this.phones, (_, hazard) => this.takeDamage('phone', hazard));

    this.keys = this.input.keyboard.addKeys('W,A,S,D,SHIFT,R,SPACE');
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.on('pointerdown', (pointer) => {
      if (this.gameEnded) return;
      const worldPoint = pointer.positionToCamera(this.cameras.main);
      this.pointerTarget = new Phaser.Math.Vector2(worldPoint.x, worldPoint.y);
      this.floatText(worldPoint.x, worldPoint.y - 30, 'going outside...', '#f7f0bb', 16);
    });

    this.createHud();
    this.floatText(this.player.x, this.player.y - 80, 'TOUCH GRASS TO BEGIN HEALING', '#fff2a8', 18);
    this.refreshHud();
  }

  decorateWorld() {
    const decoKeys = ['flowers', 'grass1', 'grass2', 'path'];
    for (let i = 0; i < 360; i += 1) {
      const key = Phaser.Math.RND.pick(decoKeys);
      const img = this.add.image(
        Phaser.Math.Between(30, WORLD_W - 30),
        Phaser.Math.Between(30, WORLD_H - 30),
        key,
      ).setDepth(Phaser.Math.Between(-30, 10));
      img.setScale(key === 'path' ? Phaser.Math.FloatBetween(1.4, 2.6) : Phaser.Math.FloatBetween(1.1, 2.2));
      img.setAlpha(key === 'path' ? 0.35 : Phaser.Math.FloatBetween(0.28, 0.9));
      img.setAngle(Phaser.Math.Between(0, 3) * 90);
    }

    this.trees = this.physics.add.staticGroup();
    for (let i = 0; i < 75; i += 1) {
      const key = Phaser.Math.RND.pick(['tree0', 'tree1', 'tree2']);
      const tree = this.trees.create(Phaser.Math.Between(70, WORLD_W - 70), Phaser.Math.Between(70, WORLD_H - 70), key);
      tree.setScale(Phaser.Math.FloatBetween(2.4, 3.8)).setDepth(tree.y / 10);
      tree.refreshBody();
      tree.body.setSize(14, 11).setOffset(1, 5);
    }
  }

  createHud() {
    this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(2000);
    const panel = this.add.rectangle(16, 16, 928, 86, 0x102013, 0.74)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xf7f0bb, 0.32);
    this.scoreText = this.add.text(34, 28, '', {
      fontFamily: 'Inter, sans-serif', fontSize: '21px', fontStyle: '900', color: '#fff2a8',
      stroke: '#071008', strokeThickness: 4,
    });
    this.timerText = this.add.text(752, 28, '', {
      fontFamily: 'Inter, sans-serif', fontSize: '21px', fontStyle: '900', color: '#fff2a8',
      stroke: '#071008', strokeThickness: 4,
    });
    this.meterLabel = this.add.text(34, 62, 'chill meter', {
      fontFamily: 'Inter, sans-serif', fontSize: '13px', fontStyle: '900', color: '#cfe99d',
    });
    this.meterBg = this.add.rectangle(136, 70, 330, 16, 0x071008, 0.8).setOrigin(0, 0.5);
    this.meterBar = this.add.rectangle(136, 70, 190, 16, 0x91d969, 1).setOrigin(0, 0.5);
    this.breathText = this.add.text(505, 62, '', {
      fontFamily: 'Inter, sans-serif', fontSize: '13px', fontStyle: '900', color: '#f7f0bb',
    });
    this.hud.add([panel, this.scoreText, this.timerText, this.meterLabel, this.meterBg, this.meterBar, this.breathText]);
  }

  spawnGrass(count = 1) {
    for (let i = 0; i < count; i += 1) {
      const key = Phaser.Math.RND.pick(['tuft_0', 'tuft_1', 'tuft_2', 'tuft_3']);
      const tuft = this.physics.add.image(Phaser.Math.Between(80, WORLD_W - 80), Phaser.Math.Between(110, WORLD_H - 80), key)
        .setScale(Phaser.Math.FloatBetween(0.036, 0.058))
        .setTint(Phaser.Math.RND.pick([0x74c857, 0x93d867, 0xb7e66f, 0x5eac48]))
        .setDepth(45)
        .setAlpha(0.96);
      tuft.body.setSize(560, 460, true);
      tuft.setData('picked', false);
      this.grass.add(tuft);
      this.tweens.add({ targets: tuft, angle: Phaser.Math.Between(-7, 7), duration: Phaser.Math.Between(900, 1300), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }

  randomPointAwayFromPlayer(minDistance = 420) {
    const cx = this.player?.x ?? WORLD_W / 2;
    const cy = this.player?.y ?? WORLD_H / 2;
    for (let i = 0; i < 80; i += 1) {
      const x = Phaser.Math.Between(120, WORLD_W - 120);
      const y = Phaser.Math.Between(120, WORLD_H - 120);
      if (Phaser.Math.Distance.Between(x, y, cx, cy) >= minDistance) return { x, y };
    }
    return { x: Phaser.Math.Between(120, WORLD_W - 120), y: Phaser.Math.Between(120, WORLD_H - 120) };
  }

  spawnDoomGoblin() {
    const { x, y } = this.randomPointAwayFromPlayer(520);
    const goblin = this.physics.add.sprite(x, y, 'zombie_walk1')
      .setScale(0.55)
      .setTint(0xa6d88c)
      .setDepth(80)
      .play('doom_walk');
    goblin.body.setSize(38, 72).setOffset(21, 32);
    goblin.setBounce(1, 1).setCollideWorldBounds(true);
    goblin.setData('wanderAt', 0);
    goblin.setData('label', Phaser.Math.RND.pick(['chronically online', 'reply guy', 'tab hoarder', 'indoor goblin']));
    this.randomGoblinVelocity(goblin);
    this.hazards.add(goblin);
  }

  spawnPhone() {
    const { x, y } = this.randomPointAwayFromPlayer(460);
    const phone = this.add.text(x, y, '📱', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '34px',
      stroke: '#071008',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(100);
    this.physics.add.existing(phone);
    phone.body.setSize(34, 34, true);
    phone.body.setCollideWorldBounds(true).setBounce(1, 1);
    phone.body.setVelocity(Phaser.Math.Between(-80, 80), Phaser.Math.Between(-80, 80));
    phone.setData('wanderAt', 0);
    this.phones.add(phone);
    this.tweens.add({ targets: phone, angle: 14, scaleX: 1.16, scaleY: 1.16, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  randomGoblinVelocity(goblin) {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const speed = Phaser.Math.Between(55, 105);
    goblin.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  collectGrass(tuft) {
    if (!tuft.active || tuft.getData('picked') || this.gameEnded) return;
    tuft.setData('picked', true);
    this.score += 1;
    this.combo = Math.min(this.combo + 1, 9);
    this.chill = Math.min(100, this.chill + 7 + this.combo * 0.6);
    this.timeLeft = Math.min(99, this.timeLeft + 0.8);
    this.sound.play('touch', { volume: 0.25, detune: Phaser.Math.Between(-200, 250) });

    const msg = Phaser.Math.RND.pick(MEMES);
    this.floatText(tuft.x, tuft.y - 38, `${msg}\ncombo x${this.combo}`, '#fff2a8', 16 + this.combo);
    this.cameras.main.flash(90, 194, 237, 117, false);

    this.tweens.add({
      targets: tuft,
      scale: 0,
      alpha: 0,
      angle: tuft.angle + 80,
      duration: 180,
      ease: 'Back.in',
      onComplete: () => tuft.destroy(),
    });
    this.spawnGrass(1);

    if (this.score % 7 === 0) this.spawnDoomGoblin();
    if (this.score % 11 === 0) this.spawnPhone();
    if (this.score >= WIN_TOUCHES) this.endGame(true, 'YOU TOUCHED ENOUGH GRASS TO BECOME REAL');
    this.refreshHud();
  }

  repelHazard(hazard, force = 320) {
    if (!hazard?.body) return;
    const dx = hazard.x - this.player.x;
    const dy = hazard.y - this.player.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    hazard.body.setVelocity((dx / len) * force, (dy / len) * force);
  }

  takeDamage(kind, hazard) {
    if (this.gameEnded) return;
    if (this.time.now < this.invulnerableUntil) {
      this.repelHazard(hazard, 240);
      return;
    }
    this.invulnerableUntil = this.time.now + 1250;
    this.combo = 0;
    this.chill = Math.max(0, this.chill - (kind === 'phone' ? 13 : 10));
    this.sound.play('hit', { volume: 0.28 });
    this.player.setTexture('player_hurt').setTint(0xffb5a8);
    this.cameras.main.shake(170, 0.008);
    this.floatText(this.player.x, this.player.y - 90, Phaser.Math.RND.pick(HAZARD_MEMES), '#ffb38f', 21);
    if (hazard?.body) this.repelHazard(hazard, 320);
    this.time.delayedCall(170, () => this.player.clearTint());
    if (this.chill <= 0) this.endGame(false, 'THE ALGORITHM DRAGGED YOU BACK INSIDE');
    this.refreshHud();
  }

  deepBreath() {
    if (this.gameEnded || this.time.now < this.breatheReadyAt) return;
    this.breatheReadyAt = this.time.now + 6500;
    this.chill = Math.min(100, this.chill + 16);
    this.combo = Math.min(9, this.combo + 1);
    this.floatText(this.player.x, this.player.y - 92, 'INHALE... EXHALE...\nDOOMSCROLL PUSHBACK', '#b9f28e', 20);
    const ring = this.add.circle(this.player.x, this.player.y, 28, 0xb9f28e, 0.14).setStrokeStyle(3, 0xf7f0bb, 0.8).setDepth(70);
    this.tweens.add({ targets: ring, radius: 210, alpha: 0, duration: 650, ease: 'Sine.out', onComplete: () => ring.destroy() });
    [...this.hazards.getChildren(), ...this.phones.getChildren()].forEach((hazard) => {
      const dx = hazard.x - this.player.x;
      const dy = hazard.y - this.player.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      if (len < 250 && hazard.body) hazard.body.setVelocity((dx / len) * 250, (dy / len) * 250);
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
    const remaining = Math.max(0, Math.ceil(this.timeLeft));
    this.scoreText.setText(`grass touched: ${this.score}/${WIN_TOUCHES}   combo: x${Math.max(1, this.combo)}`);
    this.timerText.setText(`outside: ${remaining}s`);
    const width = Phaser.Math.Clamp(this.chill, 0, 100) * 3.3;
    this.meterBar.setDisplaySize(width, 16);
    this.meterBar.setFillStyle(this.chill > 55 ? 0x91d969 : this.chill > 25 ? 0xffd36e : 0xff7f6e, 1);
    const breathWait = Math.max(0, (this.breatheReadyAt - this.time.now) / 1000);
    this.breathText.setText(breathWait > 0 ? `SHIFT breathe cooldown: ${breathWait.toFixed(1)}s` : 'SHIFT breathe: ready');
    window.__GTS_STATE__ = { score: this.score, chill: Math.round(this.chill), timeLeft: Number(this.timeLeft.toFixed(1)), ended: this.gameEnded };
  }

  update(time, deltaMs) {
    if (this.gameEnded) return;
    const dt = deltaMs / 1000;
    this.timeLeft -= dt;
    this.chill = Math.max(0, this.chill - dt * 0.35);

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
      this.player.setVelocity(vx * 230, vy * 230);
      this.player.setFlipX(vx < -0.05);
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'player_walk') this.player.play('player_walk');
      if (time - this.lastStep > 250) {
        this.lastStep = time;
        this.sound.play(Phaser.Math.RND.pick(['foot0', 'foot1']), { volume: 0.045, detune: Phaser.Math.Between(-80, 80) });
      }
    } else {
      this.player.setVelocity(0, 0);
      this.player.stop().setTexture('player_stand');
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.SHIFT) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) this.deepBreath();
    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) this.scene.restart();

    this.updateHazards(time);

    if (this.timeLeft <= 0) this.endGame(this.score >= 18, this.score >= 18 ? 'YOU SURVIVED A WHOLE OUTSIDE SESSION' : 'TOUCHING GRASS REMAINS ON THE ROADMAP');
    if (this.chill <= 0) this.endGame(false, 'CHILL METER EMPTY: BACK TO THE CHAIR');
    this.refreshHud();
  }

  updateHazards(time) {
    this.hazards.getChildren().forEach((goblin) => {
      if (!goblin.body) return;
      const d = Phaser.Math.Distance.Between(goblin.x, goblin.y, this.player.x, this.player.y);
      const chaseRange = this.score < 3 ? 170 : 320;
      if (d < chaseRange) {
        this.physics.moveToObject(goblin, this.player, 56 + this.score * 1.8);
      } else if (time > goblin.getData('wanderAt')) {
        goblin.setData('wanderAt', time + Phaser.Math.Between(900, 1800));
        this.randomGoblinVelocity(goblin);
      }
      goblin.setFlipX(goblin.body.velocity.x < 0);
    });

    this.phones.getChildren().forEach((phone) => {
      if (!phone.body) return;
      if (time > phone.getData('wanderAt')) {
        phone.setData('wanderAt', time + Phaser.Math.Between(950, 1500));
        const target = Phaser.Math.Angle.Between(phone.x, phone.y, this.player.x, this.player.y) + Phaser.Math.FloatBetween(-0.7, 0.7);
        const speed = Phaser.Math.Between(60, 125);
        phone.body.setVelocity(Math.cos(target) * speed, Math.sin(target) * speed);
      }
    });
  }

  endGame(won, reason) {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.physics.pause();
    this.player.setTexture(won ? 'player_cheer' : 'player_hurt');
    this.cameras.main.stopFollow();
    window.__GTS_STATE__ = { score: this.score, chill: Math.round(this.chill), timeLeft: Number(this.timeLeft.toFixed(1)), ended: true, won };

    const overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(5000);
    overlay.add(this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x071008, 0.78));
    overlay.add(this.add.rectangle(GAME_W / 2, GAME_H / 2, 690, 310, won ? 0x20371d : 0x351b16, 0.93)
      .setStrokeStyle(4, won ? 0xfff2a8 : 0xffb38f, 0.9));
    overlay.add(this.add.text(GAME_W / 2, 207, won ? 'YOU ARE NATURE NOW' : 'GRASS DENIED', {
      fontFamily: 'Inter, sans-serif', fontSize: '42px', fontStyle: '900', color: won ? '#fff2a8' : '#ffb38f',
      stroke: '#071008', strokeThickness: 8,
    }).setOrigin(0.5));
    overlay.add(this.add.text(GAME_W / 2, 275, reason, {
      fontFamily: 'Inter, sans-serif', fontSize: '22px', fontStyle: '800', color: '#f7f0bb', align: 'center',
      wordWrap: { width: 560 }, stroke: '#071008', strokeThickness: 5,
    }).setOrigin(0.5));
    overlay.add(this.add.text(GAME_W / 2, 345, `final grass touches: ${this.score}/${WIN_TOUCHES}\npress R or click to restart`, {
      fontFamily: 'Inter, sans-serif', fontSize: '20px', fontStyle: '900', color: '#bde48b', align: 'center', lineSpacing: 6,
      stroke: '#071008', strokeThickness: 5,
    }).setOrigin(0.5));

    const restart = () => this.scene.restart();
    this.input.keyboard.once('keydown-R', restart);
    this.input.once('pointerdown', restart);
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
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MenuScene, GameScene],
};

document.fonts.ready.then(() => {
  window.__GTS_BOOTING__ = true;
  window.__GTS_GAME__ = new Phaser.Game(config);
});
