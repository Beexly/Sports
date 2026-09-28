/**
 * `player_game_stats.team` — the regression this pins.
 *
 * MEASURED 2026-09-28 on live Neon. nflverse renamed `recent_team` after 2024,
 * and `ingestPlayerWeeklyStats` read that one name, so the column went NULL:
 *
 *   2020  5,447 rows populated   2024  5,597 populated
 *   2025        0 populated      2026        0 populated  <- broken
 *
 * `opponent` stayed populated throughout, which is what identified this as one
 * renamed field rather than a broken asset.
 *
 * WHY IT MATTERS: `team` is the fan-out key the whole adjustment layer joins on
 * (`computeAdjustments` builds `byTeam` from `s.team`), and `engine-slate.ts`
 * reads the same field into each projection window. An empty team makes every
 * §1/§2/§3 team-scoped adjustment find no teammates and silently emit nothing,
 * while the ingest reports success.
 *
 * These tests pin that BOTH spellings resolve, on both the stat row and the
 * denormalized Player row.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const upsertPlayer = vi.fn();
const upsertStats = vi.fn();
const gate = { ok: true, rightsSnapshot: {} };

vi.mock("@sports/data-ingestion", () => ({ fetchNflverse: vi.fn() }));
vi.mock("@/lib/ingestion/nflverse-gate", () => ({ nflverseIngestionGate: () => gate }));
vi.mock("@sports/db", () => ({
  db: {
    player: { findMany: async () => [], upsert: (...a: unknown[]) => upsertPlayer(...a) },
    playerGameStat: { upsert: (...a: unknown[]) => upsertStats(...a) },
    $transaction: async (ops: readonly unknown[]) => Promise.all(ops),
  },
}));

import { ingestPlayerWeeklyStats } from "@/lib/ingestion/player-stats";

const NOW = new Date("2026-09-28T12:00:00Z");

function row(extra: Record<string, string>): Record<string, string> {
  return {
    player_id: "g-1",
    season: "2026",
    week: "3",
    season_type: "regular",
    player_display_name: "Test Player",
    position: "WR",
    fantasy_points_ppr: "12.5",
    recent_team: "",
    opponent_team: "",
    ...extra,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  gate.ok = true;
  // The player upsert must return an id: the code skips stat rows whose gsisId
  // never made it into idByGsis, which would silently drop every assertion.
  upsertPlayer.mockResolvedValue({ id: "p1" });
  upsertStats.mockResolvedValue({});
});

async function run(rows: Record<string, string>[]): Promise<void> {
  const fetcher = async () => ({ records: rows });
  await ingestPlayerWeeklyStats(2026, { now: NOW, fetcher: fetcher as never });
}

const statRow = () =>
  upsertStats.mock.calls[0]![0] as unknown as {
    create: { team: string | null; opponent: string | null };
  };
const playerRow = () =>
  upsertPlayer.mock.calls[0]![0] as unknown as {
    create: { recentTeam: string | null };
  };

describe("player_game_stats team/opponent survive the 2025 column rename", () => {
  it("reads the LEGACY recent_team spelling (seasons through 2024)", async () => {
    await run([row({ recent_team: "BUF", opponent_team: "MIA" })]);
    expect(statRow().create.team).toBe("BUF");
    expect(statRow().create.opponent).toBe("MIA");
    expect(playerRow().create.recentTeam).toBe("BUF");
  });

  it("reads the 2025+ `team` spelling that replaced recent_team", async () => {
    // THE DEFECT: this row used to persist team = null.
    await run([row({ team: "BUF", opponent: "MIA" })]);
    expect(statRow().create.team).toBe("BUF");
    expect(statRow().create.opponent).toBe("MIA");
    expect(playerRow().create.recentTeam).toBe("BUF");
  });

  it("prefers the legacy name when both are present (no change for old seasons)", async () => {
    await run([row({ recent_team: "BUF", team: "XXX", opponent_team: "MIA", opponent: "YYY" })]);
    expect(statRow().create.team).toBe("BUF");
    expect(statRow().create.opponent).toBe("MIA");
  });

  it("writes null (not an empty string) when upstream carries neither spelling", async () => {
    await run([row({})]);
    expect(statRow().create.team).toBeNull();
    expect(statRow().create.opponent).toBeNull();
    expect(playerRow().create.recentTeam).toBeNull();
  });
});
