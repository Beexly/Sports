# One-Person Finish-Line Plan

Date: 2026-06-09

## Operator Verdict

Ship the deploy clone narrow first. Do not port the larger canonical platform into the deploy clone before first launch.

Reason: the deploy clone has been hardened into a verifiable, degraded-safe picks/board product. The larger canonical platform may be real IP, but merging it now would turn a finite launch gate into a broad platform integration project.

## The First-Principles Launch Rule

Launch is blocked only by things that can make the product:

1. crash for a normal visitor,
2. expose secrets or founder-only methodology,
3. make unsupported current-roster/player claims,
4. fail production readiness because DB or ingestion dependencies are missing,
5. create legal/compliance/payment risk.

Everything else is post-launch.

## Current State

Green or effectively closed:

- Public route crash behavior is repaired in local production mode.
- Board and promotions degrade instead of throwing public 500s.
- Health/readiness semantics are split.
- Build and test gates have passed in the command-center evidence.
- Method/secret-leakage gate was added as an isolated test.
- Voice OS, affiliate/promotions, contests, and broader R&D are correctly parked as post-P0 lanes.

Still blocking:

- `/api/ready` fails because production-like DB and ingestion dependencies are not available.
- Player Lab/current-roster public scope must either be proven from verified current ingestion or removed from launch copy/scope.
- The dirty tree must be staged deliberately; no broad `git add .`.
- Owner must choose deploy clone as the first launch source of truth.

## Recommended Decision

For fastest credible launch:

1. Freeze launch scope to the deploy clone.
2. Keep Player Lab/current-roster language out of public launch unless current-roster ingestion is proven.
3. Provision production-like DB and ingestion env.
4. Rerun the production probe.
5. If `/api/ready` and ingestion freshness turn 200, stage only the reviewed P0 subset.
6. Deploy.
7. Treat the canonical platform as Launch 2, not Launch 1.

## What Not To Do Now

- Do not merge the canonical platform into this dirty deploy tree before first launch.
- Do not activate Stripe live, affiliate links, contest prizes, or ElevenLabs keys as part of this launch.
- Do not add more R&D docs to the launch blocker list.
- Do not publicize Player Lab/current roster if the current-data path is not verified.
- Do not deploy from a dirty tree without a reviewed staging subset.

## Owner-Only Decisions

The owner must decide or provide:

1. The deploy clone is the first launch source of truth.
2. Production-like DB and ingestion credentials/environment are ready.
3. Player Lab/current-roster scope is either verified or cut from launch.
4. Stage/commit/deploy authority.
5. Legal/payment/promo/voice activation remains off until separate approval.

## Codex/Claude Next Job

Once the owner confirms the deploy clone path:

1. rerun the final cert,
2. rerun `node scripts/prod-probe.mjs` against the target environment,
3. produce a P0-only staging manifest,
4. verify no docs/R&D/post-P0 files are staged,
5. prepare the commit/PR/deploy handoff.

## Launch 2 Parking Lot

After Launch 1:

- Port the canonical platform deliberately.
- Add Player Lab with verified current-roster truth.
- Add Galaxy Studios help and transcript-first audio UX.
- Add promotions only through compliance review.
- Add EdgeBall/contests only through legal review.
- Turn research docs into one prioritized execution queue.

