import { SelectedGamePlayback } from "@/components/cockpit/selected-game-playback";
import { requireCockpitAdmin } from "@/lib/cockpit/require-admin";
import { loadSelectedGamePlayback } from "@/lib/cockpit/load-selected-game-playback";

export const dynamic = "force-dynamic";

export default async function CockpitSelectedGamePlaybackPage({
  params,
}: {
  readonly params: { readonly gameId: string };
}): Promise<JSX.Element> {
  await requireCockpitAdmin();
  const result = await loadSelectedGamePlayback(params.gameId);
  return (
    <SelectedGamePlayback
      renderPageHeading={(label) => <h1 className="text-2xl font-bold text-ion-white">{label}</h1>}
      result={result}
    />
  );
}
