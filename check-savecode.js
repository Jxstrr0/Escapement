#!/usr/bin/env node
/* Escapement: checks for the Back up / Restore save codes (src/app/savecode.js). Same shape as PEW's check-savecode.js.
 *
 *   node check-savecode.js        run every check, print one line each, exit 1 if any fail
 *
 * It loads src/app/savecode.js on its own with a pretend localStorage and small stand-ins for the game functions it calls
 * (snapshot, hydrate, ...), so it runs in plain node with no browser. hydrate is a copy of the real one's rule (false without
 * a cfg object). It also makes sure index.html was rebuilt with the current savecode.js.
 * Keys checked: esc-save, esc-slot1 .. esc-slot3. A new localStorage key goes into KEYS here as well as buMake / buWrite.
 * Zero dependencies (node >= 16).
 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const ROOT = __dirname, SRC = path.join(ROOT, "src", "app", "savecode.js");

/* ---- a pretend browser: localStorage in a Map, plus the game bits savecode.js calls ---- */
function fakeStorage() {
  const m = new Map();
  return {
    quota: Infinity,   // like a real browser's storage limit: a setItem that would go over it throws
    used: () => [...m].reduce((n, [k, v]) => n + k.length + v.length, 0),
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem(k, v) { v = String(v); const was = m.has(k) ? k.length + m.get(k).length : 0;
      if (this.used() - was + k.length + v.length > this.quota) throw new Error("QuotaExceededError"); m.set(k, v); },
    removeItem: k => { m.delete(k); },
    clear: () => m.clear(),
    dump: () => Object.fromEntries([...m].sort())
  };
}
function load() {
  const code = fs.readFileSync(SRC, "utf8");
  const ctx = {
    localStorage: fakeStorage(), TextEncoder, TextDecoder, Uint8Array,
    SLOTS: 3, slotKey: i => "esc-slot" + i, VERSION: "test", START_YEAR: 2000,
    S: null, live: null,
    snapshot() { return JSON.parse(JSON.stringify(ctx.live)); },
    /* like the real hydrate: false without a cfg object, and it trips over a career whose log isn't a list */
    hydrate(o) { if (!o || !o.cfg || typeof o.cfg !== "object" || Array.isArray(o.cfg)) return false; ctx.S = Object.assign({}, o);
      const c = Object.assign({ log: [] }, o.career || {}); if (c.log.length > 999) c.log = []; return true; },
    fmt$: n => String(Math.round(n))
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { filename: "savecode.js" });
  return ctx;
}

/* ---- realistic saves ---- */
function game(over) {
  return Object.assign({
    sv: 1, seen: true, theme: "light", gfx: "lite", gfxAuto: true, reduce: null, sound: true, tab: "test",
    name: "Haldis 28 · Vallée café ☕",
    cfg: { bph: 28800, barrel: "single-large", escapement: "swiss-lever", hairspring: "steel-overcoil", complications: ["date"], finish: ["perlage"] },
    career: { cv: 1, year: 2004, week: 27, cash: 48250, rep: { collectors: 12, trade: 40, press: 3 }, owned: { "timing-six": true },
      skills: { assembly: 3, regulating: 2 }, staff: {}, rnd: {}, goals: {},
      log: [{ w: 26, t: "Chronometer certificate: piece #14", k: "good" }],
      stock: Array.from({ length: 30 }, (_, i) => ({ id: i, rate: [1.2, -0.8, 3.1, 2.4, -1.1, 0.4], amp: 284 - i })) }
  }, over || {});
}
const seed = st => {
  st.clear();
  st.setItem("esc-save", JSON.stringify(game()));
  st.setItem("esc-slot1", JSON.stringify(Object.assign(game({ career: null }), { savedAt: 1760000000000 })));
  st.setItem("esc-slot3", JSON.stringify(Object.assign(game({ career: Object.assign(game().career, { week: 3, cash: 9000 }) }), { savedAt: 1760100000000 })));
};
const plain = o => JSON.parse(JSON.stringify(o));   // objects made inside the vm have their own Object/Array, so copy them out before comparing
const msg = (ctx, text) => { try { ctx.buRead(text); } catch (e) { return e.bu || "crash:" + e.message; } return "ok"; };
const KEYS = ["esc-save", "esc-slot1", "esc-slot2", "esc-slot3"];

/* ---- the checks ---- */
const checks = [];
const check = (name, fn) => checks.push([name, fn]);

check("index.html carries the current savecode.js (run `node build.js` if not)", () => {
  assert(fs.readFileSync(path.join(ROOT, "index.html"), "utf8").includes(fs.readFileSync(SRC, "utf8")));
});
check("the save keys in savecode.js are the esc- keys this check knows", () => {
  const code = fs.readFileSync(SRC, "utf8");
  assert(/BU_KEY="esc-save"/.test(code), "current game key");
  const state = fs.readFileSync(path.join(ROOT, "src", "app", "state.js"), "utf8");
  assert(/slotKey=i=>"esc-slot"\+i/.test(state), "slot keys in app/state.js");
  const keys = new Set([...fs.readFileSync(path.join(ROOT, "index.html"), "utf8").matchAll(/localStorage\.(?:get|set|remove)Item\("([^"]+)"/g)].map(m => m[1]));
  for (const k of keys) assert(KEYS.includes(k), "index.html uses localStorage key " + k + ", which backups don't carry (add it to buMake / buWrite and KEYS)");
});
check("round trip: everything comes back on a fresh browser", () => {
  const a = load(); seed(a.localStorage); a.live = game();
  const code = a.buCode(), before = a.localStorage.dump();
  assert(code.startsWith("ESC1:") && /^ESC1:[A-Za-z0-9_-]+$/.test(code), "only base64url characters after ESC1:");
  const b = load();   // another phone: nothing saved yet
  const r = b.buRead(code);
  assert.strictEqual(r.kind, "full");
  assert.deepStrictEqual(plain(r.data.save), game());
  assert.strictEqual(r.data.slots.length, 3);
  assert.strictEqual(r.data.slots[1], null, "empty slot 2 stays empty");
  assert(b.buWrite(r.data));
  assert.deepStrictEqual(Object.keys(b.localStorage.dump()).sort(), KEYS.filter(k => k !== "esc-slot2").sort());
  for (const k of ["esc-slot1", "esc-slot3"]) assert.deepStrictEqual(JSON.parse(b.localStorage.getItem(k)), JSON.parse(before[k]), k);
  assert.deepStrictEqual(JSON.parse(b.localStorage.getItem("esc-save")), game());
});
check("an empty save (brand-new player, no career yet) round trips, and restoring it clears the slots", () => {
  const a = load(); a.live = { sv: 1, seen: false, theme: "dark", gfx: null, gfxAuto: true, reduce: null, sound: true, tab: "bench", cfg: { bph: 28800 }, career: null };
  const code = a.buCode(), r = a.buRead(code).data;
  assert.deepStrictEqual(plain(r.save), a.live);
  assert.deepStrictEqual(plain(r.slots), [null, null, null]);
  const b = load(); seed(b.localStorage);
  assert(b.buWrite(r));
  assert.deepStrictEqual(Object.keys(b.localStorage.dump()), ["esc-save"]);
});
check("code is much shorter than the save it holds", () => {
  const a = load(); seed(a.localStorage); a.live = game();
  const raw = JSON.stringify(a.buMake()).length, code = a.buCode().length;
  assert(code < raw * 0.75, `code ${code} vs JSON ${raw}`);
});
check("spaces, line breaks and text around the code are fine", () => {
  const a = load(); seed(a.localStorage); a.live = game();
  const code = a.buCode(), mid = code.length >> 1;
  const messy = "here's my save:\n  " + code.slice(0, mid) + "\n ​" + code.slice(mid, mid + 40) + "  " + code.slice(mid + 40) + '" thanks!';
  assert.strictEqual(a.buRead(messy).kind, "full");
});
check("a damaged code is rejected (one character changed)", () => {
  const a = load(); seed(a.localStorage); a.live = game();
  const code = a.buCode();
  for (const at of [6, code.length >> 1, code.length - 3]) {
    const c = code[at] === "A" ? "B" : "A";
    assert.strictEqual(msg(a, code.slice(0, at) + c + code.slice(at + 1)), "damaged", "changed at " + at);
  }
});
check("a cut-off code is rejected", () => {
  const a = load(); seed(a.localStorage); a.live = game();
  const code = a.buCode();
  for (const n of [1, 6, 7, 50, code.length >> 1, code.length - 6]) assert.strictEqual(msg(a, code.slice(0, code.length - n)), "damaged", "cut " + n);
  assert.strictEqual(msg(a, code.slice(0, 200) + code.slice(260)), "damaged", "chunk missing from the middle");
  assert.strictEqual(msg(a, "ESC1:"), "damaged");
});
check("a code from another game is rejected (PEW, Garage to Glory)", () => {
  const a = load();
  assert.strictEqual(msg(a, "PEW1:CYQwLiBcIAQBYA6s9ccc5z"), "other");
  assert.strictEqual(msg(a, "GG1:CYQwLiBcIAQBYA6s9ccc5z"), "other");
});
check("a code from a newer version gets its own message", () => {
  const a = load(); a.live = game();
  const body = a.buCode().slice(5);
  assert.strictEqual(msg(a, "ESC2:" + body), "newer");
  assert.strictEqual(msg(a, "ESC12:" + body), "newer");
});
check("empty and junk pastes get a friendly message, never a crash", () => {
  const a = load();
  assert.strictEqual(msg(a, ""), "empty");
  assert.strictEqual(msg(a, "   \n "), "empty");
  assert.strictEqual(msg(a, null), "empty");
  assert.strictEqual(msg(a, "hello there"), "notcode");
  assert.strictEqual(msg(a, "ESC1:!!!!!!!!!!!!"), "damaged");
  assert.strictEqual(msg(a, "ESC0:" + "A".repeat(20)), "notcode");
});
const pack = (a, d) => { const body = a.buZip(new TextEncoder().encode(JSON.stringify(d))); return "ESC1:" + body + a.buSum(body); };
check("a well-formed code with a broken save inside is refused and nothing is written", () => {
  const a = load(); seed(a.localStorage); const before = a.localStorage.dump();
  const bad = [
    { v: 1, save: { career: {} }, slots: [] },                                    // no cfg
    { v: 1, save: game({ cfg: [1, 2] }), slots: [] },                             // cfg not an object
    { v: 1, save: game(), slots: [null, null, null, null] },                      // too many slots
    { v: 1, save: game(), slots: [{ cfg: "plain" }] },                            // slot cfg not an object
    { v: 1, save: game({ career: { cash: "lots" } }), slots: [] },                // cash not a number
    { v: 1, save: game({ career: { year: "2004" } }), slots: [] },                // year not a number
    { v: 1, save: game({ career: { log: { 0: 1 } } }), slots: [] },               // log not a list
    { v: 1, save: game({ career: { rep: 5 } }), slots: [] },                      // rep tracks not an object
    { v: 1, save: game({ career: "started" }), slots: [] },                       // career not an object
    { v: 1, save: game(), slots: "none" },
    { v: 2, save: game(), slots: [] },
    [game()], "just a string", 42, null
  ];
  for (const d of bad) assert.strictEqual(msg(a, pack(a, d)), "bad", JSON.stringify(d).slice(0, 80));
  assert.strictEqual(msg(a, pack(a, { v: 1, save: game(), slots: [] })), "ok", "and the same thing done right passes");
  assert.deepStrictEqual(a.localStorage.dump(), before);
});
check("a write that fails half way (storage full) puts every key back the way it was", () => {
  const a = load(); seed(a.localStorage); a.localStorage.setItem("esc-slot2", '{"cfg":{"bph":18000}}');
  const before = a.localStorage.dump();
  const huge = game({ notes: Array.from({ length: 400 }, (_, i) => ({ name: "piece" + i, cfg: { bph: 21600 + i } })) });
  const r = { v: 1, save: game({ theme: "dark" }), slots: [game(), null, huge] };   // slot 3 won't fit
  a.localStorage.quota = a.localStorage.used() + 2000;
  assert.strictEqual(a.buWrite(r), false);
  assert.deepStrictEqual(a.localStorage.dump(), before);
  a.localStorage.quota = Infinity;
  assert.strictEqual(a.buWrite(r), true);
  assert.deepStrictEqual(JSON.parse(a.localStorage.getItem("esc-slot3")), huge);
});
check("trial load never changes the running game", () => {
  const a = load(); a.live = game(); const running = { cfg: { bph: 36000 } };
  a.S = running;
  a.buRead(a.buCode());
  assert.strictEqual(a.S, running);
});
check("packing survives big, varied saves (LZW dictionary fills up)", () => {
  const a = load();
  let x = 12345; const rnd = () => (x = (x * 1103515245 + 12345) >>> 0) / 4294967296;
  const big = game({ notes: Array.from({ length: 4000 }, (_, i) => ({ name: "p" + i + "_" + rnd().toString(36), rate: rnd() * 20 - 10, note: "é ü ⌚ " + i })) });
  a.live = big;
  const code = a.buCode();
  assert.deepStrictEqual(plain(a.buRead(code).data.save), big);
  const bytes = new TextEncoder().encode("abababababababababab");
  assert.deepStrictEqual(Array.from(a.buUnzip(a.buZip(bytes))), Array.from(bytes), "KwKwK case");
  assert.deepStrictEqual(plain(a.buUnzip(a.buZip(new Uint8Array(0)))), []);
});

let bad = 0;
for (const [name, fn] of checks) {
  try { fn(); console.log("ok   " + name); }
  catch (e) { bad++; console.log("FAIL " + name + "\n     " + String(e && e.message || e).split("\n").join("\n     ")); }
}
console.log(bad ? `\n${bad} of ${checks.length} checks failed` : `\nall ${checks.length} save code checks passed`);
process.exit(bad ? 1 : 0);
