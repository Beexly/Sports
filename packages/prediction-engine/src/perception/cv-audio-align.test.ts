import { describe, expect, it } from "vitest";
import {
  alignCommentaryToPlays,
  findMentions,
  FixtureTranscriber,
} from "./cv-audio-align.js";

const ROSTER = ["Justin Jefferson", "Patrick Mahomes", "Ja'Marr Chase"];

const SEGMENTS = [
  { t0: 100, t1: 104, text: "Second and seven." },
  { t0: 105, t1: 110, text: "Play-action, deep shot to Jefferson!" },
  { t0: 111, t1: 116, text: "Caught at the 30 by Jefferson." },
  { t0: 200, t1: 205, text: "Mahomes drops back." },
];
const PLAYS = [
  { playId: "play_g_1", snapT: 104, endT: 110 },
  { playId: "play_g_2", snapT: 199, endT: 205 },
];

describe("findMentions", () => {
  it("matches last names case-insensitively", () => {
    expect(findMentions("deep shot to jefferson down the sideline", ROSTER)).toEqual([
      "Justin Jefferson",
    ]);
  });

  it("matches on word boundaries and dedupes", () => {
    const m = findMentions("Mahomes to Mahomes, and Mahomes again", ROSTER);
    expect(m).toEqual(["Patrick Mahomes"]);
  });

  it("resolves aliases to roster names", () => {
    const m = findMentions("JJ with the catch", ROSTER, { JJ: "Justin Jefferson" });
    expect(m).toEqual(["Justin Jefferson"]);
  });

  it("ignores non-roster names", () => {
    expect(findMentions("great block by the tight end", ROSTER)).toEqual([]);
  });
});

describe("alignCommentaryToPlays", () => {
  it("windows segments around each play and extracts mentions", () => {
    const out = alignCommentaryToPlays(SEGMENTS, PLAYS, ROSTER);
    expect(out).toHaveLength(2);
    expect(out[0]!.mentions).toEqual(["Justin Jefferson"]);
    expect(out[0]!.text).toContain("deep shot");
    expect(out[1]!.mentions).toEqual(["Patrick Mahomes"]);
  });

  it("respects custom windows", () => {
    const out = alignCommentaryToPlays(SEGMENTS, PLAYS, ROSTER, {
      beforeSec: 0,
      afterSec: 0,
    });
    // Tight windows keep each play's commentary separate.
    expect(out[0]!.text).toContain("deep shot");
    expect(out[0]!.text).not.toContain("Mahomes drops back");
    expect(out[1]!.text).toContain("Mahomes drops back");
    expect(out[1]!.text).not.toContain("deep shot");
  });
});

describe("FixtureTranscriber", () => {
  it("returns canned segments", async () => {
    const tr = new FixtureTranscriber(SEGMENTS);
    expect(await tr.transcribe("game.wav")).toHaveLength(4);
    expect(tr.name).toBe("fixture-transcriber");
  });
});
