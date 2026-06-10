# 20 — Source Mesh Architecture: the Registry Model + Resilience Design

> **Status:** Design doc (research + architecture). Written 2026-06-10 against the deploy
> clone `C:/Users/Garrett/Sports`. **Nothing in this doc changes code, schema, env, or any
> live switch.** Every claim about current code is anchored to a file:line that was read
> today; everything not shipped is marked **PROPOSED**.
>
> **Founder decision (standing, not relitigated here):** **The Odds API stays the primary
> odds provider.** The mesh exists to demote the *single-provider RISK* — one 401/429/outage
> must not blank the product — not to replace the provider. The registry already encodes
> this: `provider-registry.ts:96-105` declares `the-odds-api` as PRIMARY at priority 0.
>
> **Compliance hard lines (inherited, binding):** only free or already-configured sources
> may be recommended; no login-wall scraping; no TOS/robots/rate-limit bypass
> (`docs/research/gse-source-risk-register.md:5-19`; deny-list rows SRC-038/SRC-039,
> `docs/research/gse-free-source-inventory.md:44-45`). Verdicts per source live in doc 22.

---

## 1. What problem the mesh solves (and what it does not)

**EXISTS — the single-provider reality.** The Odds API is the only provider with a real
client and live calls in this tree: `packages/data-ingestion/src/odds-api-client.ts:65-73`
(client requires `THE_ODDS_API_KEY`), base URL `packages/data-ingestion/src/config.ts:62`,
and the cron route 500s without the key
(`apps/web/app/api/cron/refresh-odds/route.ts:50-56`). `.env.example:41` documents only
`THE_ODDS_API_KEY`. The corpus said the same thing on 2026-06-04
(`docs/research/gse-current-data-state.md:23`).

**The risk, precisely:** when that one provider fails, the entire odds lane fails. Doc
`01-current-odds-api-failure-root-cause.md` documented the worst version of this — a
provider failure that was *masked* as cron success. That masking is now **FIXED** (see §3.1),
but the structural concentration remains: one key, one vendor, one quota.

**What the mesh is NOT:** a provider migration, a relitigation of the founder's provider
choice, or a license to wire unvetted sources. The mesh is (a) a *registry model* that
describes every source the platform touches in one vocabulary, and (b) a *resilience design*
that makes the odds lane survive a primary outage honestly — fallbacks attach **behind** the
primary, never in front of it.

---

## 2. The source REGISTRY model

### 2.1 What already exists (the seed)

**EXISTS.** `packages/data-ingestion/src/provider-registry.ts` is a typed, pure,
side-effect-free failover registry for the odds lane:

- `OddsProviderId = "the-odds-api" | "odds-api-io" | "api-sports"` (`provider-registry.ts:45`).
- Each `OddsProviderDescriptor` carries `id`, `label`, `role` (primary|fallback),
  `priority`, `envVar`, and a presence-only `isConfigured(env)` predicate that never reads
  a secret value (`provider-registry.ts:51-83`).
- Primary: `the-odds-api`, priority 0, env `THE_ODDS_API_KEY` (`provider-registry.ts:96-105`).
- Inert fallback stubs: `odds-api-io` (priority 10, env `ODDS_API_IO_KEY`,
  `provider-registry.ts:118-127`) and `api-sports` (priority 20, env `API_SPORTS_KEY`,
  `provider-registry.ts:135-144`). These match the founder-decided fallback stack.
- `resolveProviderOrder(env)` is pure and deterministic; unconfigured fallbacks are excluded
  entirely; **with only `THE_ODDS_API_KEY` set the resolved order is exactly the primary —
  zero behavior change** (`provider-registry.ts:184-210`).
- `fallbackStubStatus()` returns `PROVIDER_UNAVAILABLE` so an attempted-but-unbuilt fallback
  records a *truthful* job status instead of a fake success (`provider-registry.ts:156-173`).

**Crucial grounded fact: nothing consumes this registry yet.** The live path constructs
`OddsApiClient` directly (`packages/ingestion-pipeline/src/process-sport.ts:124`). The
registry is the designed attach point, not an active failover.

### 2.2 The generalized registry model (PROPOSED)

**PROPOSED.** Extend the same pattern from "odds providers" to "every source the platform
touches," as a typed `SourceDescriptor` registry (data, not clients — adapters stay separate,
exactly like the odds registry). Every source carries:

| Field | Vocabulary | Why |
|---|---|---|
| `id` / `label` | stable slug + operator label | one place to enumerate sources (pattern: `provider-registry.ts:150-154`) |
| `category` | one or more of the 8 Rating categories (doc `10-gse-rating-proprietary-architecture.md:105-114`) + ops categories (SCORES, SCHEDULE, HEALTH) | a source is justified by what it feeds |
| `access` | `keyed-api` \| `open-api` \| `bulk-release` \| `manual/operator` \| `internal` | mirrors the corpus access annotations (`gse-free-source-inventory.md:7-48`) |
| `cadence` | poll interval / release rhythm (e.g. cron 30-min loop; nflverse nightly releases) | freshness budget per source |
| `freshness contract` | max acceptable age + what happens when exceeded | the shipped pattern: 1-hour ingest threshold (`config.ts:59`), 2-hour readiness backstop (`apps/web/lib/health/checks.ts:16-69` per pipeline CSV row 11) |
| `confidence/trust` | the 6-rung signal-quality ladder (`docs/research/gse-nfl-signal-taxonomy.md:25-30`) + `trustLevel` as already used in shadow evidence (`process-sport.ts:84-99`) | one ladder, not per-source ad-hoc trust |
| `license posture` | the risk-register family + Allowed/Disallowed row (`gse-source-risk-register.md:5-15`) and the SRC risk grade (`gse-free-source-inventory.csv`) | compliance is a registry field, not tribal knowledge |
| `role` | **primary \| fallback \| shadow \| reference** | see §2.3 |
| `no_data_policy` | `WITHHOLD` \| `SHADOW_ONLY` (from the fallback map, `docs/research/gse-source-fallback-map.jsonl:1-27`) | what the product does when the source is dark |

### 2.3 The four roles (the load-bearing vocabulary)

- **primary** — the configured source of truth for a domain. Failure here triggers the truth
  contract (§3.1) and, when activated, failover (§5). Today only `the-odds-api` holds this
  role in code (`provider-registry.ts:96-105`).
- **fallback** — keyed and ordered *behind* a primary; excluded from the resolved order until
  its env var is present (`provider-registry.ts:188-189`). Today: the two inert stubs.
- **shadow** — ingested (or planned) for evidence only; recorded with `trustLevel: 0`,
  `weight: 0`, `BLOCKED_MISSING_SOURCE`, and explicitly "cannot affect confidence"
  (`process-sport.ts:73-99`). This is the shipped honesty pattern every new category enters
  through (doc 10, principle 3, `10-gse-rating-proprietary-architecture.md:71-74`).
- **reference** — read-only context that is never a line/odds substitute (e.g. a prediction
  market's implied probability, a consensus closing reference). The shipped instance:
  `ClosingLine.closingRef` defaults to `"consensus"` and is config-not-schema
  (`packages/data-ingestion/src/closing-line.ts:31-44`).

### 2.4 The registry, populated (EXISTS vs PROPOSED per row)

| Source | Category | Access | Cadence | Freshness/confidence | License posture | Role | Status |
|---|---|---|---|---|---|---|---|
| **The Odds API** | Market Structure; SCORES (settlement) | keyed API (`THE_ODDS_API_KEY`) | cron loop + 30-min worker (pipeline CSV rows 6-8) | 1h ingest gate (`config.ts:59`); 2h readiness backstop (CSV row 11); ladder rung 3 | Medium — plan/display terms must be re-verified (SRC-001, `gse-free-source-inventory.md:7`) | **primary** | **EXISTS — live** (`odds-api-client.ts:65-146`) |
| **odds-api.io** | Market Structure | keyed API (`ODDS_API_IO_KEY`) | n/a until adapter | free tier: 2 bookmakers, 100 req/hr ([pricing](https://odds-api.io/pricing)) | analytics use permitted, **no redistribution** ([terms](https://odds-api.io/terms)) | **fallback** | **EXISTS — inert stub** (`provider-registry.ts:118-127`); adapter PROPOSED |
| **API-Sports** | Market Structure (last resort); SCHEDULE/stats fallback | keyed API (`API_SPORTS_KEY`) | n/a until adapter | free: 100 req/day per API ([api-sports.io](https://api-sports.io/sports/nfl)); tiers search-corroborated only (verification debt, doc 22 §5) | Medium-high — terms unverified (SRC-033, `gse-free-source-inventory.md:39`) | **fallback** | **EXISTS — inert stub** (`provider-registry.ts:135-144`); adapter PROPOSED |
| **nflverse / nflreadr / nflfastR releases** | Production; Efficiency; SCHEDULE; officials | bulk GitHub releases, no key ([nflverse-data](https://github.com/nflverse/nflverse-data)) | nightly in-season ([changelog](https://nflreadr.nflverse.com/news/index.html)) | release-pinned snapshots; ladder rung 2 | CC-BY-4.0 (FTN participation slice CC-BY-SA, credit required) — SRC-002..006 (`gse-free-source-inventory.md:8-12`) | **primary (non-odds stats spine)** | **PROPOSED** — no adapter in this tree (`gse-current-data-state.md:19` gap list still true) |
| **NGS via nflverse mirror** (`load_nextgen_stats`) | Next Gen / Tracking | bulk mirror, no key ([reference](https://nflreadr.nflverse.com/reference/load_nextgen_stats.html)) | nightly, weekly player aggregates 2016+ | ladder rung 2 | mirror is the compliant path; direct NFL.com endpoints are NOT (SRC-017, `gse-free-source-inventory.md:23`) | **primary (NGS)** | **PROPOSED** |
| **api.weather.gov (NWS)** | Environment / Matchup | open API, **User-Agent required**, no key ([NWS docs](https://www.weather.gov/documentation/services-web-api)) | per-game forecast windows | undisclosed-but-generous limit; retry-after-5s on 429 | US-gov public domain — cleanest license in the mesh (SRC-021, `gse-free-source-inventory.md:27`) | **primary (weather)** | **PROPOSED** |
| **Open-Meteo** | Environment (historical backfill) | open API | backfill batch | n/a | **conditions** — commercial split needs review (SRC-022, `gse-free-source-inventory.md:28`) | fallback (weather) | **PROPOSED** |
| **Kalshi public market data** | Market-implied probability; CLV close reference | **no-auth** public endpoints, `GET /trade-api/v2/markets` declares `security: []` ([API ref](https://docs.kalshi.com/api-reference/market/get-markets)) | near-kickoff pulls (CLV window) | unauthenticated rate cap unpublished — poll ≤1 req/s ([rate limits](https://docs.kalshi.com/getting_started/rate_limits)) | exchange prices on event contracts, **not sportsbook lines** — reference only | **reference** | **PROPOSED** — zero Kalshi code in this clone (grep verified 2026-06-10); `closingRef` column is the attach point (`closing-line.ts:31-44`). Founder-decided stack item; cited in `docs/command-center/vision-2026/03-data-and-analytics-stack-2026.md:110-115,244` (note: that doc's "`kalshi-client.ts` exists, inert" claim does **not** hold in this clone) |
| **Sleeper / GDELT / Wikimedia pageviews** | Signal (attention proxies) | open APIs (SRC-025/027/030, `gse-free-source-inventory.md:31,33,36`) | low-frequency | ladder rung 5 — "attention is not truth" | Low / Low-medium | **shadow** | **PROPOSED** |
| **SiriusXM Ch 87 / beat / web aggregate** | Signal (qualitative) | per doc `12-siriusxm-ch87-source-catalog-and-ingestion.md` | n/a | ladder rung 4 (claim cards) | **founder/legal-gated**; live capture requires legal sign-off | **shadow** | **PROPOSED/gated** (doc 12) |
| **ESPN public pages/endpoints** | SCORES cross-check | unofficial, no SLA ([Zuplo guide](https://zuplo.com/learning-center/espn-hidden-api-guide)) | — | — | **deny-listed for automated extraction** (SRC-039, `gse-free-source-inventory.md:45`; `gse-source-risk-register.md:6`) | — | **NOT** in the mesh (doc 22 §3) |
| **Internal: control-plane telemetry** | AUTONOMOUS_SYSTEM_HEALTH | internal | continuous | `/api/ready` 503 backstop (CSV row 13) | internal | primary | **EXISTS** (FALLBACK-027, `gse-source-fallback-map.jsonl:27`) |

The 42-source catalogued universe (SRC-001..042 with license/risk/tier annotations,
`docs/research/gse-free-source-inventory.md:7-48` + `.csv`) is the registry's candidate
pool; the per-domain failover chains with WITHHOLD/SHADOW_ONLY policies
(`gse-source-fallback-map.jsonl:1-27`, 27 chains, P0-P3) are the registry's no-data column,
pre-written. Doc 21 maps these onto the 8 Rating categories; doc 22 carries the verdicts.

---

## 3. Resilience design — what is ALREADY SHIPPED (the spine the mesh ties into)

### 3.1 The fail-closed truth contract (EXISTS — the Wave-2 fix has landed)

The masked-success bug documented in `01-current-odds-api-failure-root-cause.md` is
**historical**. The shipped contract, end to end:

1. **Canonical status vocabulary.** `PROVIDER_JOB_STATUS` — LIVE / DEGRADED / STALE /
   PROVIDER_AUTH_FAILED / PROVIDER_QUOTA_EXHAUSTED / PROVIDER_RATE_LIMITED /
   PROVIDER_UNAVAILABLE / DB_UNAVAILABLE / NO_CURRENT_SNAPSHOT / DISABLED_BY_CONFIG /
   UNKNOWN (`packages/data-ingestion/src/provider-status.ts:28-43`), with the
   provider-failure subset enumerated at `provider-status.ts:50-55`.
2. **Pure classifier.** 429s are disambiguated quota-vs-throttle via `retry-after`,
   `x-ratelimit-*`, and The Odds API's `x-requests-remaining` header, defaulting
   conservatively to QUOTA_EXHAUSTED (`provider-status.ts:110-137`). *Per-provider caveat:*
   the `x-requests-remaining` branch is Odds-API-specific; fallback providers' header
   semantics must be verified when their adapters are built (doc 22 §5).
3. **Errors always carry the classification.** `OddsApiError.providerStatus` is always
   populated; raw network/timeout failures are classified by `providerStatusFromError()`
   (`odds-api-client.ts:20-57`).
4. **The pipeline never records false success.** `processSport`'s catch-all classifies the
   failure, writes `IngestionRun FAILED` with a `[CLASSIFIED] message`, and returns
   `{status:"failed", providerStatus}` (`process-sport.ts:477-504`).
5. **The cron tells the truth over HTTP.** The route keys off `result.status` and returns
   **200** (all ok) / **207** (partial) / **502** (all failed), with top-level `ok` and a
   `failureReason` carrying the first classified provider cause
   (`apps/web/app/api/cron/refresh-odds/route.ts:83-158`).
6. **Readiness backstop.** Newest SUCCESS `IngestionRun` older than 2h → `/api/ready` 503
   (pipeline CSV rows 11-13) — this was the one working backstop even before the fix.

### 3.2 Provenance + honesty primitives (EXISTS)

- **SourceSnapshot is already provider-agnostic.** Every pull records a sha256-hashed payload
  snapshot keyed by a free-string `provider` field (`process-sport.ts:130-144`;
  `packages/ingestion-pipeline/src/source-snapshot.ts`). A second provider writes its own
  rows with zero schema change.
- **Freshness gate before normalize.** Stale fetches are rejected at the 1-hour threshold
  (`process-sport.ts:150-152`; `config.ts:59`).
- **Shadow evidence cannot leak into confidence.** Eight blocked categories are recorded as
  `BLOCKED_MISSING_SOURCE` with `trustLevel: 0` and explicit "cannot affect confidence" copy
  (`process-sport.ts:73-99`).
- **Gate decisions are additive, fail-closed writes** (`process-sport.ts:440-454`).

### 3.3 Closing-line / CLV scaffold (EXISTS — additive, ops-gated)

`captureClosingLine()` is fail-closed, stub-safe, idempotent on
`[gameId, market, closingRef]`, requires `MIN_CLOSING_BOOKMAKER_COUNT = 3` distinct books or
flags `isStale`, and the reference id `closingRef` defaults to `"consensus"` — swapping the
reference (e.g. to a named sharp book or a Kalshi-derived close) is **config, not schema**
(`closing-line.ts:26-44`). Wired into worker settlement; the precise near-kickoff trigger and
the closing-reference selection are founder/ops-gated
(`15-clv-closing-line-defer-note.md:64-84`). Mesh significance: this is GSE's **only free
path to a closing-line archive** — historical multi-book odds are paid-only everywhere
([The Odds API historical](https://the-odds-api.com/historical-odds-data/)) — so the mesh
treats own-capture as a first-class source.

---

## 4. The Odds-API single-provider RISK demotion path

**The provider stays primary. The RISK gets demoted** — by giving the primary's failure
modes truthful detection (done), a designed failover seam (done, inert), and then real
fallbacks (gated). The ladder, with honest status per rung:

| Rung | What | Status | Grounding |
|---|---|---|---|
| **R0 — Detect honestly** | Classified provider failures; cron 200/207/502; never a masked success | **EXISTS — DONE** | §3.1; `provider-status.ts:28-43`; `refresh-odds/route.ts:83-158` |
| **R1 — Describe the failover** | Typed registry, primary + ordered env-gated fallbacks, truthful stub status | **EXISTS — DONE (inert by design)** | `provider-registry.ts:96-173,197-210` |
| **R2 — Build a fallback adapter** | Real fetch surface for `odds-api-io` (first) implementing getOdds/getScores parity; classify its errors onto the same vocabulary; verify its 429 headers | **PROPOSED** | gap list §4.1; [odds-api.io docs](https://docs.odds-api.io/examples/player-props) |
| **R3 — Shadow parity run** | Fallback polls in shadow (its own `SourceSnapshot.provider` rows), compared against primary for field parity (h2h/spreads/totals, bookmaker keys) — **zero effect on picks**, mirroring the shadow-first principle (`process-sport.ts:73-99`) | **PROPOSED** | §3.2; doc 10 principle 3 |
| **R4 — Founder-gated failover activation** | An orchestrator walks `resolveProviderOrder()` on primary failure, records per-provider `PROVIDER_JOB_STATUS`, and serves fallback data **labeled by provider** in `SourceSnapshot`. Activation = setting the fallback env var + flipping the orchestrator on — a founder action, never autonomous | **PROPOSED / founder-gated** | `provider-registry.ts:184-210`; feedback rule: build gated/inert, never flip live switches |

**Non-negotiables on this ladder:**
- A fallback **never outranks** the primary while the primary is healthy
  (`provider-registry.ts:59-62` — priority ordering is structural).
- A fallback outage is reported with the same truth contract as a primary outage (the
  vocabulary is shared by construction, `provider-registry.ts:156-173`).
- If **every** configured provider fails, the product **WITHHOLDS** rather than serving
  stale-as-fresh (FALLBACK-001 `no_data_policy: WITHHOLD`,
  `gse-source-fallback-map.jsonl:1`; readiness 503 backstop). The no-odds product surface is
  specified in doc 21 §4.

### 4.1 Exact gap list to activate a second odds source (PROPOSED work, in order)

1. **Adapter** for `odds-api-io` implementing the fetch surface (`getOdds`/`getScores` parity
   with `odds-api-client.ts:65-146`), throwing errors that carry `providerStatus`.
2. **Failover orchestrator** in the ingestion path that walks `resolveProviderOrder(env)`
   instead of constructing `OddsApiClient` directly (`process-sport.ts:124` is the seam), and
   records a per-provider classified status on each attempt.
3. **`.env.example` entries** for `ODDS_API_IO_KEY` / `API_SPORTS_KEY` — currently absent
   (verified: only `THE_ODDS_API_KEY` at `.env.example:41`; grep for the fallback keys
   returns nothing). The registry documents them as the enable switches
   (`provider-registry.ts:123,140`).
4. **429-header verification** for the fallback provider before trusting the
   quota-vs-throttle classifier as provider-generic (`provider-status.ts:110-137`).
5. **Normalization mapping** — bookmaker keys and market naming parity into
   `DataNormalizer` (`process-sport.ts:154-155`), validated during the R3 shadow run.
6. **License re-verification** for whichever fallback is keyed (doc 22 verdicts + §5).

---

## 5. Supersession + staleness notes (read these before trusting older docs)

1. **Doc 01 is a root-cause history, not current state.** The cron masking it describes is
   fixed at `refresh-odds/route.ts:83-158`; `process-sport.ts:477-504` no longer returns an
   unclassified failure.
2. **`current-live-data-pipeline-map.csv` rows 3 and 6** still describe the pre-fix masking
   ("MASKED SUCCESS… HTTP 200 even when all sports fail"). Read those two rows as historical;
   the rest of the map (snapshot/freshness/readiness/public surfaces) remains accurate.
3. **`docs/research/gse-current-data-state.md` predates Wave 2.** It self-reports capture on
   branch `safety/sports-wip-2026-06-04` (`gse-current-data-state.md:8`) and does not know
   about `provider-status.ts`, `provider-registry.ts`, or `closing-line.ts`. Its adapter-gap
   list (`:85-91`) is still true; its silence on the registry is not.
4. **Cosmetic citation drift:** the corpus cites The Odds API docs at `api.theoddsapi.com`
   (`gse-free-source-inventory.md:7`) while live code uses `https://api.the-odds-api.com/v4`
   (`config.ts:62`). Same provider; prefer the code URL.
5. **Data-mesh doc series state:** docs 00, 01, 10-15 + the pipeline CSV exist; **docs 02-09
   do not exist** in this tree and must not be cited.
6. **Two-clones caveat:** this doc describes the **deploy clone** (`C:/Users/Garrett/Sports`).
   Claims about the canonical clone (e.g. vision-2026's "`kalshi-client.ts` exists, inert",
   `03-data-and-analytics-stack-2026.md:244`) were checked here and **do not hold in this
   clone** — grep for Kalshi across `packages/`, `apps/`, `workers/` returns zero hits
   (2026-06-10).

---

## 6. Grounding ledger

| Claim | Anchor |
|---|---|
| Registry: ids, primary, stubs, env gating, resolve order, stub status | `packages/data-ingestion/src/provider-registry.ts:45,96-105,118-127,135-144,156-173,184-210` |
| Status vocabulary + 429 disambiguation + Odds-API-specific header | `packages/data-ingestion/src/provider-status.ts:28-43,50-55,110-137` |
| Errors carry classification | `packages/data-ingestion/src/odds-api-client.ts:20-57` |
| Client requires key; live fetch surface | `odds-api-client.ts:65-146`; `config.ts:62` |
| Pipeline fail-closed catch-all | `packages/ingestion-pipeline/src/process-sport.ts:477-504` |
| Cron 200/207/502 + failureReason | `apps/web/app/api/cron/refresh-odds/route.ts:50-56,83-158` |
| Shadow evidence cannot affect confidence | `process-sport.ts:73-99` |
| SourceSnapshot provider-agnostic, sha256, best-effort | `process-sport.ts:130-144` |
| Freshness gate 1h | `process-sport.ts:150-152`; `config.ts:59` |
| Direct client construction = orchestrator seam | `process-sport.ts:124` |
| CLV capture honesty guards + config-not-schema reference | `packages/data-ingestion/src/closing-line.ts:26-44`; `15-clv-closing-line-defer-note.md:64-92` |
| Only THE_ODDS_API_KEY in env example; fallback keys absent | `.env.example:41` + grep (no `ODDS_API_IO_KEY`/`API_SPORTS_KEY` matches) |
| 42-source inventory; risk register; 27 fallback chains; quality ladder | `docs/research/gse-free-source-inventory.md:7-48`; `gse-source-risk-register.md:5-19`; `gse-source-fallback-map.jsonl:1-27`; `gse-nfl-signal-taxonomy.md:25-34` |
| 8 Rating categories | `docs/command-center/data-mesh/10-gse-rating-proprietary-architecture.md:105-114` |
| Web-verified provider facts (odds-api.io, API-Sports, Kalshi, nflverse, NWS) | URLs inline in §2.4; verification debts in doc 22 §5 |
| Readiness 503 / health thresholds / public surfaces | `current-live-data-pipeline-map.csv` rows 11-13 (rows 3/6 superseded, §5.2) |
