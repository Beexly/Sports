# Neon Postgres — maximum leverage/value findings (2026-09-28)

Deep-research pass over current Neon docs. All prices and mechanics cited to the
doc page they came from. Nothing here was adopted or changed — research only.
Untested/unevaluated items are marked **queued for evaluation**, never dismissed.

> Note on the billing screenshot Garrett pasted: the "Billing Items / Personal /
> Free / Teams / PickPilot's projects / Pro / Active / v0's pricing page" text is
> **Vercel's** billing dashboard (v0 is Vercel's product), not Neon's. So: Vercel
> Personal = Free, Vercel team "PickPilot's projects" = **Pro ($20/seat/mo)** —
> that seat fee is Vercel-leg scope. Garrett's actual Neon plan tier is
> **unconfirmed**; Finding 0 covers how to verify it in 5 minutes.

---

## 1. PRO PLAN BILLING MODEL (what actually bills)

Source of truth: https://neon.com/docs/introduction/plans (official plans doc),
https://neon.com/pricing

Current public plans are **Free / Launch / Scale** — all usage-based, **no monthly
minimum** on Launch/Scale ("pay only for what you use"). Legacy plans were
auto-migrated to the new plans in **February 2026** (per Neon's legacy-plans doc;
Azure Marketplace users excepted).

| Billing item | How it's metered | Launch price | Scale price | Free allowance |
|---|---|---|---|---|
| **Compute** | CU-hours = compute size × hours running. 1 CU ≈ 4 GB RAM + CPU + local SSD. Min size **0.25 CU**. **All computes in the project count** — each branch gets a read-write compute by default; read replicas add read-only computes. Suspended computes accrue **zero**. | **$0.106/CU-hr** | **$0.222/CU-hr** | 100 CU-hrs/project/mo |
| **Storage** | GB-months, metered hourly, on actual usage. Root branches: logical data size. Child branches: `min(changes since creation, logical size)` — never more than your data size. **Bills even while compute is suspended.** | **$0.35/GB-mo** | $0.35/GB-mo | 0.5 GB/project |
| **Public network transfer (egress)** | Total bytes sent over public internet per project per month, **shared across Postgres, Object Storage, and Functions**. Includes logical-replication traffic. | 500 GB/project/mo included, then **$0.10/GB** | same | 5 GB/project/mo |
| **Extra branches** | Beyond plan allowance (10/project Launch, 25/project Scale), prorated hourly | **$1.50/branch-month** (~$0.002/hr) | same | not available |
| **Instant restore (PITR)** | GB-months of WAL change-history retained, **root branches only**. Window configurable; defaults 1 day on paid. | **$0.20/GB-mo**, up to 7-day window | $0.20/GB-mo, up to 30-day window | 6 hrs, ≤1 GB, free |
| **Snapshots** | GB-months. Manual snapshot limits: 100 (Launch/Scale), 1 (Free). Scheduled backups: first snapshot full, subsequent **incremental**. | **$0.09/GB-mo** | same | — |
| **Object Storage** | GB-months stored. **No per-operation charge.** Egress counts toward the shared transfer allowance. | **$0.023/GB-mo** | same | 5 GB/project |
| **Functions** | Capacity-Hours (active vs waiting) + invocations | $0.10 active / $0.025 waiting per Cap-Hr, **$0.60/M invocations** | $0.12 / $0.03, $0.60/M | 10 active / 400 waiting Cap-Hrs, 1M invocations |
| **AI Gateway** | **Prepaid credits**: 1 credit = $1, $5 minimum purchase, credits valid **12 months**. Provider list prices passed through with **no markup** (served via Databricks Foundation Model APIs). | prepaid | prepaid | not available |
| **Private network transfer** | Scale only (AWS PrivateLink) | — | **$0.01/GB** | — |

Also on Launch/Scale: **spending notifications** (email at 80% and 100% of a
threshold you set), 3-day (Launch) / 14-day (Scale) monitoring retention.

### The central cost equation for Garrett's workload

Minimum compute is 0.25 CU. A compute that never suspends burns:

`0.25 CU × ~730 hrs/mo = ~182.5 CU-hours/mo`

- On **Launch**: 182.5 × $0.106 ≈ **$19.35/mo** for compute alone.
- On **Scale**: 182.5 × $0.222 ≈ **$40.50/mo**.
- On **Free**: 182.5 > 100 CU-hr allowance → compute **suspends mid-month until
  the next billing period** (hard outage — not viable for prod).

Storage is trivial at his data volumes (signals table ~84.5k rows; even 1 GB =
$0.35/mo). **Compute duty cycle is the entire game.**

---

## 2. FINDINGS (ranked by expected impact)

### Finding 0 — Confirm the Neon plan tier and current burn (founder, 5 min) [PREREQUISITE]
- **What:** console.neon.tech → Billing → Billing Items. Record: plan name,
  compute CU-hours this month, storage GB, transfer GB, branch count. This
  unlocks every finding below with real numbers instead of estimates.
- **Why it matters:** the pasted billing screenshot was Vercel's, not Neon's —
  the Neon tier is unverified. If the console shows any legacy label, compare
  against current Launch (no minimum); legacy paid plans were auto-migrated
  Feb 2026, but verify.
- **Cite:** https://neon.com/docs/introduction/plans
- **Difficulty:** founder tap (console read). **Reversible:** n/a (read-only).

### Finding 1 — The signals-writer cron is the #1 cost suspect: audit the compute duty cycle
- **What:** Scale-to-zero suspends a compute after **5 minutes of inactivity**
  (Launch: fixed 5 min or disabled; Scale: configurable 1 min → always-on).
  **Any DB traffic resets the idle timer** — including the signals-writer cron,
  Vercel crons, and agent queries. A cron hitting the DB more often than ~every
  6 minutes keeps the compute at ~100% duty cycle ≈ **$19/mo on Launch at the
  0.25 CU floor** (math above). Even a 10-minute cron yields ~60–70% duty.
  Logical replication subscribers also pin the compute awake (no scale-to-zero
  while connected).
- **Cite:** https://neon.com/docs/introduction/scale-to-zero,
  https://neon.com/docs/introduction/plans (compute metering)
- **Estimated value:** if the compute is currently always-on at 0.25 CU,
  there's no "fix" that keeps per-minute freshness — the honest options are:
  (a) accept ~$19/mo as the price of fresh signals and budget it;
  (b) batch the writer (e.g. every 15 min → roughly halves duty cycle);
  (c) move the writer to **Neon Functions** next to the DB (queued for
  evaluation — functions bill only while processing: $0.10/$0.025 per
  Capacity-Hour + $0.60/M invocations on Launch).
- **Difficulty:** config change (verify first). **Reversible:** yes.
- **Check in console:** Monitoring → compute usage graph; if it's a flat line
  at 0.25 CU, the cron is pinning it.

### Finding 2 — Branch-compute hygiene: every branch bills while awake
- **What:** each branch gets its own read-write compute **by default**, and all
  computes in the project count toward CU-hours. The new branch-only testing
  rule (agents test on throwaway branches) will *multiply* branch count —
  good for safety, but every forgotten branch with an awake compute is a
  second ~$19/mo leak at the floor. Branches beyond 10/project cost
  **$1.50/branch-month** extra on Launch. Mitigations: (a) the `neon.ts`
  7-day TTL branch policy already landed in the repo (auto-expire once
  `neon deploy` runs); (b) delete branches when done; (c) branch computes also
  scale-to-zero after 5 min idle, so idle branches cost ~$0 in compute but
  still count toward the branch allowance and their storage delta.
- **Cite:** https://neon.com/docs/introduction/plans (compute metering,
  extra branches), https://neon.com/docs/get-started/backend-overview
  (branch policy)
- **Estimated value:** prevents N × $19/mo leaks; keeps branch count under the
  10/project free allowance.
- **Difficulty:** config change + the landed `neon.ts` (needs Neon API key for
  `neon deploy` — founder tap). **Reversible:** yes.

### Finding 3 — Cap autoscaling max; the spike multiplier is brutal
- **What:** autoscaling runs between a user-defined min and max (Launch: up to
  16 CU). A 0.25 CU floor that spikes to 4 CU during a big backfill/calibration
  run bills **16×** for those hours. For this workload (cron writes + web
  reads), cap max at **0.5–1 CU**; raise it deliberately for known heavy jobs.
  Set min 0.25 CU, max 1 CU as the default posture.
- **Cite:** https://neon.com/docs/introduction/autoscaling,
  https://neon.com/docs/introduction/plans (CU table)
- **Estimated value:** bounds worst-case compute; a single unthrottled
  backfill afternoon can't 10× the bill.
- **Difficulty:** config change in console (Edit compute). **Reversible:** yes.

### Finding 4 — Turn on spending notifications (2 minutes, free insurance)
- **What:** Launch/Scale can email at 80% and 100% of a custom monthly
  threshold. Set it at whatever "fat penny" means to Garrett (e.g. $30) and
  the next anomaly pages him instead of compounding.
- **Cite:** https://neon.com/docs/introduction/plans (Spending notifications)
- **Difficulty:** config change. **Reversible:** yes.

### Finding 5 — PITR history window: confirm it's 1 day, not 7
- **What:** instant-restore history is billed at **$0.20/GB-mo of WAL** on root
  branches; Launch allows up to 7 days but **defaults to 1 day**. A writer cron
  generates constant WAL — at a 7-day window that WAL piles up and bills.
  For this workload 1 day is plenty (schema is in git; snapshots cover the
  rest). Check Settings → Postgres → history window. Note: upgrading plans
  raises the *maximum*, not the configured value — verify after any plan change.
- **Cite:** https://neon.com/docs/postgres/backup-restore/history-window,
  https://neon.com/docs/introduction/plans
- **Estimated value:** small in absolute dollars at current WAL volumes, but
  it's pure waste if set to 7 days without a reason.
- **Difficulty:** config change. **Reversible:** yes.

### Finding 6 — Use pooled connection strings everywhere on Vercel (free)
- **What:** Neon runs PgBouncer in transaction mode (10,000 client
  connections) on a `-pooler` hostname suffix; the pooler endpoint is always
  available at no extra charge. Vercel serverless functions open/close
  connections per invocation — direct connections risk hitting
  `max_connections` (only **104 at 0.25 CU**) under concurrency; pooled
  connections don't. Use the pooled string for the app; keep **direct** for
  migrations, `pg_dump`, and anything using `SET`/prepared statements
  (pooler forbids them).
- **Cite:** https://neon.com/docs/connect/connection-pooling
- **Estimated value:** reliability (kills "too many connections" under fan-out),
  not direct dollars — but it avoids the failure mode that tempts people to
  upsize compute.
- **Difficulty:** code/env change (swap `DATABASE_URL` to the `-pooler`
  host). **Reversible:** yes.

### Finding 7 — Data API: evaluate replacing Vercel read routes (queued for evaluation)
- **What:** the Data API exposes Postgres over HTTPS with PostgREST syntax,
  enabled per branch (console or Management API). No separate charge found in
  docs — queries bill normal compute + shared transfer. The read surface for
  the signals table (and other public/internal read routes) could be served
  straight from Neon, **deleting the corresponding Vercel functions** — the
  savings land on the *Vercel* bill (fewer invocations/GB-hours), not Neon's.
  Caveats: Data API queries still wake the branch compute; auth/rate-limiting
  posture must be designed (it's a raw table API).
- **Cite:** https://neon.com/docs/get-started/backend-overview (Data API),
  Management API reference for provisioning per branch
- **Estimated value:** Vercel-side; untested — queued for evaluation with a
  per-route migration test.
- **Difficulty:** code change. **Reversible:** yes.

### Finding 8 — AI Gateway: evaluate vs OpenRouter/NIM for the agent fleet (queued for evaluation)
- **What:** one Neon credential reaches many LLM providers; **provider list
  prices passed through with no markup** (via Databricks Foundation Model
  APIs); billed from **prepaid credits** (1 credit = $1, $5 minimum, valid 12
  months). OpenRouter takes a markup on routed models; NVIDIA NIM's free tier
  is flaky. If the fleet's models are in the gateway catalog at list price,
  this is the cheapest compliant router. Caveats: frontier models (OpenAI,
  Gemini) need access requests first; per-model pricing in the API catalog is
  currently null (check models.dev / the console catalog); credits expire in
  12 months — don't overbuy.
- **Cite:** https://neon.com/docs/ai-gateway/overview,
  https://neon.com/blog/neon-backend-is-ga (no-markup passthrough)
- **Estimated value:** the *difference* between OpenRouter's markup and $0 —
  meaningful only at real token volumes; needs a measured 1-week comparison
  on the fleet's actual models.
- **Difficulty:** founder tap (buy $5–20 credits, enable per branch) + code
  change (base-URL swap). **Reversible:** yes (credits are sunk for 12 mo,
  but tiny).

### Finding 9 — Object Storage for backtest artifacts: $0.023/GB-mo, no per-op fees
- **What:** S3-compatible storage that **branches with the database** (files and
  rows stay in sync per branch). $0.023/GB-mo storage, no per-operation
  charges; egress shares the 500 GB transfer allowance. The versioned
  backtest/calibration datasets (currently living on VM disk / Drive) belong
  here — cheaper than most alternatives and branch-aware, which fits the
  branch-per-experiment workflow.
- **Cite:** https://neon.com/docs/introduction/plans (Object Storage),
  https://neon.com/docs/get-started/backend-overview
- **Estimated value:** replaces ad-hoc storage; ~$0.23/mo per 10 GB.
- **Difficulty:** code change (S3 client). **Reversible:** yes.

### Finding 10 — Check whether you're paying for auth elsewhere (Neon Auth is included)
- **What:** managed Better Auth is included: 60k MAU free, **1M MAU on
  Launch/Scale** at no extra charge. If any lane pays for Clerk/Auth0/etc.,
  that's substitutable spend.
- **Cite:** https://neon.com/docs/introduction/plans
- **Difficulty:** evaluate. **Reversible:** yes.

### Finding 11 — Lakebase Search: in-DB vector/keyword/hybrid search (queued for evaluation)
- **What:** vector, keyword, and hybrid search directly in Postgres — "agent
  retrieval and RAG need no separate vector store." Relevant the moment the
  bge-m3/Qwen3 embedding lane produces vectors; avoids a Pinecone/weaviate
  bill entirely.
- **Cite:** https://neon.com/docs/introduction
- **Estimated value:** kills a future vector-DB line item. **Difficulty:**
  evaluate when embeddings land. **Reversible:** yes.

### Finding 12 — Read replicas: NOT a cost saver — skip unless reads justify it
- **What:** each read replica is **its own compute billed in CU-hours**. The
  pricing page lists replicas as a feature ("offload read-heavy queries
  without added *storage* costs") — note: storage, not compute. At this
  workload's read volume, a replica just doubles the compute floor.
- **Cite:** https://neon.com/docs/introduction/plans ("How are read replicas
  billed?")
- **Estimated value:** negative if adopted blindly. Queued for evaluation only
  if read load ever justifies it.

### Finding 13 — Region alignment: same-region Vercel + Neon (minor, mostly latency)
- **What:** Neon runs on AWS (regions like us-east-2 Ohio, eu-central-1,
  ap-southeast-1; connection hostnames carry the region, e.g.
  `...us-east-2.aws.neon.tech`). Vercel→Neon traffic counts as public
  network transfer either way, but the 500 GB Launch allowance dwarfs this
  workload — so this is a **latency** lever, not a cost lever: set the Vercel
  project's region to match the Neon region (e.g. Neon us-east-2 ↔ Vercel
  `iad1`) to cut per-query RTT, which marginally shortens compute active time.
- **Cite:** https://neon.com/docs/connect/connection-pooling (hostname region
  convention); community region-pair table (verify in console):
  https://github.com/rhymion/app-generator/blob/HEAD/docs/knowledge/vercel-region-alignment.md
- **Difficulty:** config change (vercel.json `regions`). **Reversible:** yes.

### Finding 14 — Scheduled backups: set-and-forget, incremental = cheap
- **What:** automated backup schedules are available on paid plans; snapshots
  bill **$0.09/GB-mo**, and scheduled snapshots are **incremental after the
  first full** (manual snapshots bill as full each). A daily schedule +
  1-day PITR window is a sane, cheap DR posture. Snapshot pricing source
  notes billing began May 1, 2026 (post-beta).
- **Cite:** https://neon.com/docs/introduction/plans (Snapshots);
  https://github.com/neondatabase/neon-for-agent-platforms/blob/HEAD/skills/neon-postgres-agent-platforms/references/pricing-and-plan-features.md
- **Difficulty:** config change. **Reversible:** yes.

---

## 3. WASTE-PATTERN CHECKLIST (verify in console, ~10 minutes)

1. **Monitoring → compute graph:** flat line at 0.25 CU 24/7 = the cron is
   pinning it (Finding 1). Spiky = check autoscale max (Finding 3).
2. **Branches list:** any branch you don't recognize with an active compute =
   leak (Finding 2). Delete it; the 7-day TTL will handle future ones.
3. **Billing → Billing Items:** rank the line items. Expect compute ≫
   storage ≫ transfer. If transfer is material, something is dumping huge
   result sets (check the read surface queries).
4. **Settings → Postgres → history window:** should read 1 day (Finding 5).
5. **Snapshots list:** delete stale manual snapshots (Finding 14).
6. **Spending notifications:** set a threshold (Finding 4).
7. **Connection strings in Vercel env:** app routes on `-pooler`, migrations
   on direct (Finding 6).

## 4. DELIBERATELY NOT RECOMMENDED

- **Read replicas** for cost (Finding 12) — they add compute, not remove it.
- **Scale plan** — 2.1× the compute rate ($0.222 vs $0.106) for SLA/compliance
  features this workload doesn't need. Launch is the right tier unless a
  compliance requirement appears.
- **Disabling scale-to-zero** on Launch — pure 24/7 burn for zero benefit at
  this traffic shape.
- **Overbuying AI Gateway credits** — 12-month expiry; start with $5–20.
