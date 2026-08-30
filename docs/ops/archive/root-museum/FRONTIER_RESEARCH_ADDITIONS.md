# GSE — Frontier Research Additions

Frontier sources added beyond the standing set, logged per the brief: why added,
what gap it fills, what was learned, whether it changes the plan. Labels:
`verified-ext` · `recommended` · `inferred`.

---

## Addition 1 — Odds-data provider landscape & failover architecture (fills R5)

**Why added:** R5 — GSE depends on a single odds provider (`the-odds-api`) with no
failover. If the key is revoked (ToS, see `COMPLIANCE_AND_RESPONSIBLE_GAMING.md`),
rate-limited, or the service degrades, ingestion stops → no picks → the product goes
dark. This is the ingestion single-point-of-failure that pairs with the settlement
SPOF already fixed this session.

**Provider landscape (`verified-ext`, 2026):**

| Provider | Books | Notes | Fit for GSE |
|---|---|---|---|
| **the-odds-api** (current) | ~40 | credit-based, transparent pricing, no sharp books | ✅ primary — cost-effective for 7 sports / 3 markets / 30-min cadence |
| **SportsGameOdds** | 80+ (incl. **Pinnacle**) | WebSocket streaming, objects billing $99–$499/mo, **free tier** | ★ best failover candidate (Pinnacle = sharp anchor; free tier to start) |
| **SharpAPI** | US focus | SSE streaming, built-in +EV, generous free tier | strong US-only fallback |
| **OddsPapi** | 300+ | widest coverage | breadth option |
| **OpticOdds** | 200+ | enterprise; injuries, scores, AI consensus | overkill/expensive now; revisit at scale |
| **OddsJam API** | 100+ | historical odds feed (great for backtesting) | useful later for calibration backtests |
| **Sportradar** | official/licensed | $10k+/mo | not until enterprise scale |

**What GSE actually needs (`inferred`):** GSE is a *picks* platform on a 30-minute
refresh — **not** a live in-play book. So ultra-low latency (sub-100ms feeds) is
irrelevant; the requirement is **resilience + a sharp anchor**, not speed. A single
sharp-inclusive failover (SportsGameOdds → Pinnacle) plus the existing freshness gate
covers the real risk.

**Key learning — GSE's schema already anticipated this (`verified-code`):**
`SourceSnapshot.provider`, `GameSignal.sourceName` + `trustLevel`, and `SignalCategory`
are all source-aware. The data model is multi-provider-ready by design; only the
ingestion client is single-provider.

**Recommended architecture (`recommended`):**
1. Introduce an `OddsProvider` interface in `packages/data-ingestion` (the existing
   `OddsApiClient` becomes one implementation). `processSport()` already abstracts the
   client, so this is a contained refactor.
2. Primary = the-odds-api; secondary = SportsGameOdds (free tier to validate). On
   primary failure/empty/quota-exhausted, fall back to secondary; record `provider`
   on the `SourceSnapshot` (already supported) so every pick is traceable to its feed.
3. The existing `FRESHNESS_THRESHOLD_MS` (1h) + readiness gates already reject stale
   data — keep them as the safety net so a degraded feed never produces a stale pick.
4. Add a `trustLevel` per provider (Pinnacle-anchored feeds weighted higher) — the
   `GameSignal.trustLevel` field already exists for this.

**Does it change the plan?** Yes — adds an R5 mitigation path. But it's an integration
that needs a **second provider key** (owner action) and a contained `data-ingestion`
refactor; **gated** on the key. The interface refactor itself is safe to do ahead of time.

**Sources:** [SharpAPI provider comparison](https://sharpapi.io/compare/best-sports-betting-apis) ·
[SportsGameOdds provider comparison](https://sportsgameodds.com/blog/comparing-odds-api-providers) ·
[isportsapi 2026 latency/reliability guide](https://www.isportsapi.com/en/blog/others-2323-2026-guide:-optimize-sports-data-api-latency,-reliability-&-real-time-performance.html) ·
[Oddsmatrix odds API integration](https://oddsmatrix.com/odds-api-explained/).

---

> Further frontier additions (calibration/forecasting literature, design systems,
> growth case studies) are folded into the relevant artifacts:
> `COMPETITIVE_INTELLIGENCE.md`, `COMPETITIVE_PRICING_AND_PACKAGING.md`,
> `CUSTOMER_PSYCHOLOGY_AND_GROWTH_REPORT.md`, and the probability-calibration R&D
> module (`packages/prediction-engine/src/probability-calibration.ts`).
