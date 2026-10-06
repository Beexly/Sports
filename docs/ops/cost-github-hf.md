# Cost audit — GitHub Actions + Hugging Face

**Date:** 2026-09-29 · **Repo:** `Beexly/Sports` (PUBLIC, default branch `main`)
**Scope:** READ-ONLY measurement. No settings changed, nothing cancelled, nothing deployed, no DB writes.
**Method:** `gh api` against the Actions/Spaces REST APIs + live HF Hub API, authenticated with the
token already on disk at `~/.cache/huggingface/token`. All numbers below are measured, not estimated —
except where explicitly labelled as a projection.

---

## Headline

| | Measured | Billable today? |
|---|---|---|
| **GitHub Actions minutes** | ~19,100 job-min/30d (≈638 job-min/day) | **No — $0.00** |
| **GitHub artifact storage** | 1.4 MB across 1,868 artifacts | **No — $0.00** |
| **HF PRO subscription** | active, renews 2026-10-01 | **Yes — $9.00/month = $108/yr** |
| **HF Spaces compute** | 2 `cpu-basic` RUNNING + 1 `zero-a10g` RUNNING | **No — $0.00/hr** |
| **HF ZeroGPU overage** | no credit balance reachable via API | **Unverified — needs founder UI check** |

**The one recurring cash line item in this entire audit is the $9/month HF PRO subscription.**
GitHub Actions is not costing money, and the usual "cut your CI minutes" playbook does not apply here.

---

## 1. GitHub Actions — the spend is zero, and here is why

`Beexly/Sports` is a **public** repository, and every one of its 8 live workflows runs on
`ubuntu-latest`, a **standard GitHub-hosted runner**.

GitHub's billing docs are unambiguous on this point:

> GitHub Actions usage is **free** for self-hosted runners and for **public repositories** that use
> standard GitHub-hosted runners.
> — [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

Confirmed against the Dec 2025 pricing-change announcement and the 2026 pricing page: *"Standard
GitHub-hosted or self-hosted runner usage on public repositories will remain free."*

Measured, every live workflow file on `main`:

| workflow file | runner | multiplier | larger runner? | self-hosted? |
|---|---|---|---|---|
| `ci.yml` (12 jobs) | `ubuntu-latest` | 1× | no | no |
| `external-cron.yml` (9 jobs) | `ubuntu-latest` | 1× | no | no |
| `external-watchdog.yml` | `ubuntu-latest` | 1× | no | no |
| `daily-smoke.yml` | `ubuntu-latest` | 1× | no | no |
| `fable-evidence.yml` | `ubuntu-latest` | 1× | no | no |
| `neon_workflow.yml` (3 jobs) | `ubuntu-latest` | 1× | no | no |
| `nova-convergence-inventory.yml` | `ubuntu-latest` | 1× | no | no |
| `python-tests.yml` | `ubuntu-latest` | 1× | no | no |
| `weekly-comparison.yml` | `ubuntu-latest` | 1× | no | no |

There is **not a single** `macos-*` (10×), `windows-*` (2×), or `*-larger` runner. Larger runners are
the one category GitHub bills *even on public repos* — this repo has none. **Actions cost is $0.00.**

### 1a. Volume, measured (for latency/queue reasons, not dollars)

| Workflow | Runs on record | Measured rate | Median | p95 | Max | Failure rate |
|---|---|---|---|---|---|---|
| **CI** | 6,814 | ~67/day (Sep 23–29) | 4.9 min | 19.1 | 36.1 | **55.8%** |
| External Cron | 4,329 | 3,360/30d (cron) | 0.4 min | 1.8 | 6.1 | 19.8% |
| Create/Delete Branch | 3,241 | — | 0.25 | 0.5 | 10.8 | 2.8% |
| FABLE Evidence | 656 | on `pull_request` | 0.7 | 1.1 | 2.1 | 5.5% |
| External Watchdog | 390 | 1,440/30d (`*/30`) | 0.15 | 0.6 | 1.2 | **77.2%** |
| Daily Smoke | 132 | 30/30d | 0.5 | 0.9 | 4.1 | **59.1%** |
| Copilot cloud agent | 28 | — | 2.4 | 16.5 | 52.9 | — |
| Dependabot | 36 | — | 2.1 | 5.1 | 5.6 | — |

Per-job detail (the real billing unit) from 1,620 sampled jobs across 6 workflows:
**6.00 jobs per CI run**, mean **10.3 job-minutes per CI run**.

**Projected burn: ~638 job-minutes/day ≈ 19,100 job-minutes/30d.** Free, but that is real
runner-time and it is worth knowing where it goes.

### 1b. Already-deleted workflows still registered

9 of the 19 registered workflows no longer exist on `main` (404 on contents API):
`codeql.yml`, `genesis-package.yml`, `genesis-production-activation.yml`,
`genesis-reconciliation-package.yml`, `green-gate.yml`, `ios-build.yml`,
`nova-one-time-ci-repair.yml`, `nova-verification.yml`, `testdriver.yml`.

They are **inert** — a deleted workflow file cannot be triggered, so they cost nothing. They only
add noise to the Actions sidebar. No action needed for cost; deleting the stale registrations is
cosmetic.

---

## 2. Where the Actions minutes actually go (efficiency, not money)

Since minutes are free, these are **reliability** findings, offered as such.

### Finding 1 — External Watchdog fails 77.2% and has for 41 days

`external-watchdog.yml` runs every 30 min (1,440/30d, ~749 job-min/30d — the single largest
scheduled consumer). Its failure is **standing, not transient**:

```
"operatorHint": "unknown (stub DB or query failed)"
"reason": "No odds line snapshot has ever been recorded (or the table is unreachable)
           — absence is treated as an outage, not as calm."
schedulerLiveness.status = unknown
##[error]Scheduler is not healthy: status=unknown, ageMinutes=unknown
```

**30/30 sampled runs** at the tail are red and the cause is an unreachable DB, which no amount of
re-running fixes. It is a monitor that cannot currently monitor.

- **Do not disable it** — the guardrail is correct; the *data* is missing.
- Real fix is upstream: restore the odds-line snapshot path the watchdog reads.
- Interim: reduce `*/30 * * * *` to hourly (`0 * * * *`) to cut 1,440 → 720 runs/30d. It is a
  *standing* failure, so 30-min polling adds no detection value today.

### Finding 2 — Daily Smoke fails 59.1%, and 49 of the last 60 runs

Latest run: `Status: FAIL — 1 regression(s), 0 warning(s)`, exit 2. Every HTTP probe in the log is
`OK` — the regression is a *content/state* check, not uptime. A daily smoke that is red 5 days a
week stops being a signal. Needs the specific regression identified before the cadence is worth
anything; it is only 30 runs/30d (≈13 min/30d) so cost is not the issue.

### Finding 3 — CI: 55.8% failure, 19.8% cancelled

Of 400 sampled CI runs: 223 failure, 79 cancelled, 97 success.

**Do NOT "fix" the cancellations.** `ci.yml` already has a carefully-reasoned `concurrency` block,
and the comment above it documents a real incident where two-side cancellation left jobs orphaned
`in_progress` and let a commit sit on a PR *looking checked* while CI never finished:

> Only the `pull_request` event may cancel. Cancelling from EITHER side made the survivor a race...

The 19.8% cancelled is superseded-by-newer-commit, which is the mechanism working as intended.
**Leave `ci.yml` concurrency alone.** Anyone proposing a generic "add cancel-in-progress" change here
would be re-introducing a known race that this repo already paid for.

### Finding 4 — Artifacts: 1,868 objects, 1.4 MB total

All 1,868 artifacts measured across 20 API pages: **1.4 MB**, none expired, largest < 0.01 MB,
~26 artifacts/day at ~0.02 MB/day. Storage is pooled and free-tier-covered; even a 90-day growth
projection is <0.01 GB. **No action.** Flagging this only because "1,868 artifacts" looks alarming
in the UI and does not cost anything.

---

## 3. Hugging Face — the only real money

### 3a. The recurring charge: PRO, $9/month

`GET /api/whoami-v2` on the on-disk token returns:

```json
{ "name": "Beexly", "type": "user",
  "isPro": true, "canPay": true, "billingMode": "prepaid",
  "periodEnd": 2026-10-01T00:00:00Z }
```

**Renewal is 2026-10-01 — one day after this audit.** At the published $9/mo that is
**$108/year**, and it auto-renews on `prepaid` billing.

What PRO actually buys, and whether this repo uses it:

| PRO benefit | Used here? | Evidence |
|---|---|---|
| 8× ZeroGPU quota (40 min/day vs 5) | 1 Space on `zero-a10g` | `studio-chat` RUNNING |
| Host up to 10 ZeroGPU Spaces | 1 of 10 | 1 ZeroGPU Space |
| $2/mo Inference Provider credits | **no Inference Endpoints exist** | 0 models/datasets; no serverless-inference call sites in repo |
| 1 TB private storage | **0 private repos** | all 9 Spaces are `private: false` |
| Spaces Dev Mode (SSH/VS Code) | no evidence of use | — |
| Private dataset viewer | no private datasets | — |

**Cancellation / downgrade options, in descending order of preference:**

1. **Downgrade to Free, keep the token.** Free accounts in good standing (verified email, >30 days)
   still host **up to 2 ZeroGPU Spaces**. This repo has exactly **1**. ZeroGPU quota drops from
   40 → 5 min/day and queue priority falls, but *nothing currently in the repo depends on the extra
   quota* — there is no embedding or inference call site. **Saves $108/yr. Near-zero risk.**
   - Decision gate: confirm no 8th-revision external consumer relies on `studio-chat` throughput.
2. **Keep PRO, delete the 8 unreferenced Spaces first** (see 3b). Keeps the subscription, removes
   the clutter, and removes the temptation to leave a ZeroGPU Space running unattended. **$0 saved** —
   it is risk reduction, not cost.
3. **Cancel PRO + delete the token.** Removes the $9/mo *and* the credential. Only correct if the
   founder confirms no zero-gpu work is planned. Note the token has broad write scopes
   (see 3d) — cancelling the subscription does **not** revoke it.

**The single highest-value action in this audit is #1 or #3, taken before 2026-10-01.** Everything
else on the Actions side is $0.

### 3b. Space inventory — 8 of 9 have zero references in the repo

Live state from the Spaces API, with storage measured via the tree API:

| Space | stage | hardware | replicas | storage | referenced in repo? |
|---|---|---|---|---|---|
| `timesfm3-benchmark` | RUNNING | `cpu-basic` | 1 | 0.02 MB | **YES** — `AGENTS.md:4064,4071` |
| `gse-proof-mcp` | RUNNING | `cpu-basic` | 1 | 0.04 MB | no |
| `studio-hub` | RUNNING | `static` | 1 | 0.01 MB | no |
| `studio-chat` | RUNNING | **`zero-a10g`** | 1 | 0.02 MB | no |
| `studio-media` | RUNTIME_ERROR | `zero-a10g` (req) | – | 0.08 MB | no |
| `studio-video` | RUNTIME_ERROR | `cpu-basic` (req) | – | 0.01 MB | no |
| `qwen38-27b-mlx-lab` | SLEEPING | `cpu-basic` (req) | – | 0.10 MB | no |
| `podcast-pipeline` | SLEEPING | `cpu-basic` (req) | – | 0.04 MB | no |
| `jppy-logo-demo` | SLEEPING | `zero-a10g` (req) | – | 0.01 MB | no |

Total Space repo storage: **0.33 MB**. Nothing here is a storage cost.

- **`cpu-basic` is free.** Per HF's Spaces hardware table: *"CPU Basic — 2 vCPU, 16 GB, 50 GB —
  Free!"* The two always-on CPU Spaces cost **$0.00/hr**. A paid `CPU Upgrade` is only $0.03/hr, so
  even an accidental upgrade would be trivial — and none is present.
- **ZeroGPU is not billed per-hour** (it is "$0" hardware backed by a shared pool, quota-metered),
  and overage only draws on **prepaid credits at $1 per 10 GPU-minutes**. No credit balance was
  readable via API (`/api/user-billing` → 401, `/api/billing/estimates` → 404), so **whether a
  balance exists is UNVERIFIED — founder must check the billing UI.**
- **Two Spaces are in `RUNTIME_ERROR`** (`studio-media`, `studio-video`). A permanently errored Space
  is a free CPU-bill candidate for deletion, but it is also possibly the thing you want fixed.
  Flagged, not recommended blindly.
- **Only `timesfm3-benchmark` is load-bearing** — it ran a preregistered benchmark
  (TimesFM median MAE 0.2433 vs naive 0.7505, ratio 0.324 ≤ 0.80, verdict MET) and is cited twice in
  `AGENTS.md`. **Keep it.** Note its Space file list is only 0.02 MB, so "weights baked at build"
  means they are in the Docker image, not stored as LFS in the repo.

**Cancellation option, conservative tier:** delete the 7 unreferenced Spaces
(`studio-media`, `studio-video`, `studio-hub`, `gse-proof-mcp`, `podcast-pipeline`, `jppy-logo-demo`,
`qwen38-27b-mlx-lab`) and keep `timesfm3-benchmark` + `studio-chat`. **$0.00/mo saved** (their
hardware is free-tier), but it removes 2 always-on runners, 2 errored Spaces, and reduces the
ZeroGPU footprint from 1 to 0 if `studio-chat` goes too. Justification is footprint and signal, not
dollars — stated plainly so it is not mistaken for a cost win.

### 3c. The on-disk cache: 5.78 GB, and two docs are now wrong

`~/.cache/huggingface/` holds **5.78 GB** of blobs — this is local disk, not an HF bill:

| model | size | revisions |
|---|---|---|
| `BAAI/bge-m3` | 4,564 MB | 2 (`main` → `5617a9f6`, plus `9a0624b8`) |
| `openai/clip-vit-base-patch32` | 1,214 MB | 2 |
| `ggml-org/gemma-3-270m-it-qat-GGUF` | 0 MB | 1 (empty) |

**Two documented claims are now false and should be corrected:**

1. `docs/fantasy/research/2026-09-28/hf-nfl-evaluation-tested.md` §5 states *"`torch`,
   `transformers`, and `sentence_transformers` are all absent from this machine's Python 3.14.7"*
   and that hosted inference returns 401 because *"No `HF_TOKEN` is present in the environment or in
   any `.env*` file."*
   - **torch 2.13.0 and transformers 5.16.1 ARE installed** (verified via `pip list`).
   - **A live `hf_` token IS present** at `~/.cache/huggingface/token` and authenticates successfully
     as `Beexly` (org `GalaxySportsEdge`).
   - The doc's central blocker — "BLOCKED on a founder token" — **no longer holds.** The
     already-downloaded bge-m3 weights plus installed torch mean local CPU embedding is testable now,
     with no hosted-inference call and no spend.
2. `AGENTS.md:4071` cites `gse-ml-service/app/models/timesfm_benchmark.py` + `POST
   /predict/timesfm-benchmark`. **That file is ABSENT** from `app/models/` (contents: `etkf.py`,
   `free_energy_coder.py`, `irl.py`, `mps_layer.py`, `tda.py`). The benchmark *result* is real; the
   cited serving-path file is not present.

**Disk-reclaim option (local only, no HF effect):** the superseded bge-m3 revision `9a0624b8`
(~2,271 MB, `main` points at `5617a9f6`) is dead weight — `huggingface-cli scan-cache` /
deleting that snapshot dir reclaims ~2.3 GB. Flagged for the owner; not actioned here.

### 3d. Security note on the token (no cost, but it is the risk that matters)

`whoami-v2` reports this fine-grained token as `displayName: "cil"`, `role: fineGrained`, with
scoped write permissions on the `Beexly` user:

```
repo.content.read, repo.write, repo.access.read,
inference.serverless.write, inference.endpoints.infer.write, inference.endpoints.write,
user.billing.read, job.write,
user.webhooks.read, user.webhooks.write, collection.read, collection.write,
discussion.write, user.notifications.read, user.notifications.write
canReadGatedRepos: true
```

For an account whose documented HF work is *read public model cards and datasets*, this is a
**write-capable credential including billing and webhook access**. Cancelling a PRO subscription
does not revoke it. Recommend rotating to a read-only token scoped to public content, and treating
`cil` as a shared secret.

---

## 4. Recommended actions

Ordered by real dollar impact. Nothing here was executed — this audit is read-only.

| # | Action | Saves | Risk | Do by |
|---|---|---|---|---|
| 1 | **Downgrade HF PRO → Free** (1 ZeroGPU Space ≤ free limit of 2) | **$108/yr** | Low — no repo call site depends on 8× quota | **before 2026-10-01** |
| 2 | Confirm HF credit balance in billing UI (API returns 401/404) | prevents surprise $1/10 GPU-min | none (read-only) | before 2026-10-01 |
| 3 | Rotate `cil` token to read-only; revoke write/billing/webhook scopes | — (security) | Low | soon |
| 4 | Correct `hf-nfl-evaluation-tested.md` §5 (torch/transformers installed; token exists) | — (correctness) | none | soon |
| 5 | Fix or correct `AGENTS.md:4071` timesfm file reference (file absent) | — (correctness) | none | soon |
| 6 | Restore the odds-line snapshot the watchdog polls; meanwhile `*/30` → hourly | 0 (free tier) | Low — 720 fewer runs/30d | next sprint |
| 7 | Identify the Daily Smoke regression (49/60 red) | 0 | none — currently no signal | next sprint |
| 8 | Delete 7 unreferenced HF Spaces; keep `timesfm3-benchmark` + `studio-chat` | $0 (footprint only) | Low — 0 repo references | optional |
| 9 | Reclaim ~2.3 GB stale bge-m3 revision locally | 0 (local disk) | Low — `main` points elsewhere | optional |
| 10 | Do **not** add `cancel-in-progress` to `ci.yml`; do **not** chase Actions "savings" | — | **Prevents re-introducing a documented CI race** | — |

---

## 5. What this audit could not verify

Stated plainly rather than guessed:

- **The actual HF invoice.** No billing endpoint is reachable with the available token
  (`/api/user-billing` → 401, `/api/settings/billing` → 404). `isPro`/`billingMode`/`periodEnd` are
  read from the account API; the $9 figure is HF's published list price, not a read of this
  account's invoice. **A credit balance may exist and is UNVERIFIED.**
- **GitHub's Actions billing page for this account.** The org/user billing API returned 404/403
  (needs `user` scope, owner-owned). The $0.00 Actions conclusion instead rests on the
  **structural** facts — public repo + standard runners only, no larger/self-hosted/macOS/Windows —
  each independently verified against the workflow files and GitHub's published pricing.
- **ZeroGPU minutes actually consumed.** Daily-quota consumption is not exposed by the public API.
  Only the *rate* ($1/10 GPU-min) and the *existence* of the running Space are established.
- **Whether anything outside this repo calls the 9 Spaces.** Reference search covered this repo only.

---

## Reproduce

```bash
# Actions: runner types, per workflow
for f in ci daily-smoke external-cron external-watchdog fable-evidence \
         neon_workflow nova-convergence-inventory python-tests weekly-comparison; do
  gh api "repos/Beexly/Sports/contents/.github/workflows/$f.yml?ref=main" -q .content | base64 -d | grep -E 'runs-on|self-hosted|larger'
done

# Actions: volume + failure rate
gh api "repos/Beexly/Sports/actions/workflows/257639625/runs?per_page=100" --jq \
  '.workflow_runs[] | {ev:.event, c:.conclusion, s:.created_at, u:.updated_at}'

# Actions: per-job minutes (the real billing unit)
gh api "repos/Beexly/Sports/actions/runs/<run_id>/jobs" --jq \
  '.jobs[] | {name:.name, cc:.conclusion, sa:.started_at, ca:.completed_at}'

# HF: account billing state (the $9/mo line)
TOK=$(cat ~/.cache/huggingface/token)
curl -s -H "Authorization: Bearer $TOK" https://huggingface.co/api/whoami-v2 \
  | python -c "import sys,json;d=json.load(sys.stdin);print({k:d.get(k) for k in ('name','isPro','canPay','billingMode','periodEnd')})"

# HF: Space runtime state (ZeroGPU vs cpu-basic)
curl -s -H "Authorization: Bearer $TOK" https://huggingface.co/api/spaces/Beexly/studio-chat \
  | python -c "import sys,json;print(json.load(sys.stdin).get('runtime'))"
```

Pricing sources: [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) ·
[GitHub 2026 pricing changes](https://github.com/resources/insights/2026-pricing-changes-for-github-actions) ·
[HF Spaces hardware](https://huggingface.co/docs/hub/spaces-gpus) ·
[HF ZeroGPU](https://huggingface.co/docs/hub/spaces-zerogpu) ·
[HF pricing](https://huggingface.co/pricing)
