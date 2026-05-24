export function isFeatureEnabled(name: string): boolean {
  return process.env[name] === "1" || process.env[name] === "true";
}

export const proofSurfaceEmailCaptureEnabled = () =>
  isFeatureEnabled("PROOF_SURFACE_EMAIL_CAPTURE_ENABLED");

export const contextualVaultCtaEnabled = () =>
  isFeatureEnabled("CONTEXTUAL_VAULT_CTA_ENABLED");

export const publicPicksEnabled = () =>
  isFeatureEnabled("PUBLIC_PICKS_ENABLED");

export const publicBlogEnabled = () => isFeatureEnabled("PUBLIC_BLOG_ENABLED");

export const performanceStatsEnabled = () =>
  isFeatureEnabled("PERFORMANCE_STATS_ENABLED");

export const canonicalHistoryEnabled = () =>
  isFeatureEnabled("CANONICAL_HISTORY_ENABLED");
