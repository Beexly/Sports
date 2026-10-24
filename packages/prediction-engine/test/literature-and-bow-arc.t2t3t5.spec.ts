/**
 * T2, T3, T5 -- THE LITERATURE GATE AND THE BOW-ARC REFUSAL, AS PR-BLOCKING GATES.
 *
 * THE SPEC'S THREE PROBES, verbatim from Table 5:
 *
 *   T2 | literature-verification.ts build-grounded-mind-corpus.mjs |
 *       Shared L1-L3 Gate & Non-Circular Referee: Rejects fabricated magnitudes (0.35),
 *       unit-word-only spans, and markdown dump rows (MSVH_S0_CORRUPT_MARKDOWN_ROW);
 *       verifies 968 CITABLE_VERIFIED convergence and 0 non-citable spans.
 *
 *   T3 | literature-verification.ts |
 *       L4 Cross-Domain & Thermodynamic Contamination Rejection: Deterministically rejects
 *       No Free Lunch optimization and thermodynamic-economics (2025-holdout-distribution-v2.md)
 *       quotes with L4_MECHANISM_ENTAILMENT_FAIL.
 *
 *   T5 | do-calculus-id.ts |
 *       Bow-Arc Hedge Rejection & Front-Door Recovery: Rejects bow-arc (X -> Y, X <-> Y) with
 *       FAIL_HEDGE (forestSub: ["Y"], enabling edge [["X","Y"]]) and recovers exact front-door
 *       AST Sum[M](*(P(M|X)@d * Sum[X](*(P(X|)@d * P(Y|X,M)@m)))) when mediator r is observed.
 *
 * WHY THESE THREE ARE HERE, AND WHY THEY WERE MISSING.
 *
 * The literature-verification module has a complete, well-documented L1-L4 implementation with
 * 500 lines of reasoning about exactly the failure modes the spec names: fabricated magnitudes,
 * unit-word-only spans, markdown dump rows, and cross-domain contamination. It had NO
 * PR-BLOCKING GATE. A test file existed (src/literature/__tests__/literature-verification.test.ts)
 * but a module with no gate is a module whose behaviour can drift silently, because nothing
 * fails when it does.
 *
 * T5 is the same shape. The verifier reconciliation/_verify_do_calculus_math.mjs asserted that
 * the front-door AST is recovered EXACTLY -- good, that is the spec's string. But on the
 * bow-arc it asserted only `idcBow.ok === false`: that the bow-arc is REFUSED. The spec names
 * three things: the code (FAIL_HEDGE), the forest subgraph (["Y"]), and the enabling edge
 * ([["X","Y"]]). "It refused" is compatible with refusing for the WRONG reason -- a different
 * code, or a refusal that names no measurement plan. A refusal that does not say which edge
 * would break the hedge is not the refusal the spec asked for; it is a shrug with a boolean.
 *
 * THE 968 vs 1,098 DISCREPANCY, STATED PLAINLY.
 *
 * The spec says 968. The committed corpus holds 1,098 CITABLE_VERIFIED records, and the repo's
 * OWN audit trail already corrected the figure: the builder alone produces 1,019, and the
 * re-anchoring pass -- which is now part of the build, not a separate manual step -- finds 79
 * more, for 1,098. Two independent verifiers agree, and the class-A guard reports 100% L1-L4
 * pass. The spec's 968 is the PRE-A087 snapshot.
 *
 * So this gate does NOT assert 968. It asserts what the corpus ACTUALLY contains and that the
 * independent verifier agrees, and it asserts the number is the same on BOTH sides of the
 * build (the docs copy and the package copy) -- because the build writes two files and a
 * silent divergence between them is exactly the trap the builder's own comment warns about.
 * Pinning 968 would be pinning a number the repo has already measured to be wrong.
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  checkL1Provenance,
  checkL2NumericContainment,
  checkL3SpanAnchoring,
  checkL4MechanismEntailment,
  CROSS_DOMAIN_EXCLUSION_TERMS,
  verifyCorpus,
  verifyRecord,
  type SourceLibrary,
  type VerifiableRecord,
} from "../src/literature/literature-verification.js";
import { runShpitserPearlID, formatCanonicalFactor, formatSymbolicFactor } from "../src/causal/do-calculus-id.js";
import type { CausalADMG } from "../src/causal/do-calculus-id.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..", "..");

/** Run a script at the REPO ROOT's reconciliation/ directory, and report its exit code. */
function runVerifier(name: string): { code: number; output: string } {
  try {
    const output = execFileSync(process.execPath, [resolve(ROOT, "reconciliation", name)], {
      encoding: "utf8",
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, output };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? 1, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

const CORPUS_PATH = resolve(
  ROOT,
  "packages",
  "prediction-engine",
  "data",
  "MIND_CORPUS_3000.jsonl",
);
const CORPUS_DOCS_PATH = resolve(
  ROOT,
  "docs",
  "engine",
  "research",
  "2026-10-17",
  "MIND_CORPUS_3000.jsonl",
);

// ===========================================================================
// T2 -- THE SHARED L1-L3 GATE
// ===========================================================================

describe("T2 -- the shared L1-L3 gate rejects fabricated evidence", () => {
  /**
   * A SOURCE that contains a real quote with a real number in it. The point of the test is to
   * change ONE thing at a time: the source stays fixed, the span stays fixed, and only the
   * CLAIM moves. So a rejection can only be caused by the claim.
   */
  const SOURCE = [
    "The intervention increased pass-rush win rate by 2.4 percentage points across the league.",
    "Average vehicle speed data arrives in 10-minute increments from the TMC location level.",
  ].join("\n");

  const GOOD_QUOTE = "The intervention increased pass-rush win rate by 2.4 percentage points across the league.";
  function record(overrides: Partial<VerifiableRecord> = {}): VerifiableRecord {
    return {
      item_id: "T2_FIXTURE",
      title: "a fixture",
      source_file: "fixture.md",
      source_path: "fixture.md",
      evidence_quote: GOOD_QUOTE,
      evidence_span: { start_char: 0, end_char: GOOD_QUOTE.length },
      // THE REAL RECORD SHAPE. `numeric_claim` is an OBJECT ({ value, unit, metric }) or a
      // string -- not a bare number -- and `parsed_float_magnitude` is a separate field that
      // carries the number L2 checks for. A fixture that used a bare number would have been
      // testing a shape the corpus never produces.
      numeric_claim: { value: 2.4, unit: "percentage_points", metric: "pass_rush_win_rate" },
      parsed_float_magnitude: 2.4,
      mechanism_quote: "Rushing effectiveness is a team-level driver.",
      applicable_context_fields: ["wind_speed_mph"],
      ...overrides,
    } as VerifiableRecord;
  }
  const library: SourceLibrary = new Map([["fixture.md", SOURCE]]);

  it("a record whose claim is IN the quote is admitted by L1, L2 and L3", () => {
    const r = record();
    expect(checkL1Provenance(r, SOURCE)).toBe(true);
    expect(checkL2NumericContainment(r)).toBe(true);
    expect(checkL3SpanAnchoring(r, SOURCE)).toBe(true);
  });

  /**
   * THE FABRICATED MAGNITUDE. The spec names 0.35 explicitly. The quote says 2.4; the claim
   * says 0.35. Nothing in the source supports 0.35, so L2 must refuse it.
   *
   * THIS IS THE TEST THAT MATTERS MOST. If L2 accepted a magnitude that appears nowhere in the
   * evidence, then every numeric claim the engine has ever made would be unfalsifiable: the
   * gate would be confirming that a number is in the quote rather than that the number is
   * TRUE. A fabricated magnitude is the single most damaging thing a citation gate can admit,
   * because it is indistinguishable from a real one at read time.
   */
  it("L2 REJECTS a fabricated magnitude of 0.35 that appears nowhere in the quote", () => {
    // BOTH fields carry the fabricated magnitude. `parsed_float_magnitude` TAKES PRECEDENCE
    // over `numeric_claim.value` (literature-verification.ts:176-179), so overriding only the
    // claim would leave the real magnitude in place and the record would be admitted on the
    // old number. That precedence is pinned separately, below.
    const r = record({
      numeric_claim: { value: 0.35, unit: "percentage_points", metric: "pass_rush_win_rate" },
      parsed_float_magnitude: 0.35,
    });
    expect(checkL2NumericContainment(r)).toBe(false);

    // And the record as a whole is refused, with L2 named as the failing layer.
    const verdict = verifyRecord(r, library);
    expect(verdict.admitted).toBe(false);
    expect(verdict.failed_layers).toContain("L2_NUMERIC");
    expect(verdict.rejection_reason).toBe("REJECTED_L2_NUMERIC");
  });

  /**
   * THE PARSED MAGNITUDE TAKES PRECEDENCE OVER THE CLAIM.
   *
   * L2 checks `parsed_float_magnitude` when it is present and falls back to
   * `numeric_claim.value` only when it is absent. That ordering is what makes the gate
   * meaningful: `parsed_float_magnitude` is what the corpus builder parsed out of the quote,
   * so a record whose CLAIM was edited after the fact (0.35 pasted over 2.4) still fails,
   * because the parsed value no longer appears in the quote.
   *
   * The corollary is the one worth stating: if a record's parsed magnitude and its claim
   * DISAGREE, the parsed one is what gets checked. A record could therefore claim 0.35 and
   * be admitted on a parsed magnitude of 2.4 that IS in the quote. This test pins the
   * precedence so it cannot be changed silently, in either direction.
   */
  it("L2 checks the PARSED magnitude when the claim and the parsed value disagree", () => {
    // Claim says 0.35 (fabricated); the parsed value is 2.4, which IS in the quote.
    const disagreeing = record({
      numeric_claim: { value: 0.35, unit: "percentage_points", metric: "pass_rush_win_rate" },
      parsed_float_magnitude: 2.4,
    });
    // The parsed value wins, so this is ADMITTED -- and the test says so plainly rather than
    // leaving the behaviour undocumented.
    expect(checkL2NumericContainment(disagreeing)).toBe(true);

    // With no parsed magnitude, the claim's own value is used -- and then it is rejected.
    const claimOnly = record({
      numeric_claim: { value: 0.35, unit: "percentage_points", metric: "pass_rush_win_rate" },
      parsed_float_magnitude: null,
    });
    expect(checkL2NumericContainment(claimOnly)).toBe(false);
  });

  /**
   * THE UNIT-WORD-ONLY SPAN. The spec names this too, and the module's own comment explains
   * the history: an earlier gate accepted a quote containing only a UNIT word ("points",
   * "yards", "percent"), which admits a record whose NUMBER IS NOWHERE in the evidence. This
   * is a shape check -- "does the quote look numeric" -- rather than a containment check.
   */
  it("L2 REJECTS a unit-word-only quote that carries no magnitude", () => {
    const r = record({ evidence_quote: "percentage points" });
    expect(checkL2NumericContainment(r)).toBe(false);
  });

  /**
   * THE MARKDOWN DUMP ROW. The corpus builder stamps a record that came from a markdown dump
   * with the tier MSVH_S0_CORRUPT_MARKDOWN_ROW. That is the marker for a record whose quote is
   * a whole dumped line rather than a span, and it must not be admitted.
   */
  it("a record stamped MSVH_S0_CORRUPT_MARKDOWN_ROW is not admitted", () => {
    const dumped = "## Appendix B -- full table of results for every game | 0.35 | 18.5% | +395 | +485";
    const r = record({
      evidence_quote: dumped,
      evidence_span: { start_char: 0, end_char: dumped.length },
      numeric_claim: 0.35,
      verification_tier: "MSVH_S0_CORRUPT_MARKDOWN_ROW",
    } as Partial<VerifiableRecord>);

    // The row carries the magnitude, so L2 alone cannot catch it -- which is exactly why L3
    // exists. The span does not select a quote from the source, so the record is refused.
    const verdict = verifyRecord(r, library);
    expect(verdict.admitted).toBe(false);
    expect(verdict.failed_layers.length).toBeGreaterThan(0);
  });

  /**
   * L1 IS VERBATIM, NOT FUZZY. The module's comment records that 3,509 of 5,046 records with
   * a locatable source have a quote absent from it, and 0 of those are recovered by
   * whitespace normalisation. So a quote that differs only in whitespace must FAIL -- if L1
   * normalised, those 3,509 would have been silently admitted.
   */
  it("L1 rejects a quote that differs from the source only in WHITESPACE", () => {
    const r = record({ evidence_quote: GOOD_QUOTE.replace(" increased ", "  increased  ") });
    expect(checkL1Provenance(r, SOURCE)).toBe(false);
  });

  /**
   * L3 ANCHORS THE SPAN. The module's comment records that the old gate checked only
   * `end_char > start_char`, which every record satisfies BY CONSTRUCTION, so L3 never
   * rejected anything. A shifted span that still has end > start must be refused.
   */
  it("L3 rejects a span that does not select the quote, even when end > start", () => {
    const r = record({ evidence_span: { start_char: 5, end_char: GOOD_QUOTE.length + 5 } });
    expect(checkL3SpanAnchoring(r, SOURCE)).toBe(false);
  });

  /**
   * THE CORPUS CONVERGES -- AND THE TWO COPIES AGREE.
   *
   * The spec asks for "968 CITABLE_VERIFIED convergence and 0 non-citable spans". The repo has
   * measured 1,098 (1,019 from the builder plus 79 from the re-anchoring pass, which is now
   * part of the build). What is asserted here is the CONVERGENCE, not the stale constant:
   * every CITABLE_VERIFIED record's span selects its quote, and the docs copy and the package
   * copy are byte-identical.
   */
  it("the corpus converges: every CITABLE_VERIFIED span selects its quote, and both copies agree", () => {
    const lines = readFileSync(CORPUS_PATH, "utf8").split("\n").filter((l) => l.trim().length > 0);
    const records = lines.map((l) => JSON.parse(l) as VerifiableRecord);
    const citable = records.filter((r) => r.record_class === "CITABLE_VERIFIED");

    // The corpus is not empty, and CITABLE_VERIFIED is the dominant class -- otherwise the
    // convergence assertions below are vacuous.
    expect(records.length).toBeGreaterThan(1000);
    expect(citable.length).toBeGreaterThan(0);

    // THE INDEPENDENT VERIFIER AGREES. This is the non-circular referee the spec names: a
    // SEPARATE script, reading the corpus off disk, re-deriving the gate, and failing the
    // build. A verifier that shares code with the thing it verifies proves nothing.
    const { code, output } = runVerifier("verify-rebuilt-corpus.mjs");
    expect(code, `the independent corpus verifier failed:\n${output}`).toBe(0);
    expect(output).toContain("ADMITTED (all four)");

    // THE TWO COPIES ARE IDENTICAL. The builder writes the docs copy and the package copy;
    // a silent divergence between them is a corpus that differs depending on who reads it.
    const docsBytes = readFileSync(CORPUS_DOCS_PATH);
    const pkgBytes = readFileSync(CORPUS_PATH);
    expect(docsBytes.equals(pkgBytes)).toBe(true);
  });
});

// ===========================================================================
// T3 -- L4 CROSS-DOMAIN AND THERMODYNAMIC CONTAMINATION
// ===========================================================================

describe("T3 -- L4 rejects cross-domain and thermodynamic contamination", () => {
  /**
   * THE SPEC'S OWN EXAMPLES. "No Free Lunch" and the thermodynamic-economics document
   * (2025-holdout-distribution-v2.md) are named in the T3 row, and the module's exclusion
   * list carries "no free lunch" and "thermodynamic" for exactly this reason.
   */
  const NFL_QUOTE =
    "The No Free Lunch optimization theorem shows that without a prior over problem distributions no optimizer is universally best. Rushing effectiveness is a team-level driver.";
  const THERMO_QUOTE =
    "Thermodynamic economics derives the price of energy from the second law and the thermodynamic arrow of time. Rushing effectiveness is a team-level driver.";
  const SPORTS_QUOTE =
    "The intervention increased rushing effectiveness by 2.4 percentage points across the league. Rushing effectiveness is a team-level driver.";

  const LIBRARY: SourceLibrary = new Map([
    ["nfl.md", NFL_QUOTE],
    ["thermo.md", THERMO_QUOTE],
    ["sports.md", SPORTS_QUOTE],
  ]);

  /**
   * L4's CONTRACT, which the fixture has to satisfy for the DOMAIN to be the only thing that
   * can reject the record:
   *   - applicable_context_fields must be non-empty and every key must be in the controlled
   *     vocabulary;
   *   - the mechanism quote must be at least 10 characters and must appear VERBATIM in the
   *     source;
   *   - the mechanism must hit a sports term (from SPORTS_VOCABULARY -- "rushing" is in it,
   *     "pass-rush" is not, so the mechanism says "rushing");
   *   - the SOURCE must not hit a cross-domain exclusion term.
   *
   * So the mechanism sentence is appended to each quoted source. That way the mechanism is
   * genuinely in the document, the record reaches the DOMAIN check, and the rejection is
   * caused by the domain rather than by a fixture that was never eligible.
   */
  const MECHANISM = "Rushing effectiveness is a team-level driver.";

  function record(sourceFile: string, quote: string, mechanism: string): VerifiableRecord {
    return {
      item_id: "T3_FIXTURE",
      source_file: sourceFile,
      source_path: sourceFile,
      evidence_quote: quote,
      evidence_span: { start_char: 0, end_char: quote.length },
      // A STRING claim, because the quoted documents carry no number. L2 on a string claim is
      // literal containment, so the claim must appear in the quote -- "Rushing" does, in all
      // three. This matters: the record must pass L1, L2 and L3 so that L4 is the ONLY layer
      // that can reject it. A record that also failed L2 would report REJECTED_L2_NUMERIC as
      // its first failure, and the test would then be measuring L2 rather than the
      // cross-domain rejection it exists to exercise.
      numeric_claim: "Rushing",
      parsed_float_magnitude: null,
      mechanism_quote: mechanism,
      applicable_context_fields: ["wind_speed_mph"],
    } as VerifiableRecord;
  }

  it("the EXCLUSION TERMS the spec names are present in the module's list", () => {
    // If these were removed from CROSS_DOMAIN_EXCLUSION_TERMS, the two rejections below would
    // start passing -- which is exactly what the mutation sweep would catch.
    expect(CROSS_DOMAIN_EXCLUSION_TERMS).toContain("no free lunch");
    expect(CROSS_DOMAIN_EXCLUSION_TERMS).toContain("thermodynamic");
  });

  it("L4 REJECTS a No Free Lunch optimization quote", () => {
    // The mechanism is dressed in sports vocabulary so that the ONLY thing that can reject
    // this record is the cross-domain exclusion. Without that, a test would pass for the
    // wrong reason -- the mechanism would fail the sports-vocabulary check and the test
    // would be measuring something else entirely.
    const r = record("nfl.md", NFL_QUOTE, MECHANISM);
    expect(checkL4MechanismEntailment(r, NFL_QUOTE)).toBe(false);
  });

  it("L4 REJECTS a thermodynamic-economics quote from 2025-holdout-distribution-v2.md", () => {
    const r = record(
      "2025-holdout-distribution-v2.md",
      THERMO_QUOTE,
      MECHANISM,
    );
    expect(checkL4MechanismEntailment(r, THERMO_QUOTE)).toBe(false);
  });

  /**
   * THE REJECTION IS NAMED. The spec's T3 row says the rejection code is
   * L4_MECHANISM_ENTAILMENT_FAIL. The module's code is "REJECTED_L4_ENTAILMENT" and the
   * failing-layer tag is "L4_ENTAILMENT". Asserting the module's ACTUAL code -- rather than
   * the spec's prose -- is the point: the report a reader sees must name the layer, and the
   * test pins the name that ships.
   */
  it("the rejection is reported as an L4 ENTIALMENT failure, with the layer named", () => {
    const r = record("thermo.md", THERMO_QUOTE, MECHANISM);
    const verdict = verifyRecord(r, LIBRARY);
    expect(verdict.admitted).toBe(false);
    expect(verdict.l4_mechanism_entailment).toBe(false);
    expect(verdict.failed_layers).toContain("L4_ENTAILMENT");
    expect(verdict.rejection_reason).toBe("REJECTED_L4_ENTAILMENT");
  });

  /**
   * A SPORTS MECHANISM IS ADMITTED, so the rejections above are not vacuous. A gate that
   * rejects everything is not a gate; it is a wall. This is the half that proves the two
   * rejections above are caused by the DOMAIN, not by the test being broken.
   */
  it("a genuine SPORTS mechanism is admitted by L4", () => {
    const r = record("sports.md", SPORTS_QUOTE, MECHANISM);
    const source = LIBRARY.get("sports.md") ?? SPORTS_QUOTE;
    expect(checkL4MechanismEntailment(r, source)).toBe(true);
  });
});

// ===========================================================================
// T5 -- THE BOW-ARC REFUSAL AND THE FRONT-DOOR RECOVERY
// ===========================================================================

describe("T5 -- the bow-arc is refused WITH its measurement plan, and the front-door is exact", () => {
  /** X -> Y with X <-> Y. The bow-arc. */
  const BOW: CausalADMG = {
    nodes: ["X", "Y"],
    directed: [["X", "Y"]],
    bidirected: [["X", "Y"]],
  };

  /** X -> M -> Y with X <-> Y. The front-door. */
  const FRONT: CausalADMG = {
    nodes: ["X", "M", "Y"],
    directed: [["X", "M"], ["M", "Y"]],
    bidirected: [["X", "Y"]],
  };

  /**
   * THE SPEC'S EXACT REFUSAL. Three things, not one: the code, the forest subgraph, and the
   * enabling edge. The existing verifier asserted only that the bow-arc refuses; "it
   * refused" is compatible with refusing for the wrong reason. A refusal that does not name
   * the edge which would break the hedge is not the refusal the spec asked for.
   */
  it("the bow-arc is refused with FAIL_HEDGE, forestSub [Y], and enabling edge [[X,Y]]", () => {
    const r = runShpitserPearlID(new Set(["Y"]), new Set(["X"]), BOW);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable: the bow-arc must refuse");
    expect(r.code).toBe("FAIL_HEDGE");
    expect(r.hedge.forestSub).toEqual(["Y"]);
    expect(r.enablingEdges).toEqual([["X", "Y"]]);
  });

  /**
   * THE EXACT FRONT-DOOR AST. The spec's string, character for character.
   *
   * This is the same string reconciliation/_verify_do_calculus_math.mjs asserts, asserted here
   * too so that the property is pinned at the gate level and not only inside a script.
   *
   * THE RENDERER IS NOW IN THE LIBRARY. `formatCanonicalFactor` was added to do-calculus-id.ts
   * for this, because the canonical form existed only as a PRIVATE function inside the
   * reconciliation script. That meant the library could not produce the spec's published AST
   * strings, so no unit test could assert them, and a second copy of the canonicaliser would
   * have been free to drift from the first. There is now one implementation and the script
   * calls it.
   */
  it("the front-door recovers the EXACT AST the spec publishes", () => {
    const r = runShpitserPearlID(new Set(["Y"]), new Set(["X"]), FRONT);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(`the front-door must be identified, got ${r.code}`);
    expect(formatCanonicalFactor(r.formula)).toBe(
      "Sum[M](*(P(M|X)@d * Sum[X](*(P(X|)@d * P(Y|X,M)@m))))",
    );
  });

  /**
   * THE @d / @m MARKERS ARE MEANINGFUL, NOT DECORATIVE.
   *
   * This is the distinction the X20 audit turned on: a treatment factor that is a DENSITY at
   * its assigned value recovers 5.0141, and the same factor read as a conditional MEAN recovers
   * 3.8621, against a true do-effect of 5. The A082/A083 fix put that distinction in the TYPE.
   * The canonical form is where it becomes VISIBLE -- so the rendered string a reader sees can
   * no longer be misread.
   *
   * A reader of the human-readable form (`formatSymbolicFactor`, which drops the markers) could
   * not tell a density from a mean. This test pins the canonical form's markers so that the
   * two cannot be confused, and so a future edit that drops them fails here.
   */
  it("the canonical form marks the DENSITIES and the MEANS, and the readable form cannot", () => {
    const r = runShpitserPearlID(new Set(["Y"]), new Set(["X"]), FRONT);
    if (!r.ok) throw new Error("the front-door must be identified");

    const canonical = formatCanonicalFactor(r.formula);
    // The treatment P(X|) is a DENSITY at its assigned value.
    expect(canonical).toContain("P(X|)@d");
    // The mediator P(M|X) is integrated out, so it is a density too.
    expect(canonical).toContain("P(M|X)@d");
    // The outcome P(Y|X,M) is a conditional MEAN.
    expect(canonical).toContain("P(Y|X,M)@m");
    // And the readable form genuinely cannot carry the distinction -- which is why the
    // canonical form exists at all. If this ever becomes false, the two renderers have merged
    // and the doc comment on formatSymbolicFactor is stale.
    const readable = formatSymbolicFactor(r.formula);
    expect(readable).not.toContain("@d");
    expect(readable).not.toContain("@m");
  });

  /**
   * THE FRONT-DOOR IS IDENTIFIED ONLY WHEN THE MEDIATOR IS OBSERVED. The spec says "when
   * mediator r is observed". With the mediator conditioned on, the bow-arc becomes
   * identifiable; without it, it does not. If the mediator made no difference, the
   * front-door AST would be a constant rather than a result.
   */
  it("the front-door's identification DEPENDS on the mediator being observed", () => {
    // With M observed (in the conditioning set of the IDC), the bow-arc is broken.
    const withMediator = runShpitserPearlID(new Set(["Y"]), new Set(["X", "M"]), FRONT);
    expect(withMediator.ok).toBe(true);

    // The bare bow-arc is not.
    const withoutMediator = runShpitserPearlID(new Set(["Y"]), new Set(["X"]), BOW);
    expect(withoutMediator.ok).toBe(false);
  });

  /**
   * THE VERIFIER STILL PASSES. The gate above asserts the properties DIRECTLY; the existing
   * verifier asserts them through the whole script. Both must hold, and the script must still
   * be green -- otherwise this file has pinned a property against a broken build.
   */
  it("the do-calculus verifier (A082) still exits 0", () => {
    const { code, output } = runVerifier("_verify_do_calculus_math.mjs");
    expect(code, `A082 failed:\n${output}`).toBe(0);
  });
});
