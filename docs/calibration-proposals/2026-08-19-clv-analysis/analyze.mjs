/**
 * L-6 — CLV analysis on docs/ops/calibration/2026-08-18-clv-census.csv
 *
 * Pure computation. No DB, no network, no fitting, no floor/gate/3-streak edits.
 * Time order preserved (CSV is generated_at ASC). Never shuffled.
 *
 * Every printed number is produced in this file. Line refs in findings.md
 * point back here.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../..");
const CSV_PATH = resolve(REPO, "docs/ops/calibration/2026-08-18-clv-census.csv");
const OUT_DIR = HERE;
const BREAKEVEN = 0.524;
const Z95 = 1.959963984540054;

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trimEnd().split(/\r?\n/);
  const header = splitCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = splitCsvLine(lines[i]);
    const rec = {};
    for (let j = 0; j < header.length; j++) rec[header[j]] = cols[j] ?? "";
    rec._line = i + 1;
    rows.push(rec);
  }
  return { header, rows };
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        q = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      q = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function num(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function present(v) {
  return v !== null && v !== undefined && String(v).trim() !== "";
}

function wilson(successes, n, z = Z95) {
  if (n <= 0) return { lo: null, hi: null, p: null, n: 0, x: 0 };
  const p = successes / n;
  const z2 = z * z;
  const den = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / den;
  const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / den;
  return { lo: center - margin, hi: center + margin, p, n, x: successes };
}

function mean(xs) {
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function quantile(xs, q) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

function ranks(xs) {
  const idx = xs.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const r = new Array(xs.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1].v === idx[i].v) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k].i] = avg;
    i = j + 1;
  }
  return r;
}

function pearson(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let nume = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    nume += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return null;
  return nume / Math.sqrt(dx * dy);
}

function spearman(xs, ys) {
  if (xs.length !== ys.length || xs.length < 2) return null;
  return pearson(ranks(xs), ranks(ys));
}

function fmt(x, d = 6) {
  if (x === null || x === undefined) return "n/a";
  return Number(x).toFixed(d);
}

function pct(x, d = 2) {
  if (x === null || x === undefined) return "n/a";
  return (100 * x).toFixed(d) + "%";
}

function hasLock(r) {
  return num(r.clv_lock_line) !== null || num(r.clv_lock_price) !== null;
}
function hasClose(r) {
  return num(r.clv_close_line) !== null || num(r.clv_close_price) !== null;
}
function hasBoth(r) {
  return hasLock(r) && hasClose(r);
}
function isGraded(r) {
  return present(r.clv_verdict) && num(r.clv_value) !== null;
}

function monthKey(iso) {
  if (!iso) return "unknown";
  return String(iso).slice(0, 7);
}

function decileIndex(rank1toN, n) {
  // rank 1 = lowest. 10 buckets, last absorbs remainder.
  const d = Math.min(9, Math.floor(((rank1toN - 1) / n) * 10));
  return d;
}

function summarizeGroup(rows, label) {
  const graded = rows.filter(isGraded);
  const beat = graded.filter((r) => r.clv_verdict === "BEAT_CLOSE");
  const matched = graded.filter((r) => r.clv_verdict === "MATCHED_CLOSE");
  const lost = graded.filter((r) => r.clv_verdict === "LOST_TO_CLOSE");
  const w = wilson(beat.length, graded.length);
  const values = graded.map((r) => num(r.clv_value));
  const points = graded.filter((r) => r.clv_kind === "POINTS").map((r) => num(r.clv_value));
  const probs = graded.filter((r) => r.clv_kind === "PROBABILITY").map((r) => num(r.clv_value));
  return {
    label,
    n_rows: rows.length,
    n_lock: rows.filter(hasLock).length,
    n_close: rows.filter(hasClose).length,
    n_both: rows.filter(hasBoth).length,
    n_graded: graded.length,
    n_beat: beat.length,
    n_matched: matched.length,
    n_lost: lost.length,
    win_rate: w.p,
    wilson_lo: w.lo,
    wilson_hi: w.hi,
    vs_524: w.p === null ? null : w.p - BREAKEVEN,
    clears_524: w.lo !== null && w.lo >= BREAKEVEN,
    n_moved: beat.length + lost.length,
    moved_win_rate: beat.length + lost.length ? beat.length / (beat.length + lost.length) : null,
    mean_clv: mean(values),
    median_clv: median(values),
    n_points: points.length,
    mean_points: mean(points),
    median_points: median(points),
    n_prob: probs.length,
    mean_prob: mean(probs),
    median_prob: median(probs),
    mean_pp: mean(probs) === null ? null : mean(probs) * 100,
    median_pp: median(probs) === null ? null : median(probs) * 100,
  };
}

function mdTable(headers, rows) {
  const h = "| " + headers.join(" | ") + " |";
  const s = "| " + headers.map(() => "---").join(" | ") + " |";
  const body = rows.map((r) => "| " + r.join(" | ") + " |").join("\n");
  return [h, s, body].join("\n");
}

const raw = readFileSync(CSV_PATH, "utf8");
const { header, rows } = parseCsv(raw);

if (rows.length === 0) {
  console.error("CSV empty:", CSV_PATH);
  process.exit(1);
}

// Time order check — never shuffle; fail loud if unsorted.
let timeOk = true;
for (let i = 1; i < rows.length; i++) {
  if (rows[i].generated_at < rows[i - 1].generated_at) {
    timeOk = false;
    break;
  }
}

const fieldCoverage = {};
for (const h of header) {
  const filled = rows.filter((r) => present(r[h])).length;
  fieldCoverage[h] = { filled, n: rows.length, pct: filled / rows.length };
}

const overall = summarizeGroup(rows, "all");
const lockClose = rows.filter(hasBoth);
const graded = rows.filter(isGraded);

// Distribution of graded clv_value
const values = graded.map((r) => num(r.clv_value));
const dist = {
  min: values.length ? Math.min(...values) : null,
  p05: quantile(values, 0.05),
  p10: quantile(values, 0.10),
  p25: quantile(values, 0.25),
  p50: quantile(values, 0.50),
  p75: quantile(values, 0.75),
  p90: quantile(values, 0.90),
  p95: quantile(values, 0.95),
  max: values.length ? Math.max(...values) : null,
  n_positive: values.filter((v) => v > 0).length,
  n_zero: values.filter((v) => v === 0).length,
  n_negative: values.filter((v) => v < 0).length,
};

// (d) cuts
const sports = [...new Set(rows.map((r) => r.sport || "UNKNOWN"))].sort();
const bySport = sports.map((s) => summarizeGroup(rows.filter((r) => (r.sport || "UNKNOWN") === s), s));

const types = [...new Set(rows.map((r) => r.pick_type || "UNKNOWN"))].sort();
const byType = types.map((t) => summarizeGroup(rows.filter((r) => (r.pick_type || "UNKNOWN") === t), t));

// Confidence deciles on ALL rows (time-ordered ranks of confidence)
const confs = rows.map((r) => num(r.confidence_pct) ?? 0);
const confRanks = ranks(confs);
const byConfDecile = [];
for (let d = 0; d < 10; d++) {
  const bucket = rows.filter((_, i) => decileIndex(confRanks[i], rows.length) === d);
  const g = summarizeGroup(bucket, `D${d + 1}`);
  g.conf_min = bucket.length ? Math.min(...bucket.map((r) => num(r.confidence_pct))) : null;
  g.conf_max = bucket.length ? Math.max(...bucket.map((r) => num(r.confidence_pct))) : null;
  byConfDecile.push(g);
}

// (e) monthly
const months = [...new Set(rows.map((r) => monthKey(r.generated_at)))].sort();
const byMonth = months.map((m) => summarizeGroup(rows.filter((r) => monthKey(r.generated_at) === m), m));

// (f) Spearman: confidence vs clv_value on graded rows; also vs beat indicator
const gradedConf = graded.map((r) => num(r.confidence_pct));
const gradedClv = graded.map((r) => num(r.clv_value));
const gradedBeat = graded.map((r) => (r.clv_verdict === "BEAT_CLOSE" ? 1 : 0));
const rhoClv = spearman(gradedConf, gradedClv);
const rhoBeat = spearman(gradedConf, gradedBeat);

// Decile table on GRADED only (so (f) is not mixed with ungraded)
const gConfs = graded.map((r) => num(r.confidence_pct) ?? 0);
const gRanks = ranks(gConfs);
const gradedDeciles = [];
for (let d = 0; d < 10; d++) {
  const bucket = graded.filter((_, i) => decileIndex(gRanks[i], graded.length) === d);
  const g = summarizeGroup(bucket, `G-D${d + 1}`);
  g.conf_min = bucket.length ? Math.min(...bucket.map((r) => num(r.confidence_pct))) : null;
  g.conf_max = bucket.length ? Math.max(...bucket.map((r) => num(r.confidence_pct))) : null;
  gradedDeciles.push(g);
}

const coverageTooThin = overall.n_graded < 100 && lockClose.length < 100;

const findings = [];
findings.push(`# L-6 — CLV analysis of the 2026-08-18 census`);
findings.push(``);
findings.push(`Standalone script: \`docs/calibration-proposals/2026-08-19-clv-analysis/analyze.mjs\``);
findings.push(`CSV: \`docs/ops/calibration/2026-08-18-clv-census.csv\``);
findings.push(`Rows parsed: **${rows.length}** (header excluded). Time-ordered by \`generated_at\` ASC: **${timeOk ? "yes" : "NO — sort violation"}**.`);
findings.push(`No fitting. No holdout training. No floor/gate/3-streak edits.`);
findings.push(``);
findings.push(`## (a) What CLV fields the census carries — coverage is the first honest number`);
findings.push(``);
findings.push(`Production CLV columns on \`picks\` (see \`packages/db/prisma/schema.prisma\` Pick model):`);
findings.push(`- lock: \`clv_lock_line\` (points at publish), \`clv_lock_price\` (American at publish)`);
findings.push(`- close: \`clv_close_line\`, \`clv_close_price\``);
findings.push(`- graded: \`clv_kind\` (POINTS | PROBABILITY), \`clv_value\` (positive = beat close), \`clv_verdict\` (BEAT_CLOSE | MATCHED_CLOSE | LOST_TO_CLOSE)`);
findings.push(`Also joined: \`sport\`, \`pick_type\`, \`confidence_pct\`, proof-receipt \`entryOdds\` / \`marketFairProb\`.`);
findings.push(``);
findings.push(mdTable(
  ["field", "non-empty n", "of", "pct"],
  header.map((h) => [h, String(fieldCoverage[h].filled), String(fieldCoverage[h].n), pct(fieldCoverage[h].pct)])
));
findings.push(``);
findings.push(`| pair | n | of | note |`);
findings.push(`| --- | --- | --- | --- |`);
findings.push(`| lock (line or price) | ${overall.n_lock} | ${rows.length} | publish-time number |`);
findings.push(`| close (line or price) | ${overall.n_close} | ${rows.length} | settlement close |`);
findings.push(`| **lock AND close** | **${overall.n_both}** | ${rows.length} | both ends of the CLV pair |`);
findings.push(`| graded (\`clv_verdict\` + \`clv_value\`) | ${overall.n_graded} | ${rows.length} | production grade |`);
findings.push(``);
if (coverageTooThin) {
  findings.push(`**INSUFFICIENT DATA.** Graded n=${overall.n_graded}, lock+close n=${overall.n_both}. Both are below 100. The 52.4% ESTABLISHED gate needs ≥500 settled **with verified CLV**. This census cannot support a CLV claim. The numbers below are descriptive of the thin slice that exists — they are not a launch proof.`);
  findings.push(``);
}

findings.push(`## (b) CLV win rate vs 52.4% break-even`);
findings.push(``);
findings.push(`Win = \`clv_verdict === BEAT_CLOSE\`. Denominator = graded n only (un-graded rows are not losses; they are missing). Wilson 95% interval. Script: \`wilson()\` / \`summarizeGroup()\`.`);
findings.push(``);
findings.push(`| metric | value | n |`);
findings.push(`| --- | --- | --- |`);
findings.push(`| beat close | ${overall.n_beat} | ${overall.n_graded} |`);
findings.push(`| matched close | ${overall.n_matched} | ${overall.n_graded} |`);
findings.push(`| lost to close | ${overall.n_lost} | ${overall.n_graded} |`);
findings.push(`| CLV win rate | ${pct(overall.win_rate, 2)} | ${overall.n_graded} |`);
findings.push(`| Wilson 95% CI | [${pct(overall.wilson_lo, 2)}, ${pct(overall.wilson_hi, 2)}] | ${overall.n_graded} |`);
findings.push(`| vs 52.4% | ${overall.vs_524 === null ? "n/a" : (overall.vs_524 >= 0 ? "+" : "") + pct(overall.vs_524, 2)} | |`);
findings.push(`| Wilson lower bound ≥ 52.4%? | ${overall.clears_524 ? "YES" : "NO"} | |`);
findings.push(`| beat / (beat+lost), MATCHED excluded | ${pct(overall.moved_win_rate)} | ${overall.n_moved} |`);
findings.push(``);

findings.push(`## (c) Mean / median CLV and the distribution`);
findings.push(``);
findings.push(`\`clv_value\` units are mixed: POINTS (spread/total) vs PROBABILITY (moneyline implied-prob delta). Do not pool them into one "cents" number. Script reports them separately.`);
findings.push(``);
findings.push(`| slice | n | mean | median |`);
findings.push(`| --- | --- | --- | --- |`);
findings.push(`| all graded \`clv_value\` (mixed units — do not interpret) | ${overall.n_graded} | ${fmt(overall.mean_clv)} | ${fmt(overall.median_clv)} |`);
findings.push(`| POINTS (points of line) | ${overall.n_points} | ${fmt(overall.mean_points)} | ${fmt(overall.median_points)} |`);
findings.push(`| PROBABILITY (implied-prob) | ${overall.n_prob} | ${fmt(overall.mean_prob)} | ${fmt(overall.median_prob)} |`);
findings.push(`| PROBABILITY in percentage points | ${overall.n_prob} | ${fmt(overall.mean_pp, 4)} | ${fmt(overall.median_pp, 4)} |`);
findings.push(``);
findings.push(`Distribution of graded \`clv_value\` (mixed units; use only to check outlier dominance):`);
findings.push(``);
findings.push(`| q | value |`);
findings.push(`| --- | --- |`);
findings.push(`| min | ${fmt(dist.min)} |`);
findings.push(`| p05 | ${fmt(dist.p05)} |`);
findings.push(`| p10 | ${fmt(dist.p10)} |`);
findings.push(`| p25 | ${fmt(dist.p25)} |`);
findings.push(`| p50 | ${fmt(dist.p50)} |`);
findings.push(`| p75 | ${fmt(dist.p75)} |`);
findings.push(`| p90 | ${fmt(dist.p90)} |`);
findings.push(`| p95 | ${fmt(dist.p95)} |`);
findings.push(`| max | ${fmt(dist.max)} |`);
findings.push(`| n > 0 | ${dist.n_positive} |`);
findings.push(`| n = 0 | ${dist.n_zero} |`);
findings.push(`| n < 0 | ${dist.n_negative} |`);
findings.push(``);
if (values.length) {
  const abs = values.map((v) => Math.abs(v));
  const top = [...values].sort((a, b) => Math.abs(b) - Math.abs(a)).slice(0, 5);
  const withoutTop = values.length > 5 ? values.filter((v) => !top.includes(v) || top.filter((t) => t === v).length > 1) : values;
  findings.push(`Largest-magnitude five graded values: ${top.map((v) => fmt(v, 4)).join(", ")}.`);
  findings.push(`Mean of |clv_value|: ${fmt(mean(abs))}. If mean and median disagree in sign, the mean is outlier-driven.`);
  findings.push(``);
}

findings.push(`## (d) Cuts — sport, confidence decile, pick type`);
findings.push(``);
findings.push(`### By sport`);
findings.push(mdTable(
  ["sport", "n", "graded", "beat", "win rate", "Wilson 95%", "vs 52.4%", "mean POINTS", "mean PROB"],
  bySport.map((g) => [
    g.label,
    String(g.n_rows),
    String(g.n_graded),
    String(g.n_beat),
    pct(g.win_rate),
    g.wilson_lo === null ? "n/a" : `[${pct(g.wilson_lo)}, ${pct(g.wilson_hi)}]`,
    g.vs_524 === null ? "n/a" : ((g.vs_524 >= 0 ? "+" : "") + pct(g.vs_524)),
    fmt(g.mean_points, 4),
    fmt(g.mean_prob, 4),
  ])
));
findings.push(``);
findings.push(`### By pick type`);
findings.push(mdTable(
  ["pick_type", "n", "graded", "beat", "win rate", "Wilson 95%", "vs 52.4%", "mean value"],
  byType.map((g) => [
    g.label,
    String(g.n_rows),
    String(g.n_graded),
    String(g.n_beat),
    pct(g.win_rate),
    g.wilson_lo === null ? "n/a" : `[${pct(g.wilson_lo)}, ${pct(g.wilson_hi)}]`,
    g.vs_524 === null ? "n/a" : ((g.vs_524 >= 0 ? "+" : "") + pct(g.vs_524)),
    fmt(g.mean_clv, 4),
  ])
));
findings.push(``);
findings.push(`### By confidence decile (all ${rows.length} rows; D1 = lowest confidence)`);
findings.push(mdTable(
  ["decile", "conf range", "n", "graded", "beat", "win rate", "Wilson 95%", "vs 52.4%"],
  byConfDecile.map((g) => [
    g.label,
    g.conf_min === null ? "n/a" : `${g.conf_min}–${g.conf_max}`,
    String(g.n_rows),
    String(g.n_graded),
    String(g.n_beat),
    pct(g.win_rate),
    g.wilson_lo === null ? "n/a" : `[${pct(g.wilson_lo)}, ${pct(g.wilson_hi)}]`,
    g.vs_524 === null ? "n/a" : ((g.vs_524 >= 0 ? "+" : "") + pct(g.vs_524)),
  ])
));
findings.push(``);

findings.push(`## (e) CLV win rate by month (generated_at)`);
findings.push(mdTable(
  ["month", "n", "graded", "beat", "win rate", "Wilson 95%", "vs 52.4%"],
  byMonth.map((g) => [
    g.label,
    String(g.n_rows),
    String(g.n_graded),
    String(g.n_beat),
    pct(g.win_rate),
    g.wilson_lo === null ? "n/a" : `[${pct(g.wilson_lo)}, ${pct(g.wilson_hi)}]`,
    g.vs_524 === null ? "n/a" : ((g.vs_524 >= 0 ? "+" : "") + pct(g.vs_524)),
  ])
));
findings.push(``);

findings.push(`## (f) Does CLV correlate with confidence? (the decisive cut)`);
findings.push(``);
findings.push(`Spearman rank correlation on graded rows only. Script: \`spearman()\` over ranks with average ties.`);
findings.push(``);
findings.push(`| pair | n | Spearman ρ |`);
findings.push(`| --- | --- | --- |`);
findings.push(`| confidence vs \`clv_value\` | ${graded.length} | ${fmt(rhoClv)} |`);
findings.push(`| confidence vs beat-close indicator | ${graded.length} | ${fmt(rhoBeat)} |`);
findings.push(``);
findings.push(`Graded-only confidence deciles (D1 = lowest confidence among graded):`);
findings.push(mdTable(
  ["decile", "conf range", "n", "beat", "win rate", "Wilson 95%", "mean clv_value"],
  gradedDeciles.map((g) => [
    g.label,
    g.conf_min === null ? "n/a" : `${g.conf_min}–${g.conf_max}`,
    String(g.n_graded),
    String(g.n_beat),
    pct(g.win_rate),
    g.wilson_lo === null ? "n/a" : `[${pct(g.wilson_lo)}, ${pct(g.wilson_hi)}]`,
    fmt(g.mean_clv, 4),
  ])
));
findings.push(``);
if (rhoBeat === null || graded.length < 30) {
  findings.push(`**Cannot claim a confidence–CLV relationship.** Graded n=${graded.length}. Need a populated lock/close grade, not a rank on an empty slice.`);
} else if (rhoBeat > 0.15 && gradedDeciles.length >= 2 && (gradedDeciles[9].win_rate ?? 0) > (gradedDeciles[0].win_rate ?? 1)) {
  findings.push(`High-confidence graded picks beat the close more often than low-confidence ones (ρ_beat=${fmt(rhoBeat)}). That would reverse the L-4 suppression story — **if** coverage were thick enough to trust. Coverage is the binding constraint.`);
} else {
  findings.push(`No usable positive ranking: ρ_beat=${fmt(rhoBeat)}, ρ_clv=${fmt(rhoClv)}. Confidence is not revealing CLV in this slice. Suppression-by-confidence remains unsupported.`);
}
findings.push(``);

findings.push(`## Verdict`);
findings.push(``);
if (coverageTooThin) {
  findings.push(`**Insufficient data — not a CLV fail, a coverage fail.** ${rows.length} settled published non-bootstrap picks; only ${overall.n_both} have lock AND close; only ${overall.n_graded} are graded. ESTABLISHED asks for ≥500 settled + verified CLV ≥52.4%. Neither the n nor the verified-CLV rate can be claimed from this file.`);
} else if (overall.clears_524) {
  findings.push(`CLV win rate ${pct(overall.win_rate)} (n=${overall.n_graded}), Wilson lower bound ${pct(overall.wilson_lo)} ≥ 52.4%. That is a demonstrable beat-the-close edge on the graded slice. Outcome-Brier (L-4) was the wrong gate.`);
} else {
  findings.push(`Coverage is thick enough to look (graded n=${overall.n_graded}), but the Wilson lower bound ${pct(overall.wilson_lo)} does not clear 52.4%. Best point estimate ${pct(overall.win_rate)}. This is the work-plan number — not a reason to bend the 52.4% ladder.`);
}
findings.push(``);
findings.push(`Trace: every table cell is computed in \`analyze.mjs\` (\`summarizeGroup\`, \`wilson\`, \`spearman\`, \`quantile\`).`);

mkdirSync(OUT_DIR, { recursive: true });
const outPath = resolve(OUT_DIR, "findings.md");
writeFileSync(outPath, findings.join("\n") + "\n", "utf8");

const jsonPath = resolve(OUT_DIR, "summary.json");
writeFileSync(
  jsonPath,
  JSON.stringify(
    {
      n: rows.length,
      timeOk,
      coverageTooThin,
      overall,
      dist,
      bySport,
      byType,
      byConfDecile,
      byMonth,
      rhoClv,
      rhoBeat,
      gradedDeciles,
    },
    null,
    2
  ),
  "utf8"
);

console.log("rows", rows.length, "timeOk", timeOk);
console.log("lock+close", overall.n_both, "graded", overall.n_graded);
console.log("win_rate", overall.win_rate, "wilson", overall.wilson_lo, overall.wilson_hi);
console.log("rho_clv", rhoClv, "rho_beat", rhoBeat);
console.log("wrote", outPath);
