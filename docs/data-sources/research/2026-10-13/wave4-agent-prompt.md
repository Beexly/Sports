# WAVE 4 PROMPT — ingest every extract-data file AND turn it into product
(paste into a fresh session)

MISSION: make https://github.com/Beexly/Sports the best, most creative, most
accurate fantasy and prediction sports platform in the world. The floor is
competitor parity — we ship everything competitors have that matters — and the
ceiling is differentiation they can't touch (exactness proofs, calibration
evidence, glass-box metrics). Intel that doesn't change the product is trivia.

You are running an in-depth competitive-intel ingestion sweep. Work through
ALL 35 files in C:/Users/Garrett/Downloads/ named extract-data-* (list below).
For each file: profile its schema, aggregate every entity programmatically
(never eyeball large files), write a deep analytical dossier, land it in the
intel repo, commit, and push. THEN convert every finding into floor-parity work
in the Sports repo (Phase B). Intel that doesn't change the product is trivia.
Be relentless: every entity read, every claim cited, every gap flagged AND filed
as build work. Vendor claims are unverified marketing until checked.

## 0. Repos and standing rules

- Intel repo: C:/Users/Garrett/gse-competitive-intel — work on branch
  hermes/wave2-ingest-2026-09-05b (create it from origin if missing), push with
  `git push -u origin hermes/wave2-ingest-2026-09-05b` after EVERY commit.
  Commits that don't reach origin don't exist.
- Product repo (BUILD TARGET — Phase B): C:/Users/Garrett/Sports-live,
  branch main, remote https://github.com/Beexly/Sports. Key context:
  handoff/ODDS_API_TIER_DECISION.md (paid odds tier decision), START_HERE.md
  (launch checklist — silent launch, proof-gated C1..C8), docs/strategy/
  PATH_TO_PROVEN_EDGE.md (target = proven CLV/EV edge, NOT a 70% win rate),
  subscription-primary / affiliate-additive strategy. Rails for all product
  work: feature branch per change, push branch to origin after every commit,
  small honest fixes may land on main, new user-facing surfaces go up as PRs;
  typecheck + related test suites green before push; fictional sample slate
  stays labeled fictional; copy never promises outcomes ("win the tournament"-
  class language is a bug); every new surface ships with tests and keeps
  __tests__/dfs-customer-data-contract.test.tsx green.
- Landing pattern (follow it exactly): raw JSON copied verbatim to
  waves/wave<N>-<topic>-<date>.json, analysis as waves/wave<N>-<topic>-<date>.md,
  plus a README.md section per file with audit notes. Precedent: waves/README.md
  entries for wave2 (2026-09-04) and wave3 (2026-09-12, DFS optimizers +
  prop-firm/editorial brief). This sweep is WAVE 4.
- Secret scan runs on commit in both repos — never paste keys into dossiers.

## 1. Method (proven, do not deviate)

1. For each file: `python3 -c` census first — top-level keys, entity count,
   per-shape Counter. Strip *_citation keys for analysis
   (`{k:v for k,v in d.items() if not k.endswith('_citation')}`), keep them
   for traceability in dossiers.
2. Use execute_code (or terminal python3) with collections.Counter for all
   aggregation: roster dedup, consensus counts, fee ranges, coverage stats.
   Never summarize a 1MB+ file by reading it raw.
3. The two giants (09-11 (2).json 22MB, 09-11 (5).json 17MB) will blow context:
   stream them (ijson or chunked json), aggregate to tables, sample only the
   top items for quotes. If a tool is missing, pip-install it or fall back to
   chunked reads — do not skip them.
4. Deduplicate across files (same firms/products appear in many extracts) and
   say what is NEW vs already briefed in waves/.
5. Every dossier ends with: (a) data-quality caveats (coverage counts like
   "pricing present in 6/18"), (b) GSE action reads, (c) re-extraction targets.
6. Missing fields are EXTRACTION GAPS, never findings about the vendor.
7. Commit + push per dossier (one file cluster per commit, not one giant commit).

## 2. File inventory (35 files, ~45MB) and per-file orders

ALREADY INGESTED — dedup against, do not re-brief (verify with a diff/count only):
- extract-data-2026-09-04.json + (1).json → waves/wave2-*.json
- extract-data-2026-09-12 (3).json → waves/wave3-dfs-optimizer-2026-09-12.json
  + waves/wave3-prop-firms-editorial-2026-09-12.md

DO THESE (priority order):
1. extract-data-2026-09-12 (4).json (41KB, 50 entities, schema:
   identity/core_data/notes/confidence; 40 HIGH / 5 MED / 5 LOW). Odds-API and
   sports-data vendor landscape: The Odds API, Odds-API.io, SportsGameOdds,
   Sportradar, SportsDataIO, Stats Perform, plus tooling (Parse.bot, MCPize,
   FXPropTech). Directly feeds Sports-live handoff/ODDS_API_TIER_DECISION.md:
   produce a vendor comparison (coverage, sports, pricing observed, confidence)
   and a tier recommendation. Note: one entity is an explicit not-found page.
2. 09-11 cluster — prediction markets + raw crawls (do together, cross-ref):
   (1).json (60KB: olympia track record, Kalshi, Polymarket, football-data.co.uk,
   depth charts) / (2).json 22MB GIANT (crawl_metadata, raw_responses, olympus,
   polymarket, nflverse, football-data) / (5).json 17MB GIANT (raw_ingestion,
   normalized_entities, manifest, coverage_report, failures) / (3).json (483KB:
   source inventories w/ auth requirements) / (4).json (263KB: sources) /
   (6)+(7)+(8).json (46/72/42KB: manifests, identity joins, availability
   archives, play-by-play, advanced metrics) / 09-11.json (20KB: extraction
   timestamps/statuses). Output: market-data source verdict (what is usable for
   GSE calibration vs dead/auth-walled), failures taxonomy from the coverage
   reports, identity-join assessment.
3. 09-12 (1).json (280KB), 09-12 (2).json (127KB), 09-12.json (180KB) — schema:
   url/feature_inventory/data_columns/formulas_and_math/scoring_ranking_logic
   (+pricing_ownership in (2)). Feature+formula teardowns: extract every formula
   verbatim with its source, compare scoring logic across the three, list
   pricing/ownership claims.
4. 09-08 cluster: 09-08.json (194KB) + (1).json (88KB) + (2).json (37KB) —
   domain_dossiers/repository_dossiers/discovered_targets/synthesis_metadata;
   (3).json + (4).json (8KB each, identical shape — diff them, likely dupes):
   extracted_formulas/api_intelligence/pricing_ios. Output: domain/repo target
   table with disposition per target, API intel consolidated, iOS pricing noted.
5. 08-30/08-31 cluster — build blueprints: (30).json github_repositories /
   (30)(1) leads / (30)(2) repository_analysis+industry_benchmarks /
   (30)(3) competitor_analysis+gsn_cards_product_blueprint /
   (31) collx_reverse_engineered_blueprint+technical_repository_library+
   gsn_cards_master_implementation_plan. Output: repo library table, benchmark
   table, GSN-cards plan condensed to actionable build items. NOTE: GSN cards
   scans may not be owned — brief the plan, do not reproduce copyrighted
   creative; flag anything that looks like copied creative, not facts.
6. 08-28 cluster: (28).json (1.3MB: ariacodez_deep_crawl,
   platform_competitive_analysis, supporting_intelligence) + (28).csv (1.3MB —
   inspect headers first, join to the JSON) + (28)(1).json (91KB:
   job/clones/steals/do_not_copy/clone_recipe). Output: platform analysis
   condensed, crawl highlights, and the clone-job assessed against the
   do_not_copy boundaries (report the boundary, don't cross it).
7. 08-29 x2 (28KB each: job/clones/steals/do_not_copy) + 08-27 x4
   (math_core/ingestion/validation/prop_modeling/dfs_modeling/edge/tech_stack/
   provider_details/api_key/feed_structure): diff the 08-29 pair (likely dupes),
   then consolidate the 08-27 math/modeling frameworks into one methods dossier
   (every formula verbatim + source).

## 3. Quality bar (non-negotiable)

- Every factual claim traces to a citation or source URL in the raw file.
- Report coverage as fractions (e.g. "founded_year present 10/40").
- Consensus tables wherever 2+ sources rank the same entities.
- GSE action reads in every dossier: what to build, what to buy, what to verify.
- Never fabricate, never fill gaps from memory, never weaken a failing check —
  fix the thing, not the test.
- If a file is corrupt, empty, or a pure dupe: say so with byte counts and
  move on (still log it in README).

## 4. PHASE B — leverage everything into the Sports repo (the point of Wave 4)

After EACH cluster dossier, before moving to the next file:

1. Floor-gap rows: append to waves/wave4-floor-gap-register.md (create on first
   use), one row per competitor capability:
   capability | competitor(s) + citations | GSE status (ships / partial /
   missing + exact file path or "absent") | disposition (BUILD / BUY / VERIFY /
   WONT-DO + one-line why). Verify GSE status by reading the code — never from
   memory. Known gaps to confirm (not assume): contest-vs-field payout
   simulation, multi-sport slates, bankroll tracker, best-ball explorer,
   post-lock sim dashboard, pick'em optimizers, live-updating ownership,
   graded expert leaderboard.
2. File GitHub issues in Beexly/Sports (gh issue create), one per BUILD gap:
   title with [floor-parity], body = competitor evidence + citations, acceptance
   criteria (observable behavior + tests), honesty constraints (no fabricated
   data, fictional slate labeled, no outcome promises), and the wave4 register
   row link. Small honest gaps may skip the issue and go straight to a branch.
3. Build in parity-floor-first order: ship what competitors have that we lack
   before new differentiators. Then build the ceiling items the register
   justifies (exactness proofs, calibration evidence, glass-box metrics,
   expert-leaderboard mechanic per the DailyOverlay spotlight in
   waves/wave3-prop-firms-editorial-2026-09-12.md section 9).
4. Every product change follows the section-0 rails (branch, tests, typecheck,
   push, PR for new surfaces). Record issue numbers + merge SHAs back into the
   register row so the loop is closed and auditable.

## 5. Done means

waves/ holds one raw JSON + one .md dossier per cluster above, README.md has
an entry per file, every commit is pushed to origin, waves/
wave4-floor-gap-register.md is complete with issue numbers + merge SHAs per
row, and your final message lists: files ingested, entities covered, top 5
GSE-actionable findings, floor gaps closed vs filed-as-issues (with numbers),
and what (if anything) failed with the exact error.
