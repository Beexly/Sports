# G-02 Injury Pull Gate — production caller wiring (2026-10-15)

**Gate:** `intelligence/providers/injury_gate.py` — `require_injury_published(week, now, friday)`
refuses a live injury pull before that week's Friday 18:00 ET publication by raising
`InjuryNotPublished`.
**Spec:** `docs/research/2026-10-09/rating-atlas/minis/GSE_ENGINE_GATE_INVENTORY.md` §2 (Injury Pull Gate).
**Finding closed:** Oct 12 gate census (G-02, LANDED-NOT-WIRED) + Oct 13 sweep downgrade —
code search on `main` found NO production caller; only `intelligence/gates/test_phase_wires.py`
exercised the gate. A gate-checked caller existed stranded on unmerged branches
(`fix/galaxy-odds-first-2026-10-08`, `grok/walk-forward-2026-10-14`); this change lands it on
`main` with its test battery.

## What landed

- `intelligence/providers/pull_nfl_injuries.py` — the production caller. `main()` invokes
  `require_injury_published` FIRST, before any network activity; on `InjuryNotPublished` it
  prints the refusal and exits 3 having fetched nothing. After the cutoff it pulls the keyless
  ESPN NFL injuries endpoint and lands a compact per-team digest under
  `docs/data-sources/research/<date>/injuries/`. The caller supplies the week and that week's
  Friday (`--week`, `--friday`) — the gate does not guess the calendar, and neither does the caller.
- `intelligence/gates/test_injury_pull_caller.py` — battery:
  (a) before cutoff → exit 3, refusal is the gate's, zero fetches, no file landed;
  (b) after cutoff → output identical to the ungated fetch+digest (gate adds no transformation);
  (c) cannot-be-skipped regression — behavioral call-order (gate before fetch; gate-only on the
  refused path) plus a source-order assertion on `main()`.
- Deltas vs the stranded branch copy (caller only; the gate file is byte-identical, untouched):
  added the missing `from typing import Any` import used by `digest()` annotations; removed one
  dead no-op line and its orphaned helper. No gate semantics changed; nothing re-tuned.

## Seam chosen — and alternatives rejected

**Chosen: the pull entry point** (`pull_nfl_injuries.main()`, gate before fetch). This is the seam
the spec implies: the gate guards a *pull* — "Any live injury report pull before the official
Friday 18:00 ET publication" — and its own docstring states reading a committed file is not a pull.

Rejected:
1. **Pick/read publish path** (board/picks read seams, TS web injury surfaces): the spec
   explicitly allows reading committed files; gating reads would refuse lawful consumers
   (e.g. `intelligence/coaching/ol_provider.py` reading the committed injuries parquet) and
   contradicts the gate's stated semantics.
2. **External scheduler/cron wrapper around the pull**: a wrapper can be bypassed by invoking
   the pull directly — the exact silent-skip failure the census found. The gate call lives
   inside the pull's own entry point so the pull cannot happen without it; test (c) locks this.
3. **Inside `fetch_injuries()`**: couples the transport helper to gate policy and would gate
   any future non-pull use of the fetcher; the entry point is where week/Friday context exists.

## Operating notes

- Exit codes: 0 = pulled and landed; 3 = refused by gate (expected pre-Friday-18:00 ET, not an error).
- The caller is run per week with that week's Friday; scheduling it is an ops decision and is
  deliberately not bundled here (branch is wiring + tests only; no merge, no deploy).
