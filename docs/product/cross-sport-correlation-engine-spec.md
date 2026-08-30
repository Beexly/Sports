# Cross-Sport Correlation Engine — Specification

**Status:** Phase 5 build. Radical #7.
**Owner of code:** Codex.
**Owner of query UX + voice:** Claude.
**Location:** `apps/web/app/correlate/`, `apps/web/lib/correlation-engine/`.
**Decision reference:** master plan Part 2.C.5.

---

## TL;DR

Pro+ users test their own hypotheses against Galaxy's historical data. Query like *"When MLB sharp money moved on day 3 of a 4-game series, what happened to NHL overs the same night?"*

Save queries, share results. The first sports betting product where you can run your own hypothesis tests on cross-sport historical data.

---

## Why this matters

Almost no one publishes the data needed to ask cross-sport questions in a meaningful way. The market has plenty of single-sport analytics, almost none with sport-to-sport correlations.

The correlation engine surfaces patterns most bettors suspect but can't verify: "when one sport's market gets volatile, do other sports follow?" "Does sharp money in MLB on the East Coast correlate with anything in NBA on the West Coast that night?" "When NFL openings are bullish on home dogs, do NCAA home dogs perform better the next day?"

The engine doesn't promise these correlations exist. It lets users find out. Some hypotheses will hold; most won't. The product is the inquiry.

---

## Query model

A correlation query has three parts:

1. **Trigger event** — what defines an "event" in sport A.
2. **Observation window** — what time horizon to look at sport B.
3. **Outcome** — what we're measuring in sport B.

### Example

```
trigger:
  sport == "MLB" and
  market.sharp_money_signal == true and
  game.day_of_series == 3 and
  game.series_length == 4

observation_window: same_night

outcome:
  sport == "NHL" and
  measure pick.over_under_outcome
```

This query asks: on days when MLB sharp money moved on day 3 of a 4-game series, what's the over/under outcome distribution for NHL games the same night?

The engine runs the query against the historical `Pick` + `GameSignal` + settlement data. Returns aggregate stats with confidence intervals.

---

## Output shape

```ts
type CorrelationResult = {
  query: CorrelationQuery;
  sampleSize: number;
  triggerEventCount: number;
  observationCount: number;
  outcome: {
    measure: string;
    overallRate: number | null;
    triggerRate: number | null;
    delta: number | null;
    confidenceInterval: [number, number] | null;
    significance: SignificanceMarker;
  };
  warning: string | null;
  computedAt: string;
  modelVersion: string;
};

type SignificanceMarker = "INSUFFICIENT_SAMPLE" | "WEAK" | "MODERATE" | "STRONG" | "VERY_STRONG";
```

The output explicitly carries:

- Sample size — users see exactly how many historical events matched.
- Confidence interval — never a single percentage without the range.
- Significance marker — qualitative tag, NOT a p-value (the engine is not a stats package).
- Warning — populated when sample is too small to draw conclusions ("only 8 trigger events in your date range").

---

## Data sources

Pure historical data. No live signals.

- `Pick` rows with `settledAt IS NOT NULL` and `eligibleForLearning = true`.
- `GameSignal` rows.
- `SourceSnapshot` rows.
- `IngestionRun` for freshness/timestamp anchoring.

The engine runs against a frozen snapshot of the data. Re-running the same query later may produce slightly different results as new historical data settles in.

---

## Query UI

### Visual query builder (default)

For users not ready to write DSL:

```
┌────────────────────────────────────────────────────┐
│ TRIGGER EVENT                                       │
│ Sport: [MLB ▾]                                      │
│ When: [✓ sharp money signal active]                 │
│ And:  [day of series == 3]                          │
│ And:  [series length == 4]                          │
├────────────────────────────────────────────────────┤
│ OBSERVATION WINDOW                                  │
│ [Same night ▾]                                      │
│ ○ Same night  ○ Next day  ○ Within 7 days          │
├────────────────────────────────────────────────────┤
│ OUTCOME                                             │
│ Sport: [NHL ▾]                                      │
│ Measure: [Over/Under outcome ▾]                     │
├────────────────────────────────────────────────────┤
│  [Run query]   [Save]   [Open in DSL editor]       │
└────────────────────────────────────────────────────┘
```

### DSL mode

Elite tier (and Pro tier via Phase 5 DSL spec) can write queries in the programmable DSL syntax:

```
correlate
trigger:
  sport == "MLB" and
  market.sharp_money_signal == true and
  game.day_of_series == 3 and
  game.series_length == 4
observe same_night
outcome:
  sport == "NHL" and
  measure pick.over_under_outcome
```

The DSL spec from Phase 5 covers the syntax + parser. The correlation engine adds the `correlate`, `trigger`, `observe`, `outcome`, `measure` keywords on top.

---

## Result rendering

The result page renders:

1. **Headline number** — the delta between trigger-conditioned outcome rate vs the unconditional outcome rate.
2. **Sample size + significance marker** — prominent. Users see immediately whether the result is meaningful.
3. **Confidence interval** — visualized as a range around the delta, not just a single number.
4. **Sample distribution** — small chart showing the spread of outcomes in the sample.
5. **Linked trigger events** — list of specific historical events that matched, each linking to the Game Room.
6. **Disclaimer** — *"This is historical correlation, not future prediction. Past patterns may not hold. Sample sizes shown."*

---

## Voice rules

The result page reads as a research output.

**Pass:**

- *"When MLB sharp money fired on day 3 of a 4-game series (N=42 events), NHL overs the same night hit 56% (CI: 41% – 71%, MODERATE)."*
- *"Sample is too small (N=8) to draw conclusions. Try widening the date range."*

**Fail:**

- *"You'll never guess what we found!"*
- *"This pattern is GUARANTEED to work for you."*
- *"Bet NHL overs every MLB sharp-money night and profit."*

The result is data, not a recommendation. The engine never says "bet this."

---

## Save / share

Same as the DSL spec. Saved correlation queries become URL-shareable. Pro+ users can star public queries. The community library at `/correlate/community` surfaces the most-starred queries.

Saved correlations re-run their query against the latest data when opened, with a timestamp showing when the result was last computed.

---

## Tier behavior

- **FREE:** can see public community queries, cannot run them (read-only).
- **PRO:** can run queries via the visual builder. 10 queries per day rate limit.
- **ELITE:** can run queries via DSL mode. 100 queries per day rate limit. Can save unlimited queries.

---

## Anti-patterns we're avoiding

- **No "secret pattern" framing.** Correlations found are not secrets; the engine is public. Users find what they find.
- **No certainty language.** Output is always probabilistic with confidence intervals.
- **No "follow this pattern" recommendation.** The engine surfaces data; it doesn't recommend bets.
- **No p-value theater.** We use qualitative significance markers (WEAK / MODERATE / STRONG) rather than implying statistical rigor we can't deliver.

---

## Acceptance criteria (Phase 5 correlation engine v0 → green)

1. Visual query builder functional.
2. DSL mode parsing + execution.
3. Query runs against full historical data within performance budget (under 10 seconds for typical query).
4. Result includes sample size, CI, significance marker.
5. Save + share + star functionality.
6. Community page surfacing most-starred queries.
7. Tier rate limits enforced.
8. Brand-safety scan on result rendering returns zero hits.
9. Result page disclaimer present and not removable.
10. Performance acceptable on full data set (Phase 2 Loss Room data, Phase 3 Twitter bot data, Phase 4 calibration data all queryable).

When all 10 hold, the correlation engine is v0-live.

---

## Open items

- **OPEN-CORR-1:** Should the engine cache results per (query hash, data snapshot timestamp)? Default: yes, with TTL matching the data snapshot timestamp. Codex confirms.
- **OPEN-CORR-2:** Should the engine support cross-user query libraries (e.g. "queries my friends starred")? Default: no in v0. Privacy-preserving design — public queries are public; private queries are private.
- **OPEN-CORR-3:** Should the engine produce visualizations beyond the basic result chart? Default: no in v0. The result page is the chart. Phase 6+ may add custom viz.
- **OPEN-CORR-4:** Performance ceiling — what's the largest query the engine should run? Default: full historical data set. Codex tunes performance budget during load testing.

---

*Spec authored by Claude. Codex implements engine. The product is the inquiry, not the answer.*
