/** Shared default-OFF env gate. Explicit true/1/yes/on only. */
export function envFlagEnabled(env: NodeJS.ProcessEnv, key: string): boolean {
  const v = (env[key] ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function envSecret(env: NodeJS.ProcessEnv, key: string): string | null {
  const v = (env[key] ?? "").trim();
  return v.length > 0 ? v : null;
}
