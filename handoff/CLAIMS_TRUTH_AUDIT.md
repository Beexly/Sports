# Claims Truth Audit — Public Surfaces vs. Actual Behavior

> Coverage audit by a non-lawyer. Adequacy requires human legal review.

**Scope:** Grep the public surfaces (homepage, `/about`, `/pricing`, `/accountability`,
`/engine`, `/methodology`, `/performance`, `/clv`, `/picks`, `/edge-index`) for every
quantitative or capability claim asserted in copy. Trace each to whether the implementation
actually substantiates it. This file is READ-ONLY analysis — no production code touched.

**Key architectural finding:** the codebase already contains a first-party
`TrustClaim` registry at `apps/web/lib/trust-claims.ts` that maps every public claim to an
evidence source (`ENGINE_BEHAVIOR`, `DATA_MODEL`, `BILLING_POLICY`, `REGULATORY`, `NONE`)
and a status (`APPROVED`, `GATED`, `BANNED`). Every public claim enumerated below was
cross-checked against (a) that registry entry and (b) the implementation file(s) the
registry points to. Where the registry is silent, the claim is flagged "UNREGISTERED."

**Method:** For each claim, (1) quote the public text, (2) name the registry entry or
source file that backs it, (3) record a verdict of SUPPORTED / GATED / UNSUPPORTED /
UNREGISTERED, (4) cite the exact code reference. Only claims found to be SUPPORTED or
properly GATED are considered compliant. Two claims were found UNSUPPORTED (one is a
candidate gap the registry already anticipated; one is a minor overstatement).

---

## 1. Odds ingestion cadence — `/about` principle 01

**Claim (verbatim):** "Live odds from dozens of sportsbooks, ingested on a 30-minute
cadence."

**Verdict: UNSUPPORTED (cadence number not backed by code).**

**Evidence:**
- `apps/web/lib/trust-claims.ts` entry `methodology.odds-ingestion` (line 96) is APPROVED
  but its `reviewNote` explicitly reads: **"No claim about update frequency in seconds."**
  The registry is deliberately careful here.
- The about-page copy states a specific numeric cadence (30 minutes) that the registry
  does not sanction.
- `packages/prediction-engine/src/constants.ts` and `readiness.ts` contain no
  `INGESTION_CADENCE` constant or enforced interval. `loadEngineStory` (`apps/web/lib/engine/load-engine-story.ts`)
  records `lastSuccessAt` but does not assert a cadence.
- No test or config pins a 30-minute window. The nearest SLA concept is
  `FORCE_NO_BET_IF_STALE` (default OFF) which reads freshness but does not define 30m.

**Risk:** A specific cadence number is the sort of claim a competitor could challenge as
deceptive if ingestion ever drifts slower in practice. The registry already anticipated
this by refusing to bless a frequency; the about-page copy contradicts the registry.

**Recommendation:** Replace the 30-minute figure with the registry's approved wording:
"We ingest live odds from multiple sportsbooks on a regular schedule and score every
available matchup" (`trust-claims.ts`, entry `methodology.odds-ingestion`). No numeric
cadence is backed by an enforced constant.

---

## 2. "Every pick traces to a real line" — `/about` principle 01

**Claim (verbatim):** "Every pick traces to a real line. ... No synthesized numbers."

**Verdict: SUPPORTED.**

**Evidence:**
- `apps/web/lib/proof/verification-spec.ts` (lines 44-76) publishes synthetic KAT vectors
  whose `committedFields` include `line`, `entryOdds`, `marketFairProb`, `confidence`,
  `edgeScore`, `modelVersion` — all real field names from `PickProofInput`. The live
  verifier (`receipt-proof.ts` lines 91-97) re-reads these from `parseCanonicalPayload(r.payload)`
  (the hash-covered string) and rejects any column drift beyond tolerance.
- `packages/prediction-engine/src/proof-of-record.ts` `canonicalPickPayload` (lines 129-134)
  is the canonical serialization `key=value` joined by `|`, sorted lexicographically —
  the exact byte sequence covered by the content hash.
- `apps/web/lib/proof/receipt-proof.ts` `verifyReceiptIntegrity` (lines 85-119) performs
  two checks: (1) `sha256("leaf:" + pickId + ":" + payload)` matches the frozen
  `contentHash`; (2) DB columns match the hashed payload within tolerance. Committed
  financial fields are surfaced **only** when both pass (interface `CommittedFields`,
  lines 59-67).

**Conclusion:** The machinery to prove every pick traces to a real, frozen line exists
and is the public `/api/verify` + `/api/proof/receipts` surface.

---

## 3. Confidence is a 0–100 heuristic, not a calibrated probability — `/about` principle 03 + `/methodology`

**Claim (verbatim, `/about` line 30):** "A signal with a 64% calibrated confidence still
loses 36 out of 100 times."

**Verdict: SUPPORTED — with a terminology precision issue.**

**Evidence:**
- `packages/prediction-engine/src/scoring.ts` `scoreSpreadPick` (lines 486-494) computes
  `confidence` as a rounded sum of weighted factor scores clamped to [0, 100]. It is a
  composite heuristic, not derived from a probability model.
- `packages/prediction-engine/src/calibration-apply.ts` (lines 1-14): the calibrator is
  **self-suppressing** — `buildCalibrator` returns an **inactive** identity-map
  passthrough unless (1) `sampleSize >= 100` AND (2) the fitted map does not worsen ECE.
  The default `buildCalibrator` returns `{ isActive: false, inactiveReason: ... }`.
- `packages/prediction-engine/src/readiness.ts` line 103: `canApplyCalibrationAdjustments`
  maps to env `CALIBRATION_ADJUSTMENTS_ENABLED`, defaulting to `false` (see
  `platform-config.ts` line 174). So production confidence is currently the raw heuristic.
- `/methodology` (lines 270-275) states this explicitly: "A 0–100 composite of market and
  matchup factors. Useful for UX and gates. Alone it often echoes the books, so
  discrimination can stay near noise until independents price in."
- The `64%` figure is a **pedagogical illustration** of the uncertainty principle, not a
  stated performance/win-rate claim. The math (a 64% point estimate loses 36% of the time
  in expectation) is arithmetically correct.

**Precision issue:** The about-page calls 64% "calibrated confidence," but per the engine
comments and registry entry `methodology.confidence-presentation` (line 131), numeric
confidence scores are only shown to PRO+ users AND "only once calibrated against settled
outcomes." Currently calibration adjustments are OFF, so the public does not see any raw
confidence number at all (see item 4). The word "calibrated" in the about copy is
technically describing the *goal* of the system, not the current live output. This is a
minor terminological looseness, not a false claim about what the public sees today.

**Recommendation:** Consider softening to "a 64% confidence signal" (drop "calibrated")
to match the registry's approved copy and the engine's live behavior. No action required
for compliance — the public never sees the raw number.

---

## 4. Free users see a daily teaser of picks — `/engine` line 276 + `/picks` + `/pricing`

**Claim (verbatim, `/engine` line 276-277):** "The engine publishes two picks free every
day; Pro opens the whole sealed board with the numbers attached."

**Verdict: SUPPORTED.**

**Evidence:**
- `apps/web/app/picks/page.tsx` lines 153-162: the `FREE` entitlements object literal
  sets `dailyPickLimit: 2` and `canSeeConfidence: false`, `canSeeEdgeScore: true`.
- `packages/types/src/index.ts` line 518: `confidence: number; // 0–100 (heuristic UX; market-echo components)`
- `/picks` line 462: "Free includes a daily teaser of up to {teaserSize} picks with the
  public Edge Index and no confidence scores."
- `apps/web/lib/pricing/pricing-phases.ts` line 278: `COMPARISON_CELLS.FREE` cell for
  "Signals per day" = "With public picks open" (consistent gating framing); the teaser
  size itself is the entitlements `dailyPickLimit`.

**Conclusion:** "Two picks free every day" is directly backed by the `dailyPickLimit: 2`
entitlement constant. (Note: the board only opens when `PUBLIC_PICKS_ENABLED` / the
readiness gates allow; the about/pricing pages already state this is gated.)

---

## 5. Edge Index is public (0–100), confidence is paid — `/edge-index` + `/picks`

**Claim (paraphrased from copy):** Free tier sees the "Edge Index" but not confidence.

**Verdict: SUPPORTED.**

**Evidence:**
- `packages/types/src/index.ts` line 131: `canSeeEdgeScore: boolean; // public Edge Index`
  and line 128: `canSeeConfidence: boolean` (false for FREE).
- `apps/web/lib/board/state.ts` `redactBoardConfidence` (lines 69-80) strips confidence
  from every row for non-premium viewers via `extractRankingFromFb` (lines 83-104),
  which also nulls `rankingP` / `rankingSource`.
- `packages/prediction-engine/src/scoring.ts` `toEdgeIndex` (lines 105-108): identity-with-
  clamp mapping of engine `edgeScore` to 0–100, explicitly the "SINGLE source of truth for
  the Edge Index scale." Comment (lines 99-103): "A two-way market that is internally
  consistent can only reach an Edge Index of 100 when the de-vigged fair edge is
  genuinely ≥ +5%."
- `apps/web/app/edge-index/page.tsx` line 45: "Edge Index only — never confidence or
  pre-mortem factors."

**Conclusion:** The public Edge Index is the *only* numeric score free users see; it is
derived from the pricing-edge component (a measurable quantity vs. market fair value),
whereas the heuristic confidence score is deliberately restricted.

---

## 6. Edge is not used as a win probability — `/methodology`

**Claim (verbatim, `/methodology` lines 289-295):** "Edge is the gap between an independent
true probability and the market's fair price — a signed difference, not P(side wins).
Edge can filter and explain; it never enters Brier, resolution, or separation as if it
were a win probability."

**Verdict: SUPPORTED.**

**Evidence:**
- `packages/prediction-engine/src/conviction-tier.ts` line 14 comment: "Edge/edgeScore
  is NOT a win probability (rawEdge = trueProb − marketFairProb)."
- `packages/prediction-engine/src/ranking-prob.ts` (referenced in index.ts line 220):
  `deriveRankingProbability` produces `rankingP` — always a probability — "Finite
  trueProb → trueProb or blend; else confidence/100" (`packages/types/src/index.ts`
  line 86 comment). Edge never enters this path as a probability.
- `packages/prediction-engine/src/calibration/apply.ts` /
  `apps/web/lib/calibration/proven-path-engine.ts` line 337: "Edge/edgeScore is NOT a
  win probability."
- `packages/types/src/index.ts` line 68: `edgeScore: number; // 0–25: net pricing edge
  vs fair value` — the schema comment itself labels edgeScore as net pricing edge, not
  a probability.

**Conclusion:** The codebase enforces the edge≠probability distinction in types, comments,
and the ranking-probability derivation path.

---

## 7. The calibration win rate is gated until defensible — `/performance` + `/about`

**Claim (verbatim, `/about` principle 04):** "Performance stats stay gated until they're
honest." + `/performance` (line 26): "The public win-rate readout doesn't appear until
enough settled picks exist to make it statistically meaningful."

**Verdict: SUPPORTED.**

**Evidence:**
- `apps/web/lib/performance/public-performance-policy.ts` is not the only gate; the
  gate lives in `packages/prediction-engine/src/readiness.ts` line 63:
  `canExposePerformanceStats` ← `PERFORMANCE_STATS_ENABLED` (default `false`,
  `platform-config.ts` line 168).
- `/performance/page.tsx` lines 126-128: `if (!gates.canExposePerformanceStats)` returns
  the bootstrap state — no DB query, no track-record claim rendered.
- `apps/web/lib/performance/wilson-interval.ts` (lines 67-74): `clearsThreshold(ci,
  threshold)` checks the **lower bound** of the Wilson interval against 0.524, not the
  point estimate — "A point of 0.6 over n=12 may have a lower bound below 0.524 — meaning
  we cannot yet claim we beat break-even."
- `apps/web/lib/calibration/compute.ts` line 198: `MIN_PUBLISH_BUCKET_SAMPLE = 30` —
  individual bucket win rates withheld below 30 settled picks. Line 213-220: a
  per-slice floor prevents a thin sport card from rendering a "100%" while the overall
  headline is honestly floored.
- The `/performance` page explicitly surfaces the Wilson 95% CI band next to the point
  estimate (lines 226-241).

**Conclusion:** The win-rate surface is gated by a boolean readiness switch, a minimum
settled-pick floor, a per-slice sample floor, and a lower-bound-clears-break-even test.
Every guard is in code, not aspirational.

---

## 8. CLV beat-close rate is gated until defensible — `/clv`

**Claim (verbatim, `/clv` line 167-172 + `/accountability` line 126):** "sharp-credible
leading indicator of edge: whether the price we locked beat where the market closed" /
"Published under the same gate-until-defensible discipline as the win rate."

**Verdict: SUPPORTED.**

**Evidence:**
- `apps/web/lib/performance/public-clv-policy.ts` `evaluatePublicClvPolicy` (lines 62-149):
  the headline `beatCloseRatePct` is `null` unless (1) `canExposePerformanceStats` is true
  AND (2) `gradedSampleSize >= minGraded` (default 25, line 60).
- Line 89: `clearsBreakEven = ci ? clearsThreshold(ci, VIG_BREAK_EVEN) : false` where
  `VIG_BREAK_EVEN = 0.524` (line 24). The CLV claim only clears break-even when the
  **95% Wilson lower bound** exceeds 52.4%.
- `/clv/page.tsx` lines 96-107: renders `ClvScoreboard` only when
  `policy?.canExposeClv` is true; otherwise renders `ClvGatedState` with an explicit
  progress counter ("{graded} / {minGraded}") and the message "No beat-close rate is
  shown until the sample is large enough to be honest."
- Canonical-only filter: `loadPublicClvPolicy` (line 167) queries `{ isBootstrap: false,
  isPublished: true }` picks only.

**Conclusion:** The CLV benchmark is fully gated and canonical-only, using the same
statistical discipline (Wilson lower bound vs. break-even) as the win-rate surface.

---

## 9. Tamper-evident receipts — `/proof` + `/engine` + `/accountability`

**Claim (verbatim, `/accountability` line 142, `/engine` line 208-209):** "Every settled
pick gets a digital fingerprint (a hash) the moment it is written. Change a pick after the
fact and its fingerprint stops matching."

**Verdict: SUPPORTED.**

**Evidence:**
- `packages/prediction-engine/src/calibration-commitment.ts` (line 37): "Composes through
  proof-of-record.ts (hashLeaf + canonicalPickPayload)."
- `apps/web/lib/proof/receipt-proof.ts` `verifyReceiptIntegrity` (lines 86-99):
  recomputes `sha256("leaf:" + pickId + ":" + payload)` and compares to `contentHash`;
  `verified = hashIntact && columnsMatchPayload`. Committed fields surfaced **only** when
  `verified` is true (line 109).
- `packages/prediction-engine/src/proof-of-record.ts` `hashLeaf` (line 37):
  `hash("leaf:" + id + ":" + payload)`. `merkleRoot` (line 60) rolls all leaves into one
  master root published at lock time.
- `/engine/load-engine-story.ts` line 108-110: `receiptsFrozenToday` counts real frozen
  receipts filtered by `{ isPublished: true, isBootstrap: false, NOT: { v5.0.0-seed } }`.
- `/proof` page (referenced by accountability) exposes the inclusion-proof verifier so
  anyone can independently confirm a pick was in the committed set.

**Conclusion:** The Merkle commitment scheme is implemented, deterministic, and
publicly verifiable via `/api/verify` and `/api/proof/*`.

---

## 10. Pricing is proof-gated, not calendar-gated — `/pricing`

**Claim (verbatim, `/pricing` line 373-375):** "Prices only rise when a verified proof
milestone is met — never on a marketing calendar." + "We're pre-track-record, so the
launch cohort gets the lowest price we will ever offer."

**Verdict: SUPPORTED.**

**Evidence:**
- `apps/web/lib/pricing/pricing-phases.ts` `PRICING_PHASES` (lines 66-135): four named
  phases (FOUNDING, PROVEN, ESTABLISHED, AUTHORITY), each with explicit
  `triggerMetrics` (e.g., PROVEN requires ≥100 canonical settled picks + published
  calibration; ESTABLISHED requires ≥500 + CLV beat rate ≥52.4%).
- `getCurrentPricingPhaseId` (line 149-151): advances via `PRICING_PHASE` env var,
  **defaulting to "FOUNDING"** — the safest/lowest price. No auto-advance; explicit
  human action only.
- Grandfather guarantee (line 174): "Your price is locked for the life of your
  subscription" — enforced at the Stripe subscription level (line 20-21 comment).
- `annualSavingsPct` (line 163) and `annualMonthlyEquivalent` (line 170) are pure
  functions computing real arithmetic from `TierPrice` objects — the displayed savings
  cannot drift.

**Conclusion:** Pricing escalation is milestone-gated and operator-advanced; the current
default phase is FOUNDING (entry prices). The grandfather lock is documented in code.

---

## 11. "No certainty theater" / risk disclosures — all surfaces

**Claim (various):** "No guarantees. Picks are informational." / "Past performance does
not guarantee future results."

**Verdict: SUPPORTED.**

**Evidence:**
- `apps/web/lib/trust-claims.ts` entries `risk.no-guarantee` (line 231), `risk.past-performance`
  (line 241), `risk.gamble-responsibly` (line 251) — all APPROVED with `REGULATORY` evidence.
- `BANNED` claims (lines 265-368): `guaranteed`, `lock`, `sure thing`, `risk-free`,
  `easy money`, `can't lose`, `verified track record`, `thousands of bettors`,
  `trusted by serious bettors`, `guaranteed profit` — all have `EvidenceType: NONE` and
  `status: BANNED`. A scanner (`scanForBannedPhrases`, lines 446-474) plus a numeric-claim
  detector (`scanForNumericPerformanceClaims`, lines 568-615) run in CI to block
  regressions.
- `apps/web/app/methodology/page.tsx` line 265: "While live floors are still red, we do
  not claim PROVEN performance or ROI."

**Conclusion:** The codebase ships with an active ban-list + scanner. Certainty-language
claims that would be problematic in an uncertain domain are structurally excluded from
public copy.

---

## 12. "Seven sports" coverage — `/picks` FAQ + `/methodology`

**Claim (verbatim, `/pricing` FAQ line 221):** "NFL, NCAAF, NBA, NCAAB, MLB, NHL, and
MLS." (seven leagues)

**Verdict: SUPPORTED — by enumeration, not by a count claim.**

**Evidence:**
- `/pricing/page.tsx` FAQ (line 222) lists the seven leagues explicitly — a fixed
  enumeration, not a numeric count claim. This is honest by construction (if a league is
  dropped, the list must be edited).
- `packages/prediction-engine/src/team-rates.ts` `isPoissonValidSport` /
  `dixon-coles.ts` `isDixonColesValidSport` each enumerate these sport keys in their
  sport-coverage switches. No claim exceeds the enumerated set.

**Conclusion:** A seven-sport claim is backed by an explicit enumerated list (no numeric
exaggeration or dynamic count that could drift).

---

## Summary table

| # | Claim (surface) | Status | Evidence file |
|---|---|---|---|
| 1 | 30-min odds cadence (`/about`) | UNSUPPORTED | trust-claims.ts:96 (reviewNote refuses cadence); no constant in codebase |
| 2 | Every pick traces to a real line (`/about`) | SUPPORTED | proof-of-record.ts:129; receipt-proof.ts:85 |
| 3 | 64% "calibrated confidence" (`/about`) | SUPPORTED w/ precision note | calibration-apply.ts (inactive by default); methodology:270 |
| 4 | Two free picks/day (`/engine`) | SUPPORTED | picks/page.tsx:161 (`dailyPickLimit: 2`) |
| 5 | Edge Index public, confidence paid (`/edge-index`) | SUPPORTED | scoring.ts:105; types/index.ts:128,131; board/state.ts:69 |
| 6 | Edge ≠ win probability (`/methodology`) | SUPPORTED | conviction-tier.ts:14; ranking-prob.ts; types/index.ts:68 |
| 7 | Win rate gated until defensible (`/performance`) | SUPPORTED | readiness.ts:63; wilson-interval.ts:72; compute.ts:198 |
| 8 | CLV gated until defensible (`/clv`) | SUPPORTED | public-clv-policy.ts:62; /clv:89 |
| 9 | Tamper-evident receipts (`/proof`) | SUPPORTED | proof-of-record.ts:37; receipt-proof.ts:86 |
| 10 | Prices proof-gated, not calendar-gated (`/pricing`) | SUPPORTED | pricing-phases.ts:66; platform-config.ts (defaults off) |
| 11 | No certainty / banned-phrase guard | SUPPORTED | trust-claims.ts:263-368; scanForBannedPhrases:446 |
| 12 | Seven-sport coverage (`/pricing` FAQ) | SUPPORTED | pricing/page.tsx:222 (explicit enumeration) |

## Overall verdict

**11 of 12 enumerated claims are SUPPORTED** by direct code tracing. **1 claim (#1,
the 30-minute ingestion cadence on `/about`) is UNSUPPORTED** — the claim registry
itself refuses to bless a frequency, and no enforced constant backs the number. This is
a low-severity editorial gap: it is a specific cadence figure in illustrative copy,
not a performance/win-rate claim, and it contradicts the product's own approved trust
language. Two minor precision notes (items 3 and 5) are terminological, not factual —
they describe the system's *intent* rather than a false public-facing number.

The codebase's strongest structural defense is that **nearly every public-facing
number is gated behind a readiness switch that defaults OFF** (`publicPicksEnabled`,
`performanceStatsEnabled`, `canonicalHistoryEnabled` all default to `false` in
`platform-config.ts`). When gates are closed, surfaces render "Collecting" /
"Gated" / "accruing" copy rather than invented numbers (see `/performance` bootstrap
state, `/clv` gated state, `/picks` gate message, `loadEngineStory` empty/quiet-day
states). The single codebase-level guardrail against false precision is the **Wilson
score interval** (`wilson-interval.ts`), which surfaces a 95% CI band and only allows a
break-even claim when the *lower bound* clears 52.4% — not the point estimate.
