/**
 * C-194. Property fuzz over the fixture collapse.
 *
 * `collapseGameRowsToFixtures` is the shared answer to a defect class this
 * repo has now hit FIVE times - a `take: N` applied before duplicate rows are
 * collapsed, so the cap is spent on duplicates and the surface silently shows
 * fewer real fixtures than it promises (C-153, C-161, C-169, C-170, C-171).
 * Example tests pin the five instances that were found. These pin the
 * ALGEBRA, so the sixth cannot be written without a test going red.
 *
 * The properties, and why each one is load-bearing:
 *   subset + no-dup   : output rows are input rows, each id at most once
 *   never-empty       : a non-empty board never collapses to nothing
 *   idempotence       : collapsing twice equals collapsing once - if this
 *                       fails the "fixtures" a cap is applied to are not a
 *                       fixed point and the cap is still wrong
 *   total             : unusable commenceTime is KEPT, never dropped, never
 *                       thrown on (both callers blank a public surface on a
 *                       throw)
 *   cap-after-collapse: slicing AFTER collapse yields the promised number of
 *                       FIXTURES; slicing before does not. Executable proof
 *                       the defect class is real, not folklore.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  collapseGameRowsToFixtures,
  type FixtureCollapseRow,
} from "../fixture-collapse.js";

/**
 * Two-speed fuzz. CI runs the fast tier on every push; the deep tier is opt-in
 * via DEEP_FUZZ=1 (nightly, or before a release) and multiplies every property
 * by 25. The fast tier is NOT the real coverage claim - it is the amount of
 * coverage that fits in a pre-merge budget. Stating both numbers is the point:
 * "we fuzz this" means nothing without the case count behind it.
 */
const DEEP = process.env.DEEP_FUZZ === "1";
const SCALE = DEEP ? 25 : 1;
const RUNS = 10_000 * SCALE;
const BASE_MS = Date.UTC(2026, 8, 13, 17, 0, 0);

type Row = FixtureCollapseRow & { readonly tag: string };

/**
 * Generate rows the way the table actually holds them: several writers keying
 * the SAME contest under different externalId shapes, plus unrelated contests.
 */
const arbRows = fc
  .array(
    fc.record({
      fixture: fc.integer({ min: 0, max: 6 }),
      writer: fc.constantFrom("espn", "odds", "kalshi", "manual"),
      skewMin: fc.integer({ min: -20, max: 20 }),
      picks: fc.integer({ min: 0, max: 5 }),
      odds: fc.integer({ min: 0, max: 30 }),
      ageDays: fc.integer({ min: 0, max: 40 }),
      flipped: fc.boolean(),
      badTime: fc.constantFrom(false, false, false, false, true),
    }),
    { minLength: 0, maxLength: 30 },
  )
  .map((specs) =>
    specs.map((s, i): Row => {
      const home = `Team H${s.fixture}`;
      const away = `Team A${s.fixture}`;
      return {
        id: `row-${i}`,
        tag: `f${s.fixture}`,
        externalId: `${s.writer}-${s.fixture}`,
        sportId: "nfl",
        homeTeamName: s.flipped ? away : home,
        awayTeamName: s.flipped ? home : away,
        commenceTime: s.badTime
          ? new Date(Number.NaN)
          : new Date(BASE_MS + s.fixture * 86_400_000 + s.skewMin * 60_000),
        createdAt: new Date(BASE_MS - s.ageDays * 86_400_000),
        mergedIntoGameId: null,
        sport: { key: "americanfootball_nfl" },
        _count: { picks: s.picks, odds: s.odds },
      };
    }),
  );

describe("collapseGameRowsToFixtures algebra (fuzz)", () => {
  it("returns a subset of its input, with no id twice", () => {
    fc.assert(
      fc.property(arbRows, (rows) => {
        const out = collapseGameRowsToFixtures(rows);
        const inputIds = new Set(rows.map((r) => r.id));
        const outIds = out.map((r) => r.id);
        expect(out.length).toBeLessThanOrEqual(rows.length);
        for (const id of outIds) expect(inputIds.has(id)).toBe(true);
        expect(new Set(outIds).size).toBe(outIds.length);
      }),
      { numRuns: RUNS },
    );
  });

  it("never collapses a non-empty board to nothing", () => {
    fc.assert(
      fc.property(arbRows, (rows) => {
        const out = collapseGameRowsToFixtures(rows);
        if (rows.length > 0) expect(out.length).toBeGreaterThan(0);
        else expect(out.length).toBe(0);
      }),
      { numRuns: RUNS },
    );
  });

  it("is idempotent: collapsing the result changes nothing", () => {
    // If this failed, the thing a cap is applied to would not be a fixed
    // point, and cap-after-collapse would still overcount.
    fc.assert(
      fc.property(arbRows, (rows) => {
        const once = collapseGameRowsToFixtures(rows);
        const twice = collapseGameRowsToFixtures(once);
        expect(twice.map((r) => r.id)).toEqual(once.map((r) => r.id));
      }),
      { numRuns: RUNS },
    );
  });

  it("is total: an unusable commenceTime is kept, not dropped and not thrown", () => {
    fc.assert(
      fc.property(arbRows, (rows) => {
        const out = collapseGameRowsToFixtures(rows);
        const unusable = rows.filter((r) => !Number.isFinite(r.commenceTime.getTime()));
        const outIds = new Set(out.map((r) => r.id));
        for (const r of unusable) {
          expect(outIds.has(r.id), `dropped unusable row ${r.id}`).toBe(true);
        }
      }),
      { numRuns: RUNS },
    );
  });

  it("never merges two rows that disagree about who is home", () => {
    // A flipped twin disagrees about the sign of every derived line. The
    // module's stated rule is: keep both, never guess an orientation.
    fc.assert(
      fc.property(arbRows, (rows) => {
        const out = collapseGameRowsToFixtures(rows);
        for (const a of out) {
          for (const b of out) {
            if (a.id === b.id) continue;
            const flipped =
              a.homeTeamName === b.awayTeamName && a.awayTeamName === b.homeTeamName;
            // Flipped pairs are ALLOWED to both survive; that is the point.
            // What must never happen is the reverse - a same-orientation
            // duplicate of the same fixture surviving twice.
            if (!flipped) {
              const sameFixture =
                a.homeTeamName === b.homeTeamName &&
                a.awayTeamName === b.awayTeamName &&
                Math.abs(a.commenceTime.getTime() - b.commenceTime.getTime()) < 60_000;
              expect(sameFixture, `duplicate survived: ${a.id} / ${b.id}`).toBe(false);
            }
          }
        }
      }),
      { numRuns: RUNS },
    );
  });
});

describe("cap-after-collapse is not the same as cap-before-collapse (fuzz)", () => {
  it("capping AFTER the collapse always yields at most N distinct fixtures", () => {
    fc.assert(
      fc.property(arbRows, fc.integer({ min: 1, max: 8 }), (rows, cap) => {
        const after = collapseGameRowsToFixtures(rows).slice(0, cap);
        expect(after.length).toBeLessThanOrEqual(cap);

        // Distinctness is asserted PER ORIENTATION, and only over rows with a
        // usable kickoff. Both exclusions are the module's stated contract,
        // not convenience: a flipped pair is deliberately kept as two rows
        // (they disagree about the sign of every derived line, so merging
        // would grade against a guess), and a row with an unusable
        // commenceTime is deliberately kept uncollapsed rather than dropped.
        // An orientation-insensitive key would count a correct flipped pair
        // as a duplicate and make this property lie.
        const usable = after.filter((r) => Number.isFinite(r.commenceTime.getTime()));
        const keys = usable.map((r) => `${r.homeTeamName}|${r.awayTeamName}`);
        expect(new Set(keys).size, "same fixture, same orientation, kept twice").toBe(
          keys.length,
        );
      }),
      { numRuns: RUNS },
    );
  });

  it("capping BEFORE the collapse can deliver fewer fixtures than the cap promises", () => {
    // Executable proof of the defect class. Not an assertion that the wrong
    // order is always wrong - it is that it CAN be, which is why the order is
    // a rule and not a preference. Reported as a count so a future reader sees
    // the size of the effect rather than taking it on trust.
    let shortfalls = 0;
    let trials = 0;
    fc.assert(
      fc.property(arbRows, fc.integer({ min: 1, max: 8 }), (rows, cap) => {
        const before = collapseGameRowsToFixtures(rows.slice(0, cap));
        const after = collapseGameRowsToFixtures(rows).slice(0, cap);
        trials += 1;
        if (before.length < after.length) shortfalls += 1;
        // The correct order is never WORSE than the wrong one.
        expect(after.length).toBeGreaterThanOrEqual(before.length);
      }),
      { numRuns: RUNS },
    );
    expect(trials).toBeGreaterThan(0);
    // If this ever reaches zero the generator stopped producing duplicates and
    // the whole file is testing nothing - fail loudly rather than pass hollow.
    expect(shortfalls, "generator produced no duplicate-collapse cases").toBeGreaterThan(0);
  });
});
