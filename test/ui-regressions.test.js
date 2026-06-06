import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RARITY } from '../src/utils/constants.js';
import { isExpandingGrassRarity } from '../src/utils/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const src = (file) => readFileSync(resolve(repoRoot, 'src', file), 'utf8');

test('profile scene uses Phaser containers correctly and never calls unsupported setParent()', () => {
  const profile = src('scenes/ProfileScene.js');
  assert.doesNotMatch(profile, /\.setParent\(/, 'Phaser Text/GameObject does not support setParent() in this project');
  assert.match(profile, /contentContainer\.add\(/, 'profile tab content should be added to the content container');
});

test('colored expanding grass has a matching touch area and no target reticle overlay', () => {
  const game = src('scenes/GameScene.js');

  assert.equal(isExpandingGrassRarity(RARITY.common), false, 'common static grass remains the non-expanding baseline');
  assert.equal(isExpandingGrassRarity(RARITY.rare), true, 'rare grass is still visually special/expanding');

  assert.doesNotMatch(game, /createGrassReticle\(/, 'colored grass must not get target/crosshair reticle overlays');
  assert.doesNotMatch(game, /setData\('reticle'/, 'grass tufts must not store reticle overlays');
  assert.doesNotMatch(game, /collectionRing/, 'legendary/colored grass must not draw blue collection circles around empty space');
  assert.doesNotMatch(game, /strokeCircle\(0, 0, bodyR\)/, 'collection radius should stay invisible; tune the physics body instead of drawing circles');
  assert.doesNotMatch(game, /updateGrassReticles\(/, 'there should be no grass-reticle update loop');
  assert.match(game, /refreshGrassBody\(tuft\)/, 'grass should refresh its physics body from the current visual scale');
  assert.match(game, /rarityId === 'legendary' \? 1\.65/, 'legendary grass keeps a limited forgiveness multiplier');
  assert.match(game, /rarityId === 'epic' \? 1\.35/, 'epic grass gets a modest forgiveness multiplier');
  assert.match(game, /rarityId === 'rare' \? 1\.18/, 'rare grass gets a small forgiveness multiplier');
  assert.match(game, /: 0\.92/, 'common grass hitbox should be slightly stricter than the full visual footprint');
  assert.match(game, /visualW \* mult/, 'body scales with current visual size times rarity multiplier');
  assert.match(game, /sprite\.body\.sourceWidth\s*=/, 'body sourceWidth should counteract Phaser 3.90 scale multiplication in updateBounds');
  assert.match(game, /sprite\.body\.offset\.x\s*=\s*sprite\.displayOriginX/, 'body offset should use Phaser 3.90 displayOrigin to center correctly');
  assert.match(game, /sprite\.body\.offset\.y\s*=\s*sprite\.displayOriginY/, 'body offset Y should use Phaser 3.90 displayOrigin to center correctly');
  assert.match(game, /sprite\.body\.updateCenter\(\)/, 'body center should be recalculated immediately after offset fix');
  assert.match(game, /refreshFixedBody\(tuft, bodyW, bodyH\)/, 'grass should route body sync through fixed-body helper');
  assert.match(game, /onUpdate:\s*\(\)\s*=>\s*this\.refreshGrassBody\(tuft\)/, 'pulsing grass must update its touch area while scaling');
});

test('power-up grass icons keep display-size-relative pulse scale and usable hitbox', () => {
  const powerups = src('systems/PowerUpManager.js');
  assert.match(powerups, /setDisplaySize\(54, 54\)/, 'powerups should be visible, not tiny grass specks');
  assert.match(powerups, /const baseScaleX = item\.scaleX;/, 'powerup pulse must remember setDisplaySize-derived base scale');
  assert.match(powerups, /scaleX: baseScaleX \* 1\.15/, 'powerup pulse must be relative to its display size, not absolute texture scale');
  assert.match(powerups, /badge\.add\(\[badgeBg, iconText\]\)/, 'powerups should render a clear icon badge over the grass texture');
  assert.match(powerups, /syncPowerUpDecor\(item\)/, 'powerup badge/ring should stay synced with the physics item');
  assert.match(powerups, /destroyCollectible\(/, 'powerup cleanup should remove badge and ring decorations');
  assert.match(powerups, /refreshPowerUpBody\(item\)/, 'powerup body must be refreshed after display-size scaling');
  assert.match(powerups, /const bodyW = 58;/, 'powerup hitbox should match the now-visible collectible size, not collapse to <1px');
  assert.match(powerups, /onUpdate:\s*\(\)\s*=>\s*\{[\s\S]*this\.refreshPowerUpBody\(item\)[\s\S]*this\.syncPowerUpDecor\(item\)/, 'powerup hitbox and decoration must stay stable during pulse tween');
  assert.match(powerups, /item\.body\.position\.x = item\.x - item\.body\.halfWidth;/, 'powerup hitbox center must be fixed immediately, before next physics preUpdate');
  assert.match(powerups, /item\.body\.position\.y = item\.y - item\.body\.halfHeight;/, 'powerup hitbox Y center must be fixed immediately, before next physics preUpdate');
  assert.doesNotMatch(powerups, /scaleX:\s*1\.15,/, 'absolute scale 1.15 on a 1024px tuft texture creates a ~1178px giant grass bug');
  assert.doesNotMatch(powerups, /body\.setSize\(28, 28/, 'setSize(28,28) after setDisplaySize collapses to subpixel Arcade body after updateBounds');
  assert.match(powerups, /id: 'bomb'[\s\S]*chance: 0\.85/, 'pixel bomb should be common enough to see during normal play');
  const constants = src('utils/constants.js');
  assert.match(constants, /bomb:\s*0/, 'pixel bomb is an instant effect and should not linger as a fake active buff');
  assert.match(powerups, /if \(duration > 0\) this\.active\.set/, 'instant powerups should not be added to active timed buffs');
});

test('display-sized physics actors pulse relative to their actual display scale', () => {
  const game = src('scenes/GameScene.js');
  assert.match(game, /const bottleBaseScaleX = bottle\.scaleX;/, 'bottle pulse should remember setDisplaySize-derived base scale');
  assert.match(game, /scaleX: bottleBaseScaleX \* 1\.08/, 'bottle pulse must stay relative to its 36x48 display size');
  assert.match(game, /onUpdate:\s*\(\)\s*=>\s*this\.refreshFixedBody\(bottle, bottleBodyW, bottleBodyH\)/, 'bottle hitbox should stay centered and stable during pulse');
  assert.match(game, /const bossBaseScaleX = boss\.scaleX;/, 'boss pulse should remember setDisplaySize-derived base scale');
  assert.match(game, /scaleX: bossBaseScaleX \* 1\.25/, 'boss pulse must stay relative to its 96px display size');
  assert.match(game, /onUpdate:\s*\(\)\s*=>\s*this\.refreshFixedBody\(boss, bossBodyW, bossBodyH\)/, 'boss hitbox should stay centered and stable during pulse');
  assert.match(game, /onUpdate:\s*\(\)\s*=>\s*this\.refreshFixedBody\(enemy, enemyBodyW, enemyBodyH\)/, 'enemy hitboxes should stay stable while logo sprites pulse');
  assert.doesNotMatch(game, /scaleX:\s*1\.08,\s*scaleY:\s*1\.08,\s*duration:\s*640/, 'absolute bottle scale after setDisplaySize can create huge collectibles');
  assert.doesNotMatch(game, /targets:\s*boss,\s*scaleX:\s*1\.25,\s*scaleY:\s*1\.25/, 'absolute boss scale after setDisplaySize can create huge sprites');
  assert.match(game, /const burstScaleX = enemy\.scaleX \* 1\.8;/, 'enemy death burst should scale relative to current display scale');
  assert.doesNotMatch(game, /targets:\s*enemy, scaleX:\s*1\.8, scaleY:\s*1\.8/, 'enemy death burst must not jump to absolute texture scale');
});

test('hydration bottles have a visible non-empty beacon and cleanup path', () => {
  const game = src('scenes/GameScene.js');
  assert.match(game, /createBottleBeacon\(/, 'bottle beacon should be centralized in a helper');
  assert.match(game, /WATER/i, 'bottle beacon should include clear readable water text');
  assert.match(game, /this\.add\.image\(0, 0, 'water_bottle'\)/, 'bottle beacon should render a bottle icon, not an empty blue circle');
  assert.doesNotMatch(game, /container\(x, y - 64/, 'bottle beacon should not be detached above the actual pickup as an empty halo');
  assert.doesNotMatch(game, /💧/, 'bottle beacon should not depend on emoji font fallback for its icon');
  assert.match(game, /destroyBottle\(/, 'bottle cleanup should also destroy beacons');
  assert.match(game, /detune:\s*-600/, 'bottle collection should play a lower-pitched drinking sound');
  assert.match(game, /pulseHydrationAura\(true\)/, 'drinking water should immediately clear nearby swarm pressure');
  assert.match(game, /nextHydrationPulseAt = now \+ 160/, 'hydration aura should keep pulsing while the effect is active');
  assert.match(game, /enemy\.body\.enable = false;/, 'destroyed enemies must disable physics immediately so they cannot damage after hydration');
  assert.match(game, /this\.corporateEnemies\.remove\(enemy\)/, 'destroyed enemies should leave the threat group immediately');
  assert.match(game, /if \(time < this\.hydratingUntil\) return;/, 'threat maintenance should not refill the swarm while hydration is active');
});

test('layout-agnostic movement supports physical WASD plus typed WASD/ZQSD and arrows', () => {
  const game = src('scenes/GameScene.js');
  const input = src('utils/input.js');
  assert.match(input, /MOVEMENT_CODE_DIRECTIONS/, 'movement should use KeyboardEvent.code for physical key positions across layouts/languages');
  assert.match(input, /KeyW: 'up'/, 'physical QWERTY W position should move up even on non-QWERTY layouts');
  assert.match(input, /KeyA: 'left'/, 'physical QWERTY A position should move left even on non-QWERTY layouts');
  assert.match(input, /KeyZ: 'up'/, 'literal/physical Z should also support ZQSD');
  assert.match(input, /KeyQ: 'left'/, 'literal/physical Q should also support ZQSD');
  assert.match(input, /MOVEMENT_KEY_DIRECTIONS/, 'movement should also inspect typed key labels');
  assert.match(input, /w: 'up'/, 'typed W should move up');
  assert.match(input, /z: 'up'/, 'typed Z should move up');
  assert.match(input, /a: 'left'/, 'typed A should move left');
  assert.match(input, /q: 'left'/, 'typed Q should move left');
  assert.match(game, /getMovementDirectionsFromKeyboardEvent/, 'GameScene should use the pure input helper');
  assert.match(game, /this\.input\.keyboard\.on\('keydown', this\.handleMovementKeyDown, this\)/, 'scene should track held layout-agnostic movement keys');
  assert.match(game, /this\.input\.keyboard\.off\('keyup', this\.handleMovementKeyUp, this\)/, 'scene shutdown should remove keyboard listeners');
  assert.match(game, /this\.isMovementDown\('left'\)/, 'update loop should route through layout-agnostic movement state');
});

test('camera zooms out with speed without shrinking fixed HUD readability or exposing black edges', () => {
  const game = src('scenes/GameScene.js');
  assert.match(game, /updateCameraZoom\(\)/, 'game should have a camera zoom update path');
  assert.match(game, /speedProgress = clamp\(\(this\.playerSpeed - 225\) \/ \(560 - 225\)/, 'zoom should be tied to player speed progression');
  assert.match(game, /targetZoom = clamp\(1 - speedProgress \* 0\.18 - speedBoostBonus, 0\.78, 1\)/, 'zoom-out should be slight and capped');
  assert.match(game, /this\.hud\.container\.setScale\(1 \/ nextZoom\)/, 'HUD should be counter-scaled when the world camera zooms');
  assert.match(game, /const BACKDROP_PAD = 160;/, 'fixed backdrop should have overscan padding for zoom-out');
  assert.match(game, /setPosition\(layerX, layerY\)\.setSize\(layerW, layerH\)/, 'backdrop should resize and reposition, not just shrink from the top-left');
  assert.match(game, /setBackgroundColor\(0x122414\)/, 'camera background should be grass-colored if a subpixel gap appears');
});

test('menu/profile/game-over scenes avoid small-screen overlap traps', () => {
  const menu = src('scenes/MenuScene.js');
  const profile = src('scenes/ProfileScene.js');
  const leaderboardScene = src('scenes/LeaderboardScene.js');
  const gameOver = src('scenes/GameOverScene.js');
  assert.match(menu, /modeButtons\.forEach/, 'menu buttons should be generated from a single measured stack');
  assert.match(menu, /navTargetY/, 'menu nav row should reserve footer space');
  assert.match(profile, /rowsPerPage/, 'achievement list should be paginated instead of overflowing the profile screen');
  assert.match(profile, /descWrapW/, 'skill descriptions should reserve space so upgrade + buttons cannot overlap text');
  assert.doesNotMatch(profile, /desc: '[+-]/, 'skill effect descriptions should not start with stray +/- glyphs in the text column');
  assert.match(leaderboardScene, /rowsFit/, 'leaderboard should cap visible rows to available panel height');
  assert.match(gameOver, /const restartY = narrow \? btnY - 24 : btnY;/, 'mobile game-over buttons should be vertically stacked');
  assert.match(gameOver, /visibleAchievements/, 'game-over should cap achievement text so buttons remain reachable');
});

test('Google account is optional and exposed through an explicit button', () => {
  const auth = src('systems/Auth.js');
  const main = src('main.js');
  const menu = src('scenes/MenuScene.js');
  assert.match(auth, /ensureGuest\(/, 'Auth should expose a non-popup guest identity initializer');
  assert.match(main, /auth\.ensureGuest\(\)/, 'boot should create a guest identity without triggering Google popup');
  assert.doesNotMatch(main, /auth\.signIn\(\)/, 'boot must not force Google sign-in');
  assert.match(menu, /Sign in with Google/, 'menu should have an explicit Google sign-in button');
  assert.match(menu, /Continue as Guest|Guest mode/i, 'menu should make guest mode clear');
});
