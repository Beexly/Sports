// Legitimate near-miss for the relative-resolution rule: a module genuinely
// named messages.ts in a NON-claude-api directory. The test feeds this fixture
// with a simulated path (apps/web/lib/notifications/index.ts), so "./messages"
// resolves OUTSIDE the transport module and must stay clean.
import * as messages from "./messages";
export * from "./messages";
export const all = messages;
