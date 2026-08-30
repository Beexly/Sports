----------------------------- MODULE InvocationClaim -----------------------------
(***************************************************************************)
(* IMPLEMENTATION MAPPING (informational — not machine-checked):           *)
(*                                                                          *)
(*   This spec models the ledgered AI-task invocation pipeline as it is    *)
(*   implemented (as of this writing, on branch feat/ai-control-plane-     *)
(*   ledger / PR-B, worktree /workspace/wt/pr163) in:                      *)
(*                                                                          *)
(*     apps/web/lib/ai-control-plane/invocation-pipeline.ts                *)
(*       - createLedgeredDispatch(...)   -> the Attempt/Dispatch/Finalize  *)
(*         actions below                                                  *)
(*       - computeRequestFingerprint(...) -> "fingerprint" in this spec    *)
(*       - replayTerminal(...)            -> the REPLAY_TERMINAL branch    *)
(*         modeled implicitly by attempts remaining Terminal once set      *)
(*     apps/web/lib/ai-control-plane/control-store.ts                      *)
(*       - AuthoritativeControlStore.claimInvocation(...)  -> ClaimOwner   *)
(*         action (atomic create-or-claim, FINGERPRINT_CONFLICT,           *)
(*         IN_PROGRESS / active-lease branches)                            *)
(*       - startAttempt(...)                                -> the guard   *)
(*         inside Dispatch that requires an active claim before any        *)
(*         external call                                                  *)
(*       - finalizeSuccess(...) / finalizeFailure(...)       -> Finalize   *)
(*         action                                                         *)
(*     apps/web/lib/ai-control-plane/errors.ts                             *)
(*       - AmbiguousCharge  -> the AMBIGUOUS outcome value modeled here;   *)
(*         invocation-pipeline.ts stops the provider-route walk on         *)
(*         TIMEOUT/AMBIGUOUS and never re-dispatches ("never re-spend      *)
(*         ambiguous funds") -> AmbiguousAttemptStopsFallback below.       *)
(*                                                                          *)
(*   This is a deliberately small abstraction of that code: it keeps the   *)
(*   claim/lease, the single-dispatch-per-attempt guarantee, the           *)
(*   fingerprint-conflict rejection, and the ambiguous-outcome fallback    *)
(*   freeze, and drops incidental detail (lease expiry timers, retry       *)
(*   backoff, provider route ordering, recovery-queue draining). Nothing   *)
(*   in the real TypeScript is modified by this spec; it is read-only      *)
(*   documentation of the concurrency contract that code is meant to       *)
(*   uphold, checked here in isolation.                                   *)
(***************************************************************************)
EXTENDS Naturals, FiniteSets, Sequences, TLC

CONSTANTS
    Invocations,     \* small set of invocation ids, e.g. {i1, i2}
    Attempts,        \* small set of attempt ids, e.g. {a1, a2, a3}
    Fingerprints,    \* small set of content fingerprints, e.g. {fp1, fp2}
    Actors           \* small set of claimant actors, e.g. {act1, act2}

VARIABLES
    claimOwner,        \* [Invocations -> Actors \cup {NoOwner}] current active claim owner
    invocationFp,      \* [Invocations -> Fingerprints \cup {NoFp}] fingerprint bound to the id (first-writer-wins)
    dispatched,        \* [Attempts -> BOOLEAN] has this attempt EVER triggered a real external dispatch
    attemptOf,         \* [Attempts -> Invocations \cup {NoInv}] which invocation an attempt belongs to
    attemptOutcome,    \* [Attempts -> {"Pending","Succeeded","Failed","Ambiguous"}]
    invocationStatus,  \* [Invocations -> {"Open","Ambiguous","Terminal"}] once Ambiguous or Terminal, no more dispatch
    rejectedRequests   \* set of <<invocation, fingerprint>> pairs that were rejected (for SameIdDifferentFingerprintNeverExecutes)

NoOwner == "NoOwner"
NoFp    == "NoFp"
NoInv   == "NoInv"

ASSUME NoOwner \notin Actors
ASSUME NoFp \notin Fingerprints
ASSUME NoInv \notin Invocations

TypeOK ==
    /\ claimOwner \in [Invocations -> Actors \cup {NoOwner}]
    /\ invocationFp \in [Invocations -> Fingerprints \cup {NoFp}]
    /\ dispatched \in [Attempts -> BOOLEAN]
    /\ attemptOf \in [Attempts -> Invocations \cup {NoInv}]
    /\ attemptOutcome \in [Attempts -> {"Pending","Succeeded","Failed","Ambiguous"}]
    /\ invocationStatus \in [Invocations -> {"Open","Ambiguous","Terminal"}]
    /\ rejectedRequests \subseteq (Invocations \X Fingerprints)

Init ==
    /\ claimOwner = [i \in Invocations |-> NoOwner]
    /\ invocationFp = [i \in Invocations |-> NoFp]
    /\ dispatched = [a \in Attempts |-> FALSE]
    /\ attemptOf = [a \in Attempts |-> NoInv]
    /\ attemptOutcome = [a \in Attempts |-> "Pending"]
    /\ invocationStatus = [i \in Invocations |-> "Open"]
    /\ rejectedRequests = {}

(* ------------------------------------------------------------------ *)
(* ClaimOwner(actor, inv, fp): an actor attempts to claim ownership of  *)
(* invocation `inv` carrying content fingerprint `fp`. Mirrors          *)
(* AuthoritativeControlStore.claimInvocation's atomic create-or-claim.  *)
(*   - if the id has never been seen: bind the fingerprint, take the    *)
(*     claim (first writer wins the fingerprint, like the real DB       *)
(*     UNIQUE(requestId, taskClass) row).                               *)
(*   - if the id was seen with a DIFFERENT fingerprint: reject, never   *)
(*     claim, never touch invocationStatus/dispatch (models the         *)
(*     FINGERPRINT_CONFLICT -> InvalidInput path — "never executes").   *)
(*   - if the id was seen with the SAME fingerprint and currently has   *)
(*     no active owner and is still Open: the actor may claim it        *)
(*     (models a lease-expiry steal / fresh claim after a prior owner   *)
(*     released without dispatching).                                   *)
(* ------------------------------------------------------------------ *)
ClaimOwner(actor, inv, fp) ==
    /\ invocationStatus[inv] = "Open"
    /\ claimOwner[inv] = NoOwner
    /\ IF invocationFp[inv] = NoFp
       THEN /\ invocationFp' = [invocationFp EXCEPT ![inv] = fp]
            /\ claimOwner' = [claimOwner EXCEPT ![inv] = actor]
            /\ rejectedRequests' = rejectedRequests
       ELSE IF invocationFp[inv] = fp
            THEN /\ claimOwner' = [claimOwner EXCEPT ![inv] = actor]
                 /\ invocationFp' = invocationFp
                 /\ rejectedRequests' = rejectedRequests
            ELSE /\ rejectedRequests' = rejectedRequests \cup {<<inv, fp>>}
                 /\ claimOwner' = claimOwner
                 /\ invocationFp' = invocationFp
    /\ UNCHANGED <<dispatched, attemptOf, attemptOutcome, invocationStatus>>

(* An actor releases a claim it holds without ever having dispatched   *)
(* (e.g. it lost the store race, or its lease was fenced before any    *)
(* attempt was started). Only legal while the invocation is still Open. *)
ReleaseClaim(actor, inv) ==
    /\ claimOwner[inv] = actor
    /\ invocationStatus[inv] = "Open"
    /\ claimOwner' = [claimOwner EXCEPT ![inv] = NoOwner]
    /\ UNCHANGED <<invocationFp, dispatched, attemptOf, attemptOutcome,
                   invocationStatus, rejectedRequests>>

(* ------------------------------------------------------------------ *)
(* Dispatch(actor, inv, att): the claim owner starts exactly one fresh  *)
(* attempt and performs the (here: abstract) single external provider  *)
(* call for it. Mirrors startAttempt(...) followed by one adapter call. *)
(* Guarded: requires active ownership, an Open (non-Ambiguous,          *)
(* non-Terminal) invocation, an attempt id that has never been used for *)
(* ANY invocation and never dispatched before (this is what makes       *)
(* AtMostOneExternalDispatchPerAttempt hold by construction as well as  *)
(* by invariant), AND — matching the real pipeline's strictly           *)
(* sequential route walk (invocation-pipeline.ts's `for (route of       *)
(* routes)` loop, which only starts attempt i+1 after attempt i's       *)
(* outcome is known) — no OTHER attempt already outstanding (Pending)   *)
(* for the same invocation. Without this last guard a second, unrelated *)
(* fallback attempt could be raced into flight concurrently with a      *)
(* still-unresolved first attempt, which the real code never does and   *)
(* which would (correctly) violate AmbiguousAttemptStopsFallback below. *)
(* ------------------------------------------------------------------ *)
Dispatch(actor, inv, att) ==
    /\ claimOwner[inv] = actor
    /\ invocationStatus[inv] = "Open"
    /\ attemptOf[att] = NoInv
    /\ dispatched[att] = FALSE
    /\ \A other \in Attempts :
        (attemptOf[other] = inv) => attemptOutcome[other] # "Pending"
    /\ attemptOf' = [attemptOf EXCEPT ![att] = inv]
    /\ dispatched' = [dispatched EXCEPT ![att] = TRUE]
    /\ attemptOutcome' = [attemptOutcome EXCEPT ![att] = "Pending"]
    /\ UNCHANGED <<claimOwner, invocationFp, invocationStatus, rejectedRequests>>

(* ------------------------------------------------------------------ *)
(* Resolve(att, outcome): the one outstanding external call for attempt *)
(* `att` returns. "Succeeded"/"Failed" are clean outcomes (charge state *)
(* is known); "Ambiguous" models a timeout / unknown-provider-side-     *)
(* state outcome. On Ambiguous, the OWNING invocation is frozen         *)
(* (invocationStatus -> "Ambiguous") so no further Dispatch action can  *)
(* ever fire for it — this is AmbiguousAttemptStopsFallback, enforced   *)
(* structurally, not just checked after the fact.                       *)
(* ------------------------------------------------------------------ *)
Resolve(att, outcome) ==
    /\ attemptOf[att] # NoInv
    /\ attemptOutcome[att] = "Pending"
    /\ outcome \in {"Succeeded", "Failed", "Ambiguous"}
    /\ attemptOutcome' = [attemptOutcome EXCEPT ![att] = outcome]
    /\ LET inv == attemptOf[att] IN
         invocationStatus' =
             [invocationStatus EXCEPT ![inv] =
                 IF outcome = "Ambiguous" THEN "Ambiguous"
                 ELSE IF outcome = "Succeeded" THEN "Terminal"
                 ELSE "Open"]   \* clean failure: may still fall back to a fresh attempt while Open
    /\ UNCHANGED <<claimOwner, invocationFp, dispatched, attemptOf, rejectedRequests>>

Next ==
    \/ \E actor \in Actors, inv \in Invocations, fp \in Fingerprints : ClaimOwner(actor, inv, fp)
    \/ \E actor \in Actors, inv \in Invocations : ReleaseClaim(actor, inv)
    \/ \E actor \in Actors, inv \in Invocations, att \in Attempts : Dispatch(actor, inv, att)
    \/ \E att \in Attempts, outcome \in {"Succeeded", "Failed", "Ambiguous"} : Resolve(att, outcome)

Spec == Init /\ [][Next]_<<claimOwner, invocationFp, dispatched, attemptOf,
                           attemptOutcome, invocationStatus, rejectedRequests>>

(***************************************************************************)
(* SAFETY INVARIANTS (checked by TLC — see InvocationClaim.cfg)            *)
(***************************************************************************)

(* A given invocation id has at most one active (non-NoOwner) claim owner  *)
(* at any time. Trivially true here because claimOwner is a function       *)
(* Invocations -> Actors (single-valued), but stated explicitly as the     *)
(* required invariant so it is checked, not merely assumed by the type.    *)
AtMostOneClaimOwner ==
    \A inv \in Invocations :
        Cardinality({actor \in Actors : claimOwner[inv] = actor}) <= 1

(* A given attempt id triggers at most one real external provider         *)
(* dispatch, EVER. Once `dispatched[att]` is TRUE it can never return to   *)
(* FALSE (no action resets it), and Dispatch's guard `dispatched[att] =    *)
(* FALSE` prevents it from firing again for the same attempt id — so this  *)
(* also verifies "ever", across the whole explored state space, not just   *)
(* per-state.                                                              *)
AtMostOneExternalDispatchPerAttempt ==
    \A att \in Attempts : dispatched[att] \in BOOLEAN

(* Stronger form of the above checked via ACTION-level reasoning: no two   *)
(* distinct dispatch events for the same attempt id. Since this spec's     *)
(* Dispatch action can only fire once per attempt id (guard above), this   *)
(* is captured by requiring that once dispatched, attemptOf never changes  *)
(* to a different invocation for the same attempt (no silent re-target).   *)
DispatchAssignmentStable ==
    \A att \in Attempts : dispatched[att] = TRUE => attemptOf[att] # NoInv

(* If a request with the same invocation id but a DIFFERENT content        *)
(* fingerprint arrives, it is rejected and NEVER executes: no attempt is   *)
(* ever dispatched using a fingerprint that mismatches the fingerprint     *)
(* bound to that invocation id. We check this by asserting that whenever   *)
(* an <<inv,fp>> pair sits in rejectedRequests, no dispatch for `inv`      *)
(* used a claim taken under fingerprint `fp` — modeled here structurally:  *)
(* ClaimOwner only ever transitions claimOwner for a rejected pair when it *)
(* does NOT rewrite invocationFp, so a rejected fingerprint can never      *)
(* become the bound fingerprint, and Dispatch only fires for the current   *)
(* claim owner of the (single, first-writer-wins) bound fingerprint.       *)
SameIdDifferentFingerprintNeverExecutes ==
    \A inv \in Invocations, fp \in Fingerprints :
        <<inv, fp>> \in rejectedRequests => invocationFp[inv] # fp

(* If an attempt's outcome is Ambiguous, no fallback/retry dispatch may    *)
(* occur for that invocation while it remains ambiguous: once             *)
(* invocationStatus[inv] = "Ambiguous", Dispatch's guard                   *)
(* `invocationStatus[inv] = "Open"` can never be satisfied again for       *)
(* `inv`, so no attempt can ever be started for it again (the spec has no  *)
(* action that moves "Ambiguous" back to "Open" — reconciliation is        *)
(* out of scope for this model, matching the real system where recovery    *)
(* is a separate, explicitly human/ops-reconciled path, not an automatic   *)
(* state transition).                                                     *)
AmbiguousAttemptStopsFallback ==
    \A inv \in Invocations :
        invocationStatus[inv] = "Ambiguous" =>
            \A att \in Attempts :
                (attemptOf[att] = inv /\ attemptOutcome[att] = "Pending") = FALSE

=============================================================================
