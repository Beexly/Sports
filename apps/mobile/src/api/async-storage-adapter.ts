import AsyncStorage from "@react-native-async-storage/async-storage";

import type { CacheStorage } from "./cache";

/**
 * The persistent half of the response cache.
 *
 * AsyncStorage is the right store here and not a compromise: the payloads are
 * small (a board is a few dozen rows), the access pattern is whole-key reads,
 * and this is exactly what iOS gives you for it. A SQLite table would add a
 * dependency and a migration surface for no gain at this size.
 *
 * The adapter is thin on purpose — it exists so the cache module never imports
 * a native module, which keeps `Cache` unit-testable under plain Node with the
 * in-memory storage.
 */
export class AsyncStorageCacheAdapter implements CacheStorage {
  async get(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  }

  async set(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }

  async keys(): Promise<string[]> {
    // AsyncStorage v2 returns a readonly array; the Cache contract is mutable.
    const keys = await AsyncStorage.getAllKeys();
    return [...keys];
  }
}