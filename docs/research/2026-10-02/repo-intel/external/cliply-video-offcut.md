# cliply-video / offcut

- **Stars:** 0 | **License:** Apache-2.0 | **Pushed:** 2026-09-21 (alive, brand new) | **Lang:** TypeScript (desktop app, macOS/Windows/Linux)

## Vision
An open-source, **offline-first desktop video toolbox** for sports analysts: paste a YouTube URL (yt-dlp download with live progress), import a sports-analysis XML (SportsCode / Nacsport / cliply / Angles) to auto-cut clips, join files, convert formats — all via ffmpeg, no account, no cloud, no telemetry. Built by the cliply.video team as the free companion to their analysis product.

## The Ask
- Download the desktop release; runs fully offline after that. Input is a YouTube URL or an analysis XML; output is MP4 clips via ffmpeg.

## Constraints
- Apache-2.0 — adoptable.
- Zero stars, brand-new, single-vendor maintained (cliply-video org). The "import analysis XML" workflow assumes you already have tagged film (SportsCode etc.) — it cuts, it doesn't *find* moments.

## GSE lens
This is the closest thing in the sweep to GSE's actual video workflow — and it exposes that **GSE's clip pipeline is manual where it could be tooled.** GSE's rule (real footage, seconds-long, telestrated, commentary-led) describes *editorial standards*, not a pipeline. Offcut shows the pipeline shape: download → segment/cut → review → export, offline, scriptable. Two GSE-relevant takeaways: (1) the XML-import pattern (cut from a structured event list) maps directly onto "nflverse play-by-play → timestamp list → auto-cut candidate clips," which GSE could build since it already ingests nflverse; (2) offline-first matters for Garrett's cost posture — no per-clip API spend. The gap isn't that GSE lacks an editor; it's that there's no *machine* between the game and the editor. Apache-2.0 means the ffmpeg orchestration patterns can be borrowed legally.

## Verdict
**ADOPT** (patterns) / **REBUILD** (the nflverse→clip-list bridge, which doesn't exist anywhere) — Apache-2.0 allows direct reuse of the download/cut/export orchestration.

## The 4 tricks
- CodeWiki: https://codewiki.google/github.com/cliply-video/offcut
- GitDiagram: https://gitdiagram.com/cliply-video/offcut
- Star history: https://star-history.com/#cliply-video/offcut (0 stars)
- github.dev: https://github.dev/cliply-video/offcut
