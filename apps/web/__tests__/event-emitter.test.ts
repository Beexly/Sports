/**
 * Tests for @/lib/utils/event-emitter
 * Run: cd apps/web && npx vitest run __tests__/event-emitter.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  TypedEventEmitter,
  PriorityQueue,
  Subject,
  BehaviorSubject,
  WildcardEventBus,
  mergeSubjects,
  filterSubject,
  mapSubject,
  takeSubject,
  bufferSubject,
  createChannel,
  pipelineTransform,
  createDebouncedEmitter,
  debounce,
  throttle,
} from '@/lib/utils/event-emitter'

// ---------------------------------------------------------------------------
// TypedEventEmitter
// ---------------------------------------------------------------------------

interface TestEvents {
  greet: string
  count: number
  data: { value: number; label: string }
  empty: undefined
}

describe('TypedEventEmitter', () => {
  describe('on / emit', () => {
    it('calls handler when event is emitted', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      const handler = vi.fn()
      emitter.on('greet', handler)
      emitter.emit('greet', 'hello')
      expect(handler).toHaveBeenCalledOnce()
      expect(handler).toHaveBeenCalledWith('hello')
    })

    it('passes complex payload correctly', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      const handler = vi.fn()
      emitter.on('data', handler)
      emitter.emit('data', { value: 42, label: 'test' })
      expect(handler).toHaveBeenCalledWith({ value: 42, label: 'test' })
    })

    it('handles undefined payload', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      const handler = vi.fn()
      emitter.on('empty', handler)
      emitter.emit('empty', undefined)
      expect(handler).toHaveBeenCalledOnce()
    })

    it('does not call handler for different events', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      const handler = vi.fn()
      emitter.on('greet', handler)
      emitter.emit('count', 5)
      expect(handler).not.toHaveBeenCalled()
    })

    it('calls handler multiple times for multiple emits', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      const handler = vi.fn()
      emitter.on('count', handler)
      emitter.emit('count', 1)
      emitter.emit('count', 2)
      emitter.emit('count', 3)
      expect(handler).toHaveBeenCalledTimes(3)
    })

    it('calls all handlers for same event', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      const h1 = vi.fn()
      const h2 = vi.fn()
      const h3 = vi.fn()
      emitter.on('greet', h1)
      emitter.on('greet', h2)
      emitter.on('greet', h3)
      emitter.emit('greet', 'all')
      expect(h1).toHaveBeenCalledWith('all')
      expect(h2).toHaveBeenCalledWith('all')
      expect(h3).toHaveBeenCalledWith('all')
    })

    it('does nothing when no listeners registered', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      expect(() => emitter.emit('greet', 'nobody')).not.toThrow()
    })
  })

  describe('off', () => {
    it('removes specific handler', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      const handler = vi.fn()
      emitter.on('greet', handler)
      emitter.off('greet', handler)
      emitter.emit('greet', 'after off')
      expect(handler).not.toHaveBeenCalled()
    })

    it('only removes the specified handler, not others', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      const h1 = vi.fn()
      const h2 = vi.fn()
      emitter.on('greet', h1)
      emitter.on('greet', h2)
      emitter.off('greet', h1)
      emitter.emit('greet', 'selective')
      expect(h1).not.toHaveBeenCalled()
      expect(h2).toHaveBeenCalledWith('selective')
    })

    it('is safe to call off for a non-existent handler', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      const handler = vi.fn()
      expect(() => emitter.off('greet', handler)).not.toThrow()
    })
  })

  describe('once', () => {
    it('fires only once then auto-removes', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      const handler = vi.fn()
      emitter.once('count', handler)
      emitter.emit('count', 1)
      emitter.emit('count', 2)
      emitter.emit('count', 3)
      expect(handler).toHaveBeenCalledOnce()
      expect(handler).toHaveBeenCalledWith(1)
    })

    it('calls once handler with correct payload', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      const handler = vi.fn()
      emitter.once('greet', handler)
      emitter.emit('greet', 'once-only')
      expect(handler).toHaveBeenCalledWith('once-only')
    })

    it('once and on together work correctly', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      const onHandler = vi.fn()
      const onceHandler = vi.fn()
      emitter.on('count', onHandler)
      emitter.once('count', onceHandler)
      emitter.emit('count', 10)
      emitter.emit('count', 20)
      expect(onHandler).toHaveBeenCalledTimes(2)
      expect(onceHandler).toHaveBeenCalledTimes(1)
    })
  })

  describe('unsubscribe returned by on()', () => {
    it('unsubscribes when called', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      const handler = vi.fn()
      const unsub = emitter.on('greet', handler)
      unsub()
      emitter.emit('greet', 'after unsub')
      expect(handler).not.toHaveBeenCalled()
    })

    it('unsubscribes from once correctly', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      const handler = vi.fn()
      const unsub = emitter.once('count', handler)
      unsub()
      emitter.emit('count', 99)
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('removeAllListeners', () => {
    it('removes all listeners for a specific event', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      const h1 = vi.fn()
      const h2 = vi.fn()
      emitter.on('greet', h1)
      emitter.on('greet', h2)
      emitter.removeAllListeners('greet')
      emitter.emit('greet', 'cleared')
      expect(h1).not.toHaveBeenCalled()
      expect(h2).not.toHaveBeenCalled()
    })

    it('removes all listeners for all events when no arg', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      const h1 = vi.fn()
      const h2 = vi.fn()
      emitter.on('greet', h1)
      emitter.on('count', h2)
      emitter.removeAllListeners()
      emitter.emit('greet', 'x')
      emitter.emit('count', 0)
      expect(h1).not.toHaveBeenCalled()
      expect(h2).not.toHaveBeenCalled()
    })

    it('other events unaffected when removing specific event', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      const h1 = vi.fn()
      const h2 = vi.fn()
      emitter.on('greet', h1)
      emitter.on('count', h2)
      emitter.removeAllListeners('greet')
      emitter.emit('count', 5)
      expect(h2).toHaveBeenCalledWith(5)
    })
  })

  describe('listenerCount', () => {
    it('returns 0 for event with no listeners', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      expect(emitter.listenerCount('greet')).toBe(0)
    })

    it('returns correct count', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      emitter.on('greet', vi.fn())
      emitter.on('greet', vi.fn())
      expect(emitter.listenerCount('greet')).toBe(2)
    })

    it('decreases after off()', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      const h = vi.fn()
      emitter.on('greet', h)
      emitter.off('greet', h)
      expect(emitter.listenerCount('greet')).toBe(0)
    })

    it('decreases after once fires', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      emitter.once('count', vi.fn())
      emitter.emit('count', 1)
      expect(emitter.listenerCount('count')).toBe(0)
    })
  })

  describe('eventNames', () => {
    it('returns empty array with no listeners', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      expect(emitter.eventNames()).toEqual([])
    })

    it('returns registered event names', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      emitter.on('greet', vi.fn())
      emitter.on('count', vi.fn())
      const names = emitter.eventNames()
      expect(names).toContain('greet')
      expect(names).toContain('count')
      expect(names).toHaveLength(2)
    })

    it('removes event name after all listeners removed', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      const h = vi.fn()
      emitter.on('greet', h)
      emitter.off('greet', h)
      expect(emitter.eventNames()).not.toContain('greet')
    })
  })

  describe('listeners()', () => {
    it('returns listener info with once flags', () => {
      const emitter = new TypedEventEmitter<TestEvents>()
      emitter.on('count', vi.fn())
      emitter.once('count', vi.fn())
      const info = emitter.listeners()
      expect(info).toHaveLength(1)
      expect(info[0].event).toBe('count')
      expect(info[0].count).toBe(2)
      expect(info[0].once).toEqual([false, true])
    })
  })

  describe('maxListeners warning', () => {
    it('logs warning when maxListeners exceeded', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const emitter = new TypedEventEmitter<TestEvents>({ maxListeners: 2 })
      emitter.on('greet', vi.fn())
      emitter.on('greet', vi.fn())
      emitter.on('greet', vi.fn())
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })
})

// ---------------------------------------------------------------------------
// PriorityQueue
// ---------------------------------------------------------------------------

describe('PriorityQueue', () => {
  it('starts empty', () => {
    const q = new PriorityQueue<string>()
    expect(q.isEmpty).toBe(true)
    expect(q.size).toBe(0)
  })

  it('enqueue increases size', () => {
    const q = new PriorityQueue<string>()
    q.enqueue({ id: '1', priority: 5, payload: 'a' })
    expect(q.size).toBe(1)
    expect(q.isEmpty).toBe(false)
  })

  it('dequeue returns highest priority first', () => {
    const q = new PriorityQueue<string>()
    q.enqueue({ id: '1', priority: 1, payload: 'low' })
    q.enqueue({ id: '2', priority: 10, payload: 'high' })
    q.enqueue({ id: '3', priority: 5, payload: 'mid' })
    expect(q.dequeue()?.payload).toBe('high')
    expect(q.dequeue()?.payload).toBe('mid')
    expect(q.dequeue()?.payload).toBe('low')
  })

  it('peek returns highest priority without removing', () => {
    const q = new PriorityQueue<number>()
    q.enqueue({ id: 'a', priority: 3, payload: 30 })
    q.enqueue({ id: 'b', priority: 7, payload: 70 })
    expect(q.peek()?.payload).toBe(70)
    expect(q.size).toBe(2)
  })

  it('dequeue from empty queue returns undefined', () => {
    const q = new PriorityQueue<string>()
    expect(q.dequeue()).toBeUndefined()
  })

  it('peek on empty queue returns undefined', () => {
    const q = new PriorityQueue<string>()
    expect(q.peek()).toBeUndefined()
  })

  it('clear empties the queue', () => {
    const q = new PriorityQueue<string>()
    q.enqueue({ id: '1', priority: 1, payload: 'a' })
    q.enqueue({ id: '2', priority: 2, payload: 'b' })
    q.clear()
    expect(q.size).toBe(0)
    expect(q.isEmpty).toBe(true)
  })

  it('toArray returns sorted items without removing', () => {
    const q = new PriorityQueue<string>()
    q.enqueue({ id: 'c', priority: 3, payload: 'c' })
    q.enqueue({ id: 'a', priority: 10, payload: 'a' })
    q.enqueue({ id: 'b', priority: 6, payload: 'b' })
    const arr = q.toArray()
    expect(arr.map((i) => i.payload)).toEqual(['a', 'b', 'c'])
    expect(q.size).toBe(3)
  })

  it('handles items with equal priority', () => {
    const q = new PriorityQueue<string>()
    q.enqueue({ id: 'x', priority: 5, payload: 'x' })
    q.enqueue({ id: 'y', priority: 5, payload: 'y' })
    expect(q.size).toBe(2)
    const first = q.dequeue()
    const second = q.dequeue()
    expect(first).toBeDefined()
    expect(second).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Subject
// ---------------------------------------------------------------------------

describe('Subject', () => {
  it('delivers values to subscribers', () => {
    const s = new Subject<number>()
    const handler = vi.fn()
    s.subscribe(handler)
    s.next(42)
    expect(handler).toHaveBeenCalledWith(42)
  })

  it('delivers to multiple subscribers', () => {
    const s = new Subject<string>()
    const h1 = vi.fn()
    const h2 = vi.fn()
    s.subscribe(h1)
    s.subscribe(h2)
    s.next('broadcast')
    expect(h1).toHaveBeenCalledWith('broadcast')
    expect(h2).toHaveBeenCalledWith('broadcast')
  })

  it('unsubscribe stops delivery', () => {
    const s = new Subject<number>()
    const handler = vi.fn()
    const sub = s.subscribe(handler)
    s.next(1)
    sub.unsubscribe()
    s.next(2)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('complete stops all delivery', () => {
    const s = new Subject<string>()
    const handler = vi.fn()
    s.subscribe(handler)
    s.complete()
    s.next('after complete')
    expect(handler).not.toHaveBeenCalled()
  })

  it('completed is true after complete()', () => {
    const s = new Subject<number>()
    expect(s.completed).toBe(false)
    s.complete()
    expect(s.completed).toBe(true)
  })

  it('subscriberCount tracks correctly', () => {
    const s = new Subject<number>()
    expect(s.subscriberCount).toBe(0)
    const sub1 = s.subscribe(vi.fn())
    const sub2 = s.subscribe(vi.fn())
    expect(s.subscriberCount).toBe(2)
    sub1.unsubscribe()
    expect(s.subscriberCount).toBe(1)
    sub2.unsubscribe()
    expect(s.subscriberCount).toBe(0)
  })

  it('subscribe after complete returns no-op subscription', () => {
    const s = new Subject<number>()
    s.complete()
    const handler = vi.fn()
    s.subscribe(handler)
    s.next(1)
    expect(handler).not.toHaveBeenCalled()
  })

  it('complete clears subscribers', () => {
    const s = new Subject<number>()
    s.subscribe(vi.fn())
    s.subscribe(vi.fn())
    s.complete()
    expect(s.subscriberCount).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// BehaviorSubject
// ---------------------------------------------------------------------------

describe('BehaviorSubject', () => {
  it('emits initial value on subscribe', () => {
    const bs = new BehaviorSubject<number>(10)
    const handler = vi.fn()
    bs.subscribe(handler)
    expect(handler).toHaveBeenCalledWith(10)
  })

  it('tracks current value', () => {
    const bs = new BehaviorSubject<string>('hello')
    expect(bs.value).toBe('hello')
    bs.next('world')
    expect(bs.value).toBe('world')
  })

  it('new subscriber receives latest value', () => {
    const bs = new BehaviorSubject<number>(0)
    bs.next(5)
    bs.next(10)
    const handler = vi.fn()
    bs.subscribe(handler)
    expect(handler).toHaveBeenCalledWith(10)
  })

  it('emits new values to subscribers', () => {
    const bs = new BehaviorSubject<number>(1)
    const values: number[] = []
    bs.subscribe((v) => values.push(v))
    bs.next(2)
    bs.next(3)
    // First call is initial value (1), then 2 and 3
    expect(values).toEqual([1, 2, 3])
  })

  it('inherits complete behavior', () => {
    const bs = new BehaviorSubject<string>('init')
    const handler = vi.fn()
    bs.subscribe(handler) // fires once with 'init'
    bs.complete()
    bs.next('after complete')
    expect(handler).toHaveBeenCalledTimes(1)
    expect(bs.completed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// WildcardEventBus
// ---------------------------------------------------------------------------

describe('WildcardEventBus', () => {
  it('exact match fires handler', () => {
    const bus = new WildcardEventBus()
    const handler = vi.fn()
    bus.on('sports:nfl', handler)
    bus.emit('sports:nfl', { game: 'CHI vs GB' })
    expect(handler).toHaveBeenCalledWith({ event: 'sports:nfl', payload: { game: 'CHI vs GB' } })
  })

  it('wildcard sports:* matches sports:nfl', () => {
    const bus = new WildcardEventBus()
    const handler = vi.fn()
    bus.on('sports:*', handler)
    bus.emit('sports:nfl', 'payload')
    expect(handler).toHaveBeenCalled()
  })

  it('wildcard sports:* matches sports:nba', () => {
    const bus = new WildcardEventBus()
    const handler = vi.fn()
    bus.on('sports:*', handler)
    bus.emit('sports:nba', 'nba payload')
    expect(handler).toHaveBeenCalledWith({ event: 'sports:nba', payload: 'nba payload' })
  })

  it('wildcard sports:* does not match picks', () => {
    const bus = new WildcardEventBus()
    const handler = vi.fn()
    bus.on('sports:*', handler)
    bus.emit('picks', 'should not match')
    expect(handler).not.toHaveBeenCalled()
  })

  it('wildcard * matches everything', () => {
    const bus = new WildcardEventBus()
    const handler = vi.fn()
    bus.on('*', handler)
    bus.emit('anything', 1)
    bus.emit('something.else', 2)
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('unsubscribe works', () => {
    const bus = new WildcardEventBus()
    const handler = vi.fn()
    const unsub = bus.on('sports:*', handler)
    unsub()
    bus.emit('sports:mlb', 'after unsub')
    expect(handler).not.toHaveBeenCalled()
  })

  it('matchCount returns correct count', () => {
    const bus = new WildcardEventBus()
    bus.on('sports:*', vi.fn())
    bus.on('sports:nfl', vi.fn())
    bus.on('picks', vi.fn())
    expect(bus.matchCount('sports:nfl')).toBe(2)
    expect(bus.matchCount('picks')).toBe(1)
    expect(bus.matchCount('other')).toBe(0)
  })

  it('multiple exact handlers all called', () => {
    const bus = new WildcardEventBus()
    const h1 = vi.fn()
    const h2 = vi.fn()
    bus.on('event:a', h1)
    bus.on('event:a', h2)
    bus.emit('event:a', 'multi')
    expect(h1).toHaveBeenCalled()
    expect(h2).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// mergeSubjects
// ---------------------------------------------------------------------------

describe('mergeSubjects', () => {
  it('emits when first subject emits', () => {
    const s1 = new Subject<number>()
    const s2 = new Subject<number>()
    const merged = mergeSubjects(s1, s2)
    const handler = vi.fn()
    merged.subscribe(handler)
    s1.next(1)
    expect(handler).toHaveBeenCalledWith(1)
  })

  it('emits when second subject emits', () => {
    const s1 = new Subject<number>()
    const s2 = new Subject<number>()
    const merged = mergeSubjects(s1, s2)
    const handler = vi.fn()
    merged.subscribe(handler)
    s2.next(2)
    expect(handler).toHaveBeenCalledWith(2)
  })

  it('collects emissions from all sources in order', () => {
    const s1 = new Subject<number>()
    const s2 = new Subject<number>()
    const s3 = new Subject<number>()
    const merged = mergeSubjects(s1, s2, s3)
    const values: number[] = []
    merged.subscribe((v) => values.push(v))
    s2.next(20)
    s1.next(10)
    s3.next(30)
    expect(values).toEqual([20, 10, 30])
  })
})

// ---------------------------------------------------------------------------
// filterSubject
// ---------------------------------------------------------------------------

describe('filterSubject', () => {
  it('passes values matching predicate', () => {
    const s = new Subject<number>()
    const evens = filterSubject(s, (v) => v % 2 === 0)
    const handler = vi.fn()
    evens.subscribe(handler)
    s.next(1)
    s.next(2)
    s.next(3)
    s.next(4)
    expect(handler).toHaveBeenCalledTimes(2)
    expect(handler).toHaveBeenCalledWith(2)
    expect(handler).toHaveBeenCalledWith(4)
  })

  it('blocks all values when predicate always false', () => {
    const s = new Subject<number>()
    const filtered = filterSubject(s, () => false)
    const handler = vi.fn()
    filtered.subscribe(handler)
    s.next(1)
    s.next(2)
    expect(handler).not.toHaveBeenCalled()
  })

  it('passes all values when predicate always true', () => {
    const s = new Subject<string>()
    const filtered = filterSubject(s, () => true)
    const handler = vi.fn()
    filtered.subscribe(handler)
    s.next('a')
    s.next('b')
    expect(handler).toHaveBeenCalledTimes(2)
  })
})

// ---------------------------------------------------------------------------
// mapSubject
// ---------------------------------------------------------------------------

describe('mapSubject', () => {
  it('transforms values', () => {
    const s = new Subject<number>()
    const doubled = mapSubject(s, (v) => v * 2)
    const handler = vi.fn()
    doubled.subscribe(handler)
    s.next(5)
    expect(handler).toHaveBeenCalledWith(10)
  })

  it('transforms type (number to string)', () => {
    const s = new Subject<number>()
    const strings = mapSubject(s, (v) => String(v))
    const results: string[] = []
    strings.subscribe((v) => results.push(v))
    s.next(1)
    s.next(2)
    s.next(3)
    expect(results).toEqual(['1', '2', '3'])
  })
})

// ---------------------------------------------------------------------------
// takeSubject
// ---------------------------------------------------------------------------

describe('takeSubject', () => {
  it('passes only first N values', () => {
    const s = new Subject<number>()
    const taken = takeSubject(s, 3)
    const values: number[] = []
    taken.subscribe((v) => values.push(v))
    s.next(1)
    s.next(2)
    s.next(3)
    s.next(4)
    s.next(5)
    expect(values).toEqual([1, 2, 3])
  })

  it('auto-completes after N', () => {
    const s = new Subject<number>()
    const taken = takeSubject(s, 2)
    s.next(1)
    s.next(2)
    expect(taken.completed).toBe(true)
  })

  it('take(0) emits nothing', () => {
    const s = new Subject<number>()
    const taken = takeSubject(s, 0)
    const handler = vi.fn()
    taken.subscribe(handler)
    s.next(1)
    expect(handler).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// bufferSubject
// ---------------------------------------------------------------------------

describe('bufferSubject', () => {
  it('batches emissions into arrays of given size', () => {
    const s = new Subject<number>()
    const buffered = bufferSubject(s, 3)
    const batches: number[][] = []
    buffered.subscribe((arr) => batches.push(arr))
    s.next(1)
    s.next(2)
    s.next(3)
    expect(batches).toEqual([[1, 2, 3]])
  })

  it('emits multiple batches', () => {
    const s = new Subject<string>()
    const buffered = bufferSubject(s, 2)
    const batches: string[][] = []
    buffered.subscribe((arr) => batches.push(arr))
    s.next('a')
    s.next('b')
    s.next('c')
    s.next('d')
    expect(batches).toEqual([['a', 'b'], ['c', 'd']])
  })

  it('does not emit if buffer not full', () => {
    const s = new Subject<number>()
    const buffered = bufferSubject(s, 5)
    const handler = vi.fn()
    buffered.subscribe(handler)
    s.next(1)
    s.next(2)
    expect(handler).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// createChannel
// ---------------------------------------------------------------------------

describe('createChannel', () => {
  it('publish delivers to subscriber', () => {
    const ch = createChannel<string>()
    const handler = vi.fn()
    ch.subscribe(handler)
    ch.publish('hello')
    expect(handler).toHaveBeenCalledWith('hello')
  })

  it('subscriberCount tracks correctly', () => {
    const ch = createChannel<number>()
    expect(ch.subscriberCount()).toBe(0)
    const unsub = ch.subscribe(vi.fn())
    expect(ch.subscriberCount()).toBe(1)
    unsub()
    expect(ch.subscriberCount()).toBe(0)
  })

  it('multiple subscribers all receive message', () => {
    const ch = createChannel<boolean>()
    const h1 = vi.fn()
    const h2 = vi.fn()
    ch.subscribe(h1)
    ch.subscribe(h2)
    ch.publish(true)
    expect(h1).toHaveBeenCalledWith(true)
    expect(h2).toHaveBeenCalledWith(true)
  })

  it('unsubscribed handler does not receive messages', () => {
    const ch = createChannel<string>()
    const handler = vi.fn()
    const unsub = ch.subscribe(handler)
    unsub()
    ch.publish('ignored')
    expect(handler).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// pipelineTransform
// ---------------------------------------------------------------------------

describe('pipelineTransform', () => {
  it('transforms values from source subject', () => {
    const source = new Subject<number>()
    const result = pipelineTransform(source, (v) => v * 3)
    const values: number[] = []
    result.subscribe((v) => values.push(v))
    source.next(2)
    source.next(4)
    expect(values).toEqual([6, 12])
  })

  it('works with type transformation', () => {
    const source = new Subject<string>()
    const lengths = pipelineTransform(source, (s) => s.length)
    const handler = vi.fn()
    lengths.subscribe(handler)
    source.next('hello')
    expect(handler).toHaveBeenCalledWith(5)
  })
})

// ---------------------------------------------------------------------------
// createDebouncedEmitter
// ---------------------------------------------------------------------------

describe('createDebouncedEmitter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('emits immediately when delayMs=0', () => {
    const base = new TypedEventEmitter<{ val: string }>()
    const handler = vi.fn()
    base.on('val', handler)
    const debounced = createDebouncedEmitter(base as { emit: (event: string, payload: string) => void }, 'val', 0)
    debounced.emit('immediate')
    expect(handler).toHaveBeenCalledWith('immediate')
  })

  it('does not emit before delay', () => {
    const received: string[] = []
    const fakeEmitter = { emit: (_e: string, p: string) => received.push(p) }
    const d = createDebouncedEmitter(fakeEmitter, 'test', 200)
    d.emit('first')
    expect(received).toHaveLength(0)
  })

  it('emits last value after delay', () => {
    const received: number[] = []
    const fakeEmitter = { emit: (_e: string, p: number) => received.push(p) }
    const d = createDebouncedEmitter(fakeEmitter, 'test', 100)
    d.emit(1)
    d.emit(2)
    d.emit(3)
    vi.advanceTimersByTime(150)
    expect(received).toEqual([3])
  })

  it('flush fires pending immediately', () => {
    const received: string[] = []
    const fakeEmitter = { emit: (_e: string, p: string) => received.push(p) }
    const d = createDebouncedEmitter(fakeEmitter, 'ev', 500)
    d.emit('pending')
    d.flush()
    expect(received).toEqual(['pending'])
  })

  it('cancel discards pending emission', () => {
    const received: string[] = []
    const fakeEmitter = { emit: (_e: string, p: string) => received.push(p) }
    const d = createDebouncedEmitter(fakeEmitter, 'ev', 300)
    d.emit('will-cancel')
    d.cancel()
    vi.advanceTimersByTime(400)
    expect(received).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// debounce
// ---------------------------------------------------------------------------

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('delays the function call', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced()
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(101)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('only fires once for rapid calls', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced()
    debounced()
    debounced()
    vi.advanceTimersByTime(150)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('passes the latest arguments', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 50)
    debounced('a')
    debounced('b')
    debounced('c')
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledWith('c')
  })

  it('resets timer on each call', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced()
    vi.advanceTimersByTime(50)
    debounced()
    vi.advanceTimersByTime(50)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(60)
    expect(fn).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// throttle
// ---------------------------------------------------------------------------

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls fn immediately on first call', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)
    throttled()
    expect(fn).toHaveBeenCalledOnce()
  })

  it('blocks subsequent calls within limit window', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)
    throttled()
    throttled()
    throttled()
    expect(fn).toHaveBeenCalledOnce()
  })

  it('allows call again after limit period', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)
    throttled()
    vi.advanceTimersByTime(101)
    throttled()
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('passes arguments correctly', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 50)
    throttled('hello', 42)
    expect(fn).toHaveBeenCalledWith('hello', 42)
  })
})
