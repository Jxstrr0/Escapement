/* ---- vis/movement.js: the parametric movement (plan section 7). Built from the cfg (part ids) by buildMovement(cfg);
   the geometry numbers are in GEO, never inline. Nothing here reads game state.
   Layout (plate coordinates x, z; the crown is at +x): barrel by the crown, then centre wheel (at the middle), third,
   fourth, escape wheel, pallet fork and the balance near the far edge. The chain was found by a small search so every
   wheel sits on the plate without fouling another.
   Layers, bottom to top, each its own group so the exploded view can lift it: dial side (calendar, date ring, moon),
   pillar plate, wheels, balance, bridges and cocks, top works (ratchet, chronograph, power reserve), rotor.
   Wheels are extruded gear profiles; tooth counts come from GEO.teeth and the beat rate (the fourth wheel gets
   7 x bph / 1800 teeth so its 7-leaf escape pinion turns the escape wheel at the right speed), capped per tier for the
   mesh only (GEO.toothCap). The escape wheel steps half a tooth per beat, the train turns from it, the pallet fork
   flicks each beat and the balance swings at the amplitude the app sends (setRun).
   Lite: every static part merged into one mesh per material, fewer curve segments, no bevels except for anglage.
   Materials come from movementMats (finishes from vis/finish.js); a bridge is [face, edge] so anglage can polish the bevels. ---- */
const GEO={
  plateR:4.3,plateY:.2,plateT:.28,
  wheelY:.6,wheelT:.06,balY:.8,bridgeY:1.12,bridgeT:.18,topY:1.32,rotorY:1.56,
  pinion:.16,
  /* where each pivot sits (found by search, see the header) */
  pos:{C:[0,0],B:[1.27,.61],T:[-.18,-1.09],F:[-.98,-1.54],E:[-.88,-2.4],P:[-1.42,-1.96],Bal:[-2.21,-1.41]},
  r:{C:.95,T:.75,F:.7,E:.42},
  barrel:{"single-small":{r:1.05,h:.36},"single-large":{r:1.25,h:.4},double:{r:1.05,h:.4,twin:true},"high-torque":{r:1.25,h:.5}},
  train:{standard:{spokes:4,polish:false},"polished-pivots":{spokes:5,polish:true},"fine-pitch":{spokes:5,polish:true,fine:true}},
  balance:{"smooth-small":{r:.95,screws:0},"smooth-large":{r:1.3,screws:0},screw:{r:1.15,screws:18},"free-sprung":{r:1.15,screws:0,weights:4}},
  spring:{"steel-flat":{col:0x3d62b8,over:false},"steel-overcoil":{col:0x3d62b8,over:true},"alloy-flat":{col:0xd8d0b4,over:false},
    "alloy-overcoil":{col:0xd8d0b4,over:true},silicon:{col:0x8a62d8,over:true}},
  teeth:{barrel:80,centre:80,third:75,escape:15,pinC:10,pinT:10,pinF:10,pinE:7},
  toothCap:{lite:36,full:96,ultra:140},
  explode:{dial:0,plate:.7,wheels:1.45,balance:2.05,bridges:2.65,top:3.25,rotor:3.85}   // lift per layer at full explode (the dial side stays on the mat)
};
const P2=k=>GEO.pos[k];
const ease=x=>x<=0?0:x>=1?1:x*x*(3-2*x);

/* ---- shapes ---- */
/* a gear: n trapezoid teeth on radius r, rim, k spokes cut out round a hub */
function gearShape(r,n,k,seg){
  const s=new THREE.Shape(),h=Math.min(.085,r*.1),rr=r-h;
  for(let i=0;i<n;i++){const a=i*TAU/n,w=TAU/n,p=[[rr,a],[r,a+w*.2],[r,a+w*.42],[rr,a+w*.62]];
    for(const [q,b] of p){const x=Math.cos(b)*q,y=Math.sin(b)*q;if(i===0&&q===rr&&b===a)s.moveTo(x,y);else s.lineTo(x,y);}}
  s.closePath();
  if(k>0)addSpokeHoles(s,rr-Math.max(.07,r*.13),Math.max(.12,r*.2),k,Math.max(.06,r*.08),seg);
  return s;}
/* window cut-outs between k spokes, from the hub out to the rim */
function addSpokeHoles(s,ro,ri,k,sw,seg){if(ro-ri<.08)return;
  for(let j=0;j<k;j++){const a1=j*TAU/k+sw/((ro+ri)/2)/2+.0001,a2=(j+1)*TAU/k-sw/((ro+ri)/2)/2;
    const hp=new THREE.Path();hp.moveTo(Math.cos(a1)*ri,Math.sin(a1)*ri);hp.absarc(0,0,ro,a1,a2,false);hp.lineTo(Math.cos(a2)*ri,Math.sin(a2)*ri);hp.absarc(0,0,ri,a2,a1,true);
    s.holes.push(hp);}}
/* the escape wheel: 15 club teeth leaning forward, three spokes */
function escapeShape(r,n){
  const s=new THREE.Shape(),b=r*.74;
  for(let i=0;i<n;i++){const a=i*TAU/n,w=TAU/n,p=[[b,a],[r,a+w*.3],[r*.93,a+w*.42],[b,a+w*.55]];
    p.forEach(([q,c],j)=>{const x=Math.cos(c)*q,y=Math.sin(c)*q;if(i===0&&j===0)s.moveTo(x,y);else s.lineTo(x,y);});}
  s.closePath();addSpokeHoles(s,b-.05,.1,3,.05,8);return s;}
/* a bridge: the rounded convex hull of some circles {x, z, r} (plate coordinates; shape y = -z) */
function hullShape(circles,seg){
  const pts=[];for(const c of circles)for(let i=0;i<seg;i++){const a=i*TAU/seg;pts.push([c.x+Math.cos(a)*c.r,-c.z+Math.sin(a)*c.r]);}
  pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];
  for(const p of pts){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}
  for(let i=pts.length-1;i>=0;i--){const p=pts[i];while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}
  const h=lo.slice(0,-1).concat(up.slice(0,-1)),s=new THREE.Shape();
  h.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));s.closePath();return s;}
/* an annulus sector, for the rotor and the gongs */
function ringShape(ri,ro,a1,a2){const s=new THREE.Shape();
  s.moveTo(Math.cos(a1)*ro,Math.sin(a1)*ro);s.absarc(0,0,ro,a1,a2,false);s.lineTo(Math.cos(a2)*ri,Math.sin(a2)*ri);s.absarc(0,0,ri,a2,a1,true);s.closePath();return s;}
/* extrude a shape upward: shape (x, y) lands on the plate as (x, -z), thickness t up from y */
function slab(shape,t,mat,y,o){o=o||{};
  const g=new THREE.ExtrudeGeometry(shape,{depth:t,curveSegments:o.seg||8,bevelEnabled:!!o.bevel,bevelSize:.025,bevelThickness:.02,bevelSegments:o.bevel===2?2:1});
  const m=new THREE.Mesh(g,mat);m.rotation.x=-Math.PI/2;m.position.y=y;return m;}
function cyl(r,h,mat,x,y,z,seg){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg||12),mat);m.position.set(x,y+h/2,z);return m;}

/* the movement's own materials (plate and bridge finishes, anglage, wheels, polished steel, springs, dial-side parts);
   disposed on rebuild. The finish textures themselves are shared and kept (vis/finish.js) */
function movementMats(cfg){
  const M=V.mats,fin=new Set(cfg.finish||[]),own=[],texs=[],lite=V.tier==="lite",C=sRGB;
  const metal=o=>{const m=metalMat(o);own.push(m);return m;};
  const plate=metal(fin.has("perlage")?{c:0xc9a45c,r:.34,fin:"perlage"}:{c:0xb99442,r:.5,fin:"frost"});
  const bridge=metal(fin.has("stripes")?{c:0xcfac62,r:.26,fin:"stripes"}:{c:0xc29d4e,r:.42,fin:"frost"});
  /* anglage: the bevelled edges (an extrusion's side faces) polished to a mirror */
  const edge=fin.has("anglage")?metal({c:0xdcbc76,r:.05}):bridge;
  const wheel=metal({c:0xd8b46a,r:.24,fin:"grain"});
  const steel=fin.has("black-polish")?metal({c:0xd6dce0,r:.04}):M.steel;
  const pinion=GEO.train[cfg.train]&&GEO.train[cfg.train].polish?(fin.has("black-polish")?steel:metal({c:0xcdd4d9,r:.1})):M.steel;
  const lineMat=col=>{const m=new THREE.LineBasicMaterial({color:C(col)});own.push(m);return m;};
  const flat=(col,rough)=>{const m=lite?new THREE.MeshLambertMaterial({color:C(col)}):new THREE.MeshStandardMaterial({color:C(col),roughness:rough,metalness:0,envMap:fullEnv(),envMapIntensity:.4});own.push(m);return m;};
  const S=GEO.spring[cfg.hairspring]||GEO.spring["steel-overcoil"];
  return{plate,bridge,bridgeSet:[bridge,edge],edge,steel,pinion,wheel,blued:M.blued,ruby:M.ruby,gilt:M.gilt,
    spring:lineMat(S.col),dial:flat(0xe9e4d6,.6),moon:flat(0x1d3570,.5),own,texs};}

/* ---- merging: on every tier, the parts that never move become one mesh per material per layer ---- */
function mergeStatic(layer){
  layer.updateMatrixWorld(true);
  const by=new Map(),drop=[],add=(mat,g,start,count)=>{const L=by.get(mat)||[];L.push({g,start,count});by.set(mat,L);};
  layer.traverse(o=>{if(!o.isMesh||!o.userData.fixed)return;
    let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    if(!g.attributes.uv)g.setAttribute("uv",new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    const n=g.attributes.position.count;
    if(Array.isArray(o.material)){for(const gr of g.groups)add(o.material[gr.materialIndex],g,gr.start,Math.min(gr.count,n-gr.start));}
    else add(o.material,g,0,n);
    drop.push(o);o.geometry.dispose();});
  for(const o of drop)o.parent.remove(o);
  const done=new Set();
  for(const [mat,L] of by){
    let n=0;for(const e of L)n+=e.count;
    const pos=new Float32Array(n*3),nor=new Float32Array(n*3),uv=new Float32Array(n*2);let at=0;
    for(const {g,start,count} of L){const A=g.attributes;
      pos.set(A.position.array.subarray(start*3,(start+count)*3),at*3);nor.set(A.normal.array.subarray(start*3,(start+count)*3),at*3);uv.set(A.uv.array.subarray(start*2,(start+count)*2),at*2);at+=count;done.add(g);}
    const mg=new THREE.BufferGeometry();mg.setAttribute("position",new THREE.BufferAttribute(pos,3));mg.setAttribute("normal",new THREE.BufferAttribute(nor,3));mg.setAttribute("uv",new THREE.BufferAttribute(uv,2));
    const m=new THREE.Mesh(mg,mat);m.matrixAutoUpdate=false;layer.add(m);}
  for(const g of done)g.dispose();}

/* ---- the movement ---- */
function buildMovement(cfg){
  cfg=cfg||{};
  const lite=V.tier==="lite",seg=lite?6:12,cap=GEO.toothCap[V.tier]||36,MM=movementMats(cfg),R=GEO.plateR;
  const bph=+cfg.bph||28800,comps=new Set(cfg.complications||[]),fin=new Set(cfg.finish||[]),jewels=+cfg.jewels||21;
  const tour=comps.has("tourbillon"),anglage=fin.has("anglage");
  const root=new THREE.Group(),layers={},anim={wheels:[],bph};
  for(const k in GEO.explode){const g=new THREE.Group();g.userData.ex=GEO.explode[k];layers[k]=g;root.add(g);}
  const fix=m=>{m.userData.fixed=true;return m;};
  const put=(layer,m,x,z)=>{m.position.x=x;m.position.z=z;layer.add(m);return m;};   // (add() returns the parent, not the child)
  const teeth=n=>Math.min(n,cap);
  /* a turning wheel: a pivot group at (x, z) holding the extruded wheel; ratio = turns per escape-wheel turn (signed) */
  function wheel(layer,key,r,n,k,mat,y,ratio,x,z){
    const pv=new THREE.Group();pv.position.set(x,0,z);
    pv.add(slab(gearShape(r,teeth(n),k,seg),GEO.wheelT,mat,y,{seg}));
    pv.add(cyl(GEO.pinion*.55,GEO.bridgeY-GEO.plateY-GEO.plateT,MM.pinion,0,GEO.plateY+GEO.plateT,0,8));   // the arbor and its pinion
    layer.add(pv);anim.wheels.push({g:pv,ratio});return pv;}

  /* pillar plate, with the crown and stem at 3 o'clock */
  layers.plate.add(fix(slab((()=>{const s=new THREE.Shape();s.absarc(0,0,R,0,TAU,false);return s;})(),GEO.plateT,MM.plate,GEO.plateY,{seg:lite?24:48})));
  const stem=fix(new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,1.1,8),MM.steel));stem.rotation.z=Math.PI/2;stem.position.set(R+.3,GEO.plateY+GEO.plateT/2,0);layers.plate.add(stem);
  const crown=fix(new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.32,lite?12:24),MM.gilt));crown.rotation.z=Math.PI/2;crown.position.set(R+.95,GEO.plateY+GEO.plateT/2,0);layers.plate.add(crown);

  /* the train. Ratios from the teeth: the escape wheel makes bph/1800 turns a minute */
  const T=GEO.teeth,nF=Math.round(T.pinE*bph/1800);
  const rF=T.pinE/nF,rT=-rF*T.pinF/T.third,rC=-rT*T.pinT/T.centre,rB=-rC*T.pinC/T.barrel;   // signs alternate mesh by mesh
  const tr=GEO.train[cfg.train]||GEO.train.standard,fine=tr.fine?1.5:1;
  const bar=GEO.barrel[cfg.barrel]||GEO.barrel["single-large"];
  const bpos=P2("B");
  const barrels=[[bpos[0],bpos[1]]];
  if(bar.twin){const a=80*Math.PI/180,d=2*bar.r;barrels.push([bpos[0]+Math.cos(a)*d*.95,bpos[1]+Math.sin(a)*d*.95]);}
  barrels.forEach(([x,z],i)=>{
    const pv=wheel(layers.wheels,"barrel",bar.r,Math.round(T.barrel*fine),0,MM.wheel,GEO.wheelY-.06,rB*(i?-1:1),x,z);
    pv.add(cyl(bar.r*.9,bar.h,MM.wheel,0,GEO.wheelY,0,lite?20:40));       // the drum
    pv.add(cyl(bar.r*.25,.03,MM.steel,0,GEO.wheelY+bar.h,0,12));});
  const [cx,cz]=P2("C"),[tx,tz]=P2("T"),[fx,fz]=P2("F");
  wheel(layers.wheels,"centre",GEO.r.C,Math.round(T.centre*fine),tr.spokes,MM.wheel,GEO.wheelY,rC,cx,cz);
  wheel(layers.wheels,"third",GEO.r.T,Math.round(T.third*fine),tr.spokes,MM.wheel,GEO.wheelY+.07,rT,tx,tz);
  wheel(layers.wheels,"fourth",GEO.r.F,nF,tr.spokes,MM.wheel,GEO.wheelY,rF,fx,fz);

  /* the escapement and the balance: on the plate, or riding in the tourbillon cage */
  const bal=GEO.balance[cfg.balance]||GEO.balance.screw,balR=tour?Math.min(bal.r,.85):bal.r;
  const [bx,bz]=P2("Bal");
  let E=P2("E"),Pp=P2("P"),host=layers.wheels,hostB=layers.balance,cage=null,ox=0,oz=0;
  if(tour){
    cage=new THREE.Group();cage.position.set(bx,0,bz);layers.balance.add(cage);host=cage;hostB=cage;ox=bx;oz=bz;
    const cg=MM.steel;
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.3,.05,6,lite?32:64),cg);ring.rotation.x=Math.PI/2;ring.position.y=GEO.wheelY-.05;cage.add(ring);
    const ring2=ring.clone();ring2.position.y=GEO.bridgeY-.08;cage.add(ring2);
    for(let i=0;i<3;i++){const a=i*TAU/3,b=new THREE.Mesh(new THREE.BoxGeometry(.08,GEO.bridgeY-GEO.wheelY,.08),cg);b.position.set(Math.cos(a)*1.3,(GEO.bridgeY+GEO.wheelY)/2-.06,Math.sin(a)*1.3);cage.add(b);
      const arm=new THREE.Mesh(new THREE.BoxGeometry(1.3,.05,.12),cg);arm.position.set(Math.cos(a)*.65,GEO.bridgeY-.06,Math.sin(a)*.65);arm.rotation.y=-a;cage.add(arm);}
    E=[bx+.95,bz+.25];Pp=[bx+.55,bz+.12];
    anim.cage=cage;}
  /* escape wheel (steel), stepping half a tooth per beat */
  const ep=new THREE.Group();ep.position.set(E[0]-ox,0,E[1]-oz);
  ep.add(slab(escapeShape(GEO.r.E,T.escape),GEO.wheelT,MM.steel,GEO.wheelY+.02,{seg}));
  ep.add(cyl(GEO.pinion*.5,GEO.bridgeY-GEO.plateY-GEO.plateT-.02,MM.pinion,0,GEO.plateY+GEO.plateT,0,8));
  host.add(ep);anim.esc=ep;
  /* pallet fork: an arm from its pivot toward the balance staff, two pallet stones toward the escape wheel */
  const fp=new THREE.Group();fp.position.set(Pp[0]-ox,0,Pp[1]-oz);
  const toB=Math.atan2(bz-Pp[1],bx-Pp[0]),toE=Math.atan2(E[1]-Pp[1],E[0]-Pp[0]),fy=GEO.wheelY+.14;
  const fl=Math.hypot(bx-Pp[0],bz-Pp[1])-.18;
  const arm=new THREE.Mesh(new THREE.BoxGeometry(fl,.05,.07),MM.steel);arm.position.set(Math.cos(toB)*fl/2,fy,Math.sin(toB)*fl/2);arm.rotation.y=-toB;fp.add(arm);
  for(const s of [-1,1]){const a=toE+s*.62,L=.42,pa=new THREE.Mesh(new THREE.BoxGeometry(L,.05,.06),MM.steel);pa.position.set(Math.cos(a)*L/2,fy,Math.sin(a)*L/2);pa.rotation.y=-a;fp.add(pa);
    const st=new THREE.Mesh(new THREE.BoxGeometry(.08,.07,.05),MM.ruby);st.position.set(Math.cos(a)*L,fy-.02,Math.sin(a)*L);st.rotation.y=-a;fp.add(st);}
  fp.add(cyl(.05,GEO.bridgeY-GEO.plateY-GEO.plateT,MM.steel,0,GEO.plateY+GEO.plateT,0,8));
  host.add(fp);anim.fork=fp;
  /* the balance: rim, arms, hub, timing screws or free-sprung weights */
  const bg=new THREE.Group();bg.position.set(bx-ox,GEO.balY,bz-oz);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(balR,.075,lite?6:10,lite?40:80),MM.gilt);rim.rotation.x=Math.PI/2;bg.add(rim);
  const nArm=bal.weights?2:3;
  for(let i=0;i<nArm;i++){const a=i*TAU/nArm,am=new THREE.Mesh(new THREE.BoxGeometry(balR*2*(nArm===2?1:.5),.045,.09),MM.gilt);
    if(nArm===3){am.position.set(Math.cos(a)*balR/2,0,Math.sin(a)*balR/2);}am.rotation.y=-a;bg.add(am);}
  bg.add(cyl(.13,.3,MM.steel,0,-.15,0,12));
  if(bal.screws){const n=lite?12:bal.screws,sg=new THREE.CylinderGeometry(.055,.055,.15,6);
    for(let i=0;i<n;i++){const a=i*TAU/n,s=new THREE.Mesh(sg,MM.gilt);s.rotation.z=Math.PI/2;s.rotation.y=-a;s.position.set(Math.cos(a)*(balR+.07),0,Math.sin(a)*(balR+.07));bg.add(s);}}
  if(bal.weights)for(let i=0;i<bal.weights;i++){const a=(i+.5)*TAU/bal.weights;bg.add(cyl(.11,.1,MM.steel,Math.cos(a)*(balR-.14),-.05,Math.sin(a)*(balR-.14),10));}
  hostB.add(bg);anim.bal=bg;
  /* the hairspring: a flat spiral line; an overcoil lifts the last turn up and in */
  const sp=GEO.spring[cfg.hairspring]||GEO.spring["steel-overcoil"],pts=[],turns=11,n=turns*(lite?24:40),r0=.18,r1=balR*.72;
  for(let i=0;i<=n;i++){const t=i/n,a=t*turns*TAU,r=r0+t*(r1-r0);pts.push(new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r));}
  if(sp.over)for(let i=1;i<=24;i++){const t=i/24,a=turns*TAU+t*Math.PI*1.2,r=r1-t*(r1-r0)*.45;pts.push(new THREE.Vector3(Math.cos(a)*r,.09*Math.sin(Math.min(1,t*2)*Math.PI/2),Math.sin(a)*r));}
  const spring=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),MM.spring);spring.position.set(bx-ox,GEO.balY+.16,bz-oz);hostB.add(spring);anim.spring=spring;

  /* bridges and cocks: rounded hulls round their pivots, screwed down at their ends */
  const B=layers.bridges,bseg=lite?10:18,by=GEO.bridgeY,bt=GEO.bridgeT,bev=anglage?(lite?1:2):(lite?0:1);
  const edge=(x,z,d)=>{const l=Math.hypot(x,z)||1;return[x/l*(R-d),z/l*(R-d)];};
  const bridgeList=[];
  const bar_=(circles,screwAt)=>{B.add(fix(slab(hullShape(circles,bseg),bt,MM.bridgeSet,by,{seg,bevel:bev})));bridgeList.push(screwAt);};
  { const [ex,ez]=edge(barrels[0][0],barrels[0][1],.5);
    bar_(barrels.map(([x,z])=>({x,z,r:.62})).concat([{x:ex,z:ez,r:.42}]),[[ex,ez]]); }
  bar_([{x:cx,z:cz,r:.3},{x:tx,z:tz,r:.28}],[[ (cx+tx)/2,(cz+tz)/2 ]]);
  if(!tour){
    const [e1,e2]=edge(fx-.4,fz,.45);
    bar_([{x:fx,z:fz,r:.28},{x:E[0],z:E[1],r:.26},{x:e1,z:e2,r:.3}],[[e1,e2]]);
    const [p1,p2]=edge(Pp[0],Pp[1],.4);
    bar_([{x:Pp[0],z:Pp[1],r:.2},{x:p1,z:p2,r:.24}],[[p1,p2]]);
    const [k1,k2]=edge(bx,bz,.45);
    B.add(fix(slab(hullShape([{x:bx,z:bz,r:.36},{x:k1+(k2>0?.3:-.3)*.6,z:k2,r:.48},{x:k1,z:k2,r:.48}],bseg),bt,MM.bridgeSet,by+.04,{seg,bevel:bev})));bridgeList.push([[k1,k2]]);
    /* the regulator on the cock: an index lever, or a swan-neck micro-adjust; a free-sprung balance has none */
    if(cfg.regulator==="index"||cfg.regulator==="micro-adjust"){
      const a=Math.atan2(k2-bz,k1-bx)+.9,L=balR*.9,lv=fix(new THREE.Mesh(new THREE.BoxGeometry(L,.03,.07),MM.steel));
      lv.position.set(bx+Math.cos(a)*L/2,by+bt+.06,bz+Math.sin(a)*L/2);lv.rotation.y=-a;B.add(lv);
      if(cfg.regulator==="micro-adjust"){const sw=fix(new THREE.Mesh(new THREE.TorusGeometry(.3,.025,4,lite?12:24,Math.PI*1.3),MM.steel));
        sw.rotation.x=Math.PI/2;sw.position.set(bx+Math.cos(a)*L,by+bt+.06,bz+Math.sin(a)*L);B.add(sw);}}
    /* shock protection on the balance jewel: a lyre spring (basic) or a blued one (premium) */
    if(cfg.shock==="basic"||cfg.shock==="premium"){const ly=fix(new THREE.Mesh(new THREE.TorusGeometry(.16,.02,4,lite?10:20,Math.PI*1.6),cfg.shock==="premium"?MM.blued:MM.gilt));
      ly.rotation.x=Math.PI/2;ly.position.set(bx,by+bt+.08,bz);B.add(ly);}
  }else{
    /* the tourbillon bridge: a ring over the cage, held at two points */
    const [k1,k2]=edge(bx,bz,.35);
    put(B,fix(slab(ringShape(1.38,1.56,0,TAU),bt,MM.bridgeSet,by+.06,{seg,bevel:bev})),bx,bz);
    bar_([{x:bx+(k1-bx)*.75,z:bz+(k2-bz)*.75,r:.24},{x:k1,z:k2,r:.3}],[[k1,k2]]);
    const [e1,e2]=edge(fx-.4,fz,.45);bar_([{x:fx,z:fz,r:.28},{x:e1,z:e2,r:.3}],[[e1,e2]]);}
  /* jewels at the pivots (gold chatons round them from 25 jewels), blued screws at the bridge ends */
  const piv=[[cx,cz],[tx,tz],[fx,fz]].concat(tour?[]:[E,Pp,[bx,bz]]);
  for(const [x,z] of piv){B.add(fix(cyl(.075,.03,MM.ruby,x,by+bt,z,10)));
    if(jewels>=25){const ch=fix(new THREE.Mesh(new THREE.TorusGeometry(.11,.025,4,12),MM.gilt));ch.rotation.x=Math.PI/2;ch.position.set(x,by+bt+.02,z);B.add(ch);}}
  for(const L of bridgeList)for(const [x,z] of L){B.add(fix(cyl(.11,.04,MM.blued,x,by+bt,z,10)));}

  /* top works: the ratchet wheel over the barrel, the crown wheel */
  const top=layers.top;
  { const rp=new THREE.Group();rp.position.set(barrels[0][0],0,barrels[0][1]);rp.add(slab(gearShape(.62,teeth(40),0,seg),.06,MM.steel,GEO.topY-.14,{seg}));
    rp.add(cyl(.14,.04,MM.blued,0,GEO.topY-.08,0,10));top.add(rp);anim.ratchet=rp;
    put(top,fix(slab(gearShape(.3,teeth(24),0,seg),.06,MM.steel,GEO.topY-.14,{seg})),R-1.05,.35);}
  /* complications */
  if(comps.has("power-reserve")){put(top,fix(slab(gearShape(.42,teeth(36),3,seg),.05,MM.wheel,GEO.topY-.1,{seg})),2.55,1.85);
    put(top,fix(slab(gearShape(.28,teeth(24),0,seg),.05,MM.steel,GEO.topY-.04,{seg})),2.55,1.85);}
  if(comps.has("chrono")){
    const cw=new THREE.Group();cw.position.set(2.45,0,-1.55);
    cw.add(slab(gearShape(.36,teeth(18),0,seg),.06,MM.steel,GEO.topY-.1,{seg}));
    for(let i=0;i<6;i++){const a=i*TAU/6;cw.add(Object.assign(cyl(.07,.14,MM.steel,Math.cos(a)*.24,GEO.topY-.04,Math.sin(a)*.24,6),{}));}
    top.add(cw);cw.traverse(o=>{if(o.isMesh)o.userData.fixed=true;});
    const run=new THREE.Group();run.position.set(cx,0,cz);run.add(slab(gearShape(1.0,teeth(120),5,seg),.04,MM.steel,GEO.topY,{seg}));
    run.add(cyl(.12,.1,MM.gilt,0,GEO.topY,0,12));top.add(run);anim.chrono=run;
    const lv=fix(slab(hullShape([{x:2.45,z:-1.55,r:.18},{x:1.2,z:-.55,r:.14}],bseg),.05,MM.steel,GEO.topY+.02,{seg}));top.add(lv);}
  if(comps.has("split-seconds")){
    const cw=fix(slab(gearShape(.3,teeth(16),0,seg),.06,MM.steel,GEO.topY-.08,{seg}));cw.position.set(2.9,0,-.45);top.add(cw);
    const run=new THREE.Group();run.position.set(cx,0,cz);run.add(slab(gearShape(.9,teeth(110),5,seg),.04,MM.gilt,GEO.topY+.08,{seg}));top.add(run);anim.split=run;}
  if(comps.has("repeater")){
    for(const [rr,w] of [[R-.12,.05],[R-.26,.05]])layers.plate.add(fix(slab(ringShape(rr-w,rr,.4,TAU-.6),.05,MM.steel,GEO.plateY+GEO.plateT+.02,{seg:lite?24:48})));
    for(const [x,z] of [[-3.1,2.1],[-2.75,2.5]]){const h=fix(slab(hullShape([{x,z,r:.12},{x:x+.5,z:z-.45,r:.09}],bseg),.08,MM.steel,GEO.plateY+GEO.plateT+.04,{seg}));layers.wheels.add(h);}}
  /* dial side: date ring, GMT wheel, moon disc, calendar works */
  const D=layers.dial,dy=GEO.plateY-.16;
  if(comps.has("date"))D.add(fix(slab(ringShape(3.35,4.05,0,TAU),.04,MM.dial,dy,{seg:lite?32:64})));
  if(comps.has("gmt"))put(D,fix(slab(gearShape(.55,teeth(48),3,seg),.04,MM.wheel,dy+.06,{seg})),0,1.25);
  if(comps.has("moonphase")){const md=fix(slab((()=>{const s=new THREE.Shape();s.absarc(0,0,1.0,0,TAU,false);return s;})(),.04,MM.moon,dy+.02,{seg:lite?16:32}));md.position.set(0,0,2.3);D.add(md);
    for(const a of [0,Math.PI])D.add(fix(cyl(.3,.02,MM.gilt,Math.cos(a)*.6,dy+.06,2.3+Math.sin(a)*.6,lite?12:20)));}
  if(comps.has("annual-cal")||comps.has("perp-cal")){
    put(D,fix(slab(gearShape(.9,teeth(31),4,seg),.04,MM.wheel,dy+.1,{seg})),-2.1,1.15);
    put(D,fix(slab(gearShape(.6,teeth(12),3,seg),.04,MM.steel,dy+.1,{seg})),2.1,-1.9);
    if(comps.has("perp-cal"))put(D,fix(slab(gearShape(1.5,teeth(48),5,seg),.03,MM.gilt,dy+.02,{seg})),-.6,-1.6);}
  /* the automatic rotor: a heavy brass sector on a steel hub, over everything */
  if(cfg.winding==="automatic"){const rot=new THREE.Group();
    rot.add(slab(ringShape(3.2,R-.05,-Math.PI*.45,Math.PI*.45),.11,MM.bridgeSet,GEO.rotorY,{seg:lite?16:40,bevel:anglage||!lite?1:0}));
    rot.add(slab(hullShape([{x:0,z:0,r:.3},{x:3.3,z:0,r:.22}],bseg),.07,MM.gilt,GEO.rotorY+.02,{seg}));
    rot.add(cyl(.32,.14,MM.steel,0,GEO.rotorY,0,lite?12:20));layers.rotor.add(rot);anim.rotor=rot;}

  for(const k in layers)mergeStatic(layers[k]);
  if(!lite)root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  root.position.y=-.28;   // sit on the felt
  anim.layers=layers;anim.mats=MM;anim.loupe=new THREE.Vector3(bx*.75+E[0]*.25,GEO.balY-.28,bz*.75+E[1]*.25);
  root.userData=anim;
  return root;}

/* ---- motion: called every frame with the time in seconds ---- */
function animateMovement(u,t,dt){
  const R=V.run,f=R.bph/7200,amp=R.wound?R.amp*Math.PI/180:0;
  /* the balance swings; each zero crossing is a beat */
  const ph=TAU*f*t;if(u.bal)u.bal.rotation.y=amp*Math.sin(ph);
  if(u.spring)u.spring.scale.set(1+.035*Math.sin(ph),1,1+.035*Math.sin(ph));
  const beats=R.wound?2*f*t:0,n=Math.floor(beats),fr=beats-n,kick=ease(fr/.14);
  /* escape wheel: half a tooth a beat, snapping forward right after the beat */
  const step=TAU/GEO.teeth.escape/2,esc=(n+kick)*step;
  if(u.esc)u.esc.rotation.y=-esc;
  for(const w of u.wheels)w.g.rotation.y=-esc*w.ratio;
  /* the pallet fork flicks from one banking to the other at every beat */
  if(u.fork){const s=n&1?1:-1;u.fork.rotation.y=.14*(-s+2*s*kick);}
  if(u.cage)u.cage.rotation.y=-t*TAU/60;          // a tourbillon turns once a minute
  if(u.chrono)u.chrono.rotation.y=-t*TAU/60;      // the chronograph seconds runner, running
  if(u.split)u.split.rotation.y=-t*TAU/60;
  if(u.rotor)u.rotor.rotation.y=Math.sin(t*.35)*1.4;  // the rotor rocks as if on a wrist
  /* exploded view: each layer eases to its lifted height */
  const k=V.reduce?1:Math.min(1,dt*5);V.explode+=(V.explodeT-V.explode)*k;
  if(Math.abs(V.explodeT-V.explode)<.001)V.explode=V.explodeT;
  for(const key in u.layers){const g=u.layers[key];g.position.y=g.userData.ex*V.explode;}}
