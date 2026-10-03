# Launch merge train — 2026-09-04

Every line here traces to a command run in this session against `origin` fetched
2026-09-04 ~16:20 UTC. Nothing is taken on an agent's say-so, including Hermes's.

## The finding

**`origin/main` is at `51fa7eaa1`, dated 2026-09-03. Nothing from 2026-09-04 is
on it.** Ten branches carry today's work; all of today's PRs are drafts, which is
why none merged. That — not any failing test — is what stands between the repo
and launch.

```
git log -1 --format='%h %ad %s' --date=short origin/main
  51fa7eaa1 2026-09-03 Merge pull request #689 from Beexly/claude/verified-fixes-2026-09-03
git merge-base --is-ancestor 196c8f02d origin/main   -> NO
git merge-base --is-ancestor 170aa1682 origin/main   -> NO
```

Hermes's H-N6 audit claimed the wave-1 SHAs were "verified ancestors of HEAD".
That is true of *its own branch* HEAD, not of `main`. The claim is not false, but
it does not mean what it looks like it means at a glance: none of it is merged.

## The train is four PRs, not eleven

`hermes/night-2026-09-04` (**#700**) is already a consolidation branch. It carries
merge commits for #695, #696, #697, #698, #699, #694 and #692, plus Wave 5 via
`hermes/wave5-totals-tiebreak`. Verified by containment, not by reading its
description:

```
for b in <today's ten branches>; do git merge-base --is-ancestor origin/$b origin/hermes/night-2026-09-04; done
  IN      claude/fix-nflverse-spread-sign          (#695 keystone)
  IN      claude/replay-sport-parameter            (#696)
  IN      claude/retract-70-target                 (#697)
  IN      claude/replay-discrimination             (#698)
  IN      claude/baee-prior-art                    (#699)
  IN      claude/fix-soccer-threeway-moneyline     (#694)
  IN      claude/fix-espn-settlement-date-boundary (#692)
  IN      hermes/wave5-totals-tiebreak             (no PR — contained here)
  MISSING claude/hotfix-incomplete-grace-exploit   (#691)
  MISSING claude/swallowed-error-sweep             (#664)
  MISSING hermes/land-audit-wave                   (#693)
  MISSING claude/launch-handoff-merge-g01115       (#690)
```

`hermes/wave5-totals-tiebreak` has no PR of its own (confirmed by a direct head
query, not by scanning a list). It needs none — #700 contains it. Opening one
would be duplicate noise.

## Order, and why

File-level overlap across the four, computed with `comm -12` on
`git diff --name-only origin/main...<branch>`:

| | #700 | #664 | #691 | #693 |
|---|---|---|---|---|
| **#700** (37 files) | — | none | none | none |
| **#664** (22 files) | none | — | 1 file | 16 files |
| **#691** (3 files) | none | 1 file | — | 3 files |
| **#693** (130 files) | none | 16 files | 3 files | — |

**#700 is disjoint from all three.** It can merge first with zero conflict risk.

1. **#700 — `hermes/night-2026-09-04`.** Draft. 19/19 checks green, run
   `33892558020` completed 16:12 today, including `All guardrails` and
   `Test, type-check, lint, Prisma`. 37 files, +3889/−41. Merge first.
2. **#664 — `claude/swallowed-error-sweep`.** Already **non-draft**; 20/20 green
   (run `33832773913`), cubic and Devin reviews both completed. 22 files,
   +2679/−65 with 7 new test files. Touches the Stripe webhook,
   `api-entitlement.ts`, `entitlements.ts`, `auth.ts`, `tier-access.ts` — the
   money and paywall path. This is the largest production-behaviour diff in the
   train and the one most worth a human read.
3. **#691 — `claude/hotfix-incomplete-grace-exploit`.** Draft, green. 3 files.
   Collides with #664 on exactly one file,
   `apps/web/app/api/webhooks/stripe/route.ts`. Merge after #664 and resolve that
   one file; do not merge it before #664, which would push the conflict onto the
   larger diff.
4. **#690 — `claude/launch-handoff-merge-g01115`.** Draft, docs + the Chaos
   runner. No production code. Merge whenever.

**#693 — `hermes/land-audit-wave` is NOT in the train.** 130 files, and it is not
a superset of #664 or #691 — it is an independent re-implementation over the same
surface:

```
git merge-base --is-ancestor origin/claude/swallowed-error-sweep origin/hermes/land-audit-wave -> NO
git merge-base --is-ancestor origin/claude/hotfix-incomplete-grace-exploit origin/hermes/land-audit-wave -> NO
diff <(#693's stripe/route.ts) <(#664's stripe/route.ts) -> 118 differing lines
```

Two branches rewriting the Stripe webhook 118 lines apart is a merge hazard, not a
merge. #693 needs its own session after the train lands, re-based on the result,
with the overlapping 16 files reconciled deliberately.

## Correction

Earlier in this session I stated `claude/swallowed-error-sweep` had no pull
request and tried to open one. **#664 already existed, open and non-draft.** The
listing I checked was paginated and #664 fell between the two pages I fetched. A
direct `head:` query is the reliable check; a sorted page scan is not.

## What merging means

Merge to `main` auto-deploys to Vercel production, against live Stripe keys
(live since 2026-07-09). The train is four merges to production, not a staging
promotion. That is the founder's call, not an agent's — the CI evidence above
says the code is green, not that today is the day to ship it.

Note what #700 does and does not change: the spread-sign keystone (#695) fixes
`scripts/backfill/historical-settlement-backfill.ts` and
`packages/prediction-engine/src/historical-replay.ts` — the offline replay and
backfill paths. It corrects a **measurement**, not live pick generation. #664 and
#691 are the two that change production behaviour.

## Still open after the train

- **6.5–9.5 calibration leaf drift** (65.86% → 57.12%, n=576). Hermes flagged it
  in H-N6 as having no follow-up row and left it unclaimed. Still ownerless.
- **#693**, per above.
- **CLV remains unmeasured.** Entry line equals the close by construction in the
  replay, so every pick grades `MATCHED_CLOSE`. Fixing this needs a real
  opening-line archive, which is what Chaos run C6 is hunting
  (`scripts/ops/chaos/c6-clv-archive.txt`).
- The **43 stale PRs** from July/August (#258 … #607) are untriaged and not part
  of this train.
