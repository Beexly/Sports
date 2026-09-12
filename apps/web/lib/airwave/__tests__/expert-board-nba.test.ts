import { describe, it, expect } from "vitest";
import { leaderboard } from "../grade";
import { DEMO_PUNDITS, DEMO_CLAIMS } from "../demo-ledger";
import {
  GATE_NOTE,
  MIN_DECIDED_FOR_PUBLISHED_RATE,
} from "../expert-ingestion";
import {
  NBA_SLATE,
  NBA_SALARY_CAP,
  NBA_LINEUP_SIZE,
  validateNbaLineup,
} from "../../fantasy/nba-slate";

// Mirrors the fictional demo lineup rendered by app/fantasy/nba/page.tsx.
const DEMO_LINEUP_IDS = [
  "nba27",
  "nba24",
  "nba13",
  "nba14",
  "nba26",
  "nba20",
  "nba21",
  "nba28",
];

describe("expert board demo data (#796)", () => {
  it("scores only the fictional demo pundits, sorted most-accountable first", () => {
    const board = leaderboard(DEMO_PUNDITS, DEMO_CLAIMS);
    expect(board).toHaveLength(DEMO_PUNDITS.length);
    const demoIds = new Set(DEMO_PUNDITS.map((p) => p.id));
    for (const card of board) {
      expect(demoIds.has(card.punditId)).toBe(true);
    }
    for (let i = 1; i < board.length; i += 1) {
      expect(board[i - 1]!.accountabilityIndex).toBeGreaterThanOrEqual(
        board[i]!.accountabilityIndex,
      );
    }
  });

  it("gates real records and discloses the decided-call floor", () => {
    expect(GATE_NOTE).toContain("founder gate");
    expect(GATE_NOTE).toContain(String(MIN_DECIDED_FOR_PUBLISHED_RATE));
    // Every demo scorecard sits below the floor, so no headline rate publishes.
    for (const card of leaderboard(DEMO_PUNDITS, DEMO_CLAIMS)) {
      expect(card.hits + card.misses).toBeLessThan(
        MIN_DECIDED_FOR_PUBLISHED_RATE,
      );
      expect(card.hitRate).toBeNull();
    }
  });
});

describe("fictional NBA slate validator demo (#800)", () => {
  it("accepts the page's fictional 8-man demo lineup under the cap", () => {
    const byId = new Map(NBA_SLATE.map((p) => [p.id, p]));
    const lineup = DEMO_LINEUP_IDS.map((id) => byId.get(id)!);
    expect(lineup).toHaveLength(NBA_LINEUP_SIZE);
    const verdict = validateNbaLineup(lineup);
    expect(verdict.errors).toEqual([]);
    expect(verdict.valid).toBe(true);
    expect(verdict.totalSalary).toBeLessThanOrEqual(NBA_SALARY_CAP);
  });

  it("rejects duplicates and over-cap stacks", () => {
    const byId = new Map(NBA_SLATE.map((p) => [p.id, p]));
    const star = byId.get("nba11")!;
    const dupes = Array.from({ length: NBA_LINEUP_SIZE }, () => star);
    const dupVerdict = validateNbaLineup(dupes);
    expect(dupVerdict.valid).toBe(false);
    expect(
      dupVerdict.errors.some((e) => e.includes("duplicate")),
    ).toBe(true);

    const pricey = [...NBA_SLATE]
      .sort((a, b) => b.salary - a.salary)
      .slice(0, NBA_LINEUP_SIZE);
    const capVerdict = validateNbaLineup(pricey);
    expect(capVerdict.valid).toBe(false);
    expect(
      capVerdict.errors.some((e) => e.includes("exceeds cap")),
    ).toBe(true);
  });
});
