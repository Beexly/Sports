SELECTION-BIAS CORRECTION — CORRECTED CLAIM (stamped 2026-10-11T02:42:49Z)

CLAIM MADE EARLIER: "DK mu-shade ≈ +34 points over empirical mean."
SOURCE OF THAT NUMBER: the 7-player calibration comparison file
(dk_vs_empirical_calibration.json), whose mean mu_gap = +37.2 points.

FULL-POPULATION TRUTH (262 valid ladder fits, dk_cfb_prop_fits.json):
  mean(posted_line − fitted_mu) = -1.70 points ≈ 0.
  median residual in sigma units: -0.008 sigma.
  split: 129 above zero / 132 below.

SELECTION FILTER THAT PRODUCED THE +34: the calibration file was assembled by
comparing DK ladder mus against empirical player means and retaining entries for
the comparison — the retained rows are those where the comparison was made at all,
which selected toward large |gap| rows. Conditioning on the size of the gap and
then reporting the mean gap is the definition of selection on the dependent variable.

SUBSET COMPARISON (both stamped):
  7-player selected subset: mean mu_gap = +37.2 pts
  262-fit full set:         mean gap      = -1.70 pts
  → the +34 is a property of the SELECTION, not of DK's pricing.

Per-cut mean residuals (so the bias cannot reappear under a new cut): see
residual_distributions.json — per-stat (pass/rush/rec) means all ≈ 0 in sigma units.

STATUS: diagnostic only. No residual is an edge. The 183-outlier list becomes
actionable only after a residual-versus-close test on a frozen manifest.

GAPS (reopen conditions):
  1. STABILITY: only one snapshot exists (2026-10-10). Re-fit on a later nash
     pull (>=24h later) → count survivors of the 0.15-sigma band. Reopen: next harvest.
  2. CROSS-BOOK: no other book carries CFB player props in our artifacts
     (Pinnacle US has no NFL/CFB player props per GSE_REVERSE_ENGINEERING §1.1;
     FD not harvested). Reopen: FD/other-book CFB prop harvest, or NFL scale-out
     where cross-book exists.
  3. BOTH-SIDES FLAG + RUNG SET: the fits file records n and r2 but not the per-rung
     prices or side coverage. Reopen: persist per-rung rows in the next ladder pull.
  4. MOVEMENT/CONTEXT JOIN (injury, weather, line movement): not present in the fits
     artifact. Reopen: join from the week-6 injury digest + weather table if the
     player-stat keys align; do not invent.
  5. NOT-FITTED POOL INVENTORY: the fits file does not record player-stats that were
     seen but skipped. Reopen: re-harvest with a skip-reason column.
