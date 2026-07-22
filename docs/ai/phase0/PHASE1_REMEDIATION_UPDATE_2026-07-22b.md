# Phase 1 Remediation — Execution Update (2026-07-22, second pass)

Append-only continuation of `PHASE1_EXECUTION_ADDENDUM_2026-07-22.md` and
`LIVE_PR_REGISTRY_2026-07-22.md`. Records the remediation PRs that were built,
verified, and opened, and the resulting disposition changes. `main` is still
`c19a00d` — nothing merged.

## Remediation PRs opened (all draft, off `main`, CI-green in isolation)

| Phase | PR | Replaces | Head | CI | Core guarantee |
|-------|----|----------|------|----|----------------|
| 1‑158 | #158 (revised) | — (revise-in-place) | `39bd416` | ✅ green | AST-based AI **transport** import boundary; exact adapter-file allowlist; provider-SDK + endpoint-literal detection; committed fixture/mutation suite; overclaim corrected. |
| 1A | **#159** | #155 | `ef80280` | ✅ green | `TrustedActor = HUMAN\|SERVICE\|SYSTEM`; caller-supplied identity fields removed (spoofing unrepresentable); empty subject throws; different-reviewer rule on trusted ids. |
| 1P | **#160** | #156 | `6bf296f` | ✅ green | Durable `CheckoutAttempt`; unique-constraint create-or-retrieve; fingerprint 409; attempt id in Stripe metadata; webhook reconciliation; 24h expiry. |
| 1E | **#161** | #157 **and** #144 (converged) | `settlement/evidence-outbox` | guardrails/build green; full test job verified locally (8413 apps/web + 143 pipeline) | Append-only `SettlementObservation`/`Anomaly`/`Decision` + `PickSettlementEvent` outbox; corroboration by `COUNT(DISTINCT runId)`; promotion + receipt exactly-once via unique FK; scores-arrived resolves (never deletes); pick-update + outbox append atomic; #144 channels delivered by an apps/web outbox-drain cron strictly outside the settlement txn. Never auto-voids / never infers POSTPONED. |

## Disposition changes (this pass)

- **#155 → CLOSED** (superseded by #159, closure comment maps all 6 gaps).
- **#156 → CLOSED** (superseded by #160, closure comment maps all 5 gaps).
- **#157 → SUPERSEDED by #161** (closing once #161's full CI is confirmed green).
- **#144 → SUPERSEDED by #161** (converged into the outbox design; closing with #157).
- Phase 2 blueprint (`AI_CONTROL_PLANE_DESIGN_2026-07-22.md`) committed to this
  branch — the implementable spec for control-plane PRs A–E that will supersede
  **#148/#151** (which stay open until PR‑B preserves their tests, per the
  `CLOSE_AFTER_REPLACEMENT_LINKED` rule).

## Constraint-proven vs mock-proven (carried honestly from the PRs)

- #159: negative tests (impersonation, cross-user appeal, empty-subject throw,
  actor/reviewer spoof) — unit-proven; schema additive columns — disposable-PG
  psql-proven.
- #160: race convergence — proven against a fake DB raising real Prisma `P2002`;
  the compound unique + session index — disposable-PG psql-proven.
- #161: all four unique constraints, dup-observation no-op, exactly-once
  decision, single-open-anomaly — **constraint-proven on real Postgres**;
  transaction atomicity/rollback, race interleavings, channel sending —
  mock-proven. Push delivery is at-least-once by design (documented).

## Unchanged truths

`main` = `c19a00d`. Nothing merged, deployed, migrated to production, billed,
applied, or sent. NOVA source validation remains `FAILED_CLOSED`. The next
owner-gated step is the sequential merge train beginning with #153 → #154.
