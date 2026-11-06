/* ---- vis/bench.js: the bench (felt mat on a wooden top, one warm lamp), orbit and pinch controls, framing, and the
   frame loop that swings the balance at the beat rate: bph/7200 full swings a second, amplitude in degrees either side. ---- */
function buildBench(){
  const M=V.mats,g=new THREE.Group(),lite=V.tier==="lite";
  const top=new THREE.Mesh(new THREE.BoxGeometry(30,.6,30),M.wood);top.position.y=-.62;g.add(top);
  const mat=new THREE.Mesh(new THREE.CylinderGeometry(5.5,5.5,.04,lite?48:96),M.felt);mat.position.y=-.3;mat.receiveShadow=!lite;g.add(mat);
  return g;
}
function buildLights(){
  const g=new THREE.Group(),lite=V.tier==="lite";
  g.add(new THREE.HemisphereLight(0x8a9a90,0x1a1410,lite?.75:.45));
  const lamp=new THREE.DirectionalLight(0xffe7c2,lite?1.15:1.6);lamp.position.set(-3,8,4);
  if(!lite){lamp.castShadow=true;lamp.shadow.mapSize.set(1024,1024);const c=lamp.shadow.camera;c.left=c.bottom=-4;c.right=c.top=4;c.near=1;c.far=20;lamp.shadow.bias=-.0005;lamp.shadow.radius=3;}
  g.add(lamp);
  const rim=new THREE.DirectionalLight(0x9fb4c8,lite?.35:.5);rim.position.set(5,3,-6);g.add(rim);
  return g;
}
/* rebuild everything that depends on the tier */
function rebuild(){
  for(const k of ["move","bench","lamp"])if(V[k]){V.scene.remove(V[k]);V[k].traverse(o=>{if(o.geometry)o.geometry.dispose();});V[k]=null;}
  makeMats(V.tier);
  V.bench=buildBench();V.lamp=buildLights();V.move=buildPlaceholder();
  V.scene.add(V.bench,V.lamp,V.move);
  V.r.shadowMap.enabled=V.tier!=="lite";V.r.shadowMap.type=THREE.PCFSoftShadowMap;
  V.r.setPixelRatio(V.tier==="lite"?1:Math.min(window.devicePixelRatio||1,2));
  V.comp=null;V.bloom=null;
  if(V.tier==="ultra"&&window.__escPost)window.__escPost(ok=>{if(!ok||V.tier!=="ultra")return;
    V.comp=new THREE.EffectComposer(V.r);V.comp.addPass(new THREE.RenderPass(V.scene,V.cam));
    V.bloom=new THREE.UnrealBloomPass(new THREE.Vector2(V.w||1,V.h||1),.35,.4,.82);V.comp.addPass(V.bloom);resize(true);});
  resize(true);
}
function resize(force){
  const c=V.canvas,w=c.clientWidth|0,h=c.clientHeight|0;
  if(!w||!h||(!force&&w===V.w&&h===V.h))return;
  V.w=w;V.h=h;V.r.setSize(w,h,false);V.cam.aspect=w/h;V.cam.updateProjectionMatrix();
  if(V.comp){V.comp.setSize(w,h);V.comp.setPixelRatio&&V.comp.setPixelRatio(V.r.getPixelRatio());}
}
function placeCam(){
  const o=V.orbit,cp=Math.cos(o.pitch);
  V.cam.position.set(o.tx+Math.sin(o.yaw)*cp*o.dist,o.ty+Math.sin(o.pitch)*o.dist,o.tz+Math.cos(o.yaw)*cp*o.dist);
  V.cam.lookAt(o.tx,o.ty,o.tz);
}
/* one finger turns, two fingers pinch to zoom, the mouse wheel zooms */
function bindOrbit(el){
  const P=new Map();let pinch0=0,dist0=0;
  el.addEventListener("pointerdown",e=>{el.setPointerCapture&&el.setPointerCapture(e.pointerId);P.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(P.size===2){const [a,b]=[...P.values()];pinch0=Math.hypot(a.x-b.x,a.y-b.y);dist0=V.orbit.dist;}});
  el.addEventListener("pointermove",e=>{const p=P.get(e.pointerId);if(!p)return;
    if(P.size===1){V.orbit.yaw-=(e.clientX-p.x)*.008;V.orbit.pitch=Math.max(.25,Math.min(1.45,V.orbit.pitch+(e.clientY-p.y)*.006));}
    p.x=e.clientX;p.y=e.clientY;
    if(P.size===2&&pinch0){const [a,b]=[...P.values()],d=Math.hypot(a.x-b.x,a.y-b.y);V.orbit.dist=Math.max(3.2,Math.min(14,dist0*pinch0/Math.max(d,1)));}});
  const up=e=>{P.delete(e.pointerId);if(P.size<2)pinch0=0;};
  el.addEventListener("pointerup",up);el.addEventListener("pointercancel",up);
  el.addEventListener("wheel",e=>{e.preventDefault();V.orbit.dist=Math.max(3.2,Math.min(14,V.orbit.dist*(1+Math.sign(e.deltaY)*.08)));},{passive:false});
}
function frame(now){
  requestAnimationFrame(frame);
  if(document.hidden||!V.r)return;
  resize(false);
  const t=(now-V.t0)/1000,R=V.run,u=V.move&&V.move.userData;
  if(u&&u.bal){
    const f=R.bph/7200,amp=R.wound?R.amp*Math.PI/180:0;   // bph counts both beats; one full swing is two beats
    const a=amp*Math.sin(TAU*f*t);
    u.bal.rotation.y=a;
    u.spring.scale.setScalar(1+.035*Math.sin(TAU*f*t));   // the spring breathes as the balance swings
  }
  placeCam();
  if(V.comp)V.comp.render();else V.r.render(V.scene,V.cam);
  V.frames++;
  if(now-V.fpsAt>=1000){V.fpsObj={fps:Math.round(V.frames*1000/(now-V.fpsAt)),at:now};V.frames=0;V.fpsAt=now;}
}
