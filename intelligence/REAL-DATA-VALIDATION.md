# REAL-DATA VALIDATION — GSE intelligence build

**Provenance:** real-data validation lead, 2026-10-02. Re-runs the build's key gates on REAL nflverse data after synthetic-DGP validation. Every verdict below is grounded in a tool result captured this run; inference is marked as inference. No test was modified. Scratch scripts used for evidence: `tests/e2e/real_data_t1.py`, `tests/e2e/real_data_classifier_fixture.py` (named so pytest does not collect them).

**Data in scope:**
- `~/workspace/coaching-tendencies/data/pbp_2022..2026.parquet` (2026 = weeks 1–3 only)
- `~/workspace/qb-behavioral-profiles/data/pbp_2010..2026.parquet`
- `~/workspace/gse-intelligence-build/qb-behavior/data/` (int_cells.csv 302k rows, qb_weekly.csv, trust_weekly.csv, protection_stress.csv)
- `~/workspace/gse-intelligence-build/coaching/data/` (12 CSVs incl. second_and_short.csv, tempo.csv)
- Providers: `coaching/provider.py::CoachingEngineProvider`, `trust-signals/provider.py::FileStoreTrustSignalProvider` (empty intake store), `qb-behavior/src/qb_behavior/situational/provider.py::SituationalQBProvider`. No real OL provider exists — see Gap 1.

**Already verified by the coordinator (not redone):** CLE 2026 weeks 1–3 quick-game proxy = 0.639, avg air yards = 6.12; PIT = 0.491 / 8.90 — T1 fixture numbers reproduce exactly from `pbp_2026.parquet`.

---

## Gate 1 — T1 funnel-kill on real providers — **PARTIAL**

### Headline (PIT@CLE Week 4 fixture exactly as specified, REAL providers, ol=None)

`integration.analyze()` returned **label=INVALID** with an empty levels list. Checklist verdicts:

| track | fixture run | max-real variant |
|---|---|---|
| qb_behavior | DATA-GAP | CLEAR |
| coaching_scheme | DATA-GAP | CLEAR |
| offensive_line | UNCHECKED | UNCHECKED |
| trust_signals | CLEAR (intake swept, nothing material) | CLEAR |
| scheme_matchup | NOTHING-MATERIAL | NOTHING-MATERIAL |

**The funnel does NOT die on real data — and it also does not get recommended.** The neutralization chain (`build_causal_chains`) requires an OL provider serving non-empty `starters_out`; with no OL provider no chain is built, so no breaking conditions are evaluated and the L4 adversary has nothing to kill. The checklist gate then correctly marks the trace INVALID (spec §5: UNCHECKED at L3+ is never downgraded silently). This is the safe direction: the system refuses to reason about a pressure-funnel card it cannot fully check. But it is NOT the T1 funnel-kill — on real data the kill mechanism cannot fire at all.

### Why the fixture run shows DATA-GAP (both honest, both fixable-without-fakery)

1. **qb_behavior DATA-GAP (fixture):** the fixture uses slug ids (`deshaun-watson`, `aaron-rodgers`); the real store is keyed on nflverse GSIS ids. Real ids are `00-0033537` (D.Watson, CLE) and `00-0023459` (A.Rodgers, PIT) — found in `qb-behavior/data/qb_weekly.csv` for 2026. This is an id-vocabulary mismatch, not a data absence.
2. **coaching_scheme DATA-GAP (fixture):** `get_scheme_fingerprint(team, week=4, 2026)` raises DataGapError — the provider demands an exact weekly row and `pbp_2026` covers weeks 1–3 only. It has **no point-in-time fallback**, while the QB provider does (`weekly_row` serves latest week ≤ requested). Inconsistency worth fixing, not a data absence.

### Max-real variant (GSIS ids, week=3 — latest charted week, otherwise the same card)

qb_behavior CLEAR, coaching_scheme CLEAR, trust CLEAR. Real served values:

| entity | quickgame | avg air yds | ttt | edpr | epa/db | INT clean/pressured |
|---|---|---|---|---|---|---|
| CLE scheme | **0.6452** | 5.55 | None | 0.5349 | — | — |
| PIT scheme | 0.3333 | 11.91 | None | 0.5909 | — | — |
| D.Watson | — | adot 5.61 | — | — | 0.0251 | 1.03% / **4.43%** |
| A.Rodgers | — | adot 9.51 | — | — | -0.1836 | 1.54% / 0.65% |
| T.Monken | — | — | — | **0.562** | — | — |

Breaking-condition status on REAL data:
- **quick-game ≥ 0.60: MET (COMPUTED).** CLE 0.6452 (week-3 grain); the coordinator's season-to-date 0.639 also confirms. Both threshold + falsifier margin (0.55) clear.
- **TTT ≤ 2.3s: UNVALIDATED — never green.** `ttt_seconds` is `None` on the real provider (charting-gapped; NGS internal-only per doctrine). Per the contract, an unevaluable condition never counts as met — it is silent, not satisfied. The T1 worked example's "both thresholds were satisfied" was a synthetic stipulation.
- **OL deficiency: UNCHECKED / DATA-GAP (unclosable from this corpus).** All five pbp seasons scanned: zero injury columns (`dnp`, `practice_status`, `out`, `questionable`, `doubtful`, `injury_report` — none exist). No real `OLProvider` can be built from nflverse pbp; inventing injuries is not on the table.
- Watson's real INT splits (1.03% clean / 4.43% pressured) sit inside the spec's fixture ranges (0.8–3.2% clean, 3–5% under hit) — the L4 counter-argument's numeric premise holds on real data.

### What's needed to close T1 on real data
1. An OL/injury data source (practice-report ingestion, sportsbook injury lists, or a licensed feed) — without it the neutralization chain is structurally unbuildable and every pressure thesis is unanalyzable (currently: safely INVALID).
2. TTT from a non-nflverse source (NGS, which the doctrine holds internal-only) or a proxy promoted with a stated error model; the quick-game-only restatement (`fingerprint.t1_fixture_check()`) is the interim.
3. Decide the provider grain contract: point-in-time fallback for `get_scheme_fingerprint` (matching the QB provider) so Week-4 fixtures serve weeks-1–3-latest instead of DATA-GAP.
4. A QB id-vocabulary contract between fixtures and the real store (GSIS ids vs slugs).

---

## Gate 2 — Coaching τ̂ gates on real nflverse pbp — **VALIDATED**

All 4 tests in `tests/test_coaching_gates.py` pass under the venv (run 2026-10-02, 34s):

| gate | contract | measured | verdict |
|---|---|---|---|
| G_tau | τ̂ rule beats WP-max by ≥3pp Hamming, opponent half, 2024–2025 4th downs | **+6.77pp** (n=3,988; τ̂ 35.93% vs WP-max 29.16%) | PASS, margin 2.3× |
| G1 Brier | ≥5% improvement (shrunk vs raw MLE) on held-out 2026 drives | **7.28%** (n=306; shrunk 0.1621 vs raw 0.1748) | PASS, margin 1.5× |
| G2 audit | ≥80% agreement with risk-neutral reference, 200-play audit (seed 7) | **80.5%** (n=200) | PASS — margin is 1 play (0.5pp); re-audit with more seeds before treating as comfortable |
| audit pipeline | observed/optimal/τ̂-predicted/wp_gap columns; wp_gap ≥ 0 | holds | PASS |

---

## Gate 3 — Trust-signal classifier — **UNVALIDATED**

`trust-signals/classify.py` is a deterministic keyword-rule heuristic; its own header states no trained classifier exists in the corpus (challenges.md C10) and every output carries `verification=INFERENCE`. **No independently labeled corpus exists** — the intake store is empty (`~/workspace/corpus-intelligence/intake/items/` does not exist; the registry's provenance rule forbids inventing post content, and X direct fetch is blocked from this environment). Precision/recall against ground truth cannot be computed. Do not ship this as "validated."

Self-consistency exercise (not a validation): 20 hand-built items (13 REAL verbatim from the intake registry, 4 REAL-ISH from the TNF program doc, 2 SYNTHETIC fills for weather/injury language, 1 REAL-ISH; all self-labeled by the validator) → **7/20 agreement** with my own labels. Informative misses worth fixing:

- The registry's **primary OL lane misses**: "pass blocking" (unhyphenated) has no SCHEME keyword ("pass-blocking" is listed); plural "island rates" misses "island rate"; "pressures allowed" matches nothing → 3 of 4 throwthedamball OL items fell through to the MOTIVATION default (magnitude 0.25).
- Lane classes are **unreachable at the keyword layer by design**: `projection_divergence` (waldman 0/3), `historical_comp` (clawson 0/2), `trust_quote` (tnf-01 0/1) can only come from source-lane hints (`is_default_classification`) the pipeline applies — untested in this run.
- What works: injury keywords (3/3), signup/role keywords ("sign"→LINEUP, "ruptured"→INJURY 0.9, "role"→LINEUP), weather keywords (1/1), and `detect_trust_dynamics` correctly flagged negative trust on the Rodgers–Metcalf text even when `classify()` missed.
- 13 of 20 items fell through to the MOTIVATION default — the least-actionable honest bucket is also the most-visited one.

### What's needed to close the classifier
1. A labeled corpus (hand-label a few hundred real intake items; the 20-item fixture here is a seed, not a dataset).
2. Keyword-coverage pass for the registry's real lanes: unhyphenated "pass blocking", plurals ("island rates", "pressures allowed"), "1-on-1", charting language ("percentile grade", "assignment success").
3. Test the source-lane hint override path (`is_default_classification` → lane classes), which is where the waldman/clawson lanes are supposed to be rescued.
4. Then: a trained classifier gated on the labeled data (the stated future lane), with real precision/recall per signal type.

---

## Cross-cutting findings (inference, stated as such)

- **The T1 story survives in weakened form.** On real data, Monken's quick-game adjustment is real (0.639–0.645 ≥ 0.60), Watson's pressure INT split is real (4.43% vs 1.03%), and PIT's rush is a real top-5 unit — but the chain that kills the funnel cannot be constructed without OL injury data, and the second breaking condition (TTT) cannot be evaluated without NGS. The build's honest posture is therefore: no card on this thesis until the OL track is sourced. That is a feature of the checklist, not a bug.
- **The audit-challenge standard applies to the fixture numbers too.** The coordinator-verified 0.639/6.12 come from season-to-date aggregates; the real provider's week-3 weekly grain says 0.6452/5.55. Both clear the threshold, but the build should pick one grain and say so.
- **TTT is the deeper gap than OL.** OL can be patched with public practice reports; TTT is charting data that only exists in NGS (internal-only per doctrine). The quick-game-proxy restatement is the honest interim — but it is one breaking condition, not two, and the contract must say that.

## Verdict table

| gate | verdict | real numbers | missing data | to close |
|---|---|---|---|---|
| T1 funnel-kill | **PARTIAL** | quick-game ≥0.60 MET (0.6452); Watson INT 4.43% pressured / 1.03% clean; trace INVALID (never recommended) | OL injuries (none in nflverse); TTT (NGS-only); week-4 grain | OL source; TTT source or proxy with error model; point-in-time fallback; id-vocabulary contract |
| Coaching τ̂ gates | **VALIDATED** | +6.77pp Hamming; 7.28% Brier; 80.5% audit | — | re-audit G2 at more seeds (0.5pp margin) |
| Trust classifier | **UNVALIDATED** | keyword heuristic, 7/20 self-consistency, 13/20 fall through to MOTIVATION | labeled corpus; real intake items | labeled set; keyword coverage; lane-hint path test; trained model |

*Rule followed throughout: a gate that can't be validated for lack of data is marked UNVALIDATED — never green, never faked.*
