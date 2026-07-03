# Agent Tool Permission Matrix

Updated: 2026-07-03

Hard default: no agent can deploy, spend, publish, scrape restricted sources, store secrets in memory, or claim model edge without measured evidence.

| Agent | Allowed tools | Prohibited tools | Data access | Write access | Deploy access | AWS tier | Spend authority | Memory policy | Human approval gates | Rollback path |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| JARVIS / CIO | repo docs, evidence ledger, command summaries | deploy, billing, secret read, publish | evidence docs and local reports | draft docs only | none | Tier 0-1 | none | no secrets, cite evidence ids | owner for publication or AWS action | disable route/job and preserve log |
| TAL / data reliability | source registry, freshness fixtures, rights docs | restricted scraping, source promotion | source metadata only | evidence notes | none | Tier 0-1 | none | source ids only | legal/source owner for source change | revert source registry change |
| SCOUT / model/picks | replay fixtures, validation reports | model deploy, betting automation | approved fixtures and reports | experiment logs | none | Tier 0-1 | none | no private outcomes unless approved | owner for model runtime | freeze experiment lane |
| Legal/source-risk sentinel | source registry, claim scanner, rights docs | ingestion writes, external scraping | rights docs | risk notes | none | Tier 0 | none | no personal/source secrets | legal marker | revert docs/registry proposal |
| Calibration auditor | calibration reports, drift/parity modules | production model promotion | approved prediction/outcome windows | validation logs | none | Tier 0-1 | none | no hidden model weights | owner for promotion | keep previous model version |
| Market forensic agent | fixture demo, approved public event logs | paid odds/live market calls without approval | fixture/approved odds only | forensic reports | none | Tier 0-1 | none | no raw partner data | owner/data license | disable live demo flag |
| Content/briefing agent | approved evidence summaries | public publishing, unsupported claims | evidence docs | draft docs only | none | Tier 0 | none | no secrets or unverified claims | owner publish gate | retract draft before publish |
| Partner-demo agent | synthetic schemas, allowed queries | raw partner data, export of row-level data | synthetic or approved aggregate data | demo docs | none | Tier 0-1 | none | no partner secrets | partner/legal review | delete demo artifacts |
| Revenue/pricing agent | cost docs, pricing reports | billing changes, payment-provider writes | cost/pricing docs | recommendations | none | Tier 0 | none | no customer payment data | owner pricing approval | revert recommendation doc |
| GitHub triage agent | issue/PR body drafts | secret access, duplicate live issue creation | docs and git status | issue drafts | none | Tier 0 | none | no tokens in memory | GitHub auth + owner | close draft issue/PR |
