/* ===================== app/bench.js: the Bench tab =====================
   The 3D movement on the bench: visSync() hands the vis the current build (setMovement) and how it is running right now
   (setRun: the amplitude, beat rate and beat error the timegrapher would show), and is called whenever any of those
   change. The tab card names the movement and switches the view: Assembled / Exploded, and the loupe on the escapement
   (a double tap on the view does the same; the vis tells us through onView). Under it, This week (renderBenchTodo):
   repairs waiting, your piece, stock, and buttons to the tab for each and to Close week.
   roomSync() tells the vis what the workshop round the bench looks like (setRoom): the career stage and the machines
   owned. It runs from visSync and from every save(), and costs nothing when nothing changed (the vis compares). */
function roomSpec(){const c=car();
  if(!c||c.over)return{stage:c?"corner":"shop",has:c?{timing:"basic"}:{timing:"lab",cleaning:true,lathe:true,polishing:true}};   // the Sandbox: a well-kitted shop
  const u=upOwned,shop=c.kind==="shop"||u("shop");
  const stage=u("cnc")&&u("cleanroom")?"manufacture":shop&&(u("mill")||u("cnc")||u("bench2"))?"workshop":shop?"shop":"corner";
  return{stage,has:{timing:u("timing-lab")?"lab":u("timing-six")?"six":"basic",cleaning:u("cleaning"),lathe:u("lathe"),polishing:u("polishing"),
    mill:u("mill"),cnc:u("cnc"),bench2:u("bench2"),window:u("window"),climate:u("climate"),cleanroom:u("cleanroom")}};}
function roomSync(){if(!window.WATCH_VIS||!WATCH_VIS.setRoom)return;try{WATCH_VIS.setRoom(roomSpec());}catch(e){}}
function visSync(){
  if(!window.WATCH_VIS)return;
  roomSync();
  try{WATCH_VIS.setMovement(S.cfg);const st=runState();WATCH_VIS.setRun({amp:st.amp,bph:st.bph,beatErr:st.beat,wound:true});}catch(e){}
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
const BENCH_VIEWS=[["home","Assembled"],["exploded","Exploded"]];
function renderBench(){
  const v=window.WATCH_VIS?WATCH_VIS.view:"home";
  $("bView").innerHTML=segBtns(BENCH_VIEWS,v==="exploded"?"exploded":"home","view");
  const lb=$("bLoupe");lb.classList.toggle("on",v==="loupe");lb.setAttribute("aria-pressed",String(v==="loupe"));
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
  if(c.stock.length)lines.push(`${c.stock.length} in stock`);
  el.innerHTML=`<h3>This week<span class="cnt">${c.year} · week ${c.week}</span></h3><ul class="todo">${lines.map(l=>`<li>${l}</li>`).join("")}</ul>
<div class="row">${rin?`<button class="btn" data-bt="shop">Repairs</button>`:""}<button class="btn" data-bt="${p?"test":"build"}">${p?"Test tab":"Build tab"}</button><button class="btn pri" data-bt="close">Close week</button></div>`;}
$("bTodo").addEventListener("click",e=>{const b=e.target.closest("[data-bt]");if(!b)return;const k=b.dataset.bt;if(k==="close")doCloseWeek();else showTab(k);});
TAB_RENDER.bench=renderBench;
onTap("bView",e=>{const b=e.target.closest("[data-view]");if(!b||!window.WATCH_VIS)return;WATCH_VIS.setView(b.dataset.view);renderBench();});
onTap("bLoupe",()=>{if(!window.WATCH_VIS)return;WATCH_VIS.setView(WATCH_VIS.view==="loupe"?"home":"loupe");renderBench();});
if(window.WATCH_VIS)WATCH_VIS.onView(()=>{if(curTab==="bench")renderBench();});
