import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { comparePicksByRanking } from "@/lib/ranking/sort-key";

/**
 * The candidate pool /api/picks fetches must not be chosen by confidence.
 *
 * The route re-ranks survivors in app code with `comparePicksByRanking`, whose
 * key is `factorBreakdown.rankingP` — NOT confidence. For three weeks the
 * database query that built the pool ordered by `confidence` and took the top
 * N, so the re-rank only ever reordered rows confidence had already approved.
 * A pick with the best rankingP on the slate and a middling confidence was
 * discarded before the sort function ran.
 *
 * That is not a theoretical ordering nit. Measured 2026-09-13 over 2,385
 * settled published non-bootstrap picks with pushes excluded, confidence is
 * anti-predictive at exactly the end this query selected from: the 80+ band
 * claims 0.8663 and realizes 0.5191 (z = -10.7), and the realized win rate
 * PEAKS at 75-79 then FALLS through 90-94. Fetching "the top 48 by confidence"
 * was therefore a systematic bias toward the band that performs worst.
 *
 * `lib/board/state.ts` fixed the same defect on the board with the same
 * remedy, and its comment says why: "re-rank by rankingP below so low-conf
 * demotions surface and high-conf market-echo does not monopolize the take."
 *
 * Second invariant: the pool is the same size for every viewer. It used to be
 * 48 rows for a viewer with a daily cap and 200 for one without, so a FREE
 * viewer's two picks were the best of a quarter of the slate while a PRO
 * viewer ranked over all of it. The capped viewer has the least to spend and
 * was given the worst-informed choice.
 *
 * These are properties of a Prisma call, which a unit test cannot execute
 * without a database, so this reads the route source. To keep the assertions
 * honest the comments are stripped first: an earlier version of this style of
 * test passed because it matched the prose explaining the rule rather than the
 * code implementing it.
 */

const ROUTE = join(__dirname, "../../app/api/picks/route.ts");

/** The route source with block and line comments removed. */
function code(): string {
  return readFileSync(ROUTE, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

describe("the /api/picks candidate pool is not selected by confidence", () => {
  it("does not order the fetch by confidence", () => {
    const src = code();
    // The pool query is the only findMany in this route that orders at all.
    expect(src).toMatch(/orderBy:\s*\[/);
    expect(src).not.toMatch(/\{\s*confidence:\s*"(desc|asc)"\s*\}/);
  });

  it("orders on keys the app-level rank key agrees with or is blind to", () => {
    const src = code();
    const orderBy = /orderBy:\s*\[([\s\S]*?)\]/.exec(src)?.[1] ?? "";
    expect(orderBy).toContain("isFeatured");
    expect(orderBy).toContain("generatedAt");
    expect(orderBy).not.toContain("confidence");
  });

  it("fetches the same pool size whatever the viewer's daily cap", () => {
    const src = code();
    const take = /take:\s*([^,\n]+)/.exec(src)?.[1]?.trim() ?? "";
    // A ternary here means the pool depends on the viewer — the regression.
    expect(take).not.toContain("?");
    expect(take).not.toContain("dailyPickLimit");
    expect(Number(take)).toBeGreaterThanOrEqual(200);
  });

  it("still caps AFTER ranking, so the filter cannot starve a capped viewer", () => {
    const src = code();
    const rankAt = src.indexOf("comparePicksByRanking");
    const capAt = src.indexOf("dailyPickLimit != null");
    expect(rankAt).toBeGreaterThan(-1);
    expect(capAt).toBeGreaterThan(rankAt);
  });
});

describe("the rank key the pool must not fight", () => {
  it("prefers rankingP over confidence, so a confidence-ordered fetch discards its own winner", () => {
    // The concrete row pair the old pool dropped: A is the best pick on the
    // slate by the engine's own probability and would have sorted first, but
    // sat outside a confidence-ordered take. B is the market-echo row that
    // monopolized the top of that fetch.
    const bestByRanking = {
      confidence: 61,
      factorBreakdown: { rankingP: 0.74 },
      generatedAt: new Date("2026-09-13T12:00:00Z"),
    };
    const bestByConfidence = {
      confidence: 91,
      factorBreakdown: { rankingP: 0.55 },
      generatedAt: new Date("2026-09-13T12:00:00Z"),
    };

    expect(comparePicksByRanking(bestByRanking, bestByConfidence)).toBeLessThan(0);
    // …and the old fetch would have ordered them the other way round.
    expect(bestByConfidence.confidence).toBeGreaterThan(bestByRanking.confidence);
  });
});
