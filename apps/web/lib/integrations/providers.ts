/**
 * External provider registry — the single source of truth for what's wired vs.
 * founder-gated.
 *
 * Every live integration (projections, image moderation, league OAuth, the Nova
 * avatar/TTS vendor, odds data) is enabled ONLY by an environment variable a
 * human sets. This module reads that config and reports status; it never
 * activates anything. The product degrades gracefully to illustrative data until
 * a key is present. Pure (env-injectable), so it's fully testable.
 */

export type ProviderCategory = "projections" | "image-safety" | "league-oauth" | "avatar-tts" | "odds" | "pickem";

export type ProviderStatus = {
  readonly key: string;
  readonly name: string;
  readonly category: ProviderCategory;
  readonly envVar: string;
  readonly configured: boolean;
  readonly unlocks: string;
  readonly note: string;
};

type Env = Record<string, string | undefined>;

type ProviderDef = Omit<ProviderStatus, "configured">;

const PROVIDERS: readonly ProviderDef[] = [
  { key: "projections", name: "Player projections", category: "projections", envVar: "PROJECTIONS_PROVIDER", unlocks: "Live lineup/waiver/trade/DFS recommendations on real players", note: "A licensed projections feed. Until set, all fantasy tools use the illustrative pool." },
  { key: "image-safety", name: "NSFW image classifier", category: "image-safety", envVar: "NSFW_CLASSIFIER_URL", unlocks: "Automated image/video moderation for any media surface", note: "An open_nsfw / nsfwjs-class model. Until set, media fails closed to human review." },
  { key: "league-espn", name: "ESPN league OAuth", category: "league-oauth", envVar: "ESPN_OAUTH_CLIENT_ID", unlocks: "Read-only ESPN roster sync", note: "ESPN requires OAuth. Sleeper (public) already works without this." },
  { key: "league-yahoo", name: "Yahoo league OAuth", category: "league-oauth", envVar: "YAHOO_OAUTH_CLIENT_ID", unlocks: "Read-only Yahoo roster sync", note: "Yahoo OAuth app credentials." },
  { key: "avatar-tts", name: "Nova avatar / TTS vendor", category: "avatar-tts", envVar: "AVATAR_TTS_VENDOR", unlocks: "Licensed avatar + voice rendering for Galaxy Studios", note: "A consented/licensed virtual-presenter vendor. Until set, Nova is a stylized brand mark only." },
  { key: "odds", name: "Live odds feed", category: "odds", envVar: "THE_ODDS_API_KEY", unlocks: "Real lines and closing-line value on the public board", note: "The Odds API key (already part of the platform's data layer)." },
  { key: "pickem-lines", name: "Pick'em lines feed", category: "pickem", envVar: "PICKEM_LINES_PROVIDER", unlocks: "Live Underdog / DK Pick6 / PrizePicks line ingestion for the Pick'em Edge", note: "A licensed pick'em-lines feed (obtained under agreement, never scraped). Until set, the Pick'em Edge runs on illustrative lines." },
];

/** Status of every external provider, given an environment. */
export function providerStatuses(env: Env = process.env): ProviderStatus[] {
  return PROVIDERS.map((p) => ({ ...p, configured: Boolean(env[p.envVar] && String(env[p.envVar]).trim().length > 0) }));
}

/** Is a single provider configured? */
export function isConfigured(key: string, env: Env = process.env): boolean {
  return providerStatuses(env).find((p) => p.key === key)?.configured ?? false;
}

/** Summary counts for a readiness banner. */
export function readinessSummary(env: Env = process.env): { configured: number; total: number; gated: string[] } {
  const all = providerStatuses(env);
  return {
    configured: all.filter((p) => p.configured).length,
    total: all.length,
    gated: all.filter((p) => !p.configured).map((p) => p.name),
  };
}
