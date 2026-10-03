---------------------------- MODULE CreditReservation ----------------------------
(***************************************************************************)
(* IMPLEMENTATION MAPPING (informational — not machine-checked):           *)
(*                                                                          *)
(*   This spec models N concurrent credit-authorization attempts against a *)
(*   single shared, verified balance, as implemented (as of this writing,  *)
(*   on branch feat/ai-control-plane-credit-admission / PR-D, worktree     *)
(*   /workspace/wt/prd) in:                                                *)
(*                                                                          *)
(*     apps/web/lib/ai-control-plane/credit-admission.ts                   *)
(*       - CreditAuthorizationPort.authorize(...)     -> the Authorize     *)
(*         action below                                                   *)
(*       - createPgCreditAuthorizationPort(...)        -> the ONE atomic   *)
(*         conditional UPDATE this module's docstring calls out:           *)
(*             UPDATE credit_grant_reservation_ledger                      *)
(*                SET reservedMinorUnits = reservedMinorUnits + $amount    *)
(*              WHERE grantId = $grant                                     *)
(*                AND reservedMinorUnits + $amount <= $spendableAtAuthTime *)
(*         — never a read-then-write; this is precisely the Authorize      *)
(*         action's single atomic guard/update pair.                       *)
(*       - settle(...) / release(...)                  -> Settle / Release *)
(*         actions below (a HELD reservation resolves exactly once)        *)
(*     apps/web/lib/ai-control-plane/budget.ts                             *)
(*       - reserve(...)  is the analogous cash-cap sibling (per-window     *)
(*         `capUsd` instead of a credit grant's spendable balance); the    *)
(*         SAME atomicity argument (Postgres row-lock serializes           *)
(*         concurrent conditional UPDATEs on the same row) is what this    *)
(*         spec proves in the abstract, bound-checked for both call sites. *)
(*                                                                          *)
(*   FLAGSHIP PROPERTY (governing directive, stated exactly): a verified   *)
(*   balance cannot allow a second paid request to be admitted once the    *)
(*   balance is exhausted — no double-spend; total admitted reservations   *)
(*   never exceed the verified balance at time of admission. See           *)
(*   NeverOverAdmit below.                                                 *)
(*                                                                          *)
(*   This model keeps the essential concurrency shape (N attempts racing   *)
(*   ONE atomic reserve op against ONE shared balance, each hold later     *)
(*   settling or releasing) and drops incidental detail (multi-window      *)
(*   fixed-order acquisition, snapshot admissibility/expiry/coverage       *)
(*   checks, TTL sweep). Nothing in the real TypeScript/SQL is modified;   *)
(*   this is read-only documentation of the concurrency contract that      *)
(*   code is meant to uphold, checked here in isolation.                  *)
(***************************************************************************)
EXTENDS Naturals, FiniteSets, TLC

CONSTANTS
    Attempts,        \* small set of concurrent authorization attempt ids, e.g. {t1,t2,t3,t4}
    VerifiedBalance,  \* the SINGLE shared, verified spendable balance (a small Nat, e.g. 3)
    RequestCost       \* cost of a single admitted request against the balance (a small Nat, e.g. 1)

ASSUME VerifiedBalance \in Nat
ASSUME RequestCost \in Nat \ {0}

VARIABLES
    reserved,     \* Nat: sum of currently HELD + SETTLED reservation amounts (the ledger's reservedMinorUnits)
    state,        \* [Attempts -> {"Unstarted","HELD","SETTLED","RELEASED","REFUSED"}]
    admittedCount \* Nat: count of attempts that were ever admitted (HELD or later) — for the flagship check

TypeOK ==
    /\ reserved \in Nat
    /\ state \in [Attempts -> {"Unstarted", "HELD", "SETTLED", "RELEASED", "REFUSED"}]
    /\ admittedCount \in Nat

Init ==
    /\ reserved = 0
    /\ state = [t \in Attempts |-> "Unstarted"]
    /\ admittedCount = 0

(* ------------------------------------------------------------------ *)
(* Authorize(t): attempt `t` performs the ONE atomic conditional        *)
(* reserve, modeling:                                                   *)
(*     UPDATE ledger SET reserved = reserved + RequestCost              *)
(*     WHERE reserved + RequestCost <= VerifiedBalance                  *)
(* — a SINGLE guarded transition: either the guard holds and `reserved` *)
(* is atomically bumped (HELD, admitted), or it does not and the        *)
(* attempt is REFUSED with ZERO reservation taken (`reserved` UNCHANGED *)
(* — mirrors "the rest see zero rows updated and are refused            *)
(* insufficient-headroom with zero reservation taken"). There is no     *)
(* intermediate "read balance, then decide" step: both branches are the *)
(* SAME atomic action, so no interleaving of two Authorize calls can    *)
(* ever both observe headroom and both admit past capacity.             *)
(* ------------------------------------------------------------------ *)
Authorize(t) ==
    /\ state[t] = "Unstarted"
    /\ IF reserved + RequestCost <= VerifiedBalance
       THEN /\ reserved' = reserved + RequestCost
            /\ state' = [state EXCEPT ![t] = "HELD"]
            /\ admittedCount' = admittedCount + 1
       ELSE /\ reserved' = reserved
            /\ state' = [state EXCEPT ![t] = "REFUSED"]
            /\ admittedCount' = admittedCount

(* A HELD reservation settles with the actual (here: same, worst-case-   *)
(* equal) charge — models settle(...). Terminal: reserved amount stays   *)
(* counted (a settled charge still occupies the balance it consumed).    *)
Settle(t) ==
    /\ state[t] = "HELD"
    /\ state' = [state EXCEPT ![t] = "SETTLED"]
    /\ UNCHANGED <<reserved, admittedCount>>

(* A HELD reservation releases without a charge (invocation never spent) *)
(* — models release(...). Frees the held amount back to the balance so a *)
(* LATER attempt can be admitted; this is the one place `reserved`       *)
(* decreases, and it can only decrease an amount that was legitimately   *)
(* held by exactly this attempt (single-writer per attempt id).          *)
Release(t) ==
    /\ state[t] = "HELD"
    /\ state' = [state EXCEPT ![t] = "RELEASED"]
    /\ reserved' = reserved - RequestCost
    /\ UNCHANGED admittedCount

Next ==
    \/ \E t \in Attempts : Authorize(t)
    \/ \E t \in Attempts : Settle(t)
    \/ \E t \in Attempts : Release(t)

Spec == Init /\ [][Next]_<<reserved, state, admittedCount>>

(***************************************************************************)
(* SAFETY INVARIANTS (checked by TLC — see CreditReservation.cfg)          *)
(***************************************************************************)

(* The ledger's running reserved total never exceeds the verified balance. *)
(* This is the direct arithmetic form of the atomic guard: it must hold in *)
(* EVERY reachable state, not just be true "on average" or "eventually".   *)
LedgerNeverExceedsBalance ==
    reserved <= VerifiedBalance

(* FLAGSHIP PROPERTY, stated exactly as the governing directive:           *)
(* "a verified balance cannot allow a second paid request to be admitted   *)
(* once the balance is exhausted" — i.e. no double-spend; total admitted   *)
(* reservations (currently HELD or SETTLED — money actually committed)     *)
(* never exceed the verified balance at time of admission. RELEASED        *)
(* attempts do not count (their hold was given back and is not a spend);   *)
(* REFUSED attempts never held anything by construction (Authorize's       *)
(* guard). This is the property a naive read-then-write implementation     *)
(* would violate under concurrency (two readers both see headroom, both    *)
(* write) and which the SINGLE atomic conditional UPDATE prevents.         *)
NeverOverAdmit ==
    LET committed == {t \in Attempts : state[t] \in {"HELD", "SETTLED"}} IN
        Cardinality(committed) * RequestCost <= VerifiedBalance

=============================================================================
