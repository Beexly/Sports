/**
 * GlobalCommandPalette — server wrapper that supplies surface items
 * to the client palette. Mounted once from the root layout.
 */

import { SURFACES } from "@/lib/galaxy/kernel/surfaces";
import { isFeatureEnabled } from "@/lib/release/feature-flags";
import { CommandPalette, type CommandPaletteItem } from "./CommandPalette";

export function GlobalCommandPalette(): JSX.Element {
  const enabled = isFeatureEnabled("COMMAND_PALETTE_ENABLED");
  if (!enabled) return <></>;

  const items: ReadonlyArray<CommandPaletteItem> = SURFACES.filter(
    (s) => s.status === "live" && s.tier !== "operator",
  ).map((s) => ({
    id: s.id,
    label: s.label,
    path: s.path,
    category: s.kind,
    summary: s.summary,
  }));

  return <CommandPalette items={items} />;
}
