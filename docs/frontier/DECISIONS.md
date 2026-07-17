# Frontier Decisions Log

Append-only. Format: ID · date · decision · rationale · reversibility.

- **FD-001 · 2026-07-17** · W000 slice 1 = recover PR #119 (settlement side-derivation fix + scanner/CI hardening) onto current main, on branch `claude/galaxy-sports-edge-pdcswh`. · It is the only open asset fixing an active money-truth defect on main; settlement correctness is upstream of calibration, CLV, and every public proof claim. Auto-merge onto c179a78 verified clean before selection. · Reversible (branch-only; founder merges).
- **FD-002 · 2026-07-17** · Cherry-pick (linear) rather than merge-commit the #119 commits. · Keeps the working branch a clean superset of main; preserves per-commit review; the PR branch itself stays untouched for founder comparison. · Reversible.
- **FD-003 · 2026-07-17** · #101 classified SUPERSEDED by #122; #112 is RECOVER_PARTIAL (envelope + projections extracted later, draft not merged wholesale); #52 deferred to Dynasty convergence. · Bases are stale; hardened successors exist. · Reversible (classifications, not deletions).

- **FD-004 · 2026-07-17** · W000 red-team verdict: APPROVE-WITH-NOTES. Fixed in-slice: stale `headIsMerge` doc comment (behavior is fail-closed → build). Deferred as follow-ups, NOT fixed here (scope discipline): (a) secret-scan staged mode silently skips unreadable/oversized index blobs — pre-existing blindness, comment overclaims; (b) the new hardcoded-numeric performance-claims gate reuses the broad line-wide `SAFE_CONTEXT` allowlist, so it is incomplete (net-new coverage, not a weakening); (c) per-sport catch in `settleSport` means one impossible pickType aborts that sport's remaining games — loud and safe, wide blast radius. · Each is an incremental hardening, none is a regression. · Reversible.

## OWNER_GATE register

```text
OWNER_GATE OG-001
Decision: Merge PRs #119/#121/#122/#123/#124 into main; apply #122's two additive migrations to production.
Why founder authority is required: repo doctrine forbids agent merges to main, production migrations, and anything touching billing/paywall surfaces without founder sign-off.
Default non-destructive disposition: PRs remain open; #119's content additionally recovered and re-verified on `claude/galaxy-sports-edge-pdcswh` against current main so the merge decision is de-risked.
Work completed around the gate: W000 slice 1 (this branch); recovery matrix + work queue encode the rest.
```
