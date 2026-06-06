import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { LeaderboardScene } from './scenes/LeaderboardScene.js';
import { ProfileScene } from './scenes/ProfileScene.js';
import { auth } from './systems/Auth.js';
import './style.css';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 1376,
  height: 768,
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
  scene: [BootScene, MenuScene, GameScene, GameOverScene, LeaderboardScene, ProfileScene],
};

document.fonts.ready.then(() => {
  window.__GTS_BOOTING__ = true;
  window.__GTS_GAME__ = new Phaser.Game(config);
});

auth.ensureGuest();
auth.init().then(() => {
  // Google script may load in the background, but gameplay always starts in guest mode.
  auth.ensureGuest();
});
