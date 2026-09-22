# START HERE — launch control

> **Ops SoT:** [`docs/ops/CANONICAL.md`](docs/ops/CANONICAL.md) · **Doc map:** [`docs/INDEX.md`](docs/INDEX.md) · Production `/cockpit`.
>
> **Status:** the site is LIVE at [galaxysportsedge.com](https://www.galaxysportsedge.com).
> `MODEL_VERSION` is frozen at **v5.2.7**. Calibration board: [`docs/ops/CALIBRATION_STATUS.md`](docs/ops/CALIBRATION_STATUS.md).
> Work queue: [`docs/ops/AGENT_LEDGER.md`](docs/ops/AGENT_LEDGER.md) + [`docs/ops/LAST_PLAN_2026-09-15.md`](docs/ops/LAST_PLAN_2026-09-15.md).

This page is launch control only. Everything else is in the doc map — do not invent parallel START/MASTER pages.

---

## Deploy (when you need to ship `main`)

```powershell
cd <your local clone>
git checkout main && git pull origin main
vercel --prod --yes
npm run smoke:prod
```

---

## Launch checklist — silent → fully public (owner-gated, in order)

**Infra & secrets (one-time, owner accounts):**
- [ ] Renew **`THE_ODDS_API_KEY`** (paid tier — free exhausts in a day).
- [ ] Stripe **LIVE**: live keys, `npm run stripe:seed`, paste the 4 price IDs, live webhook.
- [ ] Confirm prod env (`scripts/check-deploy-readiness.mjs`).
- [ ] `prisma migrate deploy` on next DB-reachable deploy (proof receipts + slate-commitment tables).
- [ ] Delete orphan **`sports-db`** Neon project (prod runs on **`gse-postgres`**).
- [ ] Rotate any secret that ever landed in chat/logs (see `docs/ops/FOUNDER_ONLY_CHECKLIST.md`).

**Gate-flip sequence (proof-gated; flip in this order):**
- [ ] **C1** `CANONICAL_HISTORY_ENABLED=true` → accumulate 1–7 days.
- [ ] **C2** `DERIVED_MODEL_HISTORY_ENABLED=true` (≥50 canonical games/sport).
- [ ] **C3** `PUBLIC_PICKS_ENABLED=true` + `FORCE_NO_BET_IF_STALE=true`.
- [ ] **C4** `PERFORMANCE_STATS_ENABLED=true` (≥100 settled canonical picks; rates match outcomes).
- [ ] **C5** `FEATURED_PICK_PROMOTION_ENABLED=true`.
- [ ] **C6** `CALIBRATION_ADJUSTMENTS_ENABLED=true` — only after held-out audit (`calibratedEce ≤ rawEce`) per [`CALIBRATION_PUBLISH_CHECKLIST.md`](docs/ops/CALIBRATION_PUBLISH_CHECKLIST.md).
- [ ] **C7/C8** `PUBLIC_BLOG_ENABLED`, then `CONFIDENCE_DISPLAY_MODE=precision`.

Full env block: `docs/ops/archive/root-museum/LAUNCH_LEDGER.md`. Validator: `check-deploy-readiness.mjs`.

---

## Decisions locked

- **Subscription-primary, affiliate-additive.** Picks free/honest; pay for tools + proof.
- **Target = proven edge (CLV/EV), not a bare 70% win rate.** See `docs/strategy/PATH_TO_PROVEN_EDGE.md`.
- **Honest-and-humble** on the public record; book-priced lane leads; Wilson interval beside 52.4% (D22).
- **Fantasy tools run on live data or they do not exist** (LAST_PLAN D3).
- **NFL props is THE product** once schema + ingest + board ship (LAST_PLAN D11).

---

## Agent quickstart

1. Read [`docs/INDEX.md`](docs/INDEX.md) → [`AGENTS.md`](AGENTS.md) laws/loop.
2. Claim a row in [`docs/ops/AGENT_LEDGER.md`](docs/ops/AGENT_LEDGER.md).
3. Calibration work starts at [`docs/ops/CALIBRATION_STATUS.md`](docs/ops/CALIBRATION_STATUS.md).
4. History dumps live in [`docs/ops/SESSION_LOG.md`](docs/ops/SESSION_LOG.md) and `handoff/` (museum).
