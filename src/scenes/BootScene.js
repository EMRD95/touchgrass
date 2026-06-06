import Phaser from 'phaser';
import { ASSET } from '../utils/constants.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    const cw = this.scale.width;
    const ch = this.scale.height;

    const barW = Math.min(400, cw - 48);
    const barH = 14;
    const bg = this.add.rectangle(cw / 2, ch / 2, barW + 8, barH + 8, 0x071008, 0.9).setStrokeStyle(2, 0xf7f0bb, 0.35);
    const bar = this.add.rectangle(cw / 2 - barW / 2, ch / 2, 0, barH, 0x91d969, 1).setOrigin(0, 0.5);
    const label = this.add.text(cw / 2, ch / 2 - 28, 'loading grass...', {
      fontFamily: 'Inter, sans-serif', fontSize: '16px', fontStyle: '800', color: '#f7f0bb',
    }).setOrigin(0.5);

    this.load.on('progress', (v) => {
      bar.setDisplaySize(barW * v, barH);
      label.setText(`loading grass... ${Math.round(v * 100)}%`);
    });
    this.load.on('complete', () => {
      label.setText('ready');
      this.tweens.add({ targets: [bg, bar, label], alpha: 0, duration: 300, onComplete: () => this.scene.start('MenuScene') });
    });

    // Reference images
    this.load.image('reference', ASSET('reference/grass_touching_simulator.webp'));
    this.load.image('reference_mobile', ASSET('reference/grass_touching_simulator_mobile.png'));

    // Tiles
    this.load.image('grass0', ASSET('tiny-town/grass_0.png'));
    this.load.image('grass1', ASSET('tiny-town/grass_1.png'));
    this.load.image('grass2', ASSET('tiny-town/grass_2.png'));
    this.load.image('flowers', ASSET('tiny-town/grass_flowers.png'));
    this.load.image('path', ASSET('tiny-town/path_0.png'));
    this.load.image('tree0', ASSET('tiny-town/tree_0.png'));
    this.load.image('tree1', ASSET('tiny-town/tree_1.png'));
    this.load.image('tree2', ASSET('tiny-town/tree_2.png'));

    // Foliage
    ['tuft_0', 'tuft_1', 'tuft_2', 'tuft_3'].forEach((k) => this.load.image(k, ASSET(`foliage/${k}.png`)));

    // Player
    this.load.image('player_stand', ASSET('characters/player_stand.png'));
    this.load.image('player_walk1', ASSET('characters/player_walk1.png'));
    this.load.image('player_walk2', ASSET('characters/player_walk2.png'));
    this.load.image('player_cheer', ASSET('characters/player_cheer.png'));
    this.load.image('player_hurt', ASSET('characters/player_hurt.png'));

    // Corporate logos
    [
      'tiktok', 'youtube', 'chatgpt', 'discord', 'google', 'wikipedia',
      'gmail', 'instagram', 'facebook', 'linkedin', 'teams', 'whatsapp', 'twitter',
    ].forEach((k) => this.load.image(`logo_${k}`, ASSET(`corporate/${k}.svg`)));

    // Hermes enemies
    this.load.image('enemy_hermes_walk1', ASSET('characters/hermes_walk1.png'));
    this.load.image('enemy_hermes_walk2', ASSET('characters/hermes_walk2.png'));

    // Items
    this.load.image('water_bottle', ASSET('items/water_bottle.svg'));

    // Audio
    this.load.audio('foot0', ASSET('audio/footstep_grass_000.ogg'));
    this.load.audio('foot1', ASSET('audio/footstep_grass_001.ogg'));
    this.load.audio('touch', ASSET('audio/touch.ogg'));
    this.load.audio('notification', ASSET('audio/notification_chime.ogg'));
    this.load.audio('hit', ASSET('audio/hit.ogg'));
  }

  create() {
    // Animations
    if (!this.anims.exists('player_walk')) {
      this.anims.create({ key: 'player_walk', frames: [{ key: 'player_walk1' }, { key: 'player_walk2' }], frameRate: 7, repeat: -1 });
    }
    if (!this.anims.exists('hermes_walk')) {
      this.anims.create({ key: 'hermes_walk', frames: [{ key: 'enemy_hermes_walk1' }, { key: 'enemy_hermes_walk2' }], frameRate: 6, repeat: -1 });
    }
  }
}
