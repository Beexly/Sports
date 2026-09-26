#!/usr/bin/env node
/**
 * Integrity guard for the L11 calibration evidence.
 *
 * `docs/calibration-proposals/` is the authority for MODEL_VERSION bumps, and
 * its JSON is the measurement those bumps rest on. A hand-copied delta or a
 * re-keyed field would be invisible in review, so the arithmetic is re-derived
 * here from the components that are supposed to produce it, and each proposal
 * is required to name the artifact it cites.
 *
 * This is structure and arithmetic only. It cannot tell you whether a
 * measurement was right — it can only tell you that the recorded pieces still
 * add up to the recorded conclusions, so nobody can quietly edit one side.
 *
 * Run: node --test docs/calibration-proposals/evidence/verify-evidence.test.mjs
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(HERE, rel), "utf8");
const json = (rel) => JSON.parse(read(rel));

const a2 = json("2026-09-15-a2-shrinkage-scorecard.json");
const a8 = json("2026-09-15-a8-boltzmann-vs-isotonic.json");

/** Every scorecard-shaped block in an evidence file. */
function scorecards(doc) {
  const out = [];
  const visit = (node, keyPath) => {
    if (!node || typeof node !== "object") return;
    if (typeof node.candidateBrier === "number" && typeof node.marketBrier === "number") {
      out.push({ name: keyPath, node });
      return;
    }
    for (const [k, v] of Object.entries(node)) visit(v, keyPath ? `${keyPath}.${k}` : k);
  };
  visit(doc, "");
  return out;
}

test("every recorded delta is the difference of the two recorded scores", () => {
  for (const { name, node } of scorecards(a2)) {
    if (typeof node.deltaBrier !== "number") continue;
    const expected = node.candidateBrier - node.marketBrier;
    assert.ok(
      Math.abs(node.deltaBrier - expected) < 1e-12,
      `${name}: deltaBrier ${node.deltaBrier} != ${node.candidateBrier} - ${node.marketBrier}`,
    );
  }
});

test("log-loss deltas are re-derivable too", () => {
  for (const { name, node } of scorecards(a2)) {
    if (typeof node.candidateLogLoss !== "number") continue;
    const expected = node.candidateLogLoss - node.marketLogLoss;
    assert.ok(Math.abs(node.deltaLogLoss - expected) < 1e-12, `${name}: log-loss delta mismatch`);
  }
});

test("a Wilson band on a scorecard is arithmetically possible", () => {
  const w = a2.primary.wilson;
  assert.equal(w.n, a2.primary.n, "the band must cover the same rows as the scorecard");
  assert.ok(w.successes <= w.n && w.successes >= 0);
  assert.ok(Math.abs(w.point - w.successes / w.n) < 1e-12, "point must be successes / n");
  assert.ok(w.low <= w.point && w.point <= w.high, "the point estimate must sit inside the band");
  assert.ok(w.low >= 0 && w.high <= 1);
  assert.ok(Math.abs(w.z - 1.959963984540054) < 1e-12, "z must be the two-sided 95% value");
});

test("P(better) is a whole number of the resamples it declares", () => {
  for (const { name, node } of scorecards(a2)) {
    if (typeof node.pBetter !== "number") continue;
    assert.ok(node.pBetter >= 0 && node.pBetter <= 1, `${name}: P(better) out of range`);
    // The secondary arms record the rate but not the resample count, so only a
    // block that declares a count can be checked for integrality.
    if (typeof node.pBetterResamples !== "number") continue;
    const count = node.pBetter * node.pBetterResamples;
    assert.ok(
      Math.abs(count - Math.round(count)) < 1e-6,
      `${name}: P(better)=${node.pBetter} over ${node.pBetterResamples} resamples is not a count`,
    );
  }
});

test("the primary arm records everything needed to reproduce the draw", () => {
  // seed + resample count are what make P(better) re-derivable; the secondary
  // arms omit them, which is a known gap in the record, not a thing to paper
  // over here.
  assert.equal(a2.primary.pBetterResamples, 1000);
  assert.equal(a2.primary.pBetterSeed, 20260915);
  assert.equal(a2.primary.pBetter, 36 / 1000);
});

test("the a8 train/validate split accounts for every holdout row", () => {
  assert.equal(a8.nTrain + a8.nValidate, a8.nPicksH1);
  assert.ok(a8.nTrain > 0 && a8.nValidate > 0, "neither half may be empty");
});

test("the a8 headline delta matches its two arms", () => {
  const v = a8.validate;
  const expected = v.brierBoltzmann - v.brierIsotonic;
  assert.ok(Math.abs(v.deltaBoltzMinusIso - expected) < 1e-12);
});

test("every CI is ordered and every MDE is positive", () => {
  const ci = a2.primary.pairedDeltaCi;
  assert.equal(ci.ci95.length, 2);
  assert.ok(ci.ci95[0] <= ci.ci95[1], "CI lower must not exceed upper");
  assert.ok(ci.mde80 > 0, "an MDE of zero would claim infinite power");
  assert.ok(a8.validate.ci95[0] <= a8.validate.ci95[1]);
  assert.ok(a8.validate.mde80 > 0);
});

test("the MDE is commensurate with the interval it was derived from", () => {
  // mde80 is the effect detectable at 80% power; it cannot sit far below the
  // interval half-width without the two having been computed from different
  // data — which is exactly the kind of drift this file exists to catch.
  const ci = a2.primary.pairedDeltaCi;
  const halfWidth = (ci.ci95[1] - ci.ci95[0]) / 2;
  assert.ok(
    ci.mde80 > halfWidth * 0.5 && ci.mde80 < halfWidth * 4,
    `mde80 ${ci.mde80} is not commensurate with the CI half-width ${halfWidth}`,
  );
});

test("the a2 arm trails market, and shrinkage is what makes it better than raw", () => {
  // The L11 rule this repo follows: a candidate must score WORSE than market on
  // the holdout for the harness to be trustworthy. If a future edit flips the
  // sign of the primary arm, this stops being a calibration record and becomes
  // a claim about beating the market.
  assert.ok(a2.primary.deltaBrier > 0, "the primary arm must trail market on the holdout");
  assert.ok(
    a2.rawModel.deltaBrier > a2.primary.deltaBrier,
    "the shrunk arm must beat the raw model it was derived from",
  );
});

test("the shrinkage proposal names the evidence file it rests on", () => {
  const proposal = path.join(HERE, "../2026-09-15-shrinkage-display-probability-v5.2.8.md");
  assert.ok(existsSync(proposal), "missing proposal");
  assert.ok(
    readFileSync(proposal, "utf8").includes("2026-09-15-a2-shrinkage-scorecard.json"),
    "the proposal must cite the evidence it rests on",
  );
});

test("every artifact names what it supports", () => {
  // The a8 measurement was previously uncited from anywhere: it predates the
  // factor-spec convention, and the v530 joint-refit proposal it shipped beside
  // does not discuss Boltzmann or isotonic at all. The README now states what it
  // supports (factor A8, and the BLOCKED status A8's kill line forces), and this
  // assertion is what stops that mapping from quietly rotting away again.
  const readme = read("README.md");
  for (const f of ["2026-09-15-a2-shrinkage-scorecard.json", "2026-09-15-a8-boltzmann-vs-isotonic.json"]) {
    assert.ok(readme.includes(f), `README must account for ${f}`);
  }
});

test("the a8 artifact names its factor and is honest about its source", () => {
  // A8's spec pre-registers mde_80pct_power 0.05573; the artifact must record
  // the same number, or A8's BLOCKED status rests on a different measurement
  // than the one written down.
  assert.equal(a8.factorId, "A8");
  assert.ok(
    Math.abs(a8.validate.mde80 - 0.05573) < 1e-4,
    "the recorded MDE must be the one A8 pre-registered (0.05573)",
  );
  // The kill line is "validate-era Brier >= isotonic Brier". Boltzmann came out
  // at or above isotonic, which is the FAIL side of that rule.
  assert.ok(
    a8.validate.brierBoltzmann >= a8.validate.brierIsotonic,
    "Boltzmann must be at least isotonic's Brier, or this artifact is not the run A8 blocked on",
  );
});

test("the a8 artifact says it ran on the SYNTHETIC fixture, not a real export", () => {
  // This is the honesty field. The v530 proposal states plainly that "a real
  // verifier/picks-h1.json export does not exist on main" — the artifact must
  // not imply otherwise, and the flag must not be flipped to false by a later
  // edit that never re-ran anything.
  assert.equal(a8.fromFixture, true);
  assert.match(a8.source, /fixtures[\\/]picks-h1\.json$/);
  assert.ok(a8.runSha && /^[0-9a-f]{40}$/.test(a8.runSha), "a run sha must be recorded");
  assert.ok(Number.isFinite(Date.parse(a8.runAt)), "runAt must be a real timestamp");
});

test("the MODEL_VERSION this evidence was measured against is the frozen one", () => {
  const constants = read("../../../packages/prediction-engine/src/constants.ts");
  const m = constants.match(/MODEL_VERSION\s*=\s*"([^"]+)"/);
  assert.ok(m, "constants.ts must define MODEL_VERSION");
  assert.equal(m[1], "v5.2.7", "this proposal set was measured against a frozen v5.2.7");
});
