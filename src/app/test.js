/* ===================== app/test.js: the Test tab =====================
   The timegrapher trace, position and temperature buttons, the adjustment loop (Regulate, Adjust beat, Poise) and
   certification arrive in PR 3 (plan section 6). Until then the tab shows what WATCH_SIM.simulate() says about the movement
   on the bench, as plain text: amplitude, reserve, the six-position rates, beat error and the stress report. ---- */
const sgn=x=>(x>=0?"+":"−")+Math.abs(x).toFixed(1);
TAB_RENDER.test=function(){
  const r=SIM.simulate(S.cfg,S.career&&S.career.skills,null,{seed:"bench"}),o=$("simOut");
  const row=k=>SIM.POSITIONS.map(p=>sgn(r.rates[p][k]).padStart(6)).join("");
  o.hidden=false;
  o.textContent=[
    `Amplitude   ${Math.round(r.amp0)}° full wind · ${Math.round(r.amp24)}° at 24 h`,
    `Reserve     ${Math.round(r.reserveH)} h`,
    `Beat        ${r.bph.toLocaleString("en-GB")} bph · beat error ${r.beatErr.toFixed(2)} ms`,
    ``,
    `Rate s/day  `+SIM.POSITIONS.map(p=>p.padStart(6)).join(""),
    `  0 h       `+row("t0"),
    ` 24 h       `+row("t24"),
    `Mean ${sgn(r.rateMean24)} · spread ${r.posSpread24.toFixed(1)} · 8→38 °C ${r.tempSpread.toFixed(1)} s/day`,
    ``,
    `Shock ${(r.shock*100).toFixed(0)}% · magnet resistance ${(r.magnetResist*100).toFixed(0)}% · returns ${(r.returnRisk*100).toFixed(0)}%/yr`,
    `${r.thickness.toFixed(1)} mm · ${r.parts} parts · ${fmt$(r.cost)} parts · ${Math.round(r.hours)} h · prestige ${r.prestige}`,
    ``,
    ...(r.stress.length?r.stress.map(s=>({bad:"✖ ",warn:"▲ ",info:"· "}[s.sev])+s.text):["No stress lines: a sound build."])
  ].join("\n");};
