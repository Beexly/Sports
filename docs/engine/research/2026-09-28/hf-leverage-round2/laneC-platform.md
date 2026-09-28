# HF Hub as fleet infrastructure — Lane C: datasets as data lake + Spaces as compute platform (2026-09-28)

**Question:** Can the Hugging Face Hub serve as shared infrastructure for Garrett's agent fleet —
a data lake for his data plus a compute/scheduling/inference platform?
**Method:** Every claim below was verified live on 2026-09-28 against official HF docs
(`huggingface.co/docs`, official `huggingface/*` and `gradio-app/*` GitHub repos) or the Hub API.
Nothing is from training memory. Sources are linked per claim; the full source list is at the bottom.

## Account facts (live API check, 2026-09-28)

`GET /api/whoami-v2` on Garrett's connected credential returned:

- Account: **Beexly** (Garrett Baxley) — **`isPro: true`**, `canPay: true`, `billingMode: "prepaid"`
- **`orgs: []` — no Beexly org exists on HF.** "Org repos" are currently impossible; creating the org is a prerequisite step (a Garrett tap in the web UI or one API call).
- Token in use: fine-grained, named "Aisha" (created 2026-09-14), scoped to his user repos with
  `repo.content.read`, `repo.access.read`, `repo.write`, `inference.serverless.write`,
  `inference.endpoints.infer.write`, `inference.endpoints.write`, `user.webhooks.read/write`,
  plus `canReadGatedRepos: true`. (Token value never printed, per policy.)

Practical meaning: he already qualifies for paid-gated features (Inference Endpoints require
"an active subscription and credits added" — he has both), and he can mint per-agent
fine-grained tokens instead of sharing one credential.

---

## 1. Datasets as fleet data lake

### Mechanism (verified)

- **Storage model:** a dataset repo is a Git repo (with Git LFS for large files). Versioning,
  branches, PRs, and full history come free with the format.
  "Under the hood, the Hub uses Git to version the data" —
  https://github.com/huggingface/hub-docs/blob/HEAD/docs/hub/storage-limits.md
- **Private + gated datasets:** supported. Private repos are access-controlled by token/org role;
  gated datasets add an approval workflow. His token already carries `canReadGatedRepos`.
  Fine-grained access tokens can be scoped per-repo/per-org —
  https://github.com/huggingface/hub-docs/blob/HEAD/docs/hub/security-tokens.md
- **Parquet-first:** HF explicitly recommends Parquet (and WebDataset) for large datasets;
  Parquet datasets get the dataset viewer and the fastest tooling —
  https://github.com/huggingface/hub-docs/blob/HEAD/docs/hub/storage-limits.md
  ("Sharing large datasets on the Hub" section).
- **Partial reads:** six complementary patterns, all real in the `datasets` library —
  `streaming=True` (no download, iterate on the fly), `columns=[...]` (Parquet column pushdown),
  `filters=[...]` (Parquet predicate pushdown, skips row groups), `split="train[:10%]"`,
  `data_files` globs for specific shards, `.take(N)/.skip(N)`; plus file-level access via
  `hf_hub_download(..., repo_type="dataset")` and the `HfFileSystem` fsspec interface —
  https://huggingface.co/docs/datasets/v2.0.0/stream,
  https://github.com/huggingface/datasets/blob/HEAD/docs/source/stream.mdx
- **Concurrent semantics:**
  - Reads: unlimited concurrent readers, CDN-served — no locking issue at all.
  - Writes: each `create_commit` is **atomic** (all add/delete/copy ops in one call succeed or
    fail together), but there is **no server-side lock across commits** — concurrent pushes to
    the same branch race, last-writer-wins. `create_commit(..., parent_commit=<sha>)` gives
    **optimistic concurrency**: the commit fails if the branch moved, and the docs call this out
    explicitly as "especially useful if the repo is updated / committed to concurrently" —
    https://huggingface.co/docs/huggingface_hub/en/package_reference/hf_api
  - HF's own answer to concurrent writers is the **CommitScheduler** (used by Gradio Spaces):
    background thread, queued commits, append-only discipline, unique filenames per writer
    ("you are guaranteed you won't overwrite data from a previous run or data from another
    Spaces/replicas pushing concurrently") —
    https://huggingface.co/docs/huggingface_hub/v0.17.1/guides/upload
  - Explicit doctrine from HF: **"a git repository is not meant to work as a database with a
    lot of writes"**; UX degrades after a few thousand commits; `super_squash_history` exists
    to reset history —
    https://github.com/huggingface/hub-docs/blob/HEAD/docs/hub/storage-limits.md

### Limits (verified, official storage-limits doc)

| Account | Public storage | Private storage |
|---|---|---|
| Free user or org | best-effort* | **100 GB** |
| PRO ($9/mo, Garrett's tier) | up to 10 TB included* | **1 TB + pay-as-you-go ($18/TB/mo**, discounts at 50/200/500 TB) |
| Team org | 12 TB base + 1 TB/seat | 1 TB/seat + PAYG |
| Enterprise org | 200 TB base + 1 TB/seat | 1 TB/seat + PAYG |

\* Public "best-effort" = HF asks that large public uploads offer genuine community value
(likes/downloads); beyond the first few GB they expect responsibility.

Per-repo/per-file mechanics: no per-repo size cap for datasets, but everything counts against
the account quota; single file <200 GB recommended (**500 GB hard limit**); <100k files/repo;
<10k files/folder; keep commits to ~50–100 files (HTTP 60s timeout per commit otherwise) —
https://github.com/huggingface/hub-docs/blob/HEAD/docs/hub/storage-limits.md

Rate limits (fleet read patterns): API 1,000 req/5 min (free) / 2,500 (PRO); resolvers
(downloads) 5,000 / 12,000 per 5 min; limits are per-member, not shared —
https://huggingface.co/docs/hub/rate-limits

### Comparison vs his current stores

| | Neon Postgres | Google Drive | VM disk | HF datasets |
|---|---|---|---|---|
| Query model | SQL, indexed, ACID | blob files | local files | files + `datasets` streaming/pushdown |
| Concurrent writes | row locks, transactions | last-write-wins | single machine | git commits, no cross-commit lock |
| Versioning | manual/migrations | version history (weak) | none | **git — full history, branches, PRs** |
| Access from fleet | connection string | OAuth/API | same box only | **token per agent, per-repo scoping** |
| Durability | managed | managed | ephemeral VM | managed, CDN-served |
| Cost at his scale | existing | existing | free | PRO: 1 TB private included |
| Weakness | not a blob store | no structure, sharing friction | dies with the VM | **not a database; no SQL; write-heavy = pain** |

### Verdicts by data type

- **Backtest sets (parquet, versioned, read-heavy, written per season/week): USE.**
  This is the textbook Hub-dataset workload: immutable-ish shards, git versioning gives
  reproducibility ("which data produced this backtest"), streaming lets any agent pull slices
  without a full download.
- **Calibration tables (small parquet/CSV, versioned, updated on a schedule): USE.**
  Same shape as backtest sets. One repo per table family, tags per calibration run.
- **arXiv corpus embeddings (bge-m3 vectors over ~585 papers): USE.**
  Small (single-digit GB), read-heavy, benefits from versioning as the corpus grows.
  Parquet with Array columns; agents stream or `hf_hub_download` the shard they need.
- **Odds snapshots (frequent time-series appends): LATER — with a discipline.**
  Hot appends belong in Neon. Archive **cold snapshots** to the Hub as daily/weekly parquet
  shards (append-only, unique filenames, periodic `super_squash_history`). Writing every
  5 minutes to a dataset repo will hit the "not a database" wall (commit-count degradation,
  60s commit timeouts).
- **Live predictions / operational state / anything needing SQL or concurrent writers: SKIP.**
  Neon stays the system of record. The Hub has no queries, no transactions, no row locks;
  concurrent agents need the `parent_commit` optimistic-concurrency dance or a single-writer
  discipline — both are worse than Postgres for hot data.
- **Large media blobs (video/raw corpora): LATER.** PRO gives 1 TB private + $18/TB/mo PAYG;
  public is best-effort. Fine for curated public datasets; not a Drive replacement for
  terabytes of private video today.
- **VM scratch: stays scratch.** The Hub's role is the **durable shared layer** between the VM,
  the repos, and the fleet — VM computes, Hub persists and versions, Neon serves hot queries.

**Bottom line for §1: USE as the versioned, token-scoped, fleet-readable data lake for
immutable/versioned datasets. SKIP as a database. The missing Beexly org is the one
prerequisite for fleet-owned (org) repos.**

---

## 2. Gradio MCP — Spaces as MCP tools for the fleet

### What's REAL (verified, shipped, documented)

- **One line turns a Gradio app into an MCP server:** `demo.launch(mcp_server=True)`
  (or `GRADIO_MCP_SERVER=True`). Every API endpoint becomes an MCP **tool** automatically —
  function name → tool name, docstring + type hints → description + input schema. Tools,
  **resources** (`@gr.mcp.resource`), and **prompts** (`@gr.mcp.prompt`) are all supported,
  plus MCP-only pure-logic functions via `gr.api`. File inputs/outputs are handled
  (images/files accepted as URLs) —
  https://github.com/gradio-app/gradio/blob/HEAD/guides/10_mcp/01_building-mcp-server-with-gradio.md
- **Hosted on Spaces, reachable today:** a Space exposes
  `https://<space>.hf.space/gradio_api/mcp/` — documented with a live example Space
  (`abidlabs/mcp-tools`). An MCP client (Claude Desktop, Cursor, VS Code, Cline — i.e.
  **Claude/OpenCode-style tool callers**) adds a `{"mcpServers": {"name": {"url": ...}}}`
  config entry and calls the tools. **Yes — his agents can call a Space as an MCP tool today,
  no custom glue code.**
- **Private Spaces work:** pass the HF token as an `Authorization: Bearer <token>` header in
  the MCP client config. Private Spaces are available on the free tier —
  https://github.com/gradio-app/gradio/blob/HEAD/guides/10_mcp/01_building-mcp-server-with-gradio.md
  ("Private Spaces" section)
- **ZeroGPU Spaces work as MCP servers** with the caller's own quota (same doc).
- **HF ships its own official MCP server too:** the Hub docs describe an HF MCP Server that
  connects MCP clients (Codex, Cursor, VS Code, Zed, Claude Desktop) to the Hub — search
  models/datasets/Spaces/papers **and run community tools via MCP-compatible Gradio apps** —
  configured from `https://huggingface.co/settings/mcp` —
  https://github.com/grant/hub-docs/blob/HEAD/docs/hub/hf-mcp-server.md,
  https://github.com/jundot/hub-docs/blob/HEAD/docs/hub/agents-mcp.md
  (both are forks of official `hub-docs`; content matches the official HF MCP course:
  https://github.com/huggingface/mcp-course/blob/HEAD/units/en/unit1/hf-mcp-server.mdx).
  HF also ships an **official agent skill** (`huggingface/skills`, updated 4 days ago) with
  `space_search(mcp=true)` and `dynamic_space` invoke-as-tool —
  https://github.com/huggingface/skills/blob/HEAD/hf-mcp/skills/hf-mcp/SKILL.md

### Transports, auth, limits (verified)

- **Transport:** Streamable HTTP at `/gradio_api/mcp/` (current); older SSE endpoint at
  `/gradio_api/mcp/sse` appears in community configs — either way it's a plain remote-URL MCP
  server, no stdio needed for the client.
- **Auth — the sharp edge (official HF course):** Gradio's `auth=` argument on `launch()`
  **gates only the web UI; it does NOT protect the `/gradio_api/mcp/` endpoint — by design,
  agents can reach it without logging in.** For production: put the app behind a reverse proxy,
  deploy as a **private Space**, or use an MCP gateway implementing the MCP Authorization spec —
  https://github.com/huggingface/context-course/blob/HEAD/units/en/unit2/gradio-mcp.mdx.
  (Per-function header auth via `gr.Request`/`gr.Header` is also documented in the Gradio guide.)
- **Quota:** ZeroGPU-backed MCP tools burn the **caller's** GPU quota (free: 5 min/day;
  PRO: 40 min/day per current official docs — the sibling lane verified this today, but a
  2026-04 forum thread cited 25 min/day for PRO, so recheck the live
  `spaces-zerogpu` doc before sizing). If every fleet agent calls through one shared PRO token,
  they all draw from Garrett's single daily quota.
- **Sleeping Spaces break tool calls:** free-hardware Spaces sleep after ~2 days idle and wake
  on request with a 15–90s cold start. An MCP client with a short tool timeout will see the
  first call after sleep fail or hang — plan retries/warm-up, or paid hardware.
- **Throughput tip (official):** `queue=False` on event handlers cuts MCP latency up to ~10×
  (loses progress notifications) — same Gradio guide.

### Verdict: USE (pilot now)

Separate hype from shipped: **shipped.** A private Gradio Space with `mcp_server=True` is a
real, callable MCP tool for Claude/OpenCode-style agents today — URL + bearer token, no
boilerplate. Hype to ignore: "MCP auth is handled" (it isn't — `auth=` doesn't cover the MCP
endpoint; use private Spaces), and "ZeroGPU MCP = free unlimited fleet compute" (it's the
caller's quota, shared across the fleet on one token).
**Recommended first pilot:** expose one fleet utility (e.g. the Qwen3 internal-LLM Space or a
GSE data-fetch Space) as a private MCP Space and register it in the fleet's MCP configs.
Mint one fine-grained token per agent rather than sharing Garrett's.

---

## 3. Scheduled Spaces / webhooks — can a Space run cron?

### Mechanism (verified)

- **Spaces have no native cron.** What exists is **HF Jobs** (`huggingface_hub` / `hf` CLI):
  `create_scheduled_job` / `create_scheduled_uv_job` (Python) or
  `hf jobs uv run script.py --schedule "@daily"` / `--schedule "*/5 * * * *"` (CLI),
  with `@annually/@yearly/@monthly/@weekly/@daily/@hourly` shorthands or full CRON expressions,
  GPU flavors available, env/secrets/timeout support, and full lifecycle management
  (`list/suspend/resume/delete_scheduled_job`). **Webhook-triggered Jobs also exist** —
  https://github.com/brownkadarius81-hue/huggingface_hub/blob/HEAD/docs/source/en/guides/jobs.md
  (fork mirroring official `huggingface_hub` docs),
  corroborated by https://github.com/yashshinde0080/promptio/blob/HEAD/.agents/skills/huggingface-hub/references/automation.md
- **Hub repo webhooks** fire on repo events (push) and can hit external endpoints — his token
  already carries `user.webhooks.read/write`. Useful as "new dataset version landed → trigger
  fleet job," **not** as cron.
- **Sleep behavior (official):** "On free hardware, your Space will 'go to sleep' and stop
  executing after a period of time if unused" — suspended automatically after ~2 days idle;
  **upgraded (paid-hardware) Spaces run indefinitely** with a configurable sleep time; paused
  time is not billed —
  https://github.com/huggingface/hub-docs/blob/HEAD/docs/hub/spaces-overview.md,
  https://github.com/huggingface/hub-docs/blob/HEAD/docs/hub/spaces-gpus.md
  (the latter also confirms: billing per minute while Starting/Running; free disk is ephemeral).
- **External cron hitting a Space works** (his existing cron system, GitHub Actions, etc.),
  but the first request after sleep pays a cold start (15–90s). Community "keep-alive" pingers
  exist precisely because this is a gap, not a feature.

### Limits

- Jobs bill **compute credits** against the account (Garrett: prepaid billing, `canPay: true` —
  he can run them; exact per-flavor $/min lives in HF's billing docs, not re-verified here).
- A scheduled Job is a fresh container per run — no state unless it reads/writes a dataset repo
  (which is exactly the §1 pattern: Job pulls odds → appends to a private dataset repo).
- Free-Space sleep does **not** break scheduled Jobs (Jobs are a separate product from Spaces).

### Verdict: USE HF Jobs for scheduled work; SKIP the idea of cron *inside* a Space

For his actual needs — daily analytics pulls, money-sprint tasks, calibration refreshes —
**scheduled HF Jobs (`create_scheduled_uv_job`, CRON syntax) are the native, shipped mechanism**,
and they pair naturally with §1 (Job writes results to a versioned private dataset repo the
whole fleet can read). Don't build cron into a Space and don't rely on keep-alive hacks;
if an external scheduler must hit a Space endpoint, design for wake latency (retry + warm-up)
or put the Space on paid hardware.

---

## 4. Dedicated Inference Endpoints — the upgrade path off ZeroGPU

### Mechanism + pricing (verified live from the official pricing doc, updated 11 days ago)

Inference Endpoints = single-tenant dedicated deployments (AWS/Azure/GCP), autoscaling
(including **scale-to-zero**), custom containers, private endpoints, native engines
(vLLM, TGI, SGLang, llama.cpp, TEI). **Billed per minute** while initializing/running.
Requires an active subscription + credits — Garrett qualifies (`isPro: true`, `canPay: true`,
prepaid).
https://github.com/huggingface/hf-endpoints-documentation/blob/HEAD/docs/source/support/pricing.md

| Instance (AWS) | $/hr | Always-on $/mo |
|---|---|---|
| CPU intel-spr x1 (1 vCPU, 2 GB) | $0.033 | ~$24 |
| T4 x1 (16 GB) | **$0.50** | ~$365 |
| L4 x1 (24 GB) | **$0.80** (GCP $0.70) | ~$584 |
| A10G x1 (24 GB) | **$1.00** | ~$730 |
| L40S x1 (48 GB) | $1.80 | — |
| A100 x1 (80 GB) | $2.50 | ~$1,825 |
| H200 x1 (141 GB) | $5.00 | — |

Notes from the doc: AWS **H100 and B200 were deprecated Dec 2025** (GCP H100 x1 still listed at
$10/hr); `intel-icl` CPUs deprecated July 2025. No minimum commitment beyond per-minute billing.

### Break-even: PRO prepaid credits vs dedicated endpoint

- **ZeroGPU overage price: $1 per 10 min = $6.00 per GPU-hour** (shared pool, Gradio-only,
  queued, per-call 60s default runtime).
- Dedicated **T4 = $0.50/hr → 12× cheaper per GPU-minute**; A10G $1.00/hr → 6× cheaper;
  L4 $0.80/hr → 7.5× cheaper.
- With scale-to-zero, a dedicated endpoint costs ≈ instance_rate × active_hours.
  **1 GPU-hour/day of real work costs ~$6/day ($180/mo) in ZeroGPU overage vs ~$0.50–1.00/day
  ($15–30/mo) on a scale-to-zero T4/A10G.**

**Rule of thumb:** stay on ZeroGPU while the workload fits inside the included PRO quota
(~40 min/day, free). The day overage becomes routine — roughly, when sustained GPU use
exceeds ~40 min/day, i.e. more than ~$4/day in credits — a **scale-to-zero dedicated endpoint
wins on cost alone**. Graduate earlier if you need any of: latency/SLA (no shared queue),
non-Gradio serving (custom container, OpenAI-compatible API), a private endpoint, or
always-warm behavior without cold starts. Keep PRO credits for spiky overflow, not the base load.

Two honest caveats for the fleet-LLM plan (sibling lane's top action item):
1. **Per-token Inference Providers are usually cheaper than both** for plain LLM text
   workloads at low/medium volume — price the router before committing to an endpoint.
2. A dedicated endpoint for the *fleet's internal* Qwen3 makes sense once fleet-wide daily
   usage is steady; while it's bursty prototype traffic, ZeroGPU-inside-quota is $0.

### Verdict: LATER

Don't buy an endpoint today. The correct sequence: ZeroGPU inside quota (free) →
Inference Providers PAYG per-token for text → **dedicated scale-to-zero endpoint when daily
GPU minutes routinely exceed the PRO quota or latency/SLA matters**. The pricing above is
the verified menu for that decision; T4/L4 are the sane entry points for 7–8B models,
A10G/L40S for image/video (FLUX, MiniMax H3).

---

## Cross-cutting notes

1. **Create the Beexly org** (live API: `orgs: []`). Fleet-owned dataset/Space repos,
   shared ZeroGPU quotas, and shared billing all assume an org. Free org = 100 GB private
   storage, same as a user; Team/Enterprise unlocks the higher tiers.
2. **Token hygiene:** one fine-grained token per agent, scoped to the repos it needs
   (the "Aisha" token pattern already exists on his account). Never share the write token.
3. **The §1+§2+§3 stack composes:** scheduled Job → writes parquet → private dataset repo →
   fleet reads via streaming; utility Spaces expose the same data/compute as MCP tools.
   That's the actual "Hub as fleet infrastructure" shape — not any single feature.

## Sources (all verified 2026-09-28)

- Storage limits (quotas, file/repo limits, git-not-a-database doctrine):
  https://github.com/huggingface/hub-docs/blob/HEAD/docs/hub/storage-limits.md
- Enterprise/team plan storage table:
  https://huggingface.co/docs/hub/enterprise
- Rate limits: https://huggingface.co/docs/hub/rate-limits
- Dataset upload constraints (machine-readable limits):
  https://github.com/huggingface/hub-docs/blob/HEAD/docs/hub/datasets-upload-guide-llm.md
- Datasets streaming + partial reads:
  https://huggingface.co/docs/datasets/v2.0.0/stream,
  https://github.com/huggingface/datasets/blob/HEAD/docs/source/stream.mdx
- Access tokens (fine-grained, per-repo scoping):
  https://github.com/huggingface/hub-docs/blob/HEAD/docs/hub/security-tokens.md
- `create_commit` atomicity + `parent_commit` optimistic concurrency:
  https://huggingface.co/docs/huggingface_hub/en/package_reference/hf_api
- CommitScheduler / concurrent-writer guidance:
  https://huggingface.co/docs/huggingface_hub/v0.17.1/guides/upload
- Gradio MCP server guide (mcp_server=True, private Spaces, ZeroGPU, auth patterns):
  https://github.com/gradio-app/gradio/blob/HEAD/guides/10_mcp/01_building-mcp-server-with-gradio.md
- HF course: Gradio MCP auth caveat (`auth=` doesn't protect the MCP endpoint):
  https://github.com/huggingface/context-course/blob/HEAD/units/en/unit2/gradio-mcp.mdx
- HF official MCP server docs (via hub-docs forks):
  https://github.com/grant/hub-docs/blob/HEAD/docs/hub/hf-mcp-server.md,
  https://github.com/jundot/hub-docs/blob/HEAD/docs/hub/agents-mcp.md,
  https://github.com/huggingface/mcp-course/blob/HEAD/units/en/unit1/hf-mcp-server.mdx
- HF official agent skill (space_search mcp=true, dynamic_space):
  https://github.com/huggingface/skills/blob/HEAD/hf-mcp/skills/hf-mcp/SKILL.md
- HF Jobs incl. scheduled jobs + webhook triggers (official-docs mirror + corroboration):
  https://github.com/brownkadarius81-hue/huggingface_hub/blob/HEAD/docs/source/en/guides/jobs.md,
  https://github.com/yashshinde0080/promptio/blob/HEAD/.agents/skills/huggingface-hub/references/automation.md
- Spaces lifecycle/sleep + paid-hardware billing:
  https://github.com/huggingface/hub-docs/blob/HEAD/docs/hub/spaces-overview.md,
  https://github.com/huggingface/hub-docs/blob/HEAD/docs/hub/spaces-gpus.md,
  https://huggingface.co/docs/hub/en/spaces-overview
- Inference Endpoints pricing (official, updated 2026-09-17):
  https://github.com/huggingface/hf-endpoints-documentation/blob/HEAD/docs/source/support/pricing.md
- Live account check: `GET /api/whoami-v2` via the `huggingface` skill (`bin/hf-api`),
  2026-09-28 — Beexly, PRO, prepaid, no orgs (values summarized in "Account facts"; raw
  credential never printed).
