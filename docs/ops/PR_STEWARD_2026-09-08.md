# PR steward pass — 2026-09-08

Four draft PRs (#722, #723, #724, #725) were opened by launch sessions that then
died on a usage limit mid-work. This session drove each to complete and green.

Every line here traces to a command run in this session or to a GitHub check /
bot comment read in this session, with the timestamp. Nothing is estimated. No
PR was merged: the orchestrator merges.

**Method for each PR**: read the PR, its checks, its review threads and its bot
comments; verify the body's claims against the head of the branch; fix what is
wrong; run `npm run typecheck`, `npm run lint` and the PR's own suites before
each commit; keep the ledger rows honest; push to that PR's branch only.

---

## Status table

| PR | Branch | Head after this pass | Verdict |
|---|---|---|---|
| [#725](https://github.com/Beexly/Sports/pull/725) | `claude/launch-nfl-week1-coverage` | `0dc7f4973` | **READY TO MERGE** — merge first (it keeps ledger id C-261) |
| [#724](https://github.com/Beexly/Sports/pull/724) | `claude/launch-c104-free-two-book-board` | `c8893d471` | **READY TO MERGE** once Codacy re-reads the head (see below) |
| [#723](https://github.com/Beexly/Sports/pull/723) | `claude/launch-settlement-evidence` | `88109938f` | **READY TO MERGE** |
| [#722](https://github.com/Beexly/Sports/pull/722) | `claude/launch-identical-row-bakeoff` | `b12eddbb6` | **READY TO MERGE** — merge after #725 |

**Merge order matters once**: #725 and #722 both opened a ledger row numbered
C-261. #722's row is renumbered to C-265 on the assumption that #725 lands
first and keeps C-261. Any other order needs that renumber reversed, not
ignored: two rows sharing an id fail the ledger guard's duplicate-ID check
(`scripts/ops/check-agent-ledger.mjs:306`).

---

## #725 — NFL Week 1 coverage (C-261, C-95, C-118)

- **Head reviewed**: `833027ff0`. **Head now**: `0dc7f4973`.
- **What was incomplete**: nothing functional. CI was fully green, Codacy
  reported 0 issues, there were no review threads. The gap was an honesty one,
  in the PR's own subject matter.
- **What I changed** (`0dc7f4973`): the comment on `MONEYLINE_FAIR_PROB_FLOOR`
  in `apps/web/lib/board/market-coverage.ts` claimed the 0.58 restatement was
  "pinned by the scorer's own tests". It is not. `scoreMoneylinePick` is module
  private (the bare literal is at `packages/prediction-engine/src/scoring.ts:965`)
  and no scorer test asserts that boundary — `grep -rn "0\.58"` over
  `packages/prediction-engine/src/__tests__` returns only unrelated
  probabilities in `calibration-kelly-bridge`, `edge-engine`,
  `pick-proof-receipt` and `robust-kelly`. The comment now states the real
  posture: the operator copy goes stale silently if the scorer's literal moves.
  The two other gates the hint quotes (`MIN_BOOKMAKERS`,
  `MIN_PUBLISH_CONFIDENCE`) are genuine imports. The PR body said "with
  constants imported from the engine" without that exception; it is corrected.
- **Deliberately not done**: naming the floor as an exported constant, or
  pinning it with a scorer test. Both touch the frozen scorer, so it is ledger
  row **C-263 (OPEN)**, not a drive-by.
- **Checks**: on `833027ff0` every CI job was green (Build, "Test, type-check,
  lint, Prisma", "All guardrails", model freeze, trust gate, brand safety,
  secret scan, dependency audit) and Codacy read "Up to standards, 0 new
  issues". On `0dc7f4973` at 23:51 UTC: Codacy success, "All guardrails"
  success, "Test, type-check, lint, Prisma" success, Build in progress.
- **Locally**: `npm run typecheck` exit 0, `npm run lint` exit 0,
  `market-coverage.test.ts` 12 passed, `check-agent-ledger.mjs` exit 0.
- **Bot findings addressed**: none outstanding. CodeRabbit skipped the PR for
  being a draft; Codacy clean; no review threads on the PR at all.
- **Ledger rows**: C-261 DONE, C-95 DONE, C-118 DONE (verification), C-262 OPEN
  (C-95 leftovers), **C-263 OPEN** (new, from this pass).

## #724 — C-104 free two-book board (keyless ESPN + Kalshi via PredExon)

- **Head reviewed**: `d3825a5a0`. **Head now**: `c8893d471`.
- **What was incomplete**: Codacy's check was `action_required` — **1 new
  critical security issue** — and nothing on the PR acknowledged it. Every
  other check was green.
- **What I changed**:
  - `6bcc7bebf`: the finding is real. `hasWord` in
    `packages/data-ingestion/src/galaxy-kalshi-book.ts` built `new RegExp` from
    an interpolated team abbreviation with no escaping. The abbreviations reach
    the Kalshi spread parser from the fixture feed, so this is regex injection.
    Both failure modes were reproduced in a test written red first: an
    abbreviation with an unbalanced paren threw
    `SyntaxError: Invalid regular expression: /(^|[^A-Z0-9])BUF(([^A-Z0-9]|$)/i:
    Unterminated group` inside the odds cycle, and one carrying `.` matched a
    team it is not (`"L.R"` matched the literal `"LAR"`), which would return a
    YES side the parser never read. Red check 1 red / 20 green.
  - `49d424f3e`: C-104's ledger evidence records the fix.
  - `c8893d471`: Codacy re-analysed at 23:42:04 UTC (complexity moved 369 → 372,
    so it did see the new code) and still reported 1 critical issue — a
    non-literal RegExp is flagged for being dynamic, not for being unescaped,
    so escaping cannot clear it. `hasWord` now scans for the abbreviation as
    literal text with the same semantics as the old
    `/(^|[^A-Z0-9])word([^A-Z0-9]|$)/i` and compiles no pattern from feed data
    at all. Both failure modes stay covered by the same test; 20 green.
- **Default-OFF check** (read at the head, not taken on trust): with
  `THE_ODDS_API_KEY` present and the payment circuit closed,
  `createOddsQuoteProvider` returns `TheOddsApiOddsProvider` exactly as before.
  The keyless provider engages only where the previous code returned an
  `OfflineOddsProvider` (no key) or kept requesting against an open HTTP 402
  circuit. `GalaxySportsApiOddsProvider.capabilities.certifiableForLiveGate` is
  `false`. The Kalshi second book is `undefined` unless `PREDEXON_INGEST` is on,
  the key is set and the `predexon` verdict is ingestible. No gate or env flag
  is flipped.
- **Clearance check**: `fetchEspnOddsForSport` calls
  `isIngestible(GALAXY_ESPN_INLINE_SOURCE_ID)` first and returns
  `{ events: [], error: "espn odds: source not cleared (galaxy-espn-inline)" }`
  with no network when the entry is revoked — fail-closed. The registry entry is
  `use-with-caution` with `commercialUse: false` (the #680 branch's
  `commercialUse: true` overclaim is not carried). **This PR touches nothing
  under `apps/web/`**, so the app-layer `source-router` cleared flags and the
  app's source-rights registry are unchanged by construction and cannot
  disagree as a result of this PR.
- **Checks**: on `d3825a5a0`, every CI job green, Codacy `action_required`. On
  `49d424f3e` at 23:46 UTC, every CI job green again with Codacy still
  `action_required`; `c8893d471` pushed at 23:56 UTC and its run is the one to
  read before merge.
- **Locally on `c8893d471`**: `npm run typecheck` exit 0, `npm run lint` exit 0,
  `packages/data-ingestion` 484 passed, `packages/ingestion-pipeline` 437
  passed / 6 skipped (921 total, one more than the body's original 920).
- **Bot findings addressed**: the Codacy critical, twice (escape, then remove
  the dynamic RegExp). CodeRabbit skipped (draft). No review threads.
- **Open item for the merger**: confirm Codacy reads clean on `c8893d471`
  before merging. If it still reports the same issue, the diagnosis in
  `c8893d471`'s commit message is wrong and the finding is somewhere else in the
  diff; it was **not** re-read by this session after that push.
- **Ledger rows**: C-104 DONE, evidence extended with the steward pass.

## #723 — settlement evidence and the C-143 decision (C-120, C-143, C-176)

- **Head reviewed**: `32312c2e0`. **Head now**: `88109938f`.
- **What was incomplete**: the PR shipped the C-143 display as an open question
  and, more to the point, shipped it the wrong way round relative to the
  decision. The card led with the refreshed line and disclosed the graded line
  as a footnote beneath it; the doc offered the founder options A and B.
- **What I changed** (`88109938f`), applying the founder's decision (delegated
  2026-09-08 via the launch orchestrator):
  - Grading is untouched. `selectGradingLine` still returns `clvLockLine` when
    present — the publish-time line the customer saw. No row re-graded, no
    `settledAt` re-stamped.
  - Display inverted to match the decision: `gradedLineNote` becomes
    `gradedLineDisplay`, which returns the settled-row line slot itself —
    `primaryText` "Graded at +74", `secondaryText` "Line as last refreshed:
    +83.5", the second null when the numbers agree. The card leads a settled
    TOTAL with it and keeps the live "Line: X" lead on PENDING rows, where
    nothing has been graded yet.
  - `/api/picks` and `PublicPick.gradedLine` comments now state that the graded
    line is the primary number on a settled row, instead of describing an open
    decision.
  - `docs/ops/GRADED_VS_DISPLAYED_LINE_2026-09-08.md` rewritten: status
    **DECIDED**, the decision and its reasoning in section 5, what it does not
    cover in section 7, and the not-taken option kept in section 8 with why.
- **Honest gap, recorded not papered over**: a SPREAD card renders no `line` at
  all — the side's number lives in the stored `selection` string and `line` is
  home-perspective — so there is no second number beside it today and nothing to
  reorder. Whether that stored string can drift after publish was **not
  established** in this session. If it can, it is C-143's defect in a different
  place. Ledger row **C-264 (OPEN)**, filed as an open question, not as an
  observed defect.
- **Checks**: on `32312c2e0` every CI job was green and Codacy read success. On
  `88109938f` at 23:47 UTC the run is in progress (guardrails and the test job
  had not finished at the time of writing).
- **Locally**: `npm run typecheck` exit 0, `npm run lint` exit 0; every suite
  that renders `PickCard` — `graded-line-display`, `pick-card-a11y`,
  `pick-card-market-implied`, `picks-page-policy-gate` — 27 passed;
  `check-agent-ledger.mjs` exit 0 (270 rows). Red check on the card change:
  2 red / 11 green against the previous card.
- **Bot findings addressed**: none outstanding (Codacy success, CodeRabbit
  skipped as draft, no review threads).
- **Ledger rows**: C-120 DONE, C-143 DONE + DECIDED, C-176 DONE, **C-264 OPEN**
  (new, from this pass).

## #722 — identical-row score bake-off (C-265, opened as C-261)

- **Head reviewed**: `346330852`. **Head now**: `b12eddbb6`.
- **What was incomplete**: nothing functional — every CI job green, Codacy
  success, no review threads. The defect was a ledger id collision the branch's
  own doc had predicted but nobody had resolved: this branch and #725 both
  opened a row numbered **C-261**, for different work.
- **What I changed** (`b12eddbb6`): renumbered this branch's row to **C-265**,
  free against `main`, against #720 (C-247..C-260) and against the other launch
  branches, and updated every reference — the module, the seed, the engine, the
  test and `docs/ops/BAKEOFF_IDENTICAL_ROWS_2026-09-08.md`. #725 keeps C-261
  because it merges first. The PR title now reads "C-265, opened as C-261".
- **Not changed, deliberately**: the commit messages `eefc7c979` and
  `346330852` still say C-261. Rewriting them would mean rewriting history on a
  pushed branch. The ledger row records the rename, so the SHAs rather than
  those numbers are the authority.
- **Checks**: on `346330852` every CI job green and Codacy success. On
  `b12eddbb6` at 23:53 UTC the run is in progress.
- **Locally**: `npm run typecheck` exit 0, `npm run lint` exit 0,
  `identical-row-bakeoff.test.ts` 16 passed, `check-agent-ledger.mjs` exit 0
  (269 rows, no duplicate-ID violation).
- **Bot findings addressed**: none outstanding.
- **Ledger rows**: C-265 DONE (was C-261).

---

## What this pass did NOT do

- **No merges.** All four stay draft; the orchestrator merges.
- **No production writes, no gate or env flag flipped, no MODEL_VERSION change.**
  The only production read was `GET /api/ops/public-surface-truth`, which is
  read-only, and this session did not need it.
- **No `npm run build` locally.** The CI "Build" job is the evidence for each
  head, and each PR's row above says which head it passed on. The steward
  commits are comments, ledger text, one display module, one card render path
  and one string-matching helper; none of them can change a build outcome that
  `npm run typecheck` and `npm run lint` both pass.
- **No re-measurement of the production numbers** any of the four PRs cite
  (the 588/432/34 line counts, the 19:07 and 19:11 UTC truth-surface reads, the
  ESPN scoreboard fixtures). No database access, per law 3. Those claims are
  carried with the provenance their authors gave them.
- **Codacy on #724's final head was not re-read** after `c8893d471`. Flagged
  above as the one open item.

## New ledger rows opened by this pass

| Row | Branch it lives on | What it is |
|---|---|---|
| C-263 | `claude/launch-nfl-week1-coverage` | The moneyline fair-probability floor quoted in the marketCoverage operator hint restates a bare literal in the frozen scorer and nothing pins it |
| C-264 | `claude/launch-settlement-evidence` | Whether a stored SPREAD `selection` string can drift after publish — open question, not an observed defect |
| C-265 | `claude/launch-identical-row-bakeoff` | The renumbered identical-row bake-off row (was C-261) |
