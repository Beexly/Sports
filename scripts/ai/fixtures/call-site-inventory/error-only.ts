// Fixture: error-class-only import from the messages module. This import is
// NOT transport-reaching and must be recorded errorOnly with no call sites.
import { ClaudeMessagesError } from "@/lib/claude-api/messages";

export function isClaudeError(error: unknown): boolean {
  return error instanceof ClaudeMessagesError;
}
