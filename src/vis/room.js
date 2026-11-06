/* ---- vis/room.js: the workshop round the movement, at true scale ----
   The movement is about 30 mm across, so one scene unit is about 3.5 mm (ROOM.U = 286 units a metre). It sits in a
   movement holder on a green bench mat, on a wooden watchmaker's bench (a riser of small drawers along the back) under
   a window that looks out over the Haldis valley. Tweezers, an eye loupe, screwdrivers, an oiler and a dab of
   cleaning putty lie by the mat. Zoom out to see the bench and the room; the camera is kept inside the walls (roomClamp).
   The app sends setRoom({stage, has, staff}); the room only changes when that does:
     stage   corner (a rented corner: bare plaster, a small window), shop (wainscot, a bigger window, clocks),
             workshop, manufacture (lighter walls). The Sandbox gets a well-kitted shop.
     has     the owned machines, each shown where it would stand: timing machine (basic, six-position or lab with its
             climate box), cleaning machine, lathe, polishing motor, mill, CNC, second bench, display case,
             climate unit, clean-room door.
   Every tier builds the room in code (the boxes merge into one mesh per material, so Lite pays a handful of draw calls),
   with procedural wood, plaster and the valley view painted on canvases. Full / Ultra then add the CC0 models in models/
   (ROOM_MODELS, credited in models/CREDITS.md): the arm lamp, screwdrivers, pliers, a magnifier, tins and clocks from Poly
   Haven, and three machines of our own made in Blender (tools/blender/machines.py): the timing machine (its plain head,
   six-position head and climate box are named nodes, shown per has.timing), the cleaning machine and the display window.
   Their materials are named for roomMats() roles and become the room's own. A coded stand-in tagged with the same name
   hides when its model lands (Lite keeps the machines' stand-ins in the big merge, as before). Soft contact shadows are
   painted blobs on every tier, since the lamp's real shadow only covers the movement. ---- */
const ROOM={U:286,yaw:-.5,top:-.32,floor:-.32-272,ceil:-.32-272+780,
  bench:{w:430,d:200,front:72,t:11},walls:{back:-172,front:640,side:540},
  win:{corner:{x:-50,w:210,h:220},big:{x:0,w:330,h:280},y0:84},
  mat:{w:150,d:104,x:8,z:4},zoomOut:560,margin:24,
  fog:{col:0x1c1a16,near:320,far:2600},dof:.0005,
  stages:{corner:{wall:"#7f8579",wains:false,win:"corner",floor:"#3b2e22"},shop:{wall:"#d6c9a8",wains:true,win:"big",floor:"#4a3626"},
    workshop:{wall:"#c6cdc4",wains:true,win:"big",floor:"#4a3626"},manufacture:{wall:"#e2e2dc",wains:false,win:"big",floor:"#6d6a64"}}};
/* models (Full / Ultra): file, where it goes [x, y above the bench top (or the floor's y), z, turn], lay (comes standing: lay it
   flat), the coded stand-in it replaces, the stages it shows in, has (only when that machine is owned), parts (named nodes
   shown only for some values of a machine: [the has key, its default, {node: [values]}]). Each is set down on its surface
   by its bounding box. The machines (made by tools/blender/machines.py) carry materials named for roomMats() roles, and
   take the room's own materials. */
const ROOM_MODELS={
  lamp:{file:"models/arm-lamp.glb",at:[-160,0,-66,.7],stand:"lamp"},
  screwdrivers:{file:"models/screwdrivers.glb",at:[50,0,-16,-.35],stand:"screwdrivers"},
  pliers:{file:"models/pliers.glb",at:[-84,0,-44,.9],lay:true},
  magnifier:{file:"models/magnifier.glb",at:[100,0,54,1.4],lay:true},
  oiltin:{file:"models/oil-tin.glb",at:[-185,70,-106,.3]},
  cleanertin:{file:"models/cleaner-tin.glb",at:[-150,70,-106,0]},
  alarm:{file:"models/alarm-clock.glb",at:[120,70,-106,-.2],stages:["corner"]},
  alarm2:{file:"models/alarm-clock.glb",at:[-300,264,-155,.25],stages:["shop","workshop","manufacture"]},
  wallclock:{file:"models/wall-clock.glb",at:[300,330,-166,0],stages:["shop","workshop","manufacture"],stand:"wallclock"},
  grandfather:{file:"models/grandfather-clock.glb",at:[479,-272,120,-Math.PI/2],stages:["shop","workshop"],stand:"grandfather"},
  drawers:{file:"models/drawers.glb",at:[-410,-272,300,Math.PI/2],stages:["shop","workshop","manufacture"]},
  timing:{file:"models/timing-machine.glb",at:[128,0,-42,0],stand:"timing",parts:["timing","basic",{head:["basic"],six:["six","lab"],lab:["lab"]}]},
  cleaning:{file:"models/cleaning-machine.glb",at:[168,70,-106,0],has:"cleaning",stand:"cleaning"},
  window:{file:"models/display-window.glb",at:[250,-272,560,Math.PI],has:"window",stand:"window"}};

/* ---- canvases: wood, plaster, wainscot, the valley, the timing machine's screen, a contact-shadow blob ---- */
function roomCanvas(w,h,draw){const c=document.createElement("canvas");c.width=w;c.height=h;draw(c.getContext("2d"),w,h);return c;}
function roomTex(key,make){if(!V.roomTex)V.roomTex={};if(V.roomTex[key])return V.roomTex[key];
  const t=new THREE.CanvasTexture(make());t.encoding=THREE.sRGBEncoding;t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.anisotropy=V.tier==="lite"?1:Math.min(4,V.r.capabilities.getMaxAnisotropy());V.roomTex[key]=t;return t;}
function roomTexDrop(){if(V.roomTex)for(const k in V.roomTex)V.roomTex[k].dispose();V.roomTex=null;}
const rS=()=>V.tier==="lite"?256:512;
/* boards running along x: base colour, slow figure, fine grain, a dark joint between planks */
function woodCanvas(base,dark,planks){return()=>roomCanvas(rS(),rS(),(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);
  const ph=h/planks;
  for(let p=0;p<planks;p++){const sh=fHash(p,3,21)*.18-.09;g.fillStyle=sh>0?`rgba(255,240,210,${sh})`:`rgba(30,15,5,${-sh})`;g.fillRect(0,p*ph,w,ph);
    for(let i=0;i<70;i++){const y=p*ph+fHash(p,i,22)*ph,a=.05+fHash(i,p,23)*.12,amp=1+fHash(i,p,24)*3,f=1+fHash(p,i,25)*3;
      g.strokeStyle=`rgba(${dark},${a})`;g.lineWidth=.6+fHash(i,p,26)*1.2;g.beginPath();
      for(let x=0;x<=w;x+=8){const yy=y+Math.sin(x/w*TAU*f+i)*amp;x?g.lineTo(x,yy):g.moveTo(x,yy);}g.stroke();}
    g.fillStyle=`rgba(${dark},.55)`;g.fillRect(0,p*ph,w,Math.max(1,h/256));}});}
function plasterCanvas(base){return()=>roomCanvas(rS(),rS(),(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);
  const img=g.getImageData(0,0,w,h),d=img.data;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const n=fNoise(x*8/w,y*8/h,8,31)*.6+fNoise(x*40/w,y*40/h,40,32)*.4-.5,i=(y*w+x)*4;
    for(let k=0;k<3;k++)d[i+k]=Math.max(0,Math.min(255,d[i+k]*(1+n*.16)));}
  g.putImageData(img,0,0);});}
/* the view: sky, far peaks with snow, nearer ridges, forest, meadow, the village roofs and the church spire */
function valleyCanvas(){const W=V.tier==="lite"?512:1024,H=W/2;return roomCanvas(W,H,(g,w,h)=>{
  const sky=g.createLinearGradient(0,0,0,h*.6);sky.addColorStop(0,"#6f9ccc");sky.addColorStop(1,"#d9e6ee");g.fillStyle=sky;g.fillRect(0,0,w,h);
  const ridge=(y0,amp,seed,col,snow)=>{g.fillStyle=col;g.beginPath();g.moveTo(0,h);
    const pts=[];for(let x=0;x<=w;x+=4){const t=x/w,y=y0-amp*(.55*fNoise(t*5,.5,1e6,seed)+.3*fNoise(t*13,.5,1e6,seed+1)+.15*fNoise(t*31,.5,1e6,seed+2));pts.push([x,y]);g.lineTo(x,y);}
    g.lineTo(w,h);g.closePath();g.fill();
    if(snow){g.fillStyle="rgba(250,252,255,.92)";for(const [x,y] of pts){const top=y0-amp*.62;if(y<top){g.fillRect(x,y,4,(top-y)*.8+2);}}}};
  ridge(h*.52,h*.42,41,"#8fa2b8",true);ridge(h*.6,h*.28,51,"#6c7f8e",true);ridge(h*.7,h*.2,61,"#3f5a4a",false);
  g.fillStyle="#2f4a36";for(let i=0;i<260;i++){const x=fHash(i,1,71)*w,y=h*.68+fHash(i,2,71)*h*.1,s=3+fHash(i,3,71)*6;g.beginPath();g.moveTo(x,y-s*2);g.lineTo(x-s,y+s);g.lineTo(x+s,y+s);g.fill();}
  const mead=g.createLinearGradient(0,h*.74,0,h);mead.addColorStop(0,"#7f9a52");mead.addColorStop(1,"#5e7a3c");g.fillStyle=mead;g.fillRect(0,h*.76,w,h*.24);
  for(let i=0;i<26;i++){const x=w*.3+fHash(i,5,81)*w*.45,y=h*.8+fHash(i,6,81)*h*.1,s=w/110*(.7+fHash(i,7,81)*.6);
    g.fillStyle=["#efe6d2","#e2d6bd","#f3efe6"][i%3];g.fillRect(x-s,y-s*.8,2*s,s*.9);g.fillStyle=i%2?"#7a3b2a":"#5a3326";g.beginPath();g.moveTo(x-s*1.2,y-s*.8);g.lineTo(x,y-s*1.7);g.lineTo(x+s*1.2,y-s*.8);g.fill();}
  const cx=w*.55,cy=h*.8,s=w/90;g.fillStyle="#f1ece0";g.fillRect(cx-s*.6,cy-s*3.4,s*1.2,s*3.4);g.fillStyle="#4a5a4c";g.beginPath();g.moveTo(cx-s*.8,cy-s*3.4);g.lineTo(cx,cy-s*5.6);g.lineTo(cx+s*.8,cy-s*3.4);g.fill();});}
function screenCanvas(){return roomCanvas(256,128,(g,w,h)=>{g.fillStyle="#0b1410";g.fillRect(0,0,w,h);g.strokeStyle="#3a6";g.globalAlpha=.25;
  for(let x=0;x<w;x+=32){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}g.globalAlpha=1;g.fillStyle="#7fe0a0";
  for(let x=0;x<w;x+=3){g.fillRect(x,h*.42+Math.sin(x*.05)*6+(fHash(x,1,9)-.5)*4,2,2);g.fillRect(x,h*.6+Math.sin(x*.05+1)*6+(fHash(x,2,9)-.5)*4,2,2);}
  g.font="bold 18px monospace";g.fillText("+2 s/d  284°  0.3ms",8,22);});}
function blobCanvas(){return roomCanvas(64,64,(g,w,h)=>{const r=g.createRadialGradient(32,32,2,32,32,31);r.addColorStop(0,"rgba(0,0,0,.55)");r.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=r;g.fillRect(0,0,w,h);});}

/* ---- the room's materials (per build; disposed with it). Lite: Lambert. Full / Ultra: Standard with a little of the studio light ---- */
function roomMats(st){const lite=V.tier==="lite",own=[];
  const M=(o)=>{const m=lite?new THREE.MeshLambertMaterial({color:sRGB(o.c||0xffffff),map:o.map||null}):
      new THREE.MeshStandardMaterial({color:sRGB(o.c||0xffffff),map:o.map||null,roughness:o.r==null?.8:o.r,metalness:o.m||0,envMap:fullEnv(),envMapIntensity:o.e==null?.35:o.e});own.push(m);return m;};
  const basic=o=>{const m=new THREE.MeshBasicMaterial(o);own.push(m);return m;};
  const S=ROOM.stages[st]||ROOM.stages.shop;
  const mats={
    bench:M({map:roomTex("oak",woodCanvas("#b88a58","70,40,15",6)),r:.55}),
    benchDark:M({map:roomTex("walnut",woodCanvas("#6b4529","35,18,6",4)),r:.6}),
    floor:M({c:0xffffff,map:roomTex("floor-"+S.floor,woodCanvas(S.floor,"20,10,4",5)),r:.7}),
    wall:M({map:roomTex("wall-"+S.wall,plasterCanvas(S.wall)),r:.95,e:.15}),
    wains:M({map:roomTex("wains",woodCanvas("#5d3d24","30,15,5",3)),r:.6}),
    ceil:M({c:0xd9d4c8,r:1,e:.1}),
    frame:M({c:0xe8e2d4,r:.5}),
    felt:M({c:0x1f3a2c,r:1,e:.05}),
    paint:M({c:0x5d6f62,r:.45,e:.6}),paintGrey:M({c:0x8b9094,r:.4,e:.6}),white:M({c:0xe6e6e2,r:.35,e:.5}),
    black:M({c:0x18191b,r:.35,e:.6}),cloth:M({c:0xf0ece2,r:1,e:.05}),putty:M({c:0x5aa79a,r:.6}),
    handleR:M({c:0xa8352b,r:.35,e:.5}),handleB:M({c:0x2f5fa8,r:.35,e:.5}),handleG:M({c:0x3f8a4a,r:.35,e:.5}),
    view:basic({map:roomTex("valley",valleyCanvas),fog:false,toneMapped:false}),
    screen:basic({map:roomTex("screen",screenCanvas),toneMapped:false}),
    glow:basic({color:0xfff1d6,toneMapped:false}),
    glass:basic({color:0xcfe0ea,transparent:true,opacity:.16,depthWrite:false}),
    blob:basic({map:roomTex("blob",blobCanvas),transparent:true,depthWrite:false,toneMapped:false}),
    steel:metalMat({c:0xc4ccd2,r:.22}),dark:metalMat({c:0x3a3f45,r:.45}),brass:metalMat({c:0xc9a45c,r:.3}),chrome:metalMat({c:0xd8dde0,r:.08})};
  own.push(mats.steel,mats.dark,mats.brass,mats.chrome);
  mats.own=own;return mats;}

/* ---- builders. Every coded room part is static (merged later); sizes in units, y measured from the bench top unless noted ---- */
function roomBuilder(G,mats){
  const T=ROOM.top,lite=V.tier==="lite",sg=lite?10:20;
  /* a box with UVs that repeat once per `tile` units on every face */
  const box=(m,w,h,d,x,y,z,o)=>{o=o||{};const g=new THREE.BoxGeometry(w,h,d),tile=o.tile||0;
    if(tile){const uv=g.attributes.uv,dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let f=0;f<6;f++)for(let v=0;v<4;v++){const i=f*4+v;uv.setXY(i,uv.getX(i)*dims[f][0]/tile,uv.getY(i)*dims[f][1]/tile);}}
    const me=new THREE.Mesh(g,m);me.position.set(x,(o.abs?0:T)+y+h/2,z);if(o.ry)me.rotation.y=o.ry;me.userData.fixed=true;(o.into||G).add(me);return me;};
  const cyl=(m,r,h,x,y,z,o)=>{o=o||{};const me=new THREE.Mesh(new THREE.CylinderGeometry(o.r2==null?r:o.r2,r,h,o.seg||sg),m);me.position.set(x,(o.abs?0:T)+y+h/2,z);
    if(o.rz)me.rotation.z=o.rz;if(o.rx)me.rotation.x=o.rx;if(o.ry)me.rotation.y=o.ry;me.userData.fixed=true;(o.into||G).add(me);return me;};
  /* a rod between two points (lamp arms, the microphone stand) */
  const rod=(m,a,b,r,into)=>{const d=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]),L=d.length();
    const me=new THREE.Mesh(new THREE.CylinderGeometry(r,r,L,lite?6:10),m);me.position.set((a[0]+b[0])/2,T+(a[1]+b[1])/2,(a[2]+b[2])/2);
    me.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());me.userData.fixed=true;(into||G).add(me);return me;};
  /* a soft contact shadow under something lying on a surface */
  const blob=(w,d,x,y,z,ry)=>{const me=new THREE.Mesh(new THREE.PlaneGeometry(w,d),mats.blob);me.rotation.x=-Math.PI/2;if(ry)me.rotation.z=ry;me.position.set(x,T+y+.06,z);me.userData.fixed=true;G.add(me);return me;};
  /* a plane facing +z (a wall), its UVs one tile per `tile` units */
  const plane=(m,w,h,x,y,z,o)=>{o=o||{};const g=new THREE.PlaneGeometry(w,h);if(o.tile){const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/o.tile,uv.getY(i)*h/o.tile);}
    const me=new THREE.Mesh(g,m);me.position.set(x,y,z);if(o.ry!=null)me.rotation.y=o.ry;if(o.rx!=null)me.rotation.x=o.rx;me.userData.fixed=!o.loose;G.add(me);return me;};
  return{box,cyl,rod,blob,plane,T};}

function buildRoom(spec){
  spec=spec||{};const st=ROOM.stages[spec.stage]?spec.stage:"shop",has=spec.has||{},lite=V.tier==="lite";
  const G=new THREE.Group(),mats=roomMats(st),B=roomBuilder(G,mats),{box,cyl,rod,blob,plane,T}=B,S=ROOM.stages[st],W=ROOM.walls,BN=ROOM.bench;
  /* stand-ins that a model can replace are kept out of the big merge (each merges on its own) so they can hide */
  const stands={},tag=(k,o)=>{(stands[k]=stands[k]||[]).push(o);return o;};
  /* the bench: an oak top, its front apron, the sides down to the floor, the riser of little drawers along the back */
  const back=BN.front-BN.d;
  box(mats.bench,BN.w,BN.t,BN.d,0,-BN.t,BN.front-BN.d/2,{tile:110});
  box(mats.benchDark,BN.w,30,4,0,-BN.t-30,BN.front-2,{tile:90});
  for(const sx of [-1,1])box(mats.benchDark,8,ROOM.top-ROOM.floor-BN.t,BN.d,sx*(BN.w/2-4),ROOM.floor-ROOM.top,BN.front-BN.d/2,{tile:120});
  const rh=70,rd=44,rz=back+rd/2;
  box(mats.benchDark,BN.w,rh,rd,0,0,rz,{tile:90});
  const cols=10,rows=3,dw=(BN.w-16)/cols,dh=(rh-8)/rows;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const x=-BN.w/2+8+dw*(c+.5),y=4+dh*(r+.5);
    box(mats.bench,dw-3,dh-3,1.6,x,y-(dh-3)/2,back+rd+.8,{tile:60});
    cyl(mats.brass,1.4,2.4,x,y-1.2+.0,back+rd+2.4,{rx:Math.PI/2,seg:8});}
  /* the bench mat, the movement holder and the tools by it */
  const MT=ROOM.mat;box(mats.felt,MT.w,.04,MT.d,MT.x,0,MT.z);
  { const ring=new THREE.Mesh(new THREE.TorusGeometry(4.75,.3,lite?6:10,lite?32:64),mats.dark);ring.rotation.x=Math.PI/2;ring.position.set(0,T+.2,0);ring.userData.fixed=true;G.add(ring);
    for(let i=0;i<3;i++){const a=i*TAU/3+.4;box(mats.dark,.7,.34,.8,Math.cos(a)*4.62,.04,Math.sin(a)*4.62,{ry:-a});} }
  /* tweezers: two tapered steel blades joined at the back */
  { const ty=new THREE.Group();ty.position.set(-24,T+.5,15);ty.rotation.y=.5;
    for(const s of [-1,1]){const g=new THREE.BoxGeometry(34,.35,1.5);g.translate(-17,0,0);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),k=1-.75*(-x/34);p.setZ(i,p.getZ(i)*k);}
      const bl=new THREE.Mesh(g,mats.steel);bl.position.set(17,0,s*.9);bl.rotation.y=-s*.035;bl.userData.fixed=true;ty.add(bl);}
    G.add(ty);blob(36,7,-24+Math.cos(.5)*0,0,15,.5);}
  /* an eye loupe, the oiler, a dab of putty */
  cyl(mats.black,3.6,6.5,-30,0,-26,{r2:4.6});cyl(mats.glass,3.4,.3,-30,6.5,-26);blob(14,14,-30,0,-26);
  cyl(mats.brass,3.2,1.8,28,0,26);cyl(mats.glass,3.3,2.2,28,1.8,26,{r2:2.2});blob(11,11,28,0,26);
  { const p=new THREE.Mesh(new THREE.SphereGeometry(2.2,lite?8:14,lite?6:10),mats.putty);p.scale.y=.55;p.position.set(16,T+1,-30);p.userData.fixed=true;G.add(p);blob(7,7,16,0,-30);}
  /* screwdrivers (a coded set: Full / Ultra swap in the model) */
  { const sd=tag("screwdrivers",new THREE.Group());[mats.handleR,mats.handleB,mats.handleG].forEach((h,i)=>{
      const z=-24+i*5.2;cyl(mats.steel,.42,12,50,1.5,z,{rz:Math.PI/2,into:sd,seg:8});cyl(mats.chrome,1.5,16,62,1.5,z,{rz:Math.PI/2,into:sd,seg:lite?8:14});cyl(h,1.55,1.4,70.5,1.5,z,{rz:Math.PI/2,into:sd,seg:lite?8:14});});
    sd.children.forEach(o=>o.position.y-=1.5);blob(42,20,58,0,-19);}
  /* the arm lamp, coded: a base at the back-left, two arms, a head over the mat glowing underneath */
  { const lp=tag("lamp",new THREE.Group()),base=[-160,0,-66],el=[-118,250,-60],hd=[-30,150,70];
    cyl(mats.black,26,6,base[0],0,base[2],{into:lp});rod(mats.black,[base[0],6,base[2]],el,2.4,lp);rod(mats.black,el,hd,2.4,lp);
    const head=new THREE.Mesh(new THREE.CylinderGeometry(9,26,30,lite?16:28,1,true),mats.black);head.position.set(hd[0],T+hd[1]-12,hd[2]);head.userData.fixed=true;lp.add(head);
    const glow=new THREE.Mesh(new THREE.CircleGeometry(24,lite?16:28),mats.glow);glow.rotation.x=Math.PI/2;glow.position.set(hd[0],T+hd[1]-27,hd[2]);glow.userData.fixed=true;lp.add(glow);
    }
  /* the room: floor, ceiling, walls (the back one round the window), the window frame and the view beyond */
  const fy=ROOM.floor,cy=ROOM.ceil,H=cy-fy,wd=W.front-W.back,wx=2*W.side,zc=(W.front+W.back)/2;
  plane(mats.floor,wx,wd,0,fy,zc,{rx:-Math.PI/2,tile:160});
  plane(mats.ceil,wx,wd,0,cy,zc,{rx:Math.PI/2});
  const WN=ROOM.win[S.win],wy0=T+ROOM.win.y0,wy1=wy0+WN.h,wl=WN.x-WN.w/2,wr=WN.x+WN.w/2;
  const wall=(w,h,x,y,z,ry)=>plane(mats.wall,w,h,x,y,z,{ry,tile:220});
  wall(wl+W.side,H,(-W.side+wl)/2,fy+H/2,W.back,0);wall(W.side-wr,H,(wr+W.side)/2,fy+H/2,W.back,0);
  wall(WN.w,wy0-fy,WN.x,(fy+wy0)/2,W.back,0);wall(WN.w,cy-wy1,WN.x,(wy1+cy)/2,W.back,0);
  wall(wd,H,-W.side,fy+H/2,zc,Math.PI/2);wall(wd,H,W.side,fy+H/2,zc,-Math.PI/2);wall(wx,H,0,fy+H/2,W.front,Math.PI);
  if(S.wains){const wh=T-fy+6;for(const [w,x,z,ry] of [[wx,0,W.back+1,0],[wd,-W.side+1,zc,Math.PI/2],[wd,W.side-1,zc,-Math.PI/2]])plane(mats.wains,w,wh,x,fy+wh/2,z,{ry,tile:120});
    box(mats.wains,wx,4,3,0,fy+wh-T,W.back+2,{tile:120});}
  /* frame, mullions, sill, the glass and the valley (far enough out that it shifts a little as you move) */
  const fw=9,fz=W.back;
  box(mats.frame,WN.w+2*fw,fw,14,WN.x,wy0-fw-T,fz);box(mats.frame,WN.w+2*fw,fw,14,WN.x,wy1-T,fz);
  box(mats.frame,fw,WN.h,14,wl-fw/2,wy0-T,fz);box(mats.frame,fw,WN.h,14,wr+fw/2,wy0-T,fz);
  box(mats.frame,4,WN.h,6,WN.x,wy0-T,fz);box(mats.frame,WN.w,4,6,WN.x,wy0+WN.h*.55-T,fz);
  box(mats.frame,WN.w+40,4,30,WN.x,wy0-fw-4-T,fz+12);
  plane(mats.glass,WN.w,WN.h,WN.x,(wy0+wy1)/2,fz-1,{loose:true});
  plane(mats.view,WN.w*5,WN.w*2.5,WN.x,wy0+WN.h*.5+WN.w*.55,fz-520,{loose:true});
  /* stage dressing: a shelf left of the window; coded clocks where the models aren't loaded */
  if(st!=="corner"){box(mats.benchDark,190,5,34,-300,wy0+175-T,W.back+17,{tile:90});
    const wc=tag("wallclock",new THREE.Group());cyl(mats.benchDark,46,6,300,0,0,{into:wc,rx:Math.PI/2,seg:lite?20:40});cyl(mats.cloth,41,1,300,0,0,{into:wc,rx:Math.PI/2,seg:lite?20:40});
    wc.children.forEach(o=>{o.position.y=T+330;o.position.z=W.back+4;});}
  if(st==="shop"||st==="workshop"){const gc=tag("grandfather",new THREE.Group());box(mats.benchDark,80,620,90,470,fy-T,120,{into:gc,tile:120});
    const face=new THREE.Mesh(new THREE.CircleGeometry(30,lite?20:40),mats.cloth);face.position.set(429,fy+520,120);face.rotation.y=-Math.PI/2;face.userData.fixed=true;gc.add(face);}
  /* machines, each where it would stand */
  /* the timing machine, cleaning machine and display window have models on Full / Ultra, so their coded stand-ins go in a
     tagged group there; on Lite they merge with the rest of the room as they always have */
  const grp=k=>lite?G:tag(k,new THREE.Group()),tm=has.timing||"basic";
  { const x=128,z=back+rd+42,into=grp("timing");box(mats.paintGrey,58,20,44,x,0,z,{into});
    const sc=new THREE.Mesh(new THREE.PlaneGeometry(46,15),mats.screen);sc.position.set(x,T+12,z+22.2);sc.rotation.x=-.25;sc.userData.fixed=true;into.add(sc);
    rod(mats.dark,[x+40,0,z-6],[x+40,34,z-6],1.2,into);box(mats.dark,14,8,12,x+40,34,z-6,{into});blob(70,56,x+8,0,z);
    if(tm==="six"||tm==="lab"){cyl(mats.dark,7,10,x+40,26,z+6,{rx:Math.PI/2,into});}
    if(tm==="lab"){box(mats.white,62,8,62,x+96,0,z-14,{into});box(mats.glass,58,50,58,x+96,8,z-14,{into});} }
  if(has.cleaning){const x=168,z=back+rd/2,y=rh,into=grp("cleaning");box(mats.white,48,10,36,x,y,z,{into});for(let i=0;i<3;i++)cyl(mats.glass,6.5,16,x-14+i*14,y+10,z+4,{into});
    box(mats.white,10,46,10,x+18,y+10,z-12,{into});box(mats.white,30,8,14,x+5,y+46,z-12,{into});}
  if(has.lathe){const x=-112,z=30;box(mats.paint,92,6,11,x,0,z);box(mats.paint,20,20,16,x-34,6,z);cyl(mats.chrome,4,14,x-20,15,z,{rz:Math.PI/2});
    box(mats.paint,12,14,12,x+30,6,z);cyl(mats.paintGrey,9,26,x-38,0,z-34);blob(100,50,x-6,0,z-8);}
  if(has.polishing){const x=176,z=36;cyl(mats.paintGrey,9,30,x,9,z,{rz:Math.PI/2});for(const s of [-1,1])cyl(mats.cloth,13,4,x+s*19,9,z,{rz:Math.PI/2});box(mats.paintGrey,26,6,18,x,0,z);blob(56,30,x,0,z);}
  if(has.mill){const x=-430,z=-70;box(mats.paint,90,230,70,x,fy-T,z);box(mats.paint,26,240,26,x,fy-T+230,z-20);box(mats.paint,46,50,50,x,fy-T+400,z);box(mats.steel,80,10,40,x,fy-T+240,z+12);}
  if(has.cnc){box(mats.white,180,600,170,430,fy-T,-20);box(mats.glass,4,240,110,339,fy-T+230,-20);box(mats.black,4,40,60,338,fy-T+500,-90);}
  if(has.bench2){const x=420,z=430;box(mats.bench,200,BN.t,140,x,-BN.t,z,{ry:-Math.PI/2,tile:110});box(mats.benchDark,200,60,40,x+60,0,z,{ry:-Math.PI/2,tile:90});
    box(mats.felt,80,.04,60,x-10,0,z,{ry:-Math.PI/2});}
  if(has.window){const x=250,z=560,into=grp("window");box(mats.benchDark,160,260,60,x,fy-T,z,{tile:120,into});box(mats.glass,156,70,56,x,fy-T+260,z,{into});
    for(let i=0;i<4;i++)cyl(mats.brass,9,3,x-54+i*36,fy-T+262,z,{seg:lite?12:20,into});}
  if(has.climate)box(mats.white,110,34,26,280,cy-T-80,W.back+14);
  if(has.cleanroom){box(mats.white,150,300,6,-150,fy-T,W.front-4);box(mats.glass,60,80,2,-150,fy-T+190,W.front-8);}
  /* lights that belong to the room: daylight from the window */
  const day=new THREE.DirectionalLight(0xdbe6f5,lite?.35:.45);day.position.set(WN.x*.3,T+520,W.back-400);G.add(day);
  G.userData.stands=stands;G.userData.mats=mats;G.userData.spec=st;G.userData.has=has;
  mergeStatic(G);for(const k in stands)for(const o of stands[k]){mergeStatic(o);G.add(o);}
  G.rotation.y=ROOM.yaw;   // after merging: the merged meshes are in the room's own axes
  return G;}

/* ---- the models (Full / Ultra): loaded once each, cloned into the room; GLTFLoader comes with the post addons ---- */
function roomModels(G,st){
  if(V.tier==="lite")return;
  if(!THREE.GLTFLoader){if(window.__escPost)window.__escPost(ok=>{if(ok&&THREE.GLTFLoader&&V.room===G)roomModels(G,st);});return;}
  if(!V.models)V.models={};
  const has=G.userData.has||{},mats=G.userData.mats;
  for(const key in ROOM_MODELS){const m=ROOM_MODELS[key];if(m.stages&&!m.stages.includes(st))continue;if(m.has&&!has[m.has])continue;
    modelGet(m.file,src=>{if(V.room!==G)return;src.traverse(q=>{if(q.isMesh&&q.material)q.material.envMap=fullEnv();});const o=src.clone();o.scale.setScalar(ROOM.U);
      /* a material named for a room role becomes the room's own (on this clone only; the Poly Haven models keep theirs) */
      o.traverse(q=>{const n=q.isMesh&&q.material&&q.material.name;if(n&&n!=="own"&&mats[n])q.material=mats[n];});
      if(m.parts){const [k,d,show]=m.parts,v=has[k]||d;for(const n in show){const p=o.getObjectByName(n);if(p)p.visible=show[n].includes(v);}}
      const y=m.at[1]<=ROOM.floor+1?m.at[1]:ROOM.top+m.at[1];o.position.set(m.at[0],y,m.at[2]);o.rotation.order="YXZ";o.rotation.y=m.at[3];if(m.lay)o.rotation.x=-Math.PI/2;
      if(!m.stand||m.stand!=="wallclock"){o.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(o);o.position.y+=y-bb.min.y;}
      /* our own culling (roomCull): a model's box against the trimmed view, not its loose bounding spheres. The box is taken
         once the model is in the turned room, so it is in world space like the view (far from the bench the two differ a lot) */
      o.traverse(q=>{if(q.isMesh)q.frustumCulled=false;});G.add(o);G.updateWorldMatrix(true,false);o.updateMatrixWorld(true);o.userData.box=new THREE.Box3().setFromObject(o);
      if(m.stand)for(const s of (G.userData.stands[m.stand]||[]))s.visible=false;});}}
function modelGet(file,cb){const c=V.models[file];
  if(c&&c.scene){cb(c.scene);return;}if(c){c.wait.push(cb);return;}
  const e=V.models[file]={wait:[cb]};
  new THREE.GLTFLoader().load(file,g=>{g.scene.traverse(o=>{if(!o.isMesh)return;const m=o.material;if(m){m.envMap=fullEnv();m.envMapIntensity=.6;}o.geometry.userData.keep=true;});
    e.scene=g.scene;const w=e.wait;e.wait=null;w.forEach(f=>f(g.scene));},null,()=>{delete V.models[file];});}
/* drop the room: its own geometry and materials go, the shared model geometry and textures stay for the next one */
function dropRoom(){const g=V.room;if(!g)return;V.scene.remove(g);
  g.traverse(o=>{if(o.geometry&&!o.geometry.userData.keep)o.geometry.dispose();});
  const mm=g.userData.mats;if(mm)mm.own.forEach(m=>m.dispose());V.room=null;}
/* every frame: trim the far plane to the furthest thing the view can actually reach (rays from the four corners of the view
   stop at the bench top, if they land on it, else at the room's walls), then show only the models whose box is in view.
   Up close the bench hides everything beyond the mat, so the lamp, the clocks and the rest cost nothing there. */
const _fr=new THREE.Frustum(),_pm=new THREE.Matrix4(),_v=new THREE.Vector3(),_d=new THREE.Vector3();
function roomCull(){
  const cam=V.cam,g=V.room;if(!g)return;cam.updateMatrixWorld();
  const W=ROOM.walls,BN=ROOM.bench,c=Math.cos(-ROOM.yaw),s=Math.sin(-ROOM.yaw),th=Math.tan(cam.fov*Math.PI/360),tw=th*cam.aspect;
  const e=cam.matrixWorld.elements,R=[e[0],e[1],e[2]],U=[e[4],e[5],e[6]],F=[-e[8],-e[9],-e[10]],P=cam.position;
  const toL=(x,z)=>[x*c+z*s,-x*s+z*c],pl=toL(P.x,P.z),lo=[-W.side,ROOM.floor,W.back-560],hi=[W.side,ROOM.ceil,W.front];   // the back reaches out to the valley beyond the window
  let far=0;
  for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1],[0,0]]){
    const dw=[F[0]+R[0]*a*tw+U[0]*b*th,F[1]+R[1]*a*tw+U[1]*b*th,F[2]+R[2]*a*tw+U[2]*b*th],dl=toL(dw[0],dw[2]),d=[dl[0],dw[1],dl[1]],p=[pl[0],P.y,pl[1]];
    let t=Infinity;for(let i=0;i<3;i++){if(d[i]>1e-6)t=Math.min(t,(hi[i]-p[i])/d[i]);else if(d[i]<-1e-6)t=Math.min(t,(lo[i]-p[i])/d[i]);}
    if(d[1]<-1e-6){const tb=(ROOM.top-p[1])/d[1],x=p[0]+d[0]*tb,z=p[2]+d[2]*tb;if(tb>0&&Math.abs(x)<=BN.w/2&&z<=BN.front&&z>=BN.front-BN.d)t=Math.min(t,tb);}
    far=Math.max(far,t*Math.hypot(F[0],F[1],F[2])/Math.hypot(dw[0],dw[1],dw[2]));}   // as a depth along the view axis
  far=Math.min(3400,Math.max(30,far*1.08+8));
  if(Math.abs(far-cam.far)>.5){cam.far=far;cam.updateProjectionMatrix();}
  _fr.setFromProjectionMatrix(_pm.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse));
  for(const o of g.children)if(o.userData.box)o.visible=_fr.intersectsBox(o.userData.box);}
/* keep the camera inside the room: shorten the orbit distance along the view direction to stay clear of every wall */
function roomClamp(o){
  const W=ROOM.walls,m=ROOM.margin,cp=Math.cos(o.pitch),dw=[Math.sin(o.yaw)*cp,Math.sin(o.pitch),Math.cos(o.yaw)*cp];
  const c=Math.cos(-ROOM.yaw),s=Math.sin(-ROOM.yaw),d=[dw[0]*c+dw[2]*s,dw[1],-dw[0]*s+dw[2]*c];   // into the room's own axes
  const t=[o.tx*c+o.tz*s,o.ty,-o.tx*s+o.tz*c],lo=[-W.side+m,ROOM.floor+m,W.back+m],hi=[W.side-m,ROOM.ceil-m,W.front-m];
  let max=Infinity;for(let i=0;i<3;i++){if(d[i]>1e-6)max=Math.min(max,(hi[i]-t[i])/d[i]);else if(d[i]<-1e-6)max=Math.min(max,(lo[i]-t[i])/d[i]);}
  if(o.dist>max)o.dist=Math.max(2.4,max);}
