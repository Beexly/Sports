import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { getEntitlements, type Entitlements } from "@sports/types";

/**
 * Server-side paywall enforcement for the /nflverse usage-pulse page —
 * executed against the REAL page component and the REAL entitlement resolver
 * (`getViewerEntitlements`), with only the session, the entitlement lookup, and
 * the three nflverse loaders mocked.
 *
 * THE LEAK (CLAUDE.md rule #3 — no frontend-only paywalls): /nflverse SSR'd the
 * full Pro usage pulse to ANY visitor with zero entitlement references in the
 * file — no gate, no notFound(), no redirect. It rendered a per-player,
 * per-week table of `opportunities`, `targets`, `carries`, `targetShare`,
 * `airYardsShare`, `wopr`, `fantasyPointsPpr` and `age`, plus the QB-age
 * cohort table and both trend reports.
 *
 * The exploit was a plain anonymous GET:
 *
 *     curl -s https://www.galaxysportsedge.com/nflverse
 *
 * while the JSON behind the very same data 401s:
 *
 *     curl -s https://www.galaxysportsedge.com/api/nflverse/usage-pulse
 *     → 401 {"error":"authentication_required"}
 *
 * The page even rendered a "JSON pulse" button linking to that 401-ing endpoint,
 * directly above the data it was giving away as HTML.
 *
 * That it was an oversight rather than a design choice is provable from
 * app/trends/page.tsx, which imports the SAME two trend loaders and gates on
 * `canUseTrendLab` BEFORE calling them. This page now copies that idiom exactly.
 *
 * Invariants asserted here:
 *  - ANONYMOUS / FREE / FANTASY / entitlement-lookup-failure → none of the paid
 *    per-player numbers appear anywhere in the rendered document, and the
 *    loaders are NEVER INVOKED (gating before the load is a separate guarantee:
 *    an unentitled visitor must not trigger the upstream nflverse fetches).
 *  - The under-tier viewer still gets a real page: hero copy + the upsell seal.
 *  - PRO / ELITE → the pulse renders exactly as before (unchanged for members).
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ user?: { id?: string } } | null>>(),
  getUserEntitlements: vi.fn<(userId: string) => Promise<Entitlements>>(),
  loadNflverseUsagePulse: vi.fn(),
  loadQbAgeRbTrendReport: vi.fn(),
  loadBirthdayUsageTrendReport: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/entitlements", () => ({ getUserEntitlements: mocks.getUserEntitlements }));

vi.mock("@/lib/nflverse/usage-pulse", () => ({
  loadNflverseUsagePulse: mocks.loadNflverseUsagePulse,
}));
vi.mock("@/lib/nflverse/qb-age-rb-trend", () => ({
  loadQbAgeRbTrendReport: mocks.loadQbAgeRbTrendReport,
}));
vi.mock("@/lib/nflverse/birthday-usage-trend", () => ({
  loadBirthdayUsageTrendReport: mocks.loadBirthdayUsageTrendReport,
}));

// Session-aware chrome and decorative plates carry no pulse data — stub them so
// the render stays focused on the gated table.
vi.mock("@/components/ui/nav", () => ({ Nav: (): null => null }));
vi.mock("@/components/ui/footer", () => ({ Footer: (): null => null }));
vi.mock("@/components/immersive/generated-plate", () => ({
  GeneratedPlate: (): null => null,
}));
vi.mock("@/components/ui/attribution", () => ({ Attribution: (): null => null }));

import NflversePage from "@/app/nflverse/page";

/**
 * Paid per-player fields, given values that are unique in the document so a
 * substring match cannot be satisfied by unrelated chrome (row counts, dates,
 * season numbers). These are the exact fields the leaked table rendered.
 */
const PAID = {
  playerName: "Zeddicus Pulsar",
  opportunities: 9137,
  targets: 8421,
  carries: 7316,
  targetShare: 0.4821, // → "48.2%"
  airYardsShare: 0.3947, // → "39.5%"
  wopr: 6.53, // → "6.53"
  fantasyPointsPpr: 91.7, // → "91.7"
  age: 3388,
  qbName: "Alaric Vantablack",
  passAttempts: 5529,
  rbTargets: 4417,
} as const;

/** Every paid literal as it is FORMATTED into the HTML by the page. */
const PAID_LITERALS: readonly string[] = [
  PAID.playerName,
  String(PAID.opportunities),
  String(PAID.targets),
  String(PAID.carries),
  "48.2%",
  "39.5%",
  "6.53",
  "91.7",
  String(PAID.age),
  PAID.qbName,
  String(PAID.passAttempts),
  String(PAID.rbTargets),
];

function pulseFixture() {
  return {
    generatedAt: "2026-01-02T00:00:00.000Z",
    status: "live" as const,
    season: 2025,
    week: 12,
    seasonType: "REG" as const,
    sourceRows: 4242,
    seasonRows: 3131,
    latestWeekRows: 212,
    playerRows: [
      {
        playerId: "zp-1",
        playerName: PAID.playerName,
        team: "KC",
        opponent: "DEN",
        position: "WR",
        targets: PAID.targets,
        receptions: 6,
        carries: PAID.carries,
        opportunities: PAID.opportunities,
        targetShare: PAID.targetShare,
        airYardsShare: PAID.airYardsShare,
        wopr: PAID.wopr,
        receivingAirYards: 120,
        receivingYards: 88,
        rushingYards: 12,
        fantasyPointsPpr: PAID.fantasyPointsPpr,
        age: PAID.age,
        headshotUrl: null,
      },
    ],
    qbAgeRows: [
      {
        team: "KC",
        opponent: "DEN",
        qbName: PAID.qbName,
        qbAge: 36,
        qbAgeBucket: "34+" as const,
        passAttempts: PAID.passAttempts,
        teamTargets: 40,
        rbTargets: PAID.rbTargets,
        rbTargetShare: 0.2211,
      },
    ],
    canPublishTrends: false as const,
    blockReason: "Publication blocked pending persisted joins.",
    sourceUrls: { playerStats: "https://example.invalid/ps", rosters: "https://example.invalid/r" },
    error: null,
  };
}

function qbAgeTrendFixture() {
  return {
    trends: [
      {
        cohort: "QB age 34+",
        n: 611,
        baselineN: 7220,
        cohortMean: 0.1913,
        baselineMean: 0.1744,
        relativeDelta: 0.0969,
        pValue: 0.0004,
        significant: true,
      },
    ],
    quality: { observationsUsed: 7831 },
    seasonRange: { start: 2016, end: 2025 },
    boundary: "Read-only research result; not a scoring factor.",
    examples: [],
    sourceRows: { players: 1, schedules: 1 },
  };
}

function birthdayTrendFixture() {
  return {
    result: {
      label: "Birthday window",
      metric: "absolute-opportunity-delta" as const,
      n: 512,
      baselineN: 6100,
      cohortMean: 0.12,
      absoluteDelta: 0.09,
      pValue: 0.41,
      gate: "rejected",
    },
    quality: { observationsUsed: 6612 },
    seasonRange: { start: 2016, end: 2025 },
    boundary: "Rejected narrative; not publishable.",
    sensitivity: [],
    milestoneSensitivity: [],
    positionBreakdown: [],
    sourceUrls: { players: "https://example.invalid/p", schedules: "https://example.invalid/s" },
  };
}

async function renderPage() {
  return render(await NflversePage());
}

function expectNoPaidValues(html: string): void {
  for (const literal of PAID_LITERALS) {
    expect(html, `paid value "${literal}" leaked to an unentitled viewer`).not.toContain(literal);
  }
}

function expectLoadersNeverCalled(): void {
  expect(
    mocks.loadNflverseUsagePulse,
    "the usage pulse must not even be LOADED for an unentitled viewer",
  ).not.toHaveBeenCalled();
  expect(mocks.loadQbAgeRbTrendReport).not.toHaveBeenCalled();
  expect(mocks.loadBirthdayUsageTrendReport).not.toHaveBeenCalled();
}

describe("/nflverse — server-side paywall (Pro usage pulse)", () => {
  beforeEach(() => {
    mocks.auth.mockReset().mockResolvedValue(null);
    mocks.getUserEntitlements.mockReset();
    mocks.loadNflverseUsagePulse.mockReset().mockResolvedValue(pulseFixture());
    mocks.loadQbAgeRbTrendReport.mockReset().mockResolvedValue(qbAgeTrendFixture());
    mocks.loadBirthdayUsageTrendReport.mockReset().mockResolvedValue(birthdayTrendFixture());
  });

  it("ANONYMOUS: no paid pulse values render, and the loaders never run", async () => {
    const { container } = await renderPage();
    expectNoPaidValues(container.innerHTML);
    expectLoadersNeverCalled();
  });

  it("ANONYMOUS: still gets a real page — hero copy plus the upsell seal", async () => {
    const { container, getByText } = await renderPage();
    expect(getByText("Real NFL rows before real claims.")).toBeInTheDocument();
    expect(
      container.querySelector('[aria-label="The NFLverse usage pulse: for PRO members only"]'),
    ).not.toBeNull();
    // An honest paywall, not a crash or a blank page.
    expect(container.innerHTML.length).toBeGreaterThan(400);
  });

  it("FREE (authenticated): no paid pulse values render, and the loaders never run", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-free" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FREE"));
    const { container } = await renderPage();
    expectNoPaidValues(container.innerHTML);
    expectLoadersNeverCalled();
  });

  it("FANTASY: the fantasy tier is NOT the betting-analytics tier — still gated", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-fantasy" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FANTASY"));
    const { container } = await renderPage();
    expectNoPaidValues(container.innerHTML);
    expectLoadersNeverCalled();
  });

  it("FAILS CLOSED: an entitlement-lookup error shows LESS, never more", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-boom" } });
    mocks.getUserEntitlements.mockRejectedValue(new Error("db down"));
    const { container } = await renderPage();
    expectNoPaidValues(container.innerHTML);
    expectLoadersNeverCalled();
  });

  it("FAILS CLOSED: an auth() error shows LESS, never more", async () => {
    mocks.auth.mockRejectedValue(new Error("session store down"));
    const { container } = await renderPage();
    expectNoPaidValues(container.innerHTML);
    expectLoadersNeverCalled();
  });

  it("PRO: the pulse renders unchanged for entitled members", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-pro" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("PRO"));
    const { container } = await renderPage();
    const html = container.innerHTML;
    for (const literal of PAID_LITERALS) {
      expect(html, `entitled viewer must still see "${literal}"`).toContain(literal);
    }
    expect(mocks.loadNflverseUsagePulse).toHaveBeenCalledTimes(1);
    expect(mocks.loadQbAgeRbTrendReport).toHaveBeenCalledTimes(1);
    expect(mocks.loadBirthdayUsageTrendReport).toHaveBeenCalledTimes(1);
  });

  it("ELITE: the pulse renders unchanged for entitled members", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-elite" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("ELITE"));
    const { container } = await renderPage();
    expect(container.innerHTML).toContain(PAID.playerName);
    expect(mocks.loadNflverseUsagePulse).toHaveBeenCalledTimes(1);
  });
});
