# Sports repo grep — rerun with git grep (no timeout) — 2026-10-15

Query: `git grep -c -E '7\.099|2,462|\b2462\b|min_prior.?=25'` across *.md, *.json, *.py, *.ts (run 2026-10-15 in C:/Users/Garrett/Sports, cwd-persistent, completes in seconds; the earlier "timed out" run was a ripgrep workspace scan, not git grep).

Hits, classified:

| File | Nature |
|---|---|
| packages/ingestion-pipeline/walk-forward-gate.json (4) | the live gate config — 7.099 + n=2462 family |
| research/doc-gate-extracts-2026-10-15.md, research/gate-decision-packet-2026-10-15.md, research/ocr-blanks-2026-10-15.md, research/paper-crps-extracts-2026-10-15.md | our own 2026-10-15 extract surface |
| artifacts/gse_brain/matchup_feature_shape_*.json (3 each), docs/data-sources/research/2026-10-14/matchup-feature-shape.json | "2462" as an incidental digit inside feature-shape float arrays (noise, not the filter) |
| docs/engine/research/2026-10-02/corpus-deep/deep/c09/working/c09-deep-d02.md, c09-deep-r01.md | arXiv-derived text; 2,462 is a paper's sample count (noise) |
| docs/data-sources/research/2026-10-13/linestar/raw_snapcounts_redzone_by_period.json | LineStar counts (noise) |
| docs/arxiv-program/...0554, 0602, drive-deep/galaxy-sports-edge-research-audit.md | paper text (noise) |
| docs/research/2026-10-02/nfl-analytics-reverse-engineering.md | 1 hit: DAVE "7.486"-family region (Launch Plan family) |
| docs/ops/SWEEP-2026-10-13-CORPUS.md | sweep log references |

Where the OPERATIVE gate lives, in code and config (not prose):
- dfs/walk_forward/gse_location_locked_harness.py: `GATE = 7.099`, `N_MIN = 150`, `BASELINE_CRPS = 7.154021`, `BASELINE_N = 2462` (this is the enforcement point)
- dfs/walk_forward/walk_forward.json: gate_rule text with 7.099 / n>=150
- packages/ingestion-pipeline/walk-forward-gate.json: the cron-visible copy of the same rule

Docx (binary — outside this grep's glob): 7.099 verified in the XML text layers of
Measurement-First Roadmap (2 hits), Strategic Research Plan (2), Architectural Deepening (1)/(1) (17). The gate-decision packet's "7.099 not found" was limited to .md/.pdf reads and missed these.

min_prior=25 appears as code in pit_candidates.py, pit_joint.py, bsts_residual_scale.py, conformal_wrappers.py, line_movement_score.py — never as prose in a Google Doc. It is a harness parameter, stated in SESSION_HANDOFF_2026-10-15.md and the deep-research closeout.

Conclusion: nothing in the repo contradicts the 7.099 / n=2462 / min_prior=25 contract; the contract's authoritative home is the harness code, and the doc chain 7.109 - 0.01 = 7.099 is now verified in three docx text layers. The "grep timed out" gap from the missing-list is closed.
