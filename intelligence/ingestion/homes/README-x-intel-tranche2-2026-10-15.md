# X-intel ingestion — TRANCHE 2 (2026-10-15)

Garrett's order (~22:46 CT): the ten X sources go into the reasoning
engine immediately. Tranche 1 homed the ten sources + 13 named metrics
from the Oct-15 reads (C-280-C-302). This tranche appends the depth from
the ten DEEP-SCROLL CATALOGS, which have now all returned.

Landing target: branch `motif/x-intel-ingestion-2026-10-15` (follow-on
commits on tranche 1's head). Append-only discipline holds: the ledger's
first 302 lines are byte-identical to tranche 1's landed ledger; homes
from tranche 1 are enriched, never rewritten in substance (every in-place
text edit is listed in that file's `tranche2_enrichment.change_log`).

## New records (C-303 -> C-325; 23 rows; homed 150 -> 173)

- @StephenKrupka catalog: C-303 WTPRR · C-304 YPRR decomposition ·
  C-305 XFP vs FP (PFF) · C-306 unrealized air yards/route ·
  C-307 RB efficiency suite · C-308 team pace/style family.
- @throwthedamball catalog (PFF R&D author's original metrics):
  C-309 disruption · C-310 disruption pressure (with the author's
  'nearly 4x' claim recorded AS A CLAIM, dated 2025-12-24) ·
  C-311 create rate · C-312 destroy rate · C-313 perfect block rate ·
  C-314 perfect coverage rate · C-315 system play rate · C-316 havoc ·
  C-317 the 15-family split catalog.
- @GridironGrading catalog: C-318 overall prospect score (system,
  grade bands, method notes) · C-319 Impact Score · C-320 public
  datasets (endpoints + sheet IDs; NOT downloaded).
- @ArkansasQuant catalog: C-321 AQ Production Score + P4 starter bar.
- @RyNoonan catalog: C-322 scorekeeper adjustment · C-323 quick
  pressures · C-324 tackling efficiency vs run · C-325 golf suite
  (multi-sport shelf).

## Enrichments (tranche-1 homes, depth appended)

- C-280 @FF_Geek: full-history coverage (22/22), TE edition, team EPA
  split, WR Target Outlook, and the provenance fact (no data source
  credited anywhere — charts are instances, not a feed).
- C-282 @throwthedamball: site visited (Substack, paywalled, no tools);
  chart-transcription caveat (1 of ~130 charts value-transcribed).
- C-284/C-285 @ArkansasQuant: methodology FULLY SPECIFIED (ridge
  two-way fixed effects lambda=50; garbage-time 5-95% WP rule; matchup
  projection formula; 264-metric glossary; CollegeFootballData data;
  manual-refresh freshness caveat); sister site; franchise form.
- C-286 @StephenKrupka: cadence confirmed; tranche-2 metrics listed.
- C-287 WOPR (appended record): 2025 leaders (JSN 0.89, Wilson 0.85,
  Nabers 0.79) + cadence.
- C-289 @GridironGrading: catalog coverage + the DOCUMENTED GAP
  (Apr 29-Aug 21 2026 unrenderable by 4 methods).
- C-291 @NFL_DF: Film Room CORRECTED (297 cutups, 3 free, Pro
  $8.99/mo, streaming only); coverage limit (Feb 2026-Oct 2025
  unreachable); grading rubric; passer rating allowed.
- C-294 Box Score Scout: full site map + model definitions IN THE
  AUTHOR'S TERMS (xFP frozen model + its stated limit, kicker model,
  comps, athletic score, excitement, play-callers DB with the SPEC-C
  P-014 cross-reference, percentile convention, data coverage).
- C-295/C-296 @refereeinsider: full history (1,319 posts); INTEGRITY
  FINDINGS recorded on C-296 (arithmetic 33-25 vs 34-25; Novak label
  flip; chart-to-recap changes; Allen inconsistency; record-keeping
  stopped Nov 30 2025 and restarted; MLB push accounting). C-297
  kernel UNCHANGED.
- C-298 @RyNoonan: audited self-published record (939-742, +95.5u at
  >=5% edge since 2022; unders 62% / +17.5% ROI; 392 wagers +61u,
  green 4 seasons; published self-correction on overs) + Snap
  Charts/Pillbox.
- C-302 @cookitup31: SENTIMENT-ONLY confirmed; funnel structure; the
  KEY NEGATIVE FACT (no gradeable record published anywhere);
  Prop Season methodology lines recorded as UNVERIFIED MARKETING
  CLAIMS.

Every record: weight 0, emission ZERO_OBJECT, zero forbidden keys.
Validation: `validation-x-intel-tranche2-2026-10-15.json` beside this
file. Deliverable: `x-intel-ingestion-tranche2-2026-10-15.md`.
