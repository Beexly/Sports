# GSE Formal Foundry

Dormant, **lab-only** proof-gated IC3 / Apalache control plane for Galaxy
Sports Edge. **Nothing here is wired into production**: no writes, no
alerts, no enforcement, no runtime flips. Additive only.

## Honesty statement (read this before trusting anything against a real server)

**No Apalache binary or JAR has ever been available in this environment,
and no real Apalache server has ever been reachable from it.** This repo's
own `formal/README.md` and `formal/INDUCTION_DOCTRINE.md` §8 (branch
`labs/constellation-wave3-inductive`) record why: Apalache's GitHub release
assets are egress-restricted here, and unlike TLC's `tla2tools.jar` (which
has a working non-GitHub mirror), no equivalent fallback for Apalache was
found. Consequently:

- `src/apalache-client.ts` has **never been run against a real Apalache
  server**. Its RPC method names and parameter shapes are this package's
  OWN reconstruction of a plausible JSON-RPC front end for Apalache's
  documented interactive/incremental checking concepts — not a
  transcription of a verified Apalache artifact.
- Every test in `src/tests/` runs against `src/mock/apalache-mock-server.ts`,
  a small Node `http` server this package builds and controls, backed by a
  tiny, honestly-computed (brute-force, not hard-coded per test) toy
  approval-workflow state machine. That proves this client's/controller's
  **request/response wiring and interpretation logic are internally
  consistent**. It proves **nothing** about wire-compatibility with a real
  Apalache release.
- This package is **protocol-complete and mock-tested**, pending a real,
  live Apalache session (and real project TLA+ modules fed through
  `loadSpec`) to verify against. Treat every RPC shape here as a documented
  proposal, not a confirmed contract.

## Modules

| File | Role |
|------|------|
| `src/types.ts` | Shared types + `ApalacheRpcError` hierarchy (transport/protocol/solver-unknown/timeout/session/malformed-ITF) |
| `src/itf.ts` | ITF encode/decode (#bigint, sets, maps, arrays, states, traces) |
| `src/apalache-client.ts` | JSON-RPC client for a (mock-tested, unverified-live) Apalache explorer server |
| `src/cti-lifting.ts` | CTI lift + MIC minimization (real oracle-driven generalization; safe no-op without an oracle) |
| `src/ic3-controller.ts` | Relative inductiveness, `admitCti`, frontier probe |
| `src/safety-ledger.ts` | Silent, in-memory audit trail for proof-gated changes |
| `src/velocity-dashboard.ts` | Silent, in-memory safe-iteration metrics |
| `src/inductive-profile.ts` | Locked linear-only tuning profile + real-invocation mapping notes |
| `src/index.ts` | Public API + `initializeFoundry` |
| `src/mock/apalache-mock-server.ts` | Test-only mock JSON-RPC server (NOT real Apalache) |

## Stance

- Stay linear. Leave all nonlinear / Gröbner / NLSat params at defaults —
  see `inductive-profile.ts`'s header for exactly why (closed research, not
  an oversight).
- Fail-closed on unknown / timeout / transport / malformed-ITF error —
  every such condition is a typed `ApalacheRpcError` subclass, thrown, never
  a silently-defaulted return value.
- Silent-launch + proof-gated. No speculative runtime flips.
- Additive only.

## Quick start

```ts
import { initializeFoundry } from "@gse/formal-foundry";

const { controller, ledger } = await initializeFoundry({
  sources: ["/* base64 TLA+ */"],
  invariants: ["TypeOK"],
  varTypes: { status: "Str" },
});

const ok = await controller.isRelativelyInductive(
  { status: "pending" },
  { status: "approved" },
  0
);
```

Requires a real Apalache explorer server on `http://localhost:8822/rpc` (or
pass `baseUrl`) — **not available/verified in this environment**; the
example above is illustrative of the intended call shape, exercised for
real only against the mock server in `src/tests/`.

## Running

```bash
npm run typecheck   # tsc --noEmit, strict, no `any`
npm test            # vitest — real assertions, mock-server-backed
```
