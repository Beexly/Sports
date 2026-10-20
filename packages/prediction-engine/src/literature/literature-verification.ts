/**
 * @file literature-verification.ts
 * The L1-L4 admission gates, implemented so they CAN FAIL.
 *
 * WHY THIS FILE EXISTS (2026-10-20)
 *
 * The repo already had `scripts/audit-l1-l4-admission-gates.ts`, and it
 * reported a 67.4% admission rate over the 5,149-record MIND corpus.
 * That number is not a verification result. The existing gates are
 * SHAPE checks -- they confirm a field is present and well-formed. They
 * never open the source document.
 *
 * MEASURED against the actual source files (reconciliation/_probe_l3_anchoring.mjs):
 *
 *   L1 (quote is non-empty, >= 10 chars)      5,149 / 5,149 pass
 *   L2 (the number appears in the quote)       3,513 / 5,149 pass
 *   L3 (the offsets point at the quote)             0 / 5,046 pass  <-- 0%
 *   L3 (the quote is anywhere in the source)    1,537 / 5,046 pass
 *
 * And the 3,509 quotes that are absent from the source file are absent
 * ENTIRELY -- whitespace normalisation recovers 0 of them. They are not
 * in the document the record cites. They are not paraphrases of it
 * either; they are text from a DIFFERENT paper (a thermodynamic
 * economics abstract, an MMA analytics abstract, a radar-imaging
 * abstract) filed under an NFL record.
 *
 * So the existing gate admits 3,470 records, of which at most ~1,000
 * have a quote that is genuinely in the document it names.
 *
 * THE FOUR LAYERS, as they must be implemented:
 *
 *   L1  VERBATIM PROVENANCE. The evidence quote must appear, EXACTLY,
 *       in the source document the record names. A quote that is in no
 *       document is fabricated provenance, and it is the failure that
 *       matters most, because the quote is what makes the premise
 *       citable.
 *
 *   L2  NUMERIC CONTAINMENT. The claimed magnitude must appear
 *       LITERALLY in the quote. The existing gate accepts a quote that
 *       merely contains a unit word ("points", "yards"), which passes a
 *       record whose number is nowhere near it.
 *
 *   L3  CHARACTER-SPAN ANCHORING. The claimed [start_char, end_char)
 *       must actually select the quote from the source. The existing
 *       gate only checks end_char > start_char.
 *
 *   L4  MECHANISM ENTAILMENT. The controlled vocabulary must hold AND
 *       the mechanism quote must itself be in the source document. A
 *       mechanism quote that is not in the document cannot entail
 *       anything, because it is not a quotation.
 *
 * Each layer is computed INDEPENDENTLY here, so a report can say which
 * layer a record failed rather than only the first one. The existing
 * gate short-circuits, which hides how many failures there are at each
 * depth.
 *
 * This module is a GATE, not an auditor: it returns a verdict per
 * record, and the admission decision is the conjunction. It has no
 * side effects and it does not touch a published number.
 */

/** The controlled vocabulary the spec's L4 gate names. */
export const CONTROLLED_VOCABULARY_16_KEYS: ReadonlySet<string> = new Set([
  "altitude_feet",
  "wind_speed_mph",
  "ambient_temp_fahrenheit",
  "precipitation_rate_mm_hr",
  "air_density_kg_m3",
  "surface_traction_coeff",
  "rest_differential_days",
  "circadian_travel_timezones",
  "ol_continuity_shared_snaps_pct",
  "offensive_pace_sec_per_play",
  "acoustic_crowd_spl_db",
  "officiating_crew_penalty_rate",
  "market_steam_velocity_pts_hr",
  "reverse_line_movement_divergence_pct",
  "acute_chronic_workload_ratio",
  "coach_fourth_down_aggressiveness_pct",
]);

/** A record as the corpus stores it. Only the fields the gates read. */
export interface VerifiableRecord {
  readonly item_id: string;
  readonly title: string;
  readonly source_file: string | null;
  readonly evidence_quote: string | null;
  readonly mechanism_quote: string | null;
  readonly evidence_span: { start_char?: number; end_char?: number; verification_tier?: string } | null;
  readonly numeric_claim: { value?: number; unit?: string; metric?: string } | string | null;
  readonly parsed_float_magnitude: number | null;
  readonly applicable_context_fields: readonly string[] | null;
}

/** The source documents a record may cite, already loaded into memory. */
export type SourceLibrary = ReadonlyMap<string, string>;

/** The outcome of each layer, computed independently. */
export interface VerificationVerdict {
  readonly item_id: string;
  /** L1: the quote is EXACTLY in the named source document. */
  readonly l1_provenance: boolean;
  /** L2: the claimed magnitude appears literally in the quote. */
  readonly l2_numeric_containment: boolean;
  /** L3: the claimed offsets actually select the quote from the source. */
  readonly l3_span_anchoring: boolean;
  /** L4: controlled vocabulary held AND the mechanism quote is in the source. */
  readonly l4_mechanism_entailment: boolean;
  /** All four held. */
  readonly admitted: boolean;
  /** The FIRST layer that failed, or null when admitted. */
  readonly rejection_reason: string | null;
  /** Every layer that failed, so a report is not short-circuited. */
  readonly failed_layers: readonly string[];
  /** True when the record's source file is not in the library at all. */
  readonly source_missing: boolean;
}

const REJECT = {
  l1: "REJECTED_L1_PROVENANCE",
  l2: "REJECTED_L2_NUMERIC",
  l3: "REJECTED_L3_SPAN",
  l4: "REJECTED_L4_ENTAILMENT",
} as const;

/**
 * L1 -- VERBATIM PROVENANCE.
 *
 * The quote must appear EXACTLY in the source document the record names.
 * Whitespace normalisation is NOT applied: if the quote needed
 * normalisation to be found, it is not the quote that was written, and
 * the honest answer is that it does not anchor.
 *
 * MEASURED: 3,509 of 5,046 records with a locatable source have a quote
 * that is absent from it, and 0 of those 3,509 are recovered by
 * whitespace normalisation.
 */
export function checkL1Provenance(
  record: VerifiableRecord,
  source: string | undefined,
): boolean {
  const quote = (record.evidence_quote ?? "").trim();
  if (quote.length < 10) return false;
  if (source === undefined) return false;
  return source.includes(quote);
}

/**
 * L2 -- NUMERIC CONTAINMENT.
 *
 * The claimed magnitude must appear literally in the quote.
 *
 * The existing gate also accepts a quote containing only a UNIT word
 * ("points", "yards", "percent"), which admits a record whose number is
 * nowhere in the evidence. That is a shape check, so it is not used
 * here: the number must be there, in one of the forms it could
 * reasonably be written in.
 */
export function checkL2NumericContainment(record: VerifiableRecord): boolean {
  const quote = record.evidence_quote ?? "";
  if (!quote) return false;
  const claim = record.numeric_claim;
  const magnitude =
    record.parsed_float_magnitude ??
    (typeof claim === "object" && claim !== null && typeof claim.value === "number"
      ? claim.value
      : null);
  if (magnitude === null || !Number.isFinite(magnitude)) {
    // A string claim must appear literally in the quote.
    if (typeof claim === "string") return quote.toLowerCase().includes(claim.toLowerCase());
    return false;
  }
  const candidates = new Set<string>();
  const abs = Math.abs(magnitude);
  candidates.add(String(magnitude));
  candidates.add(String(abs));
  if (Number.isInteger(abs)) candidates.add(String(Math.round(abs)));
  // %g removes trailing zeros: 1.80 -> 1.8
  candidates.add("%g".replace("%g", String(abs)));
  for (const c of candidates) {
    if (c && quote.includes(c)) return true;
  }
  return false;
}

/**
 * L3 -- CHARACTER-SPAN ANCHORING.
 *
 * The claimed [start_char, end_char) must select exactly the quote from
 * the source document.
 *
 * The existing gate checks only `end_char > start_char`, which every
 * record satisfies by construction, so L3 never rejected anything. When
 * the offsets do not select the quote, the record's provenance is
 * asserted rather than demonstrated.
 */
export function checkL3SpanAnchoring(
  record: VerifiableRecord,
  source: string | undefined,
): boolean {
  const span = record.evidence_span;
  if (!span) return false;
  const start = span.start_char;
  const end = span.end_char;
  if (typeof start !== "number" || typeof end !== "number") return false;
  if (end <= start) return false;
  if (source === undefined) return false;
  if (start < 0 || end > source.length) return false;
  const quote = (record.evidence_quote ?? "").trim();
  if (!quote) return false;
  return source.slice(start, end).trim() === quote;
}

/**
 * L4 -- MECHANISM ENTAILMENT.
 *
 * The controlled vocabulary must hold, and the mechanism quote must
 * itself be present in the source document. A mechanism quote that is
 * not in the document cannot entail a mechanism, because it is not a
 * quotation of one.
 */
export function checkL4MechanismEntailment(
  record: VerifiableRecord,
  source: string | undefined,
): boolean {
  const fields = record.applicable_context_fields ?? [];
  if (fields.length === 0) return false;
  if (!fields.every((f) => CONTROLLED_VOCABULARY_16_KEYS.has(f))) return false;
  const mechanism = (record.mechanism_quote ?? "").trim();
  if (mechanism.length < 10) return false;
  if (source === undefined) return false;
  return source.includes(mechanism);
}

/** Verify one record against the source library. */
export function verifyRecord(
  record: VerifiableRecord,
  library: SourceLibrary,
): VerificationVerdict {
  const file = record.source_file;
  const source = file ? library.get(file) : undefined;
  const sourceMissing = source === undefined;

  const l1 = checkL1Provenance(record, source);
  const l2 = checkL2NumericContainment(record);
  const l3 = checkL3SpanAnchoring(record, source);
  const l4 = checkL4MechanismEntailment(record, source);

  const failed: string[] = [];
  if (!l1) failed.push("L1_PROVENANCE");
  if (!l2) failed.push("L2_NUMERIC");
  if (!l3) failed.push("L3_SPAN");
  if (!l4) failed.push("L4_ENTAILMENT");

  const admitted = l1 && l2 && l3 && l4;
  let rejection: string | null = null;
  if (!l1) rejection = REJECT.l1;
  else if (!l2) rejection = REJECT.l2;
  else if (!l3) rejection = REJECT.l3;
  else if (!l4) rejection = REJECT.l4;

  return {
    item_id: record.item_id,
    l1_provenance: l1,
    l2_numeric_containment: l2,
    l3_span_anchoring: l3,
    l4_mechanism_entailment: l4,
    admitted,
    rejection_reason: rejection,
    failed_layers: failed,
    source_missing: sourceMissing,
  };
}

/** Verify a whole corpus, and summarise it. */
export function verifyCorpus(
  records: readonly VerifiableRecord[],
  library: SourceLibrary,
): {
  readonly verdicts: readonly VerificationVerdict[];
  readonly summary: {
    readonly total: number;
    readonly source_missing: number;
    readonly l1_passed: number;
    readonly l2_passed: number;
    readonly l3_passed: number;
    readonly l4_passed: number;
    readonly admitted: number;
    readonly admission_rate_pct: number;
    readonly failed_layer_counts: Readonly<Record<string, number>>;
  };
} {
  const verdicts = records.map((r) => verifyRecord(r, library));
  const count = (f: (v: VerificationVerdict) => boolean) => verdicts.filter(f).length;
  const failedLayerCounts: Record<string, number> = {};
  for (const v of verdicts) {
    for (const layer of v.failed_layers) {
      failedLayerCounts[layer] = (failedLayerCounts[layer] ?? 0) + 1;
    }
  }
  const admitted = count((v) => v.admitted);
  return {
    verdicts,
    summary: {
      total: verdicts.length,
      source_missing: count((v) => v.source_missing),
      l1_passed: count((v) => v.l1_provenance),
      l2_passed: count((v) => v.l2_numeric_containment),
      l3_passed: count((v) => v.l3_span_anchoring),
      l4_passed: count((v) => v.l4_mechanism_entailment),
      admitted,
      admission_rate_pct: verdicts.length ? Number(((admitted / verdicts.length) * 100).toFixed(1)) : 0,
      failed_layer_counts: failedLayerCounts,
    },
  };
}
