# Phase Build 2026-07-02 — SlateCommitment wiring, K2/K9/K10/K11, CLV decomposition

Executed from the approved plan (flickering-bubbling-spindle). Everything below
is dark/additive: no live flag flipped, no money touched, no new public claim
beyond the gated policy surfaces that already existed.

## Shipped (commits f2896a57, 7c631740, d0c91397 + the hostile-review fix round)

**Phase 0 — SlateCommitment wired (the built-but-never-called Merkle
pre-registration now runs).** Per-sport, per-UTC-day, idempotent, atomic
(create + receipt backfill in ONE $transaction), non-fatal to ingestion.
Public lookup at /api/verify/slate (root/count/committedAt + pickId/contentHash
fingerprints only — sealed fields never leak; completeness disclosed when the
receipt index disagrees with the committed count). HOSTILE-REVIEW FIX baked
in: each run attempts BOTH today's and tomorrow's UTC slates — without it,
every slate containing an early-UTC kickoff (NFL primetime, NBA/MLB west-coast
nights) would have SKIPped forever, silently. Freeze outcomes now surface in
the cron result (freeze[]), not just logs. One receipt one slate (postponement
guard: slateKey-null filters on leaves + backfill).

**Phase 1 — source-scoring reconciliation (doc-only).** The three coexisting
modules now cross-reference each other; source-reliability.ts marked UNWIRED
pending its (separately scoped) telemetry-accrual layer.

**Phase 2 — K9 + K10.** Coverage proof now spans Exp(1) skew, Pareto(4) heavy
tail, and an exact break-even -110 regime with the AND-gate false-profit rate
asserted (observed 0.0000 vs 0.05 ceiling). tStarSkewness pivot diagnostic on
the studentized receipt — withheld (undefined) on degenerate/too-small/zero-
spread pivot sets rather than publishing a fake "symmetric" 0.

**Phase 3 — K2 coverage self-audit.** bcaCoverageSelfAudit /
studentizedCoverageSelfAudit: resample the ledger's own empirical distribution,
report realized coverage of the ledger's own mean, verdict
CALIBRATED/BORDERLINE/UNDERCOVERING. Engine-only, batch-tier, unwired by design.

**Phase 4 — K11 anytime-valid ledger (the crown jewel).** Testing-by-betting
e-process (Ville's inequality) over bounded rescaled returns; empirical-Kelly
PREDICTABLE betting (validity independent of tuning); anytime lower bound via
certified-rejected bracket+bisection; NO RNG — closed-form from the ordered
ledger. PROVEN BY EXECUTION: worst-case adversarial peeking over 2000
break-even ledgers → FP 0.0195 vs 0.05 budget; mixed-odds (+400) variant FP
0.0150; power 0.72 on a +8pp edge over 500 picks; bound violations 0.0325 vs
0.05; a straight-line hand-computed 3-observation recursion pin. Policy tier
`anytimeEvidence` is ADDITIVE (never part of clearsProfit); public sentence
only when the fixed-sample gate AND the sequential test agree; raw e-values
operator-only. Load-bearing loader fixes: `orderBy: [{settledAt asc},{id asc}]`
(TOTAL order — settle-sport stamps one settledAt per game, so ties are
systematic) and a FIXED a-priori range (20u) so no bet ever depends on future
observations.

**Phase 5 — CLV decomposition.** decomposeClv: association (never causation)
split of realized CLV into an information coefficient (lock-time proxies, no
leakage), a liquidity coefficient (book disagreement), and an unexplained
residual NEVER labeled public/sharp/square money (market-memory.ts discipline,
enforced by a banned-words test). Paired bootstrap via index-encoding through
the existing bcaCi. The DB loader (Pick+receipt+snapshot+odds join) is the
separately-planned follow-on; the pure module ships now.

## Second hostile round (fix-of-the-fixes) — VERDICT: sound, 3 hardenings applied

A fresh hostile reviewer attacked the fix round itself (fixes introduce bugs).
Verdict: no regressions, all seven attack vectors survived or reduced to
operational hardenings — all three now applied:
- F1: the 10:00 UTC refresh cron was a single point of loss for early-UTC
  slates. The freeze pass (idempotent) now ALSO runs from the 07:00 UTC
  settle-picks cron — a redundant second shot.
- F2: unconditional day-early freezing shrank the pre-registered population.
  Tomorrow's slate is now frozen early ONLY when its earliest kickoff precedes
  its own day's run reach (10:00 UTC + 2h margin); safely-waitable slates
  capture their full same-day population. New DEFERRAL test pins it.
- F3: the freeze test's receipt mock now honors the gameId filter, so leaf
  scoping is actually asserted (the primetime test previously leaked today's
  receipts into a tomorrow slate).
Highest-risk item cleared end-to-end: the /verify/slate re-fold is consistent
because buildSlateCommitment never re-sorts, contentHash IS hashLeaf(pickId,
payload) at mint, and both freeze and route order by pickId asc on the same
unique column in the same DB.

## Adversarial verification (3-agent hostile fleet, ~389k tokens)

The math SURVIVED: recursion predictability confirmed by independent manual
replay; OLS Cramer solve verified to 4e-15 against an independent solver;
MC-SE arithmetic recomputed line-by-line; doc-only claims proven doc-only by
diff. REAL FINDINGS FIXED in the follow-up round: the two HIGHs (UTC
day-boundary primetime gap; non-atomic create+backfill that could leave a
public count-vs-receipts mismatch that never heals) + mediums (postponement
double-commit guard, orderBy tiebreaker, fixed a-priori range for theorem-
clean Ville licensing, route completeness disclosure) + lows (vacuous seed
test, ~2-SE comment that was really ~3, u=0 reseed fragility in the Pareto
draw, lower-bound doc overstating the uniform-over-m proof — now honestly
scoped to certified-rejected + empirically-verified monotonicity).

## External-draft leverage extraction (second pass, on request)

Re-audited the AI-generated K11/Phase-0 draft package for anything undervalued:

1. **STEELMAN of the "fabricated lowerBound" verdict** (re-derived, not just
   re-asserted): the draft's `-ln(alpha)/(0.5n)` is the linearized RADIUS of a
   fixed-lambda(=0.5) e-process confidence bound — for small lambda,
   reject(m) ⟺ mean(Y) - m >= ln(1/alpha)/(lambda·n), so the true bound is
   `mean(Y) - ln(1/alpha)/(lambda·n)`. The draft dropped the CENTER (the
   mean), which is exactly why its bound was data-independent and invalid.
   Verdict unchanged (not safe to use), but upgraded: right formula family,
   missing half — independent confirmation that our full bracket+bisection
   inversion was the correct repair, not a different theory.
2. **The invented `receiptHashes TEXT[]` column contained a REAL idea**: a
   verifiable receipt index. Salvaged WITHOUT the schema change: a receipt's
   contentHash already IS its Merkle leaf, so /api/verify/slate now RE-FOLDS
   the root from the displayed fingerprints (`merkleRootFromLeafHashes`, new
   engine export) and returns `membershipVerified` — the endpoint PROVES its
   list against the commitment instead of trusting the DB relation. Tampered
   or drifted indexes now fail loudly (tested: swapped-fingerprint case).
   A snapshot column remains a possible future migration if we ever want the
   original leaf list displayable after drift; ledgered, not needed now.

## Still deferred (unchanged from the plan)

Duplicates not rebuilt (Signal Courtroom / Decision Autopsy / Bias Mirror);
source-reliability telemetry accrual (L, own task); K2 nightly cron cache;
CLV decomposition DB loader; Forecast Fitness Standard doc (after this lands);
data-blocked items (Bookmaker Fingerprints, Market Mirage, Decision Twin).
