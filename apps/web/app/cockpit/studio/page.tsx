import Link from "next/link";
import { loadStudioDashboard } from "@/lib/studio/load";
import { StudioWorkspace } from "./studio-workspace";
import { studioWorkspaceProps } from "./studio-props";

export const dynamic = "force-dynamic";

export default async function CockpitStudioPage({
  searchParams,
}: {
  searchParams?: { gameId?: string };
}): Promise<JSX.Element> {
  const data = await loadStudioDashboard(searchParams?.gameId);
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-caution">
              Galaxy Studio
            </p>
            <h1 className="mt-1 text-2xl font-bold text-ion-white">Creator Asset Workspace</h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-titanium/40 px-3 py-1.5 text-xs text-ion-1 hover:bg-carbon/60"
          >
            Back to Jarvis
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-ion-2">
          Build cited, scanner-checked creator drafts from one Game Intelligence Room.
          Exports stay manual by design; there is no external posting action in Studio.
        </p>
      </header>

      <StudioWorkspace {...studioWorkspaceProps(data)} />
    </div>
  );
}
