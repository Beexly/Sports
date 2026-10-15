/**
 * Characterization tests — G-25 Numeric Guard (gate-sweep batch 1,
 * 2026-10-15). First test file for this module. Pins the fail-closed,
 * kind-matched grounding behavior documented in the module header —
 * including the header's own fabrication examples (a probability may not
 * be spent as a hit rate; a version string grounds nothing).
 * Registry: intelligence/gate-wiring/shadow-registry.json (weight 0).
 */
import { describe, expect, it } from "vitest";
import {
  extractGroundedValues,
  extractNumericClaims,
  kindsAreCompatible,
  validateNumericClaims,
} from "./numeric-guard";

describe("kindsAreCompatible — same-kind rule with the record/count pairing", () => {
  it("allows same-kind satisfaction", () => {
    expect(kindsAreCompatible("probability", "probability")).toBe(true);
    expect(kindsAreCompatible("money", "money")).toBe(true);
  });

  it("allows a record claim to be satisfied by caller-supplied counts", () => {
    expect(kindsAreCompatible("record", "count")).toBe(true);
    expect(kindsAreCompatible("count", "record")).toBe(true);
  });

  it("never lets one percent role satisfy another", () => {
    expect(kindsAreCompatible("rate", "probability")).toBe(false);
    expect(kindsAreCompatible("probability", "rate")).toBe(false);
    expect(kindsAreCompatible("share", "probability")).toBe(false);
  });

  it("percent_unknown, version and date satisfy nothing", () => {
    expect(kindsAreCompatible("percent_unknown", "probability")).toBe(false);
    expect(kindsAreCompatible("version", "magnitude")).toBe(false);
    expect(kindsAreCompatible("date", "magnitude")).toBe(false);
  });
});

describe("version and date spans ground nothing", () => {
  it("extractGroundedValues excludes digits from a version string", () => {
    expect(extractGroundedValues("model v6.1.0")).toEqual([]);
  });

  it("tags version digits as kind=version in claims", () => {
    const claims = extractNumericClaims("model v6.1.0");
    expect(claims.length).toBeGreaterThan(0);
    expect(claims.every((c) => c.kind === "version")).toBe(true);
  });

  it("an unlabelled percent in grounding text grounds nothing", () => {
    expect(extractGroundedValues("64%")).toEqual([]);
  });
});

describe("validateNumericClaims — kind-matched grounding", () => {
  it("grounds a probability claim from identically labelled grounding text", () => {
    const r = validateNumericClaims("market fair probability 54.3%", {
      text: "market fair probability 54.3%",
    });
    expect(r.grounded).toBe(true);
    expect(r.claimCount).toBe(1);
  });

  it("refuses to spend a true probability as a historical hit rate (header example)", () => {
    const r = validateNumericClaims("covered in 61.2% of similar spots", {
      text: "independent-edge true probability 61.2%",
    });
    expect(r.grounded).toBe(false);
    expect(r.ungrounded).toHaveLength(1);
    expect(r.ungrounded[0]?.value).toBe(61.2);
  });

  it("grounds a W-L record from caller-supplied count values", () => {
    const r = validateNumericClaims("they went 12-4", {
      values: [
        { value: 12, kind: "count" },
        { value: 4, kind: "count" },
      ],
    });
    expect(r.grounded).toBe(true);
    expect(r.claimCount).toBe(2);
  });

  it("leaves the same record ungrounded with no supplied values", () => {
    const r = validateNumericClaims("they went 12-4", {});
    expect(r.grounded).toBe(false);
    expect(r.claimCount).toBe(2);
  });

  it("matches money only as money", () => {
    const ok = validateNumericClaims("priced at $19.99", {
      values: [{ value: 19.99, kind: "money" }],
    });
    expect(ok.grounded).toBe(true);
    const wrongKind = validateNumericClaims("priced at $19.99", {
      values: [{ value: 19.99, kind: "magnitude" }],
    });
    expect(wrongKind.grounded).toBe(false);
  });

  it("applies the default 0.1 absolute tolerance", () => {
    const r = validateNumericClaims("fair probability 54.3%", {
      values: [{ value: 54.34, kind: "probability" }],
    });
    expect(r.grounded).toBe(true);
  });

  it("DEFECT PIN (fail-closed artifact, not fixed): a two-decimal percent also spawns a phantom magnitude claim for its truncated prefix", () => {
    // extractNumericClaims("fair probability 54.34%") returns TWO claims:
    // { 54.34, probability } from PERCENT_RE and { 54.3, magnitude } from
    // DECIMAL_RE matching the "54.3" prefix (its (?!%) lookahead only
    // excludes a percent sign immediately after the matched digits).
    // Validation therefore demands magnitude grounding for a number that
    // appears in the copy only as part of the percent. Direction is safe
    // (stricter, never looser) but it makes two-decimal percents
    // effectively unvalidatable. Recorded in the shadow registry.
    const claims = extractNumericClaims("fair probability 54.34%");
    expect(claims).toHaveLength(2);
    expect(claims[0]).toMatchObject({ value: 54.34, kind: "probability" });
    expect(claims[1]).toMatchObject({ value: 54.3, kind: "magnitude" });
    const r = validateNumericClaims("fair probability 54.34%", {
      values: [{ value: 54.34, kind: "probability" }],
    });
    expect(r.grounded).toBe(false);
    expect(r.ungrounded).toHaveLength(1);
    expect(r.ungrounded[0]?.kind).toBe("magnitude");
  });
});
