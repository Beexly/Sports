# Phase 1 Execution Addendum — 2026-07-22

**This is an append-only correction. It does not rewrite the Phase 0 record.**
The Phase 0 artifacts dated 2026-07-21 remain accurate *as of when they were
written*. At that time the replacement PRs had not been opened and Phase 1 had
not begun. Both statements are now historical. This addendum records what
happened next and what later review found — it supersedes the *status claims* of
the earlier documents, not their analysis.

## 1. Corrected vocabulary (applies to all Phase 0/1 documents)

Wherever an earlier document says a change is "shipped", "landed", or
"complete", read it as one of:

- `IMPLEMENTED_ON_DRAFT_BRANCH` — code exists on a draft branch
- `CI_GREEN_IN_ISOLATION` — that branch's own CI head is green
- `NOT_MERGED` — nothing is on `main` (`main` is still `c19a00d`)
- `NOT_STACK_VALIDATED` — branches have not been rebased and tested against each
  other

Branch correctness has been demonstrated for #153–#158. **Combined-stack
correctness has not.**

## 2. What was executed in Phase 1 (2026-07-21 → 2026-07-22)

`#147` (the broad, mixed-scope replacement of the closed `#145`) was closed
unmerged and split into five independently reviewable draft branches, each
redesigned per the Phase 0 disposition ledger:

| Unit | PR | Head | Disposition realized |
|------|----|------|----------------------|
| CI Postgres health | #153 | `61fd7dc7` | EXTRACT_AS_IS |
| Hash hex/length validation | #154 | `e498cdf8` | EXTRACT_AFTER_REDESIGN |
| Actor identity boundary | #155 | `6b7f57cb` | EXTRACT_AFTER_REDESIGN |
| Checkout idempotency | #156 | `9a7c9dcb` | REJECT_UNSAFE → redesign attempt |
| Settlement quarantine | #157 | `2403468b` | REJECT_UNSAFE → redesign attempt |
| AI transport import guard | #158 | `f55d171d` | new structural guard |

All five (plus this docs branch #152) are `CI_GREEN_IN_ISOLATION`. See
`LIVE_PR_REGISTRY_2026-07-22.md` for full state.

## 3. Findings from second-pass review (remediation gates)

The isolation-green status of #155–#158 does **not** clear them for merge. Second
review found the following, each of which downgrades the PR to a remediation
gate. These are recorded here so later agents do not build against capabilities
that are not yet correct.

### #155 — actor identity: still trusts spoofable identities → `REQUEST_CHANGES`
- `fileReport()` ungated, accepts caller-supplied `reporterUserId` (impersonation).
- `appealAction()` ungated, accepts caller-supplied `appellantId` (can consume
  another user's single allowed appeal).
- `takeAction()` authenticates an admin but still persists caller-supplied `actor`.
- `decideAppeal()` authenticates an admin but compares/persists caller-supplied
  `reviewer` — the different-reviewer rule is bypassable with a fabricated string.
- `requireAdminActor()` can return an empty subject ID for a malformed privileged
  session.
- JARVIS writes will need a governed SERVICE/SYSTEM identity, not only an
  interactive ADMIN session.
- **Required:** `TrustedActor = HUMAN | SERVICE | SYSTEM`, each with a non-empty
  stable `subjectId`, auth method, authority scope, tenant/project, request/run
  ID, observed time, optional email snapshot, policy version. Server-derive all
  identity; caller-supplied identity fields removed or downgraded to
  non-authoritative display labels. Anonymous report = explicit separate
  contract with `reporterUserId = null` + anti-abuse. Negative tests for
  impersonation, cross-user appeal, malformed privileged session, service-actor
  denial, actor/reviewer spoofing.

### #156 — checkout idempotency: ephemeral token, not durable attempt → `REQUEST_CHANGES`
- Token lives only in a React `useRef` — lost on reload / other device / ambiguous
  network outcome.
- Tokenless API retries mint a fresh server UUID → not idempotent.
- No durable fingerprint binds the key to user, tier, interval, price, currency,
  terms; a mounted component surviving a tier/interval change can reuse one key
  with different Stripe parameters.
- Attempt ID not persisted in Stripe/subscription metadata → webhooks cannot
  reconcile.
- **Required:** additive `CheckoutAttempt` model (id, clientIntentId, userId,
  customerId, tier, interval, priceId, currency, requestFingerprint, status
  `CREATED|SESSION_CREATED|COMPLETED|FAILED|EXPIRED`, stripeSessionId, refs,
  timestamps, lastErrorKind, audit). Same intent+fingerprint → same session;
  same intent+different fingerprint → `409`; unknown-outcome retry reuses the
  durable attempt; attempt ID in Checkout Session + subscription metadata;
  webhook reconciliation; concurrency + network-ambiguity tests. Component
  lifetime is never the source of truth.

### #157 — settlement quarantine: race-prone, erases evidence → `REQUEST_CHANGES`
- Reads count, computes threshold crossing, then increments. The **increment** is
  atomic; **threshold detection is not** — concurrent runs can double-flag, miss
  the threshold, or miscount.
- No run ID / source-observation identity → retries can count as fresh
  corroboration.
- On score arrival it resets the counter and clears the flag — **destroys** the
  anomaly history instead of resolving it.
- A console warning + cron counter is not a durable owner-decision receipt.
- **Required:** append-only `SettlementObservation`, `SettlementAnomaly`,
  `SettlementDecision`, `PickSettlementEvent`/outbox. Unique dedup key so retries
  never corroborate; distinct-run derivation; anomaly promoted exactly once in a
  transaction; owner-decision receipt on first threshold crossing; later scores
  **resolve** the anomaly (never delete evidence). Tests: 100 concurrent
  observations, duplicate run ID, retry same payload, threshold-once, late scores
  resolve-not-delete, worker/cron race, terminal-game late regression.

### #144 + #157 — competing settlement designs → `HOLD_AND_CONVERGE`
`#144` adds an `onPickGraded` notification hook to the same settlement function.
It is fail-isolated but **not** a durable transactional outbox (crash after
commit loses the notification; crash after send risks duplicate). Both PRs alter
the same settlement code, tests, Prisma schema, and cron. **Converge** into one
design: the settlement transaction updates the pick result, appends settlement
evidence, and appends a `PickSettlementEvent`/outbox row atomically; a separate
notification worker claims the row and sends idempotently. Do not perform
irreversible notification work inside the settlement loop.

### #158 — guards a control plane that isn't on `main` yet → `REVISE_THEN_REVIEW`
- Its description claims `callClaude()` reads budgets and accounts spend before
  transport. **Not true on its base** — the cost-policy layer is unmerged (#148)
  and the atomic budget layer does not exist anywhere yet. It enforces use of the
  current *dispatcher*, not a completed economic control plane.
- Broad regex + whole-directory exemption can miss re-exports, dynamic imports,
  CommonJS `require`, vendor SDK imports, raw endpoint literals, aliases; and any
  future file dropped in the exempt directory gets raw transport for free.
- **Required:** rename to "AI transport import boundary"; replace regex with a
  TypeScript AST / ESLint / dependency-graph rule; allowlist **exact adapter
  files**, not a directory; detect static + re-export + dynamic + CommonJS + SDK
  + raw-endpoint patterns; add committed positive/negative/multiline/alias/
  re-export/dynamic-import/mutation fixtures; correct the PR's capability claims
  to match what exists.

## 4. Stale-draft dispositions (recorded; actions tracked separately)

- **#148 / #151** — `SUPERSEDE_AFTER_REPLACEMENT_LINKED`. Preserve their tests
  and ideas; the provider-neutral control-plane stack replaces them. #151 emits
  one final record (not invocation+attempts) and labels a *failed* direct call's
  provider as "used" and "cash billed" from routing, not reconciliation —
  repeating the provider-vs-payer error. #151 is stacked on #148.
- **#149** — `ARCHIVE_AND_CLOSE`. Research preserved in an archival location; the
  included master plan is superseded and must not be presented as current truth.
- **#150** — `PARK_LOW_PRIORITY`. Optional command-usage telemetry; may later
  feed NOVA's capability-evaluation ledger.
- **#146** — `FREEZE_AND_SPLIT`. Reference/integration branch; split into: (1)
  deterministic NOVA domain contracts + tests; (2) capability inventory +
  governor + tests; (3) source registry/runtime + failed-closed receipts; (4)
  Founder OS + read-only cockpit; (5) persistence *after* shared actor/credit/
  AI-invocation models are frozen; (6) scheduler/worker/outbox *after*
  persistence + locks are proven.

## 5. Canonical ownership (frozen)

- **NOVA:** source monitoring, opportunity lifecycle, credit-program lifecycle,
  Founder OS, revenue opportunity, owner queue.
- **AI control plane:** invocation policy, model/provider routing, attempts,
  budgets, financial attribution.
- **Settlement domain:** sports observations, anomalies, grading, settlement
  decisions.
- **Shared infrastructure:** actor identity, audit receipt, idempotency,
  transactional outbox.

## 6. What did NOT happen (authority boundary honored)

No merge, deploy, production migration, billing activation, credit application,
outreach, publish, secret change, or paid-user-outcome mutation occurred. `main`
is unchanged at `c19a00d`. All Phase 1 work is reversible repository operations
on draft branches only.
