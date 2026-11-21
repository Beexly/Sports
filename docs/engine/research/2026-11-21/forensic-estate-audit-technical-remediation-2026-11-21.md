# Forensic Technical & Scientific Audit Remediation Receipt (`2026-11-21`)

> **Zero-PII & Zero-Secrets Governance:** Strictly technical and scientific engineering remediation summary derived from `Comprehensive Forensic Estate Investigation.docx`. All personal financial, medical/FSA, EEOC/legal, debt, address, phone, and credential details are omitted from git and remain strictly in the owner-only external queue. No public feature gates (`LIVE_BOARD`, `PUBLISH_LEDGER`, `PUBLIC_PICKS_ENABLED`, `PERFORMANCE_STATS`) were changed.

---

## 1. Technical Remediations Landed in Wave 2A (`Beexly/Sports`)
1. **Conformal Finite-Sample Rank Clamping Eliminated (Repo Card 4.1 R10):**
   - Replaced silent rank clamping (`Math.min(n - 1, rank)` / `Math.min(n, k)`) with fail-closed `Number.POSITIVE_INFINITY` when `ceil((1 - alpha)(n + 1)) > n` in both [`apps/web/lib/calibration/conformal-calibration.ts`](file:///C:/Users/Garrett/Sports-worktrees/overnight-goal-2026-11-21/apps/web/lib/calibration/conformal-calibration.ts) and [`apps/web/lib/calibration/1910-10562-nested-conformal-qoob.ts`](file:///C:/Users/Garrett/Sports-worktrees/overnight-goal-2026-11-21/apps/web/lib/calibration/1910-10562-nested-conformal-qoob.ts), matching [`cqr.ts`](file:///C:/Users/Garrett/Sports-worktrees/overnight-goal-2026-11-21/apps/web/lib/calibration/cqr.ts).
   - Added explicit `n = 5, alpha = 0.1 -> +Infinity` unit tests (preventing false 90% coverage certification at max `5/6 = 83.33%` finite-sample coverage).
2. **GSI ADR-0003 FDA `21 CFR 866.5830(b)(2)` Assay Provenance Alignment (Conflict #6):**
   - Updated [`evaluation/gsi/tbi_biomarker_clearance_ode.py`](file:///C:/Users/Garrett/Sports-worktrees/overnight-goal-2026-11-21/evaluation/gsi/tbi_biomarker_clearance_ode.py) with immutable assay-specific cutoff provenance (`istat_tbi_plasma` 30.0/360.0 pg/mL per FDA K201778, `banyan_bti_serum` 22.0/327.0 per DEN170045, `vidas_tbi_serum` 22.0/327.0 per K240279, and `papa_2022_research_serum` 30.0/327.0 non-commercial research provenance) and explicit metadata enforcing `head_ct_triage_escalation_only: True`, `standalone_lesion_diagnosis_permitted: False`, `return_to_play_clearance_permitted: False`, and `mmp13_excluded: True`.
3. **Storefront Stale TNF Badge Remediation (Conflict #4):**
   - Updated `tnf-all-in-pack` badge in [`apps/web/lib/packages/catalog.ts`](file:///C:/Users/Garrett/Sports-worktrees/overnight-goal-2026-11-21/apps/web/lib/packages/catalog.ts) from stale `"LIVE TONIGHT - TNF IND @ HOU ($19)"` to `"FINAL (HOU 26-3) - WEEK 11 TNF RECAP"`.
4. **Compendium & External API Audits:**
   - **Compendium Errata (`GSEMasterDataCompendium20261120`):** Recorded explicit quarantine erratum for Part III p. 58 (2004 Special Olympics **Association Football / Soccer** coaching guide, excluded from NFL modeling) and Part I pp. 27-29 (Team Scoring Breakdown sorted by defensive points allowed while printing offensive points; duplicate `FGM2` column header).
   - **Doubleheader Settlement Clock Disambiguation (`free-settlement.ts`):** Verified [`apps/web/lib/data-sources/free-settlement.ts`](file:///C:/Users/Garrett/Sports-worktrees/overnight-goal-2026-11-21/apps/web/lib/data-sources/free-settlement.ts) uses `sameMatchupFixturesNearKickoff` and `finalBelongsToOwnFixture` with fail-closed rejection on date-only kickoffs.
   - **Firecrawl v2 Endpoint Verification (Conflict #17):** Confirmed [`scripts/ops/firecrawl_alexandria_nfl_client.py`](file:///C:/Users/Garrett/Sports-worktrees/overnight-goal-2026-11-21/scripts/ops/firecrawl_alexandria_nfl_client.py) already targets `https://api.firecrawl.dev/v2/search` and `https://api.firecrawl.dev/v2/scrape` (no v1 calls left ahead of Dec 10, 2026 sunset).
   - **Standalone Local Service & Secret Hygiene:** Verified `gse-ml-service` test health (`358 passed, 3 skipped`) and scrubbed the exposed `ESPN_SWID` value in `espn-groupme-bot/.env.example` with a placeholder commit.

---

## 2. Owner-Only External / Account / Legal Queue (Zero Automated Execution)
Items flagged in the forensic estate audit requiring owner authentication, billing consoles, filings, or legal action remain strictly outside automated execution:
- GitHub org visibility/support unflagging + privatizing non-`gse-gsi` repos + removing `stealth-skeleton` public Hugging Face repos/Worker.
- Key rotations (Stripe, Neon, Telegram bot, exposed tokens), SaaS/cloud subscription cancellations, and GCP secondary project VM checks + Neon branch pruning.
- Federal EIN (IRS SS-4), SAM.gov, NSF/DOE SBIR submissions, TX SOS Form 202 nonprofit cure (Dec 10 deadline), Clio EEOC review, Vercel SSO re-auth, and Charcuterie Chick / Kit client outreach.
