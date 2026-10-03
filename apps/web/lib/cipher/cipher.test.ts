import { describe, it, expect } from "vitest";
import { normalizeAnswer, getCipherStatus, toChapterView, CIPHER_CHAPTERS } from "./cipher";

describe("normalizeAnswer", () => {
  it("lowercases and strips non-alphanumerics so shard formats all match", () => {
    expect(normalizeAnswer("VELA 7C9 DUSK!")).toBe("vela7c9dusk");
    expect(normalizeAnswer("vela-7c9-dusk")).toBe("vela7c9dusk");
    expect(normalizeAnswer("  First Light  ")).toBe("firstlight");
  });
});

describe("getCipherStatus — the Mon 11:59am → Thu 6:59pm ET window", () => {
  const at = (iso: string) => getCipherStatus(Date.parse(iso));

  it("is LIVE midday Tuesday (inside the window)", () => {
    // 2026-06-02 16:00Z = 12:00 ET (EDT)
    expect(at("2026-06-02T16:00:00Z").state).toBe("live");
  });

  it("is SEALED on Sunday (outside the window)", () => {
    expect(at("2026-06-07T16:00:00Z").state).toBe("sealed");
  });

  it("is SEALED Monday morning before 11:59am ET", () => {
    // 2026-06-01 14:00Z = 10:00 ET, before the open
    expect(at("2026-06-01T14:00:00Z").state).toBe("sealed");
  });

  it("is LIVE Monday after 11:59am ET", () => {
    // 2026-06-01 16:30Z = 12:30 ET, after the open
    expect(at("2026-06-01T16:30:00Z").state).toBe("live");
  });

  it("is SEALED Thursday after 6:59pm ET", () => {
    // 2026-06-04 23:30Z = 19:30 ET, after the close
    expect(at("2026-06-04T23:30:00Z").state).toBe("sealed");
  });

  it("runs chapter 1 (First Light) in the anchor week", () => {
    expect(at("2026-06-02T16:00:00Z").chapter.week).toBe(1);
  });
});

describe("toChapterView — never leak shard values to the client", () => {
  const week1 = CIPHER_CHAPTERS.find((c) => c.week === 1)!;

  it("strips shard VALUES from the client view (only label/where/colour remain)", () => {
    const view = toChapterView(week1);
    for (const clue of view.clues) {
      expect(clue).not.toHaveProperty("value");
      expect(clue.label).toBeTruthy();
      expect(clue.where).toBeTruthy();
    }
  });

  it("the serialized client view contains none of the answer tokens", () => {
    const serialized = JSON.stringify(toChapterView(week1));
    for (const shard of week1.shards) {
      expect(serialized).not.toContain(shard.value); // e.g. VELA / 7C9 / DUSK
    }
  });
});
