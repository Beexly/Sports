/**
 * Nightly Discovery Worker — Dry Run (v1)
 *
 * The "smarter every night" organ, in its safe, owner-gated form. It re-tests the
 * bounded pre-registered candidate family, applies BH-FDR + cross-night confirmation,
 * and EMITS PROPOSALS — it never applies one. This dry-run runs the engine on a
 * deterministic in-memory scenario (no DB, no network, no clock-dependent logic) so
 * you can see exactly what a real night would surface, and proves the structural
 * guarantee: every artifact it can produce has status "PROPOSED".
 *
 * Run: npx tsx workers/nightly-discovery/src/dry-run.ts
 *
 * WHAT IT DOES:        load candidate night-results → FDR → cross-night → write
 *                      proposals.json + REPORT.md to ./out, print a summary.
 * WHAT IT DOES NOT DO: no DB writes, no gate flips, no MODEL_VERSION bump, no calls
 *                      to any pricing/publish gate. The owner alone acts on a proposal.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runDiscoveryNight,
  assertAllProposed,
  type CandidateNightResult,
  type DiscoveryNightInput,
} from "../../../packages/prediction-engine/src/discovery-engine.js";
import {
  CANDIDATE_REGISTRY,
  assertBoundedFamily,
} from "../../../packages/prediction-engine/src/candidate-registry.js";
import type { NightlyObservation } from "../../../packages/prediction-engine/src/multiple-testing.js";

// The family must be bounded before any FDR run — fail loudly otherwise.
assertBoundedFamily();

/**
 * Deterministic demonstration scenario (stands in for the settled-data backtest a
 * real night would run). It exercises every path: a cross-night-confirmed promotion,
 * a single-night discovery that is correctly WITHHELD, an under-sampled exclusion,
 * a decayed live signal demotion, and a calibration-drift recalibration.
 */
const PRIOR_HISTORY: Record<string, NightlyObservation[]> = {
  // Two prior confirmed nights → tonight is the 3rd → promotable.
  "home-dog-bounce": [
    { pValue: 0.003, discovery: true },
    { pValue: 0.004, discovery: true },
  ],
  // A live signal that has gone cold for two nights → tonight's miss demotes it.
  "early-season-over": [
    { pValue: 0.6, discovery: false },
    { pValue: 0.7, discovery: false },
  ],
};

const TONIGHT: CandidateNightResult[] = [
  // Confirms its streak (low p, adequate sample, positive effect) → PROMOTE proposal.
  { id: "home-dog-bounce", pValue: 0.002, effectSize: 0.061, sampleSize: 412 },
  // First-ever discovery — must NOT promote (cross-night discipline).
  { id: "short-week-road-fade", pValue: 0.004, effectSize: 0.048, sampleSize: 233 },
  // Under-sampled — excluded from the FDR family entirely.
  { id: "high-wind-total-under", pValue: 0.001, effectSize: 0.09, sampleSize: 41 },
  // A live signal that just missed again → DEMOTE proposal.
  { id: "early-season-over", pValue: 0.55, effectSize: 0.005, sampleSize: 380 },
  // Plain noise.
  { id: "divisional-primetime-under", pValue: 0.62, effectSize: -0.002, sampleSize: 300 },
];

const input: DiscoveryNightInput = {
  results: TONIGHT,
  history: PRIOR_HISTORY,
  currentlyPromoted: ["early-season-over"],
  q: 0.1,
  minSample: 100,
  crossNight: { requiredConsecutive: 3, alphaPromote: 0.05 },
  demoteAfterMisses: 3,
  recalibration: { drifted: true, note: "rolling ECE 0.081 over the last 240 graded picks" },
};

const report = runDiscoveryNight(input);

// Structural backstop — would throw if anything but "PROPOSED" ever appeared.
assertAllProposed(report.proposals);

const now = new Date().toISOString();
const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
mkdirSync(outDir, { recursive: true });

const proposalsJson = {
  generatedAt: now,
  mode: "DRY_RUN",
  familySize: CANDIDATE_REGISTRY.length,
  familyTested: report.familyTested,
  underSampled: report.underSampled,
  fdrQ: input.q,
  fdrDiscoveries: report.fdr.discoveries,
  proposals: report.proposals,
};
writeFileSync(join(outDir, "proposals.json"), JSON.stringify(proposalsJson, null, 2));

const md: string[] = [];
md.push(`# Nightly Discovery — PROPOSED artifacts (DRY RUN)`);
md.push(``);
md.push(`Generated: ${now}`);
md.push(``);
md.push(
  `Family: ${CANDIDATE_REGISTRY.length} pre-registered · tested tonight: ${report.familyTested} · ` +
    `under-sampled (excluded): ${report.underSampled} · FDR discoveries @ q=${input.q}: ${report.fdr.discoveries}`,
);
md.push(``);
if (report.proposals.length === 0) {
  md.push(`**No proposals tonight.** Nothing cleared FDR + cross-night confirmation. That is the common, honest outcome.`);
} else {
  md.push(`## Proposals (owner-gated — NOT applied)`);
  for (const p of report.proposals) {
    md.push(``);
    md.push(`### ${p.kind} — \`${p.candidateId}\`  _(status: ${p.status})_`);
    md.push(p.rationale);
    md.push(
      `- evidence: p=${p.evidence.pValue}, q=${p.evidence.qValue ?? "—"}, effect=${p.evidence.effectSize}, ` +
        `n=${p.evidence.sampleSize}, consecutiveNights=${p.evidence.consecutiveDiscoveryNights}`,
    );
  }
}
md.push(``);
md.push(`---`);
md.push(`_The discovery loop only PROPOSES. The owner is the sole actor who can flip a live gate._`);
writeFileSync(join(outDir, "REPORT.md"), md.join("\n") + "\n");

// ─── Console summary ────────────────────────────────────────────────────────────
const line = "─".repeat(64);
console.log();
console.log(line);
console.log("  NIGHTLY DISCOVERY — DRY RUN");
console.log(`  Generated: ${now}`);
console.log(line);
console.log();
console.log(`Family size (pre-registered): ${CANDIDATE_REGISTRY.length}`);
console.log(`Tested tonight (n ≥ ${input.minSample}): ${report.familyTested}`);
console.log(`Under-sampled (excluded):     ${report.underSampled}`);
console.log(`FDR discoveries @ q=${input.q}:        ${report.fdr.discoveries}`);
console.log();
console.log(`PROPOSALS (${report.proposals.length}) — all owner-gated, none applied:`);
if (report.proposals.length === 0) {
  console.log("  (none — nothing survived FDR + cross-night confirmation)");
} else {
  for (const p of report.proposals) {
    console.log(`  • ${p.kind.padEnd(11)} ${p.candidateId.padEnd(26)} [${p.status}]`);
    console.log(`      ${p.rationale}`);
  }
}
console.log();
console.log("COMPLIANCE POSTURE");
console.log("  No DB writes:            YES (dry-run only)");
console.log("  No gate flipped:         YES (PROPOSED-only by construction)");
console.log("  No MODEL_VERSION bump:   YES");
console.log("  Artifacts written:       workers/nightly-discovery/out/{proposals.json,REPORT.md}");
console.log();
console.log(line);
console.log("  DRY RUN COMPLETE — proposals emitted, nothing applied.");
console.log(line);
console.log();
