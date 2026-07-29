import { describe, expect, it } from "vitest";
import {
  parseAsOfMs,
  validateQueryAsOf,
  validateFeatureWrite,
  validatePitQuery,
  isAsOfOnOrBefore,
  detectFutureLeak,
  selectLatestAsOf,
  assertNoLeak,
  pitFailHttpStatus,
  DEFAULT_FUTURE_SKEW_MS,
} from "../pit-validate.js";
import { InMemoryFeatureStore } from "../store.js";
import { asEntityId, asFeatureId } from "../types.js";

const FIXED_NOW = Date.parse("2025-11-15T12:00:00.000Z");
const clock = { nowMs: () => FIXED_NOW };

describe("parseAsOfMs", () => {
  it("accepts ISO with Z", () => {
    const r = parseAsOfMs("2025-11-01T18:00:00.000Z");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.asOfIso).toBe("2025-11-01T18:00:00.000Z");
  });
  it("rejects empty", () => {
    expect(parseAsOfMs("").ok).toBe(false);
    expect(parseAsOfMs(null).ok).toBe(false);
  });
  it("rejects date-only", () => {
    const r = parseAsOfMs("2025-11-01");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("asof_invalid");
  });
  it("rejects garbage", () => {
    const r = parseAsOfMs("not-a-date");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("asof_invalid");
  });
});

describe("validateQueryAsOf future skew", () => {
  it("allows asOf at now", () => {
    const r = validateQueryAsOf("2025-11-15T12:00:00.000Z", { clock });
    expect(r.ok).toBe(true);
  });
  it("allows within skew", () => {
    const r = validateQueryAsOf(
      new Date(FIXED_NOW + DEFAULT_FUTURE_SKEW_MS - 1000).toISOString(),
      { clock },
    );
    expect(r.ok).toBe(true);
  });
  it("refuses far future", () => {
    const r = validateQueryAsOf("2025-12-01T00:00:00.000Z", { clock });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("asof_future");
  });
  it("allowFuture bypass", () => {
    const r = validateQueryAsOf("2030-01-01T00:00:00.000Z", {
      clock,
      allowFuture: true,
    });
    expect(r.ok).toBe(true);
  });
});

describe("selectLatestAsOf / leak", () => {
  const rows = [
    { asOf: "2025-11-01T12:00:00.000Z", v: 1 },
    { asOf: "2025-11-08T12:00:00.000Z", v: 2 },
    { asOf: "2025-11-15T12:00:00.000Z", v: 3 },
  ];
  it("picks latest on or before", () => {
    const r = selectLatestAsOf(rows, "2025-11-10T00:00:00.000Z");
    expect(r?.v).toBe(2);
  });
  it("equality closed", () => {
    const r = selectLatestAsOf(rows, "2025-11-08T12:00:00.000Z");
    expect(r?.v).toBe(2);
  });
  it("never returns future row", () => {
    const r = selectLatestAsOf(rows, "2025-11-01T12:00:00.000Z");
    expect(r?.v).toBe(1);
  });
  it("detectFutureLeak finds offenders", () => {
    const d = detectFutureLeak({
      queryAsOf: "2025-11-05T00:00:00.000Z",
      records: rows,
    });
    expect(d.leak).toBe(true);
    expect(d.offenders.length).toBe(2);
  });
  it("isAsOfOnOrBefore", () => {
    expect(isAsOfOnOrBefore("2025-11-01T00:00:00.000Z", "2025-11-02T00:00:00.000Z")).toBe(
      true,
    );
    expect(isAsOfOnOrBefore("2025-11-03T00:00:00.000Z", "2025-11-02T00:00:00.000Z")).toBe(
      false,
    );
  });
  it("assertNoLeak", () => {
    expect(assertNoLeak("2025-11-01T00:00:00.000Z", "2025-11-02T00:00:00.000Z").ok).toBe(
      true,
    );
    expect(assertNoLeak("2025-11-03T00:00:00.000Z", "2025-11-02T00:00:00.000Z").ok).toBe(
      false,
    );
  });
});

describe("validateFeatureWrite", () => {
  it("requires pitCorrect true", () => {
    const r = validateFeatureWrite(
      {
        featureId: "f1",
        entityId: "e1",
        asOf: "2025-11-01T00:00:00.000Z",
        pitCorrect: false,
        publicApiEligible: false,
      },
      { clock },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("pit_flag_false");
  });
  it("blocks rights_hold public", () => {
    const r = validateFeatureWrite(
      {
        featureId: "f1",
        entityId: "e1",
        asOf: "2025-11-01T00:00:00.000Z",
        pitCorrect: true,
        publicApiEligible: true,
        sourceRights: "rights_hold",
      },
      { clock },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("rights_public_conflict");
  });
  it("admits good write", () => {
    const r = validateFeatureWrite(
      {
        featureId: "f1",
        entityId: "e1",
        asOf: "2025-11-01T18:00:00.000Z",
        pitCorrect: true,
        publicApiEligible: false,
        sourceRights: "free_legal",
      },
      { clock },
    );
    expect(r.ok).toBe(true);
  });
});

describe("InMemoryFeatureStore uses PIT validation", () => {
  it("put normalizes asOf and getAsOf refuses future leak", () => {
    const store = new InMemoryFeatureStore({ clock });
    store.put({
      featureId: asFeatureId("feat_epa"),
      entityId: asEntityId("team_x"),
      asOf: "2025-11-01T12:00:00.000Z",
      value: 0.1,
      sourceRights: "free_legal",
      pitCorrect: true,
      publicApiEligible: true,
    });
    store.put({
      featureId: asFeatureId("feat_epa"),
      entityId: asEntityId("team_x"),
      asOf: "2025-11-10T12:00:00.000Z",
      value: 0.2,
      sourceRights: "free_legal",
      pitCorrect: true,
      publicApiEligible: true,
    });
    const mid = store.getAsOf({
      featureId: asFeatureId("feat_epa"),
      entityId: asEntityId("team_x"),
      asOf: "2025-11-05T00:00:00.000Z",
    });
    expect(mid?.value).toBe(0.1);
  });
  it("put refuses pitCorrect false", () => {
    const store = new InMemoryFeatureStore({ clock });
    expect(() =>
      store.put({
        featureId: asFeatureId("f"),
        entityId: asEntityId("e"),
        asOf: "2025-11-01T00:00:00.000Z",
        value: 1,
        sourceRights: "free_legal",
        pitCorrect: false,
        publicApiEligible: false,
      }),
    ).toThrow(/pit_flag_false/);
  });
});

describe("pitFailHttpStatus", () => {
  it("maps codes", () => {
    expect(pitFailHttpStatus("asof_missing")).toBe(400);
    expect(pitFailHttpStatus("asof_future")).toBe(422);
    expect(pitFailHttpStatus("future_leak")).toBe(403);
  });
});

describe("validatePitQuery", () => {
  it("requires ids", () => {
    const r = validatePitQuery({ asOf: "2025-11-01T00:00:00.000Z" }, { clock });
    expect(r.ok).toBe(false);
  });
});
