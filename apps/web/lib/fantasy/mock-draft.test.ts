import { describe, it, expect } from "vitest";
import { PLAYERS } from "./players";
import {
  teamAtOverall, isUserPick, initMockDraft, advanceAI, userPick, gradeDraft,
  DEFAULT_CONFIG,
  type MockDraftConfig,
} from "./mock-draft";

const CFG_12: MockDraftConfig = { teams: 12, rounds: 15, userSlot: 1 };
const CFG_10: MockDraftConfig = { teams: 10, rounds: 15, userSlot: 5 };

describe("teamAtOverall (snake order)", () => {
  it("round 1: team 0 picks first", () => {
    expect(teamAtOverall(1, 12)).toBe(0);
    expect(teamAtOverall(12, 12)).toBe(11);
  });

  it("round 2 reverses", () => {
    // pick 13 = round 2, first pick in round = team 11 (last in round 1)
    expect(teamAtOverall(13, 12)).toBe(11);
    expect(teamAtOverall(24, 12)).toBe(0);
  });

  it("round 3 is same direction as round 1", () => {
    expect(teamAtOverall(25, 12)).toBe(0);
  });
});

describe("isUserPick", () => {
  it("userSlot=1 picks at position 0 in snake", () => {
    // Overall pick 1 → team 0 (slot 1)
    expect(isUserPick(1, CFG_12)).toBe(true);
    // Overall pick 2 → team 1 (not slot 1)
    expect(isUserPick(2, CFG_12)).toBe(false);
    // Round 2 last pick → team 0
    expect(isUserPick(24, CFG_12)).toBe(true);
  });

  it("middle slot picks in the middle", () => {
    // Slot 5 → 0-indexed team 4. In round 1, overall pick 5.
    expect(isUserPick(5, CFG_10)).toBe(true);
    expect(isUserPick(1, CFG_10)).toBe(false);
  });
});

describe("initMockDraft", () => {
  it("initialises all teams with empty rosters and full available pool", () => {
    const state = initMockDraft(CFG_12, PLAYERS);
    expect(state.rosters.size).toBe(12);
    expect(state.available.size).toBe(PLAYERS.length);
    expect(state.picks).toHaveLength(0);
    expect(state.nextOverall).toBe(1);
    expect(state.finished).toBe(false);
  });
});

describe("advanceAI", () => {
  it("advances AI picks until user's turn when user is in slot 1", () => {
    // userSlot=1 means pick 1 is the user's — advanceAI should not advance at all
    const init = initMockDraft(CFG_12, PLAYERS);
    const state = advanceAI(init, PLAYERS);
    expect(state.picks).toHaveLength(0); // user goes first
    expect(isUserPick(state.nextOverall, CFG_12)).toBe(true);
  });

  it("advances AI picks until user's turn when user is in slot 5", () => {
    const init = initMockDraft(CFG_10, PLAYERS);
    const state = advanceAI(init, PLAYERS);
    // User is slot 5, so AI should have made 4 picks (slots 1-4)
    expect(state.picks).toHaveLength(4);
    expect(isUserPick(state.nextOverall, CFG_10)).toBe(true);
  });
});

describe("userPick", () => {
  it("records user pick and advances AI", () => {
    const init = initMockDraft(DEFAULT_CONFIG, PLAYERS);
    // User is slot 1 — they pick first
    const topPlayer = PLAYERS[0]!;
    const state = userPick(init, topPlayer.id, PLAYERS);

    expect(state.picks[0]?.playerId).toBe(topPlayer.id);
    expect(state.picks[0]?.teamIndex).toBe(0); // userSlot=1 → index 0
    expect(state.available.has(topPlayer.id)).toBe(false);
    // After user picks, AI should have advanced to next user turn (end of round 1 snake)
    expect(state.picks.length).toBeGreaterThan(1);
  });

  it("ignores pick if player already taken", () => {
    const init = initMockDraft(DEFAULT_CONFIG, PLAYERS);
    const p = PLAYERS[0]!;
    const s1 = userPick(init, p.id, PLAYERS);
    const s2 = userPick(s1, p.id, PLAYERS);
    expect(s2.picks.length).toBe(s1.picks.length); // no-op
  });

  it("marks draft finished after all picks", () => {
    // 8 teams, 1 round, user slot 1 → 8 total picks
    const tiny: MockDraftConfig = { teams: 8, rounds: 1, userSlot: 1 };
    const tinyPool = PLAYERS.slice(0, 10);
    const init = initMockDraft(tiny, tinyPool);
    const s1 = userPick(init, tinyPool[0]!.id, tinyPool);
    // After user picks (pick 1), AI picks picks 2-8, draft ends (8 picks total)
    expect(s1.finished).toBe(true);
    expect(s1.picks).toHaveLength(8);
  });
});

describe("gradeDraft", () => {
  it("returns a letter grade and VOR total", () => {
    const init = initMockDraft(DEFAULT_CONFIG, PLAYERS);
    const userIds = PLAYERS.slice(0, 5).map((p) => p.id);
    const grade = gradeDraft(userIds, PLAYERS, DEFAULT_CONFIG);
    expect(grade.letter).toBeTruthy();
    expect(typeof grade.vorTotal).toBe("number");
    expect(grade.positionalBalance).toBeTruthy();
  });

  it("good picks get high grade", () => {
    // Best 5 players (by proj)
    const best = [...PLAYERS].sort((a, b) => b.proj - a.proj).slice(0, 8);
    const grade = gradeDraft(best.map((p) => p.id), PLAYERS, DEFAULT_CONFIG);
    expect(["A+", "A", "A-"].includes(grade.letter)).toBe(true);
  });
});
