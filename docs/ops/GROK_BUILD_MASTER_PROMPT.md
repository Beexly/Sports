# GROK_BUILD_MASTER_PROMPT — autonomous coding agent (SoT)

**Repo:** Beexly/Sports  
**Product:** Galaxy Sports Edge — honesty not volume · Refusal-Native Forecasting  
**Law (non-negotiable):** LIVE_BOARD off · refuse-default · no fake ROI · oddsApiRequired=false · measurement > narrative · Pedersen ≠ ZK/PQ · no sportsbook CPA/affiliate path · no superiority claim without competitive study

You are the coding agent. Make decisions. Ship green PRs. Do not ask the founder for implementation choices already covered below.

---

## 0. Session open (mandatory)

```bash
# 1) Baseline health
npm run typecheck && npm run lint
(cd apps/web && npx vitest run) || true
node scripts/guardrails/trust-gate.mjs
node scripts/guardrails/em-dash-scan.mjs 2>/dev/null || true

# 2) Anti-duplication BEFORE inventing
rg -n "cronAuthError|authorizeCronSecret|GammaCronRunner|@sports/quote-plane|@sports/util" apps packages --glob '*.ts'
rg -n "canPublishPicks|PUBLISH_LEDGER|LIVE_BOARD|SLATE_OPENING_REVEAL|CODE_READY" apps packages --glob '*.ts' | head -40

# 3) Lockfile rule — every new workspace MUST update package-lock.json
#    `npm ci` fails if package.json workspaces change without lock sync.
```

If a symbol already exists, **extend it** — never fork a second SoT.

---

## 1. Identity & serverless (locked)

| Surface | SoT |
|---------|-----|
| HTTP cron auth | `apps/web/lib/cron/authorize.ts` → `cronAuthError` (`timingSafeEqual`) |
| Pure / packet twin | `@sports/util` → `authorizeCronSecret` / `safeEqualSecret` |
| Free quote path | `@sports/quote-plane` + `GET/POST /api/cron/gamma` |
| Paid odds | `refresh-odds` remains enrichment only — **do not delete** |

**Never on Vercel serverless:** SPIRE Workload API, custom inbound mTLS, long Redis/NATS BLOCK, sticky agent sockets.

**SPIFFE / NATS / Kafka / Streams / Redpanda:** research closed. Only revisit when real multi-service nodes exist.

---

## 2. Shipped P0 (PR #249+)

| Artifact | Contract |
|----------|----------|
| `@sports/util` | timing-safe secrets + jittered backoff (P2034 only) |
| `@sports/quote-plane` | Gamma provider, TTL cache, ClosingArchive, GammaCronRunner |
| `/api/cron/gamma` | `cronAuthError` first; body always `oddsApiRequired: false` |
| `vercel.json` | ADD gamma `*/30`; keep all prior crons (incl. refresh-odds) |
| This file | agent law + priority stack |

Acceptance curls (Production, after deploy):

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://$HOST/api/cron/gamma          # 401
curl -s -H "Authorization: Bearer $CRON_SECRET" https://$HOST/api/cron/gamma  # 200
```

---

## 3. Priority stack (ordered)

```
P0  Keep #249 green: package-lock workspaces, typecheck, guardrails, Vercel
P0  Any new workspace → npm install → commit package-lock.json
P1  ClosingArchive durable store (multi-instance; process-local is honest single-isolate only)
P1  Board honest-empty (no invented zeros)
P1  Wire session Stripe tier on /values (not only ?tier=)
P2  Port packet packages still missing on MAIN: overlay · sse · context-plane · competitive · openapi
P2  BH-FDR / trials registry BEFORE Phase-3 feature expansion
P2  CREDITS_STACK (Neon/Upstash/Stripe/Vercel/Claude/Google) — ops + docs, not fake green
IDLE Founder: Phase C (5b) remeasure · LIVE_BOARD · #226 YES · public claim surfaces
```

---

## 4. Hard refuses

- Flip LIVE_BOARD / PUBLISH_LEDGER / SLATE_OPENING_REVEAL / canPublishPicks without founder YES
- Sportsbook affiliate / CPA growth hacks
- Public performance numbers without four-field + watermark
- Guarantee / risk-free / testimonial-as-proof language
- PQ-washing Pedersen as ZK
- Inventing optical OCR as production fire signal
- Mutating calibration certificate metrics (attach-only)
- `authHeader === \`Bearer ${secret}\`` (use timingSafeEqual / cronAuthError)
- Removing refresh-odds to “make room” for gamma

---

## 5. Engineering standards

1. **Measurement > narrative** — every ship has a test or curl proof  
2. **Refuse-default** — empty eligible set → 403/422, never fake zeros  
3. **One SoT** — HTTP auth, devig method, marketFairProb method-tag + modelVersion  
4. **Lockfile discipline** — workspaces in package-lock or CI dies on `npm ci`  
5. **Science closed** — Shin/Power/Goto/Brier core: do not re-litigate without modelVersion bump  
6. **Idempotent crons** — safe re-run; optional NX lock only after proven overlap  
7. **Package shape** — match `@sports/stats-api` / `@sports/phase-c` (main/types → `./src/index.ts`)

---

## 6. AI Council / compliance (continuous)

- packages/ai-council (when on MAIN): DESTROY CRITICAL/HIGH on claim/partner/rights/crypto surfaces  
- No marketing superiority (“more stats than anyone”) without study  
- License SPDX + export classification on data paths  
- Crypto plane separation: TLS hybrid ≠ ledger PQ

---

## 7. PR hygiene

```
feat|fix|docs(scope): imperative summary

- Law line in body: oddsApiRequired=false · LIVE_BOARD off
- Test plan checkboxes
- Founder residual callouts if any flag is near
```

Merge only when: typecheck · tests · guardrails · lockfile · Vercel green.

---

## 8. Founder-only residuals (agent IDLE)

| Item | Why agent stops |
|------|-----------------|
| Phase C (5b) remeasure | Needs paid Odds path + founder measurement |
| LIVE_BOARD on | Honesty gate |
| #226 HEOS / width | Explicit YES required |
| Public claim pages | Legal + watermark |
| Credential batch | Neon / Upstash / Stripe live / Vercel env |

---

## 9. One-line mission

**Own feed first, free Gamma always-on, Odds API optional enrichment, every public number refuse-default and checkable — never a tout feed.**
