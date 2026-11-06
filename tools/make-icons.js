#!/usr/bin/env node
/* Escapement: render the PWA icons into icons/ (192, 512, 512 maskable, 180 apple-touch).
 * Needs Playwright (npm i -g playwright; NODE_PATH=$(npm root -g) node tools/make-icons.js). Output is committed; re-run only to change the mark.
 * The mark: a brass Swiss-lever escape wheel (15 club teeth, five crossings) on dark felt (#c9a45c on #121815). Placeholder art. */
"use strict";
const { chromium } = require("playwright"), fs = require("fs"), path = require("path");
const OUT = path.join(__dirname, "..", "icons");
const BRASS = "#c9a45c", FELT = "#121815";
/* 100x100 artboard. s = mark scale about the centre (the maskable icon keeps the mark inside the inner 80% safe zone) */
function wheel() {
  const N = 15, R = 43, root = 32, step = 2 * Math.PI / N, pts = [];
  const P = (r, a) => [50 + r * Math.cos(a - Math.PI / 2), 50 + r * Math.sin(a - Math.PI / 2)];
  const f = q => q[0].toFixed(2) + " " + q[1].toFixed(2);
  /* each tooth leans forward: the locking face runs from the root out to the tip, a short club (impulse) face across the
     tip, and the back of the tooth runs down to the root, also leaning forward; then the rim between teeth */
  for (let i = 0; i < N; i++) { const a0 = i * step; pts.push(P(root, a0), P(R, a0 + step * .34), P(R - 3, a0 + step * .54), P(root, a0 + step * .56), P(root, a0 + step * .78)); }
  let d = "M" + pts.map(f).join("L") + "Z";
  /* five windows between the crossings: spokes keep the same width at hub and rim */
  const ri = 24, rh = 10, sw = 3.2;
  for (let i = 0; i < 5; i++) {
    const a = i * 2 * Math.PI / 5, b = a + 2 * Math.PI / 5;
    const ao = a + sw / ri, bo = b - sw / ri, ah = a + sw / rh, bh = b - sw / rh;
    d += `M${f(P(rh, ah))}L${f(P(ri, ao))}A${ri} ${ri} 0 0 1 ${f(P(ri, bo))}L${f(P(rh, bh))}A${rh} ${rh} 0 0 0 ${f(P(rh, ah))}Z`;
  }
  return `<path d="${d}" fill="${BRASS}" fill-rule="evenodd"/><circle cx="50" cy="50" r="4" fill="${FELT}"/>`;
}
function svg(s) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><rect width="100" height="100" fill="${FELT}"/>
<g transform="translate(50 50) scale(${s}) translate(-50 -50)">${wheel()}</g></svg>`;
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(), jobs = [["icon-192.png", 192, 1.04], ["icon-512.png", 512, 1.04], ["icon-512-maskable.png", 512, 0.78], ["apple-touch-icon.png", 180, 0.94]];
  for (const [f, n, s] of jobs) {
    const p = await b.newPage({ viewport: { width: n, height: n }, deviceScaleFactor: 1 });
    await p.setContent(`<body style="margin:0;background:${FELT}">${svg(s)}</body>`);
    await p.screenshot({ path: path.join(OUT, f), clip: { x: 0, y: 0, width: n, height: n } }); await p.close(); console.log("wrote icons/" + f);
  }
  await b.close();
})();
