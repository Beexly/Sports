# DFS GATE 02 — Game-pick firewall

- census_id: C-065
- family: dfs-process
- kind: stamped reasoning template
- cadence: Saturday — lineup build; checked again at final lock
- inputs: the week's game picks/fades (engine + authored reads) and the DFS player pool
- stamp_discipline: weekly slate lock timestamps (process record) — every player exclusion in the build carries its reason; "game fade" is never a valid exclusion reason
- reasoning_availability: NO
- emission: ZERO_OBJECT
- depends_on: C-064 (GATE 01 QB pool scan)
- failure_lesson: Lessons log 02 (2026-09-27) — "Game picks must not veto players — we liked Carolina so Watson was invisible, and he beat our QB."

## Rule

Team fades don't eliminate opposing players.

## Scope note

This is the DFS process firewall. It is NOT the engine's gate G-02 (injury pull) — same number, different system; the census records them as distinct rows for exactly this reason.

## Enforcement

A game-level opinion (backing or fading a team) may inform game selection and stacking; it may not remove an opposing player from the pool. Any exclusion whose recorded reason traces to a team fade fails the gate and the player returns to the pool.

## Record

Per week: exclusion list with reasons, audited against the game-pick record; firewall violations logged as process lessons.
