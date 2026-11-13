# GSE Workspace Document Digest — agy-review-A
**Date:** 2026-11-13 (Week 10 launch night) · **Scope:** `C:/Users/Garrett/OneDrive/Documents/Galaxy Sports Edge`
**Method:** read-only. 31 documents read in full; ~940 remaining files inventoried/skimmed by title. No source modified; no git writes. Secret-pattern scan (AKIA/sk-/xox/PEM/ghp/password) over md/json/ps1/csv/txt: **0 matches**. Zip internals not scanned.

## Critical context before anything else
1. **This workspace is a docs/control folder, NOT the app.** Every June/July doc agrees: the shipping clone is `C:\Users\Garrett\Sports` (remote `github.com/BeeXly/Sports`, Vercel project `sports-web`). Local `.git` here is broken (objects/ only, no HEAD) — git commands here resolve to an unrelated parent repo. Do not trust git state from this folder.
2. **No Week-10 material exists anywhere in this workspace.** Grep for "week 10 / week10 / 2026-11-13 / 2026_11_13" = zero hits. The only November files are the four Week-9 DK CSVs (2026-11-08). Tonight's full-board sim / gated publication / deploy plan lives elsewhere (likely the Sports repo or the parent session's context).
3. **Docs are 4 months stale (June 9–10 and July 17).** Two internal contradictions must be resolved against the LIVE site/repo, not these docs (see below).
4. **Contradiction A — Proof surface deploy state:** ACTIVATION_COCKPIT + LEVERAGE_SCAN (Jul 17 AM) say `/llms.txt`, `/api/proof/*`, `/news-sitemap.xml` are 404 in prod, existing only on branch `claude/glass-ledger-edge-engine`. HANDOFF_TO_CODING_AGENT (Jul 17 09:50, later) says PR **#120 merged to main**, prod SHA `c179a781`, Vercel deploy READY, `/llms.txt` returns 200. The handoff supersedes per its own doctrine ("current main + live PR state outrank stale handoffs") — but **verify live before tonight's deploy**.
5. **Contradiction B — AWS Activate:** activation-log session 7 says "SUBMITTED by founder ('aws done')"; AWS_LEVERAGE_MAP (09:34) and HANDOFF (09:50) both say the Activate **credits application is NOT submitted** (enrollment ≠ credits application). Founder must confirm actual status.
6. **Standing doctrine (repeated across all docs):** no auto-publish of picks without human review; `PUBLISH_LEDGER`, `SEALED_ENGINE_ENABLED`, `BACKTEST_HARNESS_ENABLED`, `WATCHLIST_ALERTS_ENABLED`, `LINE_ARCHIVE_*` all default OFF; win-rate claims only after the four-leg guard (≥3 settled + 90-day window + profit factor ≥1.0 + Wilson 95% CI lower bound >52.4%); engine changes founder-gated via `MODEL_VERSION`; trials registry + purged walk-forward + FDR before admitting signals; "real data or honest-unavailable"; promotions shell-only until legal approval.

---

## A. Top-level strategy docs (9)

**ACTIVATION_COCKPIT.md** (Jul 17) — Master activation checklist; "the missing layer is distribution + trust, not more engine."
- 12-step activation: budget cap → AWS Activate → Bedrock flip → domain/SEO → ledger publish → MCP distribution → content engine → Turnstile → R2 line archive → PostHog → branch deploy → Azure/Google credits.
- Claims moat = cryptographically verifiable publish-before-kickoff record (SHA-256 hash-chained receipts, Merkle roots); competitors' ROI claims unverifiable.
- Open: steps 3–11 mostly founder-click or build-session; step 12 branch deploy flagged as #1 blocker (stale — see Contradiction A).
- Week 10 relevance: the gated-pick publication doctrine (step 5 four-leg guard) governs tonight's pick publication; verify ledger state before any public claim.

**activation-log.md** (Jul 17) — Execution log of cockpit steps with verified evidence.
- Done: AWS budget `gse-monthly-hard-cap-50` ($50 hard cap, verified); Vercel AI Gateway active (Aug 31, 2026); Turnstile widget created (site key public, secret stored in Vercel env); R2 bucket `gse-line-archive` created; PostHog project created (US cloud).
- Blocked/pending: Azure Founders Hub (portal loop), SES production access (sandbox), Search Console (needs DNS TXT), AWS Activate status disputed (Contradiction B).
- Contains Cloudflare account ID + Turnstile site key (public identifiers, not secrets) — keep out of public surfaces.
- Open: Turnstile/R2/PostHog created but NOT wired into the app (steps 8–10).
- Week 10 relevance: cost guardrail armed before any Bedrock/inference spend; unwired analytics means tonight's launch may have no funnel telemetry.

**AWS_LEVERAGE_MAP.md** (Jul 17) — Read-only AWS billing/credits recon.
- $160 free-tier credits active (expire 2026-07-03); payment method on file; "upgrade off Free Tier" theory disproven.
- Activate credits up to $100K–$200K, Bedrock-eligible, separate founder-only application; `provider-dispatch.ts` already routes Claude→Bedrock→Vertex→Anthropic via env flip (`CLAUDE_PROVIDER`).
- Budget hard-cap verified armed; root MFA/IAM hygiene unverified (no CLI).
- Open: apply Activate → confirm Bedrock model access (Model catalog, us-east-1) → flip env.
- Week 10 relevance: inference cost lane for any AI content generation during launch; sequencing matters before scaling spend.

**GOOGLE_AZURE_LEVERAGE_MAP.md** (Jul 17) — Companion cloud-credit recon.
- Azure: subscription active $0, Foundry project GSN has **ZERO model deployments** (blocks Claude Code on Foundry); Founders Hub sponsorship never landed.
- Google: 2 billing accounts, $0 spend, $300 trial never claimed, Google for Startups never applied (up to $200K–$350K AI tier); Vertex lane code-ready.
- Open (founder-only): deploy Claude in Foundry + run `Setup-ClaudeCode-Foundry.ps1`; apply Google for Startups; retry Founders Hub InPrivate; optional Azure budget alert.
- Week 10 relevance: low direct relevance tonight; credit lanes are runway, not launch blockers.

**FRONTIER_RD_2026-07-17.md** (Jul 17) — Autonomous R&D pass; agent-auditable record.
- Shipped: `galaxy-proof-mcp` — 7-tool MCP server; flagship `audit_record_trustlessly` recomputes receipt hashes + Merkle root locally (tsc clean, smoke test passed). Proves integrity, NOT profitability.
- Network tools return honest "not deployed" until Proof API ships (state per Contradiction A).
- Runway: AEO pack (JSON-LD + llms.txt), /verify page, weather features, body-clock features, draft-only content automation — engine items founder-gated.
- Open: deploy branch/preview; founder decision on publishing MCP to npm/registries.
- Week 10 relevance: the trust/verification story is the launch differentiator; MCP can audit tonight's published receipts if the surface is live.

**FRONTIER_UNTAPPED_ATLAS.md** (Jul 17) — Ranked untapped-leverage atlas beyond credits.
- Tier 0 shipped: `gse-ots-anchor` — OpenTimestamps → Bitcoin block-header attestation of Merkle roots (10/10 tests, byte-identical to reference impl). Needs live calendar smoke test + 3-step wiring.
- Tier 1–5: Sigstore Rekor co-publication, TLSNotary odds proofs, Nitro enclave attestation, zkML (parked), C2PA; hosted remote MCP, x402/Stripe agentic payments, "Ask the Record" ledger-locked RAG, ClaimReview markup; Cloudflare deep stack, free GH Actions (public repo), Vercel Edge Config flags, Upstash QStash, Neon branching; nightly Sentinel self-audit; Higgsfield/Swagger/Nimble MCPs idle; nflverse + Kalshi/Polymarket data lanes through rights gate.
- Recommended order: wire OTS → hosted proof-MCP → Rekor → Ask-the-Record → GH-Actions backtest grid → enclave spike.
- Week 10 relevance: OTS anchoring of tonight's commitments is the strongest on-thesis trust upgrade if wired; everything else is post-launch.

**HANDOFF_TO_CODING_AGENT.md** (Jul 17, latest top-level doc) — Verified state handoff; supersedes cockpit on deploy state.
- PR #120 (Glass Ledger + Edge Engine) merged; prod SHA `c179a781`; Vercel deploy READY; `/llms.txt` 200. Rollback candidate available.
- All gated capabilities ship dark (default OFF). Live surfaces: /llms.txt, /api/proof/{ledger,receipts,openapi.json,verification-spec.json}, /news-sitemap.xml, /watchlist (503-honest until migration), /tools, /sealed, /how-we-make-money.
- Open branches NOT deployed: #119 red-team docs, frontier-agent-foundry, frontier-model-router-shadow, frontier-superset-rebased, codex/sunday-frontier-maxforce (conformal uncertainty), #122 CLV/Pedersen (migration founder-gated), #121 fantasy (naming gate), #52 dynasty.
- OWNER_GATEs: AWS Activate, Google for Startups, Foundry model deploy, any prod DB migration, Founders Hub retry.
- Week 10 relevance: **the authoritative baseline for tonight's deploy** — confirm current main vs this SHA, and which gated flags (if any) get flipped for launch.

**LEVERAGE_SCAN.md** (Jul 17) — Cross-repo unshipped-work scan.
- Headline: finished work stranded on branches, not unfinished work. `C:\Users\Garrett\Sports` on `codex/sunday-frontier-maxforce-2026-07-05` **171 commits ahead of main** (newest engine truth); activation branch `claude/glass-ledger-edge-engine` carries Proof/credit layer.
- Recommendation: confirm whether activation branch sits on top of frontier work or diverges → reconcile → one merge to main → one deploy.
- Safety: Sports-canonical (1000+ uncommitted) and Clouds-bruh (424 uncommitted) need `git status` check before any reset.
- Blind spot: ~11 sibling GSE folders not scanned (Sports-dfs-optimizer-edge, GSE-launch, gse-b1, etc.).
- Week 10 relevance: **directly governs tonight's production deploy** — branch reconciliation must be settled before merging/deploying; the DFS optimizer likely lives in one of the unscanned siblings.

**gse-weather-edge-INTEGRATION_SPEC.md** (Jul 17) — Integration contract for the weather module.
- Load-bearing check: Open-Meteo historical-forecast API may stitch shortest-lead forecasts → leakage. Must select model run issued ≤ asOfUtc; reject features with issue time > asOf; honest `available:false` otherwise; never fall back to observed weather.
- Stadium registry (lat/lon/isIndoor incl. closed retractable roofs) + UTC kickoff/freeze times required; cache key includes asOf bucket; refresh near freeze, never overwrite as-of value.
- Signals (`passingSuppressionIndex`, `kickingDifficultyIndex`) are hypotheses → trials registry, purged walk-forward, FDR across weather family; scoring only via founder-gated MODEL_VERSION bump. Open-Meteo attribution required.
- Week 10 relevance: if tonight's full-board sim includes weather features, the strict as-of gate is mandatory; otherwise keep accumulating silently — do NOT admit to scoring at launch.

## B. Command-center docs (June 9–10; stale state, durable gates)

**docs/command-center/00-master-operating-plan.md** — Operating system for the June launch audit.
- Safety rules: no deploys/prod-DB mutations/live affiliate links/pricing changes/public methodology/fake data/fake readiness. Founder approval: deploy, pricing, public claims, go/no-go. Legal approval: promotions, contests, responsible-gambling copy.
- Testing gates: typecheck/lint/build/tests, route probes, screenshots, mobile, a11y, perf, data canaries, method-leakage scan, mock/demo leakage, live-link scan, auth gates.
- Week 10 relevance: reusable go/no-go gate list for tonight.

**docs/command-center/04-current-state-truth-report.md** — RED/YELLOW/GREEN/GRAY state taxonomy (June 9).
- RED: stale roster data class (Najee Harris/Rico Dowdle canaries), app verification impossible from this workspace. Research volume high vs app verification ("overbuilt docs, underbuilt proof").
- Week 10 relevance: roster-truth canary discipline applies to any player-facing surface tonight.

**docs/command-center/NEXT_ACTIONS.md** — June 9 "Do not launch" recommendation.
- Required: authoritative clone, DB/auth fixes, route fixes (/, /board, /api/health, /api/board/state, /api/promotions), full test suite green, route/screenshot probes, roster claims proven or removed, promotions shell-only.
- Week 10 relevance: stale as state (July handoff shows prod live) but the checklist pattern is the launch template.

**docs/command-center/launch/12-launch-blocker-triage.md** — Blocker table (June 9): clone missing, roster canaries, no screenshots, no test/build proof, promotions legal gate, method leakage unknown, analytics/support unverified. Verdict: NO-GO from this workspace.
- Week 10 relevance: each blocker class maps to a pre-deploy check tonight; most were presumably closed in the real repo by July — verify, don't assume.

**docs/command-center/launch/13-launch-readiness-scorecard.md** — Source-verified score **49/100 RED** (June 9).
- Real app located: `C:\Users\Garrett\Sports`, branch `safety/sports-wip-2026-06-04`. typecheck/lint/build pass; 3 test failures; prod-probe fail; homepage/board 500 from local Prisma auth failure; roster GRAY; Stripe checkout unverified.
- Week 10 relevance: historical baseline only; shows which gates were red before the July merge.

**docs/command-center/25-final-report.md** — Final June audit report + real-app addendum.
- 32/100 docs-only score; addendum: RED not launchable (homepage 500, board 500, health 503, promotions 500, 3 test failures, prod-probe fail, DB auth invalid). 20 departments, 26 worker manuals, 90 build cards, 125 opportunities generated.
- Human approvals needed: deploy, prod DB, pricing, legal copy, affiliate, contests, methodology language.
- Week 10 relevance: approval matrix still governs launch actions.

**docs/command-center/verification-log.md** — Actual commands/results from June 9 real-app run.
- PASS: typecheck, lint, brand-safety (727 tests), cockpit (224), trust guard, Claude API guard. FAIL: full test (3), prod-probe, snapshot regen. Build passed but emitted Prisma auth errors.
- 3 failures: 2 guardrail tests (pass when run directly — test-harness issue), 1 missing file header in intelligence-control-plane.ts.
- Roster canary refresh: Rico Dowdle → Steelers official evidence; Najee Harris → not on Chargers active roster, treat FREE_AGENT/NEEDS_REVIEW.
- Week 10 relevance: evidence-standard template ("evidence beats assertion"); canary names need a November refresh.

**docs/command-center/handoff/claude-launch-verification-checklist.md** — One-line checklist: typecheck, lint, tests, build, route probes, screenshots, mobile, a11y, perf, roster canaries, method leakage, mock/demo leakage, affiliate link scan, auth/entitlement gates, checkout if approved.
- Week 10 relevance: copy-paste pre-deploy checklist for tonight.

**docs/command-center/build-queue/REAL_APP_NEXT_ACTIONS.md** — June 9 do-first/do-not list.
- Do: confirm authoritative clone, fix DB auth/fail-closed, rerun tests/build/probe/screenshots, decide Player Lab/Rating/roster launch scope. Don't: deploy, live affiliate, live contests, claim roster intelligence live, expose method weights.
- Week 10 relevance: scope-discipline reminder; "don't expose private method weights/constants" applies to any public sim output tonight.

**docs/command-center/03-duplicate-contradiction-map.md** — Classification rules (DUPLICATE/EXTENSION/VARIANT/DEPENDENCY/REPLACEMENT/CONFLICT).
- "Any claim that the product is launch-ready conflicts with current workspace evidence" (June). Promotions/contests/affiliate/pricing/method need approval.
- Week 10 relevance: governance rule — launch-readiness claims require evidence from the shipping clone.

**_logs/STATE_2026-06-04_2110.md** — Brutally honest June 4 state snapshot.
- This directory has no app source, no usable git (parent repo resolves, local .git has no HEAD), no schema/env/tests. Nothing provable end-to-end from here. Only runtime evidence: two Next.js 16.2.6 local-start logs (May 28).
- Week 10 relevance: explains why this workspace can never be the deploy source; audit must run in `C:\Users\Garrett\Sports`.

## C. Research final reports (June 9)

**docs/research/contest-format-lab/06-final-report.md** — Contest format strategy.
- Recommend free-to-play/sponsor-funded best-ball ("EdgeBall Lab") first; paid huge-prize GPP only after legal/state/age/tax/payments review. Friend History Engine (consent-based) as novel mechanic. Never: paid real-money contest, cash leaderboards, outcome promises.
- Week 10 relevance: DFS lineups tonight are personal DK entries, NOT a GSE contest — keep any contest surface shell-only.

**docs/research/edgeball-contest-os/10-final-report.md** — EdgeBall Contest OS spec summary (40 cards).
- Fake-data/no-prize MVP; legal blockers enumerated (DFS classification, state eligibility, age gates, tax/prize, responsible play); 20 analytics events defined; founder+legal approval for any real-data/prize/public beta.
- Week 10 relevance: confirms no contest launch tonight; event taxonomy reusable for DFS workflow telemetry later.

**docs/research/nfl-roster-truth/18-final-report.md** — Roster truth system design (68 cards).
- Failure is a system class, not one player: canonical facts + SourceEvidence + ConfidenceScore + ConflictRecord + stale detection + transaction reconciliation. "Unknown beats wrong."
- June findings: Rico Dowdle on Steelers (official); Najee Harris free agent after Chargers stint/Achilles — no guessed teams. Official sources Tier 1, nflverse Tier 2, media fallback after legal review.
- Open: source TOS approvals, adapters, validation CLI (roster:audit/verify/diff/conflicts/stale), CI gate — all in the real repo.
- Week 10 relevance: **any Week-10 player data used in sims/DFS must pass current roster truth**; June canary findings are themselves 5 months stale.

**docs/research/site-war-room/21-final-report.md** — Site experience strategy (96 cards).
- 10-second comprehension per route; dark premium command-center design; IA: Home/Rating/Player Lab/Track Record/Pricing/Brief/Support/Account; promotions compliance-gated; CWV + WCAG 2.2 gates; no method leakage, no tout aesthetics.
- Week 10 relevance: if launch includes public pages (e.g., /proof, /verify), these UX/trust gates apply.

**docs/research/growth-os-v2/23-final-report.md** — Non-duplicative growth queue (100 builds; 180 prior rows indexed).
- Subscriptions = trust anchor; affiliate additive only with compliance; no-bet/risk as product value; human-copy auditor (banned phrases/fake certainty); promotions compliance data model + geo/age + kill switch before any live link.
- Never build: live affiliate carousel, casino comparison, cash contests, public AI betting assistant.
- Week 10 relevance: monetization/compliance boundary for launch messaging; no affiliate links go live tonight without legal approval.

## D. GSN R&D packet (June 10)

**docs/gsn-rd/GSN_EXECUTIVE_BRIEF.md** — Executive strategy: trust/timing/decision discipline; "every recommendation has a receipt."
- Build first: Source Quality Ledger, Trust Receipts, No-Bet taxonomy, human review queue, confidence decay, rumor quarantine, demo-labeled Market Radar, podcast packets, DESIGN.md, Market Integrity Flight Recorder (top IP candidate).
- Never: paywall bypass, shadow libraries, temp SMS, fake evidence, unconsented enrichment, third-party voice cloning, unlicensed data, **auto-publishing picks**.
- Week 10 relevance: tonight's gated pick publication must respect the human-review/no-auto-publish rule.

**research/gsn/GSN_R_AND_D_MASTER.md** — Master R&D report (604 lines): tool audit + architecture + 30/60/90 plan.
- Five-layer architecture: source intake → evidence normalization → intelligence engine → human review cockpit → publication surfaces. Publication gate: required source classes, freshness unexpired, conflicts resolved/disclosed, no prohibited sources, human approval, responsible-gaming language, AI disclosure.
- Data model: Source/EvidenceItem/Signal with observed_at/captured_at/fresh_until/raw_snapshot_hash/confidence/conflict/review fields.
- Hard exclusions + evidence-image immutability policy; voice only owner-consented + disclosed.
- **30/60/90 plan from 2026-06-10 → 90-day window ended ~2026-09-08.** No completion evidence in this workspace — treat as potentially unmet obligation; verify what actually shipped in the real repo.
- Week 10 relevance: the publication-gate spec is the reference contract for tonight's gated publication.

**research/gsn/GSN_FEATURE_BACKLOG.md** — 10 feature specs with acceptance criteria.
- Trust Receipts (no receipt → no publish), Source Quality Meter, Market Radar (demo-labeled until licensed data), Confidence Decay Clock (stale cannot publish), No-Bet Academy, Episode Packet (no audio before transcript approval), Human Review Queue (no auto-publication), Rumor Quarantine, DESIGN.md, Decision Discipline Layer (responsible-gaming friction).
- Week 10 relevance: acceptance criteria are testable gates for any launch surface touching recommendations.

**tickets/gsn/GSN_IMPLEMENTATION_TICKETS.md** — 16 tickets P0-001…P2-016 with file paths, deps, acceptance, test plans.
- P0: source ledger schema, publish gate + review states, No-Bet taxonomy, trust receipt drawer. P1: decay clock, quarantine, Market Radar prototype, note grader, DESIGN.md, podcast packet, voice consent. P2: autopsy, archive snapshots, security checklist, signal search, Flight Recorder.
- All paths conceptual (`apps/web/lib/gsn/*`) pending source-tree confirmation in `C:\Users\Garrett\Sports`.
- Week 10 relevance: check which P0 tickets actually shipped before claiming trust features live at launch.

**research/gsn/GSN_OSINT_AND_SOURCE_QUALITY.md** — Lawful OSINT + source-quality framework.
- 13 source classes; 8-dimension scoring; freshness bands (live/fresh/aging/stale/expired); rumor quarantine workflow; conflict types → downgrade to Wait/No Bet when material+unresolved; citation fields; confidence rubric 0–5; "model output is a source class, not truth."
- Week 10 relevance: injury/news handling for Week-10 sims must follow freshness/conflict rules; expired signals cannot support publication.

**reports/codex/oss-leverage-stack-security-advisories.json** — Advisory counts for 8 OSS candidates (open-webui 77, anythingllm 19, hoppscotch 13, twenty 5, listmonk 5, penpot 4, chatwoot 3, cap 0).
- Week 10 relevance: only if any of these enter the launch stack — none are core.

## E. Week-9 DK upload CSVs (2026-11-08) — DFS workflow evidence
Files (workspace root): `Dad_Top20_DK_Upload_FullSlate_Week9_2026_11_08.csv`, `Dad_Top20_DK_Upload_MainSlate_Week9_2026_11_08.csv`, `Garrett_20_Archetypes_250k_StressTested_DK_Upload_Week9_2026_11_08.csv`, `Garrett_Personal_And_Hybrids_DK_Upload_Week9_2026_11_08.csv`.
- Format: DraftKings classic bulk-upload — header `QB,RB,RB,WR,WR,WR,TE,FLEX,DST`, no salary column; every cell carries a DK player ID `(nnnnn)` suffix (100% of 657 filled cells).
- Structure: Dad FullSlate 20 lineups / 56 unique players; Dad MainSlate 20 / 55; Garrett Archetypes 20 / **34 unique** (heavy core overlap — archetype-driven construction, filename claims 250k-sim stress testing); Garrett Personal+Hybrids 13 / 26.
- Workflow inferred: optimizer produces lineup pools → stress-test via large simulation (250k) → select top-20 per slate/person → export DK-ready CSVs for two people (Garrett + Dad), main vs full slate split. The optimizer itself is NOT in this workspace (likely `Sports-dfs-optimizer-edge` sibling per LEVERAGE_SCAN).
- **Week 10 obligation: no equivalent Week-10 CSVs exist here.** If tonight's launch includes DFS entries, the Week-10 generation/export step must run (and the 250k stress-test claim should be reproducible, not just a filename).

## F. Build artifacts (zips, listed not source-read)
- `galaxy-proof-mcp.zip` — 10 files: src/index.ts, dist, smoke.mjs, README, package.json. Matches FRONTIER_RD claims.
- `gse-ots-anchor.zip` — 10 files: src, dist (+d.ts), test.mjs, README. Matches atlas claims (10/10 tests asserted in docs).
- `gse-weather-edge.zip` — 12 files: src, dist, test.mjs, README, INTEGRATION_SPEC.md (same as top-level spec).
- All dated Jul 17; none wired into the app per docs. Zip internals not secret-scanned.

---

## TOP 10 ACTIONABLE ITEMS (ranked by Week-10 launch relevance)
1. **Verify live production state before deploying tonight.** Docs disagree (cockpit: Proof 404 vs handoff: PR #120 live at `c179a781`). Probe galaxysportsedge.com `/llms.txt`, `/api/proof/ledger`, `/news-sitemap.xml` and compare current main SHA in `C:\Users\Garrett\Sports` — 4-month-old docs are not launch evidence.
2. **Settle the canonical-branch question before any merge/deploy.** `codex/sunday-frontier-maxforce-2026-07-05` was 171 ahead of main; activation branch carried Proof layer. Confirm reconciliation happened (LEVERAGE_SCAN's load-bearing recommendation); safety-check the 1000+/424 uncommitted trees before any reset.
3. **Generate Week-10 DK upload CSVs.** Zero Week-10 artifacts exist. Replicate the Week-9 pipeline (Dad Top20 main+full, Garrett archetypes stress-tested + personal/hybrids), with DK IDs in every cell; locate the optimizer in the sibling repos.
4. **Enforce the publication gate for tonight's picks.** Human review required; no auto-publish; PUBLISH_LEDGER and friends default OFF; four-leg guard (≥3 settled, 90-day window, PF ≥1.0, Wilson lower bound >52.4%) before ANY win-rate claim. Check how many receipts are actually settled — the MCP doc describes an honest empty/unpublished ledger.
5. **Refresh roster/truth canaries for Week 10.** June findings (Dowdle→Steelers, Harris→FA) are 5 months stale; run current official-source checks on every player used in sims/DFS. Stale team data is the designated RED trust-killer; "unknown beats wrong."
6. **Keep full-board sim leak-safe.** As-of features only; weather features must pass the strict Open-Meteo model-run ≤ asOfUtc check or stay `available:false`; no weather/body-clock signal enters scoring without trials-registry admission + founder-gated MODEL_VERSION bump.
7. **Resolve the AWS Activate contradiction** (log: submitted; maps/handoff: not submitted) and confirm Bedrock model access before flipping `CLAUDE_PROVIDER=bedrock`. Budget cap `gse-monthly-hard-cap-50` is armed — keep it.
8. **Wire gse-ots-anchor if launch includes public commitments** (built, 10/10 tests) — but run the live calendar smoke test first; then decide MCP public listing. Bitcoin-anchored "published before kickoff" is the launch trust story.
9. **Run the pre-deploy gate checklist** (claude-launch-verification-checklist.md): typecheck/lint/tests/build, route probes, screenshots, mobile/a11y, method-leakage + mock/demo-leakage scans, auth/entitlement gates; promotions remain shell-only; no live affiliate links without legal approval.
10. **Close or explicitly defer the standing OWNER_GATEs:** Google for Startups application, Foundry model deployment + Setup-ClaudeCode-Foundry.ps1, Founders Hub retry, SES production access, Search Console sitemap submission, Turnstile/R2/PostHog wiring (created but unwired), #122 CLV/Pedersen migration (founder-gated). Also audit the GSN 30/60/90 plan (window ended ~Sep 8) for unmet promises.

## Documents that exist but were not read (with reasons)
- **~940 files under docs/command-center/** (90 build cards ×2 queues, 20 department packets, 26 training manuals, discovery/consolidation/evidence JSONL+CSV): inventoried by title; content is generated June-9 factory output summarized by the final reports read above. Not individually read (volume; low marginal launch value).
- **docs/research phase files** (contest-format-lab 01–05, edgeball 01–09, nfl-roster-truth 01–17, site-war-room 01–20, growth-os-v2 01–22, help-design-ux, oss-leverage, etc.): skimmed by title; final reports read instead.
- **research/gsn/GSN_PODCAST_SYSTEM.md, GSN_TOOL_MATRIX.csv**: skipped — fully summarized inside GSN_R_AND_D_MASTER.md (read).
- **reports/codex/*.json** (oss-next-wave-github-metadata 20KB, oss-leverage-stack-repo-trees 150KB, oss-leverage-stack-github-metadata 15KB): repo-metadata dumps for OSS leverage candidates; not launch-relevant; only the security-advisories file read.
- **Setup-ClaudeCode-Foundry.ps1**: not read — executable setup script that handles API keys; behavior already documented in HANDOFF §2 and GOOGLE_AZURE_LEVERAGE_MAP. Read it before running, not before launching.
- **Zip source code** (galaxy-proof-mcp, gse-ots-anchor, gse-weather-edge): contents listed only; docs claim tests pass but code not independently reviewed here.
- **specs/gsn/ and apps/web/**: exist but contain ZERO files (empty directory skeletons) — nothing to read.
- **Sibling repos** (C:\Users\Garrett\Sports, Sports-dfs-optimizer-edge, GSE-launch, etc.): outside the assigned workspace root; not touched. The live app/repo audit must happen there.