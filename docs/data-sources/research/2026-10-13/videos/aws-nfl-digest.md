# AWS/NFL + YouTube transcript ingest digest (2026-10-13)

Sources (all public, keyless; fetched 2026-10-13):

1. AWS NFL page - https://aws.amazon.com/sports/nfl/ (410,794 bytes HTML)
   Extracted capability map (headings + embedded JSON content blocks):
   - Next Gen Stats real-time pipeline ("500M+ data points per season")
   - Pressure Probability (Big Data Bowl lineage; 4 ML models; 90,000+ passing
     plays over 5 seasons; per-second pass-rusher pressure from sensor data)
   - AI-powered Tackle Probability
   - Digital Athlete (player health/safety simulation; injury prediction)
   - NFL IQ (fan data platform), season schedule construction
   - Amazon QuickSight ("Quick") democratized insights; Skill Builder
   Video transcript headnotes for these are in videos/yt_*.md.

2. YouTube transcripts (public captions via youtube-transcript-api), landed as
   JSON (full text + segment count) and MD (readable excerpt) under videos/:

| Video | Segs | Chars | Content |
|---|---|---|---|
| xuZRROQcWPw | 36 | 1,355 | Pressure Probability: 4 models, 90k plays, per-second pressure from tracking |
| wqvAiuC7d7U | 40 | 1,460 | (NFL x AWS piece; transcript captured) |
| NC3zTFR7maQ | 43 | 1,170 | (NFL x AWS piece; transcript captured) |
| Gvwm-B9ouN0 | 32 | 1,139 | (NFL x AWS piece; transcript captured) |
| 936vGB6MiEo | 109 | 3,807 | Berlin game; Digital Athlete (health/safety), composite AI playbook, recovery/strategy |
| cqCue7jUVk4 | - | - | TranscriptsDisabled by uploader (honest skip; no captions exist to fetch) |

## Signal-relevance for the reasoning engine

- Pressure Probability + Tackle Probability are the MEASURED mechanisms behind
  two repo signals already in use (pressure-funnel chains, DL-out EP deltas).
  When NGS exposes these per-player/per-play (the nextgenstats.nfl.com top-plays
  pages), they wire into intelligence/reasoning/signals.py as on_field,
  verification=MEASURED.
- Digital Athlete = the biophysical domain's oracle: injury-risk simulation
  context for rest/load/recovery signals (nutrition/recovery domain).
- Schedule construction (AWS) is the mechanism behind rest/travel differentials
  in the situational canon - REPORTED tier, upgradeable when NGS exposes it.
