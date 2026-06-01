"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { BoardStateData, BoardStateRow } from "@/lib/board/state";
import { rowIdSet, pickNewIds, formatAgo } from "@/lib/board/live-board-helpers";

/**
 * LiveBoard — the "engine in the open" surface.
 *
 * The model's verdict stream, live: what it's SCORING now, what it PUBLISHED,
 * and what it PASSED (gated) — with the reason attached. Server renders the
 * first frame (SEO + instant paint + no-JS fallback); this client layer then
 * polls /api/board/state and animates verdicts as they arrive.
 *
 * Motion is information, not decoration — and every animation is gated behind
 * `motion-safe:` so reduced-motion visitors get the same data, calmly.
 */

const DEFAULT_POLL_MS = 15_000;

interface ApiResponse {
  success: boolean;
  data: BoardStateData;
  meta: { isSampleData: boolean };
}

// ── Component ─────────────────────────────────────────────────────────────

interface LiveBoardProps {
  initialData: BoardStateData;
  initialIsSample: boolean;
  pollMs?: number;
}

export function LiveBoard({
  initialData,
  initialIsSample,
  pollMs = DEFAULT_POLL_MS,
}: LiveBoardProps): JSX.Element {
  const [data, setData] = useState<BoardStateData>(initialData);
  const [isSample, setIsSample] = useState<boolean>(initialIsSample);
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(() => Date.now());
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState<boolean>(true);

  const knownIds = useRef<Set<string>>(rowIdSet(initialData));

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/board/state", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ApiResponse;
      if (!json?.data) throw new Error("malformed payload");

      const arrived = pickNewIds(knownIds.current, json.data);
      knownIds.current = rowIdSet(json.data);

      setData(json.data);
      setIsSample(json.meta?.isSampleData ?? false);
      setLastSyncedAt(Date.now());
      setConnected(true);
      if (arrived.length > 0) {
        setNewIds(new Set(arrived));
        // Clear the "just arrived" highlight after the entrance settles.
        window.setTimeout(() => setNewIds(new Set()), 2_400);
      }
    } catch {
      // Keep the last good frame; just flag that we're temporarily stale.
      setConnected(false);
    }
  }, []);

  // Poll on an interval, but only while the tab is visible — and refresh
  // immediately when the visitor returns to the tab.
  useEffect(() => {
    let timer: number | undefined;
    const start = () => {
      window.clearInterval(timer);
      timer = window.setInterval(() => {
        if (document.visibilityState === "visible") void refresh();
      }, pollMs);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    start();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, pollMs]);

  // 1s freshness ticker.
  useEffect(() => {
    const id = window.setInterval(
      () => setSecondsAgo(Math.floor((Date.now() - lastSyncedAt) / 1000)),
      1_000
    );
    return () => window.clearInterval(id);
  }, [lastSyncedAt]);

  return (
    <>
      {/* Live status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-titanium/70 bg-carbon/60 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {isSample ? (
              <span className="h-2.5 w-2.5 rounded-full bg-ultraviolet" />
            ) : (
              <>
                <span
                  className={`absolute inline-flex h-full w-full rounded-full bg-orbital-cyan/70 ${
                    connected ? "motion-safe:animate-live-pulse" : ""
                  }`}
                  aria-hidden="true"
                />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orbital-cyan" />
              </>
            )}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-orbital-cyan">
            {isSample ? "Preview feed" : connected ? "Live" : "Reconnecting"}
          </span>
          <span className="font-mono text-[11px] text-mineral-hi">
            · synced {formatAgo(secondsAgo)}
          </span>
        </div>
        <span className="font-mono text-[11px] text-mineral-hi">
          model {data.modelVersion}
        </span>
      </div>

      {/* Board stat tiles */}
      <section
        aria-label="Board state"
        className="grid gap-px sm:grid-cols-2 lg:grid-cols-6"
      >
        <StateTile label="Sports watched" value={String(data.sportsWatched)} accent />
        <StateTile label="Books polled" value={String(data.booksPolled)} accent />
        <StateTile label="Published" value={String(data.openPicks)} />
        <StateTile label="Passed" value={String(data.gatedToday)} />
        <StateTile label="Scoring" value={String(data.scoringNow.length)} />
        <StateTile label="Synced" value={formatAgo(secondsAgo)} />
      </section>

      {/* The three lanes — the verdict stream */}
      <section className="grid gap-4 lg:grid-cols-3">
        <BoardLane
          title="Scoring now"
          accent="scoring"
          rows={data.scoringNow}
          newIds={newIds}
          empty="No games are scoring this moment."
        />
        <BoardLane
          title="Published today"
          accent="published"
          rows={data.publishedToday}
          newIds={newIds}
          empty="Nothing has cleared the gate yet today."
        />
        <BoardLane
          title="Passed today"
          accent="gated"
          rows={data.gatedTodayRows}
          newIds={newIds}
          empty="No passes logged for this slate yet."
        />
      </section>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StateTile({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}): JSX.Element {
  return (
    <div className="min-h-16 border border-titanium/70 bg-carbon/60 px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mineral-hi">
        {label}
      </p>
      <p
        className={`mt-1 break-words text-lg font-semibold tabular-nums ${
          accent ? "text-orbital-cyan" : "text-ion"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

type LaneAccent = "scoring" | "published" | "gated";

const LANE_STYLES: Record<
  LaneAccent,
  { title: string; rail: string; shimmer: boolean }
> = {
  scoring: {
    title: "text-orbital-cyan",
    rail: "before:bg-orbital-cyan/70",
    shimmer: true,
  },
  published: {
    title: "text-plasma",
    rail: "before:bg-plasma/70",
    shimmer: false,
  },
  gated: {
    title: "text-mineral-hi",
    rail: "before:bg-mineral-hi/50",
    shimmer: false,
  },
};

function BoardLane({
  title,
  accent,
  rows,
  newIds,
  empty,
}: {
  title: string;
  accent: LaneAccent;
  rows: BoardStateRow[];
  newIds: Set<string>;
  empty: string;
}): JSX.Element {
  const s = LANE_STYLES[accent];
  return (
    <section
      className={`relative overflow-hidden border border-titanium/70 bg-carbon/45 p-4 before:absolute before:inset-x-0 before:top-0 before:h-px before:content-[''] ${s.rail}`}
    >
      <div className="flex items-center justify-between">
        <h2
          className={`font-mono text-[10px] uppercase tracking-[0.2em] ${s.title}`}
        >
          {title}
        </h2>
        <span className="font-mono text-[10px] tabular-nums text-mineral-hi">
          {rows.length}
        </span>
      </div>
      {/* Scoring lane gets a faint scan shimmer — the model "thinking". */}
      {s.shimmer && rows.length > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orbital-cyan/60 to-transparent bg-[length:200%_100%] motion-safe:animate-shimmer"
        />
      )}
      <div className="mt-4 flex flex-col gap-3">
        {rows.length > 0 ? (
          rows.map((row) => (
            <BoardRowItem key={row.id} row={row} isNew={newIds.has(row.id)} accent={accent} />
          ))
        ) : (
          <p className="text-sm text-mineral-hi">{empty}</p>
        )}
      </div>
    </section>
  );
}

function BoardRowItem({
  row,
  isNew,
  accent,
}: {
  row: BoardStateRow;
  isNew: boolean;
  accent: LaneAccent;
}): JSX.Element {
  return (
    <article
      className={`border border-titanium/60 bg-void/55 p-4 transition-shadow ${
        isNew ? "motion-safe:animate-fade-up ring-1 ring-orbital-cyan/40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-ion">{row.matchup}</h3>
          <p className="mt-1 text-xs text-mineral-hi">
            {row.sport} / {row.market}
          </p>
        </div>
        <EdgeChip edgeIndex={row.edgeIndex} accent={accent} />
      </div>
      {row.gateReason && (
        <p className="mt-3 text-sm text-ion-1">{row.gateReason}</p>
      )}
      <Link
        href={`/room/${row.gameId}`}
        className="mt-4 inline-flex text-sm font-semibold text-orbital-cyan hover:text-ion"
      >
        Open room →
      </Link>
    </article>
  );
}

function EdgeChip({
  edgeIndex,
  accent,
}: {
  edgeIndex: number | null;
  accent: LaneAccent;
}): JSX.Element {
  const tone =
    accent === "published"
      ? "border-plasma/40 text-plasma"
      : "border-orbital-cyan/40 text-orbital-cyan";
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[11px] tabular-nums ${
        edgeIndex === null ? "border-titanium text-mineral-hi" : tone
      }`}
      aria-label={edgeIndex === null ? "Edge Index not available" : `Edge Index ${edgeIndex}`}
    >
      {edgeIndex === null ? "EI —" : `EI ${edgeIndex}`}
    </span>
  );
}
