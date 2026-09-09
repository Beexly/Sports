import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * FE-12: two unrelated launch-quality fixes bundled under one row.
 *
 *  1. GmAutopilot advertised ESPN/Yahoo league sync chips labelled "soon" —
 *     a shipping-date promise this repo has no way to keep or verify.
 *  2. /board/gate ships illustrative demonstration rows by default and is
 *     now noindexed in that mode (see board-gate-page.test.tsx); the
 *     sitemap must not advertise it as a daily live surface either.
 */
describe("FE-12: gm-autopilot soon chips and /board/gate sitemap entry", () => {
  it("gm-autopilot no longer renders a 'soon' chip", () => {
    const src = readFileSync(
      join(process.cwd(), "components/fantasy/gm-autopilot.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/>soon</i);
  });

  it("the sitemap's static route table does not list /board/gate", () => {
    const src = readFileSync(join(process.cwd(), "app/sitemap.ts"), "utf8");
    expect(src).not.toMatch(/path:\s*"\/board\/gate"/);
  });
});
