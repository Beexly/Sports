# nflverse/ngs-data — Dossier

**Stars:** 23 (verified 2026-10-02) · **Language:** R · **Pushed:** 2026-10-01 (alive) · **Created:** 2021-07-18

## 1. Vision
The build pipeline for nflverse's Next Gen Stats datasets: scrapes nextgenstats.nfl.com on a schedule and publishes the tracking-derived aggregates (speeds, separation, cushion, etc.) as versioned release assets on nflverse-data.

## 2. The Ask
Consume via nflreadr/nflreadpy or the release URLs. Nothing else.

## 3. Constraints
- **License: MIT** (repo; data released alongside).
- Scrapes nextgenstats.nfl.com — a surface the NFL can change or gate at will; the nflverse team absorbs that risk for the community.
- **Garrett's HARD doctrine (2026-09-28): NGS data is internal-only reasoning fuel — never shown on the site, never in metric names, never discussed publicly.** Any GSE use of this repo must respect that wall: ingest for calibration, never surface.

## 4. GSE lens
This is pure confirmation of a GSE strength rather than a gap: GSE's NGS feed wiring (ingest everything, internal-only) is exactly what this pipeline enables, and the doctrine wall is correctly drawn. The only gap it exposes is **provenance discipline**: this repo documents *which* NGS endpoints its tables come from. GSE's 47-signal registry should record the same per-signal provenance (source endpoint, refresh cadence, last verified schema) — for NGS signals especially, because NGS surface changes are the highest-breakage risk in the producer set. An NGS producer that breaks silently is a slow poison in a calibrated engine.

## 5. Verdict
**ADOPT** — MIT, alive, and exactly the feed GSE's NGS wiring needs. Consume via nflreadpy; enforce the internal-only doctrine in the producer's manifest.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/nflverse/ngs-data
- Gitdiagram: https://gitdiagram.com/nflverse/ngs-data
- Star history (23 stars): https://star-history.com/#nflverse/ngs-data
- github.dev: https://github.dev/nflverse/ngs-data
