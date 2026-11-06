/**
 * EV2 — the CandidateSpec contract.
 *
 * ONE contract every covariate/model candidate implements so a SINGLE command
 * (EV7's `npm run edge:validate`) can evaluate any of them: binary game/side
 * candidates (scored against a de-vigged close) and count-valued prop
 * candidates (scored against a discrete predictive distribution).
 *
 * This module is types + a TOTAL validator. It is research-only:
 *   - `priced: false` is a literal field on the spec AND on every result
 *     record. Nothing here can admit an edge into live pricing; promotion is
 *     masterplan §6's business (EV6), and this deck only BUILDS the referee.
 *   - Pure: no I/O, no fetch, no fs, no clock, no `Math.random`.
 *
 * FAIL-CLOSED, AND TOTAL
 * `validateCandidateSpec` NEVER throws — it returns a typed refusal. It is the
 * pre-flight that catches, before a mid-loop `throw` can kill a whole run, the
 * malformed rows that `walkForwardSplits` would otherwise blow up on
 * (`walk-forward.ts`: "eventEndAt precedes decisionAt") and that `evVsClose`
 * would otherwise blow up on (`placebo.ts`: a close at a closed endpoint makes
 * `(ySide - qSide) / qSide` divide by zero / return -1 on a certainty).
 *
 * It reports ALL offending rowIds for the FIRST refusal reason hit, in input
 * order — the scan does not stop at the first bad row, so one pass tells the
 * caller everything that is wrong under that reason. ONE bad row refuses the
 * whole spec; the caller repairs upstream. Silent row-dropping is FORBIDDEN
 * here: dropping-with-a-reason is the fold-runner's (EV3's) explicitly
 * reported job, not the validator's.
 *
 * Precedence of reasons is the declaration order of `SpecRefusalReason`
 * (see `REFUSAL_PRECEDENCE`), so the answer is deterministic for a spec that
 * violates several rules at once.
 *
 * Notes on the edges the card leaves to the implementer, all resolved
 * fail-closed and all covered by tests:
 *   - `bad_id` also covers a row whose own `id` is not a non-blank string:
 *     every fold accounting join and every report join keys on that id.
 *   - `cells` present (even as an empty array) REQUIRES `kickoffWeek`
 *     (`cells_without_kickoff_week`) — "required iff cells present", read
 *     literally.
 *   - `qclose_without_line` covers both an absent `line` and a non-finite
 *     one: a NaN line is a missing line.
 *   - `bad_cell` additionally refuses a `MARKET_PROP` layer. The p-side may
 *     never ingest a market-prop value (deck common contract; EV8 makes it a
 *     build failure) — refusing it here is the cheapest place to catch it.
 *   - `trainer`/`baseline` are type-enforced (both REQUIRED — for binaries the
 *     canonical baseline is market-only, i.e. a `Trainer` that ignores
 *     features and returns the row's close; for counts it is climatology, the
 *     train-fold empirical count distribution). There is no refusal reason for
 *     them, and this validator never CALLS them, so a caller cannot make it
 *     throw through them either.
 */

import type { DiscreteDistribution } from "../kernel/contract.js";
import type { Trainer } from "../logistic.js";
import type { EvalRow } from "../placebo.js";
import type { TimedRow } from "../walk-forward.js";

export const EDGE_VALIDATE_METHOD_TAG = "edge_validate_v1" as const;

/** Structural cell stamp — deliberately NOT imported from covariate-bus.ts
 *  (PR #555 collision risk); compatible with the post-#555 CovariateCell. */
export interface ProvenancedCell {
  readonly value: number;
  readonly layer: string; // "MARKET_PROP" is refused wherever checked
  readonly knownAtWeek: number; // integer; must be < kickoffWeek
}

export interface BinaryRow extends EvalRow {
  readonly family: string; // /^[a-z0-9_]+$/, e.g. "game_h2h"
  readonly kickoffWeek?: number; // required iff cells present
  readonly cells?: readonly { readonly field: string; readonly cell: ProvenancedCell }[];
}

export interface CountRow extends TimedRow {
  readonly family: string; // e.g. "receptions"
  readonly features: ReadonlyMap<string, number>;
  readonly observed: number; // integer >= 0 (the realized count)
  readonly line?: number; // prop line; required iff qClose present
  readonly qClose?: number; // devigged P(over line) in (0,1); ABSENT today (EV1)
  readonly kickoffWeek?: number;
  readonly cells?: readonly { readonly field: string; readonly cell: ProvenancedCell }[];
}

export type CountPredictor = (features: ReadonlyMap<string, number>) => DiscreteDistribution;

export interface CountTrainer {
  (train: readonly CountRow[]): CountPredictor;
}

export type CandidateSpec =
  | {
      readonly kind: "binary";
      readonly id: string;
      readonly rows: readonly BinaryRow[];
      readonly trainer: Trainer;
      readonly baseline: Trainer;
      readonly seasonOf: (row: BinaryRow) => string;
      readonly priced: false;
    }
  | {
      readonly kind: "count";
      readonly id: string;
      readonly rows: readonly CountRow[];
      readonly trainer: CountTrainer;
      readonly baseline: CountTrainer;
      readonly seasonOf: (row: CountRow) => string;
      readonly priced: false;
    };

export type SpecRefusalReason =
  | "bad_id"
  | "empty_rows"
  | "duplicate_row_id"
  | "bad_family"
  | "bad_decision_time"
  | "event_before_decision"
  | "non_integer_observed"
  | "negative_observed"
  | "bad_qclose"
  | "qclose_without_line"
  | "cells_without_kickoff_week"
  | "bad_kickoff_week"
  | "bad_cell";

export type SpecCheck =
  | { readonly ok: true; readonly rowCount: number; readonly priced: false }
  | {
      readonly ok: false;
      readonly refuse: SpecRefusalReason;
      readonly rowIds: readonly string[];
      readonly priced: false;
    };

/**
 * Deterministic precedence: the FIRST reason in this order that has at least
 * one offending row wins, and every offending row for THAT reason is reported.
 * (`bad_id`/`empty_rows` are spec-level and are settled before the row scan.)
 */
export const REFUSAL_PRECEDENCE: readonly SpecRefusalReason[] = [
  "bad_id",
  "empty_rows",
  "duplicate_row_id",
  "bad_family",
  "bad_decision_time",
  "event_before_decision",
  "non_integer_observed",
  "negative_observed",
  "bad_qclose",
  "qclose_without_line",
  "cells_without_kickoff_week",
  "bad_kickoff_week",
  "bad_cell",
];

const FAMILY_PATTERN = /^[a-z0-9_]+$/;
const FORBIDDEN_CELL_LAYER = "MARKET_PROP";

// ─────────────────────────────────────────────────────────────────────────────
// Total, unknown-safe accessors. The validator's contract is "never throws",
// which must hold for a hand-built object that lied to the compiler too.
// ─────────────────────────────────────────────────────────────────────────────

type Rec = Readonly<Record<string, unknown>>;

function asRecord(value: unknown): Rec | null {
  return typeof value === "object" && value !== null ? (value as Rec) : null;
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Milliseconds for an ISO instant, or NaN for anything unparseable. */
function instantMs(value: unknown): number {
  return typeof value === "string" ? Date.parse(value) : Number.NaN;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isIntegerNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

/** A row flattened into unknown-typed fields so every check is total. */
interface RowView {
  readonly id: string;
  readonly idOk: boolean;
  readonly family: unknown;
  readonly decisionAt: unknown;
  readonly eventEndAt: unknown;
  readonly observed: unknown;
  readonly hasLine: boolean;
  readonly line: unknown;
  readonly hasQClose: boolean;
  readonly qClose: unknown;
  readonly hasKickoffWeek: boolean;
  readonly kickoffWeek: unknown;
  readonly hasCells: boolean;
  readonly cells: unknown;
}

function viewOf(row: unknown): RowView {
  const rec = asRecord(row);
  const rawId: unknown = rec?.["id"];
  return {
    id: typeof rawId === "string" ? rawId : "",
    idOk: isNonBlankString(rawId),
    family: rec?.["family"],
    decisionAt: rec?.["decisionAt"],
    eventEndAt: rec?.["eventEndAt"],
    observed: rec?.["observed"],
    hasLine: rec !== null && rec["line"] !== undefined,
    line: rec?.["line"],
    hasQClose: rec !== null && rec["qClose"] !== undefined,
    qClose: rec?.["qClose"],
    hasKickoffWeek: rec !== null && rec["kickoffWeek"] !== undefined,
    kickoffWeek: rec?.["kickoffWeek"],
    hasCells: rec !== null && rec["cells"] !== undefined,
    cells: rec?.["cells"],
  };
}

function refuse(reason: SpecRefusalReason, rowIds: readonly string[]): SpecCheck {
  return { ok: false, refuse: reason, rowIds, priced: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-row predicates. Each returns true when the row OFFENDS the reason.
// ─────────────────────────────────────────────────────────────────────────────

function offendsFamily(v: RowView): boolean {
  return !(typeof v.family === "string" && FAMILY_PATTERN.test(v.family));
}

function offendsDecisionTime(v: RowView): boolean {
  return !Number.isFinite(instantMs(v.decisionAt)) || !Number.isFinite(instantMs(v.eventEndAt));
}

function offendsEventOrder(v: RowView): boolean {
  const d = instantMs(v.decisionAt);
  const e = instantMs(v.eventEndAt);
  // Unparseable instants are `bad_decision_time`, which has already fired.
  if (!Number.isFinite(d) || !Number.isFinite(e)) return false;
  return e < d;
}

function offendsObservedInteger(v: RowView): boolean {
  return !isIntegerNumber(v.observed);
}

function offendsObservedSign(v: RowView): boolean {
  // Non-integers are `non_integer_observed`, which has already fired.
  if (!isIntegerNumber(v.observed)) return false;
  return v.observed < 0;
}

/** Binary rows REQUIRE a close; count rows only carry one when the book does. */
function offendsQClose(v: RowView, required: boolean): boolean {
  if (!required && !v.hasQClose) return false;
  if (!isFiniteNumber(v.qClose)) return true;
  return !(v.qClose > 0 && v.qClose < 1);
}

/** A close with no (usable) line is a prop that cannot be settled. */
function offendsQCloseLinePairing(v: RowView): boolean {
  if (!v.hasQClose) return false;
  return !isFiniteNumber(v.line);
}

function offendsCellsWithoutKickoffWeek(v: RowView): boolean {
  return v.hasCells && !v.hasKickoffWeek;
}

function offendsKickoffWeek(v: RowView): boolean {
  if (!v.hasKickoffWeek) return false;
  return !isIntegerNumber(v.kickoffWeek) || v.kickoffWeek < 1;
}

/**
 * Strictly-prior is the covariate-bus law (`latestPriorRow`: "strictly prior"),
 * so `knownAtWeek === kickoffWeek` is a same-week leak, not a boundary case.
 */
function offendsCells(v: RowView): boolean {
  if (!v.hasCells) return false;
  // A missing/bad kickoff week is reported under its own reason first.
  if (!isIntegerNumber(v.kickoffWeek) || v.kickoffWeek < 1) return false;
  const kickoffWeek = v.kickoffWeek;
  if (!Array.isArray(v.cells)) return true;
  const entries: readonly unknown[] = v.cells;
  for (const entry of entries) {
    const entryRec = asRecord(entry);
    if (entryRec === null) return true;
    if (!isNonBlankString(entryRec["field"])) return true;
    const cell = asRecord(entryRec["cell"]);
    if (cell === null) return true;
    if (!isFiniteNumber(cell["value"])) return true;
    const layer = cell["layer"];
    if (!isNonBlankString(layer) || layer === FORBIDDEN_CELL_LAYER) return true;
    const knownAtWeek = cell["knownAtWeek"];
    if (!isIntegerNumber(knownAtWeek)) return true;
    if (knownAtWeek >= kickoffWeek) return true;
  }
  return false;
}

/**
 * Validate a candidate spec. TOTAL: returns a typed refusal, never throws.
 *
 * On refusal, `rowIds` holds EVERY row offending the first-hit reason, in
 * input order (empty for the spec-level reasons `bad_id`/`empty_rows`).
 */
export function validateCandidateSpec(spec: CandidateSpec): SpecCheck {
  const specRec = asRecord(spec);
  if (specRec === null) return refuse("empty_rows", []);
  if (!isNonBlankString(specRec["id"])) return refuse("bad_id", []);

  const rawRows: unknown = specRec["rows"];
  if (!Array.isArray(rawRows) || rawRows.length === 0) return refuse("empty_rows", []);
  const rows: readonly unknown[] = rawRows;
  const views = rows.map(viewOf);

  // bad_id (row level): a blank id breaks fold accounting and report joins.
  const badIdRows = views.filter((v) => !v.idOk).map((v) => v.id);
  if (badIdRows.length > 0) return refuse("bad_id", badIdRows);

  // duplicate_row_id: report each repeated id once, at first-occurrence order.
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const v of views) {
    if (seen.has(v.id)) {
      if (!dupes.includes(v.id)) dupes.push(v.id);
    } else {
      seen.add(v.id);
    }
  }
  if (dupes.length > 0) return refuse("duplicate_row_id", dupes);

  const isCount = specRec["kind"] === "count";
  const passes: readonly { readonly reason: SpecRefusalReason; readonly offends: (v: RowView) => boolean }[] = [
    { reason: "bad_family", offends: offendsFamily },
    { reason: "bad_decision_time", offends: offendsDecisionTime },
    { reason: "event_before_decision", offends: offendsEventOrder },
    ...(isCount
      ? ([
          { reason: "non_integer_observed", offends: offendsObservedInteger },
          { reason: "negative_observed", offends: offendsObservedSign },
        ] as const)
      : []),
    { reason: "bad_qclose", offends: (v: RowView) => offendsQClose(v, !isCount) },
    ...(isCount ? ([{ reason: "qclose_without_line", offends: offendsQCloseLinePairing }] as const) : []),
    { reason: "cells_without_kickoff_week", offends: offendsCellsWithoutKickoffWeek },
    { reason: "bad_kickoff_week", offends: offendsKickoffWeek },
    { reason: "bad_cell", offends: offendsCells },
  ];

  for (const pass of passes) {
    // Scan EVERY row — never stop at the first offender.
    const offenders: string[] = [];
    for (const v of views) {
      if (pass.offends(v)) offenders.push(v.id);
    }
    if (offenders.length > 0) return refuse(pass.reason, offenders);
  }

  return { ok: true, rowCount: views.length, priced: false };
}
