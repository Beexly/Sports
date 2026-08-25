import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { getEntitlements, type Entitlements } from "@sports/types";

/**
 * Server-side paywall enforcement for the /fantasy/dfs salary board —
 * executed against the REAL page component and the REAL entitlement resolver
 * (`getViewerEntitlements`), with only the session, the entitlement lookup, and
 * `loadDfsSalaries` mocked.
 *
 * THE LEAK (CLAUDE.md rule #3 — no frontend-only paywalls): /fantasy/dfs SSR'd
 * `loadDfsSalaries()` with no entitlement check at all and rendered the top 24
 * reconciled DraftKings salary rows — `name`, `team`, `position`, `salary` —
 * to any visitor, while the same data behind `/api/dfs/salaries` is gated by
 * `requireFantasyApi()` (FREE → 403).
 *
 * The exploit is a plain anonymous GET:
 *
 *     curl -s https://www.galaxysportsedge.com/fantasy/dfs
 *
 * versus the gated JSON:
 *
 *     curl -s https://www.galaxysportsedge.com/api/dfs/salaries
 *     → 403 {"error":"insufficient_tier"}
 *
 * WHY THIS IS WORSE THAN IT LOOKS — IT FAILS OPEN: today no licensed provider
 * key is configured, so `loadDfsSalaries` short-circuits to status "gated",
 * `live` is false, and only the sample pool renders. Nothing looks wrong. The
 * moment a licensed DraftKings feed is wired up, this page begins publishing
 * reconciled PAID salary rows to anonymous visitors — it breaks exactly when
 * the data becomes valuable and licensing actually binds. These tests therefore
 * force `status: "live"` with real rows, which is the state the leak needs.
 *
 * THE FIX follows the house fantasy idiom (depth-limiting, not a hard lock —
 * see app/fantasy/waivers/page.tsx + lib/fantasy/free-trial.ts): the licensed
 * rows are withheld from unentitled viewers while the page, the honest feed
 * status, and the full optimizer remain free.
 *
 * Invariants asserted here:
 *  - ANONYMOUS / FREE / entitlement-lookup-failure → no licensed salary row
 *    (name, team, or salary) appears anywhere in the document, even with a LIVE
 *    feed; the page still renders with an upsell, never a crash or a blank.
 *  - FANTASY / PRO / ELITE → the board renders exactly as before.
 *  - With NO feed connected, every tier sees the unchanged "not connected" copy,
 *    so this fix is invisible in production until the feed lands.
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ user?: { id?: string } } | null>>(),
  getUserEntitlements: vi.fn<(userId: string) => Promise<Entitlements>>(),
  loadDfsSalaries: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/entitlements", () => ({ getUserEntitlements: mocks.getUserEntitlements }));
vi.mock("@/lib/dfs/salaries", () => ({ loadDfsSalaries: mocks.loadDfsSalaries }));

// The optimizer is a heavy "use client" island that runs entirely on the sample
// pool and carries no licensed salary data — stub it so the render stays focused
// on the gated board. Its presence is asserted via the stub marker.
vi.mock("@/components/fantasy/dfs-optimizer", () => ({
  DfsOptimizer: (): JSX.Element => <div data-testid="dfs-optimizer" />,
}));
vi.mock("@/components/ui/nav", () => ({ Nav: (): null => null }));
vi.mock("@/components/ui/footer", () => ({ Footer: (): null => null }));

// FantasyShell's motion chrome needs browser APIs jsdom lacks; stub it and
// polyfill matchMedia, matching the house pattern in pricing-page-smoke.test.tsx.
vi.mock("@/components/motion/reveal", () => ({
  Reveal: ({ children }: { children: ReactNode }) => children,
  Stagger: ({ children }: { children: ReactNode[] }) => children,
}));
vi.mock("@/components/ui/atmosphere", () => ({ Atmosphere: (): null => null }));

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

import DfsSuitePage from "@/app/fantasy/dfs/page";

/**
 * Licensed rows, with values unique in the document so a substring match cannot
 * be satisfied by unrelated chrome. These are the exact fields the board renders.
 */
const ROWS = [
  { name: "Kolvar Trestleby", team: "KCX", position: "QB", salary: 14237 },
  { name: "Marisol Quintaine", team: "DNV", position: "WR", salary: 13119 },
] as const;

/** Every licensed literal as the board FORMATS it (salary via toLocaleString). */
const LICENSED_LITERALS: readonly string[] = [
  ROWS[0].name,
  ROWS[0].team,
  ROWS[0].salary.toLocaleString(),
  ROWS[1].name,
  ROWS[1].team,
  ROWS[1].salary.toLocaleString(),
];

function liveSalariesFixture() {
  return {
    generatedAt: "2026-01-02T00:00:00.000Z",
    status: "live" as const,
    operator: "DraftKings" as const,
    date: "2026-01-02",
    providers: [],
    connectedProviders: 2,
    rows: ROWS.map((r) => ({
      ...r,
      salariesByProvider: { sportsdataio: r.salary },
      providerCount: 2,
      agreement: "agree" as const,
      spread: 0,
    })),
    discrepancies: 0,
    canPublishPicks: false as const,
    gate: {
      connected: true,
      requiredEnv: [],
      legalNote: "",
      refusedNote: "",
      licensedProviders: ["sportsdataio"],
    },
    error: null,
  };
}

function notConnectedFixture() {
  return {
    ...liveSalariesFixture(),
    status: "gated" as const,
    connectedProviders: 0,
    rows: [],
    gate: {
      connected: false,
      requiredEnv: ["SPORTSDATAIO_API_KEY"],
      legalNote: "",
      refusedNote: "",
      licensedProviders: [],
    },
  };
}

async function renderPage() {
  return render(await DfsSuitePage());
}

function expectNoLicensedRows(html: string): void {
  for (const literal of LICENSED_LITERALS) {
    expect(html, `licensed salary value "${literal}" leaked to an unentitled viewer`).not.toContain(
      literal,
    );
  }
}

describe("/fantasy/dfs — server-side paywall (licensed DraftKings salaries)", () => {
  beforeEach(() => {
    mocks.auth.mockReset().mockResolvedValue(null);
    mocks.getUserEntitlements.mockReset();
    mocks.loadDfsSalaries.mockReset().mockResolvedValue(liveSalariesFixture());
  });

  it("ANONYMOUS + LIVE feed: no licensed salary row reaches the client", async () => {
    const { container } = await renderPage();
    expectNoLicensedRows(container.innerHTML);
  });

  it("ANONYMOUS + LIVE feed: still a real page — optimizer plus an upsell, not a blank", async () => {
    const { container, getByTestId } = await renderPage();
    // The free tool is untouched: the optimizer still renders.
    expect(getByTestId("dfs-optimizer")).toBeInTheDocument();
    // And the viewer is told what is behind the gate, with a way to unlock it.
    expect(container.querySelector('a[href="/pricing"]')).not.toBeNull();
    expect(container.innerHTML.length).toBeGreaterThan(400);
  });

  it("FREE (authenticated) + LIVE feed: no licensed salary row reaches the client", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-free" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FREE"));
    const { container } = await renderPage();
    expectNoLicensedRows(container.innerHTML);
  });

  it("FAILS CLOSED: an entitlement-lookup error shows LESS, never more", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-boom" } });
    mocks.getUserEntitlements.mockRejectedValue(new Error("db down"));
    const { container } = await renderPage();
    expectNoLicensedRows(container.innerHTML);
  });

  it("FAILS CLOSED: a loader error degrades to the honest not-connected copy", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-pro" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("PRO"));
    mocks.loadDfsSalaries.mockRejectedValue(new Error("provider down"));
    const { container } = await renderPage();
    expectNoLicensedRows(container.innerHTML);
    expect(container.innerHTML).toContain("No licensed salary feed is connected");
  });

  it("FANTASY: the paid fantasy tier receives the licensed board", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-fantasy" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FANTASY"));
    const html = (await renderPage()).container.innerHTML;
    for (const literal of LICENSED_LITERALS) {
      expect(html, `entitled viewer must still see "${literal}"`).toContain(literal);
    }
  });

  it("PRO: the licensed board renders unchanged", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-pro" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("PRO"));
    const html = (await renderPage()).container.innerHTML;
    for (const literal of LICENSED_LITERALS) {
      expect(html).toContain(literal);
    }
  });

  it("ELITE: the licensed board renders unchanged", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-elite" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("ELITE"));
    expect((await renderPage()).container.innerHTML).toContain(ROWS[0].name);
  });

  it("NO feed connected: every tier sees the unchanged honest copy (fix is invisible today)", async () => {
    mocks.loadDfsSalaries.mockResolvedValue(notConnectedFixture());

    const anon = (await renderPage()).container.innerHTML;
    expect(anon).toContain("No licensed salary feed is connected");

    mocks.auth.mockResolvedValue({ user: { id: "u-pro" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("PRO"));
    const pro = (await renderPage()).container.innerHTML;
    expect(pro).toContain("No licensed salary feed is connected");
  });
});
