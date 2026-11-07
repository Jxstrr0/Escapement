# Escapement: the game as built

This file describes the game as it actually is on `main`. It grows as plan PRs land; the plan itself, with everything still to come, is [`ESCAPEMENT-PLAN.md`](ESCAPEMENT-PLAN.md).

## 1.0.2.2: career difficulty

A difficulty audit ran 25 bot careers (an expert, a sloppy novice, repairs only, idle; both starts). Every expert that hired staff went broke, the 2008 start was harder than the 2000 one, one wrong repair cost five right ones in press reputation, and piece prices ran to six figures at walk-in so everything was done by year 5. Changes, measured with the same bots afterwards:

- **Staff earn their keep.** Brands offer trade batches more often and bigger when you have staff (`BIZ.tradeStaff`: each 40 staff hours a week adds half again to the chance; batch size steps up per 80 staff hours). The Staff card says how much repairs and trade work is waiting for them against the hours they do, warns when they are idle on full pay, and says a new hand needs about 30 h of that work a week. Bots that hire (and take the batches) now do better than those that don't, and none went broke.
- **Skip ahead 2008 is fair.** Th 28,000 to start (was 18,000), the shop's rent Th 520 a week (was 620), and the bank lends what you are short plus 12 weeks of costs (`BIZ.loan.cover`, was 4). Experts no longer sit at Th 1,000-20,000 for years; repairs alone in a shop still run down slowly (closed after about 7 years, was 1-2).
- **A wrong repair** costs 0.2 press reputation (was 0.5; a right one gains 0.1).
- **Piece prices:** prestige adds 5% of the price per point (`ECON.markupPrestige` .05, was .11), and walk-in buyers rarely pay above Th 15,000, plus 35% per press tier (`ECON.walkIn`, `walkInCap`; above it the chance falls with the square of the overshoot; fair visitors go to 1.5 times that). Dearer pieces sell at auction, by commission or to the dealer; the Stock card says so.
- **The long game:** skills take longer at the top (`SKILL_XP` level 10 at 520 XP, was 320; levels 1-4 unchanged) and every R&D project takes 1.5 times the weeks. An expert now finishes R&D around year 6-7 (was 4-5) and maxes skills around year 10-13 (was 3-4).
- Still open: cash keeps piling up once R&D is done, because nothing is left to buy and 2030 has no ending (`docs/OPEN-QUESTIONS.md` 8).

## 1.0.2.0: the numbers in the tour, fix buttons on trial results

- The tour (`TUT` in `src/app/help.js`, now 16 steps) stops on each timegrapher readout (Rate, Amplitude, Beat error, Beat) after "Read the trace", and on the Build capsule (Rate band, Reserve, Parts and hours, Cert odds) before "Make it". Each card says what the number is, what is good, what a certificate needs and which control moves it. Steps that other code jumps to carry an `id` (`close`, `make`) and are found with `tutIdx`, so adding cards does not break old saves' `tutStep` checks.
- A failed trial's result sheet has a **Where to fix it** block: one row per failed check, with buttons from `CERT_FIX` (`src/app/test.js`). Mean rate goes to Regulate; rate spread to the regulator and beat rate slots; position spread to Poise (and the Six-position timing upgrade in the Shop when a career hasn't bought it); temperature to the hairspring; beat error to Adjust beat and the regulator; amplitude to the barrel, train and balance. A button closes the sheet, opens the tab (and the Build accordion row or Shop upgrades), scrolls there and rings the target for a couple of seconds (`.fixhi`; no pulse with reduced motion). In a career, a note says Build changes count for the next piece made.

## 1.0.1.0: workshop sounds

- Real recordings, all CC0 (`sounds/`, credited in `sounds/CREDITS.md`), played by `WORKSHOP_SOUND` (`src/sound/workshop.js`) on the tick's AudioContext. They are fetched the first time they are needed (about 430 KB in all) and the service worker keeps them for offline.
- **The shop bell** rings when work comes in at the start of a week: repairs, a commission enquiry, a trade offer. **The till** (a drawer and coins) when a piece sells, by any road (retail, the fair, an auction lot, the dealer, a commission delivered) and when a trade batch is delivered. Repair pay makes no sound (it would ring every week).
- **Close week** strikes a mantel clock three times; the bell and the till for the week wait for the strokes (`hold` / `release`), each at most once.
- **Ambience**, quiet under everything once you have tapped the page: the wall clock, birds and air through the window, and from the cleaning machine on, the machine running a 22 s cycle every minute and a half. It fades out while the page is hidden and on the Test tab while the tick is on (the timegrapher needs quiet).
- **Settings** has two switches: **Tick** (the watch on the Test tab; the Test tab's button now says Tick on / off) and **Workshop sounds** (on by default; switching it on rings the bell). Both ride in `esc-save` (`S.sound`, `S.wsound`) and stay with the device when a slot is loaded. No new storage key.
- The Close week chime is the shop bell pitched an octave down, as a stand-in: a real clock strike can replace `chime.mp3` later without code changes.

## 1.0.0.2: speed pass

- Measured on Full and Ultra in the heaviest scene (a grand complication in the manufacture): about 70 draw calls and 20,000 to 35,000 triangles on screen, a 768 px reflection map, 512 px prop textures and no per-frame texture uploads. The draw side was already lean, so the pass removes wasted frames instead of cutting detail.
- The 3D view draws at most **60 times a second** (`FRAME` in `src/vis/bench.js`). Phones with 90 or 120 Hz screens drew the bench up to twice as often for nothing; a 90 Hz screen still averages 60, not 45.
- The lamp's **shadow is redrawn every other frame** (30 times a second; `shadowMap.autoUpdate` off). The lamp never moves, only the small swinging parts do. On Ultra the depth-of-field pass used to draw the shadow a second time each frame; now it is drawn once. A photo always gets a fresh shadow.
- Nothing looks different: Full and Ultra screenshots match the 1.0.0.1 ones (mean difference under 0.5 of 255, only where the balance has swung). Lite is untouched.

## 1.0.0.1: Ultra's colours

- Ultra tone-mapped the picture twice: once going into the effects buffer, then again in the bloom pass's last copy to the screen (three.js r128 tone-maps every material). The copy no longer tone-maps (`V.bloom.basic.toneMapped=false`), so Ultra shows Full's colours plus its bloom and depth of field; the brass plate no longer greys out. The background's clear colour goes into the composer's linear buffer converted (`sRGB()`), so the workshop, velvet and white backdrops match Full too. Photo mode's white-studio exception is gone (it is no longer needed).

## 1.0.0.0: the release

- The plan (`docs/ESCAPEMENT-PLAN.md`) is built: PRs 0 to 9, the balance pass (0.10.1.0) and the polish pass (0.10.2.0). No game changes in 1.0 itself; the version shows at the bottom of Settings and under the intro ("Escapement 1.0.0.0"), and installed copies get the "New version ready" bar as usual.
- Saves from every earlier version load as they are (the same four keys, `ESC1:` codes).

## 0.10.2.0: polish

- **Upright numerals:** Roman numerals from IIII to VIII used to point their feet at the centre, so they read upside down at the bottom of the dial. They are now turned half round to read upright: printed on the enamel dial (`dialCanvas`, `src/vis/watch.js`) and applied on the guilloché dial (`tools/blender/dials.py`, `models/dial-guilloche.glb` remade).
- **The chronograph's counter on a full dial:** a grand complication (tourbillon, moonphase, perpetual calendar, chronograph) used to lose the 30-minute counter, because the calendar took every sub-dial. Now the chronograph takes its counter before the perpetual's day and month, and those move to a pair of windows by 4-5 (`dmwin`). A perpetual calendar with a moonphase and no chronograph puts the month in a window there (`monthwin`) instead of leaving it out.
- **The display window** stood on the floor behind the camera, where the bench view never saw it. It now stands against the back wall, left of the bench (`ROOM_MODELS.window`, and the Lite stand-in in `buildRoom`).
- **Certificate wording:** the line under the grade names the trial's real temperatures: "Timed for fifteen days in five positions and at 8, 23 and 38 °C, this movement met every limit the Bureau sets for a chronometer." The Observatory's says "on Kessel Peak" and "every limit for the Observatory grade".

## 0.10.1.0: balance (R&D 40% cheaper)

- A bot played 12-year careers both ways. A player who only does repairs and trade batches and never spends ends with about Th 300,000 by year 8; a player who buys upgrades, hires staff and runs R&D is never rich (Th 30,000-90,000 in hand) and finished R&D only around year 13 or later. Repairs and trade are where the money comes from; cutting trade pay hurt the investing player badly and barely touched the saver.
- So every `RND` cost is 40% lower (all of it now about Th 350,000, was about Th 580,000); weeks and skill levels are unchanged. In the bot runs an investing player now finishes R&D around year 7-10. Income is unchanged; a player who never spends still piles up cash, and can now buy R&D with it.
- Seen in the runs, left as is: a bot that keeps three staff through the smartwatch years (2015-2018) and keeps buying R&D can go broke; a real player sees the cash fall and can let staff go.

## 0.10.0.0: the dial side and the Blender props (PR 9)

**Dial side.** The Bench tab has a third view next to Assembled and Exploded: the movement cased and turned dial up, on its strap (`src/vis/watch.js`, `WATCH_VIS.setWatch`). A Case row picks which of the five cases to try. Each case brings its own dial (one dial per case, cosmetic only: the dial adds nothing to the price beyond what the case already does). The choice is a preview kept in `S.dialCase` inside `esc-save`; the real case is still chosen when you case the piece.

| Case | Size | Dial | Hands | Strap |
|---|---|---|---|---|
| Steel dress | dress, 36 mm | silver sunburst, applied faceted batons | dauphine | black leather |
| Steel sports | big, 41 mm, crown guards | black sunburst, lume plots, triangle at 12 | sword with lume | black rubber |
| Gold dress | dress | cream enamel, Roman numerals fired in | blued Breguet | brown leather |
| Gold, display back | big | cream grained, gold studs, an open heart where a balance swings | leaf | dark brown |
| Platinum | mid, 39 mm | guilloché waves, applied Roman numerals | blued Breguet | navy |

The build decides the rest of the dial (`watchLayout`). Each complication takes one of the 12, 3, 6 or 9 o'clock slots, in this order: the tourbillon aperture, the moon, the perpetual calendar's day / date / month, the chronograph's 30-minute counter and small seconds, the power reserve, the annual calendar's day and month windows, then the date window (at 4:30 if the four slots are full). The hour marker under a slot is left out. Chronographs get pushers at 2 and 4, a split-seconds gets a button at 10, and a repeater gets a slide on the left flank.

The hands show the real local time. The seconds hand steps at the movement's beat rate (8 steps a second at 28,800 bph), and stops if the watch is let down. The date, day, month and moon show today. The chronograph runs. The split hand stops for a lap now and then and catches up. A double tap on the dial side zooms in on the dial and back. Photo mode shoots it like any other view.

**The props.** Each one is a Python script in `tools/blender/` that drives Blender headless (`pip install bpy`) and packs its output into `models/` with `tools/pack-model.py`; `python3 tools/blender/all.py` remakes them all. No model is edited by hand. Materials are named by role (`metal`, `polish`, `crystal`, `applied`, `lume`, `cage`, and the room's own names) and the game swaps in its own tier material for each, so one case model serves steel, gold and platinum.

- `case-dress.glb`, `case-mid.glb`, `case-big.glb`: case middle with lugs, bezel, back, flange, crystal, and a fluted crown.
- `dial-silver.glb`, `dial-black.glb`, `dial-open.glb`, `dial-guilloche.glb`: the applied hour markers, one node per hour (`h0` to `h11`) so the game can leave out the ones under a sub-dial. The enamel dial has nothing applied.
- `tourbillon-cage.glb`: a lower carriage, three pillars, an upper bridge of lyre-shaped arms and a jewel. It replaces the coded cage in the movement and fills the tourbillon aperture on the dial.
- The timing machine, the cleaning machine and the display window in the workshop (`src/vis/room.js`).

Lite never downloads a model. It draws everything in code from the same numbers (`CASE_GEO` matches the case script): turned case profiles, extruded lugs and straps, coded markers (guilloché gets batons), and the printed dial (a 512 px canvas; 1024 on Full and Ultra, where the guilloché also gets a normal map). On Full and Ultra each coded stand-in hides when its model lands.

## 0.9.0.0: help, the tour, cards and photo mode (PR 8)

- **First screen:** the intro offers **Start at the repair bench** (a Repair bench career, with the tour) or **Just look around** (the Sandbox, as before).
- **The tour** (`src/app/help.js`, `TUT`): seven coach cards over the bottom of the 3D view, so they never cover the panel; a brass ring marks what to tap. A customer's watch onto the timegrapher, reading the trace, choosing a fix, Close week, then the result: paid, or "not that one", which loops back to try another fix. Then the Build tab and the Settings cog. Steps move on by themselves when you do the thing (`tutKick` runs after every `save()`); a step on another tab offers **Show me**. **Skip tour** any time; Settings → Help → Take the tour replays it in any career. It starts on every new Repair bench career (not Skip ahead). The backup reminder and the camera button wait while it runs. Saved in the career: `tut` (done), `tutStep`, `tutRep` (the watch it follows).
- **Help** (Settings → Help and glossary): 27 short entries in three groups (Timegrapher, Movement, Business) in `GLOSS`. **Tap to explain:** the timegrapher readouts, the Build capsule's totals and the Test tab's Position, Temperature, Wind and Lift angle labels (dotted underline) open their entry.
- **Certificates and trophies** (`src/app/cards.js`): each Chronometer or Observatory pass is logged when it comes back (`S.career.certsLog`, last 40) and shown on the Career tab's Certificates card; the trial sheet has a Certificate button after a pass. A certificate is a cream bulletin with a serial (`BCH 2008/001`, `KPO …`), the piece, its four key numbers, every check against its limit, a signature and the stamp. Each reached goal has a **Trophy** card: felt and brass, an escape-wheel medal, the goal, when, and the piece or number behind it. Both are 1080 × 1350 pictures to Save or Share. Passes from before 0.9 weren't logged.
- **Photo mode** (`src/app/photo.js`, `src/vis/photo.js`): the camera button at the bottom right of the 3D view. The view fills the screen (drag, pinch and the loupe still work), with three backdrops (Workshop, Black velvet, White studio) and a caption strip (piece name with its calibre, certificate, beat and jewels). **Save photo** renders a sharp PNG at 2-4× the screen; **Share** where the phone can share files. Leaving puts the camera and view back exactly. Auto-adjust doesn't lower the tier while photo mode is open. Choices in `S.photo`.
- **One share path** (`src/app/share.js`, `shareCanvas`): the phone's share sheet when asked and it can take files, else a download. Used by photos and cards.
- **Bench tab:** a This week card (repairs waiting, your piece, stock, buttons to each tab and Close week) replaces the old placeholder.
- **Contrast and layout pass** (both themes, measured): a phone on its side gets a side-by-side layout (movement left, tab right); the HUD line and the movement tag stand on a shadow over the gilt plate; toasts lift above the update and backup bars; 44 px tap targets for folded card headers and small steps; darker good / warn / crit text in the light theme and a lighter red on dark-theme delta chips; locked positions, owned upgrades and disabled buttons are no longer faded by opacity.
- Saved inside `esc-save` (no new keys): `S.career.tut`, `tutStep`, `tutRep`, `certsLog`; `S.photo`.

## 0.8.0.0: R&D, in-house parts and your own calibre (PR 7)

- **R&D** (Career tab, the R&D card): 17 projects in `RND` (`src/app/state.js`). Pay the cost up front; the project is ready at the Close week its weeks run out, and it teaches you (skill XP). One runs at a time; the clean room or a master watchmaker on the staff gives a second R&D bench. Each project can need a skill level, a Shop upgrade or another project first, and the card says which. Stop a project and the money is gone.
  - **Complications:** power reserve (Th 1,500, 4 weeks, a good first project), moonphase, chronograph (Th 9,500, 12 weeks, Complications 3), annual calendar, split-seconds (after the chronograph), perpetual calendar (after the annual), tourbillon, minute repeater (Th 66,000, 36 weeks).
  - **Movement parts:** free-sprung balance, silicon hairspring, co-axial and detent escapements.
  - The complications skill a project needs is below the complication's complexity on purpose: you can build one before you have mastered it, with extra beat error and returns until you train up (the "beyond your skill" stress line).
- **In-house parts** (`PARTS.house`, a new list slot; Build tab, In-house parts row): hairsprings (needs the clean room), balances (lathe), escapements and plates & bridges (CNC). Each takes 50-60% off that part's cost and adds prestige (collectors pay for "in-house"), but costs 2-4 bench hours a piece. Finishing the project switches it on in your build.
- **Your own calibre** (after in-house plates, with the CNC; Th 36,000 and 24 weeks, Th 15,000 and 14 weeks for each one after, up to four): name it, and the core of the build in the Build tab (barrel to winding) is frozen as your calibre. Pick it in the Calibre row at the top of the Build tab: its core goes in at once, and a piece built on it takes 20% fewer hours, its parts cost 20% less and collectors count 6 more prestige (`K.calibre`). Complications, finishes and in-house parts stay free; changing a core part takes the build off the calibre. Pieces are named after it ("No. 12 · Haldis 1 calibre, hand-wound, chronograph"). The goal "Your own calibre" is reached when the first one is ready. In the Sandbox, "Save this core as a calibre" is free and instant.
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

- None known. Share and the Full tier's frame rate have not yet been tried on a real phone.

