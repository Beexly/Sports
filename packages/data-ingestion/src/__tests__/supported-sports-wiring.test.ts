/**
 * C-36 half-wiring guard.
 *
 * Adding an entry to SUPPORTED_SPORTS is not one change — it is a change to a
 * set of sibling maps that TypeScript does NOT cross-check. SEASON_WINDOWS is
 * `Record<SupportedSportKey, _>`, so the compiler does force that one. But
 * SHORT_TO_ODDS_SPORT is `Record<ShortSportKey, _>` and ESPN_ODDS_SPORT_MAP /
 * RUNDOWN_SPORT_IDS are `Record<string, _>` — none of which force coverage in
 * the SupportedSportKey -> map direction. So a new sport compiles clean, then
 * silently has no ESPN seed path, no free failover and no settlement runner:
 * the board half-wires and the failure shows up as an empty slate, not an error.
 *
 * These assertions ITERATE SUPPORTED_SPORTS rather than restating its keys. A
 * hand-typed key list cannot catch a newly added sport by construction — which
 * is exactly why the existing apps/web free-settlement-runner-map test (which
 * hard-codes all seven) would not have caught this.
 */
import { describe, expect, it } from "vitest";
import { SUPPORTED_SPORTS, isSportInSeason, type SupportedSportKey } from "../config.js";
import { SHORT_TO_ODDS_SPORT } from "../espn-schedule-seed.js";
import { ESPN_ODDS_SPORT_MAP } from "../espn-odds-client.js";
import { RUNDOWN_SPORT_IDS } from "../rundown-client.js";
import {
  NFL_PRESEASON_ODDS_KEY,
  NFL_CANONICAL_SPORT_KEY,
  isNflPreseasonFetchWindow,
} from "../nfl-preseason-map.js";

const SUPPORTED_KEYS = SUPPORTED_SPORTS.map((s) => s.key);

describe("SUPPORTED_SPORTS wiring — every sport is fully wired, not half-wired", () => {
  it("has at least one sport (guards against an empty iteration passing vacuously)", () => {
    expect(SUPPORTED_KEYS.length).toBeGreaterThan(0);
  });

  it.each(SUPPORTED_KEYS)("%s has an ESPN short-key seed path", (key) => {
    const entry = Object.values(SHORT_TO_ODDS_SPORT).find((v) => v.key === key);
    expect(entry, `no SHORT_TO_ODDS_SPORT entry maps to ${key}`).toBeTruthy();
    expect(entry!.espnPath, `${key} has an empty espnPath`).toBeTruthy();
  });

  it.each(SUPPORTED_KEYS)("%s has an ESPN odds path", (key) => {
    expect(ESPN_ODDS_SPORT_MAP[key], `ESPN_ODDS_SPORT_MAP is missing ${key}`).toBeTruthy();
  });

  it.each(SUPPORTED_KEYS)("%s has a Rundown failover sport id", (key) => {
    const id = RUNDOWN_SPORT_IDS[key];
    expect(id, `RUNDOWN_SPORT_IDS is missing ${key}`).toBeDefined();
    expect(Number.isInteger(id)).toBe(true);
  });

  it.each(SUPPORTED_KEYS)("%s has a real season window, not an implicit always-open", (key) => {
    // isSportInSeason returns true for an UNKNOWN key (`if (!w) return true`),
    // so an all-twelve-months result is the signature of a missing window
    // rather than a genuinely year-round sport.
    const monthsInSeason = Array.from({ length: 12 }, (_, i) =>
      isSportInSeason(key as SupportedSportKey, new Date(Date.UTC(2026, i, 15))),
    ).filter(Boolean).length;
    expect(monthsInSeason, `${key} is in season all 12 months — SEASON_WINDOWS entry missing?`)
      .toBeLessThan(12);
    expect(monthsInSeason, `${key} is never in season`).toBeGreaterThan(0);
  });

  it("every ESPN short key points at a real SupportedSportKey (no stale/typo keys)", () => {
    for (const [short, meta] of Object.entries(SHORT_TO_ODDS_SPORT)) {
      expect(SUPPORTED_KEYS, `SHORT_TO_ODDS_SPORT.${short} -> unknown sport ${meta.key}`)
        .toContain(meta.key);
    }
  });
});

describe("NFL preseason ingestion key (C-36)", () => {
  it("is NOT a board sport — it is ingestion-only", () => {
    // The whole point of the remap: preseason odds attach to EXISTING
    // americanfootball_nfl games. Promoting the preseason key to a board sport
    // would create a parallel sport with no games, no ESPN path and no runner.
    expect(SUPPORTED_KEYS).not.toContain(NFL_PRESEASON_ODDS_KEY as never);
    expect(SHORT_TO_ODDS_SPORT).not.toHaveProperty(NFL_PRESEASON_ODDS_KEY);
  });

  it("remaps onto a canonical sport that IS fully wired", () => {
    expect(SUPPORTED_KEYS).toContain(NFL_CANONICAL_SPORT_KEY);
  });

  it("NFL is first in SUPPORTED_SPORTS, so the low-quota bail cannot starve it", () => {
    // refresh-odds.ts breaks out of the sport loop when remaining Odds API
    // credits fall below ODDS_API_LOW_QUOTA_THRESHOLD. Order therefore decides
    // who gets skipped in a tight month; NFL must never be the one dropped.
    expect(SUPPORTED_KEYS[0]).toBe(NFL_CANONICAL_SPORT_KEY);
  });

  it("fetches preseason in July and August only", () => {
    expect(isNflPreseasonFetchWindow(new Date("2026-07-15T00:00:00Z"))).toBe(true);
    expect(isNflPreseasonFetchWindow(new Date("2026-08-26T00:00:00Z"))).toBe(true);
    expect(isNflPreseasonFetchWindow(new Date("2026-09-05T00:00:00Z"))).toBe(false);
    expect(isNflPreseasonFetchWindow(new Date("2026-06-30T00:00:00Z"))).toBe(false);
  });

  it("NFL is in season during the Week-1 run-up (the C-35 regression)", () => {
    // SEASON_WINDOWS gated NFL to Sep-Feb, so getInSeasonSports filtered NFL
    // out of every 15-minute refresh for all of August — the exact weeks Week 1
    // lines post. L-14 measured the cost: NFL 0 clean closes.
    for (const day of ["2026-08-01", "2026-08-26", "2026-09-03"]) {
      expect(isSportInSeason("americanfootball_nfl", new Date(`${day}T12:00:00Z`)), day).toBe(true);
    }
  });
});
