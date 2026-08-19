# REMEDIATION ROADMAP — planning only

Source: `handoff/AUDIT_FINDINGS.md` (75 blocks, GSE-SEC-001..075).
Written: 2026-08-15. **Do not implement from this file.** A human reviews, then plans the build.

Lane key:
- **SAFE DIRECT** — app/package code outside sealed trees; no schema, no `package.json`, no control-plane.
- **CHANGE PROPOSAL** — needs owner review before any edit: `package.json` / lock, Prisma schema/migrations, `apps/web/lib/ai-control-plane/**`, guardrails, `.github`, `docs`, or a legal/rights status flip.

Effort is the finding's own S / M / L (or the register's S–M when that is what it said).

---

## Coverage of every Critical and High

VERIFY rule: every Critical and High ID from the register must appear below.

| ID | Sev | Status in register | Bucket | Lane | Effort |
|---|---|---|---|---|---|
| GSE-SEC-001 | CRITICAL | HISTORICAL as current CVE (lock patched). Residual = 061 | Now (close residual) | CHANGE PROPOSAL (`package.json` pin) | M (upgrade already done; residual pin is S, filed as 061) |
| GSE-SEC-002 | CRITICAL | HISTORICAL (fail-open fixed in beta.32). Residual = 061 | Now (close residual) | CHANGE PROPOSAL | M (same cluster as 001) |
| GSE-SEC-003 | HIGH | OPEN — advisory list superseded by 059; not closed | Next | CHANGE PROPOSAL (Next major) | L |
| GSE-SEC-004 | HIGH | STALE wording — nested copy is 060 | Next | CHANGE PROPOSAL (tied to Next) | S (direct postcss already patched; remaining work is 060) |
| GSE-SEC-005 | HIGH | HISTORICAL — not in current npm-audit.json | Later | no code unless a new advisory lands | S–M (only if it returns) |
| GSE-SEC-016 | HIGH | OPEN live | Now | SAFE DIRECT | S |
| GSE-SEC-025 | HIGH | OPEN live product | Now | SAFE DIRECT | S |
| GSE-SEC-039 | HIGH | OPEN live | Now | SAFE DIRECT | S |
| GSE-SEC-043 | HIGH | OPEN live | Now | SAFE DIRECT | S |
| GSE-SEC-049 | HIGH | OPEN live | Now | SAFE DIRECT (status flip would be CP) | S–M |
| GSE-SEC-050 | HIGH | OPEN live | Now | SAFE DIRECT (registry row add is CP if schema/docs) | M |
| GSE-SEC-051 | HIGH | OPEN live | Now | MIXED — wire `checkClearance` SAFE DIRECT; persist/unlock is owner/legal CP | M |
| GSE-SEC-059 | HIGH | OPEN — Next 14.2.35 HIGH cluster; fix is semver-major | Next | CHANGE PROPOSAL | L |
| GSE-SEC-060 | HIGH | OPEN — Next-nested postcss 8.4.31 | Next | CHANGE PROPOSAL (same Next major as 059) | L |

Critical count in this table: 2. High count: 12. Matches histogram.

---

## NOW — ship-blockers (Critical residual + live Highs)

Do these before paid picks go public. Critical+High only in this bucket. No implementation in this sprint.

### 1. GSE-SEC-025 — public preview + board leak PREMIUM `selection`/`line`
- Lane: **SAFE DIRECT**
- Effort: S
- Why now: FREE/anon/crawler HTML is the paid board. `/api/picks` already gates; preview/board do not.
- Sketch (do not implement): same `tier: "FREE"` / `canSeePremiumPicks` predicate in `loadGameForSlug` / `bestPublishedPick` / `loadBoardState`, or omit `selection`/`line` unless entitled.
- Pair when touching the same files: **GSE-SEC-026** (Medium, `rankingP` on public board) — same redactor. 026 is sequenced in Next so this file does not expand Now beyond Critical+High.

### 2. GSE-SEC-016 — dual-mode cron treats `x-vercel-cron` as auth
- Lane: **SAFE DIRECT** (prod env `CRON_REQUIRE_BEARER=true`, or default `bearer_only` in `apps/web/lib/cron/authorize.ts`)
- Effort: S
- Why now: mutating settle / odds / entitlements / backfill are on dual mode. Header is not a secret.
- Sketch: bearer-only on every mutating cron; dual only on read-only health probes.

### 3. GSE-SEC-043 — refresh TOCTOU can rewrite a just-settled pick
- Lane: **SAFE DIRECT** (`packages/ingestion-pipeline`)
- Effort: S
- Why now: track record can disagree with the graded line after settle ∩ refresh overlap.
- Sketch: refresh write = `updateMany` scoped to `result: "PENDING"`; never unbounded `upsert.update` on pick identity fields.

### 4. GSE-SEC-039 — `paidCallJustified()` never called on live paid Odds paths
- Lane: **SAFE DIRECT**
- Effort: S
- Why now: key present ⇒ paid scores even when ESPN is free+cleared. Guard is ornamental.
- Sketch: call `paidCallJustified(need, sport)` (or `requiresPaidEscalation`) inside `OddsApiClient.fetch` / `processSport` / `settleSport` before `noStoreFetch`. Key = enrichment, not a path switch.

### 5. GSE-SEC-049 — PFR advstats under nflverse blanket
- Lane: **SAFE DIRECT** to refuse fetch/persist/display. Flipping `pfr-advstats-via-nflverse` to approved is a **CHANGE PROPOSAL** (rights).
- Effort: S–M
- Why now: dedicated `permission_required` source is bypassed via `assertIngestible("nflverse")`.
- Sketch: every `pfr_advstats` path `checkClearance` with `pfr-advstats-via-nflverse`; refuse until status flips; drop dataset from nflverse assert list.

### 6. GSE-SEC-050 — settlement fetches unregistered score sources, no `checkClearance()`
- Lane: **SAFE DIRECT** to hard-gate/delete adapters. Adding a rights-registry row is a **CHANGE PROPOSAL** (rights + possibly docs).
- Effort: M
- Why now: henrygd / mlb-statsapi / balldontlie / nhl-web-api write Game scores while `cleared: false` / unregistered.
- Sketch: refuse at runtime when router `cleared: false`; no fetch until registry + pre-fetch `checkClearance`.

### 7. GSE-SEC-051 — ESPN (and rest of ingest) skip `checkClearance`; scores stored despite `storage_allowed=false`
- Lane: **MIXED**. Pre-fetch `checkClearance` on adapters = **SAFE DIRECT**. Satisfying `unlock_condition` or changing registry storage/display flags = **CHANGE PROPOSAL** (legal). Persist-stop is SAFE DIRECT and is the default until unlock.
- Effort: M
- Why now: free settle persists ESPN facts into the SoR that grades paid picks.
- Sketch: real intents on every adapter (`storage` when writing Game). Stop ESPN persist or unlock first.

### 8. GSE-SEC-001 / GSE-SEC-002 — next-auth / @auth/core Criticals
- Lane: **CHANGE PROPOSAL** (`apps/web/package.json`)
- Effort: M in the register (upgrade). Live CVE work is already in the lock (beta.32 / @auth/core 0.41.3).
- Why now: do **not** re-upgrade. Close the residual float as **GSE-SEC-061** (pin, no caret) in the same human-reviewed package.json pass. Until that pin lands, treat 001/002 as open residuals, not current CVEs.
- Sketch: pin `next-auth@5.0.0-beta.32` and `@auth/prisma-adapter`; any later beta is an explicit review. See Next bucket.

---

## NEXT — remaining Highs, then money / integrity / rights / auth Mediums

Highs that are not launch-week product holes: framework majors and stale/historical supply-chain tags.

### High — Next.js / PostCSS cluster

### GSE-SEC-003 — next deserialization + Image Optimizer DoS
- Lane: **CHANGE PROPOSAL** (Next 15.5.21+ or 16.3.1 + full regression)
- Effort: L
- Note: advisory *list* superseded by 059; keep 003 OPEN until the major ships.

### GSE-SEC-059 — Next 14.2.35 HIGH advisory cluster
- Lane: **CHANGE PROPOSAL** (`package.json` + App Router / Server Action regression)
- Effort: L
- Until the major: pin `next` to `14.2.35` (drop caret) — still a package.json CP, smaller than the major. Keep the dated CI waiver. Do not add `remotePatterns: ['**']` or user-controlled rewrite destinations.

### GSE-SEC-004 — postcss arbitrary file read (build chain)
- Lane: **CHANGE PROPOSAL** only if someone still bumps the *direct* copy; wording is STALE
- Effort: S
- Direct `apps/web` postcss is already 8.5.26. Remaining vulnerable copy is Next-nested (060). Do not `npm update postcss` expecting the nested copy to move.

### GSE-SEC-060 — Next-nested postcss 8.4.31
- Lane: **CHANGE PROPOSAL** (same Next major as 059)
- Effort: L
- Same waiver as 059.

### High — historical, no code unless it returns

### GSE-SEC-005 — transitive DoS cluster (fast-uri, brace-expansion, nanoid)
- Lane: none today
- Effort: S–M if a new advisory lands
- Lock already has patched versions. Re-check `handoff/npm-audit.json` after any lock refresh.

### Mediums that ride the same Now surfaces (do in the same PRs after the Highs)

| ID | Title | Lane | Effort | After |
|---|---|---|---|---|
| GSE-SEC-026 | `rankingP` on public board | SAFE DIRECT | S | 025 (same redactor) |
| GSE-SEC-040 | trigger-refresh + paid settle ignore season gating | SAFE DIRECT | S | 039 |
| GSE-SEC-041 | no outbound Odds quota stop; 429 retries spend more | SAFE DIRECT | S | 039 |
| GSE-SEC-044 | published PENDING relabels confidence/grade/modelVersion | SAFE DIRECT | M | 043 |
| GSE-SEC-045 | signal-slate resets `generatedAt` on PENDING update | SAFE DIRECT | S | 043 |
| GSE-SEC-046 | VOID_PICKS is a paper receipt | SAFE DIRECT (schema only if VOID status missing — it exists) | M | 043 |
| GSE-SEC-047 | FINAL scores overwritten without re-grade | SAFE DIRECT | M | 043 |
| GSE-SEC-048 | fallback snapshot fabricates prediction-time fields | SAFE DIRECT | S | 043 |
| GSE-SEC-052 | dual legal registries; nflverse blanket | MIXED — delegate assert→checkClearance SAFE DIRECT; collapsing registries may touch sealed/docs | M | 049 |
| GSE-SEC-053 | most records never get RightsSnapshot | CHANGE PROPOSAL if persist columns; else SAFE DIRECT wrap at boundaries | L | 049–051 |
| GSE-SEC-054 | attribution dropped; henrygd labeled ESPN | MIXED — stop ESPN overwrite SAFE DIRECT; persist attribution column = schema CP | S–M | 050–051 |

### Mediums — billing / session (money path, not High)

| ID | Title | Lane | Effort |
|---|---|---|---|
| GSE-SEC-021 | refund / dispute does not revoke entitlement | SAFE DIRECT (webhook cases) | S |
| GSE-SEC-022 | Stripe `unpaid` mapped to PAST_DUE grace | SAFE DIRECT | S |
| GSE-SEC-017 | JWT keeps stale ADMIN if DB lookup fails | SAFE DIRECT (`lib/auth.ts`) | S |
| GSE-SEC-018 | `GSE_ALLOW_QUERY_TIER=1` elevates in prod | SAFE DIRECT (ignore flag when `NODE_ENV===production`) | S |
| GSE-SEC-061 | next-auth prerelease caret | CHANGE PROPOSAL (`package.json`) — residual of 001/002 | S |

### Mediums — abuse / XSS defense / LLM spend

| ID | Title | Lane | Effort |
|---|---|---|---|
| GSE-SEC-006 | rate-limit count STALE; class lives in 067/068 | n/a as a separate fix | M (do 067/068) |
| GSE-SEC-067 | public outbound-fan-out GETs unthrottled | SAFE DIRECT | S–M |
| GSE-SEC-068 | public calibration/performance GETs unbounded | SAFE DIRECT | S |
| GSE-SEC-031 | `/api/performance` loads every settled pick | SAFE DIRECT | S (same pass as 068) |
| GSE-SEC-007 | CSP `unsafe-inline` / `unsafe-eval` | CHANGE PROPOSAL (nonce rollout + header SoT) | M |
| GSE-SEC-063 | `/embed` CSP is only `frame-ancestors *` | SAFE DIRECT once 007 policy string exists | S |
| GSE-SEC-064 | cookie mutations have no CSRF/Origin check | SAFE DIRECT (Origin gate / NextAuth cookie assert) | S |
| GSE-SEC-035 | remote-model SSRF skips RFC1918 + redirects | SAFE DIRECT | S |
| GSE-SEC-036 | other env-controlled fetchers have no SSRF guard | SAFE DIRECT | S |
| GSE-SEC-037 | public GSE v1 + roster POSTs, no schema | SAFE DIRECT | S |
| GSE-SEC-028 | provider API keys in GET query strings | SAFE DIRECT | S |
| GSE-SEC-056 | live LLM dispatchers skip budget | MIXED — wrapper checks SAFE DIRECT; putting reserve inside sealed control-plane = CP | M |
| GSE-SEC-057 | untrusted user text interpolated into prompts | SAFE DIRECT | S |
| GSE-SEC-071 | pick-explain forwards raw Claude error bodies | SAFE DIRECT | S |
| GSE-SEC-072 | promo publish gate does not enforce 21+ | SAFE DIRECT | S |
| GSE-SEC-032 | contest/waitlist shadow tables via runtime DDL | CHANGE PROPOSAL (Prisma models + migrations) | M |

### Mediums — owner-gated decisions (do not mechanical-fix)

| ID | Title | Lane | Effort |
|---|---|---|---|
| GSE-SEC-008 | autonomy executor allow-list type debt (#421) | CHANGE PROPOSAL — do NOT add the key | S (decision-gated) |
| GSE-SEC-009 | API v1 tree pre-promotion (#420) | CHANGE PROPOSAL — remove vs promote | S (decision-gated) |

---

## LATER — Lows, Info, and non-blocking hygiene

No Critical or High lives only here except **GSE-SEC-005** (historical; listed again for the VERIFY table).

### Lows

| ID | Title | Lane | Effort |
|---|---|---|---|
| GSE-SEC-010 | model-freeze debt (#419) | CHANGE PROPOSAL (calibration artifact / FROZEN marker) | S |
| GSE-SEC-011 | DEV_FAKE_ADMIN escape hatch (already double-gated) | SAFE DIRECT to remove post-launch; none required now | S |
| GSE-SEC-015 | B2B rate limit is process-local | SAFE DIRECT (durable store before public key issuance) | S–M |
| GSE-SEC-019 | `trustHost: true` with no `AUTH_URL` | SAFE DIRECT (env + boot fail) | S |
| GSE-SEC-020 | `safeCallbackUrl` allows `/\\` weird relatives | SAFE DIRECT | S |
| GSE-SEC-023 | no live/test Stripe key guard | SAFE DIRECT | S |
| GSE-SEC-024 | advertised phase price vs Stripe `unit_amount` | SAFE DIRECT | S |
| GSE-SEC-027 | FREE `/api/picks` first sentence of full reasoning | SAFE DIRECT | S |
| GSE-SEC-029 | `.env.example` hygiene | SAFE DIRECT (templates only; never real values) | S |
| GSE-SEC-030 | secret-scan misses credential classes | CHANGE PROPOSAL (`scripts/guardrails/` is sealed this sprint) | S |
| GSE-SEC-033 | durable-write guard covers only two Stripe caps | SAFE DIRECT in `packages/db` (not Prisma schema) | S |
| GSE-SEC-034 | push upsert re-owns unique endpoint | SAFE DIRECT | S |
| GSE-SEC-038 | cockpit task routes cast Prisma enums | SAFE DIRECT | S |
| GSE-SEC-042 | FreeStats stamps `fetchedAt=now` on cache hits | SAFE DIRECT | S |
| GSE-SEC-055 | `DATA_RULES` never consulted at wrap | SAFE DIRECT | S |
| GSE-SEC-058 | transport import-boundary misses openai-compat / internal-llm | CHANGE PROPOSAL (guardrails script is sealed) | S |
| GSE-SEC-062 | `eval:prompts` fetches `promptfoo@latest` | CHANGE PROPOSAL (`package.json` pin) | S |
| GSE-SEC-065 | vercel.json vs next.config header drift | SAFE DIRECT | S |
| GSE-SEC-066 | `ACAO: *` on OpenAPI doc only | SAFE DIRECT | S |
| GSE-SEC-069 | `/api/auth/[...nextauth]` unthrottled | SAFE DIRECT / WAF | S |
| GSE-SEC-070 | IP limiters trust first XFF hop | SAFE DIRECT | S |
| GSE-SEC-073 | no product-level 21+ gate; ledger over-claims | SAFE DIRECT (footer/copy); ledger flip may be docs-sealed | S |
| GSE-SEC-074 | cron/cockpit catch echoes `Error.message` | SAFE DIRECT | S |
| GSE-SEC-075 | two remaining explicit `any`s | SAFE DIRECT | S |

### Info (document, do not "fix" unless product intent changes)

| ID | Title | Lane | Effort |
|---|---|---|---|
| GSE-SEC-012 | `/embed` `frame-ancestors *` (DEC-017) | none — intentional | — |
| GSE-SEC-013 | middleware excludes `/api/**` (by design) | none — keep route self-auth checklist | — |
| GSE-SEC-014 | auth cookie flags not re-asserted | hypothesis — confirm Set-Cookie in prod-like env | S (manual) |

---

## Suggested PR sequence (still planning — do not open these here)

1. **Paywall HTML** — 025 then 026, 027.
2. **Cron auth** — 016 (unlocks honesty of 074).
3. **Pick identity** — 043 then 044, 045, 046, 047, 048.
4. **Odds spend** — 039 then 040, 041, 028.
5. **Clearance** — 049, 050, 051 then 052, 054; 053 last (largest).
6. **Billing session** — 021, 022, 017, 018, 023, 024.
7. **Abuse / SSRF / schema-on-the-wire** — 067, 068, 031, 035, 036, 037, 064, 069, 070.
8. **LLM** — 057, 071, 056 (056 may become CP if it enters the sealed plane).
9. **RG / promo** — 072, 073.
10. **package.json CP batch** — 061 pin, `next` pin, later 059/003/060 major, 062 promptfoo.
11. **Schema CP** — 032 waitlist/contest models.
12. **Owner decisions** — 008 / 009 / 010. Sealed-guard work 030 / 058 only after unsealing.

---

## Out of scope for any unattended sprint

- Implementing any row above.
- Editing `apps/web/lib/ai-control-plane/**`, `packages/db/prisma/**`, `scripts/guardrails/**`, `.github/**`, `docs/**`.
- `npm install <name>` or `package.json` edits without a human-accepted change proposal.
- git push / force / no-verify / reset --hard.

## Histogram recap (from the register)

Critical 2 · High 12 · Medium 34 · Low 24 · Info 3 · Total 75.
All 2 Critical and all 12 High IDs appear in the coverage table and again in Now or Next (005 also in Later as historical).
