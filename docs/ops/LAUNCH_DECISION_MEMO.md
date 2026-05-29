# Launch Decision Memo

The owner-facing memo for the launch decision. Consolidates the green-state
evidence, blockers, owner gates, and rollback plan into one place so the
launch decision is auditable.

## Branch and HEAD

- Branch: `claude/determined-keller-dUcdG`
- HEAD: see latest `git log` (C92 / Pillar G complete; C93–C97 docs)
- Cycles included: C20 → C92 (+ C93–C97 audit/readiness docs)

## Recommended launch mode

- **internal-calibration** — for owner review of the C61–C92 work
- **preview** — for closed beta after Codex audit (C93) returns "safe to deploy preview"
- **public-demo** — only after canonical history accumulates per C62 plan
- **production** — only after live AI + payment readiness (C94 + C95) and Codex green

## Green-state evidence

| Metric | State |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx vitest run` | PASS — ~190 files, ~2730 tests (post-C92) |
| `node scripts/guardrails/trust-gate.mjs` | PASS — ~420 files scanned, 0 banned phrases |
| `npm run build` | PASS — production build clean |
| Voice-lint scanner | PASS — every canned coach response + fallback copy entry |
| Pricing-honesty scanner | PASS — no forbidden conversion phrases |
| Backtest harness (C61) | PASS — 7 tests deterministic |
| ROI math (C63) | PASS — 13 tests; ADR-008 owner-gated |
| Inferred-style detection (C76) | PASS — 15 tests; cookie-only, opt-in |
| Daily-brief composition (C91) | PASS — 8 tests; pure |
| Discipline cadence (C92) | PASS — 6 tests; pure |

## Blockers (must clear before next launch state)

### Owner-action blockers
- [ ] Confirm GitHub repo is `private`
- [ ] Approve Prisma ADRs 003–008 (DB schema migrations gated by owner)
- [ ] Set 14 environment variables for production deploy
- [ ] Switch `GALAXY_LAUNCH_MODE` / `GALAXY_RELEASE_STATE`
- [ ] Run preview-URL Lighthouse + axe per `docs/performance/DEPLOYED_PERFORMANCE_GATE.md` and `docs/accessibility/AXE_AUDIT_PROTOCOL.md`
- [ ] Run golden-path probe per `scripts/probes/golden-path-probe.mjs`
- [ ] Confirm `THE_ODDS_API_KEY` present in target env
- [ ] Complete LIVE_AI_READINESS_CHECKLIST (C94) before flipping `COACH_LIVE_AI_ENABLED`
- [ ] Complete PAYMENT_READINESS_CHECKLIST (C95) before flipping `STRIPE_CHECKOUT_ENABLED`

### Data-accumulation blockers (cannot CLI)
- [ ] Canonical history per `docs/ops/CANONICAL_HISTORY_ACCUMULATION.md` thresholds
- [ ] First publishable calibration bucket reached
- [ ] First public "We were wrong" entry post-launch (genuine retrospective)

## Rollback plan

If a SEV-1 trust incident or platform outage occurs post-launch:

1. **Flip kill switch.** See `FEATURE_FLAG_KILL_SWITCHES.md` for the surface-specific switch.
2. **Demote launch mode.** `GALAXY_LAUNCH_MODE=internal-calibration` drops capabilities atomically.
3. **Code rollback.** `git revert <sha>` + redeploy.
4. **Image rollback.** Pin to previous deployment artifact.
5. **DB rollback.** Restore from snapshot per `BACKUP_RESTORE_DRILLS.md`.
6. **Communicate.** Status page T1 → T5 per `STATUS_PAGE_TEMPLATES.md`.
7. **Trust recovery.** Direct user notification per `USER_TRUST_RECOVERY_PLAYBOOK.md`.

## Codex verdict slot

```
CODEX-VERDICT-DATE:   ____ / ____ / ______
SAFE-TO-MERGE:        [ ] YES   [ ] NO
SAFE-TO-PREVIEW:      [ ] YES   [ ] NO
SAFE-TO-PUBLIC-DEMO:  [ ] YES   [ ] NO
SAFE-TO-PAYMENTS:     [ ] YES   [ ] NO
SAFE-TO-LIVE-AI:      [ ] YES   [ ] NO
SAFE-TO-PUBLIC-PICKS: [ ] YES   [ ] NO

NOTES:
________________________________________________
________________________________________________
```

## Owner sign-off

```
SIGN-OFF-DATE:        ____ / ____ / ______
APPROVED-LAUNCH-MODE: _________________________
SIGNED:               _________________________
```

Until the owner sign-off block is filled, the launch mode does not change.
