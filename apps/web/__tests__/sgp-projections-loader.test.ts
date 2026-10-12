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
