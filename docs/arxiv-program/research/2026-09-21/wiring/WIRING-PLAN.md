# GSE Wiring Plan — reconciled across models (2026-09-22)

One plan from every wiring/implementation plan found across Grok, Gemini,
Claude, DeepSeek, and the repo's own research corpus. Additive wiring only;
nothing removed, no behavior changed, no regressions.

## 1. Sources collected

| # | Source | Model | What was found | Wiring items | Disposition |
|---|--------|-------|----------------|--------------|-------------|
| 1 | Gmail, Sept 2026 (`noreply@x.ai`) | Grok | "GSE Signal Desk daily factory" briefs = daily injury/news briefs (Swift extension, Brown IR, …). No engine wiring plans. | 0 | Noted, nothing to implement |
| 2 | Gmail subject sweep (wiring/implementation/roadmap) | — | Only unrelated marketing mail | 0 | Noted |
| 3 | Google Drive `claude-build-queue` / `claude-build-packets` folders | Claude | Website build tickets (`BUILD-SITE-001…053` — homepage, nav, pricing). Not engine wiring. | 0 | Excluded (site, not engine) |
| 4 | `docs/ops/HANDOFF_2026-09-20_CLAUDE_SESSION.md` | Claude | 4 priorities + post-merge read | 4 | 2 already merged/closed, 2 → NEEDS HUMAN CALL |
| 5 | `agent-bus/inbox/from-motif/` | DeepSeek / Motif | Research/scrape prompts; `TASK-2026-09-18-scrape-every-api.md` = standing INGEST data-mapping plan (Hermes lane) | 1 (INGEST) | Referenced, not executed here |
| 6 | `docs/research/2026-09-21/nextgenstats-profile/ngs-implementation-playbook-2026-09-21.md` | Motif research | 12 per-metric NGS build specs, each with implementation spec + numeric gate | 12 | Queued as lab/ML projects (below) |
| 7 | `docs/research/2026-09-21/arxiv-program/index/IMPROVEMENT-LEDGER.jsonl` | Motif research | All 1,251 papers as concrete improvements w/ gates | gates reused | 3 quick-win CALIBRATE items implemented this pass |
| 8 | Gemini (Drive + email) | Gemini | No wiring plans found | 0 | Noted |

## 2. Already done — no action

- **Dual CLV reporting** (Claude PRIORITY 1): merged as #872 (`computeClvPushDoctrineRates` in `@sports/types`, three denominators side by side). Verified in handoff §9.2.
- **Publish deadlock** (Claude PRIORITY 2): closed via #870 (mint-side supersede).
- **CQR fail-closed** (ledger 1905.03222): `apps/web/lib/calibration/cqr.ts` repaired 2026-09-22 (commit `1d38140` on main) — unclamped rank, +∞/No-Bet when `ceil((1-α)(n+1)) > n`.

## 3. Implemented this pass (branch `motif/wiring-plans-2026-09-22`)

Additive-only: new modules + tests in `apps/web/lib/calibration/`. Nothing
existing touched. Publish-path wiring is deliberately NOT done (behavior
change) — see NEEDS HUMAN CALL.

| Item | Source paper | Module | What it adds | Acceptance gate (from ledger) | Risk |
|------|--------------|--------|--------------|-------------------------------|------|
| W-1 | 2103.00083 (quantile aggregation) | `quantile-isotonize.ts` | Post-sort isotonization for quantile vectors: `sortQuantiles` (non-crossing) + `pavaIsotonic` (PAVA isotonic regression). Prop. 2: WIS cannot worsen. | ADOPT into publish path only if 2025 data shows crossing violations (wiring = human call) | Low (pure fn) |
| W-2 | 1912.05642v4 (scale-invariant scoring) | `scrps.ts` | SCRPS = CRPS / E\|X−X′\| from forecast samples; scale-normalized second engine ranking | ADOPT as second ranking only if it flips ≥2 game-target rankings vs mean CRPS on last 3 seasons | Low (pure fn) |
| W-3 | 1808.07501v2 (practical scoring rules) | `practical-scoring.ts` | Bounded proper scoring rule: log score floored at s_min = −57.27 | ADOPT for analyst leaderboard only if Spearman ≥ 0.95 vs raw-log-score ranking | Low (pure fn) |

Tests: `quantile-isotonize.test.ts`, `scrps.test.ts`, `practical-scoring.test.ts`
(co-located, vitest). Each asserts the paper's core property (non-crossing,
scale invariance, loss cap + properness) plus empty-input behavior.

## 4. Queued — NGS metric builds (lab/ML projects, not repo wiring)

From the NGS implementation playbook. Owners per playbook; each has a numeric
gate in the playbook. Sequenced INGEST → MODEL.

| Item | Metric | Implementation | Gate | Owner |
|------|--------|----------------|------|-------|
| NGS-1 | Completion Probability / CPOE | XGBoost on nflverse pass-level + charting features; iterate to Big Data Bowl tracking | Brier skill ≥ 0.9 vs NGS r²=0.98-equivalent calibration | Motif-lab |
| NGS-2 | Run Scheme Classification | Transformer on BDB tracking, FTN/PFF weak labels, 16-class + gap heads | Beat charting-heuristic baseline by ≥5pp accuracy | Motif-lab |
| NGS-3 | Run Blocking Matchups | Frame-pair engagement classification; OL time-to-pressure-allowed | Lab triage (architecture undisclosed) | Motif-lab |
| NGS-4 | Route Classification 2.0 | Sequence classifier on receiver trajectories + blocker features | Lab triage | Motif-lab |
| NGS-5 | xRY / RYOE | Reimplement "Zoo" 2D-CNN on BDB handoff frames | CRPS ≤ 2020 winning score on competition set | Motif-lab |
| NGS-6 | Pressure Probability | GNN role classification + RF frame-level PP, 75% threshold | Pressure-rate calibration within 2pp of 10.3% avg-rusher baseline | Motif-lab |
| NGS-7 | Tackle Probability | Frame-level model on 2024 BDB set; missed-tackle + yards-saved derivatives | ≥80% recall on PFF missed tackles at 20% FPR | Motif-lab |
| NGS-8 | Expected YAC | Same 2D-CNN structure as xRY on post-catch frames | Lab triage (no published features) | Motif-lab |
| NGS-9 | QB Passing Score | AWS-released SBP code on BDB passing plays; QB-stability input to GSE priors | Replicate; correlate vs win% | Motif-lab |
| NGS-10 | Draft Model | Three-score taxonomy (Production/Athleticism/Overall) from combine + college production | Calibrate vs published leaderboard anchors | Hermes |
| NGS-11 | Coverage / DB metrics | Target EPA, yards/coverage snap from nflverse + charting (computable today) | Match NGS observed leaderboards directionally | Hermes |
| NGS-12 | Other metric families | Kicker makes-over-expected, scramble EPA, motion rate, run stops (computable today) | Backtest each vs naive baseline | Hermes |

INGEST dependency for NGS-1…9: Big Data Bowl tracking sets + nflverse backfill —
see standing `TASK-2026-09-18-scrape-every-api` (Hermes lane). NGS-11/12 need
only nflverse, already available.

## 5. NEEDS HUMAN CALL (not implemented — requires behavior/schema/DB change)

1. **Props storage** (Claude PRIORITY 4): add `PROP` to Prisma `PickType` +
   settlement + grading. `schema.prisma` / `migrations/**` are frozen to
   agents (AGENTS.md law 2). 31 hierarchical-Bayes prop models already exist
   in `packages/prediction-engine/src/edge-lab/` and are wired to
   `quote-plane` — storage is the only blocker. Full spec: handoff §5.
2. **Fixture dating upstream fix** (Claude §9.3): next-Sunday fixtures stamped
   ~7 days early (`commenceTime` off-grid by seconds). Fix is upstream in
   fixture dating; needs a database read (AGENTS.md law 7 — agents may not
   touch the DB). Do NOT patch from the board side (hides the symptom).
3. **Publish-path wiring of W-1**: routing GSE quantile outputs through
   `sortQuantiles` before publishing changes published intervals. Per the
   gate, wire only after 2025 crossing-violation measurement; founder call.

## 6. Conflicts

None between model plans. The CQR repair item (ledger 1905.03222) and the
2026-09-22 `cqr.ts` fix are consistent (fix already on main). Claude's hard
rules (never modify schema/migrations/workflows, never flip gates, never
weaken guards) were honored throughout: this plan contains zero such changes.

## 7. Implementation log

- Branch: `motif/wiring-plans-2026-09-22` (never main — Garrett/Hermes merge)
- W-1/W-2/W-3: new files + co-located vitest suites, all additive
- Verify: `vitest run` on the touched suites + `tsc --noEmit` before push
