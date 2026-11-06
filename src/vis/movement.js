/* ---- vis/movement.js: the parametric movement. For now a stand-in: a brass bridge, a screw balance with its blued
   hairspring and a ruby jewel. PR 4 replaces this with plates, bridges and every wheel built from the parts table. ---- */
function buildPlaceholder(){
  const M=V.mats,g=new THREE.Group(),seg=V.tier==="lite"?40:96;
  /* the balance cock: one arm from the plate edge in to the balance staff, with a round end over the jewel */
  const sh=new THREE.Shape();sh.moveTo(-3.4,-.42);sh.lineTo(-.3,-.26);sh.absarc(0,0,.34,-Math.PI/2,Math.PI/2,false);sh.lineTo(-3.4,.42);sh.closePath();
  const bridge=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:.18,bevelEnabled:V.tier!=="lite",bevelSize:.03,bevelThickness:.03,bevelSegments:2,curveSegments:seg/4|0}),M.brass);
  bridge.rotation.x=-Math.PI/2;bridge.rotation.z=.6+Math.PI;bridge.position.set(0,.62,0);g.add(bridge);
  const jewel=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.06,16),M.ruby);jewel.position.set(0,.83,0);g.add(jewel);
  /* the balance: rim, three arms, hub, timing screws round the rim */
  const bal=new THREE.Group();
  const rim=new THREE.Mesh(new THREE.TorusGeometry(1.6,.09,10,seg),M.gilt);rim.rotation.x=Math.PI/2;bal.add(rim);
  for(let i=0;i<3;i++){const a=i*TAU/3,arm=new THREE.Mesh(new THREE.BoxGeometry(1.6,.05,.1),M.gilt);arm.position.set(Math.cos(a)*.8,0,Math.sin(a)*.8);arm.rotation.y=-a;bal.add(arm);}
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.22,16),M.steel);bal.add(hub);
  const nScrew=V.tier==="lite"?12:18,sg=new THREE.CylinderGeometry(.07,.07,.16,8);
  for(let i=0;i<nScrew;i++){const a=i*TAU/nScrew,s=new THREE.Mesh(sg,M.gilt);s.rotation.z=Math.PI/2;s.rotation.y=-a;s.position.set(Math.cos(a)*1.72,0,Math.sin(a)*1.72);bal.add(s);}
  bal.position.y=.2;g.add(bal);
  /* the hairspring: a flat Archimedean spiral under the bridge, drawn as a line (cheap on every tier) */
  const pts=[],turns=11,n=turns*36;
  for(let i=0;i<=n;i++){const t=i/n,a=t*turns*TAU,r=.24+t*.9;pts.push(new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r));}
  const spring=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:new THREE.Color(0x3d62b8).convertSRGBToLinear()}));
  spring.position.y=.42;g.add(spring);
  if(V.tier!=="lite")g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  g.userData={bal,spring};
  return g;
}
