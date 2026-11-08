/* ===================== app/test.js: the Test tab =====================
   The movement on the timegrapher (plan section 6).
   - The piece: S.piece is the one movement on the machine, tied to the build (S.cfg). Change the build and a new piece
     goes on: its own seed (so its own first rate and position pattern), adjustments back to zero. It carries
     adjust {reg, beat, poise}, the bench hours spent adjusting it, how many trials it has had and its best certificate.
   - The trace (#tgCv): time runs right to left, about 12 s across. Each beat is a dot; ticks and tocks make two lines.
     Their slope is the rate (a line climbing to the right runs fast), the gap between them is the beat error. The trace
     scrolls by copying the canvas onto itself and drawing only the new strip: nothing old is ever redrawn. Lite: 30 fps
     cap, device pixel ratio 1, every other beat pair plotted. Stops when you leave the tab or hide the page.
   - Readouts: rate, amplitude (worked out from the lift angle you set, so a wrong lift angle reads wrong), beat error,
     beat rate. The timing machine you own (TOOLS: the best one owned) decides which positions and temperatures you see.
   - Adjust: Regulate in regulator notches (SIM.adjustPiece adds the skill's slop), Adjust beat, Poise. Each press costs
     bench hours (the week clock arrives in PR 6) and gives skill XP.
   - Certify: SIM.runTrial against each grade, verdict and every check in the sheet. In the Sandbox it is free and at once;
     in a career the Bureau and the Observatory charge their fee and keep the piece for their weeks (sendTrial).
   - Career modes (tgMode): "piece" (your piece, assembled), "making" (still being assembled), "away" (at a trial),
     "empty" (nothing on the bench) and "repair" (a customer's watch, S.tgOn, showing its fault on the trace).
   - The tick: WATCH_SOUND plays at the piece's beat rate and beat error while this tab is open and Sound is on. ---- */
const sgn=(x,d)=>(x>=0?"+":"−")+Math.abs(x).toFixed(d==null?1:d);
const POS_NAME={DU:"Dial up",DD:"Dial down",PU:"Crown up",PD:"Crown down",PL:"Crown left",PR:"Crown right"};
const TEMP_NAME={8:"Cold",23:"Room",38:"Warm"};
const LIFTS=[38,44,50,52];

function ownedTool(){let best=TOOLS["timing-basic"];for(const id in TOOLS)if(hasUnlock(TOOLS[id].unlock))best=TOOLS[id];return best;}
/* what the sim's trials see (sim/trial.js trialSd): the timing machine's resolution and whether the workshop has Climate control */
function trialTools(){return{timingRes:ownedTool().timingRes,climate:hasUnlock("shop:climate")};}
/* in a career the piece is the one on your bench (or none); in the Sandbox it follows the build */
function curPiece(){if(inCareer())return car().bench;const key=JSON.stringify(S.cfg);
  if(!S.piece||S.piece.key!==key){S.pieceN=(+S.pieceN||0)+1;
    S.piece={key,seed:"piece"+S.pieceN,adjust:{reg:0,beat:0,poise:0},hours:0,n:0,subs:0,cert:null,xpDone:false};}
  return S.piece;}
const pieceCfg=()=>inCareer()?car().bench.cfg:S.cfg;
function pieceSim(){const p=curPiece(),tool=ownedTool();
  return SIM.simulate(pieceCfg(),skillLvls(),{timingRes:tool.timingRes},{seed:p.seed,adjust:p.adjust});}
function tgRepair(){const c=car();if(!c||!S.tgOn)return null;const r=repairBy(S.tgOn.id);return r&&r.state==="in"?r:null;}
function tgMode(){if(!inCareer())return "piece";if(tgRepair())return "repair";const p=car().bench;
  return !p?"empty":!p.made?"making":p.trial?"away":"piece";}
/* what the machine shows right now: the position, temperature and wind on the settings, clamped to what it can do */
function tgState(){const tool=ownedTool(),g=S.tg,mode=tgMode();
  const pos=tool.positions.includes(g.pos)?g.pos:"DU",temp=tool.temps?(+g.temp||23):23,t=+g.wind||0;
  if(mode==="repair"){const rp=tgRepair(),F=FAULTS[rp.fault],r=SIM.simulate(rp.cfg,{assembly:5,regulating:5,poising:5},{timingRes:tool.timingRes},{seed:rp.seed}),m=r.m;
    const lift=SIM.part("escapement",r.cfg.escapement).lift||52;
    return{mode,tool,pos,temp,t,r,m,rate:SIM.rateAt(m,pos,t,temp)+(F.rate||0),amp:F.stop?0:SIM.ampAt(m,t)*(F.amp||1)*(+g.lift||52)/lift,
      beat:SIM.beatAt(m,t)+(F.beat||0),bph:r.bph,jit:F.jit||0,stopped:!!F.stop};}
  if(mode!=="piece")return{mode,tool,pos,temp,t,r:null,m:null,rate:0,amp:0,beat:0,bph:28800,jit:0,stopped:true};
  const r=pieceSim(),m=r.m,lift=(SIM.part("escapement",r.cfg.escapement).lift)||52;
  return{mode,tool,pos,temp,t,r,m,rate:SIM.rateAt(m,pos,t,temp),amp:SIM.ampAt(m,t)*(+g.lift||52)/lift,beat:SIM.beatAt(m,t),bph:r.bph,jit:0,stopped:false};}

/* ---------- the trace ---------- */
const TG={cv:null,cx:null,W:0,H:0,dpr:1,raf:0,last:0,acc:0,tSim:0,nextBeat:0,k:0,dev:0,R:null,st:null,lite:false};
const TG_SPAN=12,TG_MS=8;   // seconds across, milliseconds top to bottom (the trace wraps, like a real one)
const TG_COL={bg:"#0b100d",grid:"rgba(201,164,92,.10)",mid:"rgba(201,164,92,.28)",sec:"rgba(242,239,230,.05)",tick:"#e0c07e",tock:"#8fc0e8",mark:"rgba(242,239,230,.45)"};
function tgSize(){const cv=TG.cv,w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return false;
  const dpr=TG.lite?1:Math.min(2,window.devicePixelRatio||1),W=Math.round(w*dpr),H=Math.round(h*dpr);
  if(W!==TG.W||H!==TG.H||dpr!==TG.dpr){TG.W=cv.width=W;TG.H=cv.height=H;TG.dpr=dpr;tgClear();}
  return true;}
const tgY=ms=>{const v=((ms+TG_MS/2)%TG_MS+TG_MS)%TG_MS;return TG.H-v/TG_MS*TG.H;};
function tgGrid(x0,w){const c=TG.cx;c.fillStyle=TG_COL.bg;c.fillRect(x0,0,w,TG.H);
  for(let i=1;i<TG_MS;i++){c.fillStyle=i===TG_MS/2?TG_COL.mid:TG_COL.grid;c.fillRect(x0,Math.round(i*TG.H/TG_MS),w,Math.max(1,TG.dpr|0));}}
function tgClear(){if(!TG.cx)return;tgGrid(0,TG.W);}
/* a thin line and a label where something changed; quick presses stack their labels down the side instead of overlapping */
function tgMark(label){const c=TG.cx;if(!c||!TG.W)return;const x=TG.W-2*TG.dpr;
  TG.stack=TG.tSim-(TG.markT||-9)<1.5?((TG.stack||0)+1)%8:0;TG.markT=TG.tSim;
  if(!TG.stack){c.fillStyle=TG_COL.mark;c.fillRect(x,0,TG.dpr,TG.H);}
  c.fillStyle=TG.stack?TG_COL.bg:TG_COL.mark;const y=(4+13*TG.stack)*TG.dpr;
  c.font=`${11*TG.dpr}px "JetBrains Mono",monospace`;c.textAlign="right";c.textBaseline="top";
  const w=c.measureText(label).width+6*TG.dpr;c.fillStyle=TG_COL.bg;c.fillRect(x-w-2*TG.dpr,y-1,w,13*TG.dpr);
  c.fillStyle=TG_COL.mark;c.fillText(label,x-5*TG.dpr,y);}
function tgFrame(now){
  TG.raf=requestAnimationFrame(tgFrame);
  if(!TG.last){TG.last=now;return;}
  if(TG.lite&&now-TG.last<33)return;    // Lite: 30 fps
  const dt=Math.min(.1,(now-TG.last)/1000);TG.last=now;
  if(!tgSize())return;
  const st=TG.st,pps=TG.W/TG_SPAN,c=TG.cx;
  TG.acc+=dt*pps;const dx=Math.floor(TG.acc);TG.acc-=dx;
  const t1=TG.tSim+dt;
  if(dx>0){c.globalCompositeOperation="copy";c.drawImage(TG.cv,-dx,0);c.globalCompositeOperation="source-over";tgGrid(TG.W-dx,dx);
    if(Math.floor(t1)>Math.floor(TG.tSim)){c.fillStyle=TG_COL.sec;c.fillRect(TG.W-1,0,1,TG.H);}}
  const iv=3600/st.bph,perBeat=st.rate/86400*iv*1000,r=(TG.lite?2.4:2)*TG.dpr;
  const jit=.025+Math.max(0,220-st.amp)*.0012+st.jit;   // a tired balance scatters more (and a faulty watch more still)
  if(st.stopped){TG.nextBeat=t1;TG.tSim=t1;return;}     // stopped: the paper runs, no dots
  while(TG.nextBeat<=t1){
    TG.dev+=perBeat;const tock=TG.k&1,y=TG.dev+(tock?st.beat/2:-st.beat/2)+(TG.R()*2-1)*jit;
    if(!TG.lite||(TG.k>>1)%2===0){const x=TG.W-(t1-TG.nextBeat)*pps-r;c.fillStyle=tock?TG_COL.tock:TG_COL.tick;c.fillRect(x-r/2,tgY(y)-r/2,r,r);}
    TG.k++;TG.nextBeat+=iv;}
  TG.tSim=t1;}
function tgStart(){if(!TG.cv){TG.cv=$("tgCv");TG.cx=TG.cv.getContext("2d");TG.R=SIM.rng("trace");}
  TG.lite=gfxTier()==="lite";TG.st=tgState();
  if(!TG.raf){TG.last=0;TG.raf=requestAnimationFrame(tgFrame);}
  tickSet();}
function tgStop(){if(TG.raf)cancelAnimationFrame(TG.raf);TG.raf=0;WATCH_SOUND.stop();}
function tickSet(){const st=TG.st||tgState();WATCH_SOUND.set({bph:st.bph,beatMs:st.beat,on:!!S.sound&&!st.stopped&&curTab==="test"&&!document.hidden});}
/* browsers only start audio from a tap: the first tap anywhere while the Test tab is open starts the tick */
document.addEventListener("pointerdown",()=>{if(curTab==="test"&&S.sound&&!document.hidden){WATCH_SOUND.unlock();tickSet();}},{passive:true,capture:true});
document.addEventListener("visibilitychange",()=>{if(curTab!=="test")return;if(document.hidden)tgStop();else tgStart();});
window.addEventListener("resize",()=>{if(curTab==="test")tgSize();});

/* ---------- the tab ---------- */
function segBtns(list,cur,attr,lockFn){return list.map(([v,l,s])=>{const lk=lockFn&&lockFn(v);
  return `<button type="button" data-${attr}="${v}" class="${String(v)===String(cur)?"on":""}${lk?" lock":""}" aria-pressed="${String(v)===String(cur)}">${l}${s?`<small>${s}</small>`:""}</button>`;}).join("");}
function toolFor(need){for(const id in TOOLS){const t=TOOLS[id];if(need(t))return t;}return null;}
/* the career card over the trace: what is on the machine and what you can do with it */
function renderTestCareer(st){const el=$("tgCar"),c=car();el.hidden=!inCareer();if(!inCareer())return;
  const p=c.bench,h=hoursLeft(),hrs=`<span class="cnt">${fmtN(h,1)} h left this week</span>`;let body="";
  if(st.mode==="repair"){const rp=tgRepair(),F=FAULTS[rp.fault];
    body=`<h3>${rp.watch[0].toUpperCase()+rp.watch.slice(1)}${hrs}</h3><p>${rp.cust}: “${F.complaint}”${rp.tried.length?` Already tried: ${rp.tried.map(f=>FAULTS[f].fix.toLowerCase()).join(", ")}.`:""}</p>
<p class="hint">Read the trace: how fast it runs, how far it swings, how far apart the two lines sit, how ragged they are. Then choose the fix.</p>
<div class="row"><button class="btn pri" data-tc="fix">Diagnose and fix…</button><button class="btn" data-tc="off">Take it off</button></div>`;}
  else if(st.mode==="empty")body=`<h3>Nothing on the timegrapher${hrs}</h3><p>Make a piece on the Build tab, or put a customer's watch on from the Shop tab's repairs.</p>`;
  else if(st.mode==="making"){const j=pieceJob();body=`<h3>No. ${p.no} is being assembled${hrs}</h3><p>${fmtN(j?j.h:0,0)} h of assembly left. Close week (Career tab) to put your hours into it.</p>
<div class="row"><button class="btn" data-tc="scrap">Scrap it</button></div>`;}
  else if(st.mode==="away")body=`<h3>No. ${p.no} is away${hrs}</h3><p>At the ${SIM.CERT[p.trial.tier].body} for its ${SIM.CERT[p.trial.tier].name} trial: back ${whenTxt(p.trial.back-1)}.</p>`;
  else{const last=p.lastTrial;body=`<h3>${pieceName(p.cfg,p.no)}${hrs}</h3><p>${p.cert?`Best so far: ${SIM.CERT[p.cert].name}. Case it to sell it or deliver it.`:"Adjust it, then a Bench check at least before it can be sold."}</p>
<div class="row">${last?`<button class="btn" data-tc="last">Last trial</button>`:""}<button class="btn${p.cert?" pri":""}" data-tc="case"${p.cert?"":" disabled"}>Case it…</button><button class="btn ghost" data-tc="scrap">Scrap</button></div>`;}
  el.innerHTML=body;}
function renderTest(){
  const st=tgState(),T=st.tool;TG.st=st;renderTestCareer(st);
  const live=st.mode==="piece"||st.mode==="repair";
  $("adjCard").hidden=$("certCard").hidden=st.mode!=="piece";
  if(st.mode!=="piece"){
    const d=st.stopped?"—":null;
    $("tgRead").innerHTML=`<div${gA("rate")}><span>Rate</span><b>${d||sgn(st.rate,0)}<small> s/d</small></b></div><div${gA("amplitude")}><span>Amplitude</span><b>${d||Math.round(st.amp)}<small>°</small></b></div>`+
      `<div${gA("beat")}><span>Beat error</span><b>${d||st.beat.toFixed(1)}<small> ms</small></b></div><div${gA("bph")}><span>Beat</span><b>${live?(st.bph/1000).toFixed(1):"—"}<small>k bph</small></b></div>`;
    $("tgMach").textContent=`${T.name} · ${POS_NAME[st.pos].toLowerCase()}${st.mode==="repair"?" · a customer's watch":" · nothing running"}`;
    $("tgSnd").textContent=S.sound?"Tick on":"Tick off";
    $("tgPos").innerHTML=segBtns(SIM.POSITIONS.map(k=>[k,k]),st.pos,"pos",v=>!T.positions.includes(v));$("tgPosHint").hidden=true;$("tgTempF").hidden=true;
    $("tgWind").innerHTML=segBtns([[0,"Full wind"],[24,"After 24 h"]],st.t,"wind");$("tgLift").innerHTML=segBtns(LIFTS.map(v=>[v,v+"°"]),S.tg.lift,"lift");
    $("simOut").textContent=st.r?`A customer's ${st.r.cfg.winding==="automatic"?"automatic":"hand-wound"} at ${st.r.bph.toLocaleString("en-GB")} bph.`:"Nothing on the machine.";
    visSync();return;}
  const p=curPiece();
  const certTxt=p.cert?`${SIM.CERT[p.cert].name}${SIM.CERT[p.cert].stamp?" · "+SIM.CERT[p.cert].stamp:""}`:"";
  $("tgRead").innerHTML=
    `<div${gA("rate")}><span>Rate</span><b class="${Math.abs(st.rate)<=6?"ok":""}">${sgn(st.rate,T.timingRes>1?1:0)}<small> s/d</small></b></div>`+
    `<div${gA("amplitude")}><span>Amplitude</span><b>${Math.round(st.amp)}<small>°</small></b></div>`+
    `<div${gA("beat")}><span>Beat error</span><b>${st.beat.toFixed(T.timingRes>1?2:1)}<small> ms</small></b></div>`+
    `<div${gA("bph")}><span>Beat</span><b>${(st.bph/1000).toFixed(1)}<small>k bph</small></b></div>`;
  $("tgMach").textContent=`${T.name} · ${POS_NAME[st.pos].toLowerCase()} · ${st.temp} °C · ${st.t?"24 h after winding":"full wind"}`;
  $("tgSnd").textContent=S.sound?"Tick on":"Tick off";$("tgSnd").setAttribute("aria-pressed",!!S.sound);
  $("tgPos").innerHTML=segBtns(SIM.POSITIONS.map(k=>[k,k]),st.pos,"pos",v=>!T.positions.includes(v));
  const posHint=$("tgPosHint");posHint.hidden=T.positions.length>1;
  if(T.positions.length===1){const six=toolFor(t=>t.positions.length>1);posHint.textContent=`Your ${T.name.toLowerCase()} reads dial up only. The other positions need the ${six.name.toLowerCase()} (Shop), but the trial tests five of them.`;}
  $("tgTempF").hidden=!T.temps;
  if(T.temps)$("tgTemp").innerHTML=segBtns(SIM.TEMPS.map(k=>[k,TEMP_NAME[k],k+" °C"]),st.temp,"temp");
  $("tgWind").innerHTML=segBtns([[0,"Full wind"],[24,"After 24 h"]],st.t,"wind");
  $("tgLift").innerHTML=segBtns(LIFTS.map(v=>[v,v+"°"]),S.tg.lift,"lift");
  /* adjust */
  const reg=SIM.part("regulator",st.r.cfg.regulator),step=reg.adjustRes,f=x=>(+x.toFixed(2)).toString();
  $("regRes").textContent=`· ${reg.name.toLowerCase()}, ${f(step)} s/d a notch`;
  $("regBtns").innerHTML=[[-5,`−${f(step*5)}`,"slower"],[-1,`−${f(step)}`,"slower"],[1,`+${f(step)}`,"faster"],[5,`+${f(step*5)}`,"faster"]].map(([n,l,s])=>
    `<button type="button" data-reg="${n}">${l}<small>${s}</small></button>`).join("");
  const atFloor=st.r.beatErr-st.m.beatFloor<.01,poised=p.adjust.poise>=.95-1e-9;
  $("adjBeat").innerHTML=atFloor?"Beat as even as you can get it":`Adjust beat <small>${SIM.hoursFor("beat")} h</small>`;$("adjBeat").disabled=atFloor;
  $("adjPoise").innerHTML=poised?"Balance fully poised":`Poise the balance <small>${SIM.hoursFor("poise")} h</small>`;$("adjPoise").disabled=poised;
  $("adjHrs").textContent=p.hours?`${(+p.hours.toFixed(1))} h on this piece`:"";
  const L=skillLvls();$("adjSkills").textContent=`Skills: regulating ${L.regulating} · poising ${L.poising} · assembly ${L.assembly}. Every press costs bench time and teaches you a little.`;
  /* certify */
  $("certNow").textContent=certTxt;
  $("certBtns").innerHTML=SIM.CERT_ORDER.map(id=>{const C=SIM.CERT[id];
    return `<button class="btn cert${p.cert&&SIM.CERT_ORDER.indexOf(p.cert)>=SIM.CERT_ORDER.indexOf(id)?" got":""}" data-cert="${id}"><b>${id==="bench"?"Bench check":C.name}</b>`+
      `<small>${id==="bench"?"Your own fifteen days. Free.":`${C.body}${C.stamp&&C.stamp!==C.body?" ("+C.stamp+")":""} · ${fmt$(C.fee)} · ${C.weeks} weeks${inCareer()?"":" (free in the Sandbox)"}`}</small></button>`;}).join("");
  /* the raw numbers */
  const r=st.r,row=k=>SIM.POSITIONS.map(q=>sgn(r.rates[q][k]).padStart(6)).join("");
  $("simOut").textContent=[
    `Amplitude   ${Math.round(r.amp0)}° full wind · ${Math.round(r.amp24)}° at 24 h`,
    `Reserve     ${Math.round(r.reserveH)} h`,
    `Beat        ${r.bph.toLocaleString("en-GB")} bph · beat error ${r.beatErr.toFixed(2)} ms (floor ${st.m.beatFloor.toFixed(2)})`,
    ``,
    `Rate s/day  `+SIM.POSITIONS.map(q=>q.padStart(6)).join(""),
    `  0 h       `+row("t0"),
    ` 24 h       `+row("t24"),
    `Mean ${sgn(r.rateMean24)} · spread ${r.posSpread24.toFixed(1)} · 8→38 °C ${r.tempSpread.toFixed(1)} s/day`,
    `Adjusted    regulator ${sgn(p.adjust.reg)} s/d · beat ${Math.round(p.adjust.beat*100)}% · poise ${Math.round(p.adjust.poise*100)}%`,
    ``,
    `Shock ${(r.shock*100).toFixed(0)}% · magnet resistance ${(r.magnetResist*100).toFixed(0)}% · returns ${(r.returnRisk*100).toFixed(0)}%/yr`,
    `${r.thickness.toFixed(1)} mm · ${r.parts} parts · ${fmt$(r.cost)} parts · ${Math.round(r.hours)} h · prestige ${r.prestige}`,
    ``,
    ...(r.stress.length?r.stress.map(s=>({bad:"✖ ",warn:"▲ ",info:"· "}[s.sev])+s.text):["No stress lines: a sound build."])
  ].join("\n");
  visSync();}
TAB_RENDER.test=function(){renderTest();tgStart();};
TAB_LEAVE.test=tgStop;

function levelToast(k,l){if(l)toast(`${SKILLS[k].name} up to level ${l}.`);}
function adjDone(kind,n){const p=curPiece(),k=kind==="poise"?"poising":"regulating";hud();
  p.hours+=SIM.hoursFor(kind);levelToast(k,gainXp(k,SIM.ADJ.xp[kind]));
  save();const was=TG.st;renderTest();tickSet();
  tgMark(kind==="reg"?sgn(TG.st.rate-was.rate,1):kind==="beat"?"beat":"poise");}
function onTap(id,fn){$(id).addEventListener("click",e=>{WATCH_SOUND.unlock();fn(e);});}
/* in a career every press spends your bench hours this week */
const canAdj=kind=>{if(spendHours(SIM.hoursFor(kind)))return true;toast("No bench hours left this week: close the week on the Career tab.");return false;};
onTap("regBtns",e=>{const b=e.target.closest("[data-reg]");if(!b||!canAdj("reg"))return;const p=curPiece();
  p.adjust=SIM.adjustPiece("reg",p.adjust,pieceCfg(),skillLvls(),+b.dataset.reg,p.seed+"#"+(p.n++));adjDone("reg");});
onTap("adjBeat",()=>{if(!canAdj("beat"))return;const p=curPiece();p.adjust=SIM.adjustPiece("beat",p.adjust,pieceCfg(),skillLvls(),0,p.seed+"#"+(p.n++));adjDone("beat");});
onTap("adjPoise",()=>{if(!canAdj("poise"))return;const p=curPiece();p.adjust=SIM.adjustPiece("poise",p.adjust,pieceCfg(),skillLvls(),0,p.seed+"#"+(p.n++));adjDone("poise");});
onTap("tgPos",e=>{const b=e.target.closest("[data-pos]");if(!b)return;
  if(b.classList.contains("lock")){toast(`Needs the ${toolFor(t=>t.positions.length>1).name.toLowerCase()} (Shop).`);return;}
  if(S.tg.pos===b.dataset.pos)return;S.tg.pos=b.dataset.pos;save();renderTest();tickSet();tgMark(S.tg.pos);});
onTap("tgTemp",e=>{const b=e.target.closest("[data-temp]");if(!b)return;S.tg.temp=+b.dataset.temp;save();renderTest();tgMark(b.dataset.temp+"°");});
onTap("tgWind",e=>{const b=e.target.closest("[data-wind]");if(!b)return;S.tg.wind=+b.dataset.wind;save();renderTest();tickSet();tgMark(S.tg.wind?"24 h":"wound");});
onTap("tgLift",e=>{const b=e.target.closest("[data-lift]");if(!b)return;S.tg.lift=+b.dataset.lift;save();renderTest();});
onTap("tgSnd",()=>{S.sound=!S.sound;save();renderTest();tickSet();});

/* ---------- certification ---------- */
/* where each failed check gets fixed: a control on this tab (this piece), a Build row (the next piece) or a Shop upgrade.
   label is the button; when() leaves a target out (an upgrade you own, the Shop in the Sandbox) */
const CERT_FIX={
  mean:[{tab:"test",sel:"#regBtns",label:"Regulate"}],
  maxVar:[{tab:"build",sec:"beat",slot:"regulator",label:"Regulator"},{tab:"build",sec:"beat",slot:"bph",label:"Beat rate"}],
  posSpread:[{tab:"test",sel:"#adjPoise",label:"Poise"},{tab:"shop",up:"timing-six",label:"Six-position timing machine",when:()=>inCareer()&&!upOwned("timing-six")}],
  thermal:[{tab:"build",sec:"balance",slot:"hairspring",label:"Hairspring"}],
  beat:[{tab:"test",sel:"#adjBeat",label:"Adjust beat"},{tab:"build",sec:"beat",slot:"regulator",label:"Regulator"}],
  amp24:[{tab:"build",sec:"barrel",label:"Barrel"},{tab:"build",sec:"train",label:"Train & jewels"},{tab:"build",sec:"balance",slot:"balance",label:"Balance"}]
};
const certFixes=k=>(CERT_FIX[k]||[]).filter(f=>!f.when||f.when());
/* go there: switch tab, open the row or the upgrades list, scroll it to the middle and ring it for a moment */
function goFix(f){closeSheet();showTab(f.tab);
  if(f.sec){S.bOpen=f.sec;save();renderBuildForm();}
  requestAnimationFrame(()=>{let el=null;
    if(f.sec){const h=document.querySelector(`#buildForm [data-sec="${f.sec}"]`);el=f.slot&&document.querySelector(`#buildForm [data-slot="${f.slot}"]`)||h&&h.closest(".acc");}
    else if(f.up){const d=document.querySelector("#shopBody details.shup");if(d)d.open=true;el=document.querySelector(`#shopBody [data-upid="${f.up}"]`);}
    else el=document.querySelector(f.sel);
    if(!el)return;el.scrollIntoView({block:f.sec?"start":"center",behavior:reduced()?"auto":"smooth"});
    el.classList.remove("fixhi");void el.offsetWidth;el.classList.add("fixhi");setTimeout(()=>el.classList.remove("fixhi"),2400);});}
function fixHtml(res){const bad=res.checks.filter(c=>!c.ok&&certFixes(c.k).length);if(!bad.length)return"";
  const later=inCareer()&&bad.some(c=>certFixes(c.k).some(f=>f.tab==="build"));
  return `<div class="fixes"><h4>Where to fix it</h4>${bad.map(c=>`<div class="fixrow"><span>${c.label}</span><div class="row">${certFixes(c.k).map((f,i)=>`<button type="button" class="btn sm" data-fix="${c.k}:${i}">${f.label} →</button>`).join("")}</div></div>`).join("")}
${later?`<p class="hint">Build rows change your next piece: this one's parts are fixed. Regulate, Adjust beat and Poise work on this one.</p>`:""}</div>`;}
function trialSheet(t,id){const C=SIM.CERT[id],res=t.tiers[id];
  const days=t.days.map((d,i)=>`<tr><td>${i+1}</td><td>${POS_NAME[d.pos]}</td><td>${d.temp} °C</td><td>${sgn(d.rate)}</td></tr>`).join("");
  openSheet(id==="bench"?"Bench check":`${C.name} trial`,`
<p class="verdict ${res.pass?"pass":"fail"}">${res.pass?"✓ ":"✖ "}${SIM.verdict(t,id)}</p>
<table class="checks"><thead><tr><th>Check</th><th>Result</th><th>Limit</th><th></th></tr></thead><tbody>
${res.checks.map(c=>`<tr class="${c.ok?"ok":"no"}"><td>${c.label}</td><td>${c.val}</td><td>${c.lim}</td><td>${c.ok?"✓":"✖"}</td></tr>`).join("")}
</tbody></table>
${res.pass?"":fixHtml(res)}
<details class="raw"><summary>The fifteen days</summary><table class="checks days"><tbody>${days}</tbody></table></details>
<div class="row" style="margin-top:14px"><button class="btn pri" id="certOk">Back to the bench</button></div>`);
  $("certOk").addEventListener("click",closeSheet);certSheetBtn(t,id);
  document.querySelectorAll("[data-fix]").forEach(b=>b.addEventListener("click",()=>{const [k,i]=b.dataset.fix.split(":");goFix(certFixes(k)[+i]);}));}
onTap("certBtns",e=>{const b=e.target.closest("[data-cert]");if(!b)return;
  const id=b.dataset.cert,C=SIM.CERT[id],p=curPiece(),tool=ownedTool();
  if(inCareer()&&id!=="bench"){
    openSheet(`Send No. ${p.no} for trial`,`<p>The ${C.body} keeps it for ${C.weeks} weeks: fifteen days of timing, then the paperwork. The fee is ${fmt$(C.fee)}, pass or fail.</p>
<p class="hint">You have ${fmt$(car().cash)}. While it's away your bench waits for it: work on repairs, trade and R&D.</p>
<div class="row"><button class="btn pri" id="trialGo">Send it (${fmt$(C.fee)})</button><button class="btn" id="trialNo">Not yet</button></div>`);
    $("trialNo").addEventListener("click",closeSheet);
    $("trialGo").addEventListener("click",()=>{if(sendTrial(id)){closeSheet();hud();renderTest();toast(`No. ${p.no} is on its way to the ${C.body}.`);}});
    return;}
  const t=SIM.runTrial(pieceCfg(),skillLvls(),trialTools(),{seed:p.seed,adjust:p.adjust,trialSeed:p.seed+"t"+(p.subs++)});
  const res=t.tiers[id];
  if(res.pass&&(!p.cert||SIM.CERT_ORDER.indexOf(id)>SIM.CERT_ORDER.indexOf(p.cert)))p.cert=id;
  if(!p.xpDone){p.xpDone=true;const r=pieceSim();
    levelToast("assembly",gainXp("assembly",4));
    if(r.complexity)levelToast("complications",gainXp("complications",r.complexity));
    if(r.cfg.finish.length)levelToast("finishing",gainXp("finishing",2*r.cfg.finish.length));}
  save();renderTest();trialSheet(t,id);});

/* ---------- the career card ---------- */
$("tgCar").addEventListener("click",e=>{const b=e.target.closest("[data-tc]");if(!b)return;const k=b.dataset.tc,c=car();
  if(k==="off"){S.tgOn=null;save();renderTest();tickSet();}
  if(k==="fix")fixSheet(S.tgOn.id);
  if(k==="scrap")confirmSheet(`Scrap No. ${c.bench.no}?`,`Take it apart and keep ${Math.round(BIZ.scrap*100)}% of the parts' value. The hours are gone.`,"Scrap it",()=>{scrapPiece();hud();renderTest();});
  if(k==="case")caseSheet();
  if(k==="last"){const T=c.bench.lastTrial;c.bench.seen=true;save();trialSheet(T.t,T.tier);}});
