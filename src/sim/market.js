/* ---- market.js: what a piece is worth and how fast it sells (PR 5), the market era table (smartwatch shift, PR 6).
   Then the WATCH_SIM export object.
   ECON            the pricing numbers: labour per bench hour, the markup (more for prestige), case markup, how a price
                   above or below value changes a buyer's mind, the trade batch rates.
   pieceValue(r, cert, cs)   r = simulate(); cert = best certificate; cs = the case row ({cost, mult}) or null.
   buyChance(value, price, cap)   the chance one buyer who likes it pays this price (above cap, much less).
   walkInCap(tier, year)     what walk-in buyers will pay at most, by press tier: the rest is for auctions.
   tradeTerms(r, batch)      a trade movement: {hours, parts, price} each; batch multiplies the hours (CNC).
   MARKET_ERA      the smartwatch years (2015-2018: trade, retail and repairs down, the press less taken with accuracy)
                   and the collectors' return after (from 2019: collector money up, finishing worth more).
   eraMult(year, kind)       the market era's factor for "retail", "trade", "repairs", "collector", "press", "finish". ---- */
const ECON={labour:42,markup:1.45,markupPrestige:.05,caseMarkup:1.5,buyBase:.7,elastic:3,buyMax:.95,
  walkIn:{cap:15000,perTier:.35},   // walk-in buyers rarely pay above cap (x (1 + perTier x press tier)): dearer pieces go to auction
  trade:{eff:.5,labour:18,margin:1.12}};
const MARKET_ERA=[
  {from:2015,to:2018,trade:.65,retail:.8,repairs:.6,press:.7},
  {from:2019,to:9999,collector:1.4,finish:1.25}];
function pieceValue(r,cert,cs){
  const base=(r.cost+r.hours*ECON.labour)*(ECON.markup+ECON.markupPrestige*r.prestige)*(CERT_MULT[cert||"none"]||1);
  return Math.round((base+(cs?cs.cost*ECON.caseMarkup:0))*(cs&&cs.mult||1)/10)*10;}
function buyChance(value,price,cap){const p=Math.max(1,price),f=cap&&p>cap?Math.pow(cap/p,2):1;
  return Math.max(0,Math.min(ECON.buyMax,ECON.buyBase*Math.pow(value/p,ECON.elastic)*f));}
function walkInCap(tier,year){return ECON.walkIn.cap*(1+ECON.walkIn.perTier*(tier||0))*eraMult(year,"retail");}
function tradeTerms(r,batch){const hours=r.hours*ECON.trade.eff*(batch||1);
  return{hours,parts:r.cost,price:Math.round((r.cost+hours*ECON.trade.labour)*ECON.trade.margin/5)*5};}
function eraMult(year,kind){let f=1;for(const e of MARKET_ERA)if(year>=e.from&&year<=e.to&&e[kind])f*=e[kind];return f;}
return{SLOTS,MULTI,PARTS,DEFAULT_CFG,part,normCfg,POSITIONS,TEMPS,SKILL_NAMES,K,simulate,ampAt,rateAt,beatAt,hashStr,rng,COMBOS,prepModel,CERT,CERT_ORDER,CERT_MULT,TRIAL,ADJ,runTrial,verdict,adjustPiece,hoursFor,certOdds,CONTEST,contestIndex,runContest,MARKET_ERA,ECON,pieceValue,buyChance,walkInCap,tradeTerms,eraMult};
})();
if(typeof module!=="undefined"&&module.exports)module.exports=WATCH_SIM;
</script>
