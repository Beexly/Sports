import type { Metadata } from "next";
import Link from "next/link";
import {
  formatEdgeIndex,
  loadEdgeIndexEmbed,
} from "@/lib/embed/edge-index";
import { MODEL_VERSION } from "@sports/prediction-engine";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { gameId: string };
}): Promise<Metadata> {
  const data = await loadEdgeIndexEmbed(params.gameId);
  const title = data.honestEmpty
    ? "Galaxy Edge Index"
    : `Edge Index ${formatEdgeIndex(data.edgeIndex)} · ${data.matchup}`;
  return {
    title,
    description: "Free public Galaxy Sports Edge Index badge.",
    robots: { index: true, follow: true },
  };
}

/**
 * FREE public Edge Index badge — iframe-safe distribution.
 * No confidence. No factor trail. Honest empty when bootstrap/missing.
 */
export default async function EdgeIndexEmbedPage({
  params,
}: {
  params: { gameId: string };
}): Promise<JSX.Element> {
  const data = await loadEdgeIndexEmbed(params.gameId);
  const display = data.honestEmpty ? "—" : formatEdgeIndex(data.edgeIndex);

  return (
    <main
      data-testid="edge-index-embed"
      data-honest-empty={data.honestEmpty ? "1" : "0"}
      className="flex min-h-[120px] items-stretch justify-center p-2"
    >
      <div className="flex w-full max-w-[320px] flex-col justify-between rounded-xl border border-mineral bg-eclipse px-4 py-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-orbital-cyan">
              Galaxy Edge
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-ion-white" title={data.matchup}>
              {data.matchup}
            </p>
            {data.sport ? (
              <p className="mt-0.5 text-[11px] text-ion-2">{data.sport}</p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p
              className="font-mono text-2xl font-black tabular-nums tracking-tight text-ion-white"
              data-testid="edge-index-value"
            >
              {display}
            </p>
            <p className="font-mono text-[10px] text-ion-2">{data.modelVersion || MODEL_VERSION}</p>
          </div>
        </div>
        {data.honestEmpty && data.emptyReason ? (
          <p className="mt-2 text-[11px] leading-snug text-ion-2" data-testid="edge-index-empty-reason">
            {data.emptyReason}
          </p>
        ) : null}
        <div className="mt-3 flex items-center justify-between border-t border-mineral/80 pt-2">
          <Link
            href={data.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-orbital-cyan hover:text-ion-white"
          >
            galaxysportsedge.com
          </Link>
          <span className="font-mono text-[9px] uppercase tracking-wide text-ion-3">Free</span>
        </div>
      </div>
    </main>
  );
}
