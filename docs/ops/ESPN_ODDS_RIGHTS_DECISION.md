# ESPN odds path vs the source registries — owner decision (2026-08-25)

**Status: INVESTIGATION ONLY.** This document changes no ingestion behaviour and
no registry classification. It exists so the owner can make one legal/product
call cheaply and with the real numbers in hand.

**Law:** whether we keep taking ESPN odds, stop, or re-classify is a legal and
product decision. An agent must not silently gate a live ingestion path, and must
not silently relax a registry that says "forbidden". Both directions are the
owner's.

---

## 1. The finding

`packages/data-ingestion/src/espn-odds-client.ts` calls the undocumented ESPN
JSON hosts — `site.api.espn.com` (scoreboard) and `sports.core.api.espn.com`
(odds) — with **no `assertIngestible`** and **no `checkClearance`**. Its output
reaches `db.game.upsert`, `db.odds.createMany` and `recordSourceSnapshot`.

Both registries classify ESPN restrictively, and **they do not agree with each
other**:

| Registry | Source id | Verdict / status | Storage | Commercial display | Attribution |
|---|---|---|---|---|---|
| `packages/data-ingestion/src/source-registry.ts` (~:345) | `espn-hidden-api` | `verdict: "forbidden"`, `commercialUse: false` | n/a (all ingestion refused) | n/a | **not required**, `attributionText: null` |
| `apps/web/lib/scraping/source-rights-registry.ts` (~:231) | `espn-public-api` | `status: "approved_public_logged_off"`, `automation_allowed: true` | `storage_allowed: false` | `commercial_display_allowed: false` | **required**: `"Scores data via ESPN"` |

The odds client is bound to **neither** id, so today it inherits neither rule.

`assertIngestible("espn-hidden-api")` **throws** unconditionally
(`source-registry.ts` ~:721) — `INGESTIBLE_VERDICTS` does not contain
`"forbidden"`. **This is why the gate must not simply be added**: it would throw
inside a live ingestion path.

---

## 2. Blast radius — verified, not assumed

### 2a. The ESPN odds path is a *conditional tertiary fallback*, not an unconditional call

`process-sport.ts:411` sits inside `if (events.length === 0)` at `:409`. ESPN
odds is reached **only when both the Odds API and TheRundown returned zero events
for that sport in that cycle**. It is all-or-nothing per sport: ESPN never mixes
with other books (thin-fill at `:385` uses Rundown only).

### 2b. ESPN odds produce ZERO picks on their own — confirmed

`espn-odds-client.ts:355-362` emits exactly **one** bookmaker per event
(`key: "espn_public"`). `MIN_BOOKMAKERS = 2`
(`packages/prediction-engine/src/constants.ts:105`), enforced at
`scoring.ts:385` (SPREAD), `:637` (TOTAL), `:818` (H2H) — each returns `null`
below threshold, and each book contributes one row per market. A one-book slate
therefore scores nothing.

**Confirmed: no published pick has ever rested on ESPN odds.** The exposure was
never pick integrity. It was:

| Exposure | Mechanism |
|---|---|
| Storage of a restricted source | `db.game.upsert` + `db.odds.createMany` (`process-sport.ts` ~:521, ~:589) |
| Raw payload retention | `recordSourceSnapshot({ payload: events })` at `:435` |
| Commercial display | `bookmaker: "espn_public"` rows are readable by any book-line surface |
| Public freshness clock | `oddsInserted > 0` reopens the market board — `public-freshness-gate.ts:92`, `isMarketBoardOddsStale` |

### 2c. The Part 1 freshness fix (this same PR) already collapses most of that

ESPN exposes no upstream timestamp. Part 1 stops the adapter stamping the local
clock and omits `last_update` instead. Consequence, traced through
`process-sport.ts`:

```
ESPN-only slate → every row has an Invalid Date bookmakerLastUpdate
  → freshGameIds() = ∅          (normalizer.ts:159-176)
  → normalizedOddsRaw.length > 0 && freshGameIds.size === 0   (:481)
  → returns/throws BEFORE db.sport.upsert (:515) and db.game.upsert (:521)
```

So after Part 1, an ESPN-only slate writes **no games and no odds**, and
`oddsInserted` stays 0 — the market kill-switch clock is no longer advanced by
ESPN. The only remaining ESPN write is `recordSourceSnapshot` at `:435`, which
runs earlier and still stores the raw payload.

**Operational side effect the owner must know:** if a game commences within
`QUIET_BOARD_HORIZON_HOURS` (default 24), the run is not a "quiet board", so
`process-sport` throws `"Upstream odds are stale…"`, records
`IngestionRun.status = "FAILED"`, and `notifyOwner()` pushes a Telegram alert
(`process-sport.ts:1045-1056`). Post-fix, a sport whose only source is ESPN
converts from *silent, fake-fresh success* into a *loud, honest failure*. That is
the correct fail-safe under CLAUDE.md rule #5, but it is a visible change in
alerting.

### 2d. What actually breaks if ESPN odds stops

| Surface | Depends on ESPN **odds**? |
|---|---|
| Picks board (any tier) | **No** — one book, no picks (2b) |
| Market kill-switch clock | Already severed by Part 1 (2c) |
| `marketFairProb` densification | Only on slates that produced no picks anyway |
| Free spine (`/api/cron/free-spine-health`) | **No** — uses a *different* ESPN family |

**Critical distinction: ESPN odds ≠ ESPN scores.** The free spine, settlement,
boxscores and standings run through `apps/web/lib/data-sources/free-adapters/*`
and `espn-results-client.ts`, routed as `registrySourceId: "espn-public-api"`
(`source-router.ts:89, :192, :203`). Those are load-bearing. **Retiring the odds
client costs nothing measurable; gating the `espn-hidden-api` id would take the
free spine down with it.**

### 2e. This is not an odds-client defect — it is repo-wide

None of the four ESPN clients calls `assertIngestible` or `checkClearance`:

```
packages/data-ingestion/src/espn-odds-client.ts        (none)
packages/data-ingestion/src/espn-schedule-seed.ts      (none)
packages/data-ingestion/src/espn-results-client.ts     (none)
packages/data-ingestion/src/espn-powerindex-client.ts  (none)
```

And `storage_allowed: false` is already contradicted by existing, deliberate
persistence of ESPN scores (`free-score-persist.ts` writes `db.game`;
`free-first-ingest.ts:100-126` labels rows `source_id: "espn-public-api"`). The
odds client is not an outlier — it is one instance of an unresolved
registry-versus-practice conflict across the whole ESPN surface.

---

## 3. Attribution is required and is NOT rendered

`espn-public-api` sets `attribution_required: true`,
`attribution_text: "Scores data via ESPN"`.

The `<Attribution>` component (`apps/web/components/ui/attribution.tsx`) appears
on exactly five surfaces — `/players`, `/intelligence/engines`, `/mlb`, `/nhl`,
`/nflverse`. **None is the picks board, and none passes an ESPN source id.**

It would not help if one did: `<Attribution>` checks the legacy registry first,
and `attributionFor("espn-hidden-api")` returns `null` because that entry sets
`attributionRequired: false`. Only the rights-registry id `espn-public-api`
carries the line. **Attribution is currently unrendered wherever ESPN-derived
facts appear.** This is true today regardless of which option below is chosen,
and is the cheapest item to fix.

---

## 4. The precedent that decides the recommendation

`checkClearance()` is **intent-scoped** (`clearance-engine.ts:218-246`). It only
blocks the intents you declare:

```ts
"storage"            → blocked  (storage_allowed: false)
"commercial_display" → blocked  (commercial_display_allowed: false)
"derived_analytics"  → ALLOWED  (derived_analytics_allowed: true)
"internal_analysis"  → ALLOWED
```

`assertIngestible()` has no such dimension — it is a single boolean on the
verdict and throws for anything not in `INGESTIBLE_VERDICTS`.

**So the rights registry already models the middle path, and the legacy registry
cannot express it.** A facts-only ESPN call declaring
`["internal_analysis", "derived_analytics"]` clears today without any
re-classification. That is the whole decision in one sentence.

---

## 5. Options

### Option A — Retire the ESPN odds client

Delete the tertiary odds path; leave ESPN scores/schedules/boxscores untouched.

- **Cost:** none measurable. It produced zero picks (2b), and after Part 1 it
  advances no clock and writes no odds (2c).
- **Gain:** removes the storage + commercial-display exposure entirely, including
  the `recordSourceSnapshot` payload retention.
- **Risk:** loses a documented emergency fallback
  (`ESPN_PUBLIC_ODDS_FREE_PATH.md`) for a keys-down outage. Given it cannot
  produce a pick, that fallback was already ornamental.

### Option B — Re-classify `espn-hidden-api` with written justification

Correct the legacy entry to match the rights registry's own conclusion
(`approved_public_logged_off`, facts-only, attribution required), and record the
reasoning: facts are not copyrightable; the two registries currently contradict
each other over the same hosts.

- **Cost:** a genuine legal judgment. `commercial_display_allowed: false` and
  `storage_allowed: false` would still block the odds path's actual behaviour, so
  this alone does **not** license storing ESPN prices.
- **Gain:** ends the contradiction that makes every ESPN client ambiguous.
- **Risk:** relaxing a "forbidden" verdict is exactly what an agent must never do
  unilaterally. **Owner + counsel only.**

### Option C — Narrow path: facts-only, gated by intent (recommended)

1. Bind the odds client to `espn-public-api` and call `checkClearance` with
   `["internal_analysis", "derived_analytics"]` — **passes today, throws
   nothing** (§4).
2. Keep Part 1's freshness behaviour, which already prevents ESPN odds reaching
   `db.odds` / `db.game`.
3. Render `"Scores data via ESPN"` wherever ESPN-derived facts surface (§3).
4. Separately decide the `recordSourceSnapshot` raw-payload retention, which is
   the one storage intent still exercised.

- **Cost:** small, mechanical, no behaviour regression.
- **Gain:** the path becomes *governed* rather than *ungoverned*, without a legal
  re-classification and without emptying any board.
- **Risk:** leaves the two registries disagreeing. That still wants Option B
  eventually — C just stops the bleeding first.

---

## Recommendation

**C now, A shortly after, B only with counsel.**

C is the only option that makes the path governed without either throwing on a
live path or relaxing a "forbidden" verdict — and §4 proves it clears today with
no registry edit. A is then near-free: once Part 1 lands, the ESPN odds client
cannot produce a pick, cannot advance the freshness clock, and cannot write odds,
so it is carrying legal exposure for no product value. B is the real fix for the
registry contradiction, but it is a legal judgment about ESPN's ToU that only the
owner and counsel can make, and it must not be done to unblock code.

Independent of all three: **fix the attribution gap (§3)**. It is required by our
own registry, it is currently unrendered, and it is cheap.

---

## Operator checks required

1. **Is the ESPN odds path live right now?** It only fires when both the Odds API
   and TheRundown return zero events. Confirm in the production env whether
   `THE_ODDS_API_KEY` and a `RUNDOWN_API_KEY` alias resolve
   (`/api/ops/public-surface-truth` → `oddsInserting.dualPath`). If both are
   absent, expect the Part 1 alerting change in §2c on the next cycle.
2. **`recordSourceSnapshot` retention** — decide whether raw ESPN payloads should
   continue to be stored at all.
3. **Counsel** — Option B only.

## Related

- `docs/ops/ESPN_PUBLIC_ODDS_FREE_PATH.md` — why the path was added (2026-08-10)
- `docs/ops/FREE_SOURCE_USAGE_SCHEDULE.md` — cleared-free-source law
- `apps/web/lib/scraping/clearance-engine.ts` — intent-scoped clearance
- `packages/data-ingestion/src/source-registry.ts` — `assertIngestible`
