import { describe, expect, it } from "vitest";
import {
  SYNTHETIC_GAME_TABLE_SCHEMA, EMBEDDING_DIMS, omegaCol, omegaRow,
  GSE_EMBEDDING_DIFFUSION_ENABLED,
} from "./synthetic-game-table-schema-2309.js";

const rows = [
  { team: 1, opponent: 2, venue_type: 0, surface: 1, weather_bin: 0, rest_category: 1, home_flag: 1, points_for: 24, points_against: 17, spread: -3, total: 44, elo_diff: 60 },
  { team: 3, opponent: 4, venue_type: 1, surface: 0, weather_bin: 2, rest_category: 0, home_flag: 0, points_for: 13, points_against: 20, spread: 7, total: 41, elo_diff: -40 },
];

describe("synthetic game-table schema", () => {
  it("covers the paper's categorical set with D in {8,16}", () => {
    const cats = SYNTHETIC_GAME_TABLE_SCHEMA.filter((c) => c.kind === "categorical");
    expect(cats.map((c) => c.name)).toContain("team");
    expect(cats.every((c) => c.embeddingDim !== undefined && (EMBEDDING_DIMS as readonly number[]).includes(c.embeddingDim))).toBe(true);
  });
  it("omega_col is 1 on identical tables", () => {
    expect(omegaCol(rows, rows)).toBeCloseTo(1, 10);
  });
  it("omega_row is 1 when synthetic equals real", () => {
    expect(omegaRow(rows, rows)).toBe(1);
  });
  it("returns 0 on empty input", () => {
    expect(omegaRow([], rows)).toBe(0);
    expect(omegaRow(rows, [])).toBe(0);
  });
  it("stays off until fidelity gates clear", () => {
    expect(GSE_EMBEDDING_DIFFUSION_ENABLED).toBe(false);
  });
});

