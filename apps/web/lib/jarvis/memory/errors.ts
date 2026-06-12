/**
 * Typed errors for the Jarvis memory store.
 */

export class MemoryStoreUnavailableError extends Error {
  readonly code = "MEMORY_STORE_UNAVAILABLE" as const;

  constructor(cause?: unknown) {
    super(
      "Jarvis memory store is unavailable. " +
        (cause instanceof Error ? cause.message : String(cause ?? "No database connection."))
    );
    this.name = "MemoryStoreUnavailableError";
    if (cause instanceof Error && cause.stack) {
      this.stack = this.stack + "\nCaused by: " + cause.stack;
    }
  }
}

export class MemoryTransitionError extends Error {
  readonly code = "MEMORY_TRANSITION_INVALID" as const;

  constructor(from: string, to: string) {
    super(`Invalid memory state transition: ${from} → ${to}`);
    this.name = "MemoryTransitionError";
  }
}

export class MemoryGuardError extends Error {
  readonly code = "MEMORY_GUARD_VIOLATION" as const;

  constructor(message: string) {
    super(message);
    this.name = "MemoryGuardError";
  }
}
