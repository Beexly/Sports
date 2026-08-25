import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { devig, type DevigMethod } from "../devig/oracle.js";

const ATOL = 1e-9;

type GoldenMethod = {
  probabilities: number[];
  k?: number;
  z?: number;
  c?: number;
};

type GoldenMarket = {
  id: string;
  decimalOdds: number[];
  margin: number;
  methods: Record<string, GoldenMethod>;
};

type GoldenFile = {
  markets: GoldenMarket[];
};

const golden = JSON.parse(
  readFileSync(join(__dirname, "fixtures", "devig.golden.json"), "utf8"),
) as GoldenFile;

function sum(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

describe("devig oracle golden fixtures (penaltyblog 1.12.0)", () => {
  for (const market of golden.markets) {
    describe(`market ${market.id} ${JSON.stringify(market.decimalOdds)}`, () => {
      it("records the raw overround exactly", () => {
        const expected = sum(market.decimalOdds.map((o) => 1 / o)) - 1;
        expect(Math.abs(market.margin - expected)).toBeLessThan(ATOL);
      });

      for (const [method, fixture] of Object.entries(market.methods)) {
        it(`${method} matches golden at atol 1e-9`, () => {
          const result = devig(market.decimalOdds, method as DevigMethod);
          expect(result.method).toBe(method);
          expect(Math.abs(result.margin - market.margin)).toBeLessThan(ATOL);
          expect(result.probabilities).toHaveLength(fixture.probabilities.length);
          for (let i = 0; i < fixture.probabilities.length; i++) {
            expect(Math.abs((result.probabilities[i] ?? 0) - (fixture.probabilities[i] ?? 0))).toBeLessThan(ATOL);
          }
          expect(Math.abs(sum(result.probabilities) - 1)).toBeLessThan(ATOL);
          if (typeof fixture.k === "number") {
            expect(Math.abs((result.methodParams?.k ?? NaN) - fixture.k)).toBeLessThan(ATOL);
          }
          if (typeof fixture.z === "number") {
            expect(Math.abs((result.methodParams?.z ?? NaN) - fixture.z)).toBeLessThan(ATOL);
          }
          if (typeof fixture.c === "number") {
            expect(Math.abs((result.methodParams?.c ?? NaN) - fixture.c)).toBeLessThan(ATOL);
          }
        });
      }
    });
  }

  it("falls back to multiplicative when shin has no bracket (zero-margin 2-way)", () => {
    const result = devig([2, 2], "shin");
    expect(result.probabilities[0]).toBeCloseTo(0.5, 12);
    expect(result.probabilities[1]).toBeCloseTo(0.5, 12);
    expect(Math.abs(result.margin)).toBeLessThan(ATOL);
  });

  it("refuses non-positive odds", () => {
    expect(() => devig([2.0, 0], "multiplicative")).toThrow(/finite decimal odds/);
  });
});
