# Paper spec — arXiv:2309.15253 · NN+MILP DFS lineups, validated at real DraftKings percentiles

**Source:** Mahoney & Paniak (Alvernia / Penn State Berks), "Method and
Validation for Optimal Lineup Creation for Daily Fantasy Football Using
Machine Learning and Linear Programming," arXiv:2309.15253v2, 28 Sep 2023.
Full text fetched and read 2026-08-26 (PDF, 32 pages incl. appendix lineups).

**Feeds:** EDGE-PATH E2 ("DFS lineup benchmark … eval harness for the fantasy
optimizer — honesty: their lineups hit ~31st percentile — publish our
benchmark") and the fantasy suite's competitive-baseline honesty posture.

---

## 1. Method (as extracted)

### 1.1 Projection model (their §2.2, Table 2, Fig. 2)

Two-layer feed-forward NN: **43 features → 19 sigmoid hidden units → 1 linear
output** (FPTS for the upcoming game). Matlab `nftool`, Bayesian
regularization backpropagation (Levenberg–Marquardt was faster but worse),
MSE loss, 80/20 train/validation.

Features (their Table 2): position one-hot (5); FPTS games 1–3 (3); point
differentials games 1–3 (3); own team off/def rank games 1–3 (6); opponent
off/def rank games 1–3 (6); home/away games 1–4 (4); point spread games 1–4
(4); over/under games 1–4 (4); game latitude games 1–4 (4); longitude
games 1–4 (4). Vegas features included because betting lines out-predict most
statistical models (their §2.1).

Training regime: 4-week moving windows (14 per season); a player is eligible
if draftable AND played ≥4 of the past 6 weeks; features = weeks 1–3 of the
window (+ known week-4 context like spread/venue), target = actual week-4
FPTS. 2018 NFL regular season only.

### 1.2 MILP (their §2.3, Eq. 1)

Binary selection vector x over the draftable pool, f = predicted FPTS,
S = salaries:

```
min_x ( −fᵀx )   subject to
  x_i ∈ {0,1}
  Sᵀx ≤ $50,000
  Σ_{i∈QB} x_i = 1      Σ_{i∈RB} x_i = n_RB
  Σ_{i∈WR} x_i = n_WR   Σ_{i∈TE} x_i = n_TE
  Σ_{i∈DST} x_i = 1
```

DK Classic flex handled by solving three times — (n_RB, n_WR, n_TE) ∈
{(2,3,2), (2,4,1), (3,3,1)} — and keeping the best. Matlab `intlinprog`,
AbsoluteGapTolerance 0, CutMaxIterations 25, IntegerTolerance 1e-4.
**Acknowledged flaw:** DraftKings' players-from-≥2-teams rule was NOT encoded,
so infeasible lineups were possible.

### 1.3 Robustness via ensembling (their §2.4)

To de-risk one unlucky train/val split: 10,000 NNs from random 80/20 splits →
10,000 FPTS vectors → 10,000 MILP lineups → submit the **modal lineup** (most
frequently generated; majority-vote analogy; converged by ~100 lineups).
Bootstrap CIs (10,000 resamples) on percentiles; KS normality test; two-sided
heteroscedastic t-tests; Cohen's d; α = 0.05.

### 1.4 Percentile validation — the part worth porting (their §3.2–3.3)

Two baselines, run live during 2018 weeks 6–16 (weeks 7 and 9 dropped —
game-time scratches zeroed a drafted player):

1. **Random-lineup control:** 35,000 feasible random lineups per week with
   salary ≥ $45,000 (90% of cap), built post-hoc excluding zero-FPTS players;
   report the generated lineup's FPTS percentile within that distribution.
2. **Real field:** entered DK GPP "Classic" Thu–Mon contests (free or $0.25),
   aggregated several contests per week, removed zero-FPTS user entries,
   computed the lineup's percentile within the real user distribution,
   bootstrap CI.

Results (their Tables 3–5): vs random — above median most weeks (62.7, 72.6,
51.4, 57.8, 73.4, 27.3, 13.6, 52.9, 19.3). vs the real field — **32.2, 31.6,
34.2, 33.1, 50.5, 9.34, 6.10, 25.2, 4.52 → median ≈ 31st percentile**
(2,300–37,300 users/week). Honesty findings they printed anyway: actual lineup
FPTS fell below their own 2.5th-percentile prediction every week; player-level
projections were generally poor; performance cratered after week 13
(injury accumulation, clinching/tanking — the 3-week lookback can't see it).
Real users beat random lineups every week (d = 0.49–1.08), i.e. the field is
skilled and percentile-vs-field is the honest yardstick.

---

## 2. Data required vs data GSE has

| Paper needs | GSE equivalent | Status |
|---|---|---|
| Salaries/positions per slate | `apps/web/lib/fantasy/dk-import.ts` — DK salary-CSV import (legit per-contest export), `apps/web/app/api/dfs/salaries/route.ts` | HAVE |
| An optimizer | `apps/web/lib/fantasy/dfs-optimizer.ts` — **exact DP** (0/1-knapsack over slot-state × salary), FLEX solved natively (no 3-run trick), QB stacking exact, cash/gpp/leverage objectives | HAVE — stronger than the paper's MILP |
| Player projections | Modeled bands off DK average in `dk-import.ts` (honestly labelled); no real projection source wired yet (founder gate) | PARTIAL — the weak link, exactly as it was the paper's weak link |
| Actual weekly FPTS (settle lineups) | nflverse aggregates (cleared) can reconstruct DK-scoring FPTS; The Odds API for context | HAVE (needs a DK-scoring mapper) |
| Real contest field distributions | Only via the founder entering DK contests and exporting standings CSVs for contests entered (no public lineup API; scraping logged-in data violates DK ToS — `dk-import.ts` header already states this) | OWNER-GATED, weekly, in season |
| Random-lineup control | Slate machinery + a seeded feasible-lineup sampler | BUILD (small) |

---

## 3. Port plan — percentile benchmark harness for the GSE optimizer

We do NOT port their solver (ours is provably optimal for the same objective
and handles FLEX/stacking natively) or their NN (see §5). We port the
**validation method** — because publishing "median percentile vs the real
field, with CI" is the same unfakeable-honesty move as our Kill Ledger, and
their ~31st percentile is the published baseline any GSE number gets compared
against.

**New module** `apps/web/lib/fantasy/percentile-benchmark.ts` (pure, strict
TS, tested):

```ts
function fieldPercentile(lineupFpts: number, fieldFpts: readonly number[]): {
  percentile: number;            // rank within field, zero-scores pre-removed
  ci95: readonly [number, number]; // bootstrap, 10_000 resamples (their §2.4)
  n: number;
}
function randomFeasibleLineups(pool: readonly DfsPlayer[], opts: {
  count: number;                 // paper: 35_000
  minSalary: number;             // paper: 0.9 * SALARY_CAP
  seed: number;                  // deterministic, testable
}): readonly Lineup[];           // reuses DFS_SLOTS feasibility incl. FLEX
function settleLineupFpts(lineup: Lineup, actuals: ReadonlyMap<string, number>): number;
```

**New import** `apps/web/lib/fantasy/dk-contest-results-import.ts`: parse the
standings CSV DK provides for contests the account entered (rank, entry name,
FPTS) into `fieldFpts[]`. Same posture as `dk-import.ts`: file upload, no
network, no scraping.

**Actuals mapper** `apps/web/lib/fantasy/dk-scoring.ts`: nflverse weekly
aggregates → DK-Classic FPTS per player (receptions, yards/10, TD·6, bonuses).
Needed by both the random-control settle and lineup settle.

**Benchmark protocol** (offline script `scripts/fantasy-benchmark/run.ts`,
one command per week, mirrors the paper):

1. Freeze the optimizer's lineup (cash + gpp modes) from the salary CSV before
   Thursday lock; record hash + timestamp (pre-registration discipline — same
   spirit as the MVE prereg).
2. After Monday: settle vs actuals; percentile vs (a) 35k seeded random
   lineups at ≥90% cap, (b) the real field CSV when the founder entered.
3. Append one row to a season ledger doc: week, FPTS, both percentiles + CIs,
   n. Publish the running median only with n, CI, and the paper's 31st
   percentile cited as the academic baseline — through the `check-claims` gate.

**Constraint fix surfaced by this paper:** GSE's DP currently encodes no
"players from ≥2 teams/games" rule (verified 2026-08-26 — no such constraint
in `dfs-optimizer.ts`; the paper omitted it too and called itself out). A
single-team optimal lineup would be invalid on DK. Add a cheap post-check +
re-solve-with-exclusion loop (or one DP dimension) before any real-contest
entry. This is a correctness item independent of the benchmark.

**Optional (cheap) robustness port:** their modal-lineup ensemble maps to K
seeded jitters of our projection bands → K DP solves → modal lineup; our DP is
fast enough. Ship only if projections gain a real uncertainty model.

**Gates:** all offline/R&D; real-money contest entry (even $0.25) is a
founder action; published percentile claims go through check-claims and must
carry n + CI; no DK data beyond account-own CSV exports.

---

## 4. Effort estimate

- `percentile-benchmark.ts` + tests: **~0.5–1 day**.
- `dk-scoring.ts` actuals mapper on nflverse aggregates + tests: **~1 day**.
- Contest-results CSV import + tests: **~0.5 day**.
- Two-team constraint fix in the DP + tests: **~0.5 day**.
- Weekly script + ledger doc template: **~0.5 day**.
- Total: **~3–3.5 days** build; then an in-season weekly ops loop (~15 min/wk,
  founder-gated for real-field weeks).

---

## 5. What we deliberately skip and why

- **Their MILP** — our exact DP dominates it (native FLEX vs their 3-run
  enumeration; exact stacking; deterministic), and `intlinprog`/Matlab has no
  place in this stack.
- **Their 43-feature NN, for now** — it *underperformed*: player-level
  predictions "generally poor," every weekly actual below their own 2.5th
  percentile band. Rebuilding projections belongs to the E2 covariate ladder
  (nflverse features, walk-forward admission via trials-registry), not to a
  1:1 port of a model the source paper itself couldn't validate. Their
  feature list (esp. Vegas lines as features) is kept as candidate covariates.
- **Their Google Fusion Tables / Football Outsiders / rotoguru scrape stack**
  — dead or uncleared sources; nflverse + The Odds API + DK CSVs cover the
  same ground within our clearance regime.
- **Simulated FanDuel contests & payout-maximizing stochastic variants**
  (their §4 discussion) — interesting later (GPP vs cash objective already
  exists in our optimizer as modes); benchmark honesty first, EV-shaping
  second.
- **Weeks-with-scratches exclusion policy** — we adopt the stricter form:
  publish every entered week, flag scratches in the ledger instead of dropping
  the week (dropping your two worst-luck weeks is a tout move; the ledger is
  supposed to be unfakeable).
