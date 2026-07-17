# Intel Reconciliation — gse-competitive-intel vs the Glass Ledger build

**Date:** 2026-07-16 · **Intel repo:** `beexly/gse-competitive-intel` @ `b8fc1cf76` (603 files)
**Method:** 10 parallel domain readers (~1.3M tokens read) over the handoff, quant spec,
Codex engine/docs/doctrine, both teardowns, the FantasyGuru package, strategy dossiers, and
the competitor landscape — every P0/P1 claim then independently spot-verified against the
tree before being recorded here. Clears FINAL_REPORT "NEEDS FOUNDER" item #6.

## Verdict by domain (one line each)

| Domain | Verdict |
|---|---|
| Handoff (repo copy) vs build | Matches near-exactly; honest-zero paths are the blessed paths. Deltas listed below. |
| Edge-lab quant spec vs implementation | Implemented, several places STRONGER than spec; gaps = §5 multiple-testing machinery + 2 enforcement gaps (fixes queued). |
| Codex reference engine | **Stale snapshot of our own tree (~2026-06-20).** Live tree is strictly newer; adopting it would reintroduce 4 fixed bugs. Never diff-adopt from it. |
| Codex handoff docs | Design commitments already live in apps/web/lib; deploy-state claims (Stripe test mode, v5.0.0 freeze, silent launch) are STALE — verify env, don't trust. |
| Sports-OS doctrine | Strongly convergent; repo often stricter (Tier-2 evidence cap, banned-phrase guardrails already verbatim). |
| scores24 teardown | Their confidence badge is provably decoupled from price ("100%" on a −111 pick). Glass Ledger is the structural inverse. Two playbook items would violate our own rights registry — refused. |
| FantasyPros teardown | Their accuracy engine is ordinal/self-ungraded; our calibration-first ledger is the exact counter. API is non-commercial-only → registry entry required (queued). |
| FantasyGuru package | Methods clean-room-verified (free data only, code-read confirmed); outputs are UNCALIBRATED indices — must pass edge-lab before any confidence framing; trademark rename required. |
| Strategy dossiers | Ledger activation = the single highest-leverage 55-day move. One P0 contradiction found (affiliate infra). "70% north star" attack already resolved in our favor. |
| Competitor landscape | 4 Betfully/LineStar patents ring-fence DFS lineup construction — FTO needed; EV/Kelly/ledger are clean. nfelo's performance page = layout bar to clear (they lack our LCB guard). |

## FOUNDER DECISIONS (new — each verified in the tree)

> **RULINGS 2026-07-16 (founder, verbatim intent):** (1) Affiliate = ON — "it's
> new revenue… let's run." Resolution: the DISCLOSED-CONFLICT model, not the
> denial model — the absolute "we make money in exactly one situation" claim is
> retired before it ever ships; every partner relationship is disclosed
> per-link and on a public how-we-make-money page; pick generation stays
> structurally separated from partner economics (machine-checked, see
> guardrail); state-licensing + signed agreements + FTC-compliant disclosures
> remain prerequisites to LIVE activation (registry stays code-review gated).
> (2) DFS = DOMINATE — resolved via the exact-optimizer design-around (provably
> optimal, deterministic, no randomized-column iteration), which is both the
> stronger product and the cleaner patent posture; formal FTO before
> real-money marketing pushes stays recommended.

1. **Affiliate posture (P0).** `apps/web/app/go/[slug]/route.ts` + `lib/affiliate/ledger.ts`
   + the `sportsbook` partner category exist and are inert only because
   `operator-registry.ts` has zero `APPROVED_PARTNER` rows. The intel's entire trust wedge
   ("we make money in exactly one situation: when our number is right") and the handoff's
   §1 "no affiliate, ever" cannot coexist with one approved operator. Choose: (a) remove or
   permanently lock the affiliate surfaces, or (b) drop the absolute claim from all copy.
   No Glass Ledger publicization should ship before this is answered.
2. **DFS optimizer patent exposure (P0).** `apps/web/lib/fantasy/dfs-optimizer.ts` is
   UI-wired and named against LineStar, whose parent Betfully holds 4 active patents on
   randomized salary-cap lineup construction (US9744450, US9751010, US10478721, US11660533).
   Literal infringement looks unlikely (element-by-element table in the intel), but it is the
   same heuristic family and Betfully has published enforcement intent. Options: formal FTO
   opinion, and/or I implement the intel's clean design-around (exact MILP — provably optimal,
   no claimed mechanism). EV badges / Kelly / ledger share no element with these claims.
3. **Named external reviewer before PUBLISH_LEDGER (P1).** A solo-operator self-computed
   record is self-attestation. Until one named reviewer signs off, all copy says
   "independently reproducible" — never "audited." (RagingBull FTC settlement, $2.425M, is
   the on-point precedent; it also makes the display guard legal risk-mitigation, not just
   doctrine.)
4. **Pinnacle close capture before the line-archive flip (P1).** The handoff names the
   Pinnacle close the PRIMARY CLV benchmark; ingestion is pinned `ODDS_REGION="us"` and
   `PRIORITY_BOOKMAKERS` has no pinnacle (The Odds API serves it under `eu`). Every day the
   archive runs without it is unrecoverable benchmark history. I am building the gated eu/
   pinnacle snapshot leg now (default OFF, zero API calls until you flip).
5. **Pricing ceiling strategy (P1).** The dossiers argue the proven buyer for CLV-graded
   edge is the sharp cohort at $199–299/mo (OddsJam), ~10x our Elite ceiling. Not a rebuild
   of the committed ladder — a decision about what AUTHORITY phase (or a new top tier)
   tests once CLV clears.
6. **Fantasy Engine scope (P2).** Both dossiers say amputate everything but NFL
   sides/totals/props until the edge is proven; the Fantasy Engine 10x is an explicit owner
   mandate (2026-07-11). Confirm the parallel track is deliberate. (It also has revenue
   logic the dossiers underweight: the $4.99 tier funds the runway.)
7. **Env verifications (P2).** Stripe key live-vs-test prefix; ANTHROPIC_API_KEY validity
   (Codex-era 401); deployed MODEL_VERSION vs `constants.ts` v5.1.0;
   `TEAM_RATES_AVAILABLE`; `CALIBRATION_ADJUSTMENTS_ENABLED` actual values.

## ENGINEERING QUEUE (mine — all inert / inside standing gates)

1. **Trials registry (§5) + admission controls** — append-only, provenance-stamped registry
   of every threshold/feature/calibration candidate ever tried ("an incomplete registry
   voids the guarantee" — it can still be started complete today); BH-FDR helper;
   per-feature conditional-MI admission screen. MUST exist before any Phase-3 feature
   expansion.
2. **Gate-integrity hardening** (spec-reader findings, each verified):
   fold-disjointness thrown assertion in `selective-gate.ts`; asof-store closing-key flag
   made allowlist-only (docstring currently promises more than the code enforces);
   `tuneTau` acceptance routed through `learnThenTest` (fixed-sequence FWER);
   vig-inclusive breakeven (1/d at obtainable price) structural switch for line-archive
   go-live; two-sided non-gating placebo WARN (sign-inverted-leak tripwire);
   sealed-holdout token moved behind an env check + CI grep gate.
3. **Pinnacle/eu line-archive leg** — gated, default OFF (decision 4 above).
4. **Rights registry additions** — `fantasypros.com` entry (permission_required;
   non-commercial API terms; robots disallows /api,/json,/xml,/ranker) + engine fixture
   alignment (the #117 lesson); one-line clarifying comment in `data-rules.ts` that The
   Odds API's licensed closes are exempt from the "proprietary closing line" example.
5. **evidence-readiness-matrix unification** — replace the unconditional `model.trueEv`
   blocker with an artifact-driven check (ACTIVE iff logit-pool verdict =
   MODEL_ADDS_INFORMATION AND tuned τ ≠ null): matrix = ops dashboard, edge-lab = sole
   statistical authority. Stays blocked today (verdict is FIRE_NOTHING) — by evidence
   instead of by fiat.
6. **Then:** NFL world-model/NGS features through the as-of store into the MI probe +
   logit-pool (the concrete path out of FIRE_NOTHING — every admission through the
   registry); MLB Statcast + platoon-split loaders behind clearance (§6 parity).

## RIGHTS RED LINES (from the intel, now binding)

- **No automated monitoring of scores24.live** — the playbook's change-monitor and
  longitudinal pick-grading items assume recurring fetches; our registry says
  `permission_required`, automation_allowed=false. Manual human browsing only, or written
  consent from Kiito OÜ first. The playbook's "compliant passive OSINT" self-label is not a
  rights determination.
- **FantasyPros:** paid tiers are still personal/non-commercial; only the Commercial tier
  licenses ingestion. Adapter stays stubbed until a registry entry + license exist.
- **pfr_advstats license unconfirmed** — hold Trench/WR-SMASH/Team-Defense ports until
  nflverse's license for that specific release is confirmed (PFR ToS is hostile).
- **Trademark rename** — SMASH/BURR/Solds are FantasyGuru coinages; ship as GSE-original
  names (e.g. Reliever Value Score, Bullpen Index). Methods are free; names are not.
- **No verbatim FG prose** in generated content (intel files quote their copy).
- **FTC substantiation** — every public win-rate/accuracy/confidence number sitewide needs
  the display-guard bundle (or must not render). Audit of pre-existing surfaces queued.

## STALE-INTEL CORRECTIONS (do not re-import)

- Codex `prediction-engine-reference/` = historical snapshot of our own tree; live is newer
  (NaN fail-closed Kelly, away-spread grading fix, sub-vig guard, prob-space price
  averaging all post-date it).
- Phase-9/V6 deploy state (silent launch, v5.0.0 freeze, hardcoded calibration-off) is
  superseded — MODEL_VERSION is v5.1.0, calibration is env-driven, paywall re-gate shipped.
- FantasyGuru "PE-owned" is false per the 2026-07-15 reaudit (deal never closed).
- FantasyPros "GOAT tier" was refuted by the playbook's own verification (3 public tiers).
- The dossiers' "~50.9% and hoping" baseline predates Phase 1; the engine now structurally
  fires nothing without β evidence — a stronger position than the intel assumed.

## What the intel CONFIRMS we already got right

Display guard vs BettingPros' n=11 rows rendered with full visual authority and scores24's
decoupled badge; the honest-zero engine; publish-before-kickoff hash chain as the only
empty flank in the category; kelly staking kept ledger-internal (V6 precedent: a public
stake UI was already tried and reverted); crawler-permissive robots; the pricing ladder's
calibration-proof justification. FantasyPros' own data (ATC > Zeile > every individual
expert) validates accuracy-weighted consensus.

## Post-activation product queue (sequenced AFTER ledger activation)

Per-fixture "{Team} vs {Team} Prediction" pages (scores24's proven traffic spine — US-only,
calibration-led); llms.txt + read-only MCP/API over the SETTLED ledger only ("cite the
receipts, sell the predictions"); free EV/no-vig/CLV calculators as methodology proof;
watchlist/alerts retention primitive; contrarian-accuracy breakout stat on the ledger;
Google News sitemap once bylined previews exist; nfelo's season-table layout (plus the
Wilson-LCB guard they lack) for /glass-ledger.
