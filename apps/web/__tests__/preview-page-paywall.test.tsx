import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { getEntitlements, type Entitlements } from "@sports/types";

/**
 * Server-side paywall enforcement for the /preview/[sport]/[slug] SEO page —
 * executed against the REAL page component and its REAL entitlement resolver
 * (`getViewerEntitlements`), with only the session, the user-entitlement lookup,
 * and the db mocked.
 *
 * CLAUDE.md rule #3 (no frontend-only paywalls): the preview page is a PUBLIC
 * programmatic-SEO surface, but it was rendering two of the platform's paid
 * metrics to anonymous visitors with NO entitlement check:
 *
 *  - the spread line-movement delta (`game.lineMovementSpread`) — the Pro-tier
 *    market read the board (`/api/picks`) and the game room (#109) gate behind
 *    `canSeeLineMovement` (FREE = false), and
 *  - the pick's confidence score (`pick.confidence`) — gated behind
 *    `canSeeConfidence` on the board — in the page body, the meta description,
 *    and the FAQ JSON-LD.
 *
 * The regression this pins: an anonymous `curl https://.../preview/nfl/<slug>`
 * (viewer → FREE, fail-closed) read both paid values straight out of the HTML.
 *
 * Invariants:
 *  - ANONYMOUS / FREE / FANTASY / entitlement-lookup-failure → neither the
 *    movement delta nor the confidence number appears ANYWHERE in the rendered
 *    document (body, JSON-LD, metadata); honest locked hints render instead,
 *    and the free-visible facts (selection, line, opening spread, short
 *    reasoning teaser) still render.
 *  - PRO / ELITE → both values render exactly as before (unchanged behavior
 *    for entitled viewers), with no locked hints.
 */

const mocks = vi.hoisted(() => ({
  gameFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  sportFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  auth: vi.fn<() => Promise<{ user?: { id?: string } } | null>>(),
  getUserEntitlements: vi.fn<(userId: string) => Promise<Entitlements>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    game: { findMany: mocks.gameFindMany },
    sport: { findMany: mocks.sportFindMany },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/entitlements", () => ({
  getUserEntitlements: mocks.getUserEntitlements,
}));

// Nav is an async server component (session-aware) and Footer is pure chrome —
// neither carries game data. Stub them so the render stays focused on the page.
vi.mock("@/components/ui/nav", () => ({ Nav: (): null => null }));
vi.mock("@/components/ui/footer", () => ({ Footer: (): null => null }));

// next/script injects via effects in the browser; render a plain <script> so the
// JSON-LD payload is part of the asserted document exactly as it ships in HTML.
vi.mock("next/script", () => ({
  default: (props: {
    id?: string;
    type?: string;
    dangerouslySetInnerHTML?: { __html: string };
  }): JSX.Element => (
    <script
      id={props.id}
      type={props.type}
      dangerouslySetInnerHTML={props.dangerouslySetInnerHTML}
    />
  ),
}));

import PreviewPage, {
  generateMetadata,
} from "@/app/preview/[sport]/[slug]/page";

// Concrete premium values baked into the fixture so we can assert the exact
// numbers cross the gate (or don't). Chosen to be unique in the document:
// confidence 91 and movement -2.7 collide with no other fixture value.
const CONFIDENCE = 91;
const MOVEMENT = -2.7; // renders as "-2.7 (spread)" for entitled viewers

// The Sport row backing the "/preview/nfl/…" param: the URL segment resolves
// via slugify(Sport.name), never the cuid. The id is letters-only so it cannot
// collide with the "91" / "-2.7" / "/100" leak assertions below.
function sportFixture() {
  return { id: "cmsportnflzz", key: "americanfootball_nfl", name: "NFL" };
}

function gameFixture() {
  return {
    id: "game-1",
    sportId: "cmsportnflzz", // games reference the Sport cuid — rendering must use Sport.name
    status: "SCHEDULED",
    homeTeamName: "Chiefs",
    awayTeamName: "Broncos",
    commenceTime: new Date("2026-07-12T20:00:00.000Z"),
    openingSpread: -2.5,
    openingTotal: 47.5,
    lineMovementSpread: MOVEMENT,
    lineMovementTotal: 1.5,
    picks: [
      {
        id: "pick-1",
        pickType: "SPREAD",
        selection: "Chiefs -3.5",
        line: -3.5,
        confidence: CONFIDENCE,
        reasoningShort: "Market and rest edges align.",
      },
    ],
  };
}

const PARAMS = { params: Promise.resolve({ sport: "nfl", slug: "broncos-vs-chiefs" }) };

async function renderPage() {
  return render(await PreviewPage(PARAMS));
}

function expectNoPremiumValues(html: string): void {
  // The Pro-tier movement delta must not appear under any key or format.
  // (The bare "(spread)" market label is free info — the delta is the leak.)
  expect(html).not.toContain("-2.7");
  // The paid confidence number must not appear — body, JSON-LD, anywhere.
  expect(html).not.toContain("91");
  expect(html).not.toContain("/100");
}

function expectFreeFactsStillRender(html: string): void {
  expect(html).toContain("Chiefs -3.5"); // selection + line are free (board parity)
  expect(html).toContain("-2.5"); // opening spread is public odds data
  expect(html).toContain("Market and rest edges align."); // free reasoning teaser
}

describe("/preview/[sport]/[slug] — server-side paywall (line movement + confidence)", () => {
  beforeEach(() => {
    mocks.gameFindMany.mockReset().mockResolvedValue([gameFixture()]);
    mocks.sportFindMany.mockReset().mockResolvedValue([sportFixture()]);
    mocks.auth.mockReset().mockResolvedValue(null);
    mocks.getUserEntitlements.mockReset();
  });

  it("ANONYMOUS: no movement delta, no confidence number, locked hints render", async () => {
    const { container, getByText } = await renderPage();
    const html = container.innerHTML;

    expectNoPremiumValues(html);
    expectFreeFactsStillRender(html);

    // Honest locked/upgrade hints in place of the paid values.
    expect(getByText("Confidence unlocks with Pro").getAttribute("href")).toBe("/pricing");
    expect(getByText("Unlocks with Pro").getAttribute("href")).toBe("/pricing");
  });

  it("FREE (logged in): identical to anonymous — values withheld, hints render", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-free" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FREE"));

    const { container, getByText } = await renderPage();
    const html = container.innerHTML;

    expectNoPremiumValues(html);
    expectFreeFactsStillRender(html);
    expect(getByText("Confidence unlocks with Pro")).toBeInTheDocument();
    expect(getByText("Unlocks with Pro")).toBeInTheDocument();
  });

  it("FANTASY is treated as FREE on the betting preview (no full-board access)", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-fantasy" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FANTASY"));

    const { container } = await renderPage();
    expectNoPremiumValues(container.innerHTML);
  });

  it("fails CLOSED: entitlement lookup failure renders as FREE, never as paid", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-broken" } });
    mocks.getUserEntitlements.mockRejectedValue(new Error("db down"));

    const { container, getByText } = await renderPage();
    expectNoPremiumValues(container.innerHTML);
    expect(getByText("Unlocks with Pro")).toBeInTheDocument();
  });

  it("PRO: movement delta and confidence render exactly as before, no locked hints", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-pro" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("PRO"));

    const { container, queryByText } = await renderPage();
    const text = container.textContent ?? "";

    expect(text).toContain("Confidence 91/100");
    expect(text).toContain("-2.7 (spread)");
    expect(queryByText("Confidence unlocks with Pro")).toBeNull();
    expect(queryByText("Unlocks with Pro")).toBeNull();
  });

  it("ELITE: full premium (unchanged for entitled viewers)", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-elite" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("ELITE"));

    const { container } = await renderPage();
    const text = container.textContent ?? "";
    expect(text).toContain("Confidence 91/100");
    expect(text).toContain("-2.7 (spread)");
  });

  it("JSON-LD for un-entitled viewers keeps the free facts but never the confidence", async () => {
    const { container } = await renderPage();
    const scripts = Array.from(
      container.querySelectorAll('script[type="application/ld+json"]'),
    );
    expect(scripts.length).toBeGreaterThan(0);
    const jsonLd = scripts.map((s) => s.innerHTML).join("\n");
    expect(jsonLd).toContain("Chiefs -3.5");
    expect(jsonLd).not.toContain("91");
    expect(jsonLd).not.toContain("/100");
  });
});

describe("/preview/[sport]/[slug] — generateMetadata paywall", () => {
  beforeEach(() => {
    mocks.gameFindMany.mockReset().mockResolvedValue([gameFixture()]);
    mocks.sportFindMany.mockReset().mockResolvedValue([sportFixture()]);
    mocks.auth.mockReset().mockResolvedValue(null);
    mocks.getUserEntitlements.mockReset();
  });

  it("anonymous metadata keeps the free pick facts but never the confidence number", async () => {
    const metadata = await generateMetadata(PARAMS);
    expect(metadata.title).toBe("Broncos vs Chiefs prediction & pick | NFL");
    expect(metadata.description).toContain("Chiefs -3.5");
    expect(metadata.description).not.toContain("91");
    expect(metadata.description).not.toContain("confidence");
  });

  it("PRO metadata is unchanged — confidence stays in the description", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-pro" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("PRO"));

    const metadata = await generateMetadata(PARAMS);
    expect(metadata.description).toContain("91/100 confidence");
  });
});
