/**
 * C51 — Telemetry Ingest Unit Tests
 *
 * Tests the telemetry event name registry, surface validation, and
 * forbidden field checks as pure function tests (no HTTP layer).
 */

import { describe, it, expect } from "vitest";
import {
  isKnownEventName,
  TELEMETRY_EVENT_NAMES,
  isForbiddenEvent,
} from "@/lib/telemetry/events";
import { isKnownSurface } from "@/lib/telemetry/surfaces";
import { checkForbiddenFields, isForbiddenField, FORBIDDEN_FIELD_KEYS } from "@/lib/telemetry/privacy";

describe("event name registry", () => {
  it("accepts known event names", () => {
    expect(isKnownEventName("surface.viewed")).toBe(true);
    expect(isKnownEventName("pick.viewed")).toBe(true);
    expect(isKnownEventName("autopsy.opened")).toBe(true);
    expect(isKnownEventName("parlay_mri.checked")).toBe(true);
    expect(isKnownEventName("experiment.exposed")).toBe(true);
  });

  it("rejects unknown event names", () => {
    expect(isKnownEventName("bet.placed")).toBe(false);
    expect(isKnownEventName("unknown.event")).toBe(false);
    expect(isKnownEventName("")).toBe(false);
    expect(isKnownEventName("SURFACE.VIEWED")).toBe(false); // case-sensitive
  });

  it("TELEMETRY_EVENT_NAMES set is non-empty", () => {
    expect(TELEMETRY_EVENT_NAMES.size).toBeGreaterThan(10);
  });

  it("forbidden events are not in the known event names", () => {
    const forbidden = ["bet.placed", "bet.amount_increased", "user.urged_to_bet"];
    for (const name of forbidden) {
      expect(isKnownEventName(name)).toBe(false);
      expect(isForbiddenEvent(name)).toBe(true);
    }
  });
});

describe("surface id validation", () => {
  it("accepts known surface ids", () => {
    expect(isKnownSurface("today")).toBe(true);
    expect(isKnownSurface("command")).toBe(true);
    expect(isKnownSurface("academy")).toBe(true);
    expect(isKnownSurface("picks")).toBe(true);
    expect(isKnownSurface("autopsy")).toBe(true);
  });

  it("rejects unknown surface ids", () => {
    expect(isKnownSurface("decision-room")).toBe(false); // not in telemetry surfaces (by design)
    expect(isKnownSurface("unknown-surface")).toBe(false);
    expect(isKnownSurface("")).toBe(false);
  });
});

describe("forbidden field checks", () => {
  it("rejects properties containing forbidden field keys", () => {
    expect(checkForbiddenFields({ email: "test@example.com" })).toBe("email");
    expect(checkForbiddenFields({ ip: "1.2.3.4" })).toBe("ip");
    expect(checkForbiddenFields({ betAmount: 100 })).toBe("betAmount");
    expect(checkForbiddenFields({ modelWeights: [] })).toBe("modelWeights");
    expect(checkForbiddenFields({ promptText: "foo" })).toBe("promptText");
  });

  it("returns null for safe properties", () => {
    expect(checkForbiddenFields({ surface: "today", dwellMs: 1200 })).toBeNull();
    expect(checkForbiddenFields({ tier: "free" })).toBeNull();
    expect(checkForbiddenFields({})).toBeNull();
  });

  it("FORBIDDEN_FIELD_KEYS contains PII and methodology keys", () => {
    expect(isForbiddenField("email")).toBe(true);
    expect(isForbiddenField("phone")).toBe(true);
    expect(isForbiddenField("ssn")).toBe(true);
    expect(isForbiddenField("modelWeights")).toBe(true);
    expect(isForbiddenField("calibrationFormula")).toBe(true);
    expect(isForbiddenField("factorThreshold")).toBe(true);
    expect(FORBIDDEN_FIELD_KEYS.size).toBeGreaterThan(5);
  });

  it("safe keys are not in the forbidden set", () => {
    expect(isForbiddenField("surface")).toBe(false);
    expect(isForbiddenField("dwellMs")).toBe(false);
    expect(isForbiddenField("tier")).toBe(false);
    expect(isForbiddenField("variant")).toBe(false);
  });
});
