# NOVA convergence inventory tooling

Deterministic replacement for model-driven branch inventory (directive
section 3). Branch inventory and collision detection are repository facts;
these scripts derive them from git object identity, never from model
judgment. A model may interpret the receipt; it may not manufacture it.

## Files

| File | Purpose |
| --- | --- |
| `build-convergence-inventory.mjs` | Builds `reports/nova/convergence/NOVA_CONVERGENCE_{INVENTORY.json,INVENTORY.md,RECEIPT.json}` from `--base`/`--head` refs. With `--heads` it delegates to multi-head mode. |
| `multihead-inventory.mjs` | Multi-head scan mode (`--heads ref,ref,...`): per-head guarded symbols, new/changed Prisma blocks, timestamped migrations, Next.js routes (`app/**/route.ts`, `page.tsx`), and new `process.env` reads; cross-head ownership matrix and seven cross-head collision rules; optional `--refs <json>` (branch → expected SHA) stale-head detection and `--note` strings, both recorded in the receipt only. Outputs `reports/nova/convergence/multi-head/NOVA_MULTIHEAD_{INVENTORY.json,INVENTORY.md,RECEIPT.json}`. |
| `verify-convergence-inventory.mjs` | Re-derives the artifacts from the SHAs in the committed receipt (single- or multi-head; auto-detected from the receipt found in `--out`) and compares sha256 hashes; nonzero exit on any mismatch. |
| `convergence-owners.json` | Canonical-owner manifest: frozen domain ownership (NOVA / CONTROL_PLANE / SETTLEMENT / SHARED_INFRA), path prefixes, and forbidden symbol prefixes. |
| `convergence-inventory.test.mjs` | `node --test` unit tests, including mutation-style tests proving each collision rule is load-bearing. |
| `multihead-inventory.test.mjs` | `node --test` unit tests for the multi-head analyzers, incl. one mutation-style test per cross-head collision rule. |

## Usage

```bash
npm run nova:inventory -- --base main --head <branch-or-sha>
npm run nova:inventory:verify
npm run test:nova-inventory

# Multi-head scan (fetch each head first: git fetch origin <branch>:refs/remotes/origin/<branch>)
npm run nova:inventory:multi -- --base <mainSha> \
  --heads origin/branch-a,origin/branch-b \
  --refs heads-refs.json --note "fetch failed for branch-c: <reason>"
npm run nova:inventory:multi:verify
```

Cross-head collision rules: `cross-head-guarded-symbol`,
`cross-head-prisma-redeclared`, `cross-head-prisma-divergent-definition`,
`cross-head-migration-timestamp-duplicate`,
`cross-head-migration-order-interleaved`, `cross-head-route-collision`,
`cross-head-env-var-collision`. Stale-head statuses (receipt only):
`MATCHES_EXPECTED`, `STALE_BEHIND_EXPECTED`, `DIVERGED_FROM_EXPECTED`,
`EXPECTED_UNRESOLVABLE`, `NO_EXPECTED_REF`.

CI: `.github/workflows/nova-convergence-inventory.yml` — manual
`workflow_dispatch` or PR label `nova-convergence-inventory`. Never runs on
push.

## Determinism contract

- Inventory content is a pure function of `(baseSha, headSha, manifest)` —
  multi-head: `(baseSha, [label, headSha]..., manifest)`. Staleness vs
  remote refs and fetch notes are volatile and live only in the receipt.
  File contents are read from git blobs at the head SHA, never the working
  tree. All ordering uses a locale-independent codepoint comparator; JSON is
  stable-stringified (sorted keys, LF, trailing newline).
- Volatile facts (timestamp, dirty state, command versions, exit code,
  artifact hashes) live only in the receipt.

## Exit codes (build and verify)

| Code | Meaning |
| --- | --- |
| 0 | complete scan, zero collisions / hashes agree |
| 1 | complete scan, collisions found / hash mismatch |
| 2 | incomplete scan (unparsable file) — collision state reported UNKNOWN, never zero |
| 3 | usage / environment / internal error |

## Rollback

The tooling is inert data plus standalone scripts: remove `scripts/nova/`,
the workflow file, the three `nova:*`/`test:nova-inventory` npm aliases, and
`reports/nova/convergence/`. Nothing imports these modules at runtime.
