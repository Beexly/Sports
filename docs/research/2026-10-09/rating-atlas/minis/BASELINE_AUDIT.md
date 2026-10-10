# BASELINE AUDIT — every metric that exists, and what we hold
**2026-10-10 · THE RULE: baseline first. Frontier second. Nothing new until this matrix is green.**
Status: ✅ HAVE · 🟡 PARTIAL · ❌ MISSING · 💰 paid source (acquire decision needed)

## NFL — the metric universe

| metric family | source | status | notes |
|---|---|---|---|
| Play-by-play (full) | nflverse/nflfastR-data | ❌→ingesting | CSV gz per season; EPA/WPA/success/air-yards/pressure ALL derivable |
| EPA + WPA | derivable from pbp | ❌→ingesting | r=0.980 vs ESPN verified in prior session |
| Next Gen Stats | nflverse "ngs" releases | ❌→ingesting | separation, rush YAC, air accuracy — free CSVs |
| FTN charting (motion/PA/RPO/drops) | nflverse ftn release | ✅ 2025 | team z-scores next |
| PFR advanced (YBC/YAC/broken tackles/accuracy) | PFR crawl | ✅ recipe + partial | 3s politeness, browser lane proven |
| Snap counts | nflverse snap_counts release | ❌→ingesting | participation + role |
| Officials + penalties | nflverse officials.csv | ✅ | crew tendencies join ready |
| Injuries (structured feed) | ESPN | ✅ feed live | 800 rows stamped |
| Draft capital / combine / contracts | nflverse | ✅ partial | combine+contracts re-pull queued |
| Schedule/scores/weather-coords | nflverse games_all + stadiums | ✅ | |
| Weather coefficients | Open-Meteo | ✅ measured | wind −5.41; residual-vs-close queued |
| QBR + ESPN advanced | ESPN public APIs | ❌→ingesting | keyless |
| PFF grades | PFF | 💰 | paid — the one retail moat; decision later |
| SIS charts | SIS | 💰 | paid |
| Betting margins/holds | our anatomy engine | ✅ 4 books | DK/ESPN Bet/Bovada/Caesars |
| Exchange microstructure | Kalshi API | ✅ live | order book + fee curve |
| Line movement / CLV | OUR pump | ✅ live | 5,190 rows, compounding |

## CFB — the metric universe

| metric family | source | status | notes |
|---|---|---|---|
| Play-by-play (full) | CFBD /plays | 🟡 2026 wks1-6 | 2025 backfill queued |
| **EPA/PPA per play** | CFBD /ppa/games | ✅ | precomputed — memory correction locked |
| Team game stats (yards/TDs/turnovers) | CFBD /games/teams | ❌→ingesting | the baseline box-score universe |
| Drives | CFBD /drives | ❌→ingesting | drive efficiency + start-position |
| Player game logs | CFBD /games/players | ✅ 2024-26 | prop σ tables live |
| Player usage/targets | CFBD /player/usage | ❌→ingesting | target share, touch share |
| 4th-down aggression/tempo/penalties | OUR pbp engine | ✅ 2026 | FBS-only re-run queued |
| SP+ | CFBD /ratings/sp | ✅ 2024-26 | prior, never μ (doctrine) |
| Recruit talent + blue-chip | CFBD recruiting/talent | ✅ ×5 classes | PRICED by close (measured) |
| Portal | CFBD transfer-portal | ✅ 2026 | roster-strength impact queued |
| Coaches (tenure/history) | CFBD /coaches | ✅ 1,816 records | |
| Rankings (AP/CFP) | CFBD /rankings | ✅ 2026 | |
| Venue/altitude/geo | CFBD venues + haversine | ✅ | travel×altitude +6.64 FOUND |
| Weather at stadium | Open-Meteo | ✅ feed live | 60 forecasts stamped |
| Closing lines (5 books × 4 seasons) | CFBD /lines | ✅ | the anchor corpus |
| FCS+FBS separation | our warehouse | 🟡 | FBS-only filter queued |
| Prop pricing anatomy (DK) | nash API | ✅ 266 fits | σ 74.8/33.0/32.5 + calibration 0.94 |
| KenPom-style efficiency | derivable (PPA/poss) | 🟡 | compute after drives ingest |

## The verdict
We are NOT at baseline yet. The two mother lodes missing: **NFL play-by-play** (every EPA-adjacent metric derives from it) and **CFB team game stats + drives + usage**. Both ingest NOW, in parallel lanes. Everything lands diagnostic, stamped, CollegeGuard-checked — the gate never sleeps, but the warehouse doesn't wait.
