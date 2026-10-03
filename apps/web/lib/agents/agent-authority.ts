export const AGENT_AUTHORITY_LEVELS = ["OBSERVE", "DRAFT", "ROUTE", "MANUAL_EXECUTION", "OWNER_ONLY"] as const;
export type AgentAuthorityLevel = (typeof AGENT_AUTHORITY_LEVELS)[number];
