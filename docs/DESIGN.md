# Escapement: the game as built

This file describes the game as it actually is on `main`. It grows as plan PRs land; the plan itself, with everything still to come, is [`ESCAPEMENT-PLAN.md`](ESCAPEMENT-PLAN.md).

## 0.4.0.0: timegrapher, adjustment, certification, tick (PR 3)

- **The piece.** The Test tab holds one movement of the current build. Each piece has its own personality (first rate,
  position pattern); change the build and a fresh piece goes on with nothing adjusted.
- **Timegrapher.** A dark instrument screen in both themes. Each beat is a dot, the tick line brass and the tock line
  blue; the slope is the rate (falling to the right = losing), the gap is beat error; the screen wraps every 8 ms, like a
  real one. About 12 s across. A thin line and a label mark every change (a regulator nudge shows its effect in s/day).
  Readouts: rate, amplitude, beat error, beat. Lite runs the trace at 30 fps with every other beat pair.
- **Timing machines** (`TOOLS`): basic (dial up only), six-position, laboratory (six positions and 8 / 23 / 38 °C).
  Locked positions are hatched and say what they need. Outside a career the Build tab's Parts switch also picks the
  machine: Workshop = basic, Everything = laboratory. Wind: full or after 24 h. Lift angle 38 / 44 / 50 / 52°: the
  amplitude readout uses it, so a wrong setting reads wrong (Swiss lever 52, high-efficiency 50, detent 44, co-axial 38).
- **Adjust.** Regulate in notches of the fitted regulator (index 2 s/day, micro-adjust 0.5, free-sprung 0.25; ×1 or ×5),
  landing a little off by skill; Adjust beat (0.5 h) takes out part of the beat error, down to a floor set by the
  regulator and regulating skill; Poise (2 h) takes out part of the position error, up to 95%. Each press adds bench
  hours to the piece and XP: regulating for Regulate and Adjust beat, poising for Poise. A trial's first run gives
  assembly XP, plus complications and finishing XP for what the piece carries. Levels 1–10 (`SKILL_XP`).
- **Certify.** Bench check, the Haldis Chronometry Bureau (BCH) and the Kessel Peak Observatory. Fifteen days: two each
  in five positions, then cold / room / warm, then two recovery days. Checks: mean rate, greatest day-to-day change,
  spread between positions, temperature per °C, beat error, amplitude after 24 h. The sheet gives the verdict in plain
  English (the first failure and what fixes it), every check against its limit, and the fifteen days. A pass stamps the
  piece (best grade kept). Fees and weeks are shown but not charged until careers (PR 5 / PR 6).

  | Grade | Mean | Day to day | Positions | Temp /°C | Beat | Amp 24 h |
  |---|---|---|---|---|---|---|
  | Bench pass | ±30 | | | | ≤ 2.0 ms | ≥ 180° |
  | Chronometer (BCH) | −4 / +6 | ≤ 5 | ≤ 6 | ≤ 0.6 | ≤ 0.8 ms | ≥ 220° |
  | Observatory | −1 / +2 | ≤ 2 | ≤ 3 | ≤ 0.3 | ≤ 0.3 ms | ≥ 240° |

- **Build capsule** Cert odds: the best grade a careful hand gets this build through at your skills (eight pieces, each
  regulated, beat set, poised four times), e.g. "BCH 100%" or "Obs 35%".
- **Tick.** Web Audio, one short noise-and-ring burst per beat (tick and tock sound different), at the piece's beat rate.
  Beat error delays every other tick, exaggerated four times so 2.6 ms limps audibly. Starts on the first tap on the Test
  tab, stops when you leave it or hide the page. Sound on / off on the trace and in Settings.

## 0.3.0.0: the Build tab (PR 2)

- **Capsule** docked at the top of the Build tab while you scroll: the rate band (slowest to fastest over six positions,
  three temperatures, full wind and 24 h), reserve, parts cost, bench hours, and a Cert cell that PR 3 fills in.
- **Eight rows**, one open at a time (remembered): Barrel; Train & jewels; Escapement; Balance & hairspring; Beat rate &
  regulation; Shock & winding; Complications; Finishing. A closed row shows what is fitted.
- **Every option** shows its parts cost, a one-line description and a delta line from a real simulation: up to three of
  amplitude, reserve, accuracy band, thickness and prestige (green helps, red hurts), then cost and bench hours, then a
  stress line it would add (red ✖ serious, amber ▲ to watch) or clear (green ✓). The fitted option says "fitted".
  Complications and finishes are tick boxes; split-seconds brings a chronograph with it and a free-sprung balance brings
  its regulator, each with a toast.
- **Locked** options are dashed and dimmed and say what unlocks them ("Needs the CNC mill (Shop)", "Research:
  Silicon hairspring (R&D)"); tapping one says the same. Until careers arrive (PR 5) a **Parts** switch chooses
  Workshop (what a new bench owns) or Everything (try any part).
- **Stress report** card under the rows: every line for the build, worst first. **Start over** puts back the plain movement.

## 0.2.0.0: the movement sim (PR 1)

The watch maths (`WATCH_SIM`), all in tables. A movement is one choice in each of ten slots (barrel, train, jewels,
escapement, balance, hairspring, beat rate, regulator, shock protection, winding) plus any number of complications and
finishes. 50 options; the ones not owned at the start say how to get them: a Shop upgrade or an R&D project.

How it behaves (numbers for the default plain manual movement, a large single barrel, 21 jewels, Swiss lever, screw
balance, steel overcoil spring at 28,800 bph):

- **Amplitude** comes from the square root of the energy reaching the balance (torque × escapement efficiency × what
  friction leaves), divided by the balance's inertia. It falls with the spring's torque across the reserve.
  Default: 295° at full wind, 247° after 24 h. A heavy balance on a small spring can't get past 220°.
- **Reserve**: the barrel's hours, scaled by the beat rate (36,000 bph uses it 22% faster), shortened by complications.
- **Rate** in each of six positions and three temperatures = isochronism error (amplitude away from 270°, cut by an
  overcoil and a fast beat) + positional error (from the balance's poise and the poising skill; crown down worst,
  dial up best; grows as amplitude falls; a tourbillon averages most of it out of the vertical positions) + temperature
  error (steel 0.62 s/day per °C, alloy 0.12, silicon 0.03) + the regulation offset + oil ageing.
- **Beat error**: 2.6 ms out of the box at assembly level 1, better with skill and a better timing machine, never below
  the regulator's floor.
- **Shock, magnetism, returns, service**: from the shock system, escapement fragility and hairspring; a sold piece's yearly
  chance of coming back.
- **Thickness, parts, cost (thalers), bench hours, prestige**: sums. Default 3.4 mm, 171 parts, Th 300, 24 h.
- **Stress report**: 17 rules in plain English, from "Amplitude below 220° at full wind" to "Drop test risk" to
  "Hairspring cracked".

The Test tab prints these numbers for the movement on the bench until the timegrapher arrives in PR 3.

## 0.1.0.0: scaffold (PR 0)

- **Setting:** the Haldis, a high watchmaking valley in the north of Velmark, an invented alpine country. Career years 2000 to 2030 (not playable yet).
- **Money:** the Velmark thaler, shown `Th 4,850` (100 pfennig to a thaler). Prices are sized like Swiss francs: repairs 80 to 400, Chronometer pieces 5,000 to 15,000, auction lots up to six figures.
- **Look:** dark felt and brass, steel greys for secondary text; a pale workshop light theme. Space Grotesk for UI, JetBrains Mono for readouts. The 3D bench view stays dark in both themes.
- **Screens:** an intro on first visit; five tabs (Bench, Build, Test, Shop, Career), each with cards saying what is coming and in which PR; a Settings sheet from the gear (graphics tier, auto-adjust, theme, motion, saves, install app, version).
- **3D:** a placeholder screw balance with a blued hairspring and a balance cock on a felt mat under one warm lamp. The balance swings at 28,800 bph (4 full swings a second) and 280° amplitude. Drag to orbit, pinch or wheel to zoom. Lite: Phong materials, no shadows, pixel ratio 1. Full: PBR brass and steel with a painted studio reflection, soft lamp shadow. Ultra: Full plus bloom (addons loaded on demand).
- **Saves:** everything in localStorage under `esc-save` and `esc-slot1`–`3`. Back up / Restore with `ESC1:` codes.
- **Save safety (0.1.0.2):** in Shop → Saves and Settings → Saves, **Save backup file** writes the same code to `escapement-backup-YYYY-MM-DD.txt` (share sheet on phones that take files, so iPhone offers Save to Files; a download elsewhere) and **Load backup file** reads one back through the same checks and confirm as a pasted code. A line says whether the browser has agreed to keep the game's storage; the game asks it once a visit, once there is progress. With progress and no backup (copied code or file) for 14 days, a quiet bar offers the Saves card once a visit. The last backup time rides in `esc-save` as `lastBackup`.
- **PWA:** installable, works offline, shows "New version ready" after a deploy.

## Known loose ends

- Save slots exist in the save format but have no UI until PR 5.
