# Challenges — Corpus Slice C10, HALF B (r31–r60)

Every challenged claim, why it fails, and the exact rehabilitation path. Ordered by
severity. Claims not listed here survived challenge at the level verified.

---

## C1. r53 L10 provider probes: self-contradictory ESPN verdict — CONTRADICTED

**The conflict** (`ops/calibration/2026-08-19-l10-provider-probes/RESULTS.md`):
- Lines 13, 41–52: probe table records ESPN **FAIL** (81.9ms, 41.4ms); detail sections
  record **HTTP 403** for the scoreboard and teams endpoints.
- Line 145: summary claims **"Live probe OK... returns 200 with JSON"**.
- Line 154: ESPN listed under "Cleared for immediate use."

Both cannot be true. The 403s are recorded in the measurement section; the "cleared" line
is in the summary — the summary was likely written against a different run or a
stale template.

**Why it matters:** ESPN is the event-identity source for game-row joins (the ESPN
event-id backfill blocker C-150 is real, per r51). Building on "cleared" while the
provider 403s would silently break every ESPN-joined row.

**Rehabilitation:** run a fresh probe now; until it returns 200, **treat ESPN as blocked**.
Do not cite line 154.

## C2. r55 public-surface specs vs the 2026-09-28 HARD doctrines — CONTRADICTED

**The conflict:**
- `product/galaxy-memory-persistence-spec.md:179`: "Memory is public. Anyone can navigate
  to /room/[gameId] for any past tracked game and see the Memory panel." Plus `/memory`
  searchable archive (lines 46, 115, 187, 194).
- `product/monetization-map.md:28,160-162`: free tier includes Public Ledger with
  **per-pick signal snapshots**, a **methodology page**, public Edge Index, Edge Lab tools.
- The 2026-09-28 HARD doctrines: public = **projections and rankings only**; all data,
  metrics, signals, and methodology **internal**. NGS doctrine: metrics never shown, not
  even a little.

The specs are product-strategy documents, not shipped code — but if they get built as
written, they violate standing doctrine. The Public Ledger's "signal snapshot" is the
sharpest conflict: a per-pick signal snapshot is methodology disclosure by another name.

**Rehabilitation:** a decision, not a default. Either (a) the specs get rewritten to the
doctrine (public = settled pick + projection, no signal snapshots, no methodology page),
or (b) Garrett amends the doctrine with explicit carve-outs. Until then, quote the
doctrine, not the specs.

## C3. r37/2047 AlphaEvolve: SR 21.3 is an in-sample-flavored, double-dipped, cost-free number — PARTIAL (headline) / VERIFIED* (mechanics)

**The problems** (all admitted in the ledger's own lines 34, 42, 45-46):
1. **Validation double-dipping:** the validation set is used *both* for fitness during
   evolution *and* for the 15% correlation cutoff.
2. **Annualized from 116 validation days** (~5 months) — a short window for an annualized
   Sharpe.
3. **No transaction costs** in the long-short evaluation.

SR 21.3 is a screening statistic, not an expected return. Quoting it as performance —
as the brief's Findings section risks when read casually — violates DISCLOSURE_COPY's
"never present an illustrative example as a live prediction" spirit.

**What survives:** the mechanics are real and portable — redundancy pruning via the
15%-cutoff weak-correlation rounds, the fingerprint cache. Adopt the *pruning protocol*,
not the number.

**Rehabilitation:** re-run on a test set that was used for neither fitness nor the
cutoff, with transaction costs, over ≥2 years. Quote only test-set SR.

## C4. r33/1804 APMM: the ~6% parlay edge is in-sample — PARTIAL

**The problems** (ledger lines 53, 62, 67, 80, 82-83):
1. **In-sample replay:** interaction parameters estimated on the same tape the maker
   prices against.
2. **Non-adversarial flow assumption** — real flow includes sharps who see the maker's
   price.
3. **Fees excluded** — the business model itself is not in the evaluation.
4. Order-5/6 ratios (0.938) on thin data.

**Rehabilitation:** walk-forward replay with fees and adversarial flow before any
production claim. The quadratic-vs-exponential loss claim is the theoretically
interesting piece; the 0.938 ratio is not evidence.

## C5. r33/1827 NeSymReS: "outperforms all baselines on all 5 datasets" is unverifiable from the paper text — PARTIAL

The ledger itself (line 39): **"exact point values are not recoverable from the text —
the rankings are the paper's stated conclusions from those curves."** The headline claim
rests on curves, not tables. The 1e-14/token skeleton penalty is a hand-tuned hack
(line 62).

**Rehabilitation:** the ledger's own bake-off gate (line 65) — within 5% test RMSE of
PySR's 30-min best at 100s budget on nflverse 2024–2025. Run that; quote only its result.

## C6. r33/1852 feature programming: 80/20 random split, no pruning — PARTIAL

The paper's eval is a **random 80/20 split, not walk-forward** — on time series, that's a
hygiene failure, not a result. No pruning mechanism exists in the paper, so the
multi-horizon +88% R² number is measured on an unpruned feature explosion.

**Rehabilitation:** causal operators + a pruning stage + walk-forward eval. Until then,
the R² deltas are screening numbers.

## C7. r34/1885 drift ensemble: deployment attribution has confounders; no significance test — PARTIAL

The ledger (line 41) acknowledges confounders in the "33% fewer major incidents" Walmart
attribution. Drift labels are label-flip injections — a coarse proxy. No significance
test that the majority-vote ensemble beats the best single detector (the headline
"top-3 on every metric" could be a small-N artifact).

**Rehabilitation:** McNemar or paired permutation test on the benchmark; treat the
deployment number as anecdotal.

## C8. r59 dk-salary-week2: TLS-impersonated client — needs Garrett's forbidden-endpoint ruling

**The fact** (dk-salary-week2-import.md): the DK salary import was verified live against
DK's own metadata (draftGroupId 154078, 1,135 draftables → 619 players) using a
**TLS-impersonated client**.

**Why it's flagged, not rejected:** the import works and the numbers are verified. The
open question is policy, not engineering: does a TLS-impersonated client against DK's
metadata endpoints violate Garrett's standing rules on forbidden endpoints / ToS
boundaries? This interacts with statking-integrity's one-line blocked-source rule
(r60:7-8) — the principle that some sources stay off-limits even via alternate routes.

**Rehabilitation:** Garrett's explicit ruling. Until then: the template is reusable for
*authorized* feeds; do not generalize the TLS-impersonation pattern to other providers
without the ruling.

## C9. r51 NFL_WEEK1_COVERAGE: the 0.58 fairProb floor structurally suppresses tight-line ML picks — design choice, not bug

**The fact** (NFL_WEEK1_COVERAGE_2026-09-08.md:93,105,115): `scoring.ts:965` —
`if (fairProb < 0.58) return null` DROPS. A −3 favorite prices ~−150/+130; de-vigged
that's 0.580 — **sitting exactly on the floor**.

This is a conservative design choice (don't publish low-confidence ML), but it has a
coverage cost that must be named: the engine structurally cannot publish moneyline picks
on tight-line NFL games. Any coverage or hit-rate accounting that doesn't disclose this
is misleading.

**Rehabilitation:** either (a) document the coverage cost explicitly in the coverage
report, or (b) replace the hard floor with the confidence-gravity mechanism (market-gravity
r41: bounded [5,85] confidence adjustments) so tight-line games publish at low
confidence instead of disappearing.

## C10. r47 keenum: n=323 targets / 10 games — suggestive, not predictive

The file itself (line 167): "Single-game variance dominates — treat the pattern as
suggestive, not predictive." The rusty-backup rule (≥8-week gap, ≥10 targets) and the
individual-player blanket finding are real patterns in a small sample. The brief is
honest about this; the challenge is to anyone tempted to hard-code it as a Phase-2
archetype without the 2026 backtest the brief's own gate requires.

**Rehabilitation:** the brief's gate — backtest the rule on 2024–2025 backup-QB returns
before it enters the QB vector.

## C11. r41 dossier-v2: the dossier's own caveat must travel with the 0.61 number

dossier-v2-methods.md:119-136: **"No peer-reviewed paper with clean forward-validation
was located... reported here with that caveat... provisional until a peer-reviewed
forward-validation study is found."** The pass-efficiency vs wins gap (0.53–0.61 vs
0.13–0.19) is the dossier's "single most actionable number" — but it is a
stability/reproducibility synthesis, and stability ≠ predictive relevance (the dossier
says this itself).

**Rehabilitation:** the forward-validation study the dossier asks for — or GSE's own:
regress future point differential on lagged passing efficiency vs rushing efficiency,
walk-forward, 2000–2025. Until then, quote the number with the caveat attached.

## C12. r54 architecture handoff: dated 2026-09-18 — re-verify before acting

The contamination punchlist (trueProb cron rewrite, cqr 83.33% coverage, null-clock
leakage hole, row-index walk-forward, market-logit shrinkage, double-inverted metrics)
is the single most important integrity finding in the half — but it is **dated
2026-09-18**. Some items may be fixed. Acting on a stale punchlist risks re-breaking
fixed code or double-counting fixed items in audit reports.

**Rehabilitation:** re-run the punchlist's file:line checks against the current tree
before citing any item as live. The two contaminations also cited in the LLM playbook
(trueProb rewrite, row-index walk-forward) are the highest-priority re-checks.

## C13. r36/2022 feature store: zero numbers, aspirational sections, unvalidated anti-leakage — PARTIAL

The paper has **no latency/throughput/consistency figures**; §3 is marked "aspirational...
not formally implemented"; merge semantics assume "no failure of dumping"; the
anti-leakage mechanism (§4.4) has **no validation that it works** (2022:28-31,47,58-61).

**Rehabilitation:** adopt the (event_ts, creation_ts) semantics and per-source delays as
design input; validate the anti-leakage rule with a synthetic leak-injection test (insert
a future-dated row, confirm it can never be read by an as-of query). Do not cite the
paper as validated architecture.

## C14. r43/2601.14727 Bradley–Terry: survey with zero new empirical evidence — PARTIAL

The ledger (line 117): **"no CLV, no Brier score, no ROI anywhere; the NFL row in Table 2
is decorative."** The three algorithms (Newman FPI, EM-MAP, PlusDC) are re-implementable
equations, not validated sports models. Two landmines the ledger itself flags: sync
Newman FPI may diverge on near-bipartite graphs (async required); vanilla MLE is
unusable early-season (Ford-condition divergence on undefeated teams — ûᵢ→∞).

**Rehabilitation:** the brief's own gate — ≥2% walk-forward Brier improvement over the
current team-strength prior on 2022–2024. Until then, the equations are candidates, not
upgrades.

## C15. Stays rejected / blocked (no rehabilitation without new evidence)

- **1631 drawdown optimizer** (other half): REJECT stands — optimizes drawdown with no
  edge input. 1749/1203 are the non-contradictory versions. Do not re-litigate.
- **RESCUE A8** (r58): stays BLOCKED — ran on a synthetic fixture. Boltzmann 0.2558 vs
  isotonic 0.2148 is evidence *against* shipping it, not a benchmark to beat later on
  the same fixture.
- **Cohort-A CLV** (r50): clearsBreakEven=false — no edge claimed, none available to
  claim.

## Challenge method note

The strongest challenges in this half came from the ledgers' and briefs' *own*
adversarial notes (2047 double-dipping, 1827 unrecoverable point values, 1804 in-sample
replay, 2022 aspirational sections, dossier-v2's missing forward-validation, keenum's
variance caveat). The verification pass treated those notes as first-class evidence —
a brief that attacks its own claim is more trustworthy, not less, and its numbers are
the ones most likely to survive contact with the build queue.
