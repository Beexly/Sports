# Galaxy 2026 Limit Push — Claude Continuation

## What this is

The "Garrett resource dump" (`handoff/incoming/garrett-resource-dump-2026-06-15.md`,
532,163 bytes, 12,484 lines, SHA-256
`957f68dec09222d9c636dae64b0eaaa4f1c09732048a47189fdd24908f0cb3c4`) is raw research
intake — an awesome-list style collection of ~11k tool/resource names. It is **not**
approval to use anything. It is parsed, normalized, and rights-gated by a repo-native
engine, then packaged into a ledger + queues.

> The local Codex sprint that produced this was done on a Windows machine and was never
> pushed; only the raw dump reached the remote (branch `garrett/resource-dump-2026-06-15`).
> This continuation **rebuilt the pipeline from the verified dump** in-repo — no
> fabricated classifications.

## Engine (single source of truth)

`apps/web/lib/resource-intelligence/`
- `parse.ts` — dump → raw entries (tracks source-file + section context)
- `classify.ts` — conservative, ordered, deterministic rights gate
- `pipeline.ts` — parse → dedupe (stable id) → classify → ledger + queue selectors
- `cockpit.ts` — owner decision feed (`buildCockpitSummary` / `getResourceCockpitFeed`)
- `types.ts`, `index.ts`

Regenerate: `npm run resource-intel:generate` (verifies the dump SHA, aborts on any
gated-leak). Tests: `npm run test:resource-intel` (12 tests).

## Generated artifacts

`handoff/codex/galaxy-2026-limit-push/`
- `NORMALIZED_RESOURCE_LEDGER.csv` — every resource, disposition, risk, reasons
- `IMPLEMENT_NOW_QUEUE.md` — approved-direct + prototype only
- `OWNER_REVIEW_QUEUE.md` — gated; do not promote without clearance
- `QUARANTINE_LEDGER.md` — hard-blocked, terminal
- `RESOURCE_INTELLIGENCE_SUMMARY.md` — counts + gates

Cockpit feed JSON (committed, read at runtime):
`apps/web/lib/resource-intelligence/generated/summary.json`

## Disposition counts (from the verified dump)

| Disposition | Count |
|---|---|
| approved_direct | 15 |
| prototype | 638 |
| approved_internal_reference | 8,474 |
| roadmap | 528 |
| owner_review | 721 |
| quarantine | 632 |
| rejected_noise | 118 |
| **unique resources** | **11,126** |

## Hard rules (enforced by tests)

1. **Quarantine is terminal.** Piracy / evasion / circumvention (torrents, IPTV, ROMs,
   cracks/keygens, CAPTCHA/paywall/login/DRM bypass, jailbreak/leaked prompts, proxy
   rotation to circumvent, fake accounts). Never promoted, prototyped, referenced in
   claims, or added to any registry.
2. **Owner-review is gated.** Scraping/crawling, third-party sports data, RSS/YouTube/
   podcast/API ingestion, and legal-gray dual-use tools. Keep OUT of public claims,
   StatKing evidence, Airwave feeds, and automation until the existing source-provider +
   clearance gates clear them.
3. **Implement-now = approved-direct + prototype only**, asserted leak-free at generation
   time (`findGatedLeaks`) and in tests.

The classifier is deliberately conservative: when section/list context is piracy-adjacent
(e.g. a tool listed under "Streaming Site APIs"), it quarantines even an otherwise-safe
name. Over-blocking is the safe direction.

## Free-first sourcing (added)

Doctrine: use every FREE, cleared source before any paid API — without losing stats
quality. See `docs/data/FREE_FIRST_SOURCING.md`.

- Platform router: `apps/web/lib/data-sources/source-router.ts` (free-first, cleared-only,
  quality-aware) + `cost-policy.ts` (CFB cost view).
- Verified free adapters (live HTTP 200, schema-checked, fixture-tested):
  `free-adapters/espn-scores.ts` (all 7 sports), `espn-rankings.ts` (AP/Coaches),
  `open-meteo.ts` (weather). Entrypoints + spend guard: `free-first-ingest.ts`.
- Open-Meteo added to the rights registry (approved_open_license).
- In-season odds gating (`getInSeasonSports`) protects The Odds API 500/mo credits.
- Cockpit: `/api/cockpit/free-coverage` + a free-vs-spend section on `/cockpit/sources`.
- Live proof: `npx tsx scripts/free-ingest-smoke.mjs` (8/8 ok, no key/spend).

## Remaining continuation (not yet done)

- Wire the free adapters into the actual ingestion pipeline writes (currently they
  return normalized facts; the pipeline still needs to persist them via the DB schema).
- Cross-source score verification → free settlement (save Odds API credits on scores).
- Clear a free odds candidate (TheRundown / Big Balls / Sports Game Data) to remove the
  last paid dependency.
- Work the remaining CFB/NFL candidates through the source-provider gate — see
  `apps/web/lib/scraping/sports-data-candidates.ts` and the dossier.

Done since first handoff: resource-intelligence cockpit route/feed; StatKing source
confidence fields; CFBD terms-gate checklist; broadened approvals (15→1,489).
