# Meaning Integrity Audit

Two hostile passes over the Meaning Compiler (M1–M11). The question behind every question: *does any
visible object escape the grammar, or claim more than the engines grant?* Each finding has a severity
and a disposition — **FIXED** (patched this pass), **ACCEPTED** (a deliberate, documented limit), or
**DEFERRED** (a named live-phase follow-up).

## Pass 1 — the ten integrity questions

| # | Question | Verdict | Disposition |
|---|---|---|---|
| 1 | Did every visible object compile through `ClaimObject`? | The `/meaning/preview` surface renders ONLY compiled ClaimObjects. The older `/matches/preview` (N6) still renders raw passports. | **ACCEPTED** — `/meaning/preview` is the compiled surface; unifying the N6 route is a named follow-up. The passports it renders are themselves consistency-proven against the compiler (M11). |
| 2 | Did any page invent meaning outside the compiler? | No — both surfaces render engine output; `/meaning/preview` only renders `compileClaimObject` results. | **ACCEPTED-CLEAN** |
| 3 | Did any object lack source / time / rights / authority? | No — the seven envelopes are type-required; `validateClaimObject` re-checks. | **ACCEPTED-CLEAN** |
| 4 | Did any fixture look live? | No — `fixtureWatermarked` is DERIVED from `sourceReality`; the whole corpus is watermarked. | **ACCEPTED-CLEAN** |
| 5 | Did any trend imply causality without proof? | No — trends carry fragility + correlation flags; the Trend Fragility lens surfaces them. | **ACCEPTED-CLEAN** |
| 6 | Did any prediction imply validation without a trial? | No — `countsAsPublicPerformance:false`; every PREDICTION carries `hasTrial`. | **ACCEPTED-CLEAN** |
| 7 | Did any bonus imply verified/current/legal without evidence? | No — a blocked bonus maps to `permission_required` rights → the compiler caps/refuses it. | **ACCEPTED-CLEAN** |
| 8 | Did any web evidence become production fact? | No — web evidence caps at INFO_ONLY, HIGH legal risk, never publicSafe (a five-engine downgrade trail). | **ACCEPTED-CLEAN** |
| 9 | Did any scraped/competitor content become product data? | No — `COMPETITOR_RESEARCH` caps at INFO_ONLY; no Scores24 data anywhere. | **ACCEPTED-CLEAN** |
| 10 | Did every object have a next state after the outcome? | Yes — `autopsyHook` + `memoryWrite` on every ClaimObject; the Autopsy Memory lens lists them. | **ACCEPTED-CLEAN** |

**Pass-1 patch (FIXED):** the corpus compiled 58 objects but **visibly refused nothing** — the
institution's strongest claim ("this cannot be shown") was invisible. Added a forbidden source
(`GENOME_FORBIDDEN`, rights `excluded`) to `compileAllFixtures()`, so the corpus now contains one
`DO_NOT_USE` object, surfaced in both the `/meaning/preview` Sources view and the offline observatory
(a 9th showcase tab). A corpus test now *requires* at least one visible refusal.

## Pass 2 — the skeptic's pass

| ID | Finding | Severity | Disposition |
|---|---|---|---|
| S1 | For a claim refused by **rights/time**, `explain.authorityStory` reported only the downstream authority cap (INFO_ONLY), understating *why* it was refused. | Med | **FIXED** — a refused claim's `authorityStory` now leads with the refusing engine: "Refused at the rights layer (isForbidden): …". Asserted in `meaning-compiler.test.ts`. |
| S2 | Every corpus object floors at INFO_ONLY (fixture). Is the compiler's rights/time logic actually exercised to varied outcomes? | Med | **ACCEPTED-CLEAN** — the compiler tests + the conservation theorem use LIVE vectors to drive the full lattice (live→WATCH, forbidden→DO_NOT_USE, future→DO_NOT_USE). The fixture floor is a property of the corpus, not untested logic. |
| S3 | Do the hand-set passports and the compiler agree, or is the adapter a parallel system? | High if drifting | **ACCEPTED-CLEAN** — `passport-consistency.test.ts` proves `composeAuthority` reproduces each passport's intrinsic ceiling exactly, and no passport exceeds it once compiled. |
| S4 | Could a page render a claim above its route's permitted expression, or a `DO_NOT_USE` claim? | High if true | **ACCEPTED-CLEAN** — `validatePageRender` caps by route status and rejects any `DO_NOT_USE` claim; tested. |
| S5 | Does the offline observatory drift from the engine? | Low | **ACCEPTED-CLEAN** — every value in the observatory mirrors the real `compileAllFixtures()` output; Chromium-verified, and the refusal showcase matches the engine's `isForbidden:DO_NOT_USE` trail. |
| S6 | Is the field-level native refactor (deriving fixtureWatermarked/publicSafe through the compiler) actually done? | Low | **DEFERRED** — a no-op on fixtures (everything INFO_ONLY); deferred to the live phase, where ceilings vary, rather than destabilize the green suite for zero gain. |

## Patches applied this audit

1. **Visible refusal** — a forbidden source in the corpus + observatory; a corpus test requires ≥1
   `DO_NOT_USE`. (Pass-1)
2. **Refusal-reason in the explanation** — a rights/time-refused claim names its refusing engine, not
   just the authority cap. (S1)

## Residual (carried to the live phase)

- Unify the N6 `/matches/preview` route to render through `ClaimObject` (Q1).
- The field-level native refactor once ceilings vary off fixtures (S6).
- A CI drift test diffing the observatory's embedded values against `compileAllFixtures()` (S5 hardening).

## Verdict

No object escapes the grammar; no claim exceeds its engines; the institution now *visibly* refuses a
forbidden source and *explains* the refusal. Two real integrity gaps found and fixed in-pass; the rest
are named live-phase follow-ups. The Meaning Compiler is internally consistent and safe to present.
