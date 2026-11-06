# Escapement: the game as built

This file describes the game as it actually is on `main`. It grows as plan PRs land; the plan itself, with everything still to come, is [`ESCAPEMENT-PLAN.md`](ESCAPEMENT-PLAN.md).

## 0.8.0.0: R&D, in-house parts and your own calibre (PR 7)

- **R&D** (Career tab, the R&D card): 17 projects in `RND` (`src/app/state.js`). Pay the cost up front; the project is ready at the Close week its weeks run out, and it teaches you (skill XP). One runs at a time; the clean room or a master watchmaker on the staff gives a second R&D bench. Each project can need a skill level, a Shop upgrade or another project first, and the card says which. Stop a project and the money is gone.
  - **Complications:** power reserve (Th 2,500, 4 weeks, a good first project), moonphase, chronograph (Th 16,000, 12 weeks, Complications 3), annual calendar, split-seconds (after the chronograph), perpetual calendar (after the annual), tourbillon, minute repeater (Th 110,000, 36 weeks).
  - **Movement parts:** free-sprung balance, silicon hairspring, co-axial and detent escapements.
  - The complications skill a project needs is below the complication's complexity on purpose: you can build one before you have mastered it, with extra beat error and returns until you train up (the "beyond your skill" stress line).
- **In-house parts** (`PARTS.house`, a new list slot; Build tab, In-house parts row): hairsprings (needs the clean room), balances (lathe), escapements and plates & bridges (CNC). Each takes 50-60% off that part's cost and adds prestige (collectors pay for "in-house"), but costs 2-4 bench hours a piece. Finishing the project switches it on in your build.
- **Your own calibre** (after in-house plates, with the CNC; Th 60,000 and 24 weeks, Th 25,000 and 14 weeks for each one after, up to four): name it, and the core of the build in the Build tab (barrel to winding) is frozen as your calibre. Pick it in the Calibre row at the top of the Build tab: its core goes in at once, and a piece built on it takes 20% fewer hours, its parts cost 20% less and collectors count 6 more prestige (`K.calibre`). Complications, finishes and in-house parts stay free; changing a core part takes the build off the calibre. Pieces are named after it ("No. 12 · Haldis 1 calibre, hand-wound, chronograph"). The goal "Your own calibre" is reached when the first one is ready. In the Sandbox, "Save this core as a calibre" is free and instant.
- **Make refuses parts you don't own yet** (a build left over from the Sandbox, say): the Make card names them and what unlocks them.
- **Rhodium plating:** a new finish (Th 14, 1 h, +1 prestige) that turns the plates and bridges silver-white in 3D instead of gilt.
- Saved inside `esc-save` (no new keys): `S.career.rnd` (`done`, `run`), `S.career.calibres`, `S.cals` (the Sandbox's), and `cal` / `house` in a build. The sim's numbers for every build without them are unchanged.

## 0.7.2.0: the workshop

- **The bench is in a room now.** The movement sits in a holder on a green felt mat on a raised oak watchmaker's bench at true scale (the plate is about 15 mm across), with a riser of small parts drawers behind it, tweezers, an eye loupe, an oiler and rodico on the mat, and a window over the Haldis valley behind. Zoom out (pinch or wheel) to see the whole bench and the room; the camera stays inside the walls.
- **It grows with the career** (`roomSpec()` in `src/app/bench.js`, sent with `WATCH_VIS.setRoom`): a shared corner with a small window and an old alarm clock to begin; your own shop (the shop upgrade) with panelled walls, a big window, a shelf, a wall clock, a longcase clock and a parts cabinet; the workshop (a mill, CNC or second bench) and the manufacture (CNC plus clean room) with pale walls. Every owned machine stands somewhere: the timing machine (basic, six-position or the climate-box lab), the cleaning machine, lathe, polishing motor, mill, CNC, second bench, display window, climate unit and the clean-room door. The Sandbox shows the shop.
- **Lite** draws the whole room in code (one mesh per material, about 20k triangles at the default view) and downloads nothing extra. **Full / Ultra** add ten CC0 models from Poly Haven (`models/CREDITS.md`, about 2 MB, fetched once and cached offline): the arm lamp, screwdrivers, pliers, magnifier, oil and cleaner tins, alarm, wall and longcase clocks and the parts cabinet. Until a model arrives its coded stand-in shows. Models off screen are not drawn, and the far plane follows what the camera can see, so the default view costs about the same as before. **Ultra** adds depth of field (focused on the orbit target) before its bloom.

## 0.7.1.0: metal that looks like metal

- **The studio light.** Every tier now reflects a real photographed studio: Poly Haven's "Studio Small 03" (CC0, `textures/CREDITS.md`), cut to 512 × 256 (`textures/studio_small_03.hdr`, about 420 KB, fetched once, then cached offline by the service worker with sounds/ and models/). On load the game swings its big umbrella softbox up over the far side of the movement and adds a soft overhead fill, the way movements are photographed. Until it arrives (or if it can't), a painted stand-in with the same layout is used, so the metal is never unlit.
- **Lite (phones)** got cheaper and better at once: metal is the colour times a small baked copy of the light (sharp for polished steel and jewels, satin for wheels, frosted for plates), one texture read a pixel and no lighting maths, where it used to be Phong. Reflections move as you orbit. The finishes show as baked shade maps.
- **Full / Ultra:** PBR metal lit by the HDR through PMREM, ACES tone mapping; the finishes are drawn in code as normal and roughness maps (`src/vis/finish.js`): perlage spots with circular scratches, Côtes de Genève domed bands with fine lines on the bridges (and the rotor), circular graining on every wheel, a fine frosted grain on undecorated plates and bridges. Anglage now polishes the bevelled edges to a mirror (the bridge's sides are their own material). Jewels have a clear coat, blued screws an oxide sheen. Ultra's bloom threshold was raised so only the brightest glints glow.
- Triangle counts are unchanged; the finish textures are made once per tier (Lite 128 px, Full 512, Ultra 1024), not on every part change.

## 0.7.0.0: the calendar, reputation and the smartwatch years (PR 6)

- **Reputation** (Career tab): three tracks, each with a tier from Unknown through Local name, Known in the valley,
  Respected and Renowned to Legendary. **Press** (repairs done right, certificates, trial podiums, commissions from private
  customers) brings walk-in buyers, 12% more per tier. **Collectors** (sales of finished and complicated pieces,
  certificates, auction sales, old pieces reselling above their price) raise auction estimates and resale prices.
  **Trade** (trade batches on time) brings bigger and better-paid batches, more often. Tier 2 commissions need the
  segment's track at Local name and tier 3 at Respected. A wrong repair, a late delivery or a service return costs
  reputation. Every track fades a little each week (0.8%).
- **Coming up** card: the next auction night, the trial and the fair, soonest first, with their buttons.
- **The Haldis Valley Fair** (week 37). Book a stand (Th 450) up to five weeks before and choose up to three stock pieces.
  At the fair, visitors buy at your asking price more readily than walk-ins (1.6 times the chance), collectors notice
  finished and complicated pieces, and there are commission enquiries and often a trade enquiry.
- **The Kessel Peak Trial** (entries weeks 8-18, Th 250; results week 24). One cased stock piece against five rival shops
  (Varn & Söhne, Halvard, Atelier Amsel, Kessler, Ostrander Frères, who get a little better every year). Thirty days: four in
  each of five positions, cold / room / warm, four recovery days. Points from an index of the mean rate away from zero, the
  day-to-day changes, the position spread and (weighted most) the temperature error. The results play like a race, the
  leaderboard re-sorting day by day; then the place, the prize (Th 6,000 / 3,000 / 1,500) and where it lost most. A steel
  hairspring falls away in the temperature days; a regulated BCH piece places around the podium; an Observatory build wins.
- **Auction nights** at Brugg & Lell (the Spring sale, week 16; the Winter sale, week 46). From six weeks before, consign
  stock pieces (Shop tab, Auction…) with no reserve, 80% or full value; they're held from walk-ins and the dealer. Your
  sold pieces come back as resale lots once they're half a year old (and not again for two years); their estimate follows
  the collectors' opinion of you, and you can bid to buy them back. In the saleroom each lot is bid up live by named
  collectors and the rival shops (going once, going twice), then sold or bought in. 12% off the hammer for the seller, 12%
  on top for the buyer. Never opened, the sale runs by itself at Close week.
- **Service returns.** For two years after a sale (not to the dealer), a piece can come back on its yearly return risk:
  dropped (cracked crystal, bent staff), magnetised, or oil drifting. You pay parts and the courier, it takes bench hours,
  the press and collectors hear about it, and a cracked crystal flashes over the screen.
- **The smartwatch years.** News cards (Career tab) by date from 2000 to 2030. From 2015 to 2018 trade batches pay 35%
  less, walk-in buyers drop 20%, repairs 40%, and the press cares less about accuracy honours. From 2019 collectors pay 40%
  more at auction and for collectors' commissions, and finished pieces are worth up to 25% more.
- **Goals** (Career tab): first Chronometer, first commission, your own shop, a trial podium, a sale under the hammer, your
  own calibre (R&D), Observatory grade, a perpetual calendar, and through the slump (2019 with staff kept on).
- **Rival shops** card: who they are and where they placed last time; your trial history.

## 0.6.0.0: the shop and the career (PR 5)

- **New game** (Career tab): **Repair bench, 2000** (a shared bench, the basic timing machine, Th 2,500), **Skip ahead to
  2008** (your own shop, the six-position machine, a cleaning machine, Th 18,000, skills at level 3) or the **Sandbox**
  (every part, no money, no calendar: what the game was before careers).
- **Time.** Act, then **Close week**. You have 45 bench hours a week. Adjusting spends them at once; what is left at Close
  week goes into the work in hand (assembling your piece, repairs, trade batches, first in first out). Staff take repairs
  and trade work. Rent (Th 140 on the shared bench, Th 620 in your own shop), your keep (Th 260) and wages go out every week.
- **Repairs.** Customer watches come in (about 1.8 a week, more with your own shop) with a complaint shared by more than one
  fault. Put one on the timegrapher: magnetised races, a dry one loses amplitude, a broken mainspring shows no trace, a bent
  hairspring limps (big beat error), worn pivots scatter, water damage goes wild. Choose the fix (hours, parts); you're paid
  when it goes back working. A wrong fix wastes the work and the watch comes back. Uncollected after four weeks, it leaves.
- **Your pieces.** Build tab: **Make this piece** pays the parts and queues the assembly. Once assembled it is on the
  timegrapher; it needs at least a Bench check to be sold. The Bureau (Th 140, 3 weeks) and the Observatory (Th 650, 6 weeks)
  keep it for their weeks and send the result back at Close week. Then **case** it (five cases; a movement too thick for a
  case won't go in) and it goes into stock at its value.
- **Selling.** Each week a few buyers (more with your own shop and a display window) look at your stock and may buy the
  best value for its price (−20%, value, +20%, +50%). The dealer in town pays 55% at once. **Commissions** (ten kinds, from a
  retirement watch to an Observatory piece, harder ones by reputation from 0.7.0.0) have a spec, a budget and a deadline: deliver a
  cased piece that meets it from stock; late pays 10% less a week. **Trade batches**: 8 to 20 plain movements for another
  brand, parts paid up front, paid on delivery.
- **Upgrades** (14: machines, suppliers, the shop, a window, a second bench, climate control, a clean room) unlock parts and
  tools and change rent, staff places, buyers and repair hours. **Staff**: apprentice, watchmaker, master watchmaker.
- **The bank** lends once when the till goes below zero at Close week (8% over a year). Below zero again, the workshop closes.
- **Save slots** (Career tab): three whole games on this phone. Loading one keeps this phone's settings.
- Numbers to judge it by (a bot playing two years): repairs alone just pay the bills on a shared bench; repairs, pieces and
  trade together end the first year near Th 34,000 before any upgrades.

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
- **3D:** the movement you built, on a felt mat under one warm lamp, rebuilt whenever a part changes. Barrel by the crown, the train curving round to the escape wheel, fork and balance near the far edge; bridges and cock with ruby jewels (gold chatons from 25 jewels) and blued screws; finishes show as perlage on the plate, stripes on the bridges, bevelled edges, a glossy steel. Automatic adds a rotor that rocks; date, GMT, moon and calendars sit on the dial side; the chronograph, split-seconds, power reserve and repeater gongs on top; a tourbillon carries the escapement and balance in a cage that turns once a minute. The balance swings at the timegrapher's amplitude and beat rate, the escape wheel steps half a tooth each beat and the train turns from it, the fork flicks from banking to banking. The tag under the view names the movement. Bench tab: Assembled / Exploded (the layers lift apart) and the loupe on the balance and escapement (or double-tap the view); views glide, or cut with reduced motion. Drag to orbit, pinch or wheel to zoom. Lite: no shadows, pixel ratio 1 (materials changed in 0.7.1.0, below). Full: PBR brass and steel, soft lamp shadow. Ultra: Full plus bloom (addons loaded on demand).
- **Saves:** everything in localStorage under `esc-save` and `esc-slot1`–`3`. Back up / Restore with `ESC1:` codes.
- **Save safety (0.1.0.2):** in Shop → Saves and Settings → Saves, **Save backup file** writes the same code to `escapement-backup-YYYY-MM-DD.txt` (share sheet on phones that take files, so iPhone offers Save to Files; a download elsewhere) and **Load backup file** reads one back through the same checks and confirm as a pasted code. A line says whether the browser has agreed to keep the game's storage; the game asks it once a visit, once there is progress. With progress and no backup (copied code or file) for 14 days, a quiet bar offers the Saves card once a visit. The last backup time rides in `esc-save` as `lastBackup`.
- **PWA:** installable, works offline, shows "New version ready" after a deploy.

## Known loose ends

