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
    const counts = source.match(/\.catch\(soft(Zero|List)\)/g) ?? [];
    expect(counts.length).toBeGreaterThanOrEqual(10);
  });

  it("renders a banner that names the cause and disclaims the numbers", () => {
    expect(source).toContain("Data store unreachable");
    expect(source).toContain("not because they are zero");
    // Announced to assistive tech rather than only visible.
    expect(source).toContain('role="status"');
  });
});
