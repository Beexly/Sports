/**
 * `hintTier` — heuristic-only EU AI Act use-case tier hint. `needsCounsel`
 * must be `true` on EVERY branch: this is deliberately never a substitute
 * for legal review. See apps/web/lib/governance/use-case-classifier.ts.
 */
import { describe, it, expect } from "vitest";
import { hintTier } from "@/lib/governance/use-case-classifier";

describe("hintTier", () => {
  it("biometrics -> high", () => {
    const result = hintTier({ biometrics: true });
    expect(result.tier).toBe("high");
    expect(result.needsCounsel).toBe(true);
  });

  it("employment -> high", () => {
    const result = hintTier({ employment: true });
    expect(result.tier).toBe("high");
    expect(result.needsCounsel).toBe(true);
  });

  it("credit -> high", () => {
    const result = hintTier({ credit: true });
    expect(result.tier).toBe("high");
    expect(result.needsCounsel).toBe(true);
  });

  it("chatbotDisclosure only -> limited", () => {
    const result = hintTier({ chatbotDisclosure: true });
    expect(result.tier).toBe("limited");
    expect(result.needsCounsel).toBe(true);
    expect(result.notes).toContain("transparency obligations may apply");
  });

  it("consumerPicks only -> minimal", () => {
    const result = hintTier({ consumerPicks: true });
    expect(result.tier).toBe("minimal");
    expect(result.needsCounsel).toBe(true);
  });

  it("none set -> unknown", () => {
    const result = hintTier({});
    expect(result.tier).toBe("unknown");
    expect(result.needsCounsel).toBe(true);
  });

  it("needsCounsel is true across every branch (regression guard)", () => {
    const cases: Array<Parameters<typeof hintTier>[0]> = [
      { biometrics: true },
      { employment: true },
      { credit: true },
      { chatbotDisclosure: true },
      { consumerPicks: true },
      {},
    ];
    for (const useCase of cases) {
      expect(hintTier(useCase).needsCounsel).toBe(true);
    }
  });
});
