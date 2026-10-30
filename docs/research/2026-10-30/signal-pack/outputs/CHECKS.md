# Check ledger — every signal vs its originating post

Rule: a check states MATCH, the exact divergence, or why no check is
possible. Borrowed numbers are never imported into the tables.

**Window note (applies to all):** every table is built on Weeks 1–7 —
the complete weeks in the nflverse release as of 2026-10-30, and the
window every originating post used. Week 8 in the current release
contains only the Oct 29 Thursday game (1 of 14 games, 176 plays);
building "Weeks 1–8" tables today would fold a one-game week into
season rates. `build_tables.py` extends automatically once the
release completes Week 8.

| # | Signal (source) | Check | Verdict |
|---|---|---|---|
| 1 | RZ expected TD share (@KoalatyStats) | Post published a chart image; no values exist in text form | **METHOD REPLICATED** — no numeric check possible; construction follows the dossier exactly. Sibling funnel method from the same account reproduced 4/5 claims in-house (Oct 29 repro pass); its PROE column was refuted there |
| 2 | Missed tackles by defense (@sfdata9ers endpoints; @PattonAnalytics combined chart) | DET fewest 12; worst cluster PHI/CLE/DEN | **MATCH (endpoints)** — PFR: DET 12 (#1, next MIN 18), DEN 56 / CLE 51 / PHI 49 as the worst three (DEN/CLE adjacent swap vs the post, a one-update-cut difference). **GAP:** broken-tackles-allowed has no public team-level source; not faked |
| 3 | QB throwaway rate (@sfdata9ers) | Young 12.7% #1, Nix 11.5%, Daniels 11.2% | **DIVERGED** — PFR: Nix 9.7%/dropback (#1), Young 9.4% (#2), Daniels 7.9% (#5). Top-group membership reproduces; values run +1.4 to +3.3 pts in the post on every name and #1 flips — signature of a different charter (PFF-style), not reproducible from public data |
| 4 | RB rushing EPA/att (@boxscorescout) | "All 39 qualified RBs" | **MATCH (count)** — exactly 39 RBs qualify at a 45-attempt floor through W7 (50 yields the same 39). Per-player values were image-only; leaderboard is computed, not copied |
| 5 | Big plays vs success quadrant (@ghatz_28) | Chart values image-only | **METHOD REPLICATED** — under stated definitions (EPA>0 success; explosive = pass ≥16 / rush ≥12). No numeric check possible |
| 6 | Defensive EPA/play by quarter (@sfdata9ers) | Table values image-only | **METHOD REPLICATED** — full 32×4 table computed in-house; no numeric check possible |
| 7 | Paired-flip leverage (@Timo_NFL) | Filter method inflates leverage 1.3–1.6× | **REPRODUCED (mechanism)** — synthetic 8-team sim, K=1.75: naive 0.437 vs paired-flip 0.321 = **1.36×**, inside his band; longshot case: naive manufactures 0.026 where paired says 0.015. His factor was measured on his (non-public) sim; this replicates the mechanism, not his chart |
