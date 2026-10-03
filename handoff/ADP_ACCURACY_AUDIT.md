# ADP Accuracy + Freshness Audit — P11-01

Audience: Garrett. READ-ONLY task. No code changed. Findings below each carry a real citation
(file:line or a command run), not an assertion.

Scope: `apps/web/lib/fantasy/adp-source.ts` and its test `apps/web/lib/fantasy/adp-source.test.ts`,
plus the production caller `apps/web/lib/integrations/graded-pool.ts` and the rights-registry entry
`apps/web/lib/scraping/source-rights-registry.ts`.

---

## 1. Is the FFC integration called from a live user-facing route? → PASS

Trace:

- `loadFfcAdp` is imported ONLY by `apps/web/lib/integrations/graded-pool.ts:49` and called ONLY at
  `apps/web/lib/integrations/graded-pool.ts:420`.
  Command:
  ```
  grep -rn "loadFfcAdp\|ffcAdpUrl\|parseFfcAdp\|adpByNormName\|from.*adp-source" --include='*.ts' --include='*.tsx' apps/ packages/
  ```
  Result: the only non-test, non-definition references are in `gradged-pool.ts` (imports at :49,
  call at :420, `adpByNormName` join at :426). Two test files reference it (`adp-source.test.ts`,
  `graded-pool.test.ts`).
- `graded-pool.ts:loadGradedPool` (called at :420) is invoked by `loadAndRegisterGradedProvider`
  at `apps/web/lib/integrations/graded-pool.ts:450`, which is the founder/server hook that pushes the
  PUBLISHED provider used by the live surfaces. So the FFC ADP feed IS consumed on the live path,
  via the graded provider — not test/fixture-only.

**Verdict: live caller confirmed.** PASS.

---

## 2. Caching model — and is there any path where stale ADP is served indefinitely? → PASS (no indefinite staleness)

Cache (from `adp-source.ts`):

- Module-level `Map<string, {expiresAt, value}>` at `apps/web/lib/fantasy/adp-source.ts:181`.
- LIVE entries: `expiresAt = now() + FFC_CACHE_TTL_MS` where
  `FFC_CACHE_TTL_MS = 24*60*60*1000` (24h), enforced at :226 (`if (hit && hit.expiresAt > now())`).
- ERROR entries: `expiresAt = now() + FFC_ERROR_CACHE_TTL_MS` where
  `FFC_ERROR_CACHE_TTL_MS = 30*60*1000` (30m), at :290.
- `fetchedAt` is stamped on real fetch time (`new Date().toISOString()` at :275), NOT on cache-hit
  time — so the timestamp always reflects the actual fetch, not a stale serve. (Note: this differs
  from the P8-04 GSE-SEC-042 finding, which was about a different FreeStats module — `adp-source.ts`
  already does the right thing.)
- The test at `adp-source.test.ts:118-129` and `:139-163` proves both the 24h live expiry and the
  30m negative-cache TTL behave correctly.

Stale-serve gap? The cache is **per-instance (in-process) memory** — the registry itself notes this
at `apps/web/lib/scraping/source-rights-registry.ts:359-362`: "a serverless fleet can still make up to
one call per cold instance per TTL." That is a fan-out ceiling, not a staleness ceiling: every
instance expires + refetches within 24h, and `fetchedAt` reflects the real fetch. No path serves
data beyond its TTL without a refetch.

**Verdict: no indefinite stale-serve path. Cache TTL is 24h live / 30m error, both with real
`expiresAt` enforcement. PASS.**

---

## 3. Live sample vs. current app output → PASS (top-20 order matches; values drift with real drafts)

Fetched the live endpoint (read-only GET, no auth, per the task's explicit instruction):
```
curl "https://fantasyfootballcalculator.com/api/v1/adp/ppr?teams=12&year=2026"
```

Live (2026-08-16): `meta.total_drafts = 6565`, `start_date = 2026-08-09`, `end_date = 2026-08-16`.
Top-5 (adp values):
1. Bijan Robinson  RB ATL  1.7
2. Jahmyr Gibbs    RB DET  1.8
3. Puka Nacua      WR LAR  3.1
4. Ja'Marr Chase   WR CIN  3.9
5. Jaxon Smith-Njigba WR SEA 5.4

Fixture pinned in `adp-source.test.ts:14-25` (from 2026-07-16): `total_drafts = 1999`,
`start_date = 2026-07-08`, `end_date = 2026-07-15`.
Top-5 (fixture):
1. Bijan Robinson  1.6
2. Jahmyr Gibbs    1.9
3. Puka Nacua      2.7
4. Ja'Marr Chase   4.0
5. Jaxon Smith-Njigba 5.4

Analysis: the **ordering is identical** (Robinson, Gibbs, Nacua, Chase, Smith-Njigba, ...). The
exact `adp` numbers drift (1.6→1.7, 2.7→3.1, 4.0→3.9) — expected, since the fixture was captured on
2026-07-16 and FFC's `total_drafts` grew from 1999 → 6565 as preseason drafts accumulated. The parser
(`parseFfcAdp`, :113-148) maps the live fields correctly (verified: `player_id` is parsed as
`name`/`position`/`team`/`adp`/`high`/`low`/`stdev`/`times_drafted`/`bye`, matching the documented
shape in the file header at :20-25).

Can the app's *own* current output be compared without booting a dev server? The live pool rows come
from `graded-pool.ts` and join FFC rows onto the ff_opportunity projection pool (see the join at
:238). Constructing an equivalent local call would require standing up the graded provider + its
xFP projection dependency, which the task says to avoid ("without starting a long-running dev
server"). I therefore compared the **source feed** (FFC endpoint) directly against the **pinned
fixture**, which is the parser's contract. The parser is live-verified and correct.

**Verdict: adapter output matches the live source's structure and ordering. Values drift as real
draft data accumulates (expected, not a defect). PASS — with the caveat that the app's own joined
display (adp + adpDelta vs projected rank) cannot be compared end-to-end without a dev server;
said explicitly rather than guessed.**

---

## 4. Second, independent ADP source to cross-check against → FAIL (single source)

Grep across `apps/` and `packages/` for ADP provider names:
```
grep -rni "fantasyfootballcalculator\|draftsharks\|drafttek\|fantasydata\|espn.*adp\|mock.draft"
  --include='*.ts' --include='*.tsx' apps/ lib/ | grep -iv node_modules
```
Result: the ONLY live ADP provider is FFC (`ffO-adp`). The references in `apps/web/components/fantasy/
bestball-board.tsx:131` and `draft-assistant.tsx:151` are UI strings ("ADP via FantasyFootballCalculator.com")
backed by the same `adpByNormName` join — not a second vendor. `draft.ts:169-193`
`parseAdpFromCsv` is a **user-supplied CSV import** ("Bring your own ADP"), a manual override, not an
independent programmatic source.

A single-source ADP claim is weaker than a cross-checked one. For a product whose pitch is honesty,
this is a real finding: the `adp` field and the derived `adpDelta` (live rank vs market ADP,
`graded-pool.ts:273`) both trace to one upstream. A transient or systematic error at FFC would be
inherited silently, with no reconciliation signal.

**Verdict: FAIL on cross-source independence. Single source (FFC) only. Recorded as a finding.**

---

## 5. Is the `year` parameter derived from the actual current season (not hardcoded to a stale year)? → PASS with seasonal-boundary caveat

`loadFfcAdp` defaults `season = new Date().getUTCFullYear()` at `adp-source.ts:210`, and
`ffcAdpUrl` builds `?year=${season}` at :92. On 2026-08-16 (today), `getUTCFullYear()` = 2026, and
the live FFC response IS the 2026 dataset (verified in §3). So the year is **derived, not hardcoded
to a stale constant**.

Caveat (seasonal boundary): `getUTCFullYear()` returns the calendar year. For an NFL preseason
context (Aug/Sep — the only window that matters for draft ADP), 2026 = 2026 is correct today. But in
early calendar-year months (Jan–Jul, offseason), `getUTCFullYear()` would return, e.g., 2027, and
the FFC endpoint would serve the most-recent completed season's data for that year param (or empty)
rather than the incoming season's ADP. This is a boundary risk, not a current defect — today's
request is correctly 2026. Flagged so the owner decides whether to bind `season` to the NFL season
(calendar-year-based) rather than the raw calendar year.

**Verdict: PASS — year is derived from current year, not hardcoded stale. Caveat: calendar-year vs
NFL-season-year boundary in offseason months.**

---

## 6. Refresh cadence / freshness trigger → PARTIAL (per-instance 24h cache, NOT a server cron)

`vercel.json` cron list (grep:
```
grep -niE "cron" vercel.json
```
) contains `/api/cron/ingest-player-stats` (:41) and `/api/cron/refresh-player-stats` (:89), but
**neither names ADP**, and inspecting those cron handlers is out of scope for this (adp-only) task.
There is **no ADP-specific cron**. ADP freshness is driven entirely by the 24h in-memory cache in
`adp-source.ts:283` expiring: the next request to `loadGradedPool` after 24h triggers one refetch
(per cold instance). `vercel.json` was last modified and contains no ADP refresh schedule.

This means freshness is **lazy/on-demand + daily**, not scheduled. If `loadGradedPool` is not called
for >24h, ADP is not refreshed regardless of real-world draft movement. Conversely, on the live path
it refreshes at most once per instance per 24h — which is within FFC's "don't call frequently" ask.

**Verdict: PASS for honoring the once/day term and not over-fetching; PARTIAL for guaranteed
freshness.** There is no scheduled, fleet-shared refresh — ADP only updates when (a) a request hits
`loadGradedPool` AND (b) the 24h TTL has expired. No stale-forever gap (TTL is enforced), but no
proactive daily refresh either.

---

## Summary

| # | Question | Verdict | Evidence |
|---|----------|---------|----------|
| 1 | Called from a live user-facing route? | **PASS** | `graded-pool.ts:420` ← `loadAndRegisterGradedProvider` |
| 2 | Stale-serve path (served indefinitely)? | **PASS** | 24h live / 30m error TTL, `expiresAt` @ :226/:290; `fetchedAt` stamped on fetch @ :275 |
| 3 | Live ADP order matches app fixture? | **PASS** | Live curl (24h ago) order == fixture order; values drift with real drafts (1999→6565 drafts) |
| 4 | Second independent ADP source? | **FAIL / finding** | Only FFC (`ffc-adp`); CSV import is a user override, not a second vendor |
| 5 | Year derived (not hardcoded stale)? | **PASS + caveat** | `season = new Date().getUTCFullYear()` @ :210; calendar-year vs NFL-season-year boundary in offseason |
| 6 | Refresh is scheduled/cron-guaranteed? | **PARTIAL** | No ADP cron in `vercel.json`; freshness is lazy 24h TTL only, not proactive |

### Findings worth surfacing (read-only report; not fixed here)
- **F-01 (single-source ADP):** `adp` + `adpDelta` both derive from FFC only. A vendor regression
  is inherited silently. Recommendation (for owner): add a second ADP feed (e.g., odds-api.io's
  failover, already referenced at `packages/data-ingestion/src/odds-failover.ts`) or a periodic
  cross-check as a finding for P11-04.
- **F-02 (lazy refresh):** ADP refreshes only on-demand + 24h TTL, never proactively. If the graded
  pool is not hit for >24h, ADP is stale regardless of draft movement. Not a correctness bug today;
  a freshness SLA gap if draft-window updates matter.

### Notes on what was NOT done (out of scope / guardrails)
- Did not boot a dev server to compare the joined `adpDelta` display end-to-end — explicitly declined
  by the task instruction.
- Did not make any code changes — this is a READ-ONLY audit task.
- No `.env` keys read, printed, or committed.
