# 01 · Prior Art & Competitors

PROJECT PARALLAX · Pass 1 · **web access working**; rows tagged VERIFIED (primary-source URL) or
UNVERIFIED-NEG (absence-of-evidence, cannot prove a feature *doesn't* exist). Two research fan-outs:
sports products (18) and scientific/decision systems (8 areas). **Purpose: never claim novelty that
already exists.**

Legend: **CF**=counterfactual propagation · **PiT**=point-in-time rewind · **Multi-Obs**=observer
frames side-by-side · **Prov**=source-disagreement/provenance · **Refuse**=first-class abstention ·
**Track**=replayable calibrated record · **Changelog**=learns publicly. ✅ / ➖ / ❌.

---

## A. Sports products

| Product | Signature | CF | PiT | Multi-Obs | Prov | Refuse | Track | Changelog |
|---|---|---|---|---|---|---|---|---|
| Action Network | bet-tracking + public/sharp splits | ❌ | ❌ | ❌ | ❌ | ❌ | ➖ win% (deletable) | ❌ |
| Outlier.bet | prop traffic-light + EV feed | ❌ | ❌ | ❌(book-v-book) | ❌ | ❌ | ❌ | ❌ |
| FantasyPros | expert-consensus ECR | ➖ | ❌ | ➖(experts) | ✅ named experts | ❌ | ➖ accuracy≠calib | ❌ |
| RotoWire | DFS optimizer, swappable sources | ➖ | ❌ | ✅ source swap | ➖ swap≠diff | ❌ | ❌ | ❌ |
| PFF | 0–100 grades + model-v-market | ➖ sims | ❌ | ➖ betting | ❌ | ➖ "C" tier | ➖ W/L no curve | ❌ |
| FantasyLabs | **slider-weighted model** + SimLabs | ✅ strongest CF (DFS) | ➖ historical | ➖ vendors | ➖ | ❌ | ❌ | ➖ feature blog |
| Sleeper | social leagues + Picks | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| KeepTradeCut | dynasty crowd value | ➖ trade calc | ✅ value-over-time | ❌ crowd-only | ❌ | ❌ "gut check" | ❌ | ❌ |
| Underdog | best-ball + Pick'em + markets | ➖ retro-optimizer | ❌ | ❌ | ➖ unofficial | ❌ | ❌ | ❌ |
| DraftKings | SGP + DFS | ➖ leg recompute | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| FanDuel | SGP + live betting | ➖ leg recompute | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| OddsJam | +EV / arb / odds-compare | ✅ calc suite | ✅ line history/CLV | ✅ books-v-fair | ➖ Pinnacle anchor | ❌ | ➖ no curve | ❌ |
| Unabated | sharp "Unabated Line" grid | ✅ alt-line what-if | ✅ price history | ✅ books-v-fair | ✅ **strongest** anchors | ❌ | ❌ | ❌ proprietary |
| Pinnacle | sharp low-margin book | ❌ | ➖ concept | ❌ | ❌ | ❌ | ➖ CLL benchmark | ❌ |
| Betfair Exchange | back/lay order book | ➖ hedge math | ✅ **historical archive** | ✅ crowd-v-book | ➖ microstructure | ❌ | ✅ **substrate** (sells data) | ❌ |
| Polymarket | prediction market | ➖ grouped | ✅ prob history | ❌ | ➖ oracle | ❌ | ✅ **`/accuracy` Brier 0.063** | ❌ |
| Kalshi | event-contract exchange | ➖ conditional (narrative) | ✅ historical | ❌ | ➖ settlement | ❌ | ➖ NBER claim | ❌ |
| Establish The Run | timed projections | ❌ explicit "no what-if" | ➖ timed | ❌ explicit "no multi-source" | ❌ | ❌ explicit "no uncertainty" | ➖ self-report | ❌ |

**Sports synthesis.** TABLE-STAKES (prior art, do not claim): point-in-time probability rewind
(Polymarket/Kalshi/Betfair/KTC), multi-book-vs-fair grid (OddsJam/Unabated), price=probability
(markets), single-domain expert disagreement (FantasyPros), DFS custom-weighting (FantasyLabs), a
calibration page (Polymarket `/accuracy`). **ABSENT across all 18:** (1) counterfactual *propagation*
across a connected market; (2) *cross-domain* observer panel (book vs fantasy vs crowd vs own model,
diffed); (3) first-class *refusal*; (4) calibration tied to a *versioned model + public changelog*.
Closest: **Betfair** and **Unabated**, each ~2.5 of 5; neither propagates, refuses, or narrates
calibration. **No product puts all five in one instrument.**

## B. Scientific & decision systems

| System | Owns | CF | PiT | Abstain | Replay | Discover |
|---|---|---|---|---|---|---|
| AI co-scientist (DeepMind) | Elo-ranked hypothesis generation | ~ | ❌ | ❌ | ~ | ✅ |
| Sakana AI Scientist v2 | autonomous paper (passed a workshop review) | ❌ | ❌ | ❌ | ~ | ✅ |
| POPPER (Stanford) | agentic falsification w/ Type-I error control | ~ | ❌ | ~ | ~ | ~ |
| Robot Scientists Adam/Eve | closed physical hypothesis→test loop | ~ | ❌ | ❌ | ~ | ✅ |
| Pearl SCM / do-calculus | **definition of a valid counterfactual** | ✅ | ❌ | ❌ | ❌ | ❌ |
| DoWhy (PyWhy) | model→identify→estimate→**refute** | ✅ | ❌ | ❌ | ~ | ❌ |
| EconML | heterogeneous treatment effects (CATE) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Causal Digital Twins | validated CF simulation of a system | ✅ | ~ | ❌ | ~ | ❌ |
| Model/Data Cards · SR 11-7 | model-lifecycle documentation/governance | ❌ | ~ | ~ | ~ | ❌ |
| Flight Data Recorder / CVR | tamper-evident replayable event record | ❌ | ✅ | ❌ | ✅ | ❌ |
| Metaculus / GJ Open / INFER | scored, aggregated, time-resolved belief | ❌ | ✅ | ~ | ✅ | ❌ |
| W3C PROV / RO-Crate | provenance model + reproducibility | ❌ | ~ | ❌ | ✅ | ❌ |
| PySR / AI Feynman | interpretable law extraction (SR) | ❌ | ❌ | ❌ | ~ | ✅ |
| Selective prediction (Chow'57 / SelectiveNet) | **abstention-as-output** w/ risk-coverage | ❌ | ❌ | ✅ | ❌ | ❌ |

**Science synthesis.** Every pillar is owned by a *different* community: counterfactual validity
(Pearl/DoWhy/EconML), replay (FDR/PROV), abstention (Chow/SelectiveNet), point-in-time calibrated
belief (Metaculus), discovery-from-residuals (PySR/co-scientist/POPPER). **No surveyed system combines
more than ~3 of the 6.** The literatures are siloed.

## C. The decisive negative (the white space)

> **No system in any surveyed domain — sports or science — fuses counterfactual *propagation* +
> point-in-time knowability + cross-domain multi-observer comparison + first-class refusal + a
> replayable decision object + residual-driven concept discovery, in ONE instrument.** The capabilities
> exist; the *welding* does not. (VERIFIED-NEG across 18 products + 8 science areas; absence-of-evidence
> for the universal negative, which we flag rather than overclaim.)

## D. What this licenses PARALLAX to claim — and forbids

**May claim (integration + four specifics), tagged NOVEL-COMBINATION:**
1. Counterfactual **propagation** across a connected sports market (not leg-stacking/trade-summing).
2. **Cross-domain** observer juxtaposition (book vs fantasy vs crowd vs own model, *diffed*).
3. First-class **refusal** as a recorded, scored verdict.
4. Calibration tied to a **versioned model + public changelog**.
5. The **fusion** of these + point-in-time + replay in one instrument.

**Must NOT claim (PRIOR-ART-FOUND):** inventing counterfactuals, digital twins, point-in-time rewind,
price=probability, multi-book comparison, abstention, provenance, calibration pages, or symbolic
discovery. And no accuracy/edge claim while the gate is HELD and settled-n = 0.

*Primary-source URLs are retained in the research transcripts; key anchors: Pearl SCM, DoWhy refutation
suite, FDR/CVR, Metaculus recency-weighted median, Chow 1957 reject-option, PySR, Polymarket `/accuracy`,
Unabated line grid, Betfair Historical Data.*
