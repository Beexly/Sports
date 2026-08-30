import { loadNflverseUsagePulse, type NflverseUsagePulse } from "@/lib/nflverse/usage-pulse";
import { DoorCard } from "./door-card";
/**
 * NflverseLabDoor — the "The Lab" door stat, loaded off the blocking
 * render path. Awaits the nflverse usage pulse (which fetches the full
 * archive) inside a <Suspense> boundary so the homepage shell streams
 * immediately while this component suspends.
 *
 * P16-01: the pulse must NOT be awaited in the page-level Promise.all.
 */
export async function NflverseLabDoor(): Promise<JSX.Element> {
  const pulse: NflverseUsagePulse = await loadNflverseUsagePulse();
  const nflRows = pulse.status === "live" ? pulse.sourceRows : 0;
  const nflUnavailable = pulse.status === "source-error";
  return (
    <DoorCard
      index={2}
      label="The Lab"
      decides="Who to trust this week, with every signal in one place."
      stat={
        nflUnavailable
          ? "Live player data unavailable"
          : nflRows > 0
            ? `${nflRows.toLocaleString()} live player rows`
            : "Intake warming up"
      }
      action="Open the lab"
      href="/players"
    />
  );
}

export function NflverseLabDoorPlaceholder(): JSX.Element {
  return (
    <DoorCard
      index={2}
      label="The Lab"
      decides="Who to trust this week, with every signal in one place."
      stat={"Intake warming up"}
      action="Open the lab"
      href="/players"
    />
  );
}
