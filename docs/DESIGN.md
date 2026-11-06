# Escapement: the game as built

This file describes the game as it actually is on `main`. It grows as plan PRs land; the plan itself, with everything still to come, is [`ESCAPEMENT-PLAN.md`](ESCAPEMENT-PLAN.md).

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
- **PWA:** installable, works offline, shows "New version ready" after a deploy.

## Known loose ends

- Save slots exist in the save format but have no UI until PR 5.
