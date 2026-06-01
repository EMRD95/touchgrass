# Grass Touching Simulator

A tiny Phaser/Vite meme game: move with WASD/arrows, touch grass tufts, press Shift/Space to breathe, and survive the doomscroll goblins long enough to become real.

## Live site

Planned production URL: https://touchgrass.em95.org/

## Run

```bash
npm install
npm run dev
```

Open the printed local URL (usually http://localhost:5173).

## Build

```bash
npm run build
npm run preview
```

CI runs `npm ci` and `npm run build` on every push to `main`.

## Design notes

- JavaScript-only frontend; no backend needed for this scope.
- Phaser 3 provides the game loop, rendering, input, tweens, physics, audio, camera, and asset loading.
- The supplied reference image is served from `public/assets/reference/grass_touching_simulator.webp` and rendered 1:1 as the menu page at its native 1376×768 size, with invisible click/keyboard start handling so the visual stays identical to the reference image.
- Existing CC0 Kenney packs provide the actual sprites/tiles/audio so most of the game is assembled from existing building blocks.
- Fonts are served locally from `public/fonts/InterVariable.woff2`; no Google Fonts/CDN calls.
