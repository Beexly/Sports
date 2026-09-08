import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * C-179. A zero a customer cannot tell apart from an outage is a false
 * statement.
 *
 * Every count on the signed-in dashboard failed soft - `.catch(() => 0)` and
 * `.catch(() => [])` - so one dead query could never take the page down. That
 * part is right. But the fallbacks ARE the displayed values, so a database
 * outage rendered "0 settled, 0 wins, no picks today" and a member read it as
 * an empty account rather than a broken load. /board and /picks already
 * surface DB_UNREACHABLE; this surface, the one a paying member lands on, did
 * not.
 *
 * Asserted at the source, because the property is "no fallback bypasses the
 * flag" - a render test can only prove the branch it happens to exercise, and
 * the risk here is the ELEVENTH query somebody adds later with a bare catch.
 */

const PAGE = resolve(__dirname, "..", "app", "dashboard", "page.tsx");

describe("the dashboard says when a zero is an outage", () => {
  const source = readFileSync(PAGE, "utf8");

  it("routes every soft fallback through the degradation flag", () => {
    // The exact shapes that used to hide an outage.
    expect(source).not.toContain(".catch(() => 0)");
    expect(source).not.toContain(".catch(() => [] as unknown[])");
    expect(source).toContain("dbDegraded = true");
  });

  it("still fails soft: no query is allowed to throw the page down", () => {
    // The control. "Be honest about the outage" must not become "crash on it".
    // Every awaited count still has a catch attached.
    // EXACT, not a floor. `>= 10` let a handler disappear or route around the
    // helpers without failing, which is the same "assertion that looks like
    // proof" problem this file exists to prevent.
    const counts = source.match(/\.catch\(soft(Zero|TodayPicks|PerfZero)\)/g) ?? [];
    expect(counts.length).toBe(11);
    // Every OTHER catch on the page must be accounted for by name. There is
    // exactly one legitimate non-helper catch - loadPublicClvPolicy, which
    // fails OPEN to the gated/NOT_READY shape and is loaded outside the
    // positional Promise.all on purpose. Pinning it here means a NEW bare
    // catch fails this test instead of silently reintroducing a hidden zero.
    const allCatches = source.match(/\.catch\(/g) ?? [];
    expect(allCatches).toHaveLength(12);
    const bare = source.match(/\.catch\(\(\) =>[^)]*\)/g) ?? [];
    expect(bare, "an unnamed catch appeared outside the soft helpers").toEqual([
      ".catch(() => null)",
    ]);
  });

  it("does not let a failed LIST read print an empty-board claim", () => {
    // C-191, found by two reviewers independently on PR #720. The banner above
    // disclaims COUNTS. The picks list renders a different positive statement -
    // "No picks published yet today" - and `[]` from a failed findMany is
    // indistinguishable from a genuinely empty slate. The count query is
    // independent of the list query, so a lone list failure printed
    // "Today's Picks 6" directly above "No picks published yet today".
    expect(source).toContain("todayPicksDegraded = true");
    // The empty-board copy must be reachable ONLY when the read succeeded.
    const guarded = /\{todayPicksDegraded \? \([\s\S]{0,600}?\) : todayPicks\.length === 0 \? \(/;
    expect(source).toMatch(guarded);
    expect(source).toContain("could not be read");
  });

  it("never publishes a record assembled from one real count and one fallback zero", () => {
    // C-201, found in review. softZero is right for a DISPLAY count - a zero
    // beside the banner is a degraded number a reader can discount. It is
    // wrong for the inputs to evaluatePublicPerformancePolicy, because those
    // get COMBINED: canonicalSettledCount succeeding at 500 while
    // canonicalWins fails to 0 renders "0-..." and a 0% win rate as a
    // statement of record. That is a fabricated performance claim, which is
    // the worst output this product can produce.
    expect(source).toContain("perfDegraded = true");
    // Every count that forms the public record routes through the record-
    // scoped fallback, not the display one.
    const perfCatches = source.match(/\.catch\(softPerfZero\)/g) ?? [];
    expect(perfCatches, "the five record counts must use softPerfZero").toHaveLength(5);
    // And the record is withheld when any of them failed.
    expect(source).toContain("performancePolicy.canExposePerformanceStats && !perfDegraded");
    expect(source).toContain('perfDegraded\n    ? "Unavailable"');
  });

  it("keeps the list flag distinct from the page-wide flag", () => {
    // The control on the fix. `todayPicksDegraded` must be a NARROWER signal:
    // it also raises dbDegraded (so the banner still appears), but a count-only
    // failure must not switch the list into its unavailable state.
    const listFallback = source.match(/const softTodayPicks[\s\S]{0,240}?\};/)?.[0] ?? "";
    expect(listFallback).toContain("dbDegraded = true");
    expect(listFallback).toContain("todayPicksDegraded = true");
    const zeroFallback = source.match(/const softZero[\s\S]{0,200}?\};/)?.[0] ?? "";
    expect(zeroFallback).toContain("dbDegraded = true");
    expect(zeroFallback).not.toContain("todayPicksDegraded");
  });

  it("renders a banner that names the cause and disclaims the numbers", () => {
    expect(source).toContain("Data store unreachable");
    expect(source).toContain("not because they are zero");
    // Announced to assistive tech rather than only visible - SCOPED to the
    // degradation banner. A bare source-wide `role="status"` check passed on
    // this file before the banner existed: SampleDataBanner already carries
    // one, so the assertion proved nothing about the thing it named.
    const banner = source.match(/\{dbDegraded && \([\s\S]{0,1200}?\)\}/)?.[0] ?? "";
    expect(banner, "degradation banner block not found").not.toEqual("");
    expect(banner).toContain('role="status"');
    expect(banner).toContain("Data store unreachable");
  });
});
