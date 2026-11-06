/* ===================== app/calendar.js: the calendar, reputation, service returns and goals (plan section 9) =====================
   The engine side of PR 6 (the Career tab's cards and the sheets are in app/events.js). Tables: REP_TRACKS, REP_TIERS,
   RIVALS, CALENDAR, RETURNS, NEWS, GOALS (app/state.js); MARKET_ERA (sim/market.js); runContest (sim/trial.js).
   - Reputation: S.career.rep = {collectors, trade, press} points. addRep() with a REP_GAIN row; repTier(track).
   - The Haldis Valley Fair (week 37): a stand with up to three pieces from stock, sold to visitors, enquiries.
   - The Kessel Peak Trial: enter a stock piece in weeks 8-18; it is away until week 24, then 30 days of results against
     RIVALS, prize money and press.
   - Auction nights at Brugg & Lell (weeks 16 and 46): consign stock pieces with a reserve, and your old pieces come back as
     resale lots you can bid on. Run live in the saleroom (app/events.js) or, if you never open it, at Close week.
   - Service returns: sold pieces under warranty come back on their returnRisk; you pay; reputation drops; a cracked crystal.
   - News cards by date (NEWS) and goals (GOALS, S.career.goals = {id: week}).
   closeWeek() (app/business.js) calls calClose(lines) before the costs and calWeekStart(lines) once the new week begins;
   calFx says what the week sheet should show (the trial, the crack). */
const REP_SEG={private:"press",trade:"trade",collector:"collectors",press:"press"};
/* who earns what. acc: an accuracy honour (the press cares less about those in the smartwatch years: MARKET_ERA press) */
const REP_GAIN={
  repair:{press:.1},repairWrong:{press:-.5},
  sale:{collectors:.3},salePrestige:.12,             // a retail sale: collectors, plus this much per point of prestige
  cert:{chronometer:{press:1,collectors:1,acc:1},observatory:{press:4,collectors:3,acc:1}},
  commission:2,commissionLate:1,                     // on the segment's track; minus this per week late
  trade:{trade:3},tradeLate:1.5,
  trialEntry:{press:1,acc:1},podium:[{press:10,collectors:4,acc:1},{press:6,collectors:2,acc:1},{press:4,collectors:1,acc:1}],
  fair:{press:2},fairPiece:{collectors:1},
  auction:{collectors:2},resaleUp:{collectors:.5},
  ret:{press:-2,collectors:-1},
  max:150,decay:.008};                              // every week each track loses this share: a name has to be kept up
let calFx={};
const repOf=k=>{const c=car();return c&&c.rep?(+c.rep[k]||0):0;};
function repTier(k){const p=repOf(k);let t=0;REP_TIERS.forEach((T,i)=>{if(p>=T.at)t=i;});return t;}
function addRep(g,lines,why){const c=car();if(!c||!g)return;const acc=g.acc?SIM.eraMult(c.year,"press"):1;
  for(const k in REP_TRACKS)if(g[k]){const was=repTier(k),d=g[k]>0?g[k]*acc:g[k];c.rep[k]=Math.max(0,Math.min(REP_GAIN.max,repOf(k)+d));
    const now=repTier(k);if(now>was){const m=`Reputation with the ${REP_TRACKS[k].name.toLowerCase()}: ${REP_TIERS[now].name}.`;if(lines)lines.push(m);else toast(m);}}}
/* absolute week number of a (year, week 1-52) in this career */
const wkAt=(y,w)=>(y-car().start)*52+(w-1);
const newsWk=n=>wkAt(n.y,n.w);
/* the next time a week of the year comes round, from now (this week counts) */
function nextWeek(w){const c=car();return c.week<=w?wkAt(c.year,w):wkAt(c.year+1,w);}

/* ---- goals ---- */
function goal(id,lines){const c=car();if(!c||!GOALS[id]||c.goals[id]!=null)return;c.goals[id]=c.wk;
  const m=`Goal reached: ${GOALS[id].name}.`;if(lines)lines.push(m);else toast(m);}
function checkGoals(lines){const c=car();if(!c)return;
  if(c.certs.chronometer)goal("chronometer",lines);if(c.certs.observatory)goal("observatory",lines);
  if(upOwned("shop"))goal("shop",lines);
  if(c.stock.some(x=>x.cfg.complications.includes("perp-cal"))||c.sold.some(x=>x.cfg&&x.cfg.complications&&x.cfg.complications.includes("perp-cal")&&x.how!=="resale"))goal("perpetual",lines);}

/* ---- stock pieces that are spoken for: at the trial (away) or consigned to a sale (lot) ---- */
const pieceFree=x=>!x.away&&!x.lot;

/* ---- the Haldis Valley Fair ---- */
function fairState(){const c=car(),F=CALENDAR.fair,at=nextWeek(F.week),d=at-c.wk,entered=c.fair&&c.fair.year===c.year&&c.week<=F.week;
  return{at,d,open:d<=F.ahead&&!entered,entered};}
function enterFair(ids){const c=car(),F=CALENDAR.fair;ids=ids.filter(id=>stockBy(id)).slice(0,F.show);if(!ids.length)return false;
  if(!pay(F.fee,`a stand at the ${F.name}`))return false;c.fair={year:c.year,ids};save();toast(`Your stand is booked: week ${F.week}.`);return true;}
function fairClose(lines,R){const c=car(),F=CALENDAR.fair;if(!c.fair||c.fair.year!==c.year||c.week!==F.week)return;
  lines.push(`The ${F.name}: a busy week on your stand.`);addRep(REP_GAIN.fair,lines);
  for(const id of c.fair.ids){const pc=stockBy(id);if(!pc||pc.away)continue;
    if(pc.cfg.finish.length||pc.cfg.complications.length)addRep(REP_GAIN.fairPiece,lines);
    if(R()<Math.min(.95,SIM.buyChance(pc.value,pc.price)*F.buy)){const who=pick(R,CUSTOMERS);pc.lot=null;sellPiece(pc,pc.price,who+" at the fair");addRep(saleGain(pc),lines);lines.push(`Sold ${pc.name} at the fair to ${who}: ${fmt$(pc.price)}.`);}}
  const n=c.offers.length;addOffer(R,4);addOffer(R,4);if(c.offers.length>n)lines.push(`${c.offers.length-n} commission enquir${c.offers.length-n>1?"ies":"y"} from the fair.`);
  if(!c.trade&&!c.tradeOffer){addTradeOffer(R);if(c.tradeOffer)lines.push(`${c.tradeOffer.brand} stopped by the stand about a trade batch.`);}
  c.fair=null;c.fairs=(+c.fairs||0)+1;}
/* what a retail sale does for the collectors' opinion */
function saleGain(pc){return{collectors:REP_GAIN.sale.collectors+REP_GAIN.salePrestige*((pc.r&&pc.r.prestige)||0)};}

/* ---- the Kessel Peak Trial ---- */
function trialState(){const c=car(),T=CALENDAR.trial,e=c.contest&&c.contest.year===c.year?c.contest:null;
  return{entry:e,open:!e&&c.week>=T.open&&c.week<=T.close,opensIn:c.week<T.open?T.open-c.week:c.week>T.close?wkAt(c.year+1,T.open)-c.wk:0};}
function enterTrial(id){const c=car(),T=CALENDAR.trial,pc=stockBy(id);if(!pc||!pieceFree(pc)||!trialState().open)return false;
  if(!pay(T.fee,`entry to the ${T.name}`))return false;pc.away="trial";c.contest={year:c.year,id:pc.id,no:pc.no,name:pc.name,res:null,seen:false};
  addRep(REP_GAIN.trialEntry);save();toast(`No. ${pc.no} goes up to Kessel Peak. Results in week ${T.back}.`);return true;}
function rivalPoints(rv,year,R){const T=CALENDAR.trial,g=Math.pow(1-T.rivalGain,Math.max(0,year-2000));
  const idx=Math.max(.8,rv.trial*g*(1+T.rivalVar*(R()+R()+R()-1.5)*1.4));return Math.round(1000*Math.exp(-idx/SIM.CONTEST.scale));}
function trialClose(lines){const c=car(),T=CALENDAR.trial,e=c.contest;if(!e||e.year!==c.year||e.res||c.week!==T.back)return;
  const pc=stockBy(e.id);if(!pc){c.contest=null;return;}pc.away=null;
  const t=SIM.runContest(pc.cfg,skillLvls(),{timingRes:ownedTool().timingRes},{seed:pc.seed,adjust:pc.adjust,trialSeed:pc.seed+"k"+c.year});
  const R=weekRng("contest"),field=RIVALS.map(rv=>({id:rv.id,name:rv.name,points:rivalPoints(rv,c.year,R)}));
  field.push({id:"me",name:"You: No. "+pc.no,points:t.final.points});field.sort((a,b)=>b.points-a.points);
  const place=field.findIndex(f=>f.id==="me")+1,prize=T.prizes[place-1]||0;
  e.res={place,prize,points:t.final.points,parts:t.final.parts,running:t.running,days:t.days.map(d=>[d.pos,d.temp,+d.rate.toFixed(2)]),field,seed:pc.seed+c.year};
  c.contests.push({year:c.year,no:pc.no,place,points:t.final.points,of:field.length,field:field.map(f=>[f.id,f.points])});if(c.contests.length>12)c.contests.shift();
  if(prize)earn(prize,`${T.name} prize`);if(place<=3){addRep(REP_GAIN.podium[place-1],lines);goal("podium",lines);}
  lines.push(`The ${T.name} results are in: No. ${pc.no} placed ${ordinal(place)} of ${field.length}${prize?`, ${fmt$(prize)} in prize money`:""}.`);
  calFx.trial=true;}
const ordinal=n=>n+(n%100>10&&n%100<14?"th":["th","st","nd","rd"][n%10]||"th");

/* ---- auction nights ---- */
function saleNext(){const c=car();if(c.sale&&c.sale.wk===c.wk&&!c.sale.done)return{at:c.wk,week:c.week,name:c.sale.name,now:true};
  let best=null;for(const s0 of CALENDAR.sales){const at=s0.week>c.week?wkAt(c.year,s0.week):wkAt(c.year+1,s0.week);if(!best||at<best.at)best={at,week:s0.week,name:s0.name};}
  return best;}
function canConsign(){const n=saleNext(),c=car();return n.now?!c.sale.opened:n.at-c.wk<=CALENDAR.ahead;}
function consign(id,reserve){const pc=stockBy(id);if(!pc||pc.away)return;if(reserve==null){pc.lot=null;}else{if(!canConsign())return;pc.lot={reserve:+reserve};}save();}
const COLLECTORS=["a Velm banker","a collector from over the border","the Haldis museum","a young tech founder","an old valley family","a dealer from the capital","Judge Falk","Dr Abelard","a phone bidder","a bidder in the room"];
/* set up this week's sale: your old pieces that come back on the market */
function saleOpen(lines){const c=car(),S0=CALENDAR.sales.find(s=>s.week===c.week);if(!S0||(c.sale&&c.sale.wk===c.wk))return;
  const R=weekRng("resale"),tier=repTier("collectors"),resale=[];
  for(const s of c.sold.slice().reverse()){if(resale.length>=CALENDAR.resaleMax)break;
    if(s.how==="dealer"||c.wk-s.wk<CALENDAR.resaleAfter||s.resoldWk&&c.wk-s.resoldWk<CALENDAR.resaleGap)continue;
    if(R()<CALENDAR.resaleChance)resale.push({kind:"resale",sid:s.id,swk:s.wk,name:s.name,cert:s.cert,was:s.price,
      est:Math.round(s.price*(.75+.12*tier)*SIM.eraMult(c.year,"collector")/50)*50});}
  c.sale={wk:c.wk,name:S0.name,resale,done:false,opened:false,lots:null,i:0,results:[]};
  lines.push(`Auction night at ${CALENDAR.house} this week: the ${S0.name}.${c.stock.some(x=>x.lot)?" Your consigned pieces are in the catalogue.":""}${resale.length?` ${resale.length} of your old pieces ${resale.length>1?"are":"is"} in it too.`:""}`);}
/* freeze the catalogue (when the saleroom opens, or at Close week) */
function saleLots(){const c=car(),sl=c.sale;if(sl.lots)return sl.lots;
  sl.lots=c.stock.filter(x=>x.lot&&!x.away).map(x=>({kind:"mine",id:x.id,name:x.name,cert:x.cert,value:x.value,reserve:x.lot.reserve,est:lotEst(x)}))
    .concat(sl.resale);sl.opened=true;return sl.lots;}
/* the catalogue estimate for one of your stock pieces: its value, the collectors' opinion of you, the era, its prestige */
const lotEst=x=>Math.round(x.value*(.85+.12*repTier("collectors"))*SIM.eraMult(car().year,"collector")*(1+Math.min(.3,.02*((x.r&&x.r.prestige)||0)))/50)*50;
const bidStep=x=>x<1000?50:x<3000?100:x<6000?250:x<15000?500:x<40000?1000:2500;
/* one lot: the bidders' limits, then the bidding up to the hammer. mine = the player's top bid (resale lots) or 0.
   -> {steps:[[amount, bidder]], hammer, buyer, sold, me} */
function lotRun(lot,mine){const c=car(),R=SIM.rng(`${c.seed}|sale|${c.sale.wk}|${lot.kind}|${lot.id||lot.sid}`),tier=repTier("collectors");
  const n=4+Math.min(4,tier)+Math.floor(R()*2),rv=RIVALS.slice(),co=COLLECTORS.slice(),bidders=[];
  for(let i=0;i<n;i++){const from=i<2?rv:co;if(!from.length)break;const x=from.splice(Math.floor(R()*from.length),1)[0];
    const g=Math.sqrt(-2*Math.log(1-R()))*Math.cos(2*Math.PI*R());
    bidders.push({name:x.name||x,max:lot.est*(x.bid||1)*Math.exp(.22*g)*.9});}
  if(mine)bidders.push({name:"You",max:mine,me:true});
  bidders.sort((a,b)=>b.max-a.max);const top=bidders[0];
  const floor=lot.kind==="mine"?lot.value*lot.reserve:0;
  const st0=bidStep(lot.est*.5);let price=Math.max(st0,Math.round(lot.est*.5/st0)*st0);const steps=[];let lead=null;
  /* you may cut the step: your bid stops exactly at your limit (to the nearest Th 50) rather than lose to the increment */
  const cut=b=>Math.floor(b.max/50)*50;
  while(steps.length<200){const next=lead?price+bidStep(price):price,can=bidders.filter(b=>b!==lead&&(b.max>=next||b.me&&lead&&cut(b)>price));if(!can.length)break;
    const b=can[Math.floor(R()*can.length)];price=b.me&&b.max<next?cut(b):next;lead=b;steps.push([price,b.name]);}
  if(!lead){lead=top;steps.push([price,top.name]);}
  const sold=price>=floor;
  if(steps.length>14){const keep=[steps[0]];const k=(steps.length-1)/12;for(let i=1;i<12;i++)keep.push(steps[Math.round(i*k)]);keep.push(steps[steps.length-1]);steps.splice(0,steps.length,...keep);}
  return{steps,hammer:price,buyer:lead.name,sold,me:!!lead.me};}
/* settle a lot once its bidding is over */
function lotSettle(lot,res,lines){const c=car(),sl=c.sale,F=CALENDAR.fee;let line;
  if(lot.kind==="mine"){const pc=stockBy(lot.id);if(!pc)return;pc.lot=null;
    if(res.sold){const net=Math.round(res.hammer*(1-F));c.stock=c.stock.filter(x=>x!==pc);sfx("sale");earn(net,`${pc.name} at ${CALENDAR.house} (hammer ${fmt$(res.hammer)}, less ${Math.round(F*100)}%)`);
      c.sold.push(soldRow(pc,res.hammer,res.buyer,"auction"));addRep(REP_GAIN.auction,lines);goal("auction",lines);
      line=`${pc.name}: sold to ${res.buyer} for ${fmt$(res.hammer)} (${fmt$(net)} to you).`;}
    else line=`${pc.name}: bought in at ${fmt$(res.hammer)}, below your reserve. It's back in stock.`;}
  else{const s=c.sold.find(x=>x.id===lot.sid&&x.wk===lot.swk);
    if(res.me){const cost=Math.round(res.hammer*(1+F));if(c.cash<cost){line=`${lot.name}: you couldn't cover ${fmt$(cost)}; it went to the underbidder.`;}
      else{c.cash-=cost;book("out",cost,`bought back ${lot.name}`);if(s){c.sold=c.sold.filter(x=>x!==s);c.stock.push(stockFromSold(s));}
        line=`${lot.name}: you bought it back for ${fmt$(res.hammer)} (${fmt$(cost)} with the fee). It's in your stock.`;}}
    else{if(s)s.resoldWk=c.wk;line=`${lot.name} (yours, sold for ${fmt$(lot.was)}) made ${fmt$(res.hammer)} to ${res.buyer}.`;
      if(res.hammer>lot.was){addRep(REP_GAIN.resaleUp,lines);line+=" More than you sold it for: the collectors notice.";}}}
  sl.results.push(line);if(lines)lines.push(line);}
/* every lot not yet run, with no bids from you (Close week, if the saleroom was never opened or left half way) */
function saleAuto(lines){const c=car(),sl=c.sale;if(!sl||sl.done||sl.wk!==c.wk)return;const L=saleLots();
  if(L.length)lines.push(`The ${sl.name} at ${CALENDAR.house}:`);
  while(sl.i<L.length){const lot=L[sl.i++];lotSettle(lot,lotRun(lot,0),lines);}sl.done=true;}
/* a sold-pieces row (resale and returns read it); a bought-back piece goes into stock from one */
function soldRow(pc,price,to,how){return{id:pc.id,no:pc.no,name:pc.name,cfg:pc.cfg,seed:pc.seed,adjust:pc.adjust,cert:pc.cert,caseId:pc.caseId,
  thick:pc.thick,r:pc.r,value:pc.value,price,wk:car().wk,to:to||"a buyer",how:how||"retail"};}
function stockFromSold(s){const c=car(),cs=CASES[s.caseId]||CASES["steel-dress"],r=SIM.simulate(s.cfg,skillLvls(),null,{seed:s.seed,adjust:s.adjust});
  const value=SIM.pieceValue(r,s.cert,cs);
  return{id:nextId(),no:s.no||0,name:s.name,cfg:s.cfg,seed:s.seed||"bb"+s.id,adjust:s.adjust||{reg:0,beat:0,poise:0},cert:s.cert,caseId:CASES[s.caseId]?s.caseId:"steel-dress",
    value,price:value,since:c.wk,thick:s.thick||+(r.thickness+cs.thick).toFixed(1),r:s.r||{reserveH:r.reserveH,prestige:r.prestige,amp24:r.amp24,cost:r.cost},back:true};}

/* ---- service returns ---- */
function returnWhy(s){const r=SIM.simulate(s.cfg,{},null,{seed:s.seed,adjust:s.adjust}),K=SIM.K.ret;
  s.risk=r.returnRisk;s.why={shock:(1-r.shock)*K.shock,magnet:(1-r.magnetResist)*K.magnet,oil:K.oil*10*(r.cfg.escapement==="detent"?1.5:1)};}
function serviceReturns(lines,R){const c=car();
  for(const s of c.sold){if(s.ret!=null||s.how==="dealer"||c.wk-s.wk>CALENDAR.warranty||c.wk===s.wk)continue;
    if(s.risk==null||!s.why)returnWhy(s);if(R()>=s.risk/52)continue;
    const w=s.why,tot=w.shock+w.magnet+w.oil;let u=R()*tot,k="oil";if((u-=w.shock)<0)k="shock";else if((u-=w.magnet)<0)k="magnet";
    const X=RETURNS[k],cost=X.parts+RETURNS.courier;s.ret=c.wk;
    c.cash-=cost;book("out",cost,`warranty parts and courier: ${s.name}`);
    c.jobs.push({id:nextId(),kind:"warranty",ref:s.id,h:X.hours,label:`Warranty: ${s.name} for ${s.to}`,staff:true});
    addRep(REP_GAIN.ret,lines);
    lines.push(`Back under warranty: ${s.name} ${X.text}. ${fmt$(cost)} in parts and courier, ${fmtN(X.hours,1)} h of work, and ${s.to} is telling people.`);
    calFx.crack=true;}}

/* ---- news ---- */
function newsDue(lines){const c=car();while(c.newsN<NEWS.length&&newsWk(NEWS[c.newsN])<=c.wk){const n=NEWS[c.newsN];
  if(newsWk(n)>=0){c.news.push({i:c.newsN,wk:c.wk});if(c.news.length>20)c.news.shift();lines.push(`News: ${n.title}${/[.?!]$/.test(n.title)?"":"."}`);}c.newsN++;}}
function newsSkip(c){let n=0;while(n<NEWS.length&&(NEWS[n].y-c.start)*52+NEWS[n].w-1<c.wk)n++;return n;}

/* ---- the hooks closeWeek() calls ---- */
function calClose(lines){const c=car(),R=weekRng("cal");
  fairClose(lines,R);trialClose(lines);if(c.sale&&c.sale.wk===c.wk&&!c.sale.done)saleAuto(lines);
  serviceReturns(lines,R);}
function calWeekStart(lines){const c=car(),F=CALENDAR.fair,T=CALENDAR.trial;
  for(const k in REP_TRACKS)c.rep[k]=repOf(k)*(1-REP_GAIN.decay);
  newsDue(lines);saleOpen(lines);
  if(c.week===F.week-F.ahead)lines.push(`The ${F.name} is in ${F.ahead} weeks: book a stand on the Career tab.`);
  if(c.week===T.open)lines.push(`Entries for the ${T.name} are open until week ${T.close}.`);
  if(c.year===2019&&c.week===1&&c.start<=2015&&c.staff.length&&!c.slumpLetGo)goal("survive",lines);
  checkGoals(lines);}
