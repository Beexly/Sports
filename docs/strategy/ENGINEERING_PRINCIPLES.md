# Engineering Principles & Lessons — proven-edge program

Hard-won notes from building the proof spine. These are not style preferences; each
one prevented or fixed a real defect this cycle. Read before adding to the moat.

---

## A. Integrity principles (non-negotiable)

1. **Never claim a probability you haven't calibrated.** `confidence` is a 0–100
   heuristic, not P(win). The single deepest trap in this codebase is dressing it up
   as a probability (in a receipt, an "edge", an EV). The `fairProbability` factor
   slot is deliberately reserved for a *future independent model prob, never inferred
   from market* — and is null today for exactly this reason. When you only have a
   heuristic, commit the heuristic **as** a heuristic. The proof receipt commits
   `confidence` (labeled) + the devigged `marketFairProb` (real), and `modelProb` is
   optional, committed as `"none"` until a genuinely calibrated probability exists.

2. **Coverage gates credibility upstream of the public gate.** A beat-close rate over
   <100% coverage is survivorship-biased. Measure coverage (graded ÷ settled) as an
   invariant before trusting any headline rate. Leading + lagging both matter:
   settlement-health (picks that never settle) is the leading signal; coverage is the
   lagging one.

3. **Show the uncertainty, not a falsely precise number.** Every published proportion
   (beat-close rate, calibration bin) carries a Wilson 95% band, and we only *claim an
   edge* when the lower bound clears the 52.4% vig break-even — never off the point
   estimate. Small samples get wide bands; say so.

4. **Real settled data or it doesn't render.** No fabricated/illustrative/pre-floor
   number reaches a public surface. Gated states show progress, not a guessed value.

5. **The proof is only as strong as the injected hash.** Pure-by-injection keeps the
   Merkle/receipt math testable, but the *guarantee* lives in the wiring. Wire a real
   `sha256` (and test it against a known digest), never a placeholder, into anything
   published.

## B. Build-process principles

6. **Reality-check the premise before writing code.** Multiple handoffs referenced
   branches/modules/charters that did not exist on this branch (`lib/gse`,
   `GSE_2026_MASTER_HANDOFF.md`, named branches). Grep for the actual artifacts first;
   build on what's here, not on what a prompt assumes. A confident handoff is not
   ground truth.

7. **Grep the shared package before adding a primitive.** I shipped a second Wilson
   implementation when one already lived in `@sports/prediction-engine`. Search the
   monorepo for the concept first; there is **one** canonical implementation, and
   apps/web wraps it for presentation rather than re-deriving the math.

8. **Forecast the falsifier, then build to survive it.** Before each proof piece, write
   "what would a hostile quant say?" and build the defense: post-hoc edit → tamper-
   evident receipt; cherry-pick → commit-reveal Merkle slate; small-sample → Wilson
   bands; soft self-anchor → grade vs a hard third-party close; model-swap → version-
   stamped receipts + per-version calibration. The falsifier is the spec.

9. **Don't bulldoze prod-only or unverifiable changes.** The receipt-mint runs only in
   the live ingestion pipeline (no DB/odds here) and production was mid-rotation.
   Prefer increments that are fully verifiable in this environment (pure functions +
   tests); flag prod-only/owner-gated work honestly instead of shipping unverifiable
   pipeline surgery.

10. **Every cycle ends in committed, tested, green code.** typecheck 0 + the relevant
    suites + brand-safety + cockpit, every commit. A perfect design that isn't shipped
    and green did not happen.

11. **Migrations can be generated offline.** `prisma migrate diff
    --from-schema-datamodel <old> --to-schema-datamodel <new> --script` produces a
    deployable migration with no database. Diff from the schema state *before* the
    model existed to get a full `CREATE TABLE`, not an `ALTER`.

## C. Program principles

12. **The integrity machinery is real; the wiring is the gap.** Across all 12 research
    domains the pattern repeats: thorough doctrine + pure/tested primitives, not wired
    to live data. The leverage is plumbing and honest measurement, not new math.

13. **Branch fragmentation is the #1 program risk.** Complementary work spread across
    5+ branches silently drifts and spawns duplicate concepts (two receipts, two CLVs,
    two Wilsons). Name a trunk (the one built on real, shipping primitives); land the
    rest as adapters, concept-by-concept, never a blind merge. See
    `BRANCH_RECONCILIATION.md`.

14. **Revenue does not require a proven win rate.** Sell the tools (factor trail,
    devig fair prices, evidence/counter-case, the CLV tracker) and the founding ride
    (price locked for life while the record proves itself) honestly *today*. The
    commit-reveal record IS the marketing. Only the calibrated win-rate claim is gated
    — that's the brand, not a limitation.

---

## D. What would elevate us further (ranked leverage)

1. **A calibrated model probability** is the single biggest unlock. It makes the
   receipt's `modelProb` real, turns confidence into a defensible P(win), enables
   per-version calibration, and lets the conviction tier activate. The OOS split +
   champion/challenger promoter (on `claude/laughing-wozniak-gyryjx`) is the path —
   cherry-pick it onto trunk, gate promotion on no-calibration-regression + sample
   floor + shadow period.

2. **Persist a hard third-party CLV anchor (Kalshi/Pinnacle close).** Today CLV is
   graded vs our own consensus close. Persisting Kalshi (the client exists, inert)
   as the reference kills the "you graded against a soft close you control" attack.

3. **Wire the mint + commit-reveal publication.** A `SlateCommitment` model + a public
   reveal surface (root published pre-kickoff, inclusion proofs after) turns the built
   primitives into a live, auditable, pre-registered record. Needs the calibrated prob
   (1) and real odds (prod) to be honest.

4. **Wire alert delivery.** Coverage / settlement-health / drift currently compute
   payloads with no sink. A real alarm on stale-unsettled picks is the moat's
   observability blind spot — a silent settlement failure corrupts the public record
   before anyone notices.

5. **Converge duplicate concepts across branches.** Per `BRANCH_RECONCILIATION.md`:
   one receipt, one CLV, one calibration — the wired one. `lib/gse` contributes NEW
   math (Black-Litterman, Glicko2, Dixon-Coles, portfolio), not second copies.

---

*Append lessons as they're earned. The discipline that makes the moat — show the
evidence and the counter-case, freeze before the result, publish only what's honest —
applies to how we build it, not just what we ship.*
