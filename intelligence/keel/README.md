# Keel

Intake for the locked fourth-down estimator. Landed 2026-10-04.

The screen is [src/routes/index.tsx](src/routes/index.tsx). Laws, the sealed field, the scorer, the shelf, the hunt, and the equations live under `src/lib` and `src/components/keel`.

## What this is not

- Not a pick. This tree is not imported by `apps/web`. `publishes_pick` stays false. Nothing here posts, sends, or bets.
- Not a workspace. It sits outside `apps/*`, `packages/*`, and `workers/*` on purpose, so the root `package-lock.json` and `npm ci` do not change. Do not add it to the root `workspaces` array.
- τ̂ is named in the closed record and is not defined here. Do not invent the definition.
- A missing offensive-line row stays null. Pittsburgh week 4 is null, not healthy.
- No rented card. No NIM call, no Together call, no H100. Local CPU only.
- The Grok preview host (auth gate, PWA injector) is not in this tree. Those files are platform chrome, not the estimator.

## Sealed reports

Do not refit these. Do not mix the two slices.

| Report | Figure | Slice |
|---|---|---|
| Decision lift vs win-probability-max | +6.77 pp | 3,988 decisions |
| Held-out Brier vs that same baseline | 0.1621 vs 0.1748 | 306 drives |

## What the hunt does

While the console is open it asks arXiv, OpenAlex, and the Alexandria research index (Firecrawl paper search, no key). A page scrape still needs a key typed for that session. The key is not stored.

Words admitted at least twice, and never rejected, are appended to the next OpenAlex and Alexandria query. arXiv stays on the doctrine query, so a bad clause cannot empty the archive. Every third shift explores instead of exploiting the lane with the highest admit rate.

## Field arithmetic

Computed from the sealed 2026 week-0 passing table (37 season means, 3,121 attempts): unweighted mean 2.847, attempt-weighted mean 2.844. The illegal fixture 2.1 is outside the observed support (min 2.414, max 3.417). Week-4 offensive-line rows that exist: 15 Out of 41. Seven teams have zero rows. That is a recorded null.
