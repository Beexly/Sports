import { describe, expect, it } from "vitest";
import {
  PRIZEPICKS_PARTNER_BASE,
  buildPrizePicksPlayerNameMap,
  ingestPrizePicksProjections,
  prizepicksIntakeEnabled,
} from "./prizepicks-intake.js";

const enabledEnv = { PRIZEPICKS_INTAKE_ENABLED: "true" } as NodeJS.ProcessEnv;
const disabledEnv = {} as NodeJS.ProcessEnv;
const asOf = "2026-09-25T22:00:00.000Z";

function row(over: Record<string, unknown> = {}) {
  return {
    id: "proj-1",
    attributes: {
      line_score: 2.5,
      stat_type: "Anytime TDs (Combo)",
      stat_display_name: "Anytime TDs",
      start_time: "2026-09-27T13:00:00.000-04:00",
      board_time: "2026-09-02T12:59:00.000-04:00",
      updated_at: "2026-09-25T13:26:00.000-04:00",
      status: "pre_game",
      projection_type: "Single Stat",
      allowed_wager_types: "over",
      is_promo: false,
      ...over,
    },
    relationships: { new_player: { data: { id: "player-9" } } },
  };
}

describe("prizepicksIntakeEnabled", () => {
  it("is disabled by default", () => {
    expect(prizepicksIntakeEnabled(disabledEnv)).toBe(false);
  });

  it("enables on explicit true", () => {
    expect(prizepicksIntakeEnabled(enabledEnv)).toBe(true);
  });

  it("ignores ambiguous values", () => {
    expect(prizepicksIntakeEnabled({ PRIZEPICKS_INTAKE_ENABLED: "onwards" } as NodeJS.ProcessEnv)).toBe(false);
  });
});

describe("buildPrizePicksPlayerNameMap", () => {
  it("maps new_player ids to display names", () => {
    const map = buildPrizePicksPlayerNameMap([
      { type: "new_player", id: "p1", attributes: { display_name: "Ja'Marr Chase", name: "J Chase" } },
      { type: "team", id: "t1", attributes: { display_name: "CIN" } },
    ]);
    expect(map.get("p1")).toBe("Ja'Marr Chase");
    expect(map.has("t1")).toBe(false);
  });

  it("handles null input", () => {
    expect(buildPrizePicksPlayerNameMap(null).size).toBe(0);
  });
});

describe("ingestPrizePicksProjections", () => {
  it("fails closed when disabled", () => {
    const res = ingestPrizePicksProjections({ data: [] }, asOf, disabledEnv);
    expect(res.ok).toBe(false);
  });

  it("accepts a valid row and resolves the player name", () => {
    const res = ingestPrizePicksProjections(
      {
        data: [row()],
        included: [{ type: "new_player", id: "player-9", attributes: { display_name: "Jahmyr Gibbs" } }],
      },
      asOf,
      enabledEnv,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accepted).toHaveLength(1);
    expect(res.data.rejected).toHaveLength(0);
    const r = res.data.accepted[0]!;
    expect(r.playerName).toBe("Jahmyr Gibbs");
    expect(r.lineScore).toBe(2.5);
    expect(r.statType).toBe("Anytime TDs (Combo)");
    expect(r.source).toBe("prizepicks-partner-api");
  });

  it("rejects rows with a missing line or player link", () => {
    const res = ingestPrizePicksProjections(
      { data: [row({ line_score: null }), { id: "x", attributes: {} }] },
      asOf,
      enabledEnv,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accepted).toHaveLength(0);
    expect(res.data.rejected).toHaveLength(2);
  });

  it("accepts rows for future games (pre-game boards are the norm)", () => {
    const res = ingestPrizePicksProjections(
      { data: [row({ start_time: "2026-10-01T13:00:00.000-04:00" })] },
      asOf,
      enabledEnv,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accepted).toHaveLength(1);
  });

  it("rejects rows observed (updated_at) after the as-of cutoff", () => {
    const res = ingestPrizePicksProjections(
      { data: [row({ updated_at: "2026-09-26T00:00:00.000-04:00" })] },
      asOf,
      enabledEnv,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accepted).toHaveLength(0);
    expect(res.data.rejected[0]!.reason).toMatch(/cutoff/);
  });

  it("rejects non-array payloads", () => {
    const res = ingestPrizePicksProjections({} as never, asOf, enabledEnv);
    expect(res.ok).toBe(false);
  });

  it("documents the partner base host", () => {
    expect(PRIZEPICKS_PARTNER_BASE).toBe("https://partner-api.prizepicks.com");
  });
});
