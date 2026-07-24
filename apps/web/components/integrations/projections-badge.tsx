/**
 * ProjectionsBadge — an honest, server-checked status of the projections source.
 *
 * Live only when a licensed provider is registered AND enabled by env; otherwise
 * it states plainly that the data is illustrative, and links to the full
 * integrations transparency page. Server component.
 */

import Link from "next/link";
import { getLiveProjectionsMeta } from "@/lib/integrations/projections";

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

export function ProjectionsBadge() {
  const meta = getLiveProjectionsMeta();
  const live = meta.live;
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
        <span className="text-ion-2">· a licensed source is founder-gated</span>
      )}
      <Link href="/integrations" className="text-ultraviolet underline underline-offset-2 hover:text-ultraviolet-glow">Data status →</Link>
    </div>
  );
}
