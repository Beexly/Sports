# Makefile — Galaxy Sports Edge Developer Experience (DX) Automation (`dx-optimizer`)
.PHONY: help verify-all perf-audit seo-audit sync-week9 test-week9 guardrails build-native

help:
	@echo "Galaxy Sports Edge — Developer Experience Commands:"
	@echo "  make verify-all    Run full schedule gate, performance audit, SEO/LCP audit, and guardrails"
	@echo "  make perf-audit    Run full-stack Python/C++/Spark/Postgres/Vector performance optimizer"
	@echo "  make seo-audit     Run 8-skill SEO, E-E-A-T, anti-cannibalization, snippet & LCP audit"
	@echo "  make sync-week9    Sync fresh Week 9 Firecrawl Alexandria + ESPN + DraftKings slate"
	@echo "  make test-week9    Run Week 9 forensic & dual-slate DFS pytest suite"
	@echo "  make guardrails    Run connected-workflow-dossier-guard and trust-gate"

perf-audit:
	python intelligence/performance/full_stack_performance_and_data_optimizer.py

seo-audit:
	python intelligence/seo/seo_and_lcp_optimization_engine.py

sync-week9:
	python intelligence/data_sources/firecrawl_alexandria_live_sync.py

test-week9:
	python -m pytest tests/test_week9_forensic_autopsy_fixes.py tests/test_week9_dual_slate_dfs.py -q

guardrails:
	python scripts/guardrails/connected-workflow-dossier-guard.py
	node scripts/guardrails/trust-gate.mjs

verify-all: sync-week9 perf-audit seo-audit test-week9 guardrails
