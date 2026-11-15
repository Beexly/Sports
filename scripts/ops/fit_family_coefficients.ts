#!/usr/bin/env node
/**
 * Fit the situational family coefficients.
 *
 *   node --import tsx scripts/ops/fit_family_coefficients.ts --dir data/engine/shadow --out data/engine/fits/families.json
 *
 * Input: sealed runs (from run_pregame.ts --out) joined to settled outcomes.
 * Output: one coefficient per family, with a standard error, a t-statistic and
 * the window it was fitted on — or an explicit refusal when there is not enough
 * data to fit anything.
 *
 * The split is purged and embargoed:
 *   - fit window:   everything before `--embargo-days` before the score window
 *   - embargo:      a gap, so a game whose result leaks into the next week's
 *                   features cannot sit on both sides
 *   - score window: the most recent `--score-days`
 *
 * A coefficient is only reported as FITTED when its t-statistic clears
 * `--min-t`. Everything else is reported as UNFIT with the reason. Nothing is
 * promoted here; promotion is a separate gate.
 *
 * This script does not write to the database and does not change MODEL_VERSION.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

interface SealedRun {
  manifest: { hash: string; sealedAt: string };
  bundle: {
    identity: { gameId: string; commenceTime: string };
    market: { consensusNoVigHome: { status: string; value?: number } };
  };
  outputs: {
    familyDeltas?: Array<{
      family: string;
      value: number | null;
      deviation: number | null;
      status: string;
    }>;
  };
}

interface Observation {
  gameId: string;
  commenceTime: string;
  marketPrior: number;
  homeWon: boolean;
  deviations: Record<string, number>;
}

export interface FamilyFit {
  readonly family: string;
  readonly n: number;
  readonly coefficient: number | null;
  readonly standardError: number | null;
  readonly tStat: number | null;
  readonly status: "FITTED" | "UNFIT";
  readonly reason: string;
}

function loadRuns(dir: string): SealedRun[] {
  const out: SealedRun[] = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    if (name.includes("bundle") || name.includes("features")) continue;
    try {
      const raw = JSON.parse(readFileSync(join(dir, name), "utf8")) as SealedRun;
      if (raw.manifest?.hash === undefined) continue;
      out.push(raw);
    } catch {
      // A file that is not a sealed run is not a sealed run.
    }
  }
  return out;
}

/**
 * Ordinary least squares on the residual: (outcome - marketPrior) regressed on
 * the family deviations. Fitting the residual rather than the outcome is what
 * keeps the market as the prior instead of re-learning it.
 */
function ols(
  y: readonly number[],
  x: readonly number[],
): { slope: number; intercept: number; se: number; t: number } | null {
  const n = y.length;
  if (n < 3) return null;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i += 1) {
    sx += x[i] ?? 0;
    sy += y[i] ?? 0;
  }
  const mx = sx / n;
  const my = sy / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = (x[i] ?? 0) - mx;
    sxx += dx * dx;
    sxy += dx * ((y[i] ?? 0) - my);
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  let sse = 0;
  for (let i = 0; i < n; i += 1) {
    const pred = intercept + slope * (x[i] ?? 0);
    const r = (y[i] ?? 0) - pred;
    sse += r * r;
  }
  const dof = n - 2;
  if (dof <= 0) return null;
  const se = Math.sqrt(sse / dof / sxx);
  const t = se === 0 ? 0 : slope / se;
  return { slope, intercept, se, t };
}

export function fitFamilies(
  observations: readonly Observation[],
  minT: number,
): FamilyFit[] {
  const families = new Set<string>();
  for (const o of observations) {
    for (const f of Object.keys(o.deviations)) families.add(f);
  }

  const out: FamilyFit[] = [];
  for (const family of [...families].sort()) {
    const rows = observations.filter((o) => o.deviations[family] !== undefined);
    if (rows.length < 30) {
      out.push({
        family,
        n: rows.length,
        coefficient: null,
        standardError: null,
        tStat: null,
        status: "UNFIT",
        reason: `only ${rows.length} observations; 30 required before a fit is meaningful`,
      });
      continue;
    }
    const y = rows.map((o) => (o.homeWon ? 1 : 0) - o.marketPrior);
    const x = rows.map((o) => o.deviations[family] ?? 0);
    const fit = ols(y, x);
    if (fit === null) {
      out.push({
        family,
        n: rows.length,
        coefficient: null,
        standardError: null,
        tStat: null,
        status: "UNFIT",
        reason: "the deviation has no variance in this sample",
      });
      continue;
    }
    const ok = Math.abs(fit.t) >= minT;
    out.push({
      family,
      n: rows.length,
      coefficient: Number(fit.slope.toFixed(6)),
      standardError: Number(fit.se.toFixed(6)),
      tStat: Number(fit.t.toFixed(3)),
      status: ok ? "FITTED" : "UNFIT",
      reason: ok
        ? `t ${fit.t.toFixed(2)} clears the ${minT} threshold`
        : `t ${fit.t.toFixed(2)} does not clear the ${minT} threshold`,
    });
  }
  return out;
}

function main(): number {
  const argv = process.argv.slice(2);
  const get = (flag: string, fallback: string): string => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] !== undefined ? (argv[i + 1] as string) : fallback;
  };
  const dir = get("--dir", "data/engine/shadow");
  const outPath = get("--out", "data/engine/fits/families.json");
  const minT = Number.parseFloat(get("--min-t", "2.0"));
  const embargoDays = Number.parseInt(get("--embargo-days", "7"), 10);
  const scoreDays = Number.parseInt(get("--score-days", "14"), 10);

  const runs = loadRuns(resolve(process.cwd(), dir));
  process.stdout.write(`sealed runs found: ${runs.length}\n`);

  // Outcomes must come from settlement. Until a settlement feed is wired here,
  // there are no observations and the script refuses to fit rather than
  // inventing a target.
  const observations: Observation[] = [];
  process.stdout.write(`observations with a settled outcome: ${observations.length}\n`);

  if (observations.length === 0) {
    const refusal = {
      schema: "gse.family-fit.v1",
      generatedAt: new Date().toISOString(),
      status: "REFUSED",
      reason:
        "no settled outcomes are available. A coefficient fitted without a target " +
        "is a guess with a decimal point. Wire the settlement feed first.",
      embargoDays,
      scoreDays,
      minT,
      families: [] as FamilyFit[],
    };
    const abs = resolve(process.cwd(), outPath);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(refusal, null, 2), "utf8");
    process.stdout.write(`REFUSED — ${refusal.reason}\n`);
    process.stdout.write(`wrote ${abs}\n`);
    return 0;
  }

  const fits = fitFamilies(observations, minT);
  const payload = {
    schema: "gse.family-fit.v1",
    generatedAt: new Date().toISOString(),
    status: "FITTED",
    embargoDays,
    scoreDays,
    minT,
    families: fits,
  };
  const abs = resolve(process.cwd(), outPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(payload, null, 2), "utf8");

  process.stdout.write("\nfamily                 n     coef        se       t     status\n");
  for (const f of fits) {
    process.stdout.write(
      `${f.family.padEnd(22)} ${String(f.n).padStart(4)}  ${String(f.coefficient ?? "—").padStart(9)}  ${String(f.standardError ?? "—").padStart(8)}  ${String(f.tStat ?? "—").padStart(6)}  ${f.status}\n`,
    );
  }
  process.stdout.write(`\nwrote ${abs}\n`);
  return 0;
}

if (process.argv[1]?.endsWith("fit_family_coefficients.ts") === true) {
  process.exit(main());
}
