/* ===================== app/rnd.js: R&D and your own calibres (PR 7) =====================
   The engine, its Career-tab card (rndCard) and the calibre sheet. RND and RND_SLOTS are in app/state.js; the in-house
   parts are PARTS.house and the calibre bonus K.calibre in the sim.
   - S.career.rnd = {done:{id: week it finished}, run:[{id, end, name?, core?}]}. Pay the cost up front (startRnd); the
     project is ready at the Close week that reaches its end week (rndClose, called by closeWeek). A finished project sets
     c.unlocks["rnd:<id>"], so the Build tab offers its parts; an in-house project also switches its part on in the build
     you're working on; every project teaches (RND.xp). One runs at a time, two with the clean room or a master watchmaker.
   - Calibres: {id, name, core:{slot: option id}} for the ten single-choice slots (CAL_CORE: barrel to winding). A career
     keeps them in c.calibres, the Sandbox in S.cals. The calibre project freezes the Build tab's core and its name when it
     starts; the calibre is yours when it is done. In the Sandbox, Save as calibre is free and instant. A cfg built on one
     carries cal (its id), and the sim adds K.calibre; changing a core part takes the build off its calibre (withOpt).
   - lockedParts(cfg): the parts in a build you don't own yet (Make refuses those, and so does a calibre). ---- */
const CAL_CORE=SIM.SLOTS.filter(s=>!SIM.MULTI[s]);
/* a calibre's name: letters, digits, spaces and . ' - only (it goes into the page as text), at most 24 characters */
const calClean=s=>String(s==null?"":s).replace(/[^\p{L}\p{N} .'\-]/gu,"").replace(/\s+/g," ").trim().slice(0,24);
function normCals(a){if(!Array.isArray(a))return[];const out=[];
  for(const x of a){if(!buObjS(x)||typeof x.id!=="string"||!/^[a-z0-9-]{1,16}$/.test(x.id)||!buObjS(x.core)||out.some(y=>y.id===x.id))continue;
    out.push({id:x.id,name:calClean(x.name)||"Calibre "+(out.length+1),core:coreOf(x.core),wk:+x.wk||0});}
  return out.slice(0,RND_SLOTS.calibresMax);}
const calList=()=>S.career?(Array.isArray(S.career.calibres)?S.career.calibres:(S.career.calibres=[])):(S.cals||(S.cals=[]));
const calOf=id=>id?calList().find(k=>k.id===id):null;
const calName=cfg=>{const k=cfg&&calOf(cfg.cal);return k?k.name:"";};
function coreOf(cfg){const n=SIM.normCfg(Object.assign({},SIM.DEFAULT_CFG,cfg)).cfg,k={};for(const s of CAL_CORE)k[s]=n[s];return k;}
const calFits=cfg=>{const k=calOf(cfg.cal);return !!k&&CAL_CORE.every(s=>cfg[s]===k.core[s]);};
/* take a build off a calibre that isn't there (another game's) or whose core it no longer has */
function calCheck(cfg){if(cfg&&cfg.cal&&!calFits(cfg))delete cfg.cal;return cfg;}
/* the build put on a calibre (its core fitted), or taken off one (id null) */
function withCal(cfg,id){const c=JSON.parse(JSON.stringify(cfg)),k=calOf(id);delete c.cal;if(k){Object.assign(c,k.core);c.cal=k.id;}return SIM.normCfg(c).cfg;}
function lockedParts(cfg){const out=[];for(const s of SIM.SLOTS){const v=cfg[s],ids=Array.isArray(v)?v:[v];
  for(const id of ids){const o=SIM.part(s,id);if(o&&!hasUnlock(o.unlock))out.push(o);}}return out;}

/* ---- the projects ---- */
function rndSt(){const c=car();if(!buObjS(c.rnd))c.rnd={};if(!buObjS(c.rnd.done))c.rnd.done={};if(!Array.isArray(c.rnd.run))c.rnd.run=[];return c.rnd;}
function normRnd(r){const o={done:{},run:[]};if(!buObjS(r))return o;
  if(buObjS(r.done))for(const id in r.done)if(RND[id])o.done[id]=+r.done[id]||0;
  if(Array.isArray(r.run))for(const x of r.run)if(buObjS(x)&&RND[x.id]&&isFinite(+x.end)&&!o.run.some(y=>y.id===x.id)){
    const y={id:x.id,end:+x.end};if(RND[x.id].kind==="calibre"){if(!buObjS(x.core))continue;y.core=coreOf(x.core);y.name=calClean(x.name)||"Calibre";}o.run.push(y);}
  return o;}
const rndDone=id=>{const c=car();return !!(c&&buObjS(c.rnd)&&buObjS(c.rnd.done)&&c.rnd.done[id]!=null);};
const rndRun=id=>{const c=car();return c&&buObjS(c.rnd)&&Array.isArray(c.rnd.run)?c.rnd.run.find(r=>r.id===id)||null:null;};
function rndSlots(){const c=car();return RND_SLOTS.base+(RND_SLOTS.extra.some(upOwned)||c.staff.some(s=>s.kind===RND_SLOTS.extraStaff)?1:0);}
/* what it costs now: the calibre project is cheaper after the first */
function rndTerms(id){const R=RND[id];return R.again&&rndDone(id)?R.again:{cost:R.cost,weeks:R.weeks};}
/* why it can't start (besides the money), in words; empty = it can */
function rndWhy(id){const R=RND[id],c=car(),out=[],L=skillLvls();
  if(R.kind==="calibre"){if(calList().length>=RND_SLOTS.calibresMax)out.push(`you have ${RND_SLOTS.calibresMax} calibres`);}
  else if(rndDone(id))return["done"];
  if(rndRun(id))return["under way"];
  for(const a of R.after||[])if(!rndDone(a))out.push(RND[a].name.toLowerCase()+" first");
  for(const n of R.needs||[])if(!upOwned(n))out.push("the "+UPGRADES[n].name.toLowerCase()+" (Shop)");
  for(const k in R.skill||{})if(L[k]<R.skill[k])out.push(`${SKILLS[k].name} ${R.skill[k]} (you're at ${L[k]})`);
  if(!out.length&&rndSt().run.length>=rndSlots())out.push(rndSlots()>1?"both R&D benches are busy":"your R&D bench is busy (the clean room or a master watchmaker makes room for a second)");
  return out;}
function startRnd(id,extra){const R=RND[id],c=car();if(!R||!c||rndWhy(id).length)return false;const T=rndTerms(id);
  if(!pay(T.cost,"R&D: "+R.name.toLowerCase()))return false;
  rndSt().run.push(Object.assign({id,end:c.wk+T.weeks},extra||{}));save();
  toast(`${extra&&extra.name?extra.name:R.name}: under way, ready ${whenTxt(c.wk+T.weeks)}.`);return true;}
function stopRnd(id){const st=rndSt();st.run=st.run.filter(r=>r.id!==id);save();toast("Stopped. The money spent on it is gone.");}
/* at Close week (before the week turns): finished projects unlock their parts and teach */
function rndClose(rep){const c=car(),st=rndSt();
  for(const r of st.run.slice()){if(c.wk+1<r.end)continue;const R=RND[r.id];
    st.run=st.run.filter(x=>x!==r);if(st.done[r.id]==null)st.done[r.id]=c.wk+1;c.unlocks["rnd:"+r.id]=true;
    for(const k in R.xp||{})levelToast(k,gainXp(k,R.xp[k]));
    if(R.kind==="calibre"){const id="c"+nextId();calList().push({id,name:r.name,core:r.core,wk:c.wk+1});
      rep.push(`R&D: the ${r.name} calibre is ready. Pick it at the top of the Build tab.`);goal("calibre",rep);continue;}
    if(R.kind==="house"){const o=SIM.PARTS.house.find(x=>x.unlock==="rnd:"+r.id);
      if(o&&!S.cfg.house.includes(o.id))S.cfg=SIM.normCfg(Object.assign({},S.cfg,{house:S.cfg.house.concat(o.id)})).cfg;
      rep.push(`R&D: ${R.name.toLowerCase()} are ready, and on in your build (Build tab, In-house parts).`);continue;}
    const o=SIM.SLOTS.map(s=>SIM.PARTS[s].find(x=>x.unlock==="rnd:"+r.id)).find(Boolean);
    rep.push(`R&D: the ${R.name.toLowerCase()} is ready${o?`: it's in the Build tab`:""}.`);}}

/* ---- the Career tab card: what is under way, what you can start now, then (folded) what needs something first and what
   is done. Kept short for a phone ---- */
const RND_KIND={comp:"Complication",part:"Movement part",house:"In-house",calibre:"Calibre"};
function rndCard(){const c=car(),st=rndSt(),ids=Object.keys(RND),done=ids.filter(id=>RND[id].kind!=="calibre"&&rndDone(id));
  const ready=[],later=[];for(const id of ids){if(rndRun(id)||done.includes(id))continue;const why=rndWhy(id);(why.length?later:ready).push([id,why]);}
  const terms=id=>{const T=rndTerms(id);return `${fmt$(T.cost)} · ${T.weeks} weeks`;};
  let h=`<details class="card rnd" open><summary><h3>R&amp;D<span class="cnt">${st.run.length} of ${rndSlots()} under way · ${done.length} done</span></h3></summary>`;
  if(st.run.length)h+=`<ul class="shlist">${st.run.map(r=>`<li><div><b>${RND[r.id].kind==="calibre"?r.name+" calibre":RND[r.id].name}</b><br><small>Ready ${whenTxt(r.end)} (week ${dateOf(r.end).week}, ${dateOf(r.end).year})</small></div><div class="acts"><button class="btn sm ghost" data-rd="stop" data-id="${r.id}">Stop</button></div></li>`).join("")}</ul>`;
  else h+=`<p class="hint">Pay up front; the project is ready after its weeks, and it teaches you something too.</p>`;
  if(ready.length)h+=`<p class="lbl">Ready to start</p><ul class="shlist">${ready.map(([id])=>{const R=RND[id],T=rndTerms(id),cal=R.kind==="calibre";
    return `<li><div><b>${cal&&rndDone(id)?"Another calibre":R.name}</b> <small class="kind">${RND_KIND[R.kind]}</small><br><small>${R.blurb}</small><br><small>${terms(id)}</small></div>
<div class="acts"><button class="btn sm" data-rd="${cal?"cal":"go"}" data-id="${id}"${c.cash<T.cost?" disabled":""}>Start</button></div></li>`;}).join("")}</ul>`;
  else if(!st.run.length)h+=`<p class="hint">Nothing you can start yet: see what each project needs below.</p>`;
  if(later.length)h+=`<details class="more"><summary>Needs something first (${later.length})</summary><ul class="shlist">${later.map(([id,why])=>{const R=RND[id];
    return `<li><div><b>${R.kind==="calibre"&&rndDone(id)?"Another calibre":R.name}</b> <small class="kind">${RND_KIND[R.kind]}</small><br><small>${terms(id)}</small><br><small class="lockt">Needs ${why.join(", ")}</small></div></li>`;}).join("")}</ul></details>`;
  if(done.length)h+=`<p class="hint">Done: ${done.map(id=>RND[id].name).join(", ")}.</p>`;
  const ks=calList();if(ks.length)h+=`<p class="hint">Your calibres: ${ks.map(k=>k.name).join(", ")}. Pick one at the top of the Build tab.</p>`;
  return h+`</details>`;}
$("careerBody").addEventListener("click",e=>{const b=e.target.closest("[data-rd]");if(!b)return;const k=b.dataset.rd,id=b.dataset.id,R=RND[id];if(!R)return;
  if(k==="go"){const T=rndTerms(id);confirmSheet(`Start ${R.name.toLowerCase()}?`,`${fmt$(T.cost)} now; it's ready ${whenTxt(car().wk+T.weeks)}.`,`Start (${fmt$(T.cost)})`,()=>{if(startRnd(id)){hud();renderCareer();}});}
  if(k==="cal")calSheet();
  if(k==="stop")confirmSheet(`Stop ${R.kind==="calibre"?"the calibre":R.name.toLowerCase()}?`,"The money already spent on it is not refunded.","Stop it",()=>{stopRnd(id);renderCareer();});});

/* ---- naming a calibre: freezes the Build tab's core ---- */
function calSheet(){const c=car(),T=c?rndTerms("calibre"):null,core=coreOf(S.cfg),lk=lockedParts(core),n=calList().length+1;
  const rows=CAL_CORE.map(s=>SIM.part(s,core[s]).name).join(" · ");
  openSheet(c?"Develop a calibre":"Save as a calibre",`<p style="margin-top:0">${c?`The core of the build in the Build tab (below) becomes your calibre: ${fmt$(T.cost)} now, ready ${whenTxt(c.wk+T.weeks)}. Set the Build tab up first if this isn't the core you want.`:"The core of your build (below) becomes a calibre you can pick at the top of the Build tab."} Built on it, a piece takes ${Math.round((1-SIM.K.calibre.hours)*100)}% fewer hours, its parts cost ${Math.round((1-SIM.K.calibre.cost)*100)}% less, and collectors count ${SIM.K.calibre.prestige} more prestige. Complications, finishes and in-house parts stay free to choose.</p>
<div class="field"><label for="calName">Its name</label><input id="calName" class="txt" maxlength="24" autocomplete="off" autocapitalize="words" spellcheck="false" value="Haldis ${n}"></div>
<p class="lbl">Its core</p><p class="calcore">${rows}</p>${lk.length?`<p class="lockt">Not yours yet: ${lk.map(o=>o.name.toLowerCase()).join(", ")}. Change the build first.</p>`:""}
<div class="row"><button class="btn pri" id="calGo"${lk.length||(c&&c.cash<T.cost)?" disabled":""}>${c?`Develop it (${fmt$(T.cost)})`:"Save it"}</button></div>`);
  $("calGo").addEventListener("click",()=>{const name=calClean($("calName").value);if(!name){toast("Give it a name first.");return;}
    if(c){if(startRnd("calibre",{name,core})){closeSheet();hud();renderCareer();}return;}
    const id="s"+Date.now().toString(36).slice(-6);calList().push({id,name,core,wk:0});S.cfg=withCal(S.cfg,id);save();closeSheet();toast(`The ${name} calibre: your build is on it.`);if(TAB_RENDER[curTab])TAB_RENDER[curTab]();});}
