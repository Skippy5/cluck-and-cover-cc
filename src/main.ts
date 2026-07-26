/**
 * Farmer Skip's Cluck & Cover CC — entry point.
 *
 * Owns the canvas, the frame loop and the global key bindings, and wires the
 * simulation (`Game`) to the two presentation layers (canvas `render`, DOM
 * `Hud` + `Screens`). Everything it creates is torn down by `destroy()`, so a
 * hot reload or a restart never leaves a listener behind.
 */

import './ui/styles.css';

import { sfx } from './core/audio';
import { Input } from './core/input';
import { Game } from './game/game';
import { render } from './game/render';
import { Hud } from './ui/hud';
import { Screens } from './ui/screens';

const app = document.getElementById('app');
const canvas = document.getElementById('stage') as HTMLCanvasElement | null;
const hudRoot = document.getElementById('hud');
const overlayRoot = document.getElementById('overlay');

if (!app || !canvas || !hudRoot || !overlayRoot) {
  throw new Error('Cluck & Cover: expected #app, #stage, #hud and #overlay in the document.');
}

const ctx = canvas.getContext('2d', { alpha: false });
if (!ctx) throw new Error('Cluck & Cover: this browser cannot provide a 2D canvas context.');

const game = new Game();
const input = new Input(canvas);
const hud = new Hud(hudRoot);
const screens = new Screens(overlayRoot, game);

let cssW = 0;
let cssH = 0;

function resize(): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cssW = canvas!.clientWidth;
  cssH = canvas!.clientHeight;
  const w = Math.max(1, Math.round(cssW * dpr));
  const h = Math.max(1, Math.round(cssH * dpr));
  if (canvas!.width !== w || canvas!.height !== h) {
    canvas!.width = w;
    canvas!.height = h;
  }
  ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const onResize = (): void => resize();
window.addEventListener('resize', onResize);

// The overlay is rebuilt whenever the phase changes rather than every frame.
game.onPhaseChange = (phase) => {
  screens.render(phase);
  hud.setVisible(phase === 'playing' || phase === 'paused');
};

const onKey = (e: KeyboardEvent): void => {
  sfx.unlock();
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (game.phase === 'playing' || game.phase === 'paused') {
      e.preventDefault();
      game.togglePause();
    }
  } else if (e.code === 'KeyM') {
    sfx.toggleMute();
  } else if (e.code === 'Enter' || e.code === 'Space') {
    // Enter advances whichever card is showing, for keyboard-only play.
    const btn = overlayRoot!.querySelector<HTMLButtonElement>('.btn');
    if (btn && !overlayRoot!.hidden && document.activeElement?.tagName !== 'BUTTON') {
      e.preventDefault();
      btn.click();
    }
  }
};
window.addEventListener('keydown', onKey);
canvas.addEventListener('pointerdown', () => sfx.unlock());

let last = performance.now();
let raf = 0;

function frame(now: number): void {
  raf = requestAnimationFrame(frame);
  // Clamp so an alt-tab or a slow frame never teleports anything through a wall.
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  resize();
  game.update(dt, input);
  render(ctx!, game, cssW, cssH);
  if (game.phase === 'playing' || game.phase === 'paused') hud.update(game);
  screens.tick(now / 1000);
  input.endFrame();
}

// First paint: title screen over an idle field so the page is never blank.
game.startLevel(1);
resize();
screens.render('title');
hud.setVisible(false);
raf = requestAnimationFrame(frame);

/** Used by Vite's HMR and available for tests; removes every listener. */
export function destroy(): void {
  cancelAnimationFrame(raf);
  window.removeEventListener('resize', onResize);
  window.removeEventListener('keydown', onKey);
  input.destroy();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => destroy());
}

// Dev-only handle for poking at the simulation from the console. Stripped from
// production builds by the bundler's dead-code elimination.
if (import.meta.env.DEV) {
  const step = (frames = 1, dt = 1 / 60): void => {
    for (let i = 0; i < frames; i++) {
      resize();
      game.update(dt, input);
      render(ctx, game, cssW, cssH);
      if (game.phase === 'playing' || game.phase === 'paused') hud.update(game);
      input.endFrame();
    }
  };
  // Same simulation without the draw call, for fast headless balance runs.
  const stepSim = (frames = 1, dt = 1 / 60): void => {
    for (let i = 0; i < frames; i++) {
      game.update(dt, input);
      input.endFrame();
    }
  };
  (window as unknown as { __cluck: unknown }).__cluck = { game, input, hud, screens, step, stepSim, destroy };
}
