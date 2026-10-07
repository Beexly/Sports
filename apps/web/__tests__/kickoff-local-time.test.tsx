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
 * Kickoff times must render on the VIEWER's clock, never the server's.
 *
 * The defect this pins: every kickoff was formatted during SERVER render with
 * `toLocaleString("en-US", { …, timeZoneName: "short" })` and NO `timeZone`
 * option. Nothing sets `TZ` for the Node runtime (not `next.config.mjs`, not
 * `vercel.json`, not any Docker config), so Node resolved to UTC and baked the
 * UTC wall clock into the HTML for every visitor on earth. A bettor in New York
 * opening /picks for a 1:00 PM ET kickoff read "Sun, Sep 7, 5:00 PM UTC".
 *
 * It produced no hydration warning and no flash, so nothing surfaced it: it was
 * simply, consistently wrong for essentially the entire US audience, on the one
 * number a bettor cannot afford to have wrong.
 *
 * The concrete case pinned throughout: 2025-09-07T17:00:00.000Z.
 *   UTC wall clock (the bug)     -> "Sun, Sep 7, 5:00 PM UTC"
 *   New York (what a bettor sees)-> "Sun, Sep 7, 1:00 PM EDT"
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

/** Every surface fixed here, and the timestamp each one renders. */
const FIXED_SURFACES = [
  "components/picks/pick-card.tsx",
  "app/board/page.tsx",
  "app/preview/[sport]/[slug]/page.tsx",
  "app/picks/page.tsx",
  "app/room/[gameId]/page.tsx",
];

const originalTZ = process.env["TZ"];
afterEach(() => {
  if (originalTZ === undefined) delete process.env["TZ"];
  else process.env["TZ"] = originalTZ;
});

describe("server render never bakes a UTC wall clock into a kickoff", () => {
  it("PickCard emits the ISO instant, not the server's UTC formatting", () => {
    // The suite runs with the same UTC default the production Node runtime has,
    // so this render is byte-for-byte the one a visitor's browser receives.
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("UTC");

    const html = renderToStaticMarkup(
      <PickCard
        pick={SAMPLE_PICK}
        canSeeConfidence={false}
        canSeeEdgeScore={false}
        canSeeFactorBreakdown={false}
      />,
    );

    // The concrete failure: a 1:00 PM ET kickoff served as 5:00 PM UTC.
    expect(html).not.toContain(UTC_WALL_CLOCK);
    expect(html).not.toContain("UTC");
    expect(html).not.toContain("Sun, Sep 7, 5:00 PM UTC");
    // ...and no other zone is guessed at on the server either.
    expect(html).not.toContain(ET_WALL_CLOCK);

    // What DOES cross the boundary is the instant itself.
    expect(html).toContain(KICKOFF_ISO);
    expect(html.toLowerCase()).toContain(`datetime="${KICKOFF_ISO.toLowerCase()}"`);
  });

  it("labels the deferred kickoff for screen readers instead of leaving a bare blank", () => {
    const html = renderToStaticMarkup(
      <PickCard
        pick={SAMPLE_PICK}
        canSeeConfidence={false}
        canSeeEdgeScore={false}
        canSeeFactorBreakdown={false}
      />,
    );
    // The meaning of the value is never carried by position alone.
    expect(html).toContain("Kickoff:");
    expect(html).toContain('data-localtime="pending"');
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
  for (const rel of FIXED_SURFACES) {
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
