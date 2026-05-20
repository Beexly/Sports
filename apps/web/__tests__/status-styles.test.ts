import { describe, it, expect } from "vitest";
import { launchStatusStyle, healthTone, healthBadgeTone } from "@/lib/cockpit/status-styles";

describe("launchStatusStyle", () => {
  it("returns a label + tone for every JarvisLaunchStatus", () => {
    for (const status of [
      "LAUNCH_READY",
      "LAUNCH_READY_PENDING_EXTERNAL_CONFIG",
      "NOT_READY_DATA",
      "NOT_READY_VALIDATION",
      "NOT_READY_SAFETY",
      "UNKNOWN",
    ] as const) {
      const s = launchStatusStyle(status);
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.tone.length).toBeGreaterThan(0);
    }
  });

  it("LAUNCH_READY tone is green", () => {
    expect(launchStatusStyle("LAUNCH_READY").tone).toMatch(/green/);
  });

  it("NOT_READY_SAFETY tone is red", () => {
    expect(launchStatusStyle("NOT_READY_SAFETY").tone).toMatch(/red/);
  });
});

describe("healthTone", () => {
  it("returns a class string for each JarvisHealth", () => {
    expect(healthTone("GREEN")).toMatch(/green/);
    expect(healthTone("AMBER")).toMatch(/yellow/);
    expect(healthTone("RED")).toMatch(/red/);
    expect(healthTone("UNKNOWN")).toMatch(/gray/);
  });
});

describe("healthBadgeTone", () => {
  it("returns a bg + text class string for each JarvisHealth", () => {
    for (const h of ["GREEN", "AMBER", "RED", "UNKNOWN"] as const) {
      const s = healthBadgeTone(h);
      expect(s).toMatch(/bg-/);
      expect(s).toMatch(/text-/);
    }
  });
});

describe("exhaustive coverage", () => {
  // If the enum grows, this test surfaces a missing case in the style
  // helpers. The list below should mirror the union in lib/cockpit/jarvis.ts.
  const ALL_LAUNCH_STATUSES = [
    "LAUNCH_READY",
    "LAUNCH_READY_PENDING_EXTERNAL_CONFIG",
    "NOT_READY_DATA",
    "NOT_READY_VALIDATION",
    "NOT_READY_SAFETY",
    "UNKNOWN",
  ] as const;

  it("every JarvisLaunchStatus has a distinct, non-empty label", () => {
    const labels = ALL_LAUNCH_STATUSES.map((s) => launchStatusStyle(s).label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const l of labels) expect(l.length).toBeGreaterThan(0);
  });

  it("every JarvisLaunchStatus has a non-default tone (except UNKNOWN)", () => {
    for (const s of ALL_LAUNCH_STATUSES) {
      const tone = launchStatusStyle(s).tone;
      if (s === "UNKNOWN") {
        expect(tone).toMatch(/gray/);
      } else {
        expect(tone).not.toMatch(/^bg-gray-800 text-gray-300 ring-gray-700\/40$/);
      }
    }
  });

  const ALL_HEALTHS = ["GREEN", "AMBER", "RED", "UNKNOWN"] as const;

  it("healthTone returns a distinct class for every JarvisHealth", () => {
    const tones = ALL_HEALTHS.map(healthTone);
    expect(new Set(tones).size).toBe(tones.length);
  });

  it("healthBadgeTone returns a distinct class for every JarvisHealth", () => {
    const tones = ALL_HEALTHS.map(healthBadgeTone);
    expect(new Set(tones).size).toBe(tones.length);
  });
});
