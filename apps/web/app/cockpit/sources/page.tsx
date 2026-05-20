import Link from "next/link";
export const dynamic = "force-dynamic";
export default function CockpitSourcesStub() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-white">Sources</h1>
      <p className="text-sm text-gray-400">
        Source-intelligence ledger is being rebuilt. The SourceCoverageReport
        model now exists in the schema; the page that lists rows is queued for
        rewrite.
      </p>
      <Link href="/cockpit" className="w-fit rounded-lg border border-gray-800 px-3 py-2 text-xs text-gray-300 hover:bg-gray-900/60">
        ← Back to Jarvis
      </Link>
    </div>
  );
}
