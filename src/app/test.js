/* ===================== app/test.js: the Test tab =====================
   The timegrapher trace, position and temperature buttons, the adjustment loop (Regulate, Adjust beat, Poise) and
   certification. Arrives in PR 3 (plan section 6). Until then, ?sim=1 shows the raw simulate() result as text. */
TAB_RENDER.test=function(){
  if(!/[?&]sim=1(&|$)/.test(location.search))return;
  const o=$("simOut");o.hidden=false;o.textContent=JSON.stringify(SIM.simulate(S.cfg),null,2);};
