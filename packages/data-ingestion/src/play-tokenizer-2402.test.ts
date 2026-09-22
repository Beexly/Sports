import { describe, expect, it } from "vitest";
import { encodePlay, decodePlayType, TOKEN_VOCAB_SIZE, GSE_PLAY_SIMULATOR_ENABLED } from "./play-tokenizer-2402.js";

const play = {
  playType: "pass", yardsGained: 12, down: 2, distance: 8, yardline: 45,
  quarter: 3, secondsRemaining: 400, scoreDiff: 7, timeoutsOffense: 2,
  timeoutsDefense: 3, shotgun: true, noHuddle: false, weatherBin: 1,
};

describe("play tokenizer", () => {
  it("encodes to 13 tokens within vocab", () => {
    const t = encodePlay(play);
    expect(t).toHaveLength(13);
    expect(t.every((x) => x >= 0 && x < TOKEN_VOCAB_SIZE)).toBe(true);
  });
  it("round-trips the play type", () => {
    expect(decodePlayType(encodePlay(play)[0] ?? -1)).toBe("pass");
  });
  it("maps unknown play types to 'other'", () => {
    expect(decodePlayType(encodePlay({ ...play, playType: "onside_kick" })[0] ?? -1)).toBe("other");
  });
  it("is deterministic", () => {
    expect(encodePlay(play)).toEqual(encodePlay(play));
  });
  it("stays off until the accuracy/Brier gates clear", () => {
    expect(GSE_PLAY_SIMULATOR_ENABLED).toBe(false);
  });
  it("handles degenerate (all-zero) input within vocab", () => {
    const t = encodePlay({
      playType: "pass", yardsGained: 0, down: 0, distance: 0, yardline: 0,
      quarter: 0, secondsRemaining: 0, scoreDiff: 0, timeoutsOffense: 0,
      timeoutsDefense: 0, shotgun: false, noHuddle: false, weatherBin: 0,
    });
    expect(t).toHaveLength(13);
    expect(t.every((x) => x >= 0 && x < TOKEN_VOCAB_SIZE)).toBe(true);
  });
  it("handles edge inputs", () => {
    // out-of-range fields clamp instead of escaping the vocab
    const t = encodePlay({ ...play, yardsGained: 999, down: 99, quarter: 99, weatherBin: 99, secondsRemaining: -5 });
    expect(t.every((x) => x >= 0 && x < TOKEN_VOCAB_SIZE)).toBe(true);
    expect(decodePlayType(-3)).toBe("other");
    expect(decodePlayType(999)).toBe("other");
  });
});

