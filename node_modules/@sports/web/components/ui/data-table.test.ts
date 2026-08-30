import { describe, it, expect } from "vitest";
import {
  type Column,
  columnSortValue,
  compareValues,
  sortRows,
  matchesQuery,
  filterRows,
  nextSort,
} from "./data-table";

interface PlayerRow {
  name: string;
  team: string;
  position: string;
  pprPerGame: number;
  gap: number | null;
}

const ROWS: PlayerRow[] = [
  { name: "Aiyuk", team: "SF", position: "WR", pprPerGame: 18.2, gap: 0.4 },
  { name: "Brown", team: "PHI", position: "WR", pprPerGame: 22.1, gap: null },
  { name: "Kelce", team: "KC", position: "TE", pprPerGame: 15.0, gap: -0.3 },
  { name: "Henry", team: "BAL", position: "RB", pprPerGame: 18.2, gap: 1.1 },
];

const NAME_COL: Column<PlayerRow> = { key: "name", label: "Player" };
const PPR_COL: Column<PlayerRow> = { key: "pprPerGame", label: "PPR/G", align: "right" };
const GAP_COL: Column<PlayerRow> = {
  key: "gap",
  label: "Gap",
  align: "right",
  sortValue: (r) => r.gap,
};
const COLUMNS: Column<PlayerRow>[] = [NAME_COL, PPR_COL, GAP_COL];

const [aiyuk, brown] = ROWS as [PlayerRow, PlayerRow, ...PlayerRow[]];

describe("columnSortValue", () => {
  it("uses sortValue when provided, falling back to the keyed field", () => {
    expect(columnSortValue(NAME_COL, aiyuk)).toBe("Aiyuk");
    expect(columnSortValue(PPR_COL, aiyuk)).toBe(18.2);
    expect(columnSortValue(GAP_COL, brown)).toBeNull(); // gap null via sortValue
  });
});

describe("compareValues", () => {
  it("sorts numbers numerically respecting direction", () => {
    expect(compareValues(1, 2, "asc")).toBeLessThan(0);
    expect(compareValues(1, 2, "desc")).toBeGreaterThan(0);
  });

  it("sorts strings with numeric-aware locale compare", () => {
    expect(compareValues("a", "b", "asc")).toBeLessThan(0);
    // numeric-aware: "10" should sort after "2"
    expect(compareValues("2", "10", "asc")).toBeLessThan(0);
  });

  it("always sinks nulls to the bottom regardless of direction", () => {
    expect(compareValues(null, 5, "asc")).toBeGreaterThan(0);
    expect(compareValues(null, 5, "desc")).toBeGreaterThan(0);
    expect(compareValues(5, null, "asc")).toBeLessThan(0);
    expect(compareValues(5, null, "desc")).toBeLessThan(0);
    expect(compareValues(null, null, "asc")).toBe(0);
  });
});

describe("sortRows", () => {
  it("returns a new array and does not mutate the input", () => {
    const out = sortRows(ROWS, COLUMNS, { key: "pprPerGame", dir: "desc" });
    expect(out).not.toBe(ROWS);
    expect(ROWS[0]?.name).toBe("Aiyuk"); // original order intact
  });

  it("sorts descending by a numeric column", () => {
    const out = sortRows(ROWS, COLUMNS, { key: "pprPerGame", dir: "desc" });
    expect(out.map((r) => r.name)).toEqual(["Brown", "Aiyuk", "Henry", "Kelce"]);
  });

  it("is stable on ties (preserves source order)", () => {
    // Aiyuk and Henry both 18.2 -> Aiyuk (idx 0) stays ahead of Henry (idx 3)
    const out = sortRows(ROWS, COLUMNS, { key: "pprPerGame", dir: "desc" });
    const aiyuk = out.findIndex((r) => r.name === "Aiyuk");
    const henry = out.findIndex((r) => r.name === "Henry");
    expect(aiyuk).toBeLessThan(henry);
  });

  it("sinks null sort values to the bottom in both directions", () => {
    const asc = sortRows(ROWS, COLUMNS, { key: "gap", dir: "asc" });
    const desc = sortRows(ROWS, COLUMNS, { key: "gap", dir: "desc" });
    expect(asc.at(-1)?.name).toBe("Brown"); // gap null
    expect(desc.at(-1)?.name).toBe("Brown");
  });

  it("returns input order when no sort or unknown column", () => {
    expect(sortRows(ROWS, COLUMNS, null).map((r) => r.name)).toEqual(
      ROWS.map((r) => r.name),
    );
    expect(
      sortRows(ROWS, COLUMNS, { key: "nope", dir: "asc" }).map((r) => r.name),
    ).toEqual(ROWS.map((r) => r.name));
  });
});

describe("matchesQuery", () => {
  it("matches case-insensitively and ignores surrounding whitespace", () => {
    expect(matchesQuery("A.J. Brown", "brown")).toBe(true);
    expect(matchesQuery("A.J. Brown", "  BROWN ")).toBe(true);
    expect(matchesQuery("A.J. Brown", "kelce")).toBe(false);
  });

  it("treats an empty query as match-all", () => {
    expect(matchesQuery("anything", "")).toBe(true);
    expect(matchesQuery("anything", "   ")).toBe(true);
  });
});

describe("filterRows", () => {
  const search = (r: PlayerRow) => `${r.name} ${r.team}`;
  const enumAcc = (r: PlayerRow) => r.position;

  it("filters by free-text search across the accessor", () => {
    const out = filterRows(ROWS, { query: "PHI", searchAccessor: search });
    expect(out.map((r) => r.name)).toEqual(["Brown"]);
  });

  it("filters by enum value", () => {
    const out = filterRows(ROWS, { enumValue: "WR", enumAccessor: enumAcc });
    expect(out.map((r) => r.name)).toEqual(["Aiyuk", "Brown"]);
  });

  it("treats 'all' / empty enum as no enum filter", () => {
    expect(filterRows(ROWS, { enumValue: "all", enumAccessor: enumAcc })).toHaveLength(4);
    expect(filterRows(ROWS, { enumValue: "", enumAccessor: enumAcc })).toHaveLength(4);
  });

  it("ANDs free-text and enum filters together", () => {
    const out = filterRows(ROWS, {
      query: "Brown",
      searchAccessor: search,
      enumValue: "WR",
      enumAccessor: enumAcc,
    });
    expect(out.map((r) => r.name)).toEqual(["Brown"]);
  });
});

describe("nextSort", () => {
  it("defaults a freshly-clicked column to descending", () => {
    expect(nextSort(null, "ppr")).toEqual({ key: "ppr", dir: "desc" });
    expect(nextSort({ key: "name", dir: "asc" }, "ppr")).toEqual({
      key: "ppr",
      dir: "desc",
    });
  });

  it("toggles direction when the same column is clicked again", () => {
    expect(nextSort({ key: "ppr", dir: "desc" }, "ppr")).toEqual({
      key: "ppr",
      dir: "asc",
    });
    expect(nextSort({ key: "ppr", dir: "asc" }, "ppr")).toEqual({
      key: "ppr",
      dir: "desc",
    });
  });
});
