# BLOCKED_NEED_G.md — Questions for Human Operator

## Q1 (Security / Vitest CVE)
**Is `vitest --ui` ever run in a shared or network-accessible dev environment?**

Context: vitest <=4.1.0-beta.6 has a critical CVE (arbitrary file read/execute via the UI server). The CI pipeline is safe (uses `vitest run`). But if any developer runs `vitest --ui` on a machine accessible to others on the network, the risk is real. Yes/No — if yes, upgrade to vitest@^3 is urgent.

## Q2 (Major Version Upgrade Sprint)
**Is there a planned sprint to upgrade Next.js 14→15, Prisma 5→6, Vitest 2→3?**

Context: three active deprecations/CVEs (images.domains, Prisma.validator, vitest UI CVE) all resolve in one coordinated major-version bump. Batching avoids three separate upgrade PRs. Yes/No — if yes, scope the upgrade batch.

## Q3 (CSP Nonce Hardening)
**Is nonce-based CSP (removing `unsafe-inline` from script-src) on the roadmap?**

Context: the current CSP uses `unsafe-inline` for scripts because Next.js 14 App Router requires it without nonce middleware. Next.js 15 supports experimental nonce propagation. Once on 15, this can be tightened to eliminate the main XSS vector. Yes/No — if yes, wire into the major-version sprint.
