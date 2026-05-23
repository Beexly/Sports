export function isFeatureEnabled(name: string): boolean {
  return process.env[name] === "1" || process.env[name] === "true";
}

export const proofSurfaceEmailCaptureEnabled = () =>
  isFeatureEnabled("PROOF_SURFACE_EMAIL_CAPTURE_ENABLED");

export const contextualVaultCtaEnabled = () =>
  isFeatureEnabled("CONTEXTUAL_VAULT_CTA_ENABLED");
