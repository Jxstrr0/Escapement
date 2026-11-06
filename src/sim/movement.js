/* ---- movement.js: simulate(cfg, skills, tools, opts) (plan section 4b). Every constant is in the K table below.
   cfg     a movement: one option id per slot, lists for complications and finish (see DEFAULT_CFG in parts.js)
   skills  the watchmaker's levels 1..10: assembly, regulating, poising, finishing, complications (missing = 1)
   tools   {timingRes} from the owned timing machine (1 = basic; better machines read finer and help set the beat)
   opts    seed    a number or text that makes this one piece (two pieces of the same build differ slightly)
           adjust  {reg, beat, poise}: the player's adjustment (PR 3). reg = s/day of regulator correction,
                   beat 0..1 = share of the beat error taken out, poise 0..1 = share of the positional error taken out
           age     years since the last service (oil ageing)
           caseMax the case's movement-thickness limit in mm (PR 5), for the "too thick" combo
           worn    true = on the wrist (an automatic stays near full wind)
   Returns the result object: amplitude, reserve, rates per position and temperature, beat error, shock and magnetism,
   thickness, parts, cost, hours, service interval, prestige, a stress report from COMBOS, and `m`, the model numbers
   rateAt / ampAt / beatAt need (the timegrapher and the trial read rates from those).
   Positions: DU dial up, DD dial down, PU crown up, PD crown down, PL crown left, PR crown right.
   Temperatures: 8, 23 and 38 C. ---- */
const POSITIONS=["DU","DD","PU","PD","PL","PR"],VERTICAL={PU:1,PD:1,PL:1,PR:1},TEMPS=[8,23,38];
const SKILL_NAMES=["assembly","regulating","poising","finishing","complications"];
const K={
  ampScale:230,         // amplitude at full wind (deg) = ampScale * sqrt(torque * efficiency * (1 - friction) / (1 + draw)) / inertia
  ampFall:.9,           // then it falls with the torque across the reserve: amp(t) = amp0 * (torque(t) / torque0) ^ ampFall
  ampMin:150,ampMax:335,// clamp; below ~150 the escapement can't unlock reliably and the watch is as good as stopped
  ampRef:270,           // the amplitude the hairspring is tuned for: no isochronism error here
  iso:.11,              // s/day gained per degree of amplitude below ampRef (before the overcoil helps)
  overcoilCut:.75,      // share of the isochronism error a perfect overcoil (1.0) removes
  poise:28,             // s/day: positional error scale for a balance with poise 0
  poiseAmp:180,         // positional error grows by 1x for every poiseAmp degrees below ampRef
  posShape:{DU:0,DD:.18,PU:.55,PD:-1.0,PL:.42,PR:-.62},   // the usual pattern: dial-up best, crown-down worst
  posJitter:.25,        // each piece's own scatter on that pattern
  freeSprungPoise:.8,   // a free-sprung balance keeps its poise better
  regSpread:16,         // s/day: how far off a fresh assembly runs before regulation, at assembly level 1
  beatBase:2.6,         // ms: beat error out of the box at assembly level 1 with the basic timing machine
  beatSkillFloor:.25,   // ms: the best beat error a regulating-level-1 hand reaches, on top of the regulator's own floor (0 at level 10)
  overComplexBeat:.22,  // ms of extra beat error per level of complexity above the complications skill
  wornT:8,              // h: an automatic on the wrist stays this close to full wind
  overBphFriction:1.15, // train friction multiplier when the beat is faster than the train is rated for
  overBphWear:1.5,
  ageAmp:.03,           // share of amplitude lost per year since service as the oil thickens
  lubeFreeAge:.3,       // an oil-free escapement ages at this share of the rate
  baseThick:3.1,        // mm: plates, bridges, dial train of a plain three-hander
  baseParts:96,         // plates, bridges, screws, keyless works
  baseCost:60,baseHours:16,
  serviceBase:5,        // years between services for a Swiss lever at 28,800
  calibre:{prestige:6,cost:.8,hours:.8},   // built on your own calibre (cfg.cal): collectors' points, and tooling made for it
  ret:{base:.01,shock:.07,magnet:.03,oil:.006,over:.03,max:.5},   // yearly chance a sold piece comes back
  skillStep:{beat:.18,reg:.09,poise:.07,hours:.03}                // per skill level above 1
};

const clamp=(x,a,b)=>x<a?a:x>b?b:x;
const lvl=(skills,k)=>clamp(+((skills||{})[k])||1,1,10);
/* small deterministic random numbers, so a piece keeps its personality: hash a text to a seed, then mulberry32 */
function hashStr(s){let h=2166136261;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function rng(seed){let a=(typeof seed==="number"?seed:hashStr(seed))>>>0;return()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}

/* fill missing slots from DEFAULT_CFG, drop unknown ids, and fix rule-breaking builds. Returns {cfg, fixes} where fixes
   lists what was changed, in words, so the Build tab can say so */
function normCfg(cfg){
  const c={},fixes=[];cfg=cfg||{};
  for(const s of SLOTS){
    if(MULTI[s]){const v=Array.isArray(cfg[s])?cfg[s]:[];c[s]=[...new Set(v.filter(id=>part(s,id)))];continue;}
    c[s]=part(s,cfg[s])?cfg[s]:DEFAULT_CFG[s];}
  if(typeof cfg.cal==="string"&&/^[a-z0-9-]{1,16}$/.test(cfg.cal))c.cal=cfg.cal;   // your own calibre's id (the app checks the core matches)
  const reg=part("regulator",c.regulator),bal=part("balance",c.balance);
  if(reg.needsFreeSprung&&!bal.freeSprung){c.regulator="index";fixes.push("A free-sprung regulator needs a free-sprung balance, so it was set back to an index.");}
  if(bal.freeSprung&&!reg.needsFreeSprung){c.regulator="free-sprung";fixes.push("A free-sprung balance is regulated by its weights, so the regulator was set to free-sprung.");}
  for(const id of c.complications.slice()){const o=part("complications",id);
    if(o.needs&&!c.complications.includes(o.needs)){c.complications=c.complications.filter(x=>x!==id);fixes.push(o.name+" needs a "+part("complications",o.needs).name.toLowerCase()+", so it was taken off.");}}
  return{cfg:c,fixes};
}
/* the default seed: the cfg as text, leaving out an empty in-house list so builds keep the personality they had before PR 7 */
function seedKey(c){if(c.house.length)return JSON.stringify(c);const o=Object.assign({},c);delete o.house;return JSON.stringify(o);}
/* the option objects for a normalised cfg */
function pick(c){const P={};for(const s of SLOTS)P[s]=MULTI[s]?c[s].map(id=>part(s,id)):part(s,c[s]);return P;}

/* ---- the model numbers for one piece ---- */
function model(cfg,skills,tools,opts){
  opts=opts||{};const n=normCfg(cfg),c=n.cfg,P=pick(c),adj=Object.assign({reg:0,beat:0,poise:0},opts.adjust||{});
  const L=k=>lvl(skills,k),comps=P.complications;
  const draw=comps.reduce((a,o)=>a+o.torqueDraw,0);
  const maxCx=comps.reduce((a,o)=>Math.max(a,o.complexity),0),overCx=Math.max(0,maxCx-L("complications"));
  const overBph=P.bph.bph>P.train.maxBph;
  const friction=P.train.friction*P.jewels.mult*(overBph?K.overBphFriction:1);
  const age=Math.max(0,+opts.age||0),ageAmp=1-K.ageAmp*age*(P.escapement.lubeFree?K.lubeFreeAge:1);
  const R=rng(opts.seed!=null?opts.seed:seedKey(c));
  const jit={};for(const p of POSITIONS)jit[p]=(R()*2-1)*K.posJitter;
  const posAvg=comps.reduce((a,o)=>Math.max(a,o.posAvg||0),0);
  const m={
    torque:P.barrel.torque,falloff:P.barrel.falloff,
    reserveH:P.barrel.reserveH*P.bph.reserveMult/(1+draw),
    amp0:K.ampScale*Math.sqrt(P.barrel.torque*P.escapement.efficiency*(1-friction)/(1+draw))*P.bph.ampMult*ageAmp/P.balance.inertia,
    keepsWind:P.winding.keepsWind,worn:!!opts.worn,
    isoK:K.iso*(1-P.hairspring.overcoil*K.overcoilCut)/P.bph.rateStability,
    poiseE:K.poise*(1-P.balance.poise)*Math.pow(1-K.skillStep.poise,L("poising")-1)*(1-clamp(adj.poise,0,.95))
      *(P.balance.freeSprung?K.freeSprungPoise:1)/P.bph.rateStability,
    posAvg,jit,
    tempCoeff:P.hairspring.tempCoeff,
    offset:(R()*2-1)*K.regSpread*Math.pow(1-K.skillStep.reg,L("assembly")-1)+(+adj.reg||0),
    ageDrift:-(P.escapement.oilDrift*(P.escapement.lubeFree?K.lubeFreeAge:1)+P.regulator.drift*.5)*age,
    wrist:1,               // combos can raise this (rate scatter on the wrist)
    beat0:0,beatFloor:P.regulator.beatFloor+K.beatSkillFloor*(10-L("regulating"))/9,
    draw,overCx,overBph,friction,age,adj
  };
  const be=K.beatBase*Math.pow(1-K.skillStep.beat,L("assembly")-1)/Math.max(.5,+(tools||{}).timingRes||1)+overCx*K.overComplexBeat;
  m.beat0=Math.max(m.beatFloor,m.beatFloor+(Math.max(be,m.beatFloor)-m.beatFloor)*(1-clamp(adj.beat,0,1)));
  return{c,P,m,fixes:n.fixes,L};
}
/* hours since full wind -> torque share used; an automatic on the wrist stays near the top of the curve */
function windT(m,t){return m.keepsWind&&m.worn?Math.min(t,K.wornT):t;}
function ampAt(m,t){const tt=clamp(windT(m,t),0,m.reserveH);return clamp(m.amp0*Math.pow(1-m.falloff*tt/m.reserveH,K.ampFall),K.ampMin,K.ampMax);}
function beatAt(m,t){return m.beat0*Math.sqrt(K.ampRef/ampAt(m,t));}   // beat error grows as the amplitude falls
/* rate in s/day for a position, hours since full wind and temperature in C */
function rateAt(m,pos,t,temp){
  const a=ampAt(m,t);
  const iso=m.isoK*(K.ampRef-a);
  let pe=m.poiseE*((K.posShape[pos]||0)+(pos==="DU"?0:m.jit[pos]))*(1+(K.ampRef-a)/K.poiseAmp);
  if(VERTICAL[pos])pe*=1-m.posAvg;
  const te=m.tempCoeff*((temp==null?23:temp)-23);
  return (iso+pe)*m.wrist+te+m.offset+m.ageDrift;}

/* model() plus the COMBOS penalties that change the model; simulate() and runTrial() both start here */
function prepModel(cfg,skills,tools,opts){
  const x=model(cfg,skills,tools,opts||{}),fired=new Set();
  COMBOS.forEach(r=>{if(r.pre&&r.when({c:x.c,P:x.P,m:x.m,opts:opts||{}})){r.pre(x.m,{c:x.c,P:x.P});fired.add(r);}});
  x.fired=fired;return x;}
function simulate(cfg,skills,tools,opts){
  opts=opts||{};
  const {c,P,m,fixes,L,fired}=prepModel(cfg,skills,tools,opts);
  const comps=P.complications,all=[];
  for(const s of SLOTS)if(MULTI[s])all.push(...P[s]);else all.push(P[s]);
  const sum=k=>all.reduce((a,o)=>a+(o[k]||0),0);
  const rates={};for(const p of POSITIONS)rates[p]={t0:rateAt(m,p,0,23),t24:rateAt(m,p,24,23)};
  const r24=POSITIONS.map(p=>rates[p].t24),r0=POSITIONS.map(p=>rates[p].t0),every=r0.concat(r24);
  const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
  const shock=clamp(P.shock.shockRating*(1-P.escapement.shockFragile*.6)*(P.balance.inertia>1.1?.92:1),0,1);
  const magnet=P.hairspring.magnet;
  const thickness=K.baseThick+(P.barrel.thick||0)+(P.escapement.thick||0)+P.winding.thick+comps.reduce((a,o)=>a+o.thick,0);
  const cal=c.cal?K.calibre:{prestige:0,cost:1,hours:1};
  const houseSave=P.house.reduce((a,o)=>a+(o.of==="base"?K.baseCost:P[o.of].cost)*o.save,0);
  const hoursRaw=(K.baseHours+sum("hours"))*cal.hours;
  const res={
    cfg:c,fixes,
    bph:P.bph.bph,beatsPerSec:P.bph.bph/3600,
    amp0:ampAt(m,0),amp24:ampAt(m,24),ampEnd:ampAt(m,m.reserveH),
    reserveH:m.reserveH,
    rates,
    rateMean24:mean(r24),rateMean0:mean(r0),
    posSpread24:Math.max(...r24)-Math.min(...r24),
    band:[Math.min(...every),Math.max(...every)],
    temps:TEMPS.map(T=>({T,rate:rateAt(m,"DU",0,T)})),
    tempSpread:Math.abs(rateAt(m,"DU",0,38)-rateAt(m,"DU",0,8)),
    beatErr:m.beat0,beatErr24:beatAt(m,24),
    shock,magnetResist:1-magnet,
    returnRisk:0,
    thickness,parts:K.baseParts+sum("parts"),
    cost:Math.round((K.baseCost+sum("cost")-houseSave)*cal.cost),
    hours:hoursRaw,hoursSkilled:hoursRaw*Math.pow(1-K.skillStep.hours,L("assembly")-1),
    serviceYears:K.serviceBase*(1.2/(.4+P.escapement.oilDrift*.67))/(P.bph.wearMult*(m.overBph?K.overBphWear:1)),
    prestige:sum("prestige")+cal.prestige,house:c.house.length,
    complexity:comps.reduce((a,o)=>Math.max(a,o.complexity),0),overComplex:m.overCx,
    dropCrack:P.hairspring.brittle?.6:0,
    stress:[],m
  };
  res.returnRisk=clamp(K.ret.base+(1-shock)*K.ret.shock+magnet*K.ret.magnet+P.escapement.oilDrift*K.ret.oil+m.overCx*K.ret.over,0,K.ret.max);
  for(const f of fixes)res.stress.push({id:"fixed",tag:"fixed",sev:"info",text:f});
  COMBOS.forEach(r=>{if(r.pre?fired.has(r):r.when({c,P,m,r:res,opts})){if(r.post)r.post(res,{c,P});res.stress.push({id:r.id,tag:r.tag,sev:r.sev,text:typeof r.text==="function"?r.text({c,P,m,r:res,opts}):r.text});}});
  if(opts.caseMax&&res.thickness>opts.caseMax+1e-9)res.tooThick=true;
  const ord={bad:0,warn:1,info:2};res.stress.sort((a,b)=>ord[a.sev]-ord[b.sev]);
  return res;
}
