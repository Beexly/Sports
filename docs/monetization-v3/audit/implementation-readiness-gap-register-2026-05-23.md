# Implementation Readiness Gap Register - 2026-05-23

**Status:** Internal engineering audit.
**Related decision:** DEC-NEXT-050

## DEC-NEXT-050 - Add implementation readiness gap register

**Decision:** Maintain a single launch-readiness gap register that separates strategy completeness from implementation readiness.

**Why now:** The operating docs are deep and the web scaffold now compiles, but the launch can still fail through missing persistence, provider wiring, auth, admin workflows, and production environment setup. This register keeps those gaps visible.

## P0 Gaps

| Gap | Current state | Failure mode | Design response |
|---|---|---|---|
| Runway scenario | Still Garrett-owned | Wrong track activation sequence | Do not activate Almanac/Live or public launch steps until DEC-NEXT-001 is real. |
| Customer-dev GO | Still Garrett-owned | Engineering spend before market signal | Keep Vault engineering scoped to scaffolds and validation until DEC-NEXT-002 is real. |
| Persistent member storage | Not wired | Checkout succeeds but member state cannot persist | Implement durable `VaultMember`, `VaultLifecycleEmail`, `VaultReferralAttribution`, onboarding health, and processed webhook tables before real checkout. |
| Stripe webhook verification | Not wired | Spoofed or duplicate events mutate access | Add signature verification, processed-event log, idempotent transaction, and replay tests before enabling webhook route. |
| Founding number transaction | Pure decision only | Duplicate/skipped founding numbers | Database unique constraint + transaction/lock required before checkout can assign founding numbers. |
| Discord role mutation | Planned only | Member pays but does not get Vault channel access | Wire bot token, guild/role ids, role grant/remove jobs, retry queue, and repair tasks. |
| Transactional email provider | Planned only | Welcome/renewal emails do not send | Pick provider, load templates, persist lifecycle rows, and test Day 0 email within 5 minutes. |
| Auth/gating | Scaffolded only | Non-members can access member routes or members get blocked | Implement session/auth provider and route-level entitlement checks before member dashboard launch. |
| Admin repair cockpit | Model only | Silent failures depend on Garrett noticing manually | Build admin list for onboarding, provider, and proof-surface repair tasks before founding-50 send. |

## P1 Gaps

| Gap | Current state | Failure mode | Design response |
|---|---|---|---|
| Proof-surface source data | Static pages | Loss Room, Pass List, Ledger look real but are not data-backed | Wire real publication/pass/loss data before public traffic campaigns. |
| Proof freshness source of truth | Static timestamps | Freshness display lies by omission as data changes | Replace static config with persisted update times. |
| Short-form attribution storage | Parser only | Traffic source cannot be measured | Add event storage only after content test is approved. |
| Email capture storage | Validation only | Users submit interest but are not stored | Wire storage and double-check unsubscribe/privacy posture before enabling flag. |
| Provider heartbeat live checks | Logic only | Heartbeats stay conceptual | Add non-mutating checks and durable last-ok records. |
| Incident alert routing | Logic only | P0 signals do not reach Garrett | Add admin display first; external alerts only after routing choice. |
| Production smoke hostname | Guarded script only | Morning smoke cannot run | Garrett confirms `PROD_BASE_URL`; then run `npm run smoke:prod`. |

## P2 Gaps

| Gap | Current state | Failure mode | Design response |
|---|---|---|---|
| Research archive intake | Script only | Archive audits stay manual | Add metadata ledger only if archive intake becomes recurring. |
| Content brief system | R&D only | Short-form tests become ad hoc | Build brief model after Vault launch stability, not before. |
| Vega asset production | Strategy/storyboards only | Synthetic-character work distracts from Vault | Keep behind approval and test-plan gates. |
| Almanac export | PRD only | Almanac activates before Vault is stable | Keep gated by runway and active-track KPI rules. |

## Constraint Forecast

1. **Founder time is the bottleneck.** Every automation added before launch must reduce Day 0 manual repair burden, not create another surface Garrett has to watch.
2. **Provider sequencing matters.** Stripe and auth come before Discord/email automation; otherwise role/email jobs lack durable member truth.
3. **Static proof pages are useful scaffolds, not proof.** They must not receive paid or broad short-form traffic until real data backs them.
4. **Do not let R&D outrun trust.** Vega/media experiments only work if they point to current proof surfaces and remain human-approved.
5. **No production deploy is a feature tonight.** The repo is safer because launch-critical provider mutations remain disabled.

## Morning Sequencing

1. Run `npm run audit:launch`.
2. Confirm or skip `PROD_BASE_URL`; if confirmed, run `npm run smoke:prod`.
3. Decide the first implementation block from the P0 table: persistence/auth/Stripe before Discord/email.
4. Keep R&D work parked unless it directly improves proof-surface readiness or measurement.

## Guardrail

This register does not authorize deployment, provider activation, paid traffic, public posting, or track activation. It is a constraint map for engineering sequence.
