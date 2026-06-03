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

const EXPECTED_ENEMY_TYPES = [
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
  'hermes_walk1',
  'hermes_walk2',
];

const HERMES_SPRITE_TYPES = new Set(['hermes_walk1', 'hermes_walk2']);

test('enemy roster includes corporate logos and requested Hermes sprite variants', () => {
  assert.deepEqual(CORPORATE_ENEMY_TYPES, EXPECTED_ENEMY_TYPES);
  assert.equal(MAX_CORPORATE_ENEMIES, 132);

  const patterns = new Set();
  for (const type of CORPORATE_ENEMY_TYPES) {
    const profile = getCorporateEnemyProfile(type);
    assert.equal(profile.type, type);
    if (HERMES_SPRITE_TYPES.has(type)) {
      assert.equal(profile.asset, `characters/${type}.png`);
      assert.equal(profile.textureKey, `enemy_${type}`);
      assert.equal(profile.animationKey, 'hermes_walk');
      assert.deepEqual(profile.animationFrames, ['enemy_hermes_walk1', 'enemy_hermes_walk2']);
      assert.equal(profile.defaultFlipX, true);
      assert.match(profile.label, /Hermes/);
    } else {
      assert.equal(profile.asset, `corporate/${type}.svg`);
      assert.equal(profile.textureKey, `logo_${type}`);
    }
    assert.ok(profile.label.length > 0);
    assert.ok(profile.primaryPattern.length > 0);
    assert.ok(profile.strategies.length >= 3);
    patterns.add(profile.primaryPattern);
  }

  assert.equal(patterns.size, CORPORATE_ENEMY_TYPES.length, 'each enemy skin should have a distinct graph/pathing pattern');
});

test('enemy selection and strategy helpers are deterministic with injected RNG', () => {
  CORPORATE_ENEMY_TYPES.forEach((type, index) => {
    assert.equal(pickCorporateEnemyType(() => (index + 0.5) / CORPORATE_ENEMY_TYPES.length), type);
  });

  const discord = getCorporateEnemyProfile('discord');
  assert.equal(getCorporateStrategy(discord, () => 0), discord.strategies[0]);
  assert.equal(getCorporateStrategy(discord, () => 0.999999), discord.strategies.at(-1));
});

test('corporate pressure target preserves the old combined enemy budget', () => {
  assert.equal(getTargetCorporateEnemyCount({ score: 0, survivalTime: 0 }), 9);
  assert.equal(getTargetCorporateEnemyCount({ score: 999, survivalTime: 999 }), MAX_CORPORATE_ENEMIES);
});

test('game source keeps phone enemies removed and loads all requested enemy assets', () => {
  const source = fs.readFileSync(path.join(PROJECT_ROOT, 'src/main.js'), 'utf8');

  assert.doesNotMatch(source, /\bphone\b/i);
  assert.doesNotMatch(source, /📱/u);

  for (const type of CORPORATE_ENEMY_TYPES) {
    const profile = getCorporateEnemyProfile(type);
    assert.match(source, new RegExp(profile.textureKey));
    assert.match(source, new RegExp(profile.asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(source, /this\.anims\.create\(\{ key: 'hermes_walk'/);
  assert.match(source, /frames:\s*\[\{ key: 'enemy_hermes_walk1' \}, \{ key: 'enemy_hermes_walk2' \}\]/);
  assert.match(source, /this\.physics\.add\.sprite\(x, y, profile\.textureKey\)/);
  assert.match(source, /enemy\.setFlipX\(profile\.defaultFlipX\)/);
  assert.match(source, /enemy\.play\(profile\.animationKey\)/);
  assert.match(source, /notification_chime\.ogg/);
});

test('enemy asset files exist', () => {
  for (const profile of Object.values(CORPORATE_ENEMY_PROFILES)) {
    assert.ok(fs.existsSync(path.join(PROJECT_ROOT, 'public/assets', profile.asset)), `${profile.asset} should exist`);
  }
  assert.ok(fs.existsSync(path.join(PROJECT_ROOT, 'public/assets/audio/notification_chime.ogg')));
});
