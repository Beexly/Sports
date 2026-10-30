# AUDIT-DOMAIN-6 — Overnight Runs & Bakeoff Reconciliation
**Domain:** ON1-ON3, NFL-SIMULATOR-DOSSIER, RESULTS-2026-10-30, TEST-REPORT, BAKEOFF-REPORT, RUN-REPORT, INTEGRATION reconciliation
**Auditor:** inline (opencode workers non-functional on Windows — postinstall not run)
**Status:** COMPLETE — verified inline

## Bakeoff verdicts enforced
- **Laya (convaiinnovations/laya) — KILLED:** Tested on 3,081 settled GSE picks. Passed 3,077/3,081 (99.61% false-pass rate, ECE=0.407, Tier B AUC=0.437 inverted), rejected 3 winners (+1.452u lost). Decision: do NOT wire zero-shot Laya into the gate. (`RESULTS-2026-10-30.md`)
- **MemPalace S50 — LEARN-ONLY, replaced:** On 11-file memory corpus, stdlib BM25 + AAAK regex extractor scored 19/20 (95% R@5) vs MemPalace 13/20 (65% R@5) — dense MiniLM misses exact numbers (47-16, 7.109). Decision: use stdlib BM25 + AAAK. (`TEST-REPORT.md`)
- **MarkItDown — kept as default PDF parser:** Scored 174/200 across 10 real GSE PDFs, 0% token hallucination; OXR free API timed out 5/5. (`BAKEOFF-REPORT.md`)
- **AIGoat S82 — MCP hardening:** Confirmed MCP03 Tool Description Poisoning + MCP02 Scope Creep. Enforces SHA-256 tool description pinning + explicit per-agent tool allowlists. (`FLEET-HARDENING-CHECKLIST.md`)
- **OpenCode free routing (S83):** opencode/deepseek-v4.1-flash-free (primary) + opencode/glm-5.3-flash-free (secondary) as 100% free autonomous workers. (`free-routing-deepseek-v41-flash.md`)

## dgrifka/nfl_simulator v2.1.2 reverse-engineered (`NFL-SIMULATOR-DOSSIER.md`)
- Reproduced CAR@GB 88.0% GB / 12.0% CAR (22.29 vs 12.68 likely pts) to 4 decimals via points = -16.829 + 35.126*folded_SR + 4.178*YPP and Phi(margin/5.4528).
- Blind spot exposed: ignores FGs, PATs, drops, ST (v1 play-level adjustments retired v1.4.3).

## Ledger (owner-attested, not ledger-verified)
- Official: 47-16 (74.6%, +29.01u), entering TNF 16-5 +10.45u + TNF 31-11 +18.56u.
- new_engine_official_ledger_2026.json updated with `prior_record_verification` flag: OWNER_ATTESTED_UNVERIFIED — no per-pick history behind 16-5; 16 of 31 wins and 5 of 11 losses not independently reconstructible.

## Result
AUDIT-DOMAIN-6 PASS. All bakeoff verdicts enforced; ledger flagged as owner-attested-unverified.
