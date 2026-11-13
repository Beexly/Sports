/**
 * Tests for the rest loader. Fake SqlClient only — no network, no real
 * database. NULL rest days must surface as MISSING, never as 0 or 7.
 */
import { describe, expect, it } from "vitest";
import type { SqlClient } from "@sports/prediction-engine/src/literature/literature-retrieval.js";
import { isMissing, isPresent } from "@sports/prediction-engine/src/evidence/types.js";
import { loadRest } from "./rest.js";

const GAME_ID = "cmt4fewrc00jbeat5nq9eauqo";

function fakeDb(rows: readonly unknown[]): SqlClient {
  return { query: async () => ({ rows: [...rows], rowCount: rows.length }) };
}

function recordingDb(rows: readonly unknown[]): {
  db: SqlClient;
  calls: { text: string; values: readonly unknown[] | undefined }[];
} {
  const calls: { text: string; values: readonly unknown[] | undefined }[] = [];
  const db: SqlClient = {
    query: async (text, values) => {
      calls.push({ text, values });
      return { rows: [...rows], rowCount: rows.length };
    },
  };
  return { db, calls };
}

/** Verified shape of tonight's games row (rest computed 2026-11-12). */
function restRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    restDaysHome: 4,
    restDaysAway: 4,
    isBackToBackHome: false,
    isBackToBackAway: false,
    contextComputedAt: "2026-11-12 18:00:00",
    updatedAt: "2026-11-12 21:32:21.725",
    commenceTime: "2026-11-13 01:15:00",
    ...overrides,
  };
}

describe("loadRest", () => {
  it("happy path: returns REAL with the stored rest days and flags", async () => {
    const ev = await loadRest(fakeDb([restRow()]), GAME_ID);
    expect(isPresent(ev)).toBe(true);
    if (!isPresent(ev)) return;
    expect(ev.status).toBe("REAL");
    expect(ev.source).toBe("games");
    expect(ev.value.homeRestDays).toBe(4);
    expect(ev.value.awayRestDays).toBe(4);
    expect(ev.value.homeBackToBack).toBe(false);
    expect(ev.value.awayBackToBack).toBe(false);
    // Stamped when the scheduling context was computed, not wall clock.
    expect(ev.asOf).toBe("2026-11-12T18:00:00.000Z");
  });

  it("empty result set: returns MISSING with a reason", async () => {
    const ev = await loadRest(fakeDb([]), GAME_ID);
    expect(isMissing(ev)).toBe(true);
    if (isMissing(ev)) expect(ev.reason).toContain("no games row");
  });

  it("NULL restDaysHome: MISSING — not 0, not 7", async () => {
    const ev = await loadRest(fakeDb([restRow({ restDaysHome: null })]), GAME_ID);
    expect(isMissing(ev)).toBe(true);
    if (isMissing(ev)) {
      expect(ev.reason).toBe("restDays not computed for this game");
    }
  });

  it("NULL restDaysAway: MISSING — not 0, not 7", async () => {
    const ev = await loadRest(fakeDb([restRow({ restDaysAway: null })]), GAME_ID);
    expect(isMissing(ev)).toBe(true);
    if (isMissing(ev)) {
      expect(ev.reason).toBe("restDays not computed for this game");
    }
  });

  it("both rest days NULL: still MISSING with the same reason", async () => {
    const ev = await loadRest(
      fakeDb([restRow({ restDaysHome: null, restDaysAway: null })]),
      GAME_ID,
    );
    expect(isMissing(ev)).toBe(true);
    if (isMissing(ev)) {
      expect(ev.reason).toBe("restDays not computed for this game");
    }
  });

  it("back-to-back flags pass through as true when stored true", async () => {
    const ev = await loadRest(
      fakeDb([restRow({ isBackToBackHome: true, isBackToBackAway: true, restDaysHome: 1, restDaysAway: 1 })]),
      GAME_ID,
    );
    expect(isPresent(ev)).toBe(true);
    if (!isPresent(ev)) return;
    expect(ev.value.homeBackToBack).toBe(true);
    expect(ev.value.awayBackToBack).toBe(true);
    expect(ev.value.homeRestDays).toBe(1);
    expect(ev.value.awayRestDays).toBe(1);
  });

  it("numeric-string rest days (Neon int8 serialisation) parse to numbers", async () => {
    const ev = await loadRest(fakeDb([restRow({ restDaysHome: "6", restDaysAway: "5" })]), GAME_ID);
    expect(isPresent(ev)).toBe(true);
    if (!isPresent(ev)) return;
    expect(ev.value.homeRestDays).toBe(6);
    expect(ev.value.awayRestDays).toBe(5);
  });

  it("NULL contextComputedAt: asOf falls back to updatedAt", async () => {
    const ev = await loadRest(fakeDb([restRow({ contextComputedAt: null })]), GAME_ID);
    expect(isPresent(ev)).toBe(true);
    if (isPresent(ev)) expect(ev.asOf).toBe("2026-11-12T21:32:21.725Z");
  });

  it("queries by parameterised id, SELECT only", async () => {
    const { db, calls } = recordingDb([restRow()]);
    await loadRest(db, GAME_ID);
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call?.values).toEqual([GAME_ID]);
    expect(call?.text.trim().toUpperCase().startsWith("SELECT")).toBe(true);
    expect(call?.text).toContain("restDaysHome");
  });
});
