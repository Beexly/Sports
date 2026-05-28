import Link from "next/link";
import { loadStudioDashboard } from "@/lib/studio/load";
import { StudioWorkspace, studioWorkspaceProps } from "./studio-workspace";

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
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Galaxy Studio
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Creator Asset Workspace</h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-mineral px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-900/60"
          >
            Back to Jarvis
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-gray-400">
          Build cited, scanner-checked creator drafts from one Game Intelligence Room.
          Exports stay manual by design; there is no external posting action in Studio.
        </p>
      </header>

      <StudioWorkspace {...studioWorkspaceProps(data)} />
    </div>
  );
}
