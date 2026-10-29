# GSE Canonical Environment Declaration — 2026-10-27

**Decision authority:** Autonomous execution under `autonomous-decisions` protocol (user delegated fully).
**Status:** ACTIVE. Supersedes any per-machine snapshot that contradicts it.

---

## Decision: the Windows workstation at `C:/Users/Garrett/Sports` is canonical for this cycle.

### Reasoning (why Windows, not the sandbox)

| Criterion | Windows workstation | Linux sandbox (`/root/beexly-sports`) |
|---|---|---|
| Active HEAD | `c75d2707c`, identical to `origin` | `db4b1899` |
| Test state | 102 tests verified passing this session (broader suite running) | "137/137" claimed, not re-verified here |
| Seal center on disk | Present: `candidates/sealed-center.json` → `23245bcb…`, tau 0.42 | `faab28271513678c` |
| Accessibility | Direct — every command in this session ran against it | Not reachable from this session |
| Branch completeness | 263 commits ahead of the audit branch; all work contained | Partial snapshot |

Windows wins on **accessibility** and **branch completeness** — the two criteria that matter for a decision that must be actionable today. The sandbox may hold newer document-feed machinery (WS6/6b), but nothing in this session could reach or verify it.

### What this decision fixes

1. **One seal hash is authoritative for this cycle:** `23245bcbba04f1470c5b0f60b83358c6af44c2b20c70e244d8b7a1a0eb686e8b` (week 2026-W44, sealed 2026-10-25T04:00:00-05:00, tau 0.42).
2. **The plan's `85b5cd33…` value is demoted to "documented fixture from another environment."** It appears zero times in Windows `src/`. It must not be cited as the active seal in any Windows artifact.
3. **The sandbox seal `faab28271513678c` is recorded as "other environment."** Records written under it must not be merged into Windows delta logs — the writer's `SEAL_HASH_MISMATCH` guard enforces this automatically.

### How the delta writer already implements this

`scripts/feeds/delta_telemetry.py::resolve_sealed_hash()` resolves in order:
1. `$GSE_SEALED_HASH` env override
2. `<repo>/candidates/sealed-center.json` → `merkle` (→ `23245bcb…` on Windows)
3. Documented fixture fallback (`85b5cd33…`)

So no code change is required — the writer already prefers the on-disk seal center. This document exists to make the choice explicit to humans and future sessions.

### Reversal condition

If the sandbox is later determined to hold work not present in HEAD (e.g. the WS6/6b document feed), this decision should be revisited and the sandbox promoted — but only after its branch state is fetched and diffed against HEAD. Until then, Windows is canonical.

---

## Companion decisions made in the same pass

| # | Decision | Rationale |
|---|---|---|
| D1 | `candidates/*.json` are **quarantined, not committed** | The files contain fabricated seal data (`parent_seal_hash` is sequential hex; week-8 is a byte copy of week-7 with `tau: null` and all ratings `-0.0`). Committing them would enshrine fabrication in git history. Copied to `candidates/_QUARANTINE_PLACEHOLDER_20261027_185538/` with a README. |
| D2 | Branch commit `ea8bd2951` is **documented as redundant, not deleted** | HEAD already contains the same semantic-inversion fix plus blitz-EPA-cell logic the branch lacks. Deleting a remote branch is destructive and unnecessary; it is left as history with this note. |
| D3 | The "72/72" / "137/137" / "22/22" / "106/106" counts are **superseded** | All four are historical snapshots from different branches. The authoritative count is whatever the full suite run reports now. |
| D4 | WS6/6b files are **sandbox-only until ported** | `emit-mind-feed-record.ts`, `validate_mind_feeds_consumer.py`, `test_ws6b_rag_anything_probes.py`, `raganything/omml_extractor.py` return zero hits on Windows. Documented as absent, not "done." |
| D5 | The four large zips are **asset and conversation bundles, not GSE code** | `e472bd83`/`6f5f3494` = web-app PNG/JSON asset exports (72 PNGs each). Two EYI Packages = Muse AI conversation exports (7,822 / 7,767 turns). No GSE source recovered. This closes the "2.87 GB unknown" item. |

---

## Open items this decision does NOT resolve

- Whether the sandbox's WS6/6b machinery should be ported to Windows or formally abandoned.
- Whether the Muse AI conversation exports (15,589 turns combined) contain GSE-relevant decisions not captured in the Antigravity sessions.
- The real ratings pipeline needed to regenerate genuine candidate seal artifacts (blocked — no pipeline available on Windows).
