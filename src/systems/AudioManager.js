export class AudioManager {
  constructor(scene) {
    this.scene = scene;
    this.muted = false;
    this.musicLayer = null;
    this.musicIntensity = 0;
    this.sfxVolume = 0.4;
    this.musicVolume = 0.18;
    this._beatTimer = null;
    this._bpm = 90;
  }

  preload() {
    this.scene.load.audio('foot0', `assets/audio/footstep_grass_000.ogg?v=5`);
    this.scene.load.audio('foot1', `assets/audio/footstep_grass_001.ogg?v=5`);
    this.scene.load.audio('touch', `assets/audio/touch.ogg?v=5`);
    this.scene.load.audio('notification', `assets/audio/notification_chime.ogg?v=5`);
    this.scene.load.audio('hit', `assets/audio/hit.ogg?v=5`);
  }

  playFootstep(speed = 225) {
    if (this.muted) return;
    const vol = 0.035 + Math.min(0.04, (speed - 225) / 8000);
    const key = Math.random() > 0.5 ? 'foot0' : 'foot1';
    this.scene.sound.play(key, { volume: vol, detune: Phaser.Math.Between(-100, 100) });
  }

  playTouch(pitch = 0) {
    if (this.muted) return;
    this.scene.sound.play('touch', { volume: 0.22, detune: pitch + Phaser.Math.Between(-120, 120) });
  }

  playHit() {
    if (this.muted) return;
    this.scene.sound.play('hit', { volume: 0.35 });
  }

  playNotification() {
    if (this.muted) return;
    this.scene.sound.play('notification', { volume: 0.38, detune: Phaser.Math.Between(-30, 40) });
  }

  playPowerUp() {
    if (this.muted) return;
    this.scene.sound.play('touch', { volume: 0.4, detune: 600 });
  }

  playBossAlert() {
    if (this.muted) return;
    this.scene.sound.play('notification', { volume: 0.55, detune: -400 });
  }

  playWaveStart() {
    if (this.muted) return;
    this.scene.sound.play('notification', { volume: 0.42, detune: -200 });
  }

  playLegendary() {
    if (this.muted) return;
    this.scene.sound.play('touch', { volume: 0.5, detune: 900 });
  }

  setIntensity(intensity) {
    this.musicIntensity = clamp(intensity, 0, 1);
  }

  setMute(mute) {
    this.muted = mute;
    this.scene.sound.mute = mute;
  }
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
