# Promotions API Safety

Date: 2026-06-09

## Result

Status: PASS for fail-closed public API behavior.

## Fix Applied

Touched files:

- `apps/web/app/api/promotions/route.ts`
- `apps/web/lib/promotions/public-payload.ts`
- `apps/web/__tests__/promotions-public-payload.test.ts`

## Behavior

When DB/promotions data is unavailable:

- API returns HTTP 200.
- `success` remains true for public-render safety.
- `data` is an empty list.
- `meta.dataStatus` is `degraded`.
- No operator URLs or live affiliate links are exposed.
- Public copy says no promotions are cleared for display.

## Verification

Command:

`Invoke-WebRequest http://localhost:3211/api/promotions`

Post-fix status: 200.

Targeted test: `promotions-public-payload.test.ts` passed.

## Legal/Compliance Boundary

This did not launch promotions, affiliate links, sportsbook offers, or casino/DFS links. Any live promotion requires legal/compliance review, jurisdiction gating, disclosure copy, and founder approval.
