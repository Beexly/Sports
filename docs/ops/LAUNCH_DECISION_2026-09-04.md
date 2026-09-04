# Launch decision memo — 2026-09-04

One page. Everything here traces to a command run tonight; the supporting detail is in
`docs/data/NFL_REPLAY_CALIBRATION_2026-09-04.md` and the PRs named inline.

---

## 1. What we now know that we did not know yesterday

**A corpus-poisoning bug, found and fixed.** nflverse `spread_line` is *positive =
home favored*; this repo is *negative = home favored*. The backfill forwarded the raw
column, so **every backfilled SPREAD pick was on the wrong team.** Proven on the 16-0
2007 Patriots: the engine published `WAS -15.0` at confidence 64 — Washington laying
15 on the road to an undefeated team — while its own moneyline pick on the same game
was `NE ML (-1225)`. Fixed in **#695**. Every number below post-dates that fix; no
earlier measurement of this engine is usable.

**The first honest measurement of the model.** 1999-2025 REG, 6,967 games, **15,939
settled picks, 0 lookahead errors**:

| | n | win rate | ROI |
|---|---|---|---|
| SPREAD | 6,778 | 48.86% | **−6.53%** |
| TOTAL | 6,868 | 49.49% | **−5.44%** |
| MONEYLINE | 2,001 | 76.71% | **−1.96%** |
| **all** | **15,647** | 52.70% | **−5.48%** |

The 52.70% headline is an artifact of averaging markets priced differently. **The
honest single number is ROI: −5.48% per unit staked.** Every market is negative,
moneyline included — it wins three of four bets and still loses money.

**Nothing the engine emits ranks outcomes.** AUC (probability a winning pick scored
higher than a losing one; 0.5 = coin flip), 13,646 picks, permutation-tested (**#698**):

```
confidence          AUC=0.4965  p=0.4113   no discrimination
|line| magnitude    AUC=0.4982  p=0.7156   no discrimination
rest differential   AUC=0.5019  p=0.6342   no discrimination
week of season      AUC=0.5073  p=0.1329   no discrimination
```

The control rows matter as much as the first. If a pre-game **fact** discriminated
while confidence did not, the signal would exist and simply not be used — an
engineering problem. None do. Against the closing line, nothing here separates ATS
winners from losers. That is the textbook market-efficiency result, now measured
in-house rather than assumed.

**And no segment escapes it.** Eleven market shapes tested — favourite/underdog, four
spread-magnitude bands, over/under, four total bands. **Zero cleared break-even** on
the Wilson lower bound.

---

## 2. What that does and does not license saying

**Licensed:** *"Replayed against 27 seasons of closing lines, our spread and total
picks lose 5-6% of stake, and our confidence score does not rank them."*

**Not licensed:** that the model is worthless, or that no edge exists anywhere. Every
number above is measured **against the closing line** — the hardest available
benchmark — with synthetic book depth. Three things are therefore untested, not
disproven:

1. **CLV.** Entry equals close by construction, so every pick grades `MATCHED_CLOSE`
   and beating an *earlier* line cannot be measured here. This is the one avenue the
   evidence has not closed, and `docs/positioning.md` already treats CLV as the proof
   metric.
2. **Edge Index and the ELITE/STRONG/SOLID/LEAN ladder.** The replay prices both sides
   at −110, so `rawEdge` is a constant and every pick grades `LEAN`. Untestable here.
3. **Consensus and market depth**, degenerate for the same reason.

---

## 3. The decision

Confidence **is** the paywall: `tier = confidence >= PREMIUM_CONFIDENCE_THRESHOLD ?
"PREMIUM" : "FREE"` (`scoring.ts:541, :750, :945`). So the AUC result is not an
internal metric problem — it says **we cannot currently demonstrate that the picks
behind the paywall are better than the ones we give away.**

To be precise, because precision is the product: the premium/free gap is **not**
statistically significant (z = −1.19, p = 0.235). We have not shown premium is
*worse*. We have failed to show it is *better*, on 13,463 picks.

Three honest options:

**A — Launch on proof, not on edge.** Sell the thing we can actually demonstrate:
timestamped picks, a published reliability curve, a CLV ledger, and the factor trail.
Charge for transparency and tooling, not for a win-rate claim. This is the only option
fully consistent with *"We're not AI. We're math you can read"* — and with §5 of
`path-to-70.md`, which already forbids a blended headline.

**B — Launch the board free, gate on proof.** Keep the paid tier dark until the ladder's
own gate is met (FOUNDING → PROVEN: ≥100 settled + published calibration). Costs
revenue on day one; costs nothing in credibility.

**C — Launch as planned.** Charges for a confidence sort we cannot substantiate. Given
that regulators have required disclosure of real user success rates, and that the whole
brand is *not lying about our own performance*, this is the option with asymmetric
downside.

**Recommendation: A, with B as the fallback if the reliability surface isn't ready.**
The measurement that would change this is CLV against an opening line — and it needs a
lines archive carrying both open and close, which we do not have
(`docs/data/CFB_SOURCE_DECISION_2026-09-04.md` §2).

---

## 4. What is ready to merge

| PR | What | Blocking? |
|---|---|---|
| **#695** | Spread-sign fix + 27-season replay + edge hunt + totals pin | **Keystone** — #696/#697/#698 stack on it |
| #692 | ESPN scoreboards by US Eastern day, not UTC | Late-window games settle against the wrong day |
| #694 | Soccer three-way moneyline suppressed | Overstated probability on a reachable path |
| #696 | Sport-agnostic replay (NCAAF ready for data) | No |
| #697 | `path-to-70` §8 + false-header fix | No |
| #698 | Discrimination analysis | No |
| #690 | Dispatch docs, CFBD terms, guard diagnosis | No |

## 5. Open items that need the founder, not an agent

1. **The §3 decision above.**
2. **Totals tie-break** (`scoring.ts:655`) — at the standard −110/−110 price,
   `overPrice <= underPrice` is true at every book, so the side resolves to OVER with
   `consensusPct = 1.0`, and the card tells the reader "100% of bookmakers". A market
   with no opinion is published as unanimous. Fixing it changes published picks →
   `MODEL_VERSION` decision. Pinned by tests in #695; not changed.
3. **CFBD** — terms verified permissive (quoted verbatim in the source-decision doc);
   registry stays `vendor_candidate` until a human read plus a key. One free request
   answers whether `/lines` carries a true close.
4. **`dependency-audit`** — flaky, not broken. **Do not delete the `next`/`postcss`
   waivers**; the advisories are live and the guard misreads a degraded `npm audit`
   response. Diagnosis on #690.
