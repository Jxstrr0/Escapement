/* ===================== app/help.js: help and the tutorial =====================
   Three things, last file of the app script block:
   1. The coach-card tour (TUT): starts by itself on a new Repair bench career and walks one customer's watch through
      the timegrapher, the diagnosis and Close week, then points at the Build tab and Settings. A small card sits over
      the bottom of the 3D view (so it never covers the panel) and a brass ring marks what to tap. Most steps move on by
      themselves when you do the thing (tutKick runs after every save()); Skip ends it at any time, Settings → Help
      replays it. State lives in the career: c.tut (finished or skipped), c.tutStep, c.tutRep (the watch it follows).
   2. The glossary (GLOSS) and the Help sheet (helpSheet, from Settings).
   3. Tap-to-explain: anything carrying data-g="<key>" (the timegrapher readouts, the Build capsule, a few labels)
      opens that entry. gA(key) writes the attributes. */

/* ---- glossary: short and plain; grouped for the Help sheet ---- */
const GLOSS={
  rate:{t:"Rate",g:"Timegrapher",d:"How many seconds a day the watch gains (+) or loses (−). On the trace it is the slope: lines climbing to the right run fast, falling run slow. Regulate moves it in small notches."},
  amplitude:{t:"Amplitude",g:"Timegrapher",d:"How far the balance swings each way, in degrees. A healthy watch swings 270° to 310° fully wound. Low amplitude means a tired mainspring, dirty oil or friction; very high can make it knock."},
  beat:{t:"Beat error",g:"Timegrapher",d:"The difference between the tick and the tock, in milliseconds. On the trace it is the gap between the two lines. Under 0.5 ms is good; over 2 ms sounds limping. Adjust beat brings it down."},
  bph:{t:"Beat (bph)",g:"Timegrapher",d:"Beats per hour: how fast the balance ticks. 28,800 bph is eight ticks a second; 21,600 is six. Faster is steadier against knocks but wears the escapement more and uses more power."},
  lift:{t:"Lift angle",g:"Timegrapher",d:"The part of each swing where the pallet fork pushes the balance. The timegrapher needs it to work out amplitude. Most movements are 52°; set the wrong one and amplitude reads wrong (the rate does not change)."},
  positions:{t:"Positions",g:"Timegrapher",d:"A watch runs differently lying flat and standing up, because gravity pulls on the balance. DU dial up, DD dial down, and the four crown positions (CU, CD, CL, CR). The trial tests five; a basic timing machine only reads dial up."},
  temperature:{t:"Temperature",g:"Timegrapher",d:"Warm springs go soft and the watch slows. A steel hairspring drifts about 0.7 s/day per °C; an alloy or silicon spring far less. The BCH trial allows 0.6, the Observatory 0.3."},
  wind:{t:"Wind",g:"Timegrapher",d:"A full mainspring pushes harder than one that has run 24 hours. Checking both shows how well the watch holds its rate as it runs down (isochronism)."},
  iso:{t:"Isochronism",g:"Movement",d:"Keeping the same rate whether the balance swings wide or narrow. A good hairspring (an overcoil, silicon) and a steady mainspring keep the rate flat from full wind to empty."},
  reserve:{t:"Power reserve",g:"Movement",d:"How long the watch runs on a full wind, in hours. A bigger barrel, or two, runs longer; a faster beat or heavy complications use it up quicker."},
  hairspring:{t:"Hairspring",g:"Movement",d:"The fine coiled spring that brings the balance back each swing: the heart of the timekeeping. Its alloy decides how much the rate drifts with heat and magnets."},
  balance:{t:"Balance",g:"Movement",d:"The wheel that swings to and fro and keeps the time, with the hairspring. Screws or weights on its rim let you poise it so it runs the same in every position."},
  escapement:{t:"Escapement",g:"Movement",d:"The escape wheel and pallet fork: it lets the gear train move one tooth per tick and gives the balance a small push each time. Where most of the power is lost."},
  regulate:{t:"Regulating",g:"Movement",d:"Moving the regulator (or turning the balance's weights on a free-sprung balance) to make the watch run a little faster or slower. Fixes the rate dial up; it doesn't fix the positions."},
  poise:{t:"Poising",g:"Movement",d:"Taking weight off the heavy side of the balance so it is perfectly even. An unpoised balance runs at different rates standing up; poising narrows the spread between positions."},
  jewels:{t:"Jewels",g:"Movement",d:"Synthetic rubies used as bearings where pivots turn, so they wear less and need less oil. More jewels where they matter means a longer life between services."},
  shock:{t:"Shock protection",g:"Movement",d:"A spring setting around the balance jewels that lets the fragile pivots move and spring back when the watch is knocked, instead of snapping."},
  magnetism:{t:"Magnetism",g:"Movement",d:"Magnets from phones, bags and speakers stick the hairspring's coils together and the watch races. Silicon and some alloys don't care."},
  thickness:{t:"Thickness",g:"Movement",d:"How tall the movement is, in millimetres. Thin pieces fit dress cases and sell to collectors; a rotor, a tourbillon or a chronograph adds height."},
  prestige:{t:"Prestige",g:"Movement",d:"How much a collector cares about what's inside: fine finishing, complications, in-house parts, your own calibre. It raises the price a buyer will pay."},
  cost:{t:"Parts cost",g:"Business",d:"What the parts for one movement cost you, paid when you press Make. Your own in-house parts and calibre bring it down."},
  hours:{t:"Bench hours",g:"Business",d:"The work to assemble one movement. You have so many hours a week; staff add theirs. Close week puts the hours into the work in hand, in order."},
  certodds:{t:"Cert odds",g:"Business",d:"The chance a carefully adjusted piece of this build passes each grade (regulated to the middle of the window, beat set, poised). Your skills raise it; the parts set its ceiling."},
  cert:{t:"Certificates",g:"Business",d:"The Haldis Chronometry Bureau (stamp BCH) tests a movement for fifteen days in five positions and three temperatures and grants Chronometer. The Kessel Peak Observatory grants the stricter Observatory grade. Both multiply a piece's value."},
  week:{t:"Close week",g:"Business",d:"Nothing moves until you close the week: you act first (repairs, adjusting, buying), then Close week does the work, brings customers and pays the rent."},
  rep:{t:"Reputation",g:"Business",d:"Three names to make: with collectors, with the trade, and in the press. Good work, sales and prizes raise them; they fade a little each week. Better commissions open as they grow."},
  stress:{t:"Stress report",g:"Business",d:"Parts that fight each other: a heavy balance on a weak spring, a thin movement with a big rotor. Serious ones (✖) hurt the timekeeping or the life of the watch."},
};
const gA=k=>` data-g="${k}" role="button" tabindex="0" title="What's this?"`;
function glossHtml(k,open){const G=GLOSS[k];return `<details class="gl"${open?" open":""} id="gl-${k}"><summary>${G.t}</summary><p>${G.d}</p></details>`;}
function glossSheet(k){if(!GLOSS[k])return;const G=GLOSS[k];
  openSheet(G.t,`<p class="glone">${G.d}</p><div class="row"><button class="btn" id="glAll">All of help</button></div>`);
  $("glAll").addEventListener("click",()=>helpSheet(k));}
function helpSheet(at){const c=car(),groups={};for(const k in GLOSS)(groups[GLOSS[k].g]=groups[GLOSS[k].g]||[]).push(k);
  const tour=c&&!c.over?`<div class="row"><button class="btn pri" id="tutAgain">${c.tutStep!=null?"Back to the tour":"Take the tour again"}</button></div><p class="hint">One customer's watch from the timegrapher to Close week, about two minutes.</p>`
    :`<p class="hint" style="margin-top:0">The tour runs in a Repair bench career: start one from New game (Career tab).</p>`;
  openSheet("Help",`<div class="field"><span class="lbl">The tour</span>${tour}</div>
${Object.keys(groups).map(g=>`<div class="field"><span class="lbl">${g}</span>${groups[g].map(k=>glossHtml(k,k===at)).join("")}</div>`).join("")}
<p class="hint">Tip: tap a readout on the Test tab, or a total on the Build tab, to open its entry.</p>`);
  if($("tutAgain"))$("tutAgain").addEventListener("click",()=>{closeSheet();tutStart(true);});
  if(at&&$("gl-"+at))$("gl-"+at).scrollIntoView({block:"center"});}
document.addEventListener("click",e=>{const g=e.target.closest("[data-g]");if(g&&!e.target.closest("button:not([data-g]),a,input"))glossSheet(g.dataset.g);});
document.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches&&e.target.matches("[data-g]")){e.preventDefault();glossSheet(e.target.dataset.g);}});

/* ---- the tour ---- */
var tutReady=false;   // save() calls tutKick from the first load on; nothing here may run before this file has
const tutIn=()=>car().repairs.some(r=>r.state==="in");
const tutFixing=()=>car().repairs.find(r=>r.state==="fixing");
function tutResult(){const c=car(),r=repairBy(c.tutRep);return !r?"paid":r.state==="in"?"wrong":"fixing";}
/* one step: tab it belongs to, sel (a selector, or {tab: selector}) for the ring, go() the tab "Show me" opens,
   done() moves on by itself, next (a button label) for steps you only read */
const TUT=[
  {tab:"shop",sel:'[data-sh="tg"]',title:"Your first repair",
    text:()=>tutIn()?"A customer has left a watch that isn't running right. Tap <b>Timegrapher</b> to put it on the machine.":"No watches are in just now. Close week and customers bring some in.",
    done:()=>(S.tgOn&&S.tgOn.kind==="repair")||!!tutFixing()},
  {tab:"test",sel:"#tgRead",title:"Read the trace",next:"Got it",
    text:"Each dot is one tick. Lines climbing to the right run fast; falling, slow. Two lines far apart is beat error. The four numbers above the trace say the same in figures: here is what each one means.",
    done:()=>!!tutFixing()},
  /* the four readouts, one card each (the numbers every check and fault is judged by) */
  {tab:"test",sel:"#tgRead > div:nth-child(1)",title:"Rate",next:"Next",
    text:"Seconds a day the watch gains (+) or loses (−). A sold piece needs to be within ±30 s/d; a Chronometer certificate −4 to +6; the Observatory −1 to +2. <b>Regulate</b> moves it in small notches.",
    done:()=>!!tutFixing()},
  {tab:"test",sel:"#tgRead > div:nth-child(2)",title:"Amplitude",next:"Next",
    text:"How far the balance swings each way, in degrees. 270° to 310° fully wound is healthy. Low means a tired mainspring, dirty oil or friction. A Chronometer must still swing 220° after a day off the winder.",
    done:()=>!!tutFixing()},
  {tab:"test",sel:"#tgRead > div:nth-child(3)",title:"Beat error",next:"Next",
    text:"How uneven the tick and the tock are, in milliseconds: the gap between the two lines. Under 0.5 ms is good, over 2 ms it limps. A Chronometer needs 0.8 or less. <b>Adjust beat</b> brings it down.",
    done:()=>!!tutFixing()},
  {tab:"test",sel:"#tgRead > div:nth-child(4)",title:"Beat",next:"Got it",
    text:"Ticks an hour, in thousands: 28.8k is eight ticks a second. A faster beat keeps steadier time but wears the parts and uses the spring up sooner. Tap any readout later to see this again.",
    done:()=>!!tutFixing()},
  {tab:"test",sel:{test:'[data-tc="fix"]',shop:'[data-sh="fix"]'},go:()=>S.tgOn?"test":"shop",title:"Diagnose it",
    text:"Match what you saw to a fault: tap <b>Diagnose and fix</b> and pick the one that fits. Each says how it shows on the trace.",
    done:()=>!!tutFixing()},
  {id:"close",tab:"shop",sel:{shop:'[data-sh="close"]',career:'[data-cr="close"]'},title:"Close the week",
    text:"The fix is in your work in hand. Tap <b>Close week</b> and your bench hours go into it. Nothing moves until you do.",
    done:()=>car().tutRep!=null&&tutResult()!=="fixing"},
  {tab:null,title:()=>tutResult()==="wrong"?"Not that one":"Paid",next:()=>tutResult()==="wrong"?"Try again":"Next",
    text:()=>tutResult()==="wrong"?"It wasn't that fault, so the watch is back in Repairs, still wrong. You know one thing it isn't: put it on the timegrapher again and choose another fix.":"The watch went back working and the customer paid. Repairs pay the rent while you learn.",
    then:()=>tutResult()==="wrong"?0:tutIdx("make")},
  {id:"make",tab:"build",sel:"#bCap",title:"Make your own",next:"Next",
    text:"Between repairs, design a movement here, part by part: every option shows what it would change. The numbers on top are the design as it stands; here is what they mean."},
  /* the Build capsule, cell by cell */
  {tab:"build",sel:"#bCap > div:nth-child(1)",title:"Rate",next:"Next",
    text:"The slowest and fastest this design runs across every position, temperature and state of wind, in s/d, before regulating. A narrow band is a steady design: regulating moves the whole band, it can't narrow it."},
  {tab:"build",sel:"#bCap > div:nth-child(2)",title:"Reserve",next:"Next",
    text:"Hours it runs from a full wind. 40 h is ordinary, 70 h and more is a selling point. A bigger barrel adds hours; a faster beat or heavy complications use them up."},
  {tab:"build",sel:"#bCap > div:nth-child(3)",title:"Parts and hours",next:"Next",
    text:"<b>Parts</b> is what the parts cost you, paid when you make it. <b>Hours</b> is bench time to assemble it: your hours each week go into it at Close week."},
  {tab:"build",sel:"#bCap > div:nth-child(5)",title:"Cert odds",next:"Next",
    text:"The chance a carefully adjusted piece of this design passes each grade: your Bench, the Bureau's Chronometer, the Observatory. When a trial fails, the result sheet has a button for each check that failed, straight to the part or control that fixes it."},
  {tab:"build",sel:"#bMake",title:"Make it",next:"Next",
    text:"<b>Make this piece</b> puts it on your bench. Adjust it on the Test tab and sell it from the Shop."},
  {tab:null,sel:"#setOpen",title:"That's the bench",next:"Finish",
    text:"Each week: repairs in, work on your piece, then Close week. Goals on the Career tab point the way. Help, a glossary and this tour are under the cog."},
];
let tutEl=null,tutSpotEl=null,tutTimer=0,tutScrolled=-1,tutTab="";
const tutOn=()=>{const c=S.career;return !!c&&!c.over&&c.tutStep!=null&&!c.tut;};
function tutDom(){if(tutEl)return;
  tutEl=document.createElement("div");tutEl.id="coach";tutEl.hidden=true;tutEl.setAttribute("role","region");tutEl.setAttribute("aria-label","Tour");
  tutEl.innerHTML=`<div class="cotop"><span id="coStep"></span><button type="button" class="btn sm ghost" id="coSkip">Skip tour</button></div><b id="coTitle"></b><p id="coText" aria-live="polite"></p><div class="row" id="coActs"></div>`;
  tutSpotEl=document.createElement("div");tutSpotEl.id="coSpot";tutSpotEl.hidden=true;tutSpotEl.setAttribute("aria-hidden","true");
  $("view").appendChild(tutEl);$("app").appendChild(tutSpotEl);
  $("coSkip").addEventListener("click",()=>tutEnd(true));
  $("coActs").addEventListener("click",e=>{const b=e.target.closest("[data-co]");if(!b)return;const c=car(),T=TUT[c.tutStep];
    if(b.dataset.co==="go"){showTab(T.go?T.go():T.tab);tutScrolled=-1;tutShow();return;}
    if(T.then){tutTo(T.then());return;}
    if(c.tutStep>=TUT.length-1){tutEnd(false);return;}tutTo(c.tutStep+1);});
  $("panel").addEventListener("scroll",()=>{if(tutOn())tutPlace();},{passive:true});
  addEventListener("resize",()=>{if(tutOn())tutPlace();});}
const tutVal=v=>typeof v==="function"?v():v;
const tutIdx=id=>TUT.findIndex(T=>T.id===id);   // steps are found by id, so cards can be added without renumbering
function tutSel(T){if(!T.sel)return null;if(typeof T.sel==="string")return T.sel;return T.sel[curTab]||null;}
function tutTarget(T){const s=tutSel(T);if(!s)return null;const el=document.querySelector(s);if(!el||!el.getClientRects().length)return null;
  if(el.closest(".tabpage")&&!el.closest(".tabpage.on"))return null;return el;}
function tutStart(again){const c=car();if(!c||c.over)return;c.tut=false;if(again||c.tutStep==null){c.tutStep=0;c.tutRep=null;}tutScrolled=-1;save();tutShow();}
function tutEnd(skipped){const c=car();if(c){c.tut=true;c.tutStep=null;save();}tutHide();if(skipped)toast("Tour skipped. It's in Settings → Help any time.");else toast("Have a good week at the bench.");}
function tutTo(n){const c=car();c.tutStep=Math.max(0,Math.min(TUT.length-1,n));tutScrolled=-1;save();tutShow();}
function tutHide(){if(tutEl){tutEl.hidden=true;tutSpotEl.hidden=true;$("view").classList.remove("coach");}clearInterval(tutTimer);tutTimer=0;}
/* after any save(): move on while the current step's done() holds (a step can be done before you reach it) */
function tutKick(){if(!tutReady)return;if(!tutOn())return tutHide();const c=car();
  if(c.tutStep<tutIdx("close")){const f=tutFixing();if(f)c.tutRep=f.id;}   // the watch whose fix the tour follows
  let n=c.tutStep,g=0;while(n<TUT.length&&TUT[n].done&&TUT[n].done()&&g++<TUT.length)n++;
  if(n!==c.tutStep){c.tutStep=Math.min(n,TUT.length-1);tutScrolled=-1;}
  if(tutTab!==curTab){tutTab=curTab;tutScrolled=-1;}
  requestAnimationFrame(tutShow);}
function tutShow(){if(!tutOn())return tutHide();tutDom();const c=car(),T=TUT[c.tutStep];
  $("coStep").textContent=`${c.tutStep+1} of ${TUT.length}`;$("coTitle").textContent=tutVal(T.title);$("coText").innerHTML=tutVal(T.text);
  const want=T.go?T.go():T.tab,away=want&&curTab!==want&&!tutTarget(T),btns=[];
  if(away)btns.push(`<button type="button" class="btn sm pri" data-co="go">Show me</button>`);
  if(T.next)btns.push(`<button type="button" class="btn sm${away?"":" pri"}" data-co="next">${tutVal(T.next)}</button>`);
  $("coActs").innerHTML=btns.join("");$("coActs").hidden=!btns.length;
  tutEl.hidden=false;$("view").classList.add("coach");if(typeof buBarHide==="function")buBarHide();if(!tutTimer)tutTimer=setInterval(()=>{if(tutOn())tutPlace();else tutHide();},600);
  tutPlace();}
/* the ring: over the target while it is on screen inside the panel (or the HUD's cog); the first time a step's target
   shows, scroll the panel so it sits in view */
function tutPlace(){if(!tutEl||tutEl.hidden)return;const T=TUT[car().tutStep],el=tutTarget(T),sp=tutSpotEl;
  if(!el||sheetOn()){sp.hidden=true;return;}
  const pan=$("panel"),inPanel=pan.contains(el),A=$("app").getBoundingClientRect();let r=el.getBoundingClientRect();
  if(inPanel&&tutScrolled!==car().tutStep){tutScrolled=car().tutStep;const P=pan.getBoundingClientRect(),room=P.height-(parseFloat(getComputedStyle(pan).paddingBottom)||0);
    const top=r.top-P.top,want=Math.max(12,(room-r.height)/3);if(top<12||top+r.height>room-8){pan.scrollTo({top:pan.scrollTop+top-want,behavior:reduced()?"auto":"smooth"});setTimeout(tutPlace,reduced()?0:420);}
    r=el.getBoundingClientRect();}
  if(inPanel){const P=pan.getBoundingClientRect(),tb=$("tabs").getBoundingClientRect().top;if(r.bottom<P.top+4||r.top>tb-4){sp.hidden=true;return;}}
  const pad=5;sp.style.left=(r.left-A.left-pad)+"px";sp.style.top=(r.top-A.top-pad)+"px";sp.style.width=(r.width+pad*2)+"px";sp.style.height=(r.height+pad*2)+"px";sp.hidden=false;}
/* the intro's "Start at the repair bench" button: a Repair bench career and the tour */
function introBench(){S.seen=true;newCareer("bench");$("intro").hidden=true;applyAll();showTab("shop");toast("2000: a shared bench in the Haldis.");}
if($("introBench"))$("introBench").addEventListener("click",introBench);
tutReady=true;
</script>
