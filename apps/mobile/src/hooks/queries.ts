import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import type {
  ApiResult,
  BoardState,
  BriefPayload,
  CalibrationPayload,
  PerformancePayload,
  PublicPick,
} from "../api/contracts";
import {
  boardState,
  brief,
  calibration,
  dailySlate,
  performance,
  picks,
  type EndpointContext,
  type PicksQuery,
} from "../api/endpoints";
import { useGseClient } from "../api/context";
import { useSession } from "../state/session";
import { applyBoardSafety } from "../lib/trust";

/**
 * Query hooks — one per surface.
 *
 * Every hook returns the `ApiResult` union rather than throwing, because this
 * app's error states are not exceptions: a gate, a rate limit and a stale slate
 * are all normal outcomes with their own copy, and a `throw` collapses them into
 * one generic message. `useQuery`'s error channel is therefore reserved for
 * genuine exceptions, of which there are none by construction.
 *
 * The token is read here and passed into the endpoint context on each call, so
 * a sign-in upgrades the very next fetch without rebuilding the client.
 */

function useEndpointContext(): EndpointContext {
  const client = useGseClient();
  const token = useSession((s) => s.token);
  return useMemo(() => ({ client, token }), [client, token]);
}

/** Query keys declared once, so invalidation cannot miss a surface. */
export const queryKeys = {
  board: ["board", "state"] as const,
  picks: (q: PicksQuery) =>
    ["picks", q.sport ?? "all", q.date ?? "today", q.grade ?? "all"] as const,
  slate: (q: { sport?: string; date?: string }) =>
    ["slate", q.sport ?? "all", q.date ?? "today"] as const,
  calibration: ["calibration"] as const,
  performance: ["performance"] as const,
  brief: ["brief"] as const,
};

export function useBoard(): UseQueryResult<ApiResult<BoardState>, never> {
  const ctx = useEndpointContext();
  return useQuery({
    queryKey: queryKeys.board,
    queryFn: () => boardState(ctx) as Promise<ApiResult<BoardState>>,
    // Matches FRESHNESS_BUDGET_MS.board, so an in-memory hit and an on-disk hit
    // expire on the same schedule. Two clocks for one payload is how a screen
    // ends up showing a board it just declared stale.
    staleTime: 60_000,
  });
}

export function usePicks(query: PicksQuery = {}): UseQueryResult<ApiResult<PublicPick[]>, never> {
  const ctx = useEndpointContext();
  return useQuery({
    queryKey: queryKeys.picks(query),
    queryFn: () => picks(ctx, query) as Promise<ApiResult<PublicPick[]>>,
    staleTime: 120_000,
  });
}

export function useSlate(
  query: { sport?: string; date?: string } = {},
): UseQueryResult<ApiResult<PublicPick[]>, never> {
  const ctx = useEndpointContext();
  return useQuery({
    queryKey: queryKeys.slate(query),
    queryFn: () => dailySlate(ctx, query) as Promise<ApiResult<PublicPick[]>>,
    staleTime: 120_000,
  });
}

export function useCalibration(): UseQueryResult<ApiResult<CalibrationPayload>, never> {
  const ctx = useEndpointContext();
  return useQuery({
    queryKey: queryKeys.calibration,
    queryFn: () => calibration(ctx) as Promise<ApiResult<CalibrationPayload>>,
    staleTime: 6 * 60 * 60 * 1000,
  });
}

export function usePerformance(): UseQueryResult<ApiResult<PerformancePayload>, never> {
  const ctx = useEndpointContext();
  return useQuery({
    queryKey: queryKeys.performance,
    queryFn: () => performance(ctx) as Promise<ApiResult<PerformancePayload>>,
    staleTime: 6 * 60 * 60 * 1000,
  });
}

export function useBrief(): UseQueryResult<ApiResult<BriefPayload>, never> {
  const ctx = useEndpointContext();
  return useQuery({
    queryKey: queryKeys.brief,
    queryFn: () => brief(ctx) as Promise<ApiResult<BriefPayload>>,
    staleTime: 3 * 60 * 60 * 1000,
  });
}

/** A stable retry callback, so screens never touch React Query's types. */
export function useRetry(query: { refetch: () => unknown }): () => void {
  return useCallback(() => {
    void query.refetch();
  }, [query]);
}

/* ══════════════════════════════════════════════════════════════════════════
   SAFE PICK SET
   ══════════════════════════════════════════════════════════════════════════ */

export interface SafePicks {
  result: UseQueryResult<ApiResult<PublicPick[]>, never>;
  rows: PublicPick[];
  suppressed: { adverse: number; stale: number; emptied: boolean };
}

/**
 * The board-safety unwrap.
 *
 * `applyBoardSafety` runs HERE rather than in each screen, so no screen can
 * render a set it forgot to filter. This is the same reasoning as the server's
 * own note about importing `pricesWorseThanMarket` rather than restating it:
 * one predicate, one place, or a drift publishes a bet the engine said no to.
 *
 * The suppression report travels with the rows so a screen can distinguish
 * "nothing published today" from "everything we published was withheld" — two
 * different sentences to a customer, and only one of them is about the market.
 */
export function useSafePicks(query: PicksQuery = {}): SafePicks {
  const result = usePicks(query);
  const data = result.data;

  return useMemo(() => {
    if (!data || !data.ok) {
      return { result, rows: [], suppressed: { adverse: 0, stale: 0, emptied: false } };
    }
    const report = applyBoardSafety(data.data);
    return {
      result,
      rows: report.rows,
      suppressed: {
        adverse: report.suppressedAdverse,
        stale: report.suppressedStale,
        emptied: report.emptiedBoard,
      },
    };
  }, [data, result]);
}