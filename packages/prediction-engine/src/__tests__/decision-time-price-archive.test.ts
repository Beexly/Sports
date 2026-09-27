import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  recordDecisionTimePrice,
  recordPricedPropEvaluation,
  validateDecisionTimePriceRow,
  archiveDateFor,
  DECISION_TIME_PRICE_MIN_ABS,
  type DecisionTimePriceRow,
} from "../edge-lab/decision-time-price-archive.js";
import { pricePropAgainstMarket } from "../edge-lab/props-priced-edge.js";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

let dir: string;

beforeEach(() => {
  // Every row in this suite goes to a throwaway temp dir. Nothing is written to
  // the repo's data/decision-time-prices, so a test run can never contaminate
  // the real archive or make it look like CLV data exists.
  dir = mkdtempSync(join(tmpdir(), "dtp-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function row(overrides: Partial<DecisionTimePriceRow> = {}): DecisionTimePriceRow {
  const model_probability = 0.62;
  const devigged_market_prob = 0.55;
  return {
    game_id: "2026_03_LAC_BUF",
    market_id: "LAC_BUF_alt_over_49.5",
    side: "over",
    decision_time_price: -110,
    decision_time_utc: "2026-09-27T12:00:00.000Z",
    model_probability,
    devigged_market_prob,
    edge: model_probability - devigged_market_prob,
    model_source: "props_hb",
    covariates_hash: HASH_A,
    ...overrides,
  };
}

function readArchive(): DecisionTimePriceRow[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  if (files.length === 0) return [];
  const text = readFileSync(join(dir, files[0]), "utf8");
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

describe("decision-time price archive", () => {
  it("appends two rows and reads them back in order", () => {
    const first = recordDecisionTimePrice(row({ game_id: "2026_03_LAC_BUF" }), { dir });
    const second = recordDecisionTimePrice(
      row({ game_id: "2026_03_LAC_BUF", market_id: "LAC_BUF_alt_over_47.5", covariates_hash: HASH_B }),
      { dir },
    );

    expect(first.path).toBe(second.path, "same UTC date must land in the same day file");
    expect(first.path).toBe(join(dir, "2026-09-27.jsonl"));

    const rows = readArchive();
    expect(rows).toHaveLength(2);
    expect(rows[0].game_id).toBe("2026_03_LAC_BUF");
    expect(rows[0].market_id).toBe("LAC_BUF_alt_over_49.5");
    expect(rows[1].market_id).toBe("LAC_BUF_alt_over_47.5");
  });

  it("a second call never deletes the first row", () => {
    recordDecisionTimePrice(row({ covariates_hash: HASH_A }), { dir });
    recordDecisionTimePrice(row({ covariates_hash: HASH_B }), { dir });
    recordDecisionTimePrice(row({ covariates_hash: HASH_A }), { dir });

    const rows = readArchive();
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.covariates_hash)).toEqual([HASH_A, HASH_B, HASH_A]);
  });

  it("refuses a zero price and writes no line", () => {
    expect(() => recordDecisionTimePrice(row({ decision_time_price: 0 }), { dir })).toThrow(/zero/);
    expect(existsSync(join(dir, "2026-09-27.jsonl"))).toBe(false);
  });

  it("refuses NaN and non-finite prices and writes no line", () => {
    expect(() => recordDecisionTimePrice(row({ decision_time_price: Number.NaN }), { dir })).toThrow(/finite/);
    expect(() =>
      recordDecisionTimePrice(row({ decision_time_price: Number.POSITIVE_INFINITY }), { dir }),
    ).toThrow(/finite/);
    expect(existsSync(join(dir, "2026-09-27.jsonl"))).toBe(false);
  });

  it("refuses prices inside the poison band", () => {
    for (const price of [-33, -43, -86, 99, -99]) {
      expect(() => recordDecisionTimePrice(row({ decision_time_price: price }), { dir })).toThrow(
        /poison band/,
      );
    }
    expect(existsSync(join(dir, "2026-09-27.jsonl"))).toBe(false);
  });

  it("refuses probabilities of exactly 0 and exactly 1", () => {
    expect(() =>
      recordDecisionTimePrice(row({ model_probability: 0, devigged_market_prob: 0.5, edge: -0.5 }), { dir }),
    ).toThrow(/strictly inside \(0, 1\)/);
    expect(() =>
      recordDecisionTimePrice(row({ model_probability: 1, devigged_market_prob: 0.5, edge: 0.5 }), { dir }),
    ).toThrow(/strictly inside \(0, 1\)/);
    expect(() =>
      recordDecisionTimePrice(row({ model_probability: 0.5, devigged_market_prob: 0, edge: 0.5 }), { dir }),
    ).toThrow(/strictly inside \(0, 1\)/);
    expect(() =>
      recordDecisionTimePrice(row({ model_probability: 0.5, devigged_market_prob: 1, edge: -0.5 }), { dir }),
    ).toThrow(/strictly inside \(0, 1\)/);
    expect(existsSync(join(dir, "2026-09-27.jsonl"))).toBe(false);
  });

  it("accepts a 0.5 probability and writes the row", () => {
    const res = recordDecisionTimePrice(
      row({ model_probability: 0.5, devigged_market_prob: 0.5, edge: 0 }),
      { dir },
    );
    const rows = readArchive();
    expect(rows).toHaveLength(1);
    expect(rows[0].model_probability).toBe(0.5);
    expect(rows[0].edge).toBe(0);
    expect(res.path).toBe(join(dir, "2026-09-27.jsonl"));
  });

  it("refuses a mismatched edge rather than silently recomputing it", () => {
    // The caller claims an edge of 0.9 while p - q is 0.07. Storing the recomputed
    // value would hide the caller's bug; storing 0.9 would be a lie.
    expect(() => recordDecisionTimePrice(row({ edge: 0.9 }), { dir })).toThrow(/does not equal/);
    expect(existsSync(join(dir, "2026-09-27.jsonl"))).toBe(false);
  });

  it("refuses blank identifiers and a malformed covariates hash", () => {
    expect(() => recordDecisionTimePrice(row({ game_id: "   " }), { dir })).toThrow(/game_id/);
    expect(() => recordDecisionTimePrice(row({ market_id: "" }), { dir })).toThrow(/market_id/);
    expect(() => recordDecisionTimePrice(row({ side: "" }), { dir })).toThrow(/side/);
    expect(() => recordDecisionTimePrice(row({ model_source: "  " }), { dir })).toThrow(/model_source/);
    expect(() => recordDecisionTimePrice(row({ covariates_hash: "nope" }), { dir })).toThrow(/64 lowercase hex/);
    expect(() => recordDecisionTimePrice(row({ covariates_hash: "A".repeat(64) }), { dir })).toThrow(
      /64 lowercase hex/,
    );
    expect(() => recordDecisionTimePrice(row({ decision_time_utc: "not-a-date" }), { dir })).toThrow(/ISO-8601/);
    expect(existsSync(join(dir, "2026-09-27.jsonl"))).toBe(false);
  });

  it("partitions the archive by the UTC date of the decision instant", () => {
    expect(archiveDateFor("2026-09-27T23:30:00.000Z")).toBe("2026-09-27");
    // 2026-09-28T01:00Z is still 2026-09-27 in New York. The archive is UTC, so
    // this files under the 28th. That is deliberate and must stay deliberate.
    expect(archiveDateFor("2026-09-28T01:00:00.000Z")).toBe("2026-09-28");

    const a = recordDecisionTimePrice(row({ decision_time_utc: "2026-09-27T23:00:00.000Z" }), { dir });
    const b = recordDecisionTimePrice(row({ decision_time_utc: "2026-09-28T01:00:00.000Z" }), { dir });
    expect(a.path).not.toBe(b.path);
    expect(readdirSync(dir).sort()).toEqual(["2026-09-27.jsonl", "2026-09-28.jsonl"]);
  });

  it("validates without touching the filesystem", () => {
    expect(() => validateDecisionTimePriceRow(row({ edge: 0.9 }))).toThrow(/does not equal/);
    expect(readdirSync(dir)).toHaveLength(0);
  });

  it("the documented band constant is 100", () => {
    expect(DECISION_TIME_PRICE_MIN_ABS).toBe(100);
  });
});

describe("recordPricedPropEvaluation", () => {
  it("maps a real priced result onto an archive row and leaves priced false", () => {
    const result = pricePropAgainstMarket(0.62, { overAmerican: -110, underAmerican: -110 });
    expect(result.ok).toBe(true);
    if (result.ok !== true) throw new Error("expected a priced result");
    expect(result.priced).toBe(false);
    expect(result.qMethod).toBe("shin");

    recordPricedPropEvaluation(result, {
      gameId: "2026_03_LAC_BUF",
      marketId: "LAC_BUF_alt_over_49.5",
      side: "over",
      decisionTimeUtc: "2026-09-27T12:00:00.000Z",
      decisionTimePrice: -110,
      covariatesHash: HASH_A,
      dir,
    });

    const rows = readArchive();
    expect(rows).toHaveLength(1);
    expect(rows[0].model_probability).toBeCloseTo(result.pOver, 12);
    expect(rows[0].devigged_market_prob).toBeCloseTo(result.qOver, 12);
    expect(rows[0].edge).toBeCloseTo(result.edgeOver, 12);
    expect(rows[0].model_source).toBe(result.source);
    // The recorder must not have flipped the flag on the object it was handed.
    expect(result.priced).toBe(false);
  });

  it("refuses an unpriced result instead of archiving a declined number", () => {
    const result = pricePropAgainstMarket(0.62, null);
    expect(result.ok).toBe(false);
    expect(() =>
      recordPricedPropEvaluation(result as never, {
        gameId: "2026_03_LAC_BUF",
        marketId: "LAC_BUF_alt_over_49.5",
        side: "over",
        decisionTimeUtc: "2026-09-27T12:00:00.000Z",
        decisionTimePrice: -110,
        covariatesHash: HASH_A,
        dir,
      }),
    ).toThrow(/successful priced result/);
    expect(readdirSync(dir)).toHaveLength(0);
  });
});
