/**
 * GET /api/gse/v1/phase-c/status
 * Phase C (5b) remains UNVERIFIED until founder measured path.
 * Never invents 888|359|283|0 deltas. measurement > narrative.
 */
import { NextResponse } from "next/server";
import {
  PHASE_C_BASELINE,
  NON_BOOK_METHODOLOGY,
  recordPhaseCRemeasure,
  formatAgentReport,
  type RemeasureEvidence,
} from "@sports/phase-c";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  // Optional founder injection of a real measurement via env — never hardcode wins
  let evidence: RemeasureEvidence = {
    path: "non_book_gamma_model",
    oddsKeyPaid: null,
    cronRefreshOk: null,
    gateScriptRan: false,
    measuredAt: null,
    measuredTuple: null,
  };

  const envTuple = process.env.GSE_PHASE_C_MEASURED_TUPLE;
  const envAt = process.env.GSE_PHASE_C_MEASURED_AT;
  const envPath = process.env.GSE_PHASE_C_PATH;
  if (envTuple && envAt) {
    evidence = {
      path: envPath === "odds_api" ? "odds_api" : "non_book_gamma_model",
      oddsKeyPaid: process.env.GSE_ODDS_KEY_PAID === "1",
      cronRefreshOk: process.env.GSE_CRON_REFRESH_OK === "1",
      gateScriptRan: true,
      measuredAt: envAt,
      measuredTuple: envTuple,
    };
  }

  const report = recordPhaseCRemeasure(evidence);

  return NextResponse.json(
    {
      surface: "phase_c.status.v1",
      baseline: PHASE_C_BASELINE,
      report,
      agentReport: formatAgentReport(report),
      nonBookMethodology: NON_BOOK_METHODOLOGY,
      law: [
        "measurement > narrative",
        "refuse-default",
        "no fake ROI",
        "shadow ≠ official (5b)",
        "LIVE_BOARD independent",
      ],
    },
    {
      headers: {
        "X-GSE-API": "stats.v1",
        "X-GSE-PHASE-C": report.ok && report.claimableAsOfficial5b ? "VERIFIED" : "UNVERIFIED",
      },
    },
  );
}
