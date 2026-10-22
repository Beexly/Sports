# CONTEXT LOCATOR — Where Everything We Know Lives
### For handoff to deep research agents. Compiled 2026-10-21 by Motif. If you are an agent receiving this: do not guess where context lives. It is listed here, with exact paths, sizes, coverage, and freshness. Read the locator first, then go to the named file.

**How to use this sheet.** §1 is the compiled layer (start here). §2 is the extracted depth underneath the compilations. §3 is the primary sources themselves. §4 is the rules for trusting what you find. Paths beginning `~/` are on Motif's VM (Garrett's workspace). Repo paths are in Beexly/Sports on GitHub (public) unless marked local-only.

---

## §1 — THE COMPILED LAYER (read these first)

| # | Document | Path | Size | What it is |
|---|---|---|---|---|
| 1 | **Situational Context v2** | `~/workspace/your_files/SITUATIONAL-CONTEXT-V2-2026-10-21.md` | ~31 KB | The current synthesis of everything learned Sep 9 – Oct 21, 2026, with a corrections register (25 items v1 got wrong) and a gap audit. **This is the governing summary.** |
| 2 | Situational Context v1 | `~/workspace/your_files/SITUATIONAL-CONTEXT-2026-10-21.md` | ~38 KB | The first-pass synthesis. Superseded by v2; retained because its §2 doctrine text and §3 engine record are quoted by v2. Where v1 and v2 disagree, v2 governs. |
| 3 | **The Master Packet** | `~/workspace/your_files/master-packet-2026-10-13.md` | ~280 KB (with its ledger) | Compiled 2026-10-13 for exactly this purpose: everything Garrett has sent, saved, and built around, organized by capability cluster, with the four-lane map and doctrine stack. Companion: `master-ledger-2026-10-13.md` (~1,640 enumerated rows). Dated Oct 13 — predates the Oct 14–21 layer. |
| 4 | Package Register | `~/workspace/your_files/PACKAGE-REGISTER.md` | — | P-01…P-19: every package/drop Garrett has handed over, with audit verdicts. P-19 is CREDENTIAL-BEARING (421 hits / 23 files) — handle per §4. |
| 5 | Documentation Coverage Ledger | `~/workspace/your_files/DOCUMENTATION-COVERAGE-LEDGER.md` | — | What is documented and what is not, per source (Drive F-1 closed 18/18; Google Docs true count 116; Jules losses; per-lane gaps). The coverage truth. |
| 6 | Orchestration Board | web artifact `gse-orchestration-board`; manifest `~/workspace/agy-grind/board-pass-2026-10-16/MANIFEST.md` | 100 items | Every open item grouped by department with owner, status, and what-done-looks-like. After pass #4: Done 24 · In motion 31 · Waiting-on-Garrett 10 · Queued 35 · Parked 5. |

## §2 — THE EXTRACTED DEPTH (mined 2026-10-21, all content-level)

Root: `~/workspace/situational-mining/` (4.5 MB total). Pass 1 (index-level) then deep pass (content-level). The deep files supersede the pass-1 files where they overlap.

| File | Size | Contents |
|---|---|---|
| `deep/morning-work-deep.md` | 1,075,745 B | **The morning work, complete.** All 170 source files read in full (61 x-intel + 102 run-logs + 7 SiriusXM/briefs; 1,552,422 source bytes), organized Weeks 3–7. Metric definitions register, do-not-cite register, withdrawn-items register, the full Hurts arc, blind spots. Part files: `deep/parts/part-A.md` … `part-I.md` (10 files, 1,071,444 B). |
| `deep/remote-main-deep.md` | 451,472 B | **Remote Sports main, read directly.** Part 1: AGENTS.md sweep sections Oct 9–21 (1,168 items). Part 2: funding folder. Part 3: predictions research 2026-10-17 (incl. the FINAL_DELIVERY vs BEFORE_AFTER contradiction). Part 4: engine research 2026-10-17 + full parse of MIND_CORPUS_3000.jsonl (5,149 records). Part 5: audit ledger L-001–L-092 with stated statuses. |
| `memory-extraction.md` | 879,130 B | All 46 memory files (43 daily logs Sep 9–Oct 21 + MEMORY.md) → 2,905 dated, source-tagged items, 15 themed parts. Part files: `parts/part-00…part-14`. |
| `deep/big-docs-deep.md` | 54,100 B | The ten big synthesis documents opened directly (master packet, master ledger, 45-day compendium, GSE master inventory, state-of-the-system, engine-ingestion inventory, signal census, ingestion ledger, the two analytics compilations). 33 items flagged NEW-TO-THIS-PASS + a cross-document contradiction section. |
| `workspace-extraction.md` | 45,610 B | 54/54 GOAL.md files + both registers + state-bearing goal artifacts → 116 dated items, 12 themes. |
| `deep/lane-timelines-deep.md` | 38,523 B | Money-sprint series (40 files) + marketplace-watch series (14 files) read in full as chronological timelines: every product, price change, buyer arc, blocker age, dollar figure. |
| `deep/drive-minis-deep.md` | 28,970 B | Drive assets (19 files / 887 MB: 8 text full, 3 part, 8 zips with 338 files extracted) + Minis self-email attachments (50). Pricing design, silent-launch record, CLV store state, ARE definition. No secret values extracted, by rule. |
| `deep/people-groups-deep.md` | 27,107 B | All 175 people/group files (596,736 B): who everyone is to Garrett, thread states, open items. Grouped: inner circle/family, fleet, professional/legal, clients, Marketplace buyers, everyone else. |
| `sports-extraction.md` | 17,988 B | Local Sports checkout inventory (docs/ = 4,557 files, 605 CSVs) + content reads of the calibration/doctrine/verdict files. **Checkout is STALE (Oct 8)** — see §3. |

## §3 — THE PRIMARY SOURCES

**Memory tree (Motif's VM):**
- `~/MEMORY.md` — curated durable memory (~44 KB, 157 lines). The standing record.
- `~/memory/YYYY-MM-DD.md` — daily logs, 2026-09-09 → 2026-10-21, continuous, ~5.5 MB with MEMORY.md. **No logs exist for Sep 1–8.**
- `~/memory/people/` (172 files incl. INDEX) and `~/memory/groups/` (3 files) — the relationship record.
- `~/memory/bank/`, `~/memory/index/`, `~/memory/shopping/` — exist; not yet mined at content level.

**Workspace (Motif's VM):**
- `~/workspace/your_files/` — 718 files: the registers, ledgers, packets, prompts, and deliverables (incl. the financial deep dive 2026-09-19, FSA resolution, funding intel brief).
- `~/workspace/goals/<slug>/` — 54 goal workspaces. `GOAL.md` = state; `files/` = user-facing documents; `hidden_files/` = working state (sweep staging, run logs, sprint files, watch files).
- `~/workspace/agy-grind/` — AGY packages, the board manifest, rotations runbook, Drive assets drop (`drive-assets-2026-10-16/`, 18 assets, ~930 MB), Minis self-emails drop (`minis-self-emails-2026-10-16/`, 37 emails, 50 attachments).
- `~/workspace/mcp-servers/gse-spark-mcp/` — the live fleet MCP bus (port 4311, SQLite fleet.db).

**Beexly/Sports (GitHub, public — the system of record for all sports material):**
- Remote main is CURRENT. AGENTS.md on main = 2,435,675 bytes (the running benchmark/sweep inventory). Key paths: `docs/research/<date>/` (dated research + `full-tables/` CSVs, 521 across docs/), `docs/predictions/research/2026-10-17/`, `docs/engine/research/2026-10-17/` (MIND_CORPUS_3000.jsonl), `docs/arxiv-program/` (1,707 files; 1,511 paper dossiers; tracker at `research/2026-09-21/arxiv-program/phase2/AUDIT-2026-09-21-tracker.md`), `docs/funding/research/2026-10-16/`, `docs/ops/AUDIT_INCORPORATION_LEDGER.md` (32,343 B), `docs/ops/AGENT_LEDGER.md`.
- **WARNING:** the local checkout at `~/workspace/vendor/Sports` is on branch `motif/x-intel-2026-10-08-am` @ `1984cfaf` (Oct 8) and is NOT current. For anything after Oct 8, read remote main (raw: `https://raw.githubusercontent.com/Beexly/Sports/main/<path>`), never the local checkout.
- **NEVER touch `gse-grok-build-sandbox`** — isolated by design, not production.

**Beexly/agent-bus (GitHub, PUBLIC):** the fleet archive — inbox/outbox task files between Motif, Hermes, and others. Current bus state (board-gate task, refresh routing, cycle reports) is filed there under `gse/inbox/` and `gse/outbox/`. **WARNING:** a credential was once staged here and remains in git history — never put secrets in this repo, and treat anything credential-shaped found here as exposed.

**External surfaces:** galaxysportsedge.com (Vercel project sports-web; Render service "Sports") · Neon Postgres project gse-postgres (the engine DB) · Hugging Face Space `Beexly/gse-watch-pipeline` · X account @GalaxySportsHQ · The Odds API account (20K credits/mo).

**Known-missing (do not hunt for these in the record; they are not there):** Grok and Claude account data exports (downloaded to Garrett's own machine; handover = his upload) · `gse-full-corpus-text.zip` (never landed locally; its content tree = Sports docs/research) · the gse_cal 58 dossiers and Harper seed files (confirmed absent everywhere) · 8 deleted Jules sessions (unrecoverable) · Google Docs beyond the 18 landed (116 total; contents live in Garrett's Google account).

## §4 — RULES FOR TRUSTING WHAT YOU FIND

1. **Later corrections govern earlier claims.** This operation self-corrects in the open and keeps both records. When two files disagree, the dated correction wins; v2's §A register lists the 25 known cases, and §I lists the conflicts still unresolved — do not resolve those yourself; report both sides.
2. **Manifests over interim summaries.** Sweep and SiriusXM material was repeatedly corrupted by interim browser summaries and rebuilt from final manifests. If a claim traces only to an interim summary, it is UNVERIFIED. The do-not-cite and withdrawn registers live in `deep/morning-work-deep.md` and v2 §D.
3. **Count scopes never add.** Every corpus count carries its scope (what was counted, where, when). arXiv: 579/750 verified reads is the standing number; larger figures are unverified chat claims.
4. **Remote main over local checkout; the ledger over prose reports.** For repo state, read GitHub main. For fleet work state, `docs/ops/AGENT_LEDGER.md` and the live surface outrank any agent's summary — agent "verified live" claims have been caught overstated.
5. **Attributed is not verified.** Show-host claims, sweep filings, and post claims are recorded as attributed. The Hurts item (v2 §I) is the standing example: five sources, no resolution.
6. **Credential-bearing material exists in the corpus** (the P-19 package; the agent-bus history). Extract no secret values. Note the file and that it contains credential material, and move on.
7. **Nothing here is killed.** Items carry current status, not verdicts. A "parked," "dead," or "refused" status is a fact about today with its reason recorded — the reason is what you reason from.

*End of locator. Compiled from the same 2026-10-21 mining passes as Situational Context v2; sizes verified on disk at compile time.*


---

## Inventory & 4-Point Gap Audit (2026-10-22, Stream 13B / RT-01)

**Inventory.** 625 posts were mined from X via Grok `x_search`; 80 were promoted to
records across 8 themes (Records 1.1–8.10), 10,406 words in this file. The remaining
545 posts are indexed in the mining workspace but are not yet promoted to rules.

**Gap 1 — Coverage.** 80/625 = 12.8% of mined posts are promoted. The 545 unpromoted
posts are not evidence for any function until they are read and mapped; they are
counted here rather than silently treated as covered.

**Gap 2 — Numeric grounding.** X posts rarely publish fitted constants. Where the
corpus states a number (+0.19, +0.21, -0.04, 2-8 SU, 8.5 points, 15-20%, 48%/94%,
r=0.08/0.35) the implementation uses it verbatim. Where no number is published the
function requires the value as an argument; no constant was invented to fill a gap.

**Gap 3 — Verification.** All 8 themes are mapped to 10 live functions in
`packages/prediction-engine/src/nfl/x-situational-80-rules.ts` and exercised by the
Record-group test (`ngs-aws-cnn-attention-and-x80-stream13.test.ts`). 80/80 records
are represented by their theme's function; individual record-to-assertion granularity
is 8/8 theme groups, not 80 separately named tests.

**Gap 4 — Freshness.** The corpus is a 2026-10-21 snapshot. Source links have not been
re-fetched since promotion, so link rot and deleted posts are not measured here.
