// Namespace import of the SANCTIONED dispatch module is legal, and accessing
// callClaude (not callClaudeMessages) through it is legal.
import * as dispatch from "@/lib/claude-api/provider-dispatch";
export const run = () => dispatch.callClaude;
