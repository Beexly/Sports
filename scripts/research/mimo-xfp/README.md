# MIMO Unit 1: xFP / FPOE stack

Free public data only. No database. No MODEL_VERSION change.

Attribution: Data via nflverse (nflverse-data), CC BY 4.0.

## Run

```powershell
$wt = "C:\Users\Garrett\Sports-worktrees\mimo-xfp-2026-09-18"
$py = $env:MIMO_PYTHON
$data = "C:\Users\Garrett\XiaomiMiMoProjects\.mimo-sessions\2026-09-18\mimo-xfp-data"
Set-Location $wt
& $py scripts/research/mimo-xfp/pull_data.py $data
& $py scripts/research/mimo-xfp/xfp_unit1.py $data scripts/research/mimo-xfp/results
```

Exit code 2 means the pre-registered kill line failed (or inconclusive).
Exit code 0 means holdout passed the binding kill line.

Kill line and definitions: `PREREGISTRATION.md` in this folder.
