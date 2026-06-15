import type { LineSnapshot } from "./line-snapshot";
export function computeClvCandidate(open: LineSnapshot | null, close: LineSnapshot | null, resultKnown: boolean) { if (!open || !close || !resultKnown) return { status: "BLOCKED" as const, clv: null, reason: "closing-line-and-result-required" }; return { status: "READY" as const, clv: close.line - open.line, reason: "ready" }; }
