# Codex Constitutional Audit Brief

The external audit prompt + checklist. Run by Codex (or an equivalent
external reviewer) after C92 lands.

## Goal

Independent verification that the C20–C92 cycles ship a Galaxy that:
1. Honors every constitutional guardrail (no autonomous external publish, no certainty language, no methodology leak, no payments/AI/picks without owner gates).
2. Holds the golden-path loop end-to-end (Today's Board → Decision Room → Evidence → Coach → Track → Autopsy → Command Center → Academy/NextBestSurface).
3. Surfaces the public record honestly (canonical ledger, methodology, accumulation status, calibration constellation, model autopsy, ADR archive).
4. Operates safely under each failure mode in `docs/ops/contingency/`.

## Inputs to provide to Codex

- This branch: `claude/determined-keller-dUcdG`, HEAD as of C92.
- Repo URL (private).
- `docs/ops/RELEASE_CANDIDATE_STATE.md`
- `docs/ops/contingency/RESILIENCE_RUNBOOK.md`
- `docs/ops/CANONICAL_HISTORY_ACCUMULATION.md`
- `docs/adr/` archive
- A preview URL (if available) for runtime probing.

## Checklist (Codex returns one verdict per row)

### Constitutional guardrails
- [ ] No autonomous external publishing path exists in any release state
- [ ] Trust-gate scanner runs on every push and is clean
- [ ] Voice-lint scanner is wired into the test suite
- [ ] `COACH_LIVE_AI_ENABLED` defaults to false in every release state (lib/release/release-state.ts)
- [ ] `STRIPE_CHECKOUT_ENABLED` defaults to false except production
- [ ] `PUBLIC_PICKS_ENABLED` defaults to false in development and internal-calibration
- [ ] `CANONICAL_LEDGER_ENABLED` default does not show fake/bootstrap rows
- [ ] No methodology fields exposed in public projections
- [ ] PROTECTED_KINDS filter active in graph projection
- [ ] FORBIDDEN_FIELD_KEYS active in telemetry privacy check

### Golden path runtime
- [ ] /today renders TrustStrip and links to /room/[gameId]
- [ ] /room/[gameId] renders verdict, evidence section, factor radial, press-R theater, related panel, coach, NextBestSurface, action grid
- [ ] /no-bet exists and is reachable from /today and /room
- [ ] /autopsy exists and is reachable from /command and /room
- [ ] /command renders Since-Last-Visit panel + 12 widgets
- [ ] /academy reachable from /command
- [ ] /api/telemetry validates events + surfaceId + forbidden fields, respects launch mode

### Public proof
- [ ] /ledger/canonical surface registered and behind feature flag
- [ ] /methodology contains 'What we publish vs. what we cannot publish yet' callout
- [ ] /methodology mounts the Calibration Constellation
- [ ] /performance surfaces accumulation status, not vague 'collecting'
- [ ] /manifesto exists and links to ledger + methodology
- [ ] /we-are-not exists and lists refusal patterns
- [ ] /we-were-wrong exists with at least three concrete entries
- [ ] /decisions auto-renders from docs/adr/

### Failure paths
- [ ] Bootstrap mode surfaces honest 'live odds unavailable' label everywhere
- [ ] Stripe outage scenario: existing entitlements survive, new checkouts disable
- [ ] Anthropic outage scenario: coach falls back to canned responses
- [ ] DB outage scenario: static pages remain, account features degrade gracefully
- [ ] All 12 contingency playbooks exist and are concrete (no Lorem/placeholder)
- [ ] Rollback ladder is testable (kill switch → mode demotion → code revert → image rollback → DB rollback → data rollback)

### Performance + accessibility (requires preview URL)
- [ ] Mobile LCP ≤ 2.5s on /, /today, /picks, /room/[gameId], /ledger/canonical
- [ ] CLS ≤ 0.1 on every T1 surface
- [ ] Axe critical/serious = 0 on every T1 surface
- [ ] Keyboard nav covers every interactive surface
- [ ] Focus-visible respected
- [ ] Reduced motion respected on all kinetic elements

### Voice + visual
- [ ] One signature moment per public surface (homepage, /orbit, /galaxy-demo, /methodology, /manifesto)
- [ ] Canned coach responses pass voice-lint
- [ ] Fallback copy passes voice-lint
- [ ] No casino/tout aesthetic on any public surface

## Verdicts Codex returns

1. **Safe to merge to main?** (Y/N + rationale)
2. **Safe to deploy to preview?** (Y/N + which env vars + which feature flags)
3. **Safe to launch as public-demo?** (Y/N + which surfaces gate to ON)
4. **Safe to enable payments?** (Y/N — expects C94 readiness checklist complete)
5. **Safe to enable live AI in coach?** (Y/N — expects C65 readiness; deferred until C95+)
6. **Safe to enable public-picks?** (Y/N — expects canonical history accumulation per C62)
