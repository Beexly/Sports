# Why map n (≈760) ≠ canonicalSettled (≈1017)

## Two different populations (intentional)

| Surface | Population |
|---------|------------|
| **sample.canonicalSettled** | published · !bootstrap · not seed · result ∈ {WIN, LOSS, **PUSH**} |
| **calibration map n** | published · !bootstrap · not seed · result ∈ {**WIN, LOSS**} · **signalSnapshot.eligibleForLearning=true** · finite confidence · used for Brier/ECE |

## Live arithmetic (2026-08-09 probe)

- canonicalSettled **1017** ≈ wins **515** + losses **499** + pushes **3**
- map n **760** = learning-eligible WIN/LOSS with usable confidence
- Gap **~254–257** ≈ W/L rows excluded by `eligibleForLearning=false` and/or missing confidence (not hidden seed rows)

## Integrity rule

Eligibility and public sample both exclude seed/bootstrap. Map n is **stricter** (no PUSH, learning flag). Do not “fix” 760→1017 by dropping `eligibleForLearning`.

## PROVEN

Uses eligibility on **map** metrics (Brier/ECE/Murphy on learning-eligible WIN/LOSS), not raw win rate on 1017.
