# Repo Reality Map

Verified on 2026-07-03 in `C:\Users\Garrett\Sports`.

Repository:
- Remote: `https://github.com/BeeXly/Sports.git`
- Starting branch: `claude/night-shift`
- Implementation branch: `codex/fable-nfl-evidence-integration`
- Existing untracked scratch files were left untouched: `dashfiles.json`, `scratch_audit_err.txt`, `scratch_audit_full.json`, `scratch_audit_prod.json`

Existing surfaces reused:
- NFL data: `apps/web/lib/nflverse/*`
- NFL metrics: `apps/web/lib/metrics/*`
- Data ingestion: `packages/data-ingestion/src/nflverse-*`
- Calibration: `packages/prediction-engine/src/probability-calibration.ts`
- Calibration maps: `packages/prediction-engine/src/calibration-map.ts`
- Calibration drift: `packages/prediction-engine/src/calibration-drift.ts`
- Rights registry: `apps/web/lib/scraping/source-rights-registry.ts`

New surfaces added:
- `apps/web/lib/fable/source-registry.ts`
- `apps/web/lib/fable/uncertainty.ts`
- `apps/web/lib/fable/labeling.ts`
- `apps/web/lib/fable/drift.ts`
- `apps/web/lib/fable/aws-gates.ts`
- `apps/web/lib/fable/claim-scanner.ts`

Claims still unsupported:
- Any measured Brier/ECE gain beyond fixture or repo-data evidence.
- Any live AWS configuration.
- Any paid labeling or provider account setup.
- Any right to use a source beyond the registry status.
