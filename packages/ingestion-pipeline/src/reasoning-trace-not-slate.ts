import type { ReasoningTrace } from "./reasoning-trace.js";
import type { SignalSlateOptions, SlateAcceptedTrace } from "./signal-slate-options.js";

type WouldAssign = ReasoningTrace extends SignalSlateOptions ? true : false;
type Withheld = Omit<ReasoningTrace, "conclusion"> & { readonly conclusion: "WITHHELD" };
type WithheldFits = Withheld extends SlateAcceptedTrace ? true : false;
type InsufficientFits = (Omit<ReasoningTrace, "conclusion"> & { readonly conclusion: "INSUFFICIENT" }) extends SlateAcceptedTrace ? true : false;

/** False means a trace cannot be passed where the slate expects its options. */
export const traceAssignsToSlate: WouldAssign = false;
/** False means a withheld trace cannot be the slate's required trace. */
export const withheldAssignsToSlate: WithheldFits = false;
/** False means an empty trace cannot open the slate either. */
export const insufficientAssignsToSlate: InsufficientFits = false;
