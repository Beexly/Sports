import { describe, expect, it } from "vitest";
import {
  DRAFTERS_BEARER_TOKEN_ENV,
  DRAFTERS_INTAKE_ENABLED_ENV,
  DRAFTERS_LEAGUE_IDS,
  draftersBearerToken,
  draftersIntakeEnabled,
  ingestDraftersPropsGame,
} from "./drafters-intake.js";

const asOf = "2026-09-25T22:00:00.000Z";

const keyedEnv = {
  [DRAFTERS_INTAKE_ENABLED_ENV]: "true",
  [DRAFTERS_BEARER_TOKEN_ENV]: "user-supplied-token",
} as NodeJS.ProcessEnv;

const enabledNoToken = { [DRAFTERS_INTAKE_ENABLED_ENV]: "true" } as NodeJS.ProcessEnv;
const disabledEnv = {} as NodeJS.ProcessEnv;

const payload = {
  entities: [
    {
      players: [
        {
          prop_id: "prop-1",
          player_name: "Jonathan Taylor",
          position: "RB",
          question: "Rushing Yards",
          bid_stats_name: "rushing_yds",
          bid_stats_value: 39.5,
          game_id: "g1",
          lock_time: "2026-09-27T13:00:00.000-04:00",
          options: ["over", "under"],
          event: { home: "IND", away: "LAR" },
        },
      ],
    },
  ],
};

describe("gating", () => {
  it("is disabled by default", () => {
    expect(draftersIntakeEnabled(disabledEnv)).toBe(false);
  });

  it("requires BOTH the flag and a bearer token", () => {
    expect(ingestDraftersPropsGame("NFL", payload, asOf, disabledEnv).ok).toBe(false);
    const noToken = ingestDraftersPropsGame("NFL", payload, asOf, enabledNoToken);
    expect(noToken.ok).toBe(false);
    if (!noToken.ok) {
      expect(noToken.reason).toMatch(/DRAFTERS_BEARER_TOKEN/);
    }
  });

  it("reads the token via envSecret semantics (trimmed, never logged)", () => {
    expect(draftersBearerToken({ [DRAFTERS_BEARER_TOKEN_ENV]: "  tok  " } as NodeJS.ProcessEnv)).toBe("tok");
    expect(draftersBearerToken(disabledEnv)).toBeNull();
  });

  it("knows the NFL league id", () => {
    expect(DRAFTERS_LEAGUE_IDS["NFL"]).toBe(2);
  });
});

describe("ingestDraftersPropsGame", () => {
  it("accepts a valid prop line", () => {
    const res = ingestDraftersPropsGame("NFL", payload, asOf, keyedEnv);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accepted).toHaveLength(1);
    const r = res.data.accepted[0]!;
    expect(r.playerName).toBe("Jonathan Taylor");
    expect(r.bidStatsValue).toBe(39.5);
    expect(r.homeTeam).toBe("IND");
    expect(r.source).toBe("drafters-props-api");
  });

  it("rejects locked lines and malformed players", () => {
    const res = ingestDraftersPropsGame(
      "NFL",
      {
        entities: [
          {
            players: [
              { ...payload.entities[0]!.players![0]!, lock_time: "2026-09-20T13:00:00.000-04:00" },
              { prop_id: "x" },
            ],
          },
        ],
      },
      asOf,
      keyedEnv,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accepted).toHaveLength(0);
    expect(res.data.rejected).toHaveLength(2);
  });

  it("rejects unknown leagues", () => {
    expect(ingestDraftersPropsGame("SOCCER", payload, asOf, keyedEnv).ok).toBe(false);
  });
});
