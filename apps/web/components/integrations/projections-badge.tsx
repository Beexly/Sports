/**
 * ProjectionsBadge — an honest, server-checked status of the projections source.
 *
 * Live only when a licensed provider is registered AND enabled by env; otherwise
 * it states plainly that the data is illustrative, and links to the full
 * integrations transparency page. Server component.
 *
 * TWO CLAIMS, NOT ONE (C-173). "The projections SOURCE is live" and "the players
 * on this page are real" are different facts, and this badge used to publish the
 * first while a page rendered the second as false. Five fantasy surfaces -
 * waivers, league-twin, trade, studio, scheme - render the FICTIONAL pool from
 * lib/fantasy/players.ts, whose own doctrine comment says "Player NAMES are
 * fictional so no estimate is mistaken for a real one", and every one of them
 * shows this badge.
 *
 * TODAY THAT IS LATENT, AND SAYING SO MATTERS: `getLiveProjectionsMeta().live`
 * is false because the licensed provider is founder-gated, so the badge already
 * reads "illustrative" everywhere. It becomes a live false claim on the day the
 * provider is enabled - a config change, with nothing in the code to catch it.
 *
 * So `pool` is REQUIRED and there is no default. A caller must assert that the
 * players it renders are real before this can say "live"; anything else fails
 * closed to "illustrative", which is the safe direction under this product's
 * premise.
 */

import Link from "next/link";
import { getLiveProjectionsMeta } from "@/lib/integrations/projections";

/**
 * What the surface renders.
 *
 *   "real"         - the caller asserts its own player rows are real players.
 *   "illustrative" - the fictional pool in lib/fantasy/players. Never live.
 *   "none"         - the page renders no player rows at all (a marketing or
 *                    status surface), so the badge reports the SOURCE status
 *                    and nothing about a pool.
 *
 * Three states rather than two because collapsing "none" into either one lies:
 * calling it illustrative understates a working provider, and calling it real
 * asserts players the page does not have.
 */
export type ProjectionsPool = "real" | "illustrative" | "none";

/** Relative "refreshed Xm/Xh/Xd ago" from an ISO timestamp. Null when absent/invalid. */
function freshnessLabel(fetchedAt?: string): string | null {
  if (!fetchedAt) return null;
  const ms = Date.now() - new Date(fetchedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `refreshed ${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `refreshed ${hrs}h ago`;
  return `refreshed ${Math.round(hrs / 24)}d ago`;
}

export function ProjectionsBadge({ pool }: { pool: ProjectionsPool }) {
  const meta = getLiveProjectionsMeta();
  // A live SOURCE over a fictional POOL is still not live data.
  const live = meta.live && pool !== "illustrative";
  const fresh = live ? freshnessLabel(meta.fetchedAt) : null;
  // Live = orbital cyan (data signal). Not live = caution (incomplete data) —
  // semantic tokens only; never plasma for a degraded/absent state.
  const tone = live
    ? { box: "border-orbital-cyan/25 bg-orbital-cyan/5", dot: "bg-orbital-cyan", text: "text-orbital-cyan" }
    : { box: "border-caution/25 bg-caution/5", dot: "bg-caution", text: "text-caution" };
  return (
    <div className={`inline-flex flex-wrap items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] ${tone.box}`}>
      <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      <span className={tone.text}>{live ? "Projections: live" : "Projections: illustrative"}</span>
      {live ? (
        <span className="text-ion-2">
          {fresh ? `· ${fresh}` : ""}
          {meta.attribution ? ` · ${meta.attribution}` : " · licensed source wired"}
        </span>
      ) : (
        <span className="text-ion-2">
          {pool === "illustrative"
            ? "· illustrative player pool"
            : "· a licensed source is founder-gated"}
        </span>
      )}
      <Link href="/integrations" className="text-ultraviolet underline underline-offset-2 hover:text-ultraviolet-glow">Data status →</Link>
    </div>
  );
}
