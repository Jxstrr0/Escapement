/* ===================== app/boot.js: tabs, Settings, intro, start-up =====================
   showTab(t) switches the five tabs (Bench, Build, Test, Shop, Career) and remembers the last one in S.tab.
   openSettings() fills the bottom sheet: graphics tier, auto-adjust, theme, motion, sound, help and the tour, saves, install, version.
   start() runs once the whole app script has loaded (scheduled through __ldGo at the bottom of this file): it loads
   the save, starts the 3D view, draws the tabs and lifts the loading splash. */
const TABS=["bench","build","test","shop","career"];
const TAB_RENDER={};   // tab name -> render function; each tab file adds its own (app/build.js, test.js, shop.js, career.js)
const TAB_LEAVE={};    // tab name -> called when you switch away from it (the Test tab stops its trace and tick)
let curTab="bench";
const tabScroll={};
function showTab(t){
  if(!TABS.includes(t))t="bench";
  if(curTab!==t&&TAB_LEAVE[curTab])TAB_LEAVE[curTab]();
  tabScroll[curTab]=$("panel").scrollTop;curTab=t;S.tab=t;
  document.documentElement.setAttribute("data-tab",t);
  document.querySelectorAll("#tabs button").forEach(b=>{const on=b.dataset.tab===t;b.classList.toggle("on",on);if(on)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});
  document.querySelectorAll(".tabpage").forEach(p=>p.classList.toggle("on",p.id==="tab-"+t));
  if(TAB_RENDER[t])TAB_RENDER[t]();
  $("panel").scrollTop=tabScroll[t]||0;
  save();}
$("tabs").addEventListener("click",e=>{const b=e.target.closest("button[data-tab]");if(b)showTab(b.dataset.tab);});

/* ---- Settings ---- */
function segHtml(id,attr,opts,cur){return `<div class="seg" id="${id}" role="group">${opts.map(([v,l,s])=>`<button type="button" data-${attr}="${v}" class="${String(v)===String(cur)?"on":""}" aria-pressed="${String(v)===String(cur)}">${l}${s?`<small>${s}</small>`:""}</button>`).join("")}</div>`;}
function openSettings(){
  const ap=PWA.canInstall(),tip=PWA.iosTip();
  openSheet("Settings",`
<div class="field"><span class="lbl">Graphics</span>${segHtml("gfxSeg","gfx",[["lite","Lite","phones"],["full","Full","shadows"],["ultra","Ultra","bloom"]],gfxTier())}
<p class="hint">Lite is the phone default and always looks finished. Full and Ultra add shadows, reflections and glow.</p></div>
<div class="field"><span class="lbl">Auto-adjust graphics</span>${segHtml("gfxAutoSeg","gauto",[["1","On","lowers it if it stutters"],["0","Off"]],S.gfxAuto===false?"0":"1")}</div>
<div class="field"><span class="lbl">Theme</span>${segHtml("themeSeg","theme",[["dark","Dark","felt"],["light","Light","workshop"],["auto","Auto","follow phone"]],S.theme||"dark")}</div>
<div class="field"><span class="lbl">Motion</span>${segHtml("reduceSeg","reduce",[["auto","Auto","follow phone"],["1","Reduced"],["0","Full"]],S.reduce==null?"auto":S.reduce?"1":"0")}</div>
<div class="field"><span class="lbl">Sound</span>${segHtml("sndSeg","snd",[["1","On","the tick on the Test tab"],["0","Off"]],S.sound===false?"0":"1")}</div>
<div class="field"><span class="lbl">Help</span><div class="row"><button class="btn" id="setHelp">Help and glossary</button>${inCareer()&&!car().over?`<button class="btn" id="setTour">Take the tour</button>`:""}</div></div>
<div class="field"><span class="lbl">Saves</span><div class="row"><button class="btn" id="setBackup">Back up</button><button class="btn" id="setRestore">Restore</button></div>
<div class="row"><button class="btn" data-bu="file">Save backup file</button><button class="btn" data-bu="load">Load backup file</button></div><p class="hint" data-bu-store hidden></p></div>
${ap||tip?`<div class="field"><span class="lbl">App</span>${ap?`<div class="row"><button class="btn" id="pwaInstall">Install app</button></div><p class="hint">Adds Escapement to your home screen. It works offline once installed.</p>`:`<p class="hint" style="margin-top:0">On iPhone or iPad: tap Share, then <b>Add to Home Screen</b>. It works offline once installed.</p>`}</div>`:""}
<p class="hint">Escapement ${VERSION} · © ${new Date().getFullYear()} Kelbo / Longlight Interactive</p>`);
  const pick=(id,attr,fn)=>$(id).addEventListener("click",e=>{const b=e.target.closest(`[data-${attr}]`);if(!b)return;
    fn(b.dataset[attr]);$(id).querySelectorAll("button").forEach(x=>{const on=x===b;x.classList.toggle("on",on);x.setAttribute("aria-pressed",on);});save();});
  pick("gfxSeg","gfx",v=>{S.gfx=v;perfManual();applyGfx();});
  pick("gfxAutoSeg","gauto",v=>{S.gfxAuto=v==="1";PERF.dropped=PERF.manual=false;perfReset(true);});
  pick("themeSeg","theme",v=>{S.theme=v;applyTheme();});
  pick("sndSeg","snd",v=>{S.sound=v==="1";if(curTab==="test"){WATCH_SOUND.unlock();TAB_RENDER.test();}});
  pick("reduceSeg","reduce",v=>{S.reduce=v==="auto"?null:v==="1";applyReduce();});
  $("setHelp").addEventListener("click",()=>helpSheet());if($("setTour"))$("setTour").addEventListener("click",()=>{closeSheet();tutStart(true);});   // app/help.js
  $("setBackup").addEventListener("click",buBackupOpen);
  $("setRestore").addEventListener("click",buRestoreOpen);
  buStoreLine();
  if($("pwaInstall"))$("pwaInstall").addEventListener("click",()=>{PWA.install();closeSheet();});
}
$("setOpen").addEventListener("click",openSettings);
$("sheetClose").addEventListener("click",closeSheet);
$("scrim").addEventListener("click",closeSheet);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&sheetOn()){closeSheet();e.preventDefault();}});

/* ---- intro (first visit only) ---- */
$("introGo").addEventListener("click",()=>{S.seen=true;save();$("intro").hidden=true;$("tabs").querySelector("button.on").focus({preventScroll:true});});

/* ---- start-up ---- */
function start(){
  loadSaved();
  applyAll();   // sets the tier before the 3D view builds, so it builds once
  try{WATCH_VIS.init($("gl"));WATCH_VIS.setMotion(reduced());visSync();}catch(e){$("tag").textContent="3D view unavailable on this device";}
  $("verLbl").textContent="v"+VERSION;
  $("intro").hidden=!!S.seen;
  showTab(S.tab||"bench");
  __ldDone();}
__ldGo(start);
