/* ---- trial.js: certification and adjustment (plan section 6b, 6c).
   CERT          the three grades, in CERT_ORDER: a Bench pass from your own bench, Chronometer from the Haldis Chronometry
                 Bureau (stamp BCH) and Observatory grade from the Kessel Peak Observatory. Each has its limits, its fee
                 and how many weeks the trial takes (fees and weeks are used from PR 5 / PR 6).
   CERT_MULT     what a certificate does to a piece's price.
   TRIAL         the 15 days: ten days in five positions (two each) at room temperature, three days dial up at 8, 23 and
                 38 C, two recovery days; the daily scatter.
   runTrial(cfg, skills, tools, opts) -> {days, stats, tiers: {bench|chronometer|observatory: {pass, checks}}, best}
                 opts = simulate()'s opts (seed, adjust) plus trialSeed (each submission draws its own daily scatter)
                 and noNoise. One run is checked against every grade at once.
   verdict(trial, tier) -> plain English: the certificate, or the first thing that failed and what would fix it.
   ADJ / adjustPiece(kind, adjust, cfg, skills, n, seed) -> the new adjust after one Regulate (n notches, + = faster),
                 Adjust beat or Poise, with the skill's noise. hoursFor(kind) is the bench time each one costs.
   certOdds(cfg, skills, tools) -> share of pieces of this build a careful watchmaker at these skills gets through
                 each grade (the Build tab's capsule). ---- */
const CERT={
  bench:{name:"Bench pass",body:"your own bench",stamp:"",fee:0,weeks:0,
    mean:[-30,30],maxVar:null,posSpread:null,thermal:null,beat:2.0,amp24:180},
  chronometer:{name:"Chronometer",body:"Haldis Chronometry Bureau",stamp:"BCH",fee:140,weeks:3,
    mean:[-4,6],maxVar:5,posSpread:6,thermal:.6,beat:.8,amp24:220},
  observatory:{name:"Observatory grade",body:"Kessel Peak Observatory",stamp:"Kessel Peak",fee:650,weeks:6,
    mean:[-1,2],maxVar:2,posSpread:3,thermal:.3,beat:.3,amp24:240}
};
const CERT_ORDER=["bench","chronometer","observatory"];
const CERT_MULT={none:1,bench:1,chronometer:1.6,observatory:2.5};
const TRIAL={
  days:[["DU",23],["DU",23],["DD",23],["DD",23],["PU",23],["PU",23],["PL",23],["PL",23],["PD",23],["PD",23],
        ["DU",8],["DU",23],["DU",38],["DU",23],["DU",23]],
  windT:12,          // h since winding: the trial winds every morning and reads the day's average
  noise:.8,          // s/day of daily scatter for a plain 28,800 bph movement with an index regulator
  noiseDrift:.5,     // extra scatter per unit of regulator drift (an index wanders, a micro-adjust stays put)
  thermalNoise:.4    // the climate-box days (8 and 38 C) are steadier: their scatter is this share of the rest
};
/* the adjustment loop: what one press of each button does, and what it costs */
const ADJ={
  regNoise:.25,regNoiseSkill:.025,   // a regulator nudge lands within this share of the step (level 1), less per level
  beatEff:.4,beatEffSkill:.05,       // share of the remaining beat error (above the floor) one Adjust beat takes out
  poiseEff:.25,poiseEffSkill:.04,    // share of the remaining positional error one Poise takes out (the sim caps poise at .95)
  hours:{reg:.1,beat:.5,poise:2},    // bench hours per press
  xp:{reg:1,beat:2,poise:3}          // skill XP per press (regulating, regulating, poising)
};
const ADJ_SKILL={reg:"regulating",beat:"regulating",poise:"poising"};
const gauss=R=>Math.sqrt(-2*Math.log(1-R()))*Math.cos(2*Math.PI*R());
const hoursFor=kind=>ADJ.hours[kind];
function adjustPiece(kind,adjust,cfg,skills,n,seed){
  const a=Object.assign({reg:0,beat:0,poise:0},adjust),L=lvl(skills,ADJ_SKILL[kind]),R=rng(seed==null?0:seed);
  if(kind==="reg"){const res=part("regulator",normCfg(cfg).cfg.regulator).adjustRes,s=Math.max(.03,ADJ.regNoise-ADJ.regNoiseSkill*(L-1));
    a.reg+=(+n||0)*res*(1+gauss(R)*s);}
  if(kind==="beat")a.beat+=(1-a.beat)*Math.min(.9,ADJ.beatEff+ADJ.beatEffSkill*(L-1));
  if(kind==="poise")a.poise=Math.min(.95,a.poise+(1-a.poise)*Math.min(.8,ADJ.poiseEff+ADJ.poiseEffSkill*(L-1)));
  return a;}

function runTrial(cfg,skills,tools,opts){
  opts=opts||{};
  const {P,m}=prepModel(cfg,skills,tools,opts),R=rng(opts.trialSeed!=null?opts.trialSeed:"trial");
  const sd=opts.noNoise?0:TRIAL.noise*(1+P.regulator.drift*TRIAL.noiseDrift)*m.wrist/P.bph.rateStability;
  const days=TRIAL.days.map(([pos,temp])=>({pos,temp,rate:rateAt(m,pos,TRIAL.windT,temp)+gauss(R)*sd*(temp===23?1:TRIAL.thermalNoise)}));
  const ten=days.slice(0,10),mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
  const pairs=[0,2,4,6,8].map(i=>[ten[i].rate,ten[i+1].rate]);
  const stats={
    mean:mean(ten.map(d=>d.rate)),
    maxVar:Math.max(...pairs.map(([a,b])=>Math.abs(b-a))),
    posSpread:Math.max(...pairs.map(mean))-Math.min(...pairs.map(mean)),
    thermal:Math.abs(days[12].rate-days[10].rate)/30,
    beat:beatAt(m,0),amp24:ampAt(m,24)};
  const f1=x=>x.toFixed(1),sg=x=>(x>=0?"+":"−")+Math.abs(x).toFixed(1);
  const tiers={};let best=null;
  for(const id of CERT_ORDER){const T=CERT[id],checks=[];
    checks.push({k:"mean",label:"Mean daily rate",val:sg(stats.mean)+" s/d",lim:`${sg(T.mean[0])} to ${sg(T.mean[1])}`,ok:stats.mean>=T.mean[0]&&stats.mean<=T.mean[1]});
    if(T.maxVar!=null)checks.push({k:"maxVar",label:"Greatest day-to-day change",val:f1(stats.maxVar)+" s/d",lim:"≤ "+T.maxVar,ok:stats.maxVar<=T.maxVar});
    if(T.posSpread!=null)checks.push({k:"posSpread",label:"Spread between positions",val:f1(stats.posSpread)+" s/d",lim:"≤ "+T.posSpread,ok:stats.posSpread<=T.posSpread});
    if(T.thermal!=null)checks.push({k:"thermal",label:"Temperature (per °C)",val:stats.thermal.toFixed(2)+" s/d",lim:"≤ "+T.thermal,ok:stats.thermal<=T.thermal});
    checks.push({k:"beat",label:"Beat error",val:stats.beat.toFixed(2)+" ms",lim:"≤ "+T.beat,ok:stats.beat<=T.beat});
    checks.push({k:"amp24",label:"Amplitude after 24 h",val:Math.round(stats.amp24)+"°",lim:"≥ "+T.amp24+"°",ok:stats.amp24>=T.amp24});
    const pass=checks.every(c=>c.ok);tiers[id]={pass,checks};if(pass)best=id;}
  return{days,stats,tiers,best};}

/* what to say about a trial: the certificate, or the first failure with a fix */
const CERT_ADVICE={
  mean:(s,T)=>{const mid=(T.mean[0]+T.mean[1])/2,d=s.mean-mid;return `It ran ${d>0?"fast":"slow"}: ${(s.mean>=0?"+":"−")+Math.abs(s.mean).toFixed(1)} s/day on average. Regulate it about ${Math.abs(d).toFixed(0)} s/day ${d>0?"slower":"faster"}.`;},
  maxVar:s=>`It wandered by up to ${s.maxVar.toFixed(1)} s/day from one day to the next. A micro-adjust regulator holds its setting better; a faster beat steadies it too.`,
  posSpread:s=>`The rate changed by ${s.posSpread.toFixed(1)} s/day between positions. Poise the balance (and test in more positions if your timing machine can).`,
  thermal:s=>`Temperature moved it ${s.thermal.toFixed(2)} s/day for every degree. A steel hairspring can't do better; a self-compensating alloy or silicon spring can.`,
  beat:s=>`Beat error was ${s.beat.toFixed(2)} ms: the tick and the tock are uneven. Adjust the beat; a better regulator and more regulating skill get it lower.`,
  amp24:s=>`After a day off the winder the balance only swung ${Math.round(s.amp24)}°. It needs more torque, less friction or a lighter balance.`
};
function verdict(t,tier){const T=CERT[tier],r=t.tiers[tier];
  if(r.pass)return tier==="bench"?"Passes on your own bench: it keeps time well enough to sell.":`Certified ${T.name} by the ${T.body}${T.stamp&&T.stamp!==T.body?` (${T.stamp})`:""}.`;
  const bad=r.checks.filter(c=>!c.ok);
  return `${tier==="bench"?"Not ready to sell":"Refused by the "+T.body}: ${bad.length===1?"one check":bad.length+" checks"} failed. `+CERT_ADVICE[bad[0].k](t.stats,T);}

/* the odds a careful watchmaker gets a piece of this build through each grade: regulated to the middle of the Chronometer
   window (within half a regulator notch), beat set to the floor, four presses of Poise. n pieces, each its own seed */
function certOdds(cfg,skills,tools,n){
  n=n||8;const c=normCfg(cfg).cfg,res=part("regulator",c.regulator).adjustRes,out={};for(const id of CERT_ORDER)out[id]=0;
  const pe=Math.min(.8,ADJ.poiseEff+ADJ.poiseEffSkill*(lvl(skills,"poising")-1)),poise=Math.min(.95,1-Math.pow(1-pe,4));
  const target=(CERT.chronometer.mean[0]+CERT.chronometer.mean[1])/2;
  for(let i=0;i<n;i++){const seed="odds"+i,R=rng(seed+"r");
    const adjust={reg:0,beat:1,poise};
    const dry=runTrial(c,skills,tools,{seed,adjust,noNoise:true});
    adjust.reg=target-dry.stats.mean+(R()-.5)*res;
    const t=runTrial(c,skills,tools,{seed,adjust,trialSeed:seed+"t"});
    for(const id of CERT_ORDER)if(t.tiers[id].pass)out[id]++;}
  for(const id of CERT_ORDER)out[id]/=n;
  return out;}
