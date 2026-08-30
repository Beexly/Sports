#!/usr/bin/env node
/**
 * Breadth proof: pull a PREMIUM nflverse dataset (Next Gen Stats — tracking-
 * derived receiver separation, which exists in no box score) live over the
 * network, gunzip it, join player age from local rosters, and measure the WR
 * separation aging curve. Mirrors the fetch+gunzip+parse path of
 * packages/data-ingestion/src/nflverse-source.ts.
 *
 * Rosters are read locally from a dir (default /tmp/nfl, roster_<year>.csv).
 * Usage: node nflverse-ngs-separation-by-age.mjs [rosterDir] [startYear] [endYear]
 */
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";

const DIR = process.argv[2] || "/tmp/nfl";
const Y0 = Number(process.argv[3] || 2017);
const Y1 = Number(process.argv[4] || 2024);
const BASE = "https://github.com/nflverse/nflverse-data/releases/download";

function parseCsv(text) {
  const rows = []; let f = "", row = [], q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n") { row.push(f); rows.push(row); f = ""; row = []; }
    else if (c !== "\r") f += c;
  }
  if (f.length || row.length) { row.push(f); rows.push(row); }
  const h = rows.shift(); const idx = Object.fromEntries(h.map((x, j) => [x, j]));
  return { rows, idx };
}

function ageAt(birthISO, year) {
  if (!birthISO) return null;
  const b = new Date(birthISO + "T00:00:00Z"); if (isNaN(b)) return null;
  const ref = new Date(Date.UTC(year, 8, 1));
  let a = ref.getUTCFullYear() - b.getUTCFullYear();
  const m = ref.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && ref.getUTCDate() < b.getUTCDate())) a--;
  return a;
}

async function fetchGz(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return url.endsWith(".gz") ? gunzipSync(buf).toString("utf8") : buf.toString("utf8");
}

const obs = []; // { age, sep, targets }
for (let y = Y0; y <= Y1; y++) {
  // age map from local roster
  let birth = new Map();
  try {
    const r = parseCsv(readFileSync(`${DIR}/roster_${y}.csv`, "utf8"));
    for (const row of r.rows) birth.set(row[r.idx["gsis_id"]], row[r.idx["birth_date"]]);
  } catch { /* no roster this year */ }

  let ngs;
  try { ngs = parseCsv(await fetchGz(`${BASE}/nextgen_stats/ngs_${y}_receiving.csv.gz`)); }
  catch (e) { console.error(`skip ${y}: ${e.message}`); continue; }
  const I = ngs.idx;
  for (const row of ngs.rows) {
    if ((row[I["season_type"]] || "REG") !== "REG") continue;
    if (Number(row[I["week"]] || 0) === 0) continue;            // skip season-aggregate rows
    if ((row[I["player_position"]] || row[I["player_gsis_id"] && "WR"]) !== "WR") continue;
    const sep = Number(row[I["avg_separation"]]);
    const tgt = Number(row[I["targets"]] || 0);
    if (!isFinite(sep) || sep <= 0 || tgt < 3) continue;
    const age = ageAt(birth.get(row[I["player_gsis_id"]]), y);
    if (age == null || age < 20 || age > 40) continue;
    obs.push({ age, sep, targets: tgt });
  }
}

const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
function erf(x){const t=1/(1+0.3275911*Math.abs(x));const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return x<0?-y:y;}
function welch(a,b){const ma=mean(a),mb=mean(b);const va=a.reduce((s,x)=>s+(x-ma)**2,0)/(a.length-1);const vb=b.reduce((s,x)=>s+(x-mb)**2,0)/(b.length-1);const se=Math.sqrt(va/a.length+vb/b.length);const z=(ma-mb)/se;return{ma,mb,z,p:2*(1-0.5*(1+erf(Math.abs(z)/Math.SQRT2)))};}

console.log(`\nNGS receiving — WR avg separation (yds) by age, ${Y0}-${Y1}`);
console.log(`player-weeks: ${obs.length}\n`);
const buckets = [["≤24", a => a <= 24], ["25-27", a => a >= 25 && a <= 27], ["28-30", a => a >= 28 && a <= 30], ["31+", a => a >= 31]];
console.log("age      player-weeks   mean separation");
for (const [label, f] of buckets) {
  const s = obs.filter(o => f(o.age)).map(o => o.sep);
  if (s.length) console.log(`${label.padEnd(8)} ${String(s.length).padStart(9)}   ${mean(s).toFixed(2)} yd`);
}
const young = obs.filter(o => o.age <= 27).map(o => o.sep);
const old = obs.filter(o => o.age >= 31).map(o => o.sep);
if (young.length && old.length) {
  const w = welch(old, young);
  console.log(`\n31+ vs ≤27:  ${w.ma.toFixed(2)} vs ${w.mb.toFixed(2)} yd  (${((w.ma - w.mb)).toFixed(2)} yd, ${(((w.ma-w.mb)/w.mb)*100).toFixed(1)}%)  z=${w.z.toFixed(2)} p=${w.p < 1e-4 ? w.p.toExponential(2) : w.p.toFixed(4)}`);
}
