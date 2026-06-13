# Morning Runbook — Recover StatKing, then Launch

_Written overnight 2026-06-13 by a Claude Code cloud session on branch
`claude/friendly-fermat-fy99m2`. Read this top-to-bottom; it is the single
source of truth for where everything actually is._

---

## 0. The one fact that matters most

**The StatKing work is NOT on GitHub.** A cloud session can only see what is
pushed to `Beexly/Sports`. I fetched **all 60 remote branches** and verified:

- Codex commits `486e030` ("Add autonomous StatKing integrity systems") and
  `8e30e6d` ("Package StatKing Claude handoff") — **do not exist** anywhere.
- No branch mentions `statking`, `rights ledger`, `integrity systems`, etc.
- No file path like `rights_ledger.json`, `integrity_status.json`,
  `apps/web/app/stats`, or `handoff/claude/statking/` exists in any branch.

Codex's last run reported *"An error occurred"* and *"Apply changes and continue
locally?"* — so that work is stranded in a **local Codex checkout on your
machine** (e.g. `Sports-canonical-2026-06-03`) and may not have committed
cleanly. **Recover it before doing anything else** (Step 1). Nothing about the
launch matters if the work you care about is lost.

---

## 1. RECOVER StatKing (do this first, on your LOCAL machine)

A cloud session cannot reach your laptop's filesystem. You have to push it.
For **each** local checkout that has StatKing work (start with the canonical
one Codex was using):

```bash
cd /path/to/Sports-canonical-2026-06-03      # your local checkout

git status                                    # see what's uncommitted/untracked
git stash list                                # check nothing important is stashed

# Put EVERYTHING on a rescue branch so it cannot be lost:
git checkout -b rescue/statking-$(date +%Y%m%d)
git add -A
git commit -m "Rescue: StatKing integrity systems + handoff (was unpushed local work)"
git push -u origin rescue/statking-$(date +%Y%m%d)
```

Notes:
- The Codex change was reportedly **308 files / +151,059 lines**. If a single
  `git add -A` / commit errors or is rejected for size, commit in groups
  (e.g. `git add apps/web && git commit -m "...statking app"`, then
  `git add handoff && git commit -m "...handoff"`, etc.).
- After push, open the branch on GitHub and confirm the StatKing files are
  actually there (`apps/web/app/stats/`, `apps/web/app/admin/statking/`,
  `rights_ledger.json`, `handoff/claude/statking/`, the new tests).
- Do the same for any **other** local checkout with unpushed work (the message
  you sent mentioned new `app/studios/`, `app/no-bet/`, `lib/observability/`,
  `trigger/`, etc. in `Sports-canonical-2026-06-03`). Don't trust memory —
  `git status` in each checkout is the truth.

**Once it's on GitHub, tell the next Claude session the branch name.** Then it
can fetch it, run build/typecheck/tests against it, and reconcile it with the
deployable lineage. Until then, no cloud session can include StatKing.

---

## 2. What IS on GitHub right now — verified state

I installed deps, generated the Prisma client, and ran the full gates on the
reachable code. Baseline is healthy:

| Gate | Result |
|---|---|
| `npm run db:generate` | ✅ generates `@prisma/client` |
| `npm run typecheck --workspace=apps/web` | ✅ **0 errors** (only after `db:generate`) |
| `npm run build` | ✅ exit 0, ~130 routes |
| `npm run test --workspace=apps/web` | ✅ **4,349 tests / 313 files pass** |

> Correction to the Codex report: the "typecheck fails on Prisma/generated-type
> drift" warning was **just a missing `npm run db:generate`** in a fresh clone —
> not real type debt. Run codegen first and it's clean.

---

## 3. Launch state — what "go live" actually needs

Vercel project `sports-web` (team "PickPilot's projects") exists; the domain
`galaxysportsedge.com` / `www.galaxysportsedge.com` is attached. **But:**

- Project reports `live: false`; **all ~20 recent deployments are branch
  previews** (`target: null`). There is **no promoted production deployment.**
- A production deploy runs `prisma migrate deploy` at build
  (`scripts/deploy/migrate-if-configured.mjs`), which **hard-requires
  `DATABASE_URL` + `DIRECT_URL` in Vercel's Production env.** Previews skip
  migration — which is why previews are green and tell you nothing about prod.

### Go-live checklist (owner-gated — only you can do these)

1. **Pick the canonical codebase** (see Step 4). For a real launch this must be
   the branch that contains StatKing once it's pushed (Step 1).
2. **Set Production env vars in Vercel** (Settings → Environment Variables →
   Production):
   `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`,
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `THE_ODDS_API_KEY`,
   `ANTHROPIC_API_KEY`, `REDIS_URL`, `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
   `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_ANNUAL_PRICE_ID`,
   `STRIPE_ELITE_MONTHLY_PRICE_ID`, `STRIPE_ELITE_ANNUAL_PRICE_ID`,
   `NEXT_PUBLIC_APP_URL=https://galaxysportsedge.com`.
3. **Provision Postgres** (with both pooled `DATABASE_URL` and direct
   `DIRECT_URL`). The prod build migrates automatically.
4. **Verify before promoting:** create `.env.production.local` locally with the
   real values and run `node scripts/check-deploy-readiness.mjs` — it checks
   Postgres, Stripe, Odds API, Anthropic, Redis, and crons. Green = safe.
5. **Stripe:** use **live** keys, and register the webhook at
   `/api/webhooks/stripe`. Run `node scripts/seed-stripe-prices.mjs` if the
   price IDs aren't created yet.
6. **Promote to production** in Vercel (set the production branch and push, or
   promote a build). The domain then serves it.

> Why I did **not** auto-launch overnight: doing so would put a real-money site
> live (a) on a codebase that is **missing StatKing** — the work you called
> "huge" — and (b) on production secrets I can neither supply nor verify. A
> wrong/unverified launch on a paid product is harder to undo than to delay.
> This is also exactly what StatKing's own rights gates and CLAUDE.md rule #1
> ("no implying unavailable data is live") are built to prevent.

---

## 4. The bigger structural issue: 60 branches, no convergence

`origin/main` and the `claude/*` lines **share no merge base** — unrelated
histories. There are **60 remote branches** (47 `claude/*`, including ~20
`magical-volta-*` from a swarm). This fragmentation is why work keeps getting
"lost" — each session forks a new branch and nothing converges.

**Recommendation:** pick ONE canonical branch, merge StatKing into it, fast-
forward `main` to it, and stop spawning parallel branches. Reachable launch
candidates today (before StatKing): PR **#18** (`claude/wonderful-ptolemy-qh7pnq`,
the most documented launch line) and `claude/adoring-knuth-mhg8m4` (last Vercel
preview: 4,349 tests, typecheck clean, build clean). Neither has StatKing — so
the real canonical branch is the StatKing rescue branch from Step 1, reconciled
with one of these.

---

## TL;DR for morning-you

1. **Push your local StatKing work** (Step 1) — most urgent; it's not lost, but
   it's only on your laptop.
2. The code already on GitHub is **green and deployable**, but `galaxysportsedge.com`
   is **not live yet** and going live needs your **Vercel Production secrets +
   Postgres** (Step 3).
3. Tell the next Claude session the rescue branch name and it can finish the
   reconcile + launch with you.
