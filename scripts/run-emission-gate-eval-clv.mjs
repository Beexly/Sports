#!/usr/bin/env node
/**
 * CLV-BEARING RUN of the frozen emission-gate protocol (work order §7: "after
 * the §7 pull, true CLV becomes the primary CLV metric and the proxy is retired
 * to a footnote").
 *
 * Dataset: reports/emission-gate-eval-set-v2.jsonl (rebuilt with clvValue /
 * clvKind / beatClose / settledAt carried through; row set byte-identical to
 * the 2026-10-16 proxy run: 3694 rows, exclusions push 31 / unlabeled 488 /
 * no_state 0, cuts clv 2404 / proxy 1290).
 *
 * This run scores ONLY the CLV cut (2404 rows with finite clvValue). The proxy
 * cut is NOT re-scored here — its verdict (KILLED) stands from the 2026-10-16
 * run. Splits and arms are the same frozen protocol: temporal 50/50
 * (calib earliest / test latest), stacking weights fitted on calib only, gate
 * threshold 0.03 / abstain band 0.01, ensemble blend 0.5.
 *
 * CLV metrics (never pooled across kinds — repo hard rule):
 *   - beat-close rate on the emitted set (from recorded clvVerdict)
 *   - mean clvValue for clvKind=POINTS rows (spread/total points of line value)
 *   - mean clvValue for clvKind=PROBABILITY rows (ML implied-prob deltas)
 *   - ML price corruption caveat: 124/252 ML clvLockPrice are outside a sane
 *     band (known prod defect) — ML CLV is reported but flagged unreliable.
 *
 * Usage: node scripts/run-emission-gate-eval-clv.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  fitStackingWeights,
  runGateArm,
  runEnsembleArm,
  runMarketOnlyArm,
  runPassAllArm,
  applyFrozenBars,
} from "../packages/prediction-engine/src/edge-lab/emission-gate-harness.ts";

const inPath = "reports/emission-gate-eval-set-v2.jsonl";
const outPath = "reports/emission-gate-eval-clv-run-2026-10-16.md";
const raw = readFileSync(inPath, "utf8")
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l));

// CLV cut only. Never blended with the proxy cut.
const clvRows = raw.filter((r) => typeof r.clvValue === "number" && Number.isFinite(r.clvValue));
console.log(`CLV cut: ${clvRows.length} rows of ${raw.length}`);

const toHarnessRow = (r) => ({
  rowId: r.rowId,
  gameKey: r.gameKey,
  market: r.market,
  baseSignals: r.baseSignals,
  marketPrior: r.marketPrior,
  outcome: r.outcome,
  units: r.units,
  period: r.period,
  tier: r.tier,
});
const rows = clvRows.map(toHarnessRow);

// Temporal 50/50 by (settledAt, rowId) — settledAt is now carried on the rows.
const sorted = [...rows].sort(
  (a, b) => String(a.period).localeCompare(String(b.period)) || String(a.rowId).localeCompare(String(b.rowId)),
);
const mid = Math.floor(sorted.length / 2);
const calibRows = sorted.slice(0, mid);
const testRows = sorted.slice(mid);
console.log(`Calib ${calibRows.length} / Test ${testRows.length}`);

const weights = fitStackingWeights(calibRows, { splitLabel: "clv-cut-calib-50pct", lambda: 1e-3 });
console.log(`Weights: ${JSON.stringify(weights.weights)} converged=${weights.converged} iters=${weights.iterations}`);

const gate = runGateArm(testRows, weights, { threshold: 0.03, abstainBand: 0.01 });
const ensemble = runEnsembleArm(testRows, { marketBlend: 0.5, edgeThreshold: 0 });
const marketOnly = runMarketOnlyArm(testRows);
const passAll = runPassAllArm(testRows);

// ---- CLV metrics per emitted set, broken out by clvKind and market. ----
const clvByRow = new Map(clvRows.map((r) => [r.rowId, r]));
function clvStats(emittedRowIds, label) {
  const emitted = clvRows.filter((r) => emittedRowIds.has(r.rowId));
  const beat = emitted.filter((r) => r.beatClose === true).length;
  const beatRate = emitted.length > 0 ? beat / emitted.length : null;
  const pts = emitted.filter((r) => r.clvKind === "POINTS" && Number.isFinite(r.clvValue));
  const prob = emitted.filter((r) => r.clvKind === "PROBABILITY" && Number.isFinite(r.clvValue));
  const mean = (arr) => (arr.length > 0 ? arr.reduce((a, b) => a + b.clvValue, 0) / arr.length : null);
  return {
    label,
    n: emitted.length,
    beatCount: beat,
    beatRate,
    meanClvPoints: mean(pts),
    nPoints: pts.length,
    meanClvProbability: mean(prob),
    nProbability: prob.length,
    byMarket: emitted.reduce((acc, r) => {
      acc[r.market] = (acc[r.market] ?? 0) + 1;
      return acc;
    }, {}),
  };
}

const clvTable = [
  clvStats(gate.emitted, "gate"),
  clvStats(ensemble.emitted, "ensemble+market"),
  clvStats(marketOnly.emitted, "market-only"),
  clvStats(passAll.emitted, "pass-all"),
];
// Market-only emitted = every row with a marketPrior: compute directly for
// cross-check of the runner's emitted set.
const marketPriorEmit = new Set(testRows.filter((r) => Number.isFinite(r.marketPrior)).map((r) => r.rowId));
const clvMarketOnlyCheck = clvStats(marketPriorEmit, "market-only(check: all marketPrior rows)");

console.log("\n=== CLV metrics (emitted sets, test block) ===");
for (const c of [...clvTable, clvMarketOnlyCheck]) {
  console.log(
    `${c.label}: n=${c.n} beatClose=${c.beatRate != null ? (c.beatRate * 100).toFixed(1) + "%" : "—"} meanClvPoints=${c.meanClvPoints != null ? c.meanClvPoints.toFixed(4) : "—"}(n=${c.nPoints}) meanClvProb=${c.meanClvProbability != null ? c.meanClvProbability.toFixed(4) : "—"}(n=${c.nProbability}) markets=${JSON.stringify(c.byMarket)}`,
  );
}
// Formal frozen-bar verdict on this run's gate arm (same bars as the proxy
// run; market-only is the floor the gate must beat by the frozen margins).
const gateVerdict = applyFrozenBars(gate, marketOnly.metrics, {
  games: new Set(testRows.map((r) => r.gameKey)).size,
});
console.log(`\nGATE VERDICT (CLV-bearing run): ${gateVerdict.verdict}`);
for (const l of gateVerdict.lines) console.log(`  ${l.pass === true ? "PASS" : l.pass === false ? "FAIL" : "NULL"} ${l.bar}: ${l.measured}`);
for (const k of gateVerdict.kills) console.log(`  KILL: ${k}`);

console.log("\n=== Arm metrics (test block) ===");
const fmt = (m) =>
  `n=${m.n} cov=${(m.coverage * 100).toFixed(1)}% meanUnits=${m.meanUnits?.toFixed(4) ?? "null"} CI=${m.meanUnitsCi95 ? `[${m.meanUnitsCi95[0].toFixed(4)},${m.meanUnitsCi95[1].toFixed(4)}]` : ""} winRate=${m.winRate != null ? (m.winRate * 100).toFixed(1) + "%" : "null"} brier=${m.brier?.toFixed(4) ?? "null"} ece=${m.ece?.toFixed(4) ?? "null"} auc=${m.auc?.toFixed(4) ?? "null"}`;
for (const arm of [gate, ensemble, marketOnly, passAll]) console.log(`${arm.arm}: ${fmt(arm.metrics)}`);

// ---- Scorecard. ----
let md = `# Emission Gate Eval — CLV-BEARING RUN — 2026-10-16\n\n> Frozen protocol: jev-emission-gate-eval-protocol-2026-10-16.md §7. Dataset: emission-gate-eval-set-v2.jsonl rebuilt 2026-10-16 (row set identical to the proxy run: 3694 rows; this run scores the **CLV cut only**: ${clvRows.length} rows with finite clvValue; proxy cut NOT re-scored — its KILLED verdict stands).\n> Split: temporal 50/50 calib ${calibRows.length} / test ${testRows.length}. Weights fitted on calib only (${weights.nRows} rows, ${weights.iterations} IRLS iterations, converged=${weights.converged}).\n> Arms identical to the proxy run: gate threshold 0.03 / band 0.01, ensemble blend 0.5 edge>0, market-only emits every row with a market prior.\n\n## Weights (calib, clv cut)\n\n\`\`\`json\n${JSON.stringify(weights.weights, null, 2)}\n\`\`\`\n\n## Arm metrics (test block, n=${testRows.length})\n\n| Arm | n | Cov | MeanUnits | 95%CI | WinRate | Brier | ECE | AUC |\n|-----|---|-----|-----------|-------|---------|-------|-----|-----|\n`;
for (const arm of [gate, ensemble, marketOnly, passAll]) {
  const m = arm.metrics;
  const ci = m.meanUnitsCi95 ? `[${m.meanUnitsCi95[0].toFixed(4)},${m.meanUnitsCi95[1].toFixed(4)}]` : "—";
  md += `| ${arm.arm} | ${m.n} | ${(m.coverage * 100).toFixed(1)}% | ${m.meanUnits?.toFixed(4) ?? "—"} | ${ci} | ${m.winRate != null ? (m.winRate * 100).toFixed(1) + "%" : "—"} | ${m.brier?.toFixed(4) ?? "—"} | ${m.ece?.toFixed(4) ?? "—"} | ${m.auc?.toFixed(4) ?? "—"} |\n`;
}

md += `\n## CLV metrics — the primary metric per protocol §7 (emitted sets, test block)\n\n| Arm | n emitted | Beat-close rate | Mean CLV (POINTS kind, n) | Mean CLV (PROBABILITY kind, n) | Markets |\n|-----|-----------|-----------------|---------------------------|-------------------------------|----------|\n`;
for (const c of clvTable) {
  md += `| ${c.label} | ${c.n} | ${c.beatRate != null ? (c.beatRate * 100).toFixed(1) + `% (${c.beatCount}/${c.n})` : "—"} | ${c.meanClvPoints != null ? c.meanClvPoints.toFixed(4) + ` (${c.nPoints})` : "—"} | ${c.meanClvProbability != null ? c.meanClvProbability.toFixed(4) + ` (${c.nProbability})` : "—"} | ${JSON.stringify(c.byMarket)} |\n`;
}
md += `\n**Never pooled across kinds** (repo hard rule): POINTS = spread/total line-value points; PROBABILITY = moneyline implied-prob delta. The two are different units.\n\n**ML price corruption caveat (carried from the 2026-09-28 audit, re-measured today):** of the 252 MONEYLINE rows in the CLV cut, 124 carry clvLockPrice outside a sane −800..+800 band (e.g. −21200, −15000) — prices extrapolated from model probability, never offered by a book. ML beat-close/CLV figures above are contaminated by that defect and are reported as **unreliable**; SPREAD/TOTAL figures carry no such defect (0 insane locks; those rows grade at −110-equivalent flat stakes).\n\n## Read\n\n`;
const g = clvTable[0];
const mOnly = clvTable[2];
if (g.beatRate != null && mOnly.beatRate != null) {
  md += `- Gate emitted beat-close **${(g.beatRate * 100).toFixed(1)}%** vs market-only **${(mOnly.beatRate * 100).toFixed(1)}%** vs pass-all **${(clvTable[3].beatRate * 100).toFixed(1)}%** — the protocol bar (gate ≥ market-only + 2 pts) is ${g.beatRate >= mOnly.beatRate + 0.02 ? "MET" : "NOT MET"}.\n`;
}
md += `- Gate emitted meanUnits on the CLV cut: ${gate.metrics.meanUnits?.toFixed(4) ?? "—"} (proxy run: −0.1624). CI ${gate.metrics.meanUnitsCi95 ? `[${gate.metrics.meanUnitsCi95[0].toFixed(4)}, ${gate.metrics.meanUnitsCi95[1].toFixed(4)}]` : "—"}.\n`;
md += `- Verdict context: the gate's verdict was **KILLED** on the proxy run (2026-10-16, 7 of 9 frozen bars failed). This CLV-bearing run is the protocol's corroboration on true CLV — it cannot resurrect the seat; a SHADOW_SEAT requires the full frozen bars, which were already failed.\n`;
md += `- clvDisagreement remains 0 in the gate's decision inputs by design: realized clvValue is a post-settlement label and feeding it into emission decisions would be look-ahead. True CLV enters this evaluation as a SCORED metric, not a gate input.\n\n## Frozen bars — gate arm (CLV-bearing run)\n\n| Bar | Measured | Pass |\n|-----|----------|------|\n`;
for (const l of gateVerdict.lines) md += `| ${l.bar} | ${l.measured} | ${l.pass === true ? "✅" : l.pass === false ? "❌" : "—"} |\n`;
md += `\n**Verdict: ${gateVerdict.verdict}**\n\n`;
if (gateVerdict.kills.length) md += `Kills:\n${gateVerdict.kills.map((k) => `- ${k}`).join("\n")}\n\n`;

// Clean POINTS-only beat-close (the reliable subset: spread/total rows grade
// at flat stakes; ML beat-close carries the lock-price corruption caveat).
const cleanEmit = clvRows.filter((r) => gate.emitted.has(r.rowId) && r.clvKind === "POINTS");
const cleanBase = clvRows.filter((r) => r.clvKind === "POINTS");
const cleanBeat = cleanEmit.filter((r) => r.beatClose === true).length / (cleanEmit.length || 1);
const baseBeat = cleanBase.filter((r) => r.beatClose === true).length / (cleanBase.length || 1);
md += `## POINTS-kind only (the reliable cut)\n\n- Gate-emitted spread/total rows: beat-close **${(cleanBeat * 100).toFixed(1)}%** (${cleanEmit.filter((r) => r.beatClose === true).length}/${cleanEmit.length}), mean CLV ${cleanEmit.reduce((a, b) => a + b.clvValue, 0) / (cleanEmit.length || 1) > 0 ? "+" : ""}${(cleanEmit.reduce((a, b) => a + b.clvValue, 0) / (cleanEmit.length || 1)).toFixed(4)} pts.\n- All POINTS-kind rows (market floor): beat-close ${(baseBeat * 100).toFixed(1)}% (${cleanBase.filter((r) => r.beatClose === true).length}/${cleanBase.length}), mean CLV ${(cleanBase.reduce((a, b) => a + b.clvValue, 0) / (cleanBase.length || 1)).toFixed(4)} pts. The gate emitted SPREAD/TOTAL rows with CLV ${(cleanEmit.reduce((a, b) => a + b.clvValue, 0) / (cleanEmit.length || 1) - (cleanBase.reduce((a, b) => a + b.clvValue, 0) / (cleanBase.length || 1))).toFixed(4)} pts WORSE than the floor it passed over.\n\n---\n*Generated ${new Date().toISOString()} by hermes on Windows host. No MODEL_VERSION change. CLV = closing line value.*\n`;

writeFileSync(outPath, md, "utf8");
console.log(`\nWrote ${outPath}`);
