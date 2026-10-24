# Pickle — GSE repo-intel slice (per-repo notes + GSE-REPO-INTELLIGENCE.md)

**Scope read:** `repo-intel/per-repo/*.md` (17 files) + `GSE-REPO-INTELLIGENCE.md` (156 lines), from `G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26`.
**Read-only.** Nothing on `G:` or any Sports checkout was modified.
**Filter applied:** only (a) data a repo owns, (b) a license wall, (c) a signal not in the 47-signal registry. Everything else dropped. No counts invented; where the source itself is self-contradictory, both numbers are shown.

---

## ⚠️ One blocker that gates bucket (c)

**The 47-signal registry file is not in this dump.** `intelligence/signals/registry.json` does not exist anywhere under `GSE. 10.2.26` (searched recursively; only prose mentions of "47-signal registry" exist, in the brief and the master index). Consequence: **every "signal not in the registry" item below is QUEUED for verification against the real registry**, not confirmed absent. I cannot close bucket (c) from this slice alone.

---

## A. LICENSE WALLS — QUEUED

### A1. `Beexly/Sports` itself is **PolyForm Noncommercial 1.0.0** — QUEUED
`repo-intel/per-repo/Beexly-Sports.md:11` — "**Not open source** — publicly viewable only, PolyForm Noncommercial License 1.0.0."
Wiring impact: the system of record is noncommercial-licensed while the product line carries subscription paywalls (same line). Noncommercial terms vs. a paid product is the single highest-leverage license fact in the slice — it governs whether *any* Sports code can be reused outside GSE, and it cuts the other way on the usual assumption that GSE owns its own code freely. Flag for owner decision; do not resolve from notes.

### A2. `yfpy` is **GPL-3.0** — QUEUED
`GSE-REPO-INTELLIGENCE.md:107` (weak point 9) — "`yfpy` (the obvious Yahoo fantasy wrapper an agent would reach for) is GPL-3.0 — linking it would copyleft GSE's commercial code. The fleet needs a standing license gate on every ADOPT decision."
Wiring impact: hard wall. Yahoo fantasy data cannot be reached through `yfpy` by linking. Per the brief's INGEST-AND-LEAN rule this is learn-and-reimplement, not adopt — but the brief is not repeated here.

### A3. Three inference backends are **archived** — QUEUED, do not build
`GSE-REPO-INTELLIGENCE.md:85` (model Group D) — "text-generation-inference (**archived** Mar 2026)", "AutoGPTQ (**archived**)", "AutoAWQ (**archived**)".
`GSE-REPO-INTELLIGENCE.md:145` — "**Scrub references** to archived repos (text-generation-inference, AutoGPTQ, AutoAWQ) anywhere in GSE docs; fix org moves (`ggerganov/llama.cpp`→`ggml-org/llama.cpp`, `microsoft/DeepSpeed`→`deepspeedai/DeepSpeed`)."
Wiring impact: these are dead wiring targets. The org moves are hard-wrong URLs today. Treat as a documentation defect to fix, not an adopt list.

### A4. Permissive licenses — green light, still QUEUED
`GSE-REPO-INTELLIGENCE.md:119` — "probkit/probmetrics … Maintained, **Apache-2.0**" (named the calibration-methods library, ADOPT).
`GSE-REPO-INTELLIGENCE.md:121` — "**ONNX Runtime** … **MIT**" (named the production serving answer, ADOPT).
`GSE-REPO-INTELLIGENCE.md:82` — Group A model configs: "DeepSeek-R1-Distill-Qwen-7B (**MIT**)", "bge-m3 (**MIT** embeddings, CPU-first candidate)". Llama-3.1-8B's config is "**access-gated** — paper-sourced, flagged".
Wiring impact: the calibration-methods library and the serving runtime are both copyleft-free, so they can be adopted without the A1 license problem. bge-m3 is the only CPU-first embedding candidate with a clean license on the list.

### A5. `germondai/trawl` — license **not stated**, anti-bot fetcher — QUEUED
`repo-intel/per-repo/Beexly-GSN.Cards.md:18` — "`trawl/` — git submodule → `germondai/trawl` — self-hosted scraping engine with anti-bot bypass (Cloudflare, Akamai, Imperva, CAPTCHAs); 4-tier escalation: plain HTTP → cached session → fresh browser solve → residential proxy. Live at :8191 API / :8192 proxy."
`repo-intel/per-repo/Beexly-GSN.Cards.md:71` — "**`trawl` submodule contents were not inspected** (external repo `germondai/trawl`)."
Wiring impact: this is the only general-purpose fetch-with-escalation asset named in the slice, and the engine has keyless-source feeds planned (B5). The note states **no license** for it. Cannot be wired until the license is read. Anti-bot bypass against Cloudflare/Akamai/Imperva also carries provider-ToS exposure that the notes do not address — flag, don't decide.

### A6. `GSN.Cards` itself — license **not stated** — QUEUED
`repo-intel/per-repo/Beexly-GSN.Cards.md` is marked "Public, NOT a fork (original repo)" but the note carries **no LICENSE field**. Its only reusable-for-sports asset would be the ONNX model binaries (B6) and those inherit the repo's unstated terms.

### A7. `gradio-GSN` — fork of `gradio-app/gradio`, license **not stated in the note** — QUEUED (low)
`repo-intel/per-repo/Beexly-gradio-GSN.md:5,12` — public fork, 4,007-entry tree matching upstream layout, "no Beexly-specific modifications were identified at the tree level"; the note states the fork's purpose in the GSN stack is **not documented** and that "GSN" = Galaxy Sports Network is **inferred, not stated**. Upstream license is not recorded in the note, so this cannot be cleared from the slice.

---

## B. DATA A REPO OWNS — QUEUED

### B1. `Beexly/Sports` `data/` — the engine's own frozen inputs — QUEUED
`repo-intel/per-repo/Beexly-Sports.md:18` — "`data/` — `gse-dataset` (**nflverse contracts/rosters/snap-count JSONLs + ingest manifest**), `reasoning` (parts registry for stored reasoning traces), `backtest`, `beex-picks`, `nova`, `source-atlas`, `statking`".
Wiring impact: the nflverse contracts/rosters/snap-count JSONLs and their ingest manifest are the raw material behind the frozen-vintage pipeline; snap-count is the counting-stat feed and is the natural join key for snap-based rate features. `parts-registry.jsonl` is what the reasoning layer currently reads (see B2). `beex-picks` is the historical picks store the model-ranking path compares against.

### B2. Reasoning layer currently runs **off stored parts, with four lanes DARK** — QUEUED
`repo-intel/per-repo/Beexly-Sports.md:32` — "the reasoning layer currently runs `readParts` → `aggregateSignals` over stored parts in `data/reasoning/parts-registry.jsonl`; **officials/weather/narrative/coaching lanes are DARK**."
Wiring impact: the aggregate step consumes a **file of stored parts**, not live providers. Any new signal must be written into the parts registry before `aggregateSignals` can see it — that is the actual insertion point, and it is a JSONL append contract, not a provider call. Weather and coaching are known-dark and already named provider domains elsewhere; **officials** and **narrative** are named here but appear in neither the provider list nor any calibration row in the slice → see C1.

### B3. No `intelligence/` tree on `main` — the two-host/branch reality is load-bearing — QUEUED
`repo-intel/per-repo/Beexly-Sports.md:32` — "**no `intelligence/` top-level directory was observed on `main`** — intelligence work lives on feature branches."
Wiring impact: direct tension with every `intelligence/...` path cited in the standing brief and in the master index DELTA. Any wiring instruction written against `intelligence/` must name a **branch**, not `main`. Note: the note is a tree-level observation dated 2026-10-02, not a merge audit — confirm before relying on it.

### B4. `gse-competitive-intel` owns **runnable NFL engines + precomputed feature CSVs** — QUEUED
`repo-intel/per-repo/Beexly-gse-competitive-intel.md:16` — "`gse-competitive-intel/fantasyguru/` + `fantasypros/` — runnable NFL engines (`nfl_engine.py`, **`nfl_scheme_defense.py`**, `gse_engine.py`), **precomputed NFL feature CSVs**, SMASH/BURR/Solds methodology; `codex-work/` — curated secret-free Codex EV code (`prediction-engine-reference/kelly.ts`, `poisson.ts`, `scoring.ts`, `evidence-readiness-matrix.ts`)".

Count discrepancy, unresolved, do not pick a number: repo **description** says "**1,670** raw evidence files" (`Beexly-gse-competitive-intel.md:4`); the **body** says "**1,676** raw evidence files in `raw/`" (`:14`); the master index table repeats 1,676 (`GSE-REPO-INTELLIGENCE.md:55`). Both numbers are in the source; the note gives no reconciliation.

Wiring impact: two named, unbuilt-feeder sources — a **scheme-defense** engine (`nfl_scheme_defense.py`) and precomputed feature CSVs — sitting outside the system of record. `kelly.ts` + `evidence-readiness-matrix.ts` are the staking/evidence primitives the engine has no lane for (C4). **Hard boundary from the note** (`:18`): "**product code lives in `Beexly/Sports` — this repo is intel only**." These are reference/claims until promoted.
Verification limit (`Beexly-gse-competitive-intel.md:61`): "tree + README only; dossier JSON contents and engine code not opened."

### B5. `espn-groupme-bot` owns **working ESPN NFL + fantasy pulls** — QUEUED, highest-value verified lane
`repo-intel/per-repo/Beexly-espn-groupme-bot.md` (all 11 files at root, `index.js`, last pushed 2026-09-01, built from best practices in the `dtcarls/fantasy_football_chat_bot` reference implementation, `:5`):
- **`:12`** — "NFL scoreboard (live scores/**odds**/status, **change-detection**, hourly on game days)"; fantasy module ("matchups, scoreboard+**projections**, standings W-L-T/PF/PA/streak, 'Trophies of the Week', **close-games monitor ≤15.99 pts projected diff**, waiver-wire summary, weekly recap)"; cron table (scoreboard Mon/Fri 7:30am ET, matchups Thu 7:30pm, trophies Tue 7:30am, standings Wed 7:30am, recap Tue 9:30am, close-scores Mon 6:30pm); off-season gating; health-check endpoint.
- **`:11`** — `.env.example` config: `LEAGUE_ID` (default 367989), `LEAGUE_YEAR`, **`ESPN_SWID`/`ESPN_S2` cookies for private leagues**, `TIMEZONE` America/New_York, `ENABLE_*`/`CRON_*` toggles.

Wiring impact, three concrete consequences:
1. **This is the only repo in the slice with a stated working ESPN integration, and ESPN is one of the three feeds the engine plans to wire** (`GSE-REPO-INTELLIGENCE.md:101` — "the plan is to wire **nflverse, Sleeper, and ESPN** feeds"). Read `index.js` before building an ESPN producer.
2. **ESPN odds is a market signal** and **ESPN projections are a consensus baseline** — both currently unwired (C2, C3).
3. **`ESPN_SWID`/`ESPN_S2` are session cookies for private leagues.** Using them is a live-account-credential dependency with no stated policy in the note; the `LEAGUE_ID` default is a specific third-party league. Flag to owner — this is a credential-handling decision, not a wiring call.

Honest limits: **`:14`** — "module internals described from README only, **not from index.js source**." So the odds/projections shapes are unverified. The note also states **no license** for this repo, and "built from best practices in" an upstream is a provenance claim, not a code-provenance clearance — do not copy `index.js` before reading both licenses.

### B6. `GSN.Cards` — committed ONNX detection models + a browser solve tier — QUEUED (partial)
`repo-intel/per-repo/Beexly-GSN.Cards.md:20` — "`ai/models/` — committed model binaries: `vit_b16.onnx` (+.data), `yolov8n_cards.onnx` (+.data, card detection), `custom_lora.pt` (custom fine-tune)".
Wiring impact: proves the **train → export ONNX → commit the binary → serve on CPU** path is already executed somewhere in the org (matches the ONNX Runtime serving answer at `GSE-REPO-INTELLIGENCE.md:121`). The two ONNX files are **card-domain** — not sports-usable as-is; only the *path* transfers. The 4-tier fetch escalation is B/A5's `trawl`, subject to the unstated license.

### B7. `autonomous-revenue-engine` owns **`conformal-lite`** — QUEUED
`repo-intel/per-repo/Beexly-autonomous-revenue-engine.md:28` — "`conformal-lite/` (13 blobs) — Python conformal-prediction toolkit: `core.py`, `cqr.py`, `adaptive_cp.py`, `saocp.py`, `evalue.py`, `meter.py`, `lago.py`, `capi.py`, `__main__.py`, tests".
Wiring impact: **first-party** (same org, not a fork) Python conformal machinery, already written, sitting outside the system of record. It speaks directly to the engine's refusal/interval layer — CQR and adaptive CP are the machinery for honest published intervals and DATA-GAP thresholds, which the engine currently cannot produce. Smallest-cost item in the whole slice: a candidate to *consume*, not to build.
Caveats: the note states **no license**; contents were **not read** (`:36` — "role descriptions above are filename-based"); and the repo is "Managed by Grok" with an almost-empty README (356 bytes, not read).

### B8. `agent-bus` — an nflverse reproduction job spec + a signal desk — QUEUED (weak, filename-derived)
`repo-intel/per-repo/Beexly-agent-bus.md:18` — "`lab/` — `run.mjs` + `jobs/nflverse-reproduce.json` — experiment-runner scratch (ML-lab style jobs)".
`repo-intel/per-repo/Beexly-agent-bus.md:23` — "`outbox/from-grok/` holds Grok's signal-desk work: `orb/` package (strategy, risk gate, ledger, alpaca adapter), `dashboard/index.html`, `desk_runner.py`, daily `cards/`".
Wiring impact: if `nflverse-reproduce.json` is a real nflverse reproduction spec, it may already define the vintage-parity check the frozen-vintage pipeline implies. **Very weak — filenames only.** The note is explicit (`:25`): "File:line pointers beyond the above were not read (task scope was tree-level; **no file contents fetched**)." Read the job file before anything else in this item. Also note `alpaca adapter` — a broker adapter implies a live-order path, which the Sports mode forbids (B9).

### B9. Sports mode is **internal calibration only** — QUEUED (constrains all of the above)
`repo-intel/per-repo/Beexly-Sports.md:11` — "Current mode per README: **internal calibration only** — **no auto-publish, no auto-send, no external posting, no automated betting.**"
Wiring impact: any of B4–B8 that terminates in publication, posting, or order placement is out of bounds regardless of license or registry status. This is a mode gate, not a signal fact; it is here because it vetoes B8's broker adapter and B4's Kelly code if read as live-money paths.

---

## C. SIGNALS NOT IN THE 47-SIGNAL REGISTRY — QUEUED (all unverified, see blocker)

### C1. `officials` and `narrative` — named as reasoning lanes, absent from every registry-bearing list in the slice — QUEUED
`repo-intel/per-repo/Beexly-Sports.md:32` — "officials/weather/narrative/coaching lanes are **DARK**."
The slice's only enumerations of what the engine covers name **weather priors** and **coaching tendencies / tau** (`gse-reasoning-engine-brief-2026-10-02.md:41`; `GSE-REPO-INTELLIGENCE.md:20` calibration rows: `epa_facets`, `tau_hat_served`, `weather_prior`). **Weather and coaching are therefore in-registry and DARK — expected, already-tracked work.** **`officials` and `narrative` appear nowhere in any registry-bearing list in the slice.**
Wiring impact: if either is genuinely unregistered, it is a **new registry row** requiring lane, provider, and a calibration row before it can carry any weight. Verification required against `intelligence/signals/registry.json`, which is not in this dump.

### C2. **ESPN odds / live scoreboard** — market feed, no lane named — QUEUED
`repo-intel/per-repo/Beexly-espn-groupme-bot.md:12` — NFL scoreboard "live scores/**odds**/status, change-detection, hourly on game days".
`GSE-REPO-INTELLIGENCE.md:103` — "***no GSE lane has a model-vs-market edge detector or a staking layer*** (Kelly-with-guardrails is the responsible pattern). GSE stops at projections; **the entire decision layer is unbuilt**."
Wiring impact: an odds feed with a working change-detector already written, feeding a lane that the master index says does not exist. Highest-leverage gap-closure in the slice — but it is a **decision layer**, which is the most consequential thing to stand up, not the cheapest. Do not wire ahead of the model-vs-market edge detector existing.

### C3. **ESPN projections + standings** — no consensus baseline — QUEUED
`repo-intel/per-repo/Beexly-espn-groupme-bot.md:12` — "matchups, scoreboard+**projections**, standings W-L-T/PF/PA/streak, 'Trophies of the Week', **close-games monitor ≤15.99 pts projected diff**, waiver-wire summary, weekly recap".
`GSE-REPO-INTELLIGENCE.md:97` — "**No consensus baseline — the 80/20 projection sits unbuilt.** … GSE has **zero wired producers and no baseline blend at all.**"
Wiring impact: two distinct unregistered candidates here — a **multi-source consensus blend** (ESPN projections as one named source role) and a **projected-margin uncertainty band** (the ≤15.99 pts diff monitor is a projection-confidence proxy, i.e. a *meta*-signal on projection reliability rather than a signal about the game). The 15.99 figure is the note's number; it is a hardcoded threshold in a chat bot, not a calibrated cutoff.

### C4. **Staking / Kelly + evidence-readiness** — no lane, code exists — QUEUED
`repo-intel/per-repo/Beexly-gse-competitive-intel.md:16` — "`codex-work/prediction-engine-reference/kelly.ts`, `poisson.ts`, `scoring.ts`, **`evidence-readiness-matrix.ts`**".
`GSE-REPO-INTELLIGENCE.md:103` — "no GSE lane has … **a staking layer** (Kelly-with-guardrails is the responsible pattern)"; also (§5.7) the props lane "can't yet state an honest model probability."
Wiring impact: the staking and evidence-gating primitives exist as reference code outside the system of record. Note the layering: a Kelly layer is a **consumer of calibration**, so it is downstream of C2/C3 and must not be built before the model-vs-market edge detector has an honest probability to size.

### C5. **Exposures / GPP machinery** — no lane, no source — QUEUED
`GSE-REPO-INTELLIGENCE.md:95` — "The DFS optimizer is a solver with **no inputs and no tournament brain**. It falls back to a *sample slate*. The fix is smaller than assumed: **DK/FD publish per-contest player-pool CSVs** (a scheduled CSV puller + parser needs no API partnership), and keyless ESPN endpoints can feed the rest. But even with a feed, GSE has **no GPP machinery — no lineup sims against fitted score distributions, no stacking primitives, no exposure caps, no site-ready uploaders.**"
Wiring impact: one **keyless, no-partnership data source named in the slice** (DK/FD player-pool CSVs) with no corresponding producer. Pairs with B5's ESPN pull for the "rest". Exposure caps and lineup sims are unnamed-lane signals; note the line sims need "fitted score distributions", i.e. C2/C3 plus a distribution head — this is downstream work, not a feed.

### C6. **Video / clip-location signal** — no lane, no source — QUEUED
`GSE-REPO-INTELLIGENCE.md:109` — "Offline download→cut→export + **shot-boundary detection** + the nflverse play-by-play GSE already ingests = an automatable 'game → timestamp list → candidate 3-second clips' front end that **nobody has built.**"
Wiring impact: a derived signal (game → clip timestamps) computable entirely from data the engine already ingests, with no new feed. No repo in the slice owns a clip pipeline; the notes' only media-download asset (`Beexly-UltimaScraper.md`) is an unrelated vendored scraper and carries **no license statement**.

---

## D. REVIEWED AND DROPPED — no qualifying fact in the note

Per the filter, these were read and produced **nothing** on data-owned / license-wall / unregistered-signal. Listed so the sweep is auditable; no detail restated.

| Repo | Why dropped |
|---|---|
| `Beexly/awesome-ai-agents-2026` | Curated link list; last pushed 2026-04-02 ("updated monthly" claim lapsed). No owned data, no license statement, no signal. |
| `Beexly/chick-goodies-kit` | 2 files; static one-page client preview, "Not the live shop." Dormant since 2026-09-16. |
| `Beexly/Doug.As-Builders` | Exactly one file — a stock Google AI Studio template README. No content. |
| `Beexly/Clouds-bruh` | Lumera commerce monorepo (Medusa v2 / Next.js), a separate parked lane. No sports data, license, or signal. *(Its `apps/intelligence/` Anthropic tool-use loop and `mcp.config.ts` are agent plumbing, not engine signals — not wiring-relevant to Sports.)* |
| `Beexly/Fablechain` | Autonomous-blockchain fork. No sports data, license, or signal. |
| `Beexly/OmniRoute` | MIT AI model gateway fork — inference-cost routing, not engine wiring. Permissive license, so no wall. |
| `Beexly/SupaAgent` | Owlex MCP multi-model council. Deliberation tooling, no owned data / wall / signal. |
| `Beexly/UltimaScraper` | Vendored OnlyFans media downloader. Unrelated domain, no license stated. |
| `Beexly/claude-code-best-practice` | Claude Code knowledge fork (upstream `shanraisshan/claude-code-best-practice`). **Trap avoided:** its `.claude/agents/weather-agent.md` and `weather-fetcher/SKILL.md` are example config assets in a docs repo — **not** a sports weather feed and not a weather signal source. |
| `Beexly/Project-Tree` | CRC multi-source consistency engine. Tempting, but see below. |

### D1. `Beexly/Project-Tree` — **founder-gated, deliberately not queued as wiring work** — QUEUED as a *gate*
`repo-intel/per-repo/Beexly-Project-Tree.md:10` — "Per the README, it is explicitly **not part of `Beexly/Sports` until an explicit founder YES**; the repo is the durable home for this line of work."
Content is genuinely adjacent: `:12` — "a classical multi-source consistency engine that repairs data-consistency classes: `consistent` | `statistical` | `structural` | `self_consistent_wrong_vs_ledger`"; `:15` — `ingest_multisource.py`, `ledger_policy.py`, `ranker_bakeoff.py`, `repair_loop.py`, `sheaf_core.py`.
**Not queued as a wiring item.** The note states an explicit founder YES is required and that no such YES exists. Adding a cross-source consistency layer that can declare data inconsistent is a **topology change to the engine**, not a task — and it is owner-gated by its own README. Queued here only as a gate to surface: do not wire without the founder YES on record.
Secondary honest caveat (`:12`): "Path A technically complete in sandbox. **Some core modules may still be landing on main.**"

---

## E. QUEUED — condensed

**License (7):** A1 Sports=PolyForm Noncommercial vs. paid product · A2 `yfpy` GPL-3.0 · A3 TGI/AutoGPTQ/AutoAWQ archived + 2 org moves · A4 permissives (probmetrics Apache-2.0, ONNX Runtime MIT, bge-m3 MIT, R1-Distill MIT) · A5 `germondai/trawl` unstated license + anti-bot ToS exposure · A6 `GSN.Cards` unstated · A7 `gradio-GSN` unstated, purpose undocumented.

**Data owned (9):** B1 `data/gse-dataset` nflverse contracts/rosters/snap-count JSONLs + manifest · B2 `readParts`→`aggregateSignals` off `parts-registry.jsonl`, 4 lanes DARK · B3 no `intelligence/` on `main` — name a branch · B4 `nfl_scheme_defense.py` + precomputed NFL feature CSVs + `kelly.ts`/`evidence-readiness-matrix.ts` (intel-only boundary) · B5 verified ESPN NFL+fantasy pulls, `ESPN_SWID`/`ESPN_S2` credential decision · B6 ONNX export path proven (card-domain assets) · B7 `conformal-lite` first-party · B8 `nflverse-reproduce.json` (filename-derived, read first) · B9 mode gate: internal-calibration-only.

**Signals (6, all awaiting registry verification):** C1 `officials` + `narrative` · C2 model-vs-market edge (ESPN odds) · C3 consensus blend + projected-margin band · C4 staking/evidence-readiness · C5 exposure caps + lineup sims (DK/FD keyless CSVs named) · C6 game→clip-timestamp.

**Gate:** D1 `Project-Tree` — founder YES required; surfaced, not queued.

**Counts:** per-repo notes read **17**; `GSE-REPO-INTELLIGENCE.md` read in full. `registry.json` present in dump: **no** — bucket (c) cannot be closed from this slice.