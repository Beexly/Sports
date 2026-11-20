# ADR 0011 — CAGE Pre-Publication Policy Enforcement & Unified Pack Entitlements

**Date:** 2026-11-15
**Status:** Accepted

## Context

Revenue audits showed two compounding production failures: one-time slate pack buyers resolved to `FREE` inside `getUserEntitlements()` because only recurring `Subscription` rows were checked, and unverified Whop token prefixes plus an unscoped global cookie created cross-pack authorization bypasses. Meanwhile, static Week 8 files (`sealed-board.json`) rendered "do not buy today" notices across live checkout pages while `@sports/governed` defaulted to `SHADOW` mode.

## Decision

1. **Deterministic Pre-Publication Policy (`CAGE` + `@sports/governed`):** Introduce `enforceSlatePublication` in `@sports/governed` running in explicit `ENFORCE` mode. Any candidate `SealedSlatePacket` with `PASS` items marked publishable, negative expected CLV plays, `%`-formatted confidence scores, single-sided props lacking two-way American odds, internal math jargon, or `< 94%` named volume attribution is deterministically refused with a signed Ed25519 receipt.
2. **Signed Per-Slug Unlock Cookies & Fail-Closed Whop Verification:** Remove unverified `whop_vip` / `mem_*` / `token_*` fallbacks and `gse_unlock_global` cross-pack cookies. Scope unlock cookies by HMAC-SHA256 over `(slug, sessionId, exp)` with timing-safe comparison.
3. **Unified Entitlements & Neon-Backed `SealedSlatePacket`:** Merge unexpired `PackagePurchase` (`RevenueEvent`) ledger records alongside `Subscription` inside `getUserEntitlements()` and store active cards in `SealedSlatePacket` (falling back safely to `SourceSnapshot` and live verified JSON until Prisma client regeneration runs).

## Consequences

- Buyers of one-time weekly or season packs immediately unlock `/picks`, `/board`, `/props`, `/fantasy/dfs`, and iOS mobile views without manual admin overrides.
- Live storefront checkout pages automatically display active sealed cards and never regress to stale `"do not buy today"` notices from past weeks.
