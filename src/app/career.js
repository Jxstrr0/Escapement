/* ===================== app/career.js: the Career tab =====================
   The week (Close week and its report), New game (Repair bench 2000, Skip ahead 2008, or the Sandbox), the bank's loan
   and the end of a career, and the three save slots ("esc-slot1" .. "esc-slot3": a whole game each; loading one keeps
   this device's settings). The calendar, reputation, news, goals and rivals cards and the event sheets are in app/events.js
   (PR 6); the R&D card is app/rnd.js (PR 7). */
function renderCareer(){const el=$("careerBody"),c=car();let h="";
  if(!c)h=`<div class="card"><h3>Start a career</h3><p>You're in the Sandbox: every part, no money. A career starts with a bench, a little cash and the rent to pay.</p><div class="row"><button class="btn pri" data-cr="new">New game</button></div></div>`;
  else if(c.over)h=`<div class="card"><h3>The workshop is closed</h3><p>It ran from ${c.start} to ${c.year}: ${c.made} piece${c.made===1?"":"s"} made, ${c.sold.length} sold. The bank wouldn't lend twice.</p><div class="row"><button class="btn pri" data-cr="new">Start again</button></div></div>`;
  else{const done=c.sold.length,cert=Object.keys(c.certs).map(k=>`${c.certs[k]} ${SIM.CERT[k].name}`).join(", ");
    h=`<div class="card"><h3>${c.year} · week ${c.week}<span class="cnt">${fmtN(hoursFree(),1)} h free</span></h3>
<p>${c.kind==="shop"?"Your shop on the Haldis high street":upOwned("shop")?"Your shop on the high street":"A shared bench in a rented corner of a workshop"}, since ${c.start}. ${fmt$(c.cash)} in the till; ${fmt$(weeklyCosts())} a week goes out.</p>
<p class="hint">${c.made} made · ${done} sold${cert?" · certificates: "+cert:""}${c.loan?` · loan ${fmt$(c.loan.left)} left`:""}</p>
${c.cash<2*weeklyCosts()?`<p class="hint lockt">${c.cash<weeklyCosts()?"Not enough in the till for next week's costs.":"Two weeks of costs or less in the till."} ${c.loanUsed?"The bank won't lend again: below zero, the workshop closes.":"Below zero, the Haldis Savings Bank lends once."} Repairs and trade bring cash in fastest.</p>`:""}
<div class="row"><button class="btn pri" data-cr="close">Close week</button>${c.lastWeek?`<button class="btn" data-cr="last">Last week</button>`:""}${c.ended!=null?`<button class="btn" data-cr="end">Career summary</button>`:""}</div>
<p class="hint">Act first (repairs, adjusting, buying), then close the week: the work gets done, buyers come by, the rent is paid.</p></div>`;
    h+=rndCard()+calendarCard()+repCard()+newsCard()+goalsCard()+certsCard()+rivalsCard();}
  h+=slotsCard();
  if(c)h+=`<div class="row"><button class="btn ghost" data-cr="new">New game…</button></div>`;
  el.innerHTML=h;}
TAB_RENDER.career=renderCareer;
$("careerBody").addEventListener("click",e=>{const v=e.target.closest("[data-ev]");
  if(v){const k=v.dataset.ev;if(k==="fair")fairSheet();if(k==="trial")trialEntrySheet();if(k==="race")raceSheet();if(k==="sale")saleroomSheet();return;}
  const b=e.target.closest("[data-cr]");if(!b)return;const k=b.dataset.cr,i=+b.dataset.i;
  if(k==="close")doCloseWeek();
  if(k==="last")lastWeekSheet();
  if(k==="end")endSheet();
  if(k==="new")newGameSheet();
  if(k==="ssave"){const m=slotMeta(i);if(m)confirmSheet(`Save over slot ${i}?`,`It holds ${m.what}.`,"Save here",()=>slotSave(i));else slotSave(i);}
  if(k==="sload")confirmSheet(`Load slot ${i}?`,"The game you're playing now is replaced (save it to another slot first if you want it).","Load it",()=>slotLoad(i));
  if(k==="sdel")confirmSheet(`Empty slot ${i}?`,"The game saved there is gone for good (unless it's in a backup code).","Empty it",()=>{try{localStorage.removeItem(slotKey(i));}catch(e){}renderCareer();});});

/* ---- New game ---- */
function newGameSheet(){const has=inCareer();
  openSheet("New game",`${has?`<p class="hint" style="margin-top:0">This replaces the career you're playing. Save it to a slot first (Career tab) if you want to come back to it.</p>`:""}
<ul class="shlist fixes"><li><div><b>Repair bench, 2000</b><br><small>A shared bench in a rented corner, a basic timing machine and ${fmt$(BIZ.starts.bench.cash)}. Repairs pay the rent while you learn.</small></div><div class="acts"><button class="btn sm pri" data-ng="bench">Start</button></div></li>
<li><div><b>Skip ahead to 2008</b><br><small>Your own shop, the six-position timing machine, a cleaning machine, ${fmt$(BIZ.starts.shop.cash)} and some skill behind you.</small></div><div class="acts"><button class="btn sm" data-ng="shop">Start</button></div></li>
<li><div><b>Sandbox</b><br><small>No money and no calendar: every part to try. Your career, if any, is put away (it stays in its save slots).</small></div><div class="acts"><button class="btn sm" data-ng="sandbox">Open</button></div></li></ul>`);
  $("sheetBody").addEventListener("click",e=>{const b=e.target.closest("[data-ng]");if(!b)return;const k=b.dataset.ng;
    if(has)confirmSheet(k==="sandbox"?"Put this career away?":"Start a new career?",k==="sandbox"?"Your career is put away: it's gone unless it's in a save slot or a backup code.":"The career you're playing is replaced. Save it to a slot first (Career tab) if you want to come back to it.",k==="sandbox"?"Open the Sandbox":"Start it",()=>newGameGo(k));
    else{closeSheet();newGameGo(k);}});}
function newGameGo(k){closeSheet();
    if(k==="sandbox"){S.career=null;S.bAll=true;S.tgOn=null;S.piece=null;save();toast("The Sandbox: every part on offer.");}
    else{newCareer(k);toast(k==="shop"?"2008: your own shop in the Haldis.":"2000: a shared bench in the Haldis. Customers' watches are waiting in the Shop tab.");}
    applyAll();showTab(k==="sandbox"?"build":"shop");}

/* ---- Close week ---- */
function doCloseWeek(sure){const c=car();if(!c||c.over)return;
  if(c.cash<0&&!c.loanUsed){loanSheet();return;}   // the bank sheet was closed without an answer: ask again before the week moves
  /* unused hours are lost at Close week: ask first when a day or more is free and something could use it (playtest, 1.1.2.3) */
  if(sure!==true){const free=hoursFree(),rin=c.repairs.filter(r=>r.state==="in").length,p=c.bench,adj=p&&p.made&&!p.trial&&!p.cert;
    if(free>=8&&(rin||adj)){confirmSheet("Hours left this week",`You have <b>${Math.floor(free)} bench hours</b> with nothing queued, and ${rin?`${rin} repair${rin>1?"s":""} waiting for a diagnosis`:`No. ${p.no} still to adjust`}. Hours you don't use are gone when the week closes.`,"Close week anyway",()=>doCloseWeek(true),"Go back");return;}}
  const was={year:c.year,week:c.week,cash:c.cash};
  sfx("chime");if(typeof WORKSHOP_SOUND!=="undefined")WORKSHOP_SOUND.hold();   // sound/workshop.js: the bell and the till wait for the clock's strokes
  let res;try{res=closeWeek();}finally{if(typeof WORKSHOP_SOUND!=="undefined")WORKSHOP_SOUND.release(2.9,1.6);}if(!res)return;hud();
  c.lastWeek={week:was.week,year:was.year,d:c.cash-was.cash,cash:c.cash,lines:res.lines.slice(0,40)};   // "Last week" on the Career card shows it again
  if(res.broke){if(!c.loanUsed){loanSheet(amt=>{res.lines.unshift(`The Haldis Savings Bank lent you ${fmt$(amt)}.`);c.lastWeek.lines=res.lines.slice(0,40);c.lastWeek.d=c.cash-was.cash;c.lastWeek.cash=c.cash;save();weekSheet(was,res);});return;}goBroke();brokeSheet();return;}
  weekSheet(was,res);if(TAB_RENDER[curTab])TAB_RENDER[curTab]();}
function weekSheet(was,res){const c=car(),d=c.cash-was.cash;
  openSheet(`Week ${was.week} closed`,`<p class="weekd ${d<0?"neg":""}">${d>=0?"+":"−"}${fmt$(Math.abs(d))} · now ${fmt$(c.cash)}</p>
<ul class="wklines">${res.lines.map(l=>`<li>${l}</li>`).join("")||"<li>A quiet week.</li>"}<li class="dim">Rent ${fmt$(rent())} · your keep ${fmt$(BIZ.keep)}${wages()?` · wages ${fmt$(wages())}`:""}${c.loan?` · loan ${fmt$(c.loan.pay)}`:""}</li></ul>
<div class="row"><button class="btn pri" id="wkOk">Week ${c.week}, ${c.year}</button></div>`);
  $("wkOk").addEventListener("click",closeSheet);
  if(res.end){const row=document.createElement("div");row.className="row";row.innerHTML=`<button class="btn pri" id="wkEnd">Your career summary</button>`;
    $("wkOk").before(row.firstChild);$("wkOk").className="btn";$("wkEnd").addEventListener("click",endSheet);}
  const fx=calFx;if(fx.crack)crackFx();
  if(fx.trial){const row=document.createElement("div");row.className="row";row.innerHTML=`<button class="btn" id="wkRace">Watch the ${CALENDAR.trial.name}</button>`;
    $("sheetBody").appendChild(row);$("wkRace").addEventListener("click",raceSheet);}
  if(c.sale&&c.sale.wk===c.wk&&!c.sale.done){const row=document.createElement("div");row.className="row";row.innerHTML=`<button class="btn" id="wkSale">Go to the ${c.sale.name}</button>`;
    $("sheetBody").appendChild(row);$("wkSale").addEventListener("click",saleroomSheet);}
  /* a trial result: only in the week it came back (it used to repeat every week until tapped); it stays on the Test tab and in the Shop */
  for(const p of [c.bench,...c.away])if(p&&p.lastTrial&&p.backWk===c.wk){const row=document.createElement("div");row.className="row";const b=document.createElement("button");b.className="btn";
    b.textContent=`See No. ${p.no}'s trial result`;row.appendChild(b);$("sheetBody").appendChild(row);b.addEventListener("click",()=>{p.seen=true;save();trialSheet(p.lastTrial.t,p.lastTrial.tier);});}}
function lastWeekSheet(){const c=car(),L=c&&c.lastWeek;if(!L)return;
  openSheet(`Week ${L.week}, ${L.year}`,`<p class="weekd ${L.d<0?"neg":""}">${L.d>=0?"+":"−"}${fmt$(Math.abs(L.d))} · then ${fmt$(L.cash)}</p>
<ul class="wklines">${L.lines.map(l=>`<li>${l}</li>`).join("")||"<li>A quiet week.</li>"}</ul>`);}
function loanSheet(after){const c=car(),amt=loanOffer(),L=BIZ.loan,total=Math.round(amt*(1+L.rate));
  openSheet("The Haldis Savings Bank",`<p>The till is ${fmt$(-c.cash)} short. The bank will lend you ${fmt$(amt)}: ${fmt$(total)} paid back at ${fmt$(Math.ceil(total/L.weeks))} a week for a year.</p>
<p class="hint">They lend once. Run out again and the workshop closes.</p>
<div class="row"><button class="btn pri" id="lnYes">Take the loan</button><button class="btn" id="lnNo">Close the workshop</button></div>`);
  $("lnYes").addEventListener("click",()=>{takeLoan();closeSheet();hud();if(TAB_RENDER[curTab])TAB_RENDER[curTab]();toast(`${fmt$(amt)} from the bank.`);if(after)after(amt);});
  $("lnNo").addEventListener("click",()=>{goBroke();closeSheet();brokeSheet();});}
function brokeSheet(){const c=car();hud();if(TAB_RENDER[curTab])TAB_RENDER[curTab]();
  openSheet("The workshop closes",`<p>${fmt$(-c.cash)} short and the bank won't lend again. The bench, the tools and the stock go to settle the rent.</p>
<p class="hint">${c.made} piece${c.made===1?"":"s"} made from ${c.start} to ${c.year}.</p><div class="row"><button class="btn pri" id="brNew">Start again</button><button class="btn" id="brNo">Not now</button></div>`);
  $("brNew").addEventListener("click",newGameSheet);$("brNo").addEventListener("click",closeSheet);}

/* ---- save slots: a whole game each. Loading keeps this device's settings (theme, graphics, motion, sound) ---- */
const KEEP_SETTINGS=["seen","theme","gfx","gfxAuto","reduce","sound","wsound","rain","lastBackup"];
function slotRead(i){try{const j=localStorage.getItem(slotKey(i));if(!j)return null;const o=JSON.parse(j);return buObjS(o)&&buObjS(o.cfg)?o:null;}catch(e){return null;}}
function slotMeta(i){const o=slotRead(i);if(!o)return null;const c=o.career;
  return{what:c?`${c.over?"a closed workshop":"a career"}, ${c.year||START_YEAR} week ${c.week||1}, ${fmt$(c.cash||0)}`:"the Sandbox",at:o.savedAt};}
function slotSave(i){const o=snapshot();o.savedAt=Date.now();try{localStorage.setItem(slotKey(i),JSON.stringify(o));}catch(e){toast("Couldn't save: the phone's storage is full.");return;}
  buSaved();renderCareer();toast(`Saved to slot ${i}.`);}
function slotLoad(i){const o=slotRead(i);if(!o){toast("That slot is empty.");return;}const keep={};for(const k of KEEP_SETTINGS)keep[k]=S[k];
  if(!hydrate(o)){toast("That save didn't read right.");return;}Object.assign(S,keep);delete S.savedAt;save();applyAll();showTab(S.tab||"bench");toast(`Slot ${i} loaded.`);}
function slotsCard(){let h=`<div class="card"><h3>Save slots</h3><ul class="shlist">`;
  for(let i=1;i<=SLOTS;i++){const m=slotMeta(i),when=m&&m.at?new Date(m.at).toLocaleDateString("en-GB",{day:"numeric",month:"short"}):"";
    h+=`<li><div><b>Slot ${i}</b><br><small>${m?`${capWord(m.what)}${when?" · saved "+when:""}`:"Empty"}</small></div>
<div class="acts h"><button class="btn sm" data-cr="ssave" data-i="${i}">Save</button>${m?`<button class="btn sm" data-cr="sload" data-i="${i}">Load</button><button class="btn sm ghost" data-cr="sdel" data-i="${i}" aria-label="Empty slot ${i}">✕</button>`:""}</div></li>`;}
  return h+`</ul><p class="hint">Slots live on this phone. A backup code (Shop tab) carries them all to another one.</p></div>`;}
