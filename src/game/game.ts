/**
 * Game state and every system that mutates it.
 *
 * Rendering never touches this file: `Game` owns the simulation, `render.ts`
 * reads it, and the DOM layers read it too. Restarting means constructing a
 * fresh level in place — no listeners or timers live out here.
 */

import { sfx } from '../core/audio';
import type { Input } from '../core/input';
import { clamp, damp, dirTo, dist, dist2, rand, chance, pick } from '../core/math';
import { Fx } from '../core/particles';
import {
  FX_BLOOD,
  FX_DUST,
  FX_EGG,
  FX_FEATHER,
  FX_GOLD,
  FX_LEAF,
  FX_SPECIAL,
} from '../art/palette';
import type { PowerKind } from '../art/sprites';
import { CONFIG, EGG_KINDS, POWER_WEIGHTS, UPGRADES, priceFor, type UpgradeId } from './config';
import {
  COMBO_CALLOUTS,
  chickenCountFor,
  getLevel,
  layRangeFor,
  quotaFor,
  snakeLimitFor,
  worldSizeFor,
  type LevelDef,
} from './levels';
import {
  buildLevelTerrain,
  edgeSpawn,
  findClearSpot,
  inSlowZone,
  nearestEdge,
  resolveCollisions,
  type Obstacle,
} from './terrain';
import {
  emptyUpgrades,
  type ActivePower,
  type Apple,
  type Chicken,
  type Dog,
  type Egg,
  type Farmer,
  type Fox,
  type Kernel,
  type Phase,
  type PowerupPickup,
  type Rooster,
  type RunStats,
  type Snake,
  type Upgrades,
  type Weasel,
} from './types';

export interface View {
  scale: number;
  ox: number;
  oy: number;
}

const CHICKEN_RESPAWN = 8;

export class Game {
  phase: Phase = 'title';
  level = 1;
  levelDef: LevelDef = getLevel(1);
  worldW = 900;
  worldH = 620;
  obstacles: Obstacle[] = [];

  farmer: Farmer = makeFarmer(450, 310);
  chickens: Chicken[] = [];
  eggs: Egg[] = [];
  snakes: Snake[] = [];
  rooster: Rooster | null = null;
  weasels: Weasel[] = [];
  kernels: Kernel[] = [];
  powerups: PowerupPickup[] = [];
  active: ActivePower | null = null;
  apples: Apple[] = [];
  dog: Dog | null = null;
  fox: Fox | null = null;

  score = 0;
  coins = 0;
  lives: number = CONFIG.startLives;
  upgrades: Upgrades = emptyUpgrades();

  quota = 0;
  eggsThisLevel = 0;
  snakeLimit = 0;
  snakeEggs = 0;
  weaselLosses = 0;
  bossMaxHp = 0;

  combo = 0;
  comboTimer = 0;

  shake = 0;
  flash = 0;
  time = 0;

  fx = new Fx();
  stats: RunStats = freshStats();
  endReason = '';

  view: View = { scale: 1, ox: 0, oy: 0 };
  /** Cursor position in world space, for the aiming mark. */
  pointerWorld: { x: number; y: number } | null = null;

  /** Set by the shell so screens can be rebuilt when the phase changes. */
  onPhaseChange: (phase: Phase) => void = () => {};

  private roosterTimer = 0;
  private weaselTimer = 0;
  private powerTimer = 0;
  private appleTimer = 0;
  private chickenRespawn = 0;
  private layRange: [number, number] = [1, 3];

  /* ---------------------------------------------------------------- */
  /* Lifecycle                                                         */
  /* ---------------------------------------------------------------- */

  setPhase(p: Phase): void {
    if (this.phase === p) return;
    this.phase = p;
    this.onPhaseChange(p);
  }

  newRun(): void {
    this.score = 0;
    this.coins = 0;
    this.lives = CONFIG.startLives;
    this.upgrades = emptyUpgrades();
    this.stats = freshStats();
    this.endReason = '';
    this.level = 1;
    this.startLevel(1);
    this.setPhase('levelIntro');
  }

  startLevel(n: number): void {
    this.level = n;
    this.levelDef = getLevel(n);
    const size = worldSizeFor(n);
    this.worldW = size.w;
    this.worldH = size.h;
    this.obstacles = buildLevelTerrain(this.levelDef, this.worldW, this.worldH);

    this.quota = this.levelDef.boss ? 0 : quotaFor(n);
    this.snakeLimit = snakeLimitFor(n);
    this.eggsThisLevel = 0;
    this.snakeEggs = 0;
    this.weaselLosses = 0;
    this.layRange = layRangeFor(n);

    this.farmer = makeFarmer(this.worldW / 2, this.worldH / 2);
    this.eggs = [];
    this.kernels = [];
    this.powerups = [];
    this.apples = [];
    this.weasels = [];
    this.rooster = null;
    this.active = null;
    this.combo = 0;
    this.comboTimer = 0;
    this.fx.clear();
    this.shake = 0;

    // chickens
    this.chickens = [];
    const count = chickenCountFor(n);
    for (let i = 0; i < count; i++) this.spawnChicken();

    // snakes / bosses
    this.snakes = [];
    this.fox = null;
    this.bossMaxHp = 0;
    if (this.levelDef.boss === 'coilback') {
      const s = this.makeSnake(true);
      this.snakes.push(s);
      this.bossMaxHp = s.hp;
    } else if (this.levelDef.boss === 'rennard') {
      this.fox = this.makeFox();
      this.bossMaxHp = this.fox.hp;
    } else {
      this.snakes.push(this.makeSnake(false));
      if (this.levelDef.twist.twinSnakes) this.snakes.push(this.makeSnake(false));
    }

    this.dog = this.upgrades.dog > 0 ? this.makeDog() : null;

    this.roosterTimer = CONFIG.roosterInterval * 0.6;
    this.weaselTimer = CONFIG.weaselInterval * 0.7;
    this.powerTimer = CONFIG.powerupInterval * 0.5;
    this.appleTimer = 2;
    this.chickenRespawn = 0;
  }

  /* ---------------------------------------------------------------- */
  /* Factories                                                         */
  /* ---------------------------------------------------------------- */

  private spawnChicken(): void {
    const spot = findClearSpot(this.obstacles, this.worldW, this.worldH, CONFIG.chickenRadius, [
      { x: this.farmer.x, y: this.farmer.y, r: 60 },
    ]);
    const [lo, hi] = this.layRange;
    this.chickens.push({
      x: spot.x,
      y: spot.y,
      vx: 0,
      vy: 0,
      facing: chance(0.5) ? 1 : -1,
      phase: rand(0, 10),
      moving: false,
      layTimer: rand(lo, hi),
      tx: spot.x,
      ty: spot.y,
      retarget: rand(0.5, 2),
      taken: false,
    });
  }

  private makeSnake(boss: boolean): Snake {
    const spot = findClearSpot(this.obstacles, this.worldW, this.worldH, CONFIG.snakeRadius, [
      { x: this.farmer.x, y: this.farmer.y, r: 240 },
    ]);
    const width = boss ? 28 : 15;
    const seg = boss ? CONFIG.snakeSegLen * 1.7 : CONFIG.snakeSegLen;
    const body = [];
    // lay the body out behind the head so it never starts as a coiled blob
    for (let i = 0; i < (boss ? 22 : CONFIG.snakeSegments); i++) {
      body.push({ x: spot.x - i * seg, y: spot.y });
    }
    return {
      x: spot.x,
      y: spot.y,
      vx: 0,
      vy: 0,
      body,
      mode: boss ? 'farmer' : 'egg',
      retarget: 0,
      boss,
      hp: boss ? 10 : 0,
      enrage: 0,
      hitFlash: 0,
      swallow: 0,
      width,
      speed: CONFIG.farmerSpeed * (boss ? 0.72 : CONFIG.snakeSpeedFactor),
    };
  }

  private makeFox(): Fox {
    const spot = findClearSpot(this.obstacles, this.worldW, this.worldH, 20, [
      { x: this.farmer.x, y: this.farmer.y, r: 260 },
    ]);
    return {
      x: spot.x,
      y: spot.y,
      vx: 0,
      vy: 0,
      facing: -1,
      phase: 0,
      hp: 15,
      state: 'stalk',
      timer: 1.5,
      windup: 0,
      carrying: null,
      hitFlash: 0,
      chargeX: 0,
      chargeY: 0,
    };
  }

  private makeDog(): Dog {
    return {
      x: this.farmer.x + 40,
      y: this.farmer.y + 30,
      vx: 0,
      vy: 0,
      facing: 1,
      phase: 0,
      target: null,
      tx: this.farmer.x,
      ty: this.farmer.y,
    };
  }

  /* ---------------------------------------------------------------- */
  /* Main update                                                       */
  /* ---------------------------------------------------------------- */

  update(dt: number, input: Input): void {
    this.time += dt;
    this.fx.update(dt);
    this.shake = Math.max(0, this.shake - dt * 26);
    this.flash = Math.max(0, this.flash - dt * 3);

    this.pointerWorld = this.screenToWorld(input.pointer.x, input.pointer.y);
    if (this.phase !== 'playing') return;

    this.stats.timePlayed += dt;
    const slow = this.active?.kind === 'freeze' ? 0.3 : 1;

    this.updateFarmer(dt, input);
    this.updateChickens(dt);
    this.updateEggs(dt);
    this.updateSnakes(dt, slow);
    this.updatePredators(dt, slow);
    this.updateFox(dt, slow);
    this.updateDog(dt);
    this.updateApples(dt);
    this.updateKernels(dt);
    this.updatePowerups(dt);
    this.updateCombo(dt);
    this.checkLevelEnd();
  }

  /* --- Farmer ------------------------------------------------------ */

  private updateFarmer(dt: number, input: Input): void {
    const f = this.farmer;
    f.invuln = Math.max(0, f.invuln - dt);
    f.stun = Math.max(0, f.stun - dt);
    f.fireCooldown = Math.max(0, f.fireCooldown - dt);

    const ice = this.levelDef.twist.ice === true;
    let speed = CONFIG.farmerSpeed * (1 + 0.1 * this.upgrades.boots);
    if (this.active?.kind === 'speed') speed *= 1.5;
    if (this.levelDef.twist.mud && inSlowZone(this.obstacles, f.x, f.y, CONFIG.farmerRadius)) speed *= 0.6;

    const axis = f.stun > 0 ? { x: 0, y: 0 } : input.axis();
    const accel = ice ? 2.1 : CONFIG.farmerAccel;
    f.vx = damp(f.vx, axis.x * speed, accel, dt);
    f.vy = damp(f.vy, axis.y * speed, accel, dt);
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    resolveCollisions(f, CONFIG.farmerRadius, this.obstacles, this.worldW, this.worldH, false);

    const sp = Math.hypot(f.vx, f.vy);
    f.moving = sp > 14;
    if (f.moving) {
      f.phase += dt * (6 + sp * 0.035);
      if (Math.abs(f.vx) > 8) f.facing = f.vx > 0 ? 1 : -1;
    } else {
      f.phase += dt * 1.4;
    }

    if (input.pointer.fired && f.fireCooldown <= 0 && f.stun <= 0) this.fire(input);
  }

  private fire(input: Input): void {
    const f = this.farmer;
    const world = this.screenToWorld(input.pointer.x, input.pointer.y);
    const d = dirTo(f.x, f.y, world.x, world.y);
    if (d.x === 0 && d.y === 0) return;
    f.fireCooldown = CONFIG.fireCooldown;
    if (d.x !== 0) f.facing = d.x > 0 ? 1 : -1;

    const tier = this.upgrades.cannon;
    const count = tier === 0 ? 1 : tier === 1 ? 2 : 3;
    const pierce = tier >= 3 ? 1 : 0;
    const base = Math.atan2(d.y, d.x);
    for (let i = 0; i < count; i++) {
      const offset = count === 1 ? 0 : (i - (count - 1) / 2) * CONFIG.spreadAngle;
      const a = base + offset;
      this.kernels.push({
        x: f.x + Math.cos(a) * 16,
        y: f.y + Math.sin(a) * 16 - 4,
        vx: Math.cos(a) * CONFIG.kernelSpeed,
        vy: Math.sin(a) * CONFIG.kernelSpeed,
        spin: rand(0, 6),
        life: CONFIG.kernelLife,
        pierce,
        hit: new Set(),
      });
    }
    sfx.throwCorn();
  }

  /* --- Chickens & eggs --------------------------------------------- */

  private updateChickens(dt: number): void {
    const [lo, hi] = this.layRange;
    for (const c of this.chickens) {
      if (c.taken) continue;
      c.retarget -= dt;
      if (c.retarget <= 0) {
        c.retarget = rand(1.2, 3.2);
        const spot = findClearSpot(this.obstacles, this.worldW, this.worldH, CONFIG.chickenRadius, [], 12);
        c.tx = spot.x;
        c.ty = spot.y;
      }
      const d = dirTo(c.x, c.y, c.tx, c.ty);
      const near = dist(c.x, c.y, c.tx, c.ty) < 18;
      const sp = near ? 0 : 56;
      c.vx = damp(c.vx, d.x * sp, 6, dt);
      c.vy = damp(c.vy, d.y * sp, 6, dt);
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      resolveCollisions(c, CONFIG.chickenRadius, this.obstacles, this.worldW, this.worldH, false);
      c.moving = Math.hypot(c.vx, c.vy) > 10;
      c.phase += dt * (c.moving ? 6 : 1.6);
      if (Math.abs(c.vx) > 6) c.facing = c.vx > 0 ? 1 : -1;

      c.layTimer -= dt;
      if (c.layTimer <= 0) {
        c.layTimer = rand(lo, hi);
        if (this.eggs.length < CONFIG.eggCap) this.layEgg(c);
      }
    }

    // A neighbour lends a hen if weasels have thinned the flock, so a level
    // can never become unwinnable.
    const want = chickenCountFor(this.level);
    if (this.chickens.length < want) {
      this.chickenRespawn -= dt;
      if (this.chickenRespawn <= 0) {
        this.chickenRespawn = CHICKEN_RESPAWN;
        this.spawnChicken();
        sfx.cluck();
      }
    } else {
      this.chickenRespawn = CHICKEN_RESPAWN;
    }
  }

  private layEgg(c: Chicken): void {
    const roll = Math.random();
    let acc = 0;
    let chosen = EGG_KINDS[0];
    for (const k of EGG_KINDS) {
      acc += k.weight;
      if (roll <= acc) {
        chosen = k;
        break;
      }
    }
    const bonus = chosen.kind === 'normal' ? 0 : this.upgrades.basket;
    // Nudge the egg clear of any furniture so it is always reachable on foot.
    const spot = {
      x: clamp(c.x - c.facing * 12, 24, this.worldW - 24),
      y: clamp(c.y + 6, 24, this.worldH - 24),
      vx: 0,
      vy: 0,
    };
    resolveCollisions(spot, CONFIG.eggRadius + 12, this.obstacles, this.worldW, this.worldH, false);
    this.eggs.push({
      x: spot.x,
      y: spot.y,
      kind: chosen.kind,
      points: chosen.points + bonus,
      age: 0,
      wobble: rand(0, 6),
    });
    sfx.cluck();
  }

  private updateEggs(dt: number): void {
    const freezes = this.levelDef.twist.eggsFreeze === true;
    const magnet = this.active?.kind === 'magnet';
    const f = this.farmer;
    for (let i = this.eggs.length - 1; i >= 0; i--) {
      const e = this.eggs[i];
      e.age += dt;

      if (freezes && e.age >= CONFIG.eggFreezeTime) {
        this.fx.burst(e.x, e.y, ['#dff2fa', '#ffffff', '#a9d3e2'], 12, { speed: 120, size: 3 });
        this.eggs.splice(i, 1);
        continue;
      }

      if (magnet) {
        const d2 = dist2(e.x, e.y, f.x, f.y);
        if (d2 < CONFIG.magnetRadius * CONFIG.magnetRadius) {
          const d = dirTo(e.x, e.y, f.x, f.y);
          e.x += d.x * CONFIG.magnetPull * dt;
          e.y += d.y * CONFIG.magnetPull * dt;
        }
      }

      if (dist2(e.x, e.y, f.x, f.y) < CONFIG.pickupRadius * CONFIG.pickupRadius) {
        this.collectEgg(i);
      }
    }
  }

  private collectEgg(index: number): void {
    const e = this.eggs[index];
    this.eggs.splice(index, 1);

    this.combo = this.comboTimer > 0 ? this.combo + 1 : 1;
    this.comboTimer = CONFIG.comboWindow;
    this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo);

    const bonus = Math.min(Math.max(this.combo - 1, 0), CONFIG.comboMaxBonus);
    const total = e.points + bonus;
    this.score += total;
    this.coins += total;
    this.eggsThisLevel++;
    this.stats.eggsCollected++;
    if (e.kind === 'golden') this.stats.goldenEggs++;
    if (e.kind === 'special') this.stats.specialEggs++;

    const colors = e.kind === 'golden' ? FX_GOLD : e.kind === 'special' ? FX_SPECIAL : FX_EGG;
    this.fx.burst(e.x, e.y, colors, 9, { speed: 130, size: 3.5 });
    this.fx.text(
      e.x,
      e.y - 10,
      this.combo > 1 ? `+${total} x${this.combo}` : `+${total}`,
      e.kind === 'golden' ? '#f7d071' : e.kind === 'special' ? '#a9d3e2' : '#fff6e0',
      this.combo > 1 ? 18 + Math.min(this.combo, 8) : 17,
    );
    sfx.egg(this.combo);

    for (const c of COMBO_CALLOUTS) {
      if (this.combo === c.at) {
        this.fx.text(this.farmer.x, this.farmer.y - 46, c.text, '#f4e5c3', 22);
        if (c.shake > 0) this.shake = Math.max(this.shake, c.shake);
      }
    }
  }

  private updateCombo(dt: number): void {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
  }

  /* --- Snakes ------------------------------------------------------ */

  private updateSnakes(dt: number, slow: number): void {
    for (const s of this.snakes) {
      s.hitFlash = Math.max(0, s.hitFlash - dt);
      s.enrage = Math.max(0, s.enrage - dt);
      s.swallow = Math.max(0, s.swallow - dt);
      s.retarget -= dt;

      let tx = this.farmer.x;
      let ty = this.farmer.y;

      if (s.boss) {
        s.mode = 'farmer';
      } else {
        if (s.retarget <= 0) {
          s.retarget = CONFIG.snakeRetarget;
          s.mode = this.eggs.length > 0 && chance(CONFIG.snakeEggChance) ? 'egg' : 'farmer';
        }
        if (s.mode === 'egg') {
          const target = this.nearestEgg(s.x, s.y);
          if (target) {
            tx = target.x;
            ty = target.y;
          } else {
            s.mode = 'farmer';
          }
        }
      }

      const speed =
        s.speed * slow * (s.enrage > 0 ? 1.6 : 1) * (s.swallow > 0 ? CONFIG.snakeSwallowSpeed : 1);
      const d = dirTo(s.x, s.y, tx, ty);
      s.vx = damp(s.vx, d.x * speed, 5, dt);
      s.vy = damp(s.vy, d.y * speed, 5, dt);
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      resolveCollisions(s, s.width * 0.7, this.obstacles, this.worldW, this.worldH, true);
      this.followBody(s);

      // eat eggs — but only one at a time, and never while still swallowing
      const reach = s.boss ? 30 : 18;
      for (let i = this.eggs.length - 1; i >= 0 && s.swallow <= 0; i--) {
        const e = this.eggs[i];
        if (dist2(e.x, e.y, s.x, s.y) > reach * reach) continue;
        s.swallow = s.boss ? CONFIG.snakeSwallowTime * 0.45 : CONFIG.snakeSwallowTime;
        this.eggs.splice(i, 1);
        this.fx.burst(e.x, e.y, FX_EGG, 8, { speed: 110 });
        if (!s.boss) {
          this.snakeEggs++;
          this.fx.text(e.x, e.y - 12, 'SNAKE!', '#c1543a', 16);
          if (this.snakeEggs >= this.snakeLimit) {
            this.endRun(`Old Coilback's kin ate ${this.snakeEggs} eggs. Skip has seen enough.`);
            return;
          }
        }
      }

      // contact
      const hitR = s.boss ? 30 : 20;
      if (dist2(s.x, s.y, this.farmer.x, this.farmer.y) < hitR * hitR) {
        this.hurtFarmer(s.boss ? 'Old Coilback caught him.' : 'The snake got him.');
      }
    }
  }

  /** Teleport a snake, laying its body out behind it rather than in a heap. */
  private placeSnake(s: Snake, x: number, y: number): void {
    const seg = s.boss ? CONFIG.snakeSegLen * 1.7 : CONFIG.snakeSegLen;
    s.x = x;
    s.y = y;
    s.vx = 0;
    s.vy = 0;
    const dir = x > this.worldW / 2 ? 1 : -1;
    s.body.forEach((b, i) => {
      b.x = x + dir * i * seg;
      b.y = y;
    });
  }

  /** Rope-follow so the body trails the head at a fixed spacing. */
  private followBody(s: Snake): void {
    const seg = s.boss ? CONFIG.snakeSegLen * 1.7 : CONFIG.snakeSegLen;
    s.body[0].x = s.x;
    s.body[0].y = s.y;
    for (let i = 1; i < s.body.length; i++) {
      const prev = s.body[i - 1];
      const cur = s.body[i];
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      const d = Math.hypot(dx, dy) || 1;
      cur.x = prev.x + (dx / d) * seg;
      cur.y = prev.y + (dy / d) * seg;
    }
  }

  private nearestEgg(x: number, y: number): Egg | null {
    let best: Egg | null = null;
    let bd = Infinity;
    for (const e of this.eggs) {
      const d = dist2(x, y, e.x, e.y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  /* --- Rooster, weasel --------------------------------------------- */

  private updatePredators(dt: number, slow: number): void {
    const noPests = this.levelDef.twist.noPredators === true || this.levelDef.boss !== undefined;

    // --- rooster
    if (!noPests) {
      this.roosterTimer -= dt;
      if (this.roosterTimer <= 0 && !this.rooster) {
        this.roosterTimer = CONFIG.roosterInterval;
        const spot = edgeSpawn(this.worldW, this.worldH);
        this.rooster = {
          x: spot.x,
          y: spot.y,
          vx: 0,
          vy: 0,
          facing: 1,
          phase: 0,
          life: CONFIG.roosterLife,
        };
      }
    }
    if (this.rooster) {
      const r = this.rooster;
      r.life -= dt;
      const d = dirTo(r.x, r.y, this.farmer.x, this.farmer.y);
      const speed = CONFIG.farmerSpeed * CONFIG.roosterSpeedFactor * slow;
      r.vx = damp(r.vx, d.x * speed, 5, dt);
      r.vy = damp(r.vy, d.y * speed, 5, dt);
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      resolveCollisions(r, CONFIG.roosterRadius, this.obstacles, this.worldW, this.worldH, false);
      r.phase += dt * 7;
      if (Math.abs(r.vx) > 8) r.facing = r.vx > 0 ? 1 : -1;
      if (dist2(r.x, r.y, this.farmer.x, this.farmer.y) < 26 * 26) {
        this.hurtFarmer('That rooster again.');
      }
      if (r.life <= 0) this.rooster = null;
    }

    // --- weasels
    if (!noPests) {
      this.weaselTimer -= dt;
      if (this.weaselTimer <= 0) {
        this.weaselTimer = CONFIG.weaselInterval;
        const spot = edgeSpawn(this.worldW, this.worldH);
        this.weasels.push({
          x: spot.x,
          y: spot.y,
          vx: 0,
          vy: 0,
          facing: 1,
          phase: 0,
          life: CONFIG.weaselLife,
          target: null,
          routed: false,
        });
      }
    }

    for (let i = this.weasels.length - 1; i >= 0; i--) {
      const w = this.weasels[i];
      w.life -= dt;

      let tx: number;
      let ty: number;
      if (w.routed) {
        const edge = nearestEdge(w.x, w.y, this.worldW, this.worldH);
        tx = edge.x;
        ty = edge.y;
      } else {
        if (!w.target || w.target.taken || !this.chickens.includes(w.target)) {
          w.target = this.chickens.length ? pick(this.chickens) : null;
        }
        tx = w.target ? w.target.x : this.worldW / 2;
        ty = w.target ? w.target.y : this.worldH / 2;
      }

      const speed = CONFIG.weaselSpeed * slow * (w.routed ? 1.5 : 1);
      const d = dirTo(w.x, w.y, tx, ty);
      w.vx = damp(w.vx, d.x * speed, 6, dt);
      w.vy = damp(w.vy, d.y * speed, 6, dt);
      w.x += w.vx * dt;
      w.y += w.vy * dt;
      if (!w.routed) {
        resolveCollisions(w, CONFIG.weaselRadius, this.obstacles, this.worldW, this.worldH, false);
      }
      w.phase += dt * 9;
      if (Math.abs(w.vx) > 8) w.facing = w.vx > 0 ? 1 : -1;

      if (w.routed && (w.x < -30 || w.x > this.worldW + 30 || w.y < -30 || w.y > this.worldH + 30)) {
        this.weasels.splice(i, 1);
        continue;
      }

      if (!w.routed && w.target && dist2(w.x, w.y, w.target.x, w.target.y) < 22 * 22) {
        const idx = this.chickens.indexOf(w.target);
        if (idx >= 0) {
          this.fx.feathers(w.target.x, w.target.y, FX_FEATHER, 10);
          this.chickens.splice(idx, 1);
        }
        w.target = null;
        w.routed = true;
        this.weaselLosses++;
        this.stats.chickensLost++;
        this.shake = Math.max(this.shake, 4);
        sfx.hurt();
        this.fx.text(w.x, w.y - 20, 'HEN DOWN', '#c1543a', 18);
        if (this.weaselLosses >= CONFIG.chickenLossLimit) {
          this.weaselLosses = 0;
          this.hurtFarmer('Three hens to the weasels. Skip took that personally.');
        }
      }

      if (w.life <= 0 && !w.routed) w.routed = true;
    }
  }

  /* --- Fox boss ---------------------------------------------------- */

  private updateFox(dt: number, slow: number): void {
    const fox = this.fox;
    if (!fox) return;
    fox.hitFlash = Math.max(0, fox.hitFlash - dt);
    fox.timer -= dt;

    const speed = CONFIG.farmerSpeed * slow;
    let tx = this.farmer.x;
    let ty = this.farmer.y;
    let sp = speed * 0.8;

    switch (fox.state) {
      case 'stalk': {
        const prey = this.chickens.find((c) => !c.taken);
        if (!prey) {
          fox.state = 'windup';
          fox.timer = 1;
          break;
        }
        tx = prey.x;
        ty = prey.y;
        sp = speed * 0.92;
        if (dist2(fox.x, fox.y, prey.x, prey.y) < 26 * 26) {
          prey.taken = true;
          fox.carrying = prey;
          fox.state = 'flee';
          this.fx.feathers(prey.x, prey.y, FX_FEATHER, 8);
          this.fx.text(fox.x, fox.y - 30, 'HE HAS ONE!', '#c1543a', 18);
          sfx.cluck();
        }
        break;
      }
      case 'flee': {
        const edge = nearestEdge(fox.x, fox.y, this.worldW, this.worldH);
        tx = edge.x;
        ty = edge.y;
        sp = speed * 0.95;
        if (fox.carrying) {
          fox.carrying.x = fox.x;
          fox.carrying.y = fox.y;
        }
        if (fox.x < -20 || fox.x > this.worldW + 20 || fox.y < -20 || fox.y > this.worldH + 20) {
          if (fox.carrying) {
            const idx = this.chickens.indexOf(fox.carrying);
            if (idx >= 0) this.chickens.splice(idx, 1);
            this.stats.chickensLost++;
            fox.carrying = null;
          }
          const back = findClearSpot(this.obstacles, this.worldW, this.worldH, 20, [
            { x: this.farmer.x, y: this.farmer.y, r: 200 },
          ]);
          fox.x = back.x;
          fox.y = back.y;
          fox.state = 'windup';
          fox.timer = 1;
        }
        break;
      }
      case 'windup': {
        sp = 0;
        fox.windup = clamp(1 - fox.timer / 1, 0, 1);
        fox.chargeX = this.farmer.x;
        fox.chargeY = this.farmer.y;
        if (fox.timer <= 0) {
          fox.state = 'charge';
          fox.timer = 0.85;
          fox.windup = 0;
          const d = dirTo(fox.x, fox.y, fox.chargeX, fox.chargeY);
          fox.vx = d.x * speed * 2.1;
          fox.vy = d.y * speed * 2.1;
          this.fx.burst(fox.x, fox.y, FX_DUST, 12, { speed: 150 });
        }
        break;
      }
      case 'charge': {
        // ballistic: keep the launch velocity, just decay it
        fox.vx = damp(fox.vx, 0, 1.1, dt);
        fox.vy = damp(fox.vy, 0, 1.1, dt);
        fox.x += fox.vx * dt;
        fox.y += fox.vy * dt;
        resolveCollisions(fox, 20, this.obstacles, this.worldW, this.worldH, false);
        if (Math.abs(fox.vx) > 8) fox.facing = fox.vx > 0 ? 1 : -1;
        fox.phase += dt * 16;
        if (fox.timer <= 0) {
          fox.state = 'recover';
          fox.timer = 0.9;
        }
        this.foxContact();
        return;
      }
      case 'recover': {
        sp = speed * 0.35;
        tx = fox.x - fox.vx;
        ty = fox.y - fox.vy;
        if (fox.timer <= 0) {
          fox.state = 'stalk';
          fox.timer = 2;
        }
        break;
      }
    }

    const d = dirTo(fox.x, fox.y, tx, ty);
    fox.vx = damp(fox.vx, d.x * sp, 6, dt);
    fox.vy = damp(fox.vy, d.y * sp, 6, dt);
    fox.x += fox.vx * dt;
    fox.y += fox.vy * dt;
    if (fox.state !== 'flee') {
      resolveCollisions(fox, 20, this.obstacles, this.worldW, this.worldH, false);
    }
    fox.phase += dt * (fox.state === 'windup' ? 2 : 10);
    if (Math.abs(fox.vx) > 8) fox.facing = fox.vx > 0 ? 1 : -1;
    if (fox.carrying) {
      fox.carrying.x = fox.x;
      fox.carrying.y = fox.y;
    }
    this.foxContact();
  }

  private foxContact(): void {
    const fox = this.fox;
    if (!fox) return;
    if (dist2(fox.x, fox.y, this.farmer.x, this.farmer.y) < 30 * 30) {
      this.hurtFarmer('Rennard went straight through him.');
    }
  }

  /* --- Dog --------------------------------------------------------- */

  private updateDog(dt: number): void {
    if (this.upgrades.dog > 0 && !this.dog) this.dog = this.makeDog();
    const dog = this.dog;
    if (!dog) return;

    let target: Weasel | null = null;
    let bd = CONFIG.dogGuardRadius * CONFIG.dogGuardRadius;
    for (const w of this.weasels) {
      if (w.routed) continue;
      const d = dist2(dog.x, dog.y, w.x, w.y);
      if (d < bd) {
        bd = d;
        target = w;
      }
    }
    dog.target = target;

    let tx: number;
    let ty: number;
    if (target) {
      tx = target.x;
      ty = target.y;
    } else {
      if (dist2(dog.x, dog.y, dog.tx, dog.ty) < 40 * 40 || Math.random() < dt * 0.35) {
        const spot = findClearSpot(this.obstacles, this.worldW, this.worldH, CONFIG.dogRadius, [], 10);
        dog.tx = spot.x;
        dog.ty = spot.y;
      }
      // stay loosely near Skip when there is nothing to chase
      tx = dist(dog.x, dog.y, this.farmer.x, this.farmer.y) > 320 ? this.farmer.x : dog.tx;
      ty = dist(dog.x, dog.y, this.farmer.x, this.farmer.y) > 320 ? this.farmer.y : dog.ty;
    }

    const speed = target ? CONFIG.dogSpeed : CONFIG.dogSpeed * 0.55;
    const d = dirTo(dog.x, dog.y, tx, ty);
    dog.vx = damp(dog.vx, d.x * speed, 6, dt);
    dog.vy = damp(dog.vy, d.y * speed, 6, dt);
    dog.x += dog.vx * dt;
    dog.y += dog.vy * dt;
    resolveCollisions(dog, CONFIG.dogRadius, this.obstacles, this.worldW, this.worldH, false);
    dog.phase += dt * 9;
    if (Math.abs(dog.vx) > 8) dog.facing = dog.vx > 0 ? 1 : -1;

    if (target && dist2(dog.x, dog.y, target.x, target.y) < 26 * 26) {
      target.routed = true;
      target.target = null;
      this.fx.text(target.x, target.y - 22, 'GIT!', '#f4e5c3', 17);
      this.fx.burst(target.x, target.y, FX_DUST, 8, { speed: 120 });
      sfx.hitEnemy();
    }
  }

  /* --- Apples ------------------------------------------------------ */

  private updateApples(dt: number): void {
    if (this.levelDef.twist.fallingApples) {
      this.appleTimer -= dt;
      if (this.appleTimer <= 0) {
        this.appleTimer = rand(0.9, 2.1);
        const trees = this.obstacles.filter((o) => o.kind === 'tree');
        if (trees.length) {
          const tree = pick(trees);
          this.apples.push({
            x: tree.x + rand(-tree.w * 0.3, tree.w * 0.3),
            y: tree.y + tree.h * 0.3,
            z: 90,
            vz: 0,
            spin: rand(0, 6),
            splat: 0,
          });
        }
      }
    }

    for (let i = this.apples.length - 1; i >= 0; i--) {
      const a = this.apples[i];
      if (a.splat > 0) {
        a.splat -= dt;
        if (a.splat <= 0) this.apples.splice(i, 1);
        continue;
      }
      a.vz += 520 * dt;
      a.z -= a.vz * dt;
      a.spin += dt * 6;
      if (a.z <= 0) {
        a.z = 0;
        a.splat = 0.35;
        this.fx.burst(a.x, a.y, FX_LEAF, 8, { speed: 110, size: 3 });
        if (
          this.farmer.stun <= 0 &&
          dist2(a.x, a.y, this.farmer.x, this.farmer.y) < 26 * 26
        ) {
          this.farmer.stun = CONFIG.stunTime;
          this.shake = Math.max(this.shake, 5);
          this.fx.text(this.farmer.x, this.farmer.y - 44, 'OW. MY HAT.', '#f4e5c3', 18);
          sfx.hurt();
        }
      }
    }
  }

  /* --- Corn kernels ------------------------------------------------ */

  private updateKernels(dt: number): void {
    for (let i = this.kernels.length - 1; i >= 0; i--) {
      const k = this.kernels[i];
      k.life -= dt;
      k.x += k.vx * dt;
      k.y += k.vy * dt;
      k.spin += dt * 18;
      if (
        k.life <= 0 ||
        k.x < 0 ||
        k.x > this.worldW ||
        k.y < 0 ||
        k.y > this.worldH ||
        this.obstacles.some(
          (o) => o.blocks === 'all' && overlapsKernel(o, k.x, k.y),
        )
      ) {
        this.kernels.splice(i, 1);
        continue;
      }
      if (this.resolveKernelHits(k)) this.kernels.splice(i, 1);
    }
  }

  /** Returns true when the kernel is spent. */
  private resolveKernelHits(k: Kernel): boolean {
    const r = CONFIG.kernelRadius;

    for (const s of this.snakes) {
      if (k.hit.has(s)) continue;
      const hr = s.boss ? 30 : 18;
      if (dist2(k.x, k.y, s.x, s.y) > (hr + r) * (hr + r)) continue;
      // A boss shrugs off the rest of a volley, so ten hits means ten
      // separate throws rather than one lucky spread.
      if (s.boss && s.hitFlash > 0) continue;
      k.hit.add(s);
      this.stats.pestsHit++;
      sfx.hitEnemy();
      if (s.boss) {
        s.hp -= 1;
        s.hitFlash = CONFIG.bossHitCooldown;
        s.enrage = 2.2;
        this.shake = Math.max(this.shake, 6);
        this.fx.burst(k.x, k.y, FX_BLOOD, 14, { speed: 190 });
        this.fx.text(s.x, s.y - 34, `${Math.max(0, s.hp)} LEFT`, '#f4e5c3', 18);
        sfx.bossHit();
        if (s.hp <= 0) this.bossDown(s.x, s.y);
      } else {
        this.award(CONFIG.snakeCornPoints, s.x, s.y, 'BACK OFF');
        const spot = findClearSpot(this.obstacles, this.worldW, this.worldH, CONFIG.snakeRadius, [
          { x: this.farmer.x, y: this.farmer.y, r: 260 },
        ]);
        this.placeSnake(s, spot.x, spot.y);
        this.fx.burst(k.x, k.y, FX_LEAF, 12, { speed: 170 });
      }
      if (k.pierce > 0) {
        k.pierce--;
        continue;
      }
      return true;
    }

    if (this.rooster && !k.hit.has(this.rooster)) {
      const rr = CONFIG.roosterRadius;
      if (dist2(k.x, k.y, this.rooster.x, this.rooster.y) <= (rr + r) * (rr + r)) {
        this.award(CONFIG.roosterCornPoints, this.rooster.x, this.rooster.y, 'SIT DOWN');
        this.fx.feathers(this.rooster.x, this.rooster.y, [...FX_FEATHER, '#c1543a'], 12);
        this.stats.pestsHit++;
        sfx.hitEnemy();
        this.rooster = null;
        if (k.pierce > 0) k.pierce--;
        else return true;
      }
    }

    for (let i = this.weasels.length - 1; i >= 0; i--) {
      const w = this.weasels[i];
      if (k.hit.has(w)) continue;
      const wr = CONFIG.weaselRadius;
      if (dist2(k.x, k.y, w.x, w.y) > (wr + r) * (wr + r)) continue;
      k.hit.add(w);
      this.award(CONFIG.weaselCornPoints, w.x, w.y, 'GET OFF MY FARM');
      this.fx.burst(w.x, w.y, FX_DUST, 12, { speed: 170 });
      this.stats.pestsHit++;
      sfx.hitEnemy();
      this.weasels.splice(i, 1);
      if (k.pierce > 0) {
        k.pierce--;
        continue;
      }
      return true;
    }

    const fox = this.fox;
    if (fox && !k.hit.has(fox) && fox.hitFlash <= 0 && dist2(k.x, k.y, fox.x, fox.y) <= (24 + r) * (24 + r)) {
      k.hit.add(fox);
      fox.hp -= 1;
      fox.hitFlash = CONFIG.bossHitCooldown;
      this.stats.pestsHit++;
      this.shake = Math.max(this.shake, 6);
      this.fx.burst(k.x, k.y, FX_BLOOD, 14, { speed: 190 });
      this.fx.text(fox.x, fox.y - 42, `${Math.max(0, fox.hp)} LEFT`, '#f4e5c3', 18);
      sfx.bossHit();
      if (fox.carrying) {
        fox.carrying.taken = false;
        this.fx.text(fox.x, fox.y - 62, 'DROP HER!', '#f4e5c3', 17);
        fox.carrying = null;
        fox.state = 'recover';
        fox.timer = 0.9;
      }
      if (fox.hp <= 0) this.bossDown(fox.x, fox.y);
      if (k.pierce > 0) k.pierce--;
      else return true;
    }

    return false;
  }

  private award(points: number, x: number, y: number, shout: string): void {
    this.score += points;
    this.coins += points;
    this.fx.text(x, y - 24, `+${points} ${shout}`, '#f4e5c3', 17);
  }

  private bossDown(x: number, y: number): void {
    this.fx.burst(x, y, FX_GOLD, 40, { speed: 300, size: 6, life: 1.1 });
    this.shake = 12;
    this.flash = 1;
  }

  /* --- Power-ups ---------------------------------------------------- */

  private updatePowerups(dt: number): void {
    this.powerTimer -= dt;
    if (this.powerTimer <= 0) {
      this.powerTimer = CONFIG.powerupInterval;
      if (this.powerups.length < 2) {
        const spot = findClearSpot(this.obstacles, this.worldW, this.worldH, CONFIG.powerupRadius, [
          { x: this.farmer.x, y: this.farmer.y, r: 90 },
        ]);
        this.powerups.push({ x: spot.x, y: spot.y, kind: rollPower(), age: 0 });
      }
    }

    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.age += dt;
      if (dist2(p.x, p.y, this.farmer.x, this.farmer.y) < 28 * 28) {
        const def = POWER_WEIGHTS.find((w) => w.kind === p.kind)!;
        this.active = { kind: p.kind, time: def.duration, duration: def.duration };
        this.powerups.splice(i, 1);
        this.fx.burst(p.x, p.y, FX_GOLD, 16, { speed: 190 });
        this.fx.text(p.x, p.y - 20, POWER_LABEL[p.kind], '#f4e5c3', 18);
        sfx.powerup();
      }
    }

    if (this.active) {
      this.active.time -= dt;
      if (this.active.time <= 0) this.active = null;
    }
  }

  /* --- Damage, level flow ------------------------------------------- */

  hurtFarmer(reason: string): void {
    const f = this.farmer;
    if (f.invuln > 0) return;
    if (this.active?.kind === 'shield') {
      this.fx.burst(f.x, f.y, ['#a9d3e2', '#ffffff'], 14, { speed: 200 });
      this.fx.text(f.x, f.y - 40, 'BOUNCED OFF', '#a9d3e2', 17);
      f.invuln = 0.6;
      return;
    }

    this.lives--;
    f.invuln = CONFIG.invulnTime;
    f.stun = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.shake = 10;
    this.flash = 0.7;
    this.fx.burst(f.x, f.y, FX_BLOOD, 18, { speed: 210 });
    sfx.hurt();

    if (this.lives <= 0) {
      this.endRun(reason);
      return;
    }

    this.fx.text(f.x, f.y - 46, 'CONFOUND IT', '#f4e5c3', 20);
    this.resetPositions();
  }

  /** Everything backs off after a hit so the player is not instantly hit again. */
  private resetPositions(): void {
    const f = this.farmer;
    f.x = this.worldW / 2;
    f.y = this.worldH / 2;
    f.vx = 0;
    f.vy = 0;
    resolveCollisions(f, CONFIG.farmerRadius, this.obstacles, this.worldW, this.worldH, false);

    for (const s of this.snakes) {
      const spot = findClearSpot(this.obstacles, this.worldW, this.worldH, CONFIG.snakeRadius, [
        { x: f.x, y: f.y, r: 300 },
      ]);
      this.placeSnake(s, spot.x, spot.y);
    }
    this.rooster = null;
    for (const w of this.weasels) w.routed = true;
    if (this.fox) {
      const spot = findClearSpot(this.obstacles, this.worldW, this.worldH, 20, [
        { x: f.x, y: f.y, r: 300 },
      ]);
      if (this.fox.carrying) this.fox.carrying.taken = false;
      this.fox.carrying = null;
      this.fox.x = spot.x;
      this.fox.y = spot.y;
      this.fox.vx = 0;
      this.fox.vy = 0;
      this.fox.state = 'recover';
      this.fox.timer = 1.2;
    }
  }

  private endRun(reason: string): void {
    this.endReason = reason;
    this.lives = 0;
    sfx.gameOver();
    this.setPhase('gameover');
  }

  private checkLevelEnd(): void {
    const def = this.levelDef;
    let cleared = false;
    if (def.boss === 'coilback') cleared = this.snakes.every((s) => s.hp <= 0);
    else if (def.boss === 'rennard') cleared = !!this.fox && this.fox.hp <= 0;
    else cleared = this.eggsThisLevel >= this.quota;

    if (!cleared) return;

    this.stats.levelsCleared++;
    if (this.level >= 10) {
      sfx.victory();
      this.setPhase('victory');
      return;
    }
    sfx.levelClear();
    this.setPhase('levelClear');
  }

  /** Called by the level-clear screen. */
  advance(): void {
    // Non-boss levels lead into the shop; boss levels head straight out.
    if (!this.levelDef.boss) {
      this.setPhase('shop');
      return;
    }
    this.startLevel(this.level + 1);
    this.setPhase('levelIntro');
  }

  leaveShop(): void {
    this.startLevel(this.level + 1);
    this.setPhase('levelIntro');
  }

  beginLevel(): void {
    this.setPhase('playing');
  }

  togglePause(): void {
    if (this.phase === 'playing') this.setPhase('paused');
    else if (this.phase === 'paused') this.setPhase('playing');
  }

  /* --- Shop --------------------------------------------------------- */

  ownedOf(id: UpgradeId): number {
    return this.upgrades[id];
  }

  canBuy(id: UpgradeId): boolean {
    const def = UPGRADES.find((u) => u.id === id)!;
    const owned = this.upgrades[id];
    if (id === 'overalls') {
      if (this.lives >= CONFIG.maxLives) return false;
    } else if (owned >= def.maxTier) {
      return false;
    }
    return this.coins >= priceFor(def, owned);
  }

  buy(id: UpgradeId): boolean {
    if (!this.canBuy(id)) {
      sfx.deny();
      return false;
    }
    const def = UPGRADES.find((u) => u.id === id)!;
    const owned = this.upgrades[id];
    this.coins -= priceFor(def, owned);
    this.upgrades[id] = owned + 1;
    if (id === 'overalls') this.lives = Math.min(CONFIG.maxLives, this.lives + 1);
    if (id === 'dog' && !this.dog) this.dog = this.makeDog();
    sfx.buy();
    return true;
  }

  /* --- Helpers ------------------------------------------------------ */

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - this.view.ox) / this.view.scale, y: (sy - this.view.oy) / this.view.scale };
  }

  get bossHp(): number {
    if (this.levelDef.boss === 'coilback') return Math.max(0, this.snakes[0]?.hp ?? 0);
    if (this.levelDef.boss === 'rennard') return Math.max(0, this.fox?.hp ?? 0);
    return 0;
  }
}

/* ------------------------------------------------------------------ */
/* Small module-level helpers                                          */
/* ------------------------------------------------------------------ */

const POWER_LABEL: Record<PowerKind, string> = {
  speed: 'SWIFT',
  shield: 'SHIELDED',
  magnet: 'MAGNET',
  freeze: 'FROZE EM',
};

function makeFarmer(x: number, y: number): Farmer {
  return { x, y, vx: 0, vy: 0, facing: 1, phase: 0, moving: false, invuln: 0, stun: 0, fireCooldown: 0 };
}

function freshStats(): RunStats {
  return {
    eggsCollected: 0,
    goldenEggs: 0,
    specialEggs: 0,
    pestsHit: 0,
    chickensLost: 0,
    bestCombo: 0,
    levelsCleared: 0,
    timePlayed: 0,
  };
}

function rollPower(): PowerKind {
  const roll = Math.random();
  let acc = 0;
  for (const p of POWER_WEIGHTS) {
    acc += p.weight;
    if (roll <= acc) return p.kind;
  }
  return 'speed';
}

/** Kernels stop on solid furniture but fly over mud and water. */
function overlapsKernel(o: Obstacle, x: number, y: number): boolean {
  const cx = o.x + o.cx;
  const cy = o.y + o.cy;
  if (o.shape === 'rect') {
    return Math.abs(x - cx) < o.hw && Math.abs(y - cy) < o.hh;
  }
  const nx = (x - cx) / o.hw;
  const ny = (y - cy) / o.hh;
  return nx * nx + ny * ny < 1;
}
