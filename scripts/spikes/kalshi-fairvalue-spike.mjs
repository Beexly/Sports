/**
 * SPIKE (read-only, no auth, no orders) — prove the GSE game -> Kalshi market
 * mapping and derive a de-vigged fair-value probability for CLV (#2).
 *
 * Kalshi public market data needs NO API key / NO request signing. We touch ONLY
 * GET /events and GET /markets. We NEVER touch portfolio/order endpoints — placing
 * an order would be automated betting (prohibited).
 *
 * Run: NODE_OPTIONS=--use-system-ca node scripts/spikes/kalshi-fairvalue-spike.mjs
 * (curl fails on this TLS-intercepted network; Node + system CA works.)
 */

const BASE = "https://external-api.kalshi.com/trade-api/v2";

async function get(path) {
  const r = await fetch(BASE + path, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status}`);
  return r.json();
}

/** Map an internal GSE game to a Kalshi event ticker.
 *  Grammar observed: KX<LEAGUE>GAME-<YYMMMDD><AWAY><HOME>  (abbrevs are Kalshi's). */
function toEventTicker({ league, date, awayAbbr, homeAbbr }) {
  const d = new Date(date);
  const MON = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const yymmmdd = `${String(d.getUTCFullYear()).slice(2)}${MON[d.getUTCMonth()]}${String(d.getUTCDate()).padStart(2,"0")}`;
  return `KX${league}GAME-${yymmmdd}${awayAbbr}${homeAbbr}`;
}

/** Implied prob of a YES contract from its quote. Kalshi exposes prices as
 *  *_dollars strings already in [0,1]. Prefer the bid/ask mid; fall back to
 *  last trade. Returns null if no live quote. */
function impliedYes(m) {
  const bid = Number(m.yes_bid_dollars), ask = Number(m.yes_ask_dollars), last = Number(m.last_price_dollars);
  if (Number.isFinite(bid) && Number.isFinite(ask) && (bid > 0 || ask > 0)) return (bid + ask) / 2;
  if (Number.isFinite(last) && last > 0) return last;
  return null;
}

async function fairValueForEvent(eventTicker) {
  const { markets } = await get(`/markets?event_ticker=${encodeURIComponent(eventTicker)}&limit=10`);
  const sides = [];
  for (const m of markets) {
    // single-market fetch carries the full live quote fields
    const { market } = await get(`/markets/${encodeURIComponent(m.ticker)}`);
    sides.push({ team: market.yes_sub_title, ticker: market.ticker, raw: impliedYes(market),
                 quote: { yes_bid: market.yes_bid_dollars, yes_ask: market.yes_ask_dollars, last: market.last_price_dollars } });
  }
  // de-vig: normalise the two YES implieds so they sum to 1 (removes the spread/overround)
  const priced = sides.filter(s => s.raw != null);
  const sum = priced.reduce((a, s) => a + s.raw, 0);
  for (const s of sides) s.fair = (s.raw != null && sum > 0) ? s.raw / sum : null;
  return { eventTicker, sides, overround: sum };
}

async function main() {
  // candidate internal games (NBA Finals SAS-NYK) -> mapped tickers
  const games = [
    { league: "NBA", date: "2026-06-03", awayAbbr: "NYK", homeAbbr: "SAS" }, // Game 1
    { league: "NBA", date: "2026-06-05", awayAbbr: "NYK", homeAbbr: "SAS" }, // Game 2
  ];
  for (const g of games) {
    const et = toEventTicker(g);
    try {
      const fv = await fairValueForEvent(et);
      console.log(`\nGAME ${g.awayAbbr}@${g.homeAbbr} ${g.date}  ->  ${et}  (overround ${(fv.overround*100).toFixed(1)}%)`);
      for (const s of fv.sides) {
        const raw = s.raw == null ? "  n/a" : `${(s.raw*100).toFixed(1)}%`;
        const fair = s.fair == null ? "  n/a" : `${(s.fair*100).toFixed(1)}%`;
        console.log(`   ${s.team.padEnd(14)} raw ${raw.padStart(6)}  ->  fair ${fair.padStart(6)}   [${s.ticker}]  bid=${s.quote.yes_bid} ask=${s.quote.yes_ask} last=${s.quote.last}`);
      }
    } catch (e) {
      console.log(`\nGAME ${g.awayAbbr}@${g.homeAbbr} ${g.date}  ->  ${et}  ERROR ${e.message}`);
    }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
