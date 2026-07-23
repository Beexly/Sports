# SRQC Status — the single honest record

This document is the one place that says, plainly, what has actually been
proved, what has actually been built, and what is still open, for the
Self-Refining Quotient Certificate (SRQC) effort in the AI/agent control
plane. It is written against `main` as of commit `0c18e091` (merge of #185).
Every SHA, receipt number, and grep result below was re-checked against the
files in this tree while writing this document, not copied from an earlier
handoff. Where something could not be verified, that is stated instead of
guessed.

Scope reminder up front: everything in this document is about the AI/agent
control plane's internal admission bookkeeping — invocation claims, credit
holds, dispatch, and the detection layer watching them. None of it is a
claim about bet-settlement correctness or any user-facing betting logic.

---

## 1. Architecture pipeline

The real data flow, as implemented on `main` today (file paths are exact):

```
apps/web/lib/ai-control-plane/control-store.ts
  finalizeSuccess / finalizeFailure / recordAttemptFailure / startAttempt
  — each folds an INSERT INTO "control_event_ledger" ... ON CONFLICT
    ("eventId") DO NOTHING into the SAME SQL statement (a WITH ... CTE) as
    the authoritative state transition it records, gated on that
    transition having actually applied.
        |
        v
control_event_ledger  (Prisma model ControlEventLedger, packages/db/prisma/schema.prisma)
  eventId (deterministic: `${sourceId}:${eventType}`, deriveControlEventId
  in event-ledger.ts), seq (monotonic tiebreaker), source, sourceId,
  eventType, payload, createdAt
        |
        v
apps/web/lib/ai-control-plane/event-ledger.ts
  readRecentEvents — plain read by source/sourceId/time window
  alreadyProcessed / markProcessed / claimForProcessing — idempotency gates
  against the processed_event table (Prisma model ProcessedEvent, PK
  (eventId, sink), FK to control_event_ledger) — per-sink exactly-once
        |
        v
apps/web/lib/ai-control-plane/srqc-projection.ts
  projectWindow(events) — pure fold of a ledger window into per-invocation
  AbstractControlState:
    claimPhase ∈ {OPEN, TERMINAL}
    exposurePhase ∈ {NONE, HELD, AMBIGUOUS_HELD}
    pendingCountClass ∈ {ZERO, ONE, GE2}
    fingerprintBound: boolean
    hasRejectedFp: boolean
        |
        v
admitUnderSRQC(events, mode ∈ {SHADOW, ENFORCE} = SHADOW)
  — computes the projection, flags violations (GE2 pending, or a rejected
    fingerprint with no bound), and in SHADOW (the only reachable default,
    see §4) always returns ADMIT regardless of violations
        |
        v (Track B, on violation)
apps/web/lib/ai-control-plane/formal-receipt-job.ts  (scheduled cron,
  apps/web/app/api/cron/run-formal-receipt/route.ts)
  — pulls a ledger window, re-derives the same projection, and on a newly
    witnessed violation appends one row to formal_incident (Prisma model
    FormalIncident: violationKind, abstractState, eventIds, srqcVersion,
    status), gated by the same processed_event exactly-once mark
        |
        v
srqc_version  (Prisma model SrqcVersion: version, indInvHash,
  refinementReceiptHash, status ∈ {candidate, active, superseded},
  activatedAt) — the active-certificate register a FormalIncident can
  softly reference
        |
        v (independent consumer of the same ledger)
apps/web/lib/ai-control-plane/cti-miner.ts  (M6)
  — mines projected states one abstract step away from a forbidden state
    (mirrors AbstractClaimExposure.tla's Next relation) and records
    cti_candidate rows (Prisma model CtiCandidate: before, action, after,
    status) for human/LLM review. Never edits any .tla file. Never
    enforces anything.
```

---

## 2. Harness / quotient framing

`projectWindow` is the abstraction map α from concrete ledger events to the
same abstract domain `formal/abstract/AbstractClaimExposure.tla` reasons
over — `srqc-projection.ts`'s `AbstractControlState` interface is written to
match that spec's five variables (`claimPhase`, `exposurePhase`,
`pendingCountClass`, `fingerprintBound`, `hasRejectedFp`) exactly, and
`formal/abstract/QUOTIENT.md` documents the concrete-to-abstract collapse in
detail (e.g. `pendingCountClass = GE2` is a many-to-one collapse of every
concrete pending count ≥ 2, because no proof in this stack distinguishes
"3 pending" from "4 pending" — only "≤1 vs ≥2" is safety-relevant).

Every `admitUnderSRQC` call is a **local** check: it projects the live
ledger window through α and evaluates the result against the fixed set of
forbidden abstract states (and, once wired, the currently-active
`SrqcVersion`). It is **not** re-deriving a global TLC or TLAPS proof at
runtime — there is no model checker running in production. What it buys:
a live, cheap, structurally-identical-domain watch for the runtime ever
producing a state the offline proofs say is unreachable. What it does
**not** buy: any runtime re-verification of the proofs themselves, any
guarantee that the runtime's actual state machine matches the modeled one
beyond what the (bounded, fixed-constant) refinement check in §3 covers,
or any claim that scales beyond the constants those checks were run at.

---

## 3. What is PROVED (real receipts, real numbers)

All read directly from the receipt files in `formal/` on this branch.

| Artifact | Tool | Constants | Result |
|---|---|---|---|
| `formal/abstract/AbstractClaimExposure.tla` bounded reachability | TLC 2026.07.18.145032 | no constants (5 enumerated-domain variables, 72 typed states) | `40 states generated, 15 distinct states found, 0 states left on queue.` Depth 6. No error found. |
| `formal/abstract/AbstractClaimExposure.tla` `IndInv_alpha` inductive closure (candidate step) | TLC | no constants | `97 states generated, 30 distinct states found, 0 states left on queue.` Depth 1. No error found. |
| `formal/abstract/AbstractClaimExposure.tla` `IndInv_alpha` base case | TLC | no constants | `40 states generated, 15 distinct states found, 0 states left on queue.` Depth 6. No error found. |
| `formal/abstract/LiveModelRefinesAbstract.tla` — refinement mapping α, step-simulation of the concrete composed spec against the abstract spec | TLC | `Invocations={i1,i2}`, `Attempts={a1,a2,a3}`, `Fingerprints={fp1,fp2}`, `Actors={act1,act2}`, `TrustedActors={act1}`, `VerifiedBalance=2`, `RequestCost=1`, `TargetInv=i1` | `1306029 states generated, 323194 distinct states found, 0 states left on queue.` Depth 21. No error found. |
| `formal/live-sports/LiveModelDispatchUnderAmbiguityInductive.tla` — compositional inductive closure (`IndInv`, glue invariant `InflightImpliesHeld`) | TLC | shrunk bound: `Invocations={i1}`, `Attempts={a1,a2}`, `Fingerprints={fp1}`, `Actors={act1,act2}`, `TrustedActors={act1}`, `VerifiedBalance=1`, `RequestCost=1` | `10039464 states generated, 4635468 distinct states found, 0 states left on queue.` Depth 1. No error found. |
| `formal/live-sports/LiveModelDispatchUnderAmbiguityInductive.tla` — base case | TLC | same shrunk bound | `285 states generated, 155 distinct states found, 0 states left on queue.` Depth 11. No error found. |

Two numbers worth flagging explicitly because they are easy to conflate:
the refinement step-simulation (1,306,029 generated / 323,194 distinct) and
the compositional inductive closure (10,039,464 generated / 4,635,468
distinct) are **two different checks at two different, independently
documented constant bounds** — `QUOTIENT.md` §4 states this plainly ("the
induction does not run at §3's reachability bound"). Do not read one number
as corroborating the other.

**Pending-class quotient / cutoff matrix (W4):** this work exists as commit
`f8db2a3e` ("formal: machine-checked pending-class quotient/cutoff (W4)")
and a second identical-message commit `3bf0533f`, both on the **open,
unmerged** branch `formal/feat/quotient-pending-class` (PR #186) — **not**
on `main` as of this writing (`git merge-base --is-ancestor f8db2a3e
origin/main` returns false). Its commit message claims a controlled-vs-
uncontrolled TLC pair (`PendingClassQuotient.tla`, `NextControlled` vs
`Next` over a finite `InvIds` set: 25 generated / 8 distinct states for the
controlled, admission-guarded case with no error; a real CTI reaching
`GE2` for the uncontrolled case) plus an explicit TLAPS-defer NON-CLAIMS
note. That is what the commit message says it did — it has not been
independently re-verified against `main` in this pass because it is not on
`main`, and its numbers are reported here only as "claimed by the open PR,"
not as proved-on-main.

---

## 4. TLC-only vs. runtime detection vs. enforcement

**TLC-only** (formal-methods artifacts under `formal/`, tied to runtime only
through the shared shape of the abstract domain — no code in `apps/web`/
`packages` reads any `.tla`/`.cfg`/receipt file):
- `formal/ai-invocation/InvocationClaim.tla` (+ inductive variant)
- `formal/credit-budget/CreditReservation.tla` (+ inductive variant)
- `formal/live-sports/LiveModelDispatchUnderAmbiguity.tla` (+ inductive variant, composed)
- `formal/abstract/AbstractClaimExposure.tla`, `LiveModelRefinesAbstract.tla`
- All receipts, `REFINEMENT.md`, `QUOTIENT.md`, and the per-module
  `INDUCTIVE_STRENGTHENING_LOG.md` files

**Runtime detection** (reads/writes the ledger, never touches `.tla`, never
enforces):
- `apps/web/lib/ai-control-plane/formal-receipt-job.ts` — the Track B cron,
  writes `formal_incident` rows on a newly witnessed violation
- `apps/web/lib/ai-control-plane/cti-miner.ts` — the M6 CTI-candidate
  miner, writes `cti_candidate` rows for human/LLM review; its own header
  states it "NEVER edits, generates, or writes any `.tla` file... this
  module only appends database rows"
- Both are explicitly "detection only" in their own doc comments and
  neither calls `admitUnderSRQC` with `mode: "ENFORCE"`

**Enforcement posture:**
- SHADOW is the only reachable default anywhere on `main`. `admitUnderSRQC`
  defaults its `mode` parameter to `"SHADOW"`, which always returns `ADMIT`
  regardless of any detected violation.
- ENFORCE exists only behind the `SRQC_ENFORCE=1` environment flag, read by
  exactly one function, `resolveSrqcModeFromEnv`, which is consumed by
  exactly one entry point, `evaluateSrqcAdmissionForLab` — a function whose
  own doc comment calls it "LAB-ONLY" and states it is "deliberately NOT
  imported by any production route, worker, cron, executor, or C1–C8
  readiness gate."
- **That claim was independently checked, not just trusted**, with:
  ```
  grep -rn "evaluateSrqcAdmissionForLab" apps/web --include="*.ts" | grep -v __tests__
  ```
  Result: the only two matches outside its own file's comments are the
  comments referencing it by name inside `srqc-projection.ts` itself, plus
  its own `export function evaluateSrqcAdmissionForLab` declaration on
  line 297 of that same file. No route, cron, worker, or executor file
  anywhere in `apps/web` imports it. `admitUnderSRQC` itself (the pure
  core, which the production paths under `apps/web/lib/ai-control-plane/
  index.ts` and `formal-receipt-job.ts` do call) is called with no `mode`
  argument on every live path found in this pass, which defaults it to
  `SHADOW`.

---

## 5. Receipts index

| Artifact | Merge SHA (on `main`) |
|---|---|
| Track A — idempotent control-event ledger + SRQC projection seed (#181) | `f5605d95` |
| Track B + envelope — formal-receipt cron + FormalIncident/SrqcVersion (#182) | `98c36070` |
| M5 — SHADOW/ENFORCE mode for `admitUnderSRQC` (#183) | `6fee6fa3` |
| M6 — CTI-candidate miner, detection-only (#184, merge commit) | `fce9cef3` |
| M1 + M2 + M7 — formal refinement + compositional induction + quotient writeup (#185, merge commit) | `0c18e091` |

Formal receipt files (all under `formal/`):
- `formal/abstract/AbstractClaimExposure.tlc-receipt.txt`
- `formal/abstract/AbstractClaimExposureInductive.tlc-receipt.txt`
- `formal/abstract/AbstractClaimExposureInductive.base.tlc-receipt.txt`
- `formal/abstract/LiveModelRefinesAbstract.tlc-receipt.txt`
- `formal/live-sports/LiveModelDispatchUnderAmbiguityInductive.tlc-receipt.txt`
- `formal/live-sports/LiveModelDispatchUnderAmbiguityInductive.base.tlc-receipt.txt`
- `formal/ai-invocation/InvocationClaim.tlc-receipt.txt` (+ inductive variant, +
  a real, kept-in-tree TLC FAIL counterexample from earlier development:
  `InvocationClaim.counterexample-found-during-development.txt`)
- `formal/credit-budget/CreditReservation.tlc-receipt.txt` (+ inductive variant)
- Writeups: `formal/abstract/REFINEMENT.md`, `formal/abstract/QUOTIENT.md`,
  `formal/abstract/ABSTRACT_STRENGTHENING_LOG.md`,
  `formal/live-sports/INDUCTIVE_STRENGTHENING_LOG.md`,
  `formal/ai-invocation/INDUCTIVE_STRENGTHENING_LOG.md`,
  `formal/credit-budget/INDUCTIVE_STRENGTHENING_LOG.md`,
  `formal/README.md`, `formal/INDUCTION_DOCTRINE.md`

---

## 6. Explicit NON-CLAIMS

- **Not a parameterized (∀N) proof.** Every TLC result in §3 is a
  fixed-constant / finite-cutoff model-check, not a TLAPS-machine-checked
  universal statement. A cutoff-matrix-plus-TLAPS-defer artifact
  (`PendingClassQuotient.tla`) is claimed by the open, unmerged PR #186
  (`formal/feat/quotient-pending-class`) — it is not on `main` as of this
  writing, and even that artifact's own commit message describes a
  TLAPS defer, not a completed TLAPS proof (TLAPS is unavailable in this
  environment regardless — see below).
- **Not automatic `.tla` editing by any job.** `cti-miner.ts`'s own header
  states it "NEVER edits, generates, or writes any `.tla` file (or any
  spec)." Every spec change in this repository has been human-authored;
  no cron, script, or scheduled job in this repo writes to `formal/`.
- **Not a production ENFORCE-by-default posture.** SHADOW is the only
  default anywhere `admitUnderSRQC` is called without an explicit `mode`.
  ENFORCE is reachable only through `evaluateSrqcAdmissionForLab`, which is
  unreachable from any production/C1–C8 path per the grep in §4.
- **Not a claim about bet-settlement correctness or any user-facing
  betting logic.** This entire effort concerns only the AI/agent control
  plane's internal admission bookkeeping (invocation claims, credit holds,
  dispatch ambiguity) — nothing about odds, grading, payouts, or picks.
- **TLAPS / Isabelle / Apalache are unavailable in this environment.**
  `formal/README.md` and every strengthening log say so explicitly. Every
  formal claim in this repository is a TLC model-checking result at fixed
  constants, not a machine-checked deductive proof.
- **Not tightest-abstraction / bisimulation.** `QUOTIENT.md` §6 states
  `AbstractClaimExposure!Next` is a deliberate over-approximation; the
  refinement step-simulation shows the concrete spec refines it, not that
  the two are equivalent.
- **Not a cutoff theorem.** The quotient argument in `QUOTIENT.md` is an
  abstraction function checked by step-simulation at fixed bounds, not a
  proof that any finite bound is a sound cutoff for larger instances.

---

## 7. Offline-TLA-vs-this-loop, honestly

A traditional "write a TLA+ spec, model-check or prove it once, ship the
application code as a separate artifact, and hope the two stay in sync
over time" workflow gives you: a point-in-time correctness argument about
the spec, with no automatic signal if the shipped code later drifts from
what the spec described. The spec and the implementation are two
documents connected only by developer discipline.

What this repository does differently, mechanically: `AbstractControlState`
in `srqc-projection.ts` is written to the same five-field domain shape
`AbstractClaimExposure.tla` defines, and `LiveModelRefinesAbstract.tla`
checks (at the fixed bounds in §3) that the concrete composed spec's
behavior, read through the α mapping, stays inside what the abstract spec
permits. A live runtime projection (`projectWindow`, fed by real
`control_event_ledger` rows) is then folded through structurally the same
abstract domain, and a detection layer (Track B's cron, the M6 miner)
watches for that live projection producing a state the TLC-checked
invariants forbid — surfacing it as a `formal_incident` or `cti_candidate`
row rather than silently drifting.

What this buys: the runtime projection and the formal spec share one
domain definition instead of two independently-maintained ones, and a
runtime violation of a TLC-checked invariant produces a row a human can
see, rather than nothing. What it does not buy: any of it is bounded by
the fixed constants in §3 (two invocations, three attempts, two
fingerprints); the detection layer is pull-based on a cron schedule, not
real-time; and none of it is enforcement — see §4. Whether this
combination of a shared abstract-domain shape plus a detection layer is
differentiated from other approaches is left for the reader to judge; this
document only describes the mechanism.

---

## 8. Reproduce

**TLC (from the relevant `formal/` subdirectory), toolchain per
`formal/README.md`:**

```bash
# fetch once (project mirror, not GitHub):
curl -sS -o /tmp/tla2tools.jar https://nightly.tlapl.us/dist/tla2tools.jar
java -cp /tmp/tla2tools.jar tlc2.TLC -help   # confirms TLC2 Version 2026.07.18.145032

# Abstract spec bounded reachability:
cd formal/abstract
java -cp /tmp/tla2tools.jar tlc2.TLC -workers auto -deadlock \
  -config AbstractClaimExposure.cfg AbstractClaimExposure.tla

# Abstract spec IndInv_alpha inductive closure + base case:
java -cp /tmp/tla2tools.jar tlc2.TLC -workers auto -deadlock \
  -config AbstractClaimExposureInductive.cfg AbstractClaimExposure.tla
java -cp /tmp/tla2tools.jar tlc2.TLC -workers auto -deadlock \
  -config AbstractClaimExposureInductive.base.cfg AbstractClaimExposure.tla

# Refinement mapping step-simulation (needs the sibling spec dirs on the
# TLA-Library path — TLC in this version has no -library/-I flag):
java -DTLA-Library=$(pwd)/../live-sports:$(pwd)/../ai-invocation:$(pwd)/../credit-budget \
  -cp /tmp/tla2tools.jar tlc2.TLC -workers auto -deadlock \
  -config LiveModelRefinesAbstract.cfg LiveModelRefinesAbstract.tla

# Compositional inductive closure + base case (live-sports):
cd ../live-sports
java -cp /tmp/tla2tools.jar tlc2.TLC -workers auto -deadlock \
  -config LiveModelDispatchUnderAmbiguityInductive.cfg LiveModelDispatchUnderAmbiguityInductive.tla
java -cp /tmp/tla2tools.jar tlc2.TLC -workers auto -deadlock \
  -config LiveModelDispatchUnderAmbiguityInductive.base.cfg LiveModelDispatchUnderAmbiguityInductive.tla
```

**Vitest (from `apps/web`):**

```bash
npx vitest run \
  __tests__/ai-control-plane-srqc-projection.test.ts \
  __tests__/ai-control-plane-event-ledger-pg.test.ts \
  __tests__/ai-control-plane-cti-miner-pg.test.ts \
  __tests__/ai-control-plane-formal-incident-pg.test.ts \
  __tests__/formal-receipt-cron.test.ts
```

Note: several suites (`ai-control-plane-event-ledger-pg`,
`ai-control-plane-formal-incident-pg`, part of `ai-control-plane-cti-miner-pg`)
are real-Postgres integration tests gated on `DATABASE_URL` and are skipped
without it — confirmed in this pass: without `DATABASE_URL` set, 30 tests
ran and passed, 26 were skipped.

**Replay script:** no dedicated SRQC ledger-replay script exists on `main`
as of this writing. An offline projection-replay script
(`scripts/srqc-replay.ts`) is claimed by the open, unmerged PR #187
(`feat/srqc-kernel-v1`) — see §9. It is not available to run against `main`
today.

---

## 9. In-flight work (open PRs, not yet on `main`)

None of the following is on `main`. Descriptions below are what each
branch's own commit messages claim, not independently re-verified content
— they are listed here so the reader knows they exist and what they say
they add, nothing more.

- **#186 — `formal/feat/quotient-pending-class`** — "formal: machine-checked
  pending-class quotient/cutoff (W4)." Claims a new
  `PendingClassQuotient.tla` isolating the `pendingCountClass`
  counter-abstraction over a finite `InvIds` set, a controlled-vs-
  uncontrolled TLC receipt pair (controlled: invariant holds; uncontrolled:
  a real CTI reaches `GE2`, showing the admission guard is load-bearing),
  and an appended "Machine-checked pending-class quotient (W4)" section in
  `QUOTIENT.md` with explicit NON-CLAIMS (finite `InvIds`, TLAPS/Apalache
  still unavailable).
- **#187 — `feat/srqc-kernel-v1`** — "KERNEL v1 — on-policy proposal loop."
  Claims a closed on-policy self-refinement loop stacked on the CTI miner
  and `SrqcVersion` envelope: an `ind_inv_proposal` table and
  `emitProposalsFromOpenCtis` emitter, a ranking-only
  `evaluateWindowWithSkills` / `runSkillAugmentedCti` pair, an extended
  `admitUnderSRQC` (still SHADOW-default / lab-only ENFORCE) with an
  `admitUnderSRQCWithVersion` logging wrapper, a script-only
  `acceptProposalAndActivate` as the sole version-activation path, a
  discrete-Laplace DP metrics publisher, and an offline
  `scripts/srqc-replay.ts` replay tool — described in its own commit
  message as detection/ranking-only with no control-plane behavior change.
- **#188 — `feat/governed-receipts`** — "Governed Receipts + Keyring."
  Claims signed, publicly verifiable receipts (ed25519) for gated AI/agent
  tool calls via a new `packages/governed` package, a keyring with
  rotate/retire/revoke, an additive `AgentReceipt` Prisma model wiring
  `admitUnderSRQC` and `readRecentEvents` into a `GateOutput` contract, new
  `/api/receipts/*` routes, and compliance-posture docs — its own commit
  message states SHADOW is the default posture (a REFUSE only takes effect
  when the caller explicitly passes `ctx.mode: "ENFORCE"`) and that
  `formal/**` and `cti-miner.ts` are untouched.
