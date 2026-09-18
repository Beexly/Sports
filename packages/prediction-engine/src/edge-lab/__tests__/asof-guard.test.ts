import { describe, expect, it } from "vitest";
import {
  assertObservedAtOrBefore,
  ObservedAfterDecisionError,
  SourceCannotSpeakAsOfError,
} from "../asof-guard";

describe("assertObservedAtOrBefore", () => {
  const decision = new Date("2026-09-18T00:00:00.000Z");

  it("throws rather than returning a number when observedAt is after decisionAt", () => {
    expect(() =>
      assertObservedAtOrBefore({
        source: "nfl_epa",
        decisionAt: decision,
        observedAt: new Date("2026-09-19T00:00:00.000Z"),
      }),
    ).toThrow(ObservedAfterDecisionError);
  });

  it("throws for season-only sources with no observation time (mlb standings, nfl epa)", () => {
    expect(() =>
      assertObservedAtOrBefore({
        source: "mlb_standings",
        decisionAt: decision,
        observedAt: null,
      }),
    ).toThrow(SourceCannotSpeakAsOfError);
  });

  it("allows a clean as-of observation", () => {
    expect(() =>
      assertObservedAtOrBefore({
        source: "dated_source",
        decisionAt: decision,
        observedAt: new Date("2026-09-17T23:59:59.000Z"),
      }),
    ).not.toThrow();
  });

  it("rejects an unreadable observedAt instead of passing NaN > NaN", () => {
    expect(() =>
      assertObservedAtOrBefore({
        source: "dated_source",
        decisionAt: decision,
        observedAt: new Date("not-a-date"),
      }),
    ).toThrow(SourceCannotSpeakAsOfError);
  });

  it("rejects an unreadable decisionAt instead of passing NaN > NaN", () => {
    expect(() =>
      assertObservedAtOrBefore({
        source: "dated_source",
        decisionAt: new Date("not-a-date"),
        observedAt: new Date("2026-09-17T00:00:00.000Z"),
      }),
    ).toThrow(SourceCannotSpeakAsOfError);
  });
});
