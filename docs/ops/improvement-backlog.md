# Improvement Backlog

> Non-urgent improvements either Claude or Codex has noticed in the
> wild. Codex implements approved items in slack time between phase
> work. Items here are NOT blocking and NOT scheduled — they're the
> "if we have a quiet afternoon" pile.
>
> When an item becomes urgent or in-scope for a phase, move it to
> `issue-queue.md` or directly into the phase brief.

## Format

```
### <short title>

**Found by:** Claude / Codex / owner
**Surface:** which file or system
**Suggestion:** what to change and why
**Estimated effort:** trivial / small / medium / large
**Risk if we skip:** what happens if we never do it
```

---

## Open improvements

### Add AbortController timeout + retry to OddsApiClient

**Found by:** Claude (data-ingestion package audit, 2026-05-23)
**Surface:** `packages/data-ingestion/src/odds-api-client.ts` —
the `fetch<T>()` private method
**Suggestion:** wrap `globalThis.fetch(url.toString())` with an
`AbortController` (default 15s timeout, configurable per call), and
add an exponential-backoff retry on 5xx + 429 responses (max 3
attempts, jitter to avoid thundering-herd against The Odds API
rate-limit window).
**Estimated effort:** small (~30-60 min including tests against a
mocked fetch that simulates 503 then 200, and a 16-second hang)
**Risk if we skip:** a slow upstream call could hang the
data-refresh worker indefinitely; transient 5xx makes the worker
silently skip a refresh cycle when a retry would have succeeded.
Affects ingestion freshness, which the health endpoint uses to
report degraded vs healthy. Not customer-facing yet but operational.

### Replace `package.json` workspace `name` strings with brand-aligned names

**Found by:** Claude (during corporate-structure scan)
**Surface:** `/package.json` (`name: "sports-prediction-platform"`),
`/apps/web/package.json` (`name: "@sports/web"`)
**Suggestion:** these are internal-only and the registry isn't used,
but it's a small consistency win to rename to
`@galaxy-sports/network-platform` or similar so the corporate name is
visible in the dev environment too. Low priority.
**Estimated effort:** trivial
**Risk if we skip:** none. Cosmetic only.

### Move all support / legal email addresses through a single brand constant

**Found by:** Claude (during corporate-structure scan)
**Surface:** roughly a dozen files reference `hq@galaxysportsedge.com`
directly as a string literal instead of importing `SUPPORT_EMAIL` or
`LEGAL_EMAIL` from `lib/brand.ts`. Examples:
`apps/web/app/changelog/page.tsx`, `apps/web/app/faq/page.tsx`,
`apps/web/app/auth/error/page.tsx`,
`apps/web/components/home/start-in-sixty.tsx`, others.
**Suggestion:** scan and replace inline strings with the brand
constants so a future email change is a single-file edit.
**Estimated effort:** small
**Risk if we skip:** every email change becomes a multi-file
grep-and-replace. Low day-to-day risk.

### Audit `docs/` for cross-references to old domain/handle/email strings

**Found by:** Claude (during corporate-structure scan)
**Surface:** `docs/` (operator playbook, launch QA addendum,
scheduler-strategy, etc.) and `social/launch-day.md` reference
domains, handles, and emails as literals. These won't break anything,
but if the domain/handle ever changes, the docs will silently drift.
**Suggestion:** when a doc is next edited for substance, replace any
brand literals with `[BRAND_DOMAIN]` / `[BRAND_HANDLE]` placeholders
and add a one-line note pointing readers to `lib/brand.ts`.
**Estimated effort:** medium (touches many files; do opportunistically,
not as a project)
**Risk if we skip:** drift over time, especially if the domain ever
moves.

### Verify nested `Sports/` clone is removed before Phase 1 starts

**Found by:** master plan Part 5 Phase 0 (Codex flagged)
**Surface:** repo root
**Suggestion:** explicit check on Phase 0 entry — `find . -type d
-name Sports -not -path "./.git/*"` should return only the top-level
checkout. If a nested clone exists, remove or `.gitignore` it before
proceeding.
**Estimated effort:** trivial
**Risk if we skip:** nested clone could shadow paths in tooling.

---

## Promoted / Closed

*None yet.*
