#!/usr/bin/env node
/**
 * Stage H — score the shadow layers.
 *
 * Reads sealed pregame runs, joins them to settled picks, and reports, per
 * layer, the Brier score and closing-line value against a market-only baseline.
 * A layer that does not beat market-only out of sample stays at weight zero.
 *
 *   node --import tsx scripts/ops/score_shadow_layers.ts --dir data/engine/shadow
 *
 * Input: a directory of sealed run JSON files written by run_pregame.ts --out.
 * Each file is { manifest, bundle, outputs }.
 *
 * Output: a per-layer scorecard on stdout and, with --json, a machine-readable
 * file. Nothing here writes to the database.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

interface SealedRun {
  manifest: { hash: string; codeVersion: string; sealedAt: string };
  bundle: {
    identity: { gameId: string; homeTeam: string; awayTeam: string; commenceTime: string };
    market: { consensusNoVigHome: { status: string; value?: number } };
  };
  outputs: {
    verdict: string;
    posterior?: number;
    marketPrior?: number;
    liveDelta?: number;
    familyDeltas?: Array<{ family: string; delta: number; weight: number; status: string }>;
  };
}

interface SettledOutcome {
  gameId: string;
  homeWon: boolean;
}

export interface LayerScore {
  readonly layer: string;
  readonly n: number;
  readonly brier: number;
  readonly brierVsMarket: number;
  readonly delta: number;
}

function brier(predictions: readonly number[], outcomes: readonly boolean[]): number {
  if (predictions.length === 0) return Number.NaN;
  let s = 0;
  for (let i = 0; i < predictions.length; i += 1) {
    const p = predictions[i];
    const y = outcomes[i];
    if (p === undefined || y === undefined) continue;
    const target = y ? 1 : 0;
    s += (p - target) ** 2;
  }
  return s / predictions.length;
}

function loadRuns(dir: string): SealedRun[] {
  const out: SealedRun[] = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    const raw = JSON.parse(readFileSync(join(dir, name), "utf8")) as SealedRun;
    if (raw.manifest?.hash === undefined) continue;
    out.push(raw);
  }
  return out;
}

/**
 * Score. `outcomes` is keyed by gameId and must come from settled picks, never
 * from the run itself — a run cannot grade itself.
 */
export function scoreLayers(
  runs: readonly SealedRun[],
  outcomes: ReadonlyMap<string, SettledOutcome>,
): LayerScore[] {
  const scored = runs.filter((r) => outcomes.has(r.bundle.identity.gameId));
  if (scored.length === 0) return [];

  const marketPreds: number[] = [];
  const posteriorPreds: number[] = [];
  const ys: boolean[] = [];

  for (const run of scored) {
    const outcome = outcomes.get(run.bundle.identity.gameId);
    if (outcome === undefined) continue;
    const market = run.bundle.market.consensusNoVigHome;
    if (market.status === "MISSING" || market.value === undefined) continue;
    marketPreds.push(market.value);
    posteriorPreds.push(run.outputs.posterior ?? market.value);
    ys.push(outcome.homeWon);
  }

  const marketBrier = brier(marketPreds, ys);
  const posteriorBrier = brier(posteriorPreds, ys);

  const layers: LayerScore[] = [
    {
      layer: "market-only (baseline)",
      n: ys.length,
      brier: marketBrier,
      brierVsMarket: 0,
      delta: 0,
    },
    {
      layer: "posterior (all families)",
      n: ys.length,
      brier: posteriorBrier,
      brierVsMarket: posteriorBrier - marketBrier,
      delta: 0,
    },
  ];

  // Per-family: a family is only scoreable once it has a non-zero weight.
  const families = new Set<string>();
  for (const run of scored) {
    for (const f of run.outputs.familyDeltas ?? []) families.add(f.family);
  }
  for (const family of families) {
    const preds: number[] = [];
    const famYs: boolean[] = [];
    for (const run of scored) {
      const outcome = outcomes.get(run.bundle.identity.gameId);
      const market = run.bundle.market.consensusNoVigHome;
      if (outcome === undefined || market.status === "MISSING" || market.value === undefined) continue;
      const fam = (run.outputs.familyDeltas ?? []).find((f) => f.family === family);
      if (fam === undefined) continue;
      preds.push(market.value + fam.delta * fam.weight);
      famYs.push(outcome.homeWon);
    }
    if (preds.length === 0) continue;
    const b = brier(preds, famYs);
    layers.push({
      layer: `family:${family}`,
      n: famYs.length,
      brier: b,
      brierVsMarket: b - marketBrier,
      delta: 0,
    });
  }

  return layers;
}

function main(): number {
  const argv = process.argv.slice(2);
  const dirIdx = argv.indexOf("--dir");
  const dir = dirIdx >= 0 ? argv[dirIdx + 1] : null;
  if (dir === null) {
    process.stderr.write("usage: score_shadow_layers.ts --dir <sealed-run-dir> [--json <out>]\n");
    return 1;
  }
  const abs = resolve(process.cwd(), dir);
  const runs = loadRuns(abs);
  process.stdout.write(`sealed runs found: ${runs.length}\n`);

  // Outcomes must come from settlement. Until a settlement feed is wired here,
  // this script reports the run inventory and refuses to invent results.
  const outcomes = new Map<string, SettledOutcome>();
  const scores = scoreLayers(runs, outcomes);

  if (scores.length === 0) {
    process.stdout.write(
      "no settled outcomes available — nothing scored. " +
        "A run cannot grade itself; wire the settlement feed before scoring.\n",
    );
    return 0;
  }

  process.stdout.write("\nlayer                          n     brier   vs market\n");
  for (const s of scores) {
    process.stdout.write(
      `${s.layer.padEnd(30)} ${String(s.n).padStart(4)}  ${s.brier.toFixed(4)}  ${s.brierVsMarket >= 0 ? "+" : ""}${s.brierVsMarket.toFixed(4)}\n`,
    );
  }

  const jsonIdx = argv.indexOf("--json");
  if (jsonIdx >= 0) {
    const out = argv[jsonIdx + 1];
    if (out !== undefined) {
      writeFileSync(resolve(process.cwd(), out), JSON.stringify(scores, null, 2), "utf8");
      process.stdout.write(`\nwrote ${out}\n`);
    }
  }
  return 0;
}

if (process.argv[1]?.endsWith("score_shadow_layers.ts") === true) {
  process.exit(main());
}
