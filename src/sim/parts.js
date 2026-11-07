<script>
/* ===================== Escapement: watch sim core (WATCH_SIM) =====================
   The physics and economy maths. Never touches the DOM or three.js, and runs in plain node: cut this <script> block out of
   the built index.html (search for "Escapement: watch sim core") and require it; it ends with module.exports = WATCH_SIM.
   tools/sim-test.js does exactly that. One IIFE spread over sim/parts.js, movement.js, combos.js, trial.js and market.js
   (in that order); the export object is at the end of market.js.

   This file: the parts tables (plan section 4a). PARTS is an object of slots; each slot is a list of options with
     id, name, blurb   what the player reads
     cost              parts cost per piece, in euros
     hours             bench hours it adds to building one piece
     prestige          what collectors see in it (points, summed)
     parts             how many parts it adds to the count
     unlock            "start" (owned from day one), "shop:<upgrade id>" (buy the tool or supplier in the Shop, PR 5)
                       or "rnd:<project id>" (research it, PR 7)
   plus the stats that slot feeds into simulate() (sim/movement.js). Three slots, complications, finish and house, are
   lists: a movement can carry several. DEFAULT_CFG is a plain manual 28,800 bph three-hand movement.
   A cfg can also carry cal: the id of the player's own calibre it is built on (PR 7; K.calibre in movement.js).
   Numbers are a first pass, tuned in node with tools/sim-test.js; keep them here, never inline. */
const WATCH_SIM=(function(){
"use strict";

/* the slots in the order the Build tab shows them, and whether a slot takes one option or a list */
const SLOTS=["barrel","train","jewels","escapement","balance","hairspring","bph","regulator","shock","winding","complications","finish","house"];
const MULTI={complications:true,finish:true,house:true};

const PARTS={
  /* the mainspring barrel. torque on a 0..10 scale at full wind, falloff = share of that torque lost by the end of the
     reserve, reserveH = hours of running from full wind at 28,800 bph with nothing extra to drive, thick = mm added */
  barrel:[
    {id:"single-small",name:"Single barrel, small",blurb:"A slim spring. Cheap and thin, but weak.",cost:22,hours:0,prestige:0,parts:4,unlock:"start",torque:4.8,falloff:.42,reserveH:40,thick:0},
    {id:"single-large",name:"Single barrel, large",blurb:"The everyday choice: decent torque and two days of reserve.",cost:34,hours:0,prestige:0,parts:4,unlock:"start",torque:6.0,falloff:.36,reserveH:48,thick:.25},
    {id:"double",name:"Twin barrels",blurb:"Two springs in series: a flatter torque curve and a long reserve.",cost:78,hours:3,prestige:2,parts:9,unlock:"shop:mill",torque:6.0,falloff:.22,reserveH:72,thick:.35},
    {id:"high-torque",name:"High-torque barrel",blurb:"A thick spring for heavy complications. Strong but short-lived.",cost:66,hours:1,prestige:1,parts:5,unlock:"shop:spring-supplier",torque:8.0,falloff:.40,reserveH:42,thick:.5}
  ],
  /* the wheel train from barrel to escape wheel. friction 0..1 (lower is better), maxBph = the fastest beat it is rated for */
  train:[
    {id:"standard",name:"Standard train",blurb:"Stamped wheels and plain pivots. Fine up to 28,800 bph.",cost:38,hours:0,prestige:0,parts:14,unlock:"start",friction:.30,maxBph:28800},
    {id:"polished-pivots",name:"Polished pivots",blurb:"The same wheels with burnished pivots: less friction, rated for 36,000 bph.",cost:66,hours:4,prestige:1,parts:14,unlock:"shop:lathe",friction:.26,maxBph:36000},
    {id:"fine-pitch",name:"Fine-pitch train",blurb:"Cut wheels with a finer tooth form. The smoothest power delivery you can buy.",cost:118,hours:6,prestige:2,parts:14,unlock:"shop:cnc",friction:.22,maxBph:36000}
  ],
  /* jewel count. mult scales train friction */
  jewels:[
    {id:"17",name:"17 jewels",blurb:"Every pivot that matters, jewelled.",cost:17,hours:0,prestige:0,parts:17,unlock:"start",mult:1.00},
    {id:"21",name:"21 jewels",blurb:"Adds cap jewels on the fast wheels.",cost:26,hours:1,prestige:0,parts:21,unlock:"start",mult:.93},
    {id:"25",name:"25 jewels",blurb:"Cap jewels throughout. A little smoother, a little prouder.",cost:40,hours:2,prestige:1,parts:25,unlock:"shop:jewel-supplier",mult:.89},
    {id:"31",name:"31 jewels",blurb:"More jewels than strictly needed. Collectors notice; physics barely does.",cost:62,hours:3,prestige:2,parts:31,unlock:"shop:jewel-supplier",mult:.88}
  ],
  /* the escapement. efficiency 0..1 = share of the train's torque delivered to the balance; oilDrift = rate lost per year
     since service as the oil ages (s/day/year); shockFragile 0..1; lubeFree = needs no oil on the pallets; lift = the lift
     angle in degrees (a timegrapher needs it to read amplitude right) */
  escapement:[
    {id:"swiss-lever",name:"Swiss lever",blurb:"The standard for a century. Reliable, needs oil, loses a little as it ages.",cost:44,hours:0,prestige:0,parts:6,unlock:"start",efficiency:.38,oilDrift:1.2,shockFragile:.2,lubeFree:false,thick:0,lift:52},
    {id:"hi-eff-lever",name:"High-efficiency lever",blurb:"Lighter pallets and optimised geometry: more amplitude from the same spring.",cost:72,hours:3,prestige:1,parts:6,unlock:"shop:cnc",efficiency:.41,oilDrift:1.0,shockFragile:.25,lubeFree:false,thick:0,lift:51},
    {id:"coaxial-style",name:"Co-axial style",blurb:"Radial impulse with almost no sliding friction. Barely drifts between services.",cost:230,hours:10,prestige:4,parts:9,unlock:"rnd:coaxial",efficiency:.44,oilDrift:.3,shockFragile:.2,lubeFree:false,thick:.15,lift:38},
    {id:"detent",name:"Detent (chronometer)",blurb:"A marine chronometer escapement: superb efficiency, no oil, and it hates a knock.",cost:390,hours:18,prestige:6,parts:7,unlock:"rnd:detent",efficiency:.48,oilDrift:.15,shockFragile:.8,lubeFree:true,thick:.2,lift:44}
  ],
  /* the balance wheel. inertia (1 = a normal 10 mm balance) soaks up torque; poise 0..1 = how well it is balanced out of the box */
  balance:[
    {id:"smooth-small",name:"Smooth balance, small",blurb:"Light and easy to drive. Less stable on the wrist.",cost:28,hours:0,prestige:0,parts:3,unlock:"start",inertia:.9,poise:.74,freeSprung:false},
    {id:"smooth-large",name:"Smooth balance, large",blurb:"More inertia: steadier rate, but it needs the torque to swing it.",cost:34,hours:0,prestige:0,parts:3,unlock:"start",inertia:1.25,poise:.72,freeSprung:false},
    {id:"screw",name:"Screw balance",blurb:"Timing screws round the rim let you poise it properly.",cost:58,hours:3,prestige:1,parts:21,unlock:"start",inertia:1.0,poise:.84,freeSprung:false},
    {id:"free-sprung",name:"Free-sprung balance",blurb:"Adjusted by inertia weights, not a regulator. The serious-maker's choice.",cost:150,hours:6,prestige:3,parts:9,unlock:"rnd:free-sprung",inertia:1.05,poise:.92,freeSprung:true}
  ],
  /* the hairspring. tempCoeff = rate change per degree C away from 23 (s/day/C); magnet 0..1 susceptibility; overcoil 0..1
     (how much it centres the breathing, which cuts the amplitude error); brittle = cracks rather than bends in a drop */
  hairspring:[
    {id:"steel-flat",name:"Steel, flat",blurb:"Plain carbon steel. Swings badly with temperature and loves a magnet.",cost:8,hours:0,prestige:0,parts:1,unlock:"start",tempCoeff:.7,magnet:.9,overcoil:0,brittle:false},
    {id:"steel-overcoil",name:"Steel, Breguet overcoil",blurb:"The outer coil lifted and bent in: breathes concentrically, still steel.",cost:18,hours:4,prestige:1,parts:1,unlock:"start",tempCoeff:.7,magnet:.9,overcoil:.55,brittle:false},
    {id:"alloy-flat",name:"Self-compensating alloy, flat",blurb:"A nickel-iron alloy that barely notices temperature.",cost:32,hours:0,prestige:1,parts:1,unlock:"shop:spring-supplier",tempCoeff:.12,magnet:.45,overcoil:0,brittle:false},
    {id:"alloy-overcoil",name:"Alloy, Breguet overcoil",blurb:"Compensating alloy with an overcoil: the classic chronometer spring.",cost:48,hours:4,prestige:2,parts:1,unlock:"shop:spring-supplier",tempCoeff:.12,magnet:.45,overcoil:.55,brittle:false},
    {id:"silicon",name:"Silicon",blurb:"Etched, not drawn: ignores magnets and heat. Shatters in a hard drop.",cost:125,hours:0,prestige:3,parts:1,unlock:"rnd:silicon",tempCoeff:.03,magnet:0,overcoil:.65,brittle:true}
  ],
  /* beat rate (beats per hour). rateStability divides the amplitude and position errors; reserveMult scales reserve;
     ampMult scales amplitude (a faster balance swings less far); wearMult speeds up wear and shortens service */
  bph:[
    {id:"18000",name:"18,000 bph",blurb:"5 beats a second. Lazy, frugal, long reserve; easily upset on the wrist.",cost:0,hours:0,prestige:1,parts:0,unlock:"start",bph:18000,rateStability:.70,reserveMult:1.25,ampMult:1.06,wearMult:.8},
    {id:"21600",name:"21,600 bph",blurb:"6 beats a second. The old workhorse.",cost:0,hours:0,prestige:0,parts:0,unlock:"start",bph:21600,rateStability:.82,reserveMult:1.12,ampMult:1.03,wearMult:.9},
    {id:"28800",name:"28,800 bph",blurb:"8 beats a second. The modern standard.",cost:0,hours:0,prestige:0,parts:0,unlock:"start",bph:28800,rateStability:1.0,reserveMult:1.0,ampMult:1.0,wearMult:1.0},
    {id:"36000",name:"36,000 bph",blurb:"10 beats a second. Hums, holds its rate, eats its reserve and its pivots.",cost:0,hours:3,prestige:2,parts:0,unlock:"start",bph:36000,rateStability:1.25,reserveMult:.78,ampMult:.93,wearMult:1.35}
  ],
  /* the regulator. drift = rate it wanders by per year (s/day/year); adjustRes = smallest regulating step (s/day);
     beatFloor = the best beat error it lets you reach (ms); needsFreeSprung = only works with a free-sprung balance */
  regulator:[
    {id:"index",name:"Index regulator",blurb:"A lever on the hairspring. Simple, but each nudge is coarse.",cost:10,hours:0,prestige:0,parts:2,unlock:"start",drift:1.0,adjustRes:2.0,beatFloor:.3,needsFreeSprung:false},
    {id:"micro-adjust",name:"Micro-adjust (swan neck)",blurb:"A screw-driven index: fine steps, and it stays put.",cost:36,hours:1,prestige:1,parts:4,unlock:"shop:timing-six",drift:.4,adjustRes:.5,beatFloor:.15,needsFreeSprung:false},
    {id:"free-sprung",name:"Free-sprung (weights)",blurb:"No index at all: regulate by turning the balance weights.",cost:0,hours:2,prestige:2,parts:0,unlock:"rnd:free-sprung",drift:.1,adjustRes:.25,beatFloor:.08,needsFreeSprung:true}
  ],
  /* shock protection for the balance jewels. shockRating 0..1 */
  shock:[
    {id:"none",name:"None",blurb:"Solid jewels. One drop and the balance pivots are gone.",cost:0,hours:0,prestige:0,parts:0,unlock:"start",shockRating:.1},
    {id:"basic",name:"Basic shock jewels",blurb:"Spring-mounted jewels. Survives everyday knocks.",cost:12,hours:0,prestige:0,parts:6,unlock:"start",shockRating:.55},
    {id:"premium",name:"Premium shock system",blurb:"Lyre springs, top and bottom. Survives a drop onto a tiled floor, usually.",cost:34,hours:1,prestige:1,parts:8,unlock:"shop:jewel-supplier",shockRating:.85}
  ],
  /* manual or automatic. thick = mm added (the rotor); keepsWind = worn daily it stays near the top of the torque curve */
  winding:[
    {id:"manual",name:"Hand-wound",blurb:"Wind it every morning. Thin, and collectors like the ritual.",cost:0,hours:0,prestige:1,parts:0,unlock:"start",thick:0,keepsWind:false},
    {id:"automatic",name:"Automatic",blurb:"A rotor winds it as you move. Thicker, more parts, never runs down on the wrist.",cost:140,hours:6,prestige:0,parts:45,unlock:"start",thick:1.2,keepsWind:true}
  ],
  /* complications (any number). torqueDraw = extra load on the train (share of torque); thick = mm; complexity 1..10 = the
     complications skill needed to build it cleanly; needs = another complication it relies on; posAvg = share of the
     vertical-position error it averages out (the tourbillon) */
  complications:[
    {id:"date",name:"Date",blurb:"A date ring that jumps at midnight.",cost:60,hours:6,prestige:1,parts:22,unlock:"start",torqueDraw:.04,thick:.5,complexity:1},
    {id:"gmt",name:"GMT",blurb:"A second time zone on a 24-hour hand.",cost:90,hours:8,prestige:2,parts:26,unlock:"start",torqueDraw:.05,thick:.6,complexity:2},
    {id:"power-reserve",name:"Power reserve indicator",blurb:"A hand that shows how much wind is left.",cost:80,hours:8,prestige:2,parts:30,unlock:"rnd:power-reserve",torqueDraw:.03,thick:.4,complexity:2},
    {id:"moonphase",name:"Moonphase",blurb:"A painted moon that waxes and wanes, right for 122 years if you cut the wheel well.",cost:120,hours:12,prestige:4,parts:34,unlock:"rnd:moonphase",torqueDraw:.03,thick:.5,complexity:3},
    {id:"chrono",name:"Chronograph",blurb:"A stopwatch on the same movement: column wheel, clutch, three pushers' worth of levers.",cost:460,hours:40,prestige:6,parts:250,unlock:"rnd:chrono",torqueDraw:.22,thick:1.8,complexity:5},
    {id:"annual-cal",name:"Annual calendar",blurb:"Knows 30- and 31-day months. Needs a nudge once a year, on 1 March.",cost:420,hours:40,prestige:7,parts:120,unlock:"rnd:annual-cal",torqueDraw:.08,thick:1.0,complexity:6},
    {id:"perp-cal",name:"Perpetual calendar",blurb:"Knows leap years. Right until 2100, when the Gregorian rule catches it out.",cost:1150,hours:120,prestige:10,parts:180,unlock:"rnd:perp-cal",torqueDraw:.10,thick:1.4,complexity:8},
    {id:"tourbillon",name:"Tourbillon",blurb:"The whole escapement in a cage that turns once a minute, averaging out the vertical positions.",cost:1450,hours:80,prestige:12,parts:70,unlock:"rnd:tourbillon",torqueDraw:.16,thick:.8,complexity:8,posAvg:.7},
    {id:"repeater",name:"Minute repeater",blurb:"Chimes the time on two gongs at the press of a slide. The summit.",cost:2400,hours:200,prestige:14,parts:300,unlock:"rnd:repeater",torqueDraw:.02,thick:1.6,complexity:9},
    {id:"split-seconds",name:"Split-seconds",blurb:"A second chronograph hand that stops on its own: timing two runners at once.",cost:900,hours:80,prestige:12,parts:120,unlock:"rnd:split-seconds",torqueDraw:.12,thick:1.2,complexity:9,needs:"chrono"}
  ],
  /* finishing (any number). Hours and prestige only: it changes nothing about how the watch runs */
  finish:[
    {id:"perlage",name:"Perlage",blurb:"Overlapping circles spotted onto the main plate.",cost:4,hours:4,prestige:1,parts:0,unlock:"start"},
    {id:"stripes",name:"Haldis stripes",blurb:"Straight ribbons ground across the bridges.",cost:6,hours:6,prestige:1,parts:0,unlock:"start"},
    {id:"anglage",name:"Anglage",blurb:"Every bridge edge bevelled and polished by hand.",cost:8,hours:20,prestige:3,parts:0,unlock:"start"},
    {id:"black-polish",name:"Black polish",blurb:"Steel parts polished so flat they look black from most angles.",cost:10,hours:30,prestige:4,parts:0,unlock:"shop:polishing"},
    {id:"rhodium",name:"Rhodium plating",blurb:"Plates and bridges plated silver-white instead of gilt: cool, bright, and it never tarnishes.",cost:14,hours:1,prestige:1,parts:0,unlock:"start"}
  ],
  /* parts made in your own workshop (any number; R&D, PR 7). of = the slot whose part you make yourself ("base" = the
     plates and bridges, K.baseCost), save = the share of that part's cost you no longer pay a supplier. They cost bench
     hours instead, and collectors pay for the "in-house" name (prestige) */
  house:[
    {id:"hairspring",name:"In-house hairsprings",blurb:"Drawn, coiled and vibrated to your balance in your own clean room.",cost:0,hours:2,prestige:2,parts:0,unlock:"rnd:house-spring",of:"hairspring",save:.6},
    {id:"balance",name:"In-house balances",blurb:"Turned and poised on your own lathe.",cost:0,hours:2,prestige:1,parts:0,unlock:"rnd:house-balance",of:"balance",save:.5},
    {id:"escapement",name:"In-house escapements",blurb:"Escape wheels and pallet forks cut on your own CNC.",cost:0,hours:3,prestige:2,parts:0,unlock:"rnd:house-escapement",of:"escapement",save:.5},
    {id:"plates",name:"In-house plates and bridges",blurb:"The main plate and bridges milled from your own drawings.",cost:0,hours:4,prestige:2,parts:0,unlock:"rnd:house-plates",of:"base",save:.5}
  ]
};

/* a plain manual 28,800 bph three-hand movement */
const DEFAULT_CFG={barrel:"single-large",train:"standard",jewels:"21",escapement:"swiss-lever",balance:"screw",hairspring:"steel-overcoil",
  bph:"28800",regulator:"index",shock:"basic",winding:"manual",complications:[],finish:[],house:[]};

/* look an option up; undefined if the id is not in the slot */
function part(slot,id){const L=PARTS[slot];if(!L)return undefined;for(const o of L)if(o.id===id)return o;return undefined;}
