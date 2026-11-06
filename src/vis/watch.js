/* ---- vis/watch.js: the cased watch, dial side up (the Bench's "Dial side" view, PR 9) ----
   The app sends setWatch({caseId, comps, auto, top, mid, foot}); the watch is built when the view first needs it and
   rebuilt when that changes. Each case brings its own dial (WATCH.cases; CASES in app/state.js names them):
     steel-dress  dress case, silver sunburst dial, applied faceted batons, dauphine hands
     steel-sport  big case, black dial, lume plots, sword hands with lume
     gold-dress   dress case, cream enamel dial, Roman numerals fired in, blued Breguet hands
     gold-big     big case, cream dial with an open heart (a cut-out where the balance swings), gold studs, leaf hands
     platinum     mid case, guilloché dial, applied Roman numerals, blued Breguet hands
   The build decides what else is on the dial (watchLayout): sub-dials, windows and apertures go to the 12, 3, 6 and 9
   o'clock slots in order of importance (tourbillon aperture, moon, perpetual calendar, chronograph counters, power
   reserve, date), and the hour marker under each is left out. The hands tell the real time; the seconds hand steps at
   the movement's beat rate; the date window, the day, month and moon show today.
   Every tier draws the whole watch in code: the case turned from the same profiles as tools/blender/case.py (CASE_GEO),
   the dial a canvas (printing, tracks, sub-dials, windows; a guilloché normal map on Full / Ultra), the hands extruded
   shapes. Full / Ultra then swap in the Blender models from models/ (WATCH.models): the case and crown, the dial's
   applied markers, and the tourbillon cage; the coded stand-in hides when its model lands (the same as the room's).
   Built in millimetres inside a group scaled to scene units (ROOM.U / 1000); 12 o'clock is -z, the crown +x. ---- */
const CASE_GEO={   // mm; the same numbers as SIZES in tools/blender/case.py (change both together)
  dress:{R:18,lw:18,lt:2.3,l2l:44,b:1.4,m:5.8,top:6.8,ct:7.7,dz:4.4,dr:15.4,bi:15.8,cr:2.5,cl:2.2,style:"dress"},
  mid:{R:19.5,lw:20,lt:2.4,l2l:47,b:1.6,m:7,top:8.2,ct:9.2,dz:5.4,dr:16.6,bi:17.2,cr:2.8,cl:2.4,style:"mid"},
  big:{R:20.5,lw:20,lt:3,l2l:49,b:2,m:8.6,top:10,ct:11,dz:6.6,dr:16.8,bi:17.4,cr:3.2,cl:2.8,style:"big"}};
const WATCH={mm:ROOM.U/1000,dialR:16,   // dialR: the radius the dial models were made on (tools/blender/dials.py)
  /* each case: its size (CASE_GEO), metal, dial, and the strap it comes on (colour, roughness) */
  cases:{"steel-dress":{size:"dress",metal:"steel",dial:"silver",strap:[0x1e1b19,.55]},"steel-sport":{size:"big",metal:"steel",dial:"black",strap:[0x161718,.85]},
    "gold-dress":{size:"dress",metal:"gold",dial:"enamel",strap:[0x5a3520,.5]},"gold-big":{size:"big",metal:"gold",dial:"open",strap:[0x3b2316,.5]},
    platinum:{size:"mid",metal:"platinum",dial:"guilloche",strap:[0x1c2536,.5]}},
  metals:{steel:0xc9cfd4,gold:0xdcb466,platinum:0xd8dbde},
  /* base and print colours; hands: style and metal; marks: the applied (or coded) hour markers; rough: the dial's sheen */
  dials:{silver:{base:"#d4d7d9",edge:"#aeb3b7",print:"#2b3036",accent:"#a3262a",hands:"dauphine",hm:"steel",marks:"baton",sun:true,rough:.35,metal:.35},
    black:{base:"#17191c",edge:"#08090a",print:"#e8e6df",accent:"#d9572b",hands:"sword",hm:"steel",marks:"plot",sun:true,rough:.4,metal:.2},
    enamel:{base:"#f2ecdd",edge:"#e2d8c2",print:"#1d1d26",accent:"#2a4c9a",hands:"breguet",hm:"blued",marks:"roman",rough:.12,metal:0},
    open:{base:"#eee5d0",edge:"#d9ccad",print:"#4b3b22",accent:"#9a6a1c",hands:"leaf",hm:"gold",marks:"stud",grain:true,rough:.45,metal:.1},
    guilloche:{base:"#c6cace",edge:"#a3a8ad",print:"#2c3137",accent:"#2a4c9a",hands:"breguet",hm:"blued",marks:"numeral",guil:true,rough:.3,metal:.45}},
  slot:{top:[0,.45],right:[.45,0],bottom:[0,-.45],left:[-.45,0],d430:[.47,-.47]},hourOf:{top:0,right:3,bottom:6,left:9},sub:.25,   // d430: a date window between 4 and 5
  hand:{hour:.55,minute:.86,sec:.92},lift:{hour:.22,minute:.42,sec:.62,chrono:.8,split:.95,sub:.15},   // lengths in dial radii; heights in mm over the dial
  models:{case:{dress:"models/case-dress.glb",mid:"models/case-mid.glb",big:"models/case-big.glb"},
    dial:{silver:"models/dial-silver.glb",black:"models/dial-black.glb",open:"models/dial-open.glb",guilloche:"models/dial-guilloche.glb"},
    cage:"models/tourbillon-cage.glb"},
  cageR:4.55,
  canvas:{lite:512,full:1024,ultra:1024}};

/* ---- the layout: which slot each complication takes, from the build's complications (in order of importance) ---- */
function watchLayout(comps){
  const has=k=>comps.includes(k),L={},free=["bottom","right","left","top","d430"],take=(kind,pref)=>{for(const s of pref)if(free.includes(s)){free.splice(free.indexOf(s),1);L[s]=kind;return s;}return null;};
  if(has("tourbillon"))take("tourb",["bottom"]);
  if(has("moonphase"))take("moon",["bottom","top"]);
  if(has("perp-cal"))take("date31",["right","left"]);
  if(has("chrono")){take("min30",["right","left","top"]);if(!has("tourbillon"))take("sec",["left","bottom"]);}
  /* the perpetual's day and month take what sub-dials are left; on a full dial (a grand complication) they move to windows by 4-5,
     so the chronograph keeps its 30-minute counter */
  if(has("perp-cal")){const day=take("day",["left","right","top"]);if(!day)take("dmwin",["d430"]);else if(!take("month",["top","left","right"]))take("monthwin",["d430"]);}
  if(has("power-reserve"))take("pr",["top","left","right"]);
  if(has("annual-cal"))take("daymonth",["top","bottom"]);
  if(has("date")&&!has("perp-cal"))take("datewin",["right","bottom","left","d430"]);
  return{L,centreSec:!has("chrono")&&!has("tourbillon"),gmt:has("gmt"),chrono:has("chrono"),split:has("split-seconds"),rep:has("repeater")};}

/* ---- today, for the calendar works: day of the week, date, month, the moon's age (days since a new moon) ---- */
function watchToday(){const d=new Date(),y=d.getFullYear(),m=d.getMonth(),dt=d.getDate();
  const syn=29.530588853,age=((Date.UTC(y,m,dt)/864e5-Date.UTC(2000,0,6,18,14)/864e5)%syn+syn)%syn;
  return{dow:d.getDay(),date:dt,month:m,leap:y%4,age,phase:age/syn};}
const W_DAYS=["SUN","MON","TUE","WED","THU","FRI","SAT"],W_MONTHS=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

/* ---- the dial as a canvas: u, v in dial radii (v up is 12 o'clock) ---- */
function dialCanvas(D,lay,spec,S){
  const c=document.createElement("canvas");c.width=c.height=S;const g=c.getContext("2d"),H=S/2;
  const P=(u,v)=>[H+u*H,H-v*H],k=S/1024,today=watchToday();
  const font=(px,w,fam)=>(w||"600")+" "+Math.round(px*k)+"px "+(fam||"'Space Grotesk',system-ui,sans-serif");
  const serif="Georgia,'Times New Roman',serif";
  /* the ground: base colour, a sunburst (light rays from the centre), grain, enamel gloss or the guilloché waves */
  const gr=g.createRadialGradient(H,H,0,H,H,H);gr.addColorStop(0,D.base);gr.addColorStop(.86,D.base);gr.addColorStop(1,D.edge);g.fillStyle=gr;g.fillRect(0,0,S,S);
  if(D.sun){g.save();g.translate(H,H);for(let i=0;i<360;i++){const a=i/360*TAU,l=.5+.5*Math.cos(2*a-.8);g.strokeStyle=l>.5?`rgba(255,255,255,${(l-.5)*.22})`:`rgba(0,0,0,${(.5-l)*.2})`;
      g.lineWidth=H*TAU/360*1.1;g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(a)*H,Math.sin(a)*H);g.stroke();}g.restore();}
  if(D.grain){for(let i=0;i<4000;i++){const x=fHash(i,1,91)*S,y=fHash(i,2,91)*S;g.fillStyle=`rgba(${fHash(i,3,91)>.5?"255,255,255":"60,40,10"},.06)`;g.fillRect(x,y,1.5*k+.5,1.5*k+.5);}}
  if(D.guil){g.save();g.translate(H,H);g.lineWidth=Math.max(1,1.4*k);
    for(let r=.06;r<.8;r+=.017){g.strokeStyle=`rgba(255,255,255,${.12+.1*Math.sin(r*90)})`;g.beginPath();
      for(let i=0;i<=360;i++){const a=i/360*TAU,rr=(r+.008*Math.sin(a*24+r*40))*H;i?g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):g.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.stroke();}
    g.restore();}
  if(D.marks==="roman"){const gl=g.createRadialGradient(H*.7,H*.55,0,H*.7,H*.55,H*.9);gl.addColorStop(0,"rgba(255,255,255,.35)");gl.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=gl;g.fillRect(0,0,S,S);}
  /* the minute track: a railway (enamel, guilloché) or fine ticks with heavier fives */
  g.strokeStyle=D.print;g.fillStyle=D.print;g.save();g.translate(H,H);
  const rail=D.marks==="roman"||D.marks==="numeral",r0=.955*H,r1=.905*H;
  if(rail){g.lineWidth=1.6*k;for(const r of [r0,r1]){g.beginPath();g.arc(0,0,r,0,TAU);g.stroke();}}
  for(let i=0;i<60;i++){const a=i/60*TAU,five=i%5===0,ri=rail?r1:five?.89*H:.92*H;g.lineWidth=(five?3.2:1.4)*k;
    g.beginPath();g.moveTo(Math.sin(a)*ri,-Math.cos(a)*ri);g.lineTo(Math.sin(a)*r0,-Math.cos(a)*r0);g.stroke();}
  /* a 24-hour ring inside the track for the GMT hand */
  if(lay.gmt){g.font=font(22,"600");g.textAlign="center";g.textBaseline="middle";g.fillStyle=D.accent;
    for(let i=1;i<=12;i++){const a=i/12*TAU,r=.78*H;if(Object.keys(lay.L).some(s=>Math.abs((WATCH.hourOf[s]/12*TAU)-a)%TAU<.3))continue;g.fillText(String(i*2),Math.sin(a)*r,-Math.cos(a)*r);}g.fillStyle=D.print;}
  /* printed hour markers: Roman numerals fired into the enamel */
  const used=new Set(Object.keys(lay.L).map(s=>WATCH.hourOf[s]));if(lay.open)used.add(WATCH.hourOf[lay.open]);
  if(D.marks==="roman"){const R=["XII","I","II","III","IIII","V","VI","VII","VIII","IX","X","XI"];g.font=font(76,"400",serif);g.textAlign="center";g.textBaseline="middle";
    for(let h=0;h<12;h++){if(used.has(h))continue;const a=h/12*TAU,r=.74*H;g.save();g.translate(Math.sin(a)*r,-Math.cos(a)*r);g.rotate(h>3&&h<9?a+Math.PI:a);g.scale(h===0||h===8?.8:1,1);g.fillText(R[h],0,0);g.restore();}}
  g.restore();
  /* the name, a line under it, and the foot */
  g.textAlign="center";g.textBaseline="middle";g.fillStyle=D.print;
  const topFree=!lay.L.top&&lay.open!=="top",botFree=!lay.L.bottom;
  const ty=topFree?.42:.1,my=topFree?.3:-.02;
  g.font=font(46,"700");g.fillText(spec.top||"HALDIS",...P(0,!topFree&&!botFree?.16:ty));
  if(spec.mid){g.font=font(24,"500");g.fillStyle=D.accent;g.fillText(spec.mid.toUpperCase(),...P(0,!topFree&&!botFree?.06:my));g.fillStyle=D.print;}
  if(spec.foot){g.font=font(17,"500");g.fillText(spec.foot.toUpperCase(),...P(0,botFree?-.8:-.86));}
  if(lay.rep&&botFree){g.font=font(20,"500",serif);g.fillText("Répétition minutes",...P(0,-.4));}
  /* the slots */
  const ring=(u,v,r,fill)=>{const [x,y]=P(u,v);const sg=g.createRadialGradient(x,y,r*H*.7,x,y,r*H);sg.addColorStop(0,"rgba(0,0,0,0)");sg.addColorStop(1,"rgba(0,0,0,.18)");
    if(fill){g.fillStyle=fill;g.beginPath();g.arc(x,y,r*H,0,TAU);g.fill();}
    for(let q=r*.96;q>.02;q-=.012){g.strokeStyle=`rgba(${D.base==="#17191c"?"255,255,255":"0,0,0"},.06)`;g.lineWidth=1*k;g.beginPath();g.arc(x,y,q*H,0,TAU);g.stroke();}   // azurage: fine circular grooves
    g.fillStyle=sg;g.beginPath();g.arc(x,y,r*H,0,TAU);g.fill();g.strokeStyle=D.print;g.lineWidth=1.6*k;g.beginPath();g.arc(x,y,r*H,0,TAU);g.stroke();return[x,y];};
  const ticks=(x,y,r,n,major,from,to,labels)=>{from=from==null?0:from;to=to==null?TAU:to;g.strokeStyle=D.print;
    for(let i=0;i<=n;i++){if(to-from>=TAU-1e-6&&i===n)break;const a=from+(to-from)*i/n,mj=i%major===0;g.lineWidth=(mj?2.2:1.1)*k;const r1=r*H*(mj?.78:.86);
      g.beginPath();g.moveTo(x+Math.sin(a)*r1,y-Math.cos(a)*r1);g.lineTo(x+Math.sin(a)*r*H*.95,y-Math.cos(a)*r*H*.95);g.stroke();}
    if(labels){g.font=font(15,"600");g.fillStyle=D.print;labels.forEach(([t,a])=>{g.fillText(t,x+Math.sin(a)*r*H*.58,y-Math.cos(a)*r*H*.58);});}};
  const win=(x,y,w,h,txt)=>{g.fillStyle=D.print;g.fillRect(x-w/2-2*k,y-h/2-2*k,w+4*k,h+4*k);g.fillStyle="#f6f4ee";g.fillRect(x-w/2,y-h/2,w,h);
    g.fillStyle="#16161a";g.font=font(h*.78/k,"700");g.fillText(txt,x,y+h*.04);};
  const r=WATCH.sub;
  for(const s in lay.L){const kind=lay.L[s],[u,v]=WATCH.slot[s];
    if(kind==="sec"){const [x,y]=ring(u,v,r);ticks(x,y,r,60,5,0,TAU,[["60",0],["20",TAU/3],["40",TAU*2/3]]);}
    else if(kind==="min30"){const [x,y]=ring(u,v,r);ticks(x,y,r,30,5,0,TAU,[["30",0],["10",TAU/3],["20",TAU*2/3]]);}
    else if(kind==="pr"){const [x,y]=P(u,v),a0=-1.1,a1=1.1;g.strokeStyle=D.print;g.lineWidth=2*k;g.beginPath();g.arc(x,y,r*H*.9,a0-Math.PI/2,a1-Math.PI/2);g.stroke();
      ticks(x,y,r,8,4,a0,a1);g.font=font(14,"600");g.fillText("0",x+Math.sin(a0)*r*H*.55,y-Math.cos(a0)*r*H*.55);g.fillText("FULL",x+Math.sin(a1)*r*H*.5,y-Math.cos(a1)*r*H*.5);
      g.font=font(13,"500");g.fillText("RESERVE",x,y+r*H*.35);}
    else if(kind==="day"){const [x,y]=ring(u,v,r);ticks(x,y,r,7,1,0,TAU,W_DAYS.map((d,i)=>[d,i/7*TAU]));}
    else if(kind==="date31"){const [x,y]=ring(u,v,r);ticks(x,y,r,31,5,0,TAU,[["31",0],["10",10/31*TAU],["20",20/31*TAU]]);}
    else if(kind==="month"){const [x,y]=ring(u,v,r);ticks(x,y,r,12,3,0,TAU,[["JAN",0],["APR",TAU/4],["JUL",TAU/2],["OCT",TAU*3/4]]);
      g.fillStyle=D.accent;for(let i=0;i<4;i++){const a=i/4*TAU+TAU/8,q=r*H*.25;g.beginPath();g.arc(x+Math.sin(a)*q,y-Math.cos(a)*q,(i===today.leap?3.2:1.6)*k,0,TAU);g.fill();}g.fillStyle=D.print;}
    else if(kind==="moon"){const [x,y]=P(u,v),R=r*H*1.05,sky="#16285a";
      /* the aperture: the top half of a circle; the moon disc turns behind it, two moons on it, half a turn a lunation */
      g.save();g.beginPath();g.arc(x,y+R*.25,R,Math.PI,0);g.closePath();g.clip();g.fillStyle=sky;g.fillRect(x-R,y-R,2*R,2*R);
      g.fillStyle="#f4e9b0";for(let i=0;i<14;i++){g.fillRect(x+(fHash(i,1,5)-.5)*2*R,y+R*.25-fHash(i,2,5)*R,2*k,2*k);}
      const a=today.phase*TAU/2,mr=R*.36;for(const off of [0,Math.PI]){const q=a+off-Math.PI/2,mx=x+Math.cos(q+Math.PI)*R*.6,my=y+R*.25+Math.sin(q+Math.PI)*R*.6;
        const mg=g.createRadialGradient(mx-mr*.3,my-mr*.3,1,mx,my,mr);mg.addColorStop(0,"#fff3c0");mg.addColorStop(1,"#d9b55a");g.fillStyle=mg;g.beginPath();g.arc(mx,my,mr,0,TAU);g.fill();}
      g.restore();
      /* the two humps either side that hide the waxing and waning moon */
      g.fillStyle=D.base;for(const sx of [-1,1]){g.beginPath();g.arc(x+sx*R*.62,y+R*.25,R*.42,Math.PI,0);g.fill();}
      g.strokeStyle=D.print;g.lineWidth=1.6*k;g.beginPath();g.arc(x,y+R*.25,R,Math.PI,0);g.stroke();
      g.font=font(13,"500");g.fillText("PHASE DE LUNE",x,y+R*.48);}
    else if(kind==="dmwin"){const [x,y]=P(u,v);win(x,y-21*k,62*k,34*k,W_DAYS[today.dow]);win(x,y+21*k,62*k,34*k,W_MONTHS[today.month]);}
    else if(kind==="monthwin"){const [x,y]=P(u,v);win(x,y,62*k,34*k,W_MONTHS[today.month]);}
    else if(kind==="datewin"){const f=s==="d430"?1:1.18,[x,y]=P(u*f,v*f);win(x,y,52*k,40*k,String(today.date));}
    else if(kind==="daymonth"){const [x,y]=P(u,v);win(x-36*k,y,62*k,34*k,W_DAYS[today.dow]);win(x+36*k,y,62*k,34*k,W_MONTHS[today.month]);}
    else if(kind==="tourb"){const [x,y]=P(u,v);g.strokeStyle=D.print;g.lineWidth=2.4*k;g.beginPath();g.arc(x,y,r*H*1.08,0,TAU);g.stroke();
      g.font=font(13,"600");g.fillText("TOURBILLON",x,y-r*H*1.22);}}
  /* the open heart's ring */
  if(lay.open){const [x,y]=P(...WATCH.slot[lay.open]);g.strokeStyle=D.print;g.lineWidth=2.4*k;g.beginPath();g.arc(x,y,r*H*.92,0,TAU);g.stroke();}
  return c;}
/* the guilloché's relief for Full / Ultra: the same waves as a normal map */
function guilNormal(S){const c=document.createElement("canvas");c.width=c.height=S;const g=c.getContext("2d"),img=g.createImageData(S,S),d=img.data,H=S/2;
  const ht=(x,y)=>{const u=(x-H)/H,v=(y-H)/H,r=Math.hypot(u,v),a=Math.atan2(v,u);if(r>.8)return 0;const rr=r-.008*Math.sin(a*24+r*40);return .5+.5*Math.cos(rr/.017*TAU);};
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){const du=(ht(x+1,y)-ht(x-1,y))*.9,dv=(ht(x,y+1)-ht(x,y-1))*.9,l=Math.hypot(du,dv,1),i=(y*S+x)*4;
    d[i]=Math.round((-du/l*.5+.5)*255);d[i+1]=Math.round((dv/l*.5+.5)*255);d[i+2]=Math.round(255/l);d[i+3]=255;}
  g.putImageData(img,0,0);return c;}

/* ---- the watch's materials (disposed with it) ---- */
function watchMats(W){
  const own=[],texs=[],lite=V.tier==="lite",D=WATCH.dials[W.dial];
  const metal=o=>{const m=metalMat(o);own.push(m);return m;};
  const flat=(c,rough,o)=>{o=o||{};const m=lite?new THREE.MeshLambertMaterial({color:sRGB(c)}):new THREE.MeshStandardMaterial({color:sRGB(c),roughness:rough,metalness:o.metal||0,envMap:fullEnv(),envMapIntensity:o.env==null?.5:o.env});own.push(m);return m;};
  const mc=WATCH.metals[W.metal];
  const M={case:metal({c:mc,r:.28}),polish:metal({c:mc,r:.06}),
    hand:D.hm==="blued"?metal({c:0x2a4c9a,r:.2,coat:.6,lite:1.25}):D.hm==="gold"?metal({c:0xe2bd6a,r:.1}):metal({c:0xdfe3e6,r:.05}),
    applied:W.dial==="open"?metal({c:0xe2bd6a,r:.1}):metal({c:0xe4e7ea,r:.06}),
    lume:flat(0xe7ecd8,.6,{env:.2}),red:flat(D.hm==="steel"&&W.dial==="black"?0xd9572b:0xb8322a,.4),
    rehaut:flat(new THREE.Color(D.base).getHex(),.5),floor:metal({c:0x8a8f94,r:.4}),
    cage:metal({c:0xd6dce0,r:.06}),gilt:V.mats.gilt,ruby:V.mats.ruby,dark:flat(0x1a1b1e,.5)};
  const glassM=lite?new THREE.MeshBasicMaterial({color:0xdfeaf2,transparent:true,opacity:.1,depthWrite:false,envMap:liteEnvs()[0],combine:THREE.MixOperation,reflectivity:.35}):
    new THREE.MeshStandardMaterial({color:0xffffff,roughness:.03,metalness:0,transparent:true,opacity:.14,depthWrite:false,envMap:fullEnv(),envMapIntensity:1.6});
  own.push(glassM);M.crystal=glassM;
  /* the dial: a canvas, lit like paint on Lite, a slightly metallic satin on Full / Ultra */
  const S=WATCH.canvas[V.tier]||512,tex=new THREE.CanvasTexture(dialCanvas(D,W.lay,W.spec,S));tex.encoding=THREE.sRGBEncoding;
  tex.anisotropy=lite?1:Math.min(4,V.r.capabilities.getMaxAnisotropy());texs.push(tex);
  if(lite)M.dial=new THREE.MeshLambertMaterial({map:tex});
  else{M.dial=new THREE.MeshStandardMaterial({map:tex,roughness:D.rough,metalness:D.metal,envMap:fullEnv(),envMapIntensity:.7});
    if(D.guil){const n=new THREE.CanvasTexture(guilNormal(512));texs.push(n);M.dial.normalMap=n;M.dial.normalScale.set(.6,.6);}}
  own.push(M.dial);M.own=own;M.texs=texs;return M;}

/* ---- shapes for the hands, pointing up the shape's +y from the arbor at (0, 0); L the length, w the width (mm) ---- */
function handShapes(style,L,w){
  const S=[],sh=()=>{const s=new THREE.Shape();S.push(s);return s;};
  if(style==="dauphine"){const s=sh();s.moveTo(0,-.12*L);s.lineTo(w/2,0);s.lineTo(w*.12,L*.97);s.lineTo(0,L);s.lineTo(-w*.12,L*.97);s.lineTo(-w/2,0);s.closePath();}
  else if(style==="sword"){const s=sh();s.moveTo(-w*.35,-.14*L);s.lineTo(w*.35,-.14*L);s.lineTo(w/2,.12*L);s.lineTo(w/2,.82*L);s.lineTo(0,L);s.lineTo(-w/2,.82*L);s.lineTo(-w/2,.12*L);s.closePath();}
  else if(style==="leaf"){const s=sh();s.moveTo(0,-.1*L);s.quadraticCurveTo(w*.9,.45*L,0,L);s.quadraticCurveTo(-w*.9,.45*L,0,-.1*L);}
  else{   /* Breguet: a fine shaft, an open moon near the tip, then a short point */
    const sw=Math.max(.32,w*.3),ry=.72*L,ro=w*.62,ri=w*.38;
    const a=sh();a.moveTo(-sw/2,-.16*L);a.lineTo(sw/2,-.16*L);a.lineTo(sw/2,ry-ro*.92);a.lineTo(-sw/2,ry-ro*.92);a.closePath();
    const m=sh();m.absarc(0,ry,ro,0,TAU,false);const hole=new THREE.Path();hole.absarc(0,ry+ro*.12,ri,0,TAU,true);m.holes.push(hole);
    const t=sh();t.moveTo(-sw*.9,ry+ro*.85);t.lineTo(sw*.9,ry+ro*.85);t.lineTo(0,L);t.closePath();}
  return S;}
/* the lume insert of a sword hand */
function lumeShape(L,w){const s=new THREE.Shape();s.moveTo(-w*.3,.16*L);s.lineTo(w*.3,.16*L);s.lineTo(w*.3,.8*L);s.lineTo(0,.93*L);s.lineTo(-w*.3,.8*L);s.closePath();return s;}
/* a slim seconds or chronograph hand with a counterweight */
function needleShapes(L,w,tail){const s=new THREE.Shape();s.moveTo(-w/2,-tail);s.lineTo(w/2,-tail);s.lineTo(w*.3,L);s.lineTo(-w*.3,L);s.closePath();
  const c=new THREE.Shape();c.absarc(0,-tail*.8,Math.max(.45,w*2.2),0,TAU,false);return[s,c];}

/* ---- the watch ---- */
function buildWatch(spec){
  spec=spec||{};const caseId=WATCH.cases[spec.caseId]?spec.caseId:"steel-dress",W=Object.assign({},WATCH.cases[caseId]),C=CASE_GEO[W.size],lite=V.tier==="lite";
  W.spec=spec;W.lay=watchLayout(spec.comps||[]);
  if(W.dial==="open"){const s=["left","right","top"].find(k=>!W.lay.L[k]);W.lay.open=s||null;}
  const M=watchMats(W),root=new THREE.Group(),G=new THREE.Group(),seg=lite?40:72;
  root.add(G);G.scale.setScalar(WATCH.mm);root.position.y=ROOM.top+.5;   // on the movement holder
  const stands={case:[],marks:[],cage:[]},anim={hands:{},subs:[],M,W,stands,G};
  const add=(m,into,stand)=>{(into||G).add(m);if(stand)stands[stand].push(m);return m;};
  const lathe=(pts,mat,s)=>new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r,z])=>new THREE.Vector2(r,z)),s||seg),mat);
  /* the case, coded (the stand-in for case-<size>.glb): the same profiles as the Blender script */
  { const {R,b,m,top,ct,dz,dr,bi}=C,cz0=top-.6;
    add(lathe([[dr+.3,b],[R-1,b],[R-.35,b+.2],[R-.05,b+.7],[R,b+1.2],[R,m-1.2],[R-.05,m-.7],[R-.35,m-.2],[R-1,m],[bi+.3,m],[bi+.3,dz-.2],[dr+.3,dz-.2],[dr+.3,b]],M.case),null,"case");
    const bz=C.style==="dress"?[[bi,m],[R-1,m],[R-.7,m+.25],[bi+.9,top-.05],[bi+.35,top],[bi,top-.2],[bi,m]]:
      C.style==="mid"?[[bi,m],[R-1,m],[R-.75,m+.45],[R-.9,m+.7],[R-2,m+.75],[bi+.6,top-.05],[bi+.2,top],[bi,top-.2],[bi,m]]:
      [[bi,m],[R-.6,m],[R-.2,m+.4],[R-.3,top-.35],[R-.7,top],[bi+.5,top],[bi,top-.3],[bi,m]];
    add(lathe(bz,M.polish),null,"case");
    add(lathe([[0,-.2],[R-4.5,-.2],[R-3.2,0],[R-1.4,.15],[R-1,b],[0,b]],M.case,lite?24:48),null,"case");
    add(lathe([[dr-.1,dz],[bi-.05,cz0],[bi+.25,cz0],[bi+.25,dz-.1],[dr-.1,dz]],M.rehaut),null,"case");
    /* lugs: the side profile extruded across the lug's thickness */
    const half=C.l2l/2,y0=R*.72,prof=[];
    if(C.style==="big")prof.push([y0,b*.6],[half-1.2,b*.7],[half,b*.7+1],[half,m-2.6],[half-2,m-1.2],[y0,m-.2]);
    else{for(let i=0;i<=10;i++){const t=i/10;prof.push([y0+(half-1-y0)*t,(m-.3)-(m-.3-(b+1.6))*Math.pow(t,1.6)]);}
      prof.push([half-.2,b+1.4],[half,b+.6],[half-.13,b+.1],[half-.5,b-.27],[half-1.6,b*.55],[y0,b*.55]);}
    const lugShape=new THREE.Shape();prof.forEach(([s,h],i)=>i?lugShape.lineTo(s,h):lugShape.moveTo(s,h));lugShape.closePath();
    const lugG=new THREE.ExtrudeGeometry(lugShape,{depth:C.lt,bevelEnabled:true,bevelSize:.3,bevelThickness:.3,bevelSegments:lite?1:2,curveSegments:4});
    for(const sx of [-1,1])for(const sz of [-1,1]){const l=new THREE.Mesh(lugG,M.case);l.rotation.y=sz>0?-Math.PI/2:Math.PI/2;
      l.position.x=sz>0?(sx>0?C.lw/2+C.lt:-C.lw/2):(sx>0?C.lw/2:-C.lw/2-C.lt);add(l,null,"case");}
    if(C.style==="big")for(const s of [-1,1]){const gd=new THREE.Mesh(new THREE.BoxGeometry(2.6,m-b-1.6,3),M.case);gd.position.set(R+.6,(b+m)/2,s*(C.cr+2.1));add(gd,null,"case");}
    /* the crown and its tube */
    const cw=new THREE.Mesh(new THREE.CylinderGeometry(C.cr,C.cr,C.cl,lite?14:24),M.polish);cw.rotation.z=Math.PI/2;cw.position.set(R+.9+C.cl/2,(b+m)/2,0);add(cw,null,"case");
    const tb=new THREE.Mesh(new THREE.CylinderGeometry(C.cr*.45,C.cr*.45,1.4,10),M.polish);tb.rotation.z=Math.PI/2;tb.position.set(R+.3,(b+m)/2,0);add(tb,null,"case");
    add(lathe([[0,ct],[bi*.55,ct-.12],[bi*.85,ct-.35],[bi-.15,ct-.75],[bi,cz0+.1],[bi,cz0],[0,cz0]],M.crystal,lite?32:64),null,"case").renderOrder=2; }
  /* the strap: a side profile (out from the spring bar between the lugs, bending down to the mat) extruded across the lug gap */
  { const {b,lw}=C,half=C.l2l/2,t=1.3,floor=-(.5-.06)/WATCH.mm,path=[];
    for(let i=0;i<=14;i++){const q=i/14,s=half-2.4+q*44,bend=Math.min(1,Math.max(0,(s-half)/9));
      path.push([s,(b+.9)-(b+.9-floor)*bend*bend*(3-2*bend)]);}
    const sh=new THREE.Shape();path.forEach(([x,y],i)=>i?sh.lineTo(x,y):sh.moveTo(x,y));for(let i=path.length-1;i>=0;i--)sh.lineTo(path[i][0],path[i][1]+t);sh.closePath();
    const sm=lite?new THREE.MeshLambertMaterial({color:sRGB(W.strap[0])}):new THREE.MeshStandardMaterial({color:sRGB(W.strap[0]),roughness:W.strap[1],metalness:0,envMap:fullEnv(),envMapIntensity:.35});M.own.push(sm);
    const sg=new THREE.ExtrudeGeometry(sh,{depth:lw-.4,bevelEnabled:!lite,bevelSize:.25,bevelThickness:.25,bevelSegments:1,curveSegments:4});
    for(const sz of [-1,1]){const st=new THREE.Mesh(sg,sm);st.rotation.y=sz>0?-Math.PI/2:Math.PI/2;st.position.x=sz>0?lw/2-.2:-(lw/2-.2);G.add(st);}
    /* the spring bars the straps hang on */
    for(const sz of [-1,1]){const sb=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,lw+.4,8),M.case);sb.rotation.z=Math.PI/2;sb.position.set(0,b+1.5,sz*(half-2.4));G.add(sb);} }
  /* what the build adds to the case: chronograph pushers at 2 and 4, a split-seconds button at 10, the repeater's slide */
  { const {R,b,m}=C,y=(b+m)/2;
    const push=(clock,len)=>{const a=clock/12*TAU,p=new THREE.Group(),s=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,len,lite?10:18),M.polish);
      s.rotation.z=Math.PI/2;s.position.x=R+len/2-.2;p.add(s);const t=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.3,1.1,lite?10:18),M.polish);t.rotation.z=Math.PI/2;t.position.x=R+len+.3;p.add(t);
      p.position.y=y;p.rotation.y=-(a-Math.PI/2);G.add(p);};
    if(W.lay.chrono){push(2,2.2);push(4,2.2);}
    if(W.lay.split)push(10,2);
    if(W.lay.rep){const sl=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.4,11),M.polish);sl.position.set(-R-.2,y,1.5);G.add(sl);} }
  /* the dial: a disc (with holes for the tourbillon aperture and the open heart) wearing the canvas */
  const {dz,dr}=C,sub=WATCH.sub*dr,holes=[];
  for(const s in W.lay.L)if(W.lay.L[s]==="tourb")holes.push([s,sub*1.05]);
  if(W.lay.open)holes.push([W.lay.open,sub*.92]);
  { const sh=new THREE.Shape();sh.absarc(0,0,dr,0,TAU,false);
    for(const [s,r] of holes){const [u,v]=WATCH.slot[s],p=new THREE.Path();p.absarc(u*dr,v*dr,r,0,TAU,true);sh.holes.push(p);}
    const g=new THREE.ShapeGeometry(sh,lite?48:96),uv=g.attributes.uv,pos=g.attributes.position;
    for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i)/dr*.5+.5,pos.getY(i)/dr*.5+.5);
    const d=new THREE.Mesh(g,M.dial);d.rotation.x=-Math.PI/2;d.position.y=dz;G.add(d); }
  /* under each hole: a recess, and what turns in it (the tourbillon cage, or the open heart's balance) */
  for(const [s,r] of holes){const [u,v]=WATCH.slot[s],x=u*dr,z=-v*dr,deep=1.6,kind=W.lay.L[s]==="tourb"?"tourb":"open";
    const floor=new THREE.Mesh(new THREE.CircleGeometry(r*1.02,lite?24:48),M.floor);floor.rotation.x=-Math.PI/2;floor.position.set(x,dz-deep,z);G.add(floor);
    const wall=new THREE.Mesh(new THREE.CylinderGeometry(r,r,deep,lite?24:48,1,true),M.dark);wall.material.side=THREE.BackSide;wall.position.set(x,dz-deep/2,z);G.add(wall);
    const holder=new THREE.Group();holder.position.set(x,dz-deep+.05,z);G.add(holder);
    const bal=new THREE.Group(),br=r*(kind==="tourb"?.55:.62);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(br,.22,lite?6:10,lite?28:56),M.gilt);rim.rotation.x=Math.PI/2;bal.add(rim);
    for(let i=0;i<3;i++){const am=new THREE.Mesh(new THREE.BoxGeometry(br,.14,.26),M.gilt);am.position.set(Math.cos(i*TAU/3)*br/2,0,Math.sin(i*TAU/3)*br/2);am.rotation.y=-i*TAU/3;bal.add(am);}
    bal.add(new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.8,10),M.cage));
    bal.position.y=.7;
    if(kind==="tourb"){const cage=new THREE.Group();holder.add(cage);cage.add(bal);
      const sc=r/WATCH.cageR*.92;cage.userData.sc=sc;
      /* the coded cage: two rings and three pillars (Full / Ultra swap in the model) */
      const ringG=new THREE.TorusGeometry(r*.88,.16,lite?6:8,lite?32:64);
      for(const yy of [.1,1.5]){const rg=new THREE.Mesh(ringG,M.cage);rg.rotation.x=Math.PI/2;rg.position.y=yy;add(rg,cage,"cage");}
      for(let i=0;i<3;i++){const a=i*TAU/3,p=new THREE.Mesh(new THREE.BoxGeometry(.4,1.4,.4),M.cage);p.position.set(Math.cos(a)*r*.86,.8,Math.sin(a)*r*.86);add(p,cage,"cage");
        const arm=new THREE.Mesh(new THREE.BoxGeometry(r*.86,.18,.5),M.cage);arm.position.set(Math.cos(a)*r*.43,1.5,Math.sin(a)*r*.43);arm.rotation.y=-a;add(arm,cage,"cage");}
      anim.cage=cage;}
    else{holder.add(bal);const bar=new THREE.Mesh(new THREE.BoxGeometry(r*2.1,.3,1.3),M.floor);bar.position.y=1.25;bar.rotation.y=.5;holder.add(bar);
      const j=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.2,10),M.ruby||M.red);j.position.y=1.45;holder.add(j);}
    anim.bal=anim.bal||[];anim.bal.push(bal);}
  /* the hour markers, coded (the stand-ins for dial-<design>.glb; the enamel's numerals are printed) */
  const used=new Set(Object.keys(W.lay.L).map(s=>WATCH.hourOf[s]));if(W.lay.open)used.add(WATCH.hourOf[W.lay.open]);
  anim.used=used;
  const D=WATCH.dials[W.dial],ks=dr/WATCH.dialR,mark=(h,mesh)=>{mesh.userData.h=h;const a=h/12*TAU,g=new THREE.Group();g.add(mesh);g.rotation.y=-a;g.position.y=dz;g.visible=!used.has(h);add(g,null,"marks");};
  if(D.marks!=="roman")for(let h=0;h<12;h++){
    const big=h%3===0;let me;
    if(D.marks==="plot"&&!big){me=new THREE.Mesh(new THREE.CylinderGeometry(1.05*ks,1.05*ks,.5,lite?12:20),M.lume);me.position.set(0,.25,-(WATCH.dialR-3.4)*ks);}
    else if(D.marks==="plot"&&h===0){me=new THREE.Mesh(new THREE.CylinderGeometry(1.75*ks,1.75*ks,.5,3),M.lume);me.rotation.y=Math.PI/2;me.position.set(0,.25,-(WATCH.dialR-3.4)*ks);}
    else if(D.marks==="stud"&&h){me=new THREE.Mesh(new THREE.SphereGeometry((big?1.05:.85)*ks,lite?10:16,lite?6:10),M.applied);me.scale.y=.45;me.position.set(0,0,-(WATCH.dialR-3.4)*ks);}
    else{const L=(big?3.4:2.6)*ks,w=(D.marks==="plot"?1.7:h===0?2.2:.95)*ks,r=(D.marks==="plot"?WATCH.dialR-3.4:WATCH.dialR-2.6-L/ks/2)*ks;
      me=new THREE.Mesh(new THREE.BoxGeometry(w,.45,D.marks==="plot"?4*ks:L),D.marks==="plot"?M.lume:M.applied);me.position.set(0,.22,-r);}
    mark(h,me);}
  /* the hands */
  const lift=WATCH.lift,HD=WATCH.hand,ext=(shapes,t,mat)=>{const gg=new THREE.Group();for(const s of shapes){const m=new THREE.Mesh(new THREE.ExtrudeGeometry(s,{depth:t,bevelEnabled:false,curveSegments:lite?6:12}),mat);m.rotation.x=-Math.PI/2;gg.add(m);}return gg;};
  const hand=(key,shapes,mat,y,extra)=>{const pv=new THREE.Group();pv.position.y=dz+y;pv.add(ext(shapes,.12,mat));if(extra)pv.add(extra);G.add(pv);anim.hands[key]=pv;return pv;};
  const hw=D.hands==="dauphine"?2.0:D.hands==="sword"?1.9:D.hands==="leaf"?1.8:1.9;
  hand("h",handShapes(D.hands,HD.hour*dr,hw*1.08),M.hand,lift.hour,D.hands==="sword"?(()=>{const l=ext([lumeShape(HD.hour*dr,hw*1.08)],.14,M.lume);return l;})():null);
  hand("m",handShapes(D.hands,HD.minute*dr,hw*.86),M.hand,lift.minute,D.hands==="sword"?ext([lumeShape(HD.minute*dr,hw*.86)],.14,M.lume):null);
  if(W.lay.centreSec)hand("s",needleShapes(HD.sec*dr,.32,dr*.2),D.hands==="sword"?M.red:M.hand,lift.sec);
  if(W.lay.chrono)hand("c",needleShapes(HD.sec*dr,.3,dr*.18),M.red,lift.chrono);
  if(W.lay.split)hand("split",needleShapes(HD.sec*dr*.97,.28,dr*.16),M.hand,lift.split);
  if(W.lay.gmt){const sh=new THREE.Shape(),L=HD.minute*dr*.95;sh.moveTo(-.2,-.1*L);sh.lineTo(.2,-.1*L);sh.lineTo(.2,L*.86);sh.lineTo(1.1,L*.86);sh.lineTo(0,L);sh.lineTo(-1.1,L*.86);sh.lineTo(-.2,L*.86);sh.closePath();
    hand("gmt",[sh],M.red,(lift.hour+lift.minute)/2-.1);}
  { const cap=new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,.3,lite?10:18),M.hand);cap.position.y=dz+lift.split+.3;G.add(cap); }
  /* sub-dial hands */
  for(const s in W.lay.L){const kind=W.lay.L[s];if(!["sec","min30","pr","day","date31","month"].includes(kind))continue;
    const [u,v]=WATCH.slot[s],L=WATCH.sub*dr*.86,pv=new THREE.Group();pv.position.set(u*dr,dz+lift.sub,-v*dr);
    pv.add(ext(kind==="sec"||kind==="min30"?needleShapes(L,.26,L*.2):handShapes("leaf",L,.9),.1,kind==="min30"?M.red:M.hand));
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.2,10),M.hand);cap.position.y=.12;pv.add(cap);
    G.add(pv);anim.subs.push({kind,g:pv});}
  if(!lite)root.traverse(o=>{if(o.isMesh&&o.material!==M.crystal){o.castShadow=true;o.receiveShadow=true;}});
  anim.t0=performance.now();anim.halfL=C.l2l/2*WATCH.mm;anim.halfW=(C.R+C.cl+1.2)*WATCH.mm;anim.h=C.ct*WATCH.mm;
  root.userData=anim;
  return root;}

/* ---- the models (Full / Ultra): the case, the dial's markers, the tourbillon cage. Materials are swapped by name ---- */
function watchModels(root){
  if(V.tier==="lite")return;
  if(!THREE.GLTFLoader){if(window.__escPost)window.__escPost(ok=>{if(ok&&THREE.GLTFLoader&&V.watch===root)watchModels(root);});return;}
  if(!V.models)V.models={};
  const u=root.userData,W=u.W,C=CASE_GEO[W.size],M=u.M,G=u.G;
  const swap=(o,map)=>o.traverse(q=>{if(!q.isMesh)return;const n=(q.material&&q.material.name)||"";const m=map[n];if(m)q.material=m;q.castShadow=q.receiveShadow=true;
    if(m===M.crystal){q.castShadow=false;q.renderOrder=2;}});
  const live=()=>V.watch===root;
  modelGet(WATCH.models.case[W.size],src=>{if(!live())return;const o=src.clone();o.scale.setScalar(1000);swap(o,{metal:M.case,polish:M.polish,crystal:M.crystal,rehaut:M.rehaut});
    G.add(o);for(const s of u.stands.case)s.visible=false;});
  const df=WATCH.models.dial[W.dial];
  if(df)modelGet(df,src=>{if(!live())return;const o=src.clone(),k=C.dr/WATCH.dialR;o.scale.setScalar(1000*k);o.position.y=C.dz;
    swap(o,{applied:M.applied,lume:M.lume});
    o.traverse(q=>{const m=/^h(\d+)$/.exec(q.name||"");if(m&&u.used.has(+m[1]))q.visible=false;});
    G.add(o);for(const s of u.stands.marks)s.visible=false;});
  if(u.cage)modelGet(WATCH.models.cage,src=>{if(!live())return;const o=src.clone();o.scale.setScalar(1000*u.cage.userData.sc);
    swap(o,{cage:M.cage,ruby:M.ruby,gilt:M.gilt});u.cage.add(o);for(const s of u.stands.cage)s.visible=false;});}
/* drop the watch: its own geometry and materials go, the models' shared geometry stays */
function dropWatch(){const g=V.watch;if(!g)return;V.scene.remove(g);
  g.traverse(o=>{if(o.geometry&&!o.geometry.userData.keep)o.geometry.dispose();});
  const M=g.userData.M;if(M){M.own.forEach(m=>m.dispose());M.texs.forEach(t=>t.dispose());}V.watch=null;}
/* show the watch (the Dial side view) or the movement, building the watch the first time it is needed */
function watchShow(){const on=V.view==="dial";
  if(on&&!V.watch){V.watch=buildWatch(V.watchSpec);V.scene.add(V.watch);watchModels(V.watch);}
  if(V.watch)V.watch.visible=on;if(V.move)V.move.visible=!on;}
function rebuildWatch(){const was=!!V.watch;dropWatch();if(was||V.view==="dial")watchShow();}

/* ---- motion: the real time, the seconds hand stepping at the beat rate, the chronograph running ---- */
function animateWatch(u,t){
  const R=V.run,bps=Math.max(1,R.bph/3600),now=Date.now();
  if(!R.wound){if(u.frozen==null)u.frozen=now;}else u.frozen=null;
  const at=new Date(u.frozen||now),ms=at.getSeconds()*1000+at.getMilliseconds(),sec=Math.floor(ms/1000*bps)/bps;
  const mins=at.getMinutes()+sec/60,hrs=at.getHours()%12+mins/60,H=u.hands;
  if(H.h)H.h.rotation.y=-hrs/12*TAU;
  if(H.m)H.m.rotation.y=-mins/60*TAU;
  if(H.s)H.s.rotation.y=-sec/60*TAU;
  if(H.gmt)H.gmt.rotation.y=-(at.getHours()+mins/60)/24*TAU;
  const cs=R.wound?Math.floor(t*bps)/bps:0;   // the chronograph runs from when the watch was built
  if(H.c)H.c.rotation.y=-cs/60*TAU;
  /* the split hand rides with it, stops for a lap now and then, and catches up */
  if(H.split){const p=cs%20,lap=p>=10&&p<15?cs-(p-10):cs;H.split.rotation.y=-lap/60*TAU;}
  const d=watchToday();
  for(const s of u.subs){let a=0;
    if(s.kind==="sec")a=sec/60;else if(s.kind==="min30")a=(cs/60%30)/30;else if(s.kind==="pr")a=(-1.1+2.2*.78)/TAU;
    else if(s.kind==="day")a=d.dow/7;else if(s.kind==="date31")a=(d.date%31)/31;else if(s.kind==="month")a=d.month/12;
    s.g.rotation.y=-a*TAU;}
  if(u.cage)u.cage.rotation.y=-t*TAU/60;
  if(u.bal){const amp=R.wound?R.amp*Math.PI/180:0,ph=TAU*R.bph/7200*t;for(const b of u.bal)b.rotation.y=amp*Math.sin(ph);}}
