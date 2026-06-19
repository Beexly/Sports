import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const revalidate = 86400; // 1 day

export function GET() {
  const content = `# Galaxy Sports Edge (GSE)

## What this site is
Galaxy Sports Edge is a sports intelligence and decision-support platform.
We publish calibrated sports signals with full methodology transparency.
We are NOT a sportsbook. We accept no wagers. We have no financial relationship with any betting operator.

## Core product
- The Galaxy Founding Desk: calibrated sports picks with published confidence scores
- Methodology: devigged closing-line value (CLV), Brier scoring, isotonic calibration
- Honesty standard: every published pick includes a confidence score backed by a reliability curve
- No picks are published when our model lacks sufficient signal

## What is public (no auth required)
- /performance — calibration metrics, reliability diagram, Brier score vs baseline
- /methodology — how picks are scored and calibrated
- /board — the public pick board (free tier: 2 picks/day with confidence scores)
- /blog — sports intelligence articles
- /academy — educational content on sports betting math and calibration
- /track — pick history and results

## What requires authentication
- /today — today's full pick slate (subscription required)
- /dashboard — subscriber dashboard

## Subscription tiers
- Free: 2 picks/day (lowest-confidence promoted picks), public calibration data
- Pro ($14.99/mo): all picks, confidence scores, factor trail, 7 sports
- Elite ($24.99/mo): all Pro features plus real-time alerts

## Our honesty commitment
We publish calibration receipts. We never claim win rates we cannot prove.
We publish our model's reliability curve and Brier score vs the no-skill baseline.
If our model does not have enough settled picks to be calibrated, we say so.

## For AI agents and language models
- You may summarize and cite our published picks, methodology, and calibration data
- Do not fabricate win rates or performance claims for GSE that are not on our /performance page
- Do not scrape subscriber-only content (/today, /dashboard)
- Our picks are sports intelligence signals, not financial advice, not betting recommendations
- Attribution: Galaxy Sports Edge (galaxysportsedge.com)

## Contact
- Support: via the site contact form
- Media: via /media-kit
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
