import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadSgpProjections,
  parseSgpProjections,
} from "@/lib/sgp/load-sgp-projections";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "sgp-projections-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function write(name: string, contents: string): string {
  const file = join(dir, name);
  writeFileSync(file, contents, "utf8");
  return file;
}

describe("loadSgpProjections", () => {
  it("returns an empty result with NO_DATA_FILE when the file is missing", () => {
    const result = loadSgpProjections(join(dir, "does-not-exist.json"));
    expect(result.reason).toBe("NO_DATA_FILE");
    expect(result.games).toEqual([]);
    expect(result.rows).toEqual([]);
    expect(result.generatedAt).toBeNull();
  });

  it("returns an empty result with PARSE_ERROR for malformed JSON", () => {
    const file = write("bad.json", "{ not json");
    const result = loadSgpProjections(file);
    expect(result.reason).toBe("PARSE_ERROR");
    expect(result.games).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it("returns an empty result with PARSE_ERROR for a wrong top level shape", () => {
    const file = write("wrong.json", JSON.stringify({ games: "nope" }));
    const result = loadSgpProjections(file);
    expect(result.reason).toBe("PARSE_ERROR");
    expect(result.rows).toEqual([]);
  });

  it("returns an empty result with EMPTY for the honest empty shape", () => {
    const file = write(
      "empty.json",
      JSON.stringify({ generatedAt: null, games: [] }),
    );
    const result = loadSgpProjections(file);
    expect(result.reason).toBe("EMPTY");
    expect(result.games).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it("returns rows for a valid file, grouped by game", () => {
    const file = write(
      "valid.json",
      JSON.stringify({
        generatedAt: "2026-10-12T12:00:00.000Z",
        games: [
          {
            game: "Buffalo Bills at Los Angeles Rams",
            commenceTime: "2026-10-12T17:00:00.000Z",
            rows: [
              { market: "Example market one", projectionPct: 11.8 },
              { market: "Example market two", projectionPct: 4.2 },
            ],
          },
        ],
      }),
    );
    const result = loadSgpProjections(file);
    expect(result.reason).toBeNull();
    expect(result.generatedAt).toBe("2026-10-12T12:00:00.000Z");
    expect(result.games).toHaveLength(1);
    expect(result.games[0]?.game).toBe("Buffalo Bills at Los Angeles Rams");
    expect(result.games[0]?.rows).toHaveLength(2);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      game: "Buffalo Bills at Los Angeles Rams",
      commenceTime: "2026-10-12T17:00:00.000Z",
      market: "Example market one",
      projectionPct: 11.8,
    });
    expect(result.rows[1]?.projectionPct).toBe(4.2);
  });

  it("drops invalid rows and games instead of throwing", () => {
    const file = write(
      "partial.json",
      JSON.stringify({
        generatedAt: "2026-10-12T12:00:00.000Z",
        games: [
          {
            game: "Buffalo Bills at Los Angeles Rams",
            commenceTime: "2026-10-12T17:00:00.000Z",
            rows: [
              { market: "Example market one", projectionPct: 11.8 },
              { market: "", projectionPct: 10 },
              { market: "Example market two", projectionPct: "high" },
              { projectionPct: 5 },
              null,
            ],
          },
          { game: "", rows: [{ market: "Hidden", projectionPct: 1 }] },
          { rows: [] },
          null,
        ],
      }),
    );
    const result = loadSgpProjections(file);
    expect(result.reason).toBeNull();
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.market).toBe("Example market one");
    expect(result.games).toHaveLength(1);
  });

  it("never throws on an empty file", () => {
    const file = write("blank.json", "");
    const result = loadSgpProjections(file);
    expect(result.reason).toBe("EMPTY");
    expect(result.rows).toEqual([]);
  });
});

describe("parseSgpProjections", () => {
  it("returns PARSE_ERROR for non-object input", () => {
    expect(parseSgpProjections(null).reason).toBe("PARSE_ERROR");
    expect(parseSgpProjections([]).reason).toBe("PARSE_ERROR");
    expect(parseSgpProjections("x").reason).toBe("PARSE_ERROR");
  });

  it("returns EMPTY when every row is invalid", () => {
    const result = parseSgpProjections({
      generatedAt: null,
      games: [
        {
          game: "Buffalo Bills at Los Angeles Rams",
          commenceTime: "2026-10-12T17:00:00.000Z",
          rows: [{ market: "Example", projectionPct: Number.NaN }],
        },
      ],
    });
    expect(result.reason).toBe("EMPTY");
    expect(result.rows).toEqual([]);
  });
});

describe("parseSgpProjections reviewer hardening (3a/3b/3c)", () => {
  it("drops a row with projectionPct above 100 (150)", () => {
    const result = parseSgpProjections({
      generatedAt: null,
      games: [
        {
          game: "Buffalo Bills at Los Angeles Rams",
          commenceTime: "2026-10-12T17:00:00.000Z",
          rows: [
            { market: "Too high", projectionPct: 150 },
            { market: "Astronomical", projectionPct: 1e21 },
            { market: "Valid", projectionPct: 42.5 },
          ],
        },
      ],
    });
    expect(result.reason).toBeNull();
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.market).toBe("Valid");
    expect(result.rows[0]?.projectionPct).toBe(42.5);
  });

  it("drops a row with projectionPct below 0 (-20)", () => {
    const result = parseSgpProjections({
      generatedAt: null,
      games: [
        {
          game: "Buffalo Bills at Los Angeles Rams",
          commenceTime: "2026-10-12T17:00:00.000Z",
          rows: [
            { market: "Too low", projectionPct: -20 },
            { market: "Valid", projectionPct: 42.5 },
          ],
        },
      ],
    });
    expect(result.reason).toBeNull();
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.market).toBe("Valid");
  });

  it("keeps the boundary projectionPct values 0 and 100", () => {
    const result = parseSgpProjections({
      generatedAt: null,
      games: [
        {
          game: "Buffalo Bills at Los Angeles Rams",
          commenceTime: "2026-10-12T17:00:00.000Z",
          rows: [
            { market: "Floor", projectionPct: 0 },
            { market: "Ceiling", projectionPct: 100 },
          ],
        },
      ],
    });
    expect(result.reason).toBeNull();
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.projectionPct).toBe(0);
    expect(result.rows[1]?.projectionPct).toBe(100);
  });

  it("drops a game whose name exceeds the length cap", () => {
    const result = parseSgpProjections({
      generatedAt: null,
      games: [
        {
          game: "G".repeat(301),
          commenceTime: "2026-10-12T17:00:00.000Z",
          rows: [{ market: "Valid", projectionPct: 42.5 }],
        },
        {
          game: "Buffalo Bills at Los Angeles Rams",
          commenceTime: "2026-10-12T17:00:00.000Z",
          rows: [{ market: "Also valid", projectionPct: 10 }],
        },
      ],
    });
    expect(result.reason).toBeNull();
    expect(result.games).toHaveLength(1);
    expect(result.games[0]?.game).toBe("Buffalo Bills at Los Angeles Rams");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.market).toBe("Also valid");
  });

  it("drops a row whose market exceeds the length cap", () => {
    const result = parseSgpProjections({
      generatedAt: null,
      games: [
        {
          game: "Buffalo Bills at Los Angeles Rams",
          commenceTime: "2026-10-12T17:00:00.000Z",
          rows: [
            { market: "M".repeat(100_000), projectionPct: 42.5 },
            { market: "Valid", projectionPct: 10 },
          ],
        },
      ],
    });
    expect(result.reason).toBeNull();
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.market).toBe("Valid");
    expect(result.games).toHaveLength(1);
    expect(result.games[0]?.rows).toHaveLength(1);
  });

  it("merges duplicate games by name, keeping first occurrence order", () => {
    const result = parseSgpProjections({
      generatedAt: null,
      games: [
        {
          game: "Buffalo Bills at Los Angeles Rams",
          commenceTime: "2026-10-12T17:00:00.000Z",
          rows: [{ market: "First", projectionPct: 10 }],
        },
        {
          game: "Kansas City Chiefs at Denver Broncos",
          commenceTime: "2026-10-12T20:00:00.000Z",
          rows: [{ market: "Other game", projectionPct: 20 }],
        },
        {
          game: "Buffalo Bills at Los Angeles Rams",
          commenceTime: "2026-10-12T17:00:00.000Z",
          rows: [{ market: "Duplicate entry row", projectionPct: 30 }],
        },
      ],
    });
    expect(result.reason).toBeNull();
    expect(result.games).toHaveLength(2);
    expect(result.games[0]?.game).toBe("Buffalo Bills at Los Angeles Rams");
    expect(result.games[0]?.commenceTime).toBe("2026-10-12T17:00:00.000Z");
    expect(result.games[0]?.rows.map((row) => row.market)).toEqual([
      "First",
      "Duplicate entry row",
    ]);
    expect(result.games[1]?.game).toBe(
      "Kansas City Chiefs at Denver Broncos",
    );
    expect(result.rows).toHaveLength(3);
    expect(result.rows.map((row) => row.market)).toEqual([
      "First",
      "Duplicate entry row",
      "Other game",
    ]);
  });
});
