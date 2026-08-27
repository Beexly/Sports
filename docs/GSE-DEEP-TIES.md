# GSE DEEP TIES — corners mined after the first cross-agent map (2026-08-27)

Companion to `GSE-CROSS-AGENT-MAP.md`. This documents the surfaces the FIRST sweep missed
and the unmade ties between the `sports-intel` R&D corpus and the rest of the GSE federation.
Every item below was VERIFIED by reading the actual file (or a subagent inventory), not assumed.

## The unifying insight
Our `sports-intel` R&D corpus is NOT separate from GSE's frontier architecture — it is a
**CONCRETE PROTOTYPE** of it. The whole federation shares ONE doctrine:
> real data or honest unavailable state · replayable proof · loud rejection of impossible facts.

Our corpus proves that doctrine works on real data (Shin vs mberk/shin exact; CLV settleClv;
fail-closed fire gate; +3.5% ROI on free Kaggle games; 2025 = honest unavailable). The deep
ties below show WHERE our prototype plugs into the production architecture.

## C1. `C:/Users/Garrett/nfl_ot/games.csv` — second REAL free dataset, unmapped
- 1999–2024 NFL games with REAL markets: `away_moneyline`, `home_moneyline`, `spread_line`,
  `away_spread_odds`, `home_spread_odds`, `total_line`, `under_odds`, `over_odds`, plus
  roof/surface/temp/wind/QB/coach/referee. `pbp_2019..2024.csv.gz` = real play-by-play.
- `test.py` is a stub — no backtest built there. UNDER-LEVERAGED: our `replay-real-games.ts`
  should be extended from 570 Kaggle games to 26 seasons of `nfl_ot/games.csv`.

## C2. `C:/Users/Garrett/nfl_rb_backtest/tree.json` — BROKEN/STALE
- Contents = GitHub API 404 `{"message":"Not Found"...}`. Abandoned; do not trust.

## C3. Neon `odds_line_snapshots` — REAL, REACHABLE q-side CLV store
- `.cagent/Sports/.env.neon-hermes-ro.tmp` holds read-only Neon cred (hermes_ro).
- `hf7-archive`: 37,402 snapshots (9,864 NFL, 11,318 MLB). This is the REAL closing-line
  source our `settleClv` should ingest — NOT fixtures, NOT model-derived (per C-14/C-15
  forensics: 909/909 locks were model-derived, not real-book). Verify live connectivity when
  wiring (avoid side effects now).

## C4. `gse-run` recovery priorities — 7 ACTIVE PR-numbered workstreams
- `#119` settlement/CI hardening · `#122` CLV/Pedersen schema (founder-gated) ·
  `#112` governed playback spine (evidence envelope, Game Room/Twin/Brain/autopsy) ·
  `#121` fantasy engine naming · `#124` frontier fabric · `#123` Cockpit ADMIN ·
  `#52` Galaxy Dynasty world graph.
- Several (#122 CLV, #112 evidence, #119 settlement) INTERSECT our CLV/fire-gate/evidence work.
- Token protocol: one workstream/session, ≤1 subagent. (Our recon used parallel teams for
  READ-ONLY — fine; any EDITS must follow single-workstream + claim-ledger-row rule.)

## C5. `frontier-kernel.md` — GSE conceptual backbone
- 5 compilers (Reality/Decision/Capability/Discovery/Evolution) + SportsIR primitives +
  bitemporal WorldSnapshot + proof-carrying Reality Receipt. Laws: "real data or honest
  unavailable state", "replayable object before additional consumers". Our R&D is a leaf.

## C6. gse-run SKILL.md is STALE vs actual frontier docs
- SKILL.md references `docs/frontier/{CURRENT_STATE,WORKSTREAM_QUEUE,RECOVERY_MATRIX}.md` —
  those files DO NOT EXIST. Actual `docs/frontier/`: BITTEMPORAL_ADOPTION_V0,
  EVENT_SOURCING_PATTERNS, MODEL_PROMOTION_GATE_CONTRACT, OPERATIONAL_EPISTEMIC_TWIN_CONTRACT.
- The live workstream list is `recovery-priorities.md`, not the SKILL.md's named files.

## C7. `MODEL_PROMOTION_GATE_CONTRACT.md` — canonical CLV/calibration gate (KEY TIE)
- Documents DEC-062 failure: `computeClvMean()` returned 0.5 for all input; Brier compared
  the SAME field twice → challenger could NEVER promote, tests asserted the tautology. THIS is
  the failure class our fail-closed `settleClv`/`firePostedProp` prevent.
- Real stats: empirical-Bernstein LCB with (b−a)=2 range-width factor (NOT t-test);
  Welch one-sided non-inferiority (ε=5bps) for CLV; coverage floor 0.95; N_min=500 paired;
  founder-applied MODEL_VERSION.
- TIE: our "encode calibration targets from papers" next-action → UPGRADE to this contract.
  Our +3.5% ROI label is a prototype; this is the production "how do we know our edge is real."

## C8. `BITTEMPORAL_ADOPTION_V0.md` (PR #139) — makes our fixtures REAL
- v0 code-complete (in-memory, dark, 138+ tests), not yet merged; persistence founder-gated.
- `observedAt`/`recordedAt` law; `foldObservationsAsOf`; most-recent-EVIDENCE-wins; "absence
  of coverage is not green." TIE: our LABELED-CONTRACT backtest → real via PickSignalSnapshot
  pre-lock p + post-settle grade + bitemporal audit.

## C9. `OPERATIONAL_EPISTEMIC_TWIN_CONTRACT.md` (FV-003) — honesty engine
- 3 axes (Severity/Certainty/Intent); "unknown is contagious"; evidence decay to unknown;
  `canActAsIf()` agent guard. TIE: our fire gate fail-closed is a LEAF of this contract; our
  "2025 = honest unavailable" is a direct instance of intent-gated darkness.

## C10. (folded into C6) gse-run staleness noted.

## C11. `EVENT_SOURCING_PATTERNS.md` — the capstone tie
- Three laws: (1) append-only facts, (2) replayable derivation (any public number recomputable
  from persisted facts — `recompute.ts`, slate verifier, promotion gate), (3) loud rejection of
  impossible facts. DEC-062 anti-pattern = our fail-closed design's raison d'etre.
- Hash-chain ledger: "no live ledger chain to read today — proven pure function over
  hypothetical rows." → OUR backtest is EXACTLY this state. Path to real: populate from Neon
  `odds_line_snapshots` + `PickSignalSnapshot`.

## C12. `handoff/H1_RESEARCH_2026-08-23.md` — 13-abandoned-edge-impls TODO
- 19-agent swarm. TIER1 (QB Pressures, TFL, PD, Def snap share, ST) from FREE nflverse_def/PFR;
  TIER2 (uncorrelated combos, steam, early-season bias); TIER3 (RZ TE share, 3rd-down,
  no-huddle, game-script WP). GAP: "repo only ingests OFFENSIVE nflverse; def+ST free, not
  ingested; 13 abandoned/partial edge impls found." → READY TODO for our next module expansion.

## C13. `gse-data-scout` / `GSE-launch` — real tools/oracle, unmapped
- `gse-data-scout`: rights-safe COLLECT→ENRICH→STORE, lives OUTSIDE Beexly/Sports, won't spend
  THE_ODDS_API_KEY, won't hit DraftKings/FanDuel/BetMGM/SBR. Catalogs Odds API v4 / TheSportsDB
  / GitHub watchlist, rights-classifies before storage. The real feed-recon harness — our
  SOLUTION-DOSSIER should cite it.
- `GSE-launch`: launch runbooks (CODEX_FINAL*, CLAUDE_PICKUP, AFFILIATE_GO_LIVE). Proof-gated
  ladder: FOUNDING → PROVEN (≥100 settled + calibration) → ESTABLISHED (≥500 settled + CLV
  ≥52.4%) → AUTHORITY (multi-season ROI). Our +3.5% is PRE-PROVEN; the ladder defines "proven."

## What is STILL genuinely unread (honest gaps — not faked complete)
- The full 136-row AGENT_LEDGER extraction (sa-3 was stopped after key rows known: OVN-0826-1,
  L-6/L-9, C-14/C-15, H-S, L-10, C-16, C-23). A complete row table remains a TODO.
- `fantasyguru/*.csv` outputs, `fantasypros/` dossiers, `GSE-competitive-intel/dossier.html`.
- The ~80 `Sports-*` worktree dirs (classified, not read).
- `GSE-launch/CODEX_*` runbooks (only CLAUDE_PICKUP/CLAUDE.md skimmed).
- Live Neon connectivity unverified (cred present; not pinged to avoid side effects).
- 2025 data: still unverified anywhere; `nfl_engine.py` "2025" needs reconciliation with
  "2025 not on nflverse."

## Suggested next actions (prioritized)
1. **Populate the ledger, don't just prototype it**: wire `settleClv` to Neon `odds_line_snapshots`
   (real closing lines) + `PickSignalSnapshot` discipline → our backtest becomes a real,
   replayable, bitemporal grade (C3+C8+C11). This is the single highest-leverage un-tied thread.
2. **Upgrade "calibration targets" to MODEL_PROMOTION_GATE_CONTRACT** (C7) — the canonical spec.
3. **Extend backtest to `nfl_ot/games.csv`** (1999–2024, 26 seasons) + the 570 Kaggle games (C1).
4. **Build the def/ST edge modules** from H1_RESEARCH TODO (C12) — currently offensive-only.
5. **Cite `gse-data-scout`** in SOLUTION-DOSSIER as the rights-safe recon (C13).
6. **Reconcile 2025 data availability** (our claim vs `nfl_engine.py` "2025").
7. **Open the PR** for this branch + push the `.cagent/Sports` ledger row (`RND-0827`) so the
   other 3 agents see our corpus remotely.
