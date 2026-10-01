/**
 * Vercel cron: path-disagreement arbitration.
 *
 * The production caller for `runArbiterPass`. It exists so the arbiter is not a
 * module whose only importer is its own test: this route, the manifest entry,
 * and the schedule are what make the ledger fill with real rulings.
 *
 * WHAT IT DOES, ONCE PER RUN
 *   1. reads published picks written in the last ARBITER_LOOKBACK_HOURS
 *   2. pairs the reasoning path against the legacy path per fixture + market
 *   3. asks the Opus tier to adjudicate each pair that genuinely disagrees
 *   4. appends every ruling to the decision ledger, rejections included
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *   - It never writes, republishes, unpublishes, or re-scores a `Pick`. The
 *     arbiter decides which of two RECORDED claims should stand; it does not get
 *     to change what the board shows. A disagreement between the two producers
 *     is a defect in the producers, and the fix belongs upstream in the
 *     generator, not in an LLM with write access to the slate.
 *   - It never runs in "dual" auth mode. This route spends money, so
 *     `cronAuthError`'s default `bearer_only` applies and a spoofed
 *     `x-vercel-cron` header cannot trigger a paid adjudication pass.
 *   - It never fabricates. Every count in the response is measured by this run.
 *
 * SCHEDULE. Hourly at :41, deliberately off the board's :02/:17/:32/:47 ticks
 * and off the signal slate's :05/:20/:35/:50 ticks, so a slow Opus call can
 * never compete with the public board for the cron's time budget.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { runArbiterPass } from "@/lib/arbiter/run";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Opus calls are slow and sequential (one per disagreement, so a single
 * concurrent call cannot race the budget ledger). 300s is the ceiling that
 * leaves room for a realistic slate of disagreements without letting the
 * function be killed mid-pass, which would leave the pass half-recorded and the
 * response unreported.
 */
export const maxDuration = 300;

/**
 * How far back to look for the collision. The collision is created by ingestion
 * (board-fill / refresh-odds / generate-signal-slate), so a 6-hour window covers
 * the slate plus one full ingestion cycle and cannot re-adjudicate a pair the
 * previous hourly run already recorded.
 */
const ARBITER_LOOKBACK_HOURS = 6;

/** Row cap on the pair scan. See `loadDisagreementPairs` for what filling it means. */
const ARBITER_SCAN_LIMIT = 500;

export async function GET(request: Request) {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const to = new Date();
  const from = new Date(to.getTime() - ARBITER_LOOKBACK_HOURS * 60 * 60 * 1000);

  try {
    const pass = await runArbiterPass({ from, to, limit: ARBITER_SCAN_LIMIT });
    return NextResponse.json({
      ok: true,
      path: "arbiter-adjudication",
      window: { from: from.toISOString(), to: to.toISOString() },
      ...pass,
    });
  } catch (err) {
    // A pass that throws has recorded nothing and adjudicated nothing. Saying so
    // plainly is more useful than a 200 with an empty count, which would read as
    // "no disagreements found" rather than "the pass did not run".
    return NextResponse.json(
      {
        ok: false,
        path: "arbiter-adjudication",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
