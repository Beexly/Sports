import { describe, it, expect } from "vitest";
import { parseCandle, parseCandles, summarizeCandles } from "./kalshi";

const payload = {
  ticker: "KXNFL-26-COMP",
  candles: [
    { t: 1, o: 0.4, h: 0.45, l: 0.38, c: 0.42, v: 100 },
    { t: 2, o: 0.42, h: 0.5, l: 0.41, c: 0.48, v: 150 },
    "garbage-row",
    { t: 3, o: 0.48, h: 0.49, l: 0.44, c: 0.46 },
  ],
};

describe("kalshi candles (Wave4 #10)", () => {
  it("parses valid rows and skips malformed ones", () => {
    const data = parseCandles(payload);
    expect(data?.ticker).toBe("KXNFL-26-COMP");
    expect(data?.candles).toHaveLength(3);
    expect(parseCandle("nope")).toBeNull();
    expect(parseCandle({ t: 1, o: 0.5 })).toBeNull();
  });

  it("rejects payloads without a ticker", () => {
    expect(parseCandles({ candles: [] })).toBeNull();
  });

  it("summarizes drift and range for calibration evidence", () => {
    const data = parseCandles(payload)!;
    const s = summarizeCandles(data)!;
    expect(s.n).toBe(3);
    expect(s.first).toBe(0.42);
    expect(s.last).toBe(0.46);
    expect(s.drift).toBeCloseTo(0.04, 4);
    expect(s.high).toBe(0.5);
    expect(s.low).toBe(0.38);
    expect(summarizeCandles({ ticker: "X", candles: [] })).toBeNull();
  });
});
