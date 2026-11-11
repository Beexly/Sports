import { describe, expect, it } from "vitest";
import { LAYER_2_UNSUPPORTED_CLAIMS } from "@/lib/compliance-scanner/rules";

const guaranteeRule = LAYER_2_UNSUPPORTED_CLAIMS.find((rule) => rule.id === "L2-GUARANTEE");

function hits(text: string): boolean {
  if (!guaranteeRule) throw new Error("L2-GUARANTEE rule missing");
  return guaranteeRule.pattern.test(text);
}

describe("L2-GUARANTEE contractual allowance (2026-11-11)", () => {
  it("permits the contractual pack name", () => {
    expect(hits("Guaranteed Pick")).toBe(false);
    expect(hits("Guaranteed Picks are sold per game.")).toBe(false);
    expect(hits("Every Guaranteed Game Pack carries the same remedy.")).toBe(false);
  });

  it("permits the store-credit remedy name", () => {
    expect(hits("100% Store Credit Guarantee")).toBe(false);
    expect(hits("store credit guarantee applies automatically")).toBe(false);
    expect(hits("store-credit guarantee applies automatically")).toBe(false);
  });

  it("still blocks outcome certainty", () => {
    expect(hits("guaranteed winner")).toBe(true);
    expect(hits("guaranteed profit")).toBe(true);
    expect(hits("guaranteed to hit")).toBe(true);
    expect(hits("Guaranteed Game Pack is a guaranteed winner")).toBe(true);
    expect(hits("a sure thing")).toBe(true);
    expect(hits("you cannot lose")).toBe(true);
    expect(hits("must profit")).toBe(true);
  });
});
