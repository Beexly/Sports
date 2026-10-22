# P0 Red Team HOLD fix — consensus claim binder A+B (ship via PR)

## Goal
Close Red Team HOLD on public quantified bookmaker-% claims (e.g. "100% bookmaker…"). Implement A+B on a NEW branch from latest `origin/main`, open a PR. Do NOT use Cursor cloud agents. FREE Zen only.

## HARD WALLS (do not touch)
- No Stripe price IDs, PRICING_PHASE, MODEL_VERSION, feature-flag flips
- No tip-sheet / +EV surfaces
- Do NOT "fix" by toggling Odds API key or binder-only on preview
- Do not rewrite stored claim text except where B explicitly raises bar / rewrites thin espn_public claims at mint or gate

## Mint sites (known)
- `packages/prediction-engine/src/scoring.ts` SPREAD ~L718: `N% bookmaker consensus`
- `packages/prediction-engine/src/scoring.ts` TOTAL ~L969: `N% of bookmakers favor`
- Factor text also uses `N% of bookmakers align` (computeConsensusScore) — gate must catch favor/align/consensus quantified forms

## A) Widen T-1 binder regex
File: `apps/web/lib/claims/public-consensus-claim.ts`

Current:
```
export const CONSENSUS_CLAIM_RE = /\b(\d{1,3})%\s+bookmaker consensus\b/i;
```

Widen to match quantified bookmaker-% teasers with consensus / favor / align (not only `bookmaker consensus`). Examples that MUST match:
- `100% bookmaker consensus on Chiefs -5.5.`
- `84% of bookmakers favor Over 45.5.`
- `72% of bookmakers align on this side` (if that form appears in public teaser)

Still MUST NOT match plain prose like `Market and rest edges align.` (no leading N%).

Refuse unbound render on ALL public surfaces:
1. `/preview` (already wired — keep)
2. `/picks` via `apps/web/components/picks/pick-card.tsx` (today dumps `reasoningShort` raw at ~L213)
3. `/api/picks` (`apps/web/app/api/picks/route.ts`) — suppress unbound consensus teasers in `reasoning` / `reasoningShort` returned to clients (null or strip short when claim matches but bind fails)

## B) Evidence caption + raise thin/espn bar
- Show `consensusEvidenceCaption` (book count + freshness) next to every bound claim on preview AND pick-card (and expose caption/fields from API if needed so `/picks` can render without inventing numbers client-side).
- When provider is `espn_public` OR bookmakerCount is thin (below a raised bar you document — at least refuse <2 already; prefer higher for espn_public / single-source), refuse bind OR rewrite mint teaser to non-quantified honest form. Prefer gate/refuse over silent 100% claims.
- Do not invent Odds API presence.

## Tests
Update `apps/web/__tests__/public-consensus-claim.test.ts`:
- favor / align quantified strings detect true
- non-quantified "align" stays false
- preview + picks page/card + api/picks import/contract asserts binder used (source tripwire like preview already has)

Run focused tests if practical: vitest on that file.

## Git / PR
1. `git fetch origin main`
2. New branch from `origin/main`: `fix/consensus-claim-binder-ab` (or similar)
3. Work in a clean worktree if checkout is dirty: `C:\Users\Garrett\Sports\.worktrees\consensus-claim-ab`
4. Commit only A+B files + tests
5. `gh pr create` with clear summary referencing Red Team HOLD; note walls respected
6. Print PR URL at end

## Done when
PR open; regex widened; unbound claims suppressed on /picks + /api/picks + /preview; evidence caption beside bound claims; tests updated.
