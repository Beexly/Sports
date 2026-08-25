import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { LocalTime } from "@/components/ui/local-time";
import { formatLocalTime } from "@/lib/time/local-time";

/**
 * Kickoff times must never render the server's bare UTC wall clock.
 *
 * The defect this pins: timestamps were formatted during SERVER render with
 * `toLocaleString("en-US", { …, timeZoneName: "short" })` and NO `timeZone`
 * option. Nothing sets `TZ` for the Node runtime (not `next.config.mjs`, not
 * `vercel.json`, not any Docker config), so Node resolved to UTC and baked the
 * UTC wall clock into the HTML for every visitor on earth. A bettor in New York
 * opening /picks for a 1:00 PM ET kickoff read "Sun, Sep 7, 5:00 PM UTC".
 *
 * Two honest idioms now cover the surfaces, and this suite pins both:
 *   1. Headline surfaces (/picks, /board, pick cards) pin Central explicitly
 *      (`timeZone: CENTRAL_TZ` + CT suffix) — a labelled, deterministic zone.
 *   2. Secondary surfaces (preview, game room) defer to <LocalTime>, resolving
 *      on the VIEWER's clock after mount.
 * What must never reappear is the defect itself: a server-rendered wall clock
 * with no `timeZone` option and no zone label.
 *
 * The concrete case pinned throughout: 2025-09-07T17:00:00.000Z.
 *   UTC wall clock (the bug)     -> "Sun, Sep 7, 5:00 PM UTC"
 *   New York (viewer resolution) -> "Sun, Sep 7, 1:00 PM EDT"
 */

const KICKOFF_ISO = "2025-09-07T17:00:00.000Z";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const WEB = resolve(REPO_ROOT, "apps/web");
const readWeb = (rel: string): string => readFileSync(resolve(WEB, rel), "utf8");

/** Surfaces that pin Central explicitly at server render. */
const CENTRAL_SURFACES = [
  "components/picks/pick-card.tsx",
  "app/board/page.tsx",
  "app/picks/page.tsx",
];

/** Surfaces that defer to <LocalTime> (viewer's clock). */
const LOCALTIME_SURFACES = [
  "app/preview/[sport]/[slug]/page.tsx",
  "app/room/[gameId]/page.tsx",
];

const originalTZ = process.env["TZ"];
afterEach(() => {
  if (originalTZ === undefined) delete process.env["TZ"];
  else process.env["TZ"] = originalTZ;
});

describe("headline surfaces pin an explicit zone at server render", () => {
  for (const rel of CENTRAL_SURFACES) {
    it(`${rel} never formats with an unzoned toLocale* call`, () => {
      const src = readWeb(rel);
      // The exact call shape that produced the UTC wall clock: a toLocale*
      // with timeZoneName but no timeZone. Pinning CENTRAL_TZ (or any
      // explicit timeZone) is the fix; the bare shape must not return.
      for (const m of src.matchAll(/toLocale(?:Date|Time)String\s*\(/g)) {
        const call = src.slice(m.index!, m.index! + 400);
        expect(call).toMatch(/timeZone\s*:/);
      }
    });
  }

  it("the Central pin carries a visible zone label", () => {
    for (const rel of CENTRAL_SURFACES) {
      const src = readWeb(rel);
      expect(src).toMatch(/CT_SUFFIX|timeZoneName/);
    }
  });
});

describe("the viewer's clock is what resolves the deferred kickoff", () => {
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

describe("deferred surfaces carry the instant, not a server wall clock", () => {
  for (const rel of LOCALTIME_SURFACES) {
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
});
