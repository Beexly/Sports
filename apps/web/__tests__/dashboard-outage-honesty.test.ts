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
    // C-216 widened this from five to nine. Every count that reaches
    // evaluatePublicPerformancePolicy is a record input - not only the five
    // that form the W-L-P-V string.
    const perfCatches = source.match(/\.catch\(softPerfZero\)/g) ?? [];
    expect(perfCatches, "the nine record counts must use softPerfZero").toHaveLength(9);
    // And the record is withheld when any of them failed.
    expect(source).toContain("performancePolicy.canExposePerformanceStats && !perfDegraded");
    expect(source).toContain('perfDegraded\n    ? "Unavailable"');
  });

  it("never lets a failed policy input open the gate it is supposed to close", () => {
    // C-216, found in review. The RED case, and it is a gating BYPASS rather
    // than a display bug. evaluatePublicPerformancePolicy writes the recent-
    // window blocker as `recentTotal > 0 && recentBootstrap === recentTotal`,
    // so a recentTotalCount that falls back to 0 does not just lose a number -
    // it fails the blocker's own guard and the blocker never fires. Routed
    // through softZero, a partial outage could publish a performance record
    // while the history that record depends on was unreadable.
    //
    // Pinned per QUERY, not by counting catches: the count assertion above
    // cannot tell which query got which fallback, and "the right number of the
    // right calls" is exactly the assertion-that-looks-like-proof this file
    // keeps finding.
    const recentTotal = source.match(
      /db\.pick\.count\(\{ where: \{ generatedAt: \{ gte: recentSince \} \} \}\)\.catch\((\w+)\)/,
    );
    expect(recentTotal?.[1], "recentTotalCount fallback").toBe("softPerfZero");
    const recentBootstrap = source.match(
      /db\.pick\.count\(\{ where: \{ generatedAt: \{ gte: recentSince \}, isBootstrap: true \} \}\)\.catch\((\w+)\)/,
    );
    expect(recentBootstrap?.[1], "recentBootstrapCount fallback").toBe("softPerfZero");
    const pending = source.match(
      /result: "PENDING"[\s\S]{0,120}?\}\)\.catch\((\w+)\)/,
    );
    expect(pending?.[1], "canonicalPendingCount fallback").toBe("softPerfZero");
    // And the ONE remaining softZero is the one count actually rendered as a
    // number. If a later query takes the display fallback, this fails.
    const displayCatches = source.match(/\.catch\(softZero\)/g) ?? [];
    expect(displayCatches, "softZero guards only the displayed count").toHaveLength(1);
  });

  it("does not tell a member a visible count fell back when none did", () => {
    // C-216(b). softPerfZero raising countsDegraded made the banner claim
    // "some counts below are showing zero" during an outage in which the only
    // displayed count read correctly and the record already says "Unavailable"
    // for itself. Same false-statement class as C-205a, one flag over.
    const perfFallback = source.match(/const softPerfZero[\s\S]{0,240}?\};/)?.[0] ?? "";
    expect(perfFallback, "softPerfZero not found").not.toEqual("");
    expect(perfFallback).toContain("dbDegraded = true");
    expect(perfFallback).toContain("perfDegraded = true");
    expect(perfFallback).not.toContain("countsDegraded");
  });

  it("keeps the list flag distinct from the page-wide flag", () => {
    // The control on the fix. `todayPicksDegraded` must be a NARROWER signal:
    // it also raises dbDegraded (so the banner still appears), but a count-only
    // failure must not switch the list into its unavailable state.
    const listFallback = source.match(/const softTodayPicks[\s\S]{0,240}?\};/)?.[0] ?? "";
    expect(listFallback).toContain("dbDegraded = true");
    expect(listFallback).toContain("todayPicksDegraded = true");
    const zeroFallback = source.match(/const softZero[\s\S]{0,240}?\};/)?.[0] ?? "";
    expect(zeroFallback).toContain("dbDegraded = true");
    expect(zeroFallback).toContain("countsDegraded = true");
    expect(zeroFallback).not.toContain("todayPicksDegraded");
    // And the list fallback must NOT claim a count failed.
    expect(listFallback).not.toContain("countsDegraded");
  });

  it("renders a banner that names the cause and disclaims the numbers", () => {
    expect(source).toContain("Data store unreachable");
    expect(source).toContain("not because they are zero");
    // Announced to assistive tech rather than only visible - SCOPED to the
    // degradation banner. A bare source-wide `role="status"` check passed on
    // this file before the banner existed: SampleDataBanner already carries
    // one, so the assertion proved nothing about the thing it named.
    const banner = source.match(/\{dbDegraded && \([\s\S]{0,1800}?\)\}/)?.[0] ?? "";
    expect(banner, "degradation banner block not found").not.toEqual("");
    expect(banner).toContain('role="status"');
    expect(banner).toContain("Data store unreachable");
    // C-205a. The banner must not CLAIM the counts fell back when they did
    // not. A list-only failure raises dbDegraded (something did fail) but not
    // countsDegraded, and the wording has to follow that distinction - telling
    // a member their counts are unreadable zeros when every count succeeded is
    // a false statement inside the fix meant to prevent false statements.
    expect(banner).toContain("countsDegraded");
    expect(banner).toContain("The counts below did read correctly");
  });
});

/**
 * C-241, raised by Devin. The "Today's Picks" COUNT omitted `isBootstrap: false`
 * while the list rendered directly beneath it includes that filter, so a member
 * could read a total larger than the slate under it — the same "count above an
 * empty list" defect this file's own header describes, but always-on rather than
 * only during a database failure.
 *
 * Every other count in that block already carried the flag; this one was the
 * exception, which is exactly the shape of thing a source assertion catches and
 * a render test does not: the risk is the query somebody adds later without it.
 */
describe("the dashboard's counts describe the rows it actually shows", () => {
  const source = readFileSync(PAGE, "utf8");

  it("excludes bootstrap rows from every published-pick count", () => {
    // Each `db.pick.count({...})` that filters on isPublished must also exclude
    // bootstrap rows. Bootstrap picks are scaffolding, never a member's record.
    // Comments are STRIPPED before asserting. Found while red-checking this
    // test: the fix's own comment contains the literal string
    // "isBootstrap: false", so removing the actual code line left the assertion
    // passing on prose. A test that can be satisfied by a comment describing the
    // fix is not testing the fix.
    const withoutComments = source.replace(/\/\/[^\n]*/g, "");
    const countBlocks = [
      ...withoutComments.matchAll(/db\.pick\s*\n?\s*\.count\(\{([\s\S]*?)\}\)/g),
    ].map((m) => m[1] as string);
    expect(countBlocks.length, "found no count queries to check").toBeGreaterThanOrEqual(5);

    for (const block of countBlocks) {
      if (!block.includes("isPublished: true")) continue;
      // The one legitimate exception is the count OF bootstrap rows itself,
      // which the page uses to explain the gap rather than to state a record.
      if (block.includes("isBootstrap: true")) continue;
      expect(
        block.includes("isBootstrap: false"),
        `a published-pick count omits isBootstrap: false — it would report rows the ` +
          `list beneath it filters out:\n${block.trim().slice(0, 300)}`,
      ).toBe(true);
    }
  });

  it("keeps the count and the list on the same filters", () => {
    // The specific pairing that broke: today's list and today's count.
    const stripped = source.replace(/\/\/[^\n]*/g, "");
    const todayWindow = "generatedAt: { gte: startOfDay(new Date()), lte: endOfDay(new Date()) }";
    const occurrences = stripped.split(todayWindow).length - 1;
    expect(occurrences, "expected both the today list and the today count").toBeGreaterThanOrEqual(2);
    // Both surrounding queries must carry the bootstrap exclusion.
    for (const segment of stripped.split(todayWindow).slice(0, occurrences)) {
      const tail = segment.slice(-400);
      expect(
        tail.includes("isBootstrap: false"),
        "a today-window query is missing isBootstrap: false",
      ).toBe(true);
    }
  });
});
