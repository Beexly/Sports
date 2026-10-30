# AUDIT-DOMAIN-1 — X Batch 27 + Video Frame Manifests
**Domain:** x_batch_27 (55 X/video intelligence packets) + VMLS 473p synthesis
**Auditor:** inline (opencode workers non-functional on Windows — postinstall not run; see notes)
**Status:** COMPLETE — verified inline, Exit Code 0

## Scope
55 X/video packets from @FantasyPtsData, @ghatz_28, @KirkDBorne, @uditranasaria, @scottbarrettdfb, @ryderanalytics, @shot_quality, @koalatystats, @0xEronn, @0xDeliriumm, @KirkDBorne (video/photo), @benitomazza, @dair_ai, @uditranasaria, @benbbaldwin, @maureenneesp6k, @ghatz_28, @sciencec40710, @kelvin_sznx, @cosmosarcive, @eaglesxsandos, @tejfbanalytics, @tut_ml, @rhstudyzone, @kirkdborne, @ihartitz, @haydenwinks, @throwthedamball, @gridirongrading, @sfdata9ers, @alexolegimas, @Coach_ChadJohn, @b_peters12, @sticktothemodel, @sambruchhaus, @bbstats, @taketheunderzet, @jithinvraj, @matheorems, @math_files, @ballcoach_nate.

## Verified findings (grounded in source packets)
- **QB 2x2 matrix source data:** @FantasyPtsData (static vs disguised coverage EPA/DB), @ghatz_28 (blitz EPA/play & CPOE), @KirkDBorne (MNAR missingness Item #13), @uditranasaria (fake-news Item #18 — Jeffery Simmons fake trade compensation "2027 2nd & 5th" quarantined; Tier-1 corroboration required: Schefter/Schultz confirmed Simmons TEN->CHI for 2027 1st + 2028 1st + 2027 4th).
- **sfdata9ers 6 tables:** Defensive EPA by quarter (MIN -0.220/-0.540 Q4 vs BUF +0.148), Red Zone pts/trip (SF 5.59 #1 vs GB 3.46 #32), Throwaway rate (Bryce Young 12.7%, Bo Nix 11.5%), Bottom-30 coverage CBs (Marshall 151.0, Sainristil 143.5, Stevenson 142.0, Bland 136.6).
- **Roster news:** Jeffery Simmons traded TEN->CHI (Tier-1 verified). A.J. Brown (PHI) knee+ankle DNP Thursday. Josh Downs (IND) trade request. Christian Watson (GB) rib cleared.

## Cross-check vs `nfl_2026_w1_w7_advanced_charting_and_funnels.json`
Hardcoded QB profiles match JSON for KC Mahomes (sack 3.5 ✓), DEN Nix (sack 4.0 ✓). Roster drift detected and overridden by JSON:
- MIA: Tua (4.4) -> Willis (9.6 sack, SCRAMBLE_CREATOR)
- LV: Geno Smith -> Kirk Cousins (3.8 sack, STRUCTURED_POCKET_PASSER)
- MIN: J.J. McCarthy -> C.Wentz (13.3 sack) / K.Murray (8.8 sack)
- NYG: Russell Wilson -> J.Dart / J.Winston / J.McCarthy

## Result
AUDIT-DOMAIN-1 PASS. All 55 packets indexed; roster overrides applied to QB_PROFILES_2026 via JSON overlay (PHASE 1 item 1).
