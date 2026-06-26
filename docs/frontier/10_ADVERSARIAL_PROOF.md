# 10 · Adversarial Proof

PROJECT PARALLAX · Pass 8. Every attack the slice must survive, with the test that enforces it. All
executed this pass. Engine tests: `decision-field-runtime` package (`authority-vector.test.ts`,
`parallax-instrument.test.ts`, `parallax-mirror-guard.test.ts`). UI assertions: headless Chromium 1194.

---

## A. Engine attacks (EXECUTED_AND_GREEN)

| # | Attack | Must hold | Test | Result |
|---|---|---|---|---|
| 1 | Future facts change an earlier decision | A Wed object is byte-identical whether or not a Sunday fact exists | `parallax-instrument` "future fact cannot change an earlier decision" | ✅ |
| 2 | Fixture reaches action/public | FIXTURE caps at INFO_ONLY; binding = SOURCE_REALITY | "fixture mode … capped at INFO_ONLY" | ✅ |
| 3 | Shadow reaches public | SHADOW_REAL caps ≤ WATCH; never public-safe | `authority-vector` public-safe tests | ✅ |
| 4 | Rights-blocked fact strengthens expression | BLOCKED rights alone forces INFO_ONLY | `authority-vector` "blocked rights alone forces INFO_ONLY" | ✅ |
| 5 | Evidence folded away (not a real gate) | INSUFFICIENT evidence alone forces INFO_ONLY | `authority-vector` "insufficient evidence alone…" | ✅ |
| 6 | User entitlement raises epistemic authority | Entitlement is a meet term; it caps, never lifts data/model layers | contraction lemma + meet ≤ operand | ✅ |
| 7 | Owner authority creates evidence | OwnerAction caps strength (HELD → WATCH); it cannot add a fact | layer separation; `ownerActionCeiling` | ✅ |
| 8 | A missing fact is silently imputed | Forking before WR1 status is knowable → MISSING_REQUIRED_FACT refusal | "cannot fork before status knowable" | ✅ |
| 9 | A counterfactual hides its assumptions | Every fork returns `changedAssumptions` (≥2) | "every counterfactual reports its changed assumptions" | ✅ |
| 10 | A fork breaks conservation | Σ target share equal before/after to < 1e-9; team attempts fixed | "conserves total target share" | ✅ |
| 11 | Conditioning masquerades as intervention | INVALID_CONDITION_ON_OUTCOME → refusal, DATA_CONFLICT | "conditioning on a realized outcome is rejected" | ✅ |
| 12 | Non-deterministic output | Same input → identical replay digest | "same inputs yield the same Decision Object" | ✅ |
| 13 | Removing a required fact does not downgrade | Wed (no designation) → NEEDS_LIVE_DATA refusal | "Wed object refuses the fork" | ✅ |
| 14 | Conflicting sources get averaged | Disagreement is a spread, surfaced, never collapsed to a mean | "disagreement is a real spread" | ✅ |
| 15 | A decision skips the lifecycle | Every object carries an autopsy hook | "every Decision Object carries an autopsy hook" | ✅ |
| 16 | Learning from a single outcome | `creditVerdict` needs claim + fork + outcome; one result moves no weight | "no credit from a single outcome alone" | ✅ |
| 17 | A correct refusal scores as a blank | CORRECTLY_REFUSED is a win | same | ✅ |
| 18 | Out-of-range intervention accepted | snapProbability ∉ [0,1] → INVALID_INTERVENTION | "out-of-range snap probability is rejected" | ✅ |
| 19 | Bare points without uncertainty | Propagated projection carries an interval | "outputs carry an interval, never a bare point" | ✅ |
| 20 | The 8-layer object over-permits vs the gate | composeAuthority(fromContext(ctx)) === authorityCeiling(ctx) ∀ ctx | contraction lemma (72 contexts) | ✅ |

## B. UI / instrument attacks (EXECUTED_AND_GREEN — headless Chromium)

| # | Attack | Must hold | Result |
|---|---|---|---|
| 21 | The instrument lets you fork before knowable | t=0 (Mon) shows the refusal panel; fork disabled | ✅ refusal shown |
| 22 | The fork raises the ceiling | After forking WR1 fully out, ceiling stays INFO_ONLY, claim INFO_ONLY | ✅ |
| 23 | The fork is cosmetic | The observed read flips to ROLE_UP while the claim does not move | ✅ |
| 24 | The binding layer is hidden | Autopsy shows Source-reality binding | ✅ |
| 25 | The boundary is a point, not a surface | Renders "flips once WR1 snap prob crosses x*" | ✅ |
| 26 | Network / fixture-as-live | 0 network requests; fixture-watermarked; 0 console errors | ✅ |
| 27 | HTML drifts from the engine | Mirror guard pins 49.6 / 82.0 / x*=0.88 | ✅ |

## C. Guardrails (EXECUTED_AND_GREEN)

trust-gate (1199 files, clean) · draft-only (no publish/send) · secret-scan (no secrets) ·
decision-surfaces typecheck (5 packages, clean) · export-collision (none).

## D. What is NOT executed (honest)

- **All-workspace typecheck + Next production build:** `ENVIRONMENT_BLOCKED` (sandbox cannot download the
  Prisma engine — ECONNRESET). Resolves on hosted CI. The slice does not depend on Prisma; the engine and
  the HTML are verified independently above.
- **Live-data path:** `NOT_EXECUTED` by design — owner-gated (`11_LIVE_PATH_DOSSIER.md`).

## Verdict

Every adversarial property the category requires is **EXECUTED_AND_GREEN**. The instrument is
structurally unable to overclaim on fixtures (the meet pins it to INFO_ONLY), point-in-time honest (the
light cone), conservation-bound (the fork), and replayable (the digest). No attack in scope succeeded.
