## THE LOOP — Coding-agent research workflow (by category)

Coding agents: **do not search**. Pick one category, open its file under `docs/ops/research-by-category/`, code to acceptance, one PR per category.

P0 order: `C5` → `C1` → `C2` → `C4` → `C3` → `C6` → `C7` → `C8`.

### `C5-bootstrap-calibration` — Bootstrap mode, partial ranks, calibration gates
- Mission: No fake precision under sparsity; conformal/partial-rank caps; humility CI rule; Balance-score / LRD diagnostics.
- Code: confidence display, board ties, calibration dashboards, bootstrap advisory
- Done when: Do not lock when 95% CI crosses 0.5 or market p (advisory); tie clusters on board; launch thresholds untouched.
- High: `2208.08598`, `2501.02505`, `2406.19563`, `2311.03490`, `2207.13770`
- Medium priority: `0705.3257`, `2312.04711`, `1605.03471`, `2309.06248`, `1706.02447`
- Full Medium list (65): `docs/ops/research-by-category/C5-bootstrap-calibration.md`

### `C1-per-sport-generative` — Per-sport generative probability (scores / WP)
- Mission: Replace global classifier heads with sport-specific generative or logistic WP models. Offline bake-offs first; no gate flips.
- Code: packages/prediction-engine, gse-ml-service, apps/web offline diagnostics only
- Done when: Offline CE/RPS/Brier table vs current engine on settled book-priced rows; sport-split noise scales documented.
- High: `1701.05976`, `2408.08331`, `2105.09881`, `1704.00197`, `1906.05029`, `2409.17129`, `1607.00379`
- Medium priority: `2501.05873`, `1002.0797`, `2301.04251`, `2109.00378`, `2012.14949`
- Full Medium list (76): `docs/ops/research-by-category/C1-per-sport-generative.md`

### `C2-features-rankings` — Strength features & rankings (not learner swaps)
- Mission: Fix MAE by baking better strength/ranking inputs before swapping XGBoost/NN. Dynamic BTL / Elo / opponent-adjust.
- Code: feature-store, prediction-engine ratings, board ranking inputs
- Done when: Feature bake-off table: Elo/BTL/pi-rating vs current; MAE delta; no production swap without founder OK.
- High: `2405.10247`, `2408.08331`, `2501.02505`, `2406.19563`, `2207.14124`
- Medium priority: `2109.13743`, `1203.2228`, `2012.06366`, `physics/0608007`, `2507.22472`
- Full Medium list (88): `docs/ops/research-by-category/C2-features-rankings.md`

### `C4-clv-markets` — CLV & market benchmarks
- Mission: Lock-time vs close CLV protocol; beat the line, not internal consistency alone.
- Code: line-archive, money observability, performance CLV diagnostics
- Done when: CLV↔Brier diagnostic when archive exists; lock≠open doctrine in docs; no ROI claims in public copy.
- High: `1710.02824`, `2008.01485`, `1701.05976`
- Medium priority: `2105.08310`, `2108.02419`, `2008.04216`, `1211.6496`
- Full Medium list (39): `docs/ops/research-by-category/C4-clv-markets.md`

### `C3-ensemble-cept` — Ensemble / CEPT (heterogeneous experts)
- Mission: Combine incompatible experts with learned/BMA weights — not naive product. Odds as ensemble member optional.
- Code: prediction-engine ensemble, CEPT docs, offline weight estimation
- Done when: Offline BMA/weight schedule proposal; common target defined; no live weight changes without tests.
- High: `2206.13246`, `2001.00878`, `2608.21530`, `2203.07029`
- Medium priority: `2008.04216`, `2203.07029`, `2103.13736`
- Full Medium list (75): `docs/ops/research-by-category/C3-ensemble-cept.md`

### `C6-pick-lifecycle-live` — Pick lifecycle & live WP (lock ≠ settle)
- Mission: Timestamp lock line; live confidence updates after lock; in-play models are not pre-game pick models.
- Code: pick state machine, live WP adapters, board lock timestamps
- Done when: Lock/close fields documented; live WP path separate from published pre-game pick.
- High: `1704.00197`, `1906.05029`, `1710.02824`
- Medium priority: `2609.07617`, `2404.13300`, `2303.17863`
- Full Medium list (8): `docs/ops/research-by-category/C6-pick-lifecycle-live.md`

### `C7-data-features` — Data integrity & sport features
- Mission: Source-bias detection, opponent-adjust, park/defense, xG/event features when feeds exist.
- Code: data-ingestion, feature-store, workers/data-refresh
- Done when: Bias/QA checks or feature PR with tests; no private competitor scrape.
- High: `2206.09083`, `2301.13052`, `1602.08754`
- Medium priority: `2603.21163`, `2505.15859`, `1602.08754`, `2301.13052`
- Full Medium list (20): `docs/ops/research-by-category/C7-data-features.md`

### `C8-ops-ux-brand` — Ops UX, brand, content (math you can read)
- Mission: Calibration dashboards, board UX, brand lint, Dynasty/content only after core P0.
- Code: apps/web cockpit, FIELD/design, content-publishing
- Done when: LRD/subgroup brush or board UX improvement; positioning vocab enforced.
- High: `2207.13770`, `2311.03490`
- Medium priority: `2401.06336`, `2303.14655`, `2405.19958`, `1909.12938`
- Full Medium list (12): `docs/ops/research-by-category/C8-ops-ux-brand.md`

Unmatched Medium: 18 → `docs/ops/research-by-category/other.md`.
Inventory mirrors: `docs/ops/AGENTS_RESEARCH_BLOCK.md`, `NEXT_WAVE_MEDIUM.json`, `INTEGRITY_DEEP_58.md`.
Workflow steps: `docs/ops/CODING_AGENT_WORKFLOW.md`.
