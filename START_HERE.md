# START HERE — when you're back

> One page. Read only this. Everything else is reference. Do the steps in order;
> each is copy-paste. Status as of this writing: branch `claude/blissful-hamilton-d7edx1`
> is **green** (typecheck 0 · 5,642 tests · build 191 pages · scanners clean).

---

## ⚡ STEP 0 — Recover production (do this first; ~3 min)

Your live site is down because the DB password rotation invalidated the old credential and
every redeploy was dying on a build-time `prisma migrate deploy` that can't reach Neon from
Vercel's build network. **That's fixed in code now** (commit `4c67f04`): a transient
connectivity failure (Neon cold-start / P1001) no longer blocks the deploy — only a *real*
migration error does. And `next build` doesn't touch the DB (pages are `force-dynamic`), so
nothing else in the build needs the database.

Run, from your local checkout:
```powershell
cd C:\dev\sports
git pull origin claude/blissful-hamilton-d7edx1
vercel --prod --yes
```

**What you'll see (this is success, not failure):** the migrate step will print
`could not reach the DB after 4 attempts … Proceeding with the build WITHOUT blocking the deploy`,
then continue into `next build`, compile, and go **Ready**.

**Heads-up — what this deploy ships:** `vercel --prod` from this branch deploys the branch,
which includes the approved pivot (**picks become free; paid tiers = tools/depth/alerts**).
That's the direction you chose, so it's fine — just know the de-paywalled picks go live with
this deploy. *(If you would rather recover WITHOUT shipping the pivot yet, see "Alternative"
at the bottom.)*

---

## ✅ STEP 1 — Verify it's actually back (one command)

Once Vercel says **Ready**, run the full smoke test — it hits every public route + key APIs and
prints a green/red checklist:
```powershell
npm run smoke:prod
```
- All green → **you're back online.** Done.
- A few rows red but the site loads → tell me which routes; usually a single data path.
- Site loads but everything DB-backed errors → runtime DB var issue. The app now **auto-falls
  back** to the Neon-integration var (`POSTGRES_PRISMA_URL`) when `DATABASE_URL` is unset, so
  this should be self-healing — but if not, confirm `DATABASE_URL` (production) holds the pooled
  Neon string. (The pooled endpoint is healthy — proven to connect in ~80ms.)
- Build still red → paste me the last 20 log lines; it'll be a new, different error and I'll
  fix it. (Unlikely — the known blocker is gone, and `next build` needs no DB.)

---

## 📦 What's DONE (don't redo any of this)

- **The pivot**, fully built + tested on the branch: picks de-paywalled, "winners/profitable"
  copy stripped, honest **calibrated** confidence wired into the public path (validated:
  held-out ECE 0.198→0.044, MODEL_VERSION v5.1.0, audited proposal), confidence freed to all.
- **Calibration activation** (v5.1.0) — properly audited and frozen.
- **Deploy/build hardening** — Prisma client auto-generates on install, LF line endings,
  cross-platform tests, and the migrate-never-blocks-the-deploy fix.
- **Strategy, written down** — `docs/strategy/PATH_TO_PROVEN_EDGE.md` (CLV/EV is the target,
  not a 70% win rate), `REVENUE_NOW.md` (picks free, tools are the product, fantasy is the
  fastest money), `ENTITLEMENT_REMAP_SPEC.md`.
- **Security** — Neon password rotated; old credential dead.

## 📋 What's LEFT (minimal, in order — none are urgent)

1. **Fantasy power-split** — keep all fantasy tools free through summer; flip a Pro power-gate
   in **August** at peak draft demand (FREE = limited; PRO = unlimited + full suite; ELITE =
   alerts). Decision already made; it just needs building behind an off switch.
2. **Delete the orphan `sports-db` Neon project** — production runs on **`gse-postgres`**;
   `sports-db` is an empty leftover that caused the two-database confusion. Confirm, then delete.
3. **Owner-gated launch items** (only when you want to go fully public): Stripe LIVE keys,
   renew `THE_ODDS_API_KEY`, custom-domain env. All in `LAUNCH_LEDGER.md`.

## 🧠 Decisions already locked (so we don't relitigate)
- **Subscription-primary, affiliate-additive.** Picks are free/honest; pay for tools + proof.
- **Target = proven edge (CLV/EV), not a 70% win rate** (structurally impossible on efficient
  markets; CLV is the real, defensible metric). See `PATH_TO_PROVEN_EDGE.md`.
- **Honest-and-humble now:** the settled record is ~50.9%; we don't sell picks as a proven
  edge until the record clears 52.4% breakeven.

## 🌿 Reconciling your OTHER branch
This branch is mostly **strategy docs + the pivot + infra/deploy fixes** — low collision surface.
The deploy fixes (`package.json` postinstall, `scripts/deploy/migrate-if-configured.mjs`,
`.gitattributes`, `vercel.json` untouched) are infra and should merge clean. When your other
branch lands, merge order doesn't matter much; if anything conflicts it'll be in
`apps/web/lib/pricing` / entitlements (the pivot) — ping me and I'll do the merge.

## 🗂 Doc index
- **This file** = the only thing you need to act.
- Active reference: `docs/strategy/*.md`, `LAUNCH_LEDGER.md`, `AFFILIATE_GO_LIVE.md`.
- Superseded (ignore): `AGENT_HANDOFF.md`, `handoff/OVERNIGHT_SUMMARY_2026-06-22.md` — folded
  into this file.

---

## Alternative — recover WITHOUT shipping the pivot
If you want production back on the pre-pivot state and ship the pivot deliberately later, the
deploy fixes still need to reach whatever you deploy. Tell me "recover main without the pivot"
and I'll cherry-pick just the three infra commits (postinstall, migrate-resilience, gitattributes)
onto a clean `main`-based branch for you to deploy. One extra step, no pivot. Otherwise STEP 0
is the one-command path.
