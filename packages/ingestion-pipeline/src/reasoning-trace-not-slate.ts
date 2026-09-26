import type { ReasoningTrace } from "./reasoning-trace.js";
import type { SignalSlateOptions } from "./signal-slate-options.js";

type WouldAssign = ReasoningTrace extends SignalSlateOptions ? true : false;

/** False means a trace cannot be passed where the slate expects its options. */
export const traceAssignsToSlate: WouldAssign = false;
