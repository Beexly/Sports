# 05 — Threat Model (program-specific)

What this program could break, and the control that prevents it.

| # | Threat | Control |
|---|---|---|
| T1 | Supply-chain: a researched repo gets installed/vendored on momentum alone | Hard rule: no installs; Radar produces dossiers, not dependencies; blocked postures override every score; no install path exists in code or UI |
| T2 | Quarantined/owner-review resources leak into implement-now queues | Existing gated-leak invariants extended to Radar; leak-prevention tests required before PR |
| T3 | Method leakage through new surfaces (radar/foundry/assurance payloads) | All new surfaces are admin-only cockpit routes; no public projection; method-opacity scanners still run repo-wide |
| T4 | Prompt-injection via skill/agent instructions | Foundry baseline scanner flags hidden-instruction patterns; manifests declare allowed tools/domains; nothing auto-approves |
| T5 | Shadow router silently alters production model behavior | Shadow mode is structurally no-op: recommendation object only, feature flag default false, tests pin "cannot alter current call" |
| T6 | Fabricated status (capability claimed ACTIVE/wired without runtime proof) | Registry trust rules + new anti-drift pins; assurance report treats missing telemetry as a finding, never a pass |
| T7 | License contamination (AGPL/custom-license reference code copied in) | Rights matrix marks AGPL/custom as reference-only pending owner/legal review; no code is copied from researched repos |
| T8 | Secrets in artifacts or fixtures | Secret scan runs pre-commit and in CI; fixtures carry only public repo metadata |
| T9 | New cockpit endpoints bypass auth | Foundry/assurance/radar APIs follow the existing admin-endpoint pattern; admin-only tests required |
| T10 | Artifact pack itself misstates reality (docs drift, again) | Every pack claim carries an evidence path; contradiction ledger format enforced; anti-drift tests added where practical |
