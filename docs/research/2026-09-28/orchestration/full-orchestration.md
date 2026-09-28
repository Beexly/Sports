# Full Orchestration Plan — GSE data + engine build-out (2026-09-28)

Research-side consolidation. No orchestration executed; this is the plan Garrett approves and the coding agent executes. Repo rules govern every build; these docs are pointers, not replacements.

## 0. What this consolidates

Four research lanes (each implementation-ready, landed alongside this doc under `docs/research/2026-09-28/orchestration/`):

| Lane | Doc | Verdict |
|---|---|---|
| 1. Live salary imports | `salary-import-lanes.md` | DK verified live today, no auth (draftables endpoint, draftGroupId `154078` this week, 619 players); FD login-gated. **Repo standing rule conflicts with the DK path — Garrett's call.** |
| 2. CLV history hunt | `clv-hunt-report.md` | **FOUND** in Garrett's own Neon: `odds` (8.08M rows), `odds_line_snapshots` (2.21M rows, OPEN/INTERIM/CLOSE), `opening_lines` (4,923), per-pick CLV grading wired. Known gap 2026-08-22 → mid-Sept (broken writer). OddsPapi `/historical-odds` is the free backfill path. |
| 3. NGS feed creation | `ngs-feed-creation-plan.md` | Ranked sources, target schema, validation protocol, milestones M0–M6, 12 data-QC rules + **NGS internal-only doctrine (HARD, §0.A — NGS never public, CI fence enforced)**. Bootstrap = asonty TSVs + nflverse aggregates + synthetic engine; scrape probe before build; licensed feed = Garrett's money. |
| 4. GPL/AGPL verdicts | `gpl-verdicts.md` | dynastyprocess/data = facts free; nflverse-pfr = study-only (get data from nflverse-data); PanopticPigskin = AGPL method-only full stop; nflverse-pbp/data = CC-BY-4.0 with attribution; ESPN package = LGPL, use as unmodified npm dep. Clean-room rules + attribution format included. |

**v2 additions (2026-09-28, Garrett's directives):**

| Addition | Doc | What |
|---|---|---|
| Rankings program | `rankings-program.md` | FantasyPoints-style: rest-of-season + week-by-week + positional rankings, weeks 4→playoffs; immutable snapshots, accuracy scoreboard to beat the "most accurate 2025" claim on the 2026 record; Phase 10, gated on projection lock + adjustment layer. |
| GPL explainer | `gpl-explainer.md` | Plain-language guide: GPL, copyleft vs MIT, GPL-2 vs 3, why AGPL is dangerous for a web product, LGPL exception, derivative work in practice, dataset question, clean-room rules. Engineering explainer, not legal advice. |
| NGS internal-only doctrine | `ngs-feed-creation-plan.md` §0.A + QC rule 13 | HARD: NGS data and metric names never public, CI fence enforced, NGS is reasoning fuel only; elevated calibration weighting. |
| Odds API backfills | `coding-agent-briefs.md` B, decision log #17 | His Odds API account is active — backfills go through it; he'll buy another month if a lane needs it. |

Prior research this plan builds on: `docs/research/2026-09-27/total-signal-wiring-spec.md` (branch `motif/total-signal-wiring-2026-09-27`), `docs/engine/research/2026-09-26/2026-09-26-movement-module-spec.md`, `packages/prediction-engine/src/tracking/cv-movement-primitive.ts`, the pydfs teardown + keeper teardowns (verified on the sweep branches, §8), and `rankings-program.md` (new in v2).

## 1. Phase order (dependencies explicit)

**Phase 0 — Integrity check + Garrett's decisions (gates everything).**
- Reconcile the prior sweep landings (§8). Nothing downstream should re-research work that exists or rebuild work that doesn't.
- Collect Garrett's decisions from the decision log (§6). The projection-source lock is the master gate per the total-signal spec.

**Phase 1 — Projection source lock (Garrett's call).** His standing build order: lock the projection source first. Everything that consumes projections (DFS provider merge, adjustment layer, benchmarks, backtests) waits on this.

**Phase 2 — DFS slate provider + salary imports.**
- DK adapter per `salary-import-lanes.md` §5 (TLS-impersonated client, discovery → fetch → map → dedup → register via `registerDfsSlateProvider`), **only if Garrett revises the standing rule** ("never the forbidden DraftKings hidden endpoint"). If the rule stands: adapter targets a contracted feed; DK path ships as research/backup input only.
- FD: CSV-parse path (manual download precedent), no logged-in poller without Garrett's word (ToS-sensitive).

**Phase 3 — CLV intake repair + backfill (independent of Phase 1).**
- Verify `LINE_ARCHIVE_ENABLED=true` in prod; wire the freshness monitor (`apps/web/lib/ops/odds-line-archive-freshness.ts`) to an independently-verified-alive alert channel (currently wires to nothing).
- Fix/re-verify the snapshot writer regression window (8/22 → mid-Sept 2026).
- Backfill the gap + deep history via OddsPapi `/historical-odds` (free/unmetered, NFL sportId 14; Pinnacle game lines, no props) — gated on Garrett's legal read (`certifiableForLiveGate=FALSE` until then).
- Grade lock vs **each book's** close, not consensus; keep the `sharpSplitSourced` honesty gate.

**Phase 4 — Adjustment layer v1 + player signals (needs Phase 1).** From the total-signal spec: injury/depth-chart adjustment layer, populate the empty `player_signals` table, rule shape TRIGGER→AFFECTED→DIRECTION→MAGNITUDE→LOG; backtest every rule before it ships.

**Phase 5 — NGS feed creation M0–M4 (independent of Phases 1–4).** Per `ngs-feed-creation-plan.md`: skeleton → bootstrap corpus (asonty TSVs) → physics baseline on real data → scrape-lane verdict (probe first) → movement-spec loader integration. M5 (CV lane PoC) stays gated on counsel/licensed input; M6 (licensed feed) stays stubbed until Garrett approves spend. **NGS internal-only doctrine (HARD) applies to every milestone:** NGS data and metric names never touch public surfaces; CI fence enforced; NGS signals get their own calibrated weight with the ECE/coverage gates as first-class acceptance.

**Phase 6 — Movement-lane training (needs Phase 5 M2/M4).** Movement spec Phase 0 → Phase 3 progression: physics baseline must exist on real data before any learned model trains; single relational model must beat baseline by ≥ 10% before ensembling; uncertainty calibration gates (ECE < 0.15 yd, coverage ± 5 pp) are the last door before the engine's calibration rebuild consumes anything.

**Phase 7 — GPL-clean reimplementations + attributions (parallel, early).** `docs/ATTRIBUTIONS.md` (nflverse CC-BY-4.0 format in `gpl-verdicts.md` §7); dynastyprocess fact extraction into our own schema; independent PFR snap-count scraper from nflverse-data output schemas; clean-room headers everywhere. No GPL/AGPL code enters the tree.

**Phase 8 — Benchmarks (needs Phase 1).** pydfs vs GSE `apps/web/lib/fantasy/` on the same slate (per the teardown's benchmark spec); `nflalgorithm` confidence-engine gate onto the 9.2 Hold floor; `nfl_py3` weak-signal registry schema adoption (MIT); CRN shared-draws discipline from nfl-edge-finder (method only).

**Phase 9 — Off-field intake + rule backtests.** DojoZero's typed-LLM pre-game event pattern (infrastructure only, MIT) for the off-field intake; every total-signal rule backtested before shipping per the standing order.

**Phase 10 — Rankings program (needs Phases 1 + 4; Phase 9 partial).** Per `rankings-program.md`: rest-of-season, week-by-week, and positional rankings, weeks 4 through the fantasy playoffs. Single projection core — no rankings-specific fork. Weekly immutable snapshots with a changelog on revisions; confidence tiers on the 9.2 Hold floor; the accuracy scoreboard (MAE/RMSE/Spearman vs. actuals, head-to-head protocol with confidence intervals) is the public record that beats the FantasyPoints "most accurate 2025" claim on the 2026 record. The automated play-tagging pipeline + prioritized human-review queue (§5 of the rankings doc) is the honest answer to "hand-graded every play" — no "hand-graded" claim until humans actually graded. **Cannot start before the projection source is locked** — rankings without a locked source are decoration.

## 2. Workstreams (coding-agent briefs in `coding-agent-briefs.md`)

A. DFS slate provider wiring — DK adapter or contracted feed (gated on Garrett's rule call).
B. CLV intake repair + OddsPapi backfill (gated on legal read).
C. Adjustment layer v1 + player-signals population.
D. NGS feed creation M0–M4.
E. Movement-lane training progression.
F. GPL-clean reimplementations + attributions.
G. Benchmarks + weak-signal registry + confidence gate.
H. Rankings program — three ranking products + accuracy scoreboard + automated play-tagging pipeline (gated on Phases 1 + 4).

## 3. Branch / PR strategy (standing push policy)

- One feature branch per workstream off `main`: `motif/<workstream>-2026-09-28` (or the agent's own clean branch name; never reuse another agent's active branch).
- Land via the Git Database API (`bin/github-push-files`), file-scoped; PRs where review makes sense; verify every landing via the API (branch + commit SHA recorded in the workstream log).
- Nothing counts until remotely verifiable. Never push from `~/workspace/vendor/Sports` (forbidden local commits `fd289d1d4`/`2253f3e48` at its HEAD); never touch `gse-grok-build-sandbox`.
- Tests for everything new; CI green before a workstream is called done.

## 4. License gates (standing, from the sweep + lane 4)

- **MIT / Apache-2.0 / CC-BY-4.0 / LGPL (unmodified dep):** usable with attribution (format in `gpl-verdicts.md` §7).
- **No license:** method only, independent reimplementation, never copied code.
- **GPL-3.0 code / AGPL-3.0:** study only — facts and methods learnable, zero code ported, no line-by-line translation. Clean-room: design doc first, implement from the doc, provenance headers committed.

## 5. Standing build rules this orchestration inherits

- Projection source lock → slate provider → adjustment layer → player signals → off-field intake → backtest every rule (Garrett's total-signal order).
- Garrett explains a rule once; it then lives in the spec.
- Quality floor 9.2; short updates with verifiable numbers and honest gaps.
- Nothing posts to @GalaxySportsHQ without his approval. No spending, account creation, prospect contact, private messages, or money-touching automation without his explicit word.

## 6. Decision log — needs Garrett's explicit word

1. **Projection source lock** (standing; gates Phases 1+).
2. **DK salary path vs repo standing rule** (`dfs.ts`/`providers.ts`: "never the forbidden DraftKings hidden endpoint"). (a) rule stands → DK path is research/backup only, contracted feed instead; (b) rule revised → wire the verified read-only DK path as the live provider.
3. **Spending:** SkillCorner (low-to-mid five figures/yr, unquoted), Genius Sports (six-to-seven figures), SIS DataHub Pro ($99.99/mo). Nothing without his word.
4. **OddsPapi legal read** for CLV backfill (terms: internal analytics only, no resell).
5. **Neon `neondb_owner` password rotation** — still owed; password recoverable from public git history.
6. **Fresh Neon read grant** (transient `DATABASE_URL`) to quantify exact CLV coverage (min/max dates, per-sport, per-book counts).
7. **NFL+ Premium token** if the NGS public-API probe comes back dead.
8. **NFL ToS risk tolerance** on scrape lanes (NGS scrape, DK reads).
9. **FantasyPros ToS review** if DynastyProcess ECR becomes load-bearing on a revenue surface.
10. **Detector buy-vs-build** for the broadcast-CV lane (M5).
11. **GPU budget** for the movement-model 5-seed ensemble cadence.
12. **Movement-spec open questions:** ball-landing-spot availability at inference; which NGS seasons are licensable for the expanding window.
13. **`espn-fantasy-football-api`:** adopt as dep or skip (existing intakes may cover it).
14. **Prior sweep landing discrepancy** (§8) — **RESOLVED 2026-09-28:** the parent agent verified directly via the branches API that `motif/github-nfl-sweep-2026-09-28` @ `7617c9d`, `motif/github-nfl-sweep-deep-dive-2026-09-28` @ `6cd7155`, and `motif/github-secrets-audit-2026-09-27` @ `5dc1473` are all on the remote. The coordinator's missing-branch flag was wrong (bad branch-listing check, not bad landings). No action needed; §8 corrected below.
15. **FantasyPoints claim benchmark:** which of their projection products we test against (they publish multiple sets — the head-to-head protocol in `rankings-program.md` §4 must name the exact one), and the scoring formats we lead with (PPR primary, half-PPR/standard recorded for audit).
16. **Rankings human-review staffing:** the automated play-tagging pipeline + review queue ships first; full "hand-graded" coverage is a staffing decision with a real price tag — queue size, reviewer count, cost, and whether v1 ships automated-only.
17. **Odds API backfill:** Garrett's Odds API account is active — backfills (CLV gap, odds history, anything the data lanes need) go through it. He will purchase another month if a lane needs it. No separate approval needed to *use* the existing account for backfills; the month-purchase is his call when a lane asks for it.

## 7. Honest gaps (no lane can fill these)

Live DK ownership (needs the provider lane or licensed feed); real CLV history before the archive's coverage (backfill bounded by OddsPapi Pinnacle game-lines); official injury truth (scrape + typed-LLM extraction is the build, not a find); full NGS tracking (licensed or scrape-at-tolerance); market execution (Garrett's accounts/keys/bankroll — never touched without his word).

## 8. Integrity note — CORRECTED 2026-09-28 (prior flag was wrong)

The v1 orchestration's coordinator reported that `motif/github-nfl-sweep-2026-09-28` @ `7617c9d4ec507fc54a6431d01eb10bde220c6a1b`, `motif/github-nfl-sweep-deep-dive-2026-09-28` @ `6cd715525de98a24c946ac71c720b5a9e337ed41`, and `motif/github-secrets-audit-2026-09-27` @ `5dc1473bcdbe4576bed362e0707e16fc4cf7ae81` were not on the remote. **That flag was wrong.** The parent agent verified directly via the branches API on 2026-09-28: all three branches (plus `motif/orchestration-2026-09-28` @ `cccefab`) are on the remote at the reported SHAs. The coordinator's branch-listing check was faulty, not the landings. Per Garrett's rule — *nothing counts until it's on the remote* — these **do** count. The sweep keeper/teardown content stands as verified remote research; Phase 0's reconciliation step is to dedupe against it, not to re-research it.
