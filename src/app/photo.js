/* ===================== app/photo.js: photo mode =====================
   The camera button on the 3D view (#phBtn, every tab) opens photo mode, html.photo: the panel and the tab bar fold away,
   the view fills the screen, and dragging, pinching, the mouse wheel and the double-tap loupe work as ever (vis/bench.js).
   A dock beside the view (#phUi; under it, or down the right side of a landscape phone) picks the backdrop
   (WATCH_VIS.setBackdrop: the workshop, black velvet, a white studio), turns the caption on or off, and saves or shares
   the picture: one frame rendered at 2 to 4 times the screen's size
   (WATCH_VIS.photoGrab), a thin caption strip drawn along its bottom (the piece's name, its calibre, its certificate),
   out through shareCanvas (app/share.js) as escapement-<piece>-<stamp>.png. X or Esc leaves, and the camera, the view and
   the backdrop go back exactly as they were (photoKeep / photoBack).
   The choices live in S.photo = {back, cap} inside esc-save (no new key); phoPrefs() checks them on every read.
   Auto-adjust graphics waits while html.photo is on (app/perf.js), so a big frame never lowers the tier. ---- */
const PHO={on:false,busy:false,from:null};
const PHO_BACKS=[["workshop","Workshop"],["velvet","Black velvet"],["white","White studio"]];
const PHO_ICON={cam:'<svg viewBox="0 0 24 24"><path d="M4 8h3l1.6-2.4h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.6"/></svg>',
  x:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'};
/* S.photo, checked: a backdrop from the list (else the workshop) and the caption on unless it was turned off */
function phoPrefs(){const p=buObjS(S.photo)?S.photo:{};return S.photo={back:PHO_BACKS.some(b=>b[0]===p.back)?p.back:"workshop",cap:p.cap!==false};}
/* what the caption says about the movement in the view (S.cfg): in a career, your bench piece when that is what's shown
   (its number, name and certificate); otherwise the design: its calibre's name if it has one, and benchLine() */
function phoCaption(){
  const key=JSON.stringify(S.cfg),b=inCareer()?car().bench:null,cal=calName(S.cfg),line=benchLine();let title,cert=null,bits=[];
  if(b&&b.key===key){title=pieceName(b.cfg,b.no);cert=b.cert;bits.push(line.split(" · ").slice(0,2).join(" · "));}   // the name already says the winding and the complications
  else{const p=!inCareer()&&S.piece&&S.piece.key===key?S.piece:null;cert=p?p.cert:null;
    if(cal){title=cal+" calibre";bits.push(line);}else title=line;}
  const C=cert&&SIM.CERT[cert];
  if(C)bits.unshift(C.stamp?`${C.name} · ${C.body}`:C.name);
  return{title,sub:bits.join(" · ")};}
/* the two fonts the strip is drawn in, loaded before drawing (asked for on opening, so Save never waits long) */
function phoFonts(){try{return Promise.race([Promise.all(['600 40px "Space Grotesk"','500 20px "JetBrains Mono"'].map(f=>document.fonts.load(f))).then(()=>document.fonts.ready),
  new Promise(r=>setTimeout(r,1500))]).catch(()=>{});}catch(e){return Promise.resolve();}}
function phoFit(x,s,max){s=String(s==null?"":s);if(x.measureText(s).width<=max)return s;while(s.length>2&&x.measureText(s+"…").width>max)s=s.slice(0,-1);return s.trimEnd()+"…";}
/* the caption strip along the bottom of the frame: name above, the details and the game's name below; light on the white studio */
function phoStrip(cv,cap,back){
  const w=cv.width,h=cv.height,x=cv.getContext("2d"),u=Math.sqrt(w*h)/120,sh=Math.round(u*6.6),pad=Math.round(u*2.2),lt=back==="white";
  x.save();x.fillStyle=lt?"rgba(250,249,245,.9)":"rgba(10,14,12,.82)";x.fillRect(0,h-sh,w,sh);
  x.fillStyle=lt?"#a07a2c":"#c9a45c";x.fillRect(0,h-sh,w,Math.max(1,Math.round(u*.14)));
  x.textBaseline="alphabetic";x.textAlign="left";
  const mono=`500 ${Math.round(u*1.45)}px "JetBrains Mono",ui-monospace,Menlo,Consolas,monospace`,brand="ESCAPEMENT",one=!cap.sub;
  x.font=mono;const bw=x.measureText(brand).width;
  x.font=`600 ${Math.round(u*2.5)}px "Space Grotesk",-apple-system,"Segoe UI",sans-serif`;x.fillStyle=lt?"#18201b":"#f2efe6";
  x.fillText(phoFit(x,cap.title,w-pad*(one?3:2)-(one?bw:0)),pad,h-sh+u*(one?4.2:3.3));   // with nothing to add, one line and the name beside it
  x.font=mono;if(!one){x.fillStyle=lt?"#4f5852":"#b3bab4";x.fillText(phoFit(x,cap.sub,w-pad*3-bw),pad,h-sh+u*5.4);}
  x.textAlign="right";x.fillStyle=lt?"#7a5c1c":"#d9b56e";x.fillText(brand,w-pad,h-sh+u*(one?4.2:5.4));
  x.restore();return cv;}
/* the finished picture as a canvas (also handy from the console): the frame, plus the strip when the caption is on */
function phoPicture(){
  const v=$("view"),long=Math.max(v.clientWidth,v.clientHeight)||1,cv=WATCH_VIS.photoGrab(Math.min(4,Math.max(2,2560/long)));
  if(!cv)return null;const p=phoPrefs();if(p.cap)phoStrip(cv,phoCaption(),p.back);return cv;}
async function phoShot(share){
  if(PHO.busy||!PHO.on)return;PHO.busy=true;phoBusy(true);
  try{await phoFonts();await new Promise(r=>requestAnimationFrame(r));
    const cv=phoPicture();if(!cv){toast("Couldn't take the picture here.");return;}
    const cap=phoCaption();await shareCanvas(cv,`escapement-${shareSlug(cap.title)}-${shareStamp()}.png`,cap.title,share);}
  catch(e){toast("Couldn't take the picture here.");}
  finally{PHO.busy=false;phoBusy(false);}}
function phoBusy(on){for(const id of ["phShot","phShare"])$(id).disabled=on;$("phShot").textContent=on?"Developing…":"Save photo";}
/* ---- the button, the dock and their state ---- */
function phoBuild(){
  const v=$("view");if(!v||$("phUi"))return;
  const fab=document.createElement("button");fab.type="button";fab.id="phBtn";fab.className="hudbtn";fab.title="Photo mode";fab.setAttribute("aria-label","Photo mode");fab.innerHTML=PHO_ICON.cam;v.appendChild(fab);
  const ui=document.createElement("div");ui.id="phUi";ui.hidden=true;ui.setAttribute("role","group");ui.setAttribute("aria-label","Photo mode");
  ui.innerHTML=`<div class="phtop"><div class="phh">Photo mode<small>Drag to turn · pinch or scroll to zoom · double-tap for the loupe</small></div>
      <button type="button" class="phx" id="phX" aria-label="Leave photo mode" title="Leave photo mode (Esc)">${PHO_ICON.x}</button></div>
    <div class="phdock">
      <div class="phrow"><span class="phl" id="phBackL">Backdrop</span><div class="phchips" id="phBack" role="group" aria-labelledby="phBackL">${PHO_BACKS.map(([k,t])=>`<button type="button" data-back="${k}" aria-pressed="false">${t}</button>`).join("")}</div></div>
      <button type="button" class="phcap" id="phCap" aria-pressed="true"><span class="phtick" aria-hidden="true"></span><span class="phct"><b>Caption</b><small id="phCapTxt"></small></span></button>
      <div class="phact"><button type="button" class="phpri" id="phShot">Save photo</button><button type="button" id="phShare" hidden>Share</button></div>
    </div>`;
  v.appendChild(ui);
  fab.addEventListener("click",phoOpen);
  $("phX").addEventListener("click",phoClose);
  $("phBack").addEventListener("click",e=>{const b=e.target.closest("[data-back]");if(!b||!PHO.on)return;const p=phoPrefs();p.back=b.dataset.back;WATCH_VIS.setBackdrop(p.back);save();phoSync();});
  $("phCap").addEventListener("click",()=>{const p=phoPrefs();p.cap=!p.cap;save();phoSync();});
  $("phShot").addEventListener("click",()=>phoShot(false));$("phShare").addEventListener("click",()=>phoShot(true));
  window.addEventListener("keydown",e=>{if(PHO.on&&e.key==="Escape"){e.preventDefault();e.stopPropagation();phoClose();}},true);
  window.addEventListener("resize",()=>{if(PHO.on)phoLayout();});}
/* the dock sits beside the view, not over it: under it in portrait, down the right side on a short landscape phone. The view
   is given the rest of the screen (--phb / --phr, css/photo.css), so the picture saved is the picture seen */
function phoLayout(){const r=$("phUi").querySelector(".phdock").getBoundingClientRect(),st=document.documentElement.style,side=r.top<=1&&r.height>=innerHeight-1;
  st.setProperty("--phb",side?"0px":Math.round(innerHeight-r.top)+"px");st.setProperty("--phr",side?Math.round(innerWidth-r.left)+"px":"0px");}
function phoSync(){
  const p=phoPrefs(),cap=phoCaption();
  document.querySelectorAll("#phBack [data-back]").forEach(b=>{const on=b.dataset.back===p.back;b.classList.toggle("on",on);b.setAttribute("aria-pressed",String(on));});
  $("phCap").classList.toggle("on",p.cap);$("phCap").setAttribute("aria-pressed",String(p.cap));
  $("phCapTxt").textContent=p.cap?[cap.title,cap.sub].filter(Boolean).join(" · "):"Off: just the picture";
  $("phShare").hidden=!canShareFiles();}
function phoOpen(){
  if(PHO.on)return;const W=window.WATCH_VIS;
  if(!W||!W.photoGrab||!W._state.r){toast("Photo mode needs the 3D view, which isn't running on this device.");return;}
  if(sheetOn())closeSheet();
  PHO.on=true;PHO.from=document.activeElement;W.photoKeep();
  document.documentElement.classList.add("photo");$("phUi").hidden=false;
  W.setBackdrop(phoPrefs().back);phoSync();phoLayout();phoFonts();
  $("phShot").focus({preventScroll:true});}
function phoClose(){
  if(!PHO.on)return;PHO.on=false;
  document.documentElement.classList.remove("photo");$("phUi").hidden=true;
  for(const k of ["--phb","--phr"])document.documentElement.style.removeProperty(k);
  WATCH_VIS.photoBack();   // after the class comes off: the view has its old size again, so the camera lands where it was
  const f=PHO.from;PHO.from=null;try{(f&&f.isConnected&&f.offsetParent?f:$("phBtn")).focus({preventScroll:true});}catch(e){}}
phoBuild();
