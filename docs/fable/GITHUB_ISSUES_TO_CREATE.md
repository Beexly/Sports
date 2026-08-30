# GitHub Issues To Create

## Issue: Wire FABLE source registry adapter into an internal visibility route

Body:

```markdown
Add an internal route or dashboard panel that reads `apps/web/lib/fable/source-registry.ts` and displays source status, allowed use, blocked use, owner decision needs, and last review date.

Acceptance:
- Uses `buildFableSourceRegistry`.
- Does not duplicate registry data.
- Shows AWS storage status as inherited from source storage rights.
- Includes tests for approved, blocked, and conditional sources.
```

## Issue: Promote uncertainty ranking into a local review queue

Body:

```markdown
Use `rankUncertainCandidates` to produce a local review queue from prediction candidates.

Acceptance:
- Supports least confidence, margin, and entropy.
- Records why each candidate was selected.
- Does not retrain or publish predictions.
- Keeps queue local until owner approval.
```

## Issue: Add repo-data calibration validation before any gain claim

Body:

```markdown
Create a report that measures Brier and ECE on repo data or an approved replay fixture.

Acceptance:
- Records command, dataset/window, sample count, baseline, candidate metric, and delta.
- Blocks unsupported copied claims such as `.5+ Brier/ECE gain`.
- Adds the report link to `docs/fable/MODEL_CALIBRATION.md`.
```
