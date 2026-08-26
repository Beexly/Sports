/**
 * END-TO-END on REAL DATA: NGS receiving -> survivor signals -> independent
 * modelProb -> pick-proof receipt.
 *
 * The existing modelprob-aggregation tests are synthetic-fixture only (that
 * module's own header says so). This is the one that runs the pipeline on the
 * real `ngs_receiving.csv.gz` release asset and mints a real value.
 *
 * MARKET-FREE: the only file read is NGS receiving. No line, price, spread,
 * total, consensus or confidence is available to this pipeline at any step.
 * The receipt's own market fields are the PUBLISHED pick's record; they are
 * inputs to the receipt, never to modelProb.
 *
 * PRE-REGISTERED, never tuned post-hoc (MODELPROB_DESIGN.md):
 *   tau       = 50 targets   — shrinkage half-weight point
 *   minTotalN = 100 targets  — below this, modelProb is null
 * These are frozen here as named constants precisely so a later "it would pass
 * with tau=30" cannot be quietly applied.
 */
import { existsSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  aggregateSeasonSignals,
  pairConsecutiveSeasons,
  type NgsReceivingRow,
} from "../ngs-receiving-signals.js";
import {
  MODELPROB_AGGREGATION_METHOD_TAG,
  aggregateModelProb,
  computeLeagueBaseline,
  type PlayerSignal,
} from "../modelprob-aggregation.js";
import { buildPickProofReceipt, verifyPickProofReceipt } from "../../pick-proof-receipt.js";

const TAU = 50;
const MIN_TOTAL_N = 100;
const PRIOR_SEASON = 2023;

// Anchored at the repo root, not the process cwd — vitest runs with cwd =
// packages/prediction-engine, so a bare relative path resolves under the
// package and never finds the artifact.
const NGS_PATH = join(__dirname, "..", "..", "..", "..", "..", "data/nflverse/ngs_receiving.csv.gz");

function loadNgsRows(): NgsReceivingRow[] {
  const text = gunzipSync(readFileSync(NGS_PATH)).toString("utf8");
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const header = lines[0]!.split(",");
  const idx = (name: string): number => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`MISSING: ngs_receiving column ${name}`);
    return i;
  };
  const iSeason = idx("season");
  const iType = idx("season_type");
  const iWeek = idx("week");
  const iTargets = idx("targets");
  const iSep = idx("avg_separation");
  const iId = idx("player_gsis_id");

  const rows: NgsReceivingRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i]!.split(",");
    const sep = (f[iSep] ?? "").trim();
    const targets = Number(f[iTargets]);
    if (!Number.isFinite(targets)) continue;
    rows.push({
      playerGsisId: (f[iId] ?? "").trim(),
      season: Number(f[iSeason]),
      seasonType: (f[iType] ?? "").trim(),
      week: Number(f[iWeek]),
      targets,
      avgSeparation: sep === "" ? null : Number(sep),
    });
  }
  return rows;
}

const available = existsSync(NGS_PATH);
if (!available) console.warn(`SKIPPED-GREEN: real NGS pipeline — missing ${NGS_PATH}`);
const suite = available ? describe : describe.skip;

const hash = (input: string): string => {
  let acc = 7;
  for (let i = 0; i < input.length; i++) acc = (acc * 31 + input.charCodeAt(i)) >>> 0;
  return acc.toString(16).padStart(8, "0");
};

suite("independent modelProb on REAL NGS receiving data", () => {
  const rows = available ? loadNgsRows() : [];
  const signals = available ? aggregateSeasonSignals(rows) : [];
  const prior = signals.filter((s) => s.season === PRIOR_SEASON && s.avgSeparation !== null);

  it("loads real rows and folds them into real player-seasons", () => {
    expect(rows.length).toBeGreaterThan(10_000);
    expect(prior.length).toBeGreaterThan(50);
  });

  it("carries BOTH falsifier survivors — avg_separation (S1) and targets (S2)", () => {
    const withBoth = prior.filter((s) => s.avgSeparation !== null && s.targets > 0);
    expect(withBoth.length).toBe(prior.length);
    // targets is S2 AND the sample size backing S1 — signal and its own n.
    expect(withBoth.every((s) => Number.isInteger(s.targets))).toBe(true);
  });

  it("season-summary rows never leak in — folded targets stay plausible", () => {
    // A double-count would push season totals past any real NFL receiver's
    // volume. The 2023 leader was ~180 targets.
    const max = Math.max(...prior.map((s) => s.targets));
    expect(max).toBeGreaterThan(80);
    expect(max).toBeLessThan(260);
  });

  it("mints a real modelProb in (0,1) that verifies as a pick-proof receipt", () => {
    const baseline = computeLeagueBaseline(
      prior.map((s) => ({
        playerId: s.playerGsisId,
        signal: s.avgSeparation,
        n: s.targets,
        weight: s.targets,
      })),
    );
    expect(baseline).not.toBeNull();

    // One game's offense: the top-8 target earners, snap-weighted by targets.
    const offense: PlayerSignal[] = [...prior]
      .sort((a, b) => b.targets - a.targets)
      .slice(0, 8)
      .map((s) => ({
        playerId: s.playerGsisId,
        signal: s.avgSeparation,
        n: s.targets,
        weight: s.targets,
      }));

    const res = aggregateModelProb(offense, baseline!, {
      pLeague: 0.5,
      tau: TAU,
      minTotalN: MIN_TOTAL_N,
    });

    expect(res.ok).toBe(true);
    expect(res.priced).toBe(false);
    expect(res.modelProb).not.toBeNull();
    expect(res.modelProb!).toBeGreaterThan(0);
    expect(res.modelProb!).toBeLessThan(1);
    expect(res.methodTag).toBe(MODELPROB_AGGREGATION_METHOD_TAG);

    const receipt = buildPickProofReceipt(
      {
        pickId: "ngs-real-2023-01",
        gameId: "ngs-real-game-01",
        selection: "TEST OVER",
        pickType: "TOTAL",
        line: 47.5,
        entryOdds: -110,
        marketFairProb: 0.52,
        confidence: 60,
        edgeScore: 3.1,
        modelProb: res.modelProb,
        modelVersion: MODELPROB_AGGREGATION_METHOD_TAG,
        asOf: "2026-08-26T00:00:00.000Z",
      },
      hash,
    );
    expect(receipt.payload).not.toContain("modelProb=none");
    expect(verifyPickProofReceipt(receipt, hash)).toBe(true);
  });

  it("returns null — not a number — for an offense below the pre-registered minimum_n", () => {
    const baseline = computeLeagueBaseline(
      prior.map((s) => ({
        playerId: s.playerGsisId,
        signal: s.avgSeparation,
        n: s.targets,
        weight: s.targets,
      })),
    );
    const thin = [...prior]
      .sort((a, b) => a.targets - b.targets)
      .slice(0, 1)
      .map((s) => ({
        playerId: s.playerGsisId,
        signal: s.avgSeparation,
        n: s.targets,
        weight: s.targets,
      }));
    const res = aggregateModelProb(thin, baseline!, {
      pLeague: 0.5,
      tau: TAU,
      minTotalN: MIN_TOTAL_N,
    });
    expect(res.totalN).toBeLessThan(MIN_TOTAL_N);
    expect(res.ok).toBe(false);
    expect(res.modelProb).toBeNull();
    expect(res.refuse).toBe("starved_n");

    const receipt = buildPickProofReceipt(
      {
        pickId: "ngs-real-2023-02",
        gameId: "ngs-real-game-02",
        selection: "TEST UNDER",
        pickType: "TOTAL",
        line: 47.5,
        entryOdds: -110,
        marketFairProb: 0.52,
        confidence: 60,
        edgeScore: 3.1,
        modelProb: res.modelProb,
        modelVersion: MODELPROB_AGGREGATION_METHOD_TAG,
        asOf: "2026-08-26T00:00:00.000Z",
      },
      hash,
    );
    // Honest absence is COMMITTED as absence, never as a fabricated number.
    expect(receipt.payload).toContain("modelProb=none");
    expect(verifyPickProofReceipt(receipt, hash)).toBe(true);
  });

  it("player-level t -> t+1 pairs exist across the real NGS span", () => {
    const pairs = pairConsecutiveSeasons(signals, PRIOR_SEASON);
    expect(pairs.length).toBeGreaterThan(50);
    expect(pairs.every((p) => p.next.season === p.prior.season + 1)).toBe(true);
  });
});
