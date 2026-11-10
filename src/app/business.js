/* ===================== app/business.js: the career engine (plan section 8) =====================
   S.career is the game (null in the Sandbox, where every part is offered and nothing costs). Tables: BIZ, UPGRADES, STAFF,
   FAULTS, CASES, COMMISSION_TEMPLATES (app/state.js); prices from SIM.pieceValue / buyChance / tradeTerms (sim/market.js).
   - newCareer(kind): "bench" (2000, a shared bench, small cash) or "shop" (skip ahead: 2008, own shop, six-position
     machine, cleaning machine, cash for stock, skills at level 3).
   - Time is act, then Close week. You have BIZ.hoursWeek bench hours a week: adjusting on the timegrapher spends them at
     once (c.used); what is left at Close week goes into the jobs (c.jobs, first in first out): assembling your piece,
     repairs, trade batches. Staff work repairs and trade only.
   - Pieces: Make (Build tab) pays for the parts and queues the assembly. Once made it goes on the timegrapher (c.bench),
     you adjust it, check or certify it (a Bureau or Observatory trial takes weeks and a fee;
     the piece leaves the bench for c.away meanwhile, and comes back to the bench, or waits there if the bench is busy), then case it (CASES) and it
     goes into stock (c.stock) at a price, or to a commission that fits.
   - closeWeek(): jobs, sales, trials coming back, deadlines, the calendar's events and service returns (app/calendar.js),
     wages and rent, new repairs and offers, news; then the week report.
     Below zero cash: the bank offers one loan (BIZ.loan). Below zero again: the workshop closes (a restart offer). */
const car=()=>S.career;
const inCareer=()=>!!(S.career&&!S.career.over);
function upOwned(id){const c=car();return !!(c&&c.up&&c.up[id]);}
function nextId(){const c=car();c.seq=(+c.seq||0)+1;return c.seq;}
/* the random stream for this week's events (the same week from the same save rolls the same way) */
function weekRng(tag){const c=car();return SIM.rng(`${c.seed}|${c.wk}|${tag}`);}
function poisson(R,l){let k=0,p=Math.exp(-l),s=p;const u=R();while(u>s&&k<20){k++;p*=l/k;s+=p;}return k;}
const pick=(R,a)=>a[Math.floor(R()*a.length)%a.length];

function newCareer(kind){
  const st=BIZ.starts[kind]||BIZ.starts.bench,seed=Math.random().toString(36).slice(2,8);
  const c={kind,seed,start:st.year,year:st.year,week:1,wk:0,cash:st.cash,used:0,up:{},unlocks:{},xp:{},seq:0,
    loan:null,loanUsed:false,over:false,bench:null,away:[],made:0,jobs:[],repairs:[],stock:[],orders:[],offers:[],trade:null,tradeOffer:null,
    staff:[],cands:[],sold:[],books:[],certs:{},tut:kind==="shop",tutStep:kind==="shop"?null:0,tutRep:null,
    rep:{collectors:0,trade:0,press:0},goals:{},news:[],newsN:0,contests:[],sale:null,fair:null,contest:null,fairs:0,slumpLetGo:false,
    rnd:{done:{},run:[]},calibres:[],certsLog:[],ended:null,life:{sold:0,best:null,place:null,wins:0}};
  if(kind==="shop")c.rep={collectors:6,trade:10,press:12};
  for(const id of st.up){c.up[id]=true;c.unlocks["shop:"+id]=true;}
  if(st.xp)for(const k in SKILLS)c.xp[k]=st.xp;
  S.career=c;S.bAll=false;S.piece=null;S.tgOn=null;calCheck(S.cfg);c.newsN=newsSkip(c);checkGoals();
  const R=weekRng("start");for(let i=0;i<2;i++)addRepair(R);addOffer(R);refreshCands(R);
  save();}

/* a loaded career: fill in anything missing (older saves, hand-edited codes) so the rest of the game can trust its shape */
function normCareer(c){if(!buObjS(c))return null;
  const d={kind:"bench",seed:"x",start:START_YEAR,year:START_YEAR,week:1,wk:0,cash:0,used:0,seq:0,loan:null,loanUsed:false,over:false,bench:null,made:0,trade:null,tradeOffer:null,tut:false,tutStep:null,tutRep:null,
    sale:null,fair:null,contest:null,fairs:0,slumpLetGo:false,ended:null};
  for(const k in d)if(!(k in c))c[k]=d[k];
  for(const k of ["up","unlocks","xp","certs","goals"])if(!buObjS(c[k]))c[k]={};
  for(const k of ["jobs","repairs","stock","orders","offers","staff","cands","sold","books","news","contests"])if(!Array.isArray(c[k]))c[k]=[];
  if(!buObjS(c.rep))c.rep={};for(const k in REP_TRACKS)c.rep[k]=Math.max(0,+c.rep[k]||0);
  for(const k of ["sale","fair","contest"])if(c[k]!=null&&!buObjS(c[k]))c[k]=null;
  if(c.sale&&!Array.isArray(c.sale.resale))c.sale=null;if(c.fair&&!Array.isArray(c.fair.ids))c.fair=null;
  c.sold=c.sold.filter(x=>buObjS(x)&&buObjS(x.cfg));c.news=c.news.filter(n=>buObjS(n)&&NEWS[n.i]);
  if(!("newsN" in c)||!(+c.newsN>=0))c.newsN=newsSkip(c);c.newsN=Math.min(NEWS.length,+c.newsN||0);
  for(const k of ["cash","year","week","wk","used","seq","made"])c[k]=+c[k]||0;
  if(!c.year)c.year=c.start||START_YEAR;if(!c.week)c.week=1;
  c.staff=c.staff.filter(s=>buObjS(s)&&STAFF[s.kind]);c.repairs=c.repairs.filter(r=>buObjS(r)&&FAULTS[r.fault]&&buObjS(r.cfg));
  c.stock=c.stock.filter(x=>buObjS(x)&&buObjS(x.cfg)&&CASES[x.caseId]);c.jobs=c.jobs.filter(j=>buObjS(j)&&+j.h>0);
  if(c.bench&&!(buObjS(c.bench)&&buObjS(c.bench.cfg)))c.bench=null;
  c.away=(Array.isArray(c.away)?c.away:[]).filter(p=>buObjS(p)&&buObjS(p.cfg));   // pieces at a Bureau or Observatory trial, or back and waiting
  if(c.bench&&c.bench.trial){c.away.push(c.bench);c.bench=null;}   // before 1.1.2.0 a piece at a trial stayed on the bench
  c.tutStep=c.tutStep==null||c.tut?null:Math.max(0,Math.min((typeof TUT!=="undefined"?TUT.length:16)-1,Math.floor(+c.tutStep)||0));c.tutRep=c.tutRep==null?null:+c.tutRep||null;   // the tour (app/help.js)
  c.rnd=normRnd(c.rnd);c.calibres=normCals(c.calibres);   // R&D (app/rnd.js)
  c.certsLog=normCertsLog(c.certsLog);   // certificates (app/cards.js)
  c.life=normLife(c.life,c);   // the career record for the summary (app/calendar.js)
  for(const id in c.rnd.done)c.unlocks["rnd:"+id]=true;
  return c;}

/* ---- money and the week ---- */
function benchHours(){return BIZ.hoursWeek;}
function hoursLeft(){const c=car();return Math.max(0,benchHours()-(+c.used||0));}
/* your hours left once Close week has put them into the queued work (staff take their share first, as closeWeek does).
   Shown as "h free" so queuing a job visibly takes hours (a play-tester saw 45 h left after queuing 36 h of work) */
function hoursQueued(){const c=car();if(!c)return 0;let st=staffHrs(),q=0;for(const j of c.jobs){let h=Math.max(0,+j.h||0);if(j.staff&&st>0){const d=Math.min(st,h);h-=d;st-=d;}q+=h;}return q;}
function hoursFree(){return Math.max(0,hoursLeft()-hoursQueued());}
/* spend your own bench hours right now (adjusting). false if the week has run out */
function spendHours(h){const c=car();if(!c)return true;if(hoursLeft()<h-1e-9)return false;c.used=(+c.used||0)+h;return true;}
function pay(n,what){const c=car();if(!c)return true;if(c.cash<n){toast(`Not enough cash: ${what||"that"} costs ${fmt$(n)}.`);return false;}c.cash-=n;book("out",n,what);return true;}
function earn(n,what){const c=car();c.cash+=n;book("in",n,what);}
/* the books: one line per week, the money in and out with what it was for */
function book(dir,n,what){const c=car(),wk=c.wk;let b=c.books[c.books.length-1];
  if(!b||b.wk!==wk){b={wk,year:c.year,week:c.week,in:0,out:0,lines:[]};c.books.push(b);if(c.books.length>12)c.books.shift();}
  b[dir]+=n;if(what)b.lines.push((dir==="in"?"+":"−")+Math.round(n)+" "+what);if(b.lines.length>30)b.lines.shift();}
function rent(){let r=BIZ.benchRent;for(const id in UPGRADES)if(upOwned(id)&&UPGRADES[id].rent)r=UPGRADES[id].rent;return r;}
function wages(){return car().staff.reduce((a,s)=>a+STAFF[s.kind].wage,0);}
function weeklyCosts(){const c=car();return rent()+BIZ.keep+wages()+(c.loan?c.loan.pay:0);}
function staffCap(){let n=0;for(const id in UPGRADES)if(upOwned(id)&&UPGRADES[id].staff)n+=UPGRADES[id].staff;return n;}
function walkCap(){return SIM.walkInCap(repTier("press"),car().year);}   // the most walk-in buyers like to pay
function staffHrs(){return car().staff.reduce((a,s)=>a+BIZ.staffHours*STAFF[s.kind].eff,0);}
/* hours of repairs and trade work waiting that staff could take */
function staffWork(){return car().jobs.filter(j=>j.staff).reduce((a,j)=>a+j.h,0);}
function demand(){let d=1;for(const id in UPGRADES)if(upOwned(id)&&UPGRADES[id].demand)d*=UPGRADES[id].demand;return .2*d*(1+.12*repTier("press"))*SIM.eraMult(car().year,"retail");}
function fixMult(cls){let f=1;for(const id in UPGRADES)if(upOwned(id)&&UPGRADES[id].fix&&UPGRADES[id].fix[cls])f*=UPGRADES[id].fix[cls];return f;}
function batchMult(){let f=1;for(const id in UPGRADES)if(upOwned(id)&&UPGRADES[id].batch)f*=UPGRADES[id].batch;return f;}
const dateOf=wk=>{const c=car(),y=c.start+Math.floor(wk/52);return{year:y,week:wk%52+1};};
const whenTxt=wk=>{const d=wk-car().wk;return d<=0?"this week":d===1?"next week":`in ${d} weeks`;};

/* ---- upgrades and staff ---- */
function upNeeds(id){const U=UPGRADES[id];return(U.needs||[]).filter(n=>!upOwned(n));}
/* the sound a purchase makes: the machines whir into life (1.1.1.0) */
const BUY_SOUND={machine:["timing-six","timing-lab","cleaning","lathe","polishing","mill","climate","cnc","cleanroom"]};
function buyUpgrade(id){const U=UPGRADES[id],c=car();if(!U||upOwned(id)||upNeeds(id).length)return false;
  if(!pay(U.cost,U.name))return false;c.up[id]=true;c.unlocks["shop:"+id]=true;toast(`${U.name}: yours.`);if(BUY_SOUND.machine.includes(id))sfx("newmachine");checkGoals();save();return true;}
function refreshCands(R){const c=car(),kinds=Object.keys(STAFF).filter(k=>!STAFF[k].needs||upOwned(STAFF[k].needs));
  const taken=new Set(c.staff.map(s=>s.name));c.cands=[];
  for(let i=0;i<3;i++){let n=pick(R,STAFF_NAMES);for(let j=0;j<6&&taken.has(n);j++)n=pick(R,STAFF_NAMES);taken.add(n);c.cands.push({name:n,kind:kinds[i%kinds.length]});}}
function hire(i){const c=car(),x=c.cands[i];if(!x)return;if(c.staff.length>=staffCap()){toast(staffCap()?"No room for more staff: a second bench or a clean room makes room.":"A shared bench has no room for staff: get your own shop first.");return;}
  const K=STAFF[x.kind];if(K.hire&&!pay(K.hire,"signing "+x.name))return;
  c.staff.push({name:x.name,kind:x.kind,since:c.wk});c.cands.splice(i,1);save();toast(`${x.name} starts on Monday.`);}
function letGo(i){const c=car(),s=c.staff[i];if(!s)return;if(!pay(STAFF[s.kind].wage,"a week's notice for "+s.name))return;c.staff.splice(i,1);
  if(c.year>=2015&&c.year<=2018)c.slumpLetGo=true;save();toast(`${s.name} has left.`);}

/* ---- repairs ---- */
/* a customer's watch: a trade movement with a fault, its own seed */
function addRepair(R){const c=car();if(c.repairs.filter(r=>r.state==="in").length>=BIZ.repairQueue)return;
  const f=pick(R,Object.keys(FAULTS)),id=nextId();
  const cfg=Object.assign({},SIM.DEFAULT_CFG,R()<.5?{winding:"automatic",complications:["date"]}:{},R()<.3?{bph:"21600"}:{});
  c.repairs.push({id,cust:pick(R,CUSTOMERS),watch:pick(R,REPAIR_WATCHES),fault:f,cfg,seed:"rep"+id+c.seed,in:c.wk,due:c.wk+BIZ.repairWait,state:"in",tried:[]});}
function repairBy(id){return car().repairs.find(r=>r.id===+id);}
function fixHours(f){const F=FAULTS[f];return F.hours*fixMult(F.cls);}
/* choose a fix: it goes into the jobs. If it isn't the fault, the work is done and the watch comes back still wrong */
function startFix(id,f){const r=repairBy(id),F=FAULTS[f];if(!r||r.state!=="in")return;if(!pay(F.parts,"parts for "+r.watch))return;
  r.state="fixing";r.trying=f;car().jobs.push({id:nextId(),kind:"repair",ref:r.id,h:fixHours(f),label:`${F.fix}: ${r.watch}`,staff:true});save();}

/* ---- commissions and trade ---- */
/* commissions open by reputation: tier 2 needs the segment's track at "Local name", tier 3 at "Respected" */
const tplOpen=t=>t.tier===1||repTier(REP_SEG[t.seg]||"press")>=(t.tier===2?1:3);
function addOffer(R,max){const c=car(),ok=COMMISSION_TEMPLATES.filter(t=>tplOpen(t)&&!c.offers.some(o=>o.tpl===t.id)&&!c.orders.some(o=>o.tpl===t.id));
  if(!ok.length||c.offers.length>=(max||3))return;const t=pick(R,ok),[lo,hi]=t.budget,era=t.seg==="collector"?SIM.eraMult(c.year,"collector"):1;
  c.offers.push({id:nextId(),tpl:t.id,cust:pick(R,CUSTOMERS),budget:Math.round((lo+(hi-lo)*R())*era/50)*50,weeks:t.weeks,until:c.wk+BIZ.offerKeep});}
const tplOf=id=>COMMISSION_TEMPLATES.find(t=>t.id===id);
function acceptOffer(id){const c=car(),i=c.offers.findIndex(o=>o.id===+id);if(i<0)return;const o=c.offers.splice(i,1)[0];
  c.orders.push(Object.assign(o,{due:c.wk+o.weeks}));save();toast(`Accepted: due ${whenTxt(c.wk+o.weeks)}.`);}
function cancelOrder(id){const c=car();c.orders=c.orders.filter(o=>o.id!==+id);save();toast("The commission is cancelled.");}
/* does a finished piece meet a commission's spec? a list of {label, ok} */
function specChecks(spec,pc){const r=pc.r,cs=CASES[pc.caseId],out=[],cert=pc.cert||"none",ord=SIM.CERT_ORDER;
  if(spec.cert)out.push({label:SIM.CERT[spec.cert].name+(spec.cert==="bench"?"":" certificate"),ok:ord.indexOf(cert)>=ord.indexOf(spec.cert)});
  if(spec.maxThick)out.push({label:`At most ${spec.maxThick} mm thick, cased`,ok:pc.thick<=spec.maxThick});
  for(const k of spec.comps||[])out.push({label:SIM.part("complications",k).name,ok:pc.cfg.complications.includes(k)});
  if(spec.finishN)out.push({label:`${spec.finishN} finish${spec.finishN>1?"es":""} or more`,ok:pc.cfg.finish.length>=spec.finishN});
  if(spec.winding)out.push({label:SIM.part("winding",spec.winding).name,ok:pc.cfg.winding===spec.winding});
  if(spec.bph)out.push({label:(+spec.bph).toLocaleString("en-GB")+" bph",ok:pc.cfg.bph===spec.bph});
  if(spec.reserveH)out.push({label:`${spec.reserveH} h power reserve`,ok:r.reserveH>=spec.reserveH});
  if(spec.shock)out.push({label:"Shock protection",ok:pc.cfg.shock!=="none"});
  if(spec.metal)out.push({label:spec.metal[0].toUpperCase()+spec.metal.slice(1)+" case",ok:cs&&cs.metal===spec.metal});
  return out;}
const specOk=(spec,pc)=>specChecks(spec,pc).every(x=>x.ok);
function orderPay(o){const late=Math.max(0,car().wk-o.due);return Math.round(o.budget*Math.max(.4,1-BIZ.late*late));}
function deliver(orderId,stockId){const c=car(),o=c.orders.find(x=>x.id===+orderId),i=c.stock.findIndex(x=>x.id===+stockId);if(!o||i<0)return;
  const pc=c.stock[i],t=tplOf(o.tpl);if(pc.away||pc.lot||!specOk(t.spec,pc))return;const amt=orderPay(o),late=Math.max(0,c.wk-o.due);
  c.stock.splice(i,1);c.orders=c.orders.filter(x=>x!==o);earn(amt,`${t.title} for ${o.cust}`);sfx("sale");
  c.sold.push(soldRow(pc,amt,o.cust,"commission"));if(c.sold.length>60)c.sold.shift();
  const tr=REP_SEG[t.seg]||"press";addRep({[tr]:REP_GAIN.commission-REP_GAIN.commissionLate*late});goal("commission");
  save();toast(`Delivered to ${o.cust}: ${fmt$(amt)}.`);}
/* trade: batches of plain movements for other brands. One contract at a time, parts paid up front, paid on completion */
const TRADE_BRANDS=["Varn & Söhne","Ostmark","Tavan","Kessler","Brenner","Lindqvist"];
const TRADE_CFGS=[{},{winding:"automatic",complications:["date"]},{bph:"21600",jewels:"17",shock:"basic"}];
function addTradeOffer(R){const c=car();if(c.trade||c.tradeOffer)return;
  const cfg=SIM.normCfg(Object.assign({},SIM.DEFAULT_CFG,pick(R,TRADE_CFGS))).cfg,r=SIM.simulate(cfg,{},null,{seed:"trade"}),T=SIM.tradeTerms(r,1);
  const tt=repTier("trade"),Q=[8,12,16,20,24,30,40],qty=Q[Math.min(Q.length-1,Math.floor(R()*4)+Math.floor(tt/2)+(tt>=4?1:0)+Math.round(staffHrs()/80))];
  const price=Math.round(T.price*(1+.03*tt)*SIM.eraMult(c.year,"trade")*(.95+.1*R())/5)*5;
  c.tradeOffer={id:nextId(),brand:pick(R,TRADE_BRANDS),cfg,qty,price,parts:T.parts,hoursEach:T.hours,weeks:Math.ceil(qty*T.hours/BIZ.hoursWeek)+3,until:c.wk+BIZ.offerKeep};}
function tradeLine(t){const r=SIM.simulate(t.cfg,{},null,{seed:"trade"});return `${t.qty} × ${r.cfg.winding==="automatic"?"automatic":"hand-wound"}${r.cfg.complications.length?" date":""} at ${(+r.cfg.bph).toLocaleString("en-GB")} bph`;}
function acceptTrade(){const c=car(),t=c.tradeOffer;if(!t)return;if(!pay(t.qty*t.parts,`parts for ${t.qty} movements (${t.brand})`))return;
  c.trade=Object.assign(t,{due:c.wk+t.weeks});c.tradeOffer=null;sfx("crate");
  c.jobs.push({id:nextId(),kind:"trade",ref:t.id,h:t.qty*t.hoursEach*batchMult(),label:`${t.qty} movements for ${t.brand}`,staff:true});save();}

/* ---- your pieces ---- */
/* Make (Build tab): pay for the parts, the piece goes on your bench and its assembly into the jobs */
function makePiece(){const c=car();if(c.bench){toast("Your bench already has a piece on it: finish, case or scrap it first.");return false;}
  calCheck(S.cfg);const lk=lockedParts(S.cfg);if(lk.length){toast(`Not yours yet: ${lk[0].name.toLowerCase()}. ${unlockText(lk[0].unlock)}.`);return false;}
  const r=SIM.simulate(S.cfg,skillLvls()),n=c.made+1;
  if(!pay(r.cost,`parts for No. ${n}`))return false;
  c.made=n;const id=nextId();
  c.bench={id,no:n,cfg:JSON.parse(JSON.stringify(r.cfg)),key:JSON.stringify(S.cfg),seed:"piece"+c.seed+id,adjust:{reg:0,beat:0,poise:0},hours:0,n:0,subs:0,cert:null,xpDone:false,made:false,trial:null};
  c.jobs.push({id:nextId(),kind:"piece",ref:id,h:r.hours,label:`Assemble No. ${n}`});
  save();toast(`No. ${n} is on your bench: ${Math.round(r.hours)} h of assembly. Close week to work on it.`);return true;}
function pieceJob(){const c=car();return c&&c.bench&&c.jobs.find(j=>j.kind==="piece"&&j.ref===c.bench.id);}
function scrapPiece(){const c=car(),p=c.bench;if(!p)return;const back=Math.round(SIM.simulate(p.cfg,{}).cost*BIZ.scrap);
  c.jobs=c.jobs.filter(j=>!(j.kind==="piece"&&j.ref===p.id));c.bench=null;earn(back,`parts back from No. ${p.no}`);save();toast(`No. ${p.no} taken apart: ${fmt$(back)} of parts saved.`);}
function pieceName(cfg,no){const P=(s,id)=>SIM.part(s,id);const bits=[cfg.winding==="automatic"?"automatic":"hand-wound"],k=calName(cfg);if(k)bits.unshift(k+" calibre");
  for(const k of cfg.complications)bits.push(P("complications",k).name.toLowerCase());return `No. ${no} · ${bits.join(", ")}`;}
/* a Bureau or Observatory trial: pay the fee, the piece is away for the weeks, the result comes back at Close week */
function sendTrial(tier){const c=car(),p=c.bench,C=SIM.CERT[tier];if(!p||!p.made||p.trial)return false;
  if(!pay(C.fee,`${C.name} trial for No. ${p.no}`))return false;
  const tool=ownedTool(),t=SIM.runTrial(p.cfg,skillLvls(),trialTools(),{seed:p.seed,adjust:p.adjust,trialSeed:p.seed+"t"+(p.subs++)});
  p.trial={tier,back:c.wk+C.weeks,best:t.tiers[tier].pass?tier:null,t:{days:t.days,stats:t.stats,tiers:{[tier]:t.tiers[tier]}}};
  c.away.push(p);c.bench=null;   // off the bench (1.1.2.0): the next piece can start while this one is away
  save();return true;}
/* a piece back from a trial that waited because the bench was busy: onto the bench once it is free */
function shelfBy(id){return car().away.find(p=>p.id===+id&&!p.trial);}
function shelfToBench(id){const c=car(),p=shelfBy(id);if(!p||c.bench)return false;c.away=c.away.filter(x=>x!==p);c.bench=p;save();return true;}
/* case it and put it in stock (needs at least a Bench pass): the bench piece, or one back from a trial and waiting (id) */
function casePiece(caseId,id){const c=car(),p=id!=null?shelfBy(id):c.bench,cs=CASES[caseId];if(!p||!p.cert||!cs)return false;
  const r=SIM.simulate(p.cfg,skillLvls(),null,{seed:p.seed,adjust:p.adjust});if(r.thickness>cs.maxMove){toast("The movement is too thick for that case.");return false;}
  if(!pay(cs.cost,`${cs.name.split(",")[0].toLowerCase()} for No. ${p.no}`))return false;
  const fin=SIM.eraMult(c.year,"finish"),value=Math.round(SIM.pieceValue(r,p.cert,cs)*(1+(fin-1)*Math.min(1,p.cfg.finish.length/2))/10)*10;
  c.stock.push({id:p.id,no:p.no,name:pieceName(p.cfg,p.no),cfg:p.cfg,seed:p.seed,adjust:p.adjust,cert:p.cert,caseId,value,price:value,since:c.wk,
    thick:+(r.thickness+cs.thick).toFixed(1),r:{reserveH:r.reserveH,prestige:r.prestige,amp24:r.amp24,cost:r.cost}});
  if(c.bench===p){c.bench=null;S.tgOn=null;}else c.away=c.away.filter(x=>x!==p);checkGoals();save();toast(`No. ${p.no} is cased and in stock at ${fmt$(value)}.`);return true;}
function stockBy(id){return car().stock.find(x=>x.id===+id);}
function sellPiece(pc,price,to,how){const c=car();sfx("sale");c.stock=c.stock.filter(x=>x!==pc);earn(price,`${pc.name} sold${to?" to "+to:""}`);
  c.sold.push(soldRow(pc,price,to,how));if(c.sold.length>60)c.sold.shift();}

/* ---- Close week ---- */
function closeWeek(){
  const c=car();if(!c||c.over)return null;const rep=[],R=weekRng("close");calFx={};
  /* 1. the work: staff on repairs and trade, then your hours on everything in order */
  let staffH=staffHrs(),mine=hoursLeft(),myRepair=false;
  for(const j of c.jobs){if(j.staff&&staffH>0){const d=Math.min(staffH,j.h);j.h-=d;staffH-=d;}}
  for(const j of c.jobs){if(mine<=0)break;if(j.h>0){const d=Math.min(mine,j.h);j.h-=d;mine-=d;if(j.kind==="repair")myRepair=true;}}
  const done=c.jobs.filter(j=>j.h<=1e-6);c.jobs=c.jobs.filter(j=>j.h>1e-6);
  for(const j of done){
    if(j.kind==="piece"&&c.bench&&c.bench.id===j.ref){c.bench.made=true;rep.push(`No. ${c.bench.no} is assembled: put it on the timegrapher.`);
      if(!c.bench.xpDone){c.bench.xpDone=true;const r=SIM.simulate(c.bench.cfg,{});levelToast("assembly",gainXp("assembly",4));
        if(r.complexity)levelToast("complications",gainXp("complications",r.complexity));if(r.cfg.finish.length)levelToast("finishing",gainXp("finishing",2*r.cfg.finish.length));}}
    if(j.kind==="repair"){const r=repairBy(j.ref);if(!r)continue;
      if(r.trying===r.fault){const F=FAULTS[r.fault],amt=Math.round(F.pay*SIM.eraMult(c.year,"repairs"));earn(amt,`${F.fix.toLowerCase()} for ${r.cust}`);
        rep.push(`Repaired ${r.watch} for ${r.cust}: ${fmt$(amt)}.`);c.repairs=c.repairs.filter(x=>x!==r);if(myRepair)levelToast("assembly",gainXp("assembly",1));addRep(REP_GAIN.repair,rep);}
      else{r.tried.push(r.trying);addRep(REP_GAIN.repairWrong,rep);r.state="in";rep.push(`${r.watch[0].toUpperCase()+r.watch.slice(1)} (${r.cust}) still runs badly: it wasn't ${FAULTS[r.trying].name.toLowerCase()}. Back on the timegrapher.`);r.trying=null;}}
    if(j.kind==="trade"&&c.trade&&c.trade.id===j.ref){const t=c.trade,late=Math.max(0,c.wk-t.due),amt=Math.round(t.qty*t.price*Math.max(.4,1-BIZ.tradeLate*late));
      earn(amt,`${t.qty} movements for ${t.brand}`);sfx("sale");rep.push(`${t.brand} took delivery of ${t.qty} movements: ${fmt$(amt)}${late?` (${late} week${late>1?"s":""} late)`:""}.`);c.trade=null;
      addRep({trade:REP_GAIN.trade.trade-REP_GAIN.tradeLate*late},rep);}
    if(j.kind==="warranty"){const s=c.sold.find(x=>x.id===j.ref);if(s)rep.push(`${s.name} went back to ${s.to}, put right.`);}}
  /* 2. retail: this week's buyers each look at the stock and may buy the best value for its price */
  const buyers=poisson(R,demand());
  for(let b=0;b<buyers;b++){let best=null,bv=0;for(const pc of c.stock){if(!pieceFree(pc))continue;const v=pc.value/pc.price;if(v>bv){bv=v;best=pc;}}
    if(best&&R()<SIM.buyChance(best.value,best.price,walkCap())){const who=pick(R,CUSTOMERS);sellPiece(best,best.price,who);addRep(saleGain(best),rep);rep.push(`Sold ${best.name} to ${who}: ${fmt$(best.price)}.`);}}
  /* 3. trials coming back */
  for(const p of c.away.slice()){if(!p.trial||c.wk+1<p.trial.back)continue;const T=p.trial,C=SIM.CERT[T.tier];
    if(T.best){const ord=SIM.CERT_ORDER;if(!p.cert||ord.indexOf(T.tier)>ord.indexOf(p.cert))p.cert=T.tier;c.certs[T.tier]=(c.certs[T.tier]||0)+1;addRep(REP_GAIN.cert[T.tier],rep);certLog(p,T);}
    p.lastTrial=T;p.trial=null;p.seen=false;p.backWk=c.wk+1;
    const free=!c.bench;if(free){c.away=c.away.filter(x=>x!==p);c.bench=p;}   // back onto the bench, or it waits in the Shop until the bench is free
    rep.push(`No. ${p.no} is back from the ${C.body}: ${T.best?`certified ${C.name}`:"refused"}.${free?(T.best?"":" See the Test tab."):` It waits in the Shop (On your bench) until your bench is free${T.best?", or case it from there":""}.`}`);}
  /* 3b. R&D projects finishing (app/rnd.js) */
  rndClose(rep);
  /* 4. deadlines */
  for(const r of c.repairs.filter(r=>r.state==="in"&&c.wk+1>r.due)){rep.push(`${r.cust} collected ${r.watch} unrepaired.`);}
  c.repairs=c.repairs.filter(r=>!(r.state==="in"&&c.wk+1>r.due));
  for(const o of c.orders.filter(o=>c.wk+1-o.due>BIZ.lateCancel)){rep.push(`${o.cust} cancelled: ${tplOf(o.tpl).title.toLowerCase()} is too late.`);}
  c.orders=c.orders.filter(o=>c.wk+1-o.due<=BIZ.lateCancel);
  c.offers=c.offers.filter(o=>o.until>c.wk+1);if(c.tradeOffer&&c.tradeOffer.until<=c.wk+1)c.tradeOffer=null;
  /* 4b. the calendar: the fair, the trial's results, an auction night nobody opened, service returns */
  calClose(rep);
  /* 5. the costs */
  const rt=rent(),wg=wages();c.cash-=rt;book("out",rt,"rent");c.cash-=BIZ.keep;book("out",BIZ.keep,"your keep");
  if(wg){c.cash-=wg;book("out",wg,"wages");}
  if(c.loan){const lp=Math.min(c.loan.pay,c.loan.left);c.cash-=lp;book("out",lp,"bank loan");c.loan.left-=lp;if(c.loan.left<=.5){rep.push("The bank loan is paid off.");c.loan=null;}}
  /* 6. the new week: arrivals */
  c.wk++;const d=dateOf(c.wk),newYear=d.year!==c.year;c.year=d.year;c.week=d.week;c.used=0;
  const R2=weekRng("arrive"),nr=poisson(R2,BIZ.repairsWeek*(upOwned("shop")?BIZ.repairsShop:1)*SIM.eraMult(c.year,"repairs"));
  for(let i=0;i<nr;i++)addRepair(R2);if(nr){rep.push(`${nr} watch${nr>1?"es":""} in for repair.`);sfx("door");}
  if(R2()<1/BIZ.offerEvery){const n=c.offers.length;addOffer(R2);if(c.offers.length>n){rep.push("A commission enquiry: see the Shop tab.");sfx("door");}}
  if(R2()<Math.min(.8,(1+.2*repTier("trade"))*(1+BIZ.tradeStaff*staffHrs()/BIZ.staffHours)/BIZ.tradeEvery)){addTradeOffer(R2);if(c.tradeOffer&&c.tradeOffer.until===c.wk+BIZ.offerKeep){rep.push(`${c.tradeOffer.brand} asks about a trade batch.`);sfx("door");}}
  if(c.wk%8===0)refreshCands(R2);
  if(newYear)rep.push(`Happy new year: ${c.year}.`);
  let end=false;if(c.year>END_YEAR&&c.ended==null){c.ended=c.wk;end=true;rep.unshift(`${c.year}: ${END_YEAR-c.start+1} years in the Haldis. Your career summary is ready.`);}
  calWeekStart(rep);
  save();
  return{lines:rep,cash:c.cash,broke:c.cash<0,end};}
/* below zero: the bank, once; then the end */
function loanOffer(){const c=car(),L=BIZ.loan,need=-c.cash+L.cover*weeklyCosts();return Math.max(L.min,Math.ceil(need/L.round)*L.round);}
function takeLoan(){const c=car(),amt=loanOffer(),L=BIZ.loan,total=amt*(1+L.rate);
  c.loan={amt,left:total,pay:Math.ceil(total/L.weeks)};c.loanUsed=true;earn(amt,"bank loan");save();}
function goBroke(){const c=car();c.over=true;save();}
