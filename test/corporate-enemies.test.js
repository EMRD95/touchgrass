import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = new URL('..', import.meta.url).pathname;

const EXPECTED_ENEMY_TYPES = [
  'tiktok', 'youtube', 'chatgpt', 'discord', 'google', 'wikipedia',
  'gmail', 'instagram', 'facebook', 'linkedin', 'teams', 'whatsapp', 'twitter',
  'hermes_walk1', 'hermes_walk2',
];

test('game source includes all enemy assets and Hermes animation', () => {
  const gameSource = fs.readFileSync(path.join(PROJECT_ROOT, 'src/scenes/GameScene.js'), 'utf8');
  const bootSource = fs.readFileSync(path.join(PROJECT_ROOT, 'src/scenes/BootScene.js'), 'utf8');

  for (const type of EXPECTED_ENEMY_TYPES) {
    if (type.startsWith('hermes')) {
      assert.match(gameSource, new RegExp(`enemy_${type}`));
    } else {
      assert.match(gameSource, new RegExp(`logo_${type}`));
    }
  }
  assert.match(bootSource, /this\.anims\.create\(\{ key: 'hermes_walk'/);
  assert.match(gameSource, /enemy\.play\(profile\.animationKey\)/);
  assert.match(gameSource, /enemy\.setData\('type', type\)/, 'spawned enemies must keep their actual profile type for AI/damage labels');
  assert.doesNotMatch(gameSource, /enemy\.setData\('type', profile\.type\)/, 'profiles do not define profile.type, so this would erase enemy identity');
  const enemyTypesBlock = gameSource.match(/const CORPORATE_ENEMY_TYPES = \[([\s\S]*?)\];/)?.[1] || '';
  assert.doesNotMatch(enemyTypesBlock, /'boss'/, 'boss should only spawn through spawnBoss(), never the regular random enemy roster');
  assert.match(bootSource, /notification_chime\.ogg/);
});

test('enemy asset files exist', () => {
  for (const type of EXPECTED_ENEMY_TYPES) {
    if (type.startsWith('hermes')) {
      assert.ok(fs.existsSync(path.join(PROJECT_ROOT, `public/assets/characters/${type}.png`)), `${type} asset should exist`);
    } else {
      assert.ok(fs.existsSync(path.join(PROJECT_ROOT, `public/assets/corporate/${type}.svg`)), `${type} asset should exist`);
    }
  }
  assert.ok(fs.existsSync(path.join(PROJECT_ROOT, 'public/assets/audio/notification_chime.ogg')));
});
