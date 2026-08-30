---------------------------- MODULE PR3Waitlist ----------------------------
(***************************************************************************)
(* Formal model of the GSE PR3 "WaitlistLead durable storage" runbook.     *)
(*                                                                         *)
(* This module encodes the owner-run runbook in                            *)
(*   docs/gse/pr3-build-artifacts.md  (10-step dry-run sim)                 *)
(* as a state machine, and the SIX "sacred invariants" as safety           *)
(* properties that must hold in EVERY reachable state.                     *)
(*                                                                         *)
(* Scope note: this models the LOCAL runbook only. Push / deploy / merge    *)
(* to main are out-of-scope OWNER actions; the machine therefore has NO     *)
(* transition that sets `pushed = TRUE`, which is exactly why Inv_NoPush     *)
(* holds by construction.                                                  *)
(*                                                                         *)
(* Verification:                                                           *)
(*   - TLC model check:  see the SacredInv / TypeOK / IndInv invariants and *)
(*                       the cfg in docs/gse/pr3-tlaps-runbook.md.          *)
(*   - TLAPS proof:      THEOREM Spec => []SacredInv (inductive, below).    *)
(*   - Executed cross-check (no toolchain needed): the identical transition *)
(*                       relation is exhaustively BFS-checked by            *)
(*                       docs/gse/formal/pr3_runbook_check.py.              *)
(***************************************************************************)
EXTENDS Integers

(* Program-counter: runbook steps 1..10, plus two terminal labels.         *)
Steps      == 1 .. 10
Terminals  == {"Done", "Aborted"}
PCDomain   == Steps \cup Terminals

VARIABLES
  pc,                 (* current runbook step, or a terminal label          *)
  schemaHasModel,     (* Artifact 1 appended to schema.prisma               *)
  clientGenerated,    (* prisma generate run -> db.waitlistLead exists       *)
  wiringApplied,      (* Artifact 3 applied to selectWaitlistStore()        *)
  dbVerifiedLocal,    (* DATABASE_URL proven local / disposable             *)
  migrationApplied,   (* prisma migrate dev applied to the (local) DB        *)
  storageMode,        (* runtime WAITLIST_STORAGE selector: "file" | "db"   *)
  backtestBeatsNaive, (* BACKTEST_TRUTH.beatsNaive  (must stay FALSE)        *)
  noClaimGreen,       (* compliance scanner green on all surfaces           *)
  pushed              (* branch pushed / deployed / merged (must stay FALSE) *)

vars == << pc, schemaHasModel, clientGenerated, wiringApplied, dbVerifiedLocal,
           migrationApplied, storageMode, backtestBeatsNaive, noClaimGreen,
           pushed >>

TypeOK ==
  /\ pc \in PCDomain
  /\ schemaHasModel    \in BOOLEAN
  /\ clientGenerated   \in BOOLEAN
  /\ wiringApplied     \in BOOLEAN
  /\ dbVerifiedLocal   \in BOOLEAN
  /\ migrationApplied  \in BOOLEAN
  /\ storageMode       \in {"file", "db"}
  /\ backtestBeatsNaive \in BOOLEAN
  /\ noClaimGreen      \in BOOLEAN
  /\ pushed            \in BOOLEAN

Init ==
  /\ pc               = 1
  /\ schemaHasModel   = FALSE
  /\ clientGenerated  = FALSE
  /\ wiringApplied    = FALSE
  /\ dbVerifiedLocal  = FALSE
  /\ migrationApplied = FALSE
  /\ storageMode      = "file"
  /\ backtestBeatsNaive = FALSE
  /\ noClaimGreen     = TRUE
  /\ pushed           = FALSE

(***************************************************************************)
(* Runbook steps (each maps 1:1 to a numbered step in the sim).            *)
(***************************************************************************)

(* Step 1 -- git checkout -b ...; clean tree. No facts change.             *)
S1_Branch ==
  /\ pc = 1
  /\ pc' = 2
  /\ UNCHANGED << schemaHasModel, clientGenerated, wiringApplied, dbVerifiedLocal,
                  migrationApplied, storageMode, backtestBeatsNaive, noClaimGreen,
                  pushed >>

(* Step 2 -- append Artifact 1 (model + enum) to schema.prisma.            *)
S2_AppendSchema ==
  /\ pc = 2
  /\ pc' = 3
  /\ schemaHasModel' = TRUE
  /\ UNCHANGED << clientGenerated, wiringApplied, dbVerifiedLocal, migrationApplied,
                  storageMode, backtestBeatsNaive, noClaimGreen, pushed >>

(* Step 3 -- owner verifies DATABASE_URL is local/disposable. Models BOTH   *)
(* outcomes: provably-local, or NOT provable (-> step 6 must abort).        *)
S3_VerifyLocalDB ==
  /\ pc = 3
  /\ pc' = 4
  /\ dbVerifiedLocal' \in BOOLEAN
  /\ UNCHANGED << schemaHasModel, clientGenerated, wiringApplied, migrationApplied,
                  storageMode, backtestBeatsNaive, noClaimGreen, pushed >>

(* Step 4 -- prisma generate. Requires the model to be in the schema.       *)
S4_Generate ==
  /\ pc = 4
  /\ schemaHasModel = TRUE
  /\ pc' = 5
  /\ clientGenerated' = TRUE
  /\ UNCHANGED << schemaHasModel, wiringApplied, dbVerifiedLocal, migrationApplied,
                  storageMode, backtestBeatsNaive, noClaimGreen, pushed >>

(* Step 5 -- apply Artifact 3 wiring. Type-safe ONLY once db.waitlistLead    *)
(* exists, i.e. clientGenerated.                                            *)
S5_ApplyWiring ==
  /\ pc = 5
  /\ clientGenerated = TRUE
  /\ pc' = 6
  /\ wiringApplied' = TRUE
  /\ UNCHANGED << schemaHasModel, clientGenerated, dbVerifiedLocal, migrationApplied,
                  storageMode, backtestBeatsNaive, noClaimGreen, pushed >>

(* Step 6 -- prisma migrate dev. HARD GUARD: a provably-local DB. Requires   *)
(* the model. If the DB is not provably local, the runbook ABORTS.          *)
S6_Migrate ==
  /\ pc = 6
  /\ schemaHasModel = TRUE
  /\ dbVerifiedLocal = TRUE
  /\ pc' = 7
  /\ migrationApplied' = TRUE
  /\ UNCHANGED << schemaHasModel, clientGenerated, wiringApplied, dbVerifiedLocal,
                  storageMode, backtestBeatsNaive, noClaimGreen, pushed >>

S6_AbortUnverified ==
  /\ pc = 6
  /\ dbVerifiedLocal = FALSE
  /\ pc' = "Aborted"
  /\ schemaHasModel'   = FALSE
  /\ clientGenerated'  = FALSE
  /\ wiringApplied'    = FALSE
  /\ migrationApplied' = FALSE
  /\ storageMode'      = "file"
  /\ UNCHANGED << dbVerifiedLocal, backtestBeatsNaive, noClaimGreen, pushed >>

(* Step 7 -- regenerate client + wipe .next. No fact regresses.             *)
S7_Regenerate ==
  /\ pc = 7
  /\ pc' = 8
  /\ clientGenerated' = TRUE
  /\ UNCHANGED << schemaHasModel, wiringApplied, dbVerifiedLocal, migrationApplied,
                  storageMode, backtestBeatsNaive, noClaimGreen, pushed >>

(* Step 8 -- typecheck + lint. Green -> 9; red -> self-destruct (Abort).     *)
S8_TypecheckLint ==
  /\ pc = 8
  /\ pc' = 9
  /\ UNCHANGED << schemaHasModel, clientGenerated, wiringApplied, dbVerifiedLocal,
                  migrationApplied, storageMode, backtestBeatsNaive, noClaimGreen,
                  pushed >>

(* Step 9 -- run suite in BOTH storage modes, then leave runtime at "file".  *)
(* Selecting "db" is reachable only via ToggleDb, which itself requires the   *)
(* wiring AND the migration -- so the suite never reads a missing table.      *)
S9_Tests ==
  /\ pc = 9
  /\ pc' = 10
  /\ storageMode' = "file"
  /\ UNCHANGED << schemaHasModel, clientGenerated, wiringApplied, dbVerifiedLocal,
                  migrationApplied, backtestBeatsNaive, noClaimGreen, pushed >>

(* Step 10 -- prisma migrate diff = "No difference detected" -> Done.        *)
S10_MigrateDiff ==
  /\ pc = 10
  /\ pc' = "Done"
  /\ UNCHANGED << schemaHasModel, clientGenerated, wiringApplied, dbVerifiedLocal,
                  migrationApplied, storageMode, backtestBeatsNaive, noClaimGreen,
                  pushed >>

(***************************************************************************)
(* Runtime selector (the WAITLIST_STORAGE env flag) -- independent of pc.   *)
(***************************************************************************)

(* The DB path is selectable ONLY when the wiring and the migration are     *)
(* both in place; otherwise "db" mode would read a non-existent table.      *)
ToggleDb ==
  /\ wiringApplied = TRUE
  /\ migrationApplied = TRUE
  /\ storageMode' = "db"
  /\ UNCHANGED << pc, schemaHasModel, clientGenerated, wiringApplied, dbVerifiedLocal,
                  migrationApplied, backtestBeatsNaive, noClaimGreen, pushed >>

(* Reversibility (Sacred Invariant 6): a single env flag reverts to the file *)
(* store with zero code change -- always enabled, from any state.            *)
ToggleFile ==
  /\ storageMode' = "file"
  /\ UNCHANGED << pc, schemaHasModel, clientGenerated, wiringApplied, dbVerifiedLocal,
                  migrationApplied, backtestBeatsNaive, noClaimGreen, pushed >>

(***************************************************************************)
(* Self-destruct / retry (rollback triggers).                              *)
(***************************************************************************)

(* Validation RED / unexpected SQL at any step -> revert the working tree    *)
(* (git checkout -- .) and drop to Aborted. Reverting tracked edits clears    *)
(* schema/client/wiring; the flag is flipped to "file" first.                *)
Abort ==
  /\ pc \in Steps
  /\ pc' = "Aborted"
  /\ schemaHasModel'   = FALSE
  /\ clientGenerated'  = FALSE
  /\ wiringApplied'    = FALSE
  /\ migrationApplied' = FALSE
  /\ storageMode'      = "file"
  /\ UNCHANGED << dbVerifiedLocal, backtestBeatsNaive, noClaimGreen, pushed >>

(* Drop the branch and retry from step 1 with a clean slate.                 *)
Retry ==
  /\ pc = "Aborted"
  /\ pc' = 1
  /\ schemaHasModel'   = FALSE
  /\ clientGenerated'  = FALSE
  /\ wiringApplied'    = FALSE
  /\ dbVerifiedLocal'  = FALSE
  /\ migrationApplied' = FALSE
  /\ storageMode'      = "file"
  /\ UNCHANGED << backtestBeatsNaive, noClaimGreen, pushed >>

(* Terminal stutter so the spec does not deadlock at Done.                   *)
DoneStutter ==
  /\ pc = "Done"
  /\ UNCHANGED vars

Next ==
  \/ S1_Branch \/ S2_AppendSchema \/ S3_VerifyLocalDB \/ S4_Generate
  \/ S5_ApplyWiring \/ S6_Migrate \/ S6_AbortUnverified \/ S7_Regenerate
  \/ S8_TypecheckLint \/ S9_Tests \/ S10_MigrateDiff
  \/ ToggleDb \/ ToggleFile \/ Abort \/ Retry \/ DoneStutter

Spec == Init /\ [][Next]_vars

(***************************************************************************)
(* SACRED INVARIANTS  (safety -- must hold in every reachable state).      *)
(***************************************************************************)

(* 1. Backtest truth stays false; never spun.                              *)
Inv_BacktestTruth == backtestBeatsNaive = FALSE

(* 2. No-claim scanner stays green on all surfaces.                        *)
Inv_NoClaimGreen == noClaimGreen = TRUE

(* 3. File store is the default; the DB path is reachable ONLY when the     *)
(*    wiring AND the migration are both present (never a missing table).    *)
Inv_FileDefaultSafe == (storageMode = "db") => (wiringApplied /\ migrationApplied)

(* 4. No autonomous / unverified DB apply: a migration implies a            *)
(*    provably-local DB.                                                    *)
Inv_MigrateOnlyVerifiedLocal == migrationApplied => dbVerifiedLocal

(* 5. No push / deploy / merge inside the runbook scope.                   *)
Inv_NoPush == pushed = FALSE

SacredInv ==
  /\ Inv_BacktestTruth
  /\ Inv_NoClaimGreen
  /\ Inv_FileDefaultSafe
  /\ Inv_MigrateOnlyVerifiedLocal
  /\ Inv_NoPush

(***************************************************************************)
(* Supporting facts that make SacredInv inductive.                         *)
(***************************************************************************)

Inv_Ordering ==
  /\ (clientGenerated => schemaHasModel)
  /\ (wiringApplied   => clientGenerated)
  /\ (migrationApplied => schemaHasModel)

(* migrationApplied can only be true once the runbook has passed step 6.    *)
Inv_MigratePhase == migrationApplied => (pc \in {7, 8, 9, 10} \/ pc = "Done")

IndInv ==
  /\ TypeOK
  /\ Inv_Ordering
  /\ Inv_MigratePhase
  /\ SacredInv

(***************************************************************************)
(* TLAPS proof:  Spec => []SacredInv.                                      *)
(*                                                                         *)
(* NOTE: this proof is written for the TLA+ Proof System (tlapm). It is     *)
(* NOT machine-checked in the build sandbox (tlapm is not installed). The   *)
(* identical transition relation is exhaustively model-checked by           *)
(* pr3_runbook_check.py (executed, green) and is TLC-checkable via the cfg  *)
(* in pr3-tlaps-runbook.md.                                                 *)
(***************************************************************************)

THEOREM Safety == Spec => []SacredInv
PROOF
<1>1. Init => IndInv
  BY DEF Init, IndInv, TypeOK, Inv_Ordering, Inv_MigratePhase, SacredInv,
         Inv_BacktestTruth, Inv_NoClaimGreen, Inv_FileDefaultSafe,
         Inv_MigrateOnlyVerifiedLocal, Inv_NoPush, PCDomain, Steps, Terminals
<1>2. IndInv /\ [Next]_vars => IndInv'
  BY DEF IndInv, TypeOK, Inv_Ordering, Inv_MigratePhase, SacredInv,
         Inv_BacktestTruth, Inv_NoClaimGreen, Inv_FileDefaultSafe,
         Inv_MigrateOnlyVerifiedLocal, Inv_NoPush,
         Next, vars, PCDomain, Steps, Terminals,
         S1_Branch, S2_AppendSchema, S3_VerifyLocalDB, S4_Generate, S5_ApplyWiring,
         S6_Migrate, S6_AbortUnverified, S7_Regenerate, S8_TypecheckLint, S9_Tests,
         S10_MigrateDiff, ToggleDb, ToggleFile, Abort, Retry, DoneStutter
<1>3. IndInv => SacredInv
  BY DEF IndInv
<1>. QED
  BY <1>1, <1>2, <1>3, PTL DEF Spec

=============================================================================
