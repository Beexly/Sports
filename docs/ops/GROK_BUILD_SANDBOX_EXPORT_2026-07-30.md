# Grok Build sandbox export — 2026-07-30

## Verdict

App Builder sandbox work has been **fully exported** to estate git. Nothing of substance remains sandbox-only.

## Where it lives

| Artifact | Location | SHA / ref |
|----------|----------|-----------|
| Full sandbox source | [Beexly/gse-grok-build-sandbox](https://github.com/Beexly/gse-grok-build-sandbox) | `4f4f445` main |
| This pointer | `docs/ops/GROK_BUILD_SANDBOX_EXPORT_2026-07-30.md` | this commit |

## Isolation (physics)

- **NOT production.** SoT remains this repo (`Beexly/Sports`).
- Do **not** Vercel-wire `gse-grok-build-sandbox` to `sports-web` / galaxysportsedge.com.
- Demo surfaces (board / stats / fantasy / brief / cockpit) **duplicate** existing `apps/web/app/*` routes with static mock data only.
- Do **not** re-implement free-spine, conviction, or A-1 inside the sandbox export.

## Production work that already owns the real surfaces

| Concern | Production path |
|---------|-----------------|
| Board honesty | `apps/web/app/board` |
| Stats / metrics | `apps/web/app/stats` + stats-api packages |
| Fantasy | `apps/web/app/fantasy` |
| Brief | `apps/web/app/brief` |
| Cockpit + conviction dry-run | `apps/web/app/cockpit` (+ calibration) |
| Free-spine | crons + free adapters on main |
| APEX + A-1 tripwire + dual-scheduler | **PR #258** (`apex/iron-queue-boot-2026-07-30`) — open, not merged |

## Sandbox export contents (summary)

- TanStack Start app: routes `/`, `/board`, `/stats`, `/fantasy`, `/brief`, `/cockpit`
- `src/lib/gse/data.ts` — mock law, metrics, free-spine labels, founder queue
- UI shell + tokens
- Template auth/db scaffolding (App Builder preset) for runnable export

## Next non-duplicate work (Sports only)

1. Merge or precisely BLOCKED-one-choice on **PR #258**
2. Clearance-block tests on live free ingest
3. G-1 prep one-pager (founder)
4. No further parallel GSE website demos

## Cleared

Sandbox outstanding = **none** for this export cycle. Preview may still run ephemerally; git estate holds the source.

## Full file reconciliation

See `RECONCILIATION.md` in gse-grok-build-sandbox @ 4f4f445 for complete inventory including screenshots and platform AGENTS seed.
