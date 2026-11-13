/**
 * Tests for the charting evidence loader.
 *
 * The fixture is a small in-memory TrendsFile with the REAL key names — the
 * 32-team artefact is never read here. No pressure-rate or block-win-rate
 * column exists in trends or ftn_charting_2026.parquet (verified with
 * hyparquet: 29 per-play columns, none pressure/hit/block), so a complete
 * ChartingRecord cannot be built honestly: loadCharting must return MISSING
 * naming the absent column. The sack-rate read itself is REAL and is asserted
 * directly through readSackRateAllowedPct; the loader's reason chain proves
 * which gate failed. A hits number must never land in a pressure field.
 */

import { describe, expect, it } from "vitest";
import { isPresent } from "@sports/prediction-engine/src/evidence/types.js";
import { CHARTING_SOURCE, loadCharting, readSackRateAllowedPct } from "./charting.js";
import { TrendsKeyError, type TrendsFile } from "./trends.js";

const GENERATED_AT = "2026-10-29T16:30:40Z";

/** REAL key present, plus a hits key that must never be read as pressure. */
const larRow = { team: "LAR", sack_rate_allowed_pct: 3.5, qb_hit_rate_allowed_pct: 13.69 };
/** Only the OLD bogus key — the loader must not accept it. */
const gbRow = { team: "GB", sack_rate_allowed: 4.1 };
/** No sack key at all. */
const carRow = { team: "CAR" };
/** Alias-keyed row: the artefact keys Washington as WAS, canonical is WSH. */
const wasRow = { team: "WAS", sack_rate_allowed_pct: 5.2 };

const fixture: TrendsFile = {
  generatedAt: GENERATED_AT,
  weeksCovered: [1, 2, 3, 4, 5, 6, 7],
  teams: { LAR: larRow, GB: gbRow, CAR: carRow, WAS: wasRow },
};

describe("readSackRateAllowedPct — the one sourceable charting field", () => {
  it("reads the REAL key sack_rate_allowed_pct and returns the measured value", () => {
    expect(readSackRateAllowedPct("LAR", larRow)).toBe(3.5);
  });

  it("throws TrendsKeyError naming the real key when only the OLD bogus key is present", () => {
    expect(() => readSackRateAllowedPct("GB", gbRow)).toThrow(TrendsKeyError);
    expect(() => readSackRateAllowedPct("GB", gbRow)).toThrow(/sack_rate_allowed_pct/);
  });

  it("throws when the key is absent entirely", () => {
    expect(() => readSackRateAllowedPct("CAR", carRow)).toThrow(/sack_rate_allowed_pct/);
  });
});

describe("loadCharting", () => {
  it("team with sack_rate_allowed_pct: sack gate passes (REAL read); record is MISSING only because no pressure-rate column exists", () => {
    const e = loadCharting("LAR", { trends: fixture });
    // The full ChartingRecord cannot be built: pressure/block columns absent.
    expect(isPresent(e)).toBe(false);
    expect(e.status).toBe("MISSING");
    if (e.status !== "MISSING") return;
    expect(e.reason).toBe("no pressure-rate column in trends or ftn_charting");
    // The sack key was read successfully — the reason must NOT blame it.
    expect(e.reason).not.toContain("sack_rate_allowed_pct");
    // The hits value (13.69) was never substituted into a pressure field.
    expect(e.source).toBe(CHARTING_SOURCE);
    // asOf reports the file's instant; the file covers weeks 1–7, not 1–9.
    expect(e.asOf).toBe(GENERATED_AT);
  });

  it("team missing sack_rate_allowed_pct: MISSING and the reason names the key", () => {
    const e = loadCharting("CAR", { trends: fixture });
    expect(e.status).toBe("MISSING");
    if (e.status !== "MISSING") return;
    expect(e.reason).toContain("sack_rate_allowed_pct");
    expect(e.reason).toContain("CAR");
    expect(e.asOf).toBe(GENERATED_AT);
  });

  it("row with only the OLD bogus key sack_rate_allowed is NOT accepted", () => {
    const e = loadCharting("GB", { trends: fixture });
    expect(e.status).toBe("MISSING");
    if (e.status !== "MISSING") return;
    // The loader asked for the real key and named it — it never read the bogus one.
    expect(e.reason).toContain("sack_rate_allowed_pct");
    expect(e.reason).not.toBe("no pressure-rate column in trends or ftn_charting");
  });

  it("resolves LA to the LAR row through canonicalTeamCode", () => {
    const e = loadCharting("LA", { trends: fixture });
    expect(e.status).toBe("MISSING");
    if (e.status !== "MISSING") return;
    expect(e.reason).toBe("no pressure-rate column in trends or ftn_charting");
  });

  it("resolves WSH to the alias-keyed WAS row (honest alias resolution, not a fallback)", () => {
    const e = loadCharting("WSH", { trends: fixture });
    expect(e.status).toBe("MISSING");
    if (e.status !== "MISSING") return;
    expect(e.reason).toBe("no pressure-rate column in trends or ftn_charting");
  });

  it("unknown team: MISSING, never a guess", () => {
    const e = loadCharting("XYZ", { trends: fixture });
    expect(e.status).toBe("MISSING");
    if (e.status !== "MISSING") return;
    expect(e.reason).toContain("unknown team");
  });

  it("team with no row: MISSING naming the team, never another team's data", () => {
    const e = loadCharting("BUF", { trends: fixture });
    expect(e.status).toBe("MISSING");
    if (e.status !== "MISSING") return;
    expect(e.reason).toBe("trends has no row for BUF");
  });

  it("conflicting alias rows are a conflict, never an arbitrary pick", () => {
    const conflicting: TrendsFile = {
      ...fixture,
      teams: { WAS: wasRow, WSH: { team: "WSH", sack_rate_allowed_pct: 9.9 } },
    };
    const e = loadCharting("WSH", { trends: conflicting });
    expect(e.status).toBe("MISSING");
    if (e.status !== "MISSING") return;
    expect(e.reason).toContain("conflicting rows for WSH");
  });

  it("unreadable trends file: MISSING with the read error, no defaults", () => {
    const e = loadCharting("LAR", { trendsPath: "does/not/exist.json" });
    expect(e.status).toBe("MISSING");
    if (e.status !== "MISSING") return;
    expect(e.reason).toContain("trends file unreadable");
  });
});
