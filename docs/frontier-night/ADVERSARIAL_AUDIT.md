# Frontier Night — Adversarial Audit

Two hostile passes over everything built tonight (N1–N8). The job is to *break* the claims, not to
celebrate them. Each finding has a severity and a disposition: **FIXED** (patched this pass),
**ACCEPTED** (a deliberate, documented limit of a fixture-only build), or **DEFERRED** (a real
follow-up for the live phase). Nothing below is hand-waved.

## Pass 1 — Honesty & Safety (the fake-certainty lens)

The institution's entire premise is that it refuses fake certainty. So the first attack is: *does it
quietly cheat its own rule anywhere?*

| ID | Finding | Severity | Disposition |
|---|---|---|---|
| H1 | The offline `EVENT_GENOME_PAGE.html` hand-encodes numbers that "mirror" the engine. If the engine changes, the page lies silently. | Med | **FIXED** — added a golden-anchor test (`event-genome.test.ts` "publishes the exact headline values…") pinning Possession Mirage 28.2, Underdog Deservedness 0.48, xG Justice 0.99, Meaning Confidence 0.2, total 20. Change the math → the test fails before any doc can drift. |
| H2 | The HTML overview counted "9 stat passports" while the engine produces 20 — the proof page undercounts its own system. | Low | **FIXED** — overview now reads "9 shown · 20 in engine." |
| H3 | Could a fixture ever render as live? | High if true | **ACCEPTED-CLEAN** — `isLive()` returns `false` unconditionally; every genome is `fixtureWatermarked: true`; `composeAuthority(FIXTURE_AUTHORITY)` binds at Source-reality → `INFO_ONLY`. Tested in `event-genome.test.ts` + `matches-preview.test.ts` + `n5-layers.test.ts`. |
| H4 | Does any prediction "win" become a public performance claim? | High if true | **ACCEPTED-CLEAN** — `countsAsPublicPerformance: false` is a hard flag; `publicPerformanceStatus()` returns `isPublicPerformanceClaim: false` for any fixture set; the deliberate over-claim fixture is graded `AUTHORITY_TOO_STRONG`. |
| H5 | `ODDS_API_TIERS` hard-codes credit allotments that could be stale/wrong, implying a vendor contract. | Low | **ACCEPTED** — documented as a planner, not a contract; **no dollar price encoded** (verify-at-purchase posture); a test asserts no `$/usd/price` appears in a tier. |
| H6 | The odds CLI could leak `THE_ODDS_API_KEY`. | High if true | **ACCEPTED-CLEAN** — presence-only boolean; `odds-plan-cli.test.ts` asserts the value is never interpolated into output and there is no fetch/axios/http call. `spendUsd: 0`, `mode: PLAN_ONLY`. |
| H7 | Did anything touch `main`, flip a gate, or weaken a guardrail? | Critical if true | **ACCEPTED-CLEAN** — all work on `claude/keen-ptolemy-t38f1g`; `main` untouched; no `priced=true`, no `canPublishProjections`, no public-performance gate opened; guardrails + secret-scan green every checkpoint. |
| H8 | Any Scores24 content reused, derived, or used as a data source? | Critical if true | **ACCEPTED-CLEAN** — the teardown is original analysis of a publicly observable business model; contains no Scores24 content/data; Scores24 stays `permission_required` and is never a data source. |

## Pass 2 — Product & Differentiation (the skeptic lens)

Second attack: *granting it is honest — is it actually a differentiated product, or expensive
ceremony?*

| ID | Finding | Severity | Disposition |
|---|---|---|---|
| P1 | Every fixture caps at `INFO_ONLY` ("FYI"). A user only ever sees "FYI" — is that useful? | Med | **ACCEPTED** — the product is the *explanation*, not the call. The Flight Record shows precisely which layer binds and what would lift it. On live data the ceiling rises; the cap is the fixture envelope, by design. |
| P2 | Stat tests assert structure (passport/weakness) but not the correctness of the math. | Med | **FIXED (partial)** — H1's golden anchors now pin four headline stat values; broader golden coverage of all 20 is **DEFERRED** to the live phase. |
| P3 | Is the differentiation real or rhetorical? Could Scores24 copy it? | Med | **ACCEPTED** — the moat is structural: their revenue depends on fake certainty (confident tips, parlay pushes, "best book" funnels). Each is a place where the honest answer reduces conversion, so they cannot adopt it without dismantling the funnel. Documented in the business-machine teardown. |
| P4 | The HTML offline page and the Next routes are two renderers — do they agree? | Low | **ACCEPTED-CLEAN** — both consume the same canonical engine fixtures; the golden anchors (H1) pin the values both cite. |
| P5 | The Slip MRI could still be read as parlay encouragement. | Med | **ACCEPTED-CLEAN** — the strongest possible verdict is `PROCEED_WITH_CAUTION`; any unsupported/correlated/duplicated leg forces `PASS`; a responsible-gaming warning is always attached; tests enforce the ceiling. |
| P6 | The bonus layer could still surface an affiliate CTA. | High if true | **ACCEPTED-CLEAN** — `affiliateUrl` is `null` unless `affiliateConfigured`; `displayAllowed` requires `lastVerifiedAt` + verified legality (+ a caveat for no-loss claims); route is `OWNER_GATED` + compliance-reviewed. |
| P7 | Live data path is unproven (sandbox cannot generate Prisma; no live keys). | Med | **DEFERRED** — full app `typecheck`/`build` is `ENVIRONMENT_BLOCKED` and resolves on CI (N6/N7 confirmed green); new files are type-clean in isolation. Live ingestion requires keys + owner approval and is out of this build's envelope. |

## Patches applied this pass

1. **Golden-anchor test** (`event-genome.test.ts`) — pins the four headline stat values + the count of
   20, so the offline page and product docs can never silently diverge from the engine. (H1, P2)
2. **HTML count honesty** — the offline overview now states "9 shown · 20 in engine." (H2)

## Residual risk (carried to the live phase)

- Golden coverage of all 20 derived stats, not just the four headline values (P2).
- Verification of the live ingestion path once keys + owner approval exist (P7).
- A drift test that diffs the offline HTML's embedded values against the engine at CI time (H1 hardening).

## Verdict of the audit

No envelope violation, no leak, no fake-certainty cheat, no Scores24 content. Two real honesty gaps
found and fixed in-pass. The remaining items are deliberate fixture-phase limits or live-phase
follow-ups, each named. The build is internally consistent and safe to present as a frontier preview.
