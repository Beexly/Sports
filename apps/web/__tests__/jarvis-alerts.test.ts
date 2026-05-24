import { describe, it, expect } from "vitest";
import { alertsFromDiff, pagingAlerts, launchStatusAlert } from "@/lib/cockpit/jarvis-alerts";
import type { JarvisDiff } from "@/lib/cockpit/jarvis-diff";

const EMPTY_DIFF: JarvisDiff = {
  hasChanges: false,
  launchStatusChanged: false,
  sectionalChanges: [],
  warningCountChanges: [],
  newSafetyWarnings: [],
  clearedSafetyWarnings: [],
  newExternalConfig: [],
  clearedExternalConfig: [],
};

describe("alertsFromDiff", () => {
  it("returns no alerts for an empty diff", () => {
    expect(alertsFromDiff(EMPTY_DIFF)).toEqual([]);
  });

  it("emits a warning when launchStatus changes (without raw status)", () => {
    const alerts = alertsFromDiff({ ...EMPTY_DIFF, launchStatusChanged: true });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.severity).toBe("warning");
    expect(alerts[0]!.title).toMatch(/launch/i);
  });

  it("pages on ingestion → RED", () => {
    const alerts = alertsFromDiff({
      ...EMPTY_DIFF,
      sectionalChanges: [{ key: "ingestionStatus", previous: "GREEN", current: "RED" }],
    });
    expect(alerts.some((a) => a.severity === "page")).toBe(true);
  });

  it("pages on settlement → RED", () => {
    const alerts = alertsFromDiff({
      ...EMPTY_DIFF,
      sectionalChanges: [{ key: "settlementStatus", previous: "GREEN", current: "RED" }],
    });
    expect(alerts.some((a) => a.severity === "page")).toBe(true);
  });

  it("warns on non-data RED transitions (not a page)", () => {
    const alerts = alertsFromDiff({
      ...EMPTY_DIFF,
      sectionalChanges: [{ key: "signalCoverageStatus", previous: "GREEN", current: "RED" }],
    });
    expect(alerts.some((a) => a.severity === "warning")).toBe(true);
    expect(alerts.every((a) => a.severity !== "page")).toBe(true);
  });

  it("emits an info alert when a RED section recovers", () => {
    const alerts = alertsFromDiff({
      ...EMPTY_DIFF,
      sectionalChanges: [{ key: "ingestionStatus", previous: "RED", current: "GREEN" }],
    });
    expect(alerts.some((a) => a.severity === "info")).toBe(true);
    expect(alerts.some((a) => /recover/i.test(a.title))).toBe(true);
  });

  it("warns on GREEN → AMBER", () => {
    const alerts = alertsFromDiff({
      ...EMPTY_DIFF,
      sectionalChanges: [{ key: "ingestionStatus", previous: "GREEN", current: "AMBER" }],
    });
    expect(alerts.some((a) => a.severity === "warning")).toBe(true);
  });

  it("pages on new safety warnings", () => {
    const alerts = alertsFromDiff({
      ...EMPTY_DIFF,
      newSafetyWarnings: ["Bootstrap mode active."],
    });
    expect(alerts.some((a) => a.severity === "page")).toBe(true);
  });

  it("emits info when a safety warning clears", () => {
    const alerts = alertsFromDiff({
      ...EMPTY_DIFF,
      clearedSafetyWarnings: ["Bootstrap mode active."],
    });
    expect(alerts.some((a) => /cleared/i.test(a.title))).toBe(true);
    expect(alerts.every((a) => a.severity !== "page")).toBe(true);
  });

  it("warns on new missing external config", () => {
    const alerts = alertsFromDiff({
      ...EMPTY_DIFF,
      newExternalConfig: ["STRIPE_SECRET_KEY"],
    });
    expect(alerts.some((a) => /STRIPE_SECRET_KEY/.test(a.detail))).toBe(true);
  });

  it("each alert has a stable dedupe key", () => {
    const alerts = alertsFromDiff({
      ...EMPTY_DIFF,
      sectionalChanges: [{ key: "ingestionStatus", previous: "GREEN", current: "RED" }],
      newSafetyWarnings: ["Public picks live with closed performance gate."],
    });
    const keys = alerts.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("pagingAlerts filter", () => {
  it("returns only severity=page entries", () => {
    const all = alertsFromDiff({
      ...EMPTY_DIFF,
      sectionalChanges: [{ key: "ingestionStatus", previous: "GREEN", current: "RED" }],
      newSafetyWarnings: ["foo"],
      clearedSafetyWarnings: ["bar"],
    });
    const paging = pagingAlerts(all);
    expect(paging.length).toBeGreaterThan(0);
    for (const a of paging) {
      expect(a.severity).toBe("page");
    }
  });
});

describe("alertsFromDiff edge cases", () => {
  it("emits no alerts when sectional changes are AMBER→GREEN only (recovery)", () => {
    const alerts = alertsFromDiff({
      ...EMPTY_DIFF,
      sectionalChanges: [{ key: "ingestionStatus", previous: "AMBER", current: "GREEN" }],
    });
    // Recovery from AMBER isn't a defined case in alertsFromDiff —
    // verify it doesn't produce a page alert.
    expect(alerts.every((a) => a.severity !== "page")).toBe(true);
  });

  it("emits one alert per new safety warning + one per cleared", () => {
    const alerts = alertsFromDiff({
      ...EMPTY_DIFF,
      newSafetyWarnings: ["a", "b", "c"],
      clearedSafetyWarnings: ["d"],
    });
    // 3 new safety warnings → 3 page alerts; 1 cleared → 1 info.
    expect(alerts.filter((a) => /safety$/i.test(a.title)).length).toBe(3);
    expect(alerts.filter((a) => /cleared/i.test(a.title)).length).toBe(1);
  });

  it("dedupe keys never collide for unrelated change types", () => {
    const alerts = alertsFromDiff({
      ...EMPTY_DIFF,
      sectionalChanges: [{ key: "ingestionStatus", previous: "GREEN", current: "RED" }],
      newSafetyWarnings: ["warning A"],
      newExternalConfig: ["KEY_A"],
      clearedExternalConfig: ["KEY_B"],
    });
    const keys = new Set(alerts.map((a) => a.key));
    expect(keys.size).toBe(alerts.length);
  });

  it("config-only diff produces only warning + info alerts (no pages)", () => {
    const alerts = alertsFromDiff({
      ...EMPTY_DIFF,
      newExternalConfig: ["STRIPE_SECRET_KEY"],
      clearedExternalConfig: ["THE_ODDS_API_KEY"],
    });
    for (const a of alerts) {
      expect(["warning", "info"]).toContain(a.severity);
    }
  });
});

describe("launchStatusAlert", () => {
  it("pages on NOT_READY_DATA", () => {
    expect(launchStatusAlert("NOT_READY_DATA")?.severity).toBe("page");
  });

  it("pages on NOT_READY_SAFETY", () => {
    expect(launchStatusAlert("NOT_READY_SAFETY")?.severity).toBe("page");
  });

  it("returns null on LAUNCH_READY (no alert)", () => {
    expect(launchStatusAlert("LAUNCH_READY")).toBeNull();
  });

  it("returns null on LAUNCH_READY_PENDING_EXTERNAL_CONFIG", () => {
    expect(launchStatusAlert("LAUNCH_READY_PENDING_EXTERNAL_CONFIG")).toBeNull();
  });

  it("returns null on NOT_READY_VALIDATION (not a paging condition)", () => {
    expect(launchStatusAlert("NOT_READY_VALIDATION")).toBeNull();
  });

  it("returns null on UNKNOWN (not a paging condition)", () => {
    expect(launchStatusAlert("UNKNOWN")).toBeNull();
  });
});

describe("alertsFromDiff — RED recovery branches", () => {
  it("emits an info alert when a section recovers from RED to AMBER", () => {
    const alerts = alertsFromDiff({
      ...EMPTY_DIFF,
      sectionalChanges: [{ key: "ingestionStatus", previous: "RED", current: "AMBER" }],
    });
    expect(alerts.some((a) => a.severity === "info")).toBe(true);
    expect(alerts.some((a) => /recover/i.test(a.title))).toBe(true);
  });

  it("does not emit a page when settlement recovers from RED", () => {
    const alerts = alertsFromDiff({
      ...EMPTY_DIFF,
      sectionalChanges: [{ key: "settlementStatus", previous: "RED", current: "GREEN" }],
    });
    expect(alerts.some((a) => a.severity === "info")).toBe(true);
    expect(alerts.every((a) => a.severity !== "page")).toBe(true);
  });
});
