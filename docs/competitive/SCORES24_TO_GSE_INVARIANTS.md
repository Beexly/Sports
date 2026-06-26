# Scores24 → GSE Invariants

> **Rights posture.** This is original competitive analysis of publicly observable *business surfaces*.
> It contains **no** Scores24 content, data, predictions, copy, graphics, or scraped material.
> Scores24 is classified `permission_required` in `apps/web/lib/scraping/source-rights-registry.ts`:
> manual UX research is allowed; automation requires written consent from Kiito OÜ
> (support@scores24.live). **Scores24 is never a GSE data source.** GSE builds the original,
> rights-safe answer. Nothing here is derived from their site as data.

## The eleven surfaces → GSE invariants

---

### 1. Scores24 Matches → GSE Event Genome

| Field | Detail |
|---|---|
| **User intent** | See live scores, stats, and context for a specific game |
| **Monetization intent** | Traffic anchor; surfaces odds and tip links beside results |
| **GSE superior object** | `UniversalEventGenome` (`MATCH_GENOME_SYSTEM.md`) |
| **Required ClaimObject types** | `MATCH_STAT`, `DERIVED_STAT`, `ODDS_PRICE`, `MARKET_STATE` |
| **Rights/compliance risk** | Fetching live scores from uncleared sources; fixture watermark must block live rendering |
| **First fixture impl** | `event-genome-fixtures.ts`; every stat carries `passport`, `weakness`, `decisionUse`; `fixtureWatermarked: true` |
| **First live-gated impl** | Live ingest via cleared provider; `isLive()` returns `true` only on settled live genome; authority meets Source-reality layer |
| **Tests needed** | Fixture never renders as live; zero-division safe; missing stat is `null` + weakness, never imputed; generic adapter always loads |

---

### 2. Scores24 Predictions → GSE Prediction Court / Prediction Trial

| Field | Detail |
|---|---|
| **User intent** | Know which team to back and how confident to be |
| **Monetization intent** | The confident tip is the click; affiliate conversion follows |
| **GSE superior object** | `PredictionTrial` via `gradePrediction()` (`PREDICTION_COURT.md`) |
| **Required ClaimObject types** | `PREDICTION` |
| **Rights/compliance risk** | Any over-strong public claim that exceeds the authority ceiling; fixture trials must never be public performance claims |
| **First fixture impl** | `prediction-court.ts`; `processGrade` + `outcomeGrade` independent; `countsAsPublicPerformance: false` on all fixtures |
| **First live-gated impl** | Settled live trials feed `publicPerformanceStatus()`; gate opens only after audited calibrated history |
| **Tests needed** | Process grade and outcome grade are independent; push is not a win; one win never upgrades authority; missing odds → `DATA_MISSING`; over-claim caught even on a winning outcome |

---

### 3. Scores24 Trends → GSE Trend Passport

| Field | Detail |
|---|---|
| **User intent** | Find patterns that suggest a likely result |
| **Monetization intent** | Pattern urgency ("8 of last 9") hooks trust and drives accumulator construction |
| **GSE superior object** | `TrendPassport` via `buildTrendPassport()` (`TREND_PASSPORTS.md`) |
| **Required ClaimObject types** | `TREND` |
| **Rights/compliance risk** | Stacked filters on small samples constitute p-hacking; correlated trends counted as independent evidence |
| **First fixture impl** | `trend-passport.ts`; `fragilityScore`, `overfitRisk`, `pHackingRisk`, `correlatedTrends`, `whatWouldInvalidate` all computed |
| **First live-gated impl** | Live market line required to lift `authorityCeiling` from `INFO_ONLY` to `WATCH`; Trend Trial records process apart from outcome |
| **Tests needed** | Small samples produce high fragility; overlapping trends flagged non-independent; no market line → no action (`INFO_ONLY`); trend caps at `WATCH`, never a public action |

---

### 4. Scores24 Odds → GSE Market Lifecycle / Market Bloom

| Field | Detail |
|---|---|
| **User intent** | See current odds and whether now is the right moment to act |
| **Monetization intent** | Odds display drives affiliate click-through to the book |
| **GSE superior object** | `MarketBloom` via `classifyMarketBloomStage()` + `marketBloomToDecisionState()` (`MARKET_BLOOM.md`) |
| **Required ClaimObject types** | `ODDS_PRICE`, `MARKET_STATE` |
| **Rights/compliance risk** | Stale or thin markets falsely implied as actionable; odds from uncleared sources |
| **First fixture impl** | `market-bloom.ts`; nine-stage classification from `bookCount`, `minutesSinceUpdate`, `caughtUpToFair`; birth is never an action |
| **First live-gated impl** | Live book-count and timestamp feed; `CAUGHT_UP → TOO_LATE` suppresses action; `STALE → NEEDS_LIVE_DATA` suppresses action |
| **Tests needed** | Stage classification across book-count and staleness thresholds; `CAUGHT_UP → TOO_LATE`; `STALE → NEEDS_LIVE_DATA`; fixture market that caught up suppresses action |

---

### 5. Scores24 Bonuses → GSE Bonus Passport / Offer Integrity

| Field | Detail |
|---|---|
| **User intent** | Find a sportsbook sign-up offer worth taking |
| **Monetization intent** | Core affiliate revenue: CPA or rev-share per sign-up |
| **GSE superior object** | `BonusPassport` via `buildBonusPassport()` (`BONUS_OFFER_INTEGRITY.md`) |
| **Required ClaimObject types** | `BONUS` |
| **Rights/compliance risk** | Claiming an offer is `risk-free`, current, or legal without verification; jurisdiction mismatch; no responsible-gaming disclosure |
| **First fixture impl** | `bonus-passport.ts`; `displayAllowed` requires `lastVerifiedAt`, verified legality status, caveat on no-loss style promotional claims; `RG_DISCLAIMER` always present |
| **First live-gated impl** | Owner-configured `affiliateConfigured: true` gate; live `lastVerifiedAt` refresh pipeline; `LegalityStatus` verified per jurisdiction |
| **Tests needed** | No active affiliate link without `affiliateConfigured`; no "current" offer without `lastVerifiedAt`; no `risk-free` framing without caveat; disclaimer always propagates |

---

### 6. Scores24 Sportsbooks → GSE Bookmaker Evidence Card

| Field | Detail |
|---|---|
| **User intent** | Know which bookmaker to use and why |
| **Monetization intent** | "Best bookmaker" ranking funnels sign-ups; highest-CPA books rank highest |
| **GSE superior object** | `BookmakerRatingPassport` via `buildBookmakerRating()` (`BONUS_OFFER_INTEGRITY.md`) |
| **Required ClaimObject types** | `BOOKMAKER_RATING` |
| **Rights/compliance risk** | Claiming "best" without a stated method; ignoring jurisdiction; criteria hidden in affiliate incentive |
| **First fixture impl** | `buildBookmakerRating()` requires stated ranking criteria; no "best" label without published method and verified jurisdiction |
| **First live-gated impl** | Live jurisdiction verification feed; criteria versioned and auditable; rating page renders only verified `BOOKMAKER_RATING` claims |
| **Tests needed** | No ranking without stated criteria; no "best" claim without verified jurisdiction; rating carries authority ceiling |

---

### 7. Scores24 Tools → GSE Risk Diagnostics (Slip MRI family)

| Field | Detail |
|---|---|
| **User intent** | Use calculators and converters as a decision aid |
| **Monetization intent** | Tool pages generate SEO traffic and return-to-bet engagement |
| **GSE superior object** | `SlipMRI` diagnostic tools (`SLIP_MRI.md`) |
| **Required ClaimObject types** | `DECISION_CARD` |
| **Rights/compliance risk** | Tools framed as action endorsement; no authority ceiling stated; manufactured confidence |
| **First fixture impl** | Every tool output carries an authority ceiling and a proof link; framed as risk diagnosis, not action endorsement |
| **First live-gated impl** | Live data inputs surface live authority ceiling; `PROCEED_WITH_CAUTION` remains the maximum verdict regardless of input |
| **Tests needed** | Tool output carries authority ceiling; no `profit` or `best bet` framing; responsible warning always present |

---

### 8. Scores24 Accumulators → GSE Slip MRI

| Field | Detail |
|---|---|
| **User intent** | Build a multi-leg bet and assess whether it is sound |
| **Monetization intent** | Accumulators are high-hold products; the site profits from parlay construction |
| **GSE superior object** | `SlipMRI` via `analyzeSlip()` (`SLIP_MRI.md`) |
| **Required ClaimObject types** | `DECISION_CARD` (over multiple `PREDICTION`, `ODDS_PRICE`, `TREND` claims) |
| **Rights/compliance risk** | Hiding correlation between legs; inflating implied independence; no responsible-gaming warning |
| **First fixture impl** | `slip-mri.ts`; correlation detection, duplicated assumptions, weakest-leg identification, `whatWouldBreakSlip`; verdict ladder tops at `PROCEED_WITH_CAUTION` |
| **First live-gated impl** | Live odds feed per leg; authority ceiling is meet across all legs; an `INFO_ONLY` leg forces `PASS` |
| **Tests needed** | Correlated legs flagged → `PASS`; unsupported leg forces `PASS`; strongest verdict is `PROCEED_WITH_CAUTION`; responsible warning always present |

---

### 9. Scores24 Articles → GSE Proof Articles

| Field | Detail |
|---|---|
| **User intent** | Read context, analysis, and background on a match or team |
| **Monetization intent** | Long-form SEO content captures organic search; internal links drive bets |
| **GSE superior object** | Proof Articles backed by `WEB_EVIDENCE` and `RESOURCE` ClaimObjects (rights-gated) |
| **Required ClaimObject types** | `WEB_EVIDENCE`, `RESOURCE`, `SOURCE_LINEAGE` |
| **Rights/compliance risk** | Republishing article bodies; reproducing proprietary analysis; scraping protected content; authority overstated without lineage |
| **First fixture impl** | Every claim in an article carries `SOURCE_LINEAGE`; `WEB_EVIDENCE` object records URL, access date, rights status; no article body republished |
| **First live-gated impl** | Live lineage refresh; Scraping Clearance Engine gates every extraction; `RightsSnapshot` captured at extraction time propagates to all derived outputs |
| **Tests needed** | Article claim carries `SOURCE_LINEAGE`; `WEB_EVIDENCE` object present; `permission_required` source produces `DO_NOT_USE`; rights snapshot immutable after capture |

---

### 10. Scores24 My Matches → GSE Edge Watchlist

| Field | Detail |
|---|---|
| **User intent** | Track followed games and get notified of relevant changes |
| **Monetization intent** | Notifications re-engage the user with the bet-now surface |
| **GSE superior object** | `WatchlistAlert` via `buildAlert()` (`MY_MATCHES_AND_ALERTS.md`) |
| **Required ClaimObject types** | `ALERT` |
| **Rights/compliance risk** | Manufactured urgency; bet-now language in alert copy; user frequency ignored |
| **First fixture impl** | `watchlist-alerts.ts`; `reason` and `proofRef` mandatory; bet-now language rejected at construction; `GOOD_PASS_CONFIRMED` alert type celebrates restraint |
| **First live-gated impl** | Live event feed drives `lineup changed`, `market opened/moved/matured`, `prediction-trial settled`; `applyFrequency()` respects user's `maxPerDay`, `quietHours`, `mutedTypes` |
| **Tests needed** | Every alert has a reason and a proof reference; bet-now reason rejected at construction; frequency settings filter the batch; `GOOD_PASS_CONFIRMED` fires on a correct pass |

---

### 11. Scores24 Bookmaker Ratings → GSE Offer Integrity Registry

| Field | Detail |
|---|---|
| **User intent** | Compare bookmakers by trust, market depth, and jurisdictional availability |
| **Monetization intent** | Rating page is the highest-value affiliate funnel; "top-rated" books are typically highest-CPA partners |
| **GSE superior object** | `BookmakerRatingPassport` + `BonusPassport` registry (`BONUS_OFFER_INTEGRITY.md`) |
| **Required ClaimObject types** | `BOOKMAKER_RATING`, `BONUS` |
| **Rights/compliance risk** | Criteria hidden in affiliate arrangement; jurisdiction falsely implied as universally legal; no update cadence stated |
| **First fixture impl** | Registry fixture with stated criteria, verified jurisdiction per entry, `lastVerifiedAt` per rating; `GSE_BETTING_POSTURE.operatesBetting: false` asserted |
| **First live-gated impl** | Owner-configured entries only; live jurisdiction verification sweep; rating page validates only `BOOKMAKER_RATING` + verified `BONUS` claims at render time |
| **Tests needed** | No entry without stated criteria; no "best" implication without published method; jurisdiction status is `VERIFIED_LEGAL` or entry does not display; posture flag asserted |

---

## Structural asymmetry

Every Scores24 monetization lever depends on manufactured certainty: a confident tip, a stacked trend,
a parlay push, a "best book" funnel, a notification engineered to return you to a bet. Each is a place
where the honest answer reduces conversion. A system built on the honest answer cannot be grafted onto
that funnel — the funnel requires the dishonesty. GSE's governed-meaning model is not a feature
Scores24 can adopt; it is the opposite of their revenue architecture. Adopting it would require them
to replace `lock` with a fragility score, replace `guarantee` with a process grade, replace `sure
thing` with a `WATCH`-ceiling trend, and replace `best bet` with `PROCEED_WITH_CAUTION` — at which
point the conversion event disappears.

A skeptic says: *"Scores24 showed me a betting page. GSE showed me the truth architecture underneath
the game."*
