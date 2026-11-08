# Notes for Claude

Escapement is a browser watchmaking career game by Longlight Interactive: build mechanical movements part by part, put them on the timegrapher, chase chronometer certification and sell to customers, collectors and auction houses, until a shared repair bench in the Haldis becomes a manufacture making its own calibres. Phone-first, free, one self-contained page (`index.html`, built from `src/`), live at https://escapement.longlight.games/. **The build plan is `docs/ESCAPEMENT-PLAN.md`**: read it before starting any PR, do one PR at a time, tick it off in its checklist. The game as built is `docs/DESIGN.md`.

Sister project: Prairie Engine Works (`Jxstrr0/350Chev`). The stack, build script and save-code shape are lifted from it; when in doubt, look at how PEW does it.

## Stack

- Plain HTML, CSS and classic (non-module) JavaScript in a few big `<script>` blocks. No package.json, no npm, no bundler, no CI. The node scripts below are the only checks.
- three.js **r128** from cdnjs. The bloom addons for Ultra come from jsdelivr `three@0.128.0` (the `ESC_LIBS` list in `src/html/body.html`, loaded on demand through `window.__escPost`; a Lite phone never loads them). Google Fonts: Space Grotesk (UI) and JetBrains Mono (readouts). Nothing else external.
- PWA: `manifest.webmanifest`, `icons/`, and the generated `sw.js`. Installed copies work offline.
- Assets: CC0 and CC-BY assets are fine, and so are sounds Kelbo has made with ElevenLabs on his paid plan (quote the credits and wait for a yes before generating). Every one gets a line in a `CREDITS.md` next to its folder (`sounds/CREDITS.md`, `models/CREDITS.md`, `textures/CREDITS.md`); ask Kelbo when a licence is unclear.
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

**Own address.** Since November 2026 every Longlight game has its own subdomain, so Escapement (`escapement.longlight.games`) has its own origin: its own localStorage, Cache Storage and storage quota. Saves from before the move stay on the old shared origin, `jxstrr0.github.io` (Kelbo accepted that). The prefix rules still apply, so old copies there stay apart from the other games: Escapement's localStorage keys all start `esc-` and its caches all start `esc-`; the service worker only ever deletes `esc-` caches. Never use another game's prefix, and never delete or clear anything outside `esc-`.

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
- Money: **euros** (`€4,850`, whole amounts; Kelbo, 1.0.2.3), formatted by `fmt$` in `src/app/state.js`. Prices are sized like Swiss francs: a repair 80 to 400, a decent piece a few thousand, a Chronometer piece 5,000 to 15,000, an auction lot up to six figures.

## Current status (1.1.2.0)

The full log from PR 0 to 1.1.2.0 (what each version added, the tables and
save fields it brought) is `docs/HISTORY.md`. Read the matching entry before
changing a system it describes; add each new release there and update this
section.

- Built: the whole plan (1.0.0.0 was the release), then fixes and features
  from phone testing: workshop sounds and ElevenLabs effects, the tour that
  explains the numbers, "Where to fix it" on a failed trial, career
  difficulty and trial tuning, euros, the career summary at 2031, and the
  bench kept free while a piece is at a trial.
- Gotcha: top-level `const`s are not `window` properties; test them with
  `typeof`.
- **Paused:** `docs/OPEN-QUESTIONS.md` holds the balance and design questions
  from the 1.0.2.1 audit, with Kelbo's decisions (2026-11-08) at the top.
  Next: 1.2.0.0 (staff skills, pitch first). Still untried on a real phone:
  share and Full performance.
- What to test on a phone after any change: the loading bar finishes and the
  bench renders on Lite; every tab opens; Settings opens and the theme
  switches; Back up then Restore round trips; portrait and landscape; no
  console errors on desktop.

## Longlight brand (studio pieces only)

The game keeps its own look (felt and brass). The Longlight brand applies only to studio pieces: the studio logo or splash, the "Longlight Interactive" credit line, the studio block on a credits or about screen, and any link back to the studio site (https://longlight.games/; press kit https://longlight.games/press.html). Use the official logo files from `Jxstrr0/Kelbo.Website` (`assets/press/longlight-logo-dark` / `-light`); copy them in, never hotlink, redraw or recolour them. Studio colours inside studio pieces only: Clay `#D97757`, Purple `#7B3FC4`, Slate `#141413`, Ivory `#FAF9F5`, Lilac `#B48CE8`.

## Studio catalogue

`LONGLIGHT-STUDIO.md` (repo root) covers every Longlight game: looks, names
already taken, storage and cache prefixes (kept apart from the old shared origin), a reuse map and
improvement ideas. Read it before pitching new ideas, names or looks, and
before building a system another Longlight game may already have. This file
wins where the two disagree. Don't edit the copy here: the master is
`.github/LONGLIGHT-STUDIO.md` in Jxstrr0/Kelbo.Website; it gets recopied.
