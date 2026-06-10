# GSE R&D Repo Scan — Prioritized Report (2026-06-10)

**Scope:** 46 GitHub repositories researched (read-only: README + docs + signals; nothing cloned, installed, or run). Each was scored on RELEVANCE to GSE (product / engine-data / design-brand / growth-monetization / AI-agent-skills-workflow) and SAFETY (legitimacy + supply-chain + license + ToS). This report sorts by value and is explicit about what to do.

> **Standing rule for everything below:** ANY integration is **additive and founder-gated** — it never flips a live switch, never holds live GSE/Stripe/provider keys without review, and never auto-publishes or moves money. Repos in **SKIP / CAUTION** are **study-only or avoid** and must NOT be integrated.

---

## 1. Executive Summary

Of 46 repos, **~18 are clearly relevant** to GSE and **~14 are skip/irrelevant/flagged**, with the rest relevant-but-conditional. The signal is heavily concentrated in **one theme: the AI-agent / Claude-Code build workflow that builds GSE** — that is where almost all the high-value, clearly-safe finds land. Four secondary themes follow: **design/brand discipline** (DESIGN.md schemas, token-locked deck/UI generation, "good taste" skills), **code comprehension for a sprawling two-clone monorepo** (tree-sitter knowledge graphs / MCP code-intelligence), **research/RAG + document ingestion** for the intelligence program, and **growth/PM/distribution patterns**.

Three cross-cutting cautions recurred and shaped the rankings:
1. **Inflated star counts** on a cluster of brand-new 2026 repos (90k–210k stars on repos weeks old). Popularity was treated as marketing, not a quality or safety signal; legitimacy was judged on author, license, and content.
2. **Pipe-to-shell installers** (`curl|bash`, `iex(irm ...)`, auto-firing global hooks) on a dev box that holds live GSE/Vercel/DB credentials — a supply-chain pattern to avoid. The recommended posture across the board is **read the SKILL.md / source, port patterns, vendor reviewed snippets** rather than mass-install.
3. **AGPL / Noncommercial licenses** on otherwise-good design and tooling repos — a real constraint for GSE's proprietary, reveal-less codebase. These are usable as **methodology references**, not code to copy in.

The best finds are not products to embed — they are **pattern libraries and skills** that sharpen GSE's own founder-gated, gate-driven build campaigns, plus a small set of genuinely safe, local-first tools (a CI code-reviewer, a code-intelligence MCP, a document-ingestion utility, a self-hosted research/RAG notebook).

---

## 2. IMPLEMENT NOW — clearly SAFE + clearly RELEVANT (additive / gated)

Two flavors here: **(A) tools to pilot** behind a gate, and **(B) pattern libraries to mine now** (read + port into GSE's own `.claude` skills — zero install risk, immediate value).

### A. Tools to pilot (gated)

1. **alibaba/open-code-review** — *Apache-2.0, Alibaba, legit.* Hybrid deterministic+LLM code reviewer (Go/TS) that reads Git diffs and emits **line-level** comments (XSS/SQLi/null-safety/thread-safety), plugs into **GitHub Actions**, works with **Anthropic-compatible** models, has a DNS-rebinding guard.
   - **Integration:** automated second-pass PR/diff reviewer in CI alongside the existing gates (typecheck / lint `max-warnings=0` / vitest / build), as **advisory** input to the human-gated deploy — never an auto-merger.
   - **Effort:** medium (CI wiring + secured-env keys + ruleset tuning). **Gate:** pilot on the **non-deploy canonical clone** first; confirm the outbound data path is acceptable for proprietary engine code; point only at an approved model endpoint.

2. **colbymchenry/codegraph** — *MIT, local-first, no API key, legit.* CLI + **MCP server** + TS library: tree-sitter → local SQLite (FTS5) code graph, answers structural questions in **2–4 MCP calls** vs dozens of grep/glob/Read (~58% fewer tool calls), with App-Router route detection + impact analysis.
   - **Integration:** MCP server for the agent-build workflow over the large two-clone monorepo — call-graph tracing, impact analysis before edits, route detection; cuts tool calls + tokens.
   - **Effort:** low–medium (index the canonical clone, pin version). **Gate:** young v0.x single-maintainer with FS/MCP access — evaluate on a local index first, pin the exact version, review release diffs before upgrades, confirm it stays fully offline. **Promote to standard toolchain if savings prove out on a real build session.** (Pick this OR one of the two code-graph skills below — don't run all three.)

### B. Pattern libraries to mine now (read + port; no install)

3. **santifer/career-ops** — *MIT, named author, legit.* The single best **architectural template** here, even though its domain (job search) is off-target. Mine: `modes/*.md` + `_shared.md` skill layout + `AGENTS.md`/`CLAUDE.md` split; **orchestrator-vs-stateless-worker** batch design (`claude -p`); **recommend-but-never-execute** human gate (mirrors GSE's founder-gated rule exactly); single-source-of-truth tracker (`pipeline.md` + `states.yml`) for the command-center build queue; and its legible **A–F rubric** as a model for keeping the GSE Rating's category weights self-documenting.

4. **addyosmani/agent-skills** — *MIT, Addy Osmani, legit.* 23 Claude Code-native skills (`/spec /plan /build /test /review /code-simplify /ship` + reviewer/test/security personas). Each SKILL.md carries a **Rationalizations-rebuttal table + Verification-evidence requirement** — port that structure to complement GSE's adversarial-critic + gate discipline. Mine spec-driven-development, security-and-hardening, code-review-and-quality for the overnight campaigns.

5. **obra/superpowers** — *MIT, Jesse Vincent, legit.* A full design→plan→implement→test→review agent methodology + composable skills (TDD, systematic-debugging, brainstorming/planning, "skills that write skills"). Harvest the planning/debugging/code-review skill definitions into GSE's `.claude` skills and campaign prompts; keep destructive/auto-commit behaviors disabled.

6. **mattpocock/skills** — *MIT, Matt Pocock, legit.* Port the highest-value patterns: `diagnose` (reproduce→minimize→hypothesize→fix) and **`grill-with-docs`** (force plans to reconcile against `ARCHITECTURE.md`/ADRs before building) directly serve GSE's verify-not-assume / audit-before-build principles; `handoff` + `to-issues` fit multi-agent hand-offs; `git-guardrails` reinforces no-autonomous-destruction.

7. **phuryn/pm-skills** — *MIT, Paweł Huryn, legit.* Adapt the relevant SKILL.md content (don't install the whole marketplace): **pm-product-strategy** `pricing-strategy` + **pm-marketing-growth** `north-star-metric`/`growth-loops` to sharpen FREE/PRO/ELITE monetization; **pm-data-analytics** `cohort`/`ab-test` to structure engine-accuracy + conversion measurement; **pm-ai-shipping** `intended-vs-implemented` audit to strengthen the provenance/critic gates. GSE's trust-first + no-autonomous-money rules stay authoritative over generic GTM tactics.

8. **Leonxlnx/taste-skill** — *MIT, named author, anti-scam disclaimer, legit.* Fold the highest-value rules into GSE's frontend-design skill/tokens: the **DESIGN_VARIANCE / MOTION_INTENSITY / VISUAL_DENSITY** dial concept cleanly parameterizes surfaces (low-density trust pages vs higher-motion cinematic front door), and the GSAP motion skeletons can seed the courtroom/decision-autopsy animations. Keep GSE's brand guardrails (human copy, restraint) authoritative; if ever installed, pin a reviewed commit and vendor it.

> Items 3–8 are read-and-port — **no installer is run in the live repo**; the value is selectively porting proven patterns into GSE's existing mature gated-build workflow, not taking a third-party dependency.

---

## 3. FUTURE BACKLOG — relevant but later (each with its trigger)

**Code comprehension (pick ONE to trial; overlaps codegraph above):**
- **safishamsi/graphify** *(MIT, legit)* — tree-sitter knowledge graph + GRAPH_REPORT.md; map engine internals + hunt client/server boundary bugs. **Trigger:** local run on a throwaway checkout, AST/local-only, no proprietary logic to a hosted LLM.
- **Egonex-AI/Understand-Anything** *(MIT, legit)* — same idea, more onboarding-oriented: guided tours + **domain view** (code→business process: engine→signals→tiers→product) + diff impact. **Trigger:** verify the org == original authors; local-only; mind LLM egress.

**Design / brand discipline:**
- **VoltAgent/awesome-design-md** *(MIT; caution: inflated stars)* — adopt the **9-section DESIGN.md schema** to author a **first-party GSE DESIGN.md** at repo root so campaigns generate on-brand UI. **Trigger:** never copy a competitor palette verbatim (trade-dress/derivative risk); read via raw.githubusercontent.com.
- **nexu-io/open-design** *(Apache-2.0; caution: new viral desktop app)* — mine its ~150 DESIGN.md systems + design-skill prompts as reference for the shared kit. **Trigger:** don't install the desktop binary; founder-gated local-only if ever used.
- **alchaincyf/huashu-design** *(MIT, legit)* — study the "three real HTML directions + requirements intake + WebSearch-verify-first" methodology + deck→PPTX/PDF/MP4 export for investor/explainer decks + Galaxy Studios. **Trigger:** runs host commands; vendor only reviewed export scripts, sandboxed, no live keys.
- **op7418/guizang-ppt-skill** *(AGPL-3.0; caution: license)* — adopt the **methodology** (locked color themes, fixed type scale, 12-col grid + named spacing, theme-rhythm, an automated `validate-deck` gate). **Trigger:** reimplement under GSE tokens; do **not** copy AGPL HTML/JS into the proprietary repo without counsel sign-off.
- **diffusionstudio/lottie** *(MIT, legit)* — agent text-to-Lottie for branded micro-animations (loaders, signal pulses, cipher-shard/win-rate reveals). **Trigger:** defer until GSE invests in bespoke motion graphics; sandbox-generate, export reviewed JSON behind a clean client boundary.

**Research / RAG / ingestion (intelligence program):**
- **lfnovo/open-notebook** *(MIT, legit, lowest-risk of its cohort)* — self-hosted NotebookLM alternative: index nflverse docs, rule books, research packets, beat/transcript corpora; query via REST API; podcast lane = founder-gated Galaxy Studios. **Trigger:** strictly internal; provenance-review any surfaced output; evaluate vs the existing OSS stack first.
- **microsoft/markitdown** *(MIT, Microsoft, legit)* — build-time/ETL: normalize PDFs/decks/mixed research packets to clean Markdown before chunking/citation. **Trigger:** `convert_local()` on trusted files only, validate paths/URI schemes, keep server-side.
- **RyanCodrai/turbovec** *(MIT, legit)* — train-free vector index. **Trigger:** only if a concrete semantic-retrieval need is confirmed; benchmark vs incumbent pgvector on recall/latency/memory/ops first.

**Agent-workflow infrastructure & evals:**
- **rdi-berkeley/agents-last-exam** *(Apache-2.0, UC Berkeley RDI, legit)* — adapt `ale_run`'s sandbox + task-spec + deterministic-grading pattern to **GSE internal build-agent evals** (engine fix passes calibration; page passes SSR probe; build stays green; track pass-rate across MODEL_VERSION bumps). **Trigger:** could promote to implement-now if GSE formalizes an agent-eval suite.
- **NousResearch/hermes-agent** *(MIT, Nous Research, legit)* — mine the skill-generation + procedural-memory design to harden GSE's harness. **Trigger:** do **not** pipe-to-shell install or wire into the product; isolated container, no live keys, if ever trialed.
- **HKUDS/CLI-Anything** *(Apache-2.0, HKUDS, legit)* — adopt the harness convention: wrap recurring founder-gated ops (MODEL_VERSION bumps, migration-leads-code, provider probes, RUNBOOK bring-up) behind small deterministic `--json` CLIs with tests. **Trigger:** never use the auto-gen pipeline to touch prod / grant live execution.
- **chopratejas/headroom** *(Apache-2.0, legit)* — study MCP/proxy context-compression to cut token spend on long campaigns. **Trigger:** isolated sandbox, pin version, confirm lossless/CCR retrieval so nothing provenance-critical is dropped; never on a live-key path.
- **anthropics/defending-code-reference-harness** *(first-party Anthropic, archived, legit)* — adopt the skill decomposition (threat-model→vuln-scan→triage→patch) + execution-verified-findings to strengthen `/security-review` & `/code-review`. **Trigger:** do NOT run the C/C++ autonomous pipeline (wrong language); any execution-mode only inside gVisor.
- **esengine/DeepSeek-Reasonix** *(MIT; caution: shell-exec + DeepSeek egress)* — design study only: borrow **prefix-cache-stability** (byte-identical stable prefix across a session to cut token cost) + the explore/research/review/security-review subagent split. **Trigger:** never run against GSE repos.

**Data / research feeds & specialized ML:**
- **mvanhorn/last30days-skill** *(MIT, legit)* — study the multi-source fan-out + engagement-scoring + cited-synthesis as a template for a GSE "narrative/news scan" skill feeding the **gated** narrative-signal lane. **Trigger:** ToS-compliant sources only; route every item through source-triage + Tier-A/Tier-B citation before any engine/published use; never let engagement signal move the GSE Rating unverified.
- **modelscope/FunASR** *(MIT, Alibaba/ModelScope, legit)* — leading open ASR for the **Airwave Ledger** (diarization → attribute claims to pundits). **Trigger:** only AFTER the SiriusXM/Airwave live-capture **legal gate** clears.
- **roboflow/supervision** *(MIT, Roboflow, legit)* — park as a future "vision data lane" (player tracking/route charting/coverage features) emitting internal/gated Tier-B signal. **Trigger:** founder-gated; contingent on a proven predictive hypothesis **and** legal sign-off on video rights.
- **maziyarpanahi/openmed** *(Apache-2.0, legit)* — wrong domain; reference only for the on-device NER+PII-redaction pattern (if GSE ever stores free-text) and its reproducible-benchmark/model-card discipline as a template for documenting the Rating's accuracy.
- **rohitg00/ai-engineering-from-scratch** *(MIT, legit)* — upskilling reference for the engine/data program (calibration, evaluation, LLM/agent/MCP, observability phases). Cite/adapt concepts; do not vendor code.

**Browser automation / data acquisition:**
- **browser-use/browser-harness** *(MIT, reputable org, legit)* — verification/automation harness: drive real Chrome to click through `/intelligence`, `/players`, `/airwave` and confirm flows render (complements the SSR probe). **Trigger:** sandboxed, no prod keys / live-deploy / payment actions; pilot locally; not launch-critical.
- **h4ckf0r0day/obscura** *(Apache-2.0; caution: anonymous handle + "stealth" scraping)* — supporting acquisition tool only if a future founder-approved need APIs can't cover. **Trigger:** isolated sandbox, never prod creds/cookies, ToS-permitting sources only; use the canonical repo, not lookalike forks.

**Growth / distribution patterns:**
- **yikart/AiToEarn** *(MIT; caution: ToS-risky Engage pillar)* — study only the **Publish** architecture (one-source→many-platform adapter + scheduling + per-platform formatting) for a GSE "broadcast" pipeline pushing engine receipts/glass-box cards to socials. **Trigger:** do NOT adopt the Engage auto-like/comment bots or the Monetize merchant layer.
- **shawnla90/gtm-coding-agent** *(MIT; caution: low traction, anonymous author, Apify scrapers)* — read the Signals Dashboard + Nexus Intel chapters to inform a GSE-owned first-party growth/competitive-intel surface on the existing Next.js/Postgres stack. **Trigger:** reimplement borrowed ideas inside GSE's reviewed codebase; don't run its scraper/CRM code.

**Packaging reference:**
- **Yuan1z0825/nature-skills** *(MIT; caution: recruitment entanglement, bundled MCP server)* — packaging reference only: copy the SKILL.md-frontmatter + `manifest.yaml` (router) + `references/*.md` + `static/` convention to standardize GSE skill modes. **Trigger:** don't install the skills (wrong domain); ignore the recruitment content.

**Peripheral ops (shelf candidate):**
- **docusealco/docuseal** *(AGPLv3 +7(b); legit)* — self-hosted e-signature for the human-only legal sign-offs (Airwave/broadcaster/data-source agreements, NDAs). **Trigger:** only if that need arises; deploy unmodified self-host free tier; run AGPLv3 7(b) + Pro-tier-for-API/embedding past legal first; do not embed in the product UI.

---

## 4. SKIP / CAUTION — do NOT integrate (study-only or avoid, with reason)

**Safety-flagged — avoid:**
- **FoundZiGu/GuJumpgate** — **AVOID.** ToS-circumvention extension (disposable-email + automated PayPal Plus activation + SMS-verification bypass for OpenAI accounts). Exposes GSE to bans, payment-fraud, reputational harm. Only takeaway is the negative example.

**Inflated-metrics / pipe-to-shell / unaccountable-maintainer cluster — skip:**
- **ultraworkers/claw-code** — self-declares "no human intervention / no maintainer" (treat code as unaudited); ~193k stars on an obscure weeks-old repo (implausible). Claude Code + Agent SDK is the better, supported harness.
- **JuliusBrussee/caveman** — conflicts with the **"human copy not AI"** brand principle + adds correctness/compliance risk for modest token savings; `curl|bash` + auto-firing global hook on a credentialed box.
- **pewdiepie-archdaemon/odysseus** — anonymous impersonation-flavored handle; wires shell+files+web+email/calendar creds (high blast radius); ~66k stars on a 10-day-old repo; AGPL copyleft.
- **affaan-m/ECC** — README bakes in self-cited "211.9K+ stars" + "star this repo" (growth-hacking); 14 MCP servers + every-tool-use hooks = large unaudited surface; users report higher token use. *Read as a taxonomy catalog only; never run the full installer.*
- **MemPalace/mempalace** — overhyped/corrected benchmark (96.6% is raw-verbatim vs ~84.2% lossy); **repo carries an impostor-site/malware warning (fake clones exist).** Don't adopt on the benchmark; if ever piloted, verify the genuine source and benchmark on GSE's own tasks vs MEMORY.md + pgvector.

**ToS / injection / relay risk — study-only or skip:**
- **Panniantong/Agent-Reach** — cookie-scraping that violates Twitter/Reddit/XHS ToS (README tells users to use throwaway accounts); agent-exec pipe-to-shell install. Unsuitable for a trust-first product; study only the orchestration pattern.
- **CodexPlusPlus** — CDP script-injection + API relay/proxy + "unlock plugin features in API-Key mode" (paid-tier-bypass adjacency); license not visible. Personal tooling at most, never near GSE secrets.
- **EvoLinkAI/awesome-gpt-image-2-API-and-Prompts** — the CC0 **prompt corpus** is safe to read as reference data, but the README funnels keys/spend through an **unexplained third-party relay** (`api.evolink.ai`). Mine prompts; ignore the API funnel; never put a GSE key in the relay.

**Off-domain / wrong-stack / low-relevance — skip:**
- **MoneyPrinterTurbo** — legit despite the name, but autonomous video collides with accuracy/provenance + "no AI-voiced copy"; GSE has richer media-gen options. Study the pipeline at most; never publish output autonomously.
- **hugohe3/ppt-master** — ops-only deck generator; routes content through third-party API sponsors (PackyCode/APIKEY.FUN). Skip; never feed engine internals.
- **TapXWorld/ChinaTextbook** — unrelated; copyright/IP exposure (PRC MoE textbooks, no software license). Skip entirely.
- **refactoringhq/tolaria** — personal note app; AGPL copyleft — do NOT copy code into the proprietary engine.
- **apple/container** — trustworthy but Apple-silicon/macOS-only; irrelevant to the Windows + Vercel stack.
- **NoopApp/noop** — wrong domain (WHOOP wearables) + wrong stack (Swift/Kotlin); PolyForm Noncommercial. Skip.

---

*Read-only research; nothing was cloned, installed, or run. Machine-readable findings: `00-rnd-findings.jsonl` (one repo per line). Every recommendation above is additive and founder-gated; SKIP/CAUTION repos are study-only or avoid and must not be integrated.*
