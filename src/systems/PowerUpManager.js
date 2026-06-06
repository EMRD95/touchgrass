import { POWERUP_DURATION } from '../utils/constants.js';

export const POWERUP_TYPES = [
  { id: 'magnet', label: 'Magnet', color: 0x4dc9f6, icon: '★', chance: 1.0 },
  { id: 'shield', label: 'Shield', color: 0xffd36e, icon: '◆', chance: 0.9 },
  { id: 'speed', label: 'Speed Boost', color: 0xff7f6e, icon: '▲', chance: 0.85 },
  { id: 'timewarp', label: 'Time Warp', color: 0xc084fc, icon: '◈', chance: 0.7 },
  { id: 'bomb', label: 'Pixel Bomb', color: 0xff3333, icon: '✦', chance: 0.85 },
  { id: 'multiplier', label: '2x Score', color: 0x91d969, icon: '✱', chance: 0.5 },
];

export class PowerUpManager {
  constructor(scene) {
    this.scene = scene;
    this.active = new Map();
    this.group = scene.physics.add.group({ allowGravity: false, immovable: true });
    // Start partially charged so the first visible power-up appears early in a run.
    this.spawnTimer = 9000;
    this.spawnInterval = 15000;
  }

  getSpawnInterval() {
    const pressure = this.scene.getPressure?.() || 0;
    return Math.max(7000, 15000 - pressure * 25);
  }

  spawn() {
    if (this.group.getLength() >= 4) return;
    const profile = this.pickPowerUp();
    if (!profile) return;
    const { x, y } = this.scene.randomSpawnPointNearEdge?.(70) || { x: 0, y: 0 };
    const item = this.scene.physics.add.image(x, y, 'tuft_0')
      .setDisplaySize(54, 54)
      .setDepth(88)
      .setTint(profile.color)
      .setAlpha(0.95);
    item.body.setAllowGravity(false);
    this.refreshPowerUpBody(item);
    item.setData('type', 'powerup');
    item.setData('powerupId', profile.id);
    item.setData('label', profile.label);
    item.setData('icon', profile.icon);
    item.setData('color', profile.color);
    this.group.add(item);

    // Glow ring + badge: power-ups should read as power-ups, not as tiny grass specks.
    const ring = this.scene.add.circle(x, y, 34, profile.color, 0.16)
      .setDepth(87)
      .setStrokeStyle(3, profile.color, 0.85);
    this.scene.tweens.add({
      targets: ring,
      scale: 1.45,
      alpha: 0.08,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    item.setData('ring', ring);

    const badge = this.scene.add.container(x, y).setDepth(90);
    const badgeBg = this.scene.add.circle(0, 0, 23, 0x071008, 0.72)
      .setStrokeStyle(2, profile.color, 0.95);
    const iconText = this.scene.add.text(0, -1, profile.icon, {
      fontFamily: 'Inter, sans-serif',
      fontSize: '27px',
      fontStyle: '900',
      color: '#fff8c6',
      stroke: '#071008',
      strokeThickness: 4,
    }).setOrigin(0.5);
    badge.add([badgeBg, iconText]);
    item.setData('badge', badge);
    this.scene.tweens.add({
      targets: badge,
      scale: 1.12,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    const baseScaleX = item.scaleX;
    const baseScaleY = item.scaleY;
    this.scene.tweens.add({
      targets: item,
      angle: 12,
      scaleX: baseScaleX * 1.15,
      scaleY: baseScaleY * 1.15,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      onUpdate: () => {
        this.refreshPowerUpBody(item);
        this.syncPowerUpDecor(item);
      },
    });
  }

  syncPowerUpDecor(item) {
    if (!item?.active) return;
    const ring = item.getData?.('ring');
    if (ring?.active) ring.setPosition(item.x, item.y);
    const badge = item.getData?.('badge');
    if (badge?.active) badge.setPosition(item.x, item.y);
  }

  refreshPowerUpBody(item) {
    if (!item?.body) return;
    const bodyW = 58;
    const bodyH = 58;
    const sx = Math.max(0.001, Math.abs(item.scaleX));
    const sy = Math.max(0.001, Math.abs(item.scaleY));

    item.body.sourceWidth = bodyW / sx;
    item.body.sourceHeight = bodyH / sy;
    item.body.width = bodyW;
    item.body.height = bodyH;
    item.body.halfWidth = bodyW * 0.5;
    item.body.halfHeight = bodyH * 0.5;
    item.body.offset.x = item.displayOriginX - item.body.halfWidth / sx;
    item.body.offset.y = item.displayOriginY - item.body.halfHeight / sy;
    item.body.position.x = item.x - item.body.halfWidth;
    item.body.position.y = item.y - item.body.halfHeight;
    item.body.updateCenter();
  }

  pickPowerUp() {
    const luckBonus = this.scene.progression?.getSkillEffects().luckBonus || 0;
    const pool = POWERUP_TYPES.filter((p) => {
      const effective = p.chance + luckBonus;
      return Math.random() < Math.min(1, effective);
    });
    if (pool.length === 0) return POWERUP_TYPES[0];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  activate(id) {
    const now = this.scene.now?.() || 0;
    const duration = POWERUP_DURATION[id] ?? 8000;
    if (duration > 0) this.active.set(id, now + duration);
    return duration;
  }

  isActive(id) {
    const now = this.scene.now?.() || 0;
    const expires = this.active.get(id);
    return expires !== undefined && now < expires;
  }

  getRemaining(id) {
    const now = this.scene.now?.() || 0;
    const expires = this.active.get(id);
    if (expires === undefined) return 0;
    return Math.max(0, expires - now);
  }

  update(time, delta) {
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.getSpawnInterval()) {
      this.spawnTimer = 0;
      this.spawn();
    }
    // Clean up expired
    for (const [id, expires] of this.active.entries()) {
      if (time >= expires) {
        this.active.delete(id);
        if (id === 'speed' && this.scene.player) {
          this.scene.player.clearTint();
        }
        if (id === 'timewarp') {
          this.scene.time.timeScale = 1;
        }
      }
    }
  }

  getActiveList() {
    const out = [];
    for (const [id, expires] of this.active.entries()) {
      const remaining = Math.max(0, expires - (this.scene.now?.() || 0));
      if (remaining <= 0) continue;
      const profile = POWERUP_TYPES.find((p) => p.id === id);
      out.push({
        id,
        label: profile?.label || id,
        icon: profile?.icon || '?',
        color: profile?.color || 0xf7f0bb,
        remaining,
      });
    }
    return out;
  }

  destroyCollectible(item) {
    if (!item) return;
    const ring = item.getData?.('ring');
    if (ring?.active) ring.destroy();
    const badge = item.getData?.('badge');
    if (badge?.active) badge.destroy(true);
    if (item.active) item.destroy();
  }

  destroy() {
    this.group?.getChildren().slice().forEach((c) => this.destroyCollectible(c));
  }
}
