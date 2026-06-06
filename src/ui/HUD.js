import { createProgressBar, createLabel } from './UIFactory.js';
import { formatDuration } from '../utils/helpers.js';

export class HUD {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(2000);
    this.elements = {};
    this._narrow = scene.scale.width < 600;
    this.build();
  }

  build() {
    this.container.removeAll(true);
    const cw = this.scene.scale.width;
    const narrow = cw < 600;
    this._narrow = narrow;
    const panelW = Math.min(narrow ? cw - 24 : 1024, cw - 32);
    const panelH = narrow ? 110 : 96;
    const font = narrow ? '13px' : '20px';
    const small = narrow ? '10px' : '12px';

    const panel = this.scene.add.rectangle(12, 12, panelW, panelH, 0x102013, 0.78)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xf7f0bb, 0.28);

    this.elements.scoreText = createLabel(this.scene, 22, 16, 'score: 0', {
      fontSize: font, color: '#fff2a8', depth: 2001, strokeThickness: narrow ? 3 : 4,
    });

    this.elements.timerText = createLabel(this.scene, panelW - 4, 16, 'survived: 0:00', {
      fontSize: font, color: '#fff2a8', align: 'right', originX: 1, depth: 2001, strokeThickness: narrow ? 3 : 4,
    });

    const row2y = narrow ? 52 : 56;
    this.elements.meterLabel = createLabel(this.scene, 22, row2y, 'chill', {
      fontSize: small, color: '#cfe99d', depth: 2001, strokeThickness: 0,
    });

    const meterX = narrow ? 64 : 88;
    const meterW = narrow ? Math.max(80, Math.min(160, panelW - 220)) : 280;
    this.elements.meterBg = this.scene.add.rectangle(meterX, row2y + 7, meterW, narrow ? 10 : 14, 0x071008, 0.8).setOrigin(0, 0.5).setDepth(2001);
    this.elements.meterBar = this.scene.add.rectangle(meterX, row2y + 7, meterW * 0.57, narrow ? 10 : 14, 0x91d969, 1).setOrigin(0, 0.5).setDepth(2001);

    this.elements.breathText = createLabel(this.scene, meterX + meterW + 8, row2y + 1, '', {
      fontSize: small, color: '#f7f0bb', depth: 2001, strokeThickness: 0,
    });

    this.elements.waveText = createLabel(this.scene, panelW - 8, row2y + 1, '', {
      fontSize: small, color: '#ffb38f', align: 'right', originX: 1, depth: 2001, strokeThickness: 0,
    });

    this.elements.swarmText = createLabel(this.scene, panelW - 8, row2y + 16, '', {
      fontSize: small, color: '#ffb38f', align: 'right', originX: 1, depth: 2001, strokeThickness: 0,
    });

    this.elements.powerupContainer = this.scene.add.container(22, row2y + (narrow ? 20 : 22)).setDepth(2001);

    this._meterW = meterW;
    this.container.add([panel, this.elements.scoreText, this.elements.timerText, this.elements.meterLabel,
      this.elements.meterBg, this.elements.meterBar, this.elements.breathText, this.elements.waveText, this.elements.swarmText, this.elements.powerupContainer]);
  }

  refresh(state) {
    const s = state;
    const mult = s.activeMultiplier ? '  2x' : '';
    this.elements.scoreText.setText(`score: ${s.score}${mult}   combo: x${Math.max(1, s.combo)}`);

    const hydrating = s.hydratingUntil > 0 && s.now < s.hydratingUntil;
    const hydrateRemaining = hydrating ? Math.max(0, (s.hydratingUntil - s.now) / 1000) : 0;
    const hydrateSuffix = hydrating ? `   H2O ${hydrateRemaining.toFixed(1)}s` : '';
    this.elements.timerText.setText(`survived: ${formatDuration(s.survivalTime)}${hydrateSuffix}`);

    const chillPct = Math.max(0, Math.min(100, s.chill));
    const barW = (this._meterW || 280) * (chillPct / 100);
    const barH = this._narrow ? 10 : 14;
    this.elements.meterBar.setDisplaySize(barW, barH);
    this.elements.meterBar.setFillStyle(
      s.chill > 55 ? 0x91d969 : s.chill > 25 ? 0xffd36e : 0xff7f6e,
      1,
    );

    const breathWait = Math.max(0, (s.breatheReadyAt - s.now) / 1000);
    const breathLabel = this._narrow
      ? (breathWait > 0 ? `${breathWait.toFixed(1)}s` : 'ready')
      : (breathWait > 0 ? `ctrl breathe ${breathWait.toFixed(1)}s` : 'ctrl/breathe ready');
    this.elements.breathText.setText(breathLabel);

    this.elements.waveText.setText(`wave ${s.wave}`);
    this.elements.swarmText.setText(this._narrow ? `swarm: ${s.enemyCount}` : `brand swarm: ${s.enemyCount}`);

    this.refreshPowerups(state.activePowerups || []);
  }

  refreshPowerups(list) {
    this.elements.powerupContainer.removeAll(true);
    let x = 0;
    let y = 0;
    const maxW = Math.max(160, this.scene.scale.width - 44);
    for (const pu of list) {
      const remaining = (pu.remaining / 1000).toFixed(1);
      const txt = createLabel(this.scene, x, y, `${pu.icon} ${remaining}s`, {
        fontSize: '11px', color: '#bde48b', depth: 2001, strokeThickness: 2,
      });
      if (x > 0 && x + txt.width > maxW) {
        x = 0;
        y += 15;
        txt.setPosition(x, y);
      }
      this.elements.powerupContainer.add(txt);
      x += txt.width + 10;
    }
  }

  resize() {
    this.build();
  }

  destroy() {
    this.container.destroy(true);
  }
}
