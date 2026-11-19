# 03: CAGE ENFORCE Publication Gate, Neon SealedSlatePacket & Live Storefront Surfaces

**What to build:** Add deterministic `enforceSlatePublication` (`ENFORCE` mode) in `@sports/governed`, define `SealedSlatePacket` schema + SQL migration blueprint + `sealed-slate-store.ts`, rewire `/props` and `/packages/[slug]` off stale `week8/sealed-board.json`, unlock `SNF`/`MNF` games on Sunday+MNF packs, index `/fantasy/dfs`, fix `%` -> `" out of 100"` mangling, and purge leaked gate strings / `343.0 p90` display bugs.

**Blocked by:** 02-storefront-security-and-entitlements

**Status:** implemented-awaiting-shell-verify

- [ ] `enforceSlatePublication` refuses packets containing `PASS` items marked publishable, negative CLV plays, `%` confidence strings, single-sided props, leaked jargon, or `< 94%` named volume attribution.
- [ ] `/packages/[slug]` and `/props` never display Week 8 `"do not buy today"` or `"Props withheld"` on an active seeded/sealed NFL slate.
- [ ] `sanitizePlainFootballText` preserves real football percentages (`33.4%`) while stripping internal math/pipeline jargon and keeping confidence strictly `XX/100`.
