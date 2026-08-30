import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEspnScoreboard } from "@/lib/data-sources/free-adapters/espn-scores";
import { parseHenrygdScoreboard, type NcaaGame } from "@/lib/data-sources/free-adapters/henrygd-ncaa";
import {
  buildTrustedFinals,
  settlePendingPicks,
  type PendingPick,
} from "@/lib/data-sources/free-settlement";

const FIX = resolve(__dirname, "fixtures");
const read = (f: string) => JSON.parse(readFileSync(resolve(FIX, f), "utf8"));

const espn = parseEspnScoreboard(read("espn-ncaaf-scoreboard.json"), "ncaaf");
const henry = parseHenrygdScoreboard(read("henrygd-scoreboard.json"));

// Navy beat Army 17-16 (home win by 1) on 2025-12-13 — confirmed by both sources.
const basePick: Omit<PendingPick, "pickId" | "pickType" | "selection" | "line"> = {
  homeTeam: "Navy",
  awayTeam: "Army",
  sportKey: "football_ncaaf",
  gameDateIso: "2025-12-13",
};
const pick = (over: Partial<PendingPick>): PendingPick => ({ pickId: "p", pickType: "MONEYLINE", selection: "Navy", line: 0, ...basePick, ...over });

describe("buildTrustedFinals", () => {
  it("marks the Army-Navy final CONFIRMED when both free sources agree", () => {
    const finals = buildTrustedFinals(espn, henry);
    const navy = finals.find((f) => /Navy/i.test(f.home.name) || /Navy/i.test(f.away.name));
    expect(navy).toBeDefined();
    expect(navy!.confirmation).toBe("CONFIRMED");
    expect(navy!.sources).toContain("espn-public-api");
    expect(navy!.sources).toContain("henrygd-ncaa");
  });

  it("marks a lone-source final SINGLE_SOURCE", () => {
    const finals = buildTrustedFinals(espn, []);
    const navy = finals.find((f) => /Navy/i.test(f.home.name));
    expect(navy!.confirmation).toBe("SINGLE_SOURCE");
  });

  it("marks conflicting scores DISPUTED", () => {
    const tampered: NcaaGame[] = henry.map((g) => ({ ...g, home: { ...g.home, score: 99 } }));
    const finals = buildTrustedFinals(espn, tampered);
    const navy = finals.find((f) => /Navy/i.test(f.home.name));
    expect(navy!.confirmation).toBe("DISPUTED");
  });
});

describe("settlePendingPicks", () => {
  const finals = buildTrustedFinals(espn, henry);

  it("settles a moneyline winner as WIN with CONFIRMED trust", () => {
    const out = settlePendingPicks([pick({ pickType: "MONEYLINE", selection: "Navy" })], finals)[0]!;
    expect(out.status).toBe("SETTLED");
    if (out.status !== "SETTLED") throw new Error("not settled");
    expect(out.result).toBe("WIN");
    expect(out.confirmation).toBe("CONFIRMED");
    expect(out.homeScore).toBe(17);
    expect(out.awayScore).toBe(16);
  });

  it("grades a spread the favorite failed to cover as LOSS", () => {
    // Navy -3.5 (home favored) but only won by 1.
    const out = settlePendingPicks([pick({ pickType: "SPREAD", selection: "Navy", line: -3.5 })], finals)[0]!;
    expect(out.status === "SETTLED" ? out.result : out.status).toBe("LOSS");
  });

  it("grades the underdog spread as WIN", () => {
    // Same game, home-perspective line is -3.5; the away pick (Army +3.5) covers.
    const out = settlePendingPicks([pick({ pickType: "SPREAD", selection: "Army", line: -3.5 })], finals)[0]!;
    expect(out.status === "SETTLED" ? out.result : out.status).toBe("WIN");
  });

  it("grades totals against the combined score (33)", () => {
    const over = settlePendingPicks([pick({ pickType: "TOTAL", selection: "OVER", line: 30.5 })], finals)[0]!;
    const under = settlePendingPicks([pick({ pickType: "TOTAL", selection: "UNDER", line: 30.5 })], finals)[0]!;
    expect(over.status === "SETTLED" ? over.result : over.status).toBe("WIN");
    expect(under.status === "SETTLED" ? under.result : under.status).toBe("LOSS");
  });

  it("HOLDS picks when the final is disputed, never settling blindly", () => {
    const tampered: NcaaGame[] = henry.map((g) => ({ ...g, home: { ...g.home, score: 99 } }));
    const disputed = buildTrustedFinals(espn, tampered);
    const out = settlePendingPicks([pick({ pickType: "MONEYLINE", selection: "Navy" })], disputed)[0]!;
    expect(out.status).toBe("HELD");
    expect(out.status === "HELD" ? out.reason : out.status).toBe("DISPUTED");
  });

  it("leaves picks with no matching final PENDING with NO_FINAL reason", () => {
    const out = settlePendingPicks([pick({ homeTeam: "Alabama", awayTeam: "Auburn" })], finals)[0]!;
    expect(out.status).toBe("PENDING");
    expect(out.status === "PENDING" ? out.reason : null).toBe("NO_FINAL");
  });


  it("still settles on a single source, flagged for audit", () => {
    const single = buildTrustedFinals(espn, []);
    const out = settlePendingPicks([pick({ pickType: "MONEYLINE", selection: "Navy" })], single)[0]!;
    expect(out.status === "SETTLED" ? out.confirmation : out.status).toBe("SINGLE_SOURCE");
  });
});
