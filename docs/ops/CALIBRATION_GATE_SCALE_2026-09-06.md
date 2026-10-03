# Only one of the four calibration floors binds

**Measured 2026-09-06, production. Docs only. No floor, threshold, exclusion or
engine change is proposed here or made anywhere in this commit.**

## Why this exists

The 2026-09-06 16:40 UTC note in `AGENTS.md` says that on the eligibility read
"three of the four floors pass comfortably ... ECE is the only failure and it is
narrow." Both halves are literally true and together they read as three
independent pieces of corroborating evidence against one narrow objection.

That reading is wrong, and this file corrects it. Two of the three passing floors
would also pass for a model with no skill at all, or for one whose per-bin
calibration gaps average four times the size ECE is rejecting. They are not
corroboration. Murphy reliability is still a genuine calibration constraint, and nothing here
says otherwise; it is simply far looser in the same units. **ECE is the only floor that BINDS
at the sample sizes and base rate this product actually has** (CodeRabbit, PR #716).

## The measurement

Source: `/api/ops/public-surface-truth` `calibrationEligibility`, `generatedAt`
2026-09-06T17:09:56.032Z, read from the surface itself.

```text
n          458    floor 100     PASS
Brier      0.1926 floor 0.22    PASS
MurphyRel  0.0053 floor 0.05    PASS
ECE        0.0524 floor 0.05    FAIL
baseRate   0.6900   (hitRate on the pooled MONEYLINE sample)
uncertainty 0.2139  (reported by the surface)
```

### 1. The Brier floor is passed by a forecast with zero skill

Murphy's decomposition, as implemented in
`packages/prediction-engine/src/probability-calibration.ts`, is
`Brier = REL - RES + UNC`, with `UNC = baseRate * (1 - baseRate)`.

At this sample's base rate of 0.6900, `UNC = 0.2139`. A constant forecast that
always says "0.6900" has `REL = 0` (perfectly calibrated) and `RES = 0` (no
discrimination at all), so it scores `Brier = 0.2139` and clears the 0.22 floor
with 0.0061 to spare.

The floor therefore certifies that the model is not materially worse than naming
the base rate. It does not certify skill, and it cannot fail on miscalibration
alone unless the miscalibration is severe enough to overwhelm the resolution term.

### 2. The Murphy reliability floor is 4.47x looser than the ECE floor

The two statistics measure the same thing, the per-bin gap between mean forecast
and observed rate, on different scales:

| Statistic | What it averages | Floor 0.05 means a per-bin gap of |
|---|---|---|
| ECE (`apps/web/lib/calibration/ece.ts`) | count-weighted **absolute** gap | 5.0 points |
| Murphy REL (`probability-calibration.ts:355`, `nk * (fk - ok) ** 2`) | count-weighted **squared** gap | sqrt(0.05) = 22.4 points RMS |

Both are compared against the literal number 0.05. In gap units that is a 4.47x
difference in strictness. A pass on one and a fail on the other is not two
estimators disagreeing; it is one quantity read against two floors that are not
on the same scale.

The strata make it concrete. Every model version passes the Murphy floor, and the
implied RMS gap for the worst of them is 20.8 points:

| Version | n | REL | implied RMS gap | ECE | REL floor headroom |
|---|---|---|---|---|---|
| v5.2.7 (deployed) | 245 | 0.0184 | 0.1356 | 0.1089 | 0.0316 |
| v5.2.6 | 110 | 0.0213 | 0.1459 | 0.0587 | 0.0287 |
| v5.1.0 | 74 | 0.0071 | 0.0843 | 0.0729 | 0.0429 |
| v5.0.0 | 29 | 0.0432 | 0.2078 | 0.1531 | 0.0068 |

Consistency check on the pooled sample: REL 0.0053 implies an RMS gap of 0.0728,
against an ECE (mean absolute gap) of 0.0524. RMS is at or above the mean
absolute value for any set of gaps, so the two readings are arithmetically
consistent. Nothing here suggests either statistic is computed wrongly.

### 3. The n floor is a sample-size floor

`n >= 100` says the sample is large enough to measure. It says nothing about what
the measurement found.

## What this changes and what it does not

It does not change the verdict. Eligibility is RED, ECE 0.0524 exceeds its floor,
and the deployed v5.2.7 measures 0.1089 on its own 245 rows. Nothing may be
published on that basis, and this file argues in the same direction: there is
**less** corroborating evidence than the four-line summary suggests, not more.

It does change how the passing lines should be quoted. "Three of four floors pass"
should be read as "the sample is large enough, the model is not worse than naming
the base rate, and the squared-gap floor is set loosely enough that a 20-point RMS
gap clears it." Only the ECE line carries information about calibration quality.

## Not done here, and why

No floor is changed. Tightening the Brier or Murphy floor so that they bind is a
gate change, and gates are the honesty boundary: an agent does not move one in
either direction (`AGENTS.md` law 3, law 9). The observation is recorded for the
founder; whether the gate should be re-scoped is theirs to decide, and doing
nothing is a defensible answer, because the binding floor is already the strict one.

No engine or threshold change. `MODEL_VERSION` is frozen and the levers on the
underlying number remain what they were: more settled rows, and a real calibration
pass.

## Reproducing this

```bash
curl -s https://www.galaxysportsedge.com/api/ops/public-surface-truth \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print(json.dumps(d,indent=1))" \
  | grep -A40 calibrationEligibility
```

The two derivations are one line each: `0.69 * (1 - 0.69) = 0.2139` against the
0.22 Brier floor, and `sqrt(0.05) = 0.2236` against the 0.05 MURPHY floor, which
is the squared-gap one. The ECE floor is linear, so its 0.05 is already a
5.0-point mean absolute gap and needs no square root. (An earlier revision of
this line attributed the square root to the ECE floor, contradicting the table in
section 2 above; cubic, PR #716.)

---

# There is no recoverable sample hiding in `no_rows`

**Measured 2026-09-06 on production, read-only SQL (SELECT only, zero writes).**

## Why this was worth checking

The surface reports `marketPFromOddsTable.unresolved.no_rows` at 266 of 595
candidate games. If a meaningful share of those were unresolved because of a
join or a timing defect rather than genuinely absent data, recovering them would
grow `n` honestly, which is one of the two levers the record names. It is worth
one query before anyone spends a day on it.

`loadPublishTimeMarketPResolver` keys strictly on `pick.gameId`
(`apps/web/lib/calibration/publish-time-market-p-loader.ts`), and this repo does
merge game identities (`game-identity.ts`, alias hops), so a mismatch was a real
possibility rather than a hypothetical.

## The query and the answer

Over every settled MONEYLINE pick (`result` in WIN, LOSS), one per game:

| Cohort | Picks |
|---|---|
| Total settled MONEYLINE picks | 863 |
| An H2H odds row exists at or before `generatedAt` (resolvable in principle) | 560 |
| H2H rows exist but ALL of them postdate `generatedAt` | 4 |
| Odds rows exist for the game but none in the H2H market | 2 |
| **No odds row of any market exists for the game at all** | **297** |

Then, on those 297: **every single one carries `bookmakerCount` 0**, all 297 carry
a factor breakdown, and they span 2026-08-09 to 2026-09-06.

`bookmakerCount` 0 is the signature of a signal-slate pick, and the slate writes
no odds rows (documented in `publish-time-market-p.ts` and visible in
`generate-signal-slate.ts`). These games were never book-priced. There is no
publish-time market probability to recover, because no market price ever existed.

## Alias-aware recheck (Devin Review, PR #716)

The review raised the exact mechanism flagged above, and more sharply than the query originally
tested for. `scripts/ops/merge-duplicate-games.ts` re-points `odds` rows to the canonical game
(`odds.updateMany ... data: { gameId: canonicalId }`) while its own comment states that `picks`
"are NEVER touched, they are settlement history and stay on the alias row." A pick left on an
alias whose odds moved to the canonical row would read as `no_rows` under a `pick.gameId` query
even though a real publish-time price survives.

The mechanism is real in the code. It has never fired in this database. Re-measured following
`mergedIntoGameId` up to three hops:

| Measure | Count |
|---|---|
| Game rows with `mergedIntoGameId` set (anywhere in the table) | **0** |
| Of the 297, picks sitting on an alias row | 0 |
| Of those, recoverable via the canonical row's H2H rows at or before `generatedAt` | 0 |

Zero alias rows exist, so no pick in the cohort is affected and the conclusion below stands as
measured. The `bookmakerCount` 0 evidence is also independent of this path: it records what the
engine saw at generation time, not where odds rows were later stored.

**The latent defect is still real and is worth a ledger row.** The loader keys on `pick.gameId`
with no alias resolution, so the first production run of the merge utility silently drops those
picks out of the calibration sample. Nothing here changes the loader: that is app code and does
not belong in a docs change, and today it is measurably a no-op. It should be fixed before the
merge tool is run, not after.

## What that settles

**The `no_rows` exclusion is correct by construction, not a defect.** No fix
recovers those rows, and any change that appeared to would be inventing a price.
The 6 picks in the two middle cohorts stay excluded correctly too: the probability
is fixed at publish time, so a quote that arrived afterwards is not the one the
pick was published against.

Note the counts here are a superset of the surface's own accounting (candidates
595, no_rows 266), which starts from a narrower slice: receipted picks never reach
the odds-table fallback, and three-way soccer moneylines are excluded upstream.
Both readings agree on the substance.

## Consequence

"More settled rows" cannot come from re-reading history. It has to come from new
settled picks that were book-priced at publish, which needs the book-priced flow
restored. That is ledger row **C-104 (WP-27, the two-book board)**, currently the
real bottleneck on the ECE sample, and it is owned elsewhere.
