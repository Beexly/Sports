import { describe, expect, it } from "vitest";
import {
  UNDERDOG_API_BASE,
  ingestUnderdogPickemLines,
  underdogPickemIntakeEnabled,
} from "./underdog-pickem-intake.js";

const enabledEnv = { UNDERDOG_PICKEM_INTAKE_ENABLED: "true" } as NodeJS.ProcessEnv;
const disabledEnv = {} as NodeJS.ProcessEnv;
const asOf = "2026-09-25T22:00:00.000Z";

const line = {
  id: "line-1",
  stat_value: 63.5,
  status: "active",
  updated_at: "2026-09-25T20:26:00.000Z",
  over_under: {
    appearance_stat: {
      appearance_id: "app-1",
      display_stat: "Rush Yards",
      stat: "rushing_yds",
    },
  },
  options: [
    { choice: "higher", american_price: "-112", decimal_price: "1.9" },
    { choice: "lower", american_price: "-112", decimal_price: "1.9" },
  ],
};

const payload = {
  over_under_lines: [line],
  appearances: [{ id: "app-1", player_id: "p-1" }],
  players: [{ id: "p-1", first_name: "Chase", last_name: "Brown", position_display_name: "RB" }],
};

describe("underdogPickemIntakeEnabled", () => {
  it("is disabled by default", () => {
    expect(underdogPickemIntakeEnabled(disabledEnv)).toBe(false);
  });

  it("enables on explicit true", () => {
    expect(underdogPickemIntakeEnabled(enabledEnv)).toBe(true);
  });
});

describe("ingestUnderdogPickemLines", () => {
  it("fails closed when disabled", () => {
    const res = ingestUnderdogPickemLines(payload, asOf, disabledEnv);
    expect(res.ok).toBe(false);
  });

  it("accepts a valid line with resolved player and prices", () => {
    const res = ingestUnderdogPickemLines(payload, asOf, enabledEnv);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accepted).toHaveLength(1);
    const r = res.data.accepted[0]!;
    expect(r.playerName).toBe("Chase Brown");
    expect(r.position).toBe("RB");
    expect(r.displayStat).toBe("Rush Yards");
    expect(r.statKey).toBe("rushing_yds");
    expect(r.lineValue).toBe(63.5);
    expect(r.higherAmericanPrice).toBe("-112");
    expect(r.lowerDecimalPrice).toBe(1.9);
    expect(r.source).toBe("underdog-pickem-api");
  });

  it("skips inactive lines without rejecting them", () => {
    const res = ingestUnderdogPickemLines(
      { ...payload, over_under_lines: [{ ...line, status: "inactive" }] },
      asOf,
      enabledEnv,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accepted).toHaveLength(0);
    expect(res.data.skippedInactive).toBe(1);
    expect(res.data.rejected).toHaveLength(0);
  });

  it("rejects lines with a missing stat value or player link", () => {
    const res = ingestUnderdogPickemLines(
      {
        over_under_lines: [
          { ...line, stat_value: null },
          { ...line, id: "line-2", over_under: { appearance_stat: { appearance_id: "nope" } } },
        ],
        appearances: payload.appearances,
        players: payload.players,
      },
      asOf,
      enabledEnv,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accepted).toHaveLength(0);
    expect(res.data.rejected).toHaveLength(2);
  });

  it("rejects lines updated after the as-of cutoff", () => {
    const res = ingestUnderdogPickemLines(
      { ...payload, over_under_lines: [{ ...line, updated_at: "2026-09-26T00:00:00.000Z" }] },
      asOf,
      enabledEnv,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accepted).toHaveLength(0);
    expect(res.data.rejected[0]!.reason).toMatch(/cutoff/);
  });

  it("documents the API base host", () => {
    expect(UNDERDOG_API_BASE).toBe("https://api.underdogfantasy.com");
  });
});
