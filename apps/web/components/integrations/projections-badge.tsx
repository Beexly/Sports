/**
 * ProjectionsBadge — an honest, server-checked status of the projections source.
 *
 * Live only when a licensed provider is registered AND enabled by env; otherwise
 * it states plainly that the data is illustrative, and links to the full
 * integrations transparency page. Server component.
 */

import Link from "next/link";
import { getLiveProjectionsMeta } from "@/lib/integrations/projections";
import { BRAND_COLORS } from "@/lib/brand";

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
  const hex = live ? BRAND_COLORS.orbitalCyan : "#E0A800";
  const fresh = live ? freshnessLabel(meta.fetchedAt) : null;
  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-full border px-3 py-1.5 text-[11px]" style={{ borderColor: `${hex}44`, background: `${hex}0c` }}>
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: hex }} />
      <span style={{ color: hex }}>{live ? "Projections: live" : "Projections: illustrative"}</span>
      {live ? (
        <span className="text-ink-500">
          {fresh ? `· ${fresh}` : ""}
          {meta.attribution ? ` · ${meta.attribution}` : " · licensed source wired"}
        </span>
      ) : (
        <span className="text-ink-500">· a licensed source is founder-gated</span>
      )}
      <Link href="/integrations" className="underline" style={{ color: BRAND_COLORS.softUltraviolet }}>Data status →</Link>
    </div>
  );
}
