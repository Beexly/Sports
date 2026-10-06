# Neon access measured: key works, and the cost math is wrong by 2.5x (2026-09-28)

**Bucket: data-sources.** The founder supplied a Neon API key and the v2 spec
URL. This records what that key actually unlocked and corrects a number the
round-1 and round-2 audits both assert. Every line is a command output.

## What the key does

`neon me` authenticates as **PickPilot**, and reports **plan: free**.

That is worth pausing on. The Neon cost audits in this folder reason from
**Launch** tier pricing ($0.106/CU-hr) throughout, and round 2 corrects several
Free-vs-Launch allowance errors in the process. If the account is genuinely on
**free**, the CU-hour unit price used in every cost projection is wrong by a
factor of roughly 5, not just the allowances.

I could not read the plan tier back from the API: `GET /v2/projects/
summer-brook-99380762` returns the project object without a plan field, and
`neon me` prints a top-level `plan: free` that may describe the account rather
than this project. **Treating the tier as unconfirmed**, which is exactly the
founder tap the round-1 audit already listed.

## The cost finding that matters more than the tier

| Setting | Value | Read |
|---|---|---|
| `suspend_timeout_seconds` | **0** | compute never scales to zero |
| `autoscaling_limit_min_cu` | 0.25 | floor |
| `autoscaling_limit_max_cu` | **8** | ceiling, i.e. 32x the floor |
| lifetime compute | 363.1 CU-hours | |
| lifetime active wall-clock | 574.1 hours | |
| **CU-h per active hour** | **0.632** | 1.0 would be pinned awake at 1 CU |

Both audits model the bill as 0.25 CU pinned: "~0.25 x 730h = ~182.5 CU-hrs/mo
= **~$19.35/mo**". Measured duty cycle is **0.632 CU-h per active hour**, so the
real average is **2.5x the modelled figure**, and it is not caused by the crons
holding the endpoint awake (0.25 CU would produce exactly 1.0 CU-h/active-hour
only if pinned at 1 CU; the floor alone gives 0.25). Something is genuinely
consuming above the floor.

**Two changes, neither of which I made.** They are pricing posture on a
production database and they are yours:

1. **Cap `autoscaling_limit_max_cu` at 1.0** (round 2 itself says "0.5-1 CU by
   default"). Round 2's own worst case: 16 CU runaway over a weekend is $81.41
   against $5.09 at a 1 CU cap. The ceiling is 8, so that exposure is live.
2. **Decide whether `suspend_timeout_seconds: 0` is deliberate.** Round 2's
   whole scale-to-zero thesis ("needs 5 min idle") cannot apply at timeout 0.
   A 300s timeout with the cron fleet batching would be the test.

I did not change either. An API key that can resize production compute is not
something to exercise to see what happens.

## Extensions: the research was right

Checked with a read-only role against `main`; 97 extensions visible, so the list
is not filtered:

| Extension | Version | Status |
|---|---|---|
| `vector` | 0.8.0 | available. bge-m3's 1,024 dims is inside the <=2,000 HNSW limit the audits cite |
| `lakebase_vector` | 1.1.1 | available |
| `pg_cron` | 1.6 | available, confirming round 2 against stale third-party tables |
| `pg_partman` | 5.1.0 | available |
| `timescaledb` | 2.17.1 | available |
| `pg_net` / `pg_http` | — | **not** in the 97. Round 2's "not available" holds |

One correction to my own work: an early filter for `pgvector` returned nothing
and I briefly read that as absence. The extension is named `vector`, not
`pgvector`. The research was right and my query was wrong.

`CREATE EXTENSION` is a write, so **pg_cron is NOT enabled here.** Under the
branch-only doctrine it goes on a throwaway branch first:
`neon checkout hermes-pgcron --create`, enable there, verify, then point at
production deliberately. The `cron.database_name` API-set step the round-2 audit
describes is now unblocked by having a key, but it still touches the default
branch's compute config, so it waits for the same reason.

## Still needs a founder tap

- Confirm the plan tier in the console. The audits' entire cost model assumes
  Launch; the CLI says free. One of those is wrong and it changes every number.
- Burn by line item, which is console-only.
- `neon deploy` (branch TTL policy) needs the key, which now exists, but the
  project is not yet onboarded to the backend platform.

*Read-only queries only. No extension created, no compute resized, no branch
created, no plan changed. No connection string printed.*
