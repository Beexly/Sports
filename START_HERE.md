> **Ops SoT:** [`docs/ops/CANONICAL.md`](docs/ops/CANONICAL.md) · Production `/cockpit`. Root handoffs archived under `docs/ops/archive/`.

# START HERE — launch control

> One page. Everything else is reference. **Status: the site is LIVE** at
> galaxysportsedge.com (recovered after the DB rotation). The `research/proven-edge`
> engine work is **integrated into `main`, green, and dormant-safe** (typecheck 0 ·
> 5,840 web tests · 487 engine · 36 ingestion · build 192 pages · all scanners clean).
> Nothing below is urgent — it's the ordered path from "live & silent" to "fully public."

---

## Deploy (when you need to ship `main`)
```powershell
cd C:\dev\sports
git checkout main && git pull origin main
vercel --prod --yes        # migrate step won't block; next build needs no DB
npm run smoke:prod         # green/red checklist of every public route
```
The migrate-resilience fix and the Prisma-auto-generate fix are now **on `main`** (they
weren't before — `main` was missing them), so deploys are stable.

---

## 🚀 The launch checklist — live & silent → fully public (all owner-gated, in order)

You're in **silent launch**: marketing surfaces up, public picks/stats gated OFF (honest
"collecting" state). To go public, do these in order — each step is proof-gated.

**Infra & secrets (one-time, owner accounts):**
- [ ] Renew **`THE_ODDS_API_KEY`** (paid tier — free exhausts in a day). *Fixes the `/api/health` 503 + empty `/observatory`.*
- [ ] Stripe **LIVE**: swap to live keys, `npm run stripe:seed`, paste the 4 price IDs, set the live webhook.
- [ ] Confirm prod env complete (`scripts/check-deploy-readiness.mjs` is the checklist).
- [ ] **`prisma migrate deploy`** runs on the next DB-reachable deploy → activates the **proof receipts + slate-commitment** tables the engine work added.
- [ ] Delete the orphan **`sports-db`** Neon project (prod runs on **`gse-postgres`**).

**Gate-flip sequence (proof-gated; flip in this order):**
- [ ] **C1** `CANONICAL_HISTORY_ENABLED=true` → accumulate 1–7 days; confirm crons run + data ingests.
- [ ] **C2** `DERIVED_MODEL_HISTORY_ENABLED=true` (≥50 canonical games/sport).
- [ ] **C3** `PUBLIC_PICKS_ENABLED=true` + keep `FORCE_NO_BET_IF_STALE=true` (picks go public; stale auto-suppresses).
- [ ] **C4** `PERFORMANCE_STATS_ENABLED=true` (≥100 settled canonical picks; verify win rates match real outcomes).
- [ ] **C5** `FEATURED_PICK_PROMOTION_ENABLED=true` (grade thresholds calibrated).
- [ ] **C6** `CALIBRATION_ADJUSTMENTS_ENABLED=true` — **only** after the path-to-70 §7 audit (held-out `calibratedEce ≤ rawEce`). *Note: already validated once (0.198→0.044); re-confirm at the real sample.*
- [ ] **C7/C8** `PUBLIC_BLOG_ENABLED`, then `CONFIDENCE_DISPLAY_MODE=precision`.

`LAUNCH_LEDGER.md` has the full env block + details. `check-deploy-readiness.mjs` validates it.

---

## 🔌 The engine layer (integrated; activate deliberately)
The proof/governance engines (Public Claim Compiler, No-Bet Adversary, Proof Graph, Market
Memory, Signal Lineage, Cost Governor, + the performance-analytics suite) are **on `main`,
unit-tested, and dormant** — pure modules with zero live effect until wired. Their honest
state and the wiring roadmap live at **`/cockpit/integrity`** (the live ledger) and
`docs/architecture/ADVANCED_SYSTEMS_SPINE_2026-06-22.md`. Live wiring was **deliberately not
force-activated** — it changes pick/render behavior and several pieces depend on the
owner-gated `migrate`/VPS, so it's staged as the ledger's gated next-actions, to wire in
controlled passes (not rushed into a fresh-recovered prod). The 30/60/90 order is in the doc.

## 🧠 Decisions locked
- **Subscription-primary, affiliate-additive.** Picks free/honest; pay for tools + proof.
- **Target = proven edge (CLV/EV), not a 70% win rate.** See `docs/strategy/PATH_TO_PROVEN_EDGE.md`.
- **Honest-and-humble:** settled record ~50.9%; don't sell picks as a proven edge until CLV clears 52.4%.
- **Fantasy:** free through summer; flip the Pro power-split in August at peak draft demand.

## 🗂 Doc index
- **This file** = launch control.
- Reference: `LAUNCH_LEDGER.md`, `docs/strategy/*.md`, `docs/architecture/ADVANCED_SYSTEMS_SPINE_2026-06-22.md`, `AFFILIATE_GO_LIVE.md`.
- Live ops surface: `/cockpit/integrity` (the honest system-state ledger).
- Superseded (ignore): `AGENT_HANDOFF.md`, `handoff/OVERNIGHT_SUMMARY_2026-06-22.md`.


## Orbit unlock (process capital)

- [`docs/ops/ORBIT_UNLOCK.md`](docs/ops/ORBIT_UNLOCK.md) — founder click checklist (free settle, Stripe, credits)
- [`docs/ops/OPERATOR.md`](docs/ops/OPERATOR.md) — production actions agents cannot perform
- [`docs/ops/CREDITS.md`](docs/ops/CREDITS.md) — credit claim tracker
- [`docs/agent-skills/`](docs/agent-skills/) — agent SKILL packs
- `npm run agent:eval` — thin deterministic harness
- `npm run e2e:pricing-smoke` — public pricing + checkout route probe
- `npm run export:settled-picks` — JSONL settled picks (DATABASE_URL, read-only)

### Orbit leverage (2026-07-31 wave 3)
- Map: [`docs/ops/ORBIT_MAP.md`](docs/ops/ORBIT_MAP.md)
- Calibration: [`docs/ops/CALIBRATION_PIPELINE.md`](docs/ops/CALIBRATION_PIPELINE.md)
- Eval: `npm run agent:eval` · `npm run dspy:gse` · `npm run orbit:map`
- CIR: `centeredIsotonicCalibration` (R&D, not live)
