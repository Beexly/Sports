# Product Cascade Map

How a competitive claim becomes revenue, and which concrete module owns each
step. This exists because the honesty work kept accumulating as isolated
engines with no line drawn to a paying customer. Every row below names a real
file or route — if a step has no owner, that is the gap to close next.

```
competitive claim
  → honesty engine
    → decision surface
      → proof surface
        → entitlement
          → checkout
            → retention
```

---

## 1. Competitive claim → honesty engine

The claim: competitors publish a number for every situation. We publish a
number only when the calibration actually supports one, and say so out loud
when it does not.

| Claim | Engine that makes it true |
|---|---|
| "We don't dress a thin sample as a rate" | `apps/web/lib/intelligence/hit-rate-display.ts` (`MIN_HIT_RATE_SAMPLE`), `apps/web/lib/airwave/grade.ts` (`MIN_DECIDED_FOR_PUBLISHED_RATE`) |
| "We refuse to bet when we can't pin the probability down" | `packages/prediction-engine/src/edge-lab/selective-gate.ts` — `maxWidthForFire`, reported as `widthNoBets` |
| "Our probabilities are intervals, not point guesses" | `calibration/ivap.ts`, `calibration/cvap.ts`, surfaced via `MultiprobSource` |
| "A public number carries its evidence or it doesn't publish" | `packages/prediction-engine/src/guards/display-substantiated.ts`, `apps/web/lib/ledger/display-guard.ts` (`renderableMetricOrNull`) |
| "Our sources are rights-clear" | `apps/web/lib/statking/rights/`, source lineage fields |

## 2. Honesty engine → decision surface

`applySelectiveGate` now emits, on every `FiredDecision`: `width`,
`multiprobSource`, and optionally `taxonomyCategory`. A No-Bet caused by an
over-wide interval is counted in `SelectiveGateReport.widthNoBets` rather than
silently dropped.

**Consuming surfaces:** the Board, the Lab decision cards, `/stats` (StatKing).

**Status:** the data reaches the decision object. Rendering "we refused this
because the interval was too wide" on a live card is the open last-mile step —
see Gaps below.

## 3. Decision surface → proof surface

| Surface | Route | What it proves |
|---|---|---|
| Glass Ledger | `/glass-ledger` | Per-metric coverage, lower bound, CLV backing, walk-forward provenance. Founder-gated behind `PUBLISH_LEDGER`, default off. |
| Integrity | `/integrity` | Agent control-plane governance — SHADOW default, signed receipts, keyring. **Distinct from pick honesty.** |
| Proof of record | `/proof`, `/verify` | Tamper-evident SHA-256 pick receipts. |
| Recompute | `scripts/edge-lab/recompute.ts` | The verifier a stranger can run themselves. |

The two integrity stories must not be conflated: `/integrity` is about how our
*agents* are governed; the Glass Ledger is about whether a *pick claim* is
substantiated. Same value, different subject.

## 4. Proof surface → entitlement

`packages/types/src/index.ts` → `Entitlements`:

| Key | FREE | FANTASY | PRO | ELITE |
|---|---|---|---|---|
| `canSeeEdgeScore` | ✅ | ✅ | ✅ | ✅ |
| *existence* of a No-Bet | ✅ | ✅ | ✅ | ✅ |
| `canSeeMultiprob` | — | — | ✅ | ✅ |
| `canSeeNoBetDetail` | — | — | ✅ | ✅ |
| `canSeeGlassLedger` | — | — | ✅ | ✅ |
| `canSeeRecompute` | — | — | ✅ | ✅ |

The split is deliberate: **the refusal is free, the reasoning is paid.** Seeing
that we declined to bet is the credibility hook and must never be gated —
gating it would make the pitch "more picks," which is the positioning this
product exists to reject. What converts is wanting to know *why*.

Enforcement is server-side via `apps/web/lib/entitlements.ts`
(`getUserEntitlements`) and `apps/web/lib/api-entitlement.ts`; never a
client-side check.

## 5. Entitlement → checkout

Reason-to-buy copy must lead with honesty, in this order:

1. **No-Bet protection** — we tell you when not to bet. Nobody else does.
2. **Multiprobability intervals** — a range with finite-sample validity, not a
   confident-sounding point estimate.
3. **Glass Ledger access** — every published number carries coverage, a lower
   bound, CLV backing, and walk-forward provenance, or it does not publish.
4. **Rights-clear sources** — lineage on every input.

Explicitly **not** the pitch: pick volume, "premium picks," win-rate claims.
Any checkout copy asserting a rate must pass `assertDisplaySubstantiated` or
`renderableMetricOrNull` first — no exceptions for marketing surfaces.

## 6. Checkout → retention

What keeps a subscriber:

- **No-Bet record** — a visible history of refusals that were correct is the
  compounding trust asset; it is the thing a competitor cannot fake quickly.
- **Ledger history** — accumulating substantiated claims, recomputable at any
  time.
- **Rights clarity** — no rug-pull risk from a source going dark.

---

## Open gaps (as of this document)

1. **Ledger persistence of multiprob.** `FiredDecision` carries `width` /
   `multiprobSource` / `taxonomyCategory`, but the Pedersen/ledger-chain
   encoding does not yet record them. Until it does, the honesty metadata is
   in-memory only and not recomputable from the ledger.
2. **Glass Ledger sealed-vault copy** does not yet name the recompute verifier
   path for a reader who wants to check the method before subscribing.
3. **The selective gate now HAS a production consumer — UI wiring is the
   remaining half.** `apps/web/lib/board/gate-consumer.ts` (#209) is the first
   non-research caller of `applySelectiveGate`. It builds real rows from
   production data (`Pick.confidence` → score; `Pick.result` → y with
   PUSH/VOID/PENDING excluded rather than coerced, since a push is not a loss;
   genuinely de-vigged `q` from both sides of the `Odds` table) and returns
   five distinct reason codes: `FIRE`, `NO_BET_LCB`, `NO_BET_WIDTH`,
   `INSUFFICIENT_CALIBRATION`, `NOT_EVALUATED_MISSING_INPUTS`.

   The load-bearing property is that the last two are **not refusals**.
   Reporting "we declined" when the truth is "we never had enough settled
   history to look" would claim a considered judgement the product never made.
   Both directions are tested, including that missing-input rows cannot make
   the board masquerade as a calibration problem.

   A page now calls it: `/board/gate` runs the real consumer at request time
   and prints what it returned, including the outcome mix. The inputs are
   illustrative and labelled as such on the page itself — real gate, labelled
   inputs, never the reverse.

   **Both preconditions are now IMPLEMENTED in the mapper and loader.**

   An earlier revision of this document said they could not be fixed because
   `RawPickRow` lacked the deciding fields. That was wrong about the cause.
   `Pick.isBootstrap`, `Pick.modelVersion`, and
   `PickSignalSnapshot.eligibleForLearning` all already exist in the schema —
   the gap was that the mapper neither carried nor enforced them. Inventing
   those values remains forbidden; *reading* them is required.

   - **Learning-eligibility — fails closed.** `isLearningAdmissible` admits a
     settled pick only on two affirmative facts: `isBootstrap === false` and
     `eligibleForLearning === true`. `undefined` — a pick with no signal
     snapshot — is inadmissible, because unproven is not the same as eligible.
     `buildCalibrationRows(rows, PRODUCTION_CALIBRATION_OPTS)` enforces it and
     reports each exclusion by name. The asymmetry is deliberate: wrongly
     excluding an eligible pick costs a row and makes the gate fire less;
     wrongly including an ineligible one lets history the product has already
     disowned set the bar it then claims to have cleared.
   - **Model-version strata.** `stratumOf` returns
     `${sport}|${pickType}|${modelVersion}` when a version is present and the
     two-part key when it is not, so versions cannot pool and existing callers
     are unchanged.

     A subtlety worth recording, because it defeats the guarantee silently:
     `Pick.modelVersion` is a required column, so it is always *present* — but
     it can be the empty string, and an empty version falls back to the
     two-part key. A batch of blank-version rows would therefore pool into one
     stratum and calibrate across incomparable score semantics with nothing in
     the output to show it. `requireModelVersion` (set in
     `PRODUCTION_CALIBRATION_OPTS`) rejects those rows outright. The two
     strictness dials are independent, so a caller reasons about each rather
     than inheriting a bundle.

   Strictness is opt-in, so the illustrative page — which supplies rows with no
   provenance to read — is unaffected.

   **Five further join defects, found in review and fixed.** Worth recording
   in full, because every one of them would have produced a confident wrong
   answer rather than an error, and none was reachable by unit-testing the
   mapper in isolation — they are all facts about how production actually
   stores its rows.

   - **Team names are denormalized.** `Game.homeTeamId`/`awayTeamId` are
     optional and `process-sport.ts` never assigns them; ingestion writes only
     `homeTeamName`/`awayTeamName`. Selecting the `homeTeam`/`awayTeam`
     relations returned null for every ingested game, which classified the
     entire live slate as undescribable. Flipping the flag would have rendered
     an empty board.
   - **Odds rows are per market.** `Odds` is append-only with one row per
     (game, bookmaker, market); only `H2H` rows carry `homePrice`/`awayPrice`
     and only `SPREADS` rows carry the spread pair. Taking one row by
     `fetchedAt` returned an arbitrary market — same-cycle rows even share the
     timestamp — so most picks were excluded for want of a field that was
     never on the row they got. `selectOddsForPick` filters by the pick's own
     market first, matching what `clv-capture.ts` already does.
   - **Stale quotes.** Retained rows never expire, so a candidate could have
     fired against a line hours or days old. `STALE_DATA` is already a
     first-class No-Bet factor in the engine, so ignoring it here would have
     contradicted a rule the product enforces elsewhere. Candidates now carry
     a freshness budget.
   - **Line movement.** `Odds.spread` and `Pick.line` are both
     home-perspective, and they diverge after the line moves. A home -3.5 pick
     priced off a -6.5 quote receives a materially wrong edge. The handicap
     must match or the row is refused.
   - **Started games.** Settlement lags, so `PENDING` outlives kickoff. The
     candidate query now requires `status: SCHEDULED` and a future
     `commenceTime`, or the gate could have returned FIRE for a wager nobody
     could still place.

   Freshness and handicap checks apply to CANDIDATES only: a settled pick's
   game is over, so its historical quote is exactly the one calibration wants.
   All five surface as **named** exclusions via `RawPickRow.inputProblems`
   rather than as a fabricated missing price, because "stale quote" and "no
   odds captured" are different facts.

   **A third defect the join itself would have introduced.** `Odds` stores
   moneyline prices in `homePrice`/`awayPrice` but spread prices in
   `homeSpreadPrice`/`awaySpreadPrice`. De-vigging a SPREAD pick against the
   moneyline pair yields the fair probability of an outright win rather than a
   win against the handicap — on a heavy favourite the two diverge enormously,
   and nothing downstream could detect it. `pricesForPickType` selects the pair
   belonging to the pick's own market, and never carries a three-way draw price
   onto a two-way handicap.

   **Phase C — measuring what actually clears the bar.**
   `npm run gate:phase-c` (`scripts/edge-lab/gate-slate-phase-c-counts.ts`)
   reports five numbers under production-strict filters: raw settled WIN/LOSS,
   admitted calibration, raw pending, evaluable pending, and strata at or above
   `MIN_STRATUM_CALIBRATION` — plus a named breakdown of every exclusion reason
   and the top strata by admitted size.

   It imports the same `GATE_SLATE_INCLUDE` and the same `partitionGateSlate`
   normalizer the product uses, so a divergence between what it measures and
   what the page would render is impossible by construction. A second query
   shape would make the counts a claim about the script rather than the product.

   With no database it **exits non-zero and refuses to print**. An empty
   database yields five zeros, and zeros presented as counts are worse than no
   counts: they read as a measurement of a young product rather than the
   absence of one.

   The script has been exercised end-to-end against a real Postgres with a
   fixture covering all six join defects, which confirmed the SQL and the
   reason channel work — but a synthetic fixture is **not** evidence about
   production volume. Real counts still require staging.

   Still open, and deliberately so: **the public flip.** `fetchGateSlate`
   returns null unless `LIVE_BOARD_GATE_SLATE=1` and a real database is
   configured — both checked inside the loader so a caller cannot reach
   production data by forgetting a guard. The query shape is typed and unit
   tested but has **not been exercised against production rows**; a join is
   only really proven by running it against real data. That is the staging
   step, and the flag stays off until counts there look right — expect
   `INSUFFICIENT_CALIBRATION` to dominate, since a stratum now needs 100
   settled, learning-eligible, same-model-version rows before the gate will
   fire in it. That is the honest state of a young product, not a defect to
   engineer around.

   **Phase D is now code-complete, and the flip is still not recommended.**
   `/board/gate` is mode-aware: `resolveGateSlate`
   (`apps/web/lib/board/gate-page-mode.ts`) decides the mode and builds the rows
   in one call, so a "live" label cannot appear over illustrative rows — there is
   no code path that computes the two separately. Every claim on the page that
   depends on which inputs were used is keyed off that single `mode` value,
   including the per-row edge annotation and two of the non-claims.

   It fails closed in four distinct ways, each tested, and each *states its
   reason on the page* rather than degrading silently:

   | Condition | Mode | What the reader is told |
   |---|---|---|
   | Flag off | illustrative | nothing — this is the intended default, and explaining a failure that did not occur trains readers to ignore the notice when it means something |
   | Live read throws | illustrative | "could not be read on this request" — never the underlying error, which can carry a host, database name, or role |
   | Loader returns null | illustrative | "no live slate is available in this environment" |
   | Live read found no candidates | illustrative | "had no upcoming games to judge" |
   | Live read found candidates | **live** | the rows are today's slate |

   The fourth row is the one worth arguing about. It keys on candidates
   *existing*, not on any of them firing: a live slate that evaluated eight games
   and refused all eight is true, publishable, and the product's central claim,
   so it renders as live. Only "there was nothing to judge" falls back — because
   a live empty board asserts "we considered today's games and declined them
   all" when the truth is that there was nothing to consider.

   **The flag remains off, and is now off by construction rather than by
   convention.** `apps/web/__tests__/board-gate-flag-policy.test.ts` fails the
   build if `LIVE_BOARD_GATE_SLATE` is assigned an enabling value in any
   deployable config (`.env*`, YAML, JSON, Dockerfile, shell). Source and
   markdown are excluded *by file type*, which is where the reader and this
   document legitimately quote `=1`. Before Phase D the flag was inert; from now
   on a single committed config line would publish an unverified join on the
   product's honesty page, and it would pass review because it would look like
   configuration rather than a decision. The flip is a founder action taken in a
   deploy environment, after real staging counts exist.

   Still open: **the live slate is not wired into the published board.**
   `/board`'s passes continue
   to come from the `gate_decisions` table — a different, also-real set of
   refusals. Closing the gap needs a Pick × Odds join whose behaviour cannot
   be verified in this environment; shipping it unverified beneath a public
   honesty surface is the failure mode the surface exists to reject. Expect
   `INSUFFICIENT_CALIBRATION` to dominate once wired, since a stratum needs
   100 settled picks before the gate will fire in it. That is the honest
   state of a pre-launch product, not a defect to engineer around.

   **Phase C counts do not exist yet.** No staging or read-only-replica
   `DATABASE_URL` is reachable from the agent environment: it is absent from the
   process env, there is no committed `.env` (only `.example` files), the Vercel
   MCP surface exposes no environment-variable values, and the Cloudflare
   Hyperdrive config list is empty. `npm run gate:phase-c` therefore cannot be
   run, and no counts are recorded here rather than estimated. This is the single
   remaining blocker on recommending the flip.

4. **Ledger multiprob persistence is BLOCKED — on a missing writer, not on
   commitment risk.** Investigated directly rather than assumed; the blocker is
   not what it was expected to be.

   - `FiredDecision` has exactly one consumer in the entire repo:
     `scripts/edge-lab/phase1-acceptance.ts`, a research script.
   - `appendPick` / `appendSettlement` have **zero** production callers.
     Nothing anywhere constructs a `PickEntryInput`.
   - The domains do not align. `LedgerPickEntry` describes a *published pick*
     (`pickId`, `book`, `priceDecimal`, `kickoffAt`); `FiredDecision` describes
     a *backtest row* (`rowId`, `stratum`, `lcbEdge`, `y`). No bridge exists,
     and constructing one means inventing pick identity, a book, and a price
     for a row that has none.

   So there is no path to persist multiprob *through*. Doing this work now
   would require building a `FiredDecision`→ledger bridge AND a production
   ledger writer — far outside "narrow and contract-safe", and precisely the
   isolated-engine building this map exists to discourage.

   **Recorded so it need not be re-derived:** when a writer does exist, additive
   optional fields ARE hash-safe. `canonicalJson` sorts *present* keys, so an
   entry lacking a new optional field serializes byte-identically and every old
   receipt still verifies. The one trap: `canonicalJson` throws on `undefined`,
   so such a field must be **omitted from the object entirely**, never assigned
   `undefined`. Prerequisite for unblocking: a production consumer of
   `applySelectiveGate` that emits published picks.

## Closed since this document was written

- **No-Bet reasoning is rendered.** `/board` shows every pass and its
  human-readable reason to everyone, and the auditable trail (reason code,
  confidence at refusal, model version, evidence count) to `canSeeNoBetDetail`
  holders. Withheld server-side, fail-closed by default.
- **Checkout copy reordered** to the section-5 ordering. `PRO_FEATURES` and the
  Pro description now lead with No-Bet reasoning, multiprob intervals, Glass
  Ledger and recompute; pick volume is demoted below them.

## NON-CLAIMS

This document describes wiring, not results. It asserts no win rate, ROI, or
edge. It does not claim the Glass Ledger currently publishes anything —
`PUBLISH_LEDGER` defaults off and the sealed state is the honest one. It does
not claim any partnership or pilot exists.
