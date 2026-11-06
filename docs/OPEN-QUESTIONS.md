# Open questions (saved 2026-11-06, after 1.0.2.1)

Found by the 1.0.2.1 audit (code review, design check, playthrough, 15-year money runs). Paused by Kelbo: ask these before starting any of them. Each is its own PR once decided.

## Balance (from the money runs)

1. **Piece prices run away.** `pieceValue` (`src/sim/market.js`) multiplies `(1.45 + 0.11 × prestige) × CERT_MULT × case.mult`, so a top piece is Th 150,000 to 600,000 and walk-in buyers (`demand()` / `buyChance`, `src/app/business.js`) buy them weekly. Cash reaches millions by 2012; the design says a Chronometer piece is 5,000 to 15,000 and six figures is an auction lot. Soften the prestige markup, and let six-figure pieces sell only at auction or to top-tier collectors?
2. **Trials ignore skill.** Chronometer passes 100% at skill 1 once the Th 900 alloy spring is bought. Observatory fails only on `maxVar`; `TRIAL.noise` 0.8 (`src/sim/trial.js`) makes it about a coin flip (38 to 53%) that no skill, machine or part improves. Make trial noise shrink with skill and better parts?
3. **Skip ahead 2008 goes broke.** Shop costs about Th 880 a week, close to repair income; both test runs that hired staff closed in year 2. The loan (`loanOffer`, need + 4 weeks of costs) lasts about 4 to 5 weeks. Lower the shop rent or raise the 2008 starting cash, and lend about 16 weeks of costs?
4. **Commission budgets are fixed** (`COMMISSION_TEMPLATES`, Th 2,300 to 31,000) while pieces reach Th 130,000; `deliver()` takes any piece that fits the spec. Warn before delivering a piece worth far more than the budget, or scale budgets?
5. **Kessel Peak becomes unwinnable.** Rivals gain 1.3% a year (`calendar.js`); the player tops out at about 700 to 770 points, so second place from 2005 and third from 2016. Cap rival growth, or let the player's noise fall with skill?
6. **Top reputation is out of reach.** 0.8% weekly decay (`REP_GAIN.decay`) means Legendary (120) and collectors tier 4 were never reached in 20 years. Halve the decay, or set Legendary at 100?
7. Smaller: skills max out in 2 to 4 years, even repairs-only (`SKILL_XP`); 4 staff cost about Th 196,000 a year against Th 150,000 to 200,000 of trade profit; repairs-only is a flat +Th 3,000 a year for 15 years.

## Missing pieces of the game

8. **2030 has no ending.** `END_YEAR=2030` (`src/app/state.js`) is never read. A career summary at 2031 week 1 (pieces, certificates, best trial place, cash) with Keep going?
9. **Climate control does nothing** except unlock the laboratory timing machine. Give it a real effect (steadier trial results), or reword its blurb?
10. **The bench is blocked during a trial.** While a piece is away (up to 6 weeks for the Observatory) `makePiece` refuses. Let the player start the next piece meanwhile?
11. **A trade batch can't be given back** once accepted (commissions can be cancelled, R&D stopped, pieces scrapped). Add "Hand the batch back" with a reputation hit?
12. **Staff have no skill profiles** (the plan's section 8); they are a speed multiplier only. Add them, or change the plan's wording?

## Smaller conveniences (no decision needed, just not done)

- A "What's new" note after an update; haptics on Close week and sales; a toast when offline.
- Name a piece or the workshop (only calibres can be named).
- Fonts are all in px, so the phone's text-size setting doesn't change them (pinch zoom works).
- "See the trial result" repeats in every week report until tapped.
- Docs drift: CLAUDE.md says 12 TEST_BUILDS (13 now) and 50 part options (55); `src/README.md` misses `setRoom`, `roomSpec`, `wsSync`, `sfx`.
