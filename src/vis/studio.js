/* ---- vis/studio.js: the studio light the metal reflects ----
   Poly Haven's "Studio Small 03" by Greg Zaal (CC0; see textures/CREDITS.md), cut down to 512 x 256 RGBE
   (textures/studio_small_03.hdr, about 420 KB, fetched once; the service worker caches it like sounds/).
   Until it arrives, or if it never does (opened from a file, offline on the very first visit), a painted stand-in
   (paintedLight) does the same job, so no tier ever shows unlit metal.
   One decoded light, V.light (linear floats; lightAim swings the brightest patch, the big softbox, up over the far side
   of the movement as the home view sees it and adds a soft overhead fill, the way a movement is photographed; warmed a
   little by ENV.tint, its hot spots clamped), feeds both paths:
     Lite          three small LDR equirect canvases (sharp, satin, frosted: the same light blurred), tone-mapped once on
                   the CPU. Lite metal is MeshBasicMaterial times that envMap: one texture read a pixel and no lights, so
                   a phone gets moving reflections for less than the Phong it had before.
     Full / Ultra  an RGBE DataTexture through PMREMGenerator for MeshStandardMaterial, with ACES tone mapping. ---- */
const ENV={url:"textures/studio_small_03.hdr",clamp:22,tint:[1,.96,.88],
  key:{elev:1.08,yaw:-.5},fill:.4,   // the softbox is swung up to ~62° above the far side of the movement as the home view sees it (yaw = the camera's); fill = a soft overhead diffuser
  lite:{w:256,h:128,exp:1.1,lift:.02,blur:[0,3,9],gain:1.3},   // blur radii (pixels at 256 wide) for sharp / satin / frosted; gain lifts the metal colour so highlights clip toward white
  full:{exp:.82,int:1}};
/* a Radiance .hdr (flat or new-style RLE scanlines) to linear floats, turned, tinted and clamped */
function hdrDecode(b){
  let p=0;const line=()=>{let s="";while(p<b.length&&b[p]!==10)s+=String.fromCharCode(b[p++]);p++;return s;};
  if(!/^#\?/.test(line()))return null;
  while(p<b.length&&line()!=="");
  const m=/-Y (\d+) \+X (\d+)/.exec(line());if(!m)return null;
  const H=+m[1],W=+m[2],d=new Float32Array(W*H*3),sc=new Uint8Array(W*4),T=ENV.tint,cl=ENV.clamp;
  for(let y=0;y<H;y++){
    if(p+4>b.length)return null;
    if(b[p]===2&&b[p+1]===2&&((b[p+2]<<8)|b[p+3])===W){p+=4;
      for(let c=0;c<4;c++)for(let x=0;x<W;){let n=b[p++];if(!n||p>b.length)return null;
        if(n>128){n-=128;const v=b[p++];while(n--&&x<W)sc[(x++)*4+c]=v;}else while(n--&&x<W)sc[(x++)*4+c]=b[p++];}}
    else for(let i=0;i<W*4;i++)sc[i]=b[p++];
    for(let x=0;x<W;x++){const e=sc[x*4+3],f=e?Math.pow(2,e-136):0,o=(y*W+x)*3;
      for(let c=0;c<3;c++)d[o+c]=Math.min(cl,sc[x*4+c]*f*T[c]);}}
  return lightAim({W,H,d});}
/* the stand-in: a dark room, a pale floor, one big softbox and a ceiling lamp, painted where the photo has them */
function paintedLight(){
  const W=128,H=64,c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
  const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#0c0c0c");bg.addColorStop(.5,"#1c1c1a");bg.addColorStop(.62,"#8a8a86");bg.addColorStop(1,"#b4b4b0");
  g.fillStyle=bg;g.fillRect(0,0,W,H);
  const spot=(x,y,r)=>{const s=g.createRadialGradient(x,y,1,x,y,r);s.addColorStop(0,"#ffffff");s.addColorStop(.6,"#f4f2ee");s.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=s;g.fillRect(x-r,y-r,2*r,2*r);};
  spot(W*.42,H*.29,9);spot(W*.96,H*.12,4);
  const px=g.getImageData(0,0,W,H).data,d=new Float32Array(W*H*3);
  for(let i=0;i<W*H;i++)for(let k=0;k<3;k++){const v=Math.pow(px[i*4+k]/255,2.2);d[i*3+k]=v*(1+30*v*v*v*v)*ENV.tint[k];}
  const L=lightAim({W,H,d});L.painted=true;return L;}
/* equirect pixel <-> direction, three.js's convention: u = atan2(z, x) / 2pi + 0.5, v = asin(y) / pi + 0.5, row 0 at the top */
function eqDir(x,y,W,H){const ph=((x+.5)/W-.5)*TAU,th=(.5-(y+.5)/H)*Math.PI,c=Math.cos(th);return[c*Math.cos(ph),Math.sin(th),c*Math.sin(ph)];}
/* find the softbox (the brightest patch, on a coarse grid), rotate the whole light so it sits at ENV.key, add the fill */
function lightAim(L){const {W,H,d}=L,g=8;let best=-1,bx=0,by=0;
  for(let y=0;y<H;y+=g)for(let x=0;x<W;x+=g){let s=0;for(let j=0;j<g;j++)for(let i=0;i<g;i++){const o=((y+j)*W+x+i)*3;s+=d[o]+d[o+1]+d[o+2];}
    if(s>best){best=s;bx=x+g/2;by=y+g/2;}}
  const s0=eqDir(bx,by,W,H),K=ENV.key,ce=Math.cos(K.elev),t0=[-Math.sin(K.yaw)*ce,Math.sin(K.elev),-Math.cos(K.yaw)*ce];
  let k=[s0[1]*t0[2]-s0[2]*t0[1],s0[2]*t0[0]-s0[0]*t0[2],s0[0]*t0[1]-s0[1]*t0[0]];const kl=Math.hypot(k[0],k[1],k[2]);
  const a=Math.atan2(kl,s0[0]*t0[0]+s0[1]*t0[1]+s0[2]*t0[2]);if(kl>1e-6)k=k.map(v=>v/kl);else k=[1,0,0];
  const ca=Math.cos(-a),sa=Math.sin(-a),out=new Float32Array(d.length);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const v=eqDir(x,y,W,H),kv=k[0]*v[0]+k[1]*v[1]+k[2]*v[2];
    /* Rodrigues: rotate the output direction back by the swing to find where it came from */
    const cx=k[1]*v[2]-k[2]*v[1],cy=k[2]*v[0]-k[0]*v[2],cz=k[0]*v[1]-k[1]*v[0];
    const sx=v[0]*ca+cx*sa+k[0]*kv*(1-ca),sy=v[1]*ca+cy*sa+k[1]*kv*(1-ca),sz=v[2]*ca+cz*sa+k[2]*kv*(1-ca);
    const u=Math.atan2(sz,sx)/TAU+.5,w=Math.asin(Math.max(-1,Math.min(1,sy)))/Math.PI+.5;
    const sxp=Math.min(W-1,Math.floor(u*W)),syp=Math.min(H-1,Math.floor((1-w)*H)),si=(syp*W+sxp)*3,o=(y*W+x)*3,f=v[1]>0?ENV.fill*v[1]*v[1]:0;
    for(let c=0;c<3;c++)out[o+c]=d[si+c]+f*ENV.tint[c];}
  return{W,H,d:out};}
/* fetch the photo once; when it lands, every tier is rebuilt on it */
function studioStart(){
  if(V.lightTried||typeof fetch!=="function")return;V.lightTried=true;
  fetch(ENV.url).then(r=>r.ok?r.arrayBuffer():Promise.reject(r.status)).then(buf=>{
    let L=null;try{L=hdrDecode(new Uint8Array(buf));}catch(e){L=null;}
    if(!L)return;studioDrop();V.light=L;rebuild();}).catch(()=>{});}
function studioDrop(){if(V.env){V.env.dispose();V.env=null;}if(V.liteEnv){V.liteEnv.forEach(t=>t.dispose());V.liteEnv=null;}}
const lightNow=()=>V.light||(V.light=paintedLight());
/* box-resample the light to w x h, then a separable box blur (twice, so it is nearly Gaussian); x wraps, y clamps */
function lightResample(L,w,h){const out=new Float32Array(w*h*3),fx=Math.max(1,Math.round(L.W/w)),fy=Math.max(1,Math.round(L.H/h));
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let r=0,g=0,b=0;const x0=Math.floor(x*L.W/w),y0=Math.floor(y*L.H/h);
    for(let j=0;j<fy;j++)for(let i=0;i<fx;i++){const o=(Math.min(L.H-1,y0+j)*L.W+Math.min(L.W-1,x0+i))*3;r+=L.d[o];g+=L.d[o+1];b+=L.d[o+2];}
    const o=(y*w+x)*3,n=fx*fy;out[o]=r/n;out[o+1]=g/n;out[o+2]=b/n;}
  return out;}
function lightBlur(src,w,h,r){let a=src;const n=2*r+1;
  for(let pass=0;pass<4;pass++){const horiz=!(pass&1),b=new Float32Array(src.length);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s0=0,s1=0,s2=0;
      for(let k=-r;k<=r;k++){const xx=horiz?((x+k)%w+w)%w:x,yy=horiz?y:Math.max(0,Math.min(h-1,y+k)),o=(yy*w+xx)*3;s0+=a[o];s1+=a[o+1];s2+=a[o+2];}
      const o=(y*w+x)*3;b[o]=s0/n;b[o+1]=s1/n;b[o+2]=s2/n;}
    a=b;}
  return a;}
/* Lite: [sharp, satin, frosted] sRGB canvases, ACES-ish tone curve baked in */
function liteEnvs(){
  if(V.liteEnv)return V.liteEnv;
  const L=lightNow(),o=ENV.lite,w=o.w,h=o.h,base=lightResample(L,w,h);
  const aces=x=>{x*=o.exp;return Math.max(0,Math.min(1,x*(2.51*x+.03)/(x*(2.43*x+.59)+.14)));};
  V.liteEnv=o.blur.map(r=>{const f=r?lightBlur(base,w,h,r):base,c=document.createElement("canvas");c.width=w;c.height=h;
    const g=c.getContext("2d"),img=g.createImageData(w,h);
    for(let i=0;i<w*h;i++)for(let k=0;k<3;k++)img.data[i*4+k]=Math.round(255*Math.min(1,Math.pow(aces(f[i*3+k])+o.lift,1/2.2)));
    for(let i=0;i<w*h;i++)img.data[i*4+3]=255;
    g.putImageData(img,0,0);
    const t=new THREE.CanvasTexture(c);t.mapping=THREE.EquirectangularReflectionMapping;t.encoding=THREE.sRGBEncoding;return t;});
  return V.liteEnv;}
/* Full / Ultra: the light as RGBE bytes (rows flipped: a DataTexture's first row is the bottom) through PMREM */
function fullEnv(){
  if(V.env)return V.env;
  const L=lightNow(),W=L.W,H=L.H,u=new Uint8Array(W*H*4);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const s=(y*W+x)*3,o=((H-1-y)*W+x)*4,r=L.d[s],g=L.d[s+1],b=L.d[s+2],m=Math.max(r,g,b);
    if(m<1e-20)continue;const e=Math.ceil(Math.log2(m)+1e-7),k=256/Math.pow(2,e);
    u[o]=Math.min(255,r*k|0);u[o+1]=Math.min(255,g*k|0);u[o+2]=Math.min(255,b*k|0);u[o+3]=e+128;}
  const t=new THREE.DataTexture(u,W,H,THREE.RGBAFormat,THREE.UnsignedByteType,THREE.EquirectangularReflectionMapping);
  t.encoding=THREE.RGBEEncoding;t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;t.flipY=false;t.needsUpdate=true;
  const pm=new THREE.PMREMGenerator(V.r),rt=pm.fromEquirectangular(t);pm.dispose();t.dispose();
  V.env=rt.texture;return V.env;}
