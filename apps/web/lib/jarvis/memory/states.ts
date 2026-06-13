/**
 * Memory state machine for Jarvis episodic memory.
 *
 * States and allowed transitions per the spec:
 *   candidate → confirmed | rejected | expired
 *   confirmed → superseded | stale | conflicted | expired
 *   repeated_pattern → superseded | stale | expired
 *   conflicted → confirmed | rejected | expired (owner resolves)
 *   stale → confirmed | expired | rejected
 *   superseded → (terminal — chains via supersedes_memory_id)
 *   rejected → (terminal)
 *   expired → (terminal)
 */

export type MemoryState =
  | "candidate"
  | "confirmed"
  | "repeated_pattern"
  | "conflicted"
  | "stale"
  | "superseded"
  | "rejected"
  | "expired";

/** Terminal states — no further transitions allowed */
const TERMINAL_STATES = new Set<MemoryState>(["rejected", "expired", "superseded"]);

/** Allowed transitions: from → set of valid to-states */
export const ALLOWED_TRANSITIONS: ReadonlyMap<MemoryState, ReadonlySet<MemoryState>> = new Map([
  ["candidate",        new Set<MemoryState>(["confirmed", "rejected", "expired"])],
  ["confirmed",        new Set<MemoryState>(["superseded", "stale", "conflicted", "expired"])],
  ["repeated_pattern", new Set<MemoryState>(["superseded", "stale", "expired"])],
  ["conflicted",       new Set<MemoryState>(["confirmed", "rejected", "expired"])],
  ["stale",            new Set<MemoryState>(["confirmed", "expired", "rejected"])],
  ["superseded",       new Set<MemoryState>()],  // terminal
  ["rejected",         new Set<MemoryState>()],  // terminal
  ["expired",          new Set<MemoryState>()],  // terminal
]);

/** Returns true if the transition from → to is allowed by the state machine. */
export function canTransition(from: MemoryState, to: MemoryState): boolean {
  if (TERMINAL_STATES.has(from)) return false;
  const allowed = ALLOWED_TRANSITIONS.get(from);
  if (!allowed) return false;
  return allowed.has(to);
}

/** Returns true if a state is terminal (no further transitions). */
export function isTerminalState(state: MemoryState): boolean {
  return TERMINAL_STATES.has(state);
}

/** All valid memory states as a const array — used for spec pinning tests. */
export const ALL_MEMORY_STATES: readonly MemoryState[] = [
  "candidate",
  "confirmed",
  "repeated_pattern",
  "conflicted",
  "stale",
  "superseded",
  "rejected",
  "expired",
];
