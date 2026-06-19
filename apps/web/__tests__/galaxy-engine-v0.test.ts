import { describe, it, expect } from "vitest";
import { detectTriggers, generateEvent, type FinishedGame } from "@/lib/galaxy/galaxy-engine-v0";
import { MANDATORY_VISUAL_LINE, isBrandSafe } from "@sports/galaxy-engine";

const game = (over: Partial<FinishedGame>): FinishedGame => ({
  id: "g1",
  sportKey: "americanfootball_nfl",
  homeTeam: "Home United",
  awayTeam: "Away City",
  homeScore: 21,
  awayScore: 20,
  closingSpread: -3,
  ...over,
});

describe("Galaxy Engine v0 — live-ops (bible Phase 7)", () => {
  it("detects an upset (favorite loses outright)", () => {
    const t = detectTriggers([game({ homeScore: 17, awayScore: 24, closingSpread: -6 })]);
    expect(t).toHaveLength(1);
    expect(t[0]!.kind).toBe("UPSET");
  });

  it("detects a blowout and a shootout", () => {
    const blow = detectTriggers([game({ homeScore: 38, awayScore: 10, closingSpread: -3 })]);
    expect(blow[0]!.kind).toBe("BLOWOUT");
    const shoot = detectTriggers([game({ homeScore: 31, awayScore: 30, closingSpread: -1 })]);
    expect(shoot[0]!.kind).toBe("SHOOTOUT");
  });

  it("ignores a chalk result with no trigger", () => {
    expect(detectTriggers([game({ homeScore: 20, awayScore: 17, closingSpread: -3 })])).toHaveLength(0);
  });

  it("generated events are owner-approval gated and carry a compliant asset brief", () => {
    const [trigger] = detectTriggers([game({ homeScore: 13, awayScore: 27, closingSpread: -7 })]);
    const ev = generateEvent(trigger!);
    expect(ev.quest.approved).toBe(false); // never auto-published
    expect(ev.quest.generated).toBe(true);
    expect(ev.assetBrief.prompt).toContain(MANDATORY_VISUAL_LINE);
    expect(ev.assetBrief.generated).toBe(false); // no Higgsfield call this build
    expect(isBrandSafe(`${ev.quest.title} ${ev.quest.description}`)).toBe(true);
  });
});
