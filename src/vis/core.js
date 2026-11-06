<script>
/* ===================== Escapement: 3D (WATCH_VIS) =====================
   three.js r128. One IIFE spread over vis/core.js, studio.js, finish.js, movement.js, room.js, watch.js, bench.js, photo.js and api.js; the public object is in api.js.
   The vis never reads game state: the app calls WATCH_VIS.setMovement(cfg), .setRoom({stage,has}), .setRun({amp,bph,beatErr,wound}),
   .setWatch({caseId,comps,top,mid,foot}) (the cased watch for the Dial side view, vis/watch.js),
   .setView(name), .setMotion(reduced), .setQuality(tier), .onView(fn), .setBackdrop(kind) and
   .photoGrab(scale) (photo mode), and reads .fps().
   This file: module state, the renderer, the three graphics tiers and the materials.
     lite   pixel ratio 1, unlit metal that reflects a small baked copy of the studio light (cheaper than Phong), finishes
            as shade maps, Lambert felt and wood, no shadows, no post. The phone default; it must always look finished.
     full   device pixel ratio up to 2, PBR metal on the studio HDRI (PMREM) with ACES tone mapping, normal and roughness
            maps for the finishes, polished anglage, clear-coated jewels and blued screws, soft lamp shadow.
     ultra  as full, plus bloom on the polished parts (three.js addons loaded on demand, window.__escPost). */
const WATCH_VIS=(function(){
"use strict";
const V={r:null,scene:null,cam:null,canvas:null,tier:"lite",w:0,h:0,mats:null,env:null,room:null,roomSpec:null,roomKey:"",roomTex:null,models:null,dof:null,liteEnv:null,light:null,lightTried:false,fin:null,finTier:null,comp:null,bloom:null,
  move:null,bench:null,lamp:null,run:{amp:280,bph:28800,beatErr:0,wound:true},t0:performance.now(),
  frames:0,fpsAt:performance.now(),fpsObj:{fps:0,at:0},orbit:{yaw:-.5,pitch:.9,dist:12,tx:0,ty:0,tz:0},
  cfg:null,cfgKey:"",watch:null,watchSpec:null,watchKey:"",fit:0,goal:null,view:"home",explode:0,explodeT:0,reduce:false,viewCbs:[],last:0};
const TAU=Math.PI*2;

function initRenderer(canvas){
  V.canvas=canvas;
  V.r=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
  V.r.setClearColor(ROOM.fog.col,1);
  V.r.outputEncoding=THREE.sRGBEncoding;
  V.scene=new THREE.Scene();
  V.scene.fog=new THREE.Fog(ROOM.fog.col,ROOM.fog.near,ROOM.fog.far);   // the far room softens into a warm haze (Lite has no depth of field)
  V.cam=new THREE.PerspectiveCamera(32,1,.2,3400);
}
/* materials per tier: the same names, cheaper shading on Lite (vis/finish.js makes the metals, vis/studio.js the light they reflect) */
function makeMats(tier){
  const lite=tier==="lite";
  if(V.mats)for(const k in V.mats)V.mats[k].dispose();
  if(V.finTier!==tier){finDrop();roomTexDrop();V.finTier=tier;}
  V.mats={
    brass:metalMat({c:0xc9a45c,r:.32}),
    gilt:metalMat({c:0xd8b46a,r:.2}),
    steel:metalMat({c:0xc4ccd2,r:.18}),
    blued:metalMat({c:0x2a4c9a,r:.26,coat:.6,lite:1.25}),
    ruby:gemMat(0x9a0d26)
  };
  return V.mats;
}
