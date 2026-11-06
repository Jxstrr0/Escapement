/* ===================== app/events.js: the calendar on the Career tab, and the event sheets =====================
   Cards (renderCareer in app/career.js strings them together): calendarCard (the fair, the trial, the next auction night,
   with their buttons), repCard, newsCard, goalsCard, rivalsCard. Sheets: fairSheet (book a stand), trialEntrySheet,
   raceSheet (the Kessel Peak Trial day by day, like a race), saleroomSheet (auction night, lot by lot, live bidding),
   crackFx (the cracked crystal over the screen when a piece comes back). The engine is app/calendar.js. Reduced motion:
   the race and the bidding jump to the end, the crack appears without the flash. */
const evMs=ms=>reduced()?0:ms;
let evTimer=null;
function evStop(){clearTimeout(evTimer);evTimer=null;}
function evRow(title,text,btn){return `<li><div><b>${title}</b><br><small>${text}</small></div>${btn?`<div class="acts">${btn}</div>`:""}</li>`;}
function calendarCard(){const c=car(),F=CALENDAR.fair,T=CALENDAR.trial,fs=fairState(),ts=trialState(),sn=saleNext(),rows=[];
  const free=c.stock.filter(pieceFree).length;
  { const lots=c.stock.filter(x=>x.lot).length;let t,b="";
    if(sn.now){t=`This week at ${CALENDAR.house}. ${lots?`${lots} of your pieces in the catalogue`:"None of your pieces consigned"}${c.sale.resale.length?`; ${c.sale.resale.length} of your old pieces come up again`:""}.`;b=`<button class="btn pri sm" data-ev="sale">Open the saleroom</button>`;}
    else{t=`${CALENDAR.house}, week ${sn.week} (${whenTxt(sn.at)}). ${canConsign()?`Consign pieces from stock on the Shop tab${lots?`: ${lots} consigned`:""}.`:`Consignments open ${CALENDAR.ahead} weeks before.`}`;
}
    rows.push({at:sn.at,h:evRow(`Auction night: the ${sn.name}`,t,b)});
    if(c.sale&&c.sale.done&&c.sale.wk===c.wk)rows.push({at:c.wk-.5,h:evRow(`Tonight: the ${c.sale.name}`,`${c.sale.results.length} lot${c.sale.results.length===1?"":"s"} of yours went under the hammer.`,`<button class="btn sm" data-ev="sale">Results</button>`)});}
  { let t,b="",at;const e=ts.entry;
    if(e&&e.res){t=`No. ${e.no} placed ${ordinal(e.res.place)} of ${e.res.field.length} with ${e.res.points} points${e.res.prize?`: ${fmt$(e.res.prize)}`:""}.`;b=`<button class="btn sm${e.seen?"":" pri"}" data-ev="race">Watch the trial</button>`;at=c.wk;}
    else if(e){t=`No. ${e.no} is up at Kessel Peak. Results in week ${T.back} (${whenTxt(wkAt(c.year,T.back))}).`;at=wkAt(c.year,T.back);}
    else if(ts.open){t=`Entries open until week ${T.close}: ${fmt$(T.fee)} to enter one piece from stock against the valley's best. Prizes ${T.prizes.map(fmt$).join(", ")}.`;
      b=`<button class="btn sm" data-ev="trial"${free?"":" disabled"}>Enter a piece…</button>`;if(!free)t+=" Case a piece first.";at=c.wk;}
    else{at=c.wk+ts.opensIn;t=`Entries open in week ${T.open} (${whenTxt(at)}). Thirty days at the Observatory against five rival shops.`;}
    rows.push({at,h:evRow(`The ${T.name}`,t,b)});}
  { let t,b="";
    if(fs.entered)t=`Your stand: ${c.fair.ids.map(id=>{const x=stockBy(id);return x?"No. "+x.no:"";}).filter(Boolean).join(", ")||"empty"}. Week ${F.week} (${whenTxt(fs.at)}).`;
    else if(fs.open){t=`Week ${F.week} (${whenTxt(fs.at)}). A stand costs ${fmt$(F.fee)}: show up to ${F.show} pieces from stock to visitors, collectors and trade buyers.`;b=`<button class="btn sm" data-ev="fair"${free?"":" disabled"}>Book a stand…</button>`;if(!free)t+=" You need a piece in stock.";}
    else t=`Week ${F.week} (${whenTxt(fs.at)}). Stands can be booked ${F.ahead} weeks before.`;
    rows.push({at:fs.at,h:evRow(`The ${F.name}`,t,b)});}
  rows.sort((a,b)=>a.at-b.at);
  return `<div class="card"><h3>Coming up</h3><ul class="shlist ev">${rows.map(r=>r.h).join("")}</ul></div>`;}
function repCard(){
  return `<div class="card"><h3>Reputation</h3><ul class="shlist rep3">${Object.keys(REP_TRACKS).map(k=>{const R=REP_TRACKS[k],p=repOf(k),t=repTier(k),nx=REP_TIERS[t+1];
    const pct=nx?Math.round(100*(p-REP_TIERS[t].at)/(nx.at-REP_TIERS[t].at)):100;
    return `<li><div><b>${R.name}</b> <span class="tier">${REP_TIERS[t].name}</span><div class="bar" role="img" aria-label="${R.name}: ${Math.round(p)} points${nx?`, ${Math.round(nx.at-p)} to ${nx.name}`:""}"><i style="width:${pct}%"></i></div><small>${R.blurb}${nx?` ${Math.ceil(nx.at-p)} more to ${nx.name.toLowerCase()}.`:""}</small></div></li>`;}).join("")}</ul></div>`;}
function newsCard(){const c=car(),L=c.news.slice().reverse();if(!L.length)return "";
  const one=n=>{const N=NEWS[n.i];return `<div class="news${N.era?" era":""}"><small>${N.y} · week ${N.w}${n.wk===c.wk?' <span class="new">New</span>':""}</small><b>${N.title}</b><p>${N.text}</p></div>`;};
  return `<div class="card"><h3>News from the valley</h3>${L.slice(0,2).map(one).join("")}${L.length>2?`<details class="more"><summary>Older news (${L.length-2})</summary>${L.slice(2).map(one).join("")}</details>`:""}</div>`;}
function goalsCard(){const c=car(),ids=Object.keys(GOALS),n=ids.filter(id=>c.goals[id]!=null).length;
  return `<details class="card"><summary><h3>Goals<span class="cnt">${n} of ${ids.length}</span></h3></summary><ul class="shlist goals">${ids.map(id=>{const G=GOALS[id],w=c.goals[id];
    let when="";if(w!=null){const d=dateOf(w);when=` · ${d.year}, week ${d.week}`;}
    return `<li class="${w!=null?"got":""}"><span class="gtick" aria-hidden="true">${w!=null?"✓":""}</span><div><b>${G.name}</b><br><small>${G.blurb}${when}</small></div></li>`;}).join("")}</ul></details>`;}
function rivalsCard(){const c=car(),last=c.contests[c.contests.length-1];
  const placeOf=id=>{if(!last||!last.field)return "";const i=last.field.findIndex(f=>f[0]===id);return i<0?"":` · ${ordinal(i+1)} at Kessel Peak in ${last.year}`;};
  return `<details class="card"><summary><h3>Rival shops<span class="cnt">${RIVALS.length}</span></h3></summary><ul class="shlist">${RIVALS.map(rv=>`<li><div><b>${rv.name}</b><br><small>${rv.style}${placeOf(rv.id)}</small></div></li>`).join("")}</ul>
${c.contests.length?`<p class="hint">Your trials: ${c.contests.map(t=>`${t.year} No. ${t.no}, ${ordinal(t.place)} of ${t.of}`).join(" · ")}</p>`:`<p class="hint">They enter the ${CALENDAR.trial.name} every spring and bid against each other at auction nights.</p>`}</details>`;}

/* ---- book a stand at the fair ---- */
function fairSheet(){const c=car(),F=CALENDAR.fair,L=c.stock.filter(pieceFree);
  openSheet(`The ${F.name}`,`<p>Week ${F.week}. Choose up to ${F.show} pieces for your stand. They stay in stock (sell them in the meantime and they leave the stand). Visitors buy at your asking price more readily than walk-ins; collectors and trade buyers stop to talk.</p>
<ul class="shlist fixes">${L.map(x=>`<li><label class="chk"><input type="checkbox" value="${x.id}"><span><b>${x.name}</b><br><small>${x.cert&&x.cert!=="bench"?SIM.CERT[x.cert].name+" · ":""}asking ${fmt$(x.price)}</small></span></label></li>`).join("")}</ul>
<div class="row"><button class="btn pri" id="frGo" disabled>Book the stand: ${fmt$(F.fee)}</button></div>`);
  const box=$("sheetBody"),sel=()=>[...box.querySelectorAll("input:checked")].map(i=>+i.value);
  box.addEventListener("change",()=>{const s=sel();box.querySelectorAll("input:not(:checked)").forEach(i=>i.disabled=s.length>=F.show);$("frGo").disabled=!s.length;});
  $("frGo").addEventListener("click",()=>{if(enterFair(sel())){closeSheet();shopChanged();}});}
/* ---- enter the trial ---- */
function trialEntrySheet(){const c=car(),T=CALENDAR.trial,L=c.stock.filter(pieceFree);
  openSheet(`The ${T.name}`,`<p>Thirty days at the Kessel Peak Observatory: four days in each of five positions, then cold, room and warm, then four days dial up. Every competitor scores points: the steadier and closer to zero, the more. What costs points: a mean rate away from zero, changes from day to day, differences between positions and, most of all, temperature.</p>
<ul class="shlist fixes">${L.map(x=>`<li><div><b>${x.name}</b><br><small>${x.cert?SIM.CERT[x.cert].name:"Unchecked"} · away from stock until week ${T.back}</small></div><div class="acts"><button class="btn sm" data-ent="${x.id}">Enter</button></div></li>`).join("")}</ul>
<p class="hint">Entry ${fmt$(T.fee)}. Regulate it close to zero on the timegrapher before you case it: the Observatory doesn't touch the regulator.</p>`);
  $("sheetBody").addEventListener("click",e=>{const b=e.target.closest("[data-ent]");if(!b)return;if(enterTrial(+b.dataset.ent)){closeSheet();shopChanged();}});}

/* ---- the trial, day by day ---- */
const POS_WORD={DU:"dial up",DD:"dial down",PU:"crown up",PD:"crown down",PL:"crown left",PR:"crown right"};
function raceSheet(){const c=car(),e=c.contest;if(!e||!e.res)return;const res=e.res,D=res.days.length;e.seen=true;save();
  const rows=res.field.map(f=>{const R=SIM.rng(res.seed+f.id),run=[];
    for(let d=1;d<=D;d++)run.push(f.id==="me"?res.running[d-1]:Math.round(f.points+(R()-.5)*260*Math.pow(1-d/D,.8)));return{f,run};});
  openSheet(`${CALENDAR.trial.name}, ${e.year}`,`<p class="race-day" id="rcDay">Day 0 of ${D}</p>
<div class="race" id="rcBoard" style="height:${rows.length*46}px">${rows.map((r,i)=>`<div class="rrow${r.f.id==="me"?" me":""}" data-i="${i}"><span class="rpl"></span><span class="rnm">${r.f.name}</span><span class="rpt">0</span><i class="rbar"></i></div>`).join("")}</div>
<div id="rcEnd"></div><div class="row"><button class="btn" id="rcSkip">Skip to the end</button></div>`);
  const els=[...$("rcBoard").children];
  const show=d=>{const pts=rows.map(r=>d?r.run[d-1]:0),ord=pts.map((p,i)=>i).sort((a,b)=>pts[b]-pts[a]);
    ord.forEach((i,rank)=>{const el=els[i];el.style.transform=`translateY(${rank*46}px)`;el.querySelector(".rpl").textContent=d?rank+1:"";el.querySelector(".rpt").textContent=pts[i];
      el.querySelector(".rbar").style.width=Math.max(0,Math.min(100,pts[i]/10))+"%";});
    const day=res.days[Math.max(0,d-1)];$("rcDay").textContent=d?`Day ${d} of ${D} · ${POS_WORD[day[0]]}, ${day[1]} °C`:`Day 0 of ${D}`;};
  const end=()=>{evStop();show(D);$("rcSkip").remove();const P=res.parts,W=SIM.CONTEST.w,cost={mean:W.mean*P.mean,vari:W.vari*P.vari,pos:W.pos*P.pos,thermal:W.thermal*P.thermal};
    const worst=Object.keys(cost).sort((a,b)=>cost[b]-cost[a])[0];
    const tip={mean:`Its average rate was ${P.mean.toFixed(1)} s/day off zero: regulate closer before you case it.`,vari:`It changed by ${P.vari.toFixed(1)} s/day from one day to the next: a steadier regulator and a faster beat help.`,
      pos:`It differed by ${P.pos.toFixed(1)} s/day between positions: poise it more.`,thermal:`Temperature moved it ${P.thermal.toFixed(2)} s/day per °C: a self-compensating alloy or silicon hairspring is the cure.`}[worst];
    $("rcEnd").innerHTML=`<p class="race-res"><b>${ordinal(res.place)} of ${res.field.length}</b> with ${res.points} points${res.prize?` · prize ${fmt$(res.prize)}`:""}.</p><p class="hint">${res.place===1?"The valley will be talking about this one. ":""}Where it lost most: ${tip}</p>`;};
  $("rcSkip").addEventListener("click",end);
  show(0);if(reduced()){end();return;}
  let d=0;const step=()=>{d++;show(d);if(d>=D){end();return;}evTimer=setTimeout(step,d<3?420:200);};evTimer=setTimeout(step,500);}

/* ---- auction night ---- */
function saleroomSheet(){const c=car(),sl=c.sale;if(!sl||sl.wk!==c.wk)return;const L=saleLots();save();
  const head=`<p class="hint" style="margin-top:0">${CALENDAR.house} keep ${Math.round(CALENDAR.fee*100)}% from the seller and add ${Math.round(CALENDAR.fee*100)}% for the buyer.</p>`;
  if(sl.i>=L.length){sl.done=true;save();
    openSheet(`The ${sl.name}`,`${L.length?`<ul class="wklines">${sl.results.map(r=>`<li>${r}</li>`).join("")}</ul>`:`<p>Nothing of yours in the catalogue tonight: you watch from the back and take notes on what the collectors chase.</p>`}<div class="row"><button class="btn pri" id="slOk">Done</button></div>`);
    $("slOk").addEventListener("click",()=>{closeSheet();shopChanged();});return;}
  const lot=L[sl.i],n=sl.i+1,F=CALENDAR.fee;
  const intro=lot.kind==="mine"?`Yours: value ${fmt$(lot.value)}, ${RESERVES.find(r=>r[0]===lot.reserve)[1].toLowerCase()}.`:`Your old piece: you sold it for ${fmt$(lot.was)} in ${dateOf(lot.swk).year}. Bid to buy it back, or watch what it makes.`;
  const bids=lot.kind==="resale"?[[0,"Just watch"],[1,"Bid to"],[1.25,"Bid to"],[1.5,"Bid to"]]:[[0,"Start the bidding"]];
  openSheet(`The ${sl.name}`,`${head}<div class="lot"><small>Lot ${n} of ${L.length}</small><b>${lot.name}</b><p>${lot.cert&&lot.cert!=="bench"?SIM.CERT[lot.cert].name+" · ":""}estimate ${fmt$(lot.est)}</p><p class="hint">${intro}</p></div>
<div class="row${bids.length>1?" bids4":""}" id="slBids">${bids.map(([f,l])=>{const max=Math.round(lot.est*f/50)*50,cost=Math.round(max*(1+F));return `<button class="btn${f?"":" pri"} sm" data-bid="${f}"${f&&cost>c.cash?" disabled":""}>${l}${f?` ${fmt$(max)}${f>1?`<small>+${Math.round((f-1)*100)}%</small>`:"<small>the estimate</small>"}`:""}</button>`;}).join("")}</div>
<div class="gavel" id="slRoom" aria-live="polite"></div><div class="row" id="slNext"></div>`);
  $("slBids").addEventListener("click",e=>{const b=e.target.closest("[data-bid]");if(!b)return;$("slBids").remove();
    const mine=Math.round(lot.est*+b.dataset.bid/50)*50,res=lotRun(lot,mine);sl.i++;const more=[];lotSettle(lot,res,more);save();
    const line=sl.results[sl.results.length-1],room=$("slRoom");let k=0;
    const fin=()=>{evStop();const last=res.steps[res.steps.length-1];
      room.innerHTML=`<p class="bidnow"><b>${fmt$(res.hammer)}</b> ${last[1]}</p><p class="hammer">${lot.kind==="mine"&&!res.sold?"Bought in.":`Sold to ${res.buyer}!`}</p><p>${line}</p>`;
      hud();const news=more.filter(m=>m!==line);if(news.length)toast(news.join(" "));
      $("slNext").innerHTML=`<button class="btn pri" id="slGo">${sl.i<L.length?"Next lot":"The night's results"}</button>`;$("slGo").addEventListener("click",saleroomSheet);};
    if(reduced()){fin();return;}
    const tick=()=>{if(!$("slRoom")){evStop();return;}if(k<res.steps.length){const [amt,who]=res.steps[k++];room.innerHTML=`<p class="bidnow"><b>${fmt$(amt)}</b> ${who}</p>`;evTimer=setTimeout(tick,k<2?600:380);return;}
      const say=["Going once…","Going twice…"],j=k++-res.steps.length;if(j<2){room.insertAdjacentHTML("beforeend",`<p class="going">${say[j]}</p>`);evTimer=setTimeout(tick,650);return;}fin();};
    tick();});}

/* ---- a piece comes back: a cracked crystal over the screen for a moment (an SVG, no images) ---- */
function crackFx(){let el=$("crack");if(!el){el=document.createElement("div");el.id="crack";el.setAttribute("aria-hidden","true");document.body.appendChild(el);}
  const R=SIM.rng(String(Date.now())),cx=50+(R()-.5)*30,cy=36+(R()-.5)*20,lines=[];
  for(let i=0;i<11;i++){let a=i/11*Math.PI*2+R()*.4,x=cx,y=cy,pts=[`${x.toFixed(1)},${y.toFixed(1)}`];
    for(let s=0;s<6;s++){a+=(R()-.5)*.6;const l=6+R()*12;x+=Math.cos(a)*l;y+=Math.sin(a)*l;pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);}lines.push(`<polyline points="${pts.join(" ")}"/>`);}
  for(let i=0;i<5;i++){const r=5+R()*9,a0=R()*6.28,a1=a0+.5+R()*.8;lines.push(`<path d="M${(cx+r*Math.cos(a0)).toFixed(1)},${(cy+r*Math.sin(a0)).toFixed(1)} A${r.toFixed(1)},${r.toFixed(1)} 0 0 1 ${(cx+r*Math.cos(a1)).toFixed(1)},${(cy+r*Math.sin(a1)).toFixed(1)}"/>`);}
  el.innerHTML=`<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"><g>${lines.join("")}</g></svg>`;
  el.classList.remove("on");void el.offsetWidth;el.classList.add("on");clearTimeout(crackFx.t);crackFx.t=setTimeout(()=>el.classList.remove("on"),1900);}
