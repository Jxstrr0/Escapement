/* ===================== app/bench.js: the Bench tab =====================
   The 3D movement on the bench: visSync() hands the vis the current build (setMovement) and how it is running right now
   (setRun: the amplitude, beat rate and beat error the timegrapher would show), and is called whenever any of those
   change. The tab card names the movement and switches the view: Assembled / Exploded, and the loupe on the escapement
   (a double tap on the view does the same; the vis tells us through onView), and Dial side: the movement cased and turned
   dial up (watchSpec sends setWatch: the case to try, S.dialCase, the complications, the words on the dial). Under it, This week (renderBenchTodo):
   repairs waiting, your piece, stock, and buttons to the tab for each and to Close week.
   roomSync() tells the vis what the workshop round the bench looks like (setRoom): the career stage and the machines
   owned. It runs from visSync and from every save(), and costs nothing when nothing changed (the vis compares).
   It also calls wsSync(), which tells the workshop sounds (sound/workshop.js) the setting, whether the ambience may play
   and whether the cleaning machine is in the room; sfx(name) plays one of its one-shots. */
function roomSpec(){const c=car();
  if(!c||c.over)return{stage:c?"corner":"shop",has:c?{timing:"basic"}:{timing:"lab",cleaning:true,lathe:true,polishing:true}};   // the Sandbox: a well-kitted shop
  const u=upOwned,shop=c.kind==="shop"||u("shop");
  const stage=u("cnc")&&u("cleanroom")?"manufacture":shop&&(u("mill")||u("cnc")||u("bench2"))?"workshop":shop?"shop":"corner";
  return{stage,has:{timing:u("timing-lab")?"lab":u("timing-six")?"six":"basic",cleaning:u("cleaning"),lathe:u("lathe"),polishing:u("polishing"),
    mill:u("mill"),cnc:u("cnc"),bench2:u("bench2"),window:u("window"),climate:u("climate"),cleanroom:u("cleanroom")}};}
function roomSync(){wsSync();if(!window.WATCH_VIS||!WATCH_VIS.setRoom)return;try{WATCH_VIS.setRoom(roomSpec());}catch(e){}}
/* the workshop sounds (sound/workshop.js): on with the setting; the ambience rests while the page is hidden and under the
   timegrapher's tick on the Test tab; the cleaning machine runs once you own one. sfx(name) plays a one-shot */
function wsSync(){if(typeof WORKSHOP_SOUND==="undefined")return;try{const c=car();WORKSHOP_SOUND.set({on:S.wsound!==false,amb:!document.hidden&&!(curTab==="test"&&S.sound),rain:S.rain===true,
    room:{cleaning:!!roomSpec().has.cleaning,staff:!!(c&&c.staff.length),fair:!!(c&&c.week===CALENDAR.fair.week)}});}catch(e){}}
function sfx(name,delay){if(S.wsound===false||typeof WORKSHOP_SOUND==="undefined")return;try{WORKSHOP_SOUND.play(name,delay);}catch(e){}}
document.addEventListener("visibilitychange",wsSync);
/* browsers only let audio start inside a tap: for a finger that is pointerup / touchend, not pointerdown (1.1.2.0: on phones the
   sounds could stay silent when only pointerdown was listened to), so every gesture event unlocks (GESTURES, app/test.js) */
for(const ev of GESTURES)document.addEventListener(ev,()=>{if(S.wsound!==false&&typeof WORKSHOP_SOUND!=="undefined"){WORKSHOP_SOUND.unlock();wsSync();}},{passive:true,capture:true});
function visSync(){
  if(!window.WATCH_VIS)return;
  roomSync();
  try{WATCH_VIS.setMovement(S.cfg);if(WATCH_VIS.setWatch)WATCH_VIS.setWatch(watchSpec());const st=runState();WATCH_VIS.setRun({amp:st.amp,bph:st.bph,beatErr:st.beat,wound:true});}catch(e){}
  benchTag();if(typeof curTab!=="undefined"&&curTab==="bench")renderBench();}
/* how the movement on the bench swings: the timegrapher's reading when it is your piece there (built as designed),
   else the design's own numbers at full wind */
function runState(){const st=tgState();if(st.mode==="piece"&&(!inCareer()||car().bench.key===JSON.stringify(S.cfg)))return st;
  const r=bSim(S.cfg);return{amp:r.amp0,bph:r.bph,beat:r.beatErr};}
/* the one-line name of the movement, e.g. "28,800 bph · 21 jewels · hand-wound · date" */
function benchLine(){const c=SIM.normCfg(S.cfg).cfg,P=(s,id)=>SIM.part(s,id)||{};
  const comps=(c.complications||[]).map(id=>(P("complications",id).short||P("complications",id).name||id).toLowerCase());
  return [(+c.bph).toLocaleString("en-GB")+" bph",c.jewels+" jewels",c.winding==="automatic"?"automatic":"hand-wound"].concat(comps).join(" · ");}
function benchTag(){const t=$("tag");if(t&&window.WATCH_VIS)t.textContent=benchLine();}
const BENCH_VIEWS=[["home","Assembled"],["exploded","Exploded"],["dial","Dial side"]];
/* the Dial side view: the movement cased and turned over. Each case comes with its own dial (CASES); before you case a
   piece you can try them all here (S.dialCase, a preview only). The hands tell the time where you are. */
const DIAL_CASES=[["steel-dress","Steel","dress"],["steel-sport","Steel","sports"],["gold-dress","Gold","dress"],["gold-big","Gold","display"],["platinum","Platinum","guilloché"]];
function watchSpec(){const c=SIM.normCfg(S.cfg).cfg,comps=c.complications||[],p=inCareer()&&car().bench;
  const cert=p&&p.cert&&p.cert!=="bench"&&p.key===JSON.stringify(S.cfg)?SIM.CERT[p.cert].name.split(" ")[0]:"";
  return{caseId:CASES[S.dialCase]?S.dialCase:"steel-dress",comps,top:"HALDIS",
    mid:cert||(comps.includes("tourbillon")?"Tourbillon":c.winding==="automatic"?"Automatic":""),foot:"Velmark"};}
function renderBench(){
  const v=window.WATCH_VIS?WATCH_VIS.view:"home";
  $("bView").innerHTML=segBtns(BENCH_VIEWS,v==="exploded"||v==="dial"?v:"home","view");
  $("bCaseF").hidden=v!=="dial";$("bDialHint").hidden=v!=="dial";
  if(v==="dial")$("bCase").innerHTML=segBtns(DIAL_CASES,CASES[S.dialCase]?S.dialCase:"steel-dress","case");
  const lb=$("bLoupe");lb.hidden=v==="dial";lb.classList.toggle("on",v==="loupe");lb.setAttribute("aria-pressed",String(v==="loupe"));
  lb.textContent=v==="loupe"?"Back to the whole movement":"Loupe on the escapement";
  const r=bSim(S.cfg),st=runState();
  $("bNow").innerHTML=`<b>${benchLine()}</b><br>Swinging ${Math.round(st.amp)}° at ${(+st.bph).toLocaleString("en-GB")} beats an hour · beat error ${st.beat.toFixed(1)} ms · ${Math.round(r.reserveH)} h reserve`;
  renderBenchTodo();}
/* the week at a glance: what is waiting, with a button to each tab that deals with it */
function renderBenchTodo(){const el=$("bTodo"),c=car();
  if(!c){el.innerHTML=`<h3>The Sandbox</h3><p>Every part on offer and nothing costs money. A career brings customers' repairs, the rent and the trials.</p><div class="row"><button class="btn" data-bt="career">Start a career</button></div>`;return;}
  if(c.over){el.innerHTML=`<h3>The workshop is closed</h3><div class="row"><button class="btn pri" data-bt="career">Career tab</button></div>`;return;}
  const rin=c.repairs.filter(r=>r.state==="in").length,p=c.bench,lines=[];
  lines.push(rin?`${rin} repair${rin>1?"s":""} waiting for a diagnosis`:"No repairs waiting");
  lines.push(!p?"Your bench is free for a piece of your own":!p.made?`No. ${p.no} is being assembled`:p.trial?`No. ${p.no} is away at a trial`:p.cert?`No. ${p.no} is ready to case`:`No. ${p.no} needs adjusting and a Bench check`);
  for(const x of c.away)lines.push(x.trial?`No. ${x.no} is away at a trial, back ${whenTxt(x.trial.back-1)}`:`No. ${x.no} is back from its trial and waiting (Shop)`);
  if(c.stock.length)lines.push(`${c.stock.length} in stock`);
  el.innerHTML=`<h3>This week<span class="cnt">${c.year} · week ${c.week}</span></h3><ul class="todo">${lines.map(l=>`<li>${l}</li>`).join("")}</ul>
<div class="row">${rin?`<button class="btn" data-bt="shop">Repairs</button>`:""}<button class="btn" data-bt="${p?"test":"build"}">${p?"Test tab":"Build tab"}</button><button class="btn pri" data-bt="close">Close week</button></div>`;}
$("bTodo").addEventListener("click",e=>{const b=e.target.closest("[data-bt]");if(!b)return;const k=b.dataset.bt;if(k==="close")doCloseWeek();else showTab(k);});
TAB_RENDER.bench=renderBench;
onTap("bView",e=>{const b=e.target.closest("[data-view]");if(!b||!window.WATCH_VIS)return;WATCH_VIS.setView(b.dataset.view);renderBench();});
onTap("bCase",e=>{const b=e.target.closest("[data-case]");if(!b||!CASES[b.dataset.case])return;S.dialCase=b.dataset.case;save();visSync();});
onTap("bLoupe",()=>{if(!window.WATCH_VIS)return;WATCH_VIS.setView(WATCH_VIS.view==="loupe"?"home":"loupe");renderBench();});
if(window.WATCH_VIS)WATCH_VIS.onView(()=>{if(curTab==="bench")renderBench();});
