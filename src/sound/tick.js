<script>
/* ===================== Escapement: the tick (WATCH_SOUND) =====================
   Web Audio. Each beat plays one short pre-baked buffer: high-passed noise (the pallet hitting the escape wheel) plus a
   quick metallic ring. Tick and tock are baked with different filters and rings so the pair sounds like a real watch.
   18,000 bph (5 beats a second) sounds lazy, 36,000 (10 a second) hums.
   Beat error delays every other beat. A real beat error of 1 ms is too short to hear, so the delay is BE_GAIN times
   the beat error (2.6 ms out of the box becomes about 10 ms: a clear limp; 0.3 ms sounds even).
   Scheduling: a 40 ms timer queues the beats due in the next 120 ms on the audio clock (never per frame).
     WATCH_SOUND.unlock()      call from a tap: browsers only allow audio after a user gesture
     WATCH_SOUND.set({bph, beatMs, on})   change the beat; on:false (or stop()) silences it
     WATCH_SOUND.context()     the AudioContext (made on first call), shared with WORKSHOP_SOUND
     WATCH_SOUND.ready         true once the audio context exists */
const WATCH_SOUND=(function(){
"use strict";
const LOOK=.12,IV=40,BE_GAIN=4,VOL=.35;
let ctx=null,out=null,bufs=null,timer=0,next=0,flip=0;
const cfg={bph:28800,beatMs:0,on:false};
function bake(c,hp,ring,decay,seed){
  const n=Math.round(c.sampleRate*.028),b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);
  let lp=0,s=seed,peak=0;const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647*2-1;};
  for(let i=0;i<n;i++){const t=i/c.sampleRate,nz=rnd();lp+=hp*(nz-lp);
    const env=Math.exp(-t/decay),click=Math.exp(-t/.0012);
    d[i]=(nz-lp)*click*.9+Math.sin(2*Math.PI*ring*t)*env*.35+Math.sin(2*Math.PI*ring*2.71*t)*env*click*.2;
    peak=Math.max(peak,Math.abs(d[i]));}
  for(let i=0;i<n;i++)d[i]/=peak||1;
  return b;}
function init(){if(ctx)return true;
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
  try{ctx=new AC();}catch(e){return false;}
  out=ctx.createGain();out.gain.value=VOL;out.connect(ctx.destination);
  bufs=[bake(ctx,.35,3300,.004,12345),bake(ctx,.22,2650,.005,54321)];
  api.ready=true;return true;}
function pump(){
  if(!ctx||!cfg.on)return;
  const iv=3600/Math.max(1000,cfg.bph),now=ctx.currentTime;
  if(next<now)next=now+.03;
  while(next<now+LOOK){
    const src=ctx.createBufferSource();src.buffer=bufs[flip];src.connect(out);
    src.start(next+(flip?Math.min(.04,cfg.beatMs*BE_GAIN/1000):0));
    flip^=1;next+=iv;}}
function run(){if(!cfg.on||!ctx){clearInterval(timer);timer=0;return;}
  if(ctx.state==="suspended")ctx.resume().catch(()=>{});
  if(!timer){next=0;timer=setInterval(pump,IV);pump();}}
const api={
  ready:false,
  unlock(){if(init()&&ctx.state==="suspended")ctx.resume().catch(()=>{});},
  context(){return init()?ctx:null;},   // the one AudioContext, shared with the workshop sounds (sound/workshop.js)
  set(o){Object.assign(cfg,o||{});run();},
  stop(){cfg.on=false;run();}
};
return api;
})();
</script>
