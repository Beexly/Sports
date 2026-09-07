import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CORRUPTED_POPULATIONS,
  EXECUTE_BLOCKED_POPULATIONS,
  parseUnpublishArgs,
  isOnRunLineLadder,
  narrow,
  reasonFor,
  summarize,
  whereFor,
  type CorruptedPickRow,
} from "../../../scripts/ops/lib/corrupted-pick-selection";

/**
 * The selection is the dangerous half of a remediation tool: it decides which
 * production rows get written. Every value below is a labelled fixture.
 */

const row = (over: Partial<CorruptedPickRow> & Pick<CorruptedPickRow, "id">): CorruptedPickRow => ({
  gameId: "game-fixture",
  pickType: "MONEYLINE",
  selection: "Fixture Home Sox ML",
  line: null,
  result: "WIN",
  settledAt: new Date("2026-09-01T00:00:00.000Z"),
  commenceTime: new Date("2026-09-01T18:00:00.000Z"),
  sportKey: "baseball_mlb",
  modelVersion: "v5.2.7",
  ...over,
});

describe("corrupted-pick selection — settled-before-kickoff (C-114)", () => {
  it("selects a pick graded before its own kickoff", () => {
    const out = narrow("settled-before-kickoff", [
      row({ id: "bad", settledAt: new Date("2026-09-01T00:00:00.000Z") }),
    ]);
    expect(out.map((r) => r.id)).toEqual(["bad"]);
  });

  it("leaves a normally-settled pick alone", () => {
    // The whole population is defined by settledAt < commenceTime, so a pick
    // graded AFTER kickoff must never be selected. This is the control that
    // stops the tool unpublishing the healthy board.
    const out = narrow("settled-before-kickoff", [
      row({ id: "good", settledAt: new Date("2026-09-01T21:30:00.000Z") }),
    ]);
    expect(out).toHaveLength(0);
  });

  it("leaves an ungraded pick alone", () => {
    const out = narrow("settled-before-kickoff", [row({ id: "pending", settledAt: null, result: "PENDING" })]);
    expect(out).toHaveLength(0);
  });

  it("leaves a rescheduled postponement's VOID alone", () => {
    // A postponed fixture settles VOID with no score
    // (free-settlement.ts, POSTPONED_OR_CANCELLED), and the fixture is then
    // RESCHEDULED — which moves commenceTime past a settlement that was correct
    // when it was written. `settledAt < commenceTime` describes that row exactly
    // as well as it describes a C-114 phantom grade, and withdrawing it would
    // delete a true result from public history (Devin Review, #719). C-114
    // grades against a score nobody observed, which always yields W/L/PUSH.
    const out = narrow("settled-before-kickoff", [
      row({ id: "postponed-then-rescheduled", result: "VOID", settledAt: new Date("2026-09-01T00:00:00.000Z") }),
    ]);
    expect(out).toHaveLength(0);
  });

  it("excludes VOID at the query too, not only in memory", () => {
    // whereFor is the half that reaches the database. If only narrow excluded
    // VOID, the write-time recheck would still be free to widen the set.
    expect(whereFor("settled-before-kickoff")).toMatchObject({ result: { not: "VOID" } });
  });

  it("reports the lead time in the reason, so a reviewer can sanity-check a row", () => {
    const r = row({ id: "x", settledAt: new Date("2026-09-01T06:00:00.000Z") });
    expect(reasonFor("settled-before-kickoff", r)).toContain("12.0h BEFORE kickoff");
  });
});

describe("corrupted-pick selection — soccer two-way moneyline (C-118)", () => {
  it("selects a soccer moneyline", () => {
    const out = narrow("soccer-two-way-ml", [
      row({ id: "s1", sportKey: "soccer_usa_mls", pickType: "MONEYLINE" }),
    ]);
    expect(out.map((r) => r.id)).toEqual(["s1"]);
  });

  it("leaves a soccer TOTAL alone — the three-way problem is moneyline-only", () => {
    const out = narrow("soccer-two-way-ml", [
      row({ id: "s2", sportKey: "soccer_usa_mls", pickType: "TOTAL" }),
    ]);
    expect(out).toHaveLength(0);
  });

  it("leaves a non-soccer moneyline alone", () => {
    const out = narrow("soccer-two-way-ml", [row({ id: "m1", sportKey: "baseball_mlb" })]);
    expect(out).toHaveLength(0);
  });
});

describe("corrupted-pick selection — MLB spreads off the run-line ladder (C-125)", () => {
  it("accepts every real run line, either side", () => {
    for (const line of [1.5, 2.5, 3.5]) {
      expect(isOnRunLineLadder(line)).toBe(true);
      expect(isOnRunLineLadder(-line)).toBe(true);
    }
  });

  it("selects the contaminated means measured on production", () => {
    const out = narrow(
      "mlb-off-runline",
      [1.833333333333333, 0.6818181818181818, 1.227272727272727, 4.5].map((line, i) =>
        row({ id: `off-${i}`, pickType: "SPREAD", line }),
      ),
    );
    expect(out).toHaveLength(4);
  });

  it("leaves a legitimate 1.5 run line alone", () => {
    const out = narrow("mlb-off-runline", [row({ id: "ok", pickType: "SPREAD", line: -1.5 })]);
    expect(out).toHaveLength(0);
  });

  it("leaves another sport's spread alone — the ladder is baseball-only", () => {
    // NCAAF -3.1667 is a legitimate consensus mean. A blanket must-be-quoted
    // rule would gut the football board, which is why this is sport-scoped.
    const out = narrow("mlb-off-runline", [
      row({ id: "ncaaf", sportKey: "americanfootball_ncaaf", pickType: "SPREAD", line: -3.1666666666666665 }),
    ]);
    expect(out).toHaveLength(0);
  });

  it("tolerates float drift on a mean that lands on a real rung", () => {
    expect(isOnRunLineLadder((1.5 + 1.5 + 1.5) / 3)).toBe(true);
  });
});

describe("corrupted-pick selection — shared contract", () => {
  it("every population's query is scoped to PUBLISHED rows only", () => {
    // An unpublished row is already withdrawn; touching it again would be an
    // unscoped write, which is the thing this tool must never be.
    for (const p of CORRUPTED_POPULATIONS) {
      expect(whereFor(p)).toMatchObject({ isPublished: true });
    }
  });

  it("summarize reports the ids it will write, so the dry run is auditable", () => {
    const s = summarize("mlb-off-runline", [row({ id: "a", pickType: "SPREAD", line: 4.5 })]);
    expect(s).toMatchObject({ population: "mlb-off-runline", count: 1, pickIds: ["a"] });
  });
});

describe("the WRITE re-validates, for every population", () => {
  /**
   * These assert on the source of the remediation tool rather than on its
   * behaviour, and that limitation is stated rather than hidden: the writes are
   * raw SQL and there is no database in this suite, so the SQL itself is NOT
   * EXERCISED here. What these DO pin is the invariant that was violated — that
   * every population re-checks its own predicate inside the write — so deleting
   * a guard fails a test instead of silently shipping.
   *
   * The invariant matters because it has already been wrong twice. The first
   * revision re-checked nothing; the second re-checked only the time-sensitive
   * population, on my stated reasoning that the others "key on immutable facts,
   * the sport and the pick's own line". That was false: process-sport.ts
   * refreshes `line` on every ingestion cycle for picks that already exist, so
   * an off-ladder run line can become valid between select and write and the
   * tool would withdraw a pick that is no longer corrupt. CodeRabbit and Devin
   * Review found it independently on #719.
   */
  const source = readFileSync(
    resolve(__dirname, "../../../scripts/ops/unpublish-corrupted-picks.ts"),
    "utf8",
  );

  const updateFor = (population: string): string => {
    const start = source.indexOf(`case "${population}":`);
    expect(start).toBeGreaterThan(-1);
    const rest = source.slice(start);
    const end = rest.indexOf("`;");
    expect(end).toBeGreaterThan(-1);
    return rest.slice(0, end);
  };

  it("guards every write on isPublished, so a second run is a no-op", () => {
    for (const population of CORRUPTED_POPULATIONS) {
      expect(updateFor(population)).toContain(`p."isPublished" = true`);
    }
  });

  it("binds the id list as a postgres text array, not a bare parameter", () => {
    // Pick.id is `text` and Prisma binds the array as ONE parameter, so ANY()
    // needs the element type spelled out (CodeRabbit, #719).
    for (const population of CORRUPTED_POPULATIONS) {
      expect(updateFor(population)).toContain("ANY(${idList}::text[])");
    }
  });

  it("re-checks the settled-before-kickoff predicate against the CURRENT game row", () => {
    const sql = updateFor("settled-before-kickoff");
    expect(sql).toContain(`p."settledAt" < g."commenceTime"`);
    expect(sql).toContain(`p.result <> 'VOID'`);
  });

  it("re-checks the soccer predicate rather than trusting the selection", () => {
    const sql = updateFor("soccer-two-way-ml");
    expect(sql).toContain(`p."pickType" = 'MONEYLINE'`);
    expect(sql).toContain("s.key LIKE 'soccer%'");
  });

  it("re-checks the MLB run line against the CURRENT line, which is mutable", () => {
    const sql = updateFor("mlb-off-runline");
    expect(sql).toContain(`p."pickType" = 'SPREAD'`);
    expect(sql).toContain("s.key = 'baseball_mlb'");
    // Driven by MLB_RUN_LINES so the SQL and the in-memory selector cannot drift.
    expect(sql).toContain("unnest(${[...MLB_RUN_LINES]}::double precision[])");
    expect(sql).toContain("abs(abs(p.line) - valid)");
  });
});

describe("--execute is BLOCKED for the settled-before-kickoff population", () => {
  /**
   * A comment is not a guard. The do-not-run finding was first written as prose
   * at the top of the CLI while `--execute` stayed fully wired, so
   * `--population all --execute` would still have unpublished the rows the prose
   * said to leave alone (Devin Review, #719, rated red). These tests exist so
   * the warning cannot drift back into being decorative.
   *
   * The population is blocked because 3 of 4 rows spot-checked against ESPN
   * ground truth carry a CORRECT stored result.
   */
  it("names the blocked population", () => {
    expect(EXECUTE_BLOCKED_POPULATIONS).toContain("settled-before-kickoff");
  });

  it("refuses --execute when the population is named directly", () => {
    const r = parseUnpublishArgs(["--population", "settled-before-kickoff", "--execute"]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("BLOCKED");
  });

  it("refuses --execute for `all` too — all is not an escape hatch", () => {
    const r = parseUnpublishArgs(["--population", "all", "--execute"]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("settled-before-kickoff");
  });

  it("still allows a DRY RUN of the blocked population", () => {
    // Inspecting it is how the founder makes the re-grading decision, so the
    // block must not hide the data.
    const r = parseUnpublishArgs(["--population", "settled-before-kickoff"]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.args.execute).toBe(false);
  });

  it("still allows --execute for the populations that are NOT blocked", () => {
    // The control: a block that stopped everything would also pass the tests
    // above while destroying the tool.
    for (const population of ["soccer-two-way-ml", "mlb-off-runline"]) {
      const r = parseUnpublishArgs(["--population", population, "--execute"]);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.args.execute).toBe(true);
    }
  });
});
