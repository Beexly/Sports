# YouTube / independent-builder research — 2026-09-25

Completed research from Garrett's independent-builder lane ("find other people like that Ethan guy" — independent builders with real working models, methods learned and re-implemented as GSE's own output, never copied).

Mirrored here from `Beexly/agent-bus` (`inbox/from-motif/`) so the Sports repo — and every cloud agent working in it — has the full corpus in one place. The agent-bus copies remain the handoff originals.

## Files

| File | What it is |
|---|---|
| `sewer-dive-video-batch-2026-09-25.md` | Transcript/description-based grading of Garrett's 39 YouTube/LinkedIn links (25 batch-1 + 14 batch-2). LEARN / SKIP / FOLLOW-UP / BLOCKED-429 verdicts with methodology, datasets/APIs/code, and track-record notes. Top kernels: ELO-leakage anti-pattern (GreenCode), seal-the-last-season holdout (rugby model series), YOLOv8+optical-flow tracking pipeline. Note: YouTube transcripts were IP-blocked for the grading VM; verdicts rest on descriptions + web search, tagged DESCRIPTION / SEARCH / INFERENCE. |
| `sewer-dive-datasets-apis-2026-09-25.md` | Datasets/APIs/database inventory from the sewer dive. Top picks: nflverse + nflreadpy (spine), cfbfastR (CFB gap), PropLine (prop settlement + Pinnacle-anchored no-vig lines), ESPN undocumented feeds (free keyless fallback), Open-Meteo + NWS (leakage-safe weather). Honest gap: no free historical Pinnacle open/close source found. |
| `sewer-dive-new-builders-2026-09-25.md` | 18 ranked second-wave builder leads. Standouts: sjpagano's win-probability model, benbr11's edgelabs, the nfelo ecosystem. |
| `indie-model-builders-dossier-2026-09-25.md` | 15 independent builders ranked by plug-and-play value for the GSE engine. |
| `handoff-indie-builders-v2-fullspec-2026-09-25.md` | Tier-1 builder wiring handoffs (implementation fullspec). |
| `handoff-indie-builders-v2b-fullspec-2026-09-25.md` | Builds 7–15 wiring handoffs (implementation fullspec). |
| `handoff-ethandojo-nfl-builds-2026-09-25.md` | @ethandojo NFL build ideas (initial). |
| `handoff-ethandojo-nfl-builds-v2-fullspec-2026-09-25.md` | @ethandojo NFL builds (implementation fullspec; XGBoost recipe reverse-engineered from his content). |
| `handoff-video-model-builds-v3-fullspec-2026-09-25.md` | 18-build implementation handoff: V1–V8 video kernels (leakage probes, seal-last-season holdout, CV movement primitive, deterministic replay, model CSV contract, generalized-Poisson TD model, feature recipe, process checklist), W1–W6 second-wave builders (calibration gates, closing-line benchmark, ATS ablation, MIT anytime-TD, luck-neutralized EPA, WP event replay), D1–D4 data intake (PropLine, weather vintage, Sleeper, cfbfastR). Plus 8-item follow-up queue. |
| `excel-ladz-assessment-2026-09-25.md` | Excel LADZ model assessment: SOS-adjusted ratings, 12-game window, Bayesian prior blending, ~10% HFA, generalized-Poisson TDs, 5k Monte Carlo sims in Excel via Power Query (TeamRankings + PFR). No published track record; workbook behind $27.50/mo Patreon — learn the method, don't take the file. |

## Status notes

- The 39-link video grading completed 2026-09-25 (this corpus). A separate creator-pipeline lane (full-account scrape → transcribe → classify) was paused by Garrett ("forget jev for now") — not part of this push.
- All material here is method-intake for re-implementation, per the standing doctrine: learn from builders' methods, produce GSE's own output.
