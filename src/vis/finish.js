/* ---- vis/finish.js: the watchmaker's finishes as textures, and the metal materials that wear them ----
   Each finish starts as a small height field drawn in code (no image files):
     perlage   overlapping spots, each with fine concentric grooves on a low dome (the pillar plate, finish "perlage")
     stripes   Côtes de Genève: domed bands with fine lines along them (the bridges, finish "stripes"; also the rotor)
     grain     circular graining: rings of random depth round the centre (every wheel; its texture centre is the arbor)
     frost     a fine sandblasted grain (a plate or bridge with no decoration)
   From the height: Full / Ultra get a normal map, a roughness map and a soft shade map; Lite gets only the shade map
   (the pattern lit once from the lamp's side, multiplied into the colour), which costs nothing extra per pixel.
   Drawn once per tier and kept in V.fin (a part change rebuilds the movement, not these); a tier change frees them.
   Sizes and strengths are in FIN; tile sizes are in plate units (the plate is GEO.plateR = 4.3 across its radius). ---- */
const FIN={size:{lite:128,full:512,ultra:1024},
  perlage:{n:4,tile:3.0,rings:14,liteRings:3,dome:.7,groove:.22,ns:.45},
  stripes:{n:3,tile:2.1,rot:-.55,lines:.04,ns:.7},
  grain:{tile:3.0,rings:150,ns:.6},
  frost:{tile:.9,ns:.12},
  shadeFrom:[-.45,.55,.7]};    // the light direction the shade map is lit from (x right, y up the texture, z out)
/* a small tileable value noise (hash on a grid, smoothstep between) */
function fHash(i,j,s){let h=(i*374761393+j*668265263+s*982451653)|0;h=(h^(h>>>13))*1274126177|0;return((h^(h>>>16))>>>0)/4294967296;}
function fNoise(x,y,per,s){const i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),w=k=>((k%per)+per)%per;
  const a=fHash(w(i),w(j),s),b=fHash(w(i+1),w(j),s),c=fHash(w(i),w(j+1),s),d=fHash(w(i+1),w(j+1),s);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function finHeight(kind,S){const h=new Float32Array(S*S);
  if(kind==="perlage"){const F=FIN.perlage,st=S/F.n,R=st*.74,rings=V.tier==="lite"?F.liteRings:F.rings;
    for(let gy=-1;gy<=F.n;gy++)for(let gx=-1;gx<=F.n;gx++){const cx=gx*st+(gy&1?st/2:0),cy=gy*st,ph=fHash(gx+9,gy+9,3)*TAU;
      for(let y=Math.floor(cy-R);y<=cy+R;y++)for(let x=Math.floor(cx-R);x<=cx+R;x++){const d=Math.hypot(x-cx,y-cy);if(d>R)continue;
        const t=d/R,px=((x%S)+S)%S,py=((y%S)+S)%S;
        /* a low dome, and fine circular scratches whose depth wanders round the spot (so the light catches a crescent, not a target) */
        const a=Math.atan2(y-cy,x-cx),wob=.55+.45*Math.sin(a+ph);
        h[py*S+px]=F.dome*(1-t*t)+F.groove*wob*Math.cos(t*rings*TAU+ph*3)*t;}}}
  else if(kind==="stripes"){const F=FIN.stripes,w=S/F.n;
    for(let y=0;y<S;y++)for(let x=0;x<S;x++){const t=(x%w)/w,dome=Math.sqrt(Math.max(0,1-(2*t-1)*(2*t-1)));
      h[y*S+x]=dome*.9+F.lines*(fNoise(x*.9,y*.004,Math.round(S*.9),5)-.5)+F.lines*.5*(fNoise(x*3.1,y*.01,Math.round(S*3.1),6)-.5);}}
  else if(kind==="grain"){const F=FIN.grain,c=S/2;
    for(let y=0;y<S;y++)for(let x=0;x<S;x++){const d=Math.hypot(x-c+.5,y-c+.5)/c*F.rings;
      h[y*S+x]=.6*fNoise(d,.5,1<<20,7)+.4*fNoise(d*3.7,.5,1<<20,8);}}
  else{for(let y=0;y<S;y++)for(let x=0;x<S;x++)h[y*S+x]=.6*fNoise(x*32/S,y*32/S,32,11)+.4*fNoise(x*96/S,y*96/S,96,12);}
  return h;}
/* height -> the three textures; wrap = tileable or clamped (grain) */
function finTex(kind){
  const tier=V.tier,key=kind;if(!V.fin)V.fin={};if(V.fin[key])return V.fin[key];
  const S=FIN.size[tier]||128,F=FIN[kind],h=finHeight(kind,S),lite=tier==="lite",wrap=kind!=="grain";
  const at=(x,y)=>wrap?h[((y+S)%S)*S+((x+S)%S)]:h[Math.max(0,Math.min(S-1,y))*S+Math.max(0,Math.min(S-1,x))];
  const k=S/96,L=FIN.shadeFrom,ll=Math.hypot(L[0],L[1],L[2]);
  const mk=()=>{const c=document.createElement("canvas");c.width=c.height=S;const g=c.getContext("2d");return{c,g,img:g.createImageData(S,S)};};
  const shade=mk(),nor=lite?null:mk(),rough=lite?null:mk();
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){
    const du=(at(x+1,y)-at(x-1,y))*k,dv=-(at(x,y+1)-at(x,y-1))*k;   // canvas rows run down, the texture's v runs up
    let nx=-du,ny=-dv,nz=1;const nl=Math.hypot(nx,ny,nz);nx/=nl;ny/=nl;nz/=nl;
    const i=(y*S+x)*4,lit=Math.max(0,(nx*L[0]+ny*L[1]+nz*L[2])/ll),sh=lite?.66+.38*lit:.86+.16*lit;
    shade.img.data[i]=shade.img.data[i+1]=shade.img.data[i+2]=Math.min(255,Math.round(255*sh));shade.img.data[i+3]=255;
    if(nor){nor.img.data[i]=Math.round((nx*.5+.5)*255);nor.img.data[i+1]=Math.round((ny*.5+.5)*255);nor.img.data[i+2]=Math.round(nz*255);nor.img.data[i+3]=255;
      const r=Math.round(255*(.72+.28*Math.min(1,Math.abs(at(x,y)-.5)*1.6)));rough.img.data[i]=rough.img.data[i+1]=rough.img.data[i+2]=r;rough.img.data[i+3]=255;}}
  const tex=(o,srgb)=>{o.g.putImageData(o.img,0,0);const t=new THREE.CanvasTexture(o.c);t.encoding=srgb?THREE.sRGBEncoding:THREE.LinearEncoding;
    t.wrapS=t.wrapT=wrap?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;t.anisotropy=lite?1:Math.min(4,V.r.capabilities.getMaxAnisotropy());
    t.repeat.set(1/F.tile,1/F.tile);
    if(kind==="grain")t.offset.set(.5,.5);   // the wheel's UVs are its own shape coordinates: (0,0) is the arbor
    if(kind==="stripes"){t.center.set(.5,.5);t.rotation=F.rot;}   // the ribbons run across the bridges at a slant
    return t;};
  V.fin[key]={map:tex(shade,true),nmap:nor&&tex(nor,false),rmap:rough&&tex(rough,false),ns:F.ns};
  return V.fin[key];}
function finDrop(){if(V.fin)for(const k in V.fin){const f=V.fin[k];for(const t of [f.map,f.nmap,f.rmap])if(t)t.dispose();}V.fin=null;}
/* colours are written as sRGB hex; the renderer outputs sRGB, so convert them to linear first or everything washes out */
const sRGB=h=>new THREE.Color(h).convertSRGBToLinear();
/* a metal: o = {c: sRGB hex, r: roughness, fin: finish kind or none, coat: a clear oxide film (blued steel)}.
   Lite: the colour times the studio light (sharp, satin or frosted by roughness), plus the finish's shade map.
   Full / Ultra: PBR metal on the PMREM light, with the finish's normal, roughness and shade maps. */
function metalMat(o){
  const f=o.fin?finTex(o.fin):null;
  if(V.tier==="lite"){const E=liteEnvs(),i=o.r<.16?0:o.r<.34?1:2;
    return new THREE.MeshBasicMaterial({color:sRGB(o.c).multiplyScalar(ENV.lite.gain*(o.lite||1)),map:f?f.map:null,envMap:E[i],combine:THREE.MultiplyOperation,reflectivity:1});}
  const P=o.coat?THREE.MeshPhysicalMaterial:THREE.MeshStandardMaterial;
  const m=new P({color:sRGB(o.c),roughness:o.r,metalness:1,envMap:fullEnv(),envMapIntensity:ENV.full.int,
    map:f?f.map:null,normalMap:f?f.nmap:null,roughnessMap:f?f.rmap:null});
  if(f)m.normalScale.set(f.ns,f.ns);
  if(o.coat){m.clearcoat=o.coat;m.clearcoatRoughness=.08;}
  return m;}
/* a jewel: deep red with a glassy reflection (Lite mixes in the sharp light; Full / Ultra add a clear coat) */
function gemMat(c){
  if(V.tier==="lite")return new THREE.MeshBasicMaterial({color:sRGB(c),envMap:liteEnvs()[0],combine:THREE.MixOperation,reflectivity:.2});
  return new THREE.MeshPhysicalMaterial({color:sRGB(c),roughness:.08,metalness:0,clearcoat:1,clearcoatRoughness:.02,envMap:fullEnv(),envMapIntensity:1.6,emissive:sRGB(0x2a0006)});}
