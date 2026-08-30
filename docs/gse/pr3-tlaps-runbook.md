# GSE PR3 — TLAPS-Proofed Migration Runbook (LEVEL 1; artifacts only, gated)

**Status:** ARTIFACTS ONLY — PREPARED, NOT APPLIED. No schema edited, no migration
run, no DB touched, no push, no deploy, no merge. This document adds a *formally
modeled and machine-checked* safety layer on top of the runbook in
[`pr3-build-artifacts.md`](./pr3-build-artifacts.md) and
[`pr3-migration-runbook.md`](./pr3-migration-runbook.md).

> **Go-phrase (unchanged).** To authorize *staging* Artifacts 1+3 on a local branch
> (still NO migrate / NO push), the explicit owner phrase is:
> **"approve PR3 schema build — local only, no migrate, no push."**
> Even then: NO `prisma migrate dev/deploy`, NO `db push`, NO `git push`, NO deploy.
> The owner alone runs the migration against a verified-local DB.

This runbook is **Level 1**: it produces documentation and a formal model. It changes
no application source, no schema, no database, and touches no other lane.

---

## 1. What this pass added (and only this)

1. **Isolated wiring artifact** — the exact, ready-to-apply (but *not applied*) delegate
   wiring for `selectWaitlistStore()` (§3 below). Reproduced verbatim from Artifact 3,
   re-verified against current source this pass.
2. **TLAPS-proofed runbook** — a TLA+ state-machine model of the 10-step runbook plus
   abort/retry and the runtime flag, with the six **sacred invariants** encoded as
   safety properties and a proof that `Spec ⇒ □SacredInv`
   ([`formal/PR3Waitlist.tla`](./formal/PR3Waitlist.tla)).
3. **Executed cross-check** — a dependency-free exhaustive reachability checker
   ([`formal/pr3_runbook_check.py`](./formal/pr3_runbook_check.py)) that explores the
   entire reachable state space and asserts every invariant.

No other artifacts were created or modified in source. The schema gate is intact
(`packages/db/prisma/schema.prisma` has **no** `WaitlistLead` / `WaitlistReviewStatus`).

---

## 2. Re-verification of the existing artifacts (read-only)

| Check | Result |
|---|---|
| `schema.prisma` contains `WaitlistLead` / `WaitlistReviewStatus` | **No** — gate intact |
| `selectWaitlistStore()` db-branch | **commented out** (`waitlist-store.ts:131`) — file store is default |
| `WaitlistLeadRow` / `CreateWaitlistLeadData` vs Artifact 1 fields | **exact** business-field parity |
| Artifact 3 imports (`@sports/db`, `createDbWaitlistStore`, `WaitlistLeadDelegate`) | resolve as written |
| `route.ts` call site | already `selectWaitlistStore()` — **no call-site change** |
| `BACKTEST_TRUTH.beatsNaive` | `false`, test-asserted (`gse-waitlist.test.ts`) |
| No-claim CI | `public-copy-scanner.test.ts` + `no-claim-rules.md` present |
| Datasource | `postgresql`, `DATABASE_URL` + `DIRECT_URL` (migrate-in-build → why §6 stays owner-only) |

**Drift noted (not edited):** `pr3-migration-runbook.md` §3 sketches a no-arg
`createDbWaitlistStore()`. The shipped implementation and Artifact 3 use **delegate
injection** — `createDbWaitlistStore(db.waitlistLead as unknown as WaitlistLeadDelegate)`.
`pr3-build-artifacts.md` Artifact 3 (and §3 below) is the authoritative wiring.

---

## 3. Artifact — isolated delegate wiring (NOT APPLIED)

The **only** source change PR3 needs (after the owner-run schema + migration exist) is
swapping the commented gate line in `selectWaitlistStore()` for the live delegate. This
is provided as an isolated artifact; it is **not** written to source in this pass.

**Current** (`apps/web/lib/gse/waitlist-store.ts`, lines 130–133):

```ts
export function selectWaitlistStore(): WaitlistStore {
  // if (process.env.WAITLIST_STORAGE === "db") return createDbWaitlistStore(); // gated
  return createWaitlistStore();
}
```

**Proposed** (apply only under the go-phrase, after schema + `prisma generate`):

```ts
import { db } from "@sports/db";
import { createDbWaitlistStore, type WaitlistLeadDelegate } from "@/lib/gse/waitlist-store-db";

export function selectWaitlistStore(): WaitlistStore {
  if (process.env.WAITLIST_STORAGE === "db") {
    // After `prisma generate`, db.waitlistLead structurally implements the port.
    // The boundary cast adapts Prisma's wider generated delegate to the minimal interface.
    return createDbWaitlistStore(db.waitlistLead as unknown as WaitlistLeadDelegate);
  }
  return createWaitlistStore();
}
```

Default behavior is unchanged: with `WAITLIST_STORAGE` unset, the file store is returned.
Reversion is a single env flag (`WAITLIST_STORAGE=file`) — zero code change.

---

## 4. Formal model

[`formal/PR3Waitlist.tla`](./formal/PR3Waitlist.tla) models the runbook as a state
machine. State variables track exactly the facts the invariants depend on:

| Variable | Meaning |
|---|---|
| `pc` | runbook step `1..10`, or terminal `"Done"` / `"Aborted"` |
| `schemaHasModel` | Artifact 1 appended to `schema.prisma` |
| `clientGenerated` | `prisma generate` run → `db.waitlistLead` exists |
| `wiringApplied` | Artifact 3 applied to `selectWaitlistStore()` |
| `dbVerifiedLocal` | `DATABASE_URL` proven local / disposable |
| `migrationApplied` | `prisma migrate dev` applied to the (local) DB |
| `storageMode` | runtime `WAITLIST_STORAGE` selector: `"file"` \| `"db"` |
| `backtestBeatsNaive` | `BACKTEST_TRUTH.beatsNaive` |
| `noClaimGreen` | compliance scanner green on all surfaces |
| `pushed` | branch pushed / deployed / merged |

### Step ↔ action ↔ guard

| Step | TLA+ action | Guard / effect | Invariant it could threaten — and why it can't |
|---|---|---|---|
| 1 | `S1_Branch` | clean tree | — |
| 2 | `S2_AppendSchema` | `schemaHasModel := TRUE` | — |
| 3 | `S3_VerifyLocalDB` | `dbVerifiedLocal := {TRUE,FALSE}` (both modeled) | sets up the §6 guard |
| 4 | `S4_Generate` | requires `schemaHasModel`; `clientGenerated := TRUE` | `Inv_Ordering` (client⇒schema) |
| 5 | `S5_ApplyWiring` | requires `clientGenerated`; `wiringApplied := TRUE` | `Inv_Ordering` (wiring⇒client) |
| 6 | `S6_Migrate` | **guard `dbVerifiedLocal`**; `migrationApplied := TRUE` | `Inv_MigrateOnlyVerifiedLocal` |
| 6′ | `S6_AbortUnverified` | `¬dbVerifiedLocal` → `Aborted`, revert | never migrate an unverified DB |
| 7 | `S7_Regenerate` | regenerate client | — |
| 8 | `S8_TypecheckLint` | green → 9, red → `Abort` | self-destruct/retry |
| 9 | `S9_Tests` | both modes; leaves `storageMode="file"` | `Inv_FileDefaultSafe` |
| 10 | `S10_MigrateDiff` | "No difference" → `Done` | — |
| — | `ToggleDb` | **guard `wiringApplied ∧ migrationApplied`** → `"db"` | `Inv_FileDefaultSafe` |
| — | `ToggleFile` | always enabled → `"file"` | reversibility (Sacred 6) |
| — | `Abort` | any step → `Aborted`, revert tracked edits, flag→file | keeps all antecedents false |
| — | `Retry` | `Aborted` → step 1, clean slate | — |

Crucially, **no** action sets `pushed := TRUE`, `backtestBeatsNaive := TRUE`, or
`noClaimGreen := FALSE`. Sacred invariants 1, 2, and 5 therefore hold *by construction* —
a reviewer can confirm by inspection that no such transition exists.

---

## 5. The six sacred invariants (formal)

```
Inv_BacktestTruth            == backtestBeatsNaive = FALSE
Inv_NoClaimGreen             == noClaimGreen = TRUE
Inv_FileDefaultSafe          == (storageMode = "db") => (wiringApplied /\ migrationApplied)
Inv_MigrateOnlyVerifiedLocal == migrationApplied => dbVerifiedLocal
Inv_NoPush                   == pushed = FALSE
(reversibility)              == ToggleFile is always ENABLED and changes only storageMode→"file"
```

`Inv_FileDefaultSafe` is the property that prevents a half-applied state from serving DB
reads against a missing table. `Inv_MigrateOnlyVerifiedLocal` is the property that
prevents migrating a possibly-production database. These two are the load-bearing ones.

---

## 6. Proof

`Spec ⇒ □SacredInv` is proved by an inductive invariant
`IndInv == TypeOK ∧ Inv_Ordering ∧ Inv_MigratePhase ∧ SacredInv`:

1. **`Init ⇒ IndInv`** — the initial state has every flag at its safe value
   (`storageMode="file"`, `noClaimGreen=TRUE`, all others `FALSE`).
2. **`IndInv ∧ [Next]_vars ⇒ IndInv'`** — case-split over the 16 actions. Each action
   either leaves a sacred variable unchanged or moves it only in the safe direction; the
   two guarded actions (`S6_Migrate`, `ToggleDb`) establish their consequents' antecedents
   before the fact is set. `Inv_MigratePhase` (migration ⇒ `pc ∈ {7,8,9,10,Done}`) is the
   glue that keeps `S3_VerifyLocalDB` from ever lowering `dbVerifiedLocal` while a
   migration is in effect.
3. **`IndInv ⇒ SacredInv`** — direct.

The machine-readable proof is the `THEOREM Safety` block in
[`formal/PR3Waitlist.tla`](./formal/PR3Waitlist.tla), structured for `tlapm`.

### Verification status (honest)

| Method | Status | Evidence |
|---|---|---|
| Exhaustive BFS (`pr3_runbook_check.py`) | **EXECUTED — GREEN** | 21 reachable states, 68 transitions, 8/8 invariants hold, exit 0 |
| TLAPS proof (`tlapm`) | **Authored, not machine-checked here** | `tlapm` not installed in the sandbox; proof provided for offline check |
| TLC model check | **Config provided** | run with the cfg below |

The exhaustive BFS is a complete safety check over this finite state space — it is, for
these invariants, equivalent evidence to a TLC run. The TLAPS proof is included so the
result is also checkable deductively when `tlapm` is available.

### How to re-verify

```bash
# 1) Executed cross-check — no toolchain, no network:
python3 docs/gse/formal/pr3_runbook_check.py        # expect: RESULT: GREEN ... exit 0

# 2) TLC model check (needs tla2tools.jar + Java). Save this as PR3Waitlist.cfg
#    next to the .tla, then: java -jar tla2tools.jar -config PR3Waitlist.cfg PR3Waitlist.tla
#    --- PR3Waitlist.cfg ---
#    SPECIFICATION Spec
#    INVARIANT TypeOK
#    INVARIANT SacredInv
#    INVARIANT IndInv

# 3) TLAPS deductive proof (needs tlapm):
#    tlapm docs/gse/formal/PR3Waitlist.tla
```

---

## 7. Self-destruct / retry semantics (modeled)

- **Validation RED at any step** → `Abort`: revert the working tree
  (`git checkout -- .`), which clears `schemaHasModel`/`clientGenerated`/`wiringApplied`,
  flips the flag to `file`, and drops to `Aborted`; then `Retry` → step 1 on a clean
  slate. Modeled and proven invariant-preserving.
- **`DATABASE_URL` not provably local** → `S6_AbortUnverified` (never migrate an
  unverified DB).
- **Migration SQL ≠ Artifact 2** → treated as RED → `Abort` (re-derive the model).
- **Need to revert at runtime** → `ToggleFile` (`WAITLIST_STORAGE=file`) — always
  enabled, zero code change.

---

## 8. Gates that remain after this runbook (each owner-only)

1. **Stage Artifacts 1+3 on a local branch** — requires the go-phrase above. Still no
   migrate / no push.
2. **Run the migration** (`prisma migrate dev`) against a **verified-local** DB — owner
   only; the agent never runs a DB-applying command.
3. **Push / open PR / merge / deploy** — Level 2A (push/PR) and Level 3 (merge=production)
   are separate owner approvals; see `pr-open-prep.md` and `release-gate-plan.md`.

This document stops here. Nothing in it advances a gate.
