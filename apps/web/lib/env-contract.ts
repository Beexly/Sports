import contractData from "./env-contract.json";

export type EnvRequirement = {
  name: string;
  category: string;
  requiredFor:
    | "vault-launch"
    | "production-smoke"
    | "temporary-scaffold"
    | "optional";
  type: "boolean" | "email" | "enum" | "identifier" | "number" | "secret" | "url";
  example: string;
  purpose: string;
};

export type EnvReadinessItem = EnvRequirement & {
  present: boolean;
};

export type EnvReadinessReport = {
  ok: boolean;
  missing: EnvReadinessItem[];
  items: EnvReadinessItem[];
};

export const envContract = contractData as readonly EnvRequirement[];

export function listEnvRequirements(requiredFor?: EnvRequirement["requiredFor"]) {
  if (!requiredFor) {
    return envContract;
  }

  return envContract.filter((item) => item.requiredFor === requiredFor);
}

export function getEnvReadinessReport(
  env: Record<string, string | undefined> = process.env,
  requiredFor: EnvRequirement["requiredFor"] = "vault-launch",
): EnvReadinessReport {
  const items = listEnvRequirements(requiredFor).map((item) => ({
    ...item,
    present: Boolean(env[item.name]?.trim()),
  }));
  const missing = items.filter((item) => !item.present);

  return {
    ok: missing.length === 0,
    missing,
    items,
  };
}
