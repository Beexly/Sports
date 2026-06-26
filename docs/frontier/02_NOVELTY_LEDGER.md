# 02 · Novelty Ledger

PROJECT PARALLAX · honest novelty classification. **No unsupported "first-of-kind" language.**
Sources: verified prior-art research (Pass 1, web-working) + repo reality (Pass 0).

> The governing rule, stated once: **every individual capability PARALLAX uses is prior art.** The
> only defensible claim is *combination*. This ledger exists to keep us from confusing
> *applied-well* with *unprecedented* — and to mark exactly where the combination appears unoccupied.

Classification tags:
`TABLE-STAKES` (everyone should) · `KNOWN-RARELY-APPLIED` (known, few do it well) ·
`NOVEL-COMBINATION` (known parts, unseen fusion) · `POSSIBLY-FIRST-OF-KIND` (no prior art found,
absence-of-evidence not proof) · `PRIOR-ART-FOUND` (someone owns it) · `NOT-YET-VERIFIED` ·
`REJECTED-AS-THEATER`.

---

## A. The six pillars, each judged against prior art

| Pillar | Individual prior art (verified) | Verdict on the *pillar* |
|---|---|---|
| Counterfactual validity (`do(x)` vs conditioning, unit-level) | Pearl SCM; DoWhy (4-step + refutation); EconML CATE | **PRIOR-ART-FOUND.** We must *reuse* the definition, not claim it. |
| Replayable decision black box | Aviation FDR/CVR; W3C PROV; RO-Crate; hash-chained provenance | **PRIOR-ART-FOUND.** "Record-everything, replay-later" is decades old. |
| Abstention / refusal as output | Chow (1957) reject-option; SelectiveNet; selective prediction | **PRIOR-ART-FOUND.** Abstention is a settled primitive. |
| Point-in-time / knowable-at-T belief, scored | Metaculus / Good Judgment / INFER (recency-weighted median, time-weighted scoring) | **PRIOR-ART-FOUND** for forecasting; **KNOWN-RARELY-APPLIED** in sports decision tools. |
| Concept/law discovery from residuals | PySR, AI Feynman (symbolic regression); AI co-scientist, Sakana, POPPER (falsification + Type-I control) | **PRIOR-ART-FOUND** in science; **NOT-YET-VERIFIED** as applied to a consumer decision residual loop. |
| Multi-observer belief comparison | Metaculus compares forecasters; causal twins compare interventions | **KNOWN-RARELY-APPLIED.** No tool compares *observer models as counterfactual branches over one decision*. |

**No pillar is novel on its own. Do not claim otherwise anywhere in product or pitch.**

## B. The combination — where novelty can legitimately live

| Combination claim | Evidence | Verdict |
|---|---|---|
| Causal-CF **+** point-in-time **+** multi-observer **+** abstention **+** replay **+** residual-discovery, fused in ONE instrument | No surveyed system (sports OR science) combines >3 of the 6; the literatures are siloed (causal ML / forecasting / provenance / autonomous science / selective prediction) | **NOVEL-COMBINATION** (strongly supported). |
| The same fusion aimed at a **consumer sports decision** (knowable-at-time-gated) | Causal twins target engineers; co-scientist/POPPER target scientists; FDR/PROV target investigators; Metaculus targets forecasters; sports tools (pending Pass-1b) target bettors with *none* of the science guarantees | **POSSIBLY-FIRST-OF-KIND** for the sports-consumer surface — flagged, not asserted; revisit after sports prior-art row lands. |
| Point-in-time-gated **residual → discovery → falsification (error-budgeted) → multi-observer counterfactual → abstaining-replayable decision object** as one closed loop | PySR discovers, POPPER falsifies, Metaculus times, none chain them over self-generated decision residuals | **NOVEL-COMBINATION**; the strongest single novelty axis. |

## C. What PARALLAX must NOT claim

- ❌ "We invented counterfactual reasoning / digital twins / forecasting / provenance / abstention."
  All `PRIOR-ART-FOUND`.
- ❌ "No machine has thought of this." Unfalsifiable and false in spirit — the parts are everywhere.
- ❌ "Unprecedented accuracy." We have **0 settled picks**; the publish gate is HELD; the backtest
  does not beat naive. Any accuracy claim is `REJECTED-AS-THEATER` today.
- ❌ "Real-time edge." Everything is fixture/shadow; `LIVE` activation is owner-gated and not done.

## D. What PARALLAX may claim (earned by behavior, not adjective)

- ✅ "A decision instrument that refuses, remembers, rewinds, and forks — and shows you why." Each
  verb maps to a `PRIOR-ART-FOUND` mechanism *combined* in a way no surveyed product ships.
  (`NOVEL-COMBINATION`.)
- ✅ "Point-in-time honest by construction": the temporal light-cone + authority meet make
  future-leak structurally impossible (proven by test). (`KNOWN-RARELY-APPLIED`, made `TESTED`.)
- ✅ "You can see exactly what it is *not* allowed to say." The authority composition + visible
  refusal. (`NOVEL-COMBINATION` as a user-facing surface.)

## E. Rejected as theater (kept out)

- "AI co-pilot / assistant chat over picks" — `REJECTED-AS-THEATER` (another chat box).
- "Confidence meter / model score badge" — `REJECTED-AS-THEATER` (another score).
- "Generic digital twin of a team" — `PRIOR-ART-FOUND` + `REJECTED-AS-THEATER` unless it carries the
  point-in-time + abstention + observer-comparison guarantees.
- "Unprecedented" / "first ever" copy — `REJECTED-AS-THEATER` until a patent/product sweep proves a
  negative we cannot prove.

---

## F. Sports prior-art — VERIFIED (Pass 1b complete)

18 products surveyed with live web access (`01_PRIOR_ART_AND_COMPETITORS.md`). Result:

**Confirmed PRIOR-ART-FOUND (sports) — do NOT claim novel:** point-in-time probability rewind
(Polymarket, Kalshi, Betfair, KeepTradeCut), multi-book-vs-fair grid (OddsJam, Unabated),
price=probability (markets), single-domain expert disagreement (FantasyPros), DFS custom-weighting
(FantasyLabs SimLabs), a calibration page (Polymarket `/accuracy`, Brier 0.063).

**Confirmed ABSENT across all 18 (the white space) — `NOVEL-COMBINATION`:**
1. Counterfactual **propagation** across a connected market (toggle WR1 OUT → re-derive teammates,
   team total, correlated props, line). Nobody. (Closest: SGP leg-recompute, trade-value sum — narrow.)
2. **Cross-domain** observer panel (book vs fantasy vs crowd vs own model, *diffed* not swapped). Nobody.
3. First-class **refusal** / "not enough evidence" output. Nobody (all implicit via spread/limits/sample).
4. Calibration tied to a **versioned model + public changelog**. Nobody.
5. The **fusion** of all five in one instrument. Nobody — Betfair & Unabated reach ~2.5/5.

**Verdict on the sports-consumer fusion line:** upgraded from `NOT-YET-VERIFIED` to
**`NOVEL-COMBINATION` (verified across 18 products)**, with the `POSSIBLY-FIRST-OF-KIND` tag retained
*only* for the full six-pillar fusion and flagged as a universal negative we cannot fully prove (no
exhaustive patent sweep). The four specific axes (propagation, cross-domain observers, refusal,
versioned-changelog-calibration) are the safest novelty ground.
