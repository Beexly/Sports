import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Fictional data may exist on a public surface. Presenting it as real may not.
 *
 * The repo is good at this in most places and the pattern is well established:
 * `pickem-ranker` flips "Source: fictional (illustrative)" to "Source: live"
 * off `isLivePickem()`, `portfolio-sim` always prints a sample label, the DFS
 * optimizer banners "fictional players" whenever nothing real is imported, and
 * `/board/gate` badges illustrative inputs. Each of those derives its
 * disclosure from actual state.
 *
 * Two defects of the same class were found on 2026-09-28 and fixed in the same
 * commit as this file:
 *
 *  1. `/fantasy/dfs` passed its sample-slate note as a CONSTANT, so the
 *     "the player pool is illustrative" disclosure rendered over LIVE
 *     salaries too. The failure was not overselling, it was underselling —
 *     telling a paying customer with a real board that it was fake.
 *  2. `/fantasy/nba` is fictional by construction and carried a `live-dot`
 *     plus no `robots` directive, so a live visual signal sat above invented
 *     players on the one fictional slate that could still rank in search.
 *
 * Both were invisible to review because honesty copy reads as correct. These
 * tests assert the MECHANISM — a disclosure must be derived from state — so the
 * class is covered rather than the two instances.
 */
const APP = join(process.cwd(), "app");

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name === "page.tsx") yield full;
  }
}

/**
 * Comments are stripped before matching.
 *
 * Without this the guard matches ITSELF and every fix that documents the
 * problem: the /fantasy/nba live-dot is gone, but the comment explaining why
 * contains both "live-dot" and "fictional", so the page still trips. A guard
 * that can be defeated by a good code comment is a guard that gets disabled.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

const pages = [...walk(APP)].map((f) => {
  const raw = readFileSync(f, "utf8");
  // Forward slashes regardless of platform: node:path.relative returns
  // backslashes on Windows, which would silently miss every allow-list entry
  // below on a dev machine while passing in CI. A guard that only works on
  // Linux is a guard nobody trusts on Windows.
  return { file: relative(APP, f).split(/[\\/]/).join("/"), raw, src: stripComments(raw) };
});

/**
 * A page is FICTION-BEARING only when it admits invented data in copy a
 * customer reads, or renders a fixture-shaped data module.
 *
 * The bar matters: a passing mention of "illustrative" in a paragraph about
 * something else is not a reason to noindex a page, and a guard that demands
 * noindex for those gets switched off. `/airwave` and `/today` genuinely render
 * fictional personas and are labeled so in their own body copy; that is the
 * pattern, and those pages are judged on their DATA, not their robots tag.
 */
/**
 * The `all players` alternative was removed after it produced a false positive
 * on `/mlb`, a page of entirely REAL Lahman data. Case-insensitive matching hit
 * the substring "all Data" inside `loadLahmanMlbTeams`, which is a function
 * name, not customer copy. Every alternative here is now prose that cannot
 * occur inside a camelCase identifier.
 */
const FICTION_COPY =
  /(?:entirely fictional|are invented|not real contest data|fictional personas|illustrative ledger|placeholder data|sample slate|sample projections|every (?:player|figure|stat) (?:is|here) (?:fictional|invented))/i;

/** A fixture module feeding render is fiction regardless of the copy around it. */
const FICTION_DATA = /\b(?:DFS_SLATE|NBA_SLATE|ILLUSTRATIVE_DFS|ILLUSTRATIVE_[A-Z_]+)\b/;

/** A page is STATE-DEPENDENT if it can be either real or fictional at runtime. */
const STATEFUL = /\b(?:isLive\w*|isConfigured|live\s*=|\bavailable\s*=|status\s*===\s*["']live)/;

/**
 * Negation is stripped before matching.
 *
 * `/cockpit/nova/founder` says "nothing here is placeholder data" and tripped
 * the guard on the word placeholder. A disclosure that DENIES fiction is the
 * opposite of one that asserts it, and a guard that cannot tell them apart
 * forces the author to reword honest copy instead of fixing real defects. The
 * same failure shaped the `/mlb` false positive: matching a substring without
 * reading the sentence produces confident nonsense.
 */
function stripNegations(src: string): string {
  return src.replace(/\b(?:no|not|nothing|never|isn't|is not|are not|nor|without)\b[^.!?\n]{0,60}/gi, " ");
}

const fictionBearing = (p: { src: string }): boolean =>
  FICTION_COPY.test(stripNegations(p.src)) || FICTION_DATA.test(p.src);

/**
 * Two DIFFERENT questions, kept apart on purpose.
 *
 * ROOM TO RENDER: a page may show invented data as long as it says so. The repo
 * is good at this. `/intelligence` passes ILLUSTRATIVE_BRIEF (illustrative:true)
 * to SignalCourtroom, which renders an "Illustrative" badge from that flag, and
 * its body copy says the brief is a methodology demonstration. `/airwave` prints
 * "the personas are fictional and the matchups are generic" and labels the
 * board an illustrative demo. Neither was wrong, and an earlier version of this
 * guard tried to force noindex onto both purely because they render fixtures.
 *
 * That is the failure mode of a guard written from a keyword list: it reports
 * the honest pages and misses the dishonest ones, and the team learns to ignore
 * it. So the render test below asserts the LABEL, which is what a customer
 * actually needs, and leaves the search-index question to its own explicit
 * allow-list rather than smearing it across every fiction-bearing page.
 */
/**
 * Every entry carries the disclosure that justifies it, and the second test
 * below re-checks that disclosure still exists in source. That second test is
 * the point: an allow-list that outlives its reason is how a guard starts
 * lying, and this list is only allowed to say "already honest" for as long as
 * the honesty is still in the file.
 *
 * Each was verified by reading the page, not by pattern-matching it. Three of
 * them were FALSE POSITIVES of earlier drafts of this guard, which is why the
 * reasoning is recorded here rather than left implicit:
 *   - `/mlb` is entirely REAL Lahman data; "all Data" inside loadLahmanMlbTeams
 *     is a function name, not a disclosure.
 *   - `/cockpit/nova/founder` says "nothing here is placeholder data", which
 *     asserts the opposite of what the guard was reading.
 *   - `/intelligence` and `/airwave` were reported for a missing robots tag,
 *     not for missing disclosure. Both are honest in body copy.
 */
const LABELED_SURFACES = new Set([
  // "the personas are fictional and the matchups are generic" in body copy.
  "airwave/page.tsx",
  // "Running on a sample slate ... the player pool is illustrative", now
  // derived from the feed state rather than hardcoded (fixed this commit).
  "fantasy/dfs/page.tsx",
  // Renders ILLUSTRATIVE_* fixtures behind an illustrative badge.
  "fantasy/league-twin/page.tsx",
  // Title and description both say fictional/invented; validator demo.
  "fantasy/nba/page.tsx",
  // Renders an ILLUSTRATIVE slate, badged.
  "fantasy/scheme/page.tsx",
  "fantasy/studio/page.tsx",
  "fantasy/trade/page.tsx",
  "fantasy/waivers/page.tsx",
  // Landing page that describes the sample-slate state of the suite below it.
  "fantasy/page.tsx",
]);

describe("fiction may be rendered, but only when the page says so", () => {
  it("every fiction-bearing page is either labeled or explicitly recorded", () => {
    const unlabeled = pages
      .filter(fictionBearing)
      .filter((p) => !LABELED_SURFACES.has(p.file))
      .map((p) => p.file);

    // A new page that renders a fixture without a disclosure lands here, which
    // is the only outcome that should ever be a red build.
    expect(unlabeled, `fiction rendered with no disclosure recorded: ${unlabeled.join(", ")}`).toEqual([]);
  });

  it("the recorded exceptions still carry their disclosure in source", () => {
    // An allow-list that outlives its reason is how a guard starts lying. If a
    // labeled page ever drops its disclosure, this fails instead of the
    // allow-list quietly protecting it forever.
    for (const file of LABELED_SURFACES) {
      const page = pages.find((p) => p.file === file);
      expect(page, `${file} is in LABELED_SURFACES but no longer exists`).toBeDefined();
      expect(
        page!.src,
        `${file} lost its fiction disclosure; remove it from LABELED_SURFACES or restore the label`,
      ).toMatch(/illustrative|fictional|sample (?:slate|pool|projections)|are invented|ILLUSTRATIVE/i);
    }
  });
});

describe("a disclosure tracks the state it describes", () => {
  it("no state-dependent page states a fixed data-provenance claim", () => {
    // The /fantasy/dfs defect: a constant string asserting a provenance that
    // was only true in one of two states. A page that can flip between real and
    // fictional data must compute its label, not hardcode it.
    const offenders = pages
      .filter((p) => STATEFUL.test(p.src) && fictionBearing(p))
      .filter((p) => /(?:note|label|eyebrow|badge|description)\s*[:=]\s*["`][^"`]*\b(?:illustrative|sample|fictional)\b/i.test(p.src))
      .map((p) => p.file);

    expect(offenders, `constant provenance claims on state-dependent pages: ${offenders.join(", ")}`).toEqual([]);
  });
});

describe("no live visual signal sits above unlabeled invented data", () => {
  it("flags live-dot on a fiction-bearing page that is not an acknowledged demo", () => {
    const offenders = pages
      .filter(fictionBearing)
      .filter((p) => /live-dot/.test(p.src))
      // /airwave uses the dot as an eyebrow accent on a page whose body copy
      // discloses fictional personas two hundred lines below. That pairing is
      // recorded rather than silently tolerated.
      .filter((p) => !LABELED_SURFACES.has(p.file))
      .map((p) => p.file);

    // The dot is a visual claim that a surface is live. On `/fantasy/nba` it
    // sat directly above invented players with no disclosure, which is the
    // exact counterfeit pairing law 8 exists to prevent — and it was invisible
    // to copy review because the dot is markup, not prose.
    expect(offenders, `live-dot above unlabeled fiction: ${offenders.join(", ")}`).toEqual([]);
  });
});
