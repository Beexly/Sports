// Named re-export of the error class (NOT the transport symbol) from the
// transport module stays legal — the boundary keys on callClaudeMessages.
export { ClaudeMessagesError } from "@/lib/claude-api/messages";
