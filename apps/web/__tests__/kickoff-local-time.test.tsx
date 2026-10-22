import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { render, screen } from "@testing-library/react";
import type { PublicPick } from "@sports/types";
import { PickCard } from "@/components/picks/pick-card";
import { LocalTime } from "@/components/ui/local-time";
import { formatLocalTime } from "@/lib/time/local-time";

/**
 * Kickoff times must never bake in a zone-less server clock.
 *
 * The defect this pins: every kickoff was formatted during SERVER render with
 * `toLocaleString("en-US", { …, timeZoneName: "short" })` and NO `timeZone`
 * option. Nothing sets `TZ` for the Node runtime (not `next.config.mjs`, not
 * `vercel.json`, not any Docker config), so Node resolved to UTC and baked the
 * UTC wall clock into the HTML for every visitor on earth. A bettor in New York
 * opening /picks for a 1:00 PM ET kickoff read "Sun, Sep 7, 5:00 PM UTC".
 *
 * Founder, 2026-09-12: "all times should be from CST central time." The three
 * slate surfaces (pick card, board, picks page) now pin CENTRAL explicitly via
 * lib/time/central with a CT label — deterministic, identical for every
 * viewer. /preview and /room keep the original viewer-clock <LocalTime>
 * deferral. Either idiom closes the UTC bake; a zone-less formatter may not
 * survive on any of them.
 *
 * The concrete case pinned throughout: 2025-09-07T17:00:00.000Z.
 *   UTC wall clock (the bug)        -> "Sun, Sep 7, 5:00 PM UTC"
 *   Central (what the card now says)-> "Sun, Sep 7 · 12:00 PM CT"
 */

const KICKOFF_ISO = "2025-09-07T17:00:00.000Z";
const UTC_WALL_CLOCK = "5:00 PM";
const ET_WALL_CLOCK = "1:00 PM";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const WEB = resolve(REPO_ROOT, "apps/web");
const readWeb = (rel: string): string => readFileSync(resolve(WEB, rel), "utf8");

const SAMPLE_PICK: PublicPick = {
  id: "pick-tz-1",
  game: {
    homeTeam: "Dallas Cowboys",
    awayTeam: "Philadelphia Eagles",
    commenceTime: KICKOFF_ISO,
    sport: "NFL",
  },
  pickType: "SPREAD",
  selection: "Philadelphia Eagles -2.5",
  line: -2.5,
  lineMovement: null,
  confidence: null,
  edgeScore: null,
  factorBreakdown: null,
  dataQualityScore: 82,
  tier: "FREE",
  pickGrade: "LEAN",
  riskLevel: "MODERATE",
  reasoning: "Illustrative fixture row; never published.",
  reasoningShort: "Illustrative fixture row.",
  isFeatured: false,
  isAuditAvailable: false,
  generatedAt: "2025-09-07T12:00:00.000Z",
  dataFreshnessAt: "2025-09-07T12:00:00.000Z",
  result: "PENDING",
};

/**
 * Two honest idioms now cover customer-facing times (the same dual contract
 * public-surface-local-time pins on the deferred surfaces):
 *   1. The three slate surfaces (pick card, board, picks page) pin CENTRAL
 *      explicitly via lib/time/central with a CT label — founder 2026-09-12.
 *   2. /preview and /room still defer to <LocalTime>, resolving on the
 *      VIEWER's clock after mount.
 * Either way, no zone-less formatter may survive on a server surface.
 */
const CENTRAL_SURFACES = [
  "components/picks/pick-card.tsx",
  "app/board/page.tsx",
  "app/picks/page.tsx",
];

/** Every surface fixed here, and the timestamp each one renders. */
const DEFERRED_SURFACES = [
  "app/preview/[sport]/[slug]/page.tsx",
  "app/room/[gameId]/page.tsx",
];

const originalTZ = process.env["TZ"];
afterEach(() => {
  if (originalTZ === undefined) delete process.env["TZ"];
  else process.env["TZ"] = originalTZ;
});

describe("server render never bakes a UTC wall clock into a kickoff", () => {
  it("PickCard renders the kickoff in Central with an explicit CT label", () => {
    // Founder, 2026-09-12: "all times should be from CST central time." The
    // card formats with an explicit timeZone (lib/time/central), so the server
    // render is byte-for-byte identical for every visitor, whatever zone the
    // Node runtime runs in — and it can never bake in a UTC wall clock. (The
    // render below is deliberately NOT asserted against this process's own
    // resolvedOptions().timeZone: with the zone explicit, that env value is
    // irrelevant — the sibling test proves it by moving TZ.)

    const html = renderToStaticMarkup(
      <PickCard
        pick={SAMPLE_PICK}
        canSeeConfidence={false}
        canSeeEdgeScore={false}
        canSeeFactorBreakdown={false}
      />,
    );

    // 17:00Z is 12:00 PM Central (CDT, UTC-5 on this date), labelled CT.
    expect(html).toContain("12:00 PM CT");
    // The concrete failure of the old doctrine: a 1:00 PM ET kickoff served
    // as 5:00 PM UTC. Neither the UTC clock nor a guessed viewer clock may
    // reappear, and no zone-less clock face at all.
    expect(html).not.toContain(UTC_WALL_CLOCK);
    expect(html).not.toContain("UTC");
    expect(html).not.toContain("Sun, Sep 7, 5:00 PM UTC");
    expect(html).not.toContain(ET_WALL_CLOCK);

    // The instant itself still crosses for machines: the <time datetime>.
    expect(html).toContain(KICKOFF_ISO);
    expect(html.toLowerCase()).toContain(`datetime="${KICKOFF_ISO.toLowerCase()}"`);
  });

  it("renders the SAME Central wall clock under a different server zone", () => {
    // The zone is explicit, so the Node process's TZ cannot move the output.
    process.env["TZ"] = "America/New_York";
    const html = renderToStaticMarkup(
      <PickCard
        pick={SAMPLE_PICK}
        canSeeConfidence={false}
        canSeeEdgeScore={false}
        canSeeFactorBreakdown={false}
      />,
    );
    expect(html).toContain("12:00 PM CT");
    expect(html).not.toContain("1:00 PM");
  });

  it("labels the kickoff for screen readers instead of leaving a bare blank", () => {
    const html = renderToStaticMarkup(
      <PickCard
        pick={SAMPLE_PICK}
        canSeeConfidence={false}
        canSeeEdgeScore={false}
        canSeeFactorBreakdown={false}
      />,
    );
    // The meaning of the value is never carried by position alone, and the
    // stamp is fully resolved at render (no deferred/pending state).
    expect(html).toContain("Kickoff:");
    expect(html).not.toContain('data-localtime="pending"');
    expect(html).toContain("12:00 PM CT");
  });
});

describe("the viewer's clock is what resolves the kickoff", () => {
  it("formats a known instant against the viewer's zone, not the server's", () => {
    expect(formatLocalTime(KICKOFF_ISO, "kickoff", "America/New_York")).toBe(
      "Sun, Sep 7, 1:00 PM EDT",
    );
    expect(formatLocalTime(KICKOFF_ISO, "kickoff", "America/Los_Angeles")).toBe(
      "Sun, Sep 7, 10:00 AM PDT",
    );
    // A late kickoff also moves the DATE for a US viewer, which is why the
    // preview page's date line is deferred too, not just its time line.
    expect(formatLocalTime("2025-09-08T00:20:00.000Z", "date-long", "America/New_York")).toBe(
      "Sunday, September 7, 2025",
    );
  });

  it("returns null for an instant it cannot parse, rather than inventing one", () => {
    expect(formatLocalTime("not-a-date", "kickoff")).toBeNull();
  });

  it("renders the New York wall clock once mounted on a New York viewer's device", () => {
    process.env["TZ"] = "America/New_York";

    render(<LocalTime iso={KICKOFF_ISO} format="kickoff" label="Kickoff" />);

    const el = screen.getByText(/1:00\s?PM/);
    expect(el.textContent).toContain("Sun, Sep 7, 1:00 PM EDT");
    expect(el.textContent).not.toContain("5:00 PM");
    expect(el.textContent).not.toContain("UTC");

    const time = el.closest("time");
    expect(time?.getAttribute("datetime")).toBe(KICKOFF_ISO);
    expect(time?.getAttribute("data-localtime")).toBe("resolved");
    expect(time?.textContent).toContain("Kickoff:");
  });
});

describe("no customer-facing surface formats a timestamp during server render", () => {
  for (const rel of CENTRAL_SURFACES) {
    it(`${rel} pins Central explicitly (lib/time/central)`, () => {
      const src = readWeb(rel);
      // The exact call shape that produced the UTC wall clock. Any of these
      // reappearing on a server surface re-opens the defect.
      expect(src).not.toMatch(/toLocaleTimeString\s*\(/);
      expect(src).not.toMatch(/toLocaleDateString\s*\(/);
      expect(src).not.toMatch(/new Date\([^)]*\)\.toLocaleString\s*\(/);
      expect(src).toMatch(/from\s+"@\/lib\/time\/central"/);
    });
  }

  for (const rel of DEFERRED_SURFACES) {
    it(`${rel} defers its timestamps to <LocalTime>`, () => {
      const src = readWeb(rel);
      // The exact call shape that produced the UTC wall clock. Any of these
      // reappearing on a server surface re-opens the defect.
      expect(src).not.toMatch(/toLocaleTimeString\s*\(/);
      expect(src).not.toMatch(/toLocaleDateString\s*\(/);
      expect(src).not.toMatch(/new Date\([^)]*\)\.toLocaleString\s*\(/);
      expect(src).toContain("LocalTime");
    });
  }

  it("the game room no longer prints a raw unlabelled ISO slice", () => {
    const src = readWeb("app/room/[gameId]/page.tsx");
    expect(src).not.toContain("fetchedAt.slice(0, 16)");
  });

  it("LocalTime is a client leaf and drags no server-only import across the boundary", () => {
    const src = readWeb("components/ui/local-time.tsx");
    expect(src.trimStart().startsWith('"use client"')).toBe(true);
    const imports = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
    expect(imports).toEqual(["react", "@/lib/time/local-time"]);

    // The pure formatter it imports must stay free of client-only markers too,
    // so SERVER pages can keep importing isRealInstant from it.
    const helper = readWeb("lib/time/local-time.ts");
    expect(helper.trimStart().startsWith('"use client"')).toBe(false);
    expect(helper).not.toMatch(/from\s+"react"/);
  });

  it("pick-card stays a server component", () => {
    const src = readWeb("components/picks/pick-card.tsx");
    expect(src).not.toContain('"use client"');
  });
});
