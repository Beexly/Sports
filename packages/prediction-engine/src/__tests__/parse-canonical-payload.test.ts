import { describe, it, expect } from "vitest";
import { canonicalPickPayload, parseCanonicalPayload } from "../proof-of-record.js";

/**
 * The verifier displays committed fields from the PARSED payload (the bytes
 * the hash covers), not from sibling DB columns. That only works if parse is
 * the exact inverse of the canonical serialization — these tests pin it.
 */
describe("parseCanonicalPayload", () => {
  it("round-trips the canonical payload back to its fields (as strings)", () => {
    const fields = {
      pickId: "p1",
      selection: "HOME",
      pickType: "SPREAD",
      line: -3.5,
      entryOdds: -110,
      confidence: 72,
      modelProb: "none",
      asOf: "2026-07-02T10:00:00.000Z",
    };
    const payload = canonicalPickPayload(fields);
    const parsed = parseCanonicalPayload(payload);
    expect(parsed["selection"]).toBe("HOME");
    expect(parsed["line"]).toBe("-3.5");
    expect(parsed["entryOdds"]).toBe("-110");
    expect(parsed["confidence"]).toBe("72");
    expect(parsed["modelProb"]).toBe("none");
    expect(parsed["asOf"]).toBe("2026-07-02T10:00:00.000Z");
  });

  it("preserves values containing '=' by splitting only on the first one", () => {
    const parsed = parseCanonicalPayload("k=a=b|other=1");
    expect(parsed["k"]).toBe("a=b");
    expect(parsed["other"]).toBe("1");
  });

  it("ignores empty segments without crashing", () => {
    expect(parseCanonicalPayload("")).toEqual({});
    expect(parseCanonicalPayload("a=1||b=2")).toEqual({ a: "1", b: "2" });
  });
});
