import { SaveManager } from './SaveManager.js';
import { auth } from './Auth.js';

const LOCAL_KEY = 'gts_local_leaderboard';
const MAX_ENTRIES = 50;

export class LeaderboardManager {
  constructor() {
    this.localScores = this._loadLocal();
  }

  _loadLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return [];
      return JSON.parse(raw).slice(0, MAX_ENTRIES);
    } catch {
      return [];
    }
  }

  _saveLocal() {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(this.localScores.slice(0, MAX_ENTRIES)));
    } catch {
      // ignore
    }
  }

  submit(score, stats) {
    const entry = {
      score,
      survivalTime: stats.survivalTime || 0,
      bestCombo: stats.bestCombo || 0,
      waveReached: stats.waveReached || 0,
      date: Date.now(),
      userId: auth.getUserId(),
      name: auth.getDisplayName(),
      picture: auth.user?.picture || null,
    };
    this.localScores.push(entry);
    this.localScores.sort((a, b) => b.score - a.score);
    this.localScores = this.localScores.slice(0, MAX_ENTRIES);
    this._saveLocal();
    // TODO: sync to backend when available
  }

  getLocal() {
    return this.localScores.slice(0, 20);
  }

  getPersonalBest() {
    const id = auth.getUserId();
    return this.localScores.filter((e) => e.userId === id)[0] || null;
  }

  getRank(score) {
    return this.localScores.filter((e) => e.score > score).length + 1;
  }
}

export const leaderboard = new LeaderboardManager();
