# Google repo list 2026-10-22

Pasted 8. Distinct 8. Metadata from `gh api`. Policy: `docs/strategy/dfs-tooling-vetting-2026-09-12.md:42` — no licence means all rights reserved. All eight have a licence (7 Apache-2.0, 1 BSD-3-Clause). None archived. None are a 0-star same-day pile.

| repo | stars | pushed_at | license | language | verdict |
|---|---:|---|---|---|---|
| google/agentmesh | 1144 | 2026-10-22T04:35:19Z | Apache-2.0 | Go | reference only |
| google/device-infra | 87 | 2026-10-22T04:14:23Z | Apache-2.0 | Java | skip |
| google/osv.dev | 2986 | 2026-10-22T04:39:18Z | Apache-2.0 | Go | ADOPTED, the public API only |
| google/sandboxed-api | 1771 | 2026-10-22T03:39:00Z | Apache-2.0 | C++ | skip |
| google/skia-buildbot | 176 | 2026-10-22T04:30:46Z | BSD-3-Clause | Go | skip |
| google/skills | 21479 | 2026-10-22T04:00:04Z | Apache-2.0 | Python | skip |
| google/tcmalloc | 5387 | 2026-10-22T04:35:30Z | Apache-2.0 | C++ | skip |
| google/tpu-sync | 151 | 2026-10-22T04:16:17Z | Apache-2.0 | C++ | skip |

## Why

- osv.dev: the Go service was not cloned. The public query API was run against the two root dependencies, `pg` and `ioredis`, at the versions named in `package.json` (`8.21.0`, `5.10.1`). Both returned 0 vulnerabilities. Those are range-stripped versions, not a lockfile resolution. `scripts/ops/osv_query_root_deps.py` exits 1 if a later run finds any. It does not replace `scripts/guardrails/dependency-audit.mjs`.
- agentmesh: a private agent network. Nothing is reachable until a grant names the service. GSE already fails closed. Standing up a mesh does not score a game.
- skills: the `skills/` directory is `ads`, `analytics`, `cloud`, `developers`, `identity`. Those are Google product skills. They were not installed. This project avoids paid cloud.
- tcmalloc: C++ malloc. It cannot ship into a TypeScript route.
- sandboxed-api: C++ library sandbox. No C++ library is on the pick path.
- tpu-sync: TPU KV-cache DMA. README says it is not recommended for general use. There is no TPU here.
- device-infra: Android Test Station. Not a sports runtime.
- skia-buildbot: Skia CI on x86 Linux. Not a sports runtime.

Adopted 1. Reference only 1. Skipped 6. Rejected by policy 0.

## Next

1. Point the OSV query at the lockfile versions, not the caret ranges, before treating a clean result as coverage.
2. Do not install `google/skills` into Hermes. They are not GSE skills.
