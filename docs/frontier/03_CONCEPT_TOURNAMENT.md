# 03 · Concept Tournament

PROJECT PARALLAX · Pass 2 (divergent invention) → Pass 3 (novelty tournament) → 3 finalist systems.
Filtered against `02_NOVELTY_LEDGER.md` (no concept may merely re-skin prior art).

Each concept carries: **need · interaction · in→out · object · data · authority/proof · falsifier ·
failure · moat · flywheel · revenue · load · slice.** (Compact form; fields inline.)

---

## Pass 2 — 60 concepts across 6 domains

### Domain 1 — Observation (what was knowable, and to whom)

1. **Time Lens** — *need:* know what was knowable at T. *interaction:* scrub a timeline; the board
   re-renders to T. *in→out:* (decision, T) → belief-state-at-T. *object:* temporal light-cone filter
   over fact timestamps. *data:* per-fact `observedAt`. *authority:* future facts excluded by
   construction. *falsifier:* any post-T fact altering the card → fail. *failure:* missing timestamps →
   downgrade. *moat:* requires point-in-time capture nobody stores. *flywheel:* every snapshot deepens
   the light-cone corpus. *revenue:* Pro. *load:* one slider. *slice:* fixture week, 4 timestamps.
2. **Observer Arena** — *need:* see who believed what. *interaction:* toggle sportsbook / fantasy /
   crowd / GSE frames side-by-side. *in→out:* (game) → {observer→belief}. *object:* observer belief
   vector. *data:* market line, ADP/ECR, roster%, GSE read. *authority:* each frame labeled by source
   rights. *falsifier:* a frame with no source → hidden. *moat:* multi-frame capture. *flywheel:*
   disagreement residuals. *revenue:* Pro. *load:* 4 chips. *slice:* one player, 4 frames.
3. **Source Race** — *need:* which source moved first. *interaction:* watch sources arrive on a track.
   *object:* arrival-ordering over sources. *falsifier:* reordering changes nothing → not a race.
   *moat:* timestamped ingestion. (exists in runtime — surface it.)
4. **Knowability Meter** — per-card "how much of what mattered was knowable at lock." *object:* covered
   fact-mass / required fact-mass. *falsifier:* meter 100% but a required group missing → bug.
5. **Provenance X-ray** — hover any number → its endpoint, rights, derivation, freshness. *object:*
   `FactSupplyPath`. *moat:* per-fact provenance. (extend existing.)
6. **Blind-Spot Map** — show the facts we *cannot* see (DO_NOT_USE / not-acquired) as explicit holes.
   *object:* supply-graph complement. *falsifier:* a "hole" we actually have → bug. *novel:* honesty as UI.
7. **Freshness Horizon** — visualize each fact's decay clock; stale → greyed. *object:* freshness policy.
8. **Disagreement Index** — one scalar: how far apart the observers are. *object:* dispersion of belief
   vector. *falsifier:* index 0 but frames differ → bug.
9. **Quiet Board** — default view shows *only* what is knowable + permitted; everything else is a
   labeled absence. *moat:* restraint. *load:* near-zero.
10. **Witness Log** — append-only record of every fact as it became knowable. *object:* event log.

### Domain 2 — Decision (claim-bounded, authority-gated)

11. **Authority Autopsy** — *need:* why is the claim only this strong? *interaction:* expand a card →
    the 8-layer ladder with the **binding** layer lit. *in→out:* (card) → ceiling + binding layer +
    trace. *object:* **AuthorityVector composition** (closes GAP-1). *data:* the 8 layers. *authority:*
    is itself the authority object. *falsifier:* ceiling ≠ meet of layers → fail (tensor theorem).
    *moat:* nobody composes 8 layers visibly. *flywheel:* refusals logged. *revenue:* trust → Pro.
    *load:* one expander. *slice:* one card, live meet. **← architectural keystone.**
12. **Why-Not-Stronger** — the inverse: what evidence would lift the ceiling one rung. *object:* the
    weakest binding layer + its unlock. (exists — elevate.)
13. **Refusal Proof** — a PASS/TRAP/NEEDS_LIVE_DATA card rendered as a *valuable* verdict with its
    falsifier shown. *object:* refusal record. *novel:* refusal as product, not silence.
14. **Decision Black Box** — record {requested, permitted, binding, evidence, sources, counterfactuals,
    autopsy} per decision. *object:* replayable decision object. *moat:* the record itself.
15. **Claim Ladder** — show the rungs a claim climbed (INFO_ONLY→…→PUBLIC_ACTION) and where it stopped.
16. **Contradiction Card** — when sources conflict, *surface* it, never average. *object:* DATA_CONFLICT
    compiler. *falsifier:* averaged output → fail.
17. **Lifecycle Tracker** — every decision must pass detect→prosecute→permit→express→autopsy; show stage.
18. **Permission Gradient Dial** — the continuous strength under the discrete card.
19. **Ceiling Diff** — two contexts side-by-side, the ceiling delta explained by the binding layer.
20. **Owner Gate Marker** — what only the owner can move (priced/publish/live), shown but inert.

### Domain 3 — Counterfactual simulation (fork one condition, propagate)

21. **Reality Fork** — *need:* what if one condition changes. *interaction:* flip WR1 active→inactive
    (or line, weather, role, salary, ownership). *in→out:* (state, intervention) → forked state +
    propagated deltas across role/props/team-total/fantasy/DFS + authority change + decision-state
    change. *object:* **causal intervention `do(x)`** over a conservation-constrained propagation graph.
    *data:* role-redistribution priors, market map. *authority:* fork inherits the meet; fixtures stay
    INFO_ONLY. *falsifier:* propagation violates conservation (targets/yards don't sum) → reject;
    invalid intervention (conditioning, not do) → reject. *failure:* missing prior → refuse the fork.
    *moat:* conservation-constrained sports causal graph + authority inheritance. *flywheel:*
    fork-vs-outcome residuals. *revenue:* the signature paid interaction. *load:* one toggle, one
    consequence cascade. *slice:* **the chosen vertical slice.** **← signature.**
22. **Possibility Surface** — not one answer but the *space*; map the boundary where the action flips.
    *object:* decision-boundary over an intervention axis. *falsifier:* boundary doesn't move the action
    → not a boundary. *novel:* sell the boundary, not the point.
23. **Line-Death Replay** — fork the line backward: when did the edge die? *object:* CLV over time.
24. **Cascade Inspector** — show *which* downstream quantities a fork touched and by how much.
25. **Conservation Check** — visible proof a fork conserved team yards/TDs (not fantasy points).
26. **Counterfactual Twins** — two forks side-by-side (WR1 out vs WR2 out), compare consequence shape.
27. **Intervention Validity Lamp** — green only if the change is a valid `do()`, not a conditioning trap.
28. **Weather Fork / Pace Fork / Script Fork** — domain-specific forks feeding the same engine.
29. **Roster Fork (fantasy)** — swap a flex; watch projection distribution + correlation shift.
30. **Salary/Ownership Fork (DFS)** — fork ownership; watch leverage recompute.

### Domain 4 — Learning / memory (settle, autopsy, update — without p-hacking)

31. **Counterfactual Memory** — *need:* did the decision deserve its outcome. *interaction:* after
    settlement, replay the decision vs its fork branches. *in→out:* (decision, outcome) → credit
    verdict {earned / lucky / unlucky / correctly-refused}. *object:* outcome vs counterfactual branch
    distribution. *authority:* no single result moves a weight (FDR/confirmation window). *falsifier:*
    credit assigned on one result → fail. *moat:* the branch memory. *flywheel:* the core learning loop.
32. **Scar Ledger** — remember the traps that fooled us; downgrade their pattern next time. (exists.)
33. **Residual Telescope** — mine decision residuals our ontology can't explain; propose a *candidate*
    new signal (DRAFT only). *object:* residual cluster → symbolic-regression candidate. *authority:*
    candidate, never IMPLEMENTED without owner+FDR. *moat:* self-directed discovery. *novel:* (science
    pillar applied to sports residuals — `NOVEL-COMBINATION`).
33b. **Discovery Council** — adversarial agents argue a candidate signal's validity before it's logged.
34. **Theory Ecology** — competing internal theories earn/lose weight on settled OOS only. (exists.)
35. **Luck Subtractor** — separate skill (CLV) from luck (outcome variance) in the record.
36. **Confirmation Window** — a trend must persist N periods before it's "improving." (exists — ledger.)
37. **Alpha-Spend Budget** — every public claim spends from a multiple-testing budget. (exists.)
38. **Ghost Memory** — similarity to past failed patterns raises caution. (exists.)
39. **Autopsy Hook** — every decision object carries a deferred autopsy that fires at settlement.
40. **Calibration Diary** — public, append-only "what we got wrong and changed."

### Domain 5 — Public proof / trust (replayable, refusable)

41. **Replay Receipt** — a shareable, hash-stamped record of a decision *as it was at lock*, replayable
    by anyone. *object:* hash-chained decision object. *moat:* point-in-time + integrity. (extend proof.)
42. **Refusal Wall** — public gallery of high-value refusals ("we passed, here's why"). *novel:*
    marketing the no.
43. **Knowable-at-T Certificate** — proof a published call used only knowable-at-T facts.
44. **Boundary Card** — public artifact: "the action flips if X crosses Y." Memorable, falsifiable.
45. **Observer Disagreement Post** — "market said X, our role model said Y, here's the receipt." (INTEL_02.)
46. **Open Methodology** — publish enough to reproduce calibration. (frontier addendum.)
47. **Held-Gate Badge** — show the publish gate HELD and *why* — honesty as brand.
48. **Settled-Branch Report** — after the game, the fork that came true, scored.
49. **Calibration Curve (public)** — reliability with Wilson bands, alpha-spent.
50. **Integrity Replay** — re-hash a receipt in-browser, match the chain. (frontier addendum.)

### Domain 6 — Culture / brand / interaction (the category move)

51. **The Fork** — one gesture (flip a condition, watch reality bend) as the brand's iconic verb.
52. **The Held Gate** — the visual of a gate that *refuses* — the anti-tout identity.
53. **Parallax motif** — two viewpoints, one object: depth from disagreement. Visual + name.
54. **The Light-Cone** — the recurring shape: a cone of the knowable narrowing to a decision.
55. **Quiet→Depth** — surface calm, one tap to full proof (5-sec value, full inspectability).
56. **Refuse-and-mean-it onboarding** — the first thing a user sees is the product *declining* to
    overclaim, then showing why. *novel:* trust by stolen-thunder.
57. **Observer color system** — each observer a fixed hue; disagreement is literally visible.
58. **The Creed** — six words the product earns by behavior.
59. **Launch film: "Rewind the Lie"** — dramatize a tout's deleted loss vs a replayable refusal.
60. **No-logo recognition** — the parallax/light-cone form recognizable without a wordmark.

---

## Pass 3 — Tournament (score 0–10 across 15 dimensions; cut < 8.0 avg)

Dimensions: novelty · decision-value · memorability · math-depth · falsifiability · flywheel ·
proprietary-data · compression · ease · arch-fit · safety-fit · commercial · copy-difficulty ·
auto-improve · launchable-pre-projections.

**Scoring summary (avg of 15; only ≥8.0 advance):**

| Concept | Avg | Note |
|---|---|---|
| 21 Reality Fork | **9.3** | signature; causal+conservation+authority fusion |
| 11 Authority Autopsy | **9.1** | architectural keystone (closes GAP-1) |
| 31 Counterfactual Memory | **8.9** | the learning loop; proprietary residuals |
| 1 Time Lens | **8.8** | point-in-time, structurally honest |
| 2 Observer Arena | **8.7** | multi-observer; disagreement = product |
| 13 Refusal Proof | **8.6** | refusal as value; anti-tout |
| 22 Possibility Surface | **8.5** | sell the boundary not the point |
| 14 Decision Black Box | **8.5** | replayable object; the record |
| 33 Residual Telescope | **8.3** | self-discovery (gated, DRAFT) |
| 41 Replay Receipt | **8.2** | public proof, hash-chained |
| 16 Contradiction Card | **8.1** | conflict not average |
| 51 The Fork (brand) | **8.0** | iconic verb |
| 6 Blind-Spot Map | 7.9 | honest, but supporting |
| 42 Refusal Wall | 7.8 | marketing surface, derivative of 13 |
| 35 Luck Subtractor | 7.7 | inside 31 |
| (others) | <7.7 | fold into the 12 or cut |

**12 finalists:** 21, 11, 31, 1, 2, 13, 22, 14, 33, 41, 16, 51.

## Red-team of the 12 (12 lenses, compressed)

- **Statistician:** 31/33 must carry FDR + confirmation window or they p-hack → enforced via the
  Intelligence Ledger; 21's propagation needs intervals, not point estimates → require conformal bands.
- **Causal scientist:** 21/22 must reject *conditioning-masquerading-as-intervention* → add an
  intervention-validity check; counterfactuals must declare changed assumptions.
- **Data engineer:** 1/2/41 need point-in-time persistence that the repo only *catalogues* (0 LIVE) →
  slice runs on fixtures with the *same* light-cone code, live-path designed not activated.
- **Sports-market expert:** 21 is only credible if conservation holds (yards/TDs, not fantasy points)
  → conservation check is non-negotiable.
- **Compliance attorney:** 13/41/47 must never imply live advice → fixture watermark + authority meet.
- **Investor:** the moat is 31's proprietary residual/branch memory + the point-in-time corpus, not any
  single pillar → emphasize the loop.
- **Competitor-copyist:** can copy 1, 2, 13 surfaces cheaply; **cannot** cheaply copy the *fused* loop
  (21+31+authority+point-in-time) without our captured corpus and composition object → fusion is the moat.
- **Founder-with-no-cash / solo operator:** everything must run at $0 on fixtures, no new infra →
  slice is fixture-only, extends existing packages.
- **Skeptical user / product designer:** 5-second value (one fork, one consequence) with full proof one
  tap down → Quiet→Depth (55) is mandatory.

## Reduction to 3 coherent systems

Each finalist system has: one law · one central object · one signature interaction · one public
artifact · one flywheel · one proof · one learning · one wedge · one enemy · one ≤6-word creed.

### System 1 — **PARALLAX (The Reality Instrument)**  ← finalist
Law: *Conserved Authority + valid intervention.* Object: the **replayable, time-aware, multi-observer
Decision Object** with an **AuthorityVector** composition. Interaction: **Reality Fork** (+ Time Lens +
Observer Arena). Artifact: the **Boundary/Replay receipt.** Flywheel: **counterfactual residual
memory.** Proof: authority autopsy + hash-replay. Learning: residual→discovery (DRAFT). Wedge:
"the instrument that refuses." Enemy: the confident tout who deletes losses. Creed: **"See what was
knowable. Fork it."** (folds concepts 21,11,31,1,2,13,22,14,33,41,16,51 — *all twelve finalists*).

### System 2 — **The Calibration Republic** (forecasting-first)
Law: *only settled, calibrated, alpha-spent claims may speak.* Object: public calibration ledger +
community tournament. Interaction: submit/score forecasts. Enemy: unfalsifiable confidence. Weakness:
**no causal/counterfactual engine; needs scale + settled history we don't have (0 settled).** Strong,
but it is a *forecasting platform*, not a category-redefining instrument — and it leans on a crowd we
must first acquire.

### System 3 — **The Provenance Vault** (proof-first)
Law: *every number is replayable to its source.* Object: hash-chained provenance + source X-ray.
Interaction: replay/verify a receipt. Enemy: opaque "trust me" data. Weakness: **descriptive, not
counterfactual; it proves the past but does not let you fork it** — closer to W3C PROV / FDR prior art,
lowest novelty of the three.

**Carried to Pass 4 synthesis:** all three, with PARALLAX as the working winner to be defended or
displaced. See `04_MASTER_THESIS.md`.
