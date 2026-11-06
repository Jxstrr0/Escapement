#!/usr/bin/env node
/* Escapement: run the watch sim in plain node and print a table (plan section 4d).
 *
 *   node tools/sim-test.js            DEFAULT_CFG and every TEST_BUILDS entry, one block each
 *   node tools/sim-test.js --brief    one line per build (for before/after numbers in commit messages)
 *   node tools/sim-test.js --json     the raw result objects
 *
 * It cuts the WATCH_SIM <script> block out of the built index.html (run `node build.js` first), so it tests exactly what
 * ships. Skills default to level 1 and the basic timing machine, as on day one of a career. Zero dependencies. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..");
function loadSim() {
  const h = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), i = h.indexOf("Escapement: watch sim core");
  if (i < 0) throw new Error("WATCH_SIM block not found in index.html; run node build.js");
  const src = h.slice(h.lastIndexOf("<script>", i) + 8, h.indexOf("</script>", i));
  const mod = { exports: {} }; vm.runInNewContext(src, { module: mod, console }, { filename: "watch-sim.js" });
  return mod.exports;
}
const SIM = loadSim();

/* ~10 named builds that each poke at one part of the model. Keep them stable: they are the before/after yardstick. */
const TEST_BUILDS = {
  "default (plain manual)": {},
  "cheap: small barrel, flat steel, no shock": { barrel: "single-small", jewels: "17", balance: "smooth-small", hairspring: "steel-flat", shock: "none" },
  "heavy balance, small barrel": { barrel: "single-small", balance: "smooth-large" },
  "36k on a small barrel": { barrel: "single-small", bph: "36000" },
  "36k done right": { barrel: "double", train: "polished-pivots", bph: "36000", hairspring: "alloy-overcoil", regulator: "micro-adjust", shock: "premium" },
  "18k twin barrel": { barrel: "double", bph: "18000", hairspring: "alloy-flat" },
  "chronometer candidate": { barrel: "double", train: "polished-pivots", jewels: "25", escapement: "hi-eff-lever", balance: "screw", hairspring: "alloy-overcoil", regulator: "micro-adjust", shock: "premium", finish: ["perlage", "anglage"] },
  "automatic date (trade calibre)": { winding: "automatic", complications: ["date"] },
  "steel chrono, no shock": { barrel: "high-torque", hairspring: "steel-flat", shock: "none", winding: "automatic", complications: ["chrono", "date"] },
  "detent, basic shock": { escapement: "detent", hairspring: "alloy-overcoil", shock: "basic" },
  "silicon free-sprung": { balance: "free-sprung", hairspring: "silicon", regulator: "free-sprung", shock: "premium", escapement: "coaxial-style" },
  "grand complication": { barrel: "high-torque", train: "fine-pitch", jewels: "31", balance: "free-sprung", hairspring: "alloy-overcoil", shock: "premium", complications: ["tourbillon", "perp-cal", "moonphase"], finish: ["anglage", "black-polish", "perlage"] }
};
const f1 = x => (x >= 0 ? "+" : "") + x.toFixed(1);
const args = process.argv.slice(2), brief = args.includes("--brief"), json = args.includes("--json");
const out = {};
for (const [name, cfg] of Object.entries(TEST_BUILDS)) {
  const r = SIM.simulate(Object.assign({}, SIM.DEFAULT_CFG, cfg));
  out[name] = r;
  if (json) continue;
  if (brief) {
    console.log(`${name.padEnd(38)} amp ${Math.round(r.amp0)}/${Math.round(r.amp24)}°  res ${Math.round(r.reserveH)}h  mean ${f1(r.rateMean24)}  spread ${r.posSpread24.toFixed(1)}  temp ${r.tempSpread.toFixed(1)}  beat ${r.beatErr.toFixed(2)}ms  ${r.thickness.toFixed(1)}mm  Th ${r.cost}  ${Math.round(r.hours)}h  P${r.prestige}`);
    continue;
  }
  console.log(`\n== ${name}`);
  console.log(`   amplitude ${Math.round(r.amp0)}° at full wind, ${Math.round(r.amp24)}° at 24 h, reserve ${Math.round(r.reserveH)} h`);
  console.log("   rate s/d   " + SIM.POSITIONS.map(p => p.padStart(6)).join("") + "\n     0 h    " + SIM.POSITIONS.map(p => f1(r.rates[p].t0).padStart(6)).join("") + "\n    24 h    " + SIM.POSITIONS.map(p => f1(r.rates[p].t24).padStart(6)).join(""));
  console.log(`   mean at 24 h ${f1(r.rateMean24)} s/d, position spread ${r.posSpread24.toFixed(1)} s/d, 8→38 °C ${r.tempSpread.toFixed(1)} s/d, beat error ${r.beatErr.toFixed(2)} ms`);
  console.log(`   shock ${r.shock.toFixed(2)}, magnetism resistance ${r.magnetResist.toFixed(2)}, return risk ${(r.returnRisk * 100).toFixed(0)}%/yr, service every ${r.serviceYears.toFixed(1)} y`);
  console.log(`   ${r.thickness.toFixed(1)} mm, ${r.parts} parts, Th ${r.cost} parts cost, ${Math.round(r.hours)} bench hours, prestige ${r.prestige}`);
  for (const s of r.stress) console.log(`   [${s.sev}] ${s.text}`);
}
if (json) console.log(JSON.stringify(out, (k, v) => (k === "m" ? undefined : v), 2));
