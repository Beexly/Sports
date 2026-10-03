# The Odds API integration audit (P4-12)

Read-only audit per `.claude/commands/audit-odds.md`, 2026-09-28, branch
`hermes/live-wip-2026-09-24`. Scope: stale-data detection, rate-limit handling
and backoff, retries, line-movement edge cases, graceful fallback.

**No product code was touched.** Every finding below is a read of the tree at
`ca25b2f76`, plus `git grep` proofs quoted inline. Four findings: 1 high,
2 medium, 1 low.

## What is already right (do not "fix" these)

The failure modes this audit is looking for are mostly absent, and the absence
is deliberate and documented:

- **Retries are bounded and jittered, and 429 is excluded from them.**
  `odds-api-client.ts:231-267`: `maxRetries: 2`, `baseDelayMs: 250`,
  `maxDelayMs: 2_000`, `jitterRatio: 0.35` (`:88-92`), and `if (response.status
  === 429) break;` at `:258` fires *before* the retryable-status test, so a
  rate-limited response never spends a second credit. The comment at `:254-257`
  states the reasoning (GSE-SEC-041).
- **`Retry-After` is honored** when the vendor sends it
  (`computeRetryDelayMs`, `retryAfterMs` parsing on numeric-seconds and
  HTTP-date forms).
- **The 2026-07-10 Next Data Cache freeze is defended against.** Every upstream
  read goes through `noStoreFetch` (`no-store-fetch.ts`), with the full incident
  written down in that module's header. The client, the ESPN client and the
  Pinnacle leg all pass `cache: "no-store"` explicitly.
- **The 402 payment circuit is a real state machine, fail-closed in the right
  direction.** `odds-api-circuit-breaker.ts`: closed → open only on an upstream
  401/402, half-open probes single-flight, `OPEN_MS = 6h`. `process-sport.ts:403`
  reads the state and skips the paid leg outright when open, so a dead key costs
  no credits and the keyless path takes over.
- **Error statuses are honest.** A local probe-concurrency refusal is thrown as
  429, not 402 (`odds-api-client.ts:183-195`) — the comment records that it used
  to report a card failure when upstream had said nothing.
- **The line archive is failure-isolated by contract.** `captureLineSnapshots`
  and `markClosingSnapshots` both return `{ error }` and never throw, and both
  have hard `LINE_ARCHIVE_ENABLED` gates that no-op with zero DB interaction.
  The 2026-08-22 `market: markets` outage that killed CLV capture for three
  weeks is fixed, pinned by `line-archive-filter-shape.test.ts`, and the
  in-file comment says why the type was shaped the way it was.

## F1 (HIGH) — the freshness gate is a tautology on the ESPN path, and ESPN is the fallback

`normalizer.ts:70-76` is explicit that the design is anti-tautology:

> Bookmaker-level last_update, falling back to the market-level one. Both are
> UPSTREAM timestamps (never the local clock, preserving the anti-tautology
> freshness design)

`freshGameIds` (`normalizer.ts:146-179`) then decides per game from
`o.bookmakerLastUpdate` only, and `process-sport.ts:656-698` fails the whole run
when the set comes back empty.

**`espn-odds-client.ts:456` breaks that contract for every row it produces:**

```ts
const lastUpdate = new Date().toISOString();
```

That value is written as `market.last_update` at all eight construction sites
(`:242, :267, :282, :296, :507, :532, :551, :562`). `normalizeOdds` reads it
(`bookmaker.last_update ?? market.last_update`), so `bookmakerLastUpdate` on the
ESPN path is *our own wall clock at fetch time*, and `freshGameIds` therefore
returns every game as fresh — always, by construction.

Consequence: the entire stale-feed protection that the 2026-07-10 incident
prompted is inert on the ESPN path. A frozen, cached, or replayed ESPN board
cannot be detected, and the run reports itself healthy. This is not a
hypothetical reach: the ESPN path is precisely the one that runs when the paid
feed is absent, empty, refused by the spend guard, or circuit-open
(`process-sport.ts:533-556`) — that is, exactly when a stale feed is most likely
and detection matters most.

It also degrades a second, quieter signal. `freshGameIds` drops stale games
individually so one fresh game cannot mask a stale one (`:146-148`). On ESPN
that per-game discrimination is also gone; a single shared local stamp means
every game in the pull shares one age.

There is no test pinning this either way: `git grep -n espn` over
`__tests__/normalizer.test.ts` and `__tests__/odds-provider-adapter.test.ts`
returns nothing, and both test files stub `validateFreshness: () => true`
(`odds-provider-adapter.test.ts:86, :123`).

Proposed fix (owner-gated; the normalizer is engine-adjacent and the guard shape
is load-bearing): carry a real upstream timestamp where ESPN provides one and
mark the path honestly where it does not. ESPN's inline odds payload does not
expose a per-bookmaker `last_update` for the scoreboard path, so the honest
answer is probably a provider-scoped freshness policy — the ESPN branch gets its
own threshold and its own rejection reason, rather than borrowing the
upstream-timestamp rule it cannot satisfy. Whichever way it goes, the two facts
that must stay true are that a stale ESPN board is *detectable*, and that the
`process-sport.ts:693` error message names the provider so a failing prod run
self-diagnoses the way `freshnessDiagnostics` intends.

## F2 (MEDIUM) — `markClosingSnapshots` is a serial per-row UPDATE loop

`line-archive.ts:260-265`, inside the settle path:

```ts
for (const row of latestByKey.values()) {
  if (row.phase === "CLOSE") continue;
  await db.oddsLineSnapshot.update({ where: { id: row.id }, data: { phase: "CLOSE" } });
  updated++;
}
```

One round trip per `(market, book, side)`, awaited serially. An 11-book
three-market game is 66 sequential writes, inside a 300s `maxDuration` cron,
per settled game.

This is the same defect class the read side of this very file was fixed for.
`captureLineSnapshots` batches its existence check into one `findMany` and the
comment at `:128-132` says the N+1 "would melt Neon"; the write side was never
converted. `createMany` is already imported one function above, and Prisma's
`$transaction` (or an `updateMany` over the collected ids) removes the round
trips without changing a single semantic — the idempotency check and the
per-row error swallow stay exactly as they are.

Severity is reach-based, not size-based: it fires on every settle with the
archive on, and `LINE_ARCHIVE_ENABLED` is on in production.

## F3 (MEDIUM) — 999 lines of failover/provider layer have zero product callers

`odds-provider-adapter.ts` (555), `odds-failover.ts` (174) and the paid-circuit
glue in `odds-api-circuit-breaker.ts` (270) are exported from the package index
and covered by 30 tests across three files — and nothing in the product calls
them. Proof, whole tree, all file types, excluding the defining files, the
index, tests and docs:

```
git grep -n "TheOddsApiOddsProvider|GalaxySportsApiOddsProvider|OfflineOddsProvider|
  OddsPapiOddsProvider|createOddsQuoteProvider|createSecondaryOddsProvider|
  fetchDualProviderOdds|resolveOddsWithFailover" -- .
```

returns only three `docs/ops/*.md` planning documents. Zero `.ts` product
callers.

The real fallback logic is hand-inlined in `process-sport.ts:412-608`: paid leg,
then `fetchEspnOddsForSport`, then TheRundown full-replace, then
`mergeBookmakersIntoPrimary` thin-fill. That inline path is itself correct and
well-commented, so nothing is broken — but the tested abstraction and the shipped
implementation are two different designs, and the one under test is the one that
does not run. A future agent reading `odds-provider-adapter.ts` reasonably
concludes the fallback is handled there.

Note the circuit breaker is the exception and is genuinely live: the default
`getOddsPaymentCircuitBreaker()` at `odds-api-client.ts:154` runs inside every
`new OddsApiClient`, and `process-sport.ts:403` reads its state. It is only the
provider-selection and merge layer that is unwired.

Same class as two items already on the record: `archive-staleness-monitor`
(exported, tested, zero callers — found in P4-11) and `gate_decisions` (1,167
rows, no writer, found 2026-09-13). Three now. The pattern is worth naming on
its own: this repo builds abstractions to a finished state and wires them later,
and nothing in the ledger flags the gap, so the abstraction is believed live.

Recommendation, matching what the `gate_decisions` note already concluded: decide
per module whether it is coming or going. Coming means a wiring row with a
definition of done; going means the code and its tests come out, because code
that reads as the live path while another path is live is worse than no code.
Deleting is a founder call — nothing here was removed.

## F4 (LOW) — a paid-path 429 is not remembered across cycles

TheRundown carries a 30-minute per-sport cooldown on a 429
(`rundown-thin-fill.ts:94-110`, in-process, restart-cleared, and the comment
says that is an acceptable cost). The paid path has no equivalent: a 429 breaks
out of the retry loop immediately (correct — it spends no credit) and is
thrown, and the next 15-minute cycle probes again from scratch.

Bounded, so low: the credit governor's hourly pacing rule already caps the
exposure to roughly `MARKETS.length` credits per sport per hour, and
`isLowQuota` (`paid-run-accounting.ts:29-31`) stops the loop when the last
reading drops below 10. The gap is only that a 429 carrying no quota header
leaves the ledger with a stale reading, so the next cycle re-probes against
whatever the previous successful response said. Worth a note rather than a fix.

## Summary

| # | Severity | Finding |
|---|----------|---------|
| F1 | HIGH | `espn-odds-client.ts:456` stamps `last_update` from the local clock, so the anti-tautology freshness gate cannot reject a stale ESPN board — on the exact path that runs when the paid feed is down |
| F2 | MEDIUM | `line-archive.ts:260-265` serial per-row UPDATE on the settle path; the read side of the same file was batched for this reason |
| F3 | MEDIUM | 999 lines of provider/failover layer, 30 tests, zero product callers; the shipped fallback is a separate inline implementation |
| F4 | LOW | No cross-cycle 429 cooldown on the paid path (TheRundown has one) |

F1 is the one that matters: it is a correctness hole in a guard that exists
specifically to catch a production incident that already happened, on the path
that runs during the outage the guard was built for.
