/* ===================== app/bench.js: the Bench tab =====================
   The 3D movement on the bench: visSync() hands the vis the current build (setMovement) and how it is running right now
   (setRun: the amplitude, beat rate and beat error the timegrapher would show), and is called whenever any of those
   change. The tab card names the movement and switches the view: Assembled / Exploded, and the loupe on the escapement
   (a double tap on the view does the same; the vis tells us through onView). */
function visSync(){
  if(!window.WATCH_VIS)return;
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
  $("bNow").innerHTML=`<b>${benchLine()}</b><br>Swinging ${Math.round(st.amp)}° at ${(+st.bph).toLocaleString("en-GB")} beats an hour · beat error ${st.beat.toFixed(1)} ms · ${Math.round(r.reserveH)} h reserve`;}
TAB_RENDER.bench=renderBench;
onTap("bView",e=>{const b=e.target.closest("[data-view]");if(!b||!window.WATCH_VIS)return;WATCH_VIS.setView(b.dataset.view);renderBench();});
onTap("bLoupe",()=>{if(!window.WATCH_VIS)return;WATCH_VIS.setView(WATCH_VIS.view==="loupe"?"home":"loupe");renderBench();});
if(window.WATCH_VIS)WATCH_VIS.onView(()=>{if(curTab==="bench")renderBench();});
