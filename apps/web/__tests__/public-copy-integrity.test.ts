import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Phrases that would be unsupported performance claims if asserted.
 *
 * Global + case-insensitive so every occurrence in a file is examined, not just
 * the first.
 */
const TOUT = /\b(guaranteed wins?|engines? accurate|verified ROI|PROVEN edge|beat the book guaranteed)\b/gi;

/**
 * A negation immediately preceding a tout phrase.
 *
 * This exists because the guard was failing on `app/board/page.tsx`:
 *
 *   <span> — model sort key, not verified ROI</span>
 *
 * which is a DISCLAIMER — the honest opposite of a tout. Matching the phrase
 * inside its own negation punished the copy for being careful, and the only way
 * to satisfy the guard as written was to delete the disclaimer and make the page
 * less honest. That inverts what the guard is for.
 *
 * The rule the guard actually encodes is "do not ASSERT unsupported performance."
 * A denial is not an assertion, so a phrase directly negated is not a hit.
 * Anchored with `$` against the text immediately before the match, and limited to
 * an optional article, so it cannot swallow an unrelated earlier "not".
 */
const NEGATOR = /\b(?:not|never|no|without|isn't|aren't|won't|nor)\s+(?:a|an|any|the)?\s*$/i;

/** True when `text` asserts a tout phrase, ignoring negated mentions. */
export function assertsTout(text: string): boolean {
  for (const m of text.matchAll(TOUT)) {
    const before = text.slice(Math.max(0, m.index - 40), m.index);
    if (!NEGATOR.test(before)) return true;
  }
  return false;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "cockpit" || name === "api") continue; // internal
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts|mdx)$/.test(name)) acc.push(p);
  }
  return acc;
}

describe("public copy integrity while RED-capable surfaces", () => {
  it("does not ship hard tout phrases in public app pages", () => {
    const root = join(process.cwd(), "app");
    const files = walk(root);
    const hits: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      if (assertsTout(text)) hits.push(f);
    }
    expect(hits).toEqual([]);
  });

  // The guard had no tests of its own, so nobody had watched it fail — it passed
  // or failed for whatever reason it happened to. These pin both directions, so
  // teaching it about negation cannot quietly become "stops catching things".
  it("still catches an asserted tout", () => {
    expect(assertsTout("Our engine delivers guaranteed wins every week.")).toBe(true);
    expect(assertsTout("Backed by verified ROI across four seasons.")).toBe(true);
    expect(assertsTout("This is a PROVEN edge.")).toBe(true);
    expect(assertsTout("beat the book guaranteed")).toBe(true);
  });

  it("does not fire on a disclaimer that denies the same phrase", () => {
    expect(assertsTout("model sort key, not verified ROI")).toBe(false);
    expect(assertsTout("These are not guaranteed wins.")).toBe(false);
    expect(assertsTout("We publish confidence, never a PROVEN edge.")).toBe(false);
  });

  it("does not let an unrelated earlier negation excuse a later assertion", () => {
    // "not" is far away and attached to a different clause; the tout still counts.
    expect(
      assertsTout("This is not financial advice. Our engine delivers guaranteed wins."),
    ).toBe(true);
  });
});
