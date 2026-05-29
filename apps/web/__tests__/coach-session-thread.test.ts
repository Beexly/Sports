import { describe, it, expect } from "vitest";
import {
  parseCoachThread,
  appendToThread,
  findContinuityHint,
} from "@/lib/coach/session-thread";

describe("parseCoachThread", () => {
  it("returns empty for null / undefined", () => {
    expect(parseCoachThread(null).entries).toEqual([]);
    expect(parseCoachThread(undefined).entries).toEqual([]);
    expect(parseCoachThread("").entries).toEqual([]);
  });

  it("returns empty for malformed JSON", () => {
    expect(parseCoachThread("not-json").entries).toEqual([]);
    expect(parseCoachThread(encodeURIComponent("{not:array}")).entries).toEqual([]);
  });

  it("parses a valid serialized thread", () => {
    const raw = encodeURIComponent(
      JSON.stringify([
        { promptId: "cp-001", surface: "today", at: "2026-05-29T10:00:00Z" },
      ]),
    );
    const parsed = parseCoachThread(raw);
    expect(parsed.entries.length).toBe(1);
    expect(parsed.entries[0]?.promptId).toBe("cp-001");
  });

  it("caps to 5 entries", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      promptId: `cp-${i}`,
      surface: "today",
      at: "2026-05-29T10:00:00Z",
    }));
    const raw = encodeURIComponent(JSON.stringify(items));
    expect(parseCoachThread(raw).entries.length).toBe(5);
  });
});

describe("appendToThread", () => {
  it("appends a new entry to the front", () => {
    const empty = { entries: [] };
    const result = appendToThread(empty, "cp-001", "today", new Date("2026-05-29T10:00:00Z"));
    expect(result.thread.entries.length).toBe(1);
    expect(result.thread.entries[0]?.promptId).toBe("cp-001");
    expect(result.cookieValue).toBeTruthy();
  });

  it("respects max thread length of 5", () => {
    let thread = { entries: [] as never[] };
    for (let i = 0; i < 10; i++) {
      thread = appendToThread(thread, `cp-${i}`, "today").thread as never;
    }
    expect(thread.entries.length).toBe(5);
  });
});

describe("findContinuityHint", () => {
  it("returns null when prompt not in thread", () => {
    const empty = { entries: [] };
    expect(findContinuityHint(empty, "cp-001", "today")).toBeNull();
  });

  it("finds a hint when prompt + surface match within window", () => {
    const now = new Date("2026-05-29T10:05:00Z");
    const thread = {
      entries: [
        { promptId: "cp-001", surface: "today" as const, at: "2026-05-29T10:00:00Z" },
      ],
    };
    const hint = findContinuityHint(thread, "cp-001", "today", now);
    expect(hint).not.toBeNull();
    expect(hint?.minutesAgo).toBe(5);
  });

  it("returns null when entry is outside 30-minute window", () => {
    const now = new Date("2026-05-29T11:00:00Z"); // 60 min later
    const thread = {
      entries: [
        { promptId: "cp-001", surface: "today" as const, at: "2026-05-29T10:00:00Z" },
      ],
    };
    expect(findContinuityHint(thread, "cp-001", "today", now)).toBeNull();
  });

  it("returns null when surface mismatches", () => {
    const now = new Date("2026-05-29T10:05:00Z");
    const thread = {
      entries: [
        { promptId: "cp-001", surface: "today" as const, at: "2026-05-29T10:00:00Z" },
      ],
    };
    expect(findContinuityHint(thread, "cp-001", "decision-room", now)).toBeNull();
  });
});
