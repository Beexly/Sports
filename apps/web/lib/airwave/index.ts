/**
 * Airwave Ledger — public barrel.
 *
 * Holds TV/radio/podcast pundits to a graded, timestamped record: the
 * broadcast-facing sibling of the engine's own Decision Autopsy. Capture is
 * inert and founder-gated by default (see ./pipeline and
 * docs/airwave-ledger.md); the only data exposed until the gate opens is the
 * clearly-illustrative demo ledger.
 */

export * from "./types";
export * from "./grade";
export * from "./redact";
export * from "./pipeline";
export * from "./control-plane";
export * from "./intake-readiness";
export {
  DEMO_PUNDITS,
  DEMO_CLAIMS,
  DEMO_GENERATED_LABEL,
} from "./demo-ledger";
