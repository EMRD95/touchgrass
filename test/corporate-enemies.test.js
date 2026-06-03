import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  CORPORATE_ENEMY_PROFILES,
  CORPORATE_ENEMY_TYPES,
  MAX_CORPORATE_ENEMIES,
  getCorporateEnemyProfile,
  getCorporateStrategy,
  getTargetCorporateEnemyCount,
  pickCorporateEnemyType,
} from '../src/corporate-enemies.js';

const PROJECT_ROOT = new URL('..', import.meta.url).pathname;

const EXPECTED_CORPORATE_TYPES = [
  'tiktok',
  'youtube',
  'chatgpt',
  'discord',
  'google',
  'wikipedia',
  'gmail',
  'instagram',
  'facebook',
  'linkedin',
  'teams',
  'whatsapp',
  'twitter',
];

test('corporate enemy roster replaces old character enemies', () => {
  assert.deepEqual(CORPORATE_ENEMY_TYPES, EXPECTED_CORPORATE_TYPES);
  assert.equal(MAX_CORPORATE_ENEMIES, 132);

  const patterns = new Set();
  for (const type of CORPORATE_ENEMY_TYPES) {
    const profile = getCorporateEnemyProfile(type);
    assert.equal(profile.type, type);
    assert.equal(profile.asset, `corporate/${type}.svg`);
    assert.equal(profile.textureKey, `logo_${type}`);
    assert.ok(profile.label.length > 0);
    assert.ok(profile.primaryPattern.length > 0);
    assert.ok(profile.strategies.length >= 3);
    patterns.add(profile.primaryPattern);
  }

  assert.equal(patterns.size, CORPORATE_ENEMY_TYPES.length, 'each logo should have a distinct graph/pathing pattern');
});

test('corporate enemy selection and strategy helpers are deterministic with injected RNG', () => {
  assert.equal(pickCorporateEnemyType(() => 0), 'tiktok');
  assert.equal(pickCorporateEnemyType(() => 0.12), 'youtube');
  assert.equal(pickCorporateEnemyType(() => 0.35), 'google');
  assert.equal(pickCorporateEnemyType(() => 0.62), 'facebook');
  assert.equal(pickCorporateEnemyType(() => 0.9), 'whatsapp');
  assert.equal(pickCorporateEnemyType(() => 0.999999), 'twitter');

  const discord = getCorporateEnemyProfile('discord');
  assert.equal(getCorporateStrategy(discord, () => 0), discord.strategies[0]);
  assert.equal(getCorporateStrategy(discord, () => 0.999999), discord.strategies.at(-1));
});

test('corporate pressure target preserves the old combined enemy budget', () => {
  assert.equal(getTargetCorporateEnemyCount({ score: 0, survivalTime: 0 }), 9);
  assert.equal(getTargetCorporateEnemyCount({ score: 999, survivalTime: 999 }), MAX_CORPORATE_ENEMIES);
});

test('game source no longer links Hermes or phone enemies and loads corporate assets', () => {
  const source = fs.readFileSync(path.join(PROJECT_ROOT, 'src/main.js'), 'utf8');

  assert.doesNotMatch(source, /hermes/i);
  assert.doesNotMatch(source, /\bphone\b/i);
  assert.doesNotMatch(source, /characters\/hermes_/i);
  assert.doesNotMatch(source, /📱/u);

  for (const type of CORPORATE_ENEMY_TYPES) {
    assert.match(source, new RegExp(`logo_${type}`));
    assert.match(source, new RegExp(`corporate/${type}\\.svg`));
  }
  assert.match(source, /notification_chime\.ogg/);
});

test('corporate logo asset files exist', () => {
  for (const profile of Object.values(CORPORATE_ENEMY_PROFILES)) {
    assert.ok(fs.existsSync(path.join(PROJECT_ROOT, 'public/assets', profile.asset)), `${profile.asset} should exist`);
  }
  assert.ok(fs.existsSync(path.join(PROJECT_ROOT, 'public/assets/audio/notification_chime.ogg')));
});
