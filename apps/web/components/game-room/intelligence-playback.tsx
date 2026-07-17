"use client";

import { useEffect, useState } from "react";
import type { GameRoomPlayback } from "@/lib/game-room/types";
import type { IntelligenceEvent } from "@/lib/intelligence-playback";

const PLAYBACK_INTERVAL_MS = 2500;

export function IntelligencePlayback({ playback }: { readonly playback: GameRoomPlayback }): JSX.Element {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const lastIndex = Math.max(0, playback.events.length - 1);
  const event = playback.events[Math.min(index, lastIndex)];
  const delta = playback.deltas[Math.min(index, lastIndex)];

  useEffect(() => {
    function navigate(keyboardEvent: KeyboardEvent): void {
      if (keyboardEvent.key !== "ArrowLeft" && keyboardEvent.key !== "ArrowRight") return;
      keyboardEvent.preventDefault();
      setPlaying(false);
      setIndex((current) =>
        keyboardEvent.key === "ArrowRight"
          ? Math.min(current + 1, lastIndex)
          : Math.max(current - 1, 0),
      );
    }

    window.addEventListener("keydown", navigate);
    return () => window.removeEventListener("keydown", navigate);
  }, [lastIndex]);

  useEffect(() => {
    if (!playing || index >= lastIndex) return undefined;
    const timer = window.setTimeout(() => {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      if (nextIndex >= lastIndex) setPlaying(false);
    }, PLAYBACK_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [index, lastIndex, playing]);

  if (!event) {
    return (
      <section className="border border-titanium bg-carbon/45 p-5">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300">Intelligence Playback</h2>
        <p className="mt-4 text-sm text-ion-3">No governed intelligence events were captured for this game.</p>
      </section>
    );
  }

  function move(nextIndex: number): void {
    setPlaying(false);
    setIndex(Math.max(0, Math.min(nextIndex, lastIndex)));
  }

  function togglePlayback(): void {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (index >= lastIndex) setIndex(0);
    setPlaying(true);
  }

  return (
    <section className="border border-titanium bg-carbon/45 p-5" aria-labelledby="intelligence-playback-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-3">Governed event stream</p>
          <h2 id="intelligence-playback-title" className="mt-2 text-xl font-bold text-white">Intelligence Playback</h2>
        </div>
        <div className="text-right">
          <p aria-live="polite" aria-atomic="true" className="font-mono text-sm font-bold text-cyan-200">{event.state}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-ion-3">
            {playback.publication.status} · {playback.digest.slice(0, 10)}
          </p>
        </div>
      </div>

      <ol className="mt-5 grid gap-2 sm:grid-cols-4 lg:grid-cols-8" aria-label="Intelligence lifecycle">
        {playback.events.map((item, eventIndex) => (
          <li key={item.id}>
            <button
              type="button"
              aria-current={eventIndex === index ? "step" : undefined}
              onClick={() => move(eventIndex)}
              className={`w-full border px-2 py-2 text-left font-mono text-[10px] uppercase tracking-[0.1em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                eventIndex === index
                  ? "border-cyan-400 bg-cyan-400/10 text-cyan-100"
                  : "border-titanium bg-obsidian/55 text-ion-3 hover:border-cyan-500/40"
              }`}
            >
              {eventIndex + 1}. {item.state}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-4 grid gap-3 sm:grid-cols-[auto_auto_auto_auto_1fr] sm:items-center">
        <Control label="Previous event" disabled={index === 0} onClick={() => move(index - 1)}>Previous</Control>
        <Control label={playing ? "Pause playback" : "Play playback"} onClick={togglePlayback}>
          {playing ? "Pause" : "Play"}
        </Control>
        <Control label="Stop playback" onClick={() => move(0)}>Stop</Control>
        <Control label="Next event" disabled={index === lastIndex} onClick={() => move(index + 1)}>Next</Control>
        <input
          aria-label="Playback time"
          type="range"
          min={0}
          max={lastIndex}
          step={1}
          value={index}
          onChange={(changeEvent) => move(Number(changeEvent.currentTarget.value))}
          className="w-full accent-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="border border-titanium bg-obsidian/55 p-4">
          <h3 className="font-mono text-xs uppercase tracking-[0.16em] text-cyan-200">What changed?</h3>
          {delta && <p className="mt-3 text-sm leading-6 text-cyan-100">{delta.summary}</p>}
          <p className="mt-3 text-base font-semibold leading-7 text-white">{event.publicRepresentation}</p>
          <p className="mt-3 text-sm leading-6 text-ion-2">{event.uncertainty}</p>
          {event.disagreement && <p className="mt-2 text-sm leading-6 text-amber-200">{event.disagreement}</p>}
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <Datum label="Source tier" value={displayKnownState(event.sourceTier)} />
            <Datum label="Rights" value={displayKnownState(event.rights)} />
            <Datum label="Health / freshness" value={`${event.health} / ${event.freshness}`} />
            <Datum label="Contradiction" value={event.contradiction} />
            <Datum label="Market" value={marketLabel(event)} />
            <Datum label="Decision boundary" value={boundaryLabel(event)} />
          </dl>
        </div>

        <div className="grid gap-4">
          <EvidenceList title="Supporting evidence" ids={event.supportingEvidenceIds} />
          <EvidenceList title="Weakening evidence" ids={event.weakeningEvidenceIds} />
          <div className="border border-titanium bg-obsidian/55 p-4">
            <h3 className="font-mono text-xs uppercase tracking-[0.16em] text-cyan-200">Reversal condition</h3>
            <p className="mt-3 text-sm leading-6 text-ion-2">{event.reversalCondition}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 border border-titanium bg-obsidian/55 p-4">
        <h3 className="font-mono text-xs uppercase tracking-[0.16em] text-cyan-200">Why did the decision change?</h3>
        <p className="mt-3 text-sm leading-6 text-ion-2">{playback.changeCertificate.answer}</p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ion-3">
          {playback.changeCertificate.status} · observed transitions only · {playback.changeCertificate.citations.length} event citations
        </p>
      </div>

      <div className="mt-5 border border-titanium bg-obsidian/55 p-4">
        <h3 className="font-mono text-xs uppercase tracking-[0.16em] text-cyan-200">Share-safe summary</h3>
        <p className="mt-3 text-sm leading-6 text-ion-2">
          {event.state}: {event.publicRepresentation} Evidence sources: {event.sourceIds.length}.
        </p>
      </div>

      <section className="mt-5" aria-labelledby="accessible-transcript-title">
        <h3 id="accessible-transcript-title" className="font-mono text-xs uppercase tracking-[0.16em] text-cyan-200">
          Accessible transcript
        </h3>
        <ol className="mt-3 grid gap-2">
          {playback.events.map((item, eventIndex) => (
            <li key={item.id} className="border-l-2 border-titanium pl-3 text-sm leading-6 text-ion-2">
              Step {eventIndex + 1} · {item.state}: {playback.deltas[eventIndex]?.summary ?? item.accessibleText}
            </li>
          ))}
        </ol>
      </section>

      <div
        className="mt-5 overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        role="region"
        aria-label="Scrollable intelligence event data"
        tabIndex={0}
      >
        <table aria-label="Intelligence event data" className="w-full min-w-[42rem] border-collapse text-left text-xs">
          <thead className="font-mono uppercase tracking-[0.12em] text-ion-3">
            <tr><th scope="col" className="border-b border-titanium p-2">Step</th><th scope="col" className="border-b border-titanium p-2">State</th><th scope="col" className="border-b border-titanium p-2">Effective time</th><th scope="col" className="border-b border-titanium p-2">Accessible event</th></tr>
          </thead>
          <tbody className="text-ion-2">
            {playback.events.map((item, eventIndex) => (
              <tr key={item.id}>
                <td className="border-b border-titanium p-2">{eventIndex + 1}</td>
                <td className="border-b border-titanium p-2">State: {item.state}</td>
                <td className="border-b border-titanium p-2">{formatTime(item.effectiveTime ?? item.eventTime)}</td>
                <td className="border-b border-titanium p-2">{item.accessibleText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Control({ label, disabled = false, onClick, children }: { readonly label: string; readonly disabled?: boolean; readonly onClick: () => void; readonly children: string }): JSX.Element {
  return <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="border border-titanium bg-obsidian px-3 py-2 text-xs font-semibold text-ion-1 hover:border-cyan-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-40">{children}</button>;
}

function Datum({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return <div><dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ion-3">{label}</dt><dd className="mt-1 break-words text-sm text-ion-1">{value}</dd></div>;
}

function EvidenceList({ title, ids }: { readonly title: string; readonly ids: readonly string[] }): JSX.Element {
  return <div className="border border-titanium bg-obsidian/55 p-4"><h3 className="font-mono text-xs uppercase tracking-[0.16em] text-cyan-200">{title}</h3>{ids.length === 0 ? <p className="mt-3 text-sm text-ion-3">Not captured for this step.</p> : <ul className="mt-3 space-y-1 text-sm text-ion-2">{ids.map((id) => <li key={id} className="break-all">{id}</li>)}</ul>}</div>;
}

function marketLabel(event: IntelligenceEvent): string {
  const point = event.market.offeredPoint === null ? "point unknown" : `point ${event.market.offeredPoint}`;
  const price = event.market.offeredPrice === null ? "price unknown" : `price ${event.market.offeredPrice}`;
  return `${event.market.kind} · ${point} · ${price} · ${event.market.bookCoverage ?? 0} books`;
}

function boundaryLabel(event: IntelligenceEvent): string {
  const { metric, observedValue, threshold, crossed } = event.decisionBoundary;
  return `${metric}: ${observedValue ?? "unknown"} / ${threshold ?? "unknown"} · ${crossed === null ? "not determined" : crossed ? "crossed" : "not crossed"}`;
}

function formatTime(value: string): string {
  return value.slice(0, 16).replace("T", " ") + " UTC";
}

function displayKnownState(value: string): string {
  return value === "UNKNOWN" ? "Not known" : value;
}
