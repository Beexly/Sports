/**
 * @file non-stat-situational-compiler.ts
 * The SPEC-C compiler for PIT dark-source proxies.
 *
 * THE PROBLEM THIS SOLVES. Some of the 50,000 registered formulas are conditioned on things
 * the model can observe but cannot COUNT. A banged-up corner, a two-high shell, a motion
 * stress report, a "the safety is cheating" note from a scout -- these are situational
 * facts, and they matter, but they do not arrive with a sample size. There is no N for
 * "the corner is banged up"; there is one observation: right now, this game.
 *
 * The statistical path cannot absorb them. A formula with no estimable N either gets
 * dropped (and the situation is lost) or gets a made-up N (and the situation is a
 * decoration). The SPEC-C compiler takes the third road: a situational source is compiled
 * into the SAME typed operator the statistical path produces,
 *
 *     v_out = f(v_in; beta)
 *
 * and Stage D of the cognitive router consumes it exactly as it consumes a statistical
 * premise. The operator carries its own first and second partials, so the cross-equation
 * Jacobian has something to differentiate.
 *
 * THE POINT-IN-TIME RULE. A dark source is only admissible if it was knowable AT THE
 * DECISION TIME. A proxy whose observation timestamp is after the decision timestamp is
 * look-ahead, and look-ahead in a situational source is the easiest way to turn this file
 * into a performance-laundering machine: the compiler's whole job is to make a non-countable
 * fact usable, and an unusable-by-construction fact is just a better-looking guess. So the
 * compiler REFUSES a proxy without a point-in-time stamp, and refuses one whose observation
 * is later than its as-of stamp. A refusal is a refusal, not a zero.
 *
 * WHAT THIS FILE IS NOT. It does not estimate anything, it does not read a database, and it
 * does not decide whether a source is TRUE. It compiles a claim that is already in the
 * operator form. Every refusal it returns is about the SHAPE of the claim (missing
 * timestamp, look-ahead, malformed coefficients), never about whether the claim is
 * convenient.
 */
import { createHash } from "node:crypto";

/** The compiler's identifier. Every operator carries it. */
export const SPEC_C_COMPILER_ID = "SPEC-C";

/** The compiler's version. Bumped when the operator semantics change. */
export const SPEC_C_COMPILER_VERSION = "SPEC-C.1";

/** The operator kinds the compiler can emit. */
export type OperatorKind = "IDENTITY" | "LINEAR" | "THRESHOLD" | "SATURATING" | "RAMP";

/** The kinds a dark source may declare. */
export const OPERATOR_KINDS: readonly OperatorKind[] = [
  "IDENTITY",
  "LINEAR",
  "THRESHOLD",
  "SATURATING",
  "RAMP",
];

/**
 * The number of coefficients each operator kind takes.
 *
 * IDENTITY takes none, LINEAR takes two (intercept, slope), THRESHOLD takes two
 * (low value, high value), SATURATING takes two (intercept, slope), RAMP takes two
 * (intercept, slope) and clamps to [0, 1].
 */
export const OPERATOR_BETA_LENGTH: Readonly<Record<OperatorKind, number>> = {
  IDENTITY: 0,
  LINEAR: 2,
  THRESHOLD: 2,
  SATURATING: 2,
  RAMP: 2,
};

/**
 * A point-in-time dark-source proxy.
 *
 * `asOf` is the decision timestamp: the moment the claim had to be knowable. `observedAt`
 * is when the evidence that supports the claim was actually recorded. The compiler refuses
 * when observedAt is later than asOf.
 */
export interface DarkSourceProxy {
  /** The source's stable id. */
  readonly sourceId: string;
  /** The premise this source compiles into. */
  readonly premiseId: string;
  /** The signal family the source belongs to. */
  readonly familyId: string;
  /** The decision timestamp, ISO-8601. The claim must be knowable at this instant. */
  readonly asOf: string;
  /** When the supporting evidence was recorded, ISO-8601. Must not be later than `asOf`. */
  readonly observedAt: string;
  /** The observed value: v_in. */
  readonly value: number;
  /** The operator to compile into. */
  readonly kind: OperatorKind;
  /** The operator's coefficients. */
  readonly beta: readonly number[];
  /**
   * The source is NON-statistical. It has no sample size and no estimator behind it; it is
   * a situated fact. A source that claims otherwise is refused: the sample floor in the
   * feature matrix is what keeps thin statistical cells out, and a source that could wave
   * itself past that floor by declaring itself "statistical" would be a hole in the floor.
   */
  readonly statistical: false;
  /** Where the source came from. Only PIT dark proxies are admitted. */
  readonly provenance: "PIT_DARK_PROXY";
  /** A free-text note carried into the compiled operator. */
  readonly note?: string;
}

/** A compiled typed operator: v_out = f(v_in; beta). */
export interface TypedOperator {
  readonly premiseId: string;
  readonly sourceId: string;
  readonly familyId: string;
  readonly operator: OperatorKind;
  /** v_in: the observed value. */
  readonly vIn: number;
  /** v_out: the compiled value. */
  readonly vOut: number;
  /** The operator's coefficients, exactly as compiled. */
  readonly beta: readonly number[];
  /** dv_out/dv_in: the first partial, which Stage D's Jacobian differentiates. */
  readonly dOutDIn: number;
  /** d2 v_out/dv_in^2: the second partial, which Stage D's Hessian uses. */
  readonly d2OutDIn2: number;
  readonly compiledBy: typeof SPEC_C_COMPILER_ID;
  readonly compilerVersion: string;
  /** The point-in-time stamp the compile was admitted against. */
  readonly asOf: string;
  readonly observedAt: string;
}

/** The compiler's verdict. A refusal carries a reason; it never carries a zero. */
export type CompileResult =
  | { readonly ok: true; readonly operator: TypedOperator }
  | { readonly ok: false; readonly reason: string; readonly sourceId: string; readonly premiseId: string };

/** Parse an ISO-8601 timestamp, or null when it is not one. */
function parseIso(value: string): number | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

/** The operator's output, and its first two partials, for a given input. */
interface OperatorEvaluation {
  readonly vOut: number;
  readonly dOutDIn: number;
  readonly d2OutDIn2: number;
}

/**
 * Evaluate one operator kind.
 *
 * The partials are the exact derivatives of the piecewise-smooth operator:
 *
 *   IDENTITY    v_out = v_in                              dv = 1,  d2v = 0
 *   LINEAR      v_out = b0 + b1 * v_in                    dv = b1, d2v = 0
 *   THRESHOLD   v_out = v_in >= 0 ? b1 : b0               dv = 0,  d2v = 0
 *   SATURATING  v_out = b0 + b1 * tau * tanh(v_in / tau)   dv = b1 * sech^2, d2v = -2 b1 sech^2 tanh / tau
 *   RAMP        v_out = clamp(b0 + b1 * v_in, 0, 1)        dv = b1 inside the clamp, 0 outside
 *
 * THRESHOLD and the clamped RAMP are piecewise constant / piecewise linear, so their
 * partials are zero almost everywhere. That is not a limitation of the compiler, it is
 * the truth about those operators, and it is exactly why a situational source that needs a
 * gradient has to be compiled as SATURATING.
 */
function evaluateOperator(kind: OperatorKind, beta: readonly number[], vIn: number): OperatorEvaluation {
  switch (kind) {
    case "IDENTITY":
      return { vOut: vIn, dOutDIn: 1, d2OutDIn2: 0 };
    case "LINEAR": {
      const b0 = beta[0] as number;
      const b1 = beta[1] as number;
      return { vOut: b0 + b1 * vIn, dOutDIn: b1, d2OutDIn2: 0 };
    }
    case "THRESHOLD": {
      const low = beta[0] as number;
      const high = beta[1] as number;
      return { vOut: vIn >= 0 ? high : low, dOutDIn: 0, d2OutDIn2: 0 };
    }
    case "SATURATING": {
      const b0 = beta[0] as number;
      const b1 = beta[1] as number;
      // tau = 1 keeps the derivative well conditioned around the origin and is a property
      // of the operator, not of the data.
      const tau = 1;
      const z = Math.tanh(vIn / tau);
      const sech2 = 1 - z * z;
      return {
        vOut: b0 + b1 * tau * z,
        dOutDIn: b1 * sech2,
        d2OutDIn2: (-2 * b1 * sech2 * z) / tau,
      };
    }
    case "RAMP": {
      const b0 = beta[0] as number;
      const b1 = beta[1] as number;
      const raw = b0 + b1 * vIn;
      const vOut = Math.min(1, Math.max(0, raw));
      const inside = raw > 0 && raw < 1;
      return { vOut, dOutDIn: inside ? b1 : 0, d2OutDIn2: 0 };
    }
    default: {
      const exhaustive: never = kind;
      throw new Error(`non-stat-situational-compiler: unknown operator ${String(exhaustive)}`);
    }
  }
}

/**
 * Compile one dark-source proxy into a typed operator.
 *
 * THE REFUSALS, AND WHY EACH ONE EXISTS:
 *
 *   - no point-in-time stamp: a situational claim that cannot be placed in time cannot be
 *     used for a decision. Without `asOf` the claim is not falsifiable by a settlement.
 *   - observedAt later than asOf: this is look-ahead. The claim was not knowable when the
 *     decision was made, and a compiled operator built on it would be a hindsight artifact
 *     wearing a live costume.
 *   - statistical source: a non-statistical situational source is what this compiler
 *     compiles. A source that carries a sample size belongs on the statistical path, where
 *     the sample floor can see it.
 *   - wrong provenance: only point-in-time dark proxies are admitted.
 *   - malformed coefficients: the operator's beta vector has a fixed length per kind, and a
 *     wrong length means the operator is not the operator the caller thinks it is.
 *   - non-finite value: a NaN in v_in produces a NaN in every downstream partial, and a NaN
 *     in a Jacobian is a Jacobian that cannot be reasoned about.
 */
export function compileNonStatSituational(proxy: DarkSourceProxy): CompileResult {
  const refuse = (reason: string): CompileResult => ({
    ok: false,
    reason,
    sourceId: proxy.sourceId,
    premiseId: proxy.premiseId,
  });

  if (typeof proxy.sourceId !== "string" || proxy.sourceId.trim().length === 0) {
    return refuse("the source has no id");
  }
  if (typeof proxy.premiseId !== "string" || proxy.premiseId.trim().length === 0) {
    return refuse("the source names no premise");
  }
  if (proxy.provenance !== "PIT_DARK_PROXY") {
    return refuse(`provenance "${String(proxy.provenance)}" is not a point-in-time dark proxy`);
  }
  if (proxy.statistical !== false) {
    return refuse("a statistical source does not belong on the non-statistical path");
  }

  const asOf = parseIso(proxy.asOf);
  if (asOf === null) return refuse(`asOf "${String(proxy.asOf)}" is not an ISO-8601 timestamp`);
  const observedAt = parseIso(proxy.observedAt);
  if (observedAt === null) {
    return refuse(`observedAt "${String(proxy.observedAt)}" is not an ISO-8601 timestamp`);
  }
  if (observedAt > asOf) {
    return refuse(
      `look-ahead: the evidence was observed at ${proxy.observedAt}, after the decision timestamp ${proxy.asOf}`,
    );
  }

  if (!OPERATOR_KINDS.includes(proxy.kind)) {
    return refuse(`unknown operator kind "${String(proxy.kind)}"`);
  }
  const expectedLength = OPERATOR_BETA_LENGTH[proxy.kind];
  if (!Array.isArray(proxy.beta) || proxy.beta.length !== expectedLength) {
    return refuse(
      `operator ${proxy.kind} takes ${expectedLength} coefficient(s), got ${Array.isArray(proxy.beta) ? proxy.beta.length : "none"}`,
    );
  }
  for (const coefficient of proxy.beta) {
    if (typeof coefficient !== "number" || !Number.isFinite(coefficient)) {
      return refuse("the operator coefficients must all be finite numbers");
    }
  }
  if (typeof proxy.value !== "number" || !Number.isFinite(proxy.value)) {
    return refuse("the observed value must be a finite number");
  }
  if (typeof proxy.familyId !== "string" || proxy.familyId.trim().length === 0) {
    return refuse("the source names no signal family");
  }

  const evaluation = evaluateOperator(proxy.kind, proxy.beta, proxy.value);
  if (!Number.isFinite(evaluation.vOut) || !Number.isFinite(evaluation.dOutDIn)) {
    return refuse("the compiled operator produced a non-finite value or partial");
  }

  return {
    ok: true,
    operator: {
      premiseId: proxy.premiseId,
      sourceId: proxy.sourceId,
      familyId: proxy.familyId,
      operator: proxy.kind,
      vIn: proxy.value,
      vOut: evaluation.vOut,
      beta: [...proxy.beta],
      dOutDIn: evaluation.dOutDIn,
      d2OutDIn2: evaluation.d2OutDIn2,
      compiledBy: SPEC_C_COMPILER_ID,
      compilerVersion: SPEC_C_COMPILER_VERSION,
      asOf: proxy.asOf,
      observedAt: proxy.observedAt,
    },
  };
}

/** The verdict of compiling a batch. */
export interface CompileBatch {
  /** The operators that compiled. */
  readonly operators: readonly TypedOperator[];
  /** The sources that did not, with the reason each was refused. */
  readonly refusals: readonly { readonly sourceId: string; readonly premiseId: string; readonly reason: string }[];
}

/**
 * Compile a batch of dark-source proxies.
 *
 * One bad source does not stop the batch: a refusal for a look-ahead source is a fact about
 * THAT source, and the batch's other sources are still usable. What the batch never does is
 * quietly drop a refusal -- `refusals` is part of the result, so a caller cannot compile a
 * batch and then report that everything compiled.
 */
export function compileNonStatSituationalBatch(proxies: readonly DarkSourceProxy[]): CompileBatch {
  const operators: TypedOperator[] = [];
  const refusals: { sourceId: string; premiseId: string; reason: string }[] = [];
  for (const proxy of proxies) {
    const result = compileNonStatSituational(proxy);
    if (result.ok) {
      operators.push(result.operator);
    } else {
      refusals.push({ sourceId: result.sourceId, premiseId: result.premiseId, reason: result.reason });
    }
  }
  return { operators, refusals };
}

/**
 * A deterministic fingerprint of a compiled operator.
 *
 * Used to key a compiled operator in a cache or an audit trail without depending on object
 * identity, and to detect a compiled operator that has been edited in place.
 */
export function operatorFingerprint(operator: TypedOperator): string {
  const payload = [
    operator.premiseId,
    operator.sourceId,
    operator.operator,
    operator.vIn.toString(),
    operator.vOut.toString(),
    operator.beta.map((coefficient) => coefficient.toString()).join(","),
    operator.dOutDIn.toString(),
    operator.d2OutDIn2.toString(),
    operator.asOf,
  ].join("|");
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}
