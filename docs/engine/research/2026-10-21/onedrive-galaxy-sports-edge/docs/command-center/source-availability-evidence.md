# Real App Source Map

As of: 2026-06-09

## Selected Real App Repo

- App repo path: C:\Users\Garrett\Sports
- Git root: C:/Users/Garrett/Sports
- Branch: safety/sports-wip-2026-06-04
- Remote: https://github.com/BeeXly/Sports.git
- HEAD observed: f897fd5 wip(sports): safety commit - cockpit/journal updates + brand/emails/social packages
- Dirty state observed: 62 entries
- Package manager: npm through npm.cmd on Windows PowerShell
- Node observed: v24.15.0
- Root package: sports-prediction-platform
- Web package: @sports/web

## Why This Clone Was Selected

This clone has the real Next.js app tree, root and web package manifests, scripts, tests, Prisma schema, CI workflows, and local node_modules. Other plausible clones were found, but this one was selected as the active app clone for evidence because it is the known primary shipping clone and contains the runnable app.

## Other Candidate Clones Found

- C:\Users\Garrett\Sports-deploy-fix - clean branch claude/gse-moat-aplus-clv-2026-06-03, same remote, likely deploy-fix clone.
- C:\Users\Garrett\Sports_release_codex - release/codex style clone, not selected.
- C:\Users\Garrett\Sports-canonical-2026-06-03 - larger dirty clone, not selected.

## Key Source Directories

- apps/web/app - Next App Router routes; 127 files observed.
- apps/web/components - UI components; 24 files observed.
- apps/web/lib - app libraries; 102 files observed.
- apps/web/public - public assets; 4 files observed.
- apps/web/styles - styles present.
- apps/web/__tests__ - web tests; 156 files observed.
- scripts - release/probe/guard scripts; 20 files observed.
- packages/db/prisma - Prisma schema/seed/migrations; 9 files observed.
- .github/workflows - CI workflows; 4 files observed.

## Source Availability Status

Verified against real app: repo path, branch, remote, package scripts, route tree, build/test commands, major public route responses, screenshots, auth/promotion/methodology source areas.

Blocked: live production environment, valid local database credentials, live Stripe checkout, production Vercel/hosting settings, real app rendered roster/player surfaces.
