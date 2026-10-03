// Direct barrel case: a non-allowlisted file re-exporting a provider client
// symbol through a short RELATIVE specifier. The test feeds this fixture with a
// simulated repo path inside apps/web/lib/claude-api/ so "./providers/bedrock"
// resolves into the provider module.
export { callBedrockMessages } from "./providers/bedrock";
