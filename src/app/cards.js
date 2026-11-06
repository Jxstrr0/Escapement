/* ===================== app/cards.js: certificate and trophy cards (PR 8) =====================
   Every Chronometer (BCH) or Observatory pass gets a certificate card, and every goal reached a trophy card. Both are
   drawn to a 1080 × 1350 canvas, shown in a sheet as a picture, and saved or shared through shareCanvas (app/share.js).
   - The log: S.career.certsLog (inside esc-save, no new key), the last CD.max passes, one row each: the piece (pid, no,
     name), its calibre (cal) and movement line (mv), tier, year / week (y, w), the key numbers (st) and the trial's checks
     as runTrial reported them (ck: [k, val, lim, ok]), and sn, the career's running count for that grade. certLog() is
     called from closeWeek step 3 (app/business.js) when a pass comes back; normCertsLog() cleans it on load. A piece
     loses its trial when it is cased and sold, so the log is what keeps the paperwork. Older saves start with none.
   - The certificate: cream paper, the issuing body (Haldis Chronometry Bureau or Kessel Peak Observatory), the piece,
     its calibre and movement, the four key numbers (mean daily rate, greatest day-to-day change, spread between
     positions, temperature), every check with its limit and tick, the date as year and week, and a round inked stamp.
   - The trophy: dark felt and brass, a medal cut like an escape wheel on a ribbon, the goal's name and blurb, the week it
     was reached and the piece or number behind it where there is one (goalBits).
   - Where they open: the Career tab's Goals card (a Trophy button on each goal reached), the Certificates card below it
     (certsCard), and a Certificate button in the Test tab's trial sheet after a pass (certSheetBtn; in the Sandbox the
     card is drawn on the spot and not logged). The picture is the same in both themes: paper is paper. ---- */
const CD={W:1080,H:1350,max:40};
const CD_F='"Space Grotesk",-apple-system,"Segoe UI",sans-serif',CD_M='"JetBrains Mono",ui-monospace,Menlo,monospace';
const CD_LBL={mean:"Mean daily rate",maxVar:"Greatest day-to-day change",posSpread:"Spread between positions",thermal:"Temperature (per °C)",beat:"Beat error",amp24:"Amplitude after 24 h"};
const CD_INK={chronometer:{ink:"#2b3f8c",short:"BCH",ring:"HALDIS CHRONOMETRY BUREAU",grade:"Chronometer certificate",
    law:"Timed for fifteen days in five positions and at three temperatures, this movement met every limit the Bureau sets for a chronometer."},
  observatory:{ink:"#8a2630",short:"KPO",ring:"KESSEL PEAK OBSERVATORY",grade:"Observatory grade certificate",
    law:"Timed for fifteen days on the mountain, in five positions and at three temperatures, this movement met the Observatory's limits."}};
const cdTxt=(s,n)=>String(s==null?"":s).replace(/[<>&"`]/g,"").slice(0,n||90);
const cdSg=x=>(x>=0?"+":"−")+Math.abs(+x||0).toFixed(1);

/* ---- the log ---- */
/* the movement in one line: winding, beat, jewels, then the escapement and what regulates it */
function cdMove(cfg){const P=(s,id)=>SIM.part(s,id)||{name:""},h=P("hairspring",cfg.hairspring).name;
  return [P("winding",cfg.winding).name,P("bph",cfg.bph).name,P("jewels",cfg.jewels).name,P("escapement",cfg.escapement).name,P("balance",cfg.balance).name,
    "hairspring "+h.charAt(0).toLowerCase()+h.slice(1),P("regulator",cfg.regulator).name].filter(Boolean).join(" · ");}
/* one certificate's row from a trial result (t = runTrial's {stats, tiers}) */
function certRec(p,cfg,t,tier,when,sn){const s=t.stats,r=t.tiers[tier],f=(x,d)=>+(+x||0).toFixed(d);
  return{pid:+p.id||0,no:+p.no||0,name:cdTxt(pieceName(cfg,p.no||"—")),cal:cdTxt(calName(cfg),24),mv:cdTxt(cdMove(cfg),160),tier,y:when?when.year:0,w:when?when.week:0,sn:+sn||0,
    st:{mean:f(s.mean,2),maxVar:f(s.maxVar,2),posSpread:f(s.posSpread,2),thermal:f(s.thermal,3),beat:f(s.beat,2),amp24:Math.round(+s.amp24||0)},
    ck:r.checks.map(c=>[c.k,c.val,c.lim,c.ok?1:0])};}
/* closeWeek step 3: a pass came back (T = p.trial; the counter in c.certs is already up) */
function certLog(p,T){const c=car();if(!c||!T||!T.best||!CD_INK[T.tier])return;
  if(!Array.isArray(c.certsLog))c.certsLog=[];
  c.certsLog.push(certRec(p,p.cfg,T.t,T.tier,dateOf(c.wk+1),c.certs[T.tier]));if(c.certsLog.length>CD.max)c.certsLog.splice(0,c.certsLog.length-CD.max);}
/* a loaded log: keep only rows that read right, strings cut and cleaned, numbers numbers */
function normCertsLog(a){if(!Array.isArray(a))return[];const out=[];
  for(const x of a){if(!buObjS(x)||!CD_INK[x.tier]||!buObjS(x.st))continue;const st={};
    for(const k of ["mean","maxVar","posSpread","thermal","beat","amp24"])st[k]=+x.st[k]||0;
    const ck=(Array.isArray(x.ck)?x.ck:[]).filter(c=>Array.isArray(c)&&CD_LBL[c[0]]).slice(0,8).map(c=>[c[0],cdTxt(c[1],20),cdTxt(c[2],24),c[3]?1:0]);
    out.push({pid:+x.pid||0,no:+x.no||0,name:cdTxt(x.name)||"A piece",cal:cdTxt(x.cal,24),mv:cdTxt(x.mv,160),tier:x.tier,y:+x.y||0,w:+x.w||0,sn:+x.sn||0,st,ck});}
  return out.slice(-CD.max);}
const cdSerial=r=>r.y?`${CD_INK[r.tier].short} ${r.y}/${String(r.sn||1).padStart(3,"0")}`:`${CD_INK[r.tier].short} · Sandbox`;
const cdWhen=r=>r.y?`${r.y} · week ${r.w}`:"Sandbox trial";

/* ---- what a goal card can say about how it was reached ---- */
function goalBits(id){const c=car();if(!c)return[];const L=c.certsLog||[],has=x=>x&&x.cfg&&x.cfg.complications&&x.cfg.complications.includes("perp-cal");
  if(id==="chronometer"||id==="observatory"){const r=L.find(x=>x.tier===id);return r?[r.name,`${cdSerial(r)} · mean rate ${cdSg(r.st.mean)} s/day`]:[];}
  if(id==="commission"){const s=c.sold.find(x=>x.how==="commission");return s?[s.name,`Delivered to ${cdTxt(s.to,40)} for ${fmt$(s.price)}`]:[];}
  if(id==="auction"){const s=c.sold.find(x=>x.how==="auction");return s?[s.name,`Hammer price ${fmt$(s.price)} at ${CALENDAR.house}`]:[];}
  if(id==="podium"){const t=c.contests.find(x=>x.place<=3);return t?[`No. ${t.no}: ${ordinal(t.place)} of ${t.of}`,`The ${CALENDAR.trial.name}, ${t.year}, ${t.points} points`]:[];}
  if(id==="calibre"){const k=calList()[0];return k?[`The ${cdTxt(k.name,24)} calibre`,"Your own movement, frozen and named"]:[];}
  if(id==="perpetual"){const x=c.stock.find(has)||c.sold.find(x=>has(x)&&x.how!=="resale");return x?[x.name,"Leap years and all, by your own hand"]:[];}
  if(id==="shop")return[c.kind==="shop"?`A shop of your own since ${c.start}`:"From a shared bench to your own door","On the high street of the Haldis"];
  if(id==="survive")return[`${c.staff.length} on the payroll in 2019`,"Nobody let go through the slump"];
  return[];}

/* ---- drawing helpers ---- */
const cdFont=(x,w,px,fam)=>{x.font=`${w} ${px}px ${fam||CD_F}`;};
/* the biggest size up to px (down to min) at which the text fits in maxW */
function cdFit(x,t,maxW,w,px,min,fam){let s=px;cdFont(x,w,s,fam);while(s>min&&x.measureText(t).width>maxW){s-=2;cdFont(x,w,s,fam);}return s;}
function cdWrap(x,t,maxW,maxLines){const out=[];let ln="";for(const wd of String(t).split(" ")){const tt=ln?ln+" "+wd:wd;
  if(x.measureText(tt).width>maxW&&ln){out.push(ln);ln=wd;if(out.length>=maxLines)break;}else ln=tt;}
  if(out.length<maxLines&&ln)out.push(ln);else if(ln&&out.length>=maxLines)out[maxLines-1]=out[maxLines-1].replace(/\s*\S*$/,"")+" …";return out;}
/* spaced capitals, centred on cx (letterSpacing is not everywhere yet) */
function cdSpaced(x,t,cx,y,sp){const ws=[...t].map(ch=>x.measureText(ch).width),tot=ws.reduce((a,b)=>a+b,0)+sp*(ws.length-1);let px=cx-tot/2;
  x.textAlign="left";[...t].forEach((ch,i)=>{x.fillText(ch,px,y);px+=ws[i]+sp;});x.textAlign="center";}
/* paper or felt grain: fine specks and fibres from a fixed seed, so the same card always looks the same */
function cdGrain(x,seed,n,cols){const R=SIM.rng(seed);for(let i=0;i<n;i++){x.fillStyle=cols[i%cols.length];const px=R()*CD.W,py=R()*CD.H;
  if(i%5)x.fillRect(px,py,1+R()*2,1+R()*2);else{x.save();x.translate(px,py);x.rotate(R()*Math.PI);x.fillRect(0,0,6+R()*14,1);x.restore();}}}
function cdFrame(x,col,inset){const W=CD.W,H=CD.H,a=inset,b=inset+16;x.strokeStyle=col;x.lineWidth=4;x.strokeRect(a,a,W-2*a,H-2*a);x.lineWidth=1.5;x.strokeRect(b,b,W-2*b,H-2*b);
  x.fillStyle=col;for(const [px,py] of [[b,b],[W-b,b],[b,H-b],[W-b,H-b]]){x.save();x.translate(px,py);x.rotate(Math.PI/4);x.fillRect(-8,-8,16,16);x.restore();}}
function cdRule(x,y,w,col){const cx=CD.W/2;x.strokeStyle=col;x.lineWidth=2;x.beginPath();x.moveTo(cx-w/2,y);x.lineTo(cx-14,y);x.moveTo(cx+14,y);x.lineTo(cx+w/2,y);x.stroke();
  x.fillStyle=col;x.save();x.translate(cx,y);x.rotate(Math.PI/4);x.fillRect(-6,-6,12,12);x.restore();}
/* a faint guilloché rosette, the engraver's pattern behind a banknote */
function cdRosette(x,cx,cy,R,col){x.strokeStyle=col;x.lineWidth=1;for(let k=0;k<36;k++){x.beginPath();
  for(let i=0;i<=360;i++){const a=i/360*Math.PI*2,r=R*(.62+.3*Math.sin(9*a+k*.175)*Math.cos(2*a))+k*.6;const px=cx+Math.cos(a)*r,py=cy+Math.sin(a)*r;if(i)x.lineTo(px,py);else x.moveTo(px,py);}
  x.stroke();}}
/* the round stamp, inked on its own canvas, worn with specks, then pressed on at an angle */
function cdStamp(tier,year,seed){const I=CD_INK[tier],S2=320,c=document.createElement("canvas");c.width=c.height=S2;const x=c.getContext("2d"),m=S2/2;
  x.strokeStyle=x.fillStyle=I.ink;x.lineWidth=7;x.beginPath();x.arc(m,m,148,0,Math.PI*2);x.stroke();x.lineWidth=2.5;x.beginPath();x.arc(m,m,138,0,Math.PI*2);x.stroke();
  x.beginPath();x.arc(m,m,98,0,Math.PI*2);x.stroke();x.textAlign="center";x.textBaseline="middle";
  cdFont(x,700,22);const ring=`${I.ring} ★ VELMARK ★ `,tw=[...ring].reduce((a,ch)=>a+x.measureText(ch).width,0),sp=(2*Math.PI*118-tw)/ring.length;
  {let a=-Math.PI/2-Math.PI;for(const ch of ring){const w=x.measureText(ch).width,da=(w+sp)/118;x.save();x.translate(m,m);x.rotate(a+da/2+Math.PI/2);x.fillText(ch,0,-118);x.restore();a+=da;}}
  if(tier==="observatory"){x.save();x.translate(m,m-46);x.beginPath();for(let i=0;i<12;i++){const r=i%2?8:20,a=i*Math.PI/6;x.lineTo(Math.sin(a)*r,-Math.cos(a)*r);}x.closePath();x.fill();x.restore();
    cdFont(x,700,34);x.fillText("KESSEL",m,m+2);x.fillText("PEAK",m,m+38);}
  else{cdFont(x,700,72);x.fillText("BCH",m,m-4);cdFont(x,600,16,CD_M);x.fillText("CHRONOMETER",m,m-58);}
  cdFont(x,600,22,CD_M);x.fillText(year?String(year):"SANDBOX",m,tier==="observatory"?m+74:m+56);
  const R=SIM.rng(seed);x.globalCompositeOperation="destination-out";
  for(let i=0;i<900;i++){x.globalAlpha=.25+R()*.75;const px=R()*S2,py=R()*S2,s=R()*3.2;x.beginPath();x.arc(px,py,s,0,Math.PI*2);x.fill();}
  x.globalAlpha=.35;x.beginPath();x.arc(m+60,m+90,120,0,Math.PI*2);x.fill();   // the stamp pressed a little lighter on one side
  return c;}
/* a quick pen signature: a run of looped strokes (a trochoid), each loop its own size */
function cdSign(x,x0,y0,seed,col){const R=SIM.rng(seed),f1=R()*6,f2=R()*6;x.strokeStyle=col;x.lineWidth=2.4;x.lineCap=x.lineJoin="round";x.beginPath();
  for(let t=0;t<=30;t+=.08){const r=11+5*Math.sin(t*.37+f1),h=1.5+.6*Math.sin(t*.53+f2),px=x0+7*t-r*Math.sin(t),py=y0-h*r*Math.cos(t)+t*.4;if(t)x.lineTo(px,py);else x.moveTo(px,py);}
  x.stroke();x.beginPath();x.moveTo(x0-4,y0+20);x.quadraticCurveTo(x0+110,y0+10,x0+230,y0+16);x.stroke();}

/* ---- the certificate ---- */
function drawCert(r){const W=CD.W,H=CD.H,cv=document.createElement("canvas");cv.width=W;cv.height=H;const x=cv.getContext("2d"),I=CD_INK[r.tier],C=SIM.CERT[r.tier];
  const ink="#2a2418",muted="#6d6049",brass="#9c7a36",good="#2f6b45",bad="#a5362c",P=110,cx=W/2,seed=`cert|${r.pid}|${r.tier}|${r.y}|${r.w}|${r.sn}`;
  const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,"#f6eedb");g.addColorStop(1,"#eadcbc");x.fillStyle=g;x.fillRect(0,0,W,H);
  cdGrain(x,seed,5200,["rgba(120,96,50,.07)","rgba(255,255,255,.35)","rgba(90,70,40,.05)"]);
  const v=x.createRadialGradient(cx,H*.45,H*.35,cx,H*.5,H*.8);v.addColorStop(0,"rgba(0,0,0,0)");v.addColorStop(1,"rgba(110,80,30,.22)");x.fillStyle=v;x.fillRect(0,0,W,H);
  cdRosette(x,cx,800,330,"rgba(156,122,54,.10)");
  cdFrame(x,brass,40);
  x.textAlign="center";x.textBaseline="alphabetic";
  x.fillStyle=muted;cdFont(x,500,22,CD_M);cdSpaced(x,"VELMARK · THE HALDIS",cx,140,6);
  x.fillStyle=ink;cdFit(x,I.ring,W-2*P,700,54,36);cdSpaced(x,I.ring,cx,208,3);
  cdRule(x,240,560,brass);
  x.fillStyle=I.ink;cdFont(x,700,44);x.fillText(I.grade,cx,306);
  x.fillStyle=muted;cdFont(x,500,24,CD_M);x.fillText(`Bulletin No. ${cdSerial(r)}`,cx,350);
  x.fillStyle=muted;cdFont(x,400,24);cdWrap(x,I.law,W-2*P,2).forEach((l,i)=>x.fillText(l,cx,398+i*32));
  /* the piece */
  x.fillStyle=ink;cdFit(x,r.name,W-2*P,700,50,30);x.fillText(r.name,cx,508);
  x.fillStyle=brass;cdFont(x,600,26);x.fillText(r.cal?`Calibre ${r.cal}, of the workshop's own design`:"Made and adjusted in the workshop",cx,550);
  x.fillStyle=muted;cdFont(x,400,21,CD_M);cdWrap(x,r.mv,W-2*P,2).forEach((l,i)=>x.fillText(l,cx,592+i*30));
  /* the four key numbers */
  const keys=[["mean","MEAN RATE",cdSg(r.st.mean),"s/day"],["maxVar","VARIATION",r.st.maxVar.toFixed(1),"s/day"],["posSpread","POSITIONS",r.st.posSpread.toFixed(1),"s/day"],["thermal","TEMPERATURE",r.st.thermal.toFixed(2),"s/day per °C"]];
  const okOf=k=>{const c=r.ck.find(c=>c[0]===k);return c?!!c[3]:true;},bw=(W-2*P-3*14)/4,by=650,bh=140;
  keys.forEach(([k,lbl,val,unit],i)=>{const bx=P+i*(bw+14),ok=okOf(k);x.fillStyle="rgba(255,252,242,.55)";x.fillRect(bx,by,bw,bh);x.strokeStyle="rgba(156,122,54,.55)";x.lineWidth=1.5;x.strokeRect(bx,by,bw,bh);
    x.fillStyle=muted;cdFont(x,600,16,CD_M);x.fillText(lbl,bx+bw/2,by+32);
    x.fillStyle=ink;cdFit(x,val,bw-24,600,52,30,CD_M);x.fillText(val,bx+bw/2,by+90);
    x.fillStyle=ok?good:bad;cdFont(x,500,17,CD_M);x.fillText((ok?"✓ ":"✖ ")+unit,bx+bw/2,by+122);});
  /* every check, as the trial reported it */
  let y=842;x.textAlign="left";x.fillStyle=muted;cdFont(x,600,17,CD_M);
  const cols=[P+10,P+440,P+630,W-P-10];x.fillText("CHECK",cols[0],y);x.fillText("RESULT",cols[1],y);x.fillText("LIMIT",cols[2],y);
  x.strokeStyle="rgba(156,122,54,.6)";x.lineWidth=1.5;x.beginPath();x.moveTo(P,y+14);x.lineTo(W-P,y+14);x.stroke();y+=50;
  for(const c of r.ck){x.textAlign="left";x.fillStyle=ink;cdFont(x,500,24);x.fillText(CD_LBL[c[0]]||c[0],cols[0],y);cdFont(x,500,22,CD_M);x.fillText(c[1],cols[1],y);x.fillStyle=muted;x.fillText(c[2],cols[2],y);
    x.textAlign="right";x.fillStyle=c[3]?good:bad;cdFont(x,700,24);x.fillText(c[3]?"✓":"✖",cols[3],y);
    x.strokeStyle="rgba(156,122,54,.25)";x.lineWidth=1;x.beginPath();x.moveTo(P,y+14);x.lineTo(W-P,y+14);x.stroke();y+=40;}
  /* date, signature, stamp */
  const fy=H-158;x.textAlign="left";x.fillStyle=ink;cdFont(x,600,26);x.fillText(r.y?`Issued ${r.y}, week ${r.w}`:"A Sandbox trial",P+10,fy);
  x.fillStyle=muted;cdFont(x,400,21);x.fillText(C.body,P+10,fy+32);
  cdSign(x,P+420,fy-6,seed+"s","#23305e");x.strokeStyle="rgba(42,36,24,.55)";x.lineWidth=1.2;x.beginPath();x.moveTo(P+400,fy+22);x.lineTo(P+640,fy+22);x.stroke();
  x.fillStyle=muted;cdFont(x,400,18);x.textAlign="center";x.fillText(r.tier==="observatory"?"for the Observatory":"for the Bureau",P+520,fy+46);
  x.save();x.globalAlpha=.86;x.translate(W-P-95,fy+12);x.rotate(-.21);x.globalCompositeOperation="multiply";x.drawImage(cdStamp(r.tier,r.y,seed+"st"),-108,-108,216,216);x.restore();
  x.textAlign="center";x.fillStyle="rgba(109,96,73,.75)";cdFont(x,500,16,CD_M);cdSpaced(x,"ESCAPEMENT",cx,H-70,5);
  return cv;}

/* ---- the trophy ---- */
const CD_ROMAN=["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
/* the medal: brass cut like an escape wheel, a sunk centre with the goal's numeral */
function cdMedal(x,cx,cy,R,num){const n=15,st=Math.PI*2/n;
  const g=x.createLinearGradient(cx-R,cy-R,cx+R,cy+R);g.addColorStop(0,"#f2dc9c");g.addColorStop(.45,"#c9a45c");g.addColorStop(1,"#7a5a22");
  x.beginPath();for(let i=0;i<n;i++){const a=i*st-Math.PI/2;const p=(r,aa)=>[cx+Math.cos(aa)*r,cy+Math.sin(aa)*r];
    const [x1,y1]=p(R*.8,a),[x2,y2]=p(R,a+st*.18),[x3,y3]=p(R*.96,a+st*.36),[x4,y4]=p(R*.8,a+st*.5);
    if(i)x.lineTo(x1,y1);else x.moveTo(x1,y1);x.lineTo(x2,y2);x.lineTo(x3,y3);x.lineTo(x4,y4);x.arc(cx,cy,R*.8,a+st*.5,a+st);}
  x.closePath();x.fillStyle=g;x.shadowColor="rgba(0,0,0,.55)";x.shadowBlur=30;x.shadowOffsetY=12;x.fill();x.shadowColor="transparent";
  x.strokeStyle="#5c431a";x.lineWidth=2;x.stroke();
  const g2=x.createRadialGradient(cx-R*.2,cy-R*.25,R*.1,cx,cy,R*.7);g2.addColorStop(0,"#e6c982");g2.addColorStop(1,"#9a7533");
  x.beginPath();x.arc(cx,cy,R*.66,0,Math.PI*2);x.fillStyle=g2;x.fill();x.strokeStyle="rgba(70,50,18,.7)";x.lineWidth=3;x.stroke();
  x.strokeStyle="rgba(255,240,200,.35)";x.lineWidth=1;for(let r=R*.6;r>R*.12;r-=9){x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.stroke();}
  x.textAlign="center";x.textBaseline="middle";cdFont(x,700,Math.round(R*.5),CD_M);x.fillStyle="rgba(255,240,200,.55)";x.fillText(num,cx+2,cy+4);x.fillStyle="#4a3511";x.fillText(num,cx,cy+1);x.textBaseline="alphabetic";}
function drawTrophy(t){const W=CD.W,H=CD.H,cv=document.createElement("canvas");cv.width=W;cv.height=H;const x=cv.getContext("2d"),cx=W/2,P=110;
  const chalk="#f2efe6",muted="#b3bab4",brass="#c9a45c",brassT="#e0c07e";
  const g=x.createRadialGradient(cx,H*.32,40,cx,H*.5,H*.85);g.addColorStop(0,"#22342a");g.addColorStop(1,"#0b100e");x.fillStyle=g;x.fillRect(0,0,W,H);
  cdGrain(x,"felt|"+t.id,7000,["rgba(255,255,255,.035)","rgba(0,0,0,.18)","rgba(120,150,130,.05)"]);
  const lamp=x.createRadialGradient(cx,440,10,cx,440,520);lamp.addColorStop(0,"rgba(255,226,160,.20)");lamp.addColorStop(1,"rgba(255,226,160,0)");x.fillStyle=lamp;x.fillRect(0,0,W,H);
  cdFrame(x,brass,40);x.textAlign="center";
  x.fillStyle=brassT;cdFont(x,500,22,CD_M);cdSpaced(x,`THE HALDIS · GOAL ${t.n} OF ${t.of}`,cx,140,6);
  /* the ribbon, then the medal on it */
  const ry=168,my=470,R=190;
  for(const s of [-1,1]){x.save();x.beginPath();x.moveTo(cx+s*30,ry);x.lineTo(cx+s*150,ry);x.lineTo(cx+s*70,my-60);x.lineTo(cx-s*40,my-60);x.closePath();
    const rg=x.createLinearGradient(cx+s*30,0,cx+s*150,0);rg.addColorStop(0,"#6e1f2a");rg.addColorStop(1,"#4a131b");x.fillStyle=rg;x.fill();x.clip();
    x.strokeStyle="rgba(224,192,126,.75)";x.lineWidth=10;x.beginPath();x.moveTo(cx+s*90,ry);x.lineTo(cx+s*15,my-60);x.stroke();x.restore();}
  cdMedal(x,cx,my,R,CD_ROMAN[t.n-1]||String(t.n));
  /* the words */
  x.textAlign="center";x.fillStyle=chalk;cdFit(x,t.name,W-2*P,700,76,44);x.fillText(t.name,cx,792);
  x.fillStyle=muted;cdFont(x,400,30);cdWrap(x,t.blurb,W-2*P-20,3).forEach((l,i)=>x.fillText(l,cx,852+i*40));
  let y=1000;cdRule(x,y-46,420,"rgba(201,164,92,.7)");
  if(t.bits&&t.bits[0]){x.fillStyle=brassT;cdFit(x,t.bits[0],W-2*P,600,36,24);x.fillText(t.bits[0],cx,y);y+=46;}
  if(t.bits&&t.bits[1]){x.fillStyle=muted;cdFit(x,t.bits[1],W-2*P,400,27,20);x.fillText(t.bits[1],cx,y);y+=40;}
  x.fillStyle=chalk;cdFont(x,600,30,CD_M);x.fillText(`Reached ${t.y}, week ${t.w}`,cx,H-170);
  x.fillStyle="rgba(179,186,180,.6)";cdFont(x,500,16,CD_M);cdSpaced(x,"ESCAPEMENT",cx,H-70,5);
  return cv;}

/* ---- the sheet: the card as a picture, Save and Share ---- */
let cdTok=0;
function cdFonts(){const f=document.fonts;if(!f)return Promise.resolve();
  const want=[`700 50px ${CD_F}`,`600 30px ${CD_F}`,`500 24px ${CD_F}`,`400 24px ${CD_F}`,`500 22px ${CD_M}`,`600 30px ${CD_M}`,`400 21px ${CD_M}`];
  return Promise.race([Promise.all(want.map(w=>f.load(w).catch(()=>null))).then(()=>f.ready),new Promise(r=>setTimeout(r,2500))]).catch(()=>{});}
async function cardSheet(title,draw,file,alt){const tok=++cdTok,share=canShareFiles();
  openSheet(title,`<div class="cdpic" id="cdPic"><p class="hint">Drawing the card…</p></div>
<div class="row"><button class="btn pri" id="cdSave" disabled>Save picture</button>${share?`<button class="btn" id="cdShare" disabled>Share…</button>`:""}<button class="btn ghost" id="cdOk">Close</button></div>`);
  $("cdOk").addEventListener("click",closeSheet);
  await cdFonts();if(tok!==cdTok||!sheetOn()||!$("cdPic"))return;
  let cv;try{cv=draw();}catch(e){$("cdPic").innerHTML=`<p class="hint">Couldn't draw the card here.</p>`;return;}
  const img=new Image();img.alt=alt;img.width=CD.W;img.height=CD.H;img.src=cv.toDataURL("image/png");$("cdPic").replaceChildren(img);
  const go=async(b,sh)=>{b.disabled=true;try{await shareCanvas(cv,file,title,sh);}catch(e){toast("Couldn't make the picture here.");}finally{b.disabled=false;}};
  $("cdSave").disabled=false;$("cdSave").addEventListener("click",e=>go(e.currentTarget,false));
  if(share){$("cdShare").disabled=false;$("cdShare").addEventListener("click",e=>go(e.currentTarget,true));}}
function certCard(r){const C=SIM.CERT[r.tier],k=r.ck.filter(c=>c[3]).length;
  cardSheet(r.tier==="observatory"?"Observatory certificate":"Chronometer certificate",()=>drawCert(r),`escapement-${shareSlug(cdSerial(r)+" no "+r.no)}-${shareStamp()}.png`,
    `${C.name} certificate from the ${C.body} for ${r.name}, ${cdWhen(r)}: mean rate ${cdSg(r.st.mean)} s/day, ${k} of ${r.ck.length} checks passed.`);}
function trophyCard(id){const c=car(),G=GOALS[id];if(!c||!G||c.goals[id]==null)return;const ids=Object.keys(GOALS),d=dateOf(c.goals[id]);
  const t={id,name:G.name,blurb:G.blurb,y:d.year,w:d.week,n:ids.indexOf(id)+1,of:ids.length,bits:goalBits(id)};
  cardSheet(`Goal: ${G.name}`,()=>drawTrophy(t),`escapement-goal-${shareSlug(G.name)}-${shareStamp()}.png`,`Trophy card: ${G.name}, reached ${d.year}, week ${d.week}.${t.bits[0]?" "+t.bits[0]+".":""}`);}

/* ---- the Career tab's Certificates card ---- */
function certsCard(){const c=car(),L=c.certsLog||[],had=["chronometer","observatory"].some(k=>c.certs[k]);
  const rows=L.map((r,i)=>({r,i})).reverse().map(({r,i})=>`<li><div><b>${cdTxt(r.name)}</b><br><small>${SIM.CERT[r.tier].name} · ${cdSerial(r)} · ${r.y}, week ${r.w} · ${cdSg(r.st.mean)} s/day</small></div><div class="acts"><button class="btn sm" data-cd="cert" data-i="${i}">Certificate</button></div></li>`).join("");
  return `<details class="card"><summary><h3>Certificates<span class="cnt">${L.length}</span></h3></summary>${rows?`<ul class="shlist certs">${rows}</ul>`:""}
<p class="hint">${L.length?"The paperwork stays here after the piece is sold":"Every Chronometer (BCH) or Observatory pass gets its certificate here"}${had&&!L.length?" (certificates from before this version weren't kept)":""}: open one to save or share it as a picture.</p></details>`;}
$("careerBody").addEventListener("click",e=>{const b=e.target.closest("[data-cd]");if(!b)return;const c=car();if(!c)return;
  if(b.dataset.cd==="cert"){const r=(c.certsLog||[])[+b.dataset.i];if(r)certCard(r);}
  if(b.dataset.cd==="goal")trophyCard(b.dataset.id);});

/* ---- the Test tab's trial sheet: a Certificate button after a Bureau or Observatory pass ---- */
function certSheetBtn(t,id){if(!CD_INK[id]||!t||!t.tiers[id]||!t.tiers[id].pass)return;const ok=$("certOk");if(!ok)return;
  const p=curPiece();let r=null;
  if(inCareer()){const c=car();r=(c.certsLog||[]).slice().reverse().find(x=>x.tier===id&&p&&x.pid===p.id)||null;if(!r&&p)r=certRec(p,p.cfg,t,id,dateOf(c.wk),c.certs[id]);}
  else if(p)r=certRec(Object.assign({no:+S.pieceN||1},p),S.cfg,t,id,null,0);
  if(!r)return;const b=document.createElement("button");b.className="btn";b.id="certSee";b.textContent="Certificate";ok.after(b);b.addEventListener("click",()=>certCard(r));}
