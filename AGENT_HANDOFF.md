# AGENT HANDOFF — finish GSE to 100%

**Audience:** a local coding agent with account/browser/CLI access — Claude Code on
the owner's machine, Codex, or a co-work session. **Not** a human checklist (that's
`LAUNCH_LEDGER.md`). Your job is to execute everything the remote sandbox agent
*could not*, asking the owner for the absolute minimum (secrets + approvals only).

**Operating principle:** the owner wants minimal input. Do not ask a question you can
answer from the repo, the CLIs, or sensible defaults. Batch every unavoidable owner
question into ONE round (see Track D). Never push to `main`. Work on
`claude/blissful-hamilton-d7edx1` (or the deploy source per Track 0).

**Verification gate — run after every code change, all must be green:**
```bash
npm run typecheck && npm run lint && (cd apps/web && npx vitest run) && npm run build \
  && node scripts/guardrails/em-dash-scan.mjs && node scripts/guardrails/trust-gate.mjs
```
Current baseline on the branch: typecheck 0 · lint clean · **5,620** web tests · build 191 pages · scanners clean.

---

## Track 0 — Canonical deploy source (do FIRST; blocks everything)

All the world-class work lives on `Beexly/Sports@claude/blissful-hamilton-d7edx1`.
Prior audits ran against a *behind* local clone (`C:\Users\Garrett\Sports`). Before any
deploy wiring:

1. Confirm with the owner which repo/branch Vercel deploys from.
2. Merge `claude/blissful-hamilton-d7edx1` into that source (open a PR if the owner
   wants review; otherwise fast-forward).
3. Everything below assumes this branch's code is what ships.

---

## Track A — Deploy wiring (you can do ~all of this; owner supplies secrets only)

The sandbox agent cannot create accounts or hold credentials. You can, via the Vercel
CLI + provider CLIs. The owner only pastes keys when prompted. Full context + the
silent-launch env block is in `LAUNCH_LEDGER.md §B`. Canonical gate-var names are in
`packages/prediction-engine/src/platform-config.ts`; Stripe IDs in `apps/web/lib/stripe.ts`.

1. **Provision** (owner creates accounts; you wire): Postgres (Neon → `DATABASE_URL` pooled, `DIRECT_URL` direct), Redis (Upstash → `REDIS_URL`), Google OAuth (origin `https://<domain>`, redirect `…/api/auth/callback/google`), The Odds API (**paid tier — the existing key is likely expired; renew it**), Anthropic key.
2. **Secrets:** `openssl rand -base64 32` → `NEXTAUTH_SECRET`; `openssl rand -hex 32` → `CRON_SECRET`.
3. **Set env in Vercel** for Production + Preview + Development via `vercel env add` (use the §B block; all readiness gates OFF/safe, `FORCE_NO_BET_IF_STALE=true`).
4. **Migrate:** point `DATABASE_URL`/`DIRECT_URL` at the new DB and run `npm run db:migrate` (then `npm run db:generate`).
5. **Deploy + smoke:** `vercel --prod`; then verify homepage 200, nav links 200, `/api/health` ok, Google sign-in lands on `/dashboard`. Use the deployment build-log tools if the build fails and fix forward.

Silent launch = marketing surface only; no public picks/stats until Track C of the ledger.

---

## Track B — Stripe LIVE + affiliate (you do the wiring once owner provides keys/signups)

**Stripe** (`LAUNCH_LEDGER.md §E`): owner switches to Live + provides `sk_live_…`/`pk_live_…`.
Then you: `npm run stripe:seed` (Live) → capture the four per-interval price IDs →
`vercel env add` `STRIPE_PRO_MONTHLY_PRICE_ID` / `STRIPE_PRO_ANNUAL_PRICE_ID` /
`STRIPE_ELITE_MONTHLY_PRICE_ID` / `STRIPE_ELITE_ANNUAL_PRICE_ID` → create the live webhook
at `https://<domain>/api/webhooks/stripe` (subscription lifecycle events) → set
`STRIPE_WEBHOOK_SECRET` → run a live test checkout and confirm the tier upgrade.
Code already reads per-interval IDs with legacy fallback — no code change needed.

**Affiliate** (`AFFILIATE_GO_LIVE.md`): owner does EIN + program signup (unavoidable).
Then you: flip the chosen book in `apps/web/lib/cockpit/operator-registry.ts` from
`KNOWN_NOT_PARTNERED` → `APPROVED_PARTNER`, fill real `licensedStates` (no fabrication),
create the promo row (slug + affiliate URL + terms URL). `/promotions` already routes
through the `/go/[slug]` compliance gate. Run the verification gate after.

---

## Track C — Brand-Safety v2 (Codex build task; has a hard dependency)

Spec: `docs/brand-safety-rules-v2.md`. Existing enforcement: `scripts/guardrails/trust-gate.mjs`
(+ `apps/web/lib/trust-claims.ts`). **Already shipped by the sandbox agent: BS-004** ("AI picks"
ban, precise to `pick(s)`, with a lock-in test in `apps/web/__tests__/guardrails.test.ts`).

**Do NOT blind-build the rest.** Status of the remaining rules:

- **BS-010 … BS-014, BS-020, BS-050 … BS-053** are runtime invariants over the **Evidence
  Engine** (shadow-mode factors, `SourceSnapshot`/`PlayerSignal`/`RefereeSignal` tables,
  `activationState`). **That engine is not built** (it's Phases 2–3 of a separate plan).
  Guards over schema that doesn't exist are meaningless. **Build the Evidence Engine first,
  or scope these as a follow-on** — confirm with the owner which.
- **BS-023 ("sharp money"/"smart money") is NOT a safe phrase-ban.** These terms appear in
  **17+ legitimate places** — the glossary defining the concept, `app/vs/tout-services/page.tsx`
  teaching that vague sharp-money claims are *not* a factor trail, and
  `lib/jarvis/capability-registry.ts` where it's a real *sourced* market signal. A blanket
  regex would fail the build on correct copy. Implement BS-023 as a *context-aware* rule
  (only on published pick `reasoning`/marketing surfaces, not glossary/education) or leave it.
- **BS-002, BS-030 … BS-035** (performance/calibration gating) are **largely already enforced**
  by the readiness gates (`getReadinessGates`) + `public-performance-policy.ts`. Audit for gaps
  rather than rebuilding.
- **BS-040 … BS-043** (secrets/supply chain): verify `.gitignore` + a secret-scan pre-commit
  hook exist; add if missing.

Follow the doc's "Codex implementation notes": reuse the existing scan harness, add tests in
the same conventions, target ≥60 brand-safety cases total.

---

## Track D — The ONE batched owner question (ask all at once, then proceed)

These need an owner decision the repo can't settle. Put them in a single `AskUserQuestion`:

1. **Canonical deploy source** (Track 0) — which repo/branch does Vercel build?
2. **BS-021 vs. the Kelly tool:** BS-021 forbids surfacing `recommendStake`/`kellyStake`. The
   site ships a user-driven educational Kelly calculator (`components/tracker/staking-calculator.tsx`,
   "educational, not advice"). Intended distinction is "engine sizing its own picks" (banned) vs.
   "user's own inputs" (allowed) — **confirm the tool stays**, or pull it.
3. **BS-024 vs. the CLV tracker:** BS-024 gates *the platform's* CLV until 200 settled picks. The
   site ships a *personal* bet/CLV tracker (`components/tracker/bet-tracker.tsx`, the user's own
   bets). **Confirm the personal tracker is out of scope for BS-024**, or gate it.
4. **Evidence Engine** (Track C) — build it now to unlock BS-010+, or defer?

Default if the owner is unresponsive: keep both user tools (they take user input, not engine
output), deploy silent per Track A, defer the Evidence Engine. Do not delete user-facing tools
on your own reading of a backlog spec.

---

## Track E — Low priority (optional, after the above)

- **a11y long-tail:** the sandbox agent covered the high-traffic interactive surfaces
  (picks, tracker, fantasy draft/scheme/gm/dfs/academy, bias-mirror, mobile-nav, stats nav).
  A few minor components remain (`components/fantasy/optimizer-workspace.tsx`,
  `league-twin-galaxy.tsx`, `sleeper-connect.tsx`, `components/picks/evidence-audit-drawer.tsx`):
  add `aria-pressed` to color-only toggles and `aria-live` to recompute result regions, same
  pattern as the committed changes. Verify with the gate.
- **Higgsfield brand assets** (R4 plan queue): player/result-card plates, Academy film key art +
  lesson videos, reporter voice lines. Requires the Higgsfield MCP + spend approval (owner-gated).
  Every call must paste the brand-kit lock string + negatives + a GSE Light + a brand reference
  image; record each in `HIGGSFIELD_ASSET_REGISTRY.md`. Code already has graceful fallbacks, so
  this is pure enhancement, not a blocker.

---

## What's DONE — do not redo

7 R4 surface waves · full-site correctness audit + fixes (ingestion data-loss guards, settled-pick
freeze, calibration crash-safety, Stripe per-interval price fix + webhook hygiene, rate limits,
season-type case bug, prod seed guard) · affiliate compliance rail (`/go/[slug]`) · accessibility
pass · BS-004 brand-safety rule · `LAUNCH_LEDGER.md` (owner checklist) · this handoff. All green on
`claude/blissful-hamilton-d7edx1`.
