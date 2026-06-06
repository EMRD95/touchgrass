import Phaser from 'phaser';
import { auth } from '../systems/Auth.js';
import { progression } from '../systems/Progression.js';
import { createButton, createLabel } from '../ui/UIFactory.js';
import { clamp } from '../utils/helpers.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    window.__GTS_READY__ = 'menu';

    const cw = this.scale.width;
    const ch = this.scale.height;
    const isPortrait = ch > cw;
    const bgKey = isPortrait ? 'reference_mobile' : 'reference';
    const refW = isPortrait ? 941 : 1376;
    const refH = isPortrait ? 1672 : 768;
    const s = Math.max(cw / refW, ch / refH);

    const bg = this.add.image(cw / 2, ch / 2, bgKey)
      .setDisplaySize(refW * s, refH * s)
      .setDepth(0);

    this.scale.on('resize', (gameSize) => {
      const p = gameSize.height > gameSize.width;
      const rw = p ? 941 : 1376;
      const rh = p ? 1672 : 768;
      const sc = Math.max(gameSize.width / rw, gameSize.height / rh);
      if (bg.texture?.key !== (p ? 'reference_mobile' : 'reference')) {
        bg.setTexture(p ? 'reference_mobile' : 'reference');
      }
      bg.setPosition(gameSize.width / 2, gameSize.height / 2);
      bg.setDisplaySize(rw * sc, rh * sc);
    });

    // Dark overlay for readability
    this.add.rectangle(cw / 2, ch / 2, cw, ch, 0x071008, 0.45).setDepth(1);

    // Title / layout: derive positions from available height so unlocked modes don't overlap nav/footer.
    const narrow = cw < 600;
    const cramped = ch < 680;
    const titleY = clamp(ch * 0.12, narrow ? 44 : 72, narrow ? 78 : 118);
    const titleSize = narrow ? (cramped ? '28px' : '32px') : '56px';
    const subTitleSize = narrow ? (cramped ? '23px' : '26px') : '44px';
    const subTitleGap = narrow ? (cramped ? 25 : 30) : 50;
    createLabel(this, cw / 2, titleY, 'GRASS TOUCHING', {
      fontSize: titleSize, color: '#f7f0bb', depth: 2, originX: 0.5, originY: 0.5, strokeThickness: narrow ? 5 : 6,
    });
    createLabel(this, cw / 2, titleY + subTitleGap, 'SIMULATOR', {
      fontSize: subTitleSize, color: '#91d969', depth: 2, originX: 0.5, originY: 0.5, strokeThickness: narrow ? 4 : 5,
    });

    // User info / login
    const userY = titleY + (narrow ? (cramped ? 58 : 70) : 110);
    this.userLabel = createLabel(this, cw / 2, userY, '', {
      fontSize: narrow && cramped ? '12px' : '14px', color: '#bde48b', depth: 2, originX: 0.5, originY: 0.5,
    });
    this.authStatusLabel = createLabel(this, cw / 2, userY + (cramped ? 18 : 22), '', {
      fontSize: cramped ? '10px' : '11px', color: '#ffb38f', depth: 2, originX: 0.5, originY: 0.5,
      wordWrap: { width: Math.min(cw - 36, 420) }, align: 'center',
    });
    this.authButton = createButton(this, cw / 2, userY + (narrow ? (cramped ? 36 : 42) : 44), 'Sign in with Google', {
      width: narrow ? Math.min(cw - 80, 240) : 230,
      height: cramped ? 30 : 32,
      fontSize: '13px',
      depth: 2,
      bgColor: 0x0f1d14,
      strokeColor: 0x91d969,
      strokeAlpha: 0.55,
      onClick: () => {
        if (auth.isSignedIn()) auth.signOut();
        else auth.signIn();
      },
    });

    auth.onAuthChange(() => {
      this.updateUserLabel();
    });
    this.updateUserLabel();

    // Buttons
    const modeButtons = [
      { label: 'Survival Mode', mode: 'survival' },
      { label: 'Daily Run', mode: 'daily' },
    ];
    if (progression.data.unlocks?.zenMode) modeButtons.push({ label: 'Zen Mode', mode: 'zen' });
    if (progression.data.unlocks?.hardMode) modeButtons.push({ label: 'Hard Mode', mode: 'hard' });

    const btnW = narrow ? cw - 64 : 280;
    const firstButtonY = userY + (narrow ? (cramped ? 76 : 92) : 104);
    const footY = ch - (narrow ? 24 : 30);
    const navTargetY = footY - (narrow ? 48 : 54);
    const spacing = clamp((navTargetY - firstButtonY) / Math.max(1, modeButtons.length), cramped ? 40 : 44, narrow ? 54 : 58);
    const btnH = clamp(spacing - 8, 36, narrow ? 48 : 50);

    modeButtons.forEach((entry, i) => {
      createButton(this, cw / 2, firstButtonY + spacing * i, entry.label, {
        width: btnW, height: btnH, fontSize: narrow && cramped ? '16px' : '18px', depth: 2,
        onClick: () => this.startGame(entry.mode),
      });
    });

    // Nav buttons
    const navY = Math.min(navTargetY, firstButtonY + spacing * modeButtons.length);
    const navW = narrow ? (cw - 64) / 2 - 8 : 140;
    createButton(this, cw / 2 - navW / 2 - 6, navY, 'Profile', {
      width: navW, height: cramped ? 36 : 40, fontSize: '14px', depth: 2, onClick: () => this.scene.start('ProfileScene'),
    });
    createButton(this, cw / 2 + navW / 2 + 6, navY, 'Leaderboard', {
      width: navW, height: cramped ? 36 : 40, fontSize: '14px', depth: 2, onClick: () => this.scene.start('LeaderboardScene'),
    });

    // Streak / level display
    const level = progression.getLevelProgress();
    createLabel(this, cw / 2, footY, `Level ${level.level}  •  Streak ${progression.data.playStreak}d  •  Best ${progression.data.bestScore}`, {
      fontSize: cramped ? '10px' : '12px', color: 'rgba(247,240,187,0.65)', depth: 2, originX: 0.5, originY: 0.5,
      wordWrap: { width: cw - 28 }, align: 'center',
    });

    // Keyboard shortcuts
    this.input.keyboard.on('keydown-SPACE', () => this.startGame('survival'));
    this.input.keyboard.on('keydown-ENTER', () => this.startGame('survival'));
  }

  updateUserLabel() {
    const name = auth.getDisplayName();
    const isGuest = auth.user?.provider === 'guest';
    if (this.userLabel) {
      this.userLabel.setText(isGuest ? `Guest mode — ${name}` : `${name} — Google account`);
    }
    if (this.authButton?.label) {
      this.authButton.label.setText(isGuest ? 'Sign in with Google' : 'Sign out');
    }
    if (this.authButton?.bg) {
      this.authButton.bg.setStrokeStyle(2, isGuest ? 0x91d969 : 0xffd36e, 0.55);
    }
    if (this.authStatusLabel) {
      this.authStatusLabel.setText(auth.lastError || (isGuest ? 'Continue as Guest: progress saves locally on this browser' : 'Scores use your Google profile locally'));
      this.authStatusLabel.setColor(auth.lastError ? '#ffb38f' : 'rgba(247,240,187,0.65)');
    }
  }

  startGame(mode) {
    const dailySeed = mode === 'daily' ? progression.getDailySeed() : null;
    this.scene.start('GameScene', { mode, dailySeed });
  }
}
