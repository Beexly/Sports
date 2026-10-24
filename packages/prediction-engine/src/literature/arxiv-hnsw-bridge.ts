/**
 * @file arxiv-hnsw-bridge.ts
 * The Dual-Frequency Literature Bridge's CONTENT-DRIVEN DELTA engine.
 *
 * WHAT THIS MODULE IS. The spec's build step 4 ("Dual-Frequency Literature Bridge") wires the
 * HNSW-retrieved literature premise into the reasoning path as a numeric adjustment to a
 * context primitive. This module owns the arithmetic of that adjustment and the audit prose
 * that reports it, and nothing else:
 *
 *   - the RETRIEVAL is `lit.retrieve_premises()` (reconciliation/schema_literature.sql), which
 *     is where the class filter lives (`record_class = 'CITABLE_VERIFIED' AND
 *     status = 'ACTIVE'`), and
 *   - the L1-L4 VERIFICATION GATE is `src/literature/literature-verification.ts`.
 *
 * So the class guarantee is enforced in two different places, which is the point: the SQL
 * filter keeps unverified rows out of the candidate set, and the admission gate below keeps
 * them out of the delta even if a caller hands this module a row the filter should have
 * dropped. A row that is not CITABLE_VERIFIED, or that is not ACTIVE, mints NOTHING here.
 *
 * THE ALGORITHM, from the spec's section 3 (the "Pure Content-Driven Delta and Opposing-Claim
 * Deadband" stage), written out so a reader can check the code against it line by line:
 *
 *   delta_x_{c,i} = (x_c - x_{c,0}) / u_i                  normalized displacement from baseline
 *   w_i^eff      = w_i * pi_i(t)                           epistemic weight x promotion score
 *   delta_{c,i}  = s_i(x_c) * |beta_i| * delta_x_{c,i}     the premise's proposed delta
 *   Delta_bar_c  = (sum_i w_i^eff * delta_{c,i}) / (sum_i w_i^eff)
 *   eta_c        = |sum_i w_i^eff * delta_{c,i}| / sum_i (w_i^eff * |delta_{c,i}|)
 *   Delta_c^final = clip(Delta_bar_c, -0.10, +0.10)   when eta_c >= 0.20 AND |Delta_bar_c| >= 1e-4
 *                 = 0.0                                 otherwise
 *
 * The aggregate is the CONFIDENCE-WEIGHTED MEAN, exactly as the spec writes it, so the weight
 * is a RELATIVE weight between competing claims in the same field: with one premise in a field
 * the weight cancels out of the mean, and the weight's remaining effect is on the consensus
 * ratio. That is the same arithmetic the MIND engine runs
 * (src/reasoning/mind-reasoning.ts, `evaluateMindPrinciples`), on a different corpus.
 *
 * PROPORTIONALITY, WHICH IS WHAT THE T1 PROBE PINS. The delta is LINEAR in the in-quote
 * numeric claim |beta_i|: every other factor (the sign, the normalized displacement, the
 * weight) is independent of the claim, so doubling the claim doubles the published field
 * total -- PROVIDED the published total stays inside the clip band. That proviso is a real
 * property, not a caveat: outside the band the output is DELIBERATELY SATURATED, so a claim
 * change there does NOT scale the output, and the saturation is a DIFFERENT property from the
 * proportionality. The T1 probe therefore pins the proportionality inside the band and pins
 * the saturation at the boundary separately.
 *
 * TWO PLACES THIS FILE DIFFERS FROM THE MIND ENGINE (src/reasoning/mind-reasoning.ts), both
 * deliberate:
 *
 *   1. THE ACWR HAZARD LAW (the 1.40 injury threshold and the negative-hazard formula) is a
 *      section 2 law of the MIND engine, not part of this section 3 delta. This file applies
 *      the section 3 formula uniformly, and applies the ONE ACWR rule the spec gives this
 *      bridge: an unconditioned ACWR premise (no current-session load) is forced to the
 *      theoretical weight 0.3.
 *   2. THE CORPUS IS THE LITERATURE CORPUS, so the premise row carries the literature
 *      schema's own columns (`record_class`, `status`, `numeric_claim`) rather than the MIND
 *      artifact's.
 */

/** The spec's intermediate field clamp: the published field delta never leaves +/- this. */
export const MAX_ABS_DELTA = 0.10;

/** The opposing-claim deadband: below this consensus ratio a field publishes nothing. */
export const MIN_CONSENSUS_RATIO = 0.20;

/** The applied-magnitude floor: a field total this small is noise, not an adjustment. */
export const MIN_APPLIED_MAGNITUDE = 1e-4;

/**
 * The epistemic weight table: the study-design class of the claim.
 *
 * `causal` is a design that identifies; `correlational` is an association; `theoretical` is
 * a mechanism story with no estimate behind it. The three values are the spec's.
 */
export const EPISTEMIC_WEIGHTS = {
  causal: 1.0,
  correlational: 0.5,
  theoretical: 0.3,
} as const satisfies Readonly<Record<LiteratureClaimType, number>>;

/** The claim classes the weight table is keyed by. */
export type LiteratureClaimType = "causal" | "correlational" | "theoretical";

/** The direction a premise claims its effect runs in. */
export type LiteratureInfluenceDirection = "positive" | "negative" | "conditional";

/** The comparison operators a conditional premise's threshold may use. */
export type LiteratureThresholdOperator = ">" | ">=" | "<" | "<=";

/** What happened to a field's literature adjustment. */
export type LiteratureResolutionStatus = "APPLIED" | "CONFLICT_NEUTRALIZED";

/**
 * What happened to ONE PREMISE.
 *
 * A premise can be refused on its own terms -- a conditional premise whose threshold was not
 * met -- which is a different thing from the field it sits in being neutralized. The two are
 * reported separately so a reader can tell "this premise does not apply to this game" from
 * "this field's premises disagree".
 */
export type LiteraturePremiseStatus = "APPLIED" | "CONFLICT_NEUTRALIZED" | "THRESHOLD_NOT_MET";

/**
 * One literature premise as the bridge consumes it.
 *
 * The field names are the `lit.premise` column names, so a row read out of the table maps
 * onto this interface without a translation layer that could quietly drop a column.
 */
export interface LiteraturePremise {
  /** Stable key, e.g. `mind:arXiv:1710.06551`. */
  readonly premise_key: string;
  readonly title: string;
  /** The mechanism the premise claims, in the premise's own words. */
  readonly principle: string | null;
  readonly domain: string | null;
  readonly claim_type: LiteratureClaimType;
  /** The number as it is written in the quote, e.g. "0.024". */
  readonly numeric_claim: string;
  /** The magnitude of that number: |beta_i|. */
  readonly parsed_float_magnitude: number;
  /** The unit scale the displacement is normalized by: u_i. */
  readonly unit_scale_denominator: number;
  /** The context primitives this premise can move. */
  readonly applicable_context_fields: readonly string[];
  readonly influence_direction: LiteratureInfluenceDirection;
  /** The predicate a conditional premise is gated on, if it has one. */
  readonly parsed_threshold_value: number | null;
  readonly parsed_threshold_operator: LiteratureThresholdOperator | null;
  /** The quote the number came from. */
  readonly evidence_quote: string;
  /** The epistemic class the builder assigned. */
  readonly record_class: string | null;
  /**
   * Why the record is or is not admitted.
   *
   * `ACTIVE` means the quote is verbatim AND the claim follows from it. The other statuses
   * mean the record was seen and rejected, so it is not a premise this engine may act on.
   */
  readonly status: string;
  /**
   * Whether the claim is conditioned on the schedule confound.
   *
   * The spec's weight table demotes a claim whose confound was NOT conditioned on to the
   * theoretical weight, whatever the claim's class says. `false` says exactly that. Absent
   * means "not stated", and the claim's class decides.
   */
  readonly confound_conditioned?: boolean;
  /**
   * The settlement-learned promotion score pi_i(t), in [0, 1].
   *
   * A premise the settlement has not scored yet is not demoted for it: absent means "no
   * promotion adjustment", which is 1.
   */
  readonly promotion_score?: number;
}

/**
 * The observed game state the premises are evaluated against.
 *
 * Flat, and keyed by context primitive, with the session load as a distinguished key -- the
 * same shape the MIND engine's `GameContextVector` uses, so a caller that already builds one
 * can hand it straight over.
 */
export type LiteratureContextVector = Partial<Record<string, number>> & {
  /** The current session's load, when it is known. */
  readonly current_session_load?: number;
};

/** One field's published literature adjustment. */
export interface LiteratureFieldAdjustment {
  readonly field: string;
  /** The published delta for this field. Zero when the adjustment was neutralized. */
  readonly final_delta: number;
  /** The directional consensus ratio eta_c over this field's active premises. */
  readonly consensus_ratio: number;
  readonly resolution_status: LiteratureResolutionStatus;
}

/** One premise's contribution to a field's adjustment, for the audit trail. */
export interface LiteratureAuditRecord {
  readonly premise_key: string;
  readonly title: string;
  readonly influence_direction: LiteratureInfluenceDirection;
  readonly triggered_context_field: string;
  readonly observed_context_value: number;
  readonly baseline_context_value: number;
  readonly unit_scale_denominator: number;
  /** The number as it is written in the quote. */
  readonly numeric_claim: string;
  /** The premise's own proposed delta: s_i(x_c) * |beta_i| * delta_x_{c,i}. */
  readonly parsed_delta: number;
  /** This premise's share of the published field total. */
  readonly applied_delta: number;
  readonly claim_type: LiteratureClaimType;
  /** The effective weight w_i^eff that was applied. */
  readonly confidence_weight: number;
  /** The promotion score pi_i(t) that was applied. */
  readonly promotion_score: number;
  /** The directional consensus ratio eta_c of the field this premise sat in. */
  readonly consensus_ratio: number;
  /** The published total for the field this premise sat in. */
  readonly field_final_delta: number;
  /** What happened to the FIELD this premise sat in. */
  readonly field_resolution_status: LiteratureResolutionStatus;
  /** What happened to THIS premise. */
  readonly resolution_status: LiteraturePremiseStatus;
  readonly evidence_quote: string;
}

/** The bridge's published result. */
export interface LiteratureEvaluation {
  /** The sum of the published field deltas. */
  readonly total_delta: number;
  readonly adjustments: readonly LiteratureFieldAdjustment[];
  /** The audit prose, derived entirely from the numbers above. */
  readonly rendered_prose: string;
  readonly audit_trail: readonly LiteratureAuditRecord[];
}

/**
 * The baseline anchor x_{c,0} and the default unit scale, per context primitive.
 *
 * These are the same anchors the MIND engine uses (src/reasoning/mind-reasoning.ts,
 * `CONTEXT_PRIMITIVE_DEFAULTS`), restated here so this module has no cross-layer import: a
 * literature delta that reached into the reasoning engine for its arithmetic would be a
 * literature delta computed by the wrong engine. The reconciliation test
 * (test/arxiv-hnsw-bridge.t1t4.spec.ts) asserts the two tables agree, so they cannot drift.
 */
export const CONTEXT_PRIMITIVE_ANCHORS: Readonly<
  Record<string, { readonly baseline: number; readonly unitScale: number }>
> = {
  altitude_feet: { baseline: 0, unitScale: 1000 },
  wind_speed_mph: { baseline: 0, unitScale: 10 },
  ambient_temp_fahrenheit: { baseline: 70, unitScale: 10 },
  precipitation_rate_mm_hr: { baseline: 0, unitScale: 5 },
  air_density_kg_m3: { baseline: 1.225, unitScale: 0.1 },
  surface_traction_coeff: { baseline: 0.8, unitScale: 0.1 },
  rest_differential_days: { baseline: 0, unitScale: 3 },
  circadian_travel_timezones: { baseline: 0, unitScale: 2 },
  ol_continuity_shared_snaps_pct: { baseline: 80, unitScale: 20 },
  offensive_pace_sec_per_play: { baseline: 27, unitScale: 5 },
  acoustic_crowd_spl_db: { baseline: 85, unitScale: 15 },
  officiating_crew_penalty_rate: { baseline: 12, unitScale: 4 },
  market_steam_velocity_pts_hr: { baseline: 0, unitScale: 0.5 },
  reverse_line_movement_divergence_pct: { baseline: 0, unitScale: 15 },
  acute_chronic_workload_ratio: { baseline: 1, unitScale: 0.25 },
  coach_fourth_down_aggressiveness_pct: { baseline: 50, unitScale: 15 },
};

/** The context primitive whose workload claim is forced down when the session load is unknown. */
const ACWR_CONTEXT_FIELD = "acute_chronic_workload_ratio";

/** The class a premise must carry to be allowed to mint a delta. */
const CITABLE_CLASS = "CITABLE_VERIFIED";

/** The status a premise must carry to be allowed to mint a delta. */
const ACTIVE_STATUS = "ACTIVE";

/**
 * CLASS-A ADMISSION, the second site.
 *
 * The retrieval function already filters on the class and the status, so a row that reaches
 * this module has already been through that filter. The check is here anyway, because the
 * cost of a row that should not mint a delta is not one bad number, it is a literature
 * finding that does not exist. An unknown class is NOT citable: the honest default for an
 * unknown provenance is "unverified".
 */
export function isClassA(row: LiteraturePremise): boolean {
  return row.record_class === CITABLE_CLASS && row.status === ACTIVE_STATUS;
}

/** The promotion score pi_i(t), clamped into [0, 1]. Absent means "no promotion adjustment". */
function promotionScore(row: LiteraturePremise): number {
  const raw = row.promotion_score ?? 1;
  if (!Number.isFinite(raw)) return 1;
  return Math.max(0, Math.min(1, raw));
}

/** The epistemic weight w_i, before the promotion score multiplies it. */
function epistemicWeight(
  row: LiteraturePremise,
  field: string,
  context: LiteratureContextVector,
): number {
  if (row.confound_conditioned === false) {
    // UNCONDITIONED CLAIM: the schedule confound was not conditioned on, so the claim is
    // demoted to the theoretical weight whatever its class says.
    return EPISTEMIC_WEIGHTS.theoretical;
  }
  if (field === ACWR_CONTEXT_FIELD && context.current_session_load == null) {
    // UNCONDITIONED ACWR: the session load is a CONFOUND, not a primitive. A workload claim
    // that was not conditioned on it is demoted to the theoretical weight whatever its class
    // says, because an unconditioned workload claim is a correlation dressed as a mechanism.
    return EPISTEMIC_WEIGHTS.theoretical;
  }
  return EPISTEMIC_WEIGHTS[row.claim_type];
}

/** The sign operator s_i(x_c): the direction, gated on any conditional threshold predicate. */
function signOperator(row: LiteraturePremise, observed: number): number {
  if (row.influence_direction === "positive") return 1;
  if (row.influence_direction === "negative") return -1;
  // CONDITIONAL: the premise claims its effect only under a condition, so the condition is
  // evaluated against the observed value. A condition that is not met means the premise does
  // not speak to this game at all, and it is excluded rather than counted at zero.
  const threshold = row.parsed_threshold_value;
  const operator = row.parsed_threshold_operator;
  if (threshold == null || operator == null) return 1;
  if (operator === ">") return observed > threshold ? 1 : 0;
  if (operator === ">=") return observed >= threshold ? 1 : 0;
  if (operator === "<") return observed < threshold ? 1 : 0;
  return observed <= threshold ? 1 : 0;
}

/** The field clamp: the published delta never leaves +/- MAX_ABS_DELTA. */
function clampFieldDelta(value: number): number {
  if (value > MAX_ABS_DELTA) return MAX_ABS_DELTA;
  if (value < -MAX_ABS_DELTA) return -MAX_ABS_DELTA;
  return value;
}

/** A signed, fixed-precision rendering of a delta, for prose and for assertions. */
function formatDelta(value: number): string {
  const signed = value >= 0 ? "+" : "";
  return `${signed}${value.toFixed(4)}`;
}

/**
 * THE AUDIT PROSE.
 *
 * Every number in here is computed: the applied delta, the field total, the consensus ratio,
 * the observed value, the baseline, the weight. There is no literal in this function that
 * could be mistaken for a result -- in particular none of the legacy magic figures that used
 * to sit in this engine's output (the hardcoded fair-odds and correlation numbers), which are
 * exactly the numbers a reader would have no way to trace back to a premise.
 */
export function renderAuditProse(records: readonly LiteratureAuditRecord[]): string {
  const blocks: string[] = [];
  const seenFields = new Set<string>();

  for (const record of records) {
    const appliedText = formatDelta(record.applied_delta);
    const parsedText = formatDelta(record.parsed_delta);
    const observed = record.observed_context_value;
    const baseline = record.baseline_context_value;
    blocks.push(
      `The ${record.title} principle (${record.premise_key}) indicates a ` +
        `${record.influence_direction} adjustment of ${record.numeric_claim} to ` +
        `${record.triggered_context_field} (observed ${observed} vs baseline ${baseline}), ` +
        `parsed delta ${parsedText} at weight ${record.confidence_weight.toFixed(1)} ` +
        `(promotion ${record.promotion_score.toFixed(2)}), ` +
        `contributing ${appliedText} to that field's published adjustment. ` +
        `Grounded in: "${record.evidence_quote}" (epistemic class: ${record.claim_type}).`,
    );

    if (seenFields.has(record.triggered_context_field)) continue;
    seenFields.add(record.triggered_context_field);
    const totalText = formatDelta(record.field_final_delta);
    const etaText = record.consensus_ratio.toFixed(2);
    const note =
      record.field_resolution_status === "APPLIED"
        ? `The published adjustment for ${record.triggered_context_field} is ${totalText} ` +
          `(consensus ratio ${etaText}).`
        : `The adjustment for ${record.triggered_context_field} was NEUTRALIZED: the ` +
          `consensus ratio ${etaText} is below the ${MIN_CONSENSUS_RATIO} deadband, so the ` +
          `published adjustment is ${totalText}.`;
    blocks.push(note);
  }

  return blocks.join("\n\n");
}

/** The empty result: no corpus, or no admissible premise, publishes nothing. */
function emptyEvaluation(): LiteratureEvaluation {
  return { total_delta: 0, adjustments: [], rendered_prose: "", audit_trail: [] };
}

/**
 * THE BRIDGE. Evaluates a class-A literature corpus against an observed game state.
 *
 * The steps, in order:
 *
 *   1. ADMIT. Only class-A, active premises are considered. A corpus that admits nothing
 *      publishes nothing: zero total delta, no adjustments, no audit trail, empty prose.
 *   2. MATCH. Each premise moves the context primitives it declares.
 *   3. SCALE. The normalized displacement from the baseline anchor, and the premise's own
 *      proposed delta.
 *   4. AGGREGATE. The confidence-weighted mean of the active deltas, and the directional
 *      consensus ratio over them.
 *   5. PUBLISH. Clip and deadband the field total, and render the audit prose.
 */
export function evaluateLiteraturePremises(
  context: LiteratureContextVector,
  corpus: readonly LiteraturePremise[],
): LiteratureEvaluation {
  if (corpus.length === 0) return emptyEvaluation();

  const admitted = corpus.filter((row) => isClassA(row));
  if (admitted.length === 0) return emptyEvaluation();

  const adjustments: LiteratureFieldAdjustment[] = [];
  const auditTrail: LiteratureAuditRecord[] = [];
  const fields: string[] = [];
  for (const row of admitted) {
    for (const field of row.applicable_context_fields) {
      if (!fields.includes(field)) fields.push(field);
    }
  }

  let totalDelta = 0;

  for (const field of fields) {
    const observed = context[field];
    if (observed === undefined) continue;
    const anchors = CONTEXT_PRIMITIVE_ANCHORS[field] ?? { baseline: 0, unitScale: 1 };
    const baseline = anchors.baseline;
    const defaultScale = anchors.unitScale;

    interface ActiveDelta {
      readonly row: LiteraturePremise;
      readonly rawDelta: number;
      readonly weight: number;
      readonly promotion: number;
    }
    const active: ActiveDelta[] = [];
    const excluded: LiteraturePremise[] = [];

    for (const row of admitted) {
      if (!row.applicable_context_fields.includes(field)) continue;
      if (!(row.parsed_float_magnitude > 0)) continue;

      const sign = signOperator(row, observed);
      if (sign === 0) {
        excluded.push(row);
        continue;
      }

      // u_i: the premise's own unit scale, unless it moves several primitives at once, in
      // which case a single denominator cannot mean the same thing for all of them and the
      // primitive's own default scale is used instead.
      const u =
        row.applicable_context_fields.length === 1 && row.unit_scale_denominator > 0
          ? row.unit_scale_denominator
          : defaultScale;
      const deltaX = (observed - baseline) / u;
      if (Math.abs(deltaX) < 1e-4) continue;

      const magnitude = Math.abs(row.parsed_float_magnitude);
      const rawDelta = sign * magnitude * deltaX;
      const promotion = promotionScore(row);
      const weight = epistemicWeight(row, field, context) * promotion;
      active.push({ row, rawDelta, weight, promotion });
    }

    if (active.length === 0) {
      for (const row of excluded) {
        auditTrail.push({
          premise_key: row.premise_key,
          title: row.title,
          influence_direction: row.influence_direction,
          triggered_context_field: field,
          observed_context_value: observed,
          baseline_context_value: baseline,
          unit_scale_denominator: row.unit_scale_denominator,
          numeric_claim: row.numeric_claim,
          parsed_delta: 0,
          applied_delta: 0,
          claim_type: row.claim_type,
          confidence_weight: 0,
          promotion_score: promotionScore(row),
          consensus_ratio: 0,
          field_final_delta: 0,
          field_resolution_status: "CONFLICT_NEUTRALIZED",
          resolution_status: "THRESHOLD_NOT_MET",
          evidence_quote: row.evidence_quote,
        });
      }
      continue;
    }

    let weightedSum = 0;
    let totalWeight = 0;
    let weightedAbsSum = 0;
    for (const item of active) {
      weightedSum += item.weight * item.rawDelta;
      totalWeight += item.weight;
      weightedAbsSum += item.weight * Math.abs(item.rawDelta);
    }

    const barDelta = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const consensusRatio = weightedAbsSum > 0 ? Math.abs(weightedSum) / weightedAbsSum : 0;

    // The deadband and the magnitude floor, together, decide whether the field publishes.
    // Below either one the field publishes NOTHING: a field whose premises disagree is not
    // evidence, and a field whose total is noise is not an adjustment.
    const published =
      consensusRatio >= MIN_CONSENSUS_RATIO && Math.abs(barDelta) >= MIN_APPLIED_MAGNITUDE;
    const finalDelta = published ? clampFieldDelta(barDelta) : 0;
    const resolutionStatus: LiteratureResolutionStatus = published
      ? "APPLIED"
      : "CONFLICT_NEUTRALIZED";

    adjustments.push({
      field,
      final_delta: finalDelta,
      consensus_ratio: consensusRatio,
      resolution_status: resolutionStatus,
    });
    totalDelta += finalDelta;

    for (const item of active) {
      // This premise's SHARE of the published field total.
      //
      // The shares (w_i * delta_i) / (sum w) partition the aggregate, so they sum to it. When
      // the field is clamped, the published total is not the aggregate but its saturation, so
      // the shares are scaled to the published total: the audit trail then accounts for the
      // number the reader actually sees, and the shares still sum to it.
      const share = totalWeight > 0 ? (item.weight * item.rawDelta) / totalWeight : 0;
      const saturation = published && barDelta !== 0 ? finalDelta / barDelta : 0;
      auditTrail.push({
        premise_key: item.row.premise_key,
        title: item.row.title,
        influence_direction: item.row.influence_direction,
        triggered_context_field: field,
        observed_context_value: observed,
        baseline_context_value: baseline,
        unit_scale_denominator: item.row.unit_scale_denominator,
        numeric_claim: item.row.numeric_claim,
        parsed_delta: item.rawDelta,
        applied_delta: published ? share * saturation : 0,
        claim_type: item.row.claim_type,
        confidence_weight: item.weight,
        promotion_score: item.promotion,
        consensus_ratio: consensusRatio,
        field_final_delta: finalDelta,
        field_resolution_status: resolutionStatus,
        resolution_status: published ? "APPLIED" : "CONFLICT_NEUTRALIZED",
        evidence_quote: item.row.evidence_quote,
      });
    }

    for (const row of excluded) {
      auditTrail.push({
        premise_key: row.premise_key,
        title: row.title,
        influence_direction: row.influence_direction,
        triggered_context_field: field,
        observed_context_value: observed,
        baseline_context_value: baseline,
        unit_scale_denominator: row.unit_scale_denominator,
        numeric_claim: row.numeric_claim,
        parsed_delta: 0,
        applied_delta: 0,
        claim_type: row.claim_type,
        confidence_weight: 0,
        promotion_score: promotionScore(row),
        consensus_ratio: consensusRatio,
        field_final_delta: finalDelta,
        field_resolution_status: resolutionStatus,
        resolution_status: "THRESHOLD_NOT_MET",
        evidence_quote: row.evidence_quote,
      });
    }
  }

  return {
    total_delta: totalDelta,
    adjustments,
    rendered_prose: renderAuditProse(auditTrail),
    audit_trail: auditTrail,
  };
}

/**
 * THE SPEC'S NAME FOR THIS ENTRY POINT.
 *
 * The spec's section 10.1 falsification probe imports `evaluateMindPrinciples` from this
 * module path, because in the spec this module IS where a literature premise becomes a
 * numeric claim. The repo also has a same-named function in the MIND engine
 * (src/reasoning/mind-reasoning.ts) that evaluates the MIND artifact instead of the
 * literature corpus, so the two are kept apart by name here: `evaluateLiteraturePremises` is
 * the descriptive primary, and this alias is the spec's name for the same function.
 */
export const evaluateMindPrinciples = evaluateLiteraturePremises;
