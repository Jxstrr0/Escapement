<script>
/* ===================== Escapement: app state =====================
   The app script is one top-level script spread over app/state.js … app/help.js (in manifest order); boot() runs once the
   whole block has loaded (app/boot.js schedules it through __ldGo).
   This file: VERSION, the career tables (filled in by later PRs, named here so every PR uses the same names), the S state
   object, save / load / save slots, theme, graphics tier, and the small UI helpers every tab uses ($, toast, the sheet).
   localStorage keys (every access wrapped in try/catch): "esc-save" (the current game, settings included) and
   "esc-slot1" .. "esc-slot3" (the save slots). A new key must also go into buMake / buWrite in app/savecode.js;
   stop and ask before adding one. */
const VERSION="0.6.0.0";
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
/* the shop's machines, suppliers and premises. cost once; unlocks "shop:<id>" parts and tools. needs = other upgrades first.
   Effects: rent (replaces the bench rent), staff (more staff places), demand (retail buyers a week, multiplied),
   fix (repair hours by FAULTS class, multiplied), batch (trade hours per movement, multiplied) */
const UPGRADES={
  "timing-six":{name:"Six-position timing machine",cost:1800,blurb:"See all six positions; unlocks the micro-adjust regulator."},
  "jewel-supplier":{name:"Jewel and shock supplier",cost:700,blurb:"An account for 25 and 31 jewels and premium shock settings."},
  "spring-supplier":{name:"Alloy spring supplier",cost:900,blurb:"Self-compensating alloy hairsprings and high-torque mainsprings: the road to a BCH certificate."},
  cleaning:{name:"Cleaning machine",cost:1100,blurb:"Services and water damage take 40% less time.",fix:{service:.6}},
  lathe:{name:"Watchmaker's lathe",cost:2400,blurb:"Polished pivots; re-pivoting takes half the time.",fix:{pivot:.5}},
  polishing:{name:"Polishing bench",cost:1500,blurb:"Black polish for steel parts."},
  mill:{name:"Milling machine",cost:4800,blurb:"Cut your own barrel bridges: twin barrels."},
  shop:{name:"Own shop on the high street",cost:6500,rent:620,staff:2,demand:3,blurb:"Your own door in the valley town: walk-in buyers, room for two staff. Rent Th 620 a week."},
  window:{name:"Display window",cost:1400,needs:["shop"],demand:1.3,blurb:"Pieces in the window: more buyers stop."},
  bench2:{name:"Second bench",cost:2200,needs:["shop"],staff:1,blurb:"Room for one more watchmaker."},
  climate:{name:"Climate control",cost:3200,needs:["shop"],blurb:"A steady workshop. Needed for the laboratory timing machine."},
  "timing-lab":{name:"Laboratory timing machine",cost:9500,needs:["climate","timing-six"],blurb:"Six positions and a climate box at 8, 23 and 38 °C."},
  cnc:{name:"CNC mill",cost:24000,needs:["mill","shop"],batch:.6,blurb:"Fine-pitch trains and high-efficiency levers; trade batches take 40% less time."},
  cleanroom:{name:"Clean room",cost:16000,needs:["shop"],staff:1,blurb:"Dust-free assembly: room for one more watchmaker."}};
/* staff you can hire: the kinds (each candidate gets a name). eff = share of an hour of your work in one of theirs.
   They take repairs and trade work; the pieces you build stay yours. hire = signing fee; leaving pays one week */
const STAFF={
  apprentice:{name:"Apprentice",wage:260,eff:.6,hire:0,blurb:"Keen, slow, careful with services."},
  watchmaker:{name:"Watchmaker",wage:620,eff:1,hire:300,blurb:"Trained in the valley school. Works as fast as you."},
  master:{name:"Master watchmaker",wage:1050,eff:1.35,hire:900,needs:"shop",blurb:"Thirty years at the bench. Faster than you."}};
const STAFF_NAMES=["Anneli Brask","Joris Halm","Mette Ostrander","Tobin Vael","Ilse Karrow","Pieter Lund","Saskia Dorn","Emil Fasch","Runa Velt","Kasimir Ott","Lotte Hesse","Bram Iversen"];
/* repair faults. On the timegrapher each one shows a pattern: rate (s/d added), amp (amplitude multiplied), beat (ms added),
   jit (extra scatter), stop (no beats at all). The complaint is what the customer says (shared between faults on
   purpose: the timegrapher tells them apart). fix: name, hours, parts (Th); pay is what the customer pays when it's right */
const FAULTS={
  magnet:{name:"Magnetised",cls:"quick",rate:180,amp:1,beat:.3,jit:.05,complaint:"It gains minutes every day.",
    fix:"Demagnetise",hours:.5,parts:0,pay:90,blurb:"A phone or a handbag clasp: the hairspring coils stick together and it races."},
  dry:{name:"Dry, needs a service",cls:"service",rate:-25,amp:.66,beat:.6,jit:.15,complaint:"It loses time and stops in the night.",
    fix:"Clean and oil (a service)",hours:6,parts:25,pay:320,blurb:"Old oil gone to varnish: the amplitude falls away."},
  mainspring:{name:"Broken mainspring",cls:"quick",stop:true,complaint:"It stopped and won't start.",
    fix:"Fit a new mainspring",hours:2,parts:45,pay:180,blurb:"Wind it and nothing happens: no trace at all."},
  hairspring:{name:"Bent hairspring",cls:"fine",rate:70,amp:.95,beat:5.5,jit:.1,complaint:"It gains time and the tick limps.",
    fix:"True the hairspring",hours:3,parts:0,pay:260,blurb:"Dropped on a hard floor: a coil touches, the beat goes lopsided."},
  pivot:{name:"Worn pivots",cls:"pivot",rate:-12,amp:.8,beat:1.6,jit:.35,complaint:"It loses time and runs ragged.",
    fix:"Re-pivot the third wheel",hours:5,parts:30,pay:380,blurb:"Decades without oil: the trace scatters and the amplitude sags."},
  water:{name:"Water inside",cls:"service",rate:-45,amp:.6,beat:1.2,jit:.6,complaint:"It stopped after a swim, then ran again, badly.",
    fix:"Strip, dry and replace the rusted parts",hours:9,parts:85,pay:460,blurb:"Rust on the steel parts: a wild trace and a weak swing."}};
const REPAIR_WATCHES=["a 1960s Arlen dress watch","a Kessler diver from the eighties","a gold Tavan pocket watch","a Brenner field watch","a Halvard chronograph","an Ostmark automatic","a Velmark railway watch","a plain Sorel manual","a lady's Lindqvist cocktail watch","a Marten pilot's watch"];
const CUSTOMERS=["Mrs Ostergaard","Mr Vael","Dr Henning","Ilka Sorensen","Father Amsel","Mr Brandt","Klara Weiss","the Haldis station master","Mrs Tamm","Oskar Rehn","Judge Falk","Ms Ekdahl","Lars Kessel","Mrs Vinter","Dr Abelard"];
/* cases (with dial). thick = mm the case adds to the movement; maxMove = the thickest movement it takes; mult = what the
   case does to the value; metal for commission specs; needs = an upgrade before you can buy it */
const CASES={
  "steel-dress":{name:"Steel dress case, silver dial",cost:160,thick:2.8,maxMove:4.6,mult:1,metal:"steel"},
  "steel-sport":{name:"Steel sports case, black dial",cost:220,thick:5.2,maxMove:7.5,mult:1,metal:"steel"},
  "gold-dress":{name:"Gold dress case, cream enamel dial",cost:1600,thick:2.6,maxMove:4.4,mult:1.2,metal:"gold"},
  "gold-big":{name:"Gold case, display back",cost:2100,thick:4.6,maxMove:8.5,mult:1.2,metal:"gold"},
  platinum:{name:"Platinum case, guilloché dial",cost:3800,thick:3.6,maxMove:7,mult:1.4,metal:"platinum",needs:"shop"}};
/* commissions. spec: cert (lowest grade), maxThick (whole watch, mm), comps (must have), finishN (at least that many
   finishes), winding, bph, reserveH (at least), shock (at least basic), metal. budget [lo, hi]; weeks to deliver;
   tier: 1 from the start, 2 after 20 weeks, 3 after 60. seg is who asks (PR 6 adds reputation by segment) */
const COMMISSION_TEMPLATES=[
  {id:"retire",title:"A retirement watch",seg:"private",tier:1,spec:{cert:"bench",maxThick:8.5},budget:[2300,3100],weeks:6,
    text:"Plain, slim and honest. Something to wear on Sundays."},
  {id:"anniv",title:"An anniversary piece",seg:"private",tier:1,spec:{cert:"bench",finishN:2},budget:[3400,4400],weeks:8,
    text:"Forty years married. It should look beautiful through the back."},
  {id:"jeweller",title:"A date automatic for a jeweller's window",seg:"trade",tier:1,spec:{cert:"bench",comps:["date"],winding:"automatic"},budget:[2700,3400],weeks:6,
    text:"Our customers want a date and no winding."},
  {id:"field",title:"A field watch for a mountain guide",seg:"private",tier:1,spec:{cert:"bench",shock:"basic",maxThick:11},budget:[2400,3000],weeks:5,
    text:"It will be knocked about on the Kessel ridge. It must keep going."},
  {id:"pilot",title:"A pilot's GMT",seg:"private",tier:2,spec:{cert:"bench",comps:["gmt"],shock:"basic"},budget:[3800,5000],weeks:8,
    text:"Home time and Velmark time, on one dial."},
  {id:"weekend",title:"A watch that keeps going all weekend",seg:"collector",tier:2,spec:{cert:"bench",reserveH:70},budget:[4600,6000],weeks:9,
    text:"Off on Friday, on on Monday, still running."},
  {id:"doctor",title:"A doctor's chronometer",seg:"press",tier:2,spec:{cert:"chronometer"},budget:[7200,9600],weeks:10,
    text:"I time pulses with it. It has to carry the Bureau's stamp."},
  {id:"golddress",title:"A slim gold dress watch",seg:"collector",tier:2,spec:{cert:"bench",metal:"gold",maxThick:7.6,finishN:1},budget:[6200,8200],weeks:10,
    text:"Gold, thin enough for a shirt cuff, and finished properly."},
  {id:"hibeat",title:"A 36,000 bph chronometer",seg:"collector",tier:3,spec:{cert:"chronometer",bph:"36000"},budget:[11500,14500],weeks:12,
    text:"Ten beats a second, and certified. I collect fast movements."},
  {id:"obs",title:"An Observatory piece",seg:"collector",tier:3,spec:{cert:"observatory",finishN:2},budget:[24000,31000],weeks:16,
    text:"Kessel Peak grade, finished to show. Money is not the question."}];
const REP_TRACKS={},REP_TIERS=[],RIVALS=[],GOALS={};   // (PR 6)
const RND={};          // R&D projects (PR 7)

/* the business: rent on the shared bench, your own keep (food and the room upstairs), your own bench hours a week, the loan the bank offers once, starting cash,
   how many repairs and offers turn up (a week, on average) */
const BIZ={benchRent:140,keep:260,hoursWeek:45,staffHours:40,repairsWeek:1.8,repairsShop:1.6,repairWait:4,repairQueue:6,
  offerEvery:3,offerKeep:3,tradeEvery:6,late:.1,lateCancel:6,tradeLate:.15,dealer:.55,scrap:.3,
  loan:{rate:.08,weeks:52,min:4000,round:500},
  starts:{bench:{year:2000,cash:2500,up:[],xp:0},shop:{year:2008,cash:18000,up:["shop","timing-six","cleaning"],xp:25}}};

/* ---- state ---- */
const START_YEAR=2000,END_YEAR=2030;
function freshState(){return{sv:1,seen:false,theme:"dark",gfx:null,gfxAuto:true,reduce:null,sound:true,tab:"bench",
  cfg:Object.assign({},SIM.DEFAULT_CFG),career:null,
  xp:{},piece:null,tgOn:null,tg:{pos:"DU",temp:23,wind:0,lift:52}};}   // tgOn: a customer's watch on the timegrapher ({kind:"repair",id}) instead of your piece   // xp: skill XP outside a career; piece: the movement on the timegrapher (app/test.js); tg: its settings
let S=freshState();

const buObjS=o=>!!o&&typeof o==="object"&&!Array.isArray(o);
function save(){try{localStorage.setItem("esc-save",JSON.stringify(S));}catch(e){return;}buSaved();}   // buSaved: app/savecode.js (asks the browser to keep our storage)
function snapshot(){return JSON.parse(JSON.stringify(S));}
/* load a save object into S. false (and S untouched) if it isn't one of ours */
function hydrate(o){if(!buObjS(o)||!buObjS(o.cfg))return false;
  const n=freshState();Object.assign(n,o);n.cfg=SIM.normCfg(Object.assign({},SIM.DEFAULT_CFG,o.cfg)).cfg;
  const f=freshState();n.tg=Object.assign(f.tg,buObjS(o.tg)?o.tg:{});if(!buObjS(n.xp))n.xp={};if(!buObjS(n.piece))n.piece=null;
  n.career=n.career==null?null:normCareer(n.career);if(!buObjS(n.tgOn))n.tgOn=null;
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
  $("cashLbl").textContent=c?fmt$(c.cash||0):"";$("repLbl").textContent=c&&!c.over?fmtN(hoursLeft(),1)+" h left":c?"closed":"Sandbox";}

/* ---- toast ---- */
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("on"),2600);}

/* ---- the bottom sheet (Settings, Back up, Restore …) ---- */
let sheetBack=null;
function openSheet(title,html){sheetBack=document.activeElement;$("sheetTitle").textContent=title;$("sheetBody").innerHTML=html;
  $("sheet").classList.add("on");$("scrim").classList.add("on");$("sheetBody").scrollTop=0;$("sheetClose").focus({preventScroll:true});}
function closeSheet(){$("sheet").classList.remove("on");$("scrim").classList.remove("on");if(sheetBack&&sheetBack.focus)sheetBack.focus({preventScroll:true});sheetBack=null;}
const sheetOn=()=>$("sheet").classList.contains("on");
