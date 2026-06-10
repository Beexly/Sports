# Launch-Day Monitoring And Rollback Checklist

Date: 2026-06-09

## Purpose

This checklist turns the first launch into a controlled operating event. It defines what to check, what counts as green, what counts as degraded-but-acceptable, what stops launch, and what to do in the first 72 hours.

It is docs-only and does not authorize deployment, staging, production DB mutation, paid APIs, live promotions, contests, or voice generation.

## Launch Philosophy

Ship narrow, watch carefully, fix only true blockers.

The first launch should prove:

1. core public pages load,
2. readiness checks tell the truth,
3. degraded states are honest,
4. no secrets or protected methodology leak,
5. users can understand what GSE is,
6. support has answers ready.

## Required Inputs

Before launch day, confirm:

- Deploy clone source of truth: `C:\Users\Garrett\Sports`.
- Branch: `safety/sports-wip-2026-06-04` or successor launch branch.
- P0 manifest: `docs/command-center/p0-staging-manifest.md`.
- Production-like DB and ingestion environment ready.
- `APP_URL` target known.
- Owner approves staging, commit, and deploy.
- Player Lab/current-roster claims are verified or removed from public launch.

## Pre-Launch Command Checklist

Run from repo root:

```powershell
git status --short
```

Expected:

- P0-only staged paths if staging has started.
- No broad `docs/research/**`, `reports/codex/**`, Voice OS docs, snapshots, world-model, or control-plane files staged for P0.

Run the production probe against the target:

```powershell
$env:APP_URL='<target-url>'; node scripts/prod-probe.mjs
```

Expected:

- `/api/live` 200.
- `/api/health` 200 or sanitized degraded only if non-blocking.
- `/api/ready` 200 before deploy go.
- `/api/ready?check=ingestion-freshness` 200 before deploy go.
- Public critical routes 200.
- Auth-gated routes redirect rather than expose private content.

If any probe fails, copy the first failing endpoint and status exactly into the launch log.

## Route Watchlist

| Surface | Required launch behavior | Stop launch if |
|---|---|---|
| `/` | Loads and explains GSE in 10 seconds. | Public crash, framework error card, or betting-advice copy. |
| `/board` | Loads, even if degraded/empty. | 500, misleading live-data state, or method leakage. |
| `/picks` | Loads gated/degraded honestly. | Implies current picks are live when readiness is not green. |
| `/pricing` | Tiers understandable. | Checkout/pricing mismatch or unsupported live billing claim. |
| `/methodology` | Explains trust without exposing protected method. | Reveals formulas, weights, internal identifiers. |
| `/performance` | Shows receipts/limitations. | Promises future outcomes from past performance. |
| `/promotions` | Informational only. | Live affiliate/promo claims without approval. |
| `/faq` | Answers sportsbook/betting-advice confusion. | Missing legal/trust basics. |
| `/contact` | Support path works. | User cannot reach support. |
| `/api/live` | 200 alive. | Non-200. |
| `/api/health` | Sanitized health response. | Secret/internal detail leak. |
| `/api/ready` | 200 before launch. | Non-200 on launch target. |

## Go / No-Go Matrix

### GO

All are true:

- P0 manifest staging is clean.
- Build/test/final cert is green.
- `/api/ready` is 200 on target.
- Ingestion freshness is 200 on target.
- Public routes return 200 or expected redirects.
- No method/secret leakage scan failure.
- Player Lab/current-roster public claims are verified or absent.
- Owner approves deploy.

### GO WITH WATCH

Acceptable only if clearly documented:

- Non-critical copy polish remains.
- Some public surfaces show honest degraded states.
- Promotions page is empty/informational.
- Voice OS/contests/affiliate systems are parked.
- Canonical platform is not yet ported.

### NO-GO

Stop if any are true:

- `/api/ready` is not 200 on target.
- Ingestion freshness is not 200 on target.
- Any core public route 500s.
- Public output exposes secret-shaped material.
- Public output exposes founder-only methodology.
- Current-roster/player data is claimed but not verified.
- Checkout/pricing path can charge incorrectly.
- Promotions imply gambling urgency or betting advice.
- Dirty staging includes excluded Launch 2 files.

## Rollback Triggers

Rollback or disable public access if:

1. core route crash persists after deploy,
2. payment/billing issue appears,
3. secret/methodology leak appears,
4. public claims are materially false,
5. data readiness turns red and public surfaces imply live accuracy,
6. login/auth exposes private/admin surfaces,
7. promotions or copy create legal/compliance risk.

## Rollback Language

### Public Status

GSE is temporarily paused while we verify a launch dependency. The product is built to show uncertainty honestly, and we are applying the same standard to the launch itself.

### Customer Reply

Thanks for flagging this. We are pausing or limiting the affected surface while we verify the issue. GSE should not pretend a dependency is healthy when it is not.

### Founder Update

Launch is paused for a real gate, not a polish item. Current blocker: `<exact blocker>`. Next proof command: `<command>`.

## First 15 Minutes After Deploy

1. Open home page.
2. Run production probe.
3. Check `/api/live`.
4. Check `/api/health`.
5. Check `/api/ready`.
6. Open board, picks, pricing, methodology, performance, promotions, FAQ, contact.
7. Confirm auth-gated surfaces redirect.
8. Check support/contact form.
9. Check browser console on the most important public pages if available.
10. Record status in the launch log.

## First 6 Hours

Every 30 to 60 minutes:

- Run or review health/readiness.
- Check public route errors.
- Check support inbox/contact messages.
- Check user confusion patterns.
- Check degraded data states.
- Avoid non-critical changes.

Only fix:

- public crash,
- misleading claim,
- broken support/contact,
- auth/paywall failure,
- readiness/data-state regression,
- secret/method leak.

## First 24 Hours

1. Collect support questions.
2. Update FAQ/support macros if users repeat confusion.
3. Record every issue with severity.
4. Do not start the canonical-platform port.
5. Do not activate promotions, contests, or Voice OS.
6. Do not change pricing unless there is a verified issue.

## First 72 Hours

1. Decide whether Launch 1 is stable.
2. Pick one product clarity improvement.
3. Pick one support improvement.
4. Pick one growth channel.
5. Start Launch 2 planning only after stability is proven.

## Launch Log Template

```text
Time:
Operator:
Target URL:
Git branch:
Commit:

Probe:
- /api/live:
- /api/health:
- /api/ready:
- ingestion freshness:
- first failing endpoint if any:

Routes checked:
- /:
- /board:
- /picks:
- /pricing:
- /methodology:
- /performance:
- /promotions:
- /faq:
- /contact:

Support:
- new issues:
- repeated confusion:
- billing/payment issues:

Decision:
- GO / GO WITH WATCH / NO-GO / ROLLBACK

Next action:
```

## Support Inbox Review

Classify every message as:

- crash/bug,
- data freshness,
- product confusion,
- pricing/billing,
- trust/methodology,
- sportsbook/betting-advice confusion,
- promotions/compliance,
- feature request,
- partnership/investor,
- abuse/spam.

Escalate immediately if:

- user reports a charge problem,
- user reports secret/private exposure,
- user interprets GSE as betting advice,
- user reports false current-player data,
- user reports admin/private route exposure.

## Monitoring Without A Full Team

Minimum founder loop:

1. probe,
2. route spot-check,
3. support inbox,
4. issue severity,
5. one fix or one decision.

Do not create a dozen dashboards before first launch. Use the smallest loop that catches the highest-risk failures.

## What To Park

Park until after first launch is stable:

- Voice OS production integration.
- EdgeBall/contest products.
- Affiliate/promotion activation.
- Canonical platform port.
- Full design overhaul.
- Advanced data-source expansion.
- Founder cockpit polish.
- Automated agent workflows that touch production.

## Final Launch-Day Rule

If the issue threatens trust, safety, legal/compliance, billing, readiness, or public stability, handle it now.

If it is polish, growth, aesthetics, or future platform power, park it for Launch 2.

