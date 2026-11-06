<script>
/* ===================== Escapement: the tick (WATCH_SOUND) =====================
   Web Audio: a short filtered noise burst per beat at bph/3600 per second (28,800 bph = 8 ticks a second), tick and tock
   on slightly different filters, beat error delaying every other tick so you can hear it. Scheduled ahead, never per
   frame. Plays while the Test tab is open and the movement is wound. Arrives in PR 3 (docs/ESCAPEMENT-PLAN.md 6d). */
const WATCH_SOUND={ready:false,set(){},stop(){}};
</script>
