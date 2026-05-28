import Link from "next/link";

export const dynamic = "force-dynamic";

export default function CockpitBriefStub() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-white">Daily brief</h1>
      <p className="text-sm text-gray-400">
        This page is part of the launch path but its body is being rebuilt
        after a truncation incident. The compose pipeline lives at{" "}
        <code className="rounded bg-gray-900/80 px-1 py-0.5 text-xs text-gray-300">
          apps/web/lib/brief/compose.ts
        </code>{" "}
        and the API at{" "}
        <code className="rounded bg-gray-900/80 px-1 py-0.5 text-xs text-gray-300">
          /api/cockpit/brief
        </code>
        .
      </p>
      <Link
        href="/cockpit"
        className="w-fit rounded-lg border border-mineral px-3 py-2 text-xs text-gray-300 hover:bg-gray-900/60"
      >
        ← Back to Jarvis
      </Link>
    </div>
  );
}
