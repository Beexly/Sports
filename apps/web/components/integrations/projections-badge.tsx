/**
 * ProjectionsBadge — an honest, server-checked status of the projections source.
 *
 * Live only when a licensed provider is registered AND enabled by env; otherwise
 * it states plainly that the data is illustrative. Server component.
 */

import { isLiveProjections } from "@/lib/integrations/projections";
import { BRAND_COLORS } from "@/lib/brand";

export function ProjectionsBadge() {
  const live = isLiveProjections();
  const hex = live ? BRAND_COLORS.orbitalCyan : "#E0A800";
  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-full border px-3 py-1.5 text-[11px]" style={{ borderColor: `${hex}44`, background: `${hex}0c` }}>
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: hex }} />
      <span style={{ color: hex }}>{live ? "Projections: live" : "Projections: illustrative"}</span>
      <span className="text-ink-500">{live ? "— licensed source wired" : "— a licensed source is founder-gated"}</span>
    </div>
  );
}
