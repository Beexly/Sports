# Neon Cost-Reduction Plan — Measured Audit

**Status:** read-only audit. No setting, branch, endpoint, or database was changed.
**Audit date:** 2026-09-29 (Neon org `org-floral-star-55015944`, plan `launch` v3.2, managed_by Vercel)
**Billing period measured:** 2026-09-01T00:00Z → 2026-10-01T00:00Z (695.5 h of the 720 h month elapsed at audit time)
**Source of truth:** `GET /organizations/org-floral-star-55015944/consumption` (Neon API v3), cross-checked against branch/endpoint inventory and the operation log.

---

## 1. Measured baseline

Neon reports `cost_total = 157.86 USD` for the period. That figure reconciles to the cent against Launch plan list rates:

| Line item | Measured usage | Launch rate | Cost | % of bill |
|---|---:|---:|---:|---:|
| Extra child branch-hours | 29,737 excess branch-hours | $1.50 / branch-month (720 h) | **$61.95** | 39.2% |
| Public egress over 500 GB included | 991.8 GB total → 491.8 GB billable | $0.10 / GB | **$49.18** | 31.1% |
| Compute | 429.4 CU-hours | $0.106 / CU-hour | **$45.51** | 28.8% |
| Root-branch storage | 2.43 GB-month | $0.35 / GB-month | **$0.85** | 0.5% |
| History / instant-restore | 1.84 GB-month | $0.20 / GB-month | **$0.37** | 0.2% |
| **Total** | | | **$157.86** | 100% |

Every line matches Neon's own `v3_metrics[].cost` values. Normalized to a full 720 h month: **$163.42**.

### Projects

| Project | ID | State | Sept cost | Notes |
|---|---|---|---:|---|
| `gse-postgres` (production) | `summer-brook-99380762` | active, 38 branches | ~$157.85 | main = 3.32 GB; 35 preview branches; 2 archived |
| `sports-db` | `wild-tooth-31983487` | main **archived** since 2026-09-20 | **$0.01** | 31.3 MB, 326 CU-seconds all month |

### The headline finding

**Storage is not the problem. Branch churn is.**

- All 38 branches hold **99.8 GiB** of logical size, but storage bills **$0.85** — because child branches bill on `min(accumulated changes since parent, footprint)`, and the total change volume across all 35 preview branches is **7.5 MB** ($0.003). Deleting branches to "save storage" saves essentially nothing.
- Meanwhile the branch-hour line is **$61.95** and **87% of it is churn**: only **3,916 excess branch-hours ($8.16)** are attributable to branches that still exist. The remaining **25,821 branch-hours (~$53.79)** came from branches created *and deleted* inside the period.

---

## 2. Compute hours — $45.51/mo, 28.8% of bill

**Measured**

- `main` (ep-summer-moon-apv5ccys, branch br-green-leaf-apdgksoe): **360.1 CU-hours** = $38.17.
- Active **562.6 h of the 695.5 h elapsed = 80.9% wall-clock**.
- Average **0.64 CU while active**; `autoscaling_limit_min_cu = 0.25`, `max_cu = 1.0`.
- Non-primary branches: 3.83 CU-hours = $0.41. A further **65.3 CU-hours ($6.93)** is unattributable to any surviving branch — i.e. compute burned by branches since deleted. Preview branches are not the compute problem; the branch-*hour* problem is (§3).
- `start_compute` / `suspend_compute` on `main`: **186 pairs in 6.2 days** (from the operation log) = ~30 wake/suspend cycles per day. Average awake stretch ≈ 39 minutes.

**Root cause of the 81% wall-clock figure:** `vercel.json` schedules **23 cron jobs firing 223 times per day**, including `refresh-odds` and `health-alert` at **every 15 minutes**. The compute never has a quiet window long enough to matter.

**Scale-to-zero is already on for `main`** — `suspend_timeout_seconds = 300`. So there is no scale-to-zero switch left to flip on the production endpoint. What remains is workload shape.

### Options

| # | Action | Est. monthly saving | Data-loss risk |
|---|---|---:|---|
| C1 | Consolidate the 15-minute crons (`refresh-odds`, `health-alert`) to hourly or slower, and move the remaining sub-hourly jobs off the DB path | **$14–28** (modeled: main active 81% → 25–40% of month) | **None.** No rows written or deleted. Risk is staleness of odds/health data and a longer queue for settlement jobs — an *availability/freshness* risk, not a data-loss risk. Settlement jobs (`settle-picks`, `deliver-settlement-alerts`) should be left at their current cadence. |
| C2 | Lower `main` `autoscaling_limit_max_cu` from 1.0 → 0.5 | **$2–6** | **None.** Compute sizing never destroys data. Real risk is query timeouts and OOM under peak load; a timed-out write rolls back cleanly, so this produces failed operations, never corrupt rows. Measured average is 0.64 CU, so a 0.5 cap binds only on peaks — savings are small. Do this *after* C1, and watch error rates. |
| C3 | Enable the connection pooler on all 38 endpoints (`pooler_enabled` is `false` on every one) | $0 direct | **None.** Reduces the chance a long-lived unpooled serverless connection holds the compute awake. Precondition: the repo already ships `packages/db/src/neon-serverless-adapter.ts` and a `NEON_SERVERLESS_DRIVER` flag, so Prisma is prepared for pooler-mode connection limits. Test on one endpoint first. |

**Recommendation:** C1 is the only compute lever with material value. C2 alone is not worth the timeout risk. C3 is hygiene, not savings.

---

## 3. Extra branch-hours — $61.95/mo, 39.2% of bill. The largest single line.

**Measured**

- Launch includes **10 branches per project**; the excess is billed at $1.50 per branch-month, prorated hourly. Neon's $61.95 = 29,737 excess branch-hours exactly.
- `gse-postgres` currently holds **36 ready branches** (main + 35 preview) — peak concurrency in the period was 36.
- **Hour-by-hour simulation of the 38 branches that still exist** yields only **3,916 excess branch-hours ($8.16)**. So **87% of the branch bill is already-deleted branches.**
- The operation log confirms the churn engine: **396 `create_branch` entries in a 6.2-day window**, each distinct branch id appearing exactly 6 times with identical timestamps — deduplicated, that is **66 creations in 6.2 days ≈ 10.6/day, of which 46 are already gone.**
- All 35 preview branches carry `expires_at = created_at + 14 days` (horizon 2026-09-30 → 2026-10-13). None are past expiry yet. Median branch age is 6.2 days; mean 6.9 days; 8 branches are older than 7 days.
- **Root cause:** `.github/workflows/neon_workflow.yml` creates a Neon branch on `pull_request: [opened, reopened, **synchronize**]`. `synchronize` fires on **every push to an open PR**. With 35 open PRs being pushed to, that is a new branch per push, held for 14 days, deleted only when the PR closes.
- The created branch's `db_url` is never consumed: the migration and schema-diff steps in that workflow are **commented out** (lines 57–84), and no other workflow references the outputs. These branches are currently paid for and unused.

### Options

| # | Action | Est. monthly saving | Data-loss risk |
|---|---|---:|---|
| B1 | **Delete the 35 preview branches now** | **$8.16** (only the standing-state portion) | **Low, and reversible in practice.** Each branch is a copy of `main` at creation time plus 1.2 MB of changes on average. Deleting discards only that delta. All 35 map to **still-open PRs** (confirmed against `gh pr list`), so the code is safe in git. Anyone mid-migration on a branch loses that branch's uncommitted DB state — the PR's code is not affected. **Recommended regardless, because these branches are unused and the 35 oldest will bill through 2026-10-13.** |
| B2 | Stop creating branches on `synchronize`; create only on `opened`/`reopened`, and reuse the existing branch on later pushes | **$25–45** (kills the 87% churn component) | **None.** This is a workflow change; it does not touch database state. Risk is that a PR's preview DB stops tracking its schema after the first push — which currently affects nothing, because no job consumes those URLs. If migrations are ever uncommented, this needs revisiting. |
| B3 | Shorten `expires_at` from **+14 days to +1 day** | **$5–12** (bounds the standing tail) | **None** on its own. Prevents a long-abandoned PR from pinning a billable branch for two weeks. Keep ≥1 day so a PR opened on Friday is usable over a weekend. |
| B4 | Cap concurrent preview branches at 15 (delete oldest beyond the cap) | $7.50 steady-state ceiling | **None** beyond B1's caveat. Requires a scheduled cleanup job; there is no branch-pruning cron in `.github/` today. |

**Recommendation:** B1 + B2 + B3 together move branch cost from **$61.95 → ~$0–8/mo**, a **$54–62 saving**, which is 34–39% of the entire bill — for zero data-loss exposure. B2 is the one that actually matters; B1 alone is a rounding error against the churn.

---

## 4. Storage — $0.85/mo. Deliberately do nothing.

**Measured**

- `main` logical size **3.32 GB**. All 38 branches total 99.8 GiB logical, of which 95.7 GiB is preview branches.
- Billed root-branch storage is **$0.85/mo**; billed child-branch change size is **$0.003/mo**.
- History window: `history_retention_seconds = 21600` (**6 hours**, already the Launch minimum tier). Billed history: **$0.37/mo**.
- Archived branches (`mve-experiment` 608.8 MiB, `hermes-census-20260818` 498.2 MiB): 9.51 GB-month of archived logical size, but Neon reports `logical_size_archived_cost = $0.00`.

### Options and why each is declined

| # | Action | Saving | Data-loss risk | Verdict |
|---|---|---:|---|---|
| S1 | Delete preview branches "to reduce storage" | **$0.00** | Low | **Declined.** Child branches bill on accumulated change size (7.5 MB total). This does nothing. |
| S2 | Shorten the history window below 6 h | ≤$0.37 | **Real and disproportionate.** | **Declined.** Saves at most 22 cents and destroys point-in-time recovery for the production branch. Bad trade. |
| S3 | VACUUM / REINDEX / drop tables on `main` | ≤$0.20 | **Catastrophic if misjudged.** | **Declined.** Storage is 0.5% of the bill. Not worth any write risk against a live production database. |
| S4 | Delete the 2 archived branches | $0.00 measured | Low | **Optional, hygiene only.** Not a cost action. |

**Recommendation: no storage changes.** The 99.8 GiB figure is an inventory number, not a bill number. Anyone reading the branch list and concluding "we must be paying for 100 GB" would be wrong by two orders of magnitude.

---

## 5. Egress — $49.18/mo, 31.1% of bill. The second-largest line, and it has no Neon-side switch.

**Measured**

- 991.8 GB transferred in 695.5 h ≈ **34 GB/day**. 844.4 GB is attributed directly to `main`; the remaining ~147 GB belongs to branches since deleted.
- Launch includes **500 GB per project**; the excess 491.8 GB costs $49.18. `sports-db` transferred 32.5 KB and is irrelevant here.

**There is no Neon setting that reduces this.** It is a property of what the application asks the database for. To get under 500 GB the app must move ~50% less data out of Postgres per month.

### Options

| # | Action | Est. monthly saving | Data-loss risk |
|---|---|---:|---|
| E1 | Profile egress: log bytes-returned per endpoint/route for one week, then attack the top offenders with column projections, `LIMIT`, and pagination | enables E2 | **None** (read-only instrumentation) |
| E2 | Fix the identified routes — `SELECT *` → explicit projections, unbounded result sets → cursor pagination, repeat aggregate calls → materialized view or cache | **$25–49** | **None, if done as projection/pagination.** These change *what is returned*, not *what is stored*. Risk is an application-level correctness bug (missing a column, truncating a list) — that is a product bug to test for, not data loss. **Do not implement E2 by dropping or archiving tables or by raising result-set caches that mask writes.** |
| E3 | Add the pooled connection string / compression at the edge | $0–5 | **None** |

**Recommendation:** E1 is a prerequisite and is free. E2 has the largest remaining headroom in the plan. Egress is the only line where a month of engineering beats a configuration change — and it is also the only line where a careless implementation can lose data (by deleting rows to "reduce payload").

---

## 6. Second project `sports-db` — currently $0.01/mo, but it is a $610/mo landmine

**Measured**

- `wild-tooth-31983487`, `aws-us-east-1`, created 2026-06-10. Sole branch `main` (br-damp-lake-apfiobts) is **archived**, 31.3 MB.
- September usage: **326 CU-seconds, 32.5 KB transferred**. Cost: **$0.0096**.
- Its endpoint `ep-*` has **`suspend_timeout_seconds = 0` — scale-to-zero is DISABLED** — and `autoscaling_limit_max_cu = 8`.

**Why deleting it is not a savings decision.** Deleting `sports-db` saves **one cent per month**. The real reason to act is the configuration: if anyone un-archives that branch or a stray connection ever lands on it, the cost ceiling is **8 CU × 720 h × $0.106 = $610.56/month**, and nothing would suspend it. That is 3.9× the entire current bill, from a project nobody uses.

### Options

| # | Action | Saving | Data-loss risk |
|---|---|---:|---|
| P1 | **Set `suspend_timeout_seconds` to 300 on the `sports-db` endpoint** | $0 now; removes the $610/mo tail risk | **None.** Pure runtime configuration. No rows touched. **Recommended first — cheapest risk reduction available.** |
| P2 | Lower `sports-db` `max_cu` 8 → 0.25 | $0 now; further bounds the tail | **None** (same reasoning as C2). |
| P3 | Delete the project | **$0.01/mo** | **Medium, and the only genuinely lossy option in this document.** The archived `main` holds 29.9 MiB of real data. Per Neon's docs a deleted project is **recoverable for 7 days**, after which it is permanent. The repo's own runbooks already flag this project as an orphan to delete (`START_HERE.md:35`, `TAKEOVER_LOG.md:21`), but they also warn repeatedly never to let `sports-db` `storage_*` variables reach production aliases. |
| P4 | Remove the 18 orphaned `storage_*` variables from Vercel (`storage_DATABASE_URL`, `storage_POSTGRES_URL`, `storage_NEON_PROJECT_ID`, `storage_PG*`, …) — all present in **Development, Preview and Production** | $0 | **Low but requires care.** A code search for `storage_(DATABASE_URL\|POSTGRES_URL\|NEON_PROJECT_ID\|PGHOST)` across the repo returns **zero references**, so nothing reads them. Removing them is safe from a code standpoint, but they are the only remaining handle on that database's credentials. **Take a `pg_dump` of `sports-db:main` first, then delete the project, then remove the variables** — in that order, so there is always a working handle and a recoverable artifact. |

**Recommendation: P1 immediately (free, zero risk), then P3+P4 in that order with a dump taken first.** Deleting the project is worth doing for hygiene and blast-radius reduction, not for the cent.

---

## 7. Ranked action list

| Rank | Action | Est. saving / mo | Data-loss risk | Cost to implement |
|---|---|---:|---|---|
| 1 | B2 — stop creating a Neon branch on every PR push | **$25–45** | None | ~5 lines of YAML |
| 2 | B1 — delete the 35 unused preview branches | **$8.16** | Low (1.2 MB avg delta; all map to open PRs) | 1 command, batched |
| 3 | B3 — `expires_at` +14d → +1d | **$5–12** | None | 1 line of YAML |
| 4 | P1 — enable scale-to-zero on `sports-db` | $0 (removes $610/mo tail) | None | 1 API call |
| 5 | E1 → E2 — profile and cut egress | **$25–49** | None if projections/pagination | days of engineering |
| 6 | C1 — consolidate 15-min crons | **$14–28** | None (staleness only) | workflow + app change |
| 7 | P3+P4 — dump, delete `sports-db`, remove `storage_*` | **$0.01** | **Medium** (7-day recovery window) | 3 ordered steps |
| 8 | C2 — `main` max_cu 1.0 → 0.5 | $2–6 | None (timeout risk) | 1 call, monitor after |
| 9 | C3 — enable pooler | $0 | None | test first |
| — | S1–S4 — storage | **$0** | S3 catastrophic | **do nothing** |

**Projected outcome.** Actions 1–4 alone: **$157.86 → ~$95/mo**. Adding 5 and 6: **→ ~$25–35/mo**. There is no configuration path to $0; the residual is egress and the irreducible cost of a main branch that is genuinely used.

---

## 8. Data-loss risk — consolidated statement

| Risk level | Action | What could be lost | Mitigation |
|---|---|---|---|
| **None** | B2, B3, B4, C1, C2, C3, E1, E2, P1, P2 | Nothing. These change workflow triggers, expiry policy, compute sizing, or runtime config. E2 must be implemented as projection/pagination — never as row deletion. | — |
| **Low** | B1 | Per-branch uncommitted DB delta (mean 1.2 MB, max ~30 MB). No code is lost; all 35 branches belong to open PRs whose code is in git. | Branch is recreatable from `main` + PR diff. |
| **Low (order matters)** | P4 | Access to `sports-db` credentials. | Delete vars **after** the dump and the project deletion. |
| **Medium** | P3 | The 29.9 MiB in `sports-db:main`, permanently, after the 7-day recovery window closes. | `pg_dump` first. Treat the dump as the system of record until P4 is done. |
| **High / never worth it** | S2, S3 | Production point-in-time recovery, or live rows. | **Declined.** Worth ≤$0.57/mo combined. |

**Invariant for this whole plan:** nothing above deletes a row, truncates a table, shortens a recovery window, or archives data. The only irreversible act proposed is deleting a 31 MB database that the repository's own runbooks already identify as an orphan — and that is sequenced behind a dump.

---

## 9. How to re-measure

```bash
neon api /organizations/org-floral-star-55015944/consumption   # period total + per-line v3_metrics costs
neon api /projects/summer-brook-99380762/branches?limit=500   # branch count, logical_size, expires_at
neon api /projects/summer-brook-99380762/endpoints?limit=200  # suspend_timeout_seconds, max_cu, pooler_enabled
```

The three-line reconciliation in §1 (branch-hours ÷ 720 × $1.50; compute CU-h × $0.106; egress GB over 500 × $0.10) reproduced Neon's $157.86 exactly and is the fastest way to tell which line moved after any change. All figures above are month-to-date for 2026-09; the consumption endpoint resets on 2026-10-01, so re-baseline then.

---

## Verification note (2026-09-29, hermes)

I tried to make the P1 fix myself and could not. Recorded so the next agent
does not repeat the attempt.

**The local `NEON_API_TOKEN` is not an API key.** It is a 219-character
connection string beginning `https://ep-sum...`, i.e. a database URL, not a
`napi_...` token. Calling `GET https://console.neon.tech/api/v2/projects` with
it as a bearer returns:

```
401  {"message":"supplied credentials do not pass authentication"}
```

This is consistent with the earlier finding on this machine: `neonctl me`
reports `Projects Limit 0` and `not an organization member` for the only org it
can see. The local CLI identity belongs to a different account than the one
that owns `gse-postgres` and `sports-db`.

Nothing in this repo holds a working `napi_` token, so the audit's own numbers
were obtained another way -- most likely a browser session, or a key that was
never persisted.

**P1 therefore requires the founder** (or an `napi_` key in
`~/AppData/Local/hermes/.env` as `NEON_API_KEY`):

1. Neon console -> `sports-db` (`wild-tooth-31983487`) -> branch `main`
   (`br-damp-lake-apfiobts`) -> its endpoint -> set suspend timeout to 5 min.
2. Optionally lower the CU limit from 8 to 0.25 in the same place.

Both are pure runtime configuration, touch no rows, and are reversible. The
$610.56/month figure is the CEILING if that endpoint ever receives a real
connection while scale-to-zero is off; realistic exposure today is $0.01.

**Not done here, and deliberately not guessed:** this is a control-plane change
on a production account, and I will not attempt it without a credential that
actually authenticates.
