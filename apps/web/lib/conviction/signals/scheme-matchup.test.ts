import { describe, expect, it, vi } from "vitest";

import type { GateCandidate } from "../gate-contract";
import {
  CLEAR_EDGE,
  createSchemeMatchupSignal,
  MAX_PROFILE_AGE_MS,
  MIN_SAMPLE_PLAYS,
  type MatchupProfile,
  type SchemeRate,
  type TeamSchemeProfile,
} from "./scheme-matchup";

const HOME = "Kansas City Chiefs";
const AWAY = "Buffalo Bills";
const NOW = new Date("2026-09-14T12:00:00Z");
const FRESH = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000);

function candidate(overrides: Partial<GateCandidate> = {}): GateCandidate {
  return {
    gameId: "game-1",
    sportKey: "americanfootball_nfl",
    homeTeamName: HOME,
    awayTeamName: AWAY,
    commenceTime: new Date("2026-09-14T17:00:00Z"),
    pickType: "SPREAD",
    selection: `${HOME} -2.5`,
    side: "home",
    line: -2.5,
    ...overrides,
  };
}

function rate(value: number | null, sampleSize = 200): SchemeRate {
  return { rate: value, sampleSize };
}

function team(
  name: string,
  rates: Partial<Pick<TeamSchemeProfile, "vsMan" | "vsZone" | "vsLightBox" | "vsStackedBox">> = {},
): TeamSchemeProfile {
  return {
    team: name,
    vsMan: rates.vsMan ?? rate(0.5),
    vsZone: rates.vsZone ?? rate(0.5),
    vsLightBox: rates.vsLightBox ?? rate(0.5),
    vsStackedBox: rates.vsStackedBox ?? rate(0.5),
    ...rates,
  };
}

function profile(
  home: TeamSchemeProfile,
  away: TeamSchemeProfile,
  asOf: Date = FRESH,
): MatchupProfile {
  return { gameId: "game-1", home, away, source: "nflverse play-by-play", asOf };
}

function signal(
  loaded: MatchupProfile | null,
  opts: { live?: boolean; now?: Date; maxAgeMs?: number } = {},
) {
  const loadMatchup = vi.fn(async () => loaded);
  const fn = createSchemeMatchupSignal({
    loadMatchup,
    now: () => opts.now ?? NOW,
    live: opts.live ?? true,
    ...(opts.maxAgeMs === undefined ? {} : { maxAgeMs: opts.maxAgeMs }),
  });
  return { fn, loadMatchup };
}

describe("createSchemeMatchupSignal — honesty gate", () => {
  it("returns null when live is false even though a full profile is supplied", async () => {
    const { fn, loadMatchup } = signal(profile(team(HOME), team(AWAY)), { live: false });
    await expect(fn(candidate())).resolves.toBeNull();
    expect(loadMatchup).not.toHaveBeenCalled();
  });

  it("defaults live to false when the caller omits it", async () => {
    const loadMatchup = vi.fn(async () => profile(team(HOME), team(AWAY)));
    const fn = createSchemeMatchupSignal({ loadMatchup, now: () => NOW });
    await expect(fn(candidate())).resolves.toBeNull();
    expect(loadMatchup).not.toHaveBeenCalled();
  });

  it("returns null when no profile exists for the game", async () => {
    const { fn } = signal(null);
    await expect(fn(candidate())).resolves.toBeNull();
  });
});

describe("createSchemeMatchupSignal — freshness", () => {
  it("returns null when the profile is stale past the freshness window", async () => {
    const stale = new Date(NOW.getTime() - MAX_PROFILE_AGE_MS - 1);
    const { fn } = signal(profile(team(HOME), team(AWAY), stale));
    await expect(fn(candidate())).resolves.toBeNull();
  });

  it("still votes on a profile exactly at the freshness boundary", async () => {
    const edge = new Date(NOW.getTime() - MAX_PROFILE_AGE_MS);
    const { fn } = signal(profile(team(HOME), team(AWAY), edge));
    const read = await fn(candidate());
    expect(read).not.toBeNull();
    expect(read?.verdict).toBe("NEUTRAL");
  });

  it("honours a caller-supplied freshness override", async () => {
    const { fn } = signal(profile(team(HOME), team(AWAY)), { maxAgeMs: 60_000 });
    await expect(fn(candidate())).resolves.toBeNull();
  });
});

describe("createSchemeMatchupSignal — sample-size floor", () => {
  it("returns null when every rate is below the minimum sample", async () => {
    const thin = rate(0.7, MIN_SAMPLE_PLAYS - 1);
    const { fn } = signal(
      profile(
        team(HOME, { vsMan: thin, vsZone: thin, vsLightBox: thin, vsStackedBox: thin }),
        team(AWAY),
      ),
    );
    await expect(fn(candidate())).resolves.toBeNull();
  });

  it("returns null when every rate is null", async () => {
    const absent = rate(null, 0);
    const { fn } = signal(
      profile(
        team(HOME, { vsMan: absent, vsZone: absent, vsLightBox: absent, vsStackedBox: absent }),
        team(AWAY),
      ),
    );
    await expect(fn(candidate())).resolves.toBeNull();
  });

  it("uses only the dimensions adequately sampled on BOTH teams", async () => {
    const thin = rate(0.9, MIN_SAMPLE_PLAYS - 1);
    const { fn } = signal(
      profile(
        team(HOME, {
          vsMan: rate(0.62),
          vsZone: rate(0.62),
          vsLightBox: thin,
          vsStackedBox: rate(0.9),
        }),
        team(AWAY, {
          vsMan: rate(0.5),
          vsZone: rate(0.5),
          vsLightBox: rate(0.5),
          vsStackedBox: thin,
        }),
      ),
    );
    const read = await fn(candidate());
    expect(read?.verdict).toBe("CONFIRMS");
    // Only man + zone were usable on both sides: 2 of 4 dimensions.
    expect(read?.completeness).toBeCloseTo(0.5, 10);
    expect(read?.basis).toContain("nflverse play-by-play");
  });

  it("skips a dimension whose rate is null on one team", async () => {
    const { fn } = signal(
      profile(
        team(HOME, { vsMan: rate(null, 400), vsZone: rate(0.62) }),
        team(AWAY, { vsMan: rate(0.5), vsZone: rate(0.5) }),
      ),
    );
    const read = await fn(candidate());
    expect(read?.verdict).toBe("NEUTRAL");
    // zone, lightBox and stackedBox remain comparable; man is dropped.
    expect(read?.completeness).toBeCloseTo(0.75, 10);
  });
});

describe("createSchemeMatchupSignal — verdicts", () => {
  it("CONFIRMS when our side holds a clear, adequately-sampled advantage", async () => {
    const edge = 0.5 + CLEAR_EDGE + 0.02;
    const { fn } = signal(
      profile(
        team(HOME, {
          vsMan: rate(edge),
          vsZone: rate(edge),
          vsLightBox: rate(edge),
          vsStackedBox: rate(edge),
        }),
        team(AWAY),
      ),
    );
    const read = await fn(candidate({ side: "home" }));
    expect(read?.verdict).toBe("CONFIRMS");
    expect(read?.key).toBe("scheme-matchup");
    expect(read?.completeness).toBe(1);
    expect(read?.reason).toContain(HOME);
  });

  it("CONTRADICTS when the opponent holds that advantage", async () => {
    const edge = 0.5 + CLEAR_EDGE + 0.02;
    const { fn } = signal(
      profile(
        team(HOME, {
          vsMan: rate(edge),
          vsZone: rate(edge),
          vsLightBox: rate(edge),
          vsStackedBox: rate(edge),
        }),
        team(AWAY),
      ),
    );
    const read = await fn(candidate({ side: "away", selection: `${AWAY} +2.5` }));
    expect(read?.verdict).toBe("CONTRADICTS");
    expect(read?.reason).toContain(HOME);
  });

  it("is NEUTRAL when the two offences are close", async () => {
    const near = 0.5 + CLEAR_EDGE / 2;
    const { fn } = signal(
      profile(
        team(HOME, {
          vsMan: rate(near),
          vsZone: rate(near),
          vsLightBox: rate(near),
          vsStackedBox: rate(near),
        }),
        team(AWAY),
      ),
    );
    const read = await fn(candidate());
    expect(read?.verdict).toBe("NEUTRAL");
  });

  it("reads a MONEYLINE the same way as a spread", async () => {
    const edge = 0.5 + CLEAR_EDGE + 0.02;
    const { fn } = signal(
      profile(
        team(HOME, {
          vsMan: rate(edge),
          vsZone: rate(edge),
          vsLightBox: rate(edge),
          vsStackedBox: rate(edge),
        }),
        team(AWAY),
      ),
    );
    const read = await fn(candidate({ pickType: "MONEYLINE", selection: HOME, line: null }));
    expect(read?.verdict).toBe("CONFIRMS");
  });
});

describe("createSchemeMatchupSignal — declines rather than estimates", () => {
  it("returns null on a TOTAL, because the profile carries no league baseline", async () => {
    const { fn } = signal(profile(team(HOME), team(AWAY)));
    await expect(
      fn(candidate({ pickType: "TOTAL", side: "over", selection: "Over 47.5", line: 47.5 })),
    ).resolves.toBeNull();
  });

  it("returns null when the engine's side is unknown", async () => {
    const { fn } = signal(profile(team(HOME), team(AWAY)));
    await expect(fn(candidate({ side: null }))).resolves.toBeNull();
  });

  it("returns null when the profile's teams do not line up with the candidate", async () => {
    const { fn } = signal(profile(team("Denver Broncos"), team("Las Vegas Raiders")));
    await expect(fn(candidate())).resolves.toBeNull();
  });
});
