/**
 * @file arxiv-hnsw-bridge.t1t4.spec.ts
 * T1 and T4 -- THE LITERATURE BRIDGE'S PROPORTIONAL DELTA AND ITS CLASS-A GUARD, AS
 * PR-BLOCKING GATES.
 *
 * THE SPEC'S TWO PROBES, verbatim from Table 5:
 *
 *   T1 | arxiv-hnsw-bridge.ts |
 *       Proportional Content-Driven Delta: Mutating numeric_claim in-quote from 0.024 to
 *       0.048 scales total_delta by exactly 2.000000x (+/- 1e-6) and updates rendered
 *       audit prose without hardcoded strings.
 *
 *   T4 | arxiv-hnsw-bridge.ts schema_literature.sql |
 *       Empty Corpus & 84-Site Class-A Guard: Emits total_delta === 0 and empty prose on an
 *       empty corpus with zero legacy strings (+395, +485, 18.5%); verifies
 *       HONESTLY_UNCITED_PRIOR and DERIVED_MARKET_SYNTHESIS rows return 0 rows from
 *       v_class_a_literature_premises and lit.retrieve_premises().
 *
 * WHY THESE TWO AND NOT THE WHOLE SUITE. The spec's section 3 arithmetic is the part of the
 * literature bridge that can be WRONG WHILE STILL LOOKING RIGHT: a delta that is decorative
 * (a hardcoded number, a fixed odds template, a "citation" that is not the literature) looks
 * exactly like a delta that is computed, in every output that is not compared against a
 * second value. So the gate here is built around COMPARISONS, not around the shape of the
 * output:
 *
 *   - T1 compares the SAME premise against ITSELF with one number changed, and requires the
 *     published total to move by exactly the factor the claim moved by. A hardcoded delta
 *     cannot pass that: it does not move at all, and a template with the number pasted in
 *     moves by the wrong amount.
 *   - T1 also requires the prose to MOVE with the number, because the prose is what a reader
 *     actually reads. A prose that still says "0.024" after the claim became "0.048" is
 *     worse than no prose: it is a false statement.
 *   - T1 pins the CLAMP separately, because proportionality and saturation are DIFFERENT
 *     properties and a test that only checks proportionality would be silently satisfied by a
 *     saturated output.
 *   - T4 pins the EMPTY corpus, because the historical failure of this engine was a prose
 *     template that produced fair-odds and correlation numbers with NO corpus behind them.
 *
 * WHY THE CLASS-A HALF IS A GUARD SCRIPT AND A SCHEMA, NOT A DATABASE. The spec's T4 names
 * `v_class_a_literature_premises`, a view this repo does not have. What this repo HAS is the
 * class filter inside `lit.retrieve_premises()` and the coverage guard that proves every
 * reasoning-path read site honours it, so this gate asserts the three things that together
 * are the repo's version of T4's guarantee:
 *
 *   1. THE BRIDGE refuses a non-citable premise. HONESTLY_UNCITED_PRIOR and
 *      DERIVED_MARKET_SYNTHESIS rows produce zero rows and zero delta.
 *   2. THE RETRIEVAL FUNCTION filters on the class and the status, so those rows cannot come
 *      back out of it in the first place.
 *   3. THE COVERAGE GUARD still exits zero and still reports zero gaps, so the filter cannot
 *      be deleted from any reasoning path without this suite going red.
 *
 * The database is deliberately NOT in this file: a test that needs a live database is a test
 * that stops being a gate the day the database is unreachable, and the repo's own house rule
 * is that the class filter is verified from the source and the guard script.
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTEXT_PRIMITIVE_ANCHORS,
  EPISTEMIC_WEIGHTS,
  evaluateLiteraturePremises,
  evaluateMindPrinciples,
  MAX_ABS_DELTA,
  MIN_APPLIED_MAGNITUDE,
  MIN_CONSENSUS_RATIO,
  type LiteraturePremise,
} from "../src/literature/arxiv-hnsw-bridge.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..", "..");
const PKG = resolve(ROOT, "packages", "prediction-engine");

/**
 * The legacy magic strings.
 *
 * These are the numbers the spec's own critique names as the symptom of a literature engine
 * that decorates rather than computes: two hardcoded fair-odds numbers and a hardcoded
 * parlay-correlation percentage, none of them derived from anything. They are the strings a
 * reader cannot trace, which is exactly why they must not appear in an output.
 */
const LEGACY_STRINGS = /\+395|\+485|18\.5%/;

/** A signed 4-decimal rendering, the shape the audit prose publishes a delta in. */
function fmt(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(4)}`;
}

/**
 * A class-A premise, built from the `lit.premise` column names.
 *
 * `numeric_claim` is the number AS IT IS WRITTEN IN THE QUOTE, and
 * `parsed_float_magnitude` is the magnitude of that number: the spec's |beta_i|. They are
 * separate fields because a prose that shows the quote's number and a delta that scales with
 * the parsed number are two different claims, and a reader who cannot tell them apart cannot
 * audit either.
 */
function premise(overrides: Partial<LiteraturePremise> = {}): LiteraturePremise {
  // The in-quote number and the quote it came from are the SAME fact, so the quote is derived
  // from the claim. A fixture where the quote still said 0.024 while the claim said 0.048
  // would be asserting a literature row that does not exist.
  const claim = overrides.numeric_claim ?? "0.024";
  return {
    premise_key: "mind:arXiv:1710.06551",
    title: "Sharp price discovery in thin markets",
    principle: "A sharp price in a thin market reveals informed flow",
    domain: "market microstructure",
    claim_type: "causal",
    numeric_claim: claim,
    parsed_float_magnitude: Number(claim),
    unit_scale_denominator: 0.5,
    applicable_context_fields: ["market_steam_velocity_pts_hr"],
    influence_direction: "positive",
    parsed_threshold_value: null,
    parsed_threshold_operator: null,
    evidence_quote: `sharp price adjustments of ${claim} points per hour reveal informed flow`,
    record_class: "CITABLE_VERIFIED",
    status: "ACTIVE",
    ...overrides,
  };
}

/** The context the fixtures are evaluated against. */
const CONTEXT = { market_steam_velocity_pts_hr: 1.0 } as const;

/** Run a script at the REPO ROOT and report its exit code and output. */
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

describe("T1 -- the literature bridge's content-driven delta is PROPORTIONAL to the claim", () => {
  it("T1: the total delta scales exactly 2.000000x with the in-quote numeric claim", () => {
    // THE FIXTURE. One class-A premise on one primitive. The observed value is 1.0 against a
    // baseline of 0.0 with a unit scale of 0.5, so the normalized displacement is 2.0 and the
    // premise's own magnitude reaches the published total unscaled by anything else. The
    // premise's claim is 0.024; the mutant's is 0.048. Nothing else differs.
    const base = evaluateLiteraturePremises(CONTEXT, [premise()]);
    const mutated = evaluateLiteraturePremises(
      CONTEXT,
      [premise({ numeric_claim: "0.048", parsed_float_magnitude: 0.048 })],
    );

    // The same number of premises produced the same number of audit rows: the mutant did not
    // add, drop, or re-order a premise to reach its answer.
    expect(mutated.audit_trail.length).toBe(base.audit_trail.length);
    expect(mutated.adjustments.length).toBe(base.adjustments.length);

    // THE PROPERTY. Doubling the claim doubles the published total.
    expect(mutated.total_delta).toBeCloseTo(base.total_delta * 2.0, 6);
    expect(mutated.total_delta / base.total_delta).toBeCloseTo(2.0, 6);

    // And the precondition is stated, not assumed: proportionality is a property of the
    // INSIDE of the clip band. Outside it the output is saturated, which is a different
    // property, and the clamp is pinned separately below.
    expect(Math.abs(base.total_delta)).toBeLessThan(MAX_ABS_DELTA);
    expect(Math.abs(mutated.total_delta)).toBeLessThan(MAX_ABS_DELTA);

    // The delta is not zero to begin with: a bridge that published nothing would satisfy
    // "scaled by 2x" trivially.
    expect(base.total_delta).not.toBe(0);
    expect(base.total_delta).toBeGreaterThan(0);
  });

  it("T1: the rendered audit prose reports the computed delta and changes with the claim", () => {
    const base = evaluateLiteraturePremises(CONTEXT, [premise()]);
    const mutated = evaluateLiteraturePremises(
      CONTEXT,
      [premise({ numeric_claim: "0.048", parsed_float_magnitude: 0.048 })],
    );

    // THE PROSE CARRIES THE COMPUTED NUMBER, not a template with a number pasted into it.
    expect(base.rendered_prose).toContain(fmt(base.total_delta));
    expect(mutated.rendered_prose).toContain(fmt(mutated.total_delta));
    expect(base.rendered_prose).toContain(`is ${fmt(base.total_delta)}`);

    // AND THE PROSE MOVES WITH THE CLAIM. A prose that still reports 0.024 after the claim
    // became 0.048 is not a stale template, it is a false statement about the literature.
    expect(mutated.rendered_prose).not.toBe(base.rendered_prose);
    expect(base.rendered_prose).toContain("0.024");
    expect(mutated.rendered_prose).toContain("0.048");
    expect(mutated.rendered_prose).not.toContain("0.024");

    // The prose names the premise it is reporting, so a reader can go and read the quote.
    expect(base.rendered_prose).toContain("mind:arXiv:1710.06551");
    expect(base.rendered_prose).toContain("market_steam_velocity_pts_hr");
  });

  it("T1: the rendered audit prose carries no legacy hardcoded strings", () => {
    const base = evaluateLiteraturePremises(CONTEXT, [premise()]);
    const mutated = evaluateLiteraturePremises(
      CONTEXT,
      [premise({ numeric_claim: "0.048", parsed_float_magnitude: 0.048 })],
    );

    // The legacy numbers are the symptom the spec's critique names: fair-odds and correlation
    // figures that no premise produced. The house rule is that they must not appear in an
    // output at all, and the historical failure was exactly that they did.
    expect(LEGACY_STRINGS.test(base.rendered_prose)).toBe(false);
    expect(LEGACY_STRINGS.test(mutated.rendered_prose)).toBe(false);
    expect(LEGACY_STRINGS.test(JSON.stringify(base))).toBe(false);
    expect(LEGACY_STRINGS.test(JSON.stringify(mutated))).toBe(false);
  });

  it("T1: a delta beyond the field clamp is saturated at the clamp bound", () => {
    // THE BOUND IS A LITERAL, NOT THE CONSTANT. A test written as
    // `expect(x).toBe(MAX_ABS_DELTA)` moves with the constant, so mutating the bound would
    // move the assertion with it and the test would still pass -- it would pin nothing.
    // Writing 0.1 means the bound is a fact this test checks, not a value it follows.
    //
    // THE FIXTURE EXCEEDS THE BOUND. A claim of 0.20 against a displacement of 2.0 proposes
    // a raw delta of 0.40, so WITHOUT the clamp the engine would publish 0.40 and WITH it
    // the engine publishes exactly 0.1. The two differ, which is what makes the clamp
    // load-bearing: an input that landed ON the bound would pass with or without it.
    const over = evaluateLiteraturePremises(
      CONTEXT,
      [premise({ numeric_claim: "0.20", parsed_float_magnitude: 0.2 })],
    );
    expect(over.adjustments[0]?.final_delta).toBe(0.1);
    expect(over.total_delta).toBe(0.1);

    // AND THE UNCLAMPED VALUE WOULD HAVE BEEN STRICTLY LARGER. This is the half that says
    // the clamp produced the published number, rather than the number having been small
    // anyway. The premise's own proposed delta is the unclamped value, and it is 0.40.
    expect(over.audit_trail[0]?.parsed_delta).toBeCloseTo(0.4, 12);
    expect(over.audit_trail[0]?.parsed_delta).toBeGreaterThan(0.1);

    // SATURATION IS NOT PROPORTIONALITY. Doubling the claim again does NOT double the
    // published total, because the published total is saturated. A test that only checked
    // proportionality would be satisfied by an output that never scales at all; this is the
    // half that says the output is CLIPPED, on purpose, and where.
    const overTwice = evaluateLiteraturePremises(
      CONTEXT,
      [premise({ numeric_claim: "0.40", parsed_float_magnitude: 0.4 })],
    );
    expect(overTwice.total_delta).toBe(0.1);
    expect(overTwice.total_delta).not.toBe(over.total_delta * 2.0);

    // THE NEGATIVE SIDE. The clamp is symmetric: a large negative delta saturates at
    // exactly -0.1, not at 0 and not at -0.4. A one-sided clamp would let a negative
    // runaway escape, and a reader would see a loss the engine never applied.
    const under = evaluateLiteraturePremises(
      CONTEXT,
      [
        premise({
          numeric_claim: "0.20",
          parsed_float_magnitude: 0.2,
          influence_direction: "negative",
        }),
      ],
    );
    expect(under.adjustments[0]?.final_delta).toBe(-0.1);
    expect(under.total_delta).toBe(-0.1);
    expect(under.audit_trail[0]?.parsed_delta).toBeCloseTo(-0.4, 12);
    expect(under.audit_trail[0]?.parsed_delta).toBeLessThan(-0.1);

    // AND THE SYMMETRY, stated as the equality of the two magnitudes.
    expect(over.total_delta).toBe(-under.total_delta);
  });

  it("T1: opposing claims below the consensus deadband are neutralized to zero", () => {
    // Two class-A premises on the same primitive pulling in opposite directions, with
    // magnitudes close enough that the weighted aggregate nearly cancels: the consensus
    // ratio is 0.09, well under the 0.20 deadband, but the aggregate is NOT zero (0.004),
    // so this case isolates the DEADBAND and not the magnitude floor.
    const conflicting = evaluateLiteraturePremises(CONTEXT, [
      premise(),
      premise({
        premise_key: "mind:arXiv:1806.01234",
        title: "Overreaction in thin markets",
        numeric_claim: "0.020",
        parsed_float_magnitude: 0.02,
        influence_direction: "negative",
        evidence_quote: "price overreactions of 0.020 points per hour reverse within the hour",
      }),
    ]);

    const adjustment = conflicting.adjustments[0];
    expect(adjustment?.consensus_ratio).toBeLessThan(MIN_CONSENSUS_RATIO);
    expect(adjustment?.final_delta).toBe(0);
    expect(adjustment?.resolution_status).toBe("CONFLICT_NEUTRALIZED");
    expect(conflicting.total_delta).toBe(0);
  });

  it("T1: the published field total and the audit trail agree with the computed deltas", () => {
    const result = evaluateLiteraturePremises(CONTEXT, [premise()]);

    // The audit trail is the bridge's own account of how it got there, so it has to add up:
    // the per-premise applied deltas sum to the published field total, and the field totals
    // sum to the total delta.
    const fieldTotal = result.adjustments[0]?.final_delta ?? 0;
    const appliedSum = result.audit_trail.reduce((sum, record) => sum + record.applied_delta, 0);
    expect(appliedSum).toBeCloseTo(fieldTotal, 12);
    expect(result.total_delta).toBeCloseTo(fieldTotal, 12);

    // Every record names a premise that exists, and reports the number as it was written.
    expect(result.audit_trail).toHaveLength(1);
    expect(result.audit_trail[0]?.premise_key).toBe("mind:arXiv:1710.06551");
    expect(result.audit_trail[0]?.numeric_claim).toBe("0.024");
    expect(result.audit_trail[0]?.parsed_delta).toBeCloseTo(0.048, 12);
  });

  it("T1: the module publishes the spec's thresholds and the epistemic weight table", () => {
    // The numbers are the spec's, and the gates above are what enforce them. A constant that
    // gates nothing is a label, which is why these are asserted as values AND exercised as
    // behaviour above.
    expect(MAX_ABS_DELTA).toBe(0.1);
    expect(MIN_CONSENSUS_RATIO).toBe(0.2);
    expect(MIN_APPLIED_MAGNITUDE).toBe(1e-4);
    expect(EPISTEMIC_WEIGHTS).toEqual({ causal: 1.0, correlational: 0.5, theoretical: 0.3 });

    // The baseline anchors are the MIND engine's, restated. If the two tables drift, the
    // literature delta and the mind delta would be measured against different baselines,
    // which is a silent disagreement, so they are compared here.
    const mindDefaults = readFileSync(
      resolve(PKG, "src", "reasoning", "mind-reasoning.ts"),
      "utf8",
    );
    for (const [field, anchor] of Object.entries(CONTEXT_PRIMITIVE_ANCHORS)) {
      expect(mindDefaults).toContain(`${field}: { baseline: ${anchor.baseline}`);
    }

    // And the spec's own name for the entry point is exported, so the spec's section 10.1
    // probe imports the function it names.
    expect(evaluateMindPrinciples).toBe(evaluateLiteraturePremises);
  });
});

describe("T4 -- the empty corpus and the class-A guard", () => {
  it("T4: an empty corpus publishes a zero total delta, an empty audit trail and empty prose", () => {
    // THE HISTORICAL FAILURE. The old engine's prose template produced fair-odds and
    // correlation numbers WITH NO CORPUS BEHIND THEM. An empty corpus must produce no
    // numbers at all, and the spec's T4 says so in the same breath as the legacy strings.
    const empty = evaluateLiteraturePremises(CONTEXT, []);

    expect(empty.total_delta).toBe(0);
    expect(empty.audit_trail).toHaveLength(0);
    expect(empty.adjustments).toHaveLength(0);
    expect(empty.rendered_prose).toBe("");
    expect(JSON.stringify(empty)).not.toMatch(LEGACY_STRINGS);
  });

  it("T4: the empty corpus result carries no legacy hardcoded strings", () => {
    // The empty corpus is checked on its own, because the empty corpus is where a hardcoded
    // template shows up most nakedly: with no premises there is nothing to compute FROM, so
    // any number in the output came from nowhere.
    const empty = evaluateLiteraturePremises(CONTEXT, []);
    expect(empty.rendered_prose).toBe("");
    expect(empty.rendered_prose).not.toMatch(LEGACY_STRINGS);
    expect(JSON.stringify(empty)).not.toMatch(/\+395|\+485|18\.5%/);
  });

  it("T4: the bridge refuses HONESTLY_UNCITED_PRIOR and DERIVED_MARKET_SYNTHESIS rows", () => {
    // THE CLASS-A GATE AT THE BRIDGE. A premise whose quote is in no document at all, and a
    // premise synthesised from a market row rather than read from a paper, may not mint a
    // delta here. The retrieval function already filters them out; this is the second site,
    // and it is the one that holds if a caller hands the bridge a row the filter dropped.
    for (const recordClass of ["HONESTLY_UNCITED_PRIOR", "DERIVED_MARKET_SYNTHESIS"]) {
      const refused = evaluateLiteraturePremises(CONTEXT, [premise({ record_class: recordClass })]);
      expect(refused.total_delta).toBe(0);
      expect(refused.audit_trail).toHaveLength(0);
      expect(refused.adjustments).toHaveLength(0);
      expect(refused.rendered_prose).toBe("");
    }

    // A record that is citable but was seen and REJECTED is refused the same way: the class
    // says what kind of record it is, the status says whether it was admitted, and both have
    // to say yes.
    const rejected = evaluateLiteraturePremises(
      CONTEXT,
      [premise({ status: "LINK_VERIFIED_SEMANTIC_FAIL" })],
    );
    expect(rejected.total_delta).toBe(0);
    expect(rejected.audit_trail).toHaveLength(0);

    // And the control: the same premise, citable and active, IS admitted. A gate that
    // refuses everything would satisfy the assertions above.
    const admitted = evaluateLiteraturePremises(CONTEXT, [premise()]);
    expect(admitted.total_delta).toBeGreaterThan(0);
    expect(admitted.audit_trail).toHaveLength(1);
  });

  it("T4: the literature retrieval function filters on the citable class and the active status", () => {
    // The repo's version of "those rows return 0 rows from the retrieval path": the class
    // filter lives in the function body, so a row of either non-citable class cannot come
    // back out of it. This is asserted on the schema source, because the guarantee is a
    // property of the query.
    const schema = readFileSync(resolve(ROOT, "reconciliation", "schema_literature.sql"), "utf8");
    const start = schema.indexOf("CREATE OR REPLACE FUNCTION lit.retrieve_premises(");
    expect(start).toBeGreaterThan(-1);
    // The function's body is the `AS $$ ... $$;` block, which comes AFTER its LANGUAGE and
    // STABLE clauses, so the body runs to the closing `$$;` -- not to the word LANGUAGE.
    const bodyStart = schema.indexOf("AS $$", start);
    const bodyEnd = schema.indexOf("$$;", bodyStart);
    expect(bodyStart).toBeGreaterThan(-1);
    expect(bodyEnd).toBeGreaterThan(bodyStart);
    const body = schema.slice(bodyStart, bodyEnd);

    expect(body).toContain("record_class = 'CITABLE_VERIFIED'");
    expect(body).toContain("status = 'ACTIVE'");

    // Both non-citable classes are real classes of row -- which is why the FILTER, and not
    // the column's default, is what keeps them out of a reasoning path.
    expect(schema).toContain("'HONESTLY_UNCITED_PRIOR'");
    expect(schema).toContain("'DERIVED_MARKET_SYNTHESIS'");
    expect(body).not.toContain("record_class <>");
  });

  it("T4: the class-A coverage guard still exits 0 and reports zero gaps", () => {
    // THE GUARD. Every reasoning-path read site in the repo is checked for the class filter.
    // It is run HERE, as a subprocess, because a guard that is only ever inspected is not a
    // guard: this suite fails the day the filter is removed from any reasoning path.
    const { code, output } = runVerifier("_check_class_a_coverage.mjs");

    expect(code, `the class-A coverage guard failed:\n${output}`).toBe(0);
    expect(output).toContain("VERDICT: every path sets and honours the class");
    // The read-site COUNT moves as the repo grows, so it is not asserted; the GAP count is
    // the property, and it is zero.
    expect(output).toMatch(/-> \d+ read sites, 0 without the class filter/);
  });

  it("T1: the mutation sweep for T1 and T4 is present and targets this gate", () => {
    // The sweep is the proof that this gate is load-bearing rather than merely green: it
    // breaks the module in the five ways that matter and requires a NAMED test to stop
    // passing each time. This assertion is that the sweep exists, is pointed at this gate,
    // and names the same tests this file defines -- a sweep that targets renamed tests would
    // report NOT PINNED for everything while everything was in fact pinned.
    const sweepPath = resolve(PKG, "reconciliation", "_mutation_sweep_t1_t4_hnsw.mjs");
    const sweep = readFileSync(sweepPath, "utf8");

    expect(sweep).toContain("src/literature/arxiv-hnsw-bridge.ts");
    expect(sweep).toContain("test/arxiv-hnsw-bridge.t1t4.spec.ts");
    expect(sweep).toContain("OK baseline: all");

    for (const title of SWEEP_EXPECTED_TITLES) {
      expect(sweep).toContain(title);
    }
  });
});

/**
 * The test titles the mutation sweep requires to stop passing.
 *
 * They are named here as well as in the sweep because the two files have to agree: a sweep
 * that expects a title this file no longer has would report NOT PINNED for every mutation
 * while every mutation was in fact caught.
 */
const SWEEP_EXPECTED_TITLES = [
  "T1: the total delta scales exactly 2.000000x with the in-quote numeric claim",
  "T1: opposing claims below the consensus deadband are neutralized to zero",
  "T1: a delta beyond the field clamp is saturated at the clamp bound",
  "T1: the rendered audit prose carries no legacy hardcoded strings",
  "T4: an empty corpus publishes a zero total delta, an empty audit trail and empty prose",
  "T4: the bridge refuses HONESTLY_UNCITED_PRIOR and DERIVED_MARKET_SYNTHESIS rows",
];
