# GSE Data API — Roadmap (contract, not yet a public API)

**Status:** design contract only. **No public API exists today.** This document defines the *shape* of
the endpoints GSE would expose once the engines are production-graded, so the grammar is fixed before a
single route is shipped. Everything here is fixture-backed and read-only by design. No endpoint settles
events, prices markets, or triggers action.

## Principle

GSE does not ship a "scores API". GSE ships a **meaning API**: every response is a governed object that
already carries its source, rights, time/knowability, authority ceiling, and public expression. A
consumer never receives a bare fact — it receives a fact *with its envelope*, so it can never
accidentally over-trust it. The API is the Meaning Compiler, exposed.

## Cross-cutting contract (every endpoint)

- **Read-only.** No write, no settle, no price, no execution. Ever.
- **Envelope-complete.** Each object includes `sourceLineage`, `rights`, `time`, `authority`,
  `publicExpression`, and `explain`. An object missing any organ is not returned.
- **Authority-capped.** Responses state the authority ceiling. On fixture/shadow data the ceiling binds
  at `INFO_ONLY`. Promotion to a higher ceiling requires the named engine's verified inputs.
- **Rights-aware.** Objects whose rights envelope forbids redistribution are returned as *references*
  (ids + attribution), not as re-publishable payloads.
- **Deterministic + versioned.** Every object carries a `model_version`; identical inputs yield
  identical output. Time is explicit (`knowableAt`), never the server's wall clock.
- **Auth + quota gated.** Owner-issued keys, per-key quotas, no anonymous bulk export.

## Proposed endpoints (v1 draft — illustrative)

| Endpoint | Returns | Authority ceiling | Notes |
|---|---|---|---|
| `GET /v1/claim-objects/{id}` | one compiled `ClaimObject` (7 organs + `explain`) | per object | the universal unit |
| `GET /v1/events/{id}/claim-objects` | every claim compiled for one event | per object | stats, trends, predictions, markets |
| `GET /v1/events/{id}/chronos` | the Chronos clock chain + lag family | observability only | `canImplyEdge:false` |
| `GET /v1/events/{id}/public-consensus` | public-consensus lag + visibility stats | `WATCH` | how late the public scoreboard is |
| `GET /v1/public-observer-records` | public DISPLAY-truth captures (one observer) | `WATCH` | never official truth |
| `GET /v1/entities/{id}/passport` | an `EntityPassport` (kgmid ladder + aliases) | identity only | `DISCOVERED`→`CANONICAL` |
| `GET /v1/entities/resolve?alias=&sport=` | alias → entity (context-required) | identity only | refuses ambiguous |
| `GET /v1/highlights/{id}/passport` | a rights-gated `HighlightPassport` | reference only | gates closed by default |
| `GET /v1/predictions/{id}/trial` | a `PredictionTrial` (process ≠ outcome) | per trial | no performance claim |
| `GET /v1/trends/{id}/passport` | a `TrendPassport` (fragility/overfit) | `WATCH` | falsifier required |
| `GET /v1/markets/{id}/bloom` | a `MarketBloomRecord` (9-stage lifecycle) | per stage | `suppressesAction` honored |
| `GET /v1/sources/{id}/dossier` | a `SourceDossier` (genome + rights + cost) | n/a | provenance, not a feed |
| `GET /v1/providers/classifications` | the Provider Trial Court verdicts | n/a | role-based, machine-checked |
| `GET /v1/lenses/{key}` | a Galileo lens projection over a corpus | n/a | read-only instrument view |

## Explicitly out of scope (will not be built into the API)

- No `POST /bet`, `/settle`, `/price`, `/execute` — GSE never operates or triggers betting.
- No raw re-publication of third-party media, article bodies, or proprietary predictions.
- No endpoint that scrapes Google or any source on request.
- No "public performance" or win-rate endpoint without a published, settled, calibration record.
- No anonymous bulk export of any provider's licensed payload.

## Sequencing (gates, not dates)

1. **Internal contract (now).** The objects exist as fixtures and compile through the Meaning Compiler.
   The API surface is defined; nothing is exposed.
2. **Shadow read (gate: engines production-graded).** Read-only endpoints over real, cross-checked data,
   capped at `INFO_ONLY`/`WATCH`, owner-key gated.
3. **Authority lift (gate: verified calibration per object class).** Per-object ceilings rise only when
   the named engine's inputs are verified and recorded — never globally, never by config.
4. **Partner access (gate: rights + legal review).** External keys, quotas, attribution propagation,
   per-source redistribution terms enforced at the envelope.

The contract is the commitment: an object can only ever mean what its envelope permits, and the API is
the smallest honest surface over that rule.
