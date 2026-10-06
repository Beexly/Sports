# GSE REPO INTELLIGENCE — Master Index

Built 2026-10-02 by 18 parallel workers via GitHub API (read-only). Trigger: Garrett's Instagram-reel order — execute the 4 GitHub power-tricks across 100+ GSE-relevant repos.

**Coverage:** 17 Beexly repos · 224 Sports branches · 73 external repos · 46 model repos = **360 units**.

## DELTA — 2026-10-02 13:25 CT (HEAD `62d3d7c40`, +6 commits since the build)

Hermes landed six commits in ~20 minutes. Wires closed since the 360-unit build:

- **Wire 9** (tau → DataContext): `intelligence/context/tau_wire.py` + stamp on csv/manifest/loader — "point fit — not pre-kickoff" everywhere.
- **Wire 5** (held-out checker): `intelligence/gates/heldout_check.py` + tests. Train/eval overlap now gated.
- **Wire 4** (manifest enforcer): `intelligence/gates/manifest_check.py`. The 2-byte stub problem is closed permanently.
- **Wire 6** (paired audit): `intelligence/audit/paired.py`.
- **Wire 12** (two-host ledger): `intelligence/host_ledger.json`.
- **Wire 16** (injury gate): `intelligence/providers/injury_gate.py` — DataGapError before Friday 18:00 ET.
- **Vintage freeze**: `intelligence/coaching/data/vintage-2026-10-02.json`.
- **Doctrines indexed**: `docs/DOCTRINES.md`. **Second wave documented**: `docs/research/2026-10-02/hermes-second-wave.md`.
- **Registry regenerated** (17:57Z): 46 `no` / 1 `partial` (was 47 null). Provenance honestly notes it is not a fresh line-by-line re-read.
- **Calibration rows** (`intelligence/gates/calibration_rows.json`) — the first honest rows: epa_facets *"Descriptive. No map fitted."* (Phase H answered: descriptive-only is valid, not a failure); tau_hat_served *"BLOCKED-ON-PRECISION"*; weather_prior *"labeled prior, no season fitted."*
- **Three real week-4 traces**: ne-at-buf, nyj-at-chi, pit-at-cle (`emit_three.py`); chain gaps no longer swallowed in `pipeline.py`.
- Tendency producer runnable + `REGEN-NOTE.md`; tilt vote narrowed.

**Scoreboard:** wires done 2 → 8 of 20. Owed: 12 (W1, W2, W3, W7, W10, W11×5 remaining, W13, W14, W15, W18).

**Weak-point impact:** #1 (leakage) partially addressed — held-out checker gates overlap, but the full LeakageGate + as-of fencing still owed; #6 (feed watchdog) has its static half via the manifest enforcer, scheduled loud-failure watchdog still owed. Calibration-on-wire has its first real rows — and "descriptive, no map fitted" counts as a row.

## The 4 tricks (verified URL patterns)

| # | Reel trick | What it does | Our equivalent | URL pattern |
|---|---|---|---|---|
| 1 | `codewiki.google/github.com/{owner}/{repo}` | AI wiki with diagrams + Gemini chat | AI wiki overview per repo (purpose, architecture, key files) written as markdown | `https://codewiki.google/github.com/{owner}/{repo}` |
| 2 | `star-history.com/#{owner}/{repo}` | Star growth chart | Current star count recorded + star-history URL per repo (flat is flat — reported honestly) | `https://star-history.com/#{owner}/{repo}` |
| 3 | `gitdiagram.com` (replace `hub` with `diagram`) | Interactive architecture diagram | Mermaid `graph TD` diagram per repo from its file tree (top 2–3 levels, ≤15 nodes) | `https://gitdiagram.com/{owner}/{repo}` |
| 4 | Press `.` on GitHub → github.dev | VS Code in browser | Compiled github.dev links per repo and per branch | `https://github.dev/{owner}/{repo}` · `https://github.dev/Beexly/Sports/tree/{branch}` |

Per-trick rollup: Trick 1 → 136 wiki dossiers (17 + 73 + 46). Trick 2 → star counts + URLs on all 136. Trick 3 → 17 Mermaid diagrams (per-repo files). Trick 4 → links in every file (17 repos + 224 branches + 119 external/model dossiers).

## §1 — The 17 Beexly repos

All in `per-repo/Beexly-{repo}.md`. Star counts: sixteen at **0**, one at **1** — flat across the board, reported honestly.

| Repo | ★ | What it is |
|---|---|---|
| [agent-bus](sandbox://workspace/gse-repo-intel/per-repo/Beexly-agent-bus.md) | 0 | Agent mail-queue bus (inbox/outbox per agent); no root README |
| [autonomous-revenue-engine](sandbox://workspace/gse-repo-intel/per-repo/Beexly-autonomous-revenue-engine.md) | 1 | 15 micro-apps; Kit/SignPreview/Recordly revenue machine |
| [awesome-ai-agents-2026](sandbox://workspace/gse-repo-intel/per-repo/Beexly-awesome-ai-agents-2026.md) | 0 | Curated awesome-list; "updated monthly" claim stale since April |
| [chick-goodies-kit](sandbox://workspace/gse-repo-intel/per-repo/Beexly-chick-goodies-kit.md) | 0 | 2-file Kit preview for Tomball client |
| [claude-code-best-practice](sandbox://workspace/gse-repo-intel/per-repo/Beexly-claude-code-best-practice.md) | 0 | Claude Code knowledge repo (fork-copy of upstream) |
| [Clouds-bruh](sandbox://workspace/gse-repo-intel/per-repo/Beexly-Clouds-bruh.md) | 0 | Lumera: Medusa v2 commerce monorepo (real, substantial) |
| [Doug.As-Builders](sandbox://workspace/gse-repo-intel/per-repo/Beexly-Doug.As-Builders.md) | 0 | Empty — exactly 1 README file |
| [espn-groupme-bot](sandbox://workspace/gse-repo-intel/per-repo/Beexly-espn-groupme-bot.md) | 0 | ESPN NFL scores → GroupMe bot (cron) |
| [Fablechain](sandbox://workspace/gse-repo-intel/per-repo/Beexly-Fablechain.md) | 0 | Autonomous-AI-blockchain concept (fork) |
| [gradio-GSN](sandbox://workspace/gse-repo-intel/per-repo/Beexly-gradio-GSN.md) | 0 | Gradio monorepo fork (43,652★ upstream) |
| [gse-competitive-intel](sandbox://workspace/gse-repo-intel/per-repo/Beexly-gse-competitive-intel.md) | 0 | 310 competitor dossiers, 1,676 evidence files, OSS catalogs |
| [GSN.Cards](sandbox://workspace/gse-repo-intel/per-repo/Beexly-GSN.Cards.md) | 0 | Card-identification engine (CLIP+FAISS, ONNX models) |
| [OmniRoute](sandbox://workspace/gse-repo-intel/per-repo/Beexly-OmniRoute.md) | 0 | AI-gateway router fork (72,305★ upstream) |
| [Project-Tree](sandbox://workspace/gse-repo-intel/per-repo/Beexly-Project-Tree.md) | 0 | CRC knowledge-integrity engine |
| [Sports](sandbox://workspace/gse-repo-intel/per-repo/Beexly-Sports.md) | 0 | GSE system of record (TypeScript, ~13.5k tree entries) |
| [SupaAgent](sandbox://workspace/gse-repo-intel/per-repo/Beexly-SupaAgent.md) | 0 | "Owlex" multi-model council deliberation via MCP |
| [UltimaScraper](sandbox://workspace/gse-repo-intel/per-repo/Beexly-UltimaScraper.md) | 0 | Media downloader (vendored upstream copy) |

## §2 — 224-branch Sports atlas

**[branch-atlas.md](sandbox://workspace/gse-repo-intel/branch-atlas.md)** — 224 entries, one per keyword-matched branch: latest commit (SHA, message, date), AI-inferred purpose, status hint, github.dev link. Zero 404s, zero rate limits.

Notable patterns the workers flagged: an August-9 calibration bake-off cluster (~12 stale experimental branches); 8 tip commits that are bare main-sync merges hiding real content; duplicate pairs (`watch-space-auth`/`watcher-space-auth`, `grok/calibration-ci` pair, `hermes/night-shift-1`/`hermes/p0-launch-fixes`); freshest lanes are signal-ledger and total-signal wiring (late Sept).

## §3 — External intelligence (73 dossiers)

In `external/<owner>-<repo>.md`, 6 sections each: Vision / The Ask / Constraints / **GSE lens** / ADOPT-REBUILD-IGNORE verdict / 4 trick links. Verdict tally (machine-readable entries): **8 ADOPT · 38 REBUILD · 10 IGNORE** (remainder use compound/inline verdicts — see files).

- **NFL/sports data (20):** nflverse ecosystem (nflfastR, nflverse-data, nflverse-pbp, nflreadpy, nflverse-rosters, ngs-data), draftfast, nflscrapR-models, DFSLineupOptimizer, draftkings_api_explorer, sportly, Public-NFL-API, fantasy-football-ai, nfl-predict, nfl-dbt, others.
- **Prediction/Elo/betting + DFS optimizers (20):** pydfs-lineup-optimizer, fivethirtyeight/nfl-elo-game, sports-betting-toolbox, sports-betting-customloss, dfs_optimizers, southpaw, NFL-DFS-Tools, coach, polymarket_gambot, model-aggregator, morelandjs/melo-legacy, RobustDFS, Sports-EV-Bot, others.
- **Fantasy tools + video (20):** fantasy-football-metrics-weekly-report, ClipShots, sleeper-api-wrapper, FantasyPlus, fantasy-football-mcp-public, ff, fantasy-football-projections, sleeper-sdk, nfl_mcp, NFL-Machine-Learning, evolve-dfs, NFLDrafter, offcut, Gridiron-IQ, others.
- **AI repo-understanding + sports APIs (20):** deepwiki-open, gitdiagram, gitingest, adrenaline, sage, RepoAgent, DeepV-Ki, reposcope, deepwiki-by-cc, cerebro-code-memory, yfpy, nflreadpy, sportsdataverse-py, pinnacle, espn-wiki, match_data, sportly.

## §4 — Model intelligence (46 dossiers)

In `models/<owner>-<repo>.md`, same 6-section format, GSE lens = "what does this teach us about creating, training, calibrating OUR engine?" Verdict tally: **14 ADOPT · 13 REBUILD · 6 IGNORE** (+1 compound; remainder inline).

- **Group A — model configs (5):** Mistral-7B (GQA, RoPE θ=10k, sliding window), Llama-3.1-8B (config gated — paper-sourced, flagged), Qwen2.5-7B (RoPE θ=1M, 128K), DeepSeek-R1-Distill-Qwen-7B (MIT; re-tuned θ 1M→10k for distillation), bge-m3 (MIT embeddings, CPU-first candidate).
- **Group B — training recipes (16):** DeepSeek-R1 paper, open-r1, TinyZero→veRL, OpenRLHF, trl, open-instruct, GenPRM, MATH-SHEPHERD, datatrove, NeMo DataDesigner, dolma, NeMo Curator, optuna, vizier, decontam.
- **Group C — calibration (16):** verified_calibration, probmetrics, MAPIE, crepes, ngboost, uncertainty-toolbox, classifier-calibration, conformal-prediction, EnCQR, idr-calibration, others.
- **Group D — inference backends (9):** vLLM, text-generation-inference (**archived** Mar 2026), llama.cpp (org moved to ggml-org), AutoGPTQ (**archived**), AutoAWQ (**archived**), DeepSpeed (org moved to deepspeedai), SpecForge, onnxruntime.

## §5 — GSE WEAK POINTS REVEALED

Synthesized from the GSE-lens sections of all 73 external dossiers. Ranked most painful first. This is the section Garrett asked for — everything above is the evidence behind it.

**1. No leakage/temporal-safety machinery — while walk-forward calibration is already running.** Solo repos (`cbratkovics/fantasy-football-ai`, `jackc625/nfl-predict`) ship `test_asof_no_leakage.py`, `as_of_datetime` fencing, and a `LeakageGate` keyword scan that hard-fails on season overlap. GSE has the honest instinct (the INVALID refusal) but no gate, no harness, no artifact. Every walk-forward number currently being produced is unverified-until-proven-leak-free. **Rebuild the leakage test before trusting any calibration result.**

**2. No evaluation harness and no pre-committed bar for "the engine works."** A 16-star solo repo ships strictly-lagged features, a real leakage test, a frozen test season + fully out-of-sample season, per-artifact JSON receipts with input hashes, data contracts, drift detection, and a weekly publish/hold/promote policy. GSE has a 47-signal registry with zero producers and no enforcement tooling. The gap isn't modeling talent — it's the harness. Claims vs. receipts.

**3. The DFS optimizer is a solver with no inputs and no tournament brain.** It falls back to a *sample slate*. The fix is smaller than assumed: DK/FD publish per-contest player-pool CSVs (a scheduled CSV puller + parser needs no API partnership), and keyless ESPN endpoints can feed the rest. But even with a feed, GSE has no GPP machinery — no lineup sims against fitted score distributions, no stacking primitives, no exposure caps, no site-ready uploaders. The optimizer exists; everything that makes an optimizer win tournaments doesn't.

**4. No consensus baseline — the 80/20 projection sits unbuilt.** Multiple repos converge on the same point: a weighted multi-source consensus with replacement-level baselines is buildable in days (`swfunc/Fantasy-Regression`, `SecuritahGuy/NFLDrafter`'s named source roles, `jjti/ff`'s dynamic value-over-replacement). GSE has zero wired producers and no baseline blend at all. Labeled consensus now, full wiring later — the pragmatic interim is unbuilt.

**5. The engine has no agent-usable surface.** Two MCP servers and two scriptable CLIs show the pattern: deterministic compute tools + conversational/agent access on top. GSE's engine is reachable only by agents reading code and DBs — no MCP server, no `gse` CLI, nothing cron-able. A solo dev's side project has a cleaner agent-integration story than GSE's engine. Build this before wiring more signals, or every new signal is only usable by whoever reads the schema.

**6. Zero enforcement tooling on feeds the engine is about to depend on.** No claim-matrix, no manifest checks, no feed watchdog — while the plan is to wire nflverse, Sleeper, and ESPN feeds. A 24-star one-person repo ships a scheduled data-source watchdog that fails loudly on upstream changes. Rebuild that pattern before the producers land, or the first silent endpoint drift poisons walk-forward calibration. (Related: built things silently rot — the tau table with no consumer went unnoticed by any system.)

**7. Props lane is shadow-only while an 11-star repo runs the full live +EV loop.** `Sports-EV-Bot` trains ensembles on 451 leakage-proof features, strips vig from live odds, and only surfaces plays where model and market agree — with backtest grading. GSE's props lane can't yet state an honest model probability, and *no* GSE lane has a model-vs-market edge detector or a staking layer (Kelly-with-guardrails is the responsible pattern). GSE stops at projections; the entire decision layer is unbuilt.

**8. No repo memory — the fleet pays the re-discovery tax every session.** Across two hosts and many agents, every session cold-reads the Sports repo. `cerebro-code-memory`'s three-layer design (tree-sitter structural map + PageRank, SQLite cached summaries, hash-based staleness) is the cheapest proven fix; agentic claim-verified wikis are the deeper one. Highest-ROI internal tooling build in the batch.

**9. License hygiene is one bad install from contamination.** `yfpy` (the obvious Yahoo fantasy wrapper an agent would reach for) is GPL-3.0 — linking it would copyleft GSE's commercial code. The fleet needs a standing license gate on every ADOPT decision.

**10. Video: no automated clip pipeline.** The standing video rule describes editorial standards, not a pipeline. Offline download→cut→export + shot-boundary detection + the nflverse play-by-play GSE already ingests = an automatable "game → timestamp list → candidate 3-second clips" front end that nobody has built. The manual clip workflow is the bottleneck the rule doesn't solve.

## §6 — MODEL PLAYBOOK FOR GSE

Ranked techniques, configs, and calibration methods to adopt for the prediction engine, most impactful first. Feeds the training mission and calibration-on-wire directly.

**1. verified_calibration as the per-signal-row metric standard (ADOPT).** ECE *with bootstrap confidence intervals* plus a Platt-binner recalibrator. Fixes calibration-on-wire's known weakness: a bare ECE at small n is noise. Rule: if the CI straddles zero on the 2025 eval slice, the signal is *unmeasured*, not calibrated — no adjustment ships. Refusal thresholds get set on the **lower bound** of the calibration CI, giving the honest-INVALID decision a statistical base.

**2. Automated contamination gate with a cleaned-output contract (REBUILD).** NeMo Curator's decontamination module + decontam's detect→report→*emit-cleaned-dataset* pattern, reimplemented with temporal identity keys (game_id, feature_window) instead of n-grams. No fit runs unless the gate passes and logs its leak report. Hardens "contaminated fits are discarded, never averaged" from a rule into a pipeline stage.

**3. probkit/probmetrics as the calibration-methods library (ADOPT).** Maintained, Apache-2.0: temperature/vector/matrix scaling, beta, spline, scaling-binning, Lp calibration-error estimators (no binning artifacts). Use its benchmark results to pick the method per signal by sample size — temperature/Platt for small-n, isotonic only for large-n. Stop guessing.

**4. ONNX Runtime as the production serving answer (ADOPT).** Train → export ONNX → numerical-parity check on the 2025 validation season → serve on cheap CPU. MIT, execution providers give a free GPU upgrade path later with no model change. Resolves the zero-a10g spend with nothing on the production path. The *served* artifact gets the calibration row, not just the trained one.

**5. crepes for classification + refusal machinery (ADOPT); steal for the t10-conformal track.** What the best open implementations do that t10 lacks: Mondrian (conditional) conformal per matchup class, conformal predictive systems (full CDFs), calibrated p-values as the refusal-threshold input, exchangeability martingales as an online drift alarm for the 2026 W1–4 live-check.

**6. R1's staged reasoning recipe for the reasoning layer (REBUILD).** SFT on format (explanations citing only wired signals) → DPO on *mined* preference pairs from history (traces attached to in-band vs out-of-band predictions — free labels) → RLVR with verifiable reward (did it land in the calibrated band on unseen weeks). Rule-based rewards, never a learned "reasoning quality" judge first; KL-control against the honest-refusal reference policy so RL can't train away the INVALID honesty.

**7. Optuna HPO with pruning + multi-objective targets (ADOPT).** All config search under Optuna: ASHA/MedianPruner kills unpromising trials early (early stopping as organizational policy, pre-registered kill rules on walk-forward validation), NSGA-II over (walk-forward log-loss, calibration error, season-to-season variance) — optimize the Pareto frontier instead of Goodharting one metric.

**8. ngboost as the probabilistic head for tabular signals (ADOPT).** Turns every point projection into a distribution for prop pricing; always wired *with* a calibration row (PIT-uniformity check on 2025, conformalize for published intervals). Never trust the parametric shape raw.

**9. uncertainty-toolbox as the regression metric standard (ADOPT).** `get_all_metrics()` (calibration error + sharpness + NLL + CRPS) for every regression signal's 2025 row; its isotonic recalibration is the candidate for NGBoost output distributions — gated by the IDR artifact check.

**10. Teacher-student distillation for model succession (REBUILD).** The expensive full-signal ensemble is the teacher; train a cheap deployable student on the teacher's outputs *and intermediate trajectories* (process supervision, per the R1 recipe) over historical seasons. The student gets its own calibration row — never inherits the teacher's.

**11. Draft-then-verify serving architecture (REBUILD).** Cheap screening model proposes candidate edges on every game; full calibrated engine verifies only candidates. Draft optimized for recall, verifier holds the calibration row. Speculative decoding's pattern rebuilt for tabular prediction — how the expensive tier stays affordable.

**12. Horizon dials as named, calibrated hyperparameters (REBUILD).** Qwen's RoPE θ=1M vs Mistral's 10k shows "effective history length" is a scalar the labs calibrate deliberately. Recency-decay half-lives, lookback windows, EWMA spans become config knobs with walk-forward calibration rows — never hardcoded, never vibes.

**13. Dolma-style corpus data sheets (REBUILD).** Every training vintage gets a versioned document: source mix with shares, named QC taggers with thresholds, dedup stats per source pair. Audit receipts for the corpus.

**14. MATH-SHEPHERD step-labeling + generative verification (REBUILD).** Derive process supervision from outcomes already on hand: sample completions from partial reasoning traces, score against walk-forward outcomes — steps that systematically precede well-calibrated predictions are the good steps. No hand-labeling. GenPRM-style generative verification ("which step fails and why") instead of scalar scores.

**15. Calibration-set-gated compression ladder (REBUILD).** Maintain an explicit fp32 → quantized/fast ladder where each rung ships only with a measured delta on the 2025 validation season, using behavior-measured importance (AWQ's salient-weight idea → permutation/SHAP importance on walk-forward validation). Never build on the archived repos — use ONNX Runtime's toolchain or other living implementations.

**Cross-cutting rulings:** recalibrate **per season**, never one global map (a cross-season map is exactly the contaminated-fit failure mode); MAPIE's exchangeability tests gate every 2026 live-check, conformal-PID controller is the drift fallback; every isotonic map must pass PIT-uniformity on the live-check slice or be discarded, never averaged. **Scrub references** to archived repos (text-generation-inference, AutoGPTQ, AutoAWQ) anywhere in GSE docs; fix org moves (`ggerganov/llama.cpp`→`ggml-org/llama.cpp`, `microsoft/DeepSpeed`→`deepspeedai/DeepSpeed`).

## Caveats (honest)

- Mid-run scope redirect: the 12-repo star-history benchmark was replaced by the 73-dossier external intelligence track (the old file was never written — nothing lost).
- All 17 Beexly repos sit at 0–1 stars; star-history links are included anyway (flat is flat).
- Branch purposes are inferred from branch name + latest commit message only; 8 tip commits are bare main-sync merges hiding real content; a few entries are marked "purpose unclear" rather than invented.
- Llama-3.1-8B's config.json is access-gated (403); that dossier's architecture values are paper-sourced and flagged as such.
- 4 external dossiers overlapped between two workers (same repos discovered independently); kept, not clobbered — 73 unique files.
- READMEs: agent-bus has no root README; several repos are thin (Doug.As-Builders = 1 file). Module roles in per-repo files are filename-derived where contents weren't read — each file says so.
- No live browser was used: the 4 trick links are compiled URL patterns, not visited pages. codewiki.google / gitdiagram.com / star-history.com rendering was not verified per repo.
- No 429 rate limits were hit by any worker; all GitHub access was read-only GETs.
