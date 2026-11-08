# Deep Research Universe Audit: GSE & GSI Zero-Overlooked Investigation Report (2026-11-08)

**Date**: 2026-11-08  
**Scope**: Full-universe AST, call-graph, data-flow, and cross-workspace audit across `C:\Users\Garrett\Sports`, `C:\Users\Garrett\Sports-worktrees`, `C:\Users\Garrett\gse-ml-service`, `C:\workspace\gse-lab-20260919`, `C:\Users\Garrett\OneDrive\Documents\Galaxy Sports Edge`, `C:\Users\Garrett\.hermes`, `C:\Users\Garrett\nfl-farm`, `C:\c\wt-*`, and `G:\My Drive`.

---

## 1. Executive Summary: 12 Verified Structural Findings & Remediations Across the GSE & GSI Universe

1. **Calibration Head Unification (`data/calibration/` & `data/engine/`), Negative Brier Skill Gate & Full Market Coverage**:
   - Python [`scripts/calibration/train_market_specific_calibration_heads.py:22`](file:///C:/Users/Garrett/Sports/scripts/calibration/train_market_specific_calibration_heads.py#L22) and TypeScript [`packages/prediction-engine/src/public-baseline/calibration-map.ts:75`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/public-baseline/calibration-map.ts#L75) now resolve both `data/calibration/market_calibration_heads_2026.json` and `data/engine/market_calibration_heads_2026.json`, preserving `display_format` and `first_quarter_script_discount`.
2. **Subpackage Inbound & Outbound Wiring Verification in `intelligence/`**:
   - All 51 subpackages under `intelligence/` have verified `__init__.py` entrypoints and symbol-level import checks via [`omniverse_gse_gsi_zero_overlooked_wiring_auditor.py`](file:///C:/Users/Garrett/Sports/intelligence/audit/omniverse_gse_gsi_zero_overlooked_wiring_auditor.py).
3. **External Charting `get_pcvr_rankings()` & `connorlong-pcvr-reich-2026.csv` Integration**:
   - [`intelligence/external_charting/morning_sweep_2026_11_07.py`](file:///C:/Users/Garrett/Sports/intelligence/external_charting/morning_sweep_2026_11_07.py) persists `pcvr_components` from `connorlong-pcvr-reich-2026.csv` and exposes them in `get_pcvr_rankings()`.
4. **Coaching Benchmark Matrix & 18 CSV Coverage**:
   - All 18 CSVs in `intelligence/coaching/data/` are wired across `intelligence/coaching/*.py` and [`gse_proprietary_metrics_benchmark_and_optimizer.py`](file:///C:/Users/Garrett/Sports/intelligence/coaching/gse_proprietary_metrics_benchmark_and_optimizer.py).
5. **Warehouse Parquet Registry & Polymarket Compliance Hold**:
   - [`intelligence/data/warehouse/__init__.py`](file:///C:/Users/Garrett/Sports/intelligence/data/warehouse/__init__.py) verifies Parquet warehouse datasets while enforcing the Polymarket compliance hold (`polymarket-hold`).
6. **MCP Equations Server Registration & Workspace-Relative Path Resolution**:
   - [`packages/mcp-equations-server/src/index.ts`](file:///C:/Users/Garrett/Sports/packages/mcp-equations-server/src/index.ts) exports all 9 `.ts` modules, [`thousand-equation-registry.ts`](file:///C:/Users/Garrett/Sports/packages/mcp-equations-server/src/thousand-equation-registry.ts) resolves `data/engine/thousand_equation_matrix_2026.json` relative to workspace root, and [`.mcp.json`](file:///C:/Users/Garrett/Sports/.mcp.json) registers `mcp-equations-server`.
7. **GSI Clinical Quarantine & `galaxy-conformal-ot` Sports Kernels**:
   - `check_charge_10` enforces zero `gsi_sandbox` strings across `intelligence/`, `packages/`, `apps/`, and `workers/`, and `books-b-medical` carries `0.0` weight in the sports prediction spine.
8. **Storefront Paywall Protection, QB Roster Consistency & Voided Nov 5 Batch Notice**:
   - [`apps/web/lib/engine/engine-live-bridge.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/engine/engine-live-bridge.ts) enforces paywall protection, consistent BAL QB attribution (`Jacoby Brissett`), and explicit marking of the voided Nov 5 batch (`62-23-1 (voided_nov_5_batch)`).
9. **Bidirectional `gse-ml-service` Synchronization (`355 passed, 3 skipped`)**:
   - [`C:\Users\Garrett\Sports\gse-ml-service\app\models\tda.py`](file:///C:/Users/Garrett/Sports/gse-ml-service/app/models/tda.py) and standalone `C:\Users\Garrett\gse-ml-service` are 100% synchronized (`_pure_numpy_ripser_maxdim1` exact $\mathbb{Z}_2$ persistent homology solver + 20 Kats/Prophet/Simulator files).
10. **Two-Host Portable Path Resolution in `scripts/ops/research_pipeline_dag.py`**:
    - [`scripts/ops/research_pipeline_dag.py`](file:///C:/Users/Garrett/Sports/scripts/ops/research_pipeline_dag.py) resolves `REPO`, `CORPUS`, and `PY` dynamically via `Path(__file__).resolve().parents[2]`, `os.environ.get(...)`, and `sys.executable`.
11. **Engine Kernels Export & Fallback**:
    - [`engine/kernels/consolidated_sweep_kernels.py`](file:///C:/Users/Garrett/Sports/engine/kernels/consolidated_sweep_kernels.py) and [`engine/kernels/__init__.py`](file:///C:/Users/Garrett/Sports/engine/kernels/__init__.py) cleanly resolve `load_verified_pbp_table` without `ImportError`.
12. **Scores24.live + PFR + PFF + NGS + Multi-Horizon Unified Trend Engine**:
    - [`intelligence/trends/scores24_pfr_pff_ngs_unified_trend_engine.py`](file:///C:/Users/Garrett/Sports/intelligence/trends/scores24_pfr_pff_ngs_unified_trend_engine.py) and [`data/trends/scores24_pfr_pff_ngs_unified_week9_trends_2026.json`](file:///C:/Users/Garrett/Sports/data/trends/scores24_pfr_pff_ngs_unified_week9_trends_2026.json) synthesize all 5 Trend Lenses across all 15 Week 9 games.
