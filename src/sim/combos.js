/* ---- combos.js: COMBOS, how parts interact (plan section 4c). Each rule adds a plain-English line to the stress report
   and sometimes a penalty.
     id    name for code
     tag   a two-word label (the Build tab's delta chips)
     sev   "bad" (will cause trouble), "warn" (costs you something), "info" (worth knowing)
     when  ctx -> true when the rule applies. ctx = {c: cfg, P: the option objects, m: model numbers, r: result, opts}
     pre   (m, ctx) -> change the model BEFORE rates are worked out (r is not there yet). A rule with pre is checked early
     post  (r, ctx) -> change the result after (return risk, flags). Rules without pre are checked against the result
     text  the line, or ctx -> the line
   Order here is the order lines appear within each severity. ---- */
const COMBOS=[
  /* penalties on the model */
  {id:"fast-small-barrel",tag:"short reserve",sev:"bad",when:x=>x.P.bph.bph>=36000&&x.c.barrel==="single-small",
    pre:m=>{m.reserveH*=.88;},
    text:x=>`Reserve under 30 h: a small spring can't feed a 36,000 bph balance for long (${Math.round(x.r.reserveH)} h). It stops overnight off the wrist.`},
  {id:"over-bph",tag:"pivot wear",sev:"warn",when:x=>x.m.overBph,
    text:x=>`The ${x.P.train.name.toLowerCase()} is rated to ${x.P.train.maxBph.toLocaleString("en-GB")} bph. At ${x.P.bph.bph.toLocaleString("en-GB")} the pivots wear fast and friction rises: polished pivots fix it.`},
  {id:"steel-chrono-noshock",tag:"won't hold rate",sev:"bad",when:x=>/^steel/.test(x.c.hairspring)&&x.c.complications.includes("chrono")&&x.c.shock==="none",
    pre:m=>{m.wrist*=1.6;},
    text:"Will not hold rate on the wrist: every chronograph start and reset jolts an unprotected steel hairspring."},
  /* lines about the result */
  {id:"weak-balance",tag:"weak swing",sev:"bad",when:x=>x.r.amp0<220,
    post:r=>{r.returnRisk=Math.min(.5,r.returnRisk+.03);},
    text:x=>x.P.balance.inertia>1.1&&x.P.barrel.torque<6.5
      ?`Amplitude below 220° at full wind (${Math.round(x.r.amp0)}°): the large balance is too heavy for this spring.`
      :`Amplitude below 220° at full wind (${Math.round(x.r.amp0)}°): not enough torque reaches the balance. A stronger barrel, less friction or a lighter balance would help.`},
  {id:"low-amp-24",tag:"tired by evening",sev:"warn",when:x=>x.r.amp0>=220&&x.r.amp24<200&&x.r.reserveH>24,
    text:x=>`Tired by evening: amplitude drops to ${Math.round(x.r.amp24)}° after 24 h, and the rate wanders with it.`},
  {id:"short-reserve",tag:"short reserve",sev:"warn",when:x=>x.r.reserveH<36&&!x.P.winding.keepsWind&&!(x.P.bph.bph>=36000&&x.c.barrel==="single-small"),
    text:x=>`Only ${Math.round(x.r.reserveH)} h of reserve: a hand-wound watch left on the dresser stops before the next morning.`},
  {id:"detent-drop",tag:"drop risk",sev:"bad",when:x=>x.c.escapement==="detent"&&(x.c.shock==="none"||x.c.shock==="basic"),
    post:r=>{r.returnRisk=Math.min(.5,r.returnRisk+.1);r.dropRisk=true;},
    text:"Drop test risk: a detent escapement unlocks on a knock and can trip, stop or break its spring. It needs premium shock protection to live on a wrist."},
  {id:"silicon-brittle",tag:"brittle spring",sev:"warn",when:x=>x.P.hairspring.brittle,
    text:"Silicon doesn't bend, it cracks. A hard drop that a steel spring would survive breaks this one: hairspring cracked."},
  {id:"no-shock",tag:"no shock",sev:"warn",when:x=>x.c.shock==="none"&&x.c.escapement!=="detent",
    text:"No shock protection: the first drop breaks a balance pivot. Expect returns."},
  {id:"magnet-steel",tag:"magnetism",sev:"warn",when:x=>x.P.hairspring.magnet>=.8,
    text:"Steel hairspring: a phone speaker or a handbag clasp can magnetise it, and it then gains minutes a day until demagnetised."},
  {id:"temp-steel",tag:"temperature",sev:"warn",when:x=>x.r.tempSpread>10,
    text:x=>`Temperature: ${x.r.tempSpread.toFixed(0)} s/day between a cold morning and a hot afternoon. A compensating alloy spring fixes this.`},
  {id:"too-thick",tag:"too thick",sev:"bad",when:x=>x.opts.caseMax&&x.r.thickness>x.opts.caseMax,
    text:x=>`Too thick for the case: ${x.r.thickness.toFixed(1)} mm against the case's ${x.opts.caseMax.toFixed(1)} mm${x.P.winding.keepsWind?" (the automatic rotor alone adds 1.2 mm)":""}.`},
  {id:"over-complex",tag:"beyond your skill",sev:"warn",when:x=>x.m.overCx>0,
    text:x=>`Beyond your skill: this build needs complications level ${x.r.complexity}. Expect extra beat error and returns until you train up.`},
  {id:"fast-beat",tag:"fast beat",sev:"info",when:x=>x.P.bph.bph>=36000&&x.r.reserveH>=30,
    text:"36,000 bph: holds its rate better on the wrist, but wears faster and wants a service sooner."},
  {id:"slow-beat",tag:"slow beat",sev:"info",when:x=>x.P.bph.bph<=18000,
    text:"18,000 bph: a lovely lazy sweep and a long reserve, but every knock on the wrist shows in the rate."},
  {id:"tourbillon",tag:"tourbillon",sev:"info",when:x=>x.m.posAvg>0,
    text:"The tourbillon cage averages out most of the vertical-position error. It does nothing for dial up or dial down."},
  {id:"lube-free",tag:"oil-free",sev:"info",when:x=>x.P.escapement.lubeFree,
    text:"No oil on the pallets: the rate hardly drifts between services."}
];
