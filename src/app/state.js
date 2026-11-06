<script>
/* ===================== Escapement: app state =====================
   The app script is one top-level script spread over app/state.js … app/help.js (in manifest order); boot() runs once the
   whole block has loaded (app/boot.js schedules it through __ldGo).
   This file: VERSION, the career tables (filled in by later PRs, named here so every PR uses the same names), the S state
   object, save / load / save slots, theme, graphics tier, and the small UI helpers every tab uses ($, toast, the sheet).
   localStorage keys (every access wrapped in try/catch): "esc-save" (the current game, settings included) and
   "esc-slot1" .. "esc-slot3" (the save slots). A new key must also go into buMake / buWrite in app/savecode.js;
   stop and ask before adding one. */
const VERSION="0.1.0.1";
const SIM=WATCH_SIM;
const $=id=>document.getElementById(id);

/* ---- career tables (plan sections 6-10). Empty until the PR that fills them; keep these names. ---- */
const SKILLS={};       // assembly, regulating, poising, finishing, complications (PR 3)
const SKILL_XP=[];     // XP needed per skill level (PR 3)
const TOOLS={};        // timing-basic, timing-six, timing-lab … (PR 3)
const UPGRADES={};     // timing machines, cleaning machine, lathe, mill, CNC … (PR 5)
const STAFF={};        // watchmakers with skill profiles and salaries (PR 5)
const FAULTS={};       // repair faults: magnetized, dry, broken mainspring … (PR 5)
const CASES={};        // the case and dial catalogue, with thickness limits (PR 5)
const COMMISSION_TEMPLATES=[];   // (PR 5)
const REP_TRACKS={},REP_TIERS=[],RIVALS=[],GOALS={};   // (PR 6)
const RND={};          // R&D projects (PR 7)

/* ---- state ---- */
const START_YEAR=2000,END_YEAR=2030;
function freshState(){return{sv:1,seen:false,theme:"dark",gfx:null,gfxAuto:true,reduce:null,sound:true,tab:"bench",
  cfg:Object.assign({},SIM.DEFAULT_CFG),career:null};}
let S=freshState();

const buObjS=o=>!!o&&typeof o==="object"&&!Array.isArray(o);
function save(){try{localStorage.setItem("esc-save",JSON.stringify(S));}catch(e){}}
function snapshot(){return JSON.parse(JSON.stringify(S));}
/* load a save object into S. false (and S untouched) if it isn't one of ours */
function hydrate(o){if(!buObjS(o)||!buObjS(o.cfg))return false;
  const n=freshState();Object.assign(n,o);n.cfg=Object.assign({},SIM.DEFAULT_CFG,o.cfg);S=n;return true;}
function loadSaved(){try{const j=localStorage.getItem("esc-save");if(j&&hydrate(JSON.parse(j)))return true;}catch(e){}S=freshState();return false;}
const SLOTS=3,slotKey=i=>"esc-slot"+i;
/* a restored or loaded game: take it, store it, redraw everything */
function applyLoaded(o,msg){if(!hydrate(o)){toast("That save didn't read right.");return;}save();applyAll();showTab(S.tab||"bench");toast(msg);}

/* ---- settings that change the page ---- */
const mqLight=window.matchMedia?matchMedia("(prefers-color-scheme: light)"):null;
const mqReduce=window.matchMedia?matchMedia("(prefers-reduced-motion: reduce)"):null;
function applyTheme(){const t=S.theme||"dark",eff=t==="auto"?(mqLight&&mqLight.matches?"light":"dark"):t;
  document.documentElement.setAttribute("data-theme",eff);
  const m=document.querySelector("meta[name=theme-color]");if(m)m.content=eff==="light"?"#f3efe6":"#121815";}
function reduced(){return S.reduce==null?!!(mqReduce&&mqReduce.matches):!!S.reduce;}
function applyReduce(){document.documentElement.classList.toggle("reduce",reduced());}
const isPhone=()=>/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
function gfxTier(){return S.gfx||(isPhone()?"lite":"full");}
function applyGfx(){const q=gfxTier();if(window.WATCH_VIS)WATCH_VIS.setQuality(q);document.documentElement.dataset.gfx=q;}
function applyAll(){applyTheme();applyReduce();applyGfx();hud();}
if(mqLight&&mqLight.addEventListener)mqLight.addEventListener("change",()=>{if(S.theme==="auto")applyTheme();});
if(mqReduce&&mqReduce.addEventListener)mqReduce.addEventListener("change",applyReduce);

/* ---- formatting ---- */
const fmt$=n=>(n<0?"−":"")+"Th "+Math.round(Math.abs(n)).toLocaleString("en-GB");   // Velmark thaler (100 pfennig); prices sized like Swiss francs
const fmtN=(n,d)=>Number(n).toFixed(d||0);

/* ---- the header over the 3D view ---- */
function hud(){const c=S.career;
  $("weekLbl").textContent=c?`The Haldis · ${c.year||START_YEAR} · week ${c.week||1}`:"The Haldis · "+START_YEAR;
  $("cashLbl").textContent=c?fmt$(c.cash||0):"";$("repLbl").textContent="";}

/* ---- toast ---- */
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("on"),2600);}

/* ---- the bottom sheet (Settings, Back up, Restore …) ---- */
let sheetBack=null;
function openSheet(title,html){sheetBack=document.activeElement;$("sheetTitle").textContent=title;$("sheetBody").innerHTML=html;
  $("sheet").classList.add("on");$("scrim").classList.add("on");$("sheetBody").scrollTop=0;$("sheetClose").focus({preventScroll:true});}
function closeSheet(){$("sheet").classList.remove("on");$("scrim").classList.remove("on");if(sheetBack&&sheetBack.focus)sheetBack.focus({preventScroll:true});sheetBack=null;}
const sheetOn=()=>$("sheet").classList.contains("on");
