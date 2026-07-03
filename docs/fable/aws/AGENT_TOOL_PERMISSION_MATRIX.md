# Agent Tool Permission Matrix

| Agent | Allowed tools | Prohibited tools | Data access | Write permissions | Deploy/cost permissions | Approval gates |
| --- | --- | --- | --- | --- | --- | --- |
| JARVIS / CIO | read docs, summarize ledger | deploy, paid AWS | evidence docs | docs draft only | none | owner for publish |
| TAL | source registry read, freshness checks | scraping blocked sources | source metadata | evidence notes | none | legal for source change |
| SCOUT | replay fixtures, model reports | betting automation | approved fixtures | experiment logs | none | owner for model runtime |
| Legal sentinel | source registry, claim scanner | source ingestion | rights docs | risk notes | none | legal marker |
| Calibration auditor | replay reports | model deploy | calibration data | validation logs | none | owner for promotion |
| Market forensic agent | fixture demo | live paid odds without approval | fixture/approved odds | reports | none | owner/data license |
| Content agent | approved summaries | external publishing | evidence docs | draft docs | none | owner publish gate |
| Partner-demo agent | synthetic schemas | raw partner data | synthetic data | demo docs | none | partner/legal |
| Revenue/pricing agent | cost docs | billing changes | cost ledgers | recommendations | none | owner |
| GitHub triage agent | issue bodies | secret access | docs | issue drafts | none | GitHub auth + owner |
