# External leverage map (outside Beexly/Sports)

Machine-readable registry: `packages/stats-api/src/sources/external-registry.ts`  
API: `GET /api/gse/v1/external`

## Free data / APIs (commercial path when ToS allows)
| Source | Use |
|--------|-----|
| nflverse | NFL foundation (CC-BY-4.0) |
| Open-Meteo / NWS | Weather |
| ESPN public API | Scores multi-sport |
| henrygd NCAA API | CFB/CBB free |
| CollegeFootballData | CFB advanced |
| balldontlie | NBA free tier |
| MoneyPuck / NHL API | Hockey |
| openfootball | Soccer CC0 |
| OpenF1 / Jolpica | F1 telemetry |
| The Odds API | Licensed odds (paid when needed) |
| Kalshi public | Prediction market corroboration only |

## HuggingFace / CV (research-first, not silent commercial)
| Source | Use |
|--------|-----|
| MCG-NJU/SportsMOT | Player MOT eval |
| TeamTrack | Full-pitch MOT paper/data |
| CourtSide YOLO | Tennis ball detect |
| facebook/detr-resnet-50 | Generic detect bootstrap |
| SoccerNet | Action spotting research |
| Roboflow Sports Universe | Scorebug/jersey per-dataset license |
| BaseballCV | Pitch/hit vision research |

## Engines
Feast · Ultralytics YOLO · roboflow/supervision

## Law
- research_only ≠ commercial ingest  
- unknown_review = BLOCKED until counsel  
- CC-BY-SA = hold (pbp_participation pattern)  
- Measurement > narrative — eval metrics stay DARK until ship floors
