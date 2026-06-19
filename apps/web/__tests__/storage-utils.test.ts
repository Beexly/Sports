import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  MemoryStorage,
  getSafeStorage,
  TypedStorage,
  ObservableStorage,
  storageGet,
  storageSet,
  storageRemove,
  storageGetJson,
  storageSetJson,
  setWithTtl,
  getWithTtl,
  isKeyExpired,
  saveVersionedState,
  loadVersionedState,
  migrateVersionedState,
  estimateStorageSize,
  listKeys,
  clearByPrefix,
  storageStats,
  copyStorage,
  diffStorage,
  createPreferencesStorage,
  createPickHistoryStorage,
} from '../lib/utils/storage-utils'

// ---------------------------------------------------------------------------
// MemoryStorage
// ---------------------------------------------------------------------------

describe('MemoryStorage', () => {
  let mem: MemoryStorage

  beforeEach(() => {
    mem = new MemoryStorage()
  })

  it('returns null for a key that has not been set', () => {
    expect(mem.getItem('missing')).toBeNull()
  })

  it('stores and retrieves a value', () => {
    mem.setItem('k', 'v')
    expect(mem.getItem('k')).toBe('v')
  })

  it('overwrites an existing value', () => {
    mem.setItem('k', 'v1')
    mem.setItem('k', 'v2')
    expect(mem.getItem('k')).toBe('v2')
  })

  it('removes a key', () => {
    mem.setItem('k', 'v')
    mem.removeItem('k')
    expect(mem.getItem('k')).toBeNull()
  })

  it('silently ignores removeItem on missing key', () => {
    expect(() => mem.removeItem('nope')).not.toThrow()
  })

  it('clears all keys', () => {
    mem.setItem('a', '1')
    mem.setItem('b', '2')
    mem.clear()
    expect(mem.getItem('a')).toBeNull()
    expect(mem.getItem('b')).toBeNull()
    expect(mem.size).toBe(0)
  })

  it('keys() returns all stored keys', () => {
    mem.setItem('x', '1')
    mem.setItem('y', '2')
    expect(mem.keys()).toEqual(expect.arrayContaining(['x', 'y']))
    expect(mem.keys()).toHaveLength(2)
  })

  it('keys() returns empty array for empty store', () => {
    expect(mem.keys()).toEqual([])
  })

  it('size reflects the number of stored items', () => {
    expect(mem.size).toBe(0)
    mem.setItem('a', '1')
    expect(mem.size).toBe(1)
    mem.setItem('b', '2')
    expect(mem.size).toBe(2)
    mem.removeItem('a')
    expect(mem.size).toBe(1)
  })

  it('stores empty string value', () => {
    mem.setItem('empty', '')
    expect(mem.getItem('empty')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// getSafeStorage
// ---------------------------------------------------------------------------

describe('getSafeStorage', () => {
  it('returns a StorageBackend in Node environment (no localStorage)', () => {
    const storage = getSafeStorage('local')
    expect(storage).toBeDefined()
    expect(typeof storage.getItem).toBe('function')
    expect(typeof storage.setItem).toBe('function')
  })

  it('returned backend works as a MemoryStorage fallback', () => {
    const storage = getSafeStorage('local')
    storage.setItem('probe', 'ok')
    expect(storage.getItem('probe')).toBe('ok')
  })

  it('session type also returns a working backend', () => {
    const storage = getSafeStorage('session')
    storage.setItem('s', '1')
    expect(storage.getItem('s')).toBe('1')
  })

  it('defaults to local type', () => {
    const storage = getSafeStorage()
    storage.setItem('def', 'yes')
    expect(storage.getItem('def')).toBe('yes')
  })
})

// ---------------------------------------------------------------------------
// TypedStorage
// ---------------------------------------------------------------------------

type TestSchema = {
  name: string
  count: number
  tags: string[]
  active: boolean
}

describe('TypedStorage.get', () => {
  let store: TypedStorage<TestSchema>
  let backend: MemoryStorage

  beforeEach(() => {
    backend = new MemoryStorage()
    store = new TypedStorage<TestSchema>({ namespace: 'ns', backend })
  })

  it('returns null for a key that has not been set', () => {
    expect(store.get('name')).toBeNull()
  })

  it('returns the stored value', () => {
    store.set('name', 'Alice')
    expect(store.get('name')).toBe('Alice')
  })

  it('returns complex typed values', () => {
    store.set('tags', ['a', 'b', 'c'])
    expect(store.get('tags')).toEqual(['a', 'b', 'c'])
  })

  it('returns null for an expired key', () => {
    vi.useFakeTimers()
    store.set('count', 42, 1000)
    vi.advanceTimersByTime(1001)
    expect(store.get('count')).toBeNull()
    vi.useRealTimers()
  })

  it('removes the expired key from backend on access', () => {
    vi.useFakeTimers()
    store.set('count', 42, 1000)
    vi.advanceTimersByTime(1001)
    store.get('count')
    expect(backend.getItem('ns:count')).toBeNull()
    vi.useRealTimers()
  })

  it('returns null for corrupted JSON', () => {
    backend.setItem('ns:name', 'not-json')
    expect(store.get('name')).toBeNull()
  })
})

describe('TypedStorage.set', () => {
  let store: TypedStorage<TestSchema>
  let backend: MemoryStorage

  beforeEach(() => {
    backend = new MemoryStorage()
    store = new TypedStorage<TestSchema>({ namespace: 'ns', backend })
  })

  it('stores a value accessible via get', () => {
    store.set('active', true)
    expect(store.get('active')).toBe(true)
  })

  it('overwrites existing value', () => {
    store.set('name', 'Alice')
    store.set('name', 'Bob')
    expect(store.get('name')).toBe('Bob')
  })

  it('TTL: value still accessible before expiry', () => {
    vi.useFakeTimers()
    store.set('count', 5, 2000)
    vi.advanceTimersByTime(1999)
    expect(store.get('count')).toBe(5)
    vi.useRealTimers()
  })

  it('TTL: value returns null after expiry', () => {
    vi.useFakeTimers()
    store.set('count', 5, 500)
    vi.advanceTimersByTime(501)
    expect(store.get('count')).toBeNull()
    vi.useRealTimers()
  })

  it('persists value without TTL indefinitely', () => {
    vi.useFakeTimers()
    store.set('name', 'Eternal')
    vi.advanceTimersByTime(9999999)
    expect(store.get('name')).toBe('Eternal')
    vi.useRealTimers()
  })
})

describe('TypedStorage.has', () => {
  let store: TypedStorage<TestSchema>

  beforeEach(() => {
    store = new TypedStorage<TestSchema>({ namespace: 'ns', backend: new MemoryStorage() })
  })

  it('returns false for missing key', () => {
    expect(store.has('name')).toBe(false)
  })

  it('returns true for set key', () => {
    store.set('name', 'test')
    expect(store.has('name')).toBe(true)
  })

  it('returns false for expired key', () => {
    vi.useFakeTimers()
    store.set('count', 1, 100)
    vi.advanceTimersByTime(101)
    expect(store.has('count')).toBe(false)
    vi.useRealTimers()
  })
})

describe('TypedStorage.isExpired', () => {
  let store: TypedStorage<TestSchema>

  beforeEach(() => {
    store = new TypedStorage<TestSchema>({ namespace: 'ns', backend: new MemoryStorage() })
  })

  it('returns true for missing key', () => {
    expect(store.isExpired('name')).toBe(true)
  })

  it('returns false for a key with no TTL', () => {
    store.set('name', 'test')
    expect(store.isExpired('name')).toBe(false)
  })

  it('returns false before TTL passes', () => {
    vi.useFakeTimers()
    store.set('count', 1, 1000)
    vi.advanceTimersByTime(999)
    expect(store.isExpired('count')).toBe(false)
    vi.useRealTimers()
  })

  it('returns true after TTL passes', () => {
    vi.useFakeTimers()
    store.set('count', 1, 1000)
    vi.advanceTimersByTime(1001)
    expect(store.isExpired('count')).toBe(true)
    vi.useRealTimers()
  })
})

describe('TypedStorage.getWithMeta', () => {
  let store: TypedStorage<TestSchema>

  beforeEach(() => {
    store = new TypedStorage<TestSchema>({ namespace: 'ns', backend: new MemoryStorage() })
  })

  it('returns null for missing key', () => {
    expect(store.getWithMeta('name')).toBeNull()
  })

  it('returns metadata including createdAt', () => {
    store.set('name', 'Alice')
    const meta = store.getWithMeta('name')
    expect(meta).not.toBeNull()
    expect(meta!.value).toBe('Alice')
    expect(typeof meta!.createdAt).toBe('number')
  })

  it('includes expiresAt when TTL is set', () => {
    vi.useFakeTimers()
    const now = Date.now()
    store.set('count', 99, 5000)
    const meta = store.getWithMeta('count')
    expect(meta!.expiresAt).toBe(now + 5000)
    vi.useRealTimers()
  })

  it('returns null for expired key via getWithMeta', () => {
    vi.useFakeTimers()
    store.set('count', 7, 100)
    vi.advanceTimersByTime(101)
    expect(store.getWithMeta('count')).toBeNull()
    vi.useRealTimers()
  })
})

describe('TypedStorage.keys', () => {
  let store: TypedStorage<TestSchema>

  beforeEach(() => {
    store = new TypedStorage<TestSchema>({ namespace: 'ns', backend: new MemoryStorage() })
  })

  it('returns empty array when nothing is stored', () => {
    expect(store.keys()).toEqual([])
  })

  it('returns keys present in this namespace', () => {
    store.set('name', 'Alice')
    store.set('count', 5)
    const keys = store.keys()
    expect(keys).toContain('name')
    expect(keys).toContain('count')
    expect(keys).toHaveLength(2)
  })

  it('does not include expired keys', () => {
    vi.useFakeTimers()
    store.set('name', 'Alice')
    store.set('count', 5, 100)
    vi.advanceTimersByTime(101)
    const keys = store.keys()
    expect(keys).toContain('name')
    expect(keys).not.toContain('count')
    vi.useRealTimers()
  })
})

describe('TypedStorage.clear', () => {
  it('removes only namespace keys, not others', () => {
    const backend = new MemoryStorage()
    const storeA = new TypedStorage<TestSchema>({ namespace: 'ns-a', backend })
    const storeB = new TypedStorage<TestSchema>({ namespace: 'ns-b', backend })

    storeA.set('name', 'Alice')
    storeB.set('name', 'Bob')

    storeA.clear()

    expect(storeA.get('name')).toBeNull()
    expect(storeB.get('name')).toBe('Bob')
  })
})

describe('TypedStorage.size', () => {
  let store: TypedStorage<TestSchema>

  beforeEach(() => {
    store = new TypedStorage<TestSchema>({ namespace: 'ns', backend: new MemoryStorage() })
  })

  it('returns 0 for empty store', () => {
    expect(store.size()).toBe(0)
  })

  it('returns count of active keys', () => {
    store.set('name', 'Alice')
    store.set('count', 3)
    expect(store.size()).toBe(2)
  })

  it('does not count expired keys', () => {
    vi.useFakeTimers()
    store.set('name', 'Alice')
    store.set('count', 3, 100)
    vi.advanceTimersByTime(101)
    expect(store.size()).toBe(1)
    vi.useRealTimers()
  })
})

describe('TypedStorage.migrate', () => {
  type OldSchema = { name: string }
  it('reads old value, transforms, and writes new', () => {
    const backend = new MemoryStorage()
    const store = new TypedStorage<OldSchema>({ namespace: 'ns', backend })
    store.set('name', 'alice')
    store.migrate('name', (old) => (old as string).toUpperCase())
    expect(store.get('name')).toBe('ALICE')
  })

  it('does nothing when key is absent', () => {
    const backend = new MemoryStorage()
    const store = new TypedStorage<OldSchema>({ namespace: 'ns', backend })
    expect(() => store.migrate('name', (old) => String(old))).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Default TTL
// ---------------------------------------------------------------------------

describe('TypedStorage default TTL', () => {
  it('applies defaultTtlMs when per-set TTL not provided', () => {
    vi.useFakeTimers()
    const backend = new MemoryStorage()
    const store = new TypedStorage<TestSchema>({ namespace: 'ns', backend, defaultTtlMs: 500 })
    store.set('count', 42)
    vi.advanceTimersByTime(501)
    expect(store.get('count')).toBeNull()
    vi.useRealTimers()
  })

  it('per-set TTL overrides defaultTtlMs', () => {
    vi.useFakeTimers()
    const backend = new MemoryStorage()
    const store = new TypedStorage<TestSchema>({ namespace: 'ns', backend, defaultTtlMs: 100 })
    store.set('count', 42, 2000)
    vi.advanceTimersByTime(150)
    expect(store.get('count')).toBe(42)
    vi.useRealTimers()
  })
})

// ---------------------------------------------------------------------------
// Namespace isolation
// ---------------------------------------------------------------------------

describe('Namespace isolation', () => {
  it('two TypedStorage instances with different namespaces do not overlap', () => {
    const backend = new MemoryStorage()
    const s1 = new TypedStorage<TestSchema>({ namespace: 'alpha', backend })
    const s2 = new TypedStorage<TestSchema>({ namespace: 'beta', backend })

    s1.set('name', 'from-alpha')
    s2.set('name', 'from-beta')

    expect(s1.get('name')).toBe('from-alpha')
    expect(s2.get('name')).toBe('from-beta')
  })

  it('clearing one namespace does not affect another', () => {
    const backend = new MemoryStorage()
    const s1 = new TypedStorage<TestSchema>({ namespace: 'x', backend })
    const s2 = new TypedStorage<TestSchema>({ namespace: 'y', backend })

    s1.set('name', 'x-name')
    s2.set('name', 'y-name')
    s1.clear()

    expect(s1.get('name')).toBeNull()
    expect(s2.get('name')).toBe('y-name')
  })
})

// ---------------------------------------------------------------------------
// Simple KV helpers
// ---------------------------------------------------------------------------

describe('storageGet / storageSet / storageRemove', () => {
  let backend: MemoryStorage

  beforeEach(() => {
    backend = new MemoryStorage()
  })

  it('storageSet and storageGet work', () => {
    storageSet('hello', 'world', backend)
    expect(storageGet('hello', backend)).toBe('world')
  })

  it('storageGet returns null for missing key', () => {
    expect(storageGet('absent', backend)).toBeNull()
  })

  it('storageRemove deletes the key', () => {
    storageSet('bye', 'val', backend)
    storageRemove('bye', backend)
    expect(storageGet('bye', backend)).toBeNull()
  })
})

describe('storageGetJson / storageSetJson', () => {
  let backend: MemoryStorage

  beforeEach(() => {
    backend = new MemoryStorage()
  })

  it('round-trips a plain object', () => {
    const obj = { a: 1, b: 'two' }
    storageSetJson('obj', obj, backend)
    expect(storageGetJson<typeof obj>('obj', backend)).toEqual(obj)
  })

  it('round-trips an array', () => {
    storageSetJson('arr', [1, 2, 3], backend)
    expect(storageGetJson<number[]>('arr', backend)).toEqual([1, 2, 3])
  })

  it('returns null for missing key', () => {
    expect(storageGetJson('missing', backend)).toBeNull()
  })

  it('returns null for corrupted JSON', () => {
    backend.setItem('bad', '{not json}')
    expect(storageGetJson('bad', backend)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TTL helpers
// ---------------------------------------------------------------------------

describe('setWithTtl / getWithTtl', () => {
  let backend: MemoryStorage

  beforeEach(() => {
    backend = new MemoryStorage()
  })

  it('returns value before expiry', () => {
    vi.useFakeTimers()
    setWithTtl('k', { x: 1 }, 2000, backend)
    vi.advanceTimersByTime(1999)
    expect(getWithTtl<{ x: number }>('k', backend)).toEqual({ x: 1 })
    vi.useRealTimers()
  })

  it('returns null after expiry', () => {
    vi.useFakeTimers()
    setWithTtl('k', 'hello', 500, backend)
    vi.advanceTimersByTime(501)
    expect(getWithTtl<string>('k', backend)).toBeNull()
    vi.useRealTimers()
  })

  it('removes expired key automatically', () => {
    vi.useFakeTimers()
    setWithTtl('k', 42, 100, backend)
    vi.advanceTimersByTime(101)
    getWithTtl('k', backend)
    expect(backend.getItem('k')).toBeNull()
    vi.useRealTimers()
  })

  it('returns null for missing key', () => {
    expect(getWithTtl('missing', backend)).toBeNull()
  })
})

describe('isKeyExpired', () => {
  let backend: MemoryStorage

  beforeEach(() => {
    backend = new MemoryStorage()
  })

  it('returns true for missing key', () => {
    expect(isKeyExpired('nope', backend)).toBe(true)
  })

  it('returns false before TTL passes', () => {
    vi.useFakeTimers()
    setWithTtl('k', 'v', 1000, backend)
    vi.advanceTimersByTime(999)
    expect(isKeyExpired('k', backend)).toBe(false)
    vi.useRealTimers()
  })

  it('returns true after TTL passes', () => {
    vi.useFakeTimers()
    setWithTtl('k', 'v', 1000, backend)
    vi.advanceTimersByTime(1001)
    expect(isKeyExpired('k', backend)).toBe(true)
    vi.useRealTimers()
  })

  it('returns false for non-TTL JSON (no expiresAt field)', () => {
    backend.setItem('plain', JSON.stringify({ data: 'no-ttl' }))
    expect(isKeyExpired('plain', backend)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Versioned state
// ---------------------------------------------------------------------------

describe('saveVersionedState / loadVersionedState', () => {
  let backend: MemoryStorage

  beforeEach(() => {
    backend = new MemoryStorage()
  })

  it('round-trips versioned state', () => {
    saveVersionedState('v', { score: 100 }, 1, backend)
    const loaded = loadVersionedState<{ score: number }>('v', backend)
    expect(loaded).not.toBeNull()
    expect(loaded!.data).toEqual({ score: 100 })
    expect(loaded!.version).toBe(1)
  })

  it('includes updatedAt timestamp', () => {
    vi.useFakeTimers()
    const now = Date.now()
    saveVersionedState('v', 'x', 2, backend)
    const loaded = loadVersionedState<string>('v', backend)
    expect(loaded!.updatedAt).toBe(now)
    vi.useRealTimers()
  })

  it('returns null for missing key', () => {
    expect(loadVersionedState('absent', backend)).toBeNull()
  })

  it('overwrites on subsequent saves', () => {
    saveVersionedState('v', 'old', 1, backend)
    saveVersionedState('v', 'new', 2, backend)
    const loaded = loadVersionedState<string>('v', backend)
    expect(loaded!.data).toBe('new')
    expect(loaded!.version).toBe(2)
  })
})

describe('migrateVersionedState', () => {
  let backend: MemoryStorage

  beforeEach(() => {
    backend = new MemoryStorage()
  })

  it('returns null when no state exists', () => {
    const result = migrateVersionedState<string, number>('k', 2, (old) => Number(old), backend)
    expect(result).toBeNull()
  })

  it('runs migrateFn when version < targetVersion', () => {
    saveVersionedState('k', { old: true }, 1, backend)
    const result = migrateVersionedState<{ old: boolean }, { migrated: boolean }>(
      'k',
      2,
      (old) => ({ migrated: (old as { old: boolean }).old }),
      backend,
    )
    expect(result).toEqual({ migrated: true })
  })

  it('saves migrated state at targetVersion', () => {
    saveVersionedState('k', 'v1', 1, backend)
    migrateVersionedState<string, string>('k', 3, (old) => String(old) + '-migrated', backend)
    const loaded = loadVersionedState<string>('k', backend)
    expect(loaded!.version).toBe(3)
    expect(loaded!.data).toBe('v1-migrated')
  })

  it('returns existing data without running migrateFn when version >= targetVersion', () => {
    saveVersionedState('k', 'current', 5, backend)
    const migrateFn = vi.fn((old: unknown) => String(old) + '-new')
    const result = migrateVersionedState<string, string>('k', 5, migrateFn, backend)
    expect(result).toBe('current')
    expect(migrateFn).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Quota & inspection
// ---------------------------------------------------------------------------

describe('estimateStorageSize', () => {
  let backend: MemoryStorage

  beforeEach(() => {
    backend = new MemoryStorage()
  })

  it('returns 0 for empty storage', () => {
    expect(estimateStorageSize(backend)).toBe(0)
  })

  it('increases when data is added', () => {
    const before = estimateStorageSize(backend)
    backend.setItem('key', 'value')
    const after = estimateStorageSize(backend)
    expect(after).toBeGreaterThan(before)
  })

  it('estimates based on key + value byte length', () => {
    backend.setItem('ab', 'cd')
    // (2 + 2) * 2 = 8
    expect(estimateStorageSize(backend)).toBe(8)
  })
})

describe('listKeys', () => {
  let backend: MemoryStorage

  beforeEach(() => {
    backend = new MemoryStorage()
    backend.setItem('foo:a', '1')
    backend.setItem('foo:b', '2')
    backend.setItem('bar:c', '3')
  })

  it('returns all keys without a prefix filter', () => {
    const keys = listKeys(backend)
    expect(keys).toHaveLength(3)
    expect(keys).toContain('foo:a')
    expect(keys).toContain('bar:c')
  })

  it('filters keys by prefix', () => {
    const keys = listKeys(backend, 'foo:')
    expect(keys).toHaveLength(2)
    expect(keys).toContain('foo:a')
    expect(keys).toContain('foo:b')
    expect(keys).not.toContain('bar:c')
  })

  it('returns empty array when no keys match prefix', () => {
    expect(listKeys(backend, 'baz:')).toEqual([])
  })
})

describe('clearByPrefix', () => {
  let backend: MemoryStorage

  beforeEach(() => {
    backend = new MemoryStorage()
    backend.setItem('ns:a', '1')
    backend.setItem('ns:b', '2')
    backend.setItem('other:c', '3')
  })

  it('removes matching keys', () => {
    clearByPrefix('ns:', backend)
    expect(backend.getItem('ns:a')).toBeNull()
    expect(backend.getItem('ns:b')).toBeNull()
  })

  it('leaves non-matching keys', () => {
    clearByPrefix('ns:', backend)
    expect(backend.getItem('other:c')).toBe('3')
  })

  it('returns count of removed keys', () => {
    const count = clearByPrefix('ns:', backend)
    expect(count).toBe(2)
  })

  it('returns 0 when nothing matches', () => {
    expect(clearByPrefix('zzz:', backend)).toBe(0)
  })
})

describe('storageStats', () => {
  let backend: MemoryStorage

  beforeEach(() => {
    backend = new MemoryStorage()
  })

  it('totalKeys matches stored items', () => {
    backend.setItem('a', 'x')
    backend.setItem('b', 'y')
    const stats = storageStats(backend)
    expect(stats.totalKeys).toBe(2)
  })

  it('expiredKeys counts keys with expired TTL', () => {
    vi.useFakeTimers()
    setWithTtl('expired', 'val', 100, backend)
    setWithTtl('alive', 'val', 9999, backend)
    vi.advanceTimersByTime(101)
    const stats = storageStats(backend)
    expect(stats.expiredKeys).toBe(1)
    vi.useRealTimers()
  })

  it('totalSize is non-zero when data exists', () => {
    backend.setItem('hello', 'world')
    expect(storageStats(backend).totalSize).toBeGreaterThan(0)
  })

  it('totalSize is 0 for empty storage', () => {
    expect(storageStats(backend).totalSize).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// ObservableStorage
// ---------------------------------------------------------------------------

type ObsSchema = { score: number; label: string }

describe('ObservableStorage.subscribe', () => {
  let store: ObservableStorage<ObsSchema>

  beforeEach(() => {
    store = new ObservableStorage<ObsSchema>({ namespace: 'obs', backend: new MemoryStorage() })
  })

  it('listener is called on set', () => {
    const fn = vi.fn()
    store.subscribe('score', fn)
    store.set('score', 42)
    expect(fn).toHaveBeenCalledWith(42, null, 'score')
  })

  it('listener receives old value on set', () => {
    store.set('score', 10)
    const fn = vi.fn()
    store.subscribe('score', fn)
    store.set('score', 20)
    expect(fn).toHaveBeenCalledWith(20, 10, 'score')
  })

  it('listener is called with null newValue on remove', () => {
    store.set('score', 5)
    const fn = vi.fn()
    store.subscribe('score', fn)
    store.remove('score')
    expect(fn).toHaveBeenCalledWith(null, 5, 'score')
  })

  it('unsubscribe: listener not called after unsubscribe', () => {
    const fn = vi.fn()
    const unsub = store.subscribe('score', fn)
    unsub()
    store.set('score', 99)
    expect(fn).not.toHaveBeenCalled()
  })

  it('multiple listeners on same key all receive events', () => {
    const fn1 = vi.fn()
    const fn2 = vi.fn()
    store.subscribe('score', fn1)
    store.subscribe('score', fn2)
    store.set('score', 7)
    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)
  })
})

describe('ObservableStorage.subscribeAll', () => {
  let store: ObservableStorage<ObsSchema>

  beforeEach(() => {
    store = new ObservableStorage<ObsSchema>({ namespace: 'obs', backend: new MemoryStorage() })
  })

  it('subscribeAll listener is called for any key change', () => {
    const fn = vi.fn()
    store.subscribeAll(fn)
    store.set('score', 1)
    store.set('label', 'hi')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('subscribeAll unsubscribe stops notifications', () => {
    const fn = vi.fn()
    const unsub = store.subscribeAll(fn)
    unsub()
    store.set('score', 99)
    expect(fn).not.toHaveBeenCalled()
  })

  it('subscribeAll receives key name in callback', () => {
    const fn = vi.fn()
    store.subscribeAll(fn)
    store.set('label', 'test')
    expect(fn).toHaveBeenCalledWith('test', null, 'label')
  })
})

// ---------------------------------------------------------------------------
// copyStorage
// ---------------------------------------------------------------------------

describe('copyStorage', () => {
  it('copies all keys from source to target', () => {
    const from = new MemoryStorage()
    const to = new MemoryStorage()
    from.setItem('a', '1')
    from.setItem('b', '2')
    copyStorage(from, to)
    expect(to.getItem('a')).toBe('1')
    expect(to.getItem('b')).toBe('2')
  })

  it('returns count of keys copied', () => {
    const from = new MemoryStorage()
    const to = new MemoryStorage()
    from.setItem('a', '1')
    from.setItem('b', '2')
    expect(copyStorage(from, to)).toBe(2)
  })

  it('copies only prefix-matching keys', () => {
    const from = new MemoryStorage()
    const to = new MemoryStorage()
    from.setItem('ns:a', '1')
    from.setItem('ns:b', '2')
    from.setItem('other:c', '3')
    copyStorage(from, to, 'ns:')
    expect(to.getItem('ns:a')).toBe('1')
    expect(to.getItem('ns:b')).toBe('2')
    expect(to.getItem('other:c')).toBeNull()
  })

  it('does not modify source', () => {
    const from = new MemoryStorage()
    const to = new MemoryStorage()
    from.setItem('x', 'y')
    copyStorage(from, to)
    expect(from.getItem('x')).toBe('y')
  })
})

// ---------------------------------------------------------------------------
// diffStorage
// ---------------------------------------------------------------------------

describe('diffStorage', () => {
  it('detects keys only in A', () => {
    const a = new MemoryStorage()
    const b = new MemoryStorage()
    a.setItem('onlyA', '1')
    const diff = diffStorage(a, b)
    expect(diff.onlyInA).toContain('onlyA')
    expect(diff.onlyInB).not.toContain('onlyA')
    expect(diff.differing).not.toContain('onlyA')
  })

  it('detects keys only in B', () => {
    const a = new MemoryStorage()
    const b = new MemoryStorage()
    b.setItem('onlyB', '2')
    const diff = diffStorage(a, b)
    expect(diff.onlyInB).toContain('onlyB')
  })

  it('detects differing values', () => {
    const a = new MemoryStorage()
    const b = new MemoryStorage()
    a.setItem('shared', 'valueA')
    b.setItem('shared', 'valueB')
    const diff = diffStorage(a, b)
    expect(diff.differing).toContain('shared')
    expect(diff.onlyInA).not.toContain('shared')
    expect(diff.onlyInB).not.toContain('shared')
  })

  it('identical keys with same values are not in any diff array', () => {
    const a = new MemoryStorage()
    const b = new MemoryStorage()
    a.setItem('same', 'val')
    b.setItem('same', 'val')
    const diff = diffStorage(a, b)
    expect(diff.onlyInA).not.toContain('same')
    expect(diff.onlyInB).not.toContain('same')
    expect(diff.differing).not.toContain('same')
  })

  it('returns empty arrays for identical storages', () => {
    const a = new MemoryStorage()
    const b = new MemoryStorage()
    a.setItem('k', 'v')
    b.setItem('k', 'v')
    const diff = diffStorage(a, b)
    expect(diff.onlyInA).toHaveLength(0)
    expect(diff.onlyInB).toHaveLength(0)
    expect(diff.differing).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Sports app helpers
// ---------------------------------------------------------------------------

describe('createPreferencesStorage', () => {
  it('creates a TypedStorage for preferences', () => {
    const backend = new MemoryStorage()
    const store = createPreferencesStorage(backend)
    expect(store).toBeDefined()
  })

  it('stores and retrieves user preferences', () => {
    const backend = new MemoryStorage()
    const store = createPreferencesStorage(backend)
    const prefs = { theme: 'dark' as const, timezone: 'UTC', notifications: true }
    store.set('preferences', prefs)
    expect(store.get('preferences')).toEqual(prefs)
  })

  it('stores favoriteTeams array', () => {
    const backend = new MemoryStorage()
    const store = createPreferencesStorage(backend)
    store.set('preferences', { favoriteTeams: ['NYK', 'LAL'] })
    expect(store.get('preferences')!.favoriteTeams).toEqual(['NYK', 'LAL'])
  })

  it('uses MemoryStorage when no backend provided', () => {
    const store = createPreferencesStorage()
    store.set('preferences', { oddsFormat: 'american' })
    expect(store.get('preferences')!.oddsFormat).toBe('american')
  })
})

describe('createPickHistoryStorage', () => {
  it('creates a TypedStorage for picks', () => {
    const backend = new MemoryStorage()
    const store = createPickHistoryStorage(backend)
    expect(store).toBeDefined()
  })

  it('stores and retrieves picks array', () => {
    const backend = new MemoryStorage()
    const store = createPickHistoryStorage(backend)
    const picks = [{ id: '1', sport: 'NFL' }, { id: '2', sport: 'NBA' }]
    store.set('picks', picks)
    expect(store.get('picks')).toEqual(picks)
  })

  it('uses MemoryStorage when no backend provided', () => {
    const store = createPickHistoryStorage()
    store.set('picks', [{ id: 'x' }])
    expect(store.get('picks')).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Schema version stored in TypedStorage metadata
// ---------------------------------------------------------------------------

describe('TypedStorage schema version', () => {
  it('stores version in item metadata when configured', () => {
    const backend = new MemoryStorage()
    const store = new TypedStorage<TestSchema>({ namespace: 'ns', backend, version: 3 })
    store.set('name', 'test')
    const meta = store.getWithMeta('name')
    expect(meta!.version).toBe(3)
  })

  it('does not include version field when not configured', () => {
    const backend = new MemoryStorage()
    const store = new TypedStorage<TestSchema>({ namespace: 'ns', backend })
    store.set('name', 'test')
    const meta = store.getWithMeta('name')
    expect(meta!.version).toBeUndefined()
  })
})
