<script>
/* ===================== Escapement: the workshop sounds (WORKSHOP_SOUND) =====================
   Real recordings from sounds/ (all CC0, listed in sounds/CREDITS.md), fetched and decoded the first time they are
   needed (the service worker keeps them for offline). Shares WATCH_SOUND's AudioContext.
   One-shots (SHOTS):  door   the shop bell, when work comes in     sale   the till drawer and coins, when a piece sells
                       chime  a mantel clock's three strokes, at Close week
                       (1.1.1.0, made with ElevenLabs on Kelbo's plan) pass / fail  a trial's verdict; gavel  a lot
                       knocked down; tool  an adjusting press; wind  winding the crown; crate  a trade batch's parts;
                       newmachine  a machine bought
   Ambience (LOOPS), quiet, under everything: the wall clock, the valley through the window, and the cleaning machine
   running a cycle now and then once you own one; staff at their benches once you employ someone, the valley fair's
   crowd in fair week, and rain on the window when the Rain setting is on. Each loop file carries 0.1 s of padding at both ends (the end of the
   loop before, the start after) and plays from 0.1 to 0.1 + len, so MP3's encoder gap never clicks at the seam.
     WORKSHOP_SOUND.play(name, delay)   a one-shot, delay in seconds (calls made while held are queued: hold / release)
     WORKSHOP_SOUND.hold() / release(at, gap)   queue the one-shots made between the two, then play them from at s, gap s apart
     WORKSHOP_SOUND.set({on, amb, rain, room})  on: the setting; amb: the ambience may play now (page visible, not under
                                            the timegrapher's tick); rain: the Rain setting; room: {cleaning, staff, fair}
     WORKSHOP_SOUND.unlock()            call from a tap (browsers only allow audio after one) */
const WORKSHOP_SOUND=(function(){
"use strict";
const DIR="sounds/";
const SHOTS={door:{vol:.55},sale:{vol:.6},chime:{vol:.45},pass:{vol:.5},fail:{vol:.5},gavel:{vol:.55},tool:{vol:.3},wind:{vol:.35},crate:{vol:.45},newmachine:{vol:.4}};
const LOOPS={clock:{len:3.994,vol:.16},valley:{len:30,vol:.12},machine:{len:5.436,vol:.10},staff:{len:11.3,vol:.07},fair:{len:11.3,vol:.08},rain:{len:14.3,vol:.09}};
/* the cleaning machine: runs CYCLE.run s, rests CYCLE.rest s, fading in and out over CYCLE.fade s */
const CYCLE={run:22,rest:70,fade:3};
const AMB_FADE=1.2;
let ctx=null,out=null,amb=null,started=false,held=null,cycT=0;
const cfg={on:false,amb:false,rain:false,room:{}},bufs={},loading={},loops={};
function audio(){if(ctx)return ctx;if(typeof WATCH_SOUND==="undefined"||!WATCH_SOUND.context)return null;ctx=WATCH_SOUND.context();if(!ctx)return null;
  out=ctx.createGain();out.gain.value=1;out.connect(ctx.destination);amb=ctx.createGain();amb.gain.value=0;amb.connect(out);return ctx;}
function load(name){if(bufs[name])return Promise.resolve(bufs[name]);if(loading[name])return loading[name];
  if(!audio())return Promise.resolve(null);
  loading[name]=fetch(DIR+name+".mp3").then(r=>{if(!r.ok)throw new Error(r.status);return r.arrayBuffer();})
    .then(a=>new Promise((ok,no)=>ctx.decodeAudioData(a,ok,no))).then(b=>{bufs[name]=b;return b;})
    .catch(()=>{delete loading[name];return null;});
  return loading[name];}
function shot(name,delay){const S=SHOTS[name];if(!S||!cfg.on||!audio())return;
  load(name).then(b=>{if(!b||!cfg.on)return;if(ctx.state==="suspended")ctx.resume().catch(()=>{});
    const src=ctx.createBufferSource(),g=ctx.createGain();g.gain.value=S.vol;src.buffer=b;src.connect(g);g.connect(out);
    src.start(ctx.currentTime+.02+(delay||0));});}
/* one loop: a buffer source looping its padded middle, through its own gain (the machine's cycles ride on that gain) */
function loopOn(name){const L=LOOPS[name];if(loops[name]||!audio())return;loops[name]="loading";
  load(name).then(b=>{if(!b||loops[name]!=="loading"){if(loops[name]==="loading")delete loops[name];return;}
    const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=b;src.loop=true;src.loopStart=.1;src.loopEnd=Math.min(b.duration,.1+L.len);
    g.gain.value=name==="machine"?0:L.vol;src.connect(g);g.connect(amb);src.start(ctx.currentTime+.02,.1);loops[name]={src,g};
    if(name==="machine")cycT=0;});}
function loopOff(name){const l=loops[name];delete loops[name];if(!l||l==="loading")return;try{l.src.stop();}catch(e){}l.g.disconnect();}
/* every 2 s: start or stop the loops the settings and the room call for, ride the machine's cycle */
function tick(){if(!ctx)return;const want=cfg.on&&cfg.amb,now=ctx.currentTime;
  amb.gain.cancelScheduledValues(now);amb.gain.setTargetAtTime(want?1:0,now,AMB_FADE/3);
  if(!want)return;
  if(ctx.state==="suspended")ctx.resume().catch(()=>{});
  loopOn("clock");loopOn("valley");
  if(cfg.room&&cfg.room.cleaning){loopOn("machine");const m=loops.machine;
    if(m&&m.g){cycT+=2;const t=cycT%(CYCLE.run+CYCLE.rest),on=t<CYCLE.run;m.g.gain.setTargetAtTime(on?LOOPS.machine.vol:0,now,CYCLE.fade/3);}}
  else loopOff("machine");
  const extra={staff:!!(cfg.room&&cfg.room.staff),fair:!!(cfg.room&&cfg.room.fair),rain:!!cfg.rain};
  for(const k in extra){if(extra[k])loopOn(k);else loopOff(k);}}
const api={
  unlock(){if(!audio())return;if(ctx.state==="suspended")ctx.resume().catch(()=>{});if(!started){started=true;setInterval(tick,2000);}tick();},
  play(name,delay){if(held){held.push(name);return;}shot(name,delay);},
  hold(){held=held||[];},
  release(at,gap){const q=held||[];held=null;const seen={};let d=at||0;
    for(const n of q){if(seen[n])continue;seen[n]=true;shot(n,d);d+=gap||1.2;}},   // each kind once, in the order they came
  set(o){Object.assign(cfg,o||{});if(!cfg.on)for(const k in loops)loopOff(k);if(ctx)tick();},
  _state:{cfg,loops,bufs}
};
return api;
})();
</script>
