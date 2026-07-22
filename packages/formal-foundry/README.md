# GSE Formal Foundry

Proof-gated IC3 / Apalache control plane for Galaxy Sports Edge.

## Modules

| File | Role |
|------|------|
| `src/types.ts` | Shared types + ApalacheRpcError |
| `src/itf.ts` | ITF encode/decode (#bigint, sets, maps, states, traces) |
| `src/apalache-client.ts` | JSON-RPC client for Apalache explorer server |
| `src/cti-lifting.ts` | CTI lift + MIC minimization |
| `src/ic3-controller.ts` | Relative inductiveness, admitCti, frontier |
| `src/safety-ledger.ts` | Audit trail for proof-gated changes |
| `src/velocity-dashboard.ts` | Safe iteration metrics |
| `src/inductive-profile.ts` | Locked linear-only tuning profile |
| `src/index.ts` | Public API + `initializeFoundry` |

## Stance

- Stay linear. Leave all nonlinear / Gröbner / NLSat params at defaults.
- Fail-closed on unknown / timeout / transport error.
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

Requires Apalache explorer server on `http://localhost:8822/rpc` (or pass `baseUrl`).
