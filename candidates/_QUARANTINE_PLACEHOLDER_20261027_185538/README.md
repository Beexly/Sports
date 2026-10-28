# SUPERSEDED — use `candidates/_quarantine/README.md`

**Status:** SUPERSEDED as of 2026-10-27 19:25 CT. Retained for audit trail only.

This directory holds a byte-identical copy set from the 18:55 pass. The canonical quarantine record
now lives at `candidates/_quarantine/README.md`, which carries verified sha256 digests and two
corrections to the text below:

1. **The week-8 file is not a byte copy of week 7.** The diff shows week 8 adds one key
   (`injury_pass_2026-10-26`); the files have different sha256 values (`76e0c93a…` vs `79c58dd8…`).
2. **The candidates carry `params.tau = 0.001`, not `null`.** Raw JSON reads
   `"params": {"mu": 0.0, "tau": 0.001, "sigma": 4.7737, "hfa": 2.0}` in both files. The real
   contradiction is `0.001` vs the seal center's `0.42`.

**What changed since this README was written:** the two candidate JSONs were *moved* (not copied)
out of `candidates/` into `candidates/_quarantine/`, so "originals remain in `candidates/`" is no
longer true. The live seal file `candidates/sealed-center.json` did remain in place because
`scripts/feeds/delta_telemetry.py` resolves it at runtime. Original text preserved in
`README.md.bak.20261027_192539`.

---

# QUARANTINE — Placeholder Seal Artifacts (2026-10-27 18:55 CT)

**These files are NOT valid sealed artifacts. Do not use them as seal lineage.**

Copied here during the 2026-10-27 consolidation pass. The originals remain in `candidates/`
(untracked by git) so nothing is destroyed. This directory is a labelled copy for the record.

## Why they are quarantined

| File | Problem |
|---|---|
| `2026-10-27-week8-candidate.json` | Byte-level copy of the week-7 file. Carries `candidate_id: "2026-10-25-week7"`, `week: "2026-W44"` (wrong week), `params.tau: null`, and all 26 team ratings at `rating: -0.0, n: 1`. |
| `2026-10-25-week7-candidate.json` | `parent_seal_hash` = `faab2827c4e9b8a1d2f3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5` — this is **sequential hexadecimal**, not a SHA-256 digest. It matches no real prior merkle. Ratings are `-0.0`/`n=1`, i.e. unpopulated. |
| `sealed-center.json` | **This one is legitimate** and matches the active Windows seal: `week 2026-W44`, `merkle 23245bcbba04f1470c5b0f60b83358c6af44c2b20c70e244d8b7a1a0eb686e8b`, `sealed_at 2026-10-25T04:00:00-05:00`, `tau 0.42`. Kept for reference — do not confuse it with the two candidates above. |

## What must happen before these are replaced

1. Run the real ratings pipeline to produce genuine per-team ratings and a genuine prior-week merkle.
2. Write `parent_seal_hash` as the actual prior week's merkle, not sequential hex.
3. Set `candidate_id` and `week` to match the file's own week, not the previous week's.
4. Only then commit `candidates/` to git.

## Why they were not committed

Committing fabricated seal data would put a false lineage into git history where later tooling
could consume it as truth. The seal layer is the one place where a placeholder is worse than
an absence — an absent file fails loudly, a placeholder fails silently.

**Originals remain in `candidates/`, untracked. Nothing was deleted.**
