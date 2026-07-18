/**
 * B3 — the strict as-of previous-runs loader (weather-previous-runs.ts): the
 * wiring DEC-023's smoke gate opened. Proves the conservative run-selection
 * rule (N = max(1, ceil(lead/24)), never smaller, unavailable past the API
 * window), the fixture-driven extraction of `<var>_previous_dayN` fields, the
 * shared leak guard/indoor semantics with the vendored loader, and the ONE
 * canonical downstream path: this loader's output flows through the SAME
 * toGameWeatherForecast adapter and buildWeatherFeatureRows leak gate
 * unchanged.
 */
import { describe, expect, it, vi } from "vitest";
import { AsOfFeatureStore } from "../asof-store.js";
import type { GameRow } from "../game-row.js";
import { buildWeatherFeatureRows } from "../features/nfl-weather.js";
import { toGameWeatherForecast } from "../features/weather-edge-adapter.js";
import { __internals, type StadiumSite } from "../loaders/weather-edge.js";
import {
  MAX_PREVIOUS_DAYS,
  buildPreviousRunsUrl,
  getAsOfGameWeatherPreviousRuns,
  previousDayN,
} from "../loaders/weather-previous-runs.js";

const LAMBEAU: StadiumSite = { name: "Lambeau Field", latitude: 44.5013, longitude: -88.0622, isIndoor: false };
const DOME: StadiumSite = { name: "Ford Field", latitude: 42.34, longitude: -83.0456, isIndoor: true };

const KICKOFF = "2026-12-13T18:00:00.000Z";
const AS_OF_2H = "2026-12-13T16:00:00.000Z";
const AS_OF_30H = "2026-12-12T12:00:00.000Z";

/** A previous-runs response for day-N with distinct values per variable. */
function previousRunsResponse(n: number) {
  const suffix = `_previous_day${n}`;
  return {
    hourly: {
      time: ["2026-12-13T17:00", "2026-12-13T18:00", "2026-12-13T19:00"],
      [`temperature_2m${suffix}`]: [20, 22, 21],
      [`wind_speed_10m${suffix}`]: [15, 18, 16],
      [`wind_gusts_10m${suffix}`]: [25, 30, 26],
      [`wind_direction_10m${suffix}`]: [270, 280, 275],
      [`precipitation${suffix}`]: [0, 0.1, 0],
      [`precipitation_probability${suffix}`]: [10, 40, 20],
    },
  };
}

describe("previousDayN — the conservative run-selection rule", () => {
  it("never selects a run newer than the lead time implies, and never day0", () => {
    expect(previousDayN(0)).toBe(1); // day0 IS the current run — can postdate the freeze
    expect(previousDayN(2)).toBe(1);
    expect(previousDayN(24)).toBe(1);
    expect(previousDayN(25)).toBe(2); // 25h lead: day1 (24h) could postdate asOf — round OLDER
    expect(previousDayN(47)).toBe(2);
    expect(previousDayN(48)).toBe(2);
    expect(previousDayN(49)).toBe(3);
    expect(previousDayN(MAX_PREVIOUS_DAYS * 24)).toBe(MAX_PREVIOUS_DAYS);
  });

  it("beyond the API window returns null — honest unavailable, never a leaky smaller N", () => {
    expect(previousDayN(MAX_PREVIOUS_DAYS * 24 + 1)).toBeNull();
  });

  it("MUST be fed the exact lead — rounding it first would select a run issued after the freeze", () => {
    // A 24.4h exact lead ROUNDS to 24h; ceil(24/24)=1 would (wrongly) select
    // _previous_day1, whose run is initialized ~24h before the valid hour —
    // i.e. AFTER the true, unrounded 24.4h-earlier freeze instant. Fed the
    // exact value, ceil(24.4/24)=2 correctly rounds toward the OLDER run.
    expect(previousDayN(24.4)).toBe(2);
    expect(previousDayN(24.0)).toBe(1); // exactly on the boundary: day1's run IS knowable at asOf
    expect(previousDayN(23.99)).toBe(1);
  });
});

describe("getAsOfGameWeatherPreviousRuns", () => {
  it("throws the leak guard when asOf is after kickoff — same contract as the vendored loader", async () => {
    await expect(
      getAsOfGameWeatherPreviousRuns(
        { site: LAMBEAU, kickoffUtc: KICKOFF, asOfUtc: "2026-12-13T19:00:00.000Z" },
        { fetchJson: vi.fn() },
      ),
    ).rejects.toThrow(/Leak guard/);
  });

  it("indoor sites neutralize identically to the vendored loader — no fetch at all", async () => {
    const fetchJson = vi.fn();
    const result = await getAsOfGameWeatherPreviousRuns(
      { site: DOME, kickoffUtc: KICKOFF, asOfUtc: AS_OF_2H },
      { fetchJson },
    );
    expect(fetchJson).not.toHaveBeenCalled();
    expect(result.indoor).toBe(true);
    expect(result.source).toBe("indoor-neutral");
    expect(result.windMph).toBe(0);
    expect(result.candidateSignals.passingSuppressionIndex).toBe(0);
  });

  it("2h lead requests _previous_day1 and extracts the kickoff hour from the dayN arrays", async () => {
    const fetchJson = vi.fn().mockResolvedValue(previousRunsResponse(1));
    const result = await getAsOfGameWeatherPreviousRuns(
      { site: LAMBEAU, kickoffUtc: KICKOFF, asOfUtc: AS_OF_2H },
      { fetchJson },
    );
    const url = String(fetchJson.mock.calls[0]![0]);
    expect(url).toContain("previous-runs-api.open-meteo.com");
    expect(url).toContain("temperature_2m_previous_day1");
    expect(url).not.toContain("previous_day2");

    expect(result.available).toBe(true);
    expect(result.source).toBe("historical-forecast");
    expect(result.forecastValidHourUtc).toBe("2026-12-13T18:00");
    expect(result.tempF).toBe(22); // index 1 = the kickoff hour
    expect(result.windMph).toBe(18);
    expect(result.windGustMph).toBe(30);
    expect(result.precipProbPct).toBe(40);
    expect(result.provenance.api).toBe("open-meteo/previous-runs");
    expect(result.provenance.note).toContain("_previous_day1");
  });

  it("a fractional 24.4h lead (rounds to 24h) still requests _previous_day2, not the leaky day1", async () => {
    // Regression for the exact-vs-rounded selection bug: kickoff minus
    // 24h24m exactly. Math.round(24.4) === 24, and ceil(24/24) === 1 would
    // be wrong here — this proves the call site feeds previousDayN the
    // UNROUNDED lead.
    const fetchJson = vi.fn().mockResolvedValue(previousRunsResponse(2));
    const result = await getAsOfGameWeatherPreviousRuns(
      { site: LAMBEAU, kickoffUtc: KICKOFF, asOfUtc: "2026-12-12T17:36:00.000Z" },
      { fetchJson },
    );
    expect(String(fetchJson.mock.calls[0]![0])).toContain("temperature_2m_previous_day2");
    expect(String(fetchJson.mock.calls[0]![0])).not.toContain("previous_day1");
    expect(result.available).toBe(true);
  });

  it("30h lead conservatively requests _previous_day2, never day1", async () => {
    const fetchJson = vi.fn().mockResolvedValue(previousRunsResponse(2));
    const result = await getAsOfGameWeatherPreviousRuns(
      { site: LAMBEAU, kickoffUtc: KICKOFF, asOfUtc: AS_OF_30H },
      { fetchJson },
    );
    expect(String(fetchJson.mock.calls[0]![0])).toContain("temperature_2m_previous_day2");
    expect(result.available).toBe(true);
    expect(result.provenance.note).toContain("_previous_day2");
  });

  it("a lead beyond the API window degrades to honest unavailable without fetching", async () => {
    const fetchJson = vi.fn();
    const result = await getAsOfGameWeatherPreviousRuns(
      { site: LAMBEAU, kickoffUtc: KICKOFF, asOfUtc: "2026-12-05T18:00:00.000Z" }, // 8 days
      { fetchJson },
    );
    expect(fetchJson).not.toHaveBeenCalled();
    expect(result.available).toBe(false);
    expect(result.source).toBe("unavailable");
    expect(result.provenance.note).toContain("exceeds the previous-runs window");
  });

  it("fetch failure and missing kickoff hour both degrade to honest unavailable", async () => {
    const failed = await getAsOfGameWeatherPreviousRuns(
      { site: LAMBEAU, kickoffUtc: KICKOFF, asOfUtc: AS_OF_2H },
      { fetchJson: vi.fn().mockRejectedValue(new Error("upstream 502")) },
    );
    expect(failed.available).toBe(false);
    expect(failed.provenance.note).toContain("Upstream fetch failed");

    const wrongHours = await getAsOfGameWeatherPreviousRuns(
      { site: LAMBEAU, kickoffUtc: KICKOFF, asOfUtc: AS_OF_2H },
      { fetchJson: vi.fn().mockResolvedValue({ hourly: { time: ["2026-12-13T09:00"], temperature_2m_previous_day1: [10] } }) },
    );
    expect(wrongHours.available).toBe(false);
    expect(wrongHours.provenance.note).toContain("No hourly row");
  });

  it("candidate signals use the vendored loader's EXACT math — shared function, not a copy", async () => {
    const fetchJson = vi.fn().mockResolvedValue(previousRunsResponse(1));
    const result = await getAsOfGameWeatherPreviousRuns(
      { site: LAMBEAU, kickoffUtc: KICKOFF, asOfUtc: AS_OF_2H },
      { fetchJson },
    );
    const expected = __internals.candidateSignals({ windMph: 18, windGustMph: 30, precipInch: 0.1 });
    expect(result.candidateSignals).toEqual(expected);
  });

  it("end to end: previous-runs output flows through the SAME adapter + leak gate unchanged", async () => {
    const fetchJson = vi.fn().mockResolvedValue(previousRunsResponse(1));
    const wx = await getAsOfGameWeatherPreviousRuns(
      { site: LAMBEAU, kickoffUtc: KICKOFF, asOfUtc: AS_OF_2H },
      { fetchJson },
    );
    const forecast = toGameWeatherForecast(wx);
    expect(forecast).not.toBeNull();

    const game: GameRow = {
      gameId: "gb-chi-2026-w14",
      sport: "nfl",
      season: 2026,
      week: 14,
      startTime: KICKOFF,
      homeTeam: "GB",
      awayTeam: "CHI",
      homeScore: 24,
      awayScore: 17,
      closing: { moneylineHomeDecimal: 1.6, moneylineAwayDecimal: 2.5, spreadHome: -3.5, total: 43.5 },
    };
    const store = new AsOfFeatureStore();
    const result = buildWeatherFeatureRows([game], new Map([[game.gameId, forecast!]]), store);

    // asOf 2h pre-kickoff < the 1h decision cutoff → passes the leak gate.
    expect(result.skipped.leakyForecast).toBe(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.features.get("wx:wind_mph")).toBe(18);

    // And the same gate still DROPS a mis-timed call (asOf after the cutoff).
    const lateWx = await getAsOfGameWeatherPreviousRuns(
      { site: LAMBEAU, kickoffUtc: KICKOFF, asOfUtc: "2026-12-13T17:30:00.000Z" }, // 30min pre-kickoff, inside the 1h cutoff
      { fetchJson: vi.fn().mockResolvedValue(previousRunsResponse(1)) },
    );
    const lateForecast = toGameWeatherForecast(lateWx);
    const lateResult = buildWeatherFeatureRows([game], new Map([[game.gameId, lateForecast!]]), new AsOfFeatureStore());
    expect(lateResult.skipped.leakyForecast).toBe(1);
    expect(lateResult.rows).toHaveLength(0);
  });
});
