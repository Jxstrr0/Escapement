<script>
/* ===================== Escapement: 3D (WATCH_VIS) =====================
   three.js r128. One IIFE spread over vis/core.js, movement.js, bench.js and api.js; the public object is in api.js.
   The vis never reads game state: the app calls WATCH_VIS.setMovement(cfg), .setRun({amp,bph,beatErr,wound}),
   .setView(name), .setQuality(tier) and reads .fps().
   This file: module state, the renderer, the three graphics tiers and the materials.
     lite   pixel ratio 1, Phong materials, no shadows, no post. The phone default; it must always look finished.
     full   device pixel ratio up to 2, PBR brass and steel with a generated studio reflection, soft lamp shadow.
     ultra  as full, plus bloom on the polished parts (three.js addons loaded on demand, window.__escPost). */
const WATCH_VIS=(function(){
"use strict";
const V={r:null,scene:null,cam:null,canvas:null,tier:"lite",w:0,h:0,mats:null,env:null,comp:null,bloom:null,
  move:null,bench:null,lamp:null,run:{amp:280,bph:28800,beatErr:0,wound:true},t0:performance.now(),
  frames:0,fpsAt:performance.now(),fpsObj:{fps:0,at:0},orbit:{yaw:-.5,pitch:.9,dist:9.5,tx:0,ty:0,tz:0}};
const TAU=Math.PI*2;

function initRenderer(canvas){
  V.canvas=canvas;
  V.r=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
  V.r.setClearColor(0x0c110f,1);
  V.r.outputEncoding=THREE.sRGBEncoding;
  V.scene=new THREE.Scene();
  V.scene.fog=new THREE.Fog(0x0c110f,14,30);
  V.cam=new THREE.PerspectiveCamera(32,1,.1,100);
}
/* a small equirect "studio" painted on a canvas: a warm lamp patch and a dim room, so PBR brass has something to reflect (Full / Ultra) */
function studioEnv(){
  const c=document.createElement("canvas");c.width=256;c.height=128;const g=c.getContext("2d");
  const bg=g.createLinearGradient(0,0,0,128);bg.addColorStop(0,"#3a3a34");bg.addColorStop(.5,"#1a1d1a");bg.addColorStop(1,"#0b0d0c");
  g.fillStyle=bg;g.fillRect(0,0,256,128);
  const lamp=g.createRadialGradient(80,26,2,80,26,40);lamp.addColorStop(0,"#fff4dc");lamp.addColorStop(1,"rgba(255,244,220,0)");
  g.fillStyle=lamp;g.fillRect(0,0,256,128);
  g.fillStyle="rgba(200,215,230,.35)";g.fillRect(170,30,50,24);   // a window on the far wall
  const tex=new THREE.CanvasTexture(c);tex.mapping=THREE.EquirectangularReflectionMapping;tex.encoding=THREE.sRGBEncoding;
  const pm=new THREE.PMREMGenerator(V.r),rt=pm.fromEquirectangular(tex);pm.dispose();tex.dispose();
  return rt.texture;
}
/* materials per tier: the same names, cheaper shading on Lite */
function makeMats(tier){
  const lite=tier==="lite";
  if(V.mats)for(const k in V.mats)V.mats[k].dispose();
  if(!lite&&!V.env)V.env=studioEnv();
  /* colours are written as sRGB hex; the renderer outputs sRGB, so convert them to linear first or everything washes out */
  const C=h=>new THREE.Color(h).convertSRGBToLinear();
  const metal=(color,rough,metalness)=>(color=C(color),lite)
    ?new THREE.MeshPhongMaterial({color,specular:C(0x6a6250),shininess:Math.round(80*(1-rough))+10})
    :new THREE.MeshStandardMaterial({color,roughness:rough,metalness,envMap:V.env,envMapIntensity:1.1});
  V.mats={
    brass:metal(0xc9a45c,.32,1),
    gilt:metal(0xd8b46a,.22,1),
    steel:metal(0xb8c0c6,.25,1),
    blued:metal(0x2c4a8c,.3,1),
    ruby:lite?new THREE.MeshPhongMaterial({color:C(0x9a0d26),specular:0xffffff,shininess:90})
             :new THREE.MeshStandardMaterial({color:C(0x9a0d26),roughness:.1,metalness:0,envMap:V.env}),
    felt:lite?new THREE.MeshLambertMaterial({color:C(0x1f3a2c)}):new THREE.MeshStandardMaterial({color:C(0x1f3a2c),roughness:1,metalness:0}),
    wood:lite?new THREE.MeshLambertMaterial({color:C(0x3a2a1c)}):new THREE.MeshStandardMaterial({color:C(0x3a2a1c),roughness:.75,metalness:0})
  };
  return V.mats;
}
