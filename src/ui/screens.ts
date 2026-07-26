/**
 * Full-screen overlays: title, level intro, pause, level clear, shop, and the
 * two endings. Each phase rebuilds the overlay once; nothing polls per frame
 * except the title strip's little animation.
 */

import { sfx } from '../core/audio';
import { drawUpgradeIcon } from '../art/sprites';
import { UPGRADES, priceFor, type UpgradeId } from '../game/config';
import type { Game } from '../game/game';
import { getLevel } from '../game/levels';
import { drawTitleVignette } from '../game/render';
import type { Phase } from '../game/types';

export class Screens {
  private strip: HTMLCanvasElement | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly game: Game,
  ) {}

  /** Rebuild the overlay for the current phase. */
  render(phase: Phase): void {
    this.strip = null;
    if (phase === 'playing') {
      this.root.hidden = true;
      this.root.innerHTML = '';
      return;
    }
    this.root.hidden = false;
    switch (phase) {
      case 'title':
        this.title();
        break;
      case 'levelIntro':
        this.levelIntro();
        break;
      case 'paused':
        this.paused();
        break;
      case 'levelClear':
        this.levelClear();
        break;
      case 'shop':
        this.shop();
        break;
      case 'gameover':
        this.ending(false);
        break;
      case 'victory':
        this.ending(true);
        break;
    }
  }

  /** Animates the title illustration. Called from the main loop. */
  tick(t: number): void {
    const c = this.strip;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawTitleVignette(ctx, w, h, t);
  }

  private card(html: string, narrow = false): HTMLElement {
    this.root.innerHTML = `<div class="card${narrow ? ' narrow' : ''}">${html}</div>`;
    return this.root.firstElementChild as HTMLElement;
  }

  private button(el: HTMLElement, sel: string, fn: () => void): void {
    const btn = el.querySelector<HTMLButtonElement>(sel);
    if (!btn) return;
    btn.addEventListener('click', () => {
      sfx.unlock();
      sfx.ui();
      fn();
    });
  }

  /* ---------------- Title ---------------- */

  private title(): void {
    const el = this.card(`
      <div class="eyebrow">A farmyard scramble in ten fields</div>
      <h1 class="title">Cluck <span class="amp">&amp;</span> Cover</h1>
      <p class="subtitle">Starring Farmer Skip, who has had quite enough of this.</p>
      <canvas class="title-strip" aria-hidden="true"></canvas>
      <p class="lede">
        Skip is sixty-two, his knees are shot, and he loves this farm more than he will ever
        admit out loud. The hens are laying. A snake is helping itself. Gather the quota, run
        the pests off, spend your coin between fields, and finish what Old Coilback started
        back in ninety-one.
      </p>
      <div class="cols">
        <div class="col">
          <h3>Controls</h3>
          <ul>
            <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrow keys to walk</li>
            <li><b>Click</b> to throw a corn kernel at the cursor</li>
            <li><kbd>P</kbd> pause &middot; <kbd>M</kbd> mute</li>
          </ul>
        </div>
        <div class="col">
          <h3>How you win</h3>
          <ul>
            <li>Meet each field's egg quota</li>
            <li>Do not let the snakes eat their fill</li>
            <li>Beat Old Coilback on field 5</li>
            <li>Run Rennard the Rustler off on field 10</li>
          </ul>
        </div>
        <div class="col">
          <h3>Watch for</h3>
          <ul>
            <li>Roosters pick fights. Weasels take hens.</li>
            <li>Eggs chain a combo if you keep moving</li>
            <li>Three hens lost costs a life</li>
          </ul>
        </div>
      </div>
      <div class="actions">
        <button class="btn" data-start>Start the day</button>
        <span class="footer-note">Best on a laptop with a keyboard and a mouse.</span>
      </div>`);
    this.strip = el.querySelector('canvas');
    this.button(el, '[data-start]', () => this.game.newRun());
    el.querySelector<HTMLButtonElement>('[data-start]')?.focus();
  }

  /* ---------------- Level intro ---------------- */

  private levelIntro(): void {
    const g = this.game;
    const def = g.levelDef;
    const goal = def.boss
      ? `Put ${def.boss === 'coilback' ? 'Old Coilback' : 'Rennard'} down. ${g.bossMaxHp} clean hits.`
      : `Gather ${g.quota} eggs before the snake${def.twist.twinSnakes ? 's' : ''} manage ${g.snakeLimit}.`;
    const el = this.card(
      `
      <div class="eyebrow">Field ${def.n} of 10${def.boss ? ' &middot; Boss' : ''}</div>
      <h2 class="title" style="font-size:clamp(2rem,5.5vw,3.2rem)">${def.name}</h2>
      <blockquote class="quote">&ldquo;${def.card}&rdquo;<br><span style="font-size:.8rem;opacity:.7">&mdash; Farmer Skip</span></blockquote>
      <div class="rule"></div>
      <p class="lede"><b>${def.twistText}</b></p>
      <p class="lede">${goal}</p>
      <div class="actions">
        <button class="btn" data-go>Get to work</button>
        <span class="footer-note">Lives: ${g.lives} &middot; Coins: ${g.coins}</span>
      </div>`,
      true,
    );
    this.button(el, '[data-go]', () => this.game.beginLevel());
    el.querySelector<HTMLButtonElement>('[data-go]')?.focus();
  }

  /* ---------------- Pause ---------------- */

  private paused(): void {
    const el = this.card(
      `
      <div class="eyebrow">Hold on a minute</div>
      <h2 class="title" style="font-size:clamp(2rem,5vw,3rem)">Paused</h2>
      <p class="lede">The hens will wait. They are very good at waiting.</p>
      <div class="actions">
        <button class="btn" data-resume>Back to it</button>
        <button class="btn ghost" data-restart>Start over</button>
      </div>`,
      true,
    );
    this.button(el, '[data-resume]', () => this.game.togglePause());
    this.button(el, '[data-restart]', () => this.game.newRun());
    el.querySelector<HTMLButtonElement>('[data-resume]')?.focus();
  }

  /* ---------------- Level clear ---------------- */

  private levelClear(): void {
    const g = this.game;
    const def = g.levelDef;
    const next = getLevel(Math.min(10, g.level + 1));
    const el = this.card(
      `
      <div class="eyebrow">Field cleared</div>
      <h2 class="title" style="font-size:clamp(2rem,5.5vw,3.2rem)">${def.name}</h2>
      <p class="lede">${
        def.boss
          ? def.boss === 'coilback'
            ? 'Old Coilback is coiled up in the dirt and Skip has not said a word for a full minute.'
            : 'The fox is gone over the wall.'
          : 'Quota met. Skip counts the basket twice, because Skip counts everything twice.'
      }</p>
      <div class="summary">
        <div><div class="k">Score</div><div class="v">${g.score}</div></div>
        <div><div class="k">Coins</div><div class="v">${g.coins}</div></div>
        <div><div class="k">Lives</div><div class="v">${g.lives}</div></div>
        <div><div class="k">Best combo</div><div class="v">${g.stats.bestCombo}</div></div>
      </div>
      <div class="actions">
        <button class="btn" data-next>${def.boss ? `On to ${next.name}` : 'Visit the supply shed'}</button>
      </div>`,
      true,
    );
    this.button(el, '[data-next]', () => this.game.advance());
    el.querySelector<HTMLButtonElement>('[data-next]')?.focus();
  }

  /* ---------------- Shop ---------------- */

  private shop(): void {
    const g = this.game;
    const next = getLevel(Math.min(10, g.level + 1));
    const el = this.card(`
      <div class="eyebrow">Between fields</div>
      <h2 class="title" style="font-size:clamp(1.9rem,5vw,2.8rem)">The Supply Shed</h2>
      <p class="lede">Spending coin does not cost you score &mdash; Skip keeps two ledgers, like a sensible man.</p>
      <div class="shop-grid" data-grid></div>
      <div class="actions">
        <div class="purse"><small>Coins</small><span data-purse>${g.coins}</span></div>
        <button class="btn" data-leave>Head out to ${next.name}</button>
      </div>`);

    const grid = el.querySelector('[data-grid]');
    const purse = el.querySelector('[data-purse]') as HTMLElement;
    const renderGrid = (): void => {
      if (!grid) return;
      grid.innerHTML = '';
      for (const def of UPGRADES) {
        const owned = g.ownedOf(def.id);
        const isOveralls = def.id === 'overalls';
        const maxed = isOveralls ? g.lives >= 5 : owned >= def.maxTier;
        const price = priceFor(def, owned);
        const tierLabel = isOveralls
          ? def.tierText[0]
          : def.tierText[Math.min(owned, def.tierText.length - 1)];

        const item = document.createElement('div');
        item.className = `shop-item${maxed ? ' maxed' : ''}`;
        const pipCount = isOveralls ? 5 : def.maxTier;
        const pipsOn = isOveralls ? g.lives : owned;
        item.innerHTML = `
          <canvas width="92" height="92"></canvas>
          <div>
            <h4>${def.name}</h4>
            <div class="tier">${maxed ? 'Fully kitted out' : `Next: ${tierLabel}`}</div>
            <div class="pips">${Array.from({ length: pipCount }, (_, i) => `<span class="${i < pipsOn ? 'on' : ''}"></span>`).join('')}</div>
            <div class="flavor">${def.flavor}</div>
            <button class="buy" ${maxed || !g.canBuy(def.id) ? 'disabled' : ''}>
              ${maxed ? 'Owned' : `Buy &mdash; ${price} coins`}
            </button>
          </div>`;

        const cv = item.querySelector('canvas') as HTMLCanvasElement;
        const cx = cv.getContext('2d');
        if (cx) {
          cx.setTransform(2, 0, 0, 2, 0, 0);
          cx.translate(23, 23);
          cx.scale(1.5, 1.5);
          drawUpgradeIcon(cx, def.icon);
        }

        item.querySelector('button')?.addEventListener('click', () => {
          sfx.unlock();
          if (g.buy(def.id as UpgradeId)) {
            purse.textContent = String(g.coins);
            renderGrid();
          }
        });
        grid.appendChild(item);
      }
    };
    renderGrid();

    this.button(el, '[data-leave]', () => this.game.leaveShop());
    el.querySelector<HTMLButtonElement>('[data-leave]')?.focus();
  }

  /* ---------------- Endings ---------------- */

  private ending(won: boolean): void {
    const g = this.game;
    const s = g.stats;
    const mins = Math.floor(s.timePlayed / 60);
    const secs = Math.floor(s.timePlayed % 60);
    const el = this.card(`
      <div class="eyebrow">${won ? 'The farm holds' : 'That is that'}</div>
      <h2 class="title" style="font-size:clamp(2.1rem,6vw,3.6rem)">${won ? 'Rennard Runs' : 'Day Lost'}</h2>
      <blockquote class="quote">${
        won
          ? '&ldquo;Sixty-two years old and I am still faster than a fox. Do not tell the hens.&rdquo;'
          : `&ldquo;${g.endReason || 'Skip has run out of overalls.'}&rdquo;`
      }<br><span style="font-size:.8rem;opacity:.7">&mdash; Farmer Skip</span></blockquote>
      <div class="summary">
        <div><div class="k">Final score</div><div class="v">${g.score}</div></div>
        <div><div class="k">Field reached</div><div class="v">${g.level}</div></div>
        <div><div class="k">Fields cleared</div><div class="v">${s.levelsCleared}</div></div>
        <div><div class="k">Eggs gathered</div><div class="v">${s.eggsCollected}</div></div>
        <div><div class="k">Golden</div><div class="v">${s.goldenEggs}</div></div>
        <div><div class="k">Special</div><div class="v">${s.specialEggs}</div></div>
        <div><div class="k">Pests hit</div><div class="v">${s.pestsHit}</div></div>
        <div><div class="k">Best combo</div><div class="v">${s.bestCombo}</div></div>
        <div><div class="k">Hens lost</div><div class="v">${s.chickensLost}</div></div>
        <div><div class="k">Time</div><div class="v">${mins}:${String(secs).padStart(2, '0')}</div></div>
      </div>
      <div class="actions">
        <button class="btn" data-again>${won ? 'Run it again' : 'Back out there'}</button>
      </div>`);
    this.button(el, '[data-again]', () => this.game.newRun());
    el.querySelector<HTMLButtonElement>('[data-again]')?.focus();
  }
}
