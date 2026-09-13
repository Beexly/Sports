import { describe, expect, it, vi } from "vitest";

import type { GateCandidate } from "../gate-contract";
import {
  createPropAlignmentSignal,
  HIGH_SCORING_SHARE,
  LOW_SCORING_SHARE,
  MIN_DIRECTIONAL_PROPS,
  MIN_RELATIVE_DEVIATION,
  MIN_TEAM_DIRECTIONAL_PROPS,
  MONEYLINE_SEPARATION_BAND,
  TEAM_SEPARATION_BAND,
  type GameProp,
} from "./prop-alignment";

const HOME = "Kansas City Chiefs";
const AWAY = "Buffalo Bills";

function candidate(overrides: Partial<GateCandidate> = {}): GateCandidate {
  return {
    gameId: "game-1",
    sportKey: "americanfootball_nfl",
    homeTeamName: HOME,
    awayTeamName: AWAY,
    commenceTime: new Date("2026-09-14T17:00:00Z"),
    pickType: "TOTAL",
    selection: "Over 47.5",
    side: "over",
    line: 47.5,
    ...overrides,
  };
}

function prop(
  team: string,
  player: string,
  line: number,
  baseline: number | null,
  market = "receiving_yards",
): GameProp {
  return { player, team, market, line, baseline, source: "odds_line_snapshots" };
}

/** n props all set clearly ABOVE baseline. */
function above(team: string, n: number, tag = "up"): GameProp[] {
  return Array.from({ length: n }, (_, i) => prop(team, `${tag}-${i}`, 70, 60));
}

/** n props all set clearly BELOW baseline. */
function below(team: string, n: number, tag = "down"): GameProp[] {
  return Array.from({ length: n }, (_, i) => prop(team, `${tag}-${i}`, 50, 60));
}

function signal(props: readonly GameProp[], live = true) {
  const loadProps = vi.fn(async () => props);
  return { fn: createPropAlignmentSignal({ loadProps, live }), loadProps };
}

describe("createPropAlignmentSignal — honesty gate", () => {
  it("returns null when live is false even though real facts are supplied", async () => {
    const { fn, loadProps } = signal(above(HOME, 8), false);
    await expect(fn(candidate())).resolves.toBeNull();
    // Never even asks for the data: a wiring mistake cannot leak illustrative
    // props (lib/fantasy/props.ts "Silas Hart") into a live read.
    expect(loadProps).not.toHaveBeenCalled();
  });

  it("defaults live to false when the caller omits it", async () => {
    const loadProps = vi.fn(async () => above(HOME, 8));
    const fn = createPropAlignmentSignal({ loadProps });
    await expect(fn(candidate())).resolves.toBeNull();
    expect(loadProps).not.toHaveBeenCalled();
  });

  it("returns null when no props are loaded", async () => {
    const { fn } = signal([]);
    await expect(fn(candidate())).resolves.toBeNull();
  });

  it("returns null when the engine's side is unknown", async () => {
    const { fn } = signal(above(HOME, 8));
    await expect(fn(candidate({ side: null }))).resolves.toBeNull();
  });
});

describe("createPropAlignmentSignal — TOTAL", () => {
  it("CONFIRMS an over when the props skew above baseline", async () => {
    const { fn } = signal([...above(HOME, 3), ...below(AWAY, 1)]);
    const read = await fn(candidate({ side: "over" }));
    expect(read?.verdict).toBe("CONFIRMS");
    expect(read?.key).toBe("prop-alignment");
    expect(read?.basis).toContain("odds_line_snapshots");
    expect(read?.completeness).toBe(1);
    expect(read?.reason.length).toBeGreaterThan(0);
  });

  it("CONTRADICTS an over when the props skew below baseline", async () => {
    const { fn } = signal([...below(HOME, 3), ...above(AWAY, 1)]);
    const read = await fn(candidate({ side: "over" }));
    expect(read?.verdict).toBe("CONTRADICTS");
  });

  it("CONFIRMS an under when the props skew below baseline", async () => {
    const { fn } = signal([...below(HOME, 3), ...above(AWAY, 1)]);
    const read = await fn(candidate({ side: "under", selection: "Under 47.5" }));
    expect(read?.verdict).toBe("CONFIRMS");
  });

  it("CONTRADICTS an under when the props skew above baseline", async () => {
    const { fn } = signal([...above(HOME, 3), ...below(AWAY, 1)]);
    const read = await fn(candidate({ side: "under", selection: "Under 47.5" }));
    expect(read?.verdict).toBe("CONTRADICTS");
  });

  it("is NEUTRAL in the middle band", async () => {
    const { fn } = signal([...above(HOME, 2), ...below(AWAY, 2)]);
    const read = await fn(candidate({ side: "over" }));
    expect(read?.verdict).toBe("NEUTRAL");
    // 0.50 sits strictly inside the declared bands.
    expect(LOW_SCORING_SHARE).toBeLessThan(0.5);
    expect(HIGH_SCORING_SHARE).toBeGreaterThan(0.5);
  });

  it("returns null below the minimum comparable-prop count", async () => {
    const props = above(HOME, MIN_DIRECTIONAL_PROPS - 1);
    const { fn } = signal(props);
    await expect(fn(candidate({ side: "over" }))).resolves.toBeNull();
  });
});

describe("createPropAlignmentSignal — absent data is excluded, never counted", () => {
  it("EXCLUDES null-baseline props instead of treating them as matching the line", async () => {
    const nullBaselines = Array.from({ length: 4 }, (_, i) =>
      prop(AWAY, `unknown-${i}`, 55, null),
    );
    const { fn } = signal([...above(HOME, 4), ...nullBaselines]);
    const read = await fn(candidate({ side: "over" }));
    // 4 of 4 comparable props are above baseline -> CONFIRMS.
    // If the 4 null-baseline props had been counted as "not above", the share
    // would be 0.50 and this would read NEUTRAL. It must not.
    expect(read?.verdict).toBe("CONFIRMS");
    expect(read?.completeness).toBeCloseTo(0.5, 10);
  });

  it("returns null when every prop has a null baseline", async () => {
    const props = Array.from({ length: 8 }, (_, i) => prop(HOME, `unknown-${i}`, 55, null));
    const { fn } = signal(props);
    await expect(fn(candidate({ side: "over" }))).resolves.toBeNull();
  });

  it("drops props sitting inside the dead band around their baseline", async () => {
    // 0.5 / 60 = 0.83%, below MIN_RELATIVE_DEVIATION — a rounding difference,
    // not a lean, so nothing is directional and the signal declines to vote.
    expect(MIN_RELATIVE_DEVIATION).toBeGreaterThan(0.5 / 60);
    const props = Array.from({ length: 8 }, (_, i) => prop(HOME, `level-${i}`, 60.5, 60));
    const { fn } = signal(props);
    await expect(fn(candidate({ side: "over" }))).resolves.toBeNull();
  });

  it("ignores a non-positive baseline rather than dividing by it", async () => {
    const props = Array.from({ length: 8 }, (_, i) => prop(HOME, `zero-${i}`, 40, 0));
    const { fn } = signal(props);
    await expect(fn(candidate({ side: "over" }))).resolves.toBeNull();
  });
});

describe("createPropAlignmentSignal — SPREAD", () => {
  const spread = (side: "home" | "away") =>
    candidate({ pickType: "SPREAD", side, selection: `${HOME} -2.5`, line: -2.5 });

  it("CONFIRMS when our team's props are set up and the opponent's are not", async () => {
    const { fn } = signal([
      ...above(HOME, 3),
      ...below(HOME, 1, "h-down"),
      ...above(AWAY, 2),
      ...below(AWAY, 2, "a-down"),
    ]);
    const read = await fn(spread("home"));
    // ours 0.75 vs theirs 0.50 -> gap 0.25 >= TEAM_SEPARATION_BAND
    expect(TEAM_SEPARATION_BAND).toBeLessThanOrEqual(0.25);
    expect(read?.verdict).toBe("CONFIRMS");
  });

  it("CONTRADICTS when the opponent's props are set up and ours are not", async () => {
    const { fn } = signal([
      ...above(HOME, 3),
      ...below(HOME, 1, "h-down"),
      ...above(AWAY, 2),
      ...below(AWAY, 2, "a-down"),
    ]);
    const read = await fn(spread("away"));
    expect(read?.verdict).toBe("CONTRADICTS");
  });

  it("is NEUTRAL when both offences are priced about the same", async () => {
    const { fn } = signal([
      ...above(HOME, 2),
      ...below(HOME, 2, "h-down"),
      ...above(AWAY, 2),
      ...below(AWAY, 2, "a-down"),
    ]);
    const read = await fn(spread("home"));
    expect(read?.verdict).toBe("NEUTRAL");
  });

  it("returns null when one team has too few comparable props to separate", async () => {
    const { fn } = signal([
      ...above(HOME, 6),
      ...above(AWAY, MIN_TEAM_DIRECTIONAL_PROPS - 1, "a-up"),
    ]);
    await expect(fn(spread("home"))).resolves.toBeNull();
  });
});

describe("createPropAlignmentSignal — MONEYLINE", () => {
  const ml = (side: "home" | "away") =>
    candidate({ pickType: "MONEYLINE", side, selection: HOME, line: null });

  it("CONFIRMS only when the props clearly separate the two offences", async () => {
    const { fn } = signal([...above(HOME, 4), ...below(AWAY, 4)]);
    const read = await fn(ml("home"));
    expect(read?.verdict).toBe("CONFIRMS");
    expect(read?.completeness).toBe(1);
  });

  it("CONTRADICTS when the separation clearly favours the other team", async () => {
    const { fn } = signal([...above(HOME, 4), ...below(AWAY, 4)]);
    const read = await fn(ml("away"));
    expect(read?.verdict).toBe("CONTRADICTS");
  });

  it("returns null rather than NEUTRAL when the separation is not clear", async () => {
    const { fn } = signal([
      ...above(HOME, 2),
      ...below(HOME, 2, "h-down"),
      ...above(AWAY, 2),
      ...below(AWAY, 2, "a-down"),
    ]);
    // Props price volume, not who wins — we decline rather than stretch.
    await expect(fn(ml("home"))).resolves.toBeNull();
  });

  it("holds a wider separation bar than a spread does", async () => {
    expect(MONEYLINE_SEPARATION_BAND).toBeGreaterThan(TEAM_SEPARATION_BAND);
    // ours 0.75 vs theirs 0.50 clears the spread band but not the moneyline one.
    const props = [
      ...above(HOME, 3),
      ...below(HOME, 1, "h-down"),
      ...above(AWAY, 2),
      ...below(AWAY, 2, "a-down"),
    ];
    const { fn } = signal(props);
    await expect(fn(ml("home"))).resolves.toBeNull();
  });
});
