import * as React from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { useGseClient } from "../api/context";
import { watchlistFollow, watchlistUnfollow, watchlist } from "../api/endpoints";
import { AsyncStorageQueueStorage } from "../api/queue-storage";
import {
  OfflineQueue,
  classifyWriteResult,
  type QueuedWrite,
} from "../lib/offline-queue";
import { registerSignOutTask, useSession } from "../state/session";

/**
 * Queue-aware watchlist.
 *
 * This is the first (and, per the allowlist, the only) mutation in the app that
 * is applied optimistically, and the reasoning for why it qualifies is in
 * `lib/offline-queue.ts`: following a pick is a fact about the READER, and the
 * server records it rather than evaluating it.
 *
 * What this hook does that a fire-and-forget POST did not:
 *
 *   1. Records the intent BEFORE the request, so an offline tap is not lost.
 *   2. Shows the optimistic state immediately, and labels it as unsent rather
 *      than pretending it is confirmed.
 *   3. Drains on foreground, because that is when connectivity usually returns.
 *   4. Exposes `pending` and `parked` so the UI can say something did not go
 *      through rather than leaving the user to infer it.
 *   5. Clears the queue on sign-out, so a previous account's actions are not
 *      replayed as the next user's.
 *
 * Note what it does NOT do: it never writes to the query cache a value the
 * server has not confirmed. The optimistic state lives in the queue, and the
 * rendered list is derived from the server's data plus the pending intents. That
 * is what keeps "the server is authoritative on everything" true even while the
 * UI is showing something the server has not seen.
 */

let singleton: OfflineQueue | null = null;
let storage: AsyncStorageQueueStorage | null = null;

function queueFor(): { queue: OfflineQueue; storage: AsyncStorageQueueStorage } {
  if (!singleton || !storage) {
    storage = new AsyncStorageQueueStorage();
    singleton = new OfflineQueue(storage);
  }
  return { queue: singleton, storage };
}

export interface WatchlistState {
  /** Server-confirmed ids. */
  followed: string[];
  /** Ids with a queued follow the server has not confirmed. */
  pendingFollows: string[];
  /** Ids with a queued unfollow the server has not confirmed. */
  pendingUnfollows: string[];
  /** Writes the queue gave up on. Surfaced, never hidden. */
  parked: QueuedWrite[];
  /** True while a drain is running. */
  syncing: boolean;
  loading: boolean;
  follow: (entityId: string) => void;
  unfollow: (entityId: string) => void;
  /** Force a drain, for a pull-to-refresh. */
  sync: () => Promise<void>;
}

export function useWatchlist(): WatchlistState {
  const client = useGseClient();
  const token = useSession((s) => s.token);
  const queryClient = useQueryClient();

  const [confirmed, setConfirmed] = React.useState<string[]>([]);
  const [queueEntries, setQueueEntries] = React.useState<QueuedWrite[]>([]);
  const [parked, setParked] = React.useState<QueuedWrite[]>([]);
  const [syncing, setSyncing] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const { queue, storage } = React.useMemo(queueFor, []);

  const refreshQueue = React.useCallback(async () => {
    const entries = await queue.pending();
    setQueueEntries(entries);
    setParked(await queue.parked());
  }, [queue]);

  const sync = React.useCallback(async () => {
    setSyncing(true);
    try {
      const report = await queue.drain(async (entry) => {
        const entityId = typeof entry.payload["entityId"] === "string" ? entry.payload["entityId"] : "";
        const entityType =
          typeof entry.payload["entityType"] === "string" ? entry.payload["entityType"] : "pick";
        if (!entityId) {
          // A malformed payload can never succeed, so it is parked rather than
          // retried forever.
          return { kind: "rejected", reason: "queued write has no entityId" } as const;
        }
        const result =
          entry.kind === "watchlist.follow"
            ? await watchlistFollow({ client, token }, entityType, entityId)
            : await watchlistUnfollow({ client, token }, entityType, entityId);
        return classifyWriteResult(result);
      });

      if (report.applied > 0 || report.alreadyApplied > 0) {
        // Only now, after the server has confirmed, does the rendered list move.
        await queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      }
      await refreshQueue();
    } finally {
      setSyncing(false);
    }
  }, [queue, client, token, queryClient, refreshQueue]);

  // Initial load: the server's list, then reconcile the queue against it. The
  // server wins every disagreement, which is one line inside `queue.reconcile`.
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await watchlist({ client, token });
        if (cancelled) return;
        if (result.ok) {
          const ids = result.data.entries.map((e) => e.entityId);
          setConfirmed(ids);
          // A queued follow the server already has is satisfied and dropped.
          await queue.reconcile(ids);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          await refreshQueue();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, token, queue, refreshQueue]);

  // Drain on foreground: that is when connectivity usually returns, and a queue
  // that only drains at cold start can sit for days.
  React.useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void sync();
    });
    return () => subscription.remove();
  }, [sync]);

  const follow = React.useCallback(
    (entityId: string) => {
      // Optimistic immediately, because the queue is the source of the pending
      // state and it is durable.
      void queue.enqueue("watchlist.follow", { entityType: "pick", entityId }).then(refreshQueue);
      void sync();
    },
    [queue, refreshQueue, sync],
  );

  const unfollow = React.useCallback(
    (entityId: string) => {
      void queue.enqueue("watchlist.unfollow", { entityType: "pick", entityId }).then(refreshQueue);
      void sync();
    },
    [queue, refreshQueue, sync],
  );

  return React.useMemo<WatchlistState>(() => {
    const pendingFollows = queueEntries
      .filter((e) => e.kind === "watchlist.follow")
      .map((e) => String(e.payload["entityId"] ?? ""))
      .filter(Boolean);
    const pendingUnfollows = queueEntries
      .filter((e) => e.kind === "watchlist.unfollow")
      .map((e) => String(e.payload["entityId"] ?? ""))
      .filter(Boolean);

    // The displayed set is the server's, adjusted by pending intents. The server
    // is still authoritative — these are overlays of unconfirmed local intent,
    // and every one of them is visible as such.
    const displayed = new Set(confirmed);
    for (const id of pendingFollows) displayed.add(id);
    for (const id of pendingUnfollows) displayed.delete(id);

    return {
      followed: [...displayed],
      pendingFollows,
      pendingUnfollows,
      parked,
      syncing,
      loading,
      follow,
      unfollow,
      sync,
    };
  }, [confirmed, queueEntries, parked, syncing, loading, follow, unfollow, sync]);
}

/**
 * Clear the queue. Called on sign-out.
 *
 * A previous account's queued actions must not be replayed as the next user's —
 * they would appear as someone following picks they never chose.
 */
export async function clearOfflineQueue(): Promise<void> {
  const { storage: s } = queueFor();
  await s.clear();
}

// Registered at module load. The hook module is imported by the surfaces that
// use the watchlist, and the registry is idempotent, so this cannot double-clear.
registerSignOutTask(clearOfflineQueue);