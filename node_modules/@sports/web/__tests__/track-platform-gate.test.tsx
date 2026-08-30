import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * /track/platform — the Elite CLV ledger view (PL8). Pins the three
 * properties that make this a real server-side paywall, not a blur:
 *
 *  1. A non-ELITE viewer gets the TierGatePanel — never the table.
 *  2. A non-ELITE viewer's request NEVER reaches db.pick.findMany. This is
 *     the CLAUDE.md "no frontend-only paywalls" guarantee: the gated data
 *     must not even be loaded, not merely hidden client-side.
 *  3. An ELITE viewer sees the real ledger rows, shaped by the tested
 *     shapeClvLedgerRows() (exercised via the mocked db here, not re-tested).
 */

vi.mock("@/components/ui/nav", () => ({ Nav: (): null => null }));
vi.mock("@/components/ui/footer", () => ({ Footer: (): null => null }));
vi.mock("@/components/ui/atmosphere", () => ({ Atmosphere: (): null => null }));
vi.mock("@/components/motion/reveal", () => ({
  Reveal: ({ children }: { children: ReactNode }) => children,
}));

const mocks = vi.hoisted(() => ({
  entitlements: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/pricing/tier-access", () => ({
  getViewerEntitlements: mocks.entitlements,
}));
vi.mock("@sports/db", () => ({
  db: { pick: { findMany: mocks.findMany } },
}));

import TrackPlatformPage from "@/app/track/platform/page";

function entitlements(canUseClvLedger: boolean) {
  return { canUseClvLedger, tier: canUseClvLedger ? "ELITE" : "FREE" } as never;
}

beforeEach(() => {
  mocks.entitlements.mockReset();
  mocks.findMany.mockReset();
});

describe("/track/platform gate", () => {
  it("a non-ELITE viewer sees the tier gate, never the ledger table", async () => {
    mocks.entitlements.mockResolvedValue(entitlements(false));
    render(await TrackPlatformPage());
    expect(screen.getByLabelText(/for ELITE members only/i)).toBeTruthy();
    expect(screen.queryByTestId("clv-ledger-table")).toBeNull();
    expect(screen.queryByTestId("clv-ledger-empty")).toBeNull();
  });

  it("a non-ELITE viewer's request never reaches db.pick.findMany (server-side gate, not a blur)", async () => {
    mocks.entitlements.mockResolvedValue(entitlements(false));
    render(await TrackPlatformPage());
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("an ELITE viewer sees the real ledger rows", async () => {
    mocks.entitlements.mockResolvedValue(entitlements(true));
    mocks.findMany.mockResolvedValue([
      {
        id: "pick-1",
        pickType: "SPREAD",
        selection: "Chiefs -3.5",
        line: -3.5,
        result: "WIN",
        settledAt: new Date("2026-08-20T00:00:00.000Z"),
        clvValue: 1.4,
        clvKind: "POINTS",
        clvVerdict: "BEAT_CLOSE",
        clvCloseLine: -4.5,
        clvClosePrice: -110,
        clvLockLine: -3.5,
        clvLockPrice: -110,
        game: { sport: { name: "NFL" } },
      },
    ]);
    render(await TrackPlatformPage());
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("clv-ledger-table")).toBeTruthy();
    expect(screen.getAllByTestId("clv-ledger-row")).toHaveLength(1);
    expect(screen.getByText(/Chiefs -3.5/)).toBeTruthy();
    expect(screen.getByText(/\+1\.4 pts/)).toBeTruthy();
  });

  it("an ELITE viewer with a null clvValue row sees 'not yet graded', never a fabricated number", async () => {
    mocks.entitlements.mockResolvedValue(entitlements(true));
    mocks.findMany.mockResolvedValue([
      {
        id: "pick-2",
        pickType: "MONEYLINE",
        selection: "Lakers ML",
        line: 0,
        result: "PUSH",
        settledAt: new Date("2026-08-20T00:00:00.000Z"),
        clvValue: null,
        clvKind: null,
        clvVerdict: null,
        clvCloseLine: null,
        clvClosePrice: null,
        clvLockLine: null,
        clvLockPrice: null,
        game: { sport: { name: "NBA" } },
      },
    ]);
    render(await TrackPlatformPage());
    expect(screen.getByText(/not yet graded/i)).toBeTruthy();
  });

  it("an ELITE viewer with zero settled picks sees the honest empty state, not the table", async () => {
    mocks.entitlements.mockResolvedValue(entitlements(true));
    mocks.findMany.mockResolvedValue([]);
    render(await TrackPlatformPage());
    expect(screen.getByTestId("clv-ledger-empty")).toBeTruthy();
    expect(screen.queryByTestId("clv-ledger-table")).toBeNull();
  });
});
