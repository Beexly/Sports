import AsyncStorage from "@react-native-async-storage/async-storage";

import type { QueuedWrite, QueueStorage } from "../lib/offline-queue";

/**
 * Persistent storage for the offline queue.
 *
 * WHY A SINGLE KEY RATHER THAN ONE PER ENTRY: the queue is small (a user taps
 * follow a handful of times), and it is read as a whole on every drain and every
 * reconciliation. One key means one read and one write, and it makes the queue
 * atomic — there is no state where entry A has been written and entry B has not.
 *
 * The cost is that a write rewrites the whole queue, which at this size is a few
 * hundred bytes. A store with an unbounded queue would need a different design,
 * and the allowlist is what keeps it bounded: only two write kinds are queueable,
 * and both are user-initiated actions.
 *
 * A CORRUPT ENTRY IS DISCARDED, NOT PROPAGATED. If the JSON is unreadable the
 * queue is reset to empty and the loss is REPORTED through `lastLoadError`
 * rather than being silent — a queue that quietly forgets a user's action is the
 * failure this whole module exists to avoid, so it must at least be visible.
 */

const QUEUE_KEY = "gse.offline.queue.v1";

export class AsyncStorageQueueStorage implements QueueStorage {
  /** Set when the last read had to discard unreadable data. */
  lastLoadError: string | null = null;

  async read(): Promise<QueuedWrite[]> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (!raw) {
        this.lastLoadError = null;
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.lastLoadError = "queue payload was not an array";
        return [];
      }
      // Validate each entry rather than trusting the array's shape. A partial
      // entry (no idempotencyKey) would be sent to the server and could apply
      // twice, which is worse than losing it.
      const valid = parsed.filter(isQueuedWrite);
      if (valid.length !== parsed.length) {
        this.lastLoadError = `${parsed.length - valid.length} malformed queue entries discarded`;
      } else {
        this.lastLoadError = null;
      }
      return valid;
    } catch (error) {
      this.lastLoadError = error instanceof Error ? error.message : String(error);
      return [];
    }
  }

  async write(entries: QueuedWrite[]): Promise<void> {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(entries));
  }

  /** Used by sign-out. A previous account's queued actions must not be replayed
   *  against the next one — they would appear as the new user following picks
   *  they never chose. */
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
    this.lastLoadError = null;
  }
}

function isQueuedWrite(value: unknown): value is QueuedWrite {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["id"] === "string" &&
    typeof v["kind"] === "string" &&
    typeof v["idempotencyKey"] === "string" &&
    v["idempotencyKey"].length > 0 &&
    typeof v["payload"] === "object" &&
    v["payload"] !== null &&
    typeof v["createdAt"] === "number" &&
    typeof v["attempts"] === "number"
  );
}