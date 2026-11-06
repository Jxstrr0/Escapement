/* ---- vis/photo.js: photo mode's side of the 3D view (the controls, the caption and the file are app/photo.js) ----
   setBackdrop(kind) swaps what is round the movement:
     workshop  the room as it is (vis/room.js): the bench, the mat, the window over the valley
     velvet    the room hidden; the movement lies on deep black velvet in a soft pool of lamp light that fades to black
     white     the room hidden; a seamless white studio sweep with a soft contact shadow under the movement
   Each cloth is one disc wearing a painted texture (BACK; MeshBasicMaterial, unlit and not tone-mapped, so its rim is
   exactly the clear colour and there is no horizon line from any angle). Full / Ultra add a ShadowMaterial disc for the
   lamp's real shadow; Lite has the painted contact shadow only, one texture read a pixel. The lamp lights stay as they are,
   so the movement looks the same in every backdrop; the room's daylight goes with the room.
   The clear colour sits in the target's colour space: raw for the screen, linear for Ultra's composer (backApply).
   photoKeep() / photoBack() remember and put back the camera, the view and the backdrop round photo mode.
   photoGrab(scale) renders one frame at scale x the view's CSS size (the long side capped at BACK.grab.side, the pixel count
   lower through Ultra's composer, so a phone doesn't run out of memory) and returns a 2D canvas copy of it. ---- */
const BACK={
  velvet:{bg:0x050505,pool:[32,30,31],edge:[5,5,5],spread:.24,nap:.07,blob:.5,blobR:.06,shadow:.6},
  white:{bg:0xe4e3df,pool:[241,240,236],edge:[228,227,223],spread:.3,nap:0,blob:.2,blobR:.07,shadow:.24},
  r:110,y:-.03,                       // the cloth's radius (scene units) and height (just under the dial side)
  grab:{side:4096,px:16e6,compPx:9e6}};   // photoGrab caps: the long side, and the pixel count (Ultra's composer keeps several targets that size)
V.back="workshop";V.backG=null;V.keep=null;
/* the cloth's texture: the pool of light (centre colour to the edge colour), the velvet's nap (fading out before the rim so
   the rim matches the clear colour), a soft dark contact shadow under the movement. Painted once per backdrop and tier */
function backCanvas(B){
  const S=V.tier==="lite"?256:512,c=document.createElement("canvas");c.width=c.height=S;
  const g=c.getContext("2d"),img=g.createImageData(S,S),d=img.data,h=S/2;
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){
    const t=Math.hypot(x+.5-h,y+.5-h)/h,pool=Math.exp(-(t/B.spread)*(t/B.spread)),fade=Math.max(0,1-t/.8);
    const nap=B.nap?(fNoise(x*.9,y*.9,Math.round(S*.9),91)-.5)*2*B.nap*fade+(fHash(x,y,92)-.5)*B.nap*.6*fade:0;
    const shade=1-B.blob*Math.exp(-(t/B.blobR)*(t/B.blobR)*2),i=(y*S+x)*4;
    for(let k=0;k<3;k++){const v=B.edge[k]+(B.pool[k]-B.edge[k])*pool;d[i+k]=Math.max(0,Math.min(255,Math.round(v*shade*(1+nap))));}
    d[i+3]=255;}
  g.putImageData(img,0,0);return c;}
function backDrop(){const g=V.backG;if(!g)return;V.scene.remove(g);
  g.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(o.material.map)o.material.map.dispose();o.material.dispose();}});V.backG=null;}
function backGroup(kind){
  const B=BACK[kind],lite=V.tier==="lite";
  if(V.backG&&V.backG.userData.kind===kind&&V.backG.userData.tier===V.tier)return V.backG;
  backDrop();
  const G=new THREE.Group(),tex=new THREE.CanvasTexture(backCanvas(B));tex.encoding=THREE.sRGBEncoding;
  const cloth=new THREE.Mesh(new THREE.CircleGeometry(BACK.r,lite?40:72),new THREE.MeshBasicMaterial({map:tex,toneMapped:false,fog:false,dithering:true}));
  cloth.rotation.x=-Math.PI/2;cloth.position.y=BACK.y;G.add(cloth);
  if(!lite){const sh=new THREE.Mesh(new THREE.CircleGeometry(16,48),new THREE.ShadowMaterial({opacity:B.shadow,fog:false}));
    sh.rotation.x=-Math.PI/2;sh.position.y=BACK.y+.01;sh.receiveShadow=true;G.add(sh);}
  G.userData.kind=kind;G.userData.tier=V.tier;V.scene.add(G);V.backG=G;return G;}
/* show the backdrop V.back says. Called on a change, after every room rebuild, and when the tier (or Ultra's composer) changes */
function backApply(){
  if(!V.r||!V.scene)return;const B=BACK[V.back];
  /* Ultra draws into the composer's linear buffer, which the last pass encodes to sRGB: the clear colour goes in linear so
     the background matches Full (the fog colour mixes in the shader, the same on every tier) */
  if(!B){if(V.room)V.room.visible=true;if(V.backG)V.backG.visible=false;
    V.r.setClearColor(V.comp?sRGB(ROOM.fog.col):ROOM.fog.col,1);V.scene.fog.color.set(ROOM.fog.col);return;}
  if(V.room)V.room.visible=false;
  backGroup(V.back).visible=true;
  V.r.setClearColor(V.comp?sRGB(B.bg):new THREE.Color(B.bg),1);V.scene.fog.color.set(B.bg);}
function backSet(kind){V.back=BACK[kind]?kind:"workshop";backApply();}
/* photo mode remembers the camera (where it is gliding to, if it is on the way), the view and the backdrop, and puts them back */
function photoKeep(){const o=V.orbit,g=V.goal||{},at=k=>g[k]!=null?g[k]:o[k];
  V.keep={orbit:{yaw:o.yaw,pitch:at("pitch"),dist:at("dist"),tx:at("tx"),ty:at("ty"),tz:at("tz")},view:V.view,back:V.back};}
function photoBack(){const k=V.keep;if(!k)return;V.keep=null;
  backSet(k.back);resize(true);Object.assign(V.orbit,k.orbit);V.goal=null;
  if(V.view!==k.view){V.view=k.view;V.explodeT=k.view==="exploded"?1:0;watchShow();for(const f of V.viewCbs)try{f(k.view);}catch(e){}}}
/* one frame at `scale` x the CSS size, copied out before the browser shows it (no preserveDrawingBuffer needed) */
function photoGrab(scale){
  if(!V.r||!V.canvas)return null;
  const w=V.canvas.clientWidth|0,h=V.canvas.clientHeight|0;if(!w||!h)return null;
  const G=BACK.grab,side=Math.min(G.side,V.r.capabilities.maxTextureSize||4096),px=V.comp?G.compPx:G.px;
  const pr=Math.max(.5,Math.min(+scale||1,side/Math.max(w,h),Math.sqrt(px/(w*h)))),pr0=V.r.getPixelRatio();
  let out=null;
  try{
    V.r.setPixelRatio(pr);V.r.setSize(w,h,false);
    if(V.comp){if(V.comp.setPixelRatio)V.comp.setPixelRatio(pr);V.comp.setSize(w,h);}
    placeCam();roomCull();
    if(V.dof){const u=V.dof.uniforms;u.focus.value=V.orbit.dist;u.aperture.value=ROOM.dof/V.orbit.dist;}
    if(V.comp)V.comp.render();else V.r.render(V.scene,V.cam);
    out=document.createElement("canvas");out.width=V.canvas.width;out.height=V.canvas.height;out.getContext("2d").drawImage(V.canvas,0,0);
  }catch(e){out=null;}
  finally{V.r.setPixelRatio(pr0);resize(true);}
  return out;}
