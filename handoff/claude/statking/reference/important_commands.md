# Important Commands

| Command | Latest result | StatKing-specific failure? | Exact known issues | Next action |
|---|---|---:|---|---|
| `npm run statking:all` | ✅ Passed | false | npm warns about unknown `http-proxy` env config only | Keep running after StatKing data changes |
| `npm run test:statking` | ✅ Passed: 3 files / 14 tests | false | none | Add tests for UX data contracts as Claude changes pages |
| `npm run typecheck --workspace=apps/web` | ⚠️ Failed | false | Pre-existing Prisma/generated type drift and implicit-any debt in cockpit/moderation/promotions/board/etc.; no StatKing paths in final errors | Regenerate/fix Prisma/client repo-wide in separate branch |
| `npm run dev --workspace=apps/web` | ✅ Passed startup; Ready in 6.1s | false | DATABASE_URL absent uses stub Prisma; observability no DSN | Open pages manually or via browser when environment supports screenshots |
| `git diff --check` | ✅ Passed | false | none | Run before final handoff/PR |
