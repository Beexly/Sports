/**
 * Append-only decision-time price archive for prop edges.
 *
 * pricePropAgainstMarket() is pure: it prices a prop against a book and hands
 * back e = p − q without touching disk. That purity is deliberate — the module
 * is imported by backtests, replays and guards, none of which should be able to
 * write. This file is the other half: once a caller has a successful pure
 * result, it records the price it actually saw AT DECISION TIME, so a later
 * closing line can be compared against it honestly.
 *
 * CLV can only be settled against a price that was written down before the
 * outcome was known. Reconstructing that price after the fact is a
 * back-solved number, not a measurement. Hence append-only: one JSON line per
 * decision, never a rewrite, never a truncate. A later bug in a caller must not
 * be able to silently rewrite what was believed at the time.
 *
 * Every field is validated BEFORE any filesystem call. A row that fails
 * validation throws and writes nothing — the archive is evidence, and a
 * half-valid line is worse than a missing one.
 */

import { appendFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { PropEdgeResult } from "./props-priced-edge.js";

export const DECISION_TIME_PRICE_DIRNAME = "decision-time-prices";

const REPO_ROOT = resolve(__dirname, "..", "..", "..", "..");

/** Where the archive lands when the caller does not redirect it. */
export const DEFAULT_DECISION_TIME_PRICE_DIR = join(
  REPO_ROOT,
  "data",
  DECISION_TIME_PRICE_DIRNAME,
);

export type DecisionTimePriceRow = {
  readonly game_id: string;
  readonly market_id: string;
  readonly side: string;
  /** American odds observed for `side` at decision time. */
  readonly decision_time_price: number;
  /** ISO-8601 UTC instant the decision was made. Drives the file name. */
  readonly decision_time_utc: string;
  readonly model_probability: number;
  readonly devigged_market_prob: number;
  /** Must equal model_probability − devigged_market_prob. */
  readonly edge: number;
  readonly model_source: string;
  /** sha256 of the covariate row, lowercase hex, 64 chars. */
  readonly covariates_hash: string;
};

export type DecisionTimePriceRecordResult = {
  readonly ok: true;
  /** Absolute path of the JSONL file this line landed in. */
  readonly path: string;
  /** UTC day the row was filed under, YYYY-MM-DD. */
  readonly day: string;
  /** Bytes appended, including the trailing newline. */
  readonly bytes: number;
};

export type DecisionTimePriceRecordOptions = {
  /** Redirect the archive root. Tests must use this; production uses the default. */
  readonly baseDir?: string;
};

/** The identity + quote a caller hands the recorder alongside a pure result. */
export type PricedPropArchiveContext = {
  readonly game_id: string;
  readonly market_id: string;
  readonly side: string;
  readonly decision_time_price: number;
  readonly decision_time_utc: string;
};

const COVARIATES_HASH = /^[0-9a-f]{64}$/;
const ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/;
const EDGE_TOLERANCE = 1e-9;

function nonBlank(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      `decision-time price archive: ${field} must be a non-blank string, got ${describe(value)}`,
    );
  }
  return value;
}

function describe(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return String(value);
  if (value === null) return "null";
  return typeof value;
}

function validTimestamp(value: string): number {
  // The shape guard rejects strings Date.parse happens to accept but that are
  // not ISO-8601 ("March 3, 2026", "2026"). The parse guard rejects ISO-shaped
  // strings that are not real instants ("2026-13-45T00:00:00Z").
  if (!ISO_DATE_PREFIX.test(value)) {
    throw new Error(
      `decision-time price archive: decision_time_utc must be ISO-8601, got ${describe(value)}`,
    );
  }
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) {
    throw new Error(
      `decision-time price archive: decision_time_utc does not parse to a valid Date, got ${describe(value)}`,
    );
  }
  return ms;
}

function openProbability(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0 || value >= 1) {
    throw new Error(
      `decision-time price archive: ${field} must be finite and strictly inside (0, 1), got ${describe(value)}`,
    );
  }
  return value;
}

function validAmericanPrice(value: number): number {
  // Same band as isPlausibleEntryOdds on the receipt path: poison-band values
  // are spread/total lines that leaked into the price slot, and values past
  // 10000 are the launch audit's -10533 class of bug — an id or a line, not a
  // book quote. CLV against a fabricated price is worse than no CLV.
  if (!Number.isFinite(value) || value === 0 || Math.abs(value) < 100 || Math.abs(value) > 10000) {
    throw new Error(
      `decision-time price archive: decision_time_price must be finite American odds with 100 <= |price| <= 10000, got ${describe(value)}`,
    );
  }
  return value;
}

function validEdge(edge: number, modelProb: number, deviggedProb: number): number {
  if (!Number.isFinite(edge)) {
    throw new Error(
      `decision-time price archive: edge must be finite, got ${describe(edge)}`,
    );
  }
  const expected = modelProb - deviggedProb;
  // Refuse rather than recompute. Storing a silently repaired edge would make
  // the archive disagree with the caller without recording that it did.
  if (Math.abs(edge - expected) > EDGE_TOLERANCE) {
    throw new Error(
      `decision-time price archive: edge ${edge} is not model_probability − devigged_market_prob (${expected}); refusing to record an edge the caller did not compute`,
    );
  }
  return edge;
}

function validHash(value: string): string {
  if (typeof value !== "string" || !COVARIATES_HASH.test(value)) {
    throw new Error(
      `decision-time price archive: covariates_hash must be 64 lowercase hex chars, got ${describe(value)}`,
    );
  }
  return value;
}

// The documented price band, exported under the names session A's validator
// used so both lanes' consumers and tests speak one API. The band floor is the
// poison band (a spread/total line leaking into the price slot); the ceiling
// is the launch audit's -10533 class of bug (red-team addition, 2026-09-27).
export const DECISION_TIME_PRICE_MIN_ABS = 100;
export const DECISION_TIME_PRICE_MAX_ABS = 10000;

/** UTC day key for an ISO-8601 instant, A-side name for `decisionTimePriceDay`. */
export function archiveDateFor(decisionTimeUtc: string): string {
  return decisionTimePriceDay(decisionTimeUtc);
}

/**
 * Validate a row in full WITHOUT touching the filesystem, returning the row
 * normalized for serialization. A refused row throws here and can therefore
 * never have gained a line; `recordDecisionTimePrice` runs this same rule set
 * before its single append.
 */
export function validateDecisionTimePriceRow(row: DecisionTimePriceRow): DecisionTimePriceRow {
  if (row == null || typeof row !== "object") {
    throw new Error("decision-time price archive: row must be an object");
  }
  return {
    game_id: nonBlank(row.game_id, "game_id"),
    market_id: nonBlank(row.market_id, "market_id"),
    side: nonBlank(row.side, "side"),
    decision_time_price: validAmericanPrice(row.decision_time_price),
    decision_time_utc: nonBlank(row.decision_time_utc, "decision_time_utc"),
    model_probability: openProbability(row.model_probability, "model_probability"),
    devigged_market_prob: openProbability(row.devigged_market_prob, "devigged_market_prob"),
    edge: validEdge(row.edge, openProbability(row.model_probability, "model_probability"), openProbability(row.devigged_market_prob, "devigged_market_prob")),
    model_source: nonBlank(row.model_source, "model_source"),
    covariates_hash: validHash(row.covariates_hash),
  };
}

/**
 * UTC day key, YYYY-MM-DD, for an ISO-8601 instant.
 *
 * UTC, not local. A decision made at 23:59:59Z belongs to that UTC day even
 * when the machine filing it is on the other side of the date line, and a
 * local-date split would silently move rows between files per runner.
 */
export function decisionTimePriceDay(decisionTimeUtc: string): string {
  return new Date(validTimestamp(decisionTimeUtc)).toISOString().slice(0, 10);
}

/** Filename an instant is filed under. */
export function decisionTimePriceFileName(decisionTimeUtc: string): string {
  return `${decisionTimePriceDay(decisionTimeUtc)}.jsonl`;
}

/**
 * Append ONE validated row as a single JSON line to
 * `<baseDir>/YYYY-MM-DD.jsonl`, the day being the UTC date of
 * `decision_time_utc`.
 *
 * Throws — never writes, never creates the file — if any field is invalid.
 * The file is only ever opened for append.
 */
export async function recordDecisionTimePrice(
  row: DecisionTimePriceRow,
  options: DecisionTimePriceRecordOptions = {},
): Promise<DecisionTimePriceRecordResult> {
  // Validate everything first. Nothing below may run on a partial row.
  const gameId = nonBlank(row.game_id, "game_id");
  const marketId = nonBlank(row.market_id, "market_id");
  const side = nonBlank(row.side, "side");
  const price = validAmericanPrice(row.decision_time_price);
  const decisionTimeUtc = nonBlank(row.decision_time_utc, "decision_time_utc");
  const day = decisionTimePriceDay(decisionTimeUtc);
  const modelProbability = openProbability(row.model_probability, "model_probability");
  const deviggedMarketProb = openProbability(row.devigged_market_prob, "devigged_market_prob");
  const edge = validEdge(row.edge, modelProbability, deviggedMarketProb);
  const modelSource = nonBlank(row.model_source, "model_source");
  const covariatesHash = validHash(row.covariates_hash);

  // Explicit key order so a line is byte-stable regardless of how the caller
  // spelled the object. Callers' values are stored verbatim — the archive
  // records what was claimed, not a tidied-up version of it.
  const line = `${JSON.stringify({
    game_id: gameId,
    market_id: marketId,
    side,
    decision_time_price: price,
    decision_time_utc: decisionTimeUtc,
    model_probability: modelProbability,
    devigged_market_prob: deviggedMarketProb,
    edge,
    model_source: modelSource,
    covariates_hash: covariatesHash,
  })}\n`;

  const baseDir = options.baseDir ?? DEFAULT_DECISION_TIME_PRICE_DIR;
  await mkdir(baseDir, { recursive: true });
  const path = join(baseDir, `${day}.jsonl`);
  await appendFile(path, line, "utf8");
  return { ok: true, path, day, bytes: Buffer.byteLength(line, "utf8") };
}

/**
 * Map a successful pure result onto a decision-time row and archive it.
 *
 * The pure result carries no timestamp and no American price — those are
 * properties of the quote the caller saw, not of the model — so the caller
 * supplies them as `context`.
 *
 * `priced` stays `false`. Recording the decision-time price is what makes a
 * future CLV comparison POSSIBLE; it is not the comparison, and it is not a
 * license to retroactively flip the flag. Do not add a `priced = true` write
 * here, and do not add one to pricePropAgainstMarket either — that flag is a
 * product decision about what may be claimed publicly, not an archival side
 * effect. The archive is evidence. It does not promote itself to a claim.
 */
export async function recordPricedPropEvaluation(
  result: PropEdgeResult,
  context: PricedPropArchiveContext,
  covariatesHash: string,
  options: DecisionTimePriceRecordOptions = {},
): Promise<DecisionTimePriceRecordResult> {
  if (!result.ok) {
    throw new Error(
      `decision-time price archive: refusing to archive an unpriced prop result (${result.reason})`,
    );
  }
  return recordDecisionTimePrice(
    {
      game_id: context.game_id,
      market_id: context.market_id,
      side: context.side,
      decision_time_price: context.decision_time_price,
      decision_time_utc: context.decision_time_utc,
      model_probability: result.pOver,
      devigged_market_prob: result.qOver,
      edge: result.edgeOver,
      model_source: result.source,
      covariates_hash: covariatesHash,
    },
    options,
  );
}
