export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.particles = scene.add.particles(0, 0, 'tuft_0', {
      lifespan: 600,
      scale: { start: 0.04, end: 0 },
      speed: { min: 60, max: 180 },
      gravityY: 120,
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(3000);
  }

  burst(x, y, color = 0x91d969, count = 8, speed = 140) {
    if (!this.particles) return;
    const prevTint = this.particles.emitter?.particleTint || null;
    this.particles.setParticleTint(color);
    this.particles.explode(count, x, y);
    if (prevTint !== null) this.particles.setParticleTint(prevTint);
  }

  trail(target, color = 0x91d969, rate = 60) {
    if (!target || !target.active) return;
    this.scene.time.delayedCall(rate, () => {
      if (!target.active) return;
      const t = this.scene.add.circle(target.x, target.y, 3, color, 0.6).setDepth(50);
      this.scene.tweens.add({
        targets: t,
        scale: 0,
        alpha: 0,
        duration: 350,
        ease: 'Quad.out',
        onComplete: () => t.destroy(),
      });
    });
  }

  shockwave(x, y, radius = 200, color = 0xf7f0bb) {
    const ring = this.scene.add.circle(x, y, 12, color, 0.15)
      .setStrokeStyle(3, color, 0.8)
      .setDepth(3000);
    this.scene.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 500,
      ease: 'Sine.out',
      onComplete: () => ring.destroy(),
    });
  }

  floatText(x, y, message, color = '#fff2a8', size = 18, duration = 980) {
    const text = this.scene.add.text(x, y, message, {
      fontFamily: 'Inter, sans-serif',
      fontSize: `${size}px`,
      fontStyle: '900',
      color,
      align: 'center',
      stroke: '#071008',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(3000);
    this.scene.tweens.add({
      targets: text,
      y: y - 54,
      alpha: 0,
      scale: 1.08,
      duration,
      ease: 'Cubic.out',
      onComplete: () => text.destroy(),
    });
    return text;
  }

  screenFlash(duration = 80, r = 194, g = 237, b = 117) {
    this.scene.cameras.main.flash(duration, r, g, b, false);
  }

  screenShake(duration = 170, intensity = 0.008) {
    this.scene.cameras.main.shake(duration, intensity);
  }

  pulseScale(target, scale = 1.3, duration = 200) {
    if (!target?.active) return;
    this.scene.tweens.add({
      targets: target,
      scaleX: target.scaleX * scale,
      scaleY: target.scaleY * scale,
      yoyo: true,
      duration,
      ease: 'Sine.inOut',
    });
  }

  magnetPull(target, toX, toY, speed = 420) {
    if (!target?.active) return;
    const dist = Phaser.Math.Distance.Between(target.x, target.y, toX, toY);
    if (dist < 10) return;
    const angle = Phaser.Math.Angle.Between(target.x, target.y, toX, toY);
    this.scene.tweens.add({
      targets: target,
      x: toX,
      y: toY,
      duration: Math.max(80, (dist / speed) * 1000),
      ease: 'Sine.in',
    });
  }
}
