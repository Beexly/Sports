// The barrel itself would be flagged in a real tree; this fixture proves the
// ACCESS is also caught when a namespace from some other module surfaces the
// raw transport symbol (aliased local const).
import * as aiBarrel from "../some-ai-barrel";
const send = aiBarrel.callClaudeMessages;
export const run = () => send;
