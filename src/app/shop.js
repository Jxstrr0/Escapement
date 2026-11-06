/* ===================== app/shop.js: the Shop tab =====================
   Everything you sell and buy in a career (the engine is app/business.js): this week (cash, hours, Close week), the work
   in hand, repairs, your stock, commissions and trade, upgrades, staff and the books. In the Sandbox it offers a career.
   Sheets used from other tabs live here too: fixSheet (diagnose a repair), caseSheet (case a finished piece),
   confirmSheet. The Saves card (Back up / Restore, app/savecode.js) is at the bottom in both modes. */
const capWord=s=>s[0].toUpperCase()+s.slice(1);
const dealerPrice=x=>Math.round(x.value*BIZ.dealer/10)*10;
const PRICE_STEPS=[[-.2,"−20%"],[0,"Value"],[.2,"+20%"],[.5,"+50%"]];
const RESERVES=[[0,"No reserve"],[.8,"Reserve 80% of value"],[1,"Reserve at full value"]];
function weekCard(){const c=car();
  return `<div class="card shwk"><h3>${c.year} · week ${c.week}<span class="cnt">${fmtN(hoursLeft(),1)} of ${benchHours()} h left</span></h3>
<div class="kv"><span>Cash</span><b>${fmt$(c.cash)}</b><span>Costs a week</span><b>${fmt$(weeklyCosts())}</b><span>Staff</span><b>${c.staff.length} of ${staffCap()}</b></div>
<div class="row"><button class="btn pri" data-sh="close">Close week</button></div></div>`;}
function jobsCard(){const c=car();if(!c.jobs.length)return "";
  return `<div class="card"><h3>Work in hand<span class="cnt">${fmtN(c.jobs.reduce((a,j)=>a+j.h,0),0)} h</span></h3><ul class="shlist">${c.jobs.map(j=>
    `<li><span>${j.label}${j.staff?"":" <small>(you)</small>"}</span><b class="num">${fmtN(j.h,1)} h</b></li>`).join("")}</ul>
<p class="hint">Close week puts your hours left, and your staff's, into these in order. Staff take repairs and trade work.</p></div>`;}
function repairsCard(){const c=car(),L=c.repairs;
  return `<div class="card"><h3>Repairs<span class="cnt">${L.length}</span></h3>${L.length?`<ul class="shlist rep">${L.map(r=>{const on=S.tgOn&&S.tgOn.id===r.id;
    return `<li><div><b>${capWord(r.watch)}</b> <small>· ${r.cust}</small><br><small>“${FAULTS[r.fault].complaint}” · ${r.state==="fixing"?`being fixed: ${FAULTS[r.trying].fix.toLowerCase()}`:`collects ${whenTxt(r.due)}`}</small></div>
${r.state==="in"?`<div class="acts"><button class="btn sm${on?" pri":""}" data-sh="tg" data-id="${r.id}">${on?"On the machine":"Timegrapher"}</button><button class="btn sm" data-sh="fix" data-id="${r.id}">Fix…</button></div>`:""}</li>`;}).join("")}</ul>`
    :`<p>No watches in. Customers bring them in through the week.</p>`}
<p class="hint">Put a watch on the timegrapher to see what's wrong, then choose the fix. You're paid when it goes back working.</p></div>`;}
function benchCard(){const c=car(),p=c.bench;let t;
  if(!p)t=`<p>Your bench is free. Design a movement on the Build tab and press <b>Make this piece</b>.</p>`;
  else{const j=pieceJob();t=`<p><b>${pieceName(p.cfg,p.no)}</b><br>${!p.made?`Being assembled: ${fmtN(j?j.h:0,0)} h left.`:p.trial?`At the ${SIM.CERT[p.trial.tier].body}, back ${whenTxt(p.trial.back-1)}.`:p.cert?`${SIM.CERT[p.cert].name}. Ready to case.`:"Assembled: adjust it and give it a Bench check on the Test tab."}</p>
${p.made&&!p.trial?`<div class="row">${p.cert?`<button class="btn pri" data-sh="case">Case it…</button>`:""}<button class="btn" data-sh="test">Test tab</button></div>`:""}`;}
  return `<div class="card"><h3>On your bench</h3>${t}</div>`;}
function stockCard(){const c=car();if(!c.stock.length)return "";const d=demand(),sn=saleNext(),cc=canConsign();
  return `<div class="card"><h3>In stock<span class="cnt">${c.stock.length}</span></h3><ul class="shlist stk">${c.stock.map(x=>{const pr=x.price/x.value-1;
    const odds=SIM.buyChance(x.value,x.price)*Math.min(1,d);
    const state=x.away?`<small class="lockt">At the ${CALENDAR.trial.name} until week ${CALENDAR.trial.back}.</small>`
      :x.lot?`<small class="lockt">Consigned to the ${sn.name} (${sn.now?"this week":"week "+sn.week}), ${RESERVES.find(r=>r[0]===x.lot.reserve)[1].toLowerCase()}. Walk-in buyers don't see it.</small>`
      :`<div class="seg sm" data-stk="${x.id}">${PRICE_STEPS.map(([f,l])=>`<button type="button" data-pf="${f}" class="${Math.abs(pr-f)<.01?"on":""}">${l}</button>`).join("")}</div>
<small>Asking ${fmt$(x.price)} · ${odds>.3?"likely to sell soon":odds>.1?"may take a few weeks":"slow at this price"}</small>`;
    return `<li><div><b>${x.name}</b><br><small>${x.cert&&x.cert!=="bench"?SIM.CERT[x.cert].name+" · ":""}${CASES[x.caseId].name.split(",")[0]} · ${x.thick} mm · value ${fmt$(x.value)}</small>
${state}</div>
<div class="acts">${x.away?"":x.lot?(!(c.sale&&c.sale.wk===c.wk&&c.sale.opened)?`<button class="btn sm" data-sh="unlot" data-id="${x.id}">Withdraw</button>`:""):`<button class="btn sm" data-sh="dealer" data-id="${x.id}">Dealer ${fmt$(dealerPrice(x))}</button>${cc?`<button class="btn sm" data-sh="lot" data-id="${x.id}">Auction…</button>`:""}`}</div></li>`;}).join("")}</ul>
<p class="hint">${upOwned("shop")?"Walk-in buyers":"Buyers who find a shared bench"} see your stock each week and take the best value for its price. The dealer in town pays at once, but only ${Math.round(BIZ.dealer*100)}%.${cc?` The ${sn.name} at ${CALENDAR.house} (${sn.now?"this week":"week "+sn.week}) takes consignments now.`:""}</p></div>`;}
function ordersCard(){const c=car();if(!c.orders.length&&!c.offers.length)return "";
  const specLine=(t,pc)=>specChecks(t.spec,pc||{cfg:{complications:[],finish:[]},r:{reserveH:0},thick:99,cert:null});
  const specTxt=t=>specLine(t).map(x=>x.label).join(" · ");
  return `<div class="card"><h3>Commissions</h3>${c.orders.map(o=>{const t=tplOf(o.tpl),fits=c.stock.filter(pc=>specOk(t.spec,pc)),late=c.wk>o.due;
    return `<div class="ord"><b>${t.title}</b> <small>· ${o.cust}</small><p>“${t.text}”</p><p class="hint">${specTxt(t)}</p>
<p class="hint">${fmt$(orderPay(o))}${late?` (late: ${c.wk-o.due} week${c.wk-o.due>1?"s":""})`:` · due ${whenTxt(o.due)}`}</p>
<div class="row">${fits.map(pc=>`<button class="btn pri sm" data-sh="deliver" data-id="${o.id}" data-pc="${pc.id}">Deliver No. ${pc.no}</button>`).join("")}<button class="btn ghost sm" data-sh="cancel" data-id="${o.id}">Cancel</button></div></div>`;}).join("")}
${c.offers.map(o=>{const t=tplOf(o.tpl);return `<div class="ord offer"><b>${t.title}</b> <small>· ${o.cust} · enquiry</small><p>“${t.text}”</p><p class="hint">${specTxt(t)}</p>
<p class="hint">${fmt$(o.budget)} · ${o.weeks} weeks to make it · answer ${whenTxt(o.until-1)}</p><div class="row"><button class="btn sm" data-sh="accept" data-id="${o.id}">Accept</button></div></div>`;}).join("")}
<p class="hint">Build a piece to the spec, case it, and deliver it from stock. Late pieces pay ${Math.round(BIZ.late*100)}% less a week.</p></div>`;}
function tradeCard(){const c=car(),t=c.trade,o=c.tradeOffer;if(!t&&!o)return "";
  if(t){const j=c.jobs.find(j=>j.kind==="trade"&&j.ref===t.id);return `<div class="card"><h3>Trade batch</h3><p><b>${t.brand}</b>: ${tradeLine(t)} at ${fmt$(t.price)} each. ${fmtN(j?j.h:0,0)} h of work left, due ${whenTxt(t.due)}.</p></div>`;}
  return `<div class="card"><h3>Trade enquiry</h3><p><b>${o.brand}</b> wants ${tradeLine(o)} for their own dials, at ${fmt$(o.price)} each (${fmt$(o.qty*o.price)}).</p>
<p class="hint">Parts ${fmt$(o.qty*o.parts)} up front · about ${fmtN(o.qty*o.hoursEach*batchMult(),0)} h of work · ${o.weeks} weeks · answer ${whenTxt(o.until-1)}</p>
<div class="row"><button class="btn sm" data-sh="trade">Take it on</button></div></div>`;}
function upgradesCard(){const ids=Object.keys(UPGRADES),have=ids.filter(upOwned),c=car();
  return `<details class="card shup"><summary><h3>Workshop upgrades<span class="cnt">${have.length} of ${ids.length}</span></h3></summary><ul class="shlist">${ids.map(id=>{const U=UPGRADES[id],own=upOwned(id),need=upNeeds(id);
    return `<li class="${own?"own":""}"><div><b>${U.name}</b><br><small>${U.blurb}</small>${need.length&&!own?`<br><small class="lockt">Needs: ${need.map(n=>UPGRADES[n].name.toLowerCase()).join(", ")}</small>`:""}</div>
<div class="acts">${own?`<span class="tick">Owned</span>`:`<button class="btn sm" data-sh="buy" data-id="${id}"${need.length||c.cash<U.cost?" disabled":""}>${fmt$(U.cost)}</button>`}</div></li>`;}).join("")}</ul></details>`;}
function staffCard(){const c=car(),cap=staffCap();
  return `<details class="card"><summary><h3>Staff<span class="cnt">${c.staff.length} of ${cap}</span></h3></summary>
${c.staff.length?`<ul class="shlist">${c.staff.map((s,i)=>`<li><div><b>${s.name}</b><br><small>${STAFF[s.kind].name} · ${fmt$(STAFF[s.kind].wage)} a week · ${Math.round(BIZ.staffHours*STAFF[s.kind].eff)} h of work</small></div><div class="acts"><button class="btn sm ghost" data-sh="fire" data-i="${i}">Let go</button></div></li>`).join("")}</ul>`:""}
<p class="hint">${cap?"Looking for work:":"A shared bench has no room for staff. Your own shop makes room for two."}</p>
${cap?`<ul class="shlist">${c.cands.map((x,i)=>{const K=STAFF[x.kind];return `<li><div><b>${x.name}</b><br><small>${K.name} · ${fmt$(K.wage)} a week${K.hire?` · ${fmt$(K.hire)} to sign`:""} · ${K.blurb}</small></div><div class="acts"><button class="btn sm" data-sh="hire" data-i="${i}"${c.staff.length>=cap?" disabled":""}>Hire</button></div></li>`;}).join("")}</ul>`:""}</details>`;}
function booksCard(){const c=car(),B=c.books.slice(-8).reverse();
  return `<details class="card"><summary><h3>The books</h3></summary>${c.loan?`<p>Bank loan: ${fmt$(c.loan.left)} still to pay, ${fmt$(c.loan.pay)} a week.</p>`:""}
<table class="books"><thead><tr><th>Week</th><th>In</th><th>Out</th><th>Net</th></tr></thead><tbody>${B.map(b=>`<tr><td>${b.year} · ${b.week}</td><td>${fmt$(b.in)}</td><td>${fmt$(b.out)}</td><td class="${b.in-b.out<0?"neg":""}">${fmt$(b.in-b.out)}</td></tr>`).join("")||`<tr><td colspan="4">Nothing yet.</td></tr>`}</tbody></table>
<p class="hint">Rent ${fmt$(rent())} and your keep ${fmt$(BIZ.keep)} a week${wages()?`, wages ${fmt$(wages())}`:""}.</p></details>`;}
function renderShop(){const el=$("shopBody");
  if(!S.career){el.innerHTML=`<div class="card"><h3>The Sandbox</h3><p>No career running: every part is on offer and nothing costs money. Start a career to take in repairs, sell pieces and pay the rent.</p><div class="row"><button class="btn pri" data-sh="new">Start a career</button></div></div>`;return;}
  if(car().over){el.innerHTML=`<div class="card"><h3>The workshop is closed</h3><p>The bank wouldn't lend again. Start over from the Career tab.</p><div class="row"><button class="btn pri" data-sh="new">New game</button></div></div>`;return;}
  el.innerHTML=weekCard()+benchCard()+repairsCard()+stockCard()+ordersCard()+tradeCard()+jobsCard()+upgradesCard()+staffCard()+booksCard();}
TAB_RENDER.shop=renderShop;
function shopChanged(){hud();if(TAB_RENDER[curTab])TAB_RENDER[curTab]();}
$("shopBody").addEventListener("click",e=>{const pf=e.target.closest("[data-pf]");
  if(pf){const x=stockBy(pf.parentNode.dataset.stk);if(x){x.price=Math.round(x.value*(1+ +pf.dataset.pf)/10)*10;save();renderShop();}return;}
  const b=e.target.closest("[data-sh]");if(!b)return;const k=b.dataset.sh,id=b.dataset.id;
  if(k==="close")doCloseWeek();
  if(k==="new")newGameSheet();
  if(k==="tg"){S.tgOn={kind:"repair",id:+id};save();showTab("test");}
  if(k==="fix")fixSheet(+id);
  if(k==="case")caseSheet();
  if(k==="test")showTab("test");
  if(k==="dealer"){const x=stockBy(id);if(x)confirmSheet(`Sell ${x.name} to the dealer?`,`He pays ${fmt$(dealerPrice(x))} now. In stock it's worth ${fmt$(x.value)}.`,"Sell it",()=>{sellPiece(x,dealerPrice(x),"the dealer","dealer");save();shopChanged();});}
  if(k==="deliver")deliver(id,b.dataset.pc);
  if(k==="lot")lotSheet(+id);
  if(k==="unlot"){consign(id,null);toast("Withdrawn from the sale.");}
  if(k==="cancel")confirmSheet("Cancel this commission?","The customer goes elsewhere. Nothing is paid either way.","Cancel it",()=>{cancelOrder(id);shopChanged();});
  if(k==="accept")acceptOffer(id);
  if(k==="trade")acceptTrade();
  if(k==="buy")buyUpgrade(id);
  if(k==="hire")hire(+b.dataset.i);
  if(k==="fire")confirmSheet(`Let ${car().staff[+b.dataset.i].name} go?`,"One week's wages as notice.","Let them go",()=>{letGo(+b.dataset.i);shopChanged();});
  shopChanged();});

/* ---- sheets ---- */
function confirmSheet(title,text,yes,fn){openSheet(title,`<p>${text}</p><div class="row"><button class="btn pri" id="cfYes">${yes}</button><button class="btn" id="cfNo">Not now</button></div>`);
  $("cfNo").addEventListener("click",closeSheet);$("cfYes").addEventListener("click",()=>{closeSheet();fn();});}
/* diagnose: every fault with its fix, hours and parts. A wrong one costs the work and the watch comes back */
function fixSheet(id){const r=repairBy(id);if(!r)return;
  openSheet("What's wrong with it?",`<p><b>${capWord(r.watch)}</b> · ${r.cust}: “${FAULTS[r.fault].complaint}”</p>
<ul class="shlist fixes">${Object.keys(FAULTS).map(f=>{const F=FAULTS[f],tried=r.tried.includes(f);
  return `<li class="${tried?"own":""}"><div><b>${F.name}</b><br><small>${F.blurb}</small><br><small>${F.fix} · ${fmtN(fixHours(f),1)} h${F.parts?` · ${fmt$(F.parts)} parts`:""}${tried?" · tried: it wasn't this":""}</small></div>
<div class="acts"><button class="btn sm" data-fix="${f}"${tried?" disabled":""}>Fix</button></div></li>`;}).join("")}</ul>
<p class="hint">The fix goes into the work in hand: Close week to do it. If it wasn't the fault, the watch comes back still wrong.</p>`);
  $("sheetBody").addEventListener("click",e=>{const b=e.target.closest("[data-fix]");if(!b)return;startFix(id,b.dataset.fix);
    if(S.tgOn&&S.tgOn.id===id)S.tgOn=null;save();closeSheet();toast(`${FAULTS[b.dataset.fix].fix}: in the work in hand.`);shopChanged();});}
/* case a finished piece: the cases that take this movement, the value in each */
function caseSheet(){const c=car(),p=c.bench;if(!p)return;const r=SIM.simulate(p.cfg,skillLvls(),null,{seed:p.seed,adjust:p.adjust});
  const ok=c.orders.map(o=>tplOf(o.tpl)),fin=SIM.eraMult(c.year,"finish");
  openSheet(`Case No. ${p.no}`,`<p>${pieceName(p.cfg,p.no)} · ${SIM.CERT[p.cert].name} · movement ${r.thickness.toFixed(1)} mm</p>
<ul class="shlist fixes">${Object.keys(CASES).map(id=>{const cs=CASES[id],fits=r.thickness<=cs.maxMove,lock=cs.needs&&!upOwned(cs.needs),v=Math.round(SIM.pieceValue(r,p.cert,cs)*(1+(fin-1)*Math.min(1,p.cfg.finish.length/2))/10)*10;
  const forO=ok.filter(t=>specOk(t.spec,{cfg:p.cfg,r,cert:p.cert,caseId:id,thick:r.thickness+cs.thick}));
  return `<li class="${fits&&!lock?"":"own"}"><div><b>${cs.name}</b><br><small>${fmt$(cs.cost)} · ${(r.thickness+cs.thick).toFixed(1)} mm cased · value ${fmt$(v)}${!fits?` · too thick: takes ${cs.maxMove} mm at most`:lock?" · needs your own shop":""}</small>${forO.length?`<br><small class="good">Fits: ${forO.map(t=>t.title.toLowerCase()).join(", ")}</small>`:""}</div>
<div class="acts"><button class="btn sm" data-case="${id}"${!fits||lock||c.cash<cs.cost?" disabled":""}>Case</button></div></li>`;}).join("")}</ul>`);
  $("sheetBody").addEventListener("click",e=>{const b=e.target.closest("[data-case]");if(!b)return;if(casePiece(b.dataset.case)){closeSheet();shopChanged();}});}
/* consign a stock piece to the next auction night, with a reserve */
function lotSheet(id){const x=stockBy(id),sn=saleNext();if(!x||!sn)return;
  const est=lotEst(x);
  openSheet(`The ${sn.name} at ${CALENDAR.house}`,`<p><b>${x.name}</b> · value ${fmt$(x.value)}</p>
<p>The catalogue would estimate it around <b>${fmt$(est)}</b>. Collectors bid it up from there: the better your name with them, the keener they are. ${CALENDAR.house} keep ${Math.round(CALENDAR.fee*100)}% of the hammer price.</p>
<ul class="shlist fixes">${RESERVES.map(([f,l])=>`<li><div><b>${l}</b><br><small>${f?`Unsold below ${fmt$(x.value*f)}: it comes back to stock.`:"It sells, whatever the bidding."}</small></div><div class="acts"><button class="btn sm" data-res="${f}">Consign</button></div></li>`).join("")}</ul>
<p class="hint">Sale ${sn.now?"this week":`in week ${sn.week}`}. Until then it's held for the sale: walk-in buyers and the dealer don't see it.</p>`);
  $("sheetBody").addEventListener("click",e=>{const b=e.target.closest("[data-res]");if(!b)return;consign(id,+b.dataset.res);closeSheet();toast(`Consigned to the ${sn.name}.`);shopChanged();});}
$("exportSave").addEventListener("click",buBackupOpen);
$("importSave").addEventListener("click",buRestoreOpen);
