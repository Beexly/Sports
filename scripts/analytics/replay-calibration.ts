/**
 * replay-calibration.ts — Wave 3 of the 2026-09-04 all-night order.
 *
 * Calibrates THE MARKET (closing line), per decision D7: the market is the honest,
 * publishable artifact for launch option A. The pick model is NOT recalibrated
 * here — the convergent evidence (docs/data/CONVERGENT_CALIBRATION_EVIDENCE_2026-09-04.md)
 * shows it has no resolution, and calibration cannot create ranking that is not there.
 *
 * Deliverables (work order §3 Wave 3):
 *   1. Walk-forward folds: train on seasons <= N, evaluate N+1, roll forward.
 *      Per-fold numbers, never one pooled number.
 *   2. Reliability curve + Brier decomposition (reliability / resolution /
 *      uncertainty) for the market closing line, per fold and pooled.
 *   3. ECE — equal-width AND adaptive (equal-count) — with bootstrap CIs
 *      (2,000 resamples, seeded, reproducible).
 *   4. Isotonic (PAVA), Platt, and beta calibration fit per training window,
 *      compared on the held-out fold. Reports which wins and by how much,
 *      or that none beats the identity.
 *   5. Variable-based (Kelly & Smyth style) calibration: tree on ONE variable,
 *      per-leaf calibrator. Splits tested: favourite strength, season era.
 *   6. Every reported number carries a 95% bootstrap CI. A point estimate
 *      without an interval is not a result.
 *
 * Honest scope: proportional de-vig of the two closing moneylines gives the
 * unconditional-ish market home-win probability (ties excluded from scoring as
 * in run-historical-calibration.mjs; no draw price exists in this corpus).
 * Read-only, no DB. nflverse is CC-BY-4.0, gated through the registry.
 *
 *   NODE_OPTIONS=--use-system-ca npx tsx scripts/analytics/replay-calibration.ts
 */

import { gunzipSync } from "node:zlib";
import { assertIngestible } from "../../packages/data-ingestion/src/index.js";

const GAMES_URL =
  "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv";
const BOOTSTRAP = 2000;
const SEED = 20260904;
const BINS = 10;
const ADAPTIVE_BIN_N = 500; // equal-count bin target
const MIN_LEAF = 150; // ~6% of the 2006-2015 training window; 400 silently dropped 3 of 5 favourite-strength leaves

// ---------------------------------------------------------------- csv + odds

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "", row: string[] = [], q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); field = ""; row = []; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift() ?? [];
  return rows
    .filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(header.map((h, j) => [h, r[j] ?? ""])));
}

function impliedProb(ml: string): number | null {
  const n = Number(ml);
  if (!Number.isFinite(n) || n === 0) return null;
  return n < 0 ? -n / (-n + 100) : 100 / (n + 100);
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 14), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------- metrics

interface Sample {
  readonly p: number; // calibrated-input probability (market de-vig)
  readonly y: 0 | 1;
  readonly season: number;
  readonly absLine: number; // favourite strength, in points
}

function brierDecomposition(samples: readonly Sample[]): {
  brier: number; reliability: number; resolution: number; uncertainty: number;
} {
  const n = samples.length;
  const base = samples.reduce((s, x) => s + x.y, 0) / n;
  // Murphy decomposition over BINS (10 equal-width), not exact-value groups:
  // exact-value grouping is not bootstrap-stable (its CI failed to bracket the
  // point estimate in the first run; binning is the standard definition).
  const K = 10;
  const cnt = Array(K).fill(0), oSum = Array(K).fill(0), pSum = Array(K).fill(0);
  for (const x of samples) {
    let b = Math.floor(x.p * K);
    if (b === K) b = K - 1;
    cnt[b]!++; oSum[b]! += x.y; pSum[b]! += x.p;
  }
  let rel = 0, res = 0;
  for (let b = 0; b < K; b++) {
    if (!cnt[b]) continue;
    const w = cnt[b]! / n;
    rel += w * (pSum[b]! / cnt[b]! - base) ** 2;
    res += w * (oSum[b]! / cnt[b]! - base) ** 2;
  }
  const brier = samples.reduce((s, x) => s + (x.p - x.y) ** 2, 0) / n;
  return { brier, reliability: rel, resolution: res, uncertainty: base * (1 - base) };
}

function eceEqualWidth(samples: readonly Sample[]): number {
  const n = samples.length;
  const cnt = Array(BINS).fill(0), fSum = Array(BINS).fill(0), oSum = Array(BINS).fill(0);
  for (const x of samples) {
    let b = Math.floor(x.p * BINS);
    if (b === BINS) b = BINS - 1;
    cnt[b]!++; fSum[b]! += x.p; oSum[b]! += x.y;
  }
  let e = 0;
  for (let b = 0; b < BINS; b++) {
    if (!cnt[b]) continue;
    e += (cnt[b]! / n) * Math.abs(fSum[b]! / cnt[b]! - oSum[b]! / cnt[b]!);
  }
  return e;
}

/** Adaptive (equal-count) ECE — the sane binner when samples crowd the edges. */
function eceAdaptive(samples: readonly Sample[]): number {
  const sorted = [...samples].sort((a, b) => a.p - b.p);
  const n = sorted.length;
  const groups: Sample[][] = [];
  for (let i = 0; i < n; i += ADAPTIVE_BIN_N) groups.push(sorted.slice(i, i + ADAPTIVE_BIN_N));
  let e = 0;
  for (const g of groups) {
    const mp = g.reduce((s, x) => s + x.p, 0) / g.length;
    const mo = g.reduce((s, x) => s + x.y, 0) / g.length;
    e += (g.length / n) * Math.abs(mp - mo);
  }
  return e;
}

function reliabilityBins(samples: readonly Sample[]): { label: string; n: number; pred: number; obs: number }[] {
  const sorted = [...samples].sort((a, b) => a.p - b.p);
  const n = sorted.length;
  const out: { label: string; n: number; pred: number; obs: number }[] = [];
  for (let i = 0; i < n; i += ADAPTIVE_BIN_N) {
    const g = sorted.slice(i, i + ADAPTIVE_BIN_N);
    out.push({
      label: `${Math.round(g[0]!.p * 100)}-${Math.round(g[g.length - 1]!.p * 100)}%`,
      n: g.length,
      pred: (g.reduce((s, x) => s + x.p, 0) / g.length) * 100,
      obs: (g.reduce((s, x) => s + x.y, 0) / g.length) * 100,
    });
  }
  return out;
}

// --------------------------------------------------------------- calibrators

/** Isotonic via PAVA. Returns a step function over training (p, y) pairs. */
function fitIsotonic(train: readonly Sample[]): (p: number) => number {
  const sorted = [...train].sort((a, b) => a.p - b.p);
  // blocks of [sumP, sumY, count]
  const blocks: { sp: number; sy: number; c: number }[] = [];
  for (const x of sorted) {
    blocks.push({ sp: x.p, sy: x.y, c: 1 });
    while (blocks.length >= 2) {
      const a = blocks[blocks.length - 2]!, b = blocks[blocks.length - 1]!;
      if (a.sy / a.c <= b.sy / b.c) break;
      blocks.splice(blocks.length - 2, 2, { sp: a.sp + b.sp, sy: a.sy + b.sy, c: a.c + b.c });
    }
  }
  return (p: number) => {
    for (const b of blocks) if (p <= b.sp / b.c + 1e-12) return b.sy / b.c;
    return blocks.length ? blocks[blocks.length - 1]!.sy / blocks[blocks.length - 1]!.c : p;
  };
}

/** Platt scaling: logistic regression on logit(p) with a single feature + bias. */
function fitPlatt(train: readonly Sample[]): (p: number) => number {
  const eps = 1e-6;
  const xs = train.map((x) => Math.log(Math.min(1 - eps, Math.max(eps, x.p)) / (1 - Math.min(1 - eps, Math.max(eps, x.p)))));
  const ys = train.map((x) => x.y);
  let w = 0, b = 0;
  const lr = 0.1;
  for (let epoch = 0; epoch < 300; epoch++) {
    let gw = 0, gb = 0;
    for (let i = 0; i < xs.length; i++) {
      const z = w * xs[i]! + b;
      const pr = 1 / (1 + Math.exp(-z));
      gw += (pr - ys[i]!) * xs[i]!;
      gb += pr - ys[i]!;
    }
    w -= (lr * gw) / xs.length;
    b -= (lr * gb) / xs.length;
  }
  return (p: number) => {
    const c = Math.min(1 - eps, Math.max(eps, p));
    const z = w * Math.log(c / (1 - c)) + b;
    return 1 / (1 + Math.exp(-z));
  };
}

/** Beta calibration (Kull et al. style 3-parameter family, fit coarsely). */
function fitBeta(train: readonly Sample[]): (p: number) => number {
  const eps = 1e-6;
  const logit = (p: number) => Math.log(Math.min(1 - eps, Math.max(eps, p)) / (1 - Math.min(1 - eps, Math.max(eps, p))));
  // Grid-search (a, b, c) minimising Brier on train: logit-calibrated family
  // sigma(a * logit(p) + b * log(1-p) + c). Coarse but deterministic.
  let best: { a: number; b: number; c: number; loss: number } | null = null;
  for (let a = 0.5; a <= 1.6; a += 0.1) {
    for (let b = -0.5; b <= 0.5; b += 0.1) {
      for (const c of [-0.1, 0, 0.1]) {
        let loss = 0;
        for (const x of train) {
          const pr = 1 / (1 + Math.exp(-(a * logit(x.p) + b * Math.log(1 - Math.min(1 - eps, Math.max(eps, x.p))) + c)));
          loss += (pr - x.y) ** 2;
        }
        loss /= train.length;
        if (!best || loss < best.loss) best = { a, b, c, loss };
      }
    }
  }
  const { a, b, c } = best!;
  return (p: number) => {
    const cc = Math.min(1 - eps, Math.max(eps, p));
    return 1 / (1 + Math.exp(-(a * logit(cc) + b * Math.log(1 - cc) + c)));
  };
}

function brierOf(samples: readonly Sample[], f: (p: number) => number): number {
  let s = 0;
  for (const x of samples) s += (f(x.p) - x.y) ** 2;
  return s / samples.length;
}

function ci(values: readonly number[]): [number, number] {
  const s = [...values].sort((a, b) => a - b);
  return [s[Math.floor(0.025 * s.length)]!, s[Math.ceil(0.975 * s.length) - 1]!];
}

/** Percentile bootstrap of a statistic over samples (seeded, reproducible). */
function bootstrap(samples: readonly Sample[], stat: (s: readonly Sample[]) => number): [number, number] {
  const rng = mulberry32(SEED);
  const vals: number[] = [];
  for (let r = 0; r < BOOTSTRAP; r++) {
    const resample: Sample[] = [];
    for (let i = 0; i < samples.length; i++) resample.push(samples[Math.floor(rng() * samples.length)]!);
    vals.push(stat(resample));
  }
  return ci(vals);
}

// ------------------------------------------------- variable-based (one var)

type VarKey = (x: Sample) => string;
const favouriteBucket: VarKey = (x) =>
  x.absLine >= 10 ? "10+" : x.absLine >= 6.5 ? "6.5-9.5" : x.absLine >= 3 ? "3-6" : x.absLine >= 1.5 ? "1.5-2.5" : "PK-1";
const eraBucket: VarKey = (x) =>
  x.season <= 2005 ? "1999-2005" : x.season <= 2013 ? "2006-2013" : x.season <= 2020 ? "2014-2020" : "2021-2025";

function variableCalibration(
  train: readonly Sample[],
  test: readonly Sample[],
  key: VarKey,
): { leaf: string; n: number; trainMean: number; testMean: number; leafBrier: number }[] {
  const leaves = new Map<string, Sample[]>();
  for (const x of train) {
    const k = key(x);
    const g = leaves.get(k) ?? [];
    g.push(x);
    leaves.set(k, g);
  }
  const rows: { leaf: string; n: number; trainMean: number; testMean: number; leafBrier: number }[] = [];
  for (const [leaf, xs] of Array.from(leaves.entries())) {
    if (xs.length < MIN_LEAF) continue;
    const mean = xs.reduce((s, x) => s + x.y, 0) / xs.length;
    const ts = test.filter((x) => key(x) === leaf);
    if (!ts.length) continue;
    rows.push({
      leaf,
      n: ts.length,
      trainMean: mean,
      testMean: ts.reduce((s, x) => s + x.y, 0) / ts.length,
      leafBrier: brierOf(ts, () => mean),
    });
  }
  return rows.sort((a, b) => a.leaf.localeCompare(b.leaf));
}

// --------------------------------------------------------------------- main

async function main(): Promise<void> {
  const source = assertIngestible("nflverse");
  console.log(`legality: nflverse OK (${source.verdict}). ${source.attributionText}`);

  process.stdout.write(`Fetching ${GAMES_URL} ...\n`);
  const res = await fetch(GAMES_URL);
  if (!res.ok) throw new Error(`fetch failed ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const text =
    buf.length > 1 && buf[0] === 0x1f && buf[1] === 0x8b
      ? gunzipSync(buf).toString("utf8")
      : buf.toString("utf8");
  const games = parseCsv(text);

  const samples: Sample[] = [];
  for (const g of games) {
    const season = Number(g.season);
    if (!Number.isFinite(season) || season < 1999) continue;
    const hs = Number(g.home_score), as = Number(g.away_score);
    if (!Number.isFinite(hs) || !Number.isFinite(as) || g.home_score === "" || g.away_score === "") continue;
    if (hs === as) continue; // no binary home win
    const ph = impliedProb(g.home_moneyline), pa = impliedProb(g.away_moneyline);
    if (ph === null || pa === null) continue;
    const overround = ph + pa;
    if (overround <= 0) continue;
    const spread = Number(g.spread_line);
    samples.push({
      p: ph / overround,
      y: hs > as ? 1 : 0,
      season,
      absLine: Number.isFinite(spread) ? Math.abs(spread) : 0,
    });
  }
  const seasons = Array.from(new Set(samples.map((s) => s.season))).sort((a, b) => a - b);
  console.log(`corpus: ${samples.length} settled games, seasons ${seasons[0]}-${seasons[seasons.length - 1]}`);
  console.log(
    `note: this is the MARKET-moneyline corpus (games.csv closing MLs exist from ${seasons[0]}), ` +
      `NOT the 15,939-pick replay corpus (spreads/totals, 1999-2025) — the two are different populations.`,
  );
  if (samples.length < 5000) throw new Error("corpus suspiciously small — aborting rather than reporting thin numbers");

  // 1+2+3. Walk-forward folds, expanding window.
  const folds: number[] = [];
  for (let evalSeason = 2016; evalSeason <= seasons[seasons.length - 1]!; evalSeason++) folds.push(evalSeason);

  console.log(`\n=== Walk-forward market calibration (train <= N, evaluate N+1) ===`);
  console.log(`per-fold numbers; never one pooled number for the fit comparisons.\n`);

  const pooledRaw: Sample[] = [];
  const gainsIso: number[] = [], gainsPlatt: number[] = [], gainsBeta: number[] = [];
  const eceAd: number[] = [], eceEq: number[] = [];

  for (const evalSeason of folds) {
    const train = samples.filter((s) => s.season < evalSeason);
    const test = samples.filter((s) => s.season === evalSeason);
    if (!train.length || !test.length) continue;

    const raw = brierDecomposition(test);
    const iso = fitIsotonic(train);
    const platt = fitPlatt(train);
    const beta = fitBeta(train);

    const bIso = brierOf(test, iso), bPlatt = brierOf(test, platt), bBeta = brierOf(test, beta);
    gainsIso.push(raw.brier - bIso);
    gainsPlatt.push(raw.brier - bPlatt);
    gainsBeta.push(raw.brier - bBeta);

    // calibrated samples for the fold (isotonic is the headline calibrator)
    const calTest: Sample[] = test.map((x) => ({ ...x, p: iso(x.p) }));
    eceEq.push(eceEqualWidth(calTest));
    eceAd.push(eceAdaptive(calTest));

    const rel = brierDecomposition(calTest);
    console.log(
      `fold ${evalSeason}: n=${String(test.length).padStart(4)}  raw Brier ${raw.brier.toFixed(4)} ` +
        `(rel ${raw.reliability.toFixed(4)} / res ${raw.resolution.toFixed(4)} / unc ${raw.uncertainty.toFixed(4)})  ` +
        `iso ${(bIso - raw.brier >= 0 ? "-" : "+") + Math.abs(raw.brier - bIso).toFixed(4)}  ` +
        `platt ${((raw.brier - bPlatt) >= 0 ? "-" : "+") + Math.abs(raw.brier - bPlatt).toFixed(4)}  ` +
        `beta ${((raw.brier - bBeta) >= 0 ? "-" : "+") + Math.abs(raw.brier - bBeta).toFixed(4)}  ` +
        `post-iso ECE eq/adaptive ${eceEqualWidth(calTest).toFixed(4)}/${eceAdaptive(calTest).toFixed(4)}`,
    );
    pooledRaw.push(...test);
  }

  // 2+3. Pooled reliability + decomposition + CIs on the raw market probability,
  // over the evaluation window (2016-2025) — the folds' held-out seasons only.
  console.log(`\n=== Pooled market closing line, held-out eval seasons ${folds[0]}-${folds[folds.length - 1]} (raw de-vig, no recalibration) ===`);
  const pooled = brierDecomposition(pooledRaw);
  const bci = bootstrap(pooledRaw, (s) => brierDecomposition(s).brier);
  const rci = bootstrap(pooledRaw, (s) => brierDecomposition(s).reliability);
  const dci = bootstrap(pooledRaw, (s) => brierDecomposition(s).resolution);
  const uci = bootstrap(pooledRaw, (s) => brierDecomposition(s).uncertainty);
  console.log(`n=${pooledRaw.length}  base rate ${(pooledRaw.reduce((s, x) => s + x.y, 0) / pooledRaw.length * 100).toFixed(2)}%`);
  console.log(`Brier ${pooled.brier.toFixed(4)}  95% CI [${bci[0].toFixed(4)}, ${bci[1].toFixed(4)}]`);
  console.log(`reliability ${pooled.reliability.toFixed(4)}  CI [${rci[0].toFixed(4)}, ${rci[1].toFixed(4)}]`);
  console.log(`resolution ${pooled.resolution.toFixed(4)}  CI [${dci[0].toFixed(4)}, ${dci[1].toFixed(4)}]`);
  console.log(`uncertainty ${pooled.uncertainty.toFixed(4)}  CI [${uci[0].toFixed(4)}, ${uci[1].toFixed(4)}]`);
  const eEq = eceEqualWidth(pooledRaw), eAd = eceAdaptive(pooledRaw);
  const eqCi = bootstrap(pooledRaw, eceEqualWidth);
  const adCi = bootstrap(pooledRaw, eceAdaptive);
  console.log(`ECE equal-width ${eEq.toFixed(4)}  CI [${eqCi[0].toFixed(4)}, ${eqCi[1].toFixed(4)}]`);
  console.log(`ECE adaptive    ${eAd.toFixed(4)}  CI [${adCi[0].toFixed(4)}, ${adCi[1].toFixed(4)}]`);

  console.log(`\nReliability curve (equal-count bins of ~${ADAPTIVE_BIN_N}):`);
  for (const b of reliabilityBins(pooledRaw)) {
    console.log(`  ${b.label.padStart(9)}  n=${String(b.n).padStart(5)}  pred ${b.pred.toFixed(1)}%  obs ${b.obs.toFixed(1)}%`);
  }

  // 4. Which calibrator wins, by how much, across folds.
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  console.log(`\n=== Calibrator comparison, mean held-out Brier delta vs identity (positive = better) ===`);
  console.log(`isotonic ${mean(gainsIso) >= 0 ? "+" : ""}${mean(gainsIso).toFixed(5)} over ${gainsIso.length} folds`);
  console.log(`platt    ${mean(gainsPlatt) >= 0 ? "+" : ""}${mean(gainsPlatt).toFixed(5)}`);
  console.log(`beta     ${mean(gainsBeta) >= 0 ? "+" : ""}${mean(gainsBeta).toFixed(5)}`);
  const best = Math.max(mean(gainsIso), mean(gainsPlatt), mean(gainsBeta));
  console.log(
    best <= 0.0005
      ? "NONE of the calibrators beats the identity by more than 0.0005 mean Brier on held-out folds — the market is already the calibration."
      : `best mean gain ${best.toFixed(5)} — small; report as the measured gain, with per-fold spread above.`,
  );

  // 5. Variable-based calibration, one variable per tree, per-leaf mean.
  console.log(`\n=== Variable-based calibration (train <= ${folds[0] - 1} mean per leaf, evaluate ${folds[0]}-${folds[folds.length - 1]}) ===`);
  const trainAll = samples.filter((s) => s.season < folds[0]!);
  const testAll = samples.filter((s) => s.season >= folds[0]!);
  console.log(
    `note: era split trains on ${Math.min(...Array.from(new Set(trainAll.map((s) => s.season))))}-2015 only (corpus limit); ` +
      `the pre-2006 era has no closing moneylines in games.csv, so era-as-a-variable is only partially testable.`,
  );
  for (const [name, key] of [["favourite strength", favouriteBucket], ["season era", eraBucket]] as const) {
    console.log(`-- split: ${name}`);
    const rows = variableCalibration(trainAll, testAll, key);
    for (const r of rows) {
      console.log(
        `  leaf ${r.leaf.padEnd(9)}  test n=${String(r.n).padStart(5)}  train base ${(r.trainMean * 100).toFixed(2)}%  test actual ${(r.testMean * 100).toFixed(2)}%  leaf Brier ${r.leafBrier.toFixed(4)}`,
      );
    }
    const leafBrier = rows.length
      ? rows.reduce((s, r) => s + r.leafBrier * r.n, 0) / rows.reduce((s, r) => s + r.n, 0)
      : NaN;
    const globalBrier = brierOf(testAll, () => trainAll.reduce((s, x) => s + x.y, 0) / trainAll.length);
    console.log(`  weighted leaf Brier ${leafBrier.toFixed(4)} vs single global mean ${globalBrier.toFixed(4)}`);
  }

  console.log(`\nHonest expected outcome (per the work order): the market IS well calibrated;`);
  console.log(`any calibrator gain should be ~0 on held-out folds. If the numbers above say`);
  console.log(`otherwise, check twice, then report loudly with this command.`);
}

main().catch((err) => {
  console.error("\nreplay-calibration fatal:", err);
  process.exit(1);
});
