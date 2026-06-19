/**
 * storage-utils.ts
 * Pure TypeScript storage abstraction — browser-compatible, fully testable in Node.
 * No npm dependencies. No `any`.
 */

// ---------------------------------------------------------------------------
// Storage backend interface
// ---------------------------------------------------------------------------

export interface StorageBackend {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  clear(): void
  keys(): string[]
}

// ---------------------------------------------------------------------------
// MemoryStorage — Map-based in-memory backend (tests / SSR)
// ---------------------------------------------------------------------------

export class MemoryStorage implements StorageBackend {
  private store: Map<string, string>

  constructor() {
    this.store = new Map<string, string>()
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  keys(): string[] {
    return Array.from(this.store.keys())
  }

  get size(): number {
    return this.store.size
  }
}

// ---------------------------------------------------------------------------
// getSafeStorage — returns MemoryStorage when localStorage is unavailable
// ---------------------------------------------------------------------------

export function getSafeStorage(type: 'local' | 'session' = 'local'): StorageBackend {
  try {
    const storage = type === 'local' ? globalThis.localStorage : globalThis.sessionStorage
    if (storage === undefined || storage === null) {
      return new MemoryStorage()
    }
    // Probe write access
    const probe = '__storage_probe__'
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return storage as unknown as StorageBackend
  } catch {
    return new MemoryStorage()
  }
}

// ---------------------------------------------------------------------------
// StorageItem — value envelope with TTL and version
// ---------------------------------------------------------------------------

export interface StorageItem<T> {
  value: T
  expiresAt?: number   // ms epoch; undefined = no expiry
  version?: number     // for schema migration
  createdAt: number
}

// ---------------------------------------------------------------------------
// TypedStorage — namespaced, TTL-aware, schema-versioned
// ---------------------------------------------------------------------------

export class TypedStorage<TSchema extends Record<string, unknown>> {
  protected readonly namespace: string
  protected readonly backend: StorageBackend
  private readonly defaultTtlMs?: number
  private readonly version?: number

  constructor(opts: {
    namespace: string
    backend?: StorageBackend
    defaultTtlMs?: number
    version?: number
  }) {
    this.namespace = opts.namespace
    this.backend = opts.backend ?? getSafeStorage()
    this.defaultTtlMs = opts.defaultTtlMs
    this.version = opts.version
  }

  private nsKey(key: keyof TSchema): string {
    return `${this.namespace}:${String(key)}`
  }

  get<K extends keyof TSchema>(key: K): TSchema[K] | null {
    const raw = this.backend.getItem(this.nsKey(key))
    if (raw === null) return null
    try {
      const item = JSON.parse(raw) as StorageItem<TSchema[K]>
      if (item.expiresAt !== undefined && Date.now() > item.expiresAt) {
        this.backend.removeItem(this.nsKey(key))
        return null
      }
      return item.value
    } catch {
      return null
    }
  }

  set<K extends keyof TSchema>(key: K, value: TSchema[K], ttlMs?: number): void {
    const effectiveTtl = ttlMs ?? this.defaultTtlMs
    const item: StorageItem<TSchema[K]> = {
      value,
      createdAt: Date.now(),
      ...(effectiveTtl !== undefined ? { expiresAt: Date.now() + effectiveTtl } : {}),
      ...(this.version !== undefined ? { version: this.version } : {}),
    }
    this.backend.setItem(this.nsKey(key), JSON.stringify(item))
  }

  remove<K extends keyof TSchema>(key: K): void {
    this.backend.removeItem(this.nsKey(key))
  }

  has<K extends keyof TSchema>(key: K): boolean {
    return this.get(key) !== null
  }

  isExpired<K extends keyof TSchema>(key: K): boolean {
    const raw = this.backend.getItem(this.nsKey(key))
    if (raw === null) return true
    try {
      const item = JSON.parse(raw) as StorageItem<TSchema[K]>
      if (item.expiresAt === undefined) return false
      return Date.now() > item.expiresAt
    } catch {
      return true
    }
  }

  getWithMeta<K extends keyof TSchema>(key: K): StorageItem<TSchema[K]> | null {
    const raw = this.backend.getItem(this.nsKey(key))
    if (raw === null) return null
    try {
      const item = JSON.parse(raw) as StorageItem<TSchema[K]>
      if (item.expiresAt !== undefined && Date.now() > item.expiresAt) {
        this.backend.removeItem(this.nsKey(key))
        return null
      }
      return item
    } catch {
      return null
    }
  }

  keys(): Array<keyof TSchema> {
    const prefix = `${this.namespace}:`
    return this.backend
      .keys()
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length) as keyof TSchema)
      .filter((k) => this.has(k))
  }

  clear(): void {
    const prefix = `${this.namespace}:`
    const toRemove = this.backend.keys().filter((k) => k.startsWith(prefix))
    for (const k of toRemove) {
      this.backend.removeItem(k)
    }
  }

  size(): number {
    return this.keys().length
  }

  migrate<K extends keyof TSchema>(key: K, migrateFn: (old: unknown) => TSchema[K]): void {
    const raw = this.backend.getItem(this.nsKey(key))
    if (raw === null) return
    try {
      const item = JSON.parse(raw) as StorageItem<unknown>
      const newValue = migrateFn(item.value)
      this.set(key, newValue)
    } catch {
      // ignore parse errors
    }
  }
}

// ---------------------------------------------------------------------------
// Simple KV helpers (namespace-less, string values)
// ---------------------------------------------------------------------------

const _defaultBackend = new MemoryStorage()

export function storageGet(key: string, backend?: StorageBackend): string | null {
  return (backend ?? _defaultBackend).getItem(key)
}

export function storageSet(key: string, value: string, backend?: StorageBackend): void {
  ;(backend ?? _defaultBackend).setItem(key, value)
}

export function storageRemove(key: string, backend?: StorageBackend): void {
  ;(backend ?? _defaultBackend).removeItem(key)
}

export function storageGetJson<T>(key: string, backend?: StorageBackend): T | null {
  const raw = (backend ?? _defaultBackend).getItem(key)
  if (raw === null) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function storageSetJson<T>(key: string, value: T, backend?: StorageBackend): void {
  ;(backend ?? _defaultBackend).setItem(key, JSON.stringify(value))
}

// ---------------------------------------------------------------------------
// TTL helpers
// ---------------------------------------------------------------------------

interface TtlEnvelope<T> {
  value: T
  expiresAt: number
}

export function setWithTtl<T>(key: string, value: T, ttlMs: number, backend?: StorageBackend): void {
  const envelope: TtlEnvelope<T> = { value, expiresAt: Date.now() + ttlMs }
  ;(backend ?? _defaultBackend).setItem(key, JSON.stringify(envelope))
}

export function getWithTtl<T>(key: string, backend?: StorageBackend): T | null {
  const b = backend ?? _defaultBackend
  const raw = b.getItem(key)
  if (raw === null) return null
  try {
    const envelope = JSON.parse(raw) as TtlEnvelope<T>
    if (Date.now() > envelope.expiresAt) {
      b.removeItem(key)
      return null
    }
    return envelope.value
  } catch {
    return null
  }
}

export function isKeyExpired(key: string, backend?: StorageBackend): boolean {
  const b = backend ?? _defaultBackend
  const raw = b.getItem(key)
  if (raw === null) return true
  try {
    const envelope = JSON.parse(raw) as TtlEnvelope<unknown>
    if (typeof envelope.expiresAt !== 'number') return false
    return Date.now() > envelope.expiresAt
  } catch {
    return true
  }
}

// ---------------------------------------------------------------------------
// Versioned state
// ---------------------------------------------------------------------------

export interface VersionedState<T> {
  data: T
  version: number
  updatedAt: number
}

export function saveVersionedState<T>(
  key: string,
  data: T,
  version: number,
  backend?: StorageBackend,
): void {
  const state: VersionedState<T> = { data, version, updatedAt: Date.now() }
  ;(backend ?? _defaultBackend).setItem(key, JSON.stringify(state))
}

export function loadVersionedState<T>(
  key: string,
  backend?: StorageBackend,
): VersionedState<T> | null {
  const raw = (backend ?? _defaultBackend).getItem(key)
  if (raw === null) return null
  try {
    return JSON.parse(raw) as VersionedState<T>
  } catch {
    return null
  }
}

export function migrateVersionedState<TOld, TNew>(
  key: string,
  targetVersion: number,
  migrateFn: (old: TOld, fromVersion: number) => TNew,
  backend?: StorageBackend,
): TNew | null {
  const b = backend ?? _defaultBackend
  const raw = b.getItem(key)
  if (raw === null) return null
  try {
    const state = JSON.parse(raw) as VersionedState<TOld>
    if (state.version >= targetVersion) {
      return state.data as unknown as TNew
    }
    const newData = migrateFn(state.data, state.version)
    saveVersionedState(key, newData, targetVersion, b)
    return newData
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Quota & inspection helpers
// ---------------------------------------------------------------------------

export function estimateStorageSize(backend: StorageBackend): number {
  let total = 0
  for (const key of backend.keys()) {
    const val = backend.getItem(key) ?? ''
    // UTF-16 approximation: 2 bytes per char
    total += (key.length + val.length) * 2
  }
  return total
}

export function listKeys(backend: StorageBackend, prefix?: string): string[] {
  const all = backend.keys()
  if (prefix === undefined) return all
  return all.filter((k) => k.startsWith(prefix))
}

export function clearByPrefix(prefix: string, backend: StorageBackend): number {
  const matching = backend.keys().filter((k) => k.startsWith(prefix))
  for (const k of matching) {
    backend.removeItem(k)
  }
  return matching.length
}

export function storageStats(backend: StorageBackend): {
  totalKeys: number
  totalSize: number
  expiredKeys: number
} {
  let totalSize = 0
  let expiredKeys = 0
  const keys = backend.keys()

  for (const key of keys) {
    const val = backend.getItem(key) ?? ''
    totalSize += (key.length + val.length) * 2
    try {
      const parsed = JSON.parse(val) as { expiresAt?: number }
      if (typeof parsed.expiresAt === 'number' && Date.now() > parsed.expiresAt) {
        expiredKeys++
      }
    } catch {
      // not a TTL envelope — not expired
    }
  }

  return { totalKeys: keys.length, totalSize, expiredKeys }
}

// ---------------------------------------------------------------------------
// ObservableStorage
// ---------------------------------------------------------------------------

export type StorageListener<T> = (
  newValue: T | null,
  oldValue: T | null,
  key: string,
) => void

export class ObservableStorage<
  TSchema extends Record<string, unknown>,
> extends TypedStorage<TSchema> {
  private listeners: Map<string, Set<StorageListener<TSchema[keyof TSchema]>>> = new Map()
  private allListeners: Set<StorageListener<TSchema[keyof TSchema]>> = new Set()

  subscribe<K extends keyof TSchema>(
    key: K,
    listener: StorageListener<TSchema[K]>,
  ): () => void {
    const strKey = String(key)
    if (!this.listeners.has(strKey)) {
      this.listeners.set(strKey, new Set())
    }
    const typedListener = listener as StorageListener<TSchema[keyof TSchema]>
    this.listeners.get(strKey)!.add(typedListener)
    return () => {
      this.listeners.get(strKey)?.delete(typedListener)
    }
  }

  subscribeAll(listener: StorageListener<TSchema[keyof TSchema]>): () => void {
    this.allListeners.add(listener)
    return () => {
      this.allListeners.delete(listener)
    }
  }

  emit<K extends keyof TSchema>(
    key: K,
    newValue: TSchema[K] | null,
    oldValue: TSchema[K] | null,
  ): void {
    const strKey = String(key)
    const nv = newValue as TSchema[keyof TSchema] | null
    const ov = oldValue as TSchema[keyof TSchema] | null
    this.listeners.get(strKey)?.forEach((l) => l(nv, ov, strKey))
    this.allListeners.forEach((l) => l(nv, ov, strKey))
  }

  override set<K extends keyof TSchema>(key: K, value: TSchema[K], ttlMs?: number): void {
    const oldValue = this.get(key)
    super.set(key, value, ttlMs)
    this.emit(key, value, oldValue)
  }

  override remove<K extends keyof TSchema>(key: K): void {
    const oldValue = this.get(key)
    super.remove(key)
    this.emit(key, null, oldValue)
  }
}

// ---------------------------------------------------------------------------
// Sync utilities
// ---------------------------------------------------------------------------

export function copyStorage(
  from: StorageBackend,
  to: StorageBackend,
  prefix?: string,
): number {
  const keys = prefix === undefined ? from.keys() : from.keys().filter((k) => k.startsWith(prefix))
  for (const key of keys) {
    const val = from.getItem(key)
    if (val !== null) {
      to.setItem(key, val)
    }
  }
  return keys.length
}

export function diffStorage(
  a: StorageBackend,
  b: StorageBackend,
): { onlyInA: string[]; onlyInB: string[]; differing: string[] } {
  const aKeys = new Set(a.keys())
  const bKeys = new Set(b.keys())

  const onlyInA: string[] = []
  const onlyInB: string[] = []
  const differing: string[] = []

  for (const key of aKeys) {
    if (!bKeys.has(key)) {
      onlyInA.push(key)
    } else if (a.getItem(key) !== b.getItem(key)) {
      differing.push(key)
    }
  }

  for (const key of bKeys) {
    if (!aKeys.has(key)) {
      onlyInB.push(key)
    }
  }

  return { onlyInA, onlyInB, differing }
}

// ---------------------------------------------------------------------------
// Sports app helpers
// ---------------------------------------------------------------------------

export interface UserPreferences {
  favoriteTeams?: string[]
  favoriteSports?: string[]
  timezone?: string
  oddsFormat?: 'american' | 'decimal' | 'fractional'
  notifications?: boolean
  theme?: 'light' | 'dark' | 'system'
}

export function createPreferencesStorage(
  backend?: StorageBackend,
): TypedStorage<{ preferences: UserPreferences }> {
  return new TypedStorage<{ preferences: UserPreferences }>({
    namespace: 'gsn:preferences',
    backend: backend ?? new MemoryStorage(),
  })
}

export function createPickHistoryStorage(
  backend?: StorageBackend,
): TypedStorage<{ picks: unknown[] }> {
  return new TypedStorage<{ picks: unknown[] }>({
    namespace: 'gsn:pick-history',
    backend: backend ?? new MemoryStorage(),
  })
}
