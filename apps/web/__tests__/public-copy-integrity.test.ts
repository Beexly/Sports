import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Honesty guard — the single most important test in this repo.
 *
 * FORBIDDEN catches hard tout phrases that claim performance the model cannot
 * honestly warrant. Every phrase stays in the list permanently (removing one
 * silently deletes protection).
 *
 * However, the copy now ships honest DISCLAIMERS that mention forbidden
 * phrases inside a negation context (e.g. "not verified ROI", "Not a PROVEN
 * track record"). The lookbehind below lets a negation prefix (not/no/never/
 * without) exempt the phrase — the prohibition is on CLAIMING, not on
 * honestly denying. See commit d1cf792c ("honesty + rankingP surfaces").
 */
const FORBIDDEN =
  /\b(?<!not\s|no\s|never\s|without\s)(guaranteed wins?|engines? accurate|verified ROI|PROVEN edge|beat the book guaranteed)\b/i;

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
      if (FORBIDDEN.test(text)) hits.push(f);
    }
    expect(hits).toEqual([]);
  });

  it("still catches bare tout phrases (no negation context)", () => {
    // A bare "verified ROI" claim — NOT exempted by a negation prefix.
    expect("We provide verified ROI").toMatch(FORBIDDEN);
    expect("Our model is PROVEN edge").toMatch(FORBIDDEN);
    expect("Guaranteed wins every week").toMatch(FORBIDDEN);
  });

  it("exempts honest negation / disclaimer context", () => {
    // The same forbidden phrases inside a negation prefix are allowed.
    expect("model sort key, not verified ROI").not.toMatch(FORBIDDEN);
    expect("never verified ROI in this context").not.toMatch(FORBIDDEN);
    expect("without verified ROI claims").not.toMatch(FORBIDDEN);
    expect("no verified ROI here").not.toMatch(FORBIDDEN);
  });
});
