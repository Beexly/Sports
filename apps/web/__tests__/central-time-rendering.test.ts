import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CENTRAL_TZ, centralDateKey, formatCentralDateTime, formatCentralTime } from "@/lib/time/central";

/**
 * Every customer-facing time reads Central, and says so.
 *
 * Founder, 2026-09-12: "all times should be from CST central time." A helper
 * was written that day (lib/time/central.ts) and wired to NOTHING — it had zero
 * importers for a full day while the bug it fixes was live.
 *
 * The bug: these are SERVER components, so `toLocaleTimeString()` with no
 * `timeZone` option formats in the SERVER's zone, which is UTC on Vercel.
 * Measured on production 2026-09-13: /api/board/state reported lastRefresh
 * 18:06:07Z and /board rendered "Last refresh 6:06 PM". It was 1:06 PM Central.
 * Five hours wrong, and a grep of the rendered page found ZERO timezone labels,
 * so a reader could not even correct for it.
 *
 * In a CLIENT component the same omission is a different bug with the same
 * cause: SSR formats in the server's zone, hydration reformats in the viewer's,
 * and the two disagree.
 *
 * These are source assertions rather than render assertions on purpose: the
 * failure mode is a MISSING option, and only reading the source can prove a
 * formatter pinned its zone. Rendering proves one date in one environment.
 */

const root = join(__dirname, "..");
const read = (rel: string): string => readFileSync(join(root, rel), "utf8");

/** Files that render a time or date to a customer and must pin the zone. */
const CUSTOMER_TIME_SURFACES = [
  "app/board/page.tsx",
  "app/slate/[sport]/page.tsx",
  "components/picks/pick-card.tsx",
  // The picks board's own "last updated", and the "Board data as-of" stamp that
  // renders on the HOMEPAGE. The second was the worst of the set: no
  // `timeZoneName` at all, so it printed a bare wrong clock face.
  "app/picks/page.tsx",
  "components/ui/methodology-section.tsx",
] as const;

/**
 * A formatter call that names neither an explicit timeZone nor the Central
 * helper is formatting in whatever zone the process happens to be in.
 */
const BARE_FORMATTER = /\.toLocale(?:Time|Date)?String\s*\(/g;

describe("customer-facing times are pinned to Central", () => {
  for (const rel of CUSTOMER_TIME_SURFACES) {
    it(`${rel} pins a timezone on every time it formats`, () => {
      const src = read(rel);
      const usesHelper = /from "@\/lib\/time\/central"/.test(src);
      const pinsZone = /timeZone:\s*(CENTRAL_TZ|"America\/Chicago")/.test(src);

      expect(
        usesHelper || pinsZone,
        `${rel} formats a time without importing lib/time/central or naming timeZone`,
      ).toBe(true);
    });

    it(`${rel} has no zone-less date/time formatter left`, () => {
      const src = read(rel);
      // Strip the calls that DO pin a zone; anything still matching is bare.
      const withoutPinned = src.replace(
        /new Intl\.DateTimeFormat\([^)]*timeZone[\s\S]{0,400}?\)/g,
        "",
      );
      const bare = [...withoutPinned.matchAll(BARE_FORMATTER)].filter((m) => {
        // A toLocaleString on a NUMBER is thousands-separator formatting, not a
        // time. Those are fine and common ("$52,000", "13,945 rows").
        const before = withoutPinned.slice(Math.max(0, m.index - 220), m.index);
        return /\b(date|time|commenceTime|kickoff|At|d)\b\s*$/i.test(before) || /new Date\([^)]*\)\s*$/.test(before);
      });
      const pinned = /timeZone:\s*(CENTRAL_TZ|"America\/Chicago")/.test(src);
      if (bare.length > 0) {
        expect(pinned, `${rel} still formats a Date without a timeZone option`).toBe(true);
      }
    });
  }

  it("the board labels its timestamp so the zone is never guessed", () => {
    const src = read("app/board/page.tsx");
    expect(src).toMatch(/CT_SUFFIX|["'`]CT["'`]/);
  });
});

describe("lib/time/central", () => {
  // A fixed instant: 2026-09-13T18:06:07Z is the production lastRefresh that
  // rendered as "6:06 PM". In Central (CDT, UTC-5 on this date) it is 1:06 PM.
  const PROD_INSTANT = new Date("2026-09-13T18:06:07.790Z");

  it("renders the production instant as Central, not UTC", () => {
    expect(formatCentralTime(PROD_INSTANT)).toBe("1:06 PM");
    expect(formatCentralTime(PROD_INSTANT)).not.toBe("6:06 PM");
  });

  it("carries a CT marker on the long form", () => {
    expect(formatCentralDateTime(PROD_INSTANT)).toContain("CT");
    expect(formatCentralDateTime(PROD_INSTANT)).toContain("1:06 PM");
  });

  it("honours DST: the same wall clock is CDT in September and CST in December", () => {
    // 18:00Z is 1pm CDT (UTC-5) in September and 12pm CST (UTC-6) in December.
    expect(formatCentralTime(new Date("2026-09-13T18:00:00Z"))).toBe("1:00 PM");
    expect(formatCentralTime(new Date("2026-12-13T18:00:00Z"))).toBe("12:00 PM");
  });

  it("buckets the day on the Central boundary, not the UTC one", () => {
    // 2026-09-14T02:30Z is Sunday 9:30 PM Central — still Sunday's late game,
    // already Monday in UTC. This is the exact shape of a Sunday Night Football
    // kickoff and why a UTC day key mislabels it.
    expect(centralDateKey(new Date("2026-09-14T02:30:00Z"))).toBe("2026-09-13");
    expect(new Date("2026-09-14T02:30:00Z").toISOString().slice(0, 10)).toBe("2026-09-14");
  });

  it("names the zone as America/Chicago so DST is the OS's problem, not ours", () => {
    expect(CENTRAL_TZ).toBe("America/Chicago");
  });
});
