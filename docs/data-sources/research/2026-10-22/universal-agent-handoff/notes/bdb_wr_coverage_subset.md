# Even the WR-vs-coverage subset fails: 13.9 yd separation, and the outcome sign inverts

Last shot at making coverage work from tracking. The 2024 file does track coverage players (CB 17,738 tracked
player-plays, WR 15,354, SS 7,782, FS 5,270), so the failure might have been wrong-person joins rather than
absent defenders. Restricted to WR targets with at least one tracked DB/CB/S *at the pass frame* — the closest
thing to a real matchup pair — on 2,759 candidate plays, 1,563 computable.

Result: mean separation **13.93 yd**, median 12.40. Still ~4.6x the NGS figure of ~3.0.

Worse, the outcome ordering **inverts**: completed 14.08 yd vs incomplete 13.62 yd, where NGS separation
shows completions dramatically tighter in *relative* terms against depth (and absolute separation is 3-ish).
So tracking-derived "separation" is not even directionally reliable here.

## Why
The tracked defender is usually not the covering defender. With 2–10 tracked players across 22, the nearest
tracked DB is frequently a safety 12+ yards away, so the quantity behaves like "distance to some tracked
defender" rather than "distance to the man". That also explains the inversion: deep completed balls are
tracked alongside distant safeties.

## What the tracking is actually good for, demonstrated
Receiver speed at the pass behaves exactly as it should: **5.17 yd/s on completions, 6.31 on incompletions,
7.03 on interceptions** (n=943/578/42). Faster receivers at the throw are covered less — the signature shows up
cleanly in the kinematics even though the geometric separation does not.

So the usable division of labour is:
- **NGS gamecenter** -> separation, cushion, depth (geometry, league-anchored)
- **BDB subject tracking** -> subject kinematics, route shape, acceleration, orientation (per-player motion)
- Do not attempt BDB geometry; do not attempt NGS per-frame motion.

## Caveats
- 1,563 plays, one season, WR-only.
- Speed here is instantaneous at the pass frame, not a route average, so it conflates route type with effort.
- Interception cell is only 42 plays.
- Confirms rather than contradicts the previous two notes; this is the third and final check on the question.
