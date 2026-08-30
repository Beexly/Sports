import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DraftAssistant } from "@/components/fantasy/draft-assistant";
import { BestBallBoard } from "@/components/fantasy/bestball-board";
import type { Player } from "@/lib/fantasy/players";

/**
 * D3/D5 presentation contract on LIVE pool rows:
 *  - The Sleeper live injury flag rides on the DISPLAY-ONLY `injuryDisplay`
 *    field: the UI badge still shows it, while `injury` (the scoring field)
 *    stays "healthy" so no paid number moves.
 *  - bye 0 means "no bye joined", not Week 0: the boards render no bye segment
 *    for it, and no "Week 0" string appears anywhere.
 */

function livePlayer(over: Partial<Player> & { id: string; name: string; pos: Player["pos"] }): Player {
  return {
    team: "KC",
    bye: 0,
    proj: 200,
    floor: 150,
    ceiling: 260,
    usage: 0.6,
    schemeFit: 0.6,
    role: "Starter",
    trend: "flat",
    injury: "healthy",
    note: "n",
    ...over,
  };
}

const LIVE_POOL: Player[] = [
  livePlayer({ id: "wr-live", name: "Live Wideout", pos: "WR", proj: 250, injuryDisplay: "questionable", bye: 0 }),
  livePlayer({ id: "rb-live", name: "Live Back", pos: "RB", team: "BUF", proj: 220, bye: 7 }),
  livePlayer({ id: "qb-live", name: "Live Passer", pos: "QB", proj: 300, bye: 0 }),
];

afterEach(cleanup);

describe("DraftAssistant — live display flags", () => {
  it("shows the Sleeper display badge from injuryDisplay while injury stays healthy", () => {
    render(<DraftAssistant pool={LIVE_POOL} canUseFantasyFull />);
    expect(screen.getAllByTitle("questionable").length).toBeGreaterThan(0);
  });

  it("hides the bye segment for bye 0 and never says Week 0", () => {
    const { container } = render(<DraftAssistant pool={LIVE_POOL} canUseFantasyFull />);
    const text = container.textContent ?? "";
    expect(text).not.toContain("Bye 0");
    expect(text).not.toContain("Week 0");
    expect(text).toContain("Bye 7"); // real byes still render
  });
});

describe("BestBallBoard — live display flags", () => {
  it("shows the Sleeper display badge from injuryDisplay while injury stays healthy", () => {
    render(<BestBallBoard pool={LIVE_POOL} canUseFantasyFull />);
    expect(screen.getAllByTitle("questionable").length).toBeGreaterThan(0);
  });

  it("hides the bye segment for bye 0 and never says Week 0", () => {
    const { container } = render(<BestBallBoard pool={LIVE_POOL} canUseFantasyFull />);
    const text = container.textContent ?? "";
    expect(text).not.toContain("Bye 0");
    expect(text).not.toContain("Week 0");
    expect(text).toContain("Bye 7");
  });
});
