#!/usr/bin/env node
/**
 * Proof-of-capability: does an aging QB funnel more targets to the RBs?
 *
 * Computes, from REAL nflverse play-level weekly data (free, MIT), the RB share
 * of team targets bucketed by the starting QB's age — the exact class of
 * data-driven trend the engine should surface before a pundit does.
 *
 * Pure Node, no deps. Reads season CSVs from a local dir (default /tmp/nfl),
 * fetched from github.com/nflverse/nflverse-data releases.
 *
 * Usage: node qb-age-rb-target-share.mjs [dataDir] [startYear] [endYear]
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = process.argv[2] || "/tmp/nfl";
const Y0 = Number(process.argv[3] || 2016);
const Y1 = Number(process.argv[4] || 2024);
const MIN_TEAM_TARGETS = 12; // ignore weird low-volume team-weeks

// ── tiny CSV parser (quote-aware) ───────────────────────────────────────────
function parseCsv(text) {
  const rows = [];
  let i = 0, field = "", row = [], inQ = false;
  const pushF = () => { row.push(field); field = ""; };
  const pushR = () => { pushF(); rows.push(row); row = []; };
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") pushF();
    else if (c === "\n") pushR();
    else if (c === "\r") { /* skip */ }
    else field += c;
    i++;
  }
  if (field.length || row.length) pushR();
  const header = rows.shift();
  const idx = Object.fromEntries(header.map((h, j) => [h, j]));
  return { rows, idx };
}

function ageAt(birthISO, seasonYear) {
  if (!birthISO) return null;
  const b = new Date(birthISO + "T00:00:00Z");
  if (isNaN(b)) return null;
  const ref = new Date(Date.UTC(seasonYear, 8, 1)); // Sep 1 of the season
  let age = ref.getUTCFullYear() - b.getUTCFullYear();
  const m = ref.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && ref.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

// ── load ─────────────────────────────────────────────────────────────────────
const obs = []; // { season, qbAge, rbShare, teamTargets }
let teamWeeks = 0;

for (let y = Y0; y <= Y1; y++) {
  let rosterTxt, wkTxt;
  try {
    rosterTxt = readFileSync(join(DIR, `roster_${y}.csv`), "utf8");
    wkTxt = readFileSync(join(DIR, `wk_${y}.csv`), "utf8");
  } catch { continue; }

  // gsis_id -> birth_date for this season
  const r = parseCsv(rosterTxt);
  const birth = new Map();
  for (const row of r.rows) {
    const id = row[r.idx["gsis_id"]];
    const bd = row[r.idx["birth_date"]];
    if (id) birth.set(id, bd);
  }

  const w = parseCsv(wkTxt);
  const T = (row, k) => Number(row[w.idx[k]] || 0);
  // group by team-week
  const groups = new Map(); // key season|week|team
  for (const row of w.rows) {
    const team = row[w.idx["recent_team"]];
    const week = row[w.idx["week"]];
    if (!team || !week) continue;
    const key = `${week}|${team}`;
    let g = groups.get(key);
    if (!g) { g = { totalTargets: 0, rbTargets: 0, qbs: [] }; groups.set(key, g); }
    const pos = row[w.idx["position"]];
    const targets = T(row, "targets");
    g.totalTargets += targets;
    if (pos === "RB") g.rbTargets += targets;
    if (pos === "QB") g.qbs.push({ id: row[w.idx["player_id"]], att: T(row, "attempts") });
  }

  for (const g of groups.values()) {
    if (g.totalTargets < MIN_TEAM_TARGETS || g.qbs.length === 0) continue;
    const starter = g.qbs.sort((a, b) => b.att - a.att)[0];
    if (!starter || starter.att < 10) continue; // a real start
    const age = ageAt(birth.get(starter.id), y);
    if (age == null || age < 20 || age > 45) continue;
    teamWeeks++;
    obs.push({ season: y, qbAge: age, rbShare: g.rbTargets / g.totalTargets, teamTargets: g.totalTargets });
  }
}

// ── stats helpers ─────────────────────────────────────────────────────────────
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
function welch(a, b) {
  const ma = mean(a), mb = mean(b);
  const va = a.reduce((s, x) => s + (x - ma) ** 2, 0) / (a.length - 1);
  const vb = b.reduce((s, x) => s + (x - mb) ** 2, 0) / (b.length - 1);
  const se = Math.sqrt(va / a.length + vb / b.length);
  const z = (ma - mb) / se;
  // two-sided p via normal approx (n large)
  const p = 2 * (1 - 0.5 * (1 + erf(Math.abs(z) / Math.SQRT2)));
  return { ma, mb, diff: ma - mb, z, p };
}
function erf(x) {
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return y;
}

// ── report ─────────────────────────────────────────────────────────────────────
console.log(`\nnflverse ${Y0}-${Y1} — RB share of team targets by starting-QB age`);
console.log(`team-weeks analyzed: ${teamWeeks}\n`);

const buckets = [["≤26", a => a <= 26], ["27-29", a => a >= 27 && a <= 29], ["30-33", a => a >= 30 && a <= 33], ["34-36", a => a >= 34 && a <= 36], ["37+", a => a >= 37]];
console.log("age bucket   team-weeks   mean RB target share");
for (const [label, f] of buckets) {
  const s = obs.filter(o => f(o.qbAge)).map(o => o.rbShare);
  if (!s.length) continue;
  console.log(`${label.padEnd(11)}  ${String(s.length).padStart(9)}   ${(mean(s) * 100).toFixed(1)}%`);
}

const young = obs.filter(o => o.qbAge < 34).map(o => o.rbShare);
const old = obs.filter(o => o.qbAge >= 34).map(o => o.rbShare);
const w = welch(old, young);
console.log(`\nCohort test — QB 34+ vs <34:`);
console.log(`  QB <34:  n=${young.length}  mean RB target share = ${(w.mb * 100).toFixed(1)}%`);
console.log(`  QB 34+:  n=${old.length}  mean RB target share = ${(w.ma * 100).toFixed(1)}%`);
console.log(`  absolute delta: ${(w.diff * 100).toFixed(1)} pts   relative: ${((w.diff / w.mb) * 100).toFixed(1)}%`);
console.log(`  Welch z=${w.z.toFixed(2)}  p=${w.p < 1e-4 ? w.p.toExponential(2) : w.p.toFixed(4)}  ${w.p < 0.05 ? "(significant)" : "(not significant)"}`);
