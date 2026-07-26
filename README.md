# Cluck & Cover CC

**Live:** https://cluck-and-cover-cc.vercel.app
**Repo:** https://github.com/Skippy5/cluck-and-cover-cc

Farmer Skip is sixty-two, his knees are shot, and he loves this farm more than he will
ever admit out loud. The hens are laying faster than he can stoop, a snake has decided
the egg basket is a buffet, and something keeps taking his chickens. Gather each field's
quota, run the pests off with a handful of feed corn, spend your coin at the supply shed
between fields, and settle two old scores: **Old Coilback**, the crowned snake that ate
Skip's best hen back in ninety-one, and **Rennard the Rustler**, the fox who is six hens
into a debt he is about to repay.

Ten hand-drawn fields, two bosses, five upgrades, and one thoroughly unimpressed farmer.

## Controls

| Input | Action |
|---|---|
| `W` `A` `S` `D` or arrow keys | Walk |
| **Left click** | Throw a corn kernel toward the cursor |
| `P` or `Esc` | Pause |
| `M` | Mute |
| `Enter` | Advance the card on screen |

## The fields

| # | Field | What makes it different |
|---|---|---|
| 1 | Stonewhistle Yard | Gentle start — no rooster, no weasel |
| 2 | The Rattlerows | Hay bales in staggered lanes |
| 3 | Duckweed Hollow | Skip goes round the ponds; the snake swims straight through |
| 4 | Bruised Apple Grove | Falling apples stun him for a second |
| 5 | **The Coilback Pit** | Boss: a crowned, double-size snake that swallows eggs whole |
| 6 | Lantern Dark | You can only see as far as the lantern reaches |
| 7 | Goldenhead Rows | Two snakes, sharing one egg limit |
| 8 | The Sowmire | Mud drags Skip to 60%; the pests do not care |
| 9 | Frostfallow | Icy footing, and eggs shatter if left out too long |
| 10 | **Rennard's Reckoning** | Final boss: steals hens, then charges with a one-second tell |

## Rules worth knowing

- Every egg counts 1 toward the quota. Normal eggs are worth 1 point, golden 3, special 5.
- Points are also coins. **Spending never reduces your score** — Skip keeps two ledgers.
- Eggs picked up within 2 seconds of each other chain a combo, worth up to +5 a piece.
- A snake that swallows an egg is slow and harmless for about a second — you can see the
  lump travel down its body. That pause is your opening.
- Three hens lost to weasels costs a life. If the flock gets thin, a neighbour lends a hen
  so a field can never become unwinnable.
- Bosses are briefly untouchable after each hit, so ten hits means ten separate throws.

## Art and tech

Every visual in the game is drawn at runtime with Canvas 2D paths — Farmer Skip, the hens,
the snakes, the fox, the scenery, the UI icons, the life pips. There are no image files, no
sprite sheets, no icon fonts, and no emoji standing in for artwork. The look is a
**hand-pressed farm poster**: flat fills, one heavy ink outline, and a deliberately small
palette of six named colours (`ink`, `cream`, `wheat`, `clover`, `barn`, `sky`) that carries
all ten fields. Level themes only re-tint the ground and the furniture — the cast reads
identically in a sunflower field and in the dark. Sound effects are synthesized with
WebAudio; there are no audio files either.

Built with **Vite + TypeScript**, no runtime dependencies. The simulation is deliberately
separated from presentation:

```
src/
  core/     math, input, WebAudio synth, particles      (engine, no game rules)
  art/      palette, drawing primitives, sprites, scenery (all hand-authored art)
  game/     config, levels, terrain, types, game, render  (rules, then a read-only renderer)
  ui/       hud, screens, styles                          (DOM overlays)
```

- `game/game.ts` owns all state and mutation. `game/render.ts` only reads it.
- `game/config.ts` holds every tunable number; `game/levels.ts` holds the ten field
  definitions. Retuning balance or adding a field means editing data, not systems.
- `main.ts` owns the canvas, the frame loop and the key bindings, and tears every listener
  down in `destroy()` — restarting mid-boss leaves nothing behind.

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173. Other scripts:

```bash
npm run build
```

```bash
npm run typecheck
```

## Credits

Design, code, and art by Claude (Opus 5) for Skip Hobba, from a one-shot brief.
