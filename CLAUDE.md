# Notes for Claude

Escapement is a browser watchmaking career game by Longlight Interactive: build mechanical movements part by part, put them on the timegrapher, chase chronometer certification and sell to customers, collectors and auction houses, until a shared repair bench in the Haldis becomes a manufacture making its own calibres. Phone-first, free, one self-contained page (`index.html`, built from `src/`), live at https://jxstrr0.github.io/Escapement/. **The build plan is `docs/ESCAPEMENT-PLAN.md`**: read it before starting any PR, do one PR at a time, tick it off in its checklist. The game as built is `docs/DESIGN.md`.

Sister project: Prairie Engine Works (`Jxstrr0/350Chev`). The stack, build script and save-code shape are lifted from it; when in doubt, look at how PEW does it.

## Stack

- Plain HTML, CSS and classic (non-module) JavaScript in a few big `<script>` blocks. No package.json, no npm, no bundler, no CI. The node scripts below are the only checks.
- three.js **r128** from cdnjs. The bloom addons for Ultra come from jsdelivr `three@0.128.0` (the `ESC_LIBS` list in `src/html/body.html`, loaded on demand through `window.__escPost`; a Lite phone never loads them). Google Fonts: Space Grotesk (UI) and JetBrains Mono (readouts). Nothing else external.
- PWA: `manifest.webmanifest`, `icons/`, and the generated `sw.js`. Installed copies work offline.
- Assets: CC0 and CC-BY assets are fine. Every one gets a line in a `CREDITS.md` next to its folder (`sounds/CREDITS.md`, `models/CREDITS.md`, `textures/CREDITS.md`); ask Kelbo when a licence is unclear.
- Node 16 or newer for the scripts (22 is what was last used). Nothing to install. `tools/make-icons.js` needs Playwright (run by hand; output is committed).
- The props made in Blender (PR 9) are Python scripts in `tools/blender/` (`python3 tools/blender/all.py`; needs `pip install bpy`, Pillow and numpy). Run by hand; the `.glb` files they write to `models/` are committed. Never edit a model by hand: change its script.

## Commands (repo root)

```
node build.js            # rebuild index.html and sw.js from src/
node build.js --check    # exit 1 if either is stale, a script block does not compile, or a function is declared twice
node check-savecode.js   # 16 save-code checks: round trip, empty save, damaged and cut-off codes, other games, storage full, backup files
node tools/sim-test.js   # the watch sim on DEFAULT_CFG and the named TEST_BUILDS (--brief: one line each, for commit messages)
```

Run all three before every commit. To play a local copy: `python3 -m http.server` in the repo root and open it. The service worker only registers on a real host (or with `?sw=1`), so local testing is never cached. `?fps=1` shows the frame rate and tier in the corner of the 3D view.

## Source and build

- **Edit `src/`, never `index.html` or `sw.js`.** Both are generated: `node build.js` concatenates the files listed in `src/manifest.txt`, byte for byte, then writes `sw.js`.
- Commit `src/`, `index.html` and `sw.js` together.
- `src/README.md` has the file map. Read it before moving code or adding a file.
- `src/` files are slices of one page, so a file may open or close mid-IIFE. `node --check` on one file means nothing; test the built page.
- A new `src/` file must go into `src/manifest.txt` at the right position, or the build refuses to run. Empty files are refused too: give a stub at least its header comment.

## Deploy

GitHub Pages serves the repo root from `main` (`.nojekyll` keeps Jekyll out). No workflow file: merging into `main` is the deploy. Allow a minute or two, then reload the live site. Installed copies show the "New version ready" bar because the service worker's cache name carries the version and a content hash.

**Shared host.** Every Kelbo game on GitHub Pages lives on `jxstrr0.github.io`, so they share one origin: one localStorage, one Cache Storage, one storage quota. Escapement's localStorage keys all start `esc-` and its caches all start `esc-`; the service worker only ever deletes `esc-` caches. Never use another game's prefix, and never delete or clear anything outside `esc-`.

## Versions

- `const VERSION="x.y.z.w";` in `src/app/state.js` (major.minor.feature.hotfix). The build folds it into the `sw.js` cache name.
- Each plan PR bumped the **third** number up to 0.10; **1.0.0.0** is the release with the whole plan built. From 1.0 on, a new feature bumps the third number (1.1.0.0 for a bigger step) and a fix to the last release bumps the fourth.
- The merge commit into `main` is titled `x.y.z.w: summary`.

## Code conventions

- Three namespaces, same split as PEW: `WATCH_SIM` (physics and economy maths; never touches the DOM or three.js; runs in plain node), `WATCH_VIS` (three.js; the app calls `setMovement`, `setRun`, `setView`, `setQuality`, `fps`; the vis never reads game state), and the app glue in `src/app/`. `WATCH_SOUND` (the tick) and `WORKSHOP_SOUND` (the recordings) are their own blocks.
- Tuning numbers live in tables, not inline, under the names the plan gives them: `PARTS`, `DEFAULT_CFG` (`sim/parts.js`), `K` (`sim/movement.js`), `COMBOS`, `CERT`/`CERT_MULT`, `MARKET_ERA`; `SKILLS`, `SKILL_XP`, `TOOLS`, `UPGRADES`, `STAFF`, `FAULTS`, `CASES`, `COMMISSION_TEMPLATES`, `REP_TRACKS`, `REP_TIERS`, `RIVALS`, `CALENDAR`, `RETURNS`, `NEWS`, `GOALS`, `RND` at the top of `src/app/state.js` (`REP_GAIN` at the top of `src/app/calendar.js`, `CONTEST` in `sim/trial.js`).
- Three graphics tiers, `lite`, `full`, `ultra` (`src/app/perf.js`). Lite is the phone default and must keep working after every change. Every effect needs a Lite path that is cheaper, not just "off". Auto-adjust steps a tier down when the frame rate stays low; after any change, the "Graphics lowered" toast must not appear where it didn't before.
- Colours in three.js are written as sRGB hex and converted with `.convertSRGBToLinear()` (the renderer outputs sRGB); skip that and everything washes out.
- All localStorage access is wrapped in try/catch. Four keys: `esc-save`, `esc-slot1` to `esc-slot3`. **Stop and ask before adding a key**; a new one must also go into `buMake`/`buWrite` in `src/app/savecode.js` and `KEYS` in `check-savecode.js`.
- Respect `prefers-reduced-motion` (and the Motion setting, `html.reduce`) and `prefers-reduced-transparency`. The light theme (`:root[data-theme=light]`) gets every UI change; the 3D view stays dark in both themes.
- Comments in plain English at the top of each file say what it holds. Keep that up when adding one.

## Testing the sim in node

`WATCH_SIM` runs in plain node. Cut its block out of the built page; it already ends with `module.exports = WATCH_SIM`:

```
node -e 'const h=require("fs").readFileSync("index.html","utf8"),i=h.indexOf("Escapement: watch sim core");
require("fs").writeFileSync("/tmp/sim.js",h.slice(h.lastIndexOf("<script>",i)+8,h.indexOf("</script>",i)))'
node -e 'const SIM=require("/tmp/sim.js"); console.log(Object.keys(SIM))'
```

From PR 1, `tools/sim-test.js` does this and runs `DEFAULT_CFG` and the named `TEST_BUILDS`. When physics changes, put the before/after numbers in the commit message.

## Save codes

- **Back up** / **Restore** (Shop tab → Saves, and Settings → Saves) in `src/app/savecode.js`. A code is `ESC1:` + the four keys as JSON, LZW-squeezed, base64url, + a 6-character checksum. Restore checks the whole code before writing anything. The next format is `ESC2:`.
- **Save safety** (bottom of `savecode.js`): **Save backup file** / **Load backup file** next to Back up / Restore (the same code as `escapement-backup-YYYY-MM-DD.txt`, through the share sheet where it can take files, else a download; loading runs the Restore sheet's checks and confirm), a "Storage: ..." line from `navigator.storage.persisted()`, one `persist()` request per visit once there is progress, and a once-per-visit reminder bar when there is progress and no backup for 14 days. The last backup time is `S.lastBackup`, inside `esc-save` (no new key).
- Players may paste their codes to debug a game. That is their personal data: decode and run it locally only, never send it to an outside service, and don't commit it.

## How Kelbo works

- Beginner-plus coder who tests on his phone on the live site. End every task with a plain-language summary of what changed and how to test it on a phone.
- One `claude/...` branch and pull request per plan PR, into `main`. Once the three checks pass, merge it yourself (standing permission) and delete the branch. Never push straight to `main`.
- Commit subject: `Area: what changed`. Explain the why in the body. Keep pull requests small enough to read on a phone.
- Real design decisions get asked, not guessed. Each plan PR lists its open questions; ask them before starting it.
- The site and the game use the name Kelbo only, never a real name. Studio name: Longlight Interactive. Credit line: "© year Kelbo / Longlight Interactive".

## Decisions made so far (besides the plan's section 1)

- Setting: **the Haldis**, a high watchmaking valley in the north of **Velmark**, an invented alpine country.
- Palette: **dark felt + brass + steel**; the light theme is a pale workshop. UI font Space Grotesk, readouts **JetBrains Mono**.
- Certification bodies: the **Haldis Chronometry Bureau** (stamp BCH) grants Chronometer; the **Kessel Peak Observatory**, a mountaintop observatory above the valley, grants the Observatory grade.
- The trial **gates temperature**: Chronometer ≤ 0.6 s/day per °C, Observatory ≤ 0.3. A steel hairspring (0.7) tops out at a Bench pass, so the alloy spring supplier is the first step to a BCH certificate.
- Sold pieces come back on a **resale market** (auction and collector market); their price follows your reputation, and you can buy them back.
- Time: **act, then Close week** (PEW style). Nothing moves while the phone is in a pocket.
- The double-tap **loupe** camera move is on **all tiers** (it only moves the camera); reduced motion makes it cut instead of glide.
- New game offers a career (Repair bench 2000, or Skip ahead 2008) **or a Sandbox** (every part, no money).
- Going broke: the **Haldis Savings Bank lends once** (8% over a year); below zero a second time, the workshop closes with a restart offer.
- Money: the Velmark **thaler** (`Th 4,850`; 100 pfennig to a thaler), formatted by `fmt$` in `src/app/state.js`. Prices are sized like Swiss francs: a repair 80 to 400, a decent piece a few thousand, a Chronometer piece 5,000 to 15,000, an auction lot up to six figures.

## Current status (1.0.2.1)

- PR 0 done: scaffold, five tabs (Bench, Build, Test, Shop, Career), intro, Settings sheet (graphics tier, auto-adjust, theme, motion, saves, install), PWA with the update bar, `ESC1:` save codes, a placeholder balance wheel swinging at 28,800 bph on the bench in 3D (Lite / Full shadows / Ultra bloom).
- 0.1.0.2: save safety (backup files, storage protection, backup reminder; see Save codes).
- PR 1 done: `WATCH_SIM` with 12 part slots (`PARTS`, 50 options), `simulate()` (amplitude, reserve, six positions × three temperatures, beat error, shock, magnetism, thickness, cost, hours, service, prestige, return risk), 17 `COMBOS` stress rules, `tools/sim-test.js` with 12 `TEST_BUILDS`. The Test tab shows the numbers as text.
- Part `unlock` values are `start`, `shop:<upgrade id>` (PR 5 defines those upgrades: mill, lathe, cnc, polishing, timing-six, spring-supplier, jewel-supplier) or `rnd:<project id>` (PR 7).
- PR 2 done: the Build tab (`src/app/build.js`, `src/css/build.css`): eight accordion rows (`BUILD_SECS`), every option with a live delta line (amplitude, reserve, accuracy band, thickness, prestige, cost, hours, stress lines added or cleared), the docked capsule (rate band, reserve, parts cost, hours; Cert fills in with PR 3), the stress report card. Locked options say what unlocks them (`UNLOCK_NAME` until `UPGRADES`/`RND` carry names). A career's owned unlocks will live in `S.career.unlocks` (`{"shop:mill":true}`); with no career a Parts switch (`S.bAll`) offers Workshop or Everything. Each COMBOS rule now has a short `tag` for the chips.
- PR 3 done: the Test tab is a timegrapher (scrolling trace, rate / amplitude / beat error / bph readouts, positions and temperatures by the owned `TOOLS` machine, wind and lift-angle settings), the adjustment loop (Regulate in regulator notches, Adjust beat, Poise; bench hours and skill XP per press), certification (`runTrial` over 15 days against `CERT`, verdict and check table in a sheet), the tick (`WATCH_SOUND`), and the Build capsule's Cert odds (`certOdds`). Skills: `SKILLS`, `SKILL_XP`; XP in `S.xp` until careers (then `S.career.xp`), levels from `skillLvls()`.
- Save state added inside `esc-save` (no new keys): `S.bOpen`, `S.bAll` (PR 2); `S.xp`, `S.piece`, `S.pieceN`, `S.tg` (PR 3); `S.career` in full, `S.tgOn` (PR 5). The slots (`esc-slot1..3`) hold whole games, with `savedAt`.
- PR 4 done: the parametric 3D movement (`src/vis/movement.js`, numbers in `GEO`): pillar plate, barrel (single, twin, high-torque), centre / third / fourth wheels (the fourth gets 7 × bph / 1800 teeth), escape wheel, pallet fork, balance (smooth, screw, free-sprung) and hairspring (steel blued, alloy, silicon, overcoil), bridges and cock with jewels and blued screws, the regulator and shock spring, finishes (perlage, stripes, anglage, black polish), the rotor and every complication's module. The escape wheel steps per beat and the train turns from it; the fork flicks; a tourbillon cage turns once a minute. Static parts merge into one mesh per material per layer; Lite caps teeth at 36 (a grand complication is about 33k triangles). Views: Assembled / Exploded and the loupe (button or double tap), gliding or cutting with reduced motion. App side: `src/app/bench.js` (`visSync()` sends `setMovement` and `setRun` from the timegrapher state).
- PR 5 done: careers (`src/app/business.js` is the engine, `shop.js` and `career.js` the tabs, `css/shop.css`). `S.career` (null in the Sandbox) holds the week (`wk`, `year`, `week`), `cash`, your hours used (`used`), `up` (upgrades) and `unlocks`, `xp`, `jobs`, `repairs`, `bench` (your piece), `stock`, `orders`, `offers`, `trade`, `staff`, `books`, `sold` (for PR 6's resale market), `loan`. `normCareer()` fills in missing fields on load. Tables: `UPGRADES`, `STAFF`, `FAULTS`, `CASES`, `COMMISSION_TEMPLATES`, `BIZ` (`src/app/state.js`); `ECON`, `pieceValue`, `buyChance`, `tradeTerms`, `eraMult` (`sim/market.js`). Close week is in PR 5 (the plan put the calendar in PR 6; PR 6 adds its events). The Test tab has career modes (`tgMode()`: piece, making, away, empty, repair) and `S.tgOn` puts a repair on the timegrapher.
- PR 6 done: the calendar (`src/app/calendar.js` engine, `src/app/events.js` cards and sheets, `css/events.css`). Tables in `state.js`: `REP_TRACKS` (collectors, trade, press), `REP_TIERS`, `RIVALS` (five shops), `CALENDAR` (the Haldis Valley Fair week 37; the Kessel Peak Trial, entries weeks 8-18, results week 24; auction nights at Brugg & Lell weeks 16 and 46, 12% fee each side), `RETURNS`, `NEWS`, `GOALS`; `REP_GAIN` and `REP_SEG` at the top of `calendar.js`; `MARKET_ERA` filled in (`sim/market.js`); `CONTEST` / `runContest` (`sim/trial.js`). New inside `S.career` (no new keys): `rep`, `goals`, `news`, `newsN`, `contest`, `contests`, `sale`, `fair`, `fairs`, `slumpLetGo`; stock pieces can carry `away` (at the trial) and `lot` (consigned); sold rows now keep seed, adjust, thick, r, `how` (retail, commission, auction, dealer), and `risk` / `why` / `ret` for service returns, `resoldWk` for the resale market. Reputation fades 0.8% a week. Commission tiers 2 and 3 now open by the segment's reputation (tier 1 / tier 3) instead of by weeks.
- 0.7.1.0 (not a plan PR): metal materials. `src/vis/studio.js` (the studio HDRI `textures/studio_small_03.hdr`, CC0 from Poly Haven, decoded, aimed and baked per tier: `ENV`) and `src/vis/finish.js` (`FIN` finishes drawn as shade / normal / roughness maps; `metalMat`, `gemMat`). Lite metal is MeshBasicMaterial × a baked LDR reflection (cheaper than the old Phong); Full / Ultra are PBR on PMREM with ACES. The service worker caches `textures/` like sounds/ and models/.
- 0.7.2.0 (not a plan PR): the workshop. `src/vis/room.js` (`ROOM`, `ROOM_MODELS`, `buildRoom`, `roomCull`, `roomClamp`): a raised oak bench at true scale (286 units a metre) in a room with a window over the valley, growing by stage (corner, shop, workshop, manufacture) and showing each owned machine. The app sends it with `WATCH_VIS.setRoom(roomSpec())` (`roomSync()` in `src/app/bench.js`, also called from `save()`). Lite is all code; Full / Ultra add ten CC0 Poly Haven models from `models/` (packed with `tools/pack-model.py`, credited in `models/CREDITS.md`), loaded with GLTFLoader from the `ESC_LIBS` list. Ultra adds BokehPass depth of field before the bloom.
- PR 7 done (0.8.0.0): R&D, `src/app/rnd.js`. `RND` (17 projects: complications, movement parts, in-house, calibre) and `RND_SLOTS` in `state.js`; pay up front, done at Close week (`rndClose`), unlocks `rnd:<id>`, teaches XP. In-house parts are a third list slot, `house` (`PARTS.house`: of / save); a cfg can carry `cal` (calibre id), and `K.calibre` gives the bonus. Calibres live in `S.career.calibres` (Sandbox: `S.cals`), each `{id, name, core}` over `CAL_CORE`; the Build tab has a Calibre row on top and an In-house parts row. Make refuses locked parts (`lockedParts`). Rhodium plating finish (vis: silver plates and bridges). The default sim seed leaves an empty `house` out (`seedKey`) so old builds keep their numbers.
- Known balance point: cash piles up for a player who never spends (repairs and trade batches; about Th 300,000 by year 8). Accepted: 0.10.1.0 made R&D 40% cheaper (about Th 350,000 for everything) so an investing player finishes it around year 7-10 and a saver can spend the pile on it.
- PR 8 done (0.9.0.0): `src/app/help.js` (the coach-card tour `TUT`, run by `tutKick` after every `save()`; `GLOSS` glossary, `helpSheet`, tap-to-explain via `data-g` / `gA(key)`), `src/app/cards.js` (certificate and trophy cards, `S.career.certsLog`), `src/app/photo.js` + `src/vis/photo.js` (photo mode, backdrops via `WATCH_VIS.setBackdrop`, `photoGrab`; `S.photo`), `src/app/share.js` (`shareCanvas`, the one save-or-share path). The intro offers a Repair bench career with the tour or the Sandbox. Landscape phones get a side-by-side layout (`style.css`). Tour state in the career: `tut`, `tutStep`, `tutRep`.
- PR 9 done (0.10.0.0): the Bench's Dial side view (`src/vis/watch.js`: `CASE_GEO`, `WATCH`, `watchLayout`, `dialCanvas`, `buildWatch`; app side `watchSpec()` and `S.dialCase` in `src/app/bench.js`). Each case brings its own dial (cosmetic only). Blender props scripted in `tools/blender/` (`common.py`, `case.py`, `dials.py`, `tourbillon.py`, `machines.py`, `all.py`): three case sizes, four applied-marker dials, the tourbillon cage (`moveModels` in `vis/movement.js`), the timing machine, cleaning machine and display window (`ROOM_MODELS`). Materials are named by role and swapped for the game's own; Lite draws everything in code.
- 0.10.1.0: balance (R&D 40% cheaper, see Known balance point). 0.10.2.0: polish (upright Roman numerals, the chrono counter kept on a full dial, the display window moved into view, certificate wording).
- **1.0.0.0: the release.** The plan is built; Settings shows the version. Next: fixes and features from phone testing, one PR each. Still open: share and Full performance not yet tried on a real phone. The Kelbo.Website game card is Kelbo's own change in that repo.
- 1.0.0.1: Ultra tone-maps once (the bloom's copy to the screen no longer tone-maps again), so it shows Full's colours.
- 1.0.0.2: speed pass. The 3D view draws at most 60 times a second (`FRAME` in `vis/bench.js`) and the shadow every other frame (`shadowMap.autoUpdate` off; set `needsUpdate` before any extra render that needs a fresh one, as `photoGrab` does).
- 1.0.1.0: workshop sounds. CC0 recordings in `sounds/` (`sounds/CREDITS.md`), `WORKSHOP_SOUND` in `src/sound/workshop.js` (its own script block); app side `wsSync()` / `sfx(name)` in `app/bench.js`. Bell on arrivals, till on sales, a chime at Close week, a quiet ambience (clock, valley, the cleaning machine's cycles). Settings: Tick and Workshop sounds switches (`S.sound`, `S.wsound`, in `esc-save`). Top-level `const`s are not `window` properties: test them with `typeof`.
- 1.0.2.0: the tour explains the numbers (four Test cards: rate, amplitude, beat error, beat; four Build capsule cards: rate band, reserve, parts and hours, cert odds; steps found by `id` through `tutIdx`), and a failed trial's sheet has "Where to fix it" buttons (`CERT_FIX`, `goFix` in `src/app/test.js`) that open the Test control, Build slot or Shop upgrade and ring it (`.fixhi`).
- 1.0.2.1: fixes from an audit. `openSheet` gives each sheet a fresh `#sheetBody` (listeners no longer pile up and act on an earlier watch or piece); the phone's Back button closes a sheet (`sheetHist`: one history entry, pushed when a sheet opens and reused by the next one); the tour no longer rewinds to step 6 on reload; commissions only take free pieces; the loan sheet is followed by the week's report; `c.lastWeek` and a Last week button; a low-cash warning on the Career card and a `bank` glossary entry; New game asks first when it would replace a career, and Settings has New game; upgrades say how much cash is short. Also: Close week re-asks the bank while cash is below zero (the loan sheet could be closed unanswered); the backup bar hides under an open sheet (`html.sheeton`); the tour's first card points at Close week when no repairs are in (a step's `alt`); the landscape coach card puts its buttons on their own row.
- **Paused: `docs/OPEN-QUESTIONS.md`** holds the balance and design questions from the 1.0.2.1 audit. Ask Kelbo before starting any of them.
- What to test on a phone after any change: the loading bar finishes and the bench renders on Lite; every tab opens; Settings opens and the theme switches; Back up then Restore round trips; portrait and landscape; no console errors on desktop.

## Longlight brand (studio pieces only)

The game keeps its own look (felt and brass). The Longlight brand applies only to studio pieces: the studio logo or splash, the "Longlight Interactive" credit line, the studio block on a credits or about screen, and any link back to the studio site (https://jxstrr0.github.io/Kelbo.Website/). Use the official logo files from `Jxstrr0/Kelbo.Website` (`assets/press/longlight-logo-dark` / `-light`); copy them in, never hotlink, redraw or recolour them. Studio colours inside studio pieces only: Clay `#D97757`, Purple `#7B3FC4`, Slate `#141413`, Ivory `#FAF9F5`, Lilac `#B48CE8`.

## Studio catalogue

`LONGLIGHT-STUDIO.md` (repo root) covers every Longlight game: looks, names
already taken, storage and cache prefixes on the shared origin, a reuse map and
improvement ideas. Read it before pitching new ideas, names or looks, and
before building a system another Longlight game may already have. This file
wins where the two disagree. Don't edit the copy here: the master is
`.github/LONGLIGHT-STUDIO.md` in Jxstrr0/Kelbo.Website; it gets recopied.
