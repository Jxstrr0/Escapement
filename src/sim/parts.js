<script>
/* ===================== Escapement: watch sim core (WATCH_SIM) =====================
   The physics and economy maths. Never touches the DOM or three.js, and runs in plain node: cut this <script> block out of
   the built index.html (search for "Escapement: watch sim core") and require it; it ends with module.exports = WATCH_SIM.
   One IIFE spread over sim/parts.js, movement.js, combos.js, trial.js and market.js (in that order); the export object is
   at the end of market.js.

   This file: the parts tables. PARTS is an object of slots, each slot an array of options with id, name, cost, hours,
   prestige, unlock ("start" | "shop" | "rnd:<id>") and the stats that slot uses. DEFAULT_CFG is a plain manual 28,800 bph
   three-hand movement. Filled in by PR 1 (docs/ESCAPEMENT-PLAN.md section 4a). */
const WATCH_SIM=(function(){
"use strict";
const PARTS={};
const DEFAULT_CFG={bph:28800};
