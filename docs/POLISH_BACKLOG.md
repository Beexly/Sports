# Polish Backlog — owner directive: "polish EVERYTHING. mapping, data, stats"

Standing list (updated 2026-06-13). Work top-down; each item ships with gates green.

## Done

1. **Optimizer real-pool path** — SHIPPED. Licensed salary feed env keys
   (SPORTSDATAIO/FANTASYDATA) light up /fantasy/dfs board automatically;
   DK CSV import live; sample-slate banner shipped.
2. **Players Lab stat polish** — SHIPPED 2026-06-13. Every fmtPercent column
   spot-checked against live nflverse source files (pfr_advstats pass/def,
   snap_counts, ngs_receiving, player_stats): all 0–1 vs 0–100 scales verified
   correct (the Box% and STACKED_BOX_HIGH bugs fixed 2026-06-12 were the only
   two). Per-view "rows + fetched" stamps added to the /players hero line
   (row count + cache-aware loader generatedAt).
3. **Galaxy Twin mapping** — SHIPPED 2026-06-12. Board state → node posture
   (published glow / gate-held dim / scoring pulse) with inspector chips.
4. **Performance/calibration formatting** — SHIPPED 2026-06-13. One-decimal
   percentage standard across /performance (calibration panel pct() was
   rounding to whole); tabular-nums on every numeric stat, table cell, and
   reliability row.
5. **Pundit lanes that ARE licensable** — EVALUATED 2026-06-13. Jeff Mans's
   own weekly show ("One MANS Opinion", free public podcast on his FantasyGuru
   Elite+ network) added to the source-rights registry as
   `jeff-mans-one-mans-opinion`, status `manual_research_only`: RSS metadata
   readable, audio is copyrighted expression — no automated transcription
   without written permission (realistic partnership ask since he owns the
   network). Manual Listener Log remains the approved lane. SiriusXM corporate
   licensing parked per owner.

## Open

6. **Film Room render slate** — HELD, awaiting owner go-ahead: burns Higgsfield
   credits (staged media_id fe262e43…, ~18cr/clip, ~100cr full slate). Do not
   run while credits are constrained.
7. **ADMIN_EMAILS in Vercel** — founder action (set the env var in Vercel).
   Code side shipped 2026-06-13: cockpit header now shows an amber
   "ADMIN_EMAILS unset" badge whenever the running deployment lacks it, so
   you'll see it flip off when the var lands.
