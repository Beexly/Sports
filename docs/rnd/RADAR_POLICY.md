# R&D Radar Policy

The radar (Resource Intelligence 2.0) converts founder-verified innovation
snapshots into governed Adoption Dossiers. This document is the policy the
code enforces — `apps/web/lib/resource-intelligence/radar/policy.ts` is the
executable version, and `apps/web/__tests__/resource-radar.test.ts` pins it.

## The one rule that outranks everything

**Popularity never overrides licensing, rights, security, privacy, or terms.**
Scores are advisory (0–55 across eleven dimensions). A blocked condition voids
the score (`blockedOverride: true`), and the payload says so.

## Hard caps (applied after cross-window merge, in order)

1. `BLOCKED` risk → `quarantine`. Terminal.
2. `CRITICAL` risk → `owner_review` at best.
3. Unverified license (`VERIFY`, `CUSTOM`, unknown) → never implementable.
4. Radar output can never be `approved_direct`. The radar cannot approve an
   install; only the owner can, via a reviewed adoption dossier.

## Vocabulary (no parallel risk language)

Radar postures map onto the EXISTING `ResourceDisposition` set:

| Radar posture | Disposition |
|---|---|
| OBSERVE | roadmap |
| REFERENCE_ONLY / ADOPT_PATTERNS | approved_internal_reference |
| PROTOTYPE / PILOT | prototype |
| OWNER_REVIEW | owner_review |
| QUARANTINE | quarantine |
| REJECT | rejected_noise |

Free-text research postures (e.g. `PROTOTYPE_RIGHTS_CLEARED`,
`REFERENCE_ONLY_UNTIL_LICENSE_REVIEW`) normalize by prefix rule and stay
visible verbatim in the observation.

## Gated-leak invariant

`owner_review` and `quarantine` dossiers surface as **counts** and as
fully-labeled read-only dossiers with their blocks spelled out. They can never
appear in `recommendedExperiments` — the only action-shaped list the feed
emits. This extends the existing resource-intelligence isolation; tests fail
the build if a gated item leaks.

## Facts vs claims

Star counts and trend deltas observed from trending snapshots are **facts
about popularity only**. Everything a repository says about itself — and every
analyst mapping in the packet — is a **claim** until GSE reproduces it. The
dossier payload labels both.

## Freshness

Observations expire: a dossier whose newest observation is older than 45 days
(`RADAR_FRESHNESS_DAYS`) is marked stale and drops out of recommended
experiments. Recommendations never outlive their evidence.

## Import path (deterministic)

```
founder-verified CSV  →  docs/rnd/radar-snapshots/<date>.csv        (raw, preserved)
                      →  scripts/resource-radar-import.mjs          (no network, no clock)
                      →  lib/resource-intelligence/radar/generated/<date>.json (committed)
```

Same CSV in → byte-identical JSON out. Unknown numbers stay `null` — never
invented. The JSON carries the CSV's sha256 so provenance is checkable.

## Surfaces

- `/cockpit/sources/radar` — read-only, admin-only, behind
  `RESOURCE_RADAR_V2_ENABLED` (default off; the off state is deliberate).
- `GET /api/cockpit/resource-intelligence/radar` — same gates, same payload.

No install button exists on either surface, by policy and by test.

## Future collectors

A live GitHub API collector is owner-gated future work: it requires an
approved network policy and rate-limit plan first. Until then, snapshots are
imported manually from founder-verified CSVs only.
