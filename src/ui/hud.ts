/**
 * The persistent HUD. Built once, then updated from game state each frame.
 * Icons are drawn with the same sprite functions as the field, on tiny
 * canvases, so nothing in the interface is a font glyph pretending to be art.
 */

import { drawLifePip, drawPowerIcon, drawSkipPortrait, type PowerKind } from '../art/sprites';
import { CONFIG } from '../game/config';
import type { Game } from '../game/game';

const POWER_TEXT: Record<PowerKind, string> = {
  speed: 'Swift Boots',
  shield: 'Barrel Shield',
  magnet: 'Lodestone',
  freeze: 'Cold Snap',
};

export class Hud {
  private root: HTMLElement;
  private levelNum!: HTMLElement;
  private levelName!: HTMLElement;
  private levelTwist!: HTMLElement;
  private goalName!: HTMLElement;
  private goalCount!: HTMLElement;
  private goalBar!: HTMLElement;
  private snakeWrap!: HTMLElement;
  private snakeCount!: HTMLElement;
  private snakeBar!: HTMLElement;
  private scoreEl!: HTMLElement;
  private coinsEl!: HTMLElement;
  private livesEl!: HTMLElement;
  private powerWrap!: HTMLElement;
  private powerName!: HTMLElement;
  private powerBar!: HTMLElement;
  private powerIcon!: HTMLCanvasElement;
  private comboTag!: HTMLElement;

  private pips: HTMLCanvasElement[] = [];
  private lastLives = -1;
  private lastPower: PowerKind | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.build();
  }

  private build(): void {
    this.root.innerHTML = `
      <div class="hud-top">
        <div class="panel level-panel">
          <div class="label" data-level-num>Level 1</div>
          <div class="value" data-level-name>Stonewhistle Yard</div>
          <div class="twist" data-level-twist></div>
        </div>
        <div class="panel goal-panel">
          <div class="meter">
            <div class="meter-head">
              <span class="name" data-goal-name>Eggs gathered</span>
              <span class="count" data-goal-count>0 / 5</span>
            </div>
            <div class="bar"><i data-goal-bar></i></div>
          </div>
          <div class="meter" data-snake-wrap>
            <div class="meter-head">
              <span class="name">Eaten by the snake</span>
              <span class="count" data-snake-count>0 / 5</span>
            </div>
            <div class="bar snake"><i data-snake-bar></i></div>
          </div>
        </div>
        <div class="panel stat-panel">
          <div class="who">
            <canvas width="112" height="112" data-portrait aria-hidden="true"></canvas>
            <div>
              <div class="label">Farmer</div>
              <div class="who-name">Skip</div>
            </div>
          </div>
          <span class="label">Score</span><span class="num" data-score>0</span>
          <span class="label">Coins</span><span class="num" data-coins>0</span>
          <div class="lives" data-lives></div>
        </div>
      </div>
      <div class="hud-bottom">
        <div class="panel power" data-power hidden>
          <canvas width="52" height="52" style="width:26px;height:26px" data-power-icon></canvas>
          <div>
            <div class="power-name" data-power-name>Swift Boots</div>
            <div class="bar power-bar"><i data-power-bar></i></div>
          </div>
        </div>
        <div class="combo-tag" data-combo hidden></div>
        <div class="hint">WASD / arrows to move &middot; click to throw corn &middot; P pause &middot; M mute</div>
      </div>`;

    const q = <T extends HTMLElement>(sel: string): T => this.root.querySelector(sel) as T;
    this.levelNum = q('[data-level-num]');
    this.levelName = q('[data-level-name]');
    this.levelTwist = q('[data-level-twist]');
    this.goalName = q('[data-goal-name]');
    this.goalCount = q('[data-goal-count]');
    this.goalBar = q('[data-goal-bar]');
    this.snakeWrap = q('[data-snake-wrap]');
    this.snakeCount = q('[data-snake-count]');
    this.snakeBar = q('[data-snake-bar]');
    this.scoreEl = q('[data-score]');
    this.coinsEl = q('[data-coins]');
    this.livesEl = q('[data-lives]');
    this.powerWrap = q('[data-power]');
    this.powerName = q('[data-power-name]');
    this.powerBar = q('[data-power-bar]');
    this.powerIcon = q<HTMLCanvasElement>('[data-power-icon]');
    this.comboTag = q('[data-combo]');

    const portrait = q<HTMLCanvasElement>('[data-portrait]');
    const pctx = portrait.getContext('2d');
    if (pctx) {
      pctx.setTransform(2, 0, 0, 2, 0, 0);
      pctx.translate(28, 32);
      pctx.scale(0.46, 0.46);
      drawSkipPortrait(pctx, 0);
    }

    for (let i = 0; i < CONFIG.maxLives; i++) {
      const c = document.createElement('canvas');
      c.width = 44;
      c.height = 36;
      c.style.width = '22px';
      c.style.height = '18px';
      this.pips.push(c);
      this.livesEl.appendChild(c);
    }
  }

  update(game: Game): void {
    const def = game.levelDef;
    this.levelNum.textContent = `Level ${game.level} of 10`;
    this.levelName.textContent = def.name;
    this.levelTwist.textContent = def.twistText;

    if (def.boss) {
      const max = game.bossMaxHp || 1;
      const hp = game.bossHp;
      this.goalName.textContent = def.boss === 'coilback' ? 'Old Coilback' : 'Rennard the Rustler';
      this.goalCount.textContent = `${hp} / ${max}`;
      this.goalBar.style.width = `${(hp / max) * 100}%`;
      this.goalBar.parentElement?.classList.add('boss');
      this.snakeWrap.hidden = true;
    } else {
      this.goalName.textContent = 'Eggs gathered';
      this.goalCount.textContent = `${game.eggsThisLevel} / ${game.quota}`;
      this.goalBar.style.width = `${Math.min(100, (game.eggsThisLevel / Math.max(1, game.quota)) * 100)}%`;
      this.goalBar.parentElement?.classList.remove('boss');
      this.snakeWrap.hidden = false;
      this.snakeCount.textContent = `${game.snakeEggs} / ${game.snakeLimit}`;
      this.snakeBar.style.width = `${Math.min(100, (game.snakeEggs / Math.max(1, game.snakeLimit)) * 100)}%`;
    }

    this.scoreEl.textContent = String(game.score);
    this.coinsEl.textContent = String(game.coins);

    if (game.lives !== this.lastLives) {
      this.lastLives = game.lives;
      this.pips.forEach((c, i) => {
        const ctx = c.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(2, 0, 0, 2, 0, 0);
        ctx.clearRect(0, 0, 22, 18);
        ctx.save();
        ctx.translate(11, 11);
        drawLifePip(ctx, i < game.lives);
        ctx.restore();
      });
    }

    const power = game.active;
    if (power) {
      this.powerWrap.hidden = false;
      this.powerName.textContent = POWER_TEXT[power.kind];
      this.powerBar.style.width = `${(power.time / power.duration) * 100}%`;
      if (this.lastPower !== power.kind) {
        this.lastPower = power.kind;
        const ctx = this.powerIcon.getContext('2d');
        if (ctx) {
          ctx.setTransform(2, 0, 0, 2, 0, 0);
          ctx.clearRect(0, 0, 26, 26);
          ctx.save();
          ctx.translate(13, 13);
          drawPowerIcon(ctx, power.kind, 1.2);
          ctx.restore();
        }
      }
    } else {
      this.powerWrap.hidden = true;
      this.lastPower = null;
    }

    if (game.combo > 1) {
      this.comboTag.hidden = false;
      this.comboTag.textContent = `${game.combo} in a row`;
    } else {
      this.comboTag.hidden = true;
    }
  }

  setVisible(v: boolean): void {
    this.root.hidden = !v;
  }
}
