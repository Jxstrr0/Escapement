/* ---- vis/api.js: the WATCH_VIS public object. The app calls these; the vis never reads game state. ---- */
let started=false;
return{
  init(canvas){if(started)return;started=true;initRenderer(canvas);rebuild();bindOrbit(canvas);requestAnimationFrame(frame);studioStart();},
  setQuality(tier){tier=tier==="ultra"||tier==="full"?tier:"lite";if(tier===V.tier&&V.move)return;V.tier=tier;if(started)rebuild();},
  /* rebuild the movement when the parts change (the same cfg again costs nothing) */
  setMovement(cfg){const k=JSON.stringify(cfg||{});if(k===V.cfgKey)return;V.cfgKey=k;V.cfg=JSON.parse(k);if(started)rebuildMove();},
  setRun(o){Object.assign(V.run,o||{});},
  /* "home", "exploded" or "loupe"; the app hears double-tap changes through onView */
  setView(name){setViewName(name,true);},
  get view(){return V.view;},
  onView(fn){V.viewCbs.push(fn);},
  setMotion(reduced){V.reduce=!!reduced;},
  fps(){return V.fpsObj;},
  get tier(){return V.tier;},
  _state:V
};
})();
window.WATCH_VIS=WATCH_VIS;
</script>
