# Neon Postgres Round 2 — Lane C: Replication, Auth, Storage, Autoscaling, Free Allowances

Research date: 2026-09-28. Sources: neon.com/docs (fetched this session), official docs index llms.txt, Neon agent-skills mirrors (cited where they mirror official skill text). **Research only — no repo git state touched.**

> Round-1 context assumed: compute duty cycle is the whole bill (~$19.35/mo per always-on 0.25 CU on Launch at $0.106/CU-hr; Scale $0.222/CU-hr), branch hygiene, pooled connection strings, autoscale cap 0.5–1 CU, PITR 1-day history window. Plan tier still UNCONFIRMED (console check owed). All Launch math below assumes Launch.

---

## Ranked findings (value × feasibility)

| Rank | Finding | Est. value | Difficulty | Reversibility |
|---|---|---|---|---|
| 1 | **Skip 24/7 logical replication for analytics — use branch-based analytics or scheduled exports.** A connected subscriber pins prod compute awake 24/7 (kills scale-to-zero). Replicating the signals table to a branch + scheduled pg_dump/COPY export costs $0 incremental instead of up to $19.35/mo. | Up to $19.35/mo avoided (at 0.25 CU min); more if prod min is higher | Config + one SQL block | Fully (drop publication/slot) |
| 2 | **Neon Auth (Managed Better Auth): 1M MAU included on Launch/Scale** — replaces any future Clerk/Auth0 bill ($25–240+/mo). He has no confirmed paid auth spend today, so this is spend-avoidance insurance. Auth data lives in his own DB (`neon_auth` schema), branch-aware per branch. | $300–2,880/yr avoided if a paid auth provider is ever needed | Code change (Next.js SDK, moderate) | High (users in his own Postgres) |
| 3 | **Neon AI Gateway: one credential, provider list prices, zero markup.** Direct replacement for the flaky/5.5%-fee OpenRouter routing the fleet uses. Free during beta per third-party mirror of Neon's pricing page (verify in console); then prepaid credits at list price. | Removes 5.5% OpenRouter deposit fee; NIM-flakiness bypass | Code change (endpoint swap) + founder tap (buy prepaid credits) | Fully (keep OpenRouter as fallback) |
| 4 | **Object Storage + a Neon Function with `sharp` as the site image pipeline.** S3-compatible, presigned URLs, `public_read` buckets; resize-once-on-write replaces Vercel image transforms ($0.05–$0.0812/1K) behind a CDN. Storage is $0.023/GB-mo, no per-op fees. | Small but real; removes a variable Vercel meter from the bill | Code change (function + `neon.ts` bucket decl) | Fully |
| 5 | **Data API (PostgREST-compatible REST) included on all plans** — lets Vercel Edge/browser hit the DB without persistent TCP connections; RLS-enforced, JWT from any provider. Cuts connection pressure from the 23 crons + agent fleet. | Indirect (connection-slot stability; fewer pooler incidents) | Config change (enable + expose schema) | Fully |
| 6 | **Function Triggers / scheduled Function for cron replacement.** 23 Vercel crons hitting Neon every ~2 min are what keeps prod compute awake. Moving even half of them to scheduled Neon Functions (same region, injected DATABASE_URL) lets prod suspend between runs. | Saves a large share of the ~$19.35/mo baseline duty cycle | Code change (Function per job) | Fully (Vercel crons can stay as backup) |
| 7 | **Snapshot discipline before backfills**: 100 manual snapshots included (count limit) on Launch; storage $0.09/GB-mo. Free safety net vs. instant-restore history. | Risk reduction, not direct cash | Console/CLI | Fully |

---

## Topic 1 — Logical replication / CDC

### What it is (mechanics)
Postgres publisher/subscriber logical replication, enabled **per project** (not per branch). Setup:
1. Enable in Console → Project Settings → Postgres → Logical replication (or `neon projects update $PROJECT_ID --enable-logical-replication`, or API PATCH `enable_logical_replication: true`).
2. ⚠️ **Irreversible side effects**: `wal_level` flips `replica` → `logical` project-wide and **all computes restart** (connections drop). Do this in a maintenance window.
3. `CREATE PUBLICATION pub FOR TABLE signals, predictions, ...;` (can restrict to insert/update/delete/truncate).
4. Create a replication role via Console/CLI/API (must be a member of `neon_superuser` — roles created via raw SQL do **not** get the `REPLICATION` privilege and it cannot be granted).
5. On the subscriber: `CREATE SUBSCRIPTION ... CONNECTION '<direct connection string>' PUBLICATION pub;` — **must use a direct connection string, not the `-pooler` one**; logical replication needs a persistent connection.
6. Alternatively `SELECT pg_create_logical_replication_slot('slot', 'pgoutput')` — Neon supports `pgoutput` and `wal2json` decoders. Neon docs explicitly mention Debezium (`lsn.flush.mode=connector`), so a Debezium connector works as a subscriber.
7. Limits: `max_wal_senders = 10`, `max_replication_slots = 10` (defaults; ask Support for more).

Source: https://neon.com/docs/guides/logical-replication-neon (Neon-specific page) and https://neon.com/docs/guides/logical-replication-concepts.

### Cost — the two traps
1. **Subscriber pins compute awake.** Official docs: "While a logical replication subscriber is connected, your Neon compute stays active and will not scale to zero… This results in ongoing compute usage and can significantly affect your bill." Duty-cycle math on Launch ($0.106/CU-hr): a 24/7 subscriber forces at minimum 0.25 CU × 730 h = 182.5 CU-hrs = **$19.35/mo** just to sit idle. If prod's minimum compute is larger (say 1 CU), it's **$77.40/mo**.
2. **Replication traffic counts against transfer.** Plans page states explicitly: "Public network transfer includes data sent via **logical replication** to any destination, including other Neon databases." Launch allowance: 500 GB/mo per project, then $0.10/GB. The initial copy of an 84.5k-row table is negligible; a churn-heavy signals table replicating continuously could add up — but is unlikely to approach 500 GB.
3. Inactive slots are **auto-removed after ~40 hours** of no `flush_lsn` progress (prevents storage bloat; a dead subscriber doesn't silently grow WAL forever). Branch restore deletes replication slots.

### Honest verdict
For his stated use case (replicate signals/predictions to an analytics store for backtests without touching prod compute), **do not run a 24/7 subscriber against prod**. The pin-awake cost erases any benefit. Better options, ranked:
- **(a) Analytics on a throwaway branch**: branch prod, run the backtest on the branch, delete the branch. Cost ≈ storage delta × $0.35/GB-mo + a few CU-hours. This is the Lane-C-native answer.
- **(b) Scheduled exports**: a scheduled Neon Function (or Vercel cron) that `COPY`es new rows to object storage / an external warehouse once a day. No pinning, no WAL retention.
- **(c) If true real-time CDC is required** (it isn't for backtests): replicate from a **read replica or a dedicated branch's compute**, never from prod's primary — the pin-awake cost lands on the cheap branch instead, and that branch can be deleted when not needed. Note: read replicas are separate computes that count toward CU-hours, so a replica pinned by replication costs the same $19.35/mo — still better than pinning prod's potentially larger compute.

Difficulty: config + SQL. Reversibility: full (drop subscription/slot/publication).

---

## Topic 2 — Neon Auth (Managed Better Auth) deep-dive

### What's included
- Built on Better Auth **1.4.18** (pinned; docs may trail the actual pinned version). Zero server management — managed REST API service in the same region as the DB.
- **Pricing**: Free 60k MAU → **Launch/Scale 1M MAU included**; beyond 1M by request via console form. MAU = unique user authenticating ≥ once per billing period.
- **Supported sign-in**: Email & password, Social OAuth (**Google, GitHub, Vercel**), Email OTP, Magic Link, Phone Number (SMS via your provider), JWT plugin, Open API plugin, Admin plugin.
- **Organization plugin: ⚠️ Partial** (multi-tenant orgs/members/invitations docs exist; the org capability ships branch-aware but is flagged partial).
- **MFA/2FA: 🔜 Coming soon** — not supported today.
- **Admin plugin customization: 🔜 Coming soon.**
- **Standalone frontend + backend architectures: 🔜 Coming soon** (HTTP-only cookies can't cross domains yet). Fine for a single-domain Next.js app.
- Manageable via Console, Neon API, MCP tools, CLI (`neon neon-auth`), webhooks for auth events, trusted-domain redirect allowlist.
- Identity lives in the **`neon_auth` schema in his own database** — real SQL foreign keys, RLS-compatible. **Branches with the database**: every branch gets an isolated auth environment (test signup/login/OAuth on preview branches without touching prod). This is the killer feature vs. any external provider.
- Caveats: AWS regions only (fine for his setup); **not supported with IP Allow or Private Networking enabled** (only matters on Scale).
- Migration guides exist from **Supabase Auth** and legacy Stack Auth; Clerk/Auth0 have no official guide (standard Better Auth migration applies).

Sources: https://neon.com/docs/auth/overview.md, https://neon.com/docs/auth/roadmap.md, https://neon.com/docs/introduction/plans.md (Auth row).

### What replacing a paid provider takes
- **Difficulty**: code change, low–moderate for Next.js (`@neondatabase/auth` server/client SDK, drop-in route handler `app/api/auth/[...path]/route.ts`).
- **What's missing vs. incumbents**: MFA (coming), enterprise SSO/SAML, SCIM, admin-plugin customization, waitlist/invite-only gating (docs say restricted signup "coming soon"; achievable today via blocking `user.before_create` webhooks, which is custom code), phone-OTP requires bringing your own SMS provider.
- **Substitutable spend**: he has **no confirmed paid auth spend** today, so value is avoidance: Clerk paid starts ~$25/mo (10k free MAU), Auth0 Essentials $35/mo B2C (~$150/mo B2B tier) — at any scale past the free tiers this is **$300–$2,880+/yr avoided**, included in the Neon plan he may already pay for.
- **Who should NOT switch**: needs MFA or enterprise SSO **now**; needs standalone FE/BE on different domains; needs Clerk's prebuilt hosted UI/admin dashboard without building one; needs >1M MAU with an SLA on auth.
- **Reversibility**: unusually good — users/sessions are rows in his own Postgres, not a vendor's. Export = SQL.

---

## Topic 3 — Object Storage deep-dive

### What it is (per docs + official skill text)
- **S3-compatible** object storage that **branches with the database**: every Neon branch gets its own isolated, copy-on-write storage state. Forking copies no data; child-branch writes stay isolated from the parent.
- **Setup**: declared in `neon.ts` (`preview.buckets`), provisioned with `neon deploy`. Credentials injected as env vars (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`) — same credential system as Functions/AI Gateway.
- **S3 compatibility**: standard AWS S3 SDKs, `boto3`, and the AWS CLI work unchanged against the branch endpoint; **SigV4 auth, path-style addressing only**. `PutBucketWebsite` returns 501 — no static-website mode.
- **Objects up to 5 GiB**, multipart upload supported.
- **Two access modes**: `private` (default — every operation needs a credential) and `public_read` (anonymous reads, authenticated writes).
- **Presigned/short-lived URLs**: fully supported — `getSignedUrl(s3, new GetObjectCommand(...), { expiresIn: 3600 })` and presigned upload posts (`signedUploadUrl` in the Files SDK). A live doc example shows a presigned GET URL `?X-Amz-Algorithm=AWS4-HMAC-SHA256…` expiring after 1 hour.
- **SDKs**: (a) raw AWS SDK v3 with the injected endpoint/creds; (b) **Files SDK** (files-sdk.dev) with the `neon` adapter — `new Files({ adapter: neon({ bucket: "images" }) })`, giving `upload/download/url/list/exists/copy/delete/signedUploadUrl` over web-standard I/O.
- **Pricing**: **$0.023/GB-mo for stored volume only, zero per-operation fees.** Egress counts toward the shared 500 GB/mo public-transfer allowance (then $0.10/GB). **Free plan: 5 GB/project. On Launch/Scale there is no free storage allowance** — pure usage billing (verify: one third-party mirror of Neon's pricing page says Object Storage + Functions are free during beta; the live plans page prices them — treat the beta-free claim as unconfirmed).
- **Availability caveat**: public beta; official agent-skill text says "available only on new projects in `us-east-2`" (one mirror, 5 days old, says also `eu-central-1`; the 2026-09-17 backend-GA announcement describes it as GA). If his project is older or in another region, confirm eligibility in the Neon Console before planning around it.

Sources: https://neon.com/docs/introduction/plans.md (Object Storage row), Neon agent-skills object-storage content (mirrored at github.com/neondatabase/agent-skills and several mirrors), velclaw image-processing guide example.

### The image-optimization money question
- **The catch: no on-the-fly resizing.** There is no `?w=400` image API. The pair-with answer is a **Neon Function running `sharp`** (there is a published pattern: an image-processing API Function on Neon + bucket declared in `neon.ts`): resize **once at upload time**, store the processed variant, serve via `public_read` bucket + CDN.
- **Architecture sketch**: upload → Neon Function (`sharp`: resize to 3 widths, webp/avif, quality 80) → `processed/` keys in bucket → `public_read` bucket → **Cloudflare (free tier) or Vercel in front as CDN** with `Cache-Control` set on `PutObject` → write each variant to a **new key** (never overwrite) and repoint the key in Postgres. Browsers/crawlers hit the CDN, not Neon.
- **Math**: Vercel Image Optimization on Pro ≈ $0.05/1K transforms + cache writes. At 50K transforms/mo that's ~$2.50/mo; at 500K/mo ~$25/mo. Object Storage side: a 50 GB image library = 50 × $0.023 = **$1.15/mo**, zero op fees; CDN egress mostly absorbed by Cloudflare free / Vercel edge cache. Savings are modest today but the meter becomes fixed instead of variable — it grows cheaper relative to traffic, and it removes one more per-request meter from the stack.
- **Difficulty**: code change (one Function + `neon.ts` + upload plumbing). **Reversibility**: full (bucket is just S3; point CDN back to `/_next/image`).
- **Branching for backtest artifacts**: every branch gets a copy-on-write view of the buckets — store backtest outputs (parquet/csv of calibration runs) on the analysis branch, isolated from prod's files, then delete the branch. Billing caveat: DB child-branch storage is min(delta, logical size); object-storage branch billing details are not spelled out in the docs I could fetch — confirm in console before assuming zero-cost branching for large artifacts.

---

## Topic 4 — Autoscaling specifics

### Confirmed mechanics (official docs)
- Per-compute **min/max CU range**, no restarts or manual intervention; scales "in response to current load."
- **Max autoscaling range = 8 CU** (max − min ≤ 8). Autoscale ceiling: **16 CU on Launch** (8 CU was the old number in some pages; the live plans table says up to 16 CU autoscaling on Launch, 16 CU autoscale / fixed to 56 CU on Scale).
- **Minimum 0.25 CU** (1 GB RAM); 0.25/0.5 CU are shared compute. 1 CU ≈ 4 GB RAM.
- **Per-branch settings: yes** — each branch has its own compute endpoint with its own min/max (settable via Console "Edit compute" or `neon.ts` `computeSettings.autoscalingLimitMinCu/MaxCu` per branch function; the `branch()` hook can give preview/dev branches a cheap 0.25–1 CU profile while prod keeps a larger one).
- **Scale-to-zero**: suspends after **300 seconds (5 min)** inactivity on Launch (configurable/disableable on Launch; 1 min–always-on on Scale). Cold start resumes on next connection.
- Exact published trigger thresholds (CPU % / memory %) and scale-up/down latencies in seconds **are not stated** in the docs pages I could fetch this session (the algorithm deep-dive page was rate-limited at fetch time) — treat any number you see elsewhere as unconfirmed. Flagged as a follow-up: open https://neon.com/docs/introduction/autoscaling (linked "Understanding Neon's autoscaling algorithm").

### Worst-case math on Launch ($0.106/CU-hr)
| Scenario | CU-hours | Cost |
|---|---|---|
| Calibration backfill spikes to **4 CU for 3 h** | 4 × 3 = 12 | **$1.27** |
| Runaway agent loop pinned at **16 CU for a weekend (48 h)** | 16 × 48 = 768 | **$81.41** |
| Same runaway with **1 CU cap** | 1 × 48 = 48 | **$5.09** |
| Same runaway with **0.5 CU cap** | 0.5 × 48 = 24 | **$2.54** |
| Always-on at 0.25 CU baseline (a month) | 0.25 × 730 = 182.5 | **$19.35** |

This grounds the round-1 recommendation: **0.5–1 CU default max** turns a runaway weekend from an $81 surprise into a $2.50–$5 irritation. Backfill branches get a temporarily raised cap, then reset. Pair with **spending notifications** (Launch/Scale, alerts at 80%/100% of a set threshold — set the threshold at ~$25/mo so a runaway pings before it compounds).

---

## Topic 5 — Unused free/Launch allowances (verified against the plans page)

| Allowance | What it is | His allowance on Launch | One concrete use |
|---|---|---|---|
| **Public network transfer** | Egress shared across Postgres, Object Storage, Functions (includes logical-replication traffic) | **500 GB/mo per project**, then $0.10/GB | Covers backtest exports, object-storage image serving, replication initial copies — his usage is likely <1% of this |
| **Functions compute** | Serverless Node.js on a branch, billed in Capacity-Hours (active $0.10, waiting $0.025) + $0.60/M invocations | **No free allowance on Launch** (the "10 active / 400 waiting CH + 1M invocations" free tier is **Free-plan only**) | Scheduled backtest/backfill jobs; Function Triggers can replace some of the 23 Vercel crons |
| **Object Storage** | S3-compatible, branch-aware | **No free allowance on Launch** (5 GB free is Free-plan only); $0.023/GB-mo usage billing | Site images via `public_read` bucket + CDN; backtest artifacts on branches |
| **Snapshots** | Point-in-time branch snapshots (manual + scheduled) | **100 manual snapshots** (count limit, not free storage); storage $0.09/GB-mo; scheduled don't count against the limit | Pre-backfill snapshot before every calibration run — free safety net |
| **Auth MAU** | Managed Better Auth | **1M MAU** | Any future user-facing login (DFS tools, kit client portals) without a Clerk bill |
| **AI Gateway** | Single-credential routing to Anthropic/OpenAI/Google/Meta/Databricks/Alibaba models at **provider list prices, zero markup** | Prepaid credits (paid plans); "free during beta" per third-party mirror — verify in console | Replace OpenRouter routing for the agent fleet: removes the 5.5% deposit fee and the NIM flakiness |
| **Data API** | PostgREST-compatible HTTP interface; stateless, RLS-enforced, JWT from any provider | Included, no separate meter | Let Vercel Edge functions query the DB over HTTP without persistent connections — relieves pooler pressure from 23 crons + agents |
| **History window / instant restore** | PITR change history | Up to 7 days, $0.20/GB-mo (round-1: set 1 day) | Keep at 1 day; snapshots cover the rest |
| **Branches** | Copy-on-write branches | 10/project included, extra at $1.50/branch-month (~$0.002/hr) | Analytics/backtest branches with 7-day TTL |

**Corrections to task assumptions**: (1) the Functions "10 active / 400 waiting Capacity-Hours + 1M invocations" free tier is Free-plan-only, not a Launch allowance; (2) the 5 GB Object Storage free allowance is also Free-plan-only. Both are still cheap on Launch at usage rates.

---

## Open gaps / follow-ups for a later pass
1. **Neon plan tier still unconfirmed** — console check owed (determines whether MAU=1M, 500 GB transfer, etc. actually apply; if he's on Free, the allowances table flips).
2. **Object Storage availability on his project** — beta; confirm the project is eligible (region + project age) in the console.
3. **Autoscaling algorithm exact thresholds/latency** — the deep-dive page ("Understanding Neon's autoscaling algorithm") was rate-limited during this session; numbers unconfirmed.
4. **Object Storage branch-billing semantics** — child-branch object billing not spelled out in fetched docs; confirm before large backtest-artifact use.
5. **AI Gateway "free during beta"** — from a third-party mirror of Neon's pricing page, not the live docs; confirm in console before routing spend through it.
