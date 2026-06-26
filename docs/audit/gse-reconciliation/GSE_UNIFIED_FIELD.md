# GSE — The Unified Field

**One Law · Four Projections · One Instrument**
Audit of branch `claude/keen-ptolemy-t38f1g` @ `60bccd84` · authority: AUDIT-ONLY · 2026-06-26
Companion proofs: `AUTHORITY_TENSOR_PROOF.md` · `ADVERSARIAL_EXECUTION.md` · `OWNER_DECISION_BRIEF.md`
Instrument: `docs/gse-packet/observatory/GSE_FIELD_OBSERVATORY.html`

> An audit is not an inventory. The inventory is the clerk's job. This document finds the single
> law the whole organism obeys, proves every subsystem is a lawful expression of it, locates where
> the map and the territory disagree, and hands the owner a decision — nothing more, nothing less.
> It treats every prior completion claim as a hypothesis and reports only what was executed.

---

## 0. Verdict in one line

**READY_FOR_PREVIEW (audit scope).** The branch reconciles cleanly with `main` (0 behind / 74
ahead, fast-forwardable), the platform's deepest safety property is now a CI-enforced theorem
(not prose), the one fabricated-success defect in the packet (the cockpit's fake backtest) is
corrected and proven corrected by live render, and every production gate the owner reserved stays
HELD. No merge, no live data, no spend, no gate-flip was performed or is requested by this pass.
Full reasoning and the owner's one-click decisions are in `OWNER_DECISION_BRIEF.md`.

---

## 1. The One Law (Einstein — compress the machine to one invariant)

Every doc in the 25-file packet and every guardrail in the repo is the same sentence in different
costumes: *"no fake data," "server-side paywalls only," "no stale data,"* `isPublicSafe` is
fail-closed, the Authority Stack "composes downward," the One Ladder couples price to proof *from
the same milestone*, the cockpit "cannot render dishonesty," the Intelligence Ledger forbids
`t=50`. Strip the costumes and one law remains:

> **THE LAW OF CONSERVED AUTHORITY.** The strength of any expression is bounded above by the
> **meet** (greatest lower bound) of every authority that governs it. No layer can *create*
> authority; a layer can only *restrict*. Absence of evidence collapses to the bottom (fail-closed).

### 1.1 The field equation — already in the code

```
expressed_strength(O)  ≤  ⊓_{L}  ceiling_L( context(O) )
```

over the strength lattice `INFO_ONLY ⊏ WATCH ⊏ WAIT ⊏ PERSONALIZED ⊏ ACTION ⊏ PUBLIC_ACTION`,
with `⊓` = `strengthMin`. This is not aspirational. It is literally
`packages/decision-field-runtime/src/decision-authority-gate.ts`:

```ts
export function authorityCeiling(ctx: AuthorityContext): MaxPermittedStrength {
  let ceiling = dataModeCeiling(ctx.dataMode);
  ceiling = strengthMin(ceiling, modelAuthorityCeiling(ctx.modelAuthority));
  ceiling = strengthMin(ceiling, publicationCeiling(ctx.publicationAuthority));
  if (!ctx.readinessAuthorized) ceiling = strengthMin(ceiling, "WATCH");
  return ceiling;
}
```

`strengthMin` (`decision-state-stat-contract.ts`) is the meet:
`rankOf(a) <= rankOf(b) ? a : b`. Because **`meet ≤ every operand`**, authority is *conserved,
not generated* — the system's deepest safety property is a lattice identity, not a pile of `if`
checks. That single observation reorganizes the whole audit.

### 1.2 Noether symmetry — why this is physics, not bureaucracy

The system is invariant under change of **observer**: the same pick seen by a free user, a Pro
user, a public page, an admin cockpit, pre-lock or post-lock. The entitlement/publication layer
changes the *expression*; it cannot change the *earned* core set by the data/evidence/model
layers. That invariance conserves a charge — **earned authority**. The publish gate is the event
horizon where requested expression must be ≤ earned authority or nothing escapes. The One Ladder is
this charge's **time-integral**: each settled game is one quantum of earned authority;
`reduceLadder` is the accumulator; a rung-advance and a priced-flip are the *same quantum*
(invariant INV-1) because they are the same conserved quantity measured twice.

### 1.3 The Theorem — "you cannot render dishonesty," proven

`dataModeCeiling("FIXTURE") = "INFO_ONLY"`, and `INFO_ONLY ⊏ PUBLIC_ACTION`. Since
`expressed ≤ meet ≤ dataModeCeiling`, **no fixture-backed or shadow-backed output can ever reach
PUBLIC_ACTION** — not "is checked not to," but *cannot*, as a monotonicity theorem. This audit
promotes that from prose to a **machine-checked invariant** by exhaustive enumeration of the entire
authority product space (3 data-modes × 4 model-authorities × 3 publications × 2 readiness × 2
rights × 6 strengths × 14 decision-states). The proof lives in
`packages/decision-field-runtime/src/__tests__/authority-tensor.theorem.test.ts` (13 assertions,
**864 public-safety combinations checked, 0 violations**) and runs on every commit. Details:
`AUTHORITY_TENSOR_PROOF.md`.

### 1.4 The Four Projections — one law seen from four sides (the unification)

| Projection | Subsystem (real files on this branch) | Role in the law |
|---|---|---|
| **I · Kinematics** — what posture the system is in | `decision-state.ts` (14 states) + `state-compilers.ts` | the *coordinates* of an expression |
| **II · Force law** — what bounds the expression | `decision-authority-gate.ts` + `decision-permission-gradient.ts` | the *meet* itself |
| **III · Dynamics** — how authority accrues over time | `ladder/reduce.ts` + `ladder/heartbeat.ts` (`RUNG_REQUIREMENTS`, INV-1..6) | the conserved-charge *integral* |
| **IV · Measurement** — measuring authority without self-deception | `decision-factory/intelligence-ledger.ts` (HAC variance, min-n, α-spend) | the *honest instrument* |

The flywheel is the time-evolution operator; the ladder is its conserved charge; the publish gate
is the horizon; the Ledger is the metrology. **One law, four faces.** The `GSE_FIELD_OBSERVATORY`
renders all four as one body (§5).

---

## 2. The Real Finding — the law's *expansion* is incomplete (the honest gap)

The code expresses the law as a **4-term meet** that **folds the owner's 8 conceptual Authority-Stack
layers together**. This is the deepest substantive audit finding — the law is *right*, its
*expansion* is *partial*:

| # | Owner's 8 layers | Where it lives today | Fold / gap |
|---|---|---|---|
| 1 | Rights | `rightsClearedForPublic` boolean in `isPublicSafe` | a side-conjunct, **not a meet operand** in `authorityCeiling` |
| 2 | Temporal (pre/post-lock, freshness) | inside `dataMode` + `readinessAuthorized` | **no first-class temporal ceiling** |
| 3 | Source operational reality (CATALOGUED→LIVE) | `dataMode` (FIXTURE/SHADOW_REAL/LIVE_REAL) | conflated with temporal; activation lifecycle lives in `nfl-stat-universe` |
| 4 | Evidence sufficiency | `intelligence-ledger.ts` + stat contract | **not yet a ceiling term** in `authorityCeiling` |
| 5 | Local expression authority | `decision-permission-gradient.ts` | present (`tradabilityStrengthCeiling`) |
| 6 | Global model maturity | `modelAuthority` + ladder `pricedEstimators` | split across gate and ladder |
| 7 | User entitlement | inside `publicationAuthority` | entitlement vs publication conflated |
| 8 | Owner / external-action | the HELD gates | **process-enforced, not lattice-enforced** |

**Why this is safe today and still worth fixing.** The fold is *conservative*: every folded layer
collapses into a term that is *at least as restrictive*, so the current 4-term meet is a lower bound
on the full 8-term meet — it can only *under*-permit, never *over*-permit. The theorem (§1.3) holds
regardless. But naming the 8 layers as one canonical `AuthorityTensor` and proving the 4-term meet
is its *contraction* (which `AUTHORITY_TENSOR_PROOF.md` does, executably) lets the owner decide,
layer by layer, which folds to **unfold** — making rights, temporal freshness, and evidence
sufficiency *first-class meet operands* instead of scattered booleans. **Unfolding the production
gate is owner-gated and was NOT performed this pass** (it would change `authorityCeiling`'s
behavior). The audit proves and proposes; it does not rewire the gate.

---

## 3. The 25-File Packet — accounted for, to the standard of intelligence

All uploaded artifacts are now committed under `docs/gse-packet/` as **historical design records**
(preserved, not silently rewritten). Honest count:

**21 canonical text/HTML records committed** (20 Markdown + 1 HTML prototype):

| Tier | Files |
|---|---|
| Front door / precedence | `GSE_MASTER_DOSSIER.md`, `START_HERE_GSE.md`, `GSE_INTEL_00_RIGOR_PASS.md` (authoritative corrections) |
| Intelligence core | `GSE_INTEL_01_CORE_ARCHITECTURE.md`, `GSE_INTEL_02_FORECASTING_FRONTIER.md`, `GSE_INTEL_03_FLYWHEEL_LADDER_COST.md`, `GSE_INTEL_04_80DAY_SEQUENCE.md`, `GSE_INTEL_05_FRONTIER_ADDENDUM.md`, `GSE_INTELLIGENCE_CORE_AND_FLYWHEEL.md`, `GSE_FORECASTING_METHODOLOGY_ATLAS.md` |
| Reconciliation / advisory | `GSE_INTEGRATION_MATRIX.md`, `GSE_EXECUTIVE_ADVISORY_PASS.md`, `GSE_INTEGRATION_AND_LAUNCH_RUNBOOK.md`, `GSE_BACKTEST_AND_FIXES_STATUS.md`, `GSE_GO_DECISION.md` |
| Execution / handoff | `GSE_CODER_KICKOFF.md`, `GSE_CODEX_AUTONOMOUS_EXECUTION.md`, `GSE_CLAUDE_HANDOFF_PROMPT.md` |
| Cockpit / brand | `GSE_COCKPIT_ARCHITECTURE.md`, `GSE_BRAND_BIBLE.md`, `prototypes/GSE-cockpit.html` (integrity-patched, §4) |

**Plus, accounted for but not committed as canonical:**
- **1 exact duplicate** — `GSE_INTEL_03_FLYWHEEL_LADDER_COST.md` appeared twice in the upload set
  (hashes `8f638523` and `f84469a5`, byte-identical); the duplicate is intentionally **not**
  re-committed.
- **Cockpit screenshots** (`IMG_6620`–`IMG_6629`, several themselves duplicated in the upload set) —
  UI design captures of the cockpit; the live prototype HTML supersedes them, so they are noted
  here rather than committed as canon.
- **2 referenced-but-not-uploaded SVGs** — `GSE_intelligence_flywheel.svg` (referenced by the
  flywheel docs) was not in the upload set; flagged in the contradiction ledger (§6, C-7) as a
  missing asset, not a silent omission.

**Reconciliation with the owner's "~25 = 22 canonical + 3 duplicate" estimate:** the present
upload set resolves to **21 canonical text/HTML + 1 markdown duplicate + screenshot captures + 2
referenced-missing SVGs**. The 1-file gap from "22 canonical" is the un-uploaded SVG pair collapsing
to a single referenced asset; the duplicate count differs because the screenshot duplicates were not
counted as document duplicates. This is stated plainly rather than forced to match.

---

## 4. The fabricated-success defect — found, corrected, proven corrected

**The defect (P0).** `GSE-cockpit.html` workflow #1 ("Run the backtest") hardcoded a *win the model
never earned*:

```js
// BEFORE (fabrication):
w.out = 'model MAE 4.8 vs naive 5.6 · beats naive ✓';   // line ~213
if (w.id === 1) { gatePreds[4].ok = true; gatePreds[4].v = 'beats naive'; ... }  // line ~215
```

Clicking the button manufactured a passing backtest and flipped the publish-gate predicate toward
OPEN. The real out-of-sample result (per `GSE_INTEGRATION_AND_LAUNCH_RUNBOOK.md`) is **MAE 5.31 vs
naive 4.91 over 18,344 player-weeks → does NOT beat** (lower MAE is better). A demo that fakes the
single most important integrity result.

**The correction.** `docs/gse-packet/prototypes/GSE-cockpit.html` now reports the truth, the
backtest predicate **stays UNMET**, the publish gate **stays HELD**, the "path to open" copy is
honest, and a provenance comment + visible stamp document the change. The fix touches no production
gate, no live data, no money.

**Proven corrected (live render, headless Chromium).** `ADVERSARIAL_EXECUTION.md` records the run:
the cockpit gate reads `HELD` *before and after* clicking "Run the backtest"; the Observatory
collapses a FIXTURE scenario to `INFO_ONLY` with `public-safe = no` and only reaches
`PUBLIC_ACTION` when all eight layers permit. The instrument is now structurally unable to render
the falsehood. Grep confirms **no live `beats naive ✓` / `ok=true` path survives** (the sole match
is the provenance comment that documents the original defect).

---

## 5. The Instrument — `GSE_FIELD_OBSERVATORY.html` (da Vinci)

One self-contained, **offline** (zero network requests), fixture-watermarked HTML file whose own
render logic *is* the field equation (§1.1) re-implemented in ~30 lines of JS. It renders:

1. **The One Law** — the field equation + the strength lattice as masthead.
2. **The Authority Tensor** — the 8 layers as interactive selectors; the meet computes live and the
   *binding* (most restrictive) layer glows magenta. Presets demonstrate the law: *Fixture demo* →
   `INFO_ONLY`; *Live but rights internal* → bound by Rights; *Live · proven · public* →
   `PUBLIC_ACTION`. Folded layers (§2) are marked `⊕ folded`.
3. **The Vitruvian Organism** — hand-built SVG: circulatory = heartbeat→ladder, skeleton = 14
   decision states, nervous system = authority stack, eyes = publish gate. "One organism, one
   source of truth," made anatomical.
4. **The One Ladder** — `RUNG_REQUIREMENTS` with honest **FOUNDING / 0-settled** counters and the
   INV-1 derivation.
5. **The Publish Gate** — the corrected, honest, HELD gate.

Because no tile can show a strength above the meet of its layers, the Observatory **cannot render a
pass that was not earned.** Integrity-as-geometry, made literal.

---

## 6. Docs-to-Code Traceability + Contradiction Ledger

The Executive Advisory's headline alarm — that engine files (`clv.ts`, `shin-devig.ts`,
`edge-engine.ts`, …) were "not found" — was explicitly flagged in its own PART I as a *branch/clone
artifact*. **Verified against this branch, it is exactly that.** Real status:

| Faculty | Doc claim | This branch | Verdict |
|---|---|---|---|
| Shin de-vig | `shin-devig.ts` | `packages/prediction-engine/src/shin-devig.ts` (+test) | **Shipped** |
| Edge engine | `edge-engine.ts` | `packages/prediction-engine/src/edge-engine.ts` (+test) | **Shipped** |
| Poisson / Kelly / Conformal | named | `poisson.ts`, `kelly.ts`, `conformal-intervals.ts` (+tests) | **Shipped** |
| Evidence-readiness matrix | named | `evidence-readiness-matrix.ts` (+test) | **Shipped** |
| LadderEvent + reducer | `INTEL_03` | `types/{ladder,heartbeat}.ts`, `prediction-engine/src/ladder/{reduce,heartbeat}.ts` (+INV tests) | **Shipped** |
| Intelligence Ledger | `INTEL_03 §4` | `decision-factory/src/intelligence-ledger.ts` (+test) | **Shipped** |
| GSE Score | `gse-score.ts` | function lives in `scoring.ts`/scoring-zone; **no `gse-score.ts`** | **Partial (renamed)** |
| Pick memory / isotonic | `pick-memory.ts` / `isotonic` | function present under other paths; exact filenames absent | **Partial (renamed)** |
| Forecasting Frontier modules 1–5 | `INTEL_02` | `opportunity-forecast.ts` et al. — **design-stage**, not in `lib/projections/` | **Aspirational** |
| Frontier Addendum 6 mechanisms | `INTEL_05` | design-stage | **Aspirational** |

**Contradiction Ledger** (severity · disposition):

| ID | Contradiction | Sev | Disposition |
|---|---|---|---|
| C-1 | Branch-of-record drift: packet names `sweet-fermi-sk9gws` / `codex/intelligence-core` / `research/proven-edge`; reality is `claude/keen-ptolemy-t38f1g`. | Med | **Safe-noted.** Packet preserved as historical; this audit is the current source of record. |
| C-2 | Cockpit fabricated a passing backtest. | **P0** | **FIXED** (§4), proven by live render. |
| C-3 | "Nothing merged to main / nothing deployed" (runbook) now stale: 74 commits merged to this branch. | Low | Noted; superseded by §7 reality map. |
| C-4 | Executive Advisory "engines not found." | Med | **Resolved** as a stale-clone artifact (table above). |
| C-5 | Integration-Matrix ORPHAN **O-4: PAST_DUE grace leak** (entitlement drops straight to FREE instead of 7-day grace). | High | **Owner-gated**, production code — out of audit-write scope; listed in `OWNER_DECISION_BRIEF`. |
| C-6 | Integration-Matrix INCONSISTENCIES I-1 (Tweedie label), I-3 (conformal "guarantee" wording), I-7 (preseason vs historical backtest). | Med | Noted for content/copy pass; not a safety defect. |
| C-7 | Referenced SVG `GSE_intelligence_flywheel.svg` not uploaded. | Low | Missing asset flagged; the Observatory's Vitruvian SVG supersedes its intent. |
| C-8 | Authority Stack 8 layers folded into a 4-term meet. | Med | **Surfaced + proven** (§2); unfold is owner-gated. |

---

## 7. Repository Reality Map (Pass 0 freeze)

- **Branch / HEAD:** `claude/keen-ptolemy-t38f1g` @ `60bccd84`. **0 behind / 74 ahead** of
  `origin/main` (`67c4522a`); merge-base **==** origin/main → branch strictly contains main,
  fast-forward-clean. Working tree clean at freeze.
- **Canonical decision grammar:** one 14-state union (`decision-state.ts`) with compile-time
  exhaustiveness guard + `ALL_DECISION_STATES` witness. No second taxonomy.
- **Force law:** `decision-authority-gate.ts` (meet) + `decision-permission-gradient.ts` (strength).
- **Dynamics:** ladder spine present with INV-1..6 tests.
- **Measurement:** `intelligence-ledger.ts` with HAC variance, min-n, effect-floor, α-spending.
- **Guardrails:** trust-gate, model-freeze, draft-only, claude-api-usage, secret-scan, eval-contracts
  — all green this pass (`ADVERSARIAL_EXECUTION.md`).

---

## 8. What this pass did NOT touch (the owner's reserved gates)

No merge to main · no `priced=true` · no `canPublishProjections` · no `PERFORMANCE_STATS_ENABLED`
· no live/paid data activation · no API-key read or spend · no network in tests · no
publish/roster/account action · no production-gate flip · no unfolding of the authority-gate code.
The only code change is a **new test** (`authority-tensor.theorem.test.ts`, additive, behavior-free)
and the **cockpit prototype** integrity patch (explicitly owner-requested). Everything else is
documentation. Owner decisions are enumerated in `OWNER_DECISION_BRIEF.md`.
