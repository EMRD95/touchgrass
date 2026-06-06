export function createButton(scene, x, y, text, opts = {}) {
  const { width = 220, height = 52, fontSize = '18px', color = '#f7f0bb', bgColor = 0x102013, bgAlpha = 0.85, strokeColor = 0xf7f0bb, strokeAlpha = 0.45 } = opts;
  const container = scene.add.container(x, y).setDepth(opts.depth || 1000);
  const bg = scene.add.rectangle(0, 0, width, height, bgColor, bgAlpha)
    .setStrokeStyle(2, strokeColor, strokeAlpha);
  const label = scene.add.text(0, 0, text, {
    fontFamily: 'Inter, sans-serif',
    fontSize,
    fontStyle: '800',
    color,
  }).setOrigin(0.5);
  container.add([bg, label]);
  container.setSize(width, height);

  if (opts.onClick) {
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      bg.setFillStyle(0x1a2e1c, bgAlpha);
      label.setScale(1.04);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(bgColor, bgAlpha);
      label.setScale(1);
    });
    bg.on('pointerdown', () => {
      bg.setFillStyle(0x223a1f, bgAlpha);
      opts.onClick();
    });
  }

  return { container, bg, label };
}

export function createPanel(scene, x, y, w, h, opts = {}) {
  const { fill = 0x102013, fillAlpha = 0.88, stroke = 0xf7f0bb, strokeAlpha = 0.35, depth = 1000 } = opts;
  const panel = scene.add.container(x, y).setDepth(depth);
  const rect = scene.add.rectangle(0, 0, w, h, fill, fillAlpha).setStrokeStyle(2, stroke, strokeAlpha);
  panel.add(rect);
  panel.rect = rect;
  return panel;
}

export function createLabel(scene, x, y, text, opts = {}) {
  const { fontSize = '16px', color = '#f7f0bb', align = 'left', originX = 0, originY = 0, depth = 1000 } = opts;
  return scene.add.text(x, y, text, {
    fontFamily: 'Inter, sans-serif',
    fontSize,
    fontStyle: opts.fontStyle || '800',
    color,
    align,
    wordWrap: opts.wordWrap || undefined,
    stroke: opts.stroke || '#071008',
    strokeThickness: opts.strokeThickness ?? 4,
  }).setOrigin(originX, originY).setDepth(depth);
}

export function createProgressBar(scene, x, y, w, h, opts = {}) {
  const container = scene.add.container(x, y).setDepth(opts.depth || 1000);
  const bg = scene.add.rectangle(0, 0, w, h, opts.bgColor || 0x071008, 0.85).setOrigin(0, 0.5);
  const bar = scene.add.rectangle(0, 0, 0, h, opts.barColor || 0x91d969, 1).setOrigin(0, 0.5);
  container.add([bg, bar]);
  return { container, bg, bar, width: w, setValue(pct) {
    bar.setDisplaySize(w * Math.max(0, Math.min(1, pct)), h);
  } };
}
