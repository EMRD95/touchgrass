import Phaser from 'phaser';
import { leaderboard } from '../systems/LeaderboardManager.js';
import { auth } from '../systems/Auth.js';
import { createButton, createLabel, createPanel } from '../ui/UIFactory.js';
import { formatDuration } from '../utils/helpers.js';

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('LeaderboardScene');
  }

  create() {
    const cw = this.scale.width;
    const ch = this.scale.height;
    const narrow = cw < 600;

    this.add.rectangle(cw / 2, ch / 2, cw, ch, 0x071008, 0.9).setDepth(0);

    createLabel(this, cw / 2, narrow ? 30 : 40, 'LEADERBOARD', {
      fontSize: narrow ? '24px' : '36px', color: '#f7f0bb', depth: 1, originX: 0.5, originY: 0.5, strokeThickness: 5,
    });

    const panelW = narrow ? cw - 24 : 680;
    const panelH = narrow ? ch - 140 : ch - 120;
    const panel = createPanel(this, cw / 2, ch / 2 + 10, panelW, panelH, { fill: 0x102013, fillAlpha: 0.85, depth: 1 });

    const scores = leaderboard.getLocal();
    const startY = ch / 2 - panelH / 2 + (narrow ? 30 : 40);
    const rowH = narrow ? 28 : 34;
    const rowsFit = Math.max(5, Math.min(15, Math.floor((panelH - (narrow ? 84 : 96)) / rowH)));

    if (scores.length === 0) {
      createLabel(this, cw / 2, ch / 2, 'No scores yet. Go touch some grass!', {
        fontSize: '16px', color: '#bde48b', depth: 2, originX: 0.5, originY: 0.5,
      });
    } else {
      // Header
      createLabel(this, cw / 2 - panelW / 2 + 20, startY, 'Rank', { fontSize: '13px', color: '#ffb38f', depth: 2, originX: 0, originY: 0.5 });
      createLabel(this, cw / 2 - panelW / 2 + 70, startY, 'Player', { fontSize: '13px', color: '#ffb38f', depth: 2, originX: 0, originY: 0.5 });
      createLabel(this, cw / 2 + panelW / 2 - 20, startY, 'Score', { fontSize: '13px', color: '#ffb38f', depth: 2, originX: 1, originY: 0.5 });

      scores.slice(0, rowsFit).forEach((entry, i) => {
        const y = startY + (i + 1) * rowH;
        const isMe = entry.userId === auth.getUserId();
        const color = isMe ? '#ffd36e' : '#f7f0bb';
        createLabel(this, cw / 2 - panelW / 2 + 20, y, `${i + 1}`, { fontSize: '14px', color, depth: 2, originX: 0, originY: 0.5 });
        createLabel(this, cw / 2 - panelW / 2 + 70, y, entry.name || 'Unknown', { fontSize: '14px', color, depth: 2, originX: 0, originY: 0.5 });
        createLabel(this, cw / 2 + panelW / 2 - 20, y, `${entry.score}`, { fontSize: '14px', color, depth: 2, originX: 1, originY: 0.5 });
      });
    }

    createButton(this, cw / 2, ch - (narrow ? 30 : 40), 'Back', {
      width: narrow ? cw - 64 : 200, height: 42, fontSize: '16px', depth: 2,
      onClick: () => this.scene.start('MenuScene'),
    });

    this.input.keyboard.once('keydown-ESC', () => this.scene.start('MenuScene'));
  }
}
