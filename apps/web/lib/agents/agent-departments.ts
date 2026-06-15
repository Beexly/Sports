export const AGENT_DEPARTMENTS = [
  "Command & Governance",
  "Sports Intelligence",
  "Data & Automation Platform",
  "Customer Surface & Quality",
  "Growth, Community & Finance",
  "Results & Calibration",
] as const;
export type AgentDepartment = (typeof AGENT_DEPARTMENTS)[number];
