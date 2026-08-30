// A default import of an unrelated module that happens to be named messages.ts
// is not the transport module.
import messages from "@/lib/notifications/messages";
export const t = messages;
