# Launch-Quality Backlog — approved-direct adoption

Source: `NORMALIZED_RESOURCE_LEDGER.csv` (disposition = `approved_direct`).
**1,489 tools** are cleared of the rights gate (safe operational tooling — test,
security, analytics, infra, data-ops, API, design, content, AI-cost, dev). Specific
security/license vetting still happens per tool at adoption.

This backlog is the **first adoption wave**: the curated, marquee tools with concrete,
launch-impacting tasks. The remaining cleared tools live in the ledger and can be pulled
into later waves.

## Wave 1 — marquee tools → tasks

| Tool | Category | Launch task |
|---|---|---|
| Playwright | testing_qa | E2E + visual-regression smoke on the top 5 public pages and the cockpit. |
| Can I Use | testing_qa | Pin a browser-support baseline; gate CSS features against it. |
| Snyk | security | Add dependency + code scanning to CI; fail on high severity. |
| Wazuh | security | Stand up host/security monitoring on the deploy box (self-host). |
| Umami | analytics | Privacy-first product analytics for the owner cockpit funnel. |
| GoAccess | analytics | Web-log analyzer over access logs for a cheap traffic read. |
| Cloudflare Web Analytics | analytics | Zero-cost, cookieless pageview baseline on public pages. |
| Grafana | analytics | Single ops dashboard (ingestion freshness, queue depth, API spend). |
| DBeaver | data_ops | Operator DB client for prod-safe read queries. |
| DuckDB | data_ops | Local analytics over exported pick/result CSVs (no warehouse cost). |
| Qdrant | ai_ml_cost | Vector store for content/embedding features (self-host). |
| Docker / Portainer | infrastructure | Containerize workers; Portainer for operator visibility. |
| Feedly | content_intel | Reviewed content-intelligence inbox (RSS reader app, not auto-ingest). |
| Artificial Analysis | ai_ml_cost | Reference for Jarvis model-cost/quality governance. |

## Rules

- "Approved-direct" = cleared of the **rights** gate. It is NOT a bypass of normal
  engineering review — each tool still gets the usual security/license check at adoption.
- Self-host where a hosted tier would leak data or add cost (Wazuh, Grafana, Qdrant, Umami).
- None of these touch the no-fake-data / no-fake-live-data rules — they are operational tooling.

## Runtime note

To file these as live `CockpitTask` rows, seed them through the task store
(`apps/web/lib/tasks/agent-task-store.ts`) in an environment with the database
configured. This document is the source list for that seed.
