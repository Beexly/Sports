# DIV-4 Content & Media — Lead Status (2026-10-18, ~04:20 CT)
Author: DIV-4 Lead (agent id 0c0be89c-c287-4055-84e8-4b5d798929f5). Reports to GSE MAIN BOT only.

## 1. Roster
Specialists: each was created Oct 16 between 14:10 and 14:23 CT. Each one reports only to the DIV-4 Lead and follows gse-operating-methodology.
"Live" means the bot has done assigned work in the last 24h. "Idle" means it exists but has had no assignment yet.

| Bot | Agent id | Role (one line) | State |
|---|---|---|---|
| writing-bot | b001fd13-0c8c-4e24-8e85-0e15a3768c6a | Long-form research and whitepaper drafter; drafted the Week 6 Situational Reads | LIVE |
| human-copywriter | 498f8deb-9606-4154-8f31-f4a0914a8071 | Plain-English editor; first reviewer of every rendered visual | LIVE |
| image-gen-bot | 3cb46dc6-d035-41e7-9cd4-ffe6ebbe4410 | Premise-tree and trench schematic renderer (owns /workspace/div4/visuals templates) | LIVE |
| critiquito | 4ca01dfc-e04b-43d4-8786-a353826ddcec | Visual hierarchy, UI/UX and drift-guard critique gate | LIVE |
| best-video-editor | bc147d8a-ac29-4e09-966f-daf63964a0d9 | Real-footage trim and mastering (-14 LUFS, multiple aspect ratios) | IDLE |
| clip-bot | f4ba7828-793b-490d-8a7a-9958777111f7 | Transcribes pressers and film rooms; scores segments for Layer-2 intel and clip potential | IDLE |
| dial-bot | 05785709-bd0a-4488-8679-4833fddd25f6 | Voice briefing naturalness (TTS) calibrator | IDLE |
| figma-bro | 7475f4f0-bbe2-4209-b788-0d1efe6cc2fe | Data-viz and Situation Room component architect | IDLE |
| imogen | 6ff6dbe6-b641-4365-bff3-d842c5bda132 | Brand identity and visual standard sentinel | IDLE |
| luma-pages | 9ae13b2f-25f4-480c-a62c-7433b5bd7cff | Event pages, agendas and run-of-show for game-day X Spaces | IDLE |
| marketing-analyst | 31b5bd68-7cc9-4847-b8fc-4cd4e66cf16b | Audience growth and engagement measurement | IDLE |
| marketing-project-manager | d002e9e1-3d7c-4768-b952-82fad417d5d9 | Editorial pipeline and calendar | IDLE |
| performance-marketer | 42622c8d-1fa3-4120-8ed3-174fdeea2a0b | Organic conversion funnel (free visitor to registered user or Kit demo) | IDLE |
| pfp-bot | 480303d3-0cbf-4c9b-a8e5-fd35c518d521 | Brand avatar and icon set keeper | IDLE |
| product-marketer | 415fa899-fd3d-484c-9817-4bc104d6ec58 | Release notes and methodology explainers | IDLE |
| sable-game-art | c5be1210-af62-44a7-bc43-0e19b6765a9e | Drive charts and play-visualizer graphics | IDLE |
| seo-aeo-desk | dd6e5f30-96c4-49a7-aadb-89b1ef8c0b84 | On-page metadata and SportsEvent JSON-LD | IDLE |
| tech-demos | 1d298cde-e787-4163-9eda-1bae8c4bab3f | Interactive demo widgets for Layer-2 reasoning | IDLE |
| website-ops | 56c012a2-b8e9-4f7c-9a39-f724aa6990d1 | Read-only Vercel and DB watchdog for galaxysportsedge.com | IDLE |

## 2. Live schedules
- "DIV-4 daily status to GSE MAIN BOT": every day at 17:00 CT (flexible, ±15 min). Owned by the DIV-4 Lead. Last ran Oct 17 at 17:08 CT and succeeded.
- Specialists' routines: UNKNOWN. Routines are stored on the server for each agent, and I can't see them from here. I have not assigned any specialist a recurring schedule.

## 3. Data contract
Reads:
- /workspace/gse/blackboard/layer1/week6/*.json (Layer-1 de-vigged consensus baseline; Friday Oct 16, 15:19 CT snapshot)
- /workspace/gse/blackboard/news/*.json (DIV-2 news pulse)
- /workspace/gse/schemas/blackboard-envelope-v2.json
- Skill: /home/box/agent-data/workflows/gse-operating-methodology/SKILL.md

Writes (on the blackboard, signal only):
- /workspace/gse/blackboard/div4/situational-reads/{CAR-at-PHI,WAS-at-SF,LAC-at-KC}_week6_situational-read.json (writing-bot; envelope present, reliability_weight 0, published false)
- /workspace/gse/blackboard/div4/situational-reads/*_edited.json (human-copywriter; envelope present, weight 0, *_original audit fields)
- /workspace/gse/blackboard/div4/visuals/README.json (pointer only; envelope validated against v2)
- Envelope compliance of the situational-reads files against v2: UNKNOWN. They carry the 9 envelope fields, but I have not run a v2 schema validation on them.

Off the blackboard (DIV-4 workspace, non-signal):
- /workspace/div4/visuals/ holds template scripts, fixtures, example renders, QA, contrast and manifests v1.0.0 to v1.1.4. The 73 files DIV-3 flagged, plus everything else under visuals (172 files moved by image-gen-bot), are now here. Every hash was checked after the move. relocation.v1.1.3.json maps old paths to new ones.
- /workspace/div4/visuals/critiques/ holds critiquito's critique JSONs, previews/ and the holdout5 seal (105 files moved; hashes checked).
- /workspace/crit_tmp/ holds critiquito's sealed holdout strings (read-only by convention).
- Reviewer sidecars (decided, not yet produced): <name>.review.json next to each real-data render.
- Write rule: write to .tmp, then rename. Never overwrite another bot's files.

## 4. Code, sites and scripts
- Repo, branch, Vercel project, domain: none for DIV-4 code. The visual templates are local scripts in /workspace/div4/visuals/ and are not in git. website-ops watches galaxysportsedge.com read-only; that project's Vercel project name, repo and branch are UNKNOWN to me.
- Current entry points (v1.1.4):
  - python3 /workspace/div4/visuals/premise_tree_v1.1.4.py INPUT.json --out-dir DIR --name NAME --layout desktop|social
  - python3 /workspace/div4/visuals/trench_alignment_v1.1.4.py INPUT.json --out-dir DIR --name NAME --layout desktop|social
  - These flags are the ones the v1.1.4 test harnesses use. The full CLI is in the scripts.
  - Exit codes: 0 means OK. 2 means drift or the SVG gate hit, and only .REJECTED files are written. 3 means a layout or counter-thesis failure.
- Shared library: gse_vis_common_v1_1_4.py (drift lint with NFKC/zero-width/dash/look-alike normalisation, XML-parse SVG text gate, atomic writes).
- Tests: test_drift_guard_v1.1.4.py, test_premise_social_v1.1.4.py, contrast_audit_v1.1.4.py, h5_cli_check_v1.1.4.py.
- Manifest: manifest.v1.1.4.json (lease_version 6, weight 0, 81 files sha256).
- Dependencies verified on the box: Python 3.13.5, Pillow 12.3.0, cairosvg 2.9.1, Inter font (falls back to DejaVu).
- Env var names: none used by DIV-4 scripts.

## 5. Current state of today's work
- Week 6 Situational Reads (CAR@PHI, WAS@SF, LAC@KC) are drafted and edited into plain English, and the drift review is clean (0 items). Verdict for EMISSION: Insufficient Data. The Layer-1 baseline predates Saturday's injury news, the PHI and KC total moves come from a single unverified source, and Hurts' IR status and Sunday inactives are pending. writing-bot will publish versioned updates.
- CHI@ATL and PIT@TB were deferred (Williams' start unconfirmed; PIT@TB wind data too early and a Layer-1 line tie).
- Visual templates: premise_tree and trench_alignment passed all 5 design checks at desktop (1600w) and social (1080x1350). The drift-guard regex was rated Insufficient Data on sealed holdout5 (drift caught 35/51 = 68.6%, false alarms 4/41 = 9.8%).
  - Decision: the regex is a backstop only. v1.1.4 is accepted, and the templates are cleared for internal real-data drafts only.
  - Each render needs a rendered-text review by human-copywriter and then the DIV-4 Lead before it leaves DIV-4.
  - Workstream closed.
- No real-data renders exist yet. Nothing is staged for EMISSION approval.
- No CFBD calls by DIV-4 since Oct 1.

## 6. Known bugs and open issues
1. HIGH: ambiguous entry points. /workspace/div4/visuals/premise_tree.py and trench_alignment.py (no version suffix) are the v1.0.0 scripts. They import gse_vis_common.py, the v1.0.0 lint without normalisation or the SVG gate, and README.md is also the v1.0.0 text. Repro: run premise_tree.py with input containing "Ridgeline –3.5 looks like a lock" (en dash). Per critiquito's v1.1.1 critique, v1.0.0-era guards pass this. Anyone not reading README.v1.1.4.md gets the weak guard.
2. MEDIUM: drift-guard regex misses on untuned text, so it is leaky by design. Known v1.1.4 misses (per image-gen-bot): spaced-dash spread, "the sharp side is X", "cash this ticket". Known false alarm: "turnover margin: -3 over four games". File: gse_vis_common_v1_1_4.py (line numbers UNKNOWN).
3. MEDIUM: social layout cuts very long titles and player names with "…"; the full text is in the desktop render.
4. LOW: older critique JSONs cite pre-move blackboard paths in their text (kept as historical records).
5. LOW: manifest.v1.1.3.json.superseded-1 is a leftover file in /workspace/div4/visuals/.
6. Situational Reads cite blackboard sources as file:// paths. This is the DIV-4 standard, decided Oct 17.

## 7. Coding asks
1. Single canonical entry point.
   - Make premise_tree.py, trench_alignment.py and gse_vis_common.py thin wrappers (or symlinks) to v1.1.4, or move v1.0.0 to v1.1.3 into /workspace/div4/visuals/archive/. Point README.md at v1.1.4.
   - Acceptance: `python3 premise_tree.py` with an en-dash "lock" input exits 2 and writes only .REJECTED. test_drift_guard_v1.1.4.py passes. Manifest hashes are re-recorded in a new manifest version.
2. Put /workspace/div4/visuals under git, either in a repo Garrett chooses or as a local repo.
   - Acceptance: v1.1.4 is tagged, tests run in CI or a pre-commit script, and no secrets are committed.
3. Review sidecar validator.
   - A script that, for each real-data render, checks that <name>.review.json exists from both human-copywriter and the DIV-4 Lead, each with verdict Promote and a rendered_text sha256 that matches the current rendered_text.txt.
   - Acceptance: exits non-zero for a missing or mismatched review. Tested on one passing and one failing fixture.
4. v2 envelope validator for /workspace/gse/blackboard/div4/**.
   - Acceptance: reports a pass or fail count for each file. It must find 100% compliant, or list the offenders.

## 8. Constraints
- No public posts, external messages, spending or production promotion without Garrett's approval through GSE MAIN BOT (the EMISSION and PROMOTION gates). Owner accounts and credentials are never touched.
- Brand and product: GSE sells understanding, not predictions.
  - Never use picks, "the plays", W/L records, confidence %, "beat the close", sportsbook deeplinks or pick cards.
  - Frame content as Situational Reads or Diagnostic Audits, with a counter-thesis always shown.
- All DIV-4 outputs start at reliability_weight 0 and are staged. They follow the write-to-.tmp-then-rename rule, and real-data visuals also need the two-reviewer rendered-text gate.
- CFBD: log every call to /workspace/gse/blackboard/ops/cfbd-usage.jsonl. Bulk pulls need DIV-2 sign-off.

## 9. Unknowns
- UNKNOWN: routines or schedules owned by any of the 19 specialists.
- UNKNOWN: Vercel project name, repo and branch for galaxysportsedge.com, and whether website-ops has run any check yet.
- UNKNOWN: v2 schema validation status of the six situational-reads files.
- UNKNOWN: exact line numbers of the drift-guard misses in gse_vis_common_v1_1_4.py.
- UNKNOWN: whether writing-bot has published versioned updates since Oct 17, 17:11 CT.
- UNKNOWN: whether every specialist actually set avatar_color to gray. No failures were reported, but I did not verify.
