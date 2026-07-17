# W002 — Worldline v0 (contract frozen 2026-07-17, before editing)

**Objective.** The replayable bitemporal world object the kernel names (WorldSnapshot /
WorldDelta): an append-only, pure, deterministic worldline library over
entity-attribute observations carrying two clocks (`occurredAt` valid time,
`observedAt` knowledge time), with as-of snapshot reads, semantic world diffs, a
replay-stability audit, and a canonical digest so any replay is provable. No
consumers, no persistence, no UI — the invariant before the spectacle (W003+ consume it).

**Invariant (the one that matters).** NO LOOKAHEAD: a snapshot read at knowledge
time K depends only on observations with `observedAt ≤ K`. Late-arriving facts
change knowledge-time views only from their own `observedAt` forward; retroactive
corrections are *visible as corrections* (bitemporal), never silent rewrites. The
store records every served read and `auditReplayStability()` fails loud (listing
the exact contaminating observations) if later ingestion would change any
previously served snapshot.

**Base SHA.** `79d31bf1` (pdcswh = main ∪ W000 ∪ W001).

**Files (all new, additive).**
`apps/web/lib/worldline/{types,store,delta,digest,index}.ts`,
`apps/web/__tests__/worldline.test.ts`. Reuses `canonicalJson` from
`lib/intelligence-playback` (one canonical truth path, no duplicate serializer).

**Forbidden.** `packages/db/**`, any prisma file, `apps/web/lib/proof/**`,
`packages/prediction-engine/src/proof-of-record.ts`, pricing/entitlements,
middleware, `.github/**`. Protected zones (data, proof) untouched — verified by
diff grep at receipt time.

**Acceptance.**
1. Bitemporal semantics: a late-observed fact about an earlier occurrence is
   invisible at knowledge times before its `observedAt` and visible after; a
   correction supersedes for later knowledge times while the original remains
   replayable at earlier ones.
2. Valid-time semantics: `validTime` selects the latest occurrence ≤ V per
   (entity, attribute).
3. Replay audit: ingesting an observation that back-dates knowledge under an
   already-served read makes `auditReplayStability()` throw with offenders named.
4. Delta: added / changed / removed between two coordinates, each entry
   attributed to its causing observation id(s).
5. Digest: identical observation sets yield identical snapshot digests
   regardless of ingestion order; any value change changes the digest.
6. Immutability: ingest copies; returned snapshots are frozen.

**Tests.** New suite (≥14 cases) + final gates once (affected suites, tsc,
eslint --max-warnings=0, guardrails). **Rollback.** Delete the new directory +
test file; nothing else references them.
