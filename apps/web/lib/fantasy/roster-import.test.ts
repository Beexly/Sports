import { describe, expect, it } from "vitest";
import { cleanRosterLine, importRoster } from "./roster-import";
import { PLAYERS } from "./players";

const POOL = PLAYERS;
const NAME_A = POOL[0]!.name;
const NAME_B = POOL[1]!.name;

describe("cleanRosterLine", () => {
  it("strips bullets, positions, teams, and status noise", () => {
    expect(cleanRosterLine(`1. ${NAME_A} QB (KC) Q`)).toBe(NAME_A);
    expect(cleanRosterLine(`• ${NAME_B} WR, BUF — bye 12`)).toBe(NAME_B);
    expect(cleanRosterLine("   ")).toBe("");
  });
});

describe("importRoster", () => {
  it("matches pasted platform-style rosters against the pool", () => {
    const pasted = [`QB ${NAME_A} (Q)`, `2. ${NAME_B} - WR`, ""].join("\n");
    const result = importRoster(pasted, POOL);
    expect(result.matched.map((p) => p.name)).toEqual([NAME_A, NAME_B]);
    expect(result.unmatched).toHaveLength(0);
  });

  it("reports unknown names instead of guessing", () => {
    const result = importRoster("Zz Nonexistent Player", POOL);
    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toEqual(["Zz Nonexistent Player"]);
  });

  it("dedupes repeated lines to one roster slot", () => {
    const result = importRoster(`${NAME_A}\n${NAME_A}`, POOL);
    expect(result.matched).toHaveLength(1);
  });

  it("falls back to unique last-name + first-initial", () => {
    const [first, ...rest] = NAME_A.split(" ");
    const abbreviated = `${first![0]}. ${rest.join(" ")}`;
    const result = importRoster(abbreviated, POOL);
    expect(result.matched.map((p) => p.name)).toContain(NAME_A);
  });
});
