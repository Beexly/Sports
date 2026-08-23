/**
 * Backtest: H0.7 covariate binds with synthetic NGS data.
 *
 * H0 item 6 added 4 new binds that couple NGS weekly-mean covariates into
 * the prop models:
 *   1. catch-cushion-bind         avgCushion              → CatchSample  (catch rate)
 *   2. rec-td-cushion-bind        avgCushion              → RecTdSample  (rec-TD rate)
 *   3. sack-ttt-bind              avgTimeToThrow          → SackSample   (sack rate)
 *   4. comp-air-yards-diff-bind   avgAirYardsDifferential → CompSample   (comp rate)
 *
 * This backtest generates SYNTHETIC NGS data with embedded signal patterns,
 * runs all 4 binds, and verifies:
 *
 *   A. SIGNAL EXTRACTION QUALITY — the bind extracts the correct covariate
 *      value from the correct prior week (latest prior to kickoff, week=0 and
 *      same-week excluded). Verified by exact-value match vs the NGS source
 *      and by Pearson ≈ 1.0 extraction fidelity.
 *
 *   B. CORRELATION WITH EXPECTED PLAYER BEHAVIOR — the extracted covariate
 *      carries information about the downstream outcome in the direction the
 *      bind docstrings predict:
 *      - avgCushion ↑ → catch rate ↑         (positive)
 *      - avgCushion ↑ → rec-TD rate ↑        (positive)
 *      - avgTimeToThrow ↑ → sack rate ↑      (positive)
 *      - avgAirYardsDifferential ↑ → comp rate ↓  (negative)
 *
 * All synthetic data is deterministic (seeded PRNG) so the backtest is
 * reproducible. All bind outputs carry priced: false.
 *
 * Honesty: signal-quality + correlation backtest, NOT a P&L backtest. The
 * binds are covariate pass-throughs; we verify the signal they carry and the
 * direction it moves, never that it beats the market (that is the model's
 * job — binds ship priced:false, shadow-only).
 */
import { describe, expect, it } from "vitest";

import {
  CATCH_CUSHION_BIND_METHOD_TAG,
  bindCatchCushionSamples,
  type BoundCatchSample,
  type CatchCushionBindRequest,
} from "../props-hb-catch-cushion-bind.js";
import {
  REC_TD_CUSHION_BIND_METHOD_TAG,
  bindRecTdCushionSamples,
  type BoundRecTdSample,
  type RecTdCushionBindRequest,
} from "../props-hb-rec-td-cushion-bind.js";
import {
  SACK_TTT_BIND_METHOD_TAG,
  bindSackTttSamples,
  type BoundSackSample,
  type SackTttBindRequest,
} from "../props-hb-sack-ttt-bind.js";
import {
  COMP_AIR_YARDS_DIFF_BIND_METHOD_TAG,
  bindCompAirYardsDiffSamples,
  type BoundCompSample,
  type CompAirYardsDiffBindRequest,
} from "../props-hb-comp-air-yards-diff-bind.js";
import type { CovariateRow } from "../covariate-bus.js";
import { measureSeparationAgainstNgs } from "../ngs-measurement-loop.js";
import { pearson, sigmoid } from "../../expected-metrics/numeric.js";

/* ══════════════════════════════════════════════════════════════════════ *
 * Seeded PRNG — mulberry32, deterministic, zero-dependency.               *
 * Same seed → identical synthetic dataset every run.                     *
 * ══════════════════════════════════════════════════════════════════════ */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randNormal(rng: () => number, mu: number, sigma: number): number {
  const u1 = rng() || 1e-10;
  const u2 = rng();
  return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/* ══════════════════════════════════════════════════════════════════════ *
 * Synthetic NGS row factory — full CovariateRow with every field        *
 * populated; the binds only read one field each, but we emit realistic  *
 * rows per the CovariateRow contract.                                    *
 * ══════════════════════════════════════════════════════════════════════ */
function baseRow(o: Partial<CovariateRow>): CovariateRow {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    week: 1,
    statType: "receiving",
    avgSeparation: 2.5,
    avgCushion: 4.0,
    airYardsShare: 0.18,
    avgTimeToThrow: 2.6,
    aggressiveness: 19.2,
    avgIntendedAirYards: 8.4,
    avgCompletedAirYards: 6.7,
    avgAirYardsDifferential: 1.7,
    pctAttemptsGte8Defenders: 0.54,
    avgTimeToLos: 2.2,
    avgYac: 4.3,
    pressureRate: null,
    intRate: null,
    snapShare: null,
    tflRate: null,
    pdRate: null,
    avgExpectedYac: null,
    expectedRushYards: null,
    ...o,
  };
}

function receivingRow(o: Partial<CovariateRow>): CovariateRow {
  return baseRow({ statType: "receiving", ...o });
}

function passingRow(o: Partial<CovariateRow>): CovariateRow {
  return baseRow({ statType: "passing", ...o });
}

/* ══════════════════════════════════════════════════════════════════════ *
 * Synthetic behavior models — the GROUND TRUTH signal we inject.          *
 * These define the expected player behavior patterns described in the      *
 * bind docstrings.                                                       *
 * ══════════════════════════════════════════════════════════════════════ */

/** catch rate rises with cushion: more space → easier catch. */
function catchRateFromCushion(cushion: number, rng: () => number): number {
  return Math.max(0.02, Math.min(0.98, sigmoid(-2.0 + 0.6 * cushion) + randNormal(rng, 0, 0.035)));
}

/** rec-TD rate rises with cushion: more catches → more scores. */
function recTdRateFromCushion(cushion: number, rng: () => number): number {
  return Math.max(0.005, Math.min(0.6, sigmoid(-3.0 + 0.7 * cushion) + randNormal(rng, 0, 0.025)));
}

/** sack rate rises with TTT: longer hold → pass rush arrives. */
function sackRateFromTtt(ttt: number, rng: () => number): number {
  return Math.max(0.02, Math.min(0.55, sigmoid(-3.0 + 1.2 * ttt) + randNormal(rng, 0, 0.045)));
}

/** completion rate falls with air-yards differential: deeper throws → harder. */
function compRateFromDiff(diff: number, rng: () => number): number {
  return Math.max(0.4, Math.min(0.92, sigmoid(1.0 - 0.5 * diff) + randNormal(rng, 0, 0.035)));
}

const SEASON = 2024;
const KICKOFF_WEEK = 9; // predict week 9 from weeks 1..8

interface SyntheticPlayer {
  readonly gsisId: string;
  readonly cushionAffinity: number;
  readonly tttAffinity: number;
  readonly diffAffinity: number;
}

/* ══════════════════════════════════════════════════════════════════════ *
 * Synthetic dataset builder — N players, weeks 0..8 of NGS rows.          *
 * Week 0 = full-season aggregate (must be rejected by the binds).       *
 * Weeks 1..8 = per-game rows the binds read. Week 9 = prediction.         *
 * ─────────────────────────────────────────────────────────────────────  *
 * NOTE: bound samples do NOT carry gsisId — the binds return only the    *
 * enriched sample (targets, receptions, covariate cell). We rely on the   *
 * ORDER-PRESERVING invariant: results[i] ↔ requests[i] ↔ players[i].     *
 * ══════════════════════════════════════════════════════════════════════ */
function buildSyntheticRows(
  nPlayers: number,
  seed: number,
  opts?: { injectNulls?: boolean },
): { rows: CovariateRow[]; players: SyntheticPlayer[] } {
  const rng = mulberry32(seed);
  const rows: CovariateRow[] = [];
  const players: SyntheticPlayer[] = [];

  for (let i = 0; i < nPlayers; i++) {
    const gsisId = `00-0030${String(i).padStart(4, "0")}-${String((i % 32) + 1).padStart(4, "0")}`;
    const cushion = 1.5 + rng() * 5.0; // 1.5 .. 6.5 yards
    const ttt = 1.8 + rng() * 1.8; // 1.8 .. 3.6 seconds
    const diff = 0.2 + rng() * 2.8; // 0.2 .. 3.0 yards
    players.push({ gsisId, cushionAffinity: cushion, tttAffinity: ttt, diffAffinity: diff });

    // week=0 season aggregate — the binds MUST ignore it (poison pill).
    rows.push(
      receivingRow({
        gsisId,
        season: SEASON,
        week: 0,
        avgCushion: cushion + randNormal(rng, 0, 0.01),
      }),
      passingRow({
        gsisId,
        season: SEASON,
        week: 0,
        avgTimeToThrow: ttt + randNormal(rng, 0, 0.01),
        avgAirYardsDifferential: diff + randNormal(rng, 0, 0.01),
      }),
    );

    // weeks 1..8 — the prior-game rows the binds read.
    for (let w = 1; w <= 8; w++) {
      const c = cushion + randNormal(rng, 0, 0.12);
      const t = ttt + randNormal(rng, 0, 0.1);
      const d = diff + randNormal(rng, 0, 0.15);
      rows.push(
        receivingRow({ gsisId, season: SEASON, week: w, avgCushion: opts?.injectNulls && w === 4 ? null : c }),
        passingRow({
          gsid: gsisId, // placeholder — fixed below
        } as CovariateRow),
      );
      // Overwrite the passing row with correct values (clean construction).
      rows[rows.length - 1] = passingRow({
        gsisId,
        season: SEASON,
        week: w,
        avgTimeToThrow: opts?.injectNulls && w === 4 ? null : t,
        avgAirYardsDifferential: opts?.injectNulls && w === 4 ? null : d,
      });
    }
  }

  return { rows, players };
}

/* ── Order-preserving extractors (results[i] ↔ players[i]) ── */
function extractCatchCushions(rows: CovariateRow[], players: SyntheticPlayer[]) {
  const requests: CatchCushionBindRequest[] = players.map((p) => ({
    gsid: p.gsid,
    season: SEASON,
    kickoffWeek: KICKOFF_WEEK,
    catch: { targets: 8, receptions: 6 },
  }));
  return bindCatchCushionSamples(rows, requests);
}
