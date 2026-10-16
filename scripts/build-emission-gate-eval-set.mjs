#!/usr/bin/env node
/**
 * Build emission-gate eval-set v2 from the settled-picks export.
 *
 * Input: reports/settled-picks-for-calibration.jsonl (the read-only production
 * export, scripts/export-settled-picks-for-calibration.mjs).
 * Output: eval-set-v2 JSONL in the harness's frozen schema
 * (HarnessRow in packages/prediction-engine/src/edge-lab/emission-gate-harness.ts)
 * — whitelist state fields only, labels joined as data (the harness arms read
 * them only after scoring), every exclusion counted by reason.
 *
 * Cuts (never blended):
 *   - proxy  : rows WITHOUT finite clvValue (motif eval-set Tier B analog)
 *   - clv    : rows WITH finite clvValue (dataset v2 — true CLV landed
 *              2026-10-16; supersedes Tier B per the work order once scored)
 *
 * Units: 1u staked at the locked price. WIN pays price/100 (positive odds) or
 * 100/|price| (negative odds); LOSS -1. PUSH rows are EXCLUDED (repo doctrine:
 * never average a push into a win rate), counted by reason.
 *
 * Deterministic: rows sorted by (settledAt, id). No randomness. Never prints
 * secrets; the file contains no secrets.
 *
 * Usage: node scripts/build-emission-gate-eval-set.mjs \
 *          [--in reports/settled-picks-for-calibration.jsonl] \
 *          [--out reports/emission-gate-eval-set-v2.jsonl]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const inPath = resolve(arg("--in", "reports/settled-picks-for-calibration.jsonl"));
const outPath = resolve(arg("--out", "reports/emission-gate-eval-set-v2.jsonl"));

const raw = readFileSync(inPath, "utf8").trim().split("\n").map((l) => JSON.parse(l));

const excluded = { push: 0, unlabeled: 0, no_state: 0 };
const rows = [];

for (const r of raw.sort((a, b) => String(a.settledAt).localeCompare(String(b.settledAt)) || String(a.id).localeCompare(String(b.id)))) {
  // ---- Label. ----
  let outcome;
  if (r.result === "WIN") outcome = 1;
  else if (r.result === "LOSS") outcome = 0;
  else if (r.result === "PUSH") {
    excluded.push++;
    continue;
  } else {
    excluded.unlabeled++;
    continue;
  }

  // ---- Whitelist state (all probability-scaled [0,1]). ----
  const fb = r.factorBreakdown ?? {};
  const ie = fb.independentEdge ?? {};
  const baseSignals = {};
  let stateCount = 0;
  const tp = ie.trueProb;
  if (typeof tp === "number" && Number.isFinite(tp) && tp >= 0 && tp <= 1) {
    baseSignals.model_prob = tp;
    stateCount++;
  }
  const rp = r.rankingP;
  if (typeof rp === "number" && Number.isFinite(rp) && rp >= 0 && rp <= 1) {
    baseSignals.ranking_p = rp;
    stateCount++;
  }
  if (typeof r.consensusPct === "number" && Number.isFinite(r.consensusPct)) {
    const c = r.consensusPct > 1 ? r.consensusPct / 100 : r.consensusPct;
    if (c >= 0 && c <= 1) {
      baseSignals.consensus_norm = c;
      stateCount++;
    }
  }
  if (typeof r.bookmakerCount === "number" && Number.isFinite(r.bookmakerCount) && r.bookmakerCount >= 0) {
    baseSignals.book_depth_norm = Math.min(1, r.bookmakerCount / 11);
    stateCount++;
  }
  // Rows with no state at all cannot be gated (the gate abstains on them by
  // construction) — excluded with a count rather than silently weakening
  // the emit-rate denominators.
  if (stateCount === 0) {
    excluded.no_state++;
    continue;
  }

  const marketPrior =
    typeof r.marketFairProb === "number" && Number.isFinite(r.marketFairProb) && r.marketFairProb >= 0 && r.marketFairProb <= 1
      ? r.marketFairProb
      : undefined;

  // ---- Units at the locked price. ----
  let units;
  if (outcome === 1) {
    const p = r.clvLockPrice;
    units = typeof p === "number" && Number.isFinite(p) && p !== 0 ? (p > 0 ? p / 100 : 100 / -p) : 1;
  } else {
    units = -1;
  }

  const startIso = r.game?.startTime;
  rows.push({
    rowId: r.id,
    gameKey: r.game?.id ?? r.gameId,
    market: r.pickType,
    selection: r.selection,
    baseSignals,
    marketPrior,
    outcome,
    units,
    clvValue: typeof r.clvValue === "number" && Number.isFinite(r.clvValue) ? r.clvValue : undefined,
    period: typeof startIso === "string" && startIso.length >= 7 ? startIso.slice(0, 7) : undefined,
    tier: "prod",
    modelVersion: r.modelVersion,
    isPublished: r.isPublished === true,
  });
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""), "utf8");

const withClv = rows.filter((r) => typeof r.clvValue === "number").length;
console.log(
  JSON.stringify(
    {
      ok: true,
      in: inPath,
      out: outPath,
      inputRows: raw.length,
      outputRows: rows.length,
      excluded,
      cuts: { clv: withClv, proxy: rows.length - withClv },
      markets: rows.reduce((acc, r) => ((acc[r.market] = (acc[r.market] ?? 0) + 1), acc), {}),
    },
    null,
    2,
  ),
);
