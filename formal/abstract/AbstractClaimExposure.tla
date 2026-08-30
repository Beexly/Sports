--------------------------- MODULE AbstractClaimExposure ---------------------------
(***************************************************************************)
(* SEED-OF-ALPHA ABSTRACT SPEC (Track A follow-on, standalone formal work; *)
(* not part of PR #181 itself).                                            *)
(*                                                                          *)
(* This module is the PURE TLA+ formalization of the abstract control-     *)
(* state shape that `apps/web/lib/ai-control-plane/srqc-projection.ts`     *)
(* already implements in real TypeScript (this same worktree, PR #181's    *)
(* Track A):                                                               *)
(*                                                                          *)
(*   type ClaimPhase = "OPEN" | "TERMINAL";                                *)
(*   type ExposurePhase = "NONE" | "HELD" | "AMBIGUOUS_HELD";              *)
(*   type PendingCountClass = "ZERO" | "ONE" | "GE2";                      *)
(*   interface AbstractControlState {                                      *)
(*     invocationId: string;                                               *)
(*     claimPhase: ClaimPhase;                                             *)
(*     exposurePhase: ExposurePhase;                                       *)
(*     pendingCountClass: PendingCountClass;                               *)
(*     fingerprintBound: boolean;                                          *)
(*     hasRejectedFp: boolean;                                             *)
(*   }                                                                     *)
(*                                                                          *)
(* `invocationId` is not modeled here: this module is the shape of the     *)
(* abstract state for a SINGLE invocation (matching srqc-projection.ts's   *)
(* per-invocation fold — `projectWindow` produces one AbstractControlState  *)
(* PER invocation id, independently of every other invocation). The        *)
(* refinement mapping in LiveModelRefinesAbstract.tla fixes one concrete   *)
(* invocation id and projects the (multi-invocation) composed spec's state *)
(* down through this per-invocation lens — see that module's header.       *)
(*                                                                          *)
(* RECONCILIATION WITH THE HANDOFF INSTRUCTION: the original handoff note  *)
(* described pendingCountClass informally as "∈ {0,1,2}". The REAL         *)
(* implemented runtime type (srqc-projection.ts, quoted above) is the      *)
(* 3-way STRING enum {"ZERO","ONE","GE2"}, not a numeric domain — GE2 is a *)
(* first-class abstract value (the forbidden class witnessed by inductive  *)
(* CTI #1 for InvocationClaim, `AtMostOnePendingPerInvocation`), never a   *)
(* saturating count. This module uses the string enum, exactly matching    *)
(* the TypeScript source, and never collapses/normalizes GE2 away in       *)
(* either IndInv_alpha or Next.                                            *)
(*                                                                          *)
(* NO CONSTANTS: unlike the base InvocationClaim/CreditReservation specs,  *)
(* this is a single-invocation, purely-enumerated abstract domain (72      *)
(* total typed states: 2 x 3 x 3 x 2 x 2) — small enough for TLC to        *)
(* enumerate and close exhaustively with no bounded-id constants at all.   *)
(*                                                                          *)
(* NEXT relation: mirrors the SAFETY-RELEVANT actions of the composed      *)
(* spec `live-sports/LiveModelDispatchUnderAmbiguity.tla` (itself          *)
(* INSTANCE-composing InvocationClaim + CreditReservation), restricted to  *)
(* exactly the actions that move one of these 5 abstract variables, for    *)
(* ONE invocation's shape:                                                 *)
(*   - ClaimBind            <- IC!ClaimOwner (first-bind branch)           *)
(*   - ClaimRejectFp        <- IC!ClaimOwner (fingerprint-conflict branch) *)
(*   - StartAttempt         <- IC!Dispatch composed under                  *)
(*                             DispatchUnderExposureHold                   *)
(*   - ResolveSucceeded     <- IC!Resolve(att,"Succeeded")                 *)
(*   - ResolveFailed        <- IC!Resolve(att,"Failed")                    *)
(*   - ResolveAmbiguous     <- IC!Resolve(att,"Ambiguous")                 *)
(*   - ClearHeldExposure    <- CR!Settle / CR!Release, composed as         *)
(*                             SettleOnConfirmedCharge /                   *)
(*                             ReleaseOnCleanFailure (both collapse to the  *)
(*                             same abstract effect: HELD -> NONE, exactly *)
(*                             matching srqc-projection.ts's own collapse  *)
(*                             of any non-Ambiguous FINALIZED_* event to    *)
(*                             `exposure = "NONE"`)                        *)
(*   - TrustedReleaseAmbiguous <- TrustedReleaseAmbiguousHold               *)
(*                                                                          *)
(* Not mirrored (do not change any of the 5 abstract variables, so they    *)
(* are pure stutters at this abstraction level): ReleaseClaimBeforeDispatch*)
(* (claimOwner only), AuthorizeExposure while the authorized attempt is    *)
(* not yet attached to this invocation (see LiveModelRefinesAbstract.tla's *)
(* header for why this is always a stutter here), and any ClaimForDispatch *)
(* re-claim under an ALREADY-bound, matching fingerprint (claimOwner only).*)
(***************************************************************************)
EXTENDS TLC

VARIABLES
    claimPhase,         \* "OPEN" | "TERMINAL"
    exposurePhase,       \* "NONE" | "HELD" | "AMBIGUOUS_HELD"
    pendingCountClass,   \* "ZERO" | "ONE" | "GE2"
    fingerprintBound,    \* BOOLEAN
    hasRejectedFp        \* BOOLEAN

vars == <<claimPhase, exposurePhase, pendingCountClass, fingerprintBound, hasRejectedFp>>

ClaimPhaseDomain == {"OPEN", "TERMINAL"}
ExposurePhaseDomain == {"NONE", "HELD", "AMBIGUOUS_HELD"}
PendingCountClassDomain == {"ZERO", "ONE", "GE2"}

TypeOK ==
    /\ claimPhase \in ClaimPhaseDomain
    /\ exposurePhase \in ExposurePhaseDomain
    /\ pendingCountClass \in PendingCountClassDomain
    /\ fingerprintBound \in BOOLEAN
    /\ hasRejectedFp \in BOOLEAN

Init ==
    /\ claimPhase = "OPEN"
    /\ exposurePhase = "NONE"
    /\ pendingCountClass = "ZERO"
    /\ fingerprintBound = FALSE
    /\ hasRejectedFp = FALSE

(* ------------------------------------------------------------------ *)
(* ClaimBind: first successful claim binds the fingerprint. Mirrors    *)
(* IC!ClaimOwner's "id never seen before" branch                       *)
(* (invocationFp[inv] = NoFp -> fp). Requires the claim still Open (no  *)
(* concrete Dispatch/finalize could have happened before a claim).     *)
(* ------------------------------------------------------------------ *)
ClaimBind ==
    /\ claimPhase = "OPEN"
    /\ ~fingerprintBound
    /\ fingerprintBound' = TRUE
    /\ UNCHANGED <<claimPhase, exposurePhase, pendingCountClass, hasRejectedFp>>

(* ------------------------------------------------------------------ *)
(* ClaimRejectFp: a later claim for the SAME invocation id carrying a  *)
(* DIFFERENT fingerprint is rejected. Mirrors IC!ClaimOwner's mismatch *)
(* branch (invocationFp[inv] # NoFp /\ invocationFp[inv] # fp).        *)
(* Requires fingerprintBound already TRUE — a reject can only ever     *)
(* happen against an id that is already bound to something.            *)
(* ------------------------------------------------------------------ *)
ClaimRejectFp ==
    /\ claimPhase = "OPEN"
    /\ fingerprintBound
    /\ hasRejectedFp' = TRUE
    /\ UNCHANGED <<claimPhase, exposurePhase, pendingCountClass, fingerprintBound>>

(* ------------------------------------------------------------------ *)
(* StartAttempt: mirrors DispatchUnderExposureHold (IC!Dispatch gated  *)
(* on an already-authorized credit hold, state[att] = "HELD"). Guarded *)
(* by pendingCountClass = "ZERO" — the abstract form of IC!Dispatch's   *)
(* "no other attempt outstanding for this invocation" guard, i.e. the   *)
(* sequential provider-route walk — so GE2 is NEVER produced by this   *)
(* (or any other) action: no disjunct of Next ever writes the literal   *)
(* "GE2" into pendingCountClass. exposurePhase becomes "HELD" only if   *)
(* it was previously "NONE" (the concrete credit-authorize step that    *)
(* actually flips state[att] to HELD is a separate, decoupled action    *)
(* that is a pure stutter at this abstraction level until the attempt   *)
(* is actually attached to this invocation via Dispatch — see           *)
(* LiveModelRefinesAbstract.tla); if a stale unreleased hold from an     *)
(* earlier attempt on the same invocation already reads HELD (or        *)
(* AMBIGUOUS_HELD, though that combination is unreachable together with *)
(* claimPhase = "OPEN"), it is left unchanged.                          *)
(* ------------------------------------------------------------------ *)
StartAttempt ==
    /\ claimPhase = "OPEN"
    /\ fingerprintBound
    /\ pendingCountClass = "ZERO"
    /\ pendingCountClass' = "ONE"
    /\ exposurePhase' = IF exposurePhase = "NONE" THEN "HELD" ELSE exposurePhase
    /\ UNCHANGED <<claimPhase, fingerprintBound, hasRejectedFp>>

(* ------------------------------------------------------------------ *)
(* ResolveSucceeded / ResolveFailed / ResolveAmbiguous: mirror          *)
(* IC!Resolve(att, outcome) for the sole Pending attempt (there is at   *)
(* most one, by AtMostOnePendingPerInvocation / pendingCountClass       *)
(* never reaching GE2). The credit-ledger `state[att]` var is untouched *)
(* by IC!Resolve in the composed spec (Settle/Release are separate,     *)
(* decoupled actions — see ClearHeldExposure below), so exposurePhase   *)
(* is UNCHANGED by Succeeded/Failed. Ambiguous is the one case where     *)
(* Resolve itself flips exposurePhase, because the abstract exposure    *)
(* formula depends on the PAIR (attemptOutcome, state) — see             *)
(* LiveModelRefinesAbstract.tla's AlphaExposurePhase — and              *)
(* attemptOutcome flipping to "Ambiguous" while state stays "HELD" is    *)
(* exactly what turns "HELD" into "AMBIGUOUS_HELD" with no separate      *)
(* credit-ledger action needed.                                         *)
(* ------------------------------------------------------------------ *)
ResolveSucceeded ==
    /\ claimPhase = "OPEN"
    /\ pendingCountClass = "ONE"
    /\ pendingCountClass' = "ZERO"
    /\ claimPhase' = "TERMINAL"
    /\ UNCHANGED <<exposurePhase, fingerprintBound, hasRejectedFp>>

ResolveFailed ==
    /\ claimPhase = "OPEN"
    /\ pendingCountClass = "ONE"
    /\ pendingCountClass' = "ZERO"
    /\ UNCHANGED <<claimPhase, exposurePhase, fingerprintBound, hasRejectedFp>>

ResolveAmbiguous ==
    /\ claimPhase = "OPEN"
    /\ pendingCountClass = "ONE"
    /\ exposurePhase = "HELD"
    /\ pendingCountClass' = "ZERO"
    /\ claimPhase' = "TERMINAL"
    /\ exposurePhase' = "AMBIGUOUS_HELD"
    /\ UNCHANGED <<fingerprintBound, hasRejectedFp>>

(* ------------------------------------------------------------------ *)
(* ClearHeldExposure: mirrors BOTH SettleOnConfirmedCharge (gated on a  *)
(* Succeeded outcome) and ReleaseOnCleanFailure (gated on a Failed      *)
(* outcome) — the two base-module CreditReservation actions that move   *)
(* a HELD credit hold out of HELD for a non-ambiguous outcome.          *)
(*                                                                      *)
(* NONDETERMINISTIC EFFECT (found by TLC step-simulation against the    *)
(* concrete spec — see LiveModelRefinesAbstract.tla's header and the    *)
(* real 9-step counterexample preserved in                              *)
(* ABSTRACT_STRENGTHENING_LOG.md): the concrete invocation can carry     *)
(* MORE THAN ONE attempt whose credit hold is still HELD at once — e.g.  *)
(* an earlier attempt that resolved Failed/Succeeded but has not yet     *)
(* been separately Settled/Released sitting alongside a freshly          *)
(* dispatched attempt. Clearing ONE such hold therefore leaves the       *)
(* abstract exposurePhase at "NONE" only if it was the LAST one; if a    *)
(* different attempt for the same invocation is still HELD, the         *)
(* abstract exposurePhase correctly stays "HELD". This abstraction does  *)
(* not track per-attempt detail, so both concrete outcomes are exposed   *)
(* as a nondeterministic choice at this level (never "AMBIGUOUS_HELD":   *)
(* clearing a non-ambiguous hold can never conjure an ambiguous one).    *)
(* ------------------------------------------------------------------ *)
ClearHeldExposure ==
    /\ exposurePhase = "HELD"
    /\ exposurePhase' \in {"NONE", "HELD"}
    /\ UNCHANGED <<claimPhase, pendingCountClass, fingerprintBound, hasRejectedFp>>

(* ------------------------------------------------------------------ *)
(* TrustedReleaseAmbiguous: mirrors TrustedReleaseAmbiguousHold, the    *)
(* ONLY way an AMBIGUOUS_HELD exposure can ever leave that state —      *)
(* requires an explicit trusted actor in the concrete spec (not         *)
(* modeled here: this abstract domain has no Actors variable at all;    *)
(* the guard/actor-identity detail is exactly what the concrete spec    *)
(* still carries and this abstraction intentionally drops, matching the *)
(* seed AbstractControlState shape, which likewise carries no actor     *)
(* field). This action's EXISTENCE (an AMBIGUOUS_HELD exposure can      *)
(* transition away from AMBIGUOUS_HELD at all) is what this abstraction *)
(* keeps; WHO may cause it is out of scope at this abstraction level.   *)
(*                                                                      *)
(* NONDETERMINISTIC EFFECT (same real CTI as ClearHeldExposure above —  *)
(* found by TLC step-simulation, preserved verbatim in                  *)
(* ABSTRACT_STRENGTHENING_LOG.md): releasing the ambiguous hold does     *)
(* NOT always drop exposure to "NONE". The concrete trace found is a     *)
(* single invocation carrying attempt a1 (Ambiguous, HELD) AND attempt   *)
(* a2 (Failed, still HELD — never separately released) at once;          *)
(* TrustedReleaseAmbiguousHold(a1) clears exactly a1's hold, and the     *)
(* abstract exposure formula (dominated by the Ambiguous+HELD witness    *)
(* only while one exists) correctly re-reads "HELD" afterward, via a2 —  *)
(* NOT "NONE". This abstraction cannot distinguish that case from the    *)
(* "a1 was the only hold" case without per-attempt detail it does not    *)
(* track, so both are exposed as a nondeterministic choice.              *)
(* ------------------------------------------------------------------ *)
TrustedReleaseAmbiguous ==
    /\ exposurePhase = "AMBIGUOUS_HELD"
    /\ exposurePhase' \in {"NONE", "HELD"}
    /\ UNCHANGED <<claimPhase, pendingCountClass, fingerprintBound, hasRejectedFp>>

Next ==
    \/ ClaimBind
    \/ ClaimRejectFp
    \/ StartAttempt
    \/ ResolveSucceeded
    \/ ResolveFailed
    \/ ResolveAmbiguous
    \/ ClearHeldExposure
    \/ TrustedReleaseAmbiguous

Spec == Init /\ [][Next]_vars

(***************************************************************************)
(* CANDIDATE INDUCTIVE INVARIANT (checked by TLC — see                     *)
(* AbstractClaimExposureInductive.cfg / ABSTRACT_STRENGTHENING_LOG.md for  *)
(* the real CTI loop that produced this candidate).                        *)
(***************************************************************************)

(* Abstract form of AtMostOnePendingPerInvocation (InvocationClaim         *)
(* inductive glue): GE2 is the forbidden class. Stated as its own named    *)
(* invariant (not folded into TypeOK) because it is the semantically       *)
(* meaningful property under test, matching the house style of the base    *)
(* modules' *Inductive.tla files.                                          *)
NeverGE2 == pendingCountClass # "GE2"

(* Abstract form of RejectedImpliesBound (InvocationClaim inductive        *)
(* glue): a rejected-fingerprint witness can only ever be recorded         *)
(* against an id that is already bound to SOME fingerprint.                *)
RejectedImpliesBoundAlpha == hasRejectedFp => fingerprintBound

(* Abstract form of AmbiguousExposureHeldUntilTrustedResolution's "held"    *)
(* half (LiveModelDispatchUnderAmbiguity's flagship composed invariant):    *)
(* an AMBIGUOUS_HELD exposure can only ever coexist with a claim that has   *)
(* already gone TERMINAL — the concrete Resolve(att,"Ambiguous") action     *)
(* freezes invocationStatus to "Ambiguous" in the SAME step that creates    *)
(* the ambiguous hold, and nothing ever moves a frozen invocation back to   *)
(* Open, so the two facts are never separated in any reachable state.       *)
AmbiguousHeldImpliesTerminal ==
    exposurePhase = "AMBIGUOUS_HELD" => claimPhase = "TERMINAL"

IndInv_alpha ==
    /\ TypeOK
    /\ NeverGE2
    /\ RejectedImpliesBoundAlpha
    /\ AmbiguousHeldImpliesTerminal

InitIndInv_alpha == IndInv_alpha

=============================================================================
