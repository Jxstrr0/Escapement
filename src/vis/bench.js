/* ---- vis/bench.js: the lights (one warm lamp; the room adds daylight, vis/room.js), rebuilds, orbit and pinch controls, a double tap for the
   loupe, framing (fitDist keeps the whole movement in view at any aspect), the camera views (home, exploded, loupe; they
   glide, or cut with reduced motion) and the frame loop, which hands the time to animateMovement (vis/movement.js). ---- */
function buildLights(){
  const g=new THREE.Group(),lite=V.tier==="lite";
  g.add(new THREE.HemisphereLight(0x8a9a90,0x1a1410,lite?.75:.45));
  const lamp=new THREE.DirectionalLight(0xffe7c2,lite?1.15:1.6);lamp.position.set(-3,8,4);
  if(!lite){lamp.castShadow=true;lamp.shadow.mapSize.set(1024,1024);const c=lamp.shadow.camera;c.left=c.bottom=-4;c.right=c.top=4;c.near=1;c.far=20;lamp.shadow.bias=-.0005;lamp.shadow.radius=3;}
  g.add(lamp);
  const rim=new THREE.DirectionalLight(0x9fb4c8,lite?.35:.5);rim.position.set(5,3,-6);g.add(rim);
  return g;
}
function dropGroup(k){const g=V[k];if(!g)return;V.scene.remove(g);g.traverse(o=>{if(o.geometry)o.geometry.dispose();});
  const mm=g.userData&&g.userData.mats;if(mm){mm.own.forEach(m=>m.dispose());mm.texs.forEach(t=>t.dispose());}V[k]=null;}
/* rebuild only the movement (a new cfg) */
function rebuildMove(){dropGroup("move");V.move=buildMovement(V.cfg);V.scene.add(V.move);moveModels(V.move);watchShow();if(V.view==="loupe")setGoal("loupe");}
/* rebuild everything that depends on the tier */
/* the room (vis/room.js): rebuilt when the app's room spec changes; models follow on Full / Ultra */
function rebuildRoom(){dropRoom();V.room=buildRoom(V.roomSpec);V.scene.add(V.room);
  if(V.tier!=="lite")V.room.traverse(o=>{const mm=V.room.userData.mats;if(o.isMesh&&(o.material===mm.felt||o.material===mm.bench))o.receiveShadow=true;});
  roomModels(V.room,V.room.userData.spec);backApply();}   // backApply: photo mode's backdrop (vis/photo.js) hides a new room too
function rebuild(){
  for(const k of ["move","lamp"])dropGroup(k);
  makeMats(V.tier);
  V.lamp=buildLights();V.move=buildMovement(V.cfg);
  V.scene.add(V.lamp,V.move);moveModels(V.move);rebuildRoom();rebuildWatch();
  V.r.shadowMap.enabled=V.tier!=="lite";V.r.shadowMap.type=THREE.PCFSoftShadowMap;
  /* Lite bakes its tone curve into the light (vis/studio.js); Full / Ultra tone-map the HDR reflections on the GPU */
  V.r.toneMapping=V.tier==="lite"?THREE.NoToneMapping:THREE.ACESFilmicToneMapping;V.r.toneMappingExposure=ENV.full.exp;
  V.r.setPixelRatio(V.tier==="lite"?1:Math.min(window.devicePixelRatio||1,2));
  V.comp=null;V.bloom=null;V.dof=null;backApply();
  /* Ultra: depth of field focused on the movement (a macro lens: the closer, the shallower), then bloom on the brightest glints */
  if(V.tier==="ultra"&&window.__escPost)window.__escPost(ok=>{if(!ok||V.tier!=="ultra")return;
    V.comp=new THREE.EffectComposer(V.r);V.comp.addPass(new THREE.RenderPass(V.scene,V.cam));
    /* depth of field before the bloom: the bloom pass draws the last step to the screen with the renderer's sRGB output */
    if(THREE.BokehPass){V.dof=new THREE.BokehPass(V.scene,V.cam,{focus:12,aperture:ROOM.dof/12,maxblur:.008,width:V.w||1,height:V.h||1});V.comp.addPass(V.dof);}
    V.bloom=new THREE.UnrealBloomPass(new THREE.Vector2(V.w||1,V.h||1),.3,.35,.93);V.comp.addPass(V.bloom);
    resize(true);backApply();});
  resize(true);
}
function resize(force){
  const c=V.canvas,w=c.clientWidth|0,h=c.clientHeight|0;
  if(!w||!h||(!force&&w===V.w&&h===V.h))return;
  V.w=w;V.h=h;V.r.setSize(w,h,false);V.cam.aspect=w/h;V.cam.updateProjectionMatrix();
  const was=V.fit;V.fit=fitDist();
  if(!was||V.view==="home"&&!V.goal&&Math.abs(V.orbit.dist-was)<.01)V.orbit.dist=V.fit;   // keep the movement framed when the view changes shape
  else if(V.goal)setGoal(V.view);
  if(V.comp){V.comp.setSize(w,h);V.comp.setPixelRatio&&V.comp.setPixelRatio(V.r.getPixelRatio());}
}
/* how far back the camera must sit to see the whole movement (plate, crown, a little room) at this aspect and pitch */
function fitDist(pitch){
  pitch=pitch==null?.9:pitch;const vf=V.cam.fov*Math.PI/360,hf=Math.atan(Math.tan(vf)*V.cam.aspect);
  const hh=4.7*Math.sin(pitch)+1.2*Math.cos(pitch)+.5,hw=5.6;   // the top 0.5 leaves room for the HUD
  return Math.max(hh/Math.tan(vf),hw/Math.tan(hf));}
/* the same for the cased watch (vis/watch.js): its lugs reach further than the movement, the crown sticks out at the side */
function fitWatch(pitch){const u=V.watch&&V.watch.userData,L=u?u.halfL:6.3,Wd=u?u.halfW:6.4,h=u?u.h:2.6;
  const vf=V.cam.fov*Math.PI/360,hf=Math.atan(Math.tan(vf)*V.cam.aspect),hh=L*Math.sin(pitch)+h*Math.cos(pitch)+.4;
  return 1.12*Math.max(hh/Math.tan(vf),(Wd+.3)/Math.tan(hf));}
/* the camera views. Each sets a goal the frame loop glides to (or jumps to, with reduced motion) */
function setGoal(view){
  const u=V.move&&V.move.userData,o=V.orbit;
  if(view==="loupe"&&u&&u.loupe)V.goal={tx:u.loupe.x,ty:u.loupe.y,tz:u.loupe.z,dist:6.4,pitch:1.05};
  else if(view==="exploded")V.goal={tx:0,ty:2.0,tz:0,dist:fitDist(.45)*1.3,pitch:.45};
  else if(view==="dial")V.goal={tx:0,ty:.6,tz:.4,dist:fitWatch(1.15),pitch:1.15};
  else V.goal={tx:0,ty:0,tz:0,dist:V.fit||fitDist(),pitch:.9};}
function setViewName(view,quiet){
  if(view!=="loupe"&&view!=="exploded"&&view!=="dial")view="home";
  V.view=view;V.explodeT=view==="exploded"?1:0;watchShow();setGoal(view);
  if(!quiet)for(const f of V.viewCbs)try{f(view);}catch(e){}}
function placeCam(){
  const o=V.orbit;roomClamp(o);const cp=Math.cos(o.pitch);
  V.cam.position.set(o.tx+Math.sin(o.yaw)*cp*o.dist,o.ty+Math.sin(o.pitch)*o.dist,o.tz+Math.cos(o.yaw)*cp*o.dist);
  V.cam.lookAt(o.tx,o.ty,o.tz);
}
/* one finger turns, two fingers pinch to zoom, the mouse wheel zooms */
const maxDist=()=>Math.max(ROOM.zoomOut,(V.fit||12)*1.6);   // far enough out to take in the whole bench
function bindOrbit(el){
  const P=new Map();let pinch0=0,dist0=0,down=null,lastTap=0,multi=false;
  el.addEventListener("pointerdown",e=>{el.setPointerCapture&&el.setPointerCapture(e.pointerId);P.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(P.size===1){down={x:e.clientX,y:e.clientY,t:performance.now()};multi=false;}
    if(P.size===2){multi=true;V.goal=null;const [a,b]=[...P.values()];pinch0=Math.hypot(a.x-b.x,a.y-b.y);dist0=V.orbit.dist;}});
  el.addEventListener("pointermove",e=>{const p=P.get(e.pointerId);if(!p)return;
    if(P.size===1){const dx=e.clientX-p.x,dy=e.clientY-p.y;V.orbit.yaw-=dx*.008;V.orbit.pitch=Math.max(.25,Math.min(1.45,V.orbit.pitch+dy*.006));
      if(V.goal&&(dx||dy))V.goal.pitch=null;}
    p.x=e.clientX;p.y=e.clientY;
    if(P.size===2&&pinch0){const [a,b]=[...P.values()],d=Math.hypot(a.x-b.x,a.y-b.y);V.orbit.dist=Math.max(2.4,Math.min(maxDist(),dist0*pinch0/Math.max(d,1)));}});
  const up=e=>{P.delete(e.pointerId);if(P.size<2)pinch0=0;
    /* a double tap (two short taps that barely move, close together) toggles the loupe on the escapement */
    if(e.type==="pointerup"&&P.size===0&&down&&!multi){const now=performance.now();
      if(now-down.t<300&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<12){
        if(now-lastTap<350){lastTap=0;
          if(V.view==="dial"){const f=fitWatch(1.15),o=V.orbit;V.goal={tx:0,ty:.6,tz:.4,dist:o.dist>f*.75?f*.5:f,pitch:o.dist>f*.75?1.3:1.15};}   // on the dial side: closer in on the dial and back
          else setViewName(V.view==="loupe"?"home":"loupe");}else lastTap=now;}
      else lastTap=0;}
    if(P.size===0)down=null;};
  el.addEventListener("pointerup",up);el.addEventListener("pointercancel",up);
  el.addEventListener("dblclick",e=>e.preventDefault());
  el.addEventListener("wheel",e=>{e.preventDefault();V.goal=null;V.orbit.dist=Math.max(2.4,Math.min(maxDist(),V.orbit.dist*(1+Math.sign(e.deltaY)*.08)));},{passive:false});
}
/* glide the camera toward the goal; let go of it once there */
function glide(dt){const g=V.goal;if(!g)return;const o=V.orbit,k=V.reduce?1:Math.min(1,dt*4.5);
  let done=true;for(const key of ["tx","ty","tz","dist","pitch"]){if(g[key]==null)continue;const d=g[key]-o[key];o[key]+=d*k;if(Math.abs(d)>.002)done=false;else o[key]=g[key];}
  if(done)V.goal=null;}
function frame(now){
  requestAnimationFrame(frame);
  if(document.hidden||!V.r)return;
  resize(false);
  const t=(now-V.t0)/1000,dt=Math.min(.1,(now-(V.last||now))/1000),u=V.move&&V.move.userData;V.last=now;
  if(u&&u.wheels&&V.move.visible)animateMovement(u,t,dt);
  if(V.watch&&V.watch.visible)animateWatch(V.watch.userData,(now-V.watch.userData.t0)/1000);
  glide(dt);
  placeCam();roomCull();
  if(V.dof){const u=V.dof.uniforms;u.focus.value=V.orbit.dist;u.aperture.value=ROOM.dof/V.orbit.dist;}
  if(V.comp)V.comp.render();else V.r.render(V.scene,V.cam);
  V.frames++;
  if(now-V.fpsAt>=1000){V.fpsObj={fps:Math.round(V.frames*1000/(now-V.fpsAt)),at:now};V.frames=0;V.fpsAt=now;}
}
