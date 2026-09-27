/**
 * Decision-time price archive.
 *
 * Closing-line value needs two prices: the one you saw when you decided, and a
 * later one. This file accumulates only the first. It is accumulation, not proof
 * — an archive row is a record that a price was observed at a decision time, not
 * a claim that the archive can already settle CLV. `priced` stays false on
 * every priced result until a settlement module that was not faked says so.
 *
 * Append-only by construction: a validated row is appended with the append flag
 * as exactly one complete line plus newline. There is no truncate path and no
 * temp-then-rename path, so two concurrent callers can never leave a
 * half-written first line behind.
 *
 * This module is the ONLY place in the prop stack that touches the filesystem.
 * `pricePropAgainstMarket` in props-priced-edge.ts stays pure and gains no `fs`
 * import; a caller invokes the recorder after it already has a successful pure
 * result.
 */

import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import type { PricedPropEdge } from "./props-priced-edge.js";

/** Absolute value floor for a plausible American price. */
export const DECISION_TIME_PRICE_MIN_ABS = 100;

/** Tolerance for the caller's edge agreeing with p - q. */
export const EDGE_TOLERANCE = 1e-9;

export const DEFAULT_ARCHIVE_DIR = "data/decision-time-prices";

export type DecisionTimePriceRow = {
  readonly game_id: string;
  readonly market_id: string;
  readonly side: string;
  /** American odds as offered at decision time. */
  readonly decision_time_price: number;
  /** ISO-8601 instant the decision was made. */
  readonly decision_time_utc: string;
  /** Model probability, strictly inside (0, 1). */
  readonly model_probability: number;
  /** Shin-devigged market probability, strictly inside (0, 1). */
  readonly devigged_market_prob: number;
  /** Must equal model_probability - devigged_market_prob within EDGE_TOLERANCE. */
  readonly edge: number;
  readonly model_source: string;
  /** Lowercase hex sha256 of the covariate vector that produced the model number. */
  readonly covariates_hash: string;
};

const SHA256_HEX = /^[0-9a-f]{64}$/;
const ISO_8601 = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/;

function nonBlankString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`decision-time-price-archive: ${field} must be a non-blank string`);
  }
  return value;
}

function openUnitInterval(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || !(value > 0 && value < 1)) {
    throw new Error(
      `decision-time-price-archive: ${field} must be finite and strictly inside (0, 1), got ${String(value)}`,
    );
  }
  return value;
}

/**
 * UTC calendar date of the decision instant. The archive is partitioned by this
 * date so a day can be hashed and shipped on its own.
 */
export function archiveDateFor(decisionTimeUtc: string): string {
  const ms = Date.parse(decisionTimeUtc);
  if (!Number.isFinite(ms)) {
    throw new Error(`decision-time-price-archive: decision_time_utc does not parse: ${decisionTimeUtc}`);
  }
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Validate a row in full BEFORE any filesystem call, so a refused row can never
 * have gained a line. Returns the row typed and normalized for serialization.
 */
export function validateDecisionTimePriceRow(row: DecisionTimePriceRow): DecisionTimePriceRow {
  if (row == null || typeof row !== "object") {
    throw new Error("decision-time-price-archive: row must be an object");
  }

  const game_id = nonBlankString(row.game_id, "game_id");
  const market_id = nonBlankString(row.market_id, "market_id");
  const side = nonBlankString(row.side, "side");
  const model_source = nonBlankString(row.model_source, "model_source");

  const decision_time_utc = nonBlankString(row.decision_time_utc, "decision_time_utc");
  if (!ISO_8601.test(decision_time_utc) || !Number.isFinite(Date.parse(decision_time_utc))) {
    throw new Error(`decision-time-price-archive: decision_time_utc is not a parseable ISO-8601 instant: ${decision_time_utc}`);
  }

  const price = row.decision_time_price;
  if (typeof price !== "number" || !Number.isFinite(price)) {
    throw new Error(`decision-time-price-archive: decision_time_price must be finite, got ${String(price)}`);
  }
  if (price === 0) {
    throw new Error("decision-time-price-archive: decision_time_price must not be zero");
  }
  if (Math.abs(price) < DECISION_TIME_PRICE_MIN_ABS) {
    throw new Error(
      `decision-time-price-archive: decision_time_price ${price} is inside the poison band; a plausible American price has |odds| >= ${DECISION_TIME_PRICE_MIN_ABS}`,
    );
  }

  const model_probability = openUnitInterval(row.model_probability, "model_probability");
  const devigged_market_prob = openUnitInterval(row.devigged_market_prob, "devigged_market_prob");

  if (typeof row.edge !== "number" || !Number.isFinite(row.edge)) {
    throw new Error(`decision-time-price-archive: edge must be finite, got ${String(row.edge)}`);
  }
  // Refuse a caller's wrong edge. Do NOT silently recompute and store it: a stored
  // edge that disagrees with p - q is a lie about what the engine computed.
  const expected = model_probability - devigged_market_prob;
  if (Math.abs(row.edge - expected) > EDGE_TOLERANCE) {
    throw new Error(
      `decision-time-price-archive: edge ${row.edge} does not equal model_probability - devigged_market_prob (${expected}) within ${EDGE_TOLERANCE}`,
    );
  }

  if (typeof row.covariates_hash !== "string" || !SHA256_HEX.test(row.covariates_hash)) {
    throw new Error(
      `decision-time-price-archive: covariates_hash must be 64 lowercase hex characters, got ${String(row.covariates_hash)}`,
    );
  }

  return {
    game_id,
    market_id,
    side,
    decision_time_price: price,
    decision_time_utc,
    model_probability,
    devigged_market_prob,
    edge: row.edge,
    model_source,
    covariates_hash: row.covariates_hash,
  };
}

export type RecordDecisionTimePriceOptions = {
  /** Override the archive root. Tests pass a temp dir; the product passes nothing. */
  readonly dir?: string;
};

/**
 * Append one validated decision-time price. Throws on any refusal, and a throw
 * guarantees no line was written because validation completes before the write.
 */
export function recordDecisionTimePrice(
  row: DecisionTimePriceRow,
  options: RecordDecisionTimePriceOptions = {},
): { path: string; row: DecisionTimePriceRow } {
  const validated = validateDecisionTimePriceRow(row);
  const dir = options.dir ?? DEFAULT_ARCHIVE_DIR;
  const date = archiveDateFor(validated.decision_time_utc);
  const target = join(dir, `${date}.jsonl`);

  mkdirSync(dir, { recursive: true });
  // One complete line plus newline, appended. Never truncated.
  appendFileSync(target, `${JSON.stringify(validated)}\n`, { encoding: "utf8", flag: "a" });

  return { path: target, row: validated };
}

export type PricedPropEvaluationContext = {
  readonly gameId: string;
  readonly marketId: string;
  /** "over" | "under" | "home" | "away" | any other non-blank label. */
  readonly side: string;
  readonly decisionTimeUtc: string;
  /** The American price actually quoted for `side` at decision time. */
  readonly decisionTimePrice: number;
  /** Lowercase hex sha256 of the covariate vector behind `pOver`. */
  readonly covariatesHash: string;
  readonly dir?: string;
};

/**
 * Map a SUCCESSFUL pure priced result onto an archive row and append it.
 *
 * `result.priced` is read, never written. This function cannot flip it, and it
 * refuses an unpriced result rather than archiving a number the engine declined
 * to price.
 */
export function recordPricedPropEvaluation(
  result: PricedPropEdge,
  context: PricedPropEvaluationContext,
): { path: string; row: DecisionTimePriceRow } {
  if (result == null || result.ok !== true) {
    throw new Error("decision-time-price-archive: recordPricedPropEvaluation requires a successful priced result");
  }
  if (result.priced !== false) {
    throw new Error("decision-time-price-archive: recorder never flips priced; refusing a result that already claims it");
  }

  return recordDecisionTimePrice(
    {
      game_id: context.gameId,
      market_id: context.marketId,
      side: context.side,
      decision_time_price: context.decisionTimePrice,
      decision_time_utc: context.decisionTimeUtc,
      model_probability: result.pOver,
      devigged_market_prob: result.qOver,
      edge: result.edgeOver,
      model_source: result.source,
      covariates_hash: context.covariatesHash,
    },
    context.dir != null ? { dir: context.dir } : {},
  );
}
