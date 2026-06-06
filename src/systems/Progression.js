import { SaveManager } from './SaveManager.js';
import { clamp } from '../utils/helpers.js';

const DEFAULT_STATE = {
  xp: 0,
  level: 1,
  prestige: 0,
  totalScore: 0,
  totalRuns: 0,
  totalTime: 0,
  bestScore: 0,
  bestTime: 0,
  bestCombo: 0,
  totalGrass: 0,
  totalEnemiesDestroyed: 0,
  totalPowerups: 0,
  legendaryCollected: 0,
  playStreak: 0,
  lastPlayDate: null,
  skillPoints: 0,
  skills: {
    speedBonus: 0,
    chillBonus: 0,
    breatheCooldown: 0,
    startScore: 0,
    scoreMultiplier: 0,
    luck: 0,
  },
  unlocks: {
    zenMode: false,
    hardMode: false,
    dailyRun: true,
    themes: ['default'],
  },
  dailyRun: {
    lastDate: null,
    bestScore: 0,
    completed: false,
  },
};

function xpForLevel(level) {
  return Math.floor(100 * Math.pow(level, 1.6));
}

export class Progression {
  constructor() {
    this.data = SaveManager.load()?.progression || JSON.parse(JSON.stringify(DEFAULT_STATE));
    this._fixShape();
  }

  _fixShape() {
    const d = this.data;
    for (const [k, v] of Object.entries(DEFAULT_STATE)) {
      if (d[k] === undefined) d[k] = JSON.parse(JSON.stringify(v));
    }
    if (!d.skills) d.skills = JSON.parse(JSON.stringify(DEFAULT_STATE.skills));
    if (!d.unlocks) d.unlocks = JSON.parse(JSON.stringify(DEFAULT_STATE.unlocks));
    if (!d.dailyRun) d.dailyRun = JSON.parse(JSON.stringify(DEFAULT_STATE.dailyRun));
    for (const [k, v] of Object.entries(DEFAULT_STATE.skills)) {
      if (d.skills[k] === undefined) d.skills[k] = v;
    }
    for (const [k, v] of Object.entries(DEFAULT_STATE.unlocks)) {
      if (d.unlocks[k] === undefined) d.unlocks[k] = v;
    }
  }

  save() {
    const all = SaveManager.load() || {};
    all.progression = this.data;
    SaveManager.save(all);
  }

  updateStreak() {
    const today = new Date().toISOString().slice(0, 10);
    const last = this.data.lastPlayDate;
    if (!last) {
      this.data.playStreak = 1;
    } else if (last === today) {
      // same day, no change
    } else {
      const lastDate = new Date(last + 'T00:00:00');
      const todayDate = new Date(today + 'T00:00:00');
      const diff = Math.round((todayDate - lastDate) / 86400000);
      if (diff === 1) {
        this.data.playStreak += 1;
      } else {
        this.data.playStreak = 1;
      }
    }
    this.data.lastPlayDate = today;
    this.save();
  }

  recordRun(stats) {
    const d = this.data;
    d.totalRuns += 1;
    d.totalScore += stats.score;
    d.totalTime += stats.survivalTime;
    d.totalGrass += stats.grassCollected;
    d.totalEnemiesDestroyed += stats.enemiesDestroyed;
    d.totalPowerups += stats.powerupsCollected;
    d.legendaryCollected += stats.legendaryCollected;
    d.bestScore = Math.max(d.bestScore, stats.score);
    d.bestTime = Math.max(d.bestTime, stats.survivalTime);
    d.bestCombo = Math.max(d.bestCombo, stats.bestCombo);

    const xpGain = Math.floor(
      stats.score * 10 +
      stats.survivalTime * 5 +
      stats.bestCombo * 50 +
      stats.grassCollected * 2 +
      stats.enemiesDestroyed * 20 +
      stats.legendaryCollected * 500 +
      (stats.waveReached * 100)
    );
    d.xp += xpGain;

    // Level up loop
    while (d.xp >= xpForLevel(d.level)) {
      d.xp -= xpForLevel(d.level);
      d.level += 1;
      d.skillPoints += 1;
    }

    // Unlock checks
    if (d.totalRuns >= 5) d.unlocks.zenMode = true;
    if (d.totalRuns >= 10) d.unlocks.hardMode = true;
    if (stats.score >= 200 && !d.unlocks.themes.includes('golden')) d.unlocks.themes.push('golden');
    if (stats.score >= 500 && !d.unlocks.themes.includes('cosmic')) d.unlocks.themes.push('cosmic');

    this.updateStreak();
    this.save();
    return xpGain;
  }

  spendSkillPoint(skill) {
    if (this.data.skillPoints <= 0) return false;
    const max = { speedBonus: 10, chillBonus: 10, breatheCooldown: 8, startScore: 5, scoreMultiplier: 5, luck: 10 };
    if (this.data.skills[skill] >= max[skill]) return false;
    this.data.skills[skill] += 1;
    this.data.skillPoints -= 1;
    this.save();
    return true;
  }

  getSkillEffects() {
    const s = this.data.skills;
    return {
      speedBonus: s.speedBonus * 12,
      chillBonus: s.chillBonus * 4,
      breatheCooldownReduction: s.breatheCooldown * 0.08,
      startScore: s.startScore * 5,
      scoreMultiplier: 1 + s.scoreMultiplier * 0.05,
      luckBonus: s.luck * 0.02,
    };
  }

  getLevelProgress() {
    const current = xpForLevel(this.data.level);
    const next = xpForLevel(this.data.level + 1);
    return { current: this.data.xp, needed: next, level: this.data.level, pct: clamp(this.data.xp / next, 0, 1) };
  }

  canPrestige() {
    return this.data.level >= 50;
  }

  doPrestige() {
    if (!this.canPrestige()) return false;
    this.data.prestige += 1;
    this.data.level = 1;
    this.data.xp = 0;
    this.data.skillPoints = 0;
    this.data.skills = JSON.parse(JSON.stringify(DEFAULT_STATE.skills));
    this.data.bestScore = 0;
    this.data.bestTime = 0;
    this.data.bestCombo = 0;
    this.save();
    return true;
  }

  getDailySeed() {
    const now = new Date();
    return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  }

  checkDailyRun(score) {
    const today = new Date().toISOString().slice(0, 10);
    const d = this.data.dailyRun;
    if (d.lastDate !== today) {
      d.lastDate = today;
      d.bestScore = score;
      d.completed = true;
    } else if (score > d.bestScore) {
      d.bestScore = score;
    }
    this.save();
  }

  resetAll() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.save();
  }
}

export const progression = new Progression();
