# Advanced Systems Spine — 2026-06-22

The architecture that turns GSE from feature-rich into a **governed proof platform**:
fewer uncontrolled parts, every number with a receipt, every source clearance-gated,
every claim gated, every agent leashed, every paid op justified. This doc is grounded
in the actual repo, not generic startup advice, and pairs with the live
[Integrity Ledger](../../apps/web/lib/platform/integrity-ledger.ts) (`/cockpit/integrity`).

> **Status model (used everywhere):** Built = code exists + typechecks · Wired =
> connected to the runtime path · Proven = verified by test/fixture/live probe/evidence ·
> Public-safe = legal/source-rights/claim/sample/owner gates hold. *Built ≠ done.*

---

## 1. Current state (honest)

- **Web:** Next.js **14** / React 18 on Vercel (current Next is 16.x — an upgrade is a
  *branch* strategy, not a main-branch move). Public pages still read Neon on many paths.
- **DB:** Postgres on Neon — system of record. Many DB-backed surfaces are REAL-CODE /
  UNKNOWN-DATA until proven against populated live data (`_logs/REALITY.md`).
- **Workers:** an Oracle Always-Free VPS stack is *defined* (`docker/oracle-vps/compose.yml`:
  worker-data-refresh / pick-generation / content-publishing + Redis) but **Vercel cron is
  still doing backend ingestion/settlement** — a cost and reliability liability.
- **Data:** **The Odds API** is the only paid dependency; free-first cleared sources
  (nflverse / ESPN public / Open-Meteo) cover scores/schedules/weather. Source rights are
  registry-gated (`clearance-engine.ts`), but clearance is not yet wired into *every* adapter.
- **Proof spine (this program):** CLV grading + coverage + settlement-health + segmented CLV
  + Wilson bounds + tamper-evident receipts (minted in `process-sport.ts`) + commit-reveal
  slate + anchor CLV — all **built + unit-proven**; receipt persistence needs `migrate deploy`.
- **Governance (this sprint):** Integrity Ledger, Cost Governor, source-payload policy,
  public-read-model cache policy, agent-run contract — built + unit-proven, policy-only.
- **Cost pressure is live** (Vercel CPU / Neon transfer signals). Treat cost as product infra.

---

## 2. Target architecture — every platform does what it's best at

Do **not** centralize on one vendor. Copy the *patterns*, not every platform.

| Layer | Platform | Responsibility |
|---|---|---|
| Public web / CDN / cache / OG / auth+checkout routes / light APIs | **Vercel** | the Next shell; Fluid Compute + runtime/CDN cache for read models |
| System of record (transactional truth) | **Neon Postgres** | users, subscriptions, picks, receipts, slate commitments, model versions, proof metadata |
| Workers / Redis / ingestion / settlement / internal LLM | **Oracle Always-Free VPS** | the durable job substrate (BullMQ), off the request path |
| Raw payloads / proof artifacts / backups | **Object storage (R2/S3) — planned** | hash-only metadata in PG; heavy raw bytes external |
| Historical analytics (odds ticks, CLV, calibration slices, experiments) | **ClickHouse / DuckDB — later** | column OLAP, *off* the request path |
| Live rooms / presence / queues at edge | **Cloudflare (Durable Objects / Queues / R2 / Hyperdrive) — later** | only when community + edge needs are real |

### What stays on Vercel
Public web, CDN cache (per `public-read-model-policy.ts`), OG/proof cards, auth + Stripe
checkout routes, lightweight read APIs. **Not** long-running ingestion/settlement.

### What moves to the Oracle VPS workers
Odds refresh, pick generation, settlement, CLV grading, slate freeze, content drafting,
internal LLM (Ollama/Groq) grunt work. Reduce Vercel cron to **health checks / manual triggers**.

### What stays in Neon
The transactional truth above. Keep it lean: hash-only source payloads, pruned old odds
rows, pruned stale ingestion logs.

### What moves to object storage
Raw provider payloads and generated proof artifacts — keep `hash, bytes, provider,
sourceKind, sport, externalId, fetchedAt, ingestionRunId, objectKey` in PG, bytes in R2/S3.

### When ClickHouse / DuckDB is justified
Only once odds ticks + CLV deltas + source-reliability + model experiments outgrow
Postgres-style querying. Start with **DuckDB/Parquet** locally (zero infra) for backtests;
ClickHouse only if the analytics lane becomes a product. **Never** on the request path.

### Cloudflare use cases (later, not now)
Durable Objects for live rooms/presence/chat; Queues for guaranteed edge job delivery;
R2 for cheap artifacts; Hyperdrive *only if* Workers need accelerated Neon access. Gate all
behind the community privacy/moderation review.

### Why no Kubernetes now
World-class is **fewer uncontrolled parts**. A VPS + managed Postgres + Vercel + object
storage covers this scale with far less operational surface. K8s is premature complexity.

---

## 3. Risk register (and the mitigations being built)

| Risk | Mitigation | State |
|---|---|---|
| Silent data corruption poisons calibration | settlement-health alarm, cross-source score reconciliation, data-confidence gate | probe built; alert sink unwired |
| Proof theater (pretty receipts, incomplete records) | hard public-claim state machine: no receipt→no claim, no lock line→no CLV, no sample→no headline | gates built (`public-clv-policy`); unify into a Public Claim Compiler |
| Branch entropy across agents | one trunk + one ledger + one decision log + merge doctrine | `BRANCH_RECONCILIATION.md` |
| Legal/data creep (a "harmless" source) | clearance engine wired into *every* ingestion entrypoint | partial — wire as runtime law |
| Cost death by "small" systems | Cost Governor (paid-op justification), hash-only payloads, worker cutover, payload pruning | governor built; wiring + pruning pending |
| Claim inflation after a good month | sample/coverage/calibration gates + banned-phrase scanner | enforced in code |
| Community liability | rooms staged behind privacy review + moderation + pilot | staged |
| AI identity confusion ("AI picks") | trust gate bans the phrasing; AI = analyst/narrator, data = source of truth | enforced |
| Weak proof hash | real SHA-256 wired into the proof primitives | done (`proof-hash.ts`) |

---

## 4. 30 / 60 / 90-day roadmap

**0–30 (truth + cost):** wire the Integrity Ledger into the operator routine; run
`migrate deploy` so receipts accrue; wire the slate-freeze cron (freeze-once, pre-kickoff);
wire a stale-unsettled/coverage alarm sink; adopt hash-only payloads + a pruning script;
cut over odds refresh + settlement to the VPS workers.

**30–60 (proof + caching):** unify the public claim gates into one Public Claim Compiler;
wire `public-read-model-policy` CDN headers per route (no-store the sensitive ones);
persist Kalshi as a hard CLV anchor; persist agent-run records into an operations console.

**60–90 (depth):** cherry-pick the OOS/champion-challenger promoter onto trunk (calibrated
model prob → real receipt `modelProb`); stand up the DuckDB analytics lane; pilot proof
cards (proof → share → signup); evaluate the Next 16 upgrade branch.

---

## 5. Acceptance gates (must stay true)

1. Integrity Ledger: nothing PUBLIC_SAFE without PROVEN or an explaining owner gate (tested).
2. Cache policy: admin/auth/checkout/webhooks/cron are no-store (tested).
3. Source payload: production default is not unlimited raw DB storage (tested).
4. Cost governor: paid operations blocked without a valid justification (tested).
5. Agent run contract: external actions impossible without an owner gate + draft/pending (tested).
6. Source clearance: unregistered/permission-required/unauthorized-intent/unapproved-tool all block.
7. Public claims: banned phrases fail; win-rate/CLV need sample + coverage gates.

*Every future feature passes this question: does it deepen trust, proof, clarity,
defensibility, or decision quality? If it merely looks cool, park it. If it adds legal/cost/
claim risk without proof, block it.*
