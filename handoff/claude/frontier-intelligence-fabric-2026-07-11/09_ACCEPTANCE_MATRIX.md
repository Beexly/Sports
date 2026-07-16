# 09 — Acceptance Matrix

What "done" means, per workstream. A workstream is not done until its row is
fully true and evidenced in `11_EXECUTION_LOG.md`.

| WS | Acceptance criteria |
|---|---|
| A | Every contradiction in `03_CONTRADICTION_LEDGER.md` fixed across ALL linked truth surfaces in one change; no status promoted beyond repository evidence; anti-drift tests added; full Jarvis test surface green |
| B | Deterministic radar core (same input → same output, no network in tests); all 43 packet observations preserved raw + normalized; blocked risk overrides any score; quarantine/owner-review can never reach implement-now; dossiers say why relevant AND why not ready; stale expiry; admin-only surface behind `RESOURCE_RADAR_V2_ENABLED`; 12 required test classes green |
| C | Manifest contract complete (identity, hash, seat-derived authority, permissions, budgets, prohibited actions, eval, license, lifecycle); deterministic scanner produces findings and cannot auto-approve; adapter boundary for external scanners with absence shown honestly; 3 first-party DRAFT manifests; read-only surface behind `AGENT_FOUNDRY_ENABLED`; council-mismatch + no-external-action invariants tested |
| D | Report deterministic from inspected registries/artifacts; coverage shown; INCOMPLETE below threshold (never a cosmetic grade); missing telemetry = finding; every finding carries evidence paths + smallest validation + smallest safe fix + ownerActionRequired; admin-only behind `AI_SETUP_ASSURANCE_ENABLED` |
| E | Lanes + policy deterministic and version-pinned; shadow recommendation serializable; production call sites untouched (`ClaudeApiCallRecord` unchanged); no fallback call, no new credential, no external request in tests; risk/privacy/health/budget rules pinned; flag default false |
| F | Each queued spec names target files, data contracts, risk, smallest experiment, flags, acceptance, rollback, owner gates — with zero production code created for optics |

Global (every PR): full test suite green; typecheck green; lint green on touched
files; guardrail scanners green; no secrets; diff inspected; evidence recorded.
