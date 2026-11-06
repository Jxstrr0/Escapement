/* ---- market.js: what a piece is worth and how fast it sells (PR 5), the market era table (smartwatch shift, PR 6).
   Then the WATCH_SIM export object.
   ECON            the pricing numbers: labour per bench hour, the markup (more for prestige), case markup, how a price
                   above or below value changes a buyer's mind, the trade batch rates.
   pieceValue(r, cert, cs)   r = simulate(); cert = best certificate; cs = the case row ({cost, mult}) or null.
   buyChance(value, price)   the chance one buyer who likes it pays this price.
   tradeTerms(r, batch)      a trade movement: {hours, parts, price} each; batch multiplies the hours (CNC).
   eraMult(year, kind)       the market era's factor for "retail", "trade", "repairs", "collector" (1 until PR 6). ---- */
const ECON={labour:42,markup:1.45,markupPrestige:.11,caseMarkup:1.5,buyBase:.7,elastic:3,buyMax:.95,
  trade:{eff:.5,labour:18,margin:1.12}};
const MARKET_ERA=[];
function pieceValue(r,cert,cs){
  const base=(r.cost+r.hours*ECON.labour)*(ECON.markup+ECON.markupPrestige*r.prestige)*(CERT_MULT[cert||"none"]||1);
  return Math.round((base+(cs?cs.cost*ECON.caseMarkup:0))*(cs&&cs.mult||1)/10)*10;}
function buyChance(value,price){return Math.max(0,Math.min(ECON.buyMax,ECON.buyBase*Math.pow(value/Math.max(1,price),ECON.elastic)));}
function tradeTerms(r,batch){const hours=r.hours*ECON.trade.eff*(batch||1);
  return{hours,parts:r.cost,price:Math.round((r.cost+hours*ECON.trade.labour)*ECON.trade.margin/5)*5};}
function eraMult(year,kind){let f=1;for(const e of MARKET_ERA)if(year>=e.from&&year<=e.to&&e[kind])f*=e[kind];return f;}
return{SLOTS,MULTI,PARTS,DEFAULT_CFG,part,normCfg,POSITIONS,TEMPS,SKILL_NAMES,K,simulate,ampAt,rateAt,beatAt,hashStr,rng,COMBOS,prepModel,CERT,CERT_ORDER,CERT_MULT,TRIAL,ADJ,runTrial,verdict,adjustPiece,hoursFor,certOdds,MARKET_ERA,ECON,pieceValue,buyChance,tradeTerms,eraMult};
})();
if(typeof module!=="undefined"&&module.exports)module.exports=WATCH_SIM;
</script>
