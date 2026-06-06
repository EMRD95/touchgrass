import Phaser from 'phaser';
import { formatDuration } from '../utils/helpers.js';
import { createButton, createPanel, createLabel } from '../ui/UIFactory.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data) {
    const cw = this.scale.width;
    const ch = this.scale.height;
    const narrow = cw < 600;

    const overlay = createPanel(this, cw / 2, ch / 2, cw, ch, { fill: 0x071008, fillAlpha: 0.82, depth: 5000 });

    const panelW = narrow ? cw - 32 : 760;
    const panelH = narrow ? ch - 40 : 520;
    const panel = createPanel(this, cw / 2, ch / 2, panelW, panelH, { fill: 0x351b16, fillAlpha: 0.94, stroke: 0xffb38f, strokeAlpha: 0.9, depth: 5001 });

    const title = createLabel(this, cw / 2, ch / 2 - panelH / 2 + (narrow ? 28 : 44), 'SWARMED', {
      fontSize: narrow ? '26px' : '44px', color: '#ffb38f', depth: 5002, strokeThickness: narrow ? 4 : 8, originX: 0.5, originY: 0.5,
    });

    const reasonY = ch / 2 - panelH / 2 + (narrow ? 62 : 92);
    createLabel(this, cw / 2, reasonY, data.reason, {
      fontSize: narrow ? '13px' : '18px', color: '#f7f0bb', depth: 5002, align: 'center', originX: 0.5, originY: 0.5,
      wordWrap: { width: panelW - 40 },
    });

    // Stats grid
    const statsY = reasonY + (narrow ? 32 : 52);
    const stats = [
      `Score: ${data.score}`,
      `Survived: ${formatDuration(data.survivalTime)}`,
      `Best Combo: x${Math.max(1, data.bestCombo)}`,
      `Wave Reached: ${data.wave}`,
      `Grass Collected: ${data.runStats.grassCollected}`,
      `Enemies Destroyed: ${data.runStats.enemiesDestroyed}`,
      `Bosses Defeated: ${data.runStats.bossesDefeated}`,
      `Power-ups: ${data.runStats.powerupsCollected}`,
    ];
    const colCount = narrow ? 1 : 2;
    const colW = (panelW - 48) / colCount;
    stats.forEach((s, i) => {
      const col = i % colCount;
      const row = Math.floor(i / colCount);
      createLabel(this, cw / 2 - panelW / 2 + 24 + col * colW, statsY + row * (narrow ? 20 : 26), s, {
        fontSize: narrow ? '12px' : '15px', color: '#bde48b', depth: 5002, originX: 0, originY: 0,
      });
    });

    // XP gain
    const xpY = statsY + Math.ceil(stats.length / colCount) * (narrow ? 22 : 28) + 6;
    if (data.xpGain > 0) {
      createLabel(this, cw / 2, xpY, `+${data.xpGain} XP`, {
        fontSize: narrow ? '14px' : '18px', color: '#ffd36e', depth: 5002, originX: 0.5, originY: 0.5,
      });
    }

    // Achievements unlocked
    let achY = xpY + (narrow ? 22 : 32);
    if (data.unlocked?.length > 0) {
      createLabel(this, cw / 2, achY, 'ACHIEVEMENTS UNLOCKED!', {
        fontSize: narrow ? '13px' : '16px', color: '#ffd36e', depth: 5002, originX: 0.5, originY: 0.5,
      });
      achY += narrow ? 18 : 24;
      const visibleAchievements = data.unlocked.slice(0, narrow ? 3 : 5);
      visibleAchievements.forEach((a, i) => {
        createLabel(this, cw / 2, achY + i * (narrow ? 16 : 20), `✦ ${a.name}: ${a.desc}`, {
          fontSize: narrow ? '11px' : '13px', color: '#f7f0bb', depth: 5002, originX: 0.5, originY: 0.5,
          wordWrap: { width: panelW - 40 },
        });
      });
      if (data.unlocked.length > visibleAchievements.length) {
        createLabel(this, cw / 2, achY + visibleAchievements.length * (narrow ? 16 : 20), `+${data.unlocked.length - visibleAchievements.length} more`, {
          fontSize: narrow ? '11px' : '13px', color: '#ffd36e', depth: 5002, originX: 0.5, originY: 0.5,
        });
      }
    }

    // Buttons
    const btnY = ch / 2 + panelH / 2 - (narrow ? 58 : 50);
    const btnW = narrow ? panelW - 40 : 200;
    const restartY = narrow ? btnY - 24 : btnY;
    const menuY = narrow ? btnY + 26 : btnY;
    createButton(this, cw / 2 - (narrow ? 0 : 110), restartY, 'Restart', {
      width: btnW, height: 44, fontSize: '16px', depth: 5002,
      onClick: () => {
        this.scene.stop('GameOverScene');
        this.scene.get('GameScene').scene.restart();
      },
    });
    createButton(this, cw / 2 + (narrow ? 0 : 110), menuY, 'Menu', {
      width: btnW, height: 44, fontSize: '16px', depth: 5002,
      onClick: () => {
        this.scene.stop('GameOverScene');
        this.scene.stop('GameScene');
        this.scene.start('MenuScene');
      },
    });

    // Restart lock
    this.input.keyboard.enabled = false;
    this.time.delayedCall(2500, () => {
      this.input.keyboard.enabled = true;
      this.input.keyboard.once('keydown-R', () => {
        this.scene.stop('GameOverScene');
        this.scene.get('GameScene').scene.restart();
      });
    });
  }
}
