/* ---- vis/api.js: the WATCH_VIS public object. The app calls these; the vis never reads game state. ---- */
let started=false;
return{
  init(canvas){if(started)return;started=true;initRenderer(canvas);rebuild();bindOrbit(canvas);requestAnimationFrame(frame);},
  setQuality(tier){tier=tier==="ultra"||tier==="full"?tier:"lite";if(tier===V.tier&&V.move)return;V.tier=tier;if(started)rebuild();},
  setMovement(cfg){/* PR 4: rebuild the parametric movement from cfg */},
  setRun(o){Object.assign(V.run,o||{});},
  setView(name){/* PR 4: "loupe", "exploded", "home" */},
  fps(){return V.fpsObj;},
  get tier(){return V.tier;},
  _state:V
};
})();
window.WATCH_VIS=WATCH_VIS;
</script>
