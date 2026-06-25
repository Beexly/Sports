# Fantasy Revenue Launch — Execution Summary & Owner Handoff

Branch: `claude/sweet-fermi-sk9gws` · Status: **all code-implementable work complete, fully
gated green.** Final verification: **413 test files / 5,733 tests pass**, **production build
193/193 pages (exit 0)**, typecheck 0, lint clean, trust-gate · draft-only · model-freeze all OK.

This is the activation of the fantasy product as the revenue bridge into NFL kickoff (Sept 9),
plus the cost-runway protection and the first slice of the "king of stats" data moat. The audit
correction that shaped everything: **fantasy was ~80% built, not greenfield** — so this was
activation, integrity-wiring, monetization, and launch, not invention.

---

## What shipped (16 commits this session)

### Revenue loop — sell → gate → use (live now, soft-launch ready)
- **Best Ball engine + tool** (`lib/fantasy/bestball.ts`, `/fantasy/bestball`): roster ceiling,
  spike-week, QB↔catcher stack correlation, bye fragility, next-pick recommender — the most
  shippable real-data paid tool (needs only ceiling/floor/correlation, all in the live pool).
- **$49/yr Fantasy tier**, end-to-end: `SubscriptionTier += FANTASY` (type + Prisma enum +
  additive migration), entitlements ladder **FREE → FANTASY → PRO → ELITE** (fantasy unlocks the
  suite; betting depth + alerts stay Pro/Elite), `fantasy` price in **all four** pricing phases,
  Stripe price wiring + webhook tier-map + checkout, `requireFantasyApi()`, pricing card + comparison.
- **Depth-limited free trial, enforced SERVER-SIDE** (`lib/fantasy/free-trial.ts`): a FREE viewer
  receives only the trial subset of the live pool (top-N per position) — the paid rows are never
  serialized to the client. A real, useful trial + upsell, **not** a hard lock (no takeaway from
  previously-free tools). Props fail closed.

### Projections to a cleared state
- **Sleeper** registered in the clearance registry (enrichment-only, attribution required,
  `model_training:false`, never the sole basis of a paid feature).
- **Projections badge** shows freshness + source attribution when live ("refreshed Xh ago · nflverse").
- **Weekly-projection model v1** (`lib/projections/weekly-model.ts`): GSE's own forward weekly
  point projection, composed only from cleared building blocks (xFP anchor + process grade +
  opponent-adjusted EPA + game environment), availability widens the band only. Ships **GATED**
  (`canPublishProjections:false`) — flipping it on is a backtest gate, not a code change.

### Customer-facing launch
- `/launch` page (honest "real vs preview" disclosure, founding-offer CTA), fantasy OG share card,
  and `docs/strategy/fantasy-launch/{LAUNCH_PLAN,ORGANIC_PLAYBOOK,DISCLOSURE_COPY}.md`.

### Cost runway (Phase 0 — protect against launch traffic)
- **Deploy-gating** (`scripts/vercel-skip-build.mjs`): build only trunk/active branch or
  build-relevant paths — kills the ~20-builds-in-3hrs preview churn + per-preview Neon wakes.
  Env-driven trunk + merge-commit force-build.
- **SourceSnapshot hash-only** in prod (keeps hash + bytes + metadata forever, drops the raw
  multi-KB payload that was bloating Neon) + `scripts/db/prune-usage.mjs`.
- **Fail-safe CDN cache policy** scaffold (defaults no-store; live route wiring deferred to human
  review — cross-user cache-leak risk).

### Data Dominance — the moat (slice 1)
- **Opponent-adjusted EPA/play** ("our DVOA", `lib/metrics/opponent-adjusted-epa.ts`): a
  transparent, reproducible equivalent of the paywalled efficiency ratings, computed from cleared
  nflverse play-by-play, carrying the stat-commandment provenance envelope. Surfaced behind a
  **clearance-gated coverage map** ("stats we have that they don't") — a metric only counts as
  live coverage if its source clears `checkClearance()`.

### Review → polish (two-agent adversarial pass over the 50+ file diff)
- Math independently verified correct (EPA solver + weekly-model bounds).
- **Closed a real CLAUDE.md rule-3 violation**: the fantasy paywall was client-side only and
  `/optimizer` skipped it — now enforced server-side, props fail closed.
- Deploy-gate, cache-policy, coverage-map fail-closed test, and a false pricing-table cap all fixed.

---

## Owner handoff — cannot be completed by code (do these to go fully live)

**[OWNER] — billing & launch toggles**
- [ ] Create the live Stripe prices: `STRIPE_FANTASY_MONTHLY_PRICE_ID`,
      `STRIPE_FANTASY_ANNUAL_PRICE_ID` (test → live). Until then, Fantasy checkout returns 503 by
      design; the enum migration runs on deploy.
- [ ] Set analytics env (`NEXT_PUBLIC_ANALYTICS_ENABLED` + Cloudflare/Clarity tokens) to turn the
      launch measurement on.
- [ ] (Optional) Rotate the Anthropic key; EIN + affiliate-operator approval to flip the (already
      built) affiliate rail.

**[OWNER] — flip the real data on**
- [ ] Set **`PROJECTIONS_PROVIDER`** to put the draft/best-ball tools on the live nflverse graded
      pool (the only flag that flips live data; DB-independent HTTP fetch). Confirm the graded
      provider returns `status:"live", count>0`. The tools render honest illustrative-preview until then.
- [ ] (Optional) Set `ACTIVE_TRUNK` in Vercel to the active dev branch if you want it always-built
      (otherwise only `main` is permanent-trunk; code-touching commits on any branch still build).

**[INFRA]**
- [ ] Provision the Oracle Always-Free VPS (Redis + `workers/data-refresh`); cut Vercel cron over to
      it (runbook: `docker/oracle-vps/README.md`).
- [ ] Provision Cloudflare R2 for the data lake (persist-what-we-fetch → Parquet; keeps the corpus
      out of Neon as the data moat grows).

**[DATA] — unlock the full in-season suite (Phase 3, the kickoff headline)**
- [ ] Run the weekly-model backtest (MAE/Brier via `lib/calibration/compute.ts`) + a `model-freeze`
      calibration proposal, **then** flip `canPublishProjections:true`. This is the gate that turns
      start/sit, waivers, and trade into honest paid tools and earns the headline: "the only fantasy
      projection that publishes its own calibration."

---

## Honest status line
The **revenue loop is wired and verified** (a customer can be sold the Fantasy tier, gated, and use
the tools). It goes **truly live** the moment the owner creates the Stripe prices and flips
`PROJECTIONS_PROVIDER`. The full in-season suite waits on one **[DATA]** gate (the backtest), exactly
as doctrine requires — we do not publish a projection we haven't scored.
