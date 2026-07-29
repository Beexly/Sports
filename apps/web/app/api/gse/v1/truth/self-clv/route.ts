/**
 * GET /api/gse/v1/truth/self-clv — self-CLV cohort from owned closing archive.
 * Mean published only when nOk ≥ 50. Odds API not required.
 */
import { NextResponse } from "next/server";
import {
  buildDemoSelfClvReport,
  makeMemoryClosingArchive,
  reportSelfClvFromArchive,
  selfClvFromArchive,
} from "@sports/stats-api";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  // Demo open→touch pairs (process-local) — proves refuse-default math.
  const archive = makeMemoryClosingArchive();
  const now = "2026-07-29T12:00:00.000Z";
  archive.append({
    eventId: "demo-ev-1",
    market: "ml",
    side: "yes",
    decimalOdds: 1.9,
    asOf: "2026-07-28T12:00:00.000Z",
    source: "gamma",
    role: "open",
    archivedAt: now,
    book: "polymarket",
  });
  archive.append({
    eventId: "demo-ev-1",
    market: "ml",
    side: "yes",
    decimalOdds: 2.05,
    asOf: "2026-07-29T11:00:00.000Z",
    source: "gamma",
    role: "touch",
    archivedAt: now,
    book: "polymarket",
  });
  archive.append({
    eventId: "demo-ev-2",
    market: "ml",
    side: "yes",
    decimalOdds: 1.75,
    asOf: "2026-07-28T12:00:00.000Z",
    source: "own",
    role: "open",
    archivedAt: now,
  });
  // incomplete pair → refuse
  const report = reportSelfClvFromArchive(archive, ["demo-ev-1", "demo-ev-2"]);
  const single = selfClvFromArchive(1.9, 2.05);

  return NextResponse.json(
    {
      surface: "truth.self_clv.v1",
      oddsApiRequired: false,
      demoSingle: single,
      cohort: report,
      emptyShape: buildDemoSelfClvReport(),
      note: "Process-local demo archive. Durable multi-instance store is follow-on. Cohort mean closed until n≥50.",
    },
    {
      headers: {
        "X-GSE-API": "stats.v1.truth",
        "X-GSE-ODDS-API": "not-required",
        "X-GSE-CLV-MEAN": report.meanBpsPublic ? "open" : "closed",
      },
    },
  );
}
