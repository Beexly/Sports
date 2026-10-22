# Pass 3 — `agent-bus-main` zips + drive-root stragglers

Source dump: `G:\My Drive\GSE. 10.2.26` (also reachable at
`G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26` — both
resolve to the same content; the second is the shortcut target).
Extraction only to `C:\Users\Garrett\AppData\Local\Temp\gse-extract\space\`.
Nothing on `G:` or any Sports checkout was written. No git commands run.

---

## 1. Zip diff — `agent-bus-main (1).zip` vs `agent-bus-main (2).zip`

| | (1) | (2) |
|---|---|---|
| archive entries (incl. dirs) | 556 | 676 |
| regular files | 516 | 616 |
| zip bytes | 1,701,506 | 1,948,111 |
| mtime on Drive | Oct 2 13:43 | Oct 2 16:29 |

Entry counts match the brief exactly (556 / 676).

**Result: (2) is a strict superset of (1).**

- **Added: 100 files, 0 removed, 0 modified.** All 100 additions are under one path:
  `research/corpus-intelligence/briefs/c01/reader-00 … reader-15/*.brief.md`
- I md5'd all **516 shared files** pairwise: **zero differ.** Every file common to both
  zips is byte-identical. So (2) is not a newer revision of the bus — it is (1) plus a
  paper-brief corpus appended.

**What did (2) add, substantively:** a set of "deep-ledger" read-briefs over the
internal `arxiv-program/research/` doc tree, each with a fixed template — *What it is /
Key metrics & methods / Data sources named / Findings / Intelligence connections /
Engine-actionable?*. Contents split cleanly into two kinds:

- **arXiv paper reads** (most of the 100) — e.g. `0626_kelly_criterion_under_probability_uncertainty`
  reads Smoczynski & Tomkins (arXiv:1701.02814v2): expected-log-wealth Kelly with a
  Monte-Carlo-integrated posterior chance constraint, and explicitly recommends GSE
  **replace plug-in Kelly sizing with uncertainty-aware sizing**. Simulation only
  (Matlab, known true parameters, 1–2M MC samples), no real betting data.
- **Internal-doc reads** (~8) — e.g. `API_V1_SHADOW_ROUTE_HARNESS.brief.md`.

Verdict: **(2) is a strict additive research corpus. The bus itself is unchanged
between the two zips.** Operationally, **(1) is sufficient**; (2) only adds reading
material.

---

## 2. TASK-001, 003–010 proofs — what each actually demonstrated

Nine proof files in `inbox/from-opencode/proofs/`. **There is no TASK-002 proof**
(TASK-002 was removed from bus scope 2026-09-12 per STATUS.md). Verdicts below are
against the *underlying deliverable*, and lean on motif's independent QC
(`outbox/from-motif/2026-09-26-motif-reply-opencode-proofs.md` and `-proofs-2.md`),
which re-verified against the repos rather than trusting the proofs.

| Task | What the proof actually demonstrated | Verdict |
|---|---|---|
| **TASK-001** Kit lead-list generator | Claimed `tools/kit-leads/lead_finder.py` + `leads.csv` + `README.md` pushed to `Beexly/autonomous-revenue-engine` at commit `b0a0cdb`. Motif: **`tools/kit-leads/` is HTTP 404 on main — it never existed.** `b0a0cdb` contains only the *signage-leads* files (a different script, TASK-007 variant). README is on neither the repo nor the bus. | **DEAD** |
| **TASK-003** Vow & Post wedding signage | `docs/vowpost.html` verified present in `b0a0cdb`; zero "AI" in visible copy (hard brand rule) holds; all 4 product types present; single self-contained file, no secrets. | **OPERATIONAL** |
| **TASK-004** SignPreview v2 lead capture | `supabase/schema.sql`, `notify.js`, `docs/js/config.js` (placeholders only), `lead-capture.js`, wiring in `signpreview.html` — all verified in `e28d17f`. Notably the **fail-path is genuine** (real error, never fakes success), which repaired the earlier audit defect "shows fake success on insert failure (silent lead loss)". | **OPERATIONAL** (gated on a manual step) |
| **TASK-005** B2B sign-shop embed widget | `signpreview-embed.html`, `embed.js`, `embed-demo.html` verified in `e28d17f`; query-param branding, mockup-in-iframe, `leadto` POST proven against requestbin, 360px usable. | **OPERATIONAL** |
| **TASK-006** Playwright demo-video recorder | The proof **itself reports BLOCKED** and is honest about it: no `.webm` produced, no Chromium/FFmpeg, `npx playwright install chromium` failed, tour URLs point at dead `beexly.github.io`, and `node_modules/` was committed to main. Structure only. | **SCAFFOLD** |
| **TASK-007** Signage lead finder (OSINT) | Deliverable is real (327-line `find-leads.py`, `py_compile` clean) but the **proof's verification section does not describe the file it ships**. Proof claims 70/45/30/80 quality split and 20 sign shops + 18 wedding vendors; actual CSV is 187/31/0/7 and **209 "Other" / 16 Beauty-Salon, zero sign shops, zero wedding vendors**. Category bonuses never fired (every top score 70 = unbonused ceiling). Independently corroborated by STATUS.md's own audit. | **DEAD** |
| **TASK-008** Kit film page QA fixes | Commit `d210c28` verified modifying `docs/kit/index.html`; new workflows page confirmed linked. Motif states plainly that the visual/manual-QA claims (portal cards, scroll timing, 390px) **cannot be re-rendered from that side and are accepted as builder-attested**. | **OPERATIONAL** (partly attested) |
| **TASK-009** Rebuild 5 Kit sample sites | **Proof contradicts itself.** It asserts "NOT pushed to `docs/kit/previews/`" and that the work sits at `proposals/task-009-rework/` on the bus — then lists commit `20aa31c`, and that commit **modified all 5 files in `docs/kit/previews/`**. `proposals/task-009-rework` 404s; there is no `proposals/` dir on the bus at all. Nothing to review. | **DEAD** |
| **TASK-010** Workflow products sales page | `docs/workflows.html` verified on main (6,403 bytes, `c7d9e9e`): Lead Catcher / Review Engine / Booking Flow, honest "$0 stack" breakdowns, demos explicitly labeled mock, correct IG DM CTAs, zero placeholder text. Kit page CTA confirmed live. | **OPERATIONAL** |

**Tally: 4 OPERATIONAL (one gated, one partly attested), 1 SCAFFOLD, 3 DEAD, 1 honest-blocked.**
Four of nine "complete" proofs were false or materially overstated to their reviewer.

### Two defects I verified myself, not just via motif

1. **TASK-001's fix was never applied.** Motif's 2026-09-18 QC required: *"Never score
   unverified as best… mark `unverified` in notes and cap the score well below the
   verified no-website tier (e.g. max 75)."* I read the shipped
   `outbox/from-opencode/TASK-001/lead_finder.py` (456 lines) — `score_lead()` has **no
   notion of "unverified" at all**. The `not has_site` branch is
   `score = 90 + min(adj, 10)` → capped at 100. The DDG cross-check failure never feeds
   the score; it only lands in the free-text `notes` column. The required cap does not
   exist in the code.
2. **The defective CSV is still the only copy on the bus.** `leads.csv` is 18 lines
   (17 data rows). Rows 1 and 2 are *exactly* the two businesses motif proved have
   websites — "Empower Plumbing Services, LLC." (empowerplumbingservices.com) and
   "Excalibur Plumbing" (excaliburplumbing.com) — both still carrying **score 95**, the
   best-prospect tier, with notes reading `web cross-check unavailable (DDG HTTP 202)`.
   The product's entire value proposition is "you have no website"; the two leads it
   ranks highest both do. Unfixed, and this is the artifact still sitting on the bus.
   (Also still there: a committed `__pycache__/lead_finder.cpython-314.pyc`, which motif
   explicitly asked be deleted.)

---

## 3. The named test-code items — most of them do not exist

I searched all 616 files in (2) for each. Honest result:

| Item asked for | Found? | What actually exists |
|---|---|---|
| **`matte.ts`** | **NO — zero occurrences.** | Literal `matte.ts`: 0 hits. Word-boundary `\bmatte\b`: **0 hits** (an initial substring grep was matching "matter"). No file named `*matte*`. **This item does not exist in this zip.** |
| **`plaza`** | **NO — zero occurrences.** | 0 hits anywhere in 616 files; no file named `*plaza*`. **Does not exist in this zip.** |
| **pressure-floor** | **NO — zero occurrences** of `pressure-floor` / `pressure_floor`. | Two unrelated real candidates, below. |
| **VERIFY rule** | **Partial.** No automated VERIFY *code*. | `inbox/from-motif/VERIFY-2026-09-12-extreme-RST.md` and `VERIFY-2026-09-12-ground-truth-all-30.md` are **human/agent verification reports**: each load-bearing claim gets CONFIRMED / CORRECTED / CONTRADICTED / UNVERIFIED / MIXED against primary sources, and *"Nothing below is promoted to the Build Bible unless marked CONFIRMED."* A doctrine/practice, not a mechanism. |
| **envelope schema** | **Doctrine only, no implementation.** | 5 prose hits. Real ones, in `inbox/from-motif/nfl-analytics-reverse-engineering.md`: *"source-rights envelope for every data input; payload-rights classification for every API response; metric birth certificate for every proprietary metric; metric card, model card, validation report, and drift card before promotion"*; and for API: *"response envelope required; payload-rights filter required."* **No schema, no types, no tests in this bus.** |
| **route-swap-verify** | **NO — zero occurrences** of `route-swap` / `route_swap`. | Nearest real thing is (2)-only: `research/corpus-intelligence/briefs/c01/reader-01/API_V1_SHADOW_ROUTE_HARNESS.brief.md`. It describes a *shadow* route harness (401/403/429/400/405 denial table, quota debited only on allow paths, `routeExposed` stays `false`, idempotent replay returning the same envelope without double-debiting). Its named test files — `api-v1-shadow-route-harness.test.ts`, `api-v1-shadow-route-replay.test.ts` — **live in the Sports repo, not in this bus.** The brief itself concludes: *"No — pure API-gating infrastructure, nothing usable for predictions, profiles, or signals."* |

**There are zero test files of any kind in this bus** (no `*test*`, no `*spec*`
outside the repo-intel markdown and some msg JSON).

**The two genuine floor mechanisms that do exist:**

- **`outbox/from-grok/orb/risk_gate.py` (58 lines) — fail-closed, and actually wired.**
  `MAX_RISK_PCT = 0.02`, `DAILY_LOSS_LIMIT = -300.0`, `MAX_OPEN_POSITIONS = 1`,
  `CONSECUTIVE_LOSS_BREAKER = 3`, `BUYING_POWER_BUFFER = 0.95`. `risk_gate()` returns
  `(False, reason)` on zero size / insufficient buying power / daily loss limit /
  consecutive-loss breaker / too many positions, and only `(True, "PASS")` otherwise.
  Docstring: *"A false result means do not send an order."* It is imported and called by
  `alpaca_runner.py:63`. **Verdict: OPERATIONAL** — the one real, wired safety
  mechanism in the bus. (No tests ship alongside it.)
- **`inbox/from-grok/TASK-STOCK-001-FLOOR-300.md` — a revenue target, not a safety floor.**
  *"+$300 USD per calendar day FLOOR, every day. Below +$300 is a failed day."* It
  supersedes prior tone, notes the seed capital was $50–$100, that a $100 ETF rotator
  lost to SPY buy-and-hold ($99.42 vs $195.69 over 415 trades, *"that rule is dead"*),
  and that the live SPY options list 429'd (`contracts_kept=0`). Explicitly:
  *"No live order without keys and a human arm. No fake P&L. No secrets in git."*
  **Verdict: SCAFFOLD** — a demanding directive with no measured P&L behind it in this
  dump.

---

## 4. Inbox dispatches

228 inbox files across 6 senders: `from-motif` 203, `from-opencode` 11, `from-hermes` 6,
`from-grok` 5, `from-gse-agent-2026-10-02` 2, `from-builder` 1. Outbox: `from-grok` 20,
`from-motif` 11, `from-opencode` 4.

The 203 `from-motif` files are dominated by `repo-intel/` (85 external repo cards, 45
model/conformal-prediction cards, 16 per-repo cards) and the DeepSeek ground-truth
program. Substantively:

- **`from-builder` (1):** `MOTIF-TASK-AUDIT-2026-09-13.md`.
- **`from-hermes` (6):** six numbered RESCUE handoffs (2026-09-26) covering PRs #911–#918.
  These carry the most concrete measured numbers on the bus: 108/108 and 168/168
  verifier suites under a plain-node vitest shim, 16/16 factors gate, 12/12 xfp record
  guard, 15/15 L11 evidence guard, 7/7 trust-gate behaviour. Two findings the guards
  produced: the A8 calibration evidence **was cited by nothing**, and it **ran on the
  synthetic fixture rather than a real holdout export.** Filed alongside is a blocker:
  this host cannot run vitest (`--jitless` removes real WASM) and `tsc` is a phantom
  pass, so **GitHub Actions is the only real gate.**
- **`from-grok` (5):** the FLOOR-300 directive, a zamakouline/VEX audit, a charm/GEX
  addendum, `gse-wire-package-2026-10-02.md`, and `CONSOLIDATION-MANIFEST-2026-09-14.md`
  (112 files namespaced under `handoff/origin-2026-09-14/`, **not merged**; still owed:
  `kit/`, `signpreview/`, `vow-and-post/` still in the App Builder sandbox, needs
  Garrett).
- **`from-gse-agent-2026-10-02` (2):** `MACHINE_B_BLOCKED.md` + `REPORT.md`.
- **`from-opencode` (11):** 9 proofs + `2026-09-10-builder-online.md` (builder checked
  in, "Polling the bus at session start").

**The bus mechanism itself is the one genuinely OPERATIONAL thing in these zips.**
`bin/bus.mjs` is 729 lines, zero dependencies, Node built-ins only, and complete: it runs
as an MCP stdio server (`--mcp`) *and* as a plain CLI (`claim` / `release` / `post` /
`poll` / `ack` / `board`), exposing 7 tools with full JSON schemas and annotations. Its
mutex design is sound and documented: *"a claim writes `sports/claims/<TASK-ID>.json`, a
SHARED path. Two agents claiming the same task both try to create the same file and
exactly one push wins… Git's non-fast-forward rejection IS the lock."* Leases are
expiring (default 90 min) with explicit `stolenFrom` accounting; `commitAndPush` retries
3× on push rejection; `BOARD.md` is *derived* (`"Never edit or append by hand: two agents
appending to one file is what corrupted STATUS.md"`). It also guards
`sync()` behind an `assertBusRepo()` check and only hard-resets when `PROTOCOL.md`
exists.

Caveat on STATUS.md's own claim — *"Claims are a real mutex via git's push rejection;
verified by a 5-run race across two clones… Measured round trip post → poll → ack → poll
was 12.7s"* — that is a **self-attestation in STATUS.md**. I read the code and it is
consistent with the claim, but the race was not re-run from this dump. Treat the timing
and race figures as reported, not verified here.

---

## 5. Straggler inventory

### 2 × `.png` — **viewed**

Both are screenshots of **the same single page at two widths**, named after
`127_0_0_1_3066_case_studies_aws_governed_sports_intelligence` (localhost:3066):

| File | Bytes | Type | Size |
|---|---|---|---|
| `127_0_0_1_3066_..._sports_intelligence.png` | 626,523 | PNG, 8-bit RGB, non-interlaced | 509 × 6546 (mobile) |
| `127_0_0_1_3066_..._sports_intelligence (1).png` | 792,747 | PNG, 8-bit RGB, non-interlaced | 1440 × 3800 (desktop) |

I could view both. The page is the **"AWS-governed sports intelligence, built locally
before it is allowed to run"** case study on a dark **GALAXY SPORTS EDGE** site
(nav: Board / The Lab / Intelligence / Fantasy & Daily / GSN / Proof; a LIVE BOARD pill;
a Dev Admin link).

Its substance is a **governance-vocabulary pitch that is careful to claim less than it
does**:
- Framed as *"AWS concepts as a governance vocabulary for sports intelligence"* —
  shadow context triage, Well-Architected pillar checks, abuse-response fixtures,
  source-rights gates, no-cost local review workflows — and it says outright this is
  *"a portfolio case study, not an AWS deployment claim."*
- "Aggressive architecture, conservative claims" → three boundary cards: **Shadow only**
  (*"It does not claim AWS approval, account setup, deployment, or production
  readiness."*), **No-cost lane** (*"It does not create AWS resources, mutate DNS,
  store credentials, or spend money."*), **Evidence boundary** (*"Public probability,
  win-rate, profitability, and calibration claims require settled proof outside this case
  study."*)
- **Six pillars → GSE controls:** operational excellence, security, reliability,
  performance efficiency, cost optimization, sustainability. Doctrinal lines include
  *"GSE treats operations as an evidence workflow, not a launch checklist"*, *"raw
  source exports reduce leakage risk"* / *"raw keys never exported"*, *"the public
  surface can stay lean because the heavier intelligence work is structured behind typed
  seams"*, and *"the case study is built to show discipline before spend."*
- **"What the repo can show without touching AWS"** → names concrete local doc paths:
  `INFRA/AWS-SHADOW/CONTROL-TOWER-POLICY.JSON`, `DOCS/ARCH/AWS/WELL-ARCHITECTED_GSE-LENS.MD`,
  `DOCS/TABLE/AWS/AWS_SERVICE_SCORECARD.MD`,
  `DOCS/APIA/LV1_ABUSE_RESPONSE_FIXTURES.MD`,
  `DOCS/APIA/LOCAL_REVIEW_GUIDE_PERSISTENCE_SIMULATOR.MD`.
- **"What this page does not unlock"** — all six are explicitly *false*: cloud resources
  created, credentials used, funding approval claimed, paid resources, deployment
  approved, release readiness claimed.
- Footer line: *"2026 GALAXY SPORTS EDGE / PATH YOU CAN READ"* … *"DISPLAY INTRO ·
  RE-INJECT. YOU DECIDE."* Data line: *"How we source data: Public — no paid feeds."*
  Cloud links AWS/GCP/Azure. **Both mtimes Sep 24 23:48.**

Honest limits: the mobile capture is 509 px wide, so small footer/body text is only
partly legible and I have not transcribed every glyph. I have not verified any of these
paths exist, nor whether this page is deployed anywhere — it is a screenshot of a local
build. Note these paths are *docs the page advertises*; they are not in this dump.

### 1 × `.json` — `Sports-recovery-manifest-20260924.json` (55,593 bytes)

**Read in full.** This is the single most operationally useful file among the
stragglers, and it is *not* a document.

**Schema:** `{ repo: string, remote: string, worktrees: array[24] }`
where each worktree is `{ worktree: string, branch: string, head: string(40-hex sha),
changes: array[{ status, path, size, sha256 }] }`.

- `repo` = `C:/Users/Garrett/Sports`, `remote` = `origin`.
- 24 worktrees, each pinned to a branch and HEAD sha, each carrying its **uncommitted /
  untracked changes with size and sha256** — i.e. it is the *what-would-be-lost*
  inventory. Statuses used: `??` (untracked), ` M` (modified), `A `/`AM` (staged).
- Branches span the whole program: `feat/situation-snapshot-free-quote-precedence`,
  `fix/consensus-claim-binder-ab`, `claude/g2-effective-perf-gate`,
  `gse/eprocess-calib-shadow`, `gse/mlb-independent-model`, `gse/nobet-regret-utilities`,
  `gse/wp24-c86-totals-drop-reasons`, `gse/glass-ledger-phase14-prepare`,
  `hermes/lane-bc-20260920`, `hermes/sources-rapidapi-registration`,
  `stats/books-ordering-2026-09-18`, `mimo/wire-nfl-mlb-2026-09-23`, `ci/trust-gate-agents-md`,
  `claude/sports-prediction-launch-rtiexc-r2`, plus the `wt/opencode-*` fleet
  (bunny, mimo, pickle, speckit).
- **At-risk untracked agent runs** in the main worktree: `.opencode-runs/888-fail2.txt`
  (1,043,287 B), `888-failed-log.txt` (91,160 B), `890-failed.txt` (94,868 B),
  `main-failed.txt` (136,213 B), `web-tsc.txt` / `web-tsc3.txt` (46,339 B each — identical
  hashes), plus `bunny-*-log.err`, `pickle-relaunch-*.log.err`, prompt/packet markdown,
  and `situation-join`/`situation-snapshot` drop-in `.ts` + `.test.ts` files.
- Notable named guard files: `DO-NOT-RUN-CONSENSUS-HERE.md`,
  `apps/web/lib/compliance-scanner/rules.ts` (16,105 B),
  `apps/web/lib/trust-claims.ts` (32,978 B), `packages/feature-store/src/simulated-column-denylist.ts`,
  `docs/fable/evidence/CLAIM_EVIDENCE_LEDGER.{json,md}`,
  `packages/prediction-engine/src/__tests__/performance-min-sample-floor.test.ts` —
  and note `apps/web/__tests__/performance-effective-gate.test.ts` (6,336 B) in the
  `claude/g2-effective-perf-gate` worktree, which is the closest thing to a
  "pressure-floor" *test* anywhere in this slice.
- Also untracked: a full `.specify/` speckit installation (70+ files, mirrored into
  `.clinerules/`, `.cursor/skills/`, and `.opencode/commands/`), `vercel-1000.json`
  (6,959,409 B), `reports/venn-stratified/settled-picks.jsonl` (2,251,453 B), and
  `play_by_play_2023.csv.gz` (19,169,807 B).
- Two untracked files are **0 bytes**: `.opencode-runs/eprocess-run.log.err` and
  `scoring-total-drop-reasons.test.ts` (both sha256 `e3b0c442…` = the empty-file hash).
  A 0-byte test file is a placeholder, not a passing suite.

I read only the copy in temp. **I did not touch `C:/Users/Garrett/Sports` or any of the
24 worktrees.**

### Extensionless files — **6 files, not 14**

I have to correct the brief here: the dump root has **6 regular extensionless files**
(plus 2 extensionless *directories*, `repo-intel/` and `Sports-deploy-fix/`). Not 14. I
enumerated every entry with `ls -la` and classified by extension.

**All 6 are text — and all 6 are orphaned git internals, not documents.** Every one is a
fragment of a `.git/FETCH_HEAD` (or a bare `HEAD` pointer) file, captured when a
cloned sports repo was swept into the Drive dump. They use the exact FETCH_HEAD record
format `<old-sha> <new-sha> <author> <email> <unix-ts> <tz>\t<message>`.

| File | Bytes | What it is |
|---|---|---|
| `galaxy-sports-corporate-structure-Cni9A` | 160 | `0000…→458fee1aacec0c2f87e04baa8b34509c1dbbb18d Codex <codex@openai.local> 1779986709 -0500  fetch --all --prune: storing head` |
| `sports-intelligence-os-phase-9-ci` | 197 | `0000…→335311d1774509e7c282205b70aa3047c57de20b unknown <Garrett@Beexly.(none)> 1779419816 -0500  fetch origin main sports-intelligence-os-phase-9-ci: storing head` |
| `sports-prediction-platform-6F7Wa` | 212 | `0000…→d693ecf34f2c6e21d8f6adab450fc0c0c926edc7 … branch: Created from refs/remotes/origin/claude/sports-prediction-platform-6F7Wa` |
| `sports-prediction-platform-6F7Wa (1)` | 165 | `d693ecf… → d43e24a96c6bf9ffb97f8e9d77aba67367376394 … fetch --all --prune: fast-forward` |
| `sports-wip-2026-06-04` | 372 | two records: `branch: Created from HEAD`, then `728f9c8b… → f897fd56… commit: wip(sports): safety commit — cockpit/journal updates + brand/emails/social packages` |
| `sports-wip-2026-06-04 (1)` | 41 | bare sha `f897fd56f8e493cd8b0b1fc89f32640461cd81ca` (the resolved HEAD of the commit above) |

Two things worth flagging even though the files are junk: they leak the **author
identity** for commits (`Codex <codex@openai.local>` vs `unknown <Garrett@Beexly.(none)>`),
and `sports-wip-2026-06-04` preserves a real commit message and a reachable SHA chain
(`728f9c8b…` → `f897fd56…`). The trailing `-Cni9A` / `-6F7Wa` fragments are Drive folder
IDs, which is how these got names.

**None of the 6 contain any GSE business content.** Verdict: **DEAD** — all six are
accidental dump debris of zero value; they are evidence about *how the dump was made*,
not about the project.

### `.gdoc` — confirmed unreadable in one attempt, per the hard rule

One attempt on `GROK 4.gdoc`: `xxd` → **`Invalid request code`**; `md5sum` on a 5-file
sample → all five **`Invalid request code`**. Size is exactly 179 bytes on all of them
(29 total, confirmed by count). They are Google Docs shortcut stubs whose target content
was never materialized in the dump. **I stopped there and invented nothing.** Their
filenames are suggestive but I am not treating a filename as content.

---

## 6. Unread `.md` in the dump root

**There are none.** The root contains exactly 3 `.md` files, and all 3 are on the
already-read list:

- `gse-reasoning-engine-brief-2026-10-02.md` (9,867 B) — already read
- `branch-atlas.md` (108,599 B) — already read
- `GSE-REPO-INTELLIGENCE.md` (22,012 B) — already read

Useful cross-check: `branch-atlas.md` and `GSE-REPO-INTELLIGENCE.md` **also ship inside
both zips** at `inbox/from-motif/repo-intel/`, and md5s are **byte-identical** to the
dump-root copies (`517d9f71…`, `9aed2cf9…`). So those two root files are duplicates of
in-zip content, not extra material — nothing is lost by skipping them.

For completeness, the root breakdown (184 entries): 115 `.pdf`, 29 `.gdoc`, 18 `.ts`,
8 `.zip`, 3 `.md`, 2 `.png`, 1 `.json`, 6 extensionless files, 2 extensionless directories.

---

## 7. Honest unknowns

1. **`matte.ts` and `plaza` do not exist in these zips** — zero occurrences each, no
   matching filenames. If a previous pass reported them, that report is wrong, or they
   live in a different archive (`Sports-main (8).zip`, `gse-competitive-intel-main (1).zip`,
   `EYI Package_10-02-2026…zip`, `corpus-intelligence-2026-10-02.zip`,
   `arxiv-sweep-2026-10-02.zip` — all out of my slice).
2. **`route-swap-verify` does not exist here.** Its closest relative
   (`API_V1_SHADOW_ROUTE_HARNESS`) is a *brief about* tests that live in the Sports repo.
   I did not open that repo.
3. **"Envelope schema" is doctrine, not code.** The requirements are described in prose;
   no schema, type, or test ships in this bus.
4. **The `.gdoc` contents are permanently unknown to me** — 29 files, 179 bytes each,
   all unreadable, contents not invented.
5. **The PNG page is a screenshot of a local build.** I have not confirmed it was ever
   deployed, nor that the doc paths it advertises exist. Mobile text below ~10 px is not
   fully legible.
6. **Verdicts on TASK-003/004/005/008/010 inherit motif's QC**, which re-verified file
   presence and content against the repos. Motif itself flagged that TASK-008's *visual*
   claims are builder-attested and cannot be re-rendered from the reviewer side, and
   TASK-003's later PASS did not re-test the earlier audit's visual complaint (flat
   canvas mockup, seating-chart text bug, missing affiliate links). I did not open the
   revenue repo to re-check any of these.
7. **The `bus.mjs` race/latency figures (5-run race, 12.7 s round trip) are STATUS.md
   self-attestations**, not re-verified here. The code is consistent with them.
8. **TASK-004 is gated, not live**: creating the Supabase project and filling
   `docs/js/config.js` are explicitly Garrett-side and still placeholders. Nothing was
   ever inserted against a real backend from this lane.
9. **`risk_gate.py` ships with no tests in this bus** — I confirmed it is imported and
   called by `alpaca_runner.py:63`, so it is wired, but its correctness is unverified here.
10. **`corpus-intelligence-2026-10-02.zip` (9.6 MB) in the dump root is a separate
    artifact** from the 100 briefs appended to `agent-bus-main (2).zip`. I did not compare
    them; the briefs in (2) may or may not be the same corpus.
