# Source Conflict Court

*Source: `source-conflict-court.ts`. When sources disagree, do NOT average blindly — classify the
disagreement and route it. Sometimes the disagreement IS the edge.*

## Conflict classes → verdicts

| Conflict class | Trigger | Verdict |
|---|---|---|
| `ENTITY_MAPPING_COLLISION` | the two sources resolved to different canonical entities | `QUARANTINE` |
| `RUMOR_OR_UNCONFIRMED` | one side is a rumor / unconfirmed | `WAIT_FOR_CONFIRMATION` |
| `MANUAL_CORRECTION` | one side is a manual correction | trust the correction |
| `STAT_DEFINITION_MISMATCH` | different stat definitions (intended vs completed air yards) | `WAIT_FOR_CONFIRMATION` (never average) |
| `FANTASY_PLATFORM_LAG` | a fantasy-market belief disagrees with football reality | `USE_AS_CONTRADICTION_SIGNAL` |
| `PROJECTION_MODEL_DIFFERENCE` | a projection disagrees with another value | `USE_AS_CONTRADICTION_SIGNAL` |
| `MARKET_POLICY_DISTORTION` | a book's price reflects limits/shading, not fair value | `USE_AS_CONTRADICTION_SIGNAL` |
| `LATE_SOURCE` | observations are materially far apart in time | trust the **fresher** source |
| `BAD_SOURCE` | a clear reliability gap | trust the **more reliable** source |
| `TIMESTAMP_MISMATCH` | comparable sources disagree with no clear cause | `USE_AS_CONTRADICTION_SIGNAL` |

## Why this matters

The naive system averages two disagreeing feeds and gets a number that is wrong in a new way. The
court instead asks **why** they disagree:

- A **late source** is not a second opinion — it is yesterday's news; trust the fresher.
- A **fantasy projection lagging confirmed role truth** is not noise to smooth away — it is the
  exact non-equilibrium the Fantasy Twin exists to exploit. It becomes a *signal*, classified
  separately from the injury truth that drives it.
- A **different stat definition** is not a contradiction at all — the two feeds measure different
  things and must never be blended.
- A **different canonical entity** means it is not the same fact; quarantine until the Entity Spine
  reconciles them.

This is how GSE converts source disagreement from a data-quality problem into either a clean
resolution or a discovery signal.
