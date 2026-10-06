# Google Cloud $300 — final-bow plan (2026-09-28, Garrett's directive)

## Sequencing rule (HARD, from Garrett)
This plan is the FINAL phase. Do NOT claim or spend the $300 trial credit until the engine is
fully set up, calibrated, and weighted. Spending it earlier means redoing the work on a changed
system — the credit's max value is as the finishing run on the final build, the "bow on top."
Nothing here is a current work item; it is queued behind all foundation work.

## Why this exists
Garrett is on Google Pro and using Google more. The $300/90-day GCP trial + always-free tier
were researched 2026-09-28 (full detail in the revenue-engine repo:
Beexly/autonomous-revenue-engine, docs/research/2026-09-28/google-cloud-free-tier-plan.md).
When the engine is final, this credit funds the cloud finishing work at zero cost.

## The offer (recap)
- **$300 credit / 90 days**, new customers, card on file for identity verification only.
  When credit or time runs out the account PAUSES — no surprise billing unless upgraded.
- **Always-free tier** (forever): 1 e2-micro VM, 5 GB storage, 2M Cloud Run requests/mo,
  1 TB BigQuery queries/mo, 120 min/day Cloud Build, Firestore daily limits.

## THE GPU TRAP (read before touching anything)
Free Trial accounts get **zero GPU quota** — no GPUs on VMs while on trial. Unlocking them
requires Billing → Activate/Upgrade (keeps the $300, still no charge until it's spent), then a
GPU quota request in IAM & Admin → Quotas. Brand-new paid accounts can be denied initially
(anti-fraud); ordinary usage first, then retry, or contact Sales. Also: quota ≠ capacity —
verify the zone actually has the GPU type in stock.

## What to spend it on AT THE END (ordered)
1. **Full-scale backtests on L4 GPUs** — the calibrated, weighted engine gets a complete
   historical burn-in (all seasons/slates) to validate final weights. ~$0.20/hr spot L4 ≈
   1,500 GPU-hours on $300.
2. **Production hosting of public surfaces** — always-free tier covers what it covers
   (Cloud Run for the projections/rankings API, e2-micro for lightweight backends); spend
   credit only on what free tier doesn't.
3. **Final validation runs** — the complete calibrated system re-verified end to end on
   fresh compute, proving the landed build matches the tested build.
4. **Optional: Vertex AI (Gemini)** — only if the final system needs a managed model lane.

## What NOT to do
- Do not claim the trial while foundation work is in progress (it starts a 90-day clock).
- Do not spend credit on anything the always-free tier covers.
- Do not leave GPU VMs idling — spot + teardown scripts, or the $300 evaporates.

## Prerequisites before this unlocks
- [ ] Engine wired (all feeds, adjustment layer, player signals)
- [ ] Weights locked and calibrated
- [ ] Backtests green on the landed build
- [ ] Garrett claims the trial + approves the billing upgrade (his taps, card = verification only)

## Status (2026-09-28)
QUEUED, not started. Trial not claimed. No spend. This document is the record; the agent
picks it up only after the prerequisites are met.
