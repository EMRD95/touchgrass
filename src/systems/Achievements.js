import { SaveManager } from './SaveManager.js';

export const ACHIEVEMENTS = [
  { id: 'first_touch', name: 'First Touch', desc: 'Collect your first grass tuft.', secret: false },
  { id: 'sprinter', name: 'Sprinter', desc: 'Survive 30 seconds in one run.', secret: false },
  { id: 'marathon', name: 'Marathon Grasser', desc: 'Survive 2 minutes in one run.', secret: false },
  { id: 'endurance', name: 'Endurance Athlete', desc: 'Survive 5 minutes in one run.', secret: false },
  { id: 'combo_5', name: 'Flow State', desc: 'Reach a 5x combo.', secret: false },
  { id: 'combo_15', name: 'Zen Master', desc: 'Reach a 15x combo.', secret: false },
  { id: 'combo_30', name: 'One With Nature', desc: 'Reach a 30x combo.', secret: false },
  { id: 'score_50', name: 'Grass Enthusiast', desc: 'Score 50 in a single run.', secret: false },
  { id: 'score_150', name: 'Grass Connoisseur', desc: 'Score 150 in a single run.', secret: false },
  { id: 'score_300', name: 'Grass Legend', desc: 'Score 300 in a single run.', secret: false },
  { id: 'score_500', name: 'Eternal Grass', desc: 'Score 500 in a single run.', secret: true },
  { id: 'rare_first', name: 'Shiny!', desc: 'Collect a Rare grass tuft.', secret: false },
  { id: 'epic_first', name: 'What Is That?', desc: 'Collect an Epic grass tuft.', secret: false },
  { id: 'legendary_first', name: 'Cosmic Touch', desc: 'Collect a Legendary grass tuft.', secret: false },
  { id: 'hydrated', name: 'Stay Hydrated', desc: 'Pick up your first water bottle.', secret: false },
  { id: 'powerup_first', name: 'Power Surge', desc: 'Collect your first power-up.', secret: false },
  { id: 'powerup_20', name: 'Junkie', desc: 'Collect 20 power-ups total.', secret: false },
  { id: 'destroy_10', name: 'Corporate Saboteur', desc: 'Destroy 10 enemies with Hydration.', secret: false },
  { id: 'destroy_50', name: 'Brand Destroyer', desc: 'Destroy 50 enemies with Hydration.', secret: false },
  { id: 'destroy_200', name: 'Digital Extinction', desc: 'Destroy 200 enemies with Hydration.', secret: true },
  { id: 'wave_3', name: 'Growing Pains', desc: 'Reach Wave 3.', secret: false },
  { id: 'wave_6', name: 'Thick Of It', desc: 'Reach Wave 6.', secret: false },
  { id: 'wave_10', name: 'The Final Lawn', desc: 'Reach Wave 10.', secret: true },
  { id: 'boss_first', name: 'Middle Manager', desc: 'Defeat your first Boss.', secret: false },
  { id: 'boss_5', name: 'CEO Slayer', desc: 'Defeat 5 Bosses.', secret: false },
  { id: 'no_damage_60', name: 'Flawless Minute', desc: 'Survive 60 seconds without taking damage.', secret: false },
  { id: 'no_damage_120', name: 'Untouchable', desc: 'Survive 2 minutes without taking damage.', secret: true },
  { id: 'runs_5', name: 'Habit Forming', desc: 'Play 5 runs.', secret: false },
  { id: 'runs_25', name: 'Addicted', desc: 'Play 25 runs.', secret: false },
  { id: 'runs_100', name: 'Grass Is Life', desc: 'Play 100 runs.', secret: true },
  { id: 'streak_3', name: 'Morning Dew', desc: 'Play 3 days in a row.', secret: false },
  { id: 'streak_7', name: 'Weekly Warrior', desc: 'Play 7 days in a row.', secret: false },
  { id: 'streak_30', name: 'Monthly Mower', desc: 'Play 30 days in a row.', secret: true },
  { id: 'daily_first', name: 'Daily Grind', desc: 'Complete your first Daily Run.', secret: false },
  { id: 'prestige_1', name: 'Reincarnation', desc: 'Prestige once.', secret: false },
  { id: 'breathe_50', name: 'Meditation', desc: 'Use Breathe 50 times total.', secret: false },
  { id: 'all_powerups', name: 'Toolbelt', desc: 'Collect every type of power-up at least once.', secret: false },
];

export class Achievements {
  constructor() {
    const raw = SaveManager.load();
    this.unlocked = new Set(raw?.achievements || []);
    this.stats = raw?.achievementStats || {
      totalGrass: 0, totalEnemiesDestroyed: 0, totalPowerups: 0, totalBreathes: 0,
      powerupTypes: [], bestCombo: 0, bestTime: 0, bestScore: 0, maxWave: 0,
      bossesDefeated: 0, longestNoDamage: 0,
    };
    this._justUnlocked = [];
  }

  save() {
    const all = SaveManager.load() || {};
    all.achievements = Array.from(this.unlocked);
    all.achievementStats = this.stats;
    SaveManager.save(all);
  }

  check(runStats, sessionEvents = {}) {
    this._justUnlocked = [];
    const s = this.stats;
    s.totalGrass += runStats.grassCollected || 0;
    s.totalEnemiesDestroyed += runStats.enemiesDestroyed || 0;
    s.totalPowerups += runStats.powerupsCollected || 0;
    s.totalBreathes += runStats.breathesUsed || 0;
    s.bestCombo = Math.max(s.bestCombo, runStats.bestCombo || 0);
    s.bestTime = Math.max(s.bestTime, runStats.survivalTime || 0);
    s.bestScore = Math.max(s.bestScore, runStats.score || 0);
    s.maxWave = Math.max(s.maxWave, runStats.waveReached || 0);
    s.bossesDefeated += runStats.bossesDefeated || 0;
    s.longestNoDamage = Math.max(s.longestNoDamage, runStats.longestNoDamage || 0);
    if (runStats.powerupTypes) {
      for (const t of runStats.powerupTypes) {
        if (!s.powerupTypes.includes(t)) s.powerupTypes.push(t);
      }
    }

    const unlock = (id) => {
      if (!this.unlocked.has(id)) {
        this.unlocked.add(id);
        this._justUnlocked.push(ACHIEVEMENTS.find((a) => a.id === id));
      }
    };

    if (s.totalGrass >= 1) unlock('first_touch');
    if (s.bestTime >= 30) unlock('sprinter');
    if (s.bestTime >= 120) unlock('marathon');
    if (s.bestTime >= 300) unlock('endurance');
    if (s.bestCombo >= 5) unlock('combo_5');
    if (s.bestCombo >= 15) unlock('combo_15');
    if (s.bestCombo >= 30) unlock('combo_30');
    if (s.bestScore >= 50) unlock('score_50');
    if (s.bestScore >= 150) unlock('score_150');
    if (s.bestScore >= 300) unlock('score_300');
    if (s.bestScore >= 500) unlock('score_500');
    if (runStats.rareCollected) unlock('rare_first');
    if (runStats.epicCollected) unlock('epic_first');
    if (runStats.legendaryCollected) unlock('legendary_first');
    if (runStats.hydrated) unlock('hydrated');
    if (s.totalPowerups >= 1) unlock('powerup_first');
    if (s.totalPowerups >= 20) unlock('powerup_20');
    if (s.totalEnemiesDestroyed >= 10) unlock('destroy_10');
    if (s.totalEnemiesDestroyed >= 50) unlock('destroy_50');
    if (s.totalEnemiesDestroyed >= 200) unlock('destroy_200');
    if (s.maxWave >= 3) unlock('wave_3');
    if (s.maxWave >= 6) unlock('wave_6');
    if (s.maxWave >= 10) unlock('wave_10');
    if (s.bossesDefeated >= 1) unlock('boss_first');
    if (s.bossesDefeated >= 5) unlock('boss_5');
    if (s.longestNoDamage >= 60) unlock('no_damage_60');
    if (s.longestNoDamage >= 120) unlock('no_damage_120');
    if (sessionEvents.runsTotal >= 5) unlock('runs_5');
    if (sessionEvents.runsTotal >= 25) unlock('runs_25');
    if (sessionEvents.runsTotal >= 100) unlock('runs_100');
    if (sessionEvents.streak >= 3) unlock('streak_3');
    if (sessionEvents.streak >= 7) unlock('streak_7');
    if (sessionEvents.streak >= 30) unlock('streak_30');
    if (runStats.dailyRun) unlock('daily_first');
    if (sessionEvents.prestige >= 1) unlock('prestige_1');
    if (s.totalBreathes >= 50) unlock('breathe_50');
    if (s.powerupTypes.length >= 6) unlock('all_powerups');

    this.save();
    return this._justUnlocked;
  }

  getJustUnlocked() {
    return this._justUnlocked;
  }

  isUnlocked(id) {
    return this.unlocked.has(id);
  }

  getProgress() {
    return { unlocked: this.unlocked.size, total: ACHIEVEMENTS.length };
  }
}

export const achievements = new Achievements();
