<script>
/* ===================== Escapement: app state =====================
   The app script is one top-level script spread over app/state.js … app/help.js (in manifest order); boot() runs once the
   whole block has loaded (app/boot.js schedules it through __ldGo).
   This file: VERSION, the career tables (filled in by later PRs, named here so every PR uses the same names), the S state
   object, save / load / save slots, theme, graphics tier, and the small UI helpers every tab uses ($, toast, the sheet).
   localStorage keys (every access wrapped in try/catch): "esc-save" (the current game, settings included) and
   "esc-slot1" .. "esc-slot3" (the save slots). A new key must also go into buMake / buWrite in app/savecode.js;
   stop and ask before adding one. */
const VERSION="0.5.0.0";
const SIM=WATCH_SIM;
const $=id=>document.getElementById(id);

/* ---- career tables (plan sections 6-10). Empty until the PR that fills them; keep these names. ---- */
/* the five skills (levels 1-10, from XP). The sim reads the levels: SIM.simulate(cfg, skillLvls(), …) */
const SKILLS={
  assembly:{name:"Assembly",blurb:"Cleaner builds: a closer first rate, less beat error out of the box, fewer bench hours."},
  regulating:{name:"Regulating",blurb:"Surer regulator nudges, and a lower beat error when you adjust the beat."},
  poising:{name:"Poising",blurb:"Each Poise takes out more of the difference between positions."},
  finishing:{name:"Finishing",blurb:"Perlage, stripes and anglage done faster and better (PR 5 prices it)."},
  complications:{name:"Complications",blurb:"Build calendars, chronographs and tourbillons without extra beat error."}};
const SKILL_XP=[0,10,25,45,70,100,140,190,250,320];   // total XP to reach level 1, 2, … 10
/* timing machines: which positions and temperatures you can see while adjusting, and how finely they read the beat
   (timingRes feeds the sim: a better machine lets you set a lower beat error). The best one owned is used. */
const TOOLS={
  "timing-basic":{name:"Basic timing machine",positions:["DU"],temps:false,timingRes:1,unlock:"start",
    blurb:"Reads dial up only, at room temperature."},
  "timing-six":{name:"Six-position timing machine",positions:["DU","DD","PU","PD","PL","PR"],temps:false,timingRes:1.4,unlock:"shop:timing-six",
    blurb:"A rotating head: all six positions."},
  "timing-lab":{name:"Laboratory timing machine",positions:["DU","DD","PU","PD","PL","PR"],temps:true,timingRes:2,unlock:"shop:timing-lab",
    blurb:"Six positions and a climate box: 8, 23 and 38 °C."}};
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
  cfg:Object.assign({},SIM.DEFAULT_CFG),career:null,
  xp:{},piece:null,tg:{pos:"DU",temp:23,wind:0,lift:52}};}   // xp: skill XP outside a career; piece: the movement on the timegrapher (app/test.js); tg: its settings
let S=freshState();

const buObjS=o=>!!o&&typeof o==="object"&&!Array.isArray(o);
function save(){try{localStorage.setItem("esc-save",JSON.stringify(S));}catch(e){return;}buSaved();}   // buSaved: app/savecode.js (asks the browser to keep our storage)
function snapshot(){return JSON.parse(JSON.stringify(S));}
/* load a save object into S. false (and S untouched) if it isn't one of ours */
function hydrate(o){if(!buObjS(o)||!buObjS(o.cfg))return false;
  const n=freshState();Object.assign(n,o);n.cfg=SIM.normCfg(Object.assign({},SIM.DEFAULT_CFG,o.cfg)).cfg;
  const f=freshState();n.tg=Object.assign(f.tg,buObjS(o.tg)?o.tg:{});if(!buObjS(n.xp))n.xp={};if(!buObjS(n.piece))n.piece=null;
  S=n;return true;}
/* skills: XP lives in the career once there is one (PR 5), else in S.xp. skillLvls() is what the sim reads */
const xpBag=()=>S.career?(S.career.xp=buObjS(S.career.xp)?S.career.xp:{}):S.xp;
const lvlOf=xp=>{let l=1;for(let i=1;i<SKILL_XP.length;i++)if((+xp||0)>=SKILL_XP[i])l=i+1;return l;};
function skillLvls(){const b=xpBag(),o={};for(const k in SKILLS)o[k]=lvlOf(b[k]);return o;}
/* add XP; returns the new level when it went up (the caller toasts it) */
function gainXp(k,n){const b=xpBag(),was=lvlOf(b[k]);b[k]=(+b[k]||0)+n;const now=lvlOf(b[k]);return now>was?now:0;}
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
function applyReduce(){document.documentElement.classList.toggle("reduce",reduced());if(window.WATCH_VIS)WATCH_VIS.setMotion(reduced());}
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
