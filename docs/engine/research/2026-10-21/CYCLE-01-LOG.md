# Cycle 1 Log — Film Edge Extraction, Weeks 1–6 2026
Date: 2026-10-21 (Wed). Cycle: 1 of continuous. Status: RUNNING.

## Constraint (honest, stated up front)
Video playback is blocked in this environment. Attempted sources:
- nfl-video.com — page loads but all three "Server" Watch buttons and Condensed Game OK/FM buttons are ad redirects (nhlgamestoday.com, nbaontv.com); no working video player or embed on the page.
- YouTube (youtube.com/watch?v=IsSMb8yjTGg — KC vs LAC W6 full game) — video element and movie_player exist but readyState stays 0, duration NaN, currentTime 0 after 8+ seconds; yt.player.getPlayerState() returns None. Headless browser blocked from video playback.
- YouTube embed (youtube.com/embed/IsSMb8yjTGg) — no video element, no iframe player.
- nfl.com game page — JavaScript errors on load (scrollWidth null).
- yt-dlp/ffmpeg — 403 Forbidden on googlevideo.com video URLs (IP/session-locked).
- video_analyze — rejects YouTube URLs (requires direct mp4/webm/mov file).

No film can be watched, no players counted, no coverage shells read, no formations/motions/mismatches visually confirmed. All evidence below is text-derived from NFL.com Week 6 recap, Chiefs.com highlight pages, Chargers.com highlight pages, and box scores. Each entry cites its source URL. No claim is presented as direct visual film confirmation.

## What was examined (Cycle 2)
Sources examined:
1. nfl.com/news/2026-nfl-season-week-6-what-we-learned-from-sunday-s-games — full Week 6 recap with takeaways + Next Gen Stats insights for all 13 Week 6 games
2. chiefs.com/video/full-game-highlights-from-week-6-chargers-vs-chiefs — individual play descriptions (KC vs LAC)
3. chargers.com/video/chargers-chiefs-highlights-week-6-2026 — individual play descriptions (LAC vs KC)
4. Box scores for all Week 6 games

Games examined (Week 6): HOU-JAX, CHI-ATL, CLE-BAL, TEN-IND, NE-NYJ, NO-NYG, CAR-PHI, PIT-TB, ARZ-LAR, LAC-KC, BUF-LV, GB-DAL. (W1-W5 data from Cycle 1 retained.)

Cycle 1 game map (96 total games, W1-W6): retained from Cycle 1 log.

## New edges extracted (text-derived, sourced) — Cycle 2
All entries below have source URLs and specific data. Ranked by apparent strength.

E-09 | George Karlaftis pass-rush dominance vs LAC OL | W6 KC 22 LAC 6 | Karlaftis: 8 pressures, 1 sack on 38 pass rushes (21.1%). 3 pressures on 7 matchups vs Travis Burke; 2 pressures on 6 matchups vs Cole Strange. 2 passes defensed on knockdowns at LOS. | nfl.com W6 recap (KC-LAC NGS insight) | Karlaftis pass-rush snaps vs LAC OT/OL | High | PENDING VISUAL
E-10 | KC pass rush vs injury-decimated LAC OL | W6 KC 22 LAC 6 | Chiefs entered game with 0 sacks in last 3 games; piled up 4 sacks + ~40% pressure rate vs LAC. LAC rushing game nonexistent (73 net yards, Herbert led with 26). | nfl.com W6 recap (Shook takeaway #2) | LAC pass-protection snaps vs KC front | High | PENDING VISUAL
E-11 | Caleb Williams clean-pocket perfection | W6 CHI 31 ATL 23 | Williams 24/24 for 248 yards from clean pocket — most attempts without incompletion from clean pocket in a game since at least 2018. Overall 30/36, 305 yards, 83% completion (Bears franchise record for 30+ attempts). | nfl.com W6 recap (CHI-ATL NGS insight) | Williams clean-pocket dropbacks vs ATL | High | PENDING VISUAL
E-12 | Kyler Gordon pass-rush return | W6 CHI 31 ATL 23 | Gordon: 3 sacks vs Falcons in first game since Nov 28 prior year. Entered Week 6 with 2.5 sacks in 45 career games. | nfl.com W6 recap (Parr takeaway #3) | Gordon pass-rush snaps vs ATL OL | Medium | PENDING VISUAL
E-13 | Christian Benford man coverage vs Brock Bowers | W6 BUF 33 LV 30 | Benford matched vs Bowers 19 times; Bowers limited to 2 receptions on 5 targets (all tight windows, <1 yard separation) for 23 yards. vs all other receivers: 1 reception on 3 targets (11-yard TD to Tre Tucker). Bowers productive vs zone: 18+29 yard receptions back-to-back. | nfl.com W6 recap (Cersosimo takeaway #3) | Benford vs Bowers man-coverage snaps | High | PENDING VISUAL
E-14 | Josh Allen vs zone coverage | W6 BUF 33 LV 30 | Allen: 14/19 for 182 yards and both TDs vs zone coverage. 3/5 scrambling for 63 yards and a TD. 23/33 overall, 255 yards, 2 TDs. | nfl.com W6 recap (BUF-LV NGS insight) | Allen dropbacks vs LV zone vs man | Medium-High | PENDING VISUAL
E-15 | Josh Allen escapability creates open throws | W6 BUF 33 LV 30 | On 3rd-and-8 from Raiders 12, Allen evaded multiple defenders, drew coverage away, lobbed floater to wide-open Keon Coleman TD. | nfl.com W6 recap (Cersosimo takeaway #1) | Allen escape-and-throw snaps vs LV | Medium | PENDING VISUAL
E-16 | Bobby Okereke quick pressure vs Eagles OL | W6 CAR 25 PHI 14 | Okereke: 5 pressures on 15 pass rushes (33.3%), all within 2.5 seconds of snap, incl. sack. Tied 3rd among ILBs in a game since 2018. | nfl.com W6 recap (Patra takeaway #3) | Okereke blitz/pressure snaps vs PHI OL | Medium | PENDING VISUAL
E-17 | Bryce Young deep-ball efficiency vs PHI | W6 CAR 25 PHI 14 | Young: 13/21 for 193 yards targeting receivers aligned out wide; 7/14 for 88 yards and 2 TDs on all other attempts. | nfl.com W6 recap (CAR-PHI NGS insight) | Young deep/out-of-structure throws vs PHI | Medium | PENDING VISUAL
E-18 | Chuba Hubbard power running vs PHI | W6 CAR 25 PHI 14 | Hubbard: 120 yards, 1 TD on 28 carries, 133 yards after contact. Hit behind LOS on 17 carries but gained 56 yards on those runs. | nfl.com W6 recap (Patra takeaway #1) | Hubbard inside/run-between-tackles vs PHI | Medium | PENDING VISUAL
E-19 | Chase Young pass rush vs Andrew Thomas | W6 NO 34 NYG 27 | Young: 4 pressures (21.1% pressure rate), 1.5 extended sacks (over 4 seconds) vs Andrew Thomas. | nfl.com W6 recap (NO-NYG NGS insight) | Young pass-rush snaps vs Thomas | Medium | PENDING VISUAL
E-20 | Carson Schwesinger run defense vs BAL | W6 CLE 13 BAL 10 | Schwesinger: 13 tackles, 9 defensive stops (double next closest Browns defender). All 4 run tackles successful (-6.6 EPA across 4 run stops). | nfl.com W6 recap (Ravens-Browns NGS insight) | Schwesinger run-stop snaps vs BAL | Medium | PENDING VISUAL
E-21 | Jeffery Simmons vs double teams | W6 TEN 26 IND 20 | Simmons: double-teamed on 24 pass rushes, recorded 4 pressures and both sacks vs double teams — most pressures vs double-teams by any player this season. | nfl.com W6 recap (TEN-IND NGS insight) | Simmons pass-rush snaps vs IND double teams | Medium | PENDING VISUAL
E-22 | Christian Benford zone vulnerability vs Bowers | W6 BUF 33 LV 30 | Bowers productive vs zone: 18 and 29 yard receptions back-to-back on 4th-quarter drive when Bills played zone. | nfl.com W6 recap (Cersosimo takeaway #3) | Bowers vs zone coverage snaps | Medium | Situational | PENDING VISUAL
E-23 | Jordan Love vertical route cliff | W6 GB 23 DAL 13 | Love: 3/4 on vertical routes for 61 yards on opening drive; 0/6 on vertical routes rest of game. Pressured on 45.5% of dropbacks (4th-highest in career), 3 sacks. | nfl.com W6 recap (GB-DAL NGS insight) | Love vertical route attempts vs DAL (1st drive vs rest) | High | PENDING VISUAL
E-24 | Packers pass rush vs Dak Prescott | W6 GB 23 DAL 13 | Prescott pressured 21 times (37.5% pressure rate), hit 7 times. Van Ness: 5 QB pressures. Dennis-Sutton: 6 QB pressures. | nfl.com W6 recap (Gordon takeaway #3) | Packers pass-rush snaps vs DAL OL | Medium | PENDING VISUAL
E-25 | Budda Baker pressure + coverage | W6 ARZ 18 LAR 16 | Baker: 3 pressures incl. 1 sack on 7 blitzes (42.9% pressure rate), tied 2nd-highest single-game pressure total since 2018. Not targeted on 29 coverage snaps (2nd game this season without a target in coverage). | nfl.com W6 recap (ARZ-LAR NGS insight) | Baker blitz snaps vs LAR, coverage snaps | High | PENDING VISUAL

## Documents updated (Cycle 2)
- EDGE_LEDGER-film-cycle-01.md — updated with E-09 through E-25 (17 new edges, all PENDING VISUAL, all sourced)
- SCHEME_CATALOG-film-cycle-01.md — updated with scheme observations from text data
- MISMATCH_LOG-film-cycle-01.md — updated with mismatch observations from text data
- CYCLE-01-LOG.md — this document, updated with cycle 2 findings

## Weak / contradictory claims needing re-check
- E-09 through E-25 are text-derived from NFL.com/team sites, NOT direct film observation. Must be re-verified against film when video playback is restored.
- E-13 (Benford vs Bowers man coverage) vs E-22 (Bowers vs zone success) — complementary, not contradictory: Bowers struggles vs man (Benford), succeeds vs zone. Scheme-dependent mismatch.
- E-21 (Simmons vs double teams) — "most pressures vs double-teams this season" requires NGS verification.
- No formation, motion, coverage-shell, or leverage data from direct film. All scheme data is text-derived.

## Next targets (Cycle 3, immediate)
1. Restore video playback (nfl-video.com working player, local video file, or authenticated NFL+) — highest priority
2. Re-verify E-09 (Karlaftis vs Burke/Strange) against film: alignment, pass-rush moves, knockdowns at LOS
3. Re-verify E-13 (Benford vs Bowers man coverage) against film: alignment, press vs off, route concepts
4. Re-verify E-23 (Love vertical route cliff) against film: 1st drive vs rest of game, coverage shells
5. Re-verify E-25 (Baker blitz rate + coverage snaps) against film: alignment pre-blitz, coverage responsibility
6. Review CHI W1 (E-01), SF W1 (E-02), KC W6 (E-04), BUF W6 (E-05) — original Cycle 1 candidates still PENDING VISUAL
7. Enumerate nfl-video.com Week 1-4 replay URLs
8. For each verified edge: record formation, motion, coverage shell, leverage, success/failure; move to SHIP status

## Cycle rule
Never stop. After Cycle 3 findings, immediately begin Cycle 4. Continue until externally stopped.