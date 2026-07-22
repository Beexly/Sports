# NOVA convergence inventory tooling

Deterministic replacement for model-driven branch inventory (directive
section 3). Branch inventory and collision detection are repository facts;
these scripts derive them from git object identity, never from model
judgment. A model may interpret the receipt; it may not manufacture it.

## Files

| File | Purpose |
| --- | --- |
| `build-convergence-inventory.mjs` | Builds `reports/nova/convergence/NOVA_CONVERGENCE_{INVENTORY.json,INVENTORY.md,RECEIPT.json}` from `--base`/`--head` refs. |
| `verify-convergence-inventory.mjs` | Re-derives the artifacts from the SHAs in the committed receipt and compares sha256 hashes; nonzero exit on any mismatch. |
| `convergence-owners.json` | Canonical-owner manifest: frozen domain ownership (NOVA / CONTROL_PLANE / SETTLEMENT / SHARED_INFRA), path prefixes, and forbidden symbol prefixes. |
| `convergence-inventory.test.mjs` | `node --test` unit tests, including mutation-style tests proving each collision rule is load-bearing. |

## Usage

```bash
npm run nova:inventory -- --base main --head <branch-or-sha>
npm run nova:inventory:verify
npm run test:nova-inventory
```

CI: `.github/workflows/nova-convergence-inventory.yml` — manual
`workflow_dispatch` or PR label `nova-convergence-inventory`. Never runs on
push.

## Determinism contract

- Inventory content is a pure function of `(baseSha, headSha, manifest)`.
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
