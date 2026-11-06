/* ===================== app/build.js: the Build tab =====================
   Design a movement part by part (plan section 5).
   - BUILD_SECS: the eight accordion rows (Barrel, Train & jewels, Escapement, Balance & hairspring, Beat rate & regulation,
     Shock & winding, Complications, Finishing) and which part slots each one holds. One row is open at a time (S.bOpen).
   - Every option shows a delta line: what fitting it (or, for complications and finishes, adding or taking it off) would
     do to amplitude, reserve, the accuracy band, thickness, prestige, cost and hours, plus any stress line it would add or
     clear. Worked out with a real simulate() call per option (cached; about 0.04 ms each), only for the open row.
   - The docked capsule (#bCap) sticks to the top of the panel: rate band, reserve, parts cost, bench hours, and the
     certification estimate (PR 3).
   - The stress report card lists every COMBOS line for the build, worst first.
   - Locked options are dimmed and say what unlocks them: a Shop upgrade (PR 5) or an R&D project (PR 7). Unlock names
     live in UNLOCK_NAME until UPGRADES and RND carry their own. Before a career exists, a Parts switch offers
     "Workshop" (what a new bench owns) or "Everything" (try any part); S.bAll remembers it. ---- */
const BUILD_SECS=[
  {id:"barrel",title:"Barrel",slots:["barrel"]},
  {id:"train",title:"Train & jewels",slots:["train","jewels"]},
  {id:"esc",title:"Escapement",slots:["escapement"]},
  {id:"balance",title:"Balance & hairspring",slots:["balance","hairspring"]},
  {id:"beat",title:"Beat rate & regulation",slots:["bph","regulator"]},
  {id:"shock",title:"Shock & winding",slots:["shock","winding"]},
  {id:"comps",title:"Complications",slots:["complications"]},
  {id:"finish",title:"Finishing",slots:["finish"]}
];
const SLOT_NAME={barrel:"Mainspring barrel",train:"Wheel train",jewels:"Jewels",escapement:"Escapement",balance:"Balance wheel",
  hairspring:"Hairspring",bph:"Beat rate",regulator:"Regulator",shock:"Shock protection",winding:"Winding",
  complications:"Add as many as the case and your skill allow",finish:"Each finish adds prestige and bench hours"};
/* what each unlock is called until PR 5 (UPGRADES) and PR 7 (RND) give the real entries a name */
const UNLOCK_NAME={
  "shop:mill":"milling machine","shop:lathe":"watchmaker's lathe","shop:cnc":"CNC mill","shop:polishing":"polishing bench",
  "shop:timing-six":"six-position timing machine","shop:spring-supplier":"alloy spring supplier","shop:jewel-supplier":"jewel and shock supplier",
  "rnd:coaxial":"Co-axial escapement","rnd:detent":"Detent escapement","rnd:free-sprung":"Free-sprung balance","rnd:silicon":"Silicon hairspring",
  "rnd:power-reserve":"Power reserve indicator","rnd:moonphase":"Moonphase","rnd:chrono":"Chronograph","rnd:annual-cal":"Annual calendar",
  "rnd:perp-cal":"Perpetual calendar","rnd:tourbillon":"Tourbillon","rnd:repeater":"Minute repeater","rnd:split-seconds":"Split-seconds"};
function unlockName(u){const [kind,id]=u.split(":"),T=kind==="shop"?UPGRADES:RND,e=T&&T[id];return (e&&e.name)||UNLOCK_NAME[u]||id;}
function unlockText(u){return u.startsWith("shop:")?`Needs the ${unlockName(u)} (Shop)`:`Research: ${unlockName(u)} (R&D)`;}
/* is this option available? "start" always; otherwise the career's unlocks map ({"shop:mill":true, …}, filled by PR 5 and
   PR 7), or everything while there is no career and the Parts switch says Everything */
function hasUnlock(u){if(u==="start")return true;const c=S.career;if(!c)return !!S.bAll;return !!(c.unlocks&&c.unlocks[u]);}

/* the cfg with one option fitted (or, for a list slot, toggled), with its partners: a free-sprung balance brings its
   regulator, split-seconds brings a chronograph, taking the chronograph off takes split-seconds with it */
function withOpt(cfg,slot,id){
  const c=JSON.parse(JSON.stringify(cfg));
  if(SIM.MULTI[slot]){let a=c[slot]||[];
    if(a.includes(id))a=a.filter(x=>x!==id&&SIM.part(slot,x).needs!==id);
    else{a.push(id);const o=SIM.part(slot,id);if(o.needs&&!a.includes(o.needs))a.push(o.needs);}
    c[slot]=SIM.PARTS[slot].map(o=>o.id).filter(x=>a.includes(x));}   // keep table order
  else{c[slot]=id;
    if(slot==="balance"){if(SIM.part("balance",id).freeSprung)c.regulator="free-sprung";else if(SIM.part("regulator",c.regulator).needsFreeSprung)c.regulator="index";}
    if(slot==="regulator"&&SIM.part("regulator",id).needsFreeSprung&&!SIM.part("balance",c.balance).freeSprung)c.balance="free-sprung";}
  return SIM.normCfg(c).cfg;}

/* simulate() on the bench, cached by cfg and skills. Same seed as the Test tab, so the numbers match */
const bCache=new Map();
function bSim(cfg){const sk=S.career&&S.career.skills,key=JSON.stringify(cfg)+"|"+JSON.stringify(sk||0);let r=bCache.get(key);
  if(!r){if(bCache.size>600)bCache.clear();r=SIM.simulate(cfg,sk,null,{seed:"bench"});bCache.set(key,r);}return r;}
const bandW=r=>r.band[1]-r.band[0];
const sdn=(x,d)=>(x>0?"+":"−")+Math.abs(x).toFixed(d||0);
const thMoney=n=>(n>0?"+":"−")+fmt$(Math.abs(n));

/* the delta line: up to three of the biggest performance changes, then cost and hours, then stress lines added or cleared.
   good = the change helps (green), bad = it hurts (red); cost and hours are plain */
function deltaHtml(r,b){
  const perf=[],out=[];
  const add=(d,thr,txt,good)=>{if(Math.abs(d)>=thr)perf.push({w:Math.abs(d)/thr,h:`<i class="${good?"up":"dn"}">${txt}</i>`});};
  add(r.amp0-b.amp0,3,sdn(r.amp0-b.amp0)+"°",r.amp0>b.amp0);
  add(r.reserveH-b.reserveH,2,sdn(r.reserveH-b.reserveH)+" h",r.reserveH>b.reserveH);
  const dw=bandW(r)-bandW(b);add(dw,.5,"band "+sdn(dw,1)+" s/d",dw<0);
  add(r.thickness-b.thickness,.1,sdn(r.thickness-b.thickness,1)+" mm",r.thickness<b.thickness);
  add(r.prestige-b.prestige,1,sdn(r.prestige-b.prestige)+" prestige",r.prestige>b.prestige);
  perf.sort((x,y)=>y.w-x.w);out.push(...perf.slice(0,3).map(x=>x.h));
  const dc=r.cost-b.cost,dh=r.hours-b.hours;
  if(Math.abs(dc)>=1)out.push(`<i>${thMoney(dc)}</i>`);
  if(Math.abs(dh)>=1)out.push(`<i>${sdn(dh)} h work</i>`);
  const tags=x=>new Map(x.stress.filter(s=>s.sev!=="info").map(s=>[s.tag,s.sev]));
  const was=tags(b),now=tags(r);
  for(const [t,sev] of now)if(!was.has(t)){out.push(`<i class="${sev==="bad"?"x":"w"}">${sev==="bad"?"✖":"▲"} ${t}</i>`);break;}
  for(const [t] of was)if(!now.has(t)){out.push(`<i class="up">✓ ${t}</i>`);break;}
  return out.length?out.join(""):"<i>no change</i>";}

function optHtml(slot,o,base){
  const multi=SIM.MULTI[slot],on=multi?S.cfg[slot].includes(o.id):S.cfg[slot]===o.id,lk=!hasUnlock(o.unlock);
  let d;
  if(on&&!multi)d=`<i class="fit">fitted</i>${lk?`<i class="lk">${unlockText(o.unlock)}</i>`:""}`;
  else if(lk)d=`<i class="lk">${unlockText(o.unlock)}</i>`;
  else d=(on?`<i class="fit">fitted · tap to take off</i>`:"")+deltaHtml(bSim(withOpt(S.cfg,slot,o.id)),base);
  return `<button class="opt${on?" on":""}${lk?" lock":""}${multi?" multi":""}" data-slot="${slot}" data-id="${o.id}" aria-pressed="${on}">`+
    `<span class="on-dot" aria-hidden="true"></span><b>${o.name}</b><span class="oc">${o.cost?fmt$(o.cost):"—"}</span>`+
    `<small>${o.blurb}</small><span class="d">${d}</span></button>`;}

function secSum(sec){return sec.slots.map(sl=>{const v=S.cfg[sl];
  if(SIM.MULTI[sl])return v.length?v.map(id=>SIM.part(sl,id).name).join(", "):"none";
  return SIM.part(sl,v).name;}).join(" · ");}

function bOpenId(){return S.bOpen==null?"barrel":S.bOpen;}
function renderBuildForm(){
  const base=bSim(S.cfg),open=bOpenId();let h="";
  for(const sec of BUILD_SECS){const on=sec.id===open;
    h+=`<div class="acc${on?" open":""}"><button class="acch" data-sec="${sec.id}" aria-expanded="${on}"><span class="t">${sec.title}</span><span class="sum">${secSum(sec)}</span><span class="chev" aria-hidden="true"></span></button>`;
    if(on){h+=`<div class="accb">`;
      for(const sl of sec.slots)h+=`<div class="slot"><span class="lbl">${SLOT_NAME[sl]}</span><div class="opts">${SIM.PARTS[sl].map(o=>optHtml(sl,o,base)).join("")}</div></div>`;
      h+=`</div>`;}
    h+=`</div>`;}
  $("buildForm").innerHTML=h;}

function renderCap(){const r=bSim(S.cfg),f=x=>(x>=0?"+":"−")+Math.abs(Math.round(x));
  const cell=(k,v,cls)=>`<div${cls?` class="${cls}"`:""}><span>${k}</span><b>${v}</b></div>`;
  $("bCap").innerHTML=cell("Rate",`${f(r.band[0])}…${f(r.band[1])}<small> s/d</small>`)+cell("Reserve",`${Math.round(r.reserveH)}<small> h</small>`)+
    cell("Parts",fmt$(r.cost))+cell("Hours",`${Math.round(r.hours)}<small> h</small>`)+cell("Cert","<small>PR 3</small>","dim");}

function renderStress(){const r=bSim(S.cfg),L=r.stress;
  const ic={bad:"✖",warn:"▲",info:"·"};
  const nb=L.filter(s=>s.sev==="bad").length,nw=L.filter(s=>s.sev==="warn").length;
  $("bStress").querySelector("h3").innerHTML=`Stress report<span class="cnt">${[nb&&nb+" serious",nw&&nw+" to watch",(L.length-nb-nw)&&(L.length-nb-nw)+(L.length-nb-nw>1?" notes":" note")].filter(Boolean).join(" · ")}</span>`;
  $("bStressList").innerHTML=L.length?L.map(s=>`<li class="${s.sev}"><i aria-hidden="true">${ic[s.sev]}</i><span>${s.text}</span></li>`).join(""):
    `<li class="info"><i aria-hidden="true">✓</i><span>Nothing to worry about: a sound, plain build.</span></li>`;}

function renderMode(){const show=!S.career;$("bModeF").hidden=!show;if(!show)return;
  $("bMode").innerHTML=[["0","Workshop","what a new bench owns"],["1","Everything","try any part"]].map(([v,t,s])=>
    `<button data-ball="${v}" class="${(S.bAll?"1":"0")===v?"on":""}" aria-pressed="${(S.bAll?"1":"0")===v}">${t}<small>${s}</small></button>`).join("");}

TAB_RENDER.build=function(){renderMode();renderCap();renderBuildForm();renderStress();};

function buildChanged(){save();renderCap();renderBuildForm();renderStress();if(window.WATCH_VIS)WATCH_VIS.setMovement(S.cfg);}
$("buildForm").addEventListener("click",e=>{
  const a=e.target.closest("[data-sec]");
  if(a){const id=a.dataset.sec;S.bOpen=bOpenId()===id?"":id;save();renderBuildForm();
    const el=$("buildForm").querySelector(`[data-sec="${id}"]`),pn=$("panel"),cap=$("bCap").getBoundingClientRect().bottom+6,top=el.getBoundingClientRect().top;
    if(top<cap)pn.scrollTop+=top-cap;   // keep the row's header under the capsule, not behind it
    return;}
  const b=e.target.closest(".opt");if(!b)return;
  const slot=b.dataset.slot,id=b.dataset.id,o=SIM.part(slot,id);
  if(b.classList.contains("lock")&&!(S.cfg[slot]===id)){toast(unlockText(o.unlock)+".");return;}
  if(!SIM.MULTI[slot]&&S.cfg[slot]===id)return;
  const was=S.cfg;S.cfg=withOpt(S.cfg,slot,id);
  const nm=(sl,x)=>SIM.part(sl,x).name;
  if(SIM.MULTI[slot]){const add=S.cfg[slot].filter(x=>x!==id&&!was[slot].includes(x)),off=was[slot].filter(x=>x!==id&&!S.cfg[slot].includes(x));
    if(add.length)toast(`${nm(slot,add[0])} added: the ${o.name.toLowerCase()} needs it.`);
    else if(off.length)toast(`${nm(slot,off[0])} taken off: it needs the ${o.name.toLowerCase()}.`);}
  else if(S.cfg.regulator!==was.regulator&&slot!=="regulator")toast(`Regulator set to ${nm("regulator",S.cfg.regulator).toLowerCase()} to match.`);
  else if(S.cfg.balance!==was.balance&&slot!=="balance")toast("Balance set to free-sprung to match.");
  buildChanged();});
$("bMode").addEventListener("click",e=>{const b=e.target.closest("[data-ball]");if(!b)return;S.bAll=b.dataset.ball==="1";save();TAB_RENDER.build();});
$("bReset").addEventListener("click",()=>{S.cfg=Object.assign({},SIM.DEFAULT_CFG,{complications:[],finish:[]});buildChanged();toast("Back to a plain manual movement.");});
