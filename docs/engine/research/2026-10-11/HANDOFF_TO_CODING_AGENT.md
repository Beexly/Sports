# Handoff — Galaxy Sports Edge (Cowork → coding agent)

**Date:** 2026-07-17 · **Repo:** `github.com/BeeXly/Sports` · **Prod:** galaxysportsedge.com (Vercel project `sports-web`, `prj_ZAFYsTbVviP2iiSZdzQcloZVHkBL`, team `team_VvPIx69THeXYfjeG71taqnPo`) · **AWS acct:** 183295455211

This is a state handoff from a Cowork session. Everything below is verified, not assumed. Guardrails I held to (same as the `gse-builder` contract): **no deploy, no merge to main, no production migrations, no secret changes, no gated-capability flips.**

---

## 1. Production is LIVE and current — nothing to deploy

- The **Glass Ledger + Edge Engine** program (PR **#120**) is **merged to `main` and serving production.** Verified three ways:
  - `origin/main` tip = `c179a781a8de7029176acee9271a5b04a0a59d09`.
  - Vercel production deployment `dpl_5SBabeGnjfW5UBTAtYBmyVcszmy2` (target=production, READY) is that exact commit.
  - `https://galaxysportsedge.com/llms.txt` returns 200 serving the Proof API manifest.
- **Rollback available:** prior prod deploy is a rollback candidate in Vercel if needed.
- **Everything gated ships dark** (PUBLISH_LEDGER, SEALED_ENGINE_ENABLED, JARVIS_MEMORY_WRITE_ENABLED, BACKTEST_HARNESS_ENABLED, WATCHLIST_ALERTS_ENABLED, LINE_ARCHIVE_* — all default OFF). Live public surfaces: `/llms.txt`, `/api/proof/{ledger,receipts,openapi.json,verification-spec.json}`, `/news-sitemap.xml`, `/watchlist` (503-honest until migration), `/tools`, `/sealed`, `/how-we-make-money`.
- **Other open branches on origin (NOT deployed — your call):** `claude/galaxy-sports-edge-pdcswh` (#119 red-team docs, has the newest preview), `claude/frontier-agent-foundry-2026-07-11`, `claude/frontier-model-router-shadow-2026-07-11`, `claude/frontier-superset-rebased`, `codex/sunday-frontier-maxforce-2026-07-05` (conformal-uncertainty work, currently checked out locally), plus `#122` CLV/Pedersen (migration founder-gated), `#121` fantasy (naming gate), `#52` dynasty. Recovery priority order is in the `gse-run` skill's `references/recovery-priorities.md`.

## 2. Claude Code → Azure AI Foundry (founder must finish — deploy a model, then 1 command)

**BLOCKING FACT (verified in Foundry portal):** the GSN project (resource `GSN-resource`, rg `rg-baxley.garrett-3810`, tenant `16268fef-…9529b3`) has **ZERO model deployments**. Deploy a Claude model first (GSN → Deploy → Claude → accept Anthropic terms → keep/name the deployment), then run the script below with that deployment name. Endpoint resolves to `https://gsn-resource.services.ai.azure.com`.

- Delivered: **`Setup-ClaudeCode-Foundry.ps1`** (in the Galaxy Sports Edge folder + sent to chat). Idempotent; backs up `settings.json`, merges the Foundry routing, stores the API key as a **User env var** (never in a file/chat), runs a live round-trip test.
- **Verified from the installed binary** (`claude.exe` 2.1.211): it reads `CLAUDE_CODE_USE_FOUNDRY=1`, `ANTHROPIC_FOUNDRY_RESOURCE` (builds `https://<resource>.services.ai.azure.com/anthropic/`), `ANTHROPIC_FOUNDRY_API_KEY` (sent as `x-api-key`), and `ANTHROPIC_DEFAULT_{SONNET,OPUS,HAIKU}_MODEL` = Azure **deployment names**. RESOURCE and BASE_URL are mutually exclusive.
- **Founder-only inputs the script prompts for:** resource name (default `gsn-resource`), the 3 deployment names (from Foundry → Deployments), and the API key. Backup + one line reverts it.
- Note: switching the provider routes Claude Code usage to Azure billing/credits.

## 3. `gse-run` skill installed (user scope) — repo install is yours

- I added **`gse-run`** + its 4 agents (`gse-scout/builder/verifier/red-team`) at **user scope** (`~/.claude/skills`, `~/.claude/agents`) so `/gse-run` works everywhere **without touching the repo** — deliberately avoiding your packet install.
- **Heads-up for your install:** `install-gse-orchestrator.ps1` copies the overlay into the repo with `Copy-Item -Force`, which **overwrites `.claude/settings.json`**. If you've customized repo `.claude/settings.json`, back it up first. It also writes `docs/frontier/*` and `.gitignore` exceptions.

## 4. Cloud leverage — see `AWS_LEVERAGE_MAP.md` + `GOOGLE_AZURE_LEVERAGE_MAP.md` (delivered alongside this)

Cross-cloud summary: **AWS** Activate application unsubmitted (up to $200K, Bedrock-eligible; budget cap armed; env-flip ready). **Google** GCP live but idle — $0 spend, zero credits, Google for Startups Cloud Program never applied (up to $200K–$350K AI tier; Vertex lane env-flip ready). **Azure** personal subscription $0, no Founders Hub sponsorship (portal-loop blocked, retry), Foundry GSN project has no deployments yet.

- **Correction to prior belief:** Activate credits are NOT blocked by a Free-Tier upgrade. Account has a payment method on file and $160 of free-tier credits are active & being used. The real gate: **Activate Credits (up to $100K–$200K, Bedrock-eligible) are a separate application** at `aws.amazon.com/startups/credits` — founder-only.
- **Budget guardrail VERIFIED armed:** `gse-monthly-hard-cap-50` exists in AWS Budgets (plus `codex-credit-20260703182645-budget`). The "cap before Bedrock spend" precondition is satisfied.
- **Biggest product lever:** those credits cover **Bedrock**, and `provider-dispatch.ts` already routes Claude → Bedrock via env flip. Sequencing: apply for credits → confirm Bedrock Claude model access (us-east-1 Model catalog; legacy Model-access page returns "not available") → flip `CLAUDE_PROVIDER=bedrock`.

## 5. Open OWNER_GATEs (founder-only; neither agent can do these)

- Apply for **AWS Activate Credits** (`aws.amazon.com/startups/credits`).
- Apply for **Google for Startups Cloud Program** (`cloud.google.com/startup`, AI track).
- **Deploy a Claude model in Foundry (GSN)** — includes accepting Anthropic marketplace terms — then run **`Setup-ClaudeCode-Foundry.ps1`** and paste the key.
- Any **production DB migration** (#122 CLV/Pedersen etc.) stays founder-gated.
- **Azure Founders Hub**: retry in a fresh/InPrivate session (portal loop was Microsoft-side; no sponsorship subscription exists yet).

## 6. NEW BUILD (this session): gse-ots-anchor — wire it next

`gse-ots-anchor.zip` (Galaxy folder): OpenTimestamps anchoring for Glass Ledger Merkle roots → Bitcoin block attestation = trustless *time* for publish-before-kickoff. **10/10 tests; serializer output byte-identical to the official python-opentimestamps reference.** Your one job before trusting the network path: live calendar smoke test (transport is injected; see README). Integration = 3 small steps (store .ots on commitment, serve /api/proof/ots/:slateKey, nightly upgrade poll). Also read `FRONTIER_UNTAPPED_ATLAS.md` for the ranked build-order beyond it (hosted proof-MCP deploy is #2 — that code already exists in galaxy-proof-mcp.zip).

## 7. Working-memory anchors

- Canonical clone: `C:\Users\Garrett\Sports` (currently on `codex/sunday-frontier-maxforce-2026-07-05`, tree dirty: `M CLAUDE.md` + scratch files).
- Prod SHA `c179a781`; Vercel project `sports-web`.
- Doctrine: current main + tests + live PR state outrank stale handoffs; recover before recreate; one canonical truth path; real data or honest-unavailable; no unsubstantiated public claims.
