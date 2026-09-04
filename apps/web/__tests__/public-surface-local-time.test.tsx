import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { render, screen } from "@testing-library/react";
import { MethodologySection } from "@/components/ui/methodology-section";
import { LocalTime } from "@/components/ui/local-time";
import { formatLocalTime } from "@/lib/time/local-time";

/**
 * The rest of the UTC-timestamp leak that PR #624 closed on /picks and /board.
 *
 * #624 fixed five surfaces and deliberately deferred the remainder to keep its
 * branch reviewable. Those remaining surfaces carry the IDENTICAL defect: a
 * SERVER component formatting an instant with `toLocale*` and no `timeZone`
 * option. Nothing sets `TZ` for the Node runtime (not `next.config.mjs`, not
 * `vercel.json`, not any Docker config), so Node resolves to UTC and the UTC
 * wall clock is baked into the HTML for every visitor on earth.
 *
 * There is no hydration warning and no flash. It is simply, quietly wrong.
 *
 * The homepage was the worst of them, on two counts:
 *
 *   1. It is the homepage. It is the first timestamp anyone sees.
 *   2. Its call passed `{ hour, minute }` and NO `timeZoneName` at all, so the
 *      wrong number shipped with no unit attached to it. "Board data as-of
 *      5:00 PM" reads as 5:00 PM wherever the reader happens to be standing.
 *      A New York reader concluded the board was stamped four hours into the
 *      future — which reads as broken, on the one signal whose entire job is
 *      to tell them the data is fresh.
 *
 * /fantasy/contests was worse in kind though not in reach: `toLocaleString()`
 * with NO arguments at all — no locale, no zone, no zone name — on the entry
 * DEADLINE ("Closes ·") and on kickoff. A contestant who reads a lock time
 * that is hours off misses the window entirely.
 *
 * The concrete instant pinned throughout: 2025-09-07T17:00:00.000Z.
 *   UTC wall clock (the bug)      -> "5:00 PM"
 *   New York (what a reader sees) -> "1:00 PM EDT"
 */

const REFRESH_ISO = "2025-09-07T17:00:00.000Z";
const UTC_WALL_CLOCK = "5:00 PM";
const ET_WALL_CLOCK = "1:00 PM";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const WEB = resolve(REPO_ROOT, "apps/web");
const readWeb = (rel: string): string => readFileSync(resolve(WEB, rel), "utf8");

/**
 * Strip comments before scanning for the banned call shapes. Each fixed site
 * carries a comment naming the call that used to be there — that prose is the
 * record of the defect, not the defect. The same exemption `public-copy-scanner
 * .test.ts` makes: what matters is the code, not an engineer describing it.
 *
 * JSX `{/* ... *\/}` comment blocks are ordinary block comments once the braces
 * are set aside, so the block rule below covers them.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/**
 * The surfaces this branch fixes, completing the sweep #624 started. Each one
 * formatted an instant during SERVER render.
 */
const DEFERRED_SURFACES = [
  "components/ui/methodology-section.tsx", // / and /methodology — "Board data as-of"
  "app/clv/page.tsx", // /clv — "Last graded"
  "app/podcast/page.tsx", // /podcast — episode publish dates
  "app/newsletter/page.tsx", // /newsletter — issue archive dates
  "app/newsletter/[slug]/page.tsx", // /newsletter/[slug] — issue date
  "app/fantasy/contests/page.tsx", // /fantasy/contests — lock time, kickoff, entry stamp
];

const originalTZ = process.env["TZ"];
afterEach(() => {
  if (originalTZ === undefined) delete process.env["TZ"];
  else process.env["TZ"] = originalTZ;
});

describe("the homepage freshness stamp is never the server's UTC clock", () => {
  it("MethodologySection emits the ISO instant, not a baked UTC wall clock", () => {
    // The suite runs with the same UTC default the production Node runtime has,
    // so this render is byte-for-byte the one a visitor's browser receives.
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("UTC");

    const html = renderToStaticMarkup(
      <MethodologySection
        metrics={{ settled: 12, cleared: 3, gated: 5, lastRefresh: REFRESH_ISO }}
      />,
    );

    // The concrete failure: a 1:00 PM ET refresh served to everyone as 5:00 PM.
    expect(html).not.toContain(UTC_WALL_CLOCK);
    // ...and no other zone is guessed at on the server either.
    expect(html).not.toContain(ET_WALL_CLOCK);

    // What DOES cross the boundary is the instant itself.
    expect(html).toContain(REFRESH_ISO);
    expect(html.toLowerCase()).toContain(`datetime="${REFRESH_ISO.toLowerCase()}"`);
    expect(html).toContain('data-localtime="pending"');
  });

  it("keeps the freshness signal itself intact while deferring only its display", () => {
    // freshness-coverage.test.ts holds this surface to rendering a real as-of
    // signal. Deferring the DISPLAY of the timestamp must not remove the SIGNAL,
    // and it must not touch which instant is chosen or how staleness is judged.
    const html = renderToStaticMarkup(
      <MethodologySection
        metrics={{ settled: 12, cleared: 3, gated: 5, lastRefresh: REFRESH_ISO }}
      />,
    );
    expect(html).toContain('data-testid="homepage-freshness"');
    expect(html).toContain("Board data as-of");
  });

  it("still renders no stamp at all when there is no board timestamp", () => {
    // CLAUDE.md #5: an absent timestamp must stay absent, never become "now".
    const html = renderToStaticMarkup(
      <MethodologySection metrics={{ settled: 12, cleared: 3, gated: 5 }} />,
    );
    expect(html).not.toContain('data-testid="homepage-freshness"');
    expect(html).not.toContain("Board data as-of");
  });
});

describe("the viewer's own clock resolves every deferred stamp", () => {
  it("carries an explicit zone label once mounted on a New York device", () => {
    process.env["TZ"] = "America/New_York";

    render(<LocalTime iso={REFRESH_ISO} format="clock" label="Board data as-of" />);

    const el = screen.getByText(/1:00\s?PM/);
    // The homepage call passed no `timeZoneName` at all, so the wrong number
    // shipped with no unit on it. The zone label is now non-negotiable.
    expect(el.textContent).toContain("EDT");
    expect(el.textContent).toContain("1:00 PM EDT");
    expect(el.textContent).not.toContain(UTC_WALL_CLOCK);
    expect(el.textContent).not.toContain("UTC");

    const time = el.closest("time");
    expect(time?.getAttribute("datetime")).toBe(REFRESH_ISO);
    expect(time?.getAttribute("data-localtime")).toBe("resolved");
  });

  it("labels a contest lock time and an entry stamp with their zone too", () => {
    process.env["TZ"] = "America/New_York";

    const { unmount } = render(
      <LocalTime iso={REFRESH_ISO} format="kickoff" label="Entries close" />,
    );
    expect(screen.getByText(/1:00\s?PM/).textContent).toContain(
      "Sun, Sep 7, 1:00 PM EDT",
    );
    unmount();

    render(<LocalTime iso={REFRESH_ISO} format="stamp" label="Entered" />);
    expect(screen.getByText(/1:00\s?PM/).textContent).toContain("Sep 7, 1:00 PM EDT");
  });

  it("formats the short-date preset on the viewer's clock", () => {
    // /clv, /podcast and /newsletter show a calendar date with no time-of-day,
    // so there is no zone label to attach — a date is not a wall clock. What
    // must still hold is that the DATE is the viewer's, not the server's.
    expect(formatLocalTime(REFRESH_ISO, "date-short", "America/New_York")).toBe(
      "Sep 7, 2025",
    );

    // A real archive row proves the day genuinely moves: newsletter issue 003 is
    // published at 2026-08-06T16:00:00.000Z (apps/web/lib/newsletter/issues.ts),
    // which is already 2026-08-07 for a reader in Tokyo. The server's UTC render
    // handed every such reader the previous day.
    const ISSUE_003 = "2026-08-06T16:00:00.000Z";
    expect(formatLocalTime(ISSUE_003, "date-short", "UTC")).toBe("Aug 6, 2026");
    expect(formatLocalTime(ISSUE_003, "date-short", "Asia/Tokyo")).toBe("Aug 7, 2026");
  });

  it("returns null for an instant it cannot parse, rather than inventing one", () => {
    expect(formatLocalTime("not-a-date", "date-short")).toBeNull();
  });
});

describe("no deferred surface formats a timestamp during server render", () => {
  for (const rel of DEFERRED_SURFACES) {
    it(`${rel} defers its timestamps to <LocalTime>`, () => {
      const code = stripComments(readWeb(rel));
      // The exact call shapes that produced the UTC wall clock. Any of these
      // reappearing on one of these server surfaces re-opens the defect.
      expect(code).not.toMatch(/toLocaleTimeString\s*\(/);
      expect(code).not.toMatch(/toLocaleDateString\s*\(/);
      expect(code).not.toMatch(/new Date\([^)]*\)\.toLocaleString\s*\(/);
      expect(code).toContain("LocalTime");
    });
  }

  it("these surfaces stay SERVER components — only the timestamp ships", () => {
    for (const rel of DEFERRED_SURFACES) {
      expect(readWeb(rel)).not.toContain('"use client"');
    }
  });
});
