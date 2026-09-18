import { describe, expect, it } from "vitest";
import { EVIDENCE_FACTOR_DEFINITIONS } from "../evidence-readiness-matrix";
import { EVIDENCE_FACTOR_KEYS } from "../evidence-readiness-loader";

describe("evidence readiness loader enumerates the matrix", () => {
  it("has 13 factor keys from EVIDENCE_FACTOR_DEFINITIONS", () => {
    expect(EVIDENCE_FACTOR_DEFINITIONS).toHaveLength(13);
    expect(EVIDENCE_FACTOR_KEYS).toHaveLength(13);
    expect([...EVIDENCE_FACTOR_KEYS]).toEqual(
      EVIDENCE_FACTOR_DEFINITIONS.map((d) => d.key),
    );
  });
});
