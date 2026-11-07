# Data-Sources Ingestion Dossier (`2026-11-02`): Nov 1 Pregame Data Pack (`2,142` Lines), Nov 2 X-100 (`101` Dossiers) & IG-50 (`50` Dossiers) Sweeps

**Filing Bucket:** `docs/data-sources/research/2026-11-02/`  
**Doctrines Enforced:** `INGEST-AND-LEARN` (2026-09-28) · `DIRECT-TO-MIND/ENGINE` (2026-10-04) · `THE STACK` (2026-10-05) · `THE LEARNING LOOP` (2026-10-05)  
**Archived Source Files in Bucket:**
- [`2026-11-01-PREGAME-DATA-PACK.md`](file:///C:/Users/Garrett/Sports/docs/data-sources/research/2026-11-02/2026-11-01-PREGAME-DATA-PACK.md) (`2,142` lines)
- [`2026-11-02-X-100-DOCUMENTED.md`](file:///C:/Users/Garrett/Sports/docs/data-sources/research/2026-11-02/2026-11-02-X-100-DOCUMENTED.md) (`1,555` lines · `101` dossiers: `TEST 14 · LEARN-ONLY 34 · CONTEXT-ONLY 51 · WATCH 2`)
- [`2026-11-02-INSTAGRAM-50-DOCUMENTED.md`](file:///C:/Users/Garrett/Sports/docs/data-sources/research/2026-11-02/2026-11-02-INSTAGRAM-50-DOCUMENTED.md) (`765` lines · `50` dossiers: `TEST 16 · LEARN-ONLY 11 · CONTEXT-ONLY 22 · WATCH 1`)

---

## 1. High-Signal NFL/CFB Football & Quantitative Models Extracted from `2026-11-02-X-100-DOCUMENTED.md`

Every untested quantitative / football-tactical item in the 101-post X pull is cataloged below under `INGEST-AND-LEARN` (`UNTESTED — QUEUED FOR EVALUATION` or `LEARN-ONLY`):

| Dossier # | Handle / Source | Core Signal / Metric / Model | Verdict | GSE Engine Integration Target |
|---|---|---|---|---|
| **#13** | `@Timo_NFL` (Timo Riske, PFF) | **OL vs. QB Responsibility for Pressures & Sacks (`2024–2026`):** Separates pressure rate into OL-allowed vs. QB-created (`P2S` survival curve + time-to-throw interaction). | `TEST` | `intelligence/coaching/pressure_answer.py` — orthogonalize OL pass-block win rate from QB pressure-to-sack (`P2S`) creation. |
| **#49** | `@The_Coach_A` (Cody Alexander, MatchQuarters) | **Brian Flores 5-Man Fire-Zone (`~70%` Blitz Rate vs. LAR):** Film cut of Minnesota's simulated/fire-zone blitz mechanics (`guard-read-and-drop` + `Harrison Smith` late pre-snap rotation). | `LEARN-ONLY` | Wired into `EQ-B6-06` (`intelligence/coaching/dc_pressure.py`). |
| **#67** | `@sfdata9ers` | **QB EPA/Play vs. Man & vs. Zone Scatter (`Weeks 1–8`):** Identifies QBs with extreme Man/Zone polarity (`Michael Penix Jr.` strong vs. Man, bottom-3 vs. Zone pressure; `Jared Goff` vs. two-high). | `LEARN-ONLY` | `packages/prediction-engine/src/nfl/master-situational-reasoning-aggregator.ts` (`coveragePersonnel` family). |
| **#72** | `@PattonAnalytics` | **Defensive Stuff Rate Top-10 (`Weeks 1–7`) + `SCRACK` / `TOXIC` Explosive Differential:** Explains why a `#1` stuff-rate defense that ranks `#26` in open-field yards per attempt (`CIN`) creates bimodal home-run RB ceiling (`Tony Pollard 31.70 DK pts`). | `LEARN-ONLY` | Wired into `EQ-B6-01` (2nd-Order Wavelet Scattering Intermittency Ratio $\mathcal{I}_{\text{scat}}$). |
| **#74** | `@nfl_simulator` | **Interceptable-Throw Rate Shrinkage Model (`Weeks 1–8`):** Empirical Bayes shrinkage of raw INTs toward turnover-worthy / interceptable throws (`Michael Penix Jr.` 0-INT streak vs. top-10 TWP rate). | `LEARN-ONLY` | `packages/prediction-engine/src/nfl/x-situational-80-rules.ts` (`validateFeatureAgainstMisleadingStats`). |
| **#20, #88** | `@Statsowar` / `@fball_insights` | **CFB Playoff / Conference Title Market vs. Model Simulation Delta & Pass-Pro vs. Run-Block Composite (`Weeks 1–8`).** | `LEARN-ONLY` | CFB Trench & Market-Overlay features. |
| **#4, #28, #30, #46, #52, #53, #58, #63, #71, #84, #90, #99** | Agentic / Dev Tooling (`@reach_vb` Qwen3-VL-30B-A3B, `@DataChaz` markitdown, `@RoundtableSpace` Claude Skills, `@hamptonism` Aleph OSM, `@akositim` Meldwork, `@thisdudelikesAI` NotebookLM-mastra) | Multi-modal OCR, PDF-to-Markdown ingestion, and agent harness benchmarks (`TEST` queue). | `TEST` | Queued for sandbox evaluation under `INGEST-AND-LEARN`. |

---

## 2. High-Signal Items Extracted from `2026-11-02-INSTAGRAM-50-DOCUMENTED.md`

| Dossier # | Handle | Topic / Resource | Verdict | Notes |
|---|---|---|---|---|
| **#2** | `@getintoai` | **Anthropic Official Prompt Engineering Interactive Tutorial (`github.com/anthropics/courses`)** | `TEST` | 9-chapter structured prompt engineering curriculum for agent harness optimization. |
| **#4** | `@github_dev` | **GitHub Next `Spec Kit` (`github.com/github/spec-kit`)** | `TEST` | Spec-driven development toolkit (`/specify`, `/plan`, `/tasks`) for multi-agent code generation. |
| **#11** | `@drop.sauce` | **Google Stitch (`stitch.withgoogle.com`) UI-to-Code Workflow** | `TEST` | Rapid frontend/mobile UI prototyping. |
| **#21** | `@solo.developers` | **Open-Source Dev Stack (`Hoppscotch`, `Appwrite`, `ChartDB`, `Coolify`, `NocoDB`)** | `TEST` | Self-hosted developer infrastructure tools. |
| **#47** | `@br_cfb` | **USC TE Mark Bowman 70-Yard Hurdle Catch vs. Ohio State (`USC 30 - OSU 18`)** | `LEARN-ONLY` | Confirms the CFB Week 9 (`Oct 31`) `Ohio State at USC` upset mechanism where USC's seam/TE attack broke OSU's safety structure. |

---

## 3. Synthesis of `2026-11-01-PREGAME-DATA-PACK.md` (`SiriusXM Ch. 87` + `Ship It Nation`)

1. **SiriusXM Ch. 87 (`17` Full Episode Transcripts, Oct 29–30):**
   - **John Hansen's "Stank Squad" (`Episode 8`, line 494) went `7-for-7` (`100%`)** fading overpriced schematic traps (`Matthew Stafford 9.28`, `Jonathan Taylor 7.70`, `Quinshon Judkins 6.90`, `Carnell Tate DNP`, `George Pickens 6.80`, `Justin Jefferson 33 yds`, `Sam LaPorta 6.50`), while his coverage-funnel pivots (`Dylan Sampson OVER 11.5 rec yds -> 62 yds`, `Ryan Flournoy 13.10 DK pts`, `T.J. Hockenson 15.80 DK pts`) all hit.
   - **Actionable Engine Rule:** Wire Hansen's **Coverage-Funnel × Two-High Target-Share Delta ($\Delta \text{TPRR}_{\text{2-High}}$)** directly into the DFS projection adjustment layer (`Stage 4` `coveragePersonnel` family).
2. **Ship It Nation (`ToeTagginTambo & Alex Blickle / Blick Analytics`, `Part 7`, lines 1460–1648):**
   - Demonstrated why **Conditional Ownership within Stacks** (e.g., `Wan'Dale Robinson` and `Elic Ayomanor` being the over-owned cheap bring-backs in `Joe Burrow` stacks while `Tony Pollard` at `<10%` ownership carried bimodal `21/117/2TD = 31.70 DK pts` explosive tail equity against CIN's `#26` open-field rush defense) and **Single-Entry Fragility Gating** (avoiding `BAL @ BUF` stacks in SE/3-Max) are mandatory for GPP top-1% construction.
