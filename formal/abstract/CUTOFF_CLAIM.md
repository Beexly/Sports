# Cutoff / family claim — `SpecC ⇒ []AtMostOne` for `|InvIds| ≤ N*`

This is the **load-bearing, actually-verified** artifact of the quotient →
cutoff ladder. Every claim here is backed by a real TLC receipt.

## What was machine-checked

`AtMostOneFamily.tla` is the CONTROLLED pending-class quotient system
(`StartControlled(i)` admits a new pending attempt **only** from the `ZERO`
class; `End(i)` drains `GE2 → ONE → ZERO`), generalized over the size of the
invocation-id set `InvIds`. `scripts/formal/run-cutoff-matrix.sh` runs TLC once
per cardinality `n = 1 .. 8`, each an independent exhaustive finite model-check
of

```
SpecC => [](TypeOK /\ AtMostOne)     where AtMostOne == \A i \in InvIds : pendingClass[i] # "GE2"
```

## Result

**N\* = 8.** Every family member `n = 1 .. 8` verified with `No error has been
found`. See `../receipts/cutoff-matrix/summary.txt` and the per-`n` receipts
`../receipts/cutoff-matrix/n1.txt` … `n8.txt`.

| n (`\|InvIds\|`) | states generated | distinct | result |
|---|---|---|---|
| 1 | 3 | 2 | No error |
| 2 | 9 | 4 | No error |
| 3 | 25 | 8 | No error |
| 4 | 65 | 16 | No error |
| 5 | 161 | 32 | No error |
| 6 | 385 | 64 | No error |
| 7 | 897 | 128 | No error |
| 8 | 2049 | 256 | No error |

The distinct-state count is exactly `2^n` at every `n`: under control each
invocation is confined to `{ZERO, ONE}`, so `GE2` is unreachable — this is the
`AtMostOne` invariant, exhaustively confirmed at each cardinality.

## Runtime correspondence

The runtime type `AbstractControlState.pendingCountClass ∈ {"ZERO","ONE","GE2"}`
(produced per invocation by `apps/web/lib/ai-control-plane/srqc-projection.ts`'s
`projectWindow`) **is** this quotient's `PendingClass`, with α(0)=ZERO,
α(1)=ONE, α(k≥2)=GE2 (single absorbing class). The `StartControlled` guard is
the abstract shadow of the runtime admission guard
(`AtMostOnePendingPerInvocation` / `DispatchUnderExposureHold`).

## NON-CLAIM

This is **NOT a TLAPS ∀N theorem; it is a finite cutoff/family evidence pack to
N\*.** Each `n ≤ N*` is checked concretely and exhaustively by TLC. Nothing here
certifies cardinalities above N\*, and no finite bound is proved sound for all
larger instances. The honest deductive target over an arbitrary finite `InvIds`
lives in `AtMostOneParam.tla` — an **unverified** TLAPS target, because tlapm is
unavailable in this environment (see `../TLAPS_DEFERRED.md`, `PARAM_STATUS.md`).
