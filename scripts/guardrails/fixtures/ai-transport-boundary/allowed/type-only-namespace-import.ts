// A type-only namespace import cannot issue a runtime transport call.
import type * as messages from "@/lib/claude-api/messages";
export type Transport = typeof messages;
