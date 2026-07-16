import Link from "next/link";
import type { SelectedGamePlaybackResult } from "@/lib/cockpit/load-selected-game-playback";

type PageHeadingRenderer = (label: string) => JSX.Element;

class SelectedGamePlaybackVariantError extends Error {
  readonly variant: never;

  constructor(variant: never) {
    super("Unexpected selected-game playback variant");
    this.name = "SelectedGamePlaybackVariantError";
    this.variant = variant;
  }
}

function assertNever(variant: never): never {
  throw new SelectedGamePlaybackVariantError(variant);
}

function UnavailablePlayback({
  renderPageHeading,
  result,
}: {
  readonly renderPageHeading: PageHeadingRenderer;
  readonly result: Extract<SelectedGamePlaybackResult, { readonly status: "UNAVAILABLE" }>;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link href="/cockpit/market-twin" className="w-fit text-sm font-semibold text-orbital-cyan hover:text-ion-white">
          ← Market Twin
        </Link>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300">
          {result.reason.replaceAll("_", " ")}
        </p>
        {renderPageHeading("Playback unavailable")}
        <p className="max-w-2xl text-sm leading-6 text-ion-2">{result.message}</p>
      </header>

      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5" aria-labelledby="unavailable-boundary">
        <h2 id="unavailable-boundary" className="text-sm font-semibold text-ion-white">Evidence boundary</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-wide text-ion-3">Selected game</dt>
            <dd className="mt-1 break-all text-ion-1">{result.gameId}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-wide text-ion-3">Matchup</dt>
            <dd className="mt-1 text-ion-1">{result.matchup ?? "Not available"}</dd>
          </div>
        </dl>
        {result.reasonCodes.length > 0 && (
          <div className="mt-4">
            <p className="font-mono text-[10px] uppercase tracking-wide text-ion-3">Gate reason codes</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {result.reasonCodes.map((reasonCode) => (
                <li key={reasonCode} className="rounded border border-amber-500/30 px-2 py-1 font-mono text-xs text-amber-200">
                  {reasonCode}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function AvailablePlayback({
  renderPageHeading,
  result,
}: {
  readonly renderPageHeading: PageHeadingRenderer;
  readonly result: Extract<SelectedGamePlaybackResult, { readonly status: "AVAILABLE" }>;
}): JSX.Element {
  const { twin, brain } = result.bundle;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link href="/cockpit/market-twin" className="w-fit text-sm font-semibold text-orbital-cyan hover:text-ion-white">
          ← Market Twin
        </Link>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300">
          Governed event stream · operator only
        </p>
        {renderPageHeading(result.matchup)}
        <p className="max-w-3xl text-sm leading-6 text-ion-2">
          Twin and Brain are projections of one persisted Game Room envelope. This surface stores no parallel truth and exposes no raw model output.
        </p>
      </header>

      <section className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5" aria-labelledby="selected-game-twin">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wide text-ion-3">Twin read model</p>
            <h2 id="selected-game-twin" className="mt-1 text-lg font-semibold text-ion-white">Selected-game Twin</h2>
          </div>
          <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono text-xs text-emerald-200">
            {twin.currentState}
          </span>
        </div>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Selected game" value={twin.selectedGameId} />
          <Metric label="Recorded events" value={String(twin.eventIds.length)} />
          <Metric label="Contradictions" value={String(twin.contradictionEventIds.length)} />
          <Metric label="Boundary crossing" value={twin.boundaryCrossingEventId ?? "Not captured"} />
        </dl>
        <div className="mt-5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-ion-3">Envelope digest</p>
          <code className="mt-2 block break-all rounded border border-titanium/40 bg-obsidian/70 p-3 text-xs text-ion-2">
            {twin.envelopeDigest}
          </code>
        </div>
        <ol className="mt-5 space-y-2" aria-label="Twin event timeline">
          {twin.deltas.map((delta) => (
            <li key={delta.eventId} className="rounded border border-titanium/30 bg-obsidian/40 px-3 py-2 text-sm leading-6 text-ion-2">
              <span className="mr-2 font-mono text-xs text-orbital-cyan">{delta.eventId}</span>
              {delta.summary}
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-orbital-cyan/30 bg-orbital-cyan/5 p-5" aria-labelledby="deterministic-brain-answer">
        <p className="font-mono text-[10px] uppercase tracking-wide text-ion-3">Decision-change certificate</p>
        <h2 id="deterministic-brain-answer" className="mt-1 text-lg font-semibold text-ion-white">Deterministic Brain answer</h2>
        <p className="mt-4 text-sm leading-7 text-ion-1">{brain.answer}</p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <Metric label="Answer status" value={brain.status} />
          <Metric label="Causal scope" value="Observed transitions only" />
        </dl>
        <div className="mt-5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-ion-3">Citations</p>
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Brain answer citations">
            {brain.citations.map((citation) => (
              <li key={citation} className="rounded border border-orbital-cyan/30 px-2 py-1 font-mono text-xs text-cyan-200">
                {citation}
              </li>
            ))}
          </ul>
        </div>
        {brain.missingData.length > 0 && (
          <p className="mt-5 text-xs leading-5 text-amber-200">
            Missing stored fields: {brain.missingData.join(", ")}.
          </p>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wide text-ion-3">{label}</dt>
      <dd className="mt-1 break-words text-ion-1">{value}</dd>
    </div>
  );
}

export function SelectedGamePlayback({
  renderPageHeading = (label) => <h1 className="text-2xl font-bold text-ion-white">{label}</h1>,
  result,
}: {
  readonly renderPageHeading?: PageHeadingRenderer;
  readonly result: SelectedGamePlaybackResult;
}): JSX.Element {
  switch (result.status) {
    case "AVAILABLE":
      return <AvailablePlayback renderPageHeading={renderPageHeading} result={result} />;
    case "UNAVAILABLE":
      return <UnavailablePlayback renderPageHeading={renderPageHeading} result={result} />;
    default:
      return assertNever(result);
  }
}
