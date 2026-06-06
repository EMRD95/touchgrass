import Phaser from 'phaser';
import { progression } from '../systems/Progression.js';
import { achievements, ACHIEVEMENTS } from '../systems/Achievements.js';
import { auth } from '../systems/Auth.js';
import { createButton, createLabel, createPanel, createProgressBar } from '../ui/UIFactory.js';
import { formatDuration, clamp } from '../utils/helpers.js';

export class ProfileScene extends Phaser.Scene {
  constructor() {
    super('ProfileScene');
  }

  create() {
    const cw = this.scale.width;
    const ch = this.scale.height;
    const narrow = cw < 600;

    this.add.rectangle(cw / 2, ch / 2, cw, ch, 0x071008, 0.92).setDepth(0);

    createLabel(this, cw / 2, narrow ? 30 : 40, 'PROFILE', {
      fontSize: narrow ? '24px' : '36px', color: '#f7f0bb', depth: 1, originX: 0.5, originY: 0.5, strokeThickness: 5,
    });

    const tabY = narrow ? 60 : 80;
    const tabNames = ['Stats', 'Achievements', 'Skills'];
    this.currentTab = 0;
    this.achievementPage = 0;
    this.tabButtons = [];
    const tabW = narrow ? (cw - 32) / 3 : 140;

    tabNames.forEach((name, i) => {
      const btn = createButton(this, cw / 2 - (tabNames.length - 1) * tabW / 2 + i * tabW, tabY, name, {
        width: tabW - 8, height: 36, fontSize: '14px', depth: 1,
        onClick: () => this.setTab(i),
      });
      this.tabButtons.push(btn);
    });

    this.contentContainer = this.add.container(0, 0).setDepth(1);
    this.setTab(0);

    createButton(this, cw / 2, ch - (narrow ? 30 : 40), 'Back', {
      width: narrow ? cw - 64 : 200, height: 42, fontSize: '16px', depth: 1,
      onClick: () => this.scene.start('MenuScene'),
    });

    this.input.keyboard.once('keydown-ESC', () => this.scene.start('MenuScene'));
  }

  setTab(index) {
    this.currentTab = index;
    this.contentContainer.removeAll(true);
    this.tabButtons.forEach((btn, i) => {
      btn.bg.setFillStyle(i === index ? 0x223a1f : 0x102013, 0.85);
    });
    if (index === 0) this.renderStats();
    else if (index === 1) this.renderAchievements();
    else if (index === 2) this.renderSkills();
  }

  renderStats() {
    const cw = this.scale.width;
    const ch = this.scale.height;
    const narrow = cw < 600;
    const d = progression.data;
    const startY = narrow ? 100 : 130;
    const lineH = narrow ? 22 : 28;

    const stats = [
      `Total Score: ${d.totalScore}`,
      `Total Runs: ${d.totalRuns}`,
      `Total Time: ${formatDuration(d.totalTime)}`,
      `Best Score: ${d.bestScore}`,
      `Best Time: ${formatDuration(d.bestTime)}`,
      `Best Combo: x${d.bestCombo}`,
      `Total Grass: ${d.totalGrass}`,
      `Enemies Destroyed: ${d.totalEnemiesDestroyed}`,
      `Power-ups: ${d.totalPowerups}`,
      `Legendary Grass: ${d.legendaryCollected}`,
      `Prestige: ${d.prestige}`,
      `Play Streak: ${d.playStreak} days`,
    ];

    stats.forEach((s, i) => {
      const lbl = createLabel(this, cw / 2, startY + i * lineH, s, {
        fontSize: narrow ? '13px' : '16px', color: '#bde48b', depth: 1, originX: 0.5, originY: 0.5,
      });
      this.contentContainer.add(lbl);
    });

    // XP bar
    const xp = progression.getLevelProgress();
    const barY = startY + stats.length * lineH + 20;
    const lvlLbl = createLabel(this, cw / 2, barY, `Level ${xp.level}`, {
      fontSize: '16px', color: '#ffd36e', depth: 1, originX: 0.5, originY: 0.5,
    });
    this.contentContainer.add(lvlLbl);
    const bar = createProgressBar(this, cw / 2 - 140, barY + 18, 280, 12, { barColor: 0x91d969, depth: 1 });
    this.contentContainer.add(bar.container);
    bar.setValue(xp.pct);
  }

  renderAchievements() {
    const cw = this.scale.width;
    const ch = this.scale.height;
    const narrow = cw < 600;
    const startY = narrow ? 90 : 110;
    const lineH = narrow ? 36 : 44;
    const panelW = narrow ? cw - 32 : 700;
    const rowsPerPage = Math.max(5, Math.floor((ch - startY - (narrow ? 150 : 170)) / lineH));
    const totalPages = Math.max(1, Math.ceil(ACHIEVEMENTS.length / rowsPerPage));
    this.achievementPage = Math.floor(clamp(this.achievementPage || 0, 0, totalPages - 1));
    const pageStart = this.achievementPage * rowsPerPage;
    const pageAchievements = ACHIEVEMENTS.slice(pageStart, pageStart + rowsPerPage);

    const unlockedSet = achievements.unlocked;
    pageAchievements.forEach((a, i) => {
      const y = startY + i * lineH;
      const unlocked = unlockedSet.has(a.id);
      const color = unlocked ? '#f7f0bb' : '#555555';
      const prefix = unlocked ? '\u2713' : (a.secret ? '?' : '\u25cb');
      const nameLbl = createLabel(this, cw / 2 - panelW / 2 + 20, y, `${prefix} ${a.name}`, {
        fontSize: narrow ? '12px' : '15px', color, depth: 1, originX: 0, originY: 0.5,
        wordWrap: { width: panelW * (narrow ? 0.5 : 0.42) },
      });
      this.contentContainer.add(nameLbl);
      if (!a.secret || unlocked) {
        const descLbl = createLabel(this, cw / 2 + panelW / 2 - 20, y, a.desc, {
          fontSize: narrow ? '10px' : '12px', color: unlocked ? '#bde48b' : '#444444', depth: 1, originX: 1, originY: 0.5,
          wordWrap: { width: panelW * 0.50 }, align: 'right',
        });
        this.contentContainer.add(descLbl);
      }
    });

    const prog = achievements.getProgress();
    const pagerY = ch - (narrow ? 112 : 120);
    const progLbl = createLabel(this, cw / 2, pagerY, `${prog.unlocked} / ${prog.total} unlocked  •  page ${this.achievementPage + 1}/${totalPages}`, {
      fontSize: '14px', color: '#ffd36e', depth: 1, originX: 0.5, originY: 0.5,
    });
    this.contentContainer.add(progLbl);

    if (totalPages > 1) {
      const btnW = narrow ? 92 : 110;
      const prev = createButton(this, cw / 2 - btnW / 2 - 8, pagerY + 28, 'Prev', {
        width: btnW, height: 30, fontSize: '12px', depth: 1,
        onClick: () => { this.achievementPage = Math.max(0, this.achievementPage - 1); this.setTab(1); },
      });
      const next = createButton(this, cw / 2 + btnW / 2 + 8, pagerY + 28, 'Next', {
        width: btnW, height: 30, fontSize: '12px', depth: 1,
        onClick: () => { this.achievementPage = Math.min(totalPages - 1, this.achievementPage + 1); this.setTab(1); },
      });
      this.contentContainer.add([prev.container, next.container]);
    }
  }

  renderSkills() {
    const cw = this.scale.width;
    const ch = this.scale.height;
    const narrow = cw < 600;
    const startY = narrow ? 100 : 130;
    const lineH = narrow ? 54 : 52;
    const d = progression.data;
    const panelW = narrow ? cw - 32 : Math.min(760, cw - 80);
    const nameX = narrow ? cw / 2 : cw / 2 - panelW / 2 + 24;
    const descX = narrow ? cw / 2 : cw / 2 - panelW / 2 + 300;
    const upgradeX = narrow ? cw / 2 : cw / 2 + panelW / 2 - 36;
    const descWrapW = narrow ? panelW - 40 : Math.max(170, upgradeX - descX - 54);

    const spLbl = createLabel(this, cw / 2, startY - 30, `Skill Points: ${d.skillPoints}`, {
      fontSize: '18px', color: '#ffd36e', depth: 1, originX: 0.5, originY: 0.5,
    });
    this.contentContainer.add(spLbl);

    const skills = [
      { key: 'speedBonus', name: 'Speed Boost', max: 10, desc: '12 move speed / level' },
      { key: 'chillBonus', name: 'Inner Calm', max: 10, desc: '4 starting chill / level' },
      { key: 'breatheCooldown', name: 'Mindful Breath', max: 8, desc: '8% shorter breathe cooldown / level' },
      { key: 'startScore', name: 'Head Start', max: 5, desc: '5 starting score / level' },
      { key: 'scoreMultiplier', name: 'Green Thumb', max: 5, desc: '5% score / level' },
      { key: 'luckBonus', name: 'Lucky Find', max: 10, desc: '2% rare drop chance / level' },
    ];

    skills.forEach((s, i) => {
      const y = startY + i * lineH;
      const current = d.skills[s.key];
      const color = current >= s.max ? '#ffd36e' : '#f7f0bb';
      const nameLbl = createLabel(this, nameX, y, `${s.name} ${current}/${s.max}`, {
        fontSize: narrow ? '13px' : '15px', color, depth: 1, originX: narrow ? 0.5 : 0, originY: 0.5,
        wordWrap: { width: narrow ? panelW - 40 : 240 },
      });
      this.contentContainer.add(nameLbl);
      const descY = narrow ? y + 16 : y;
      const descLbl = createLabel(this, descX, descY, s.desc, {
        fontSize: narrow ? '10px' : '12px', color: '#bde48b', depth: 1, originX: narrow ? 0.5 : 0, originY: 0.5,
        wordWrap: { width: descWrapW },
      });
      this.contentContainer.add(descLbl);

      if (!narrow && d.skillPoints > 0 && current < s.max) {
        const btn = createButton(this, upgradeX, y, '+', {
          width: 36, height: 32, fontSize: '16px', depth: 1,
          onClick: () => {
            if (progression.spendSkillPoint(s.key)) {
              this.setTab(2);
            }
          },
        });
        this.contentContainer.add(btn.container);
      }
    });

    if (progression.canPrestige()) {
      const prestigeBtn = createButton(this, cw / 2, ch - (narrow ? 80 : 90), 'PRESTIGE (Reset for bonus)', {
        width: narrow ? cw - 64 : 320, height: 44, fontSize: '14px', depth: 1,
        onClick: () => {
          if (confirm('Prestige resets your level and skills but gives a permanent bonus. Continue?')) {
            progression.doPrestige();
            this.setTab(2);
          }
        },
      });
      this.contentContainer.add(prestigeBtn.container);
    }
  }
}
