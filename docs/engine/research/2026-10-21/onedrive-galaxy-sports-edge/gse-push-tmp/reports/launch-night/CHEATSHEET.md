# Launch-Night Cheat Sheet — One Page

## 4 URLs to visit (after `npm run dev`)

| URL | Purpose |
|---|---|
| `/dashboard` | Customer dashboard — should show today's picks + sample-mode banner |
| `/cockpit` | Jarvis Launch Observatory — assessment + slate breakdown + today's picks list |
| `/cockpit/history` | Forensic pick ledger — filterable, CSV export, Source filter |
| `/picks` | Customer slate — sample-data banner when stub+demo active |

## 4 commands to run

```bash
# Wake-up: one command
npm run dev               # in one terminal
npm run morning:setup     # in another — seeds + regens snapshots

# Brand-safety smoke (under a minute)
npm run test:brand-safety

# Brand-safety + cockpit (under two minutes)
npm run test:fast

# Health probe against a deploy
APP_URL=https://staging.example.com npm run prod:probe
```

## 4 things to verify

1. Today's picks list renders rows on `/dashboard`, `/cockpit`, `/cockpit/history`.
2. `Verified Record` shows `Collecting…` when `PERFORMANCE_STATS_ENABLED=false`.
3. The Sample-mode banner appears whenever `DEMO_PICKS_ENABLED=true` AND stub mode is active.
4. `npm run test:fast` passes.

## 4 invariants to never break

1. **No fabricated stats on customer surfaces.** `evaluatePublicPerformancePolicy()` is the gate.
2. **No banned phrases on customer pages.** The trust-claims registry + CI scanner catch them.
3. **No auto-publish.** `ContentDraft.publishedAt` is set only by an explicit operator action.
4. **No `MODEL_VERSION` bump without an IMPLEMENTED `CalibrationProposal`.** The model-freeze guardrail enforces this.

## When something looks wrong

- `/cockpit` won't render → check `npm run dev` console for a stack trace.
- Picks list empty → run `npm run db:seed` (idempotent + dev-only).
- `Verified Record` shows a percentage but you don't expect it → `PERFORMANCE_STATS_ENABLED=true` somewhere; flip it off.
- Sample-mode banner won't go away → `DEMO_PICKS_ENABLED=true` somewhere; flip it off OR set a real `DATABASE_URL` so `isStubMode()` returns false.
- CI `brand-safety` job fails → grep for the offending phrase in customer page files; the trust-claim registry's BANNED list is the source of truth.

## When in doubt

Read `reports/launch-night/morning-handoff.md` then `docs/launch-runbook.md`. The full README index is at `reports/launch-night/README.md`.
