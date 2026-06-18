/**
 * Tests for the Lessons lane (J7): buildLessons() renders REAL confirmed
 * lessons from recall when present (dataMode "live"), and falls back to the
 * honest "no lessons store wired" empty state ("unavailable") when recall is
 * empty. The /cockpit/losses + /cockpit/calibration links survive both paths.
 */
import { describe, it, expect } from "vitest";

import { buildLessons } from "../loader";
import type { RecalledLesson } from "@/lib/jarvis/memory/recall";

const MEMORY_STATUS = "ARCHIVE is NOT_WIRED; only memory candidate tasking is safe.";

function lesson(overrides: Partial<RecalledLesson> = {}): RecalledLesson {
  return {
    id: "mem-1",
    memoryType: "episodic",
    memoryState: "confirmed",
    scope: "picks.gate",
    title: "Free tier shows confidence",
    summary: "Owner confirmed free picks display their confidence score.",
    confidence: 90,
    sensitivity: "normal",
    learnedAt: new Date("2026-06-01T00:00:00Z"),
    tags: ["gate"],
    ...overrides,
  };
}

describe("buildLessons — uses recall when present", () => {
  it("renders live lessons from recall (dataMode live)", () => {
    const lane = buildLessons(MEMORY_STATUS, [lesson(), lesson({ id: "mem-2", title: "CLV matters" })]);
    expect(lane.key).toBe("lessons");
    expect(lane.dataMode).toBe("live");
    expect(lane.fallbackReason).toBeNull();
    expect(lane.cards).toHaveLength(2);
    expect(lane.cards[0]!.title).toBe("Free tier shows confidence");
    expect(lane.cards[0]!.confidence).toBe(90);
    // Confirmed lessons still link to the real authoring queues.
    const links = lane.cards[0]!.evidence.map((e) => e.value);
    expect(links).toContain("/cockpit/losses");
    expect(links).toContain("/cockpit/calibration");
  });
});

describe("buildLessons — honest fallback when recall is empty", () => {
  it("degrades to the unavailable empty state with the no-lessons-store reason", () => {
    const lane = buildLessons(MEMORY_STATUS, []);
    expect(lane.dataMode).toBe("unavailable");
    expect(lane.fallbackReason).toMatch(/no lessons store/i);
    expect(lane.cards).toHaveLength(1);
    expect(lane.cards[0]!.title).toMatch(/no lessons store wired/i);
    // The empty state still surfaces the loss + calibration links.
    const links = lane.cards[0]!.evidence.map((e) => e.value);
    expect(links).toContain("/cockpit/losses");
    expect(links).toContain("/cockpit/calibration");
    // Memory status string is surfaced honestly.
    expect(lane.cards[0]!.evidence.some((e) => e.value === MEMORY_STATUS)).toBe(true);
  });
});
