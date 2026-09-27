import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pricePropAgainstMarket, PROPS_HB_SOURCE } from "../props-priced-edge.js";
import {
  decisionTimePriceDay,
  decisionTimePriceFileName,
  recordDecisionTimePrice,
  recordPricedPropEvaluation,
} from "../decision-time-price-archive.js";
import type { DecisionTimePriceRow } from "../decision-time-price-archive.js";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

function row(partial: Partial<DecisionTimePriceRow> = {}): DecisionTimePriceRow {
  return {
    game_id: "2026_03_LAC_BUF",
    market_id: "2026_03_LAC_BUF::rec_yds_over_52.5",
    side: "over",
    decision_time_price: -110,
    decision_time_utc: "2026-03-05T12:00:00.000Z",
    model_probability: 0.58,
    devigged_market_prob: 0.5,
    edge: 0.58 - 0.5,
    model_source: PROPS_HB_SOURCE,
    covariates_hash: HASH_A,
    ...partial,
  };
}

describe("decision-time price archive", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "decision-time-price-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  /**
   * Every test funnels through here so no case can reach the repo's
   * data/decision-time-prices by forgetting an override.
   */
  function record(r: DecisionTimePriceRow) {
    return recordDecisionTimePrice(r, { baseDir: dir });
  }

  function pathFor(decisionTimeUtc: string): string {
    return join(dir, decisionTimePriceFileName(decisionTimeUtc));
  }

  function lines(decisionTimeUtc: string): string[] {
    const path = pathFor(decisionTimeUtc);
    if (!existsSync(path)) return [];
    return readFileSync(path, "utf8").split("\n").filter((l) => l !== "");
  }

  function parsed(decisionTimeUtc: string): Record<string, unknown>[] {
    return lines(decisionTimeUtc).map((l) => JSON.parse(l) as Record<string, unknown>);
  }

  it("appends two rows and reads both back in order", async () => {
    const utc = "2026-03-05T12:00:00.000Z";
    const first = await record(row({ game_id: "first", covariates_hash: HASH_A }));
    const second = await record(row({ game_id: "second", covariates_hash: HASH_B }));

    expect(first.ok).toBe(true);
    expect(first.day).toBe("2026-03-05");
    expect(second.path).toBe(first.path);

    const rows = parsed(utc);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.game_id).toBe("first");
    expect(rows[1]?.game_id).toBe("second");
    expect(readFileSync(pathFor(utc), "utf8").endsWith("\n")).toBe(true);
  });

  it("a second append does not delete or truncate the first line", async () => {
    const utc = "2026-03-05T12:00:00.000Z";
    await record(row({ game_id: "first" }));
    expect(lines(utc)).toHaveLength(1);

    await record(row({ game_id: "second" }));

    // Exactly one more line, and the original is still the first one.
    expect(lines(utc)).toHaveLength(2);
    const rows = parsed(utc);
    expect(rows[0]?.game_id).toBe("first");
    expect(rows[1]?.game_id).toBe("second");
  });

  it("refuses a zero price and writes nothing", async () => {
    const utc = "2026-03-05T12:00:00.000Z";
    await record(row({ game_id: "kept" }));
    expect(lines(utc)).toHaveLength(1);

    await expect(record(row({ game_id: "rejected", decision_time_price: 0 }))).rejects.toThrow(
      /decision_time_price/,
    );

    expect(lines(utc)).toHaveLength(1);
    expect(parsed(utc)[0]?.game_id).toBe("kept");
  });

  it("refuses a NaN price", async () => {
    await expect(
      record(row({ decision_time_price: Number.NaN })),
    ).rejects.toThrow(/decision_time_price/);
  });

  it("refuses an infinite price", async () => {
    await expect(
      record(row({ decision_time_price: Number.POSITIVE_INFINITY })),
    ).rejects.toThrow(/decision_time_price/);
  });

  it("refuses American prices with absolute value below 100 or above 10000", async () => {
    for (const price of [-33, -43, -86, 0.5, 99]) {
      await expect(record(row({ decision_time_price: price }))).rejects.toThrow(
        /decision_time_price/,
      );
    }
    for (const price of [-10533, 10533, -20000]) {
      await expect(record(row({ decision_time_price: price }))).rejects.toThrow(
        /decision_time_price/,
      );
    }
    for (const price of [-110, -10000, 100, -100, 10000]) {
      await expect(record(row({ decision_time_price: price }))).resolves.toMatchObject({ ok: true });
    }
  });

  it("accepts a negative but valid price like -110", async () => {
    const utc = "2026-03-05T12:00:00.000Z";
    const res = await record(row({ decision_time_price: -110 }));
    expect(res.ok).toBe(true);
    expect(parsed(utc)[0]?.decision_time_price).toBe(-110);
  });

  it("refuses a probability of exactly 0 or exactly 1 and accepts 0.5", async () => {
    await expect(record(row({ model_probability: 0, devigged_market_prob: 0.5, edge: -0.5 }))).rejects.toThrow(
      /model_probability/,
    );
    await expect(record(row({ model_probability: 1, devigged_market_prob: 0.5, edge: 0.5 }))).rejects.toThrow(
      /model_probability/,
    );
    await expect(record(row({ devigged_market_prob: 0, model_probability: 0.5, edge: 0.5 }))).rejects.toThrow(
      /devigged_market_prob/,
    );
    await expect(record(row({ devigged_market_prob: 1, model_probability: 0.5, edge: -0.5 }))).rejects.toThrow(
      /devigged_market_prob/,
    );

    const utc = "2026-03-05T12:00:00.000Z";
    await expect(
      record(row({ model_probability: 0.5, devigged_market_prob: 0.5, edge: 0 })),
    ).resolves.toMatchObject({ ok: true });
    expect(parsed(utc)).toHaveLength(1);
  });

  it("refuses an edge that is not model_probability minus devigged_market_prob", async () => {
    const utc = "2026-03-05T12:00:00.000Z";
    await expect(
      record(row({ model_probability: 0.58, devigged_market_prob: 0.5, edge: 0.08 })),
    ).resolves.toMatchObject({ ok: true });
    // +0.08 is the right number at 2dp and still refused: the archive stores
    // the edge the caller computed, not one the recorder repaired.
    await expect(
      record(row({ model_probability: 0.58, devigged_market_prob: 0.5, edge: 0.080001 })),
    ).rejects.toThrow(/edge/);

    expect(lines(utc)).toHaveLength(1);
    expect(parsed(utc)[0]?.edge).toBe(0.08);
  });

  it("tolerates float noise in the edge but refuses anything past 1e-9", async () => {
    // 0.58 - 0.5 is 0.08000000000000007 in IEEE-754, not 0.08. Rounding that
    // away is a tolerance, not a rewrite — the stored value is still the
    // caller's.
    const exact = 0.58 - 0.5;
    await expect(
      record(row({ model_probability: 0.58, devigged_market_prob: 0.5, edge: exact + 9e-10 })),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      record(row({ model_probability: 0.58, devigged_market_prob: 0.5, edge: exact + 1.1e-9 })),
    ).rejects.toThrow(/edge/);
  });

  it("refuses a non-finite edge", async () => {
    await expect(record(row({ edge: Number.NaN }))).rejects.toThrow(/edge/);
  });

  it("refuses an uppercase or short covariates_hash", async () => {
    await expect(record(row({ covariates_hash: "A".repeat(64) }))).rejects.toThrow(/covariates_hash/);
    await expect(record(row({ covariates_hash: HASH_A.slice(0, 63) }))).rejects.toThrow(/covariates_hash/);
    await expect(record(row({ covariates_hash: `${HASH_A}0` }))).rejects.toThrow(/covariates_hash/);
    await expect(record(row({ covariates_hash: "g".repeat(64) }))).rejects.toThrow(/covariates_hash/);
  });

  it("refuses blank identity fields and a model_source that is blank", async () => {
    await expect(record(row({ game_id: "   " }))).rejects.toThrow(/game_id/);
    await expect(record(row({ market_id: "" }))).rejects.toThrow(/market_id/);
    await expect(record(row({ side: "  " }))).rejects.toThrow(/side/);
    await expect(record(row({ model_source: "" }))).rejects.toThrow(/model_source/);
  });

  it("accepts any side label the caller was given", async () => {
    const utc = "2026-03-05T12:00:00.000Z";
    for (const side of ["over", "under", "home", "away", "whatever-was-given"]) {
      await expect(record(row({ side }))).resolves.toMatchObject({ ok: true });
    }
    expect(parsed(utc).map((r) => r.side)).toEqual([
      "over",
      "under",
      "home",
      "away",
      "whatever-was-given",
    ]);
  });

  it("refuses a decision_time_utc that is not a real ISO-8601 instant", async () => {
    for (const bad of ["not-a-date", "2026-13-45T00:00:00.000Z", "March 5, 2026", "2026"]) {
      await expect(record(row({ decision_time_utc: bad }))).rejects.toThrow(/decision_time_utc/);
    }
  });

  it("files a row under the UTC date even when the instant crosses a UTC day boundary", async () => {
    const late = "2026-03-05T23:59:59.999Z";
    const early = "2026-03-06T00:00:00.000Z";

    const lateRes = await record(row({ decision_time_utc: late, game_id: "late" }));
    const earlyRes = await record(row({ decision_time_utc: early, game_id: "early" }));

    expect(decisionTimePriceDay(late)).toBe("2026-03-05");
    expect(decisionTimePriceDay(early)).toBe("2026-03-06");
    expect(decisionTimePriceFileName(late)).toBe("2026-03-05.jsonl");
    expect(decisionTimePriceFileName(early)).toBe("2026-03-06.jsonl");

    // Two different files, one line each — a day boundary is a real split, and
    // the local date is never allowed to decide it.
    expect(lateRes.path).toBe(join(dir, "2026-03-05.jsonl"));
    expect(earlyRes.path).toBe(join(dir, "2026-03-06.jsonl"));
    expect(parsed(late)).toHaveLength(1);
    expect(parsed(early)).toHaveLength(1);
    expect(parsed(late)[0]?.game_id).toBe("late");
    expect(parsed(early)[0]?.game_id).toBe("early");
  });

  it("creates the archive directory when it does not exist yet", async () => {
    const nested = join(dir, "does", "not", "exist");
    expect(existsSync(nested)).toBe(false);
    const res = await recordDecisionTimePrice(row(), { baseDir: nested });
    expect(res.ok).toBe(true);
    expect(existsSync(nested)).toBe(true);
  });

  it("a refused row does not create the file at all", async () => {
    await expect(record(row({ covariates_hash: "nope" }))).rejects.toThrow(/covariates_hash/);
    expect(existsSync(pathFor("2026-03-05T12:00:00.000Z"))).toBe(false);
    // The directory may exist, but a refused row leaves it empty: no stray
    // day file, no half-written line.
    expect(existsSync(dir) ? readdirSync(dir) : []).toEqual([]);
  });
});

describe("recordPricedPropEvaluation", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "decision-time-price-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const context = {
    game_id: "2026_03_LAC_BUF",
    market_id: "2026_03_LAC_BUF::rec_yds_over_52.5",
    side: "over",
    decision_time_price: -110,
    decision_time_utc: "2026-03-05T12:00:00.000Z",
  };

  function lines(): string[] {
    const path = join(dir, "2026-03-05.jsonl");
    if (!existsSync(path)) return [];
    return readFileSync(path, "utf8").split("\n").filter((l) => l !== "");
  }

  it("archives a successful pure result and leaves priced false", async () => {
    const priced = pricePropAgainstMarket(0.58, { overAmerican: -110, underAmerican: -110 });
    expect(priced.ok).toBe(true);
    if (!priced.ok) throw new Error("expected priced");
    // The pure module never flips this, and neither does the recorder.
    expect(priced.priced).toBe(false);

    const res = await recordPricedPropEvaluation(priced, context, HASH_A, { baseDir: dir });
    expect(res.ok).toBe(true);

    const stored = JSON.parse(lines()[0] ?? "{}") as Record<string, unknown>;
    expect(stored["game_id"]).toBe("2026_03_LAC_BUF");
    expect(stored["side"]).toBe("over");
    expect(stored["decision_time_price"]).toBe(-110);
    expect(stored["model_probability"]).toBe(0.58);
    expect(stored["devigged_market_prob"]).toBeCloseTo(0.5, 8);
    expect(stored["edge"]).toBeCloseTo(0.08, 8);
    expect(stored["model_source"]).toBe(PROPS_HB_SOURCE);
    expect(stored["covariates_hash"]).toBe(HASH_A);
  });

  it("refuses an unpriced result rather than inventing a row", async () => {
    const unpriced = pricePropAgainstMarket(0.58, null);
    expect(unpriced.ok).toBe(false);

    await expect(
      recordPricedPropEvaluation(unpriced, context, HASH_A, { baseDir: dir }),
    ).rejects.toThrow(/unpriced/);
    expect(lines()).toEqual([]);
  });

  it("still refuses when the pure result is valid but the covariates hash is not", async () => {
    const priced = pricePropAgainstMarket(0.58, { overAmerican: -110, underAmerican: -110 });
    if (!priced.ok) throw new Error("expected priced");

    await expect(
      recordPricedPropEvaluation(priced, context, "A".repeat(64), { baseDir: dir }),
    ).rejects.toThrow(/covariates_hash/);
    expect(lines()).toEqual([]);
  });
});
