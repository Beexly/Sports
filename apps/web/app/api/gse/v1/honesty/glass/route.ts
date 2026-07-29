/**
 * GET /api/gse/v1/honesty/glass — Glass Ledger demo receipts.
 * Win rate stays closed until settled floor (100). Not a performance claim page.
 */
import { NextResponse } from "next/server";
import {
  chainReceipts,
  ledgerHead,
  recomputeChain,
} from "@sports/prediction-engine";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const receipts = chainReceipts([
    {
      pickId: "demo-001",
      sport: "NFL",
      market: "SPREAD",
      selection: "KC -3",
      modelVersion: "gse.multiprob.v1",
      committedAt: "2026-07-01T16:00:00.000Z",
      settledAt: "2026-07-01T23:30:00.000Z",
      result: "WIN",
      edgeIndex: 0.04,
      clv: 0.01,
    },
    {
      pickId: "demo-002",
      sport: "NFL",
      market: "TOTAL",
      selection: "Under 47.5",
      modelVersion: "gse.multiprob.v1",
      committedAt: "2026-07-08T16:00:00.000Z",
      settledAt: "2026-07-08T23:45:00.000Z",
      result: "LOSS",
      edgeIndex: 0.03,
      clv: -0.005,
    },
    {
      pickId: "demo-003",
      sport: "NFL",
      market: "MONEYLINE",
      selection: "PHI",
      modelVersion: "gse.multiprob.v1",
      committedAt: "2026-07-15T16:00:00.000Z",
      result: "OPEN",
      edgeIndex: 0.05,
    },
  ]);
  const chain = recomputeChain(receipts);
  const head = ledgerHead(receipts, 100);

  return NextResponse.json(
    {
      surface: "honesty.glass_ledger.v1",
      chainOk: chain.ok,
      masterFingerprint: chain.master,
      head,
      receipts,
      law: [
        "Demo fingerprints only — not published performance",
        "winRatePublic requires settled floor",
        "LIVE_BOARD founder-gated",
        "No sportsbook affiliate path",
      ],
    },
    {
      headers: {
        "X-GSE-API": "stats.v1.honesty",
        "X-GSE-WIN-RATE": head.winRatePublic ? "open" : "closed",
      },
    },
  );
}
