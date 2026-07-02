# Morning Brief — July 2 (read this first, ~3 minutes)

You went to bed with everything deployed and one open question: does the new
ingestion code fill the board? The 6:00 AM ET cron answers it.

## The 60-second check (do this with coffee)

1. Open `galaxysportsedge.com/cockpit`.
2. Look at **Picks Today**.
   - **> 0** → it worked. The board is live. Skip to "If it worked" below.
   - **0 with the ingestion warning** → read the warning. The new code puts the
     diagnosis IN the error, in parentheses, like:
     `(threshold=12h, rows=90, games=15, unparseableTimestamps=90, newestUpdateAgeMin=none)`
     Paste that whole line to Claude. The numbers decode as:
     - `unparseableTimestamps` = most of `rows` → payload shape drift; code fix, same day
     - `newestUpdateAgeMin` > 720 → lines genuinely old; fetch-timing/API-plan issue, not code
     - `threshold` ≠ 12 → the env knob is not reaching runtime; deploy/env sync issue

## If it worked — the go-live chain, in order

1. **Merge the 3 waiting branches** (tell Copilot; all are small and validated):
   - `claude/intraday-odds-scheduler` — 6 extra refresh passes/day via GitHub
     Actions (free; bypasses the Vercel Hobby daily-cron limit)
   - `claude/freshness-badge` — public "Lines updated Xm ago" trust badge on /picks
   - After the scheduler merges: add repo secret **CRON_SECRET** (GitHub →
     Settings → Secrets and variables → Actions), same value as Vercel
2. **Once intraday refreshes are running**: tighten `ODDS_FRESHNESS_MAX_HOURS`
   from 12 to **6** (then 4 after a clean week). Sharper lines = honester edge.
3. **Stripe payout task** — the orange "Action required" banner in Stripe.
   Without it, customers can pay but Stripe holds YOUR payout. Highest-priority
   click of the day.
4. **One live checkout** on the cheapest plan → webhook delivery shows 200 →
   refund yourself. Revenue path proven end to end.
5. **Neon dashboard** — check compute/quota (the 113 DB errors). If it is
   suspended or capped, the upgrade is the biggest reliability buy available.

## What was adopted vs refused from the Grok v3.0 blueprint (and why)

**Adopted (built overnight):**
- Intraday refresh cadence (their 6x/day schedule, via free GitHub Actions)
- The freshness trust badge on /picks (their best idea, built with honesty
  guards: only renders from real upstream timestamps, never a fake "just now")
- Tighten-freshness-after-scheduler plan (12 → 6 → 4)

**Refused, with reasons — these matter:**
- **Overnight Neon → Supabase migration**: an untested production database
  migration while the owner sleeps is how products die. Neon needs a plan
  check, not a panic replatform. Revisit deliberately if Neon stays flaky
  after the upgrade.
- **The invented numbers** (+47% edge, +31% win rate, $6-12M NPV, "fake-edge
  rate 22%"): fabricated statistics. The entire GSE brand is a war on numbers
  nobody can verify. Quoting them anywhere would poison the well.
- **"Alpha Echo Chamber"** (scrape forums → inject "sharp divergence detected
  38min ago" into pick explanations): manufactures unverifiable claims inside
  the product's most trust-sensitive surface. The trust-gate exists precisely
  to kill this pattern. Also gray-zone ToS scraping.
- **"Code Darwin" auto-merging AI code weekly by CLV grade**: unreviewed
  auto-merged code on a live money product. No.
- **Coolify/MinIO/Dify/Langflow/OpenWebUI stack**: five new self-hosted systems
  solve zero current problems and add five new failure surfaces. The stack you
  have (Vercel + Neon + GitHub Actions) is not the bottleneck; data timing and
  the Neon plan are.

**Parked for later (real ideas, wrong week):**
- Daily auto-generated "Edge Report" email (needs the content draft-review
  loop running first)
- Premium "Sharp Signals" tier (needs the board reliably full first)
- Supabase evaluation as a deliberate, tested migration (only if Neon keeps
  failing after the plan fix)

## The one number to watch this week

The calibration table shows the **80-89 confidence band winning 29.5%**
(n=61) — high-confidence picks running badly cold. This is the next real
engineering target, and the tooling for it is ALREADY BUILT and ready to run:

    npx tsx scripts/calibration-validate.ts

(read-only; needs DATABASE_URL pointed at prod — Copilot can run it with the
Vercel env value). You have 167 eligible picks, above the 100 floor. It prints
a hard PASS/FAIL verdict on whether the calibrator genuinely beats raw
confidence out-of-sample. PASS unlocks the audited MODEL_VERSION activation
sequence (docs/path-to-70.md §7 steps 3-5, your call); FAIL means keep
collecting and do not activate. Either answer is progress — it converts the
29.5% embarrassment into a measured engineering problem. Note: this verdict is
only trustworthy because the PAVA implementation bug was fixed this week; on
the old code it could have approved a broken calibrator.

## Overnight ledger (what shipped while you slept)
- Scheduler upgraded to 6 intraday passes + pushed (`claude/intraday-odds-scheduler`)
- Line-freshness trust badge built, tested (6/6), pushed (`claude/freshness-badge`)
- This brief + the blueprint triage
- Everything validated: typecheck, trust-gate (1,059 files), targeted suites
