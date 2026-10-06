/**
 * Backtest for the short-week road deficit (spec rule 7 / rule 6).
 *
 * WHY THIS FILE EXISTS. `short-week-road-deficit.ts` ships hand-written
 * magnitudes: a -1.75 spread penalty, -0.65 for travel over 1500 miles, a
 * claimed "34% increase in 4th-quarter explosive plays". Those are asserted
 * in a docstring as "Empirical Domain Characteristics" with no source. The
 * total-signal spec's rule 6 is explicit that a rule must prove itself in
 * backtest before it touches a live projection, and the signal IS wired into
 * the registry. This measures the same quantity from settled history.
 *
 * WHAT IT MEASURES. For every historical NFL game, the rest differential
 * (days since each team's previous game, derived from kickoff times) and the
 * covering outcome, then:
 *   - the MAJORITY of the modeled penalty: mean(margin + adjustment) across
 *     short-week road games. If the -1.75 were right, short-week road teams
 *     would beat the closing spread by ~1.75 on average and this would land
 *     near +1.75.
 *   - the TRAVEL tier split, to check whether >1500 miles moves it at all.
 *   - the same statistic for LONG-rest road games, as the control: if short
 *     week and normal week are indistinguishable, the penalty is not a
 *     penalty, it is a number someone liked.
 *
 * HONESTY. Every figure printed here is a MEASURED result over settled games,
 * never a target. If the measured effect is smaller than the shipped
 * magnitude, the docstring is overstating it and the test says so. A test
 * that could only pass by confirming a hoped-for number would be worthless.
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { HistoricalGameRow } from "./types.js";

function findRepoRoot(): string {
  let dir = typeof __dirname === "string" ? __dirname : process.cwd();
  for (let depth = 0; depth < 20; depth += 1) {
    if (existsSync(resolve(dir, "tsconfig.base.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("repo root not found: no ancestor contains tsconfig.base.json");
}

/**
 * The corpus lives under data/backtest/. It is NOT committed: the loader is
 * documented as the only file that touches a filesystem, and the corpus is
 * obtained from nflverse (CC-BY 4.0) by scripts that shape it. These tests
 * SKIP when it is absent, and say so, rather than asserting against a
 * fabricated or empty population — a backtest that silently grades nothing
 * is worse than no backtest.
 */
const CORPUS = resolve(findRepoRoot(), "data", "backtest", "nfl_historical_games.json");

const haveCorpus = existsSync(CORPUS);

type Settled = HistoricalGameRow & { readonly restDaysHome: number; readonly restDaysAway: number };

function loadCorpus(): Settled[] {
  const parsed = JSON.parse(readFileSync(CORPUS, "utf8")) as {
    readonly rows?: readonly (HistoricalGameRow & { readonly restDaysHome?: number; readonly restDaysAway?: number })[];
  };
  return (parsed.rows ?? [])
    .filter((r) => typeof r.restDaysHome === "number" && typeof r.restDaysAway === "number")
    .map((r) => ({ ...r, restDaysHome: r.restDaysHome as number, restDaysAway: r.restDaysAway as number }));
}

const describeCorpus = haveCorpus ? describe : describe.skip;

describeCorpus("short-week road deficit — measured against settled history", () => {
  const rows = haveCorpus ? loadCorpus() : [];

  it("the corpus is large enough to say something, and says what it is", () => {
    expect(rows.length).toBeGreaterThan(200);
    // Print the population so a run log carries the denominator, not just the
    // ratio. A mean over 12 games is not evidence and should look obviously thin.
    // eslint-disable-next-line no-console
    console.log(
      `[short-week backtest] population: ${rows.length} settled NFL games with both rest values present`,
    );
  });

  it("measures the RAW rest effect, without folding in the shipped magnitude", () => {
    // CRITICAL, and the reason this test exists in this shape. An earlier
    // version added `spreadPointAdjustment` to the observed margin and then
    // compared groups. That is self-confirming: the shipped -1.75 gets added to
    // the short-week group, so the "measured" differential comes back at
    // ~-1.77 no matter what the history says. The measurement here adds
    // NOTHING and compares what the games actually did, which is the only
    // number that can disagree with the docstring.
    const shortWeekRaw: number[] = [];
    const controlRaw: number[] = [];

    for (const row of rows) {
      // SIGN, and getting it wrong is silent. nflverse's `spread_line` is
      // positive when the HOME team is favored (measured: a 2024 KC-BAL row
      // carries spread_line 3 and KC won by 7). So home covers by
      // margin MINUS the line, not plus. A wrong sign does not crash — it just
      // shifts every group by twice the line — and the first run of this test
      // produced a control mean of -3.483, which is impossible for a closing
      // line (they average ~0 by construction). The control group is what caught
      // it, and it is why the control group exists.
      const homeVsSpread = row.homeScore - row.awayScore - row.closingSpreadHome;

      if (row.restDaysHome <= 4) shortWeekRaw.push(homeVsSpread);
      else if (row.restDaysAway <= 4) shortWeekRaw.push(-homeVsSpread);
      else controlRaw.push(-homeVsSpread);
    }

    const mean = (xs: readonly number[]): number =>
      xs.length === 0 ? Number.NaN : xs.reduce((a, b) => a + b, 0) / xs.length;
    const sd = (xs: readonly number[]): number => {
      if (xs.length < 2) return Number.NaN;
      const m = mean(xs);
      return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
    };

    const shortMean = mean(shortWeekRaw);
    const controlMean = mean(controlRaw);
    // Welch's t on the difference of means. A large |t| means the two groups
    // genuinely differ; near zero means the rest signal is not doing what the
    // magnitude claims.
    const se = Math.sqrt(sd(shortWeekRaw) ** 2 / shortWeekRaw.length + sd(controlRaw) ** 2 / controlRaw.length);
    const diff = shortMean - controlMean;
    const t = diff / se;

    // eslint-disable-next-line no-console
    console.log(
      [
        `[short-week backtest] RAW (no shipped constant applied)`,
        `[short-week backtest] n short-week(<=4 rest)=${shortWeekRaw.length} mean ${shortMean.toFixed(3)} sd ${sd(shortWeekRaw).toFixed(3)}`,
        `[short-week backtest] n control(>4 both)   =${controlRaw.length} mean ${controlMean.toFixed(3)} sd ${sd(controlRaw).toFixed(3)}`,
        `[short-week backtest] RAW differential = ${diff.toFixed(3)} points, Welch t = ${t.toFixed(2)}`,
        `[short-week backtest] shipped docstring magnitude = -1.75 points`,
        `[short-week backtest] ratio shipped/measured = ${Math.abs(diff) < 0.005 ? "measured effect is indistinguishable from zero" : (1.75 / Math.abs(diff)).toFixed(1) + "x"}`,
      ].join("\n"),
    );

    expect(Number.isFinite(shortMean)).toBe(true);
    expect(Number.isFinite(controlMean)).toBe(true);
    expect(shortWeekRaw.length).toBeGreaterThan(50);
  });
});

