# GSE — Integration & Launch Runbook
**2026-06-24 · The one work-order that consolidates the scattered branches into a single, verified, deployable `main` — then a running site.**

> **How to use this:** paste this entire file into **ONE** cloud coding session that has a working git + Node runtime on the `Sports` repo. Tell it: *"Execute this runbook. Work autonomously through each phase, STOP and report at every ⛔ gate, and never skip a guardrail."* When it reports back, paste that report into the reconciliation chat so the master continuity stays current.

---

## Verified situation (read first)
A read-only reconciliation on 2026-06-24 found the work is **scattered and not yet consolidated**:

- **Local repo** `C:\Users\Garrett\Sports` is sitting on `codex/galaxy-dynasty-studio-rescue-v2`; local `main` (728f9c8) differs from `origin/main` (a132d98).
- **Local worktree** `Sports-intelligence-core` is on `codex/intelligence-core`, but at an **older** tip (`c3542e27`) than the cloud work — its docs still said "backtest not run."
- **Cloud sessions** hold the newest work: `codex/intelligence-core @ 30f8c45` (+13,836; backtest + nflverse currency fixes + Tweedie/Newton fix) and `claude/sweet-fermi-sk9gws` (+3,279; fantasy-launch polish) — **the latter is not in the local repo at all.**
- **Nothing is merged to `main`. Nothing is deployed.**
- **Backtest result (keystone):** 2021–2025, 18,344 OOS player-weeks → model MAE **5.31** vs naive **4.91** → the engine **does not beat naive yet**. Projections must stay shadow.

---

## ⚠️ Doctrine — non-negotiable guardrails
1. **Integration branch only.** All merging happens on a new branch `integration/launch-2026-06-24`. **Never** force-push or rewrite `main`.
2. **Projections stay shadow.** Do **not** flip `canPublishProjections` / `priced=true`. Any projection surface stays labeled **"illustrative."** The backtest has not earned the flip.
3. **No secrets in code.** Live Stripe keys and any secret go in the **host (Vercel) env**, never the repo. Owner-only (see bottom).
4. **No fake data.** The Scraping Clearance Engine and rights envelopes stay intact; no evasion tooling.
5. **Green gate before deploy.** Build + typecheck + lint + tests + backtest must pass (or be explicitly accepted) before any production deploy.
6. **STOP at every ⛔.** Report and wait when a gate says so. Reversible, observable, ledgered.

---

## PHASE 0 — Discover (read-only) ⛔
Goal: produce the true branch map before touching anything.

```
git fetch --all --prune
git log --oneline -1 main
git log --oneline -1 origin/main
git log --oneline -1 codex/intelligence-core        2>&1
git log --oneline -1 origin/codex/intelligence-core  2>&1
git log --oneline -1 claude/sweet-fermi-sk9gws        2>&1
git log --oneline -1 origin/claude/sweet-fermi-sk9gws 2>&1
git branch -a --list "*intelligence-core*" "*sweet-fermi*" "main"
```

- Confirm both feature branches are reachable here. **If `claude/sweet-fermi-sk9gws` is not reachable**, it lives only in another session's remote — STOP and report; the owner will push it to a shared remote (or run this runbook from the session that holds it).
- Confirm `codex/intelligence-core` includes commit `30f8c45` (the backtest): `git merge-base --is-ancestor 30f8c45 codex/intelligence-core && echo HAS_BACKTEST`.

**⛔ Report:** the tip SHA + 1-line subject for `main`, `codex/intelligence-core`, `claude/sweet-fermi-sk9gws`; whether the backtest commit is present; and which remote each came from.

---

## PHASE 1 — Consolidate onto an integration branch ⛔
Base = the most complete deployable state. **Default base: `codex/intelligence-core`** (most advanced engine + the backtest). Adjust only if Phase 0 shows otherwise.

```
git switch -c integration/launch-2026-06-24 codex/intelligence-core
git merge --no-ff claude/sweet-fermi-sk9gws
```

- Before merging, assess divergence: `git merge-base codex/intelligence-core claude/sweet-fermi-sk9gws` and `git diff --stat <merge-base> claude/sweet-fermi-sk9gws`.
- **Conflict-resolution doctrine** (when files overlap — e.g. opponent-adjusted EPA, weekly model): prefer the version that is (a) server-side enforced, (b) truth-gated / honestly labeled, (c) the newest verified fix. Document every non-trivial resolution.
- If conflicts are large or semantically risky, **do not guess** — STOP and report the conflicting files with a recommendation.

**⛔ Report:** merge clean vs. conflicts; files touched; how each conflict was resolved; the resulting `git diff --stat main...integration/launch-2026-06-24`.

---

## PHASE 2 — The gate (verify it's real) ⛔
Run the full project gate on the integration branch. Stop on red.

```
npm ci
npm run db:generate
npm run typecheck
npm run lint
npm run test
# Backtest (keystone) — confirm it reproduces the documented result:
npx tsx scripts/backtest/player-projection-backtest.ts   # adjust to the real script path/runner
npm run build
```

- The backtest should reproduce **~MAE 5.31 vs naive 4.91 (does not beat naive)**. If it now *beats* naive, that is a major event — **do not auto-publish**; STOP and report so the calibration proposal can be authored with evidence.
- Capture exact pass/fail counts and the backtest numbers.

**⛔ Report:** typecheck/lint/test results (counts), the backtest MAE numbers, and build success. If red, report the first failures — do not proceed.

---

## PHASE 3 — Truth & safety check (brand integrity) ⛔
Confirm, by reading the code on the integration branch:

- `canPublishProjections` / projection `priced` flags are **false**; projection UI says **"illustrative."**
- No live secrets committed (`git grep -nE "sk_live|whsec_|STRIPE_SECRET" -- . ':(exclude).env.example'` returns nothing real).
- Clearance engine + source-rights registry intact; no evasion tooling added.
- Entitlements `PAST_DUE → FREE` grace path (`entitlements.ts`) intact; Fantasy $49 gating is **server-side**.

**⛔ Report:** a short ✅/❌ per item.

---

## PHASE 4 — Preview deploy (safe, non-production) ⛔
Deploy `integration/launch-2026-06-24` to a **Vercel preview** (not production). Use existing project config; set only non-secret/test env needed to boot. Checkout will return a clean **503** until live Stripe is configured — that is expected, not a failure.

**⛔ Report:** the preview URL + anything visibly broken. Owner reviews before production.

---

## PHASE 5 — Production (owner-gated) ⛔
**Only after the owner approves the preview.** Open a PR `integration/launch-2026-06-24 → main` (no force-push), merge, deploy production. Projections still **illustrative**. Report the production URL.

---

## OWNER-ONLY steps (you, not the agent — config, not code)
These are the switches the agent must never touch. Do them in the Vercel/host env:

1. Create the **live Stripe** Fantasy prices → set `STRIPE_FANTASY_MONTHLY_PRICE_ID` ($4.99/mo) + `STRIPE_FANTASY_ANNUAL_PRICE_ID` ($49/yr).
2. Set live `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, publishable key.
3. Register the Stripe webhook at `/api/webhooks/stripe` (without it, paid users stay gated as FREE).
4. Set `NEXT_PUBLIC_APP_URL` to the prod domain; confirm `PRICING_PHASE=FOUNDING`.
5. (Optional, real projections) only after a backtest that **beats** the baseline: author the calibration proposal, then flip the publish gate **with evidence**. Not now.

Until step 1, checkout returns a clean 503 by design. Do these and you are selling.

---

## Report back to the reconciliation chat
Paste back: the Phase 0 branch map, the Phase 1 merge/conflict summary, the Phase 2 gate results (incl. backtest numbers), the Phase 3 ✅/❌, and the Phase 4 preview URL. That keeps the master continuity current and lets the reconciliation chat fold results into `SESSION_CLOSEOUT.md` / `GSE_MASTER_DOSSIER.md`.

---
*Calm advantage. Measured signal. No borrowed certainty.*
