# GSE — CONSOLIDATED MASTER PLAN & RECON SYNTHESIS
**Date:** 2026-10-27 18:30 CT
**Author:** Hermes (execution synthesis)
**Sources:** `GSE_BUNDLE_2026-10-27.md` (136 KB), `GSE Continuous Learning Architecture Plan.docx` (4.5 MB), `GAP-REPORT-2026-10-27.md`, `MASSIVE-RECON-2026-10-27.md` (159 KB), plus prior repo audit (`C:/Users/Garrett/Sports`).

---

## 1. THE ROOT RESOLUTION: TWO MACHINES, TWO REPOS

The single most important finding: **The "missing" files are not missing. They live on a different machine.**

| Environment | Path | Repo/Commit | Seal | Status |
|---|---|---|---|---|
| **Windows workstation** (this session) | `C:/Users/Garrett/Sports` | `Beexly/Sports` @ `c75d2707c` (branch `engine/public-baseline-2026-10-24`) | Merkle `23245bcbba04…` (tau 0.42) | Live, clean, `HEAD == origin` |
| **Linux sandbox** (OpenMinis/iPhone) | `/var/minis/workspace` + `/root/beexly-sports` | `Beexly/Sports` @ `db4b1899` | Seal `faab28271513678c` | Sandbox-only; workspace wipes repeatedly |

**The plan document was authored against the sandbox.** Its "Added" files (`emit-mind-feed-record.ts`, `delta_telemetry.py`, etc.) exist at `/opt/intel/`, `/opt/model/`, and `/root/beexly-sports` — not on the Windows desktop. That is why every filesystem check on `C:/Users/Garrett/Sports` came back empty. The sealed hash `85b5cd33…` appears in the architecture plan as a "canonical verification fixture" hash; it does not exist in the Windows repo's candidate files. The real Windows seal is `23245bcb…`.

**What this means:** The engineering code on Windows and the market-research code on Linux are two halves of the same engine. Neither has seen the other's work. The architecture plan bridges them. This document is the bridge.

---

## 2. THE THREE-ZONE EPISTEMIC FIREWALL (Core Architecture)

The `GSE Continuous Learning Architecture Plan.docx` defines the governing invariant system. Every action below must conform to it.

### Zone 1 — Class A: Pre-Seal Authoring & Tuesday 04:00 CT Vault
All parametric learning, empirical Bayes skill shrinkage (arXiv:1807.09236), and inverse-MDP fourth-down risk recovery (arXiv:2309.00756) happen **strictly before** Tuesday 04:00 CT. Locked outputs:
- Team ratings
- 5×5 role interchangeability cost matrix
- `SealedEpaDropoffTable` (including `QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF = 0.0947`)
- 64-char SHA-256 `coachMindsetHash`
- tau = 0.42

**Invariant:** Once sealed, Zone 1 is immutable for the week. No mid-week re-estimation. No exceptions.

### Zone 2 — Compile-Time AST Firewall & Mid-Week Sinkhorn Overlay
Enforces `apps/web/lib/fences/no-book-in-coach-engine-fence.ts` (`assertNoBookInCoachEngine`) to **block any Class A import of sportsbook odds or public splits.** Signs the 288-bit `Uint32Array(9)` context bitmask and state Merkle root into an Ed25519/SHA-256 `CoachProjectionReceipt`.

Verified in prior audit (Item 3 PASS):
- `applyInjuryOverlay` executes `sinkhornTargetAllocation(targets)` without passing sealed ratings or the hash into the kernel
- Asserts `assertTauSealed` at line 244
- Re-derives and compares `coachMindsetHash` at lines 249–255
- All 10 post-seal readers are either provably pure (6) or re-derive and assert the hash (4)

### Zone 3 — Class B: Step N Late-Binding Residual Diagnostics
Observes external sportsbook pricing kernels, de-vigged implied probabilities, Action Network money splits, and SEC Form 4 filings **strictly after** the 10,000-run Monte Carlo simulator locks output. Surfaces only:
- Conformal residual flags (arXiv:1604.04173, arXiv:2610.26987)
- Lineup deltas
- **Zero write-back paths into Zone 1 or Zone 2.**

---

## 3. WHAT IS ACTUALLY DONE vs. WHAT THE PLAN CLAIMS

### Verified DONE on Windows (prior audit + this session)
| Item | Evidence |
|---|---|
| Coach brain / cadence modules exist | `src/gse-pre-seal/conformal-diagnostic.ts`, `src/reasoning/gse-coach-brain-llm.ts` — both tracked |
| Test suite | **11 files / 102 tests passed, 0 failures** (not "72/72"; that count is stale) |
| Cadence seal guard | `locked-projection.ts:244` throws on tau mutation; 6 tests prove it |
| Cron registration | 8 cadence crons registered and enabled in `~/AppData/Local/hermes/cron/jobs.json` |
| 7 of 9 invariants pass | PROB_PER_POINT single declaration; lockTuesdayCoachBaseline single call site; no wall-clock in hash payload; Sinkhorn convergence disclosed |
| Push landed | `HEAD == origin == c75d2707c` |

### Verified DONE on Linux sandbox (bundle)
| Item | Evidence |
|---|---|
| `delta_telemetry.py` | Append-only claim log on `127.0.0.1:4312`, seal-gated, dual-write with fsync |
| `init.sh` | Startup contract: verify seal → newest delta → per-line hash check → OK/WARN |
| rathole v0.5.0 | Installed at `/usr/local/bin/rathole`, client/server TOMLs written |
| Seal verification | `python3 /opt/model/sealed_engine.py verify` → `seal intact: faab28271513678c` (exit 0) |

### NOT DONE / STILL BROKEN
| Item | Reality |
|---|---|
| **`artifacts/telemetry-schema-2026-10-27.md`** | Does not exist on either machine. The plan's "ready-to-write" artifact is still in the document, not on disk. |
| **`artifacts/rag-telemetry-wiring-2026-10-27.md`** | Same — document only. |
| **`packages/prediction-engine/src/feeds/`** | Directory does not exist in the Windows repo. The plan's `emit-mind-feed-record.ts` is sandbox-side. |
| **`raganything/omml_extractor.py`** | Does not exist in Windows repo. Sandbox/spec only. |
| **`scripts/feeds/delta_telemetry.py`** | Does not exist in Windows repo. Sandbox-only (`/opt/intel/delta_telemetry.py`). |
| **Seal chain in candidates/** | `candidates/` is untracked (`??`). Week 8 candidate is a copy of week 7. `parent_seal_hash` is fabricated sequential hex (`faab2827c4e9b8a1…`). |
| **Tau contradiction** | `sealed-center.json` says 0.42; candidate JSONs say 0.001. Unresolved. |
| **ENABLED=false enumeration** | Plan claims "five modules"; actual count is **584 files** with `ENABLED = false`. The five named modules are a subset. |
| **`ticket: null` invariant** | Plan claims 19 real assignments across the codebase. Needs verification per-file. |
| **Citation sweep** | 307 of 319 citations unverified. |
| **Christian Kirk duplicate state** | Confirmed at lines 160 and 1159 of `generate-week7-master-slate-2026-10-25.ts`. |

---

## 4. THE MARKET / ENGINE RESEARCH LAYER (from the bundle)

This is the most valuable content in the bundle. It is not engineering — it is **market intelligence** measured from live books.

### Headline numbers (all from the bundle)
| Metric | Value |
|---|---|
| QB_QUESTIONABLE EV-weighted EPA | 0.095 (0.116 conditional); 0.048 was half the effect |
| Sigma (volatility) | BetMGM 12.07 / Pinnacle 12.21 / DK 13.16 vs true 13.36 |
| Spread rake | Pinnacle 3.60 → BetMGM 6.42 |
| Rake gradient | +2pp off the main line, every book with a ladder |
| Coach effect | 3.6 pts mean, 15.9 max (22 instances, team-fixed design) |
| Play action EPA | +0.0978 (biggest scheme effect) |
| RPO EPA | −0.0657 (modern default is negative) |
| Six engines readable | Pinnacle, DK, BetMGM, FanDuel, Caesars, BetRivers |

### Key findings with operational impact
1. **BetMGM's vig is favorite-loaded.** Spread hold 6.42% vs Pinnacle 3.60% — a 2.8× tax. That is a measurable edge against the public.
2. **`trueOdds` is not devigged on either book that exposes it.** The field exists but is not a de-vigged price. Do not trust it.
3. **BetRivers runs on Kambi** (`eu.offering-api.kambicdn.com`), no auth. Worst moneyline on the board at 5.74%.
4. **Public splits are server-rendered.** Action Network free tier gives Bets% per game page; money% is Pro-gated. 812 records found in `__NEXT_DATA__` of `/nfl/public-betting` — tickets AND money with counts.
5. **Sharp money correction:** The ticket-only read was wrong. Money is on CLE (+8), MIN (+14), CIN (+18) — against PIT, DET, TEN. Only CHI +3.5 has model and money agreeing.
6. **Coach effect beats QB effect.** A head coach is worth more than a starting QB (7.5 pts). Mean +0.046 EPA/play = 3.6 points; max +0.202 = 15.9 points. 13/22 positive — selection, not magic.
7. **HHI of targets scales the dropoff table.** DET 0.202 most dependent → NE 0.098 most spread. Scale in effective-count space (`N_eff = 1/HHI`), never in HHI space. `m = sqrt(N_league/N_team)` clamped [0.55,1.60]. DET 1.08× vs NO 0.81× — 34% spread.
8. **Sinkhorn stabilization recipe:** λ=0.6, τ=1e6, marginal stop 1e-9. Log-domain stabilization per Schmitzer 1610.06519. ε-scaling λ∈[0.5,0.75] holding β fixed across ε.
9. **Big Data Bowl 2027:** 6,310 drill attempts, 510 rookies, 2.2 GiB, deadline 6 Jan 2027. Public work exists (`mrtechtraveller/nfl-big-data-bowl-2027`).
10. **Scorigami alternatives:** Skellam, bivariate Poisson with shared λ₃, Dixon-Coles, empirical scorigami table. `dbauman18/Scorigami` has a teaching notebook + NFLGames.csv.

### The four asks (answered)
| Ask | Answer |
|---|---|
| **HHI scaling** | Effective-count space; `m = sqrt(N_league/N_team)` clamped [0.55,1.60]. Alternatives: Simpson (same math), Shannon entropy (better for predictability), Gini. |
| **Sinkhorn** | λ=0.6, τ=1e6, marginal stop 1e-9; ε-scaling λ∈[0.5,0.75]. Annealed momentum (2609.33814) and FlashSinkhorn 2 (2610.02395) are drop-in candidates. |
| **BDB 2027** | Public derived tables exist; Combine tracking → NFL performance, 510 rookies. Deadline 6 Jan 2027. |
| **Baumann** | Better alternatives for the same object: Skellam, bivariate Poisson, Dixon-Coles. |

---

## 5. THE GAP REPORT: WHAT IS BEING UNDER-LEVERAGED

The `GAP-REPORT-2026-10-27.md` is not about engineering. It is about **assets already on file that are not being used.** The biggest items:

| Asset | State | Why it matters |
|---|---|---|
| **tau_hat** | +6.77 points held-out (n=3,988), no consumer wired | Largest measured edge in the engine record, unused |
| **Laya eval** | Designed and armed, thresholds frozen, never run | Blocker reclassified as Motif-reachable Oct 16; run still unexecuted |
| **298 of 654 historical IG DM shares** | Unclassified behind rate-limit wall | Re-pull kit preserved |
| **49 repos** | Notated, never evaluated at content level | Potential tools/mechanisms |
| **6 researched revenue machines** | Never run once | Zero revenue |
| **Etsy queue** | 10 paste-ready listings behind one sign-in | $0 earned |
| **Amazon Associates** | Live tag and 22 live links since Oct 19 | Resources page not live (draft awaiting approval) |
| **Kaggle** | Credential verified; CLI install still owed | Two queued runs blocked |
| **The Odds API** | 20,000 credits/month | No utilization accounting for current month |
| **Feed ads as data** | 10 of 50 round-2 feed items were ads | Never read as a record of how platforms profile you |

### Process misses identified in the gap report
1. **The 429 was treated as a full stop for 3 hours.** It only blocked the connector route. The browser route was live and closed the whole deferred set in 7 minutes.
2. **No cross-surface counting** until this pass — the strongest signal class (same tool on IG, X, GitHub) was computed by nobody.
3. **No diff against the existing corpus** until this pass — re-discoveries and new finds looked identical.
4. **"GitHub recon" meant other people's repos** until this pass added your own starred list.

---

## 6. THE MASSIVE RECON: WHAT THE OUTSIDE WORLD IS BUILDING

The `MASSIVE-RECON-2026-10-27.md` is 1,241 lines covering Instagram Round 2, X, and GitHub. The valuable part for GSE is the **GitHub trending and comparative repos** (40 entries across 13 categories).

### Highest-signal tools for GSE's build areas
| Tool | Repo | Why it matters |
|---|---|---|
| **FastMCP** | `PrefectHQ/fastmcp` | Python MCP server framework; fleet coordination layer is an MCP bus — each tool integration becomes a function definition |
| **Twenty** | `twentyhq/twenty` | Open-source CRM (Salesforce alternative); flat cost curve vs per-seat SaaS |
| **listmonk** | `knadh/listmonk` | Self-hosted newsletter manager (single Go binary); email cost collapses to provider pricing |
| **TradingAgents** | `TauricResearch/TradingAgents` | Multi-agent trading framework; mechanism bears on multi-book panel |
| **Graphify** | `Graphify-Labs/graphify` | Graph-based retrieval; potential for RAG layer |
| **vLLM / SGLang** | `vllm-project/vllm`, `sgl-project/sglang` | Inference serving; cost/latency for local models |
| **Crawl4AI / Scrapling** | `unclecode/crawl4ai`, `D4Vinci/Scrapling` | Scraping infrastructure; PFR/PFF access problems |
| **LiteLLM / RouteLLM** | `BerriAI/litellm`, `lm-sys/RouteLLM` | Model routing; cost control across providers |

### Convergence findings (9 surfaces counted)
- **76 items named on 2+ independent surfaces.** Top: Claude Code (7 surfaces, 74 mentions), MCP (6, 79), Anthropic (6, 45), OpenAI (6, 37), n8n (5, 25).
- **REA** is the only item that is at once an Instagram dossier subject, a feed name, and a trending developer's repo.
- **CINDY** from round-1 IG feed = `makecindy/cindy` in GitHub trending.
- **11 same-thing-two-names pairs** recorded (GeoSpy = Raven, RAG-Anything merged into LightRAG, OpenDevin → OpenHands).
- **7 same-name-different-thing collisions** (Hermes ×3, Jev ×2, Orca ×2).

### Surfaces never swept
Hugging Face trending (models/Spaces/datasets), Instagram Saved/Liked posts, your own IG following list, X own posts/replies as corpus, X DMs, Reddit, HN, Product Hunt, Kaggle competitions, arXiv daily listings, Discord/Telegram, Substack.

---

## 7. DIRECTIONAL ALIGNMENT REVIEW

### Where all sources agree
1. **The seal must not move mid-week.** Zone 1 is immutable; injury overlays are pure functions; `coachMindsetHash` re-derives and asserts. Code, tests, and all documents agree.
2. **Class A must not import book odds.** The AST firewall exists and is tested. Zone 3 observes only after the simulator locks.
3. **NFL sides are not the product.** The master plan measured 49.83% ATS over 895 held-out games and closed that hunt. The bundle's market research confirms the edge is in *calibration and props*, not sides.
4. **The push is done.** `HEAD == origin`. The "push blocked" claim was corrected by the blockers doc itself.
5. **Two blockers are real and outside agent reach:** Google Docs API 403 (Docs API disabled in project 868513040414) and the QB estimator re-run (missing 2024/2025 injury CSVs + `/opt/model/fit_qb_questionable2.py`).

### Where they diverge — and who is right
| Divergence | Who's right | Why |
|---|---|---|
| "Modules missing" vs "complete" | **Neither.** Modules exist at different paths than the auditor searched. | `git ls-files` confirms both tracked. |
| "0 tests" vs "72/72" | **Completion docs, directionally.** 102 tests pass. The auditor's "0" is wrong; the docs' "72" is stale. | Direct vitest run. |
| "Seal chain valid" vs "seal chain broken" | **Auditor.** The parent seal hash is fabricated sequential hex and `candidates/` isn't in git. | `candidates/*.json` + `git status`. |
| "Cron not registered" vs "6 crons registered" | **Completion docs.** 8 cadence crons are ON. But neither side noticed duplicate/orphan drift. | `cron/jobs.json`. |
| tau = 0.42 vs tau = 0.001 | **Unresolved — but 0.42 is the one with a matching merkle.** `sealed-center.json` is the only file where tau and merkle are stated together and the merkle matches the doc. | Contents of both files. |
| "Five ENABLED=false modules" vs reality | **Reality.** 584 files have `ENABLED = false`. The five named are a subset. | `grep -rn "ENABLED = false"` count. |

### The alignment verdict
The project has **three tracks that have never been integrated:**
1. **Engineering** (Windows repo) — code is solid, 102 tests pass, but the seal layer is placeholder data and untracked.
2. **Market research** (Linux sandbox) — real measured edges (sigma, rake, coach effect), but no consumer in the Windows engine.
3. **Social/audience recon** (Instagram/X/GitHub) — massive inventory, but 264 items not in the package register, and 49 repos not evaluated.

**They are moving in the same direction** — toward a calibration-first, props-focused engine with a sealed coach baseline — **but they are not connected.** The engineering track needs the market track's measured parameters (sigma, rake, coach effect, HHI scaling). The market track needs the engineering track's seal infrastructure to condition its claims. The social track needs both to know what tools to adopt.

---

## 8. THE PLAN: SEVEN STEPS, ORDERED

### Step 1 — Resolve the tau contradiction (blocks all seal claims)
Decide which value is authoritative. `sealed-center.json` says 0.42 with merkle `23245bcb…`; candidates say 0.001. Check `recoverTau` against the actual week-7 4th-down decisions. **Accept when:** one tau value is authoritative and both files agree, or the candidate files are regenerated from the seal center.

### Step 2 — Regenerate the candidate artifacts from real ratings
Current candidates have 26 teams at `rating: -0.0, n: 1` and a placeholder parent hash. Re-run the pipeline that produced `sealed-center.json` and write real ratings, a real `parent_seal_hash`, and the correct `candidate_id`/`week`. **Accept when:** week-8 candidate has a real week, a `candidate_id` matching its filename, ratings that are not all zero, and a parent hash that equals a real prior merkle.

### Step 3 — Commit the seal layer
`candidates/`, `sinkhorn.ts`, `sinkhorn.test.ts`, and the modified `locked-projection.ts` / `sinkhorn-targets.ts`. **Accept when:** `git status --porcelain candidates/ src/coach-sim/` is clean and the files are on `origin`.

### Step 4 — Write the two telemetry artifacts to disk
`artifacts/telemetry-schema-2026-10-27.md` and `artifacts/rag-telemetry-wiring-2026-10-27.md` are in the plan document but not on disk. Write them. **Accept when:** both files exist at `C:/Users/Garrett/Sports/artifacts/` with the schema contract and wiring spec intact.

### Step 5 — Bridge the market research into the engine
The bundle's measured parameters (sigma 12.07/12.21/13.16, rake 3.60→6.42, coach effect 3.6 pts mean, HHI scaling) have no consumer in the Windows engine. Add a consumer module that reads these as Zone 3 diagnostic inputs. **Accept when:** a new module (e.g., `src/market-intelligence/`) ingests the bundle's numbers and exposes them to the conformal diagnostic layer without write-back into Zone 1.

### Step 6 — Correct the record and reconcile cron drift
Fix the "72/72" table to the actual 102 (and 9/9 for locked-projection). Name the real module paths in the audit doc. Mark the scheme-layer report as unverified until `cffa75a` is located. Reconcile the duplicate Sunday v4.0 crons and orphan `v2.5-thu-1630`. **Accept when:** the progress audit's numbers match a fresh vitest run and `cron/jobs.json` maps 1:1 to `CADENCE`.

### Step 7 — Close or park the two real blockers
Google Doc append needs the Docs API enabled in project 868513040414 or a manual append. The QB estimator needs the 2024/2025 injury CSVs and `/opt/model/fit_qb_questionable2.py`. The 0.0947 constant stands but is unconfirmed. **Accept when:** each has either a resolution or a named owner and date.

---

## 9. WHAT NOT TO DO

- **Do not call anything "sealed" until Steps 1–3 land.** The current seal evidence is placeholder data in an untracked directory.
- **Do not re-litigate the auditor's "missing modules" claim.** It was a path error. The modules are tracked and tested.
- **Do not treat `GSE — THE LAST PLAN.txt` as a GSE document.** It is a Charcuterie Chick plan; remove it from the GSE bundle.
- **Do not push the candidate regeneration without a founder call.** Re-running the seal pipeline changes a sealed artifact.
- **Do not delete `candidates/` as "stale."** It is untracked; git cannot recover it. Preserve first, then regenerate.
- **Do not merge the Linux sandbox's `faab2827…` seal with the Windows `23245bcb…` merkle.** They are different environments; do not conflate them in one hash.

---

## 10. ENVIRONMENT MAP (for continuity)

| Asset | Location | Access |
|---|---|---|
| Sports repo | `C:/Users/Garrett/Sports` | Windows, git, clean |
| Sports repo (sandbox) | `/root/beexly-sports` @ `db4b1899` | Linux, sandbox-only |
| Engine model | `/opt/model` | Linux sandbox |
| Delta telemetry | `/opt/intel/delta_telemetry.py` | Linux sandbox |
| rathole binary | `/usr/local/bin/rathole` v0.5.0 aarch64-musl | Linux sandbox |
| Hermes state | `C:/Users/Garrett/AppData/Local/hermes/state.db` | Windows |
| Antigravity CLI | `C:/Users/Garrett/.gemini/antigravity-cli/` | Windows |
| Plan documents | `C:/Users/Garrett/Downloads/` + `C:/Users/Garrett/.hermes/plans/` | Windows |

---

*End of consolidated master plan. Next action: Step 1 — resolve the tau contradiction.*
