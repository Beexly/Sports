# Recovery Matrix — 2026-07-17

Classification of frontier assets against `origin/main @ c179a78`. Recover before rewriting.

| Asset | Classification | Evidence | Action |
|---|---|---|---|
| PR #119 `claude/salvage-settlement-guardrails` | RECOVER_WHOLE | Fixes live money-truth mis-grade on main (`calculatePickResult` spaced-prefix side derivation); auto-merge clean onto c179a78 | **DONE (W000)** — cherry-picked onto `claude/galaxy-sports-edge-pdcswh`, verified |
| PR #123 cockpit per-page auth | RECOVER_WHOLE | Zero-conflict rebase claimed on #118; defense-in-depth, scan-enforced | Founder merge, or next recovery slice; re-verify vs #120's `cockpit/page.tsx` change |
| PR #122 CLV decomposition re-land | OWNER_GATE | Purely additive `IF NOT EXISTS` migrations, proven on disposable PG; migrations are founder-applied | Founder merges + runs `migrate deploy`; do not auto-land |
| PR #121 fantasy-engine floor | RECOVER_PARTIAL | Golden-verified, but ~350 competitor-trademark occurrences must be renamed before public surfaces | Land after trademark rename lands; ADMIN-only until then |
| PR #124 frontier superset | RECOVER_WHOLE | Added-file-only port, proven disjoint from main's later PRs | Founder merge after #119/#123 land (guard-script interplay re-check) |
| PR #112 governed playback | RECOVER_PARTIAL | Draft; base #115; `PickEvidenceEnvelope` is the Reality Receipt seed | Extract envelope + projections as W001/W003 substrate; do not merge draft wholesale |
| PR #101 CLV re-land (old) | SUPERSEDED | #122 is the hardened rebase of the same content | Close in favor of #122 (founder action) |
| PR #52 Galaxy Dynasty | RECOVER_PARTIAL | 13-month-stale base; additive packages likely portable | Defer until Dynasty convergence workstream; port `packages/galaxy-engine` only |
| `claude/fix-metric-source-fixture-alignment` | ALREADY_ON_MAIN-equivalent | Same fix carried as 9b61a60 in #119, now on this branch | No action |
