# GSE CROSS-AGENT COORDINATION MAP

> COMPASS for every agent (Hermes / Grok / Codex / Claude / browser / founder) working the
> Sports Intelligence OS / Galaxy Sports Edge (GSE) problem space. The goal of THIS file:
> make sure NO agent's work is invisible to the others, and that handoffs are explicit.
> Written 2026-08-27 by Hermes (this machine). READ THIS before starting any GSE task.

## THE CORE TRUTH: there is ONE live coordination system
`C:/Users/Garrett/.cagent/Sports/docs/ops/AGENT_LEDGER.md` — a 136-row file ledger
validated by `scripts/ops/check-agent-ledger.mjs` (CI guard; fabricated SHAs fail the build).
Owners: `hermes`, `copilot`, `browser`, `claude`, `founder`. Rules: claim before start,
DONE needs a real SHA/PR, UNPUSHED if you can't push (single-copy risk), never edit a row
you don't own. **If you are an agent and your work is not a row here, the other 3 agents
cannot see it.** That was the gap this map closes for the `sports-intel` R&D corpus.

## THE MACHINE HAS >=3 Beexly/Sports CLONES (coordinate which you touch)
| Clone | Path | Purpose / state | Branch you're likely on |
|---|---|---|---|
| A. Hermes overnight worktree | `C:/Users/Garrett/.cagent/Sports` | The LIVE ledger repo; ~300 strategy/ops docs (`docs/ops/hermes/*`, `docs/calibration/`, `docs/edge/`); Grok/Codex/Claude outputs. Has its own `AGENTS.md` (overnight run contract). | varies (hermes/w2-audit-settlement, etc.) |
| B. Covariate-bus clone | `C:/Users/Garrett/Sports-pr` | Where the covariate bus + PFeatureSet + FrameForecast merged (PR #676). THIS orientation branch lives here: `hermes/sports-intel-orientation`. | `hermes/sports-intel-orientation` |
| C. Production GSE platform | `C:/Users/Garrett/gse-b1` | The shipping product: Next.js 14 + Stripe + The Odds API + BullMQ. Full scraping-clearance engine, pricing ladder, CLV/line-value ledger tier. | main / release |
| D. Ledger sibling | `C:/Users/Garrett/Sports-hermes-ledger` | Separate ledger/repo (see inventory). | — |
| E. GSE competitive-intel | `C:/Users/Garrett/GSE-competitive-intel` | FantasyGuru/competitor dossier + `gse_engine.py`. | — |
| F. GSE-launch / gse-data-scout | `C:/Users/Garrett/GSE-launch`, `C:/Users/Garrett/gse-data-scout` | Launch runbooks / data recon. | — |
> NOTE: there are ~80 `Sports-*` dirs under home (many are Grok/Codex/Hermes task worktrees or
> abandoned partials — see HONEST GAPS). Do not assume any of them is current.

## AGENT SURFACES (who produced what, where it lives)
- **Hermes (this runner)**: 
  - `C:/Users/Garrett/sports-intel/` — the R&D corpus this map accompanies (43/43 tests,
    Shin/CLV verified, real-data backtest +3.5% ROI free, 50 papers, 112 sites, 7-path
    feed dossier). Branch `hermes/sports-intel-orientation` in clone B registers it.
  - `.cagent/Sports` overnight edge-hunt (`OVN-0826-1`: 6,967 games 1999–2025 w/ closing
    lines; CLV census `L-6`/`L-9`; free-provider probes `L-10`/`H-S`; research dossier `C-16`).
  - `.grok/sessions/C%3A%5CUsers%5CGarrett%5CSports-hermes-*` — Grok-side session logs of
    Hermes work on hm/hq/l14–l17/ledger/t11/age-gate.
- **Grok**: `.grok/sessions/` worked `Sports-hermes-hm`, `-hq`, `-l14`, `-l15`, `-l16`,
  `-l17`, `-ledger`, `-t11`, `-age-gate`. These map to `docs/ops/hermes/l14..l18` workstreams
  (label census, close-pred feasibility, book microstructure, path geometry, book metrics).
- **Codex / Claude**: 
  - `C:/Users/Garrett/handoff/` — `EDGE_LEDGER.md` (swarm recovery, R01–R91 roles, strict
    honesty rules), `H1_RESEARCH_2026-08-23.md` (19-agent swarm: TIER1-3 edges; "13 abandoned/
    partial edge implementations found").
  - `C:/Users/Garrett/.cagent/Sports/reports/codex/`, `.../claude/` — agent reports.
  - `C:/Users/Garrett/Sports-Codex/`, `Sports-GSE-PR3-isolated/` — Codex worktrees.
  - `C:/Users/Garrett/Claude/Artifacts/sports-cockpit/` — a cockpit HTML artifact.
- **gse-run skill**: `C:/Users/Garrett/.claude/skills/gse-run/` — the runbook for continuing
  ONE GSE frontier workstream (`/gse-run next`). Reads `docs/frontier/{CURRENT_STATE,
  WORKSTREAM_QUEUE, RECOVERY_MATRIX}.md`. Use this to pick up stranded GSE work.

## LEDGER ROWS MOST RELEVANT TO THE sports-intel R&D CORPUS (cross-reference)
| Ledger ID | What | Overlap with sports-intel R&D |
|---|---|---|
| OVN-0826-1 | 6,967 games 1999–2025 w/ closing spread+total; live-quote fetcher (Manifold+Polymarket, 155 quotes); falsifier sweep on NGS signals; backend acquisition (PFR/FTN/ESPN/pbp) | SAME PROBLEM as our backtest. Their 6,967-game corpus + closing lines is a richer q-side than our Kaggle 570-game sample. Our Shin/CLV math + free Kaggle path COMPLEMENTS this. |
| L-6 / L-9 / C-14 / C-15 | CLV census (909/1161 graded), provenance forensics, "909/909 locks have ZERO matching odds_batch rows — every lock price appears model-derived", unpatched staleness/coverage bugs | DIRECTLY RELEVANT: our `settleClv` in engine-replica.ts is the local replica of their CLV grade. Their findings (model-derived not real-book quotes) are a WARNING for our prop replay: ensure q comes from a REAL feed, not a model. |
| H-S / L-10 | Free-provider map; live probes: nflverse ~280ms OK, ESPN 403 Akamai, TheSportsDB/MLB Stats vendor-gated | COMPLEMENTS our SOLUTION-DOSSIER: we found Kaggle direct-download works free (they didn't test Kaggle). Their ESPN-403 finding matches our "ESPN public odds blocked" assumption. |
| C-16 | 11-agent research-frontier dossier (anytime-valid/e-process, calibration, CLV literature, independent models) | SIBLING to our 50-papers cross-ref. Their CORP finding (calibration-only methods can't add resolution) is a sharper version of our "encode paper calibration targets" next-action. |
| C-23 | Anytime-valid certification w/ bet-specific null (current fixed 0.524 is MISSPECIFIED) | OUR backtest uses fixed-0.524 break-even implicitly; flag for upgrade. |

## THE sports-intel R&D CORPUS — NOW REGISTERED (ledger row added, UNPUSHED)
Row `RND-0827` (see `.cagent/Sports/docs/ops/AGENT_LEDGER.md`): Sports Intelligence OS
R&D corpus — Shin de-vig + CLV verified, G1–G5 fire-gate gaps resolved in isolated harness
(43/43), real-data 2023–2024 backtest +3.5% ROI (free Kaggle), 50 papers, 112 sites, 7-path
feed dossier. Evidence: branch `hermes/sports-intel-orientation` in clone B, SHAs
`1d326f5` + `9d6f59d` (real, on origin). Status: UNPUSHED (lives on founder machine; other
clones can't resolve SHAs until pushed — by design per ledger rules).

## WHAT TO DO WHEN YOU PICK UP GSE WORK
1. Read `.cagent/Sports/docs/ops/AGENT_LEDGER.md` FIRST. Claim a row.
2. If your work is R&D/backtest/research (not a production PR), it belongs in
   `C:/Users/Garrett/sports-intel/` AND must get a ledger row so the other agents see it.
3. Before building a CLV/edge claim, read `C-14`/`C-15` forensics — model-derived prices are
   NOT real book quotes; our `settleClv` must consume a REAL feed (Kaggle game-level is real;
   props need OddsPapi/The Odds API).
4. The free q-side path we PROVED: Kaggle `spreadspoke_scores.csv` direct download (no auth) —
   share this with the `H-S`/`L-10` provider-map effort.

## HONEST GAPS (what is NOT yet accounted for — do not assume complete)
- The ~80 `Sports-*` home dirs and ~300 `docs/ops/**` files are ENUMERATED but NOT deeply
  read. Per-dir inventory of `.cagent/Sports/docs/ops/hermes/*`, `GSE-competitive-intel/
  fantasyguru/`, `gse-b1`, `Sports-hermes-ledger` is in progress (subagent inventories).
- Grok `.grok/sessions/*` are SESSION LOGS, not deliverables — treat as provenance, not gospel.
- `Sports-Codex`, `Sports-GSE-PR3-isolated`, and most `Sports-*` variant dirs are likely
  abandoned/partial worktrees; verify git status before treating as current.
- 2025 season data: NOT on nflverse yet anywhere; no real 2025 data exists in any corpus.
- This map is a LIVING file — update it when you discover a new agent surface.

---
## VERIFIED INVENTORY (2026-08-27 subagent sweep — HONEST, file-level)
Three parallel inventory agents enumerated the largest unknown surfaces. What they found:

### A. `.cagent/Sports/docs/ops/hermes/` (the Hermes overnight brain)
- **20 files + 6 workstream subdirs**: `l14-label-census`, `l15-close-pred-feasibility`,
  `l16-book-microstructure`, `l17`, `l18`, `hf7-archive`.
- Root files: `README.md` (handoff pkg), `RESUME.md` (resume protocol: "live ledger is
  `docs/ops/AGENT_LEDGER.md`; do NOT resume frozen `handoff/LEDGER.md`/`CONTINUOUS.md`"),
  `BUILD_QUEUE.md`, `AUDIT_PROMPT.md`, `CONTINUOUS.md`, `FINAL-RUN-2026-08-20.md`,
  `OVERNIGHT-2026-08-19.md`.
- `hf7-archive/query.sql` → Neon `gse-postgres` (project `summer-brook-99380762`, role
  `hermes_ro`, SELECT-only): **37,402 `odds_line_snapshots` (9,864 NFL, 11,318 MLB)** — a
  REAL closing-line store already exists in Neon. This is the q-side CLV source the
  `C-14`/`C-15` forensics graded (and found model-derived, not real-book, for 909/909 locks).
- **PROOF OF INVISIBILITY**: keyword search across ALL hermes docs for `sports-intel`,
  `backtest`, `Kaggle`, `nflverse` returned ZERO hits. Our R&D corpus was truly unseen by
  the overnight Hermes. The `RND-0827` ledger row + this map fix that.

### B. `GSE-competitive-intel/` (competitor intelligence — REAL GSE IP)
- `fantasyguru/gse_engine.py` — MLB reliever SMASH/BURR/Solds engine, clean-room from FREE
  Statcast (no FG data used; GSE-owned IP, glass-box).
- `fantasyguru/nfl_engine.py` — NFL engine: QB-types (mobility), O-line/D-line trench SMASH,
  WR receiving SMASH, "from nflverse 2025 season" (⚠️ verify: likely the latest nflverse tag
  labeled 2025; our corpus found 2025 NOT on nflverse — reconcile before trusting "2025").
- `fantasyguru/nfl_scheme_defense.py` — coaching/scheme + defense engine.
- `fantasyguru/FANTASYGURU-DOSSIER.md` — 46,844-URL public-surface CI dossier + DEEP-INTEL-ADDENDUM.
- `fantasypros/` — `FANTASYPROS-DOSSIER.md`, `fp-accuracy-loopholes.md`, `fingerprint-and-scale.md`.
- Boundary honored: public surface / passive OSINT only, no paywalled bodies, no /api/ probing.

### C. Repo ownership discrepancy (NEW coordination risk)
- `gse-b1/README.md` badges point to GitHub owner **`baxley-garrett/sports-intelligence-os`**,
  while the research clones remote is **`Beexly/Sports`**. There may be TWO GitHub orgs for
  the same product. Before pushing/opening PRs, confirm which org is canonical — a PR to the
  wrong org is wasted work. (Our `hermes/sports-intel-orientation` branch is on `Beexly/Sports`.)

### D. `Sports-hermes-ledger/` (sibling of `.cagent/Sports`)
- Full multi-app sports/gaming repo: `apps/`, `gse-ml-service/`, node_modules symlink to
  `../Sports`, `.agents/.claude/.grok` dirs. Shares the SAME `docs/ops/AGENT_LEDGER.md`
  live-ledger path. Likely the same repo as `.cagent/Sports` at a different path (or a
  mirror) — verify before editing both, or you may double-edit one logical file.

### E. `gse-run` skill references (unread, noted)
- `.claude/skills/gse-run/references/`: `frontier-kernel.md`, `recovery-priorities.md`,
  `token-protocol.md` — the runbook for `/gse-run next` (continuing ONE frontier workstream).
  Pair with `docs/frontier/{CURRENT_STATE,WORKSTREAM_QUEUE,RECOVERY_MATRIX}.md`.

### F. `handoff/` (exactly 2 files)
- `EDGE_LEDGER.md` — swarm recovery (R01–R91 roles; strict honesty rules; BLOCKED-with-evidence
  > fabricated SHIP). `H1_RESEARCH_2026-08-23.md` — 19-agent swarm: TIER1-3 edges; "13
  abandoned/partial edge implementations found"; CRITICAL GAP: repo only ingests OFFENSIVE
  nflverse — def + ST data free but unused.

## RECONCILED CROSS-REFERENCES (so each agent finds the others)
- **Our free Kaggle backtest (sports-intel)** ↔ **OVN-0826-1** (their 6,967-game corpus):
  combine → bigger real q-side. Their Neon `odds_line_snapshots` (hf7-archive) is a REAL
  closing-line source we should ingest instead of fixtures.
- **Our Shin/CLV `settleClv`** ↔ **C-14/C-15** (909/909 model-derived warning): use their
  Neon real quotes, never model-derived, or our CLV grade is meaningless.
- **Our 50-papers cross-ref** ↔ **C-16** 11-agent dossier + **H1_RESEARCH** 19-agent swarm:
  merge the literature maps; the "13 abandoned edge impls" in H1 is a TODO list for us.
- **`nfl_engine.py` "nflverse 2025"** ↔ our "2025 not available": RECONCILE — one of us is
  wrong about 2025 availability; settle before either claims 2025 coverage.

See also: `REAUDIT-FIXES.md`, `MASTER-INDEX.md`, `README.md` (all in `sports-intel/`, branch
`hermes/sports-intel-orientation`).

