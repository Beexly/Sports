/**
 * Typed event emitter and pub/sub utilities.
 * Pure TypeScript — no npm dependencies, no `any`.
 */

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export type EventMap = Record<string, unknown>
export type EventHandler<T> = (event: T) => void
export type UnsubscribeFn = () => void

export interface EmitterOptions {
  /** Maximum listeners per event before a warning is logged. Default: 10 */
  maxListeners?: number
  /** Whether to capture unhandled promise rejections. Default: false */
  captureRejections?: boolean
}

export interface ListenerInfo {
  event: string
  count: number
  once: boolean[] // parallel array — true if the listener is one-time
}

// ---------------------------------------------------------------------------
// TypedEventEmitter
// ---------------------------------------------------------------------------

interface ListenerEntry<T> {
  handler: EventHandler<T>
  once: boolean
}

export class TypedEventEmitter<TMap extends EventMap> {
  private readonly _options: Required<EmitterOptions>
  private readonly _listeners: Map<keyof TMap, ListenerEntry<TMap[keyof TMap]>[]>

  constructor(options?: EmitterOptions) {
    this._options = {
      maxListeners: options?.maxListeners ?? 10,
      captureRejections: options?.captureRejections ?? false,
    }
    this._listeners = new Map()
  }

  on<K extends keyof TMap>(event: K, handler: EventHandler<TMap[K]>): UnsubscribeFn {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, [])
    }
    const list = this._listeners.get(event)!
    list.push({ handler: handler as EventHandler<TMap[keyof TMap]>, once: false })

    if (list.length > this._options.maxListeners) {
      console.warn(
        `TypedEventEmitter: event "${String(event)}" has ${list.length} listeners ` +
          `which exceeds maxListeners (${this._options.maxListeners}).`
      )
    }

    return () => this.off(event, handler)
  }

  once<K extends keyof TMap>(event: K, handler: EventHandler<TMap[K]>): UnsubscribeFn {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, [])
    }
    const list = this._listeners.get(event)!
    list.push({ handler: handler as EventHandler<TMap[keyof TMap]>, once: true })
    return () => this.off(event, handler)
  }

  emit<K extends keyof TMap>(event: K, payload: TMap[K]): void {
    const list = this._listeners.get(event)
    if (!list) return

    // Snapshot so that removals during iteration are safe
    const snapshot = list.slice()
    const toRemove: EventHandler<TMap[keyof TMap]>[] = []

    for (const entry of snapshot) {
      entry.handler(payload as TMap[keyof TMap])
      if (entry.once) {
        toRemove.push(entry.handler)
      }
    }

    for (const h of toRemove) {
      const idx = list.findIndex((e) => e.handler === h)
      if (idx !== -1) list.splice(idx, 1)
    }

    if (list.length === 0) {
      this._listeners.delete(event)
    }
  }

  off<K extends keyof TMap>(event: K, handler: EventHandler<TMap[K]>): void {
    const list = this._listeners.get(event)
    if (!list) return
    const idx = list.findIndex((e) => e.handler === (handler as EventHandler<TMap[keyof TMap]>))
    if (idx !== -1) list.splice(idx, 1)
    if (list.length === 0) this._listeners.delete(event)
  }

  removeAllListeners(event?: keyof TMap): void {
    if (event === undefined) {
      this._listeners.clear()
    } else {
      this._listeners.delete(event)
    }
  }

  listenerCount(event: keyof TMap): number {
    return this._listeners.get(event)?.length ?? 0
  }

  eventNames(): string[] {
    return [...this._listeners.keys()].map(String)
  }

  listeners(): ListenerInfo[] {
    const result: ListenerInfo[] = []
    for (const [event, list] of this._listeners.entries()) {
      result.push({
        event: String(event),
        count: list.length,
        once: list.map((e) => e.once),
      })
    }
    return result
  }
}

// ---------------------------------------------------------------------------
// PriorityQueue
// ---------------------------------------------------------------------------

export interface PriorityEvent<T> {
  priority: number // higher = processed first
  payload: T
  id: string
}

export class PriorityQueue<T> {
  private _items: PriorityEvent<T>[]

  constructor() {
    this._items = []
  }

  enqueue(item: PriorityEvent<T>): void {
    // Binary insert to maintain sorted order (descending by priority)
    let lo = 0
    let hi = this._items.length
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (this._items[mid].priority >= item.priority) {
        lo = mid + 1
      } else {
        hi = mid
      }
    }
    this._items.splice(lo, 0, item)
  }

  dequeue(): PriorityEvent<T> | undefined {
    return this._items.shift()
  }

  peek(): PriorityEvent<T> | undefined {
    return this._items[0]
  }

  get size(): number {
    return this._items.length
  }

  get isEmpty(): boolean {
    return this._items.length === 0
  }

  clear(): void {
    this._items = []
  }

  toArray(): PriorityEvent<T>[] {
    return this._items.slice()
  }
}

// ---------------------------------------------------------------------------
// Subject
// ---------------------------------------------------------------------------

export interface Subscription {
  unsubscribe(): void
}

export class Subject<T> {
  protected _subscribers: Array<EventHandler<T>>
  protected _completed: boolean

  constructor() {
    this._subscribers = []
    this._completed = false
  }

  subscribe(handler: EventHandler<T>): Subscription {
    if (this._completed) {
      return { unsubscribe: () => undefined }
    }
    this._subscribers.push(handler)
    return {
      unsubscribe: () => {
        const idx = this._subscribers.indexOf(handler)
        if (idx !== -1) this._subscribers.splice(idx, 1)
      },
    }
  }

  next(value: T): void {
    if (this._completed) return
    const snapshot = this._subscribers.slice()
    for (const handler of snapshot) {
      handler(value)
    }
  }

  complete(): void {
    this._completed = true
    this._subscribers = []
  }

  get completed(): boolean {
    return this._completed
  }

  get subscriberCount(): number {
    return this._subscribers.length
  }
}

// ---------------------------------------------------------------------------
// BehaviorSubject
// ---------------------------------------------------------------------------

export class BehaviorSubject<T> extends Subject<T> {
  private _value: T

  constructor(initialValue: T) {
    super()
    this._value = initialValue
  }

  get value(): T {
    return this._value
  }

  override next(value: T): void {
    this._value = value
    super.next(value)
  }

  override subscribe(handler: EventHandler<T>): Subscription {
    const sub = super.subscribe(handler)
    if (!this._completed) {
      handler(this._value)
    }
    return sub
  }
}

// ---------------------------------------------------------------------------
// WildcardEventBus
// ---------------------------------------------------------------------------

interface WildcardEntry {
  pattern: string
  handler: EventHandler<{ event: string; payload: unknown }>
}

function matchesPattern(pattern: string, event: string): boolean {
  if (pattern === '*') return true
  if (pattern.endsWith(':*')) {
    const prefix = pattern.slice(0, -1) // strip '*', keep trailing ':'
    return event.startsWith(prefix)
  }
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1)
    return event.startsWith(prefix)
  }
  return pattern === event
}

export class WildcardEventBus {
  private _entries: WildcardEntry[]

  constructor() {
    this._entries = []
  }

  on(
    pattern: string,
    handler: EventHandler<{ event: string; payload: unknown }>
  ): UnsubscribeFn {
    const entry: WildcardEntry = { pattern, handler }
    this._entries.push(entry)
    return () => {
      const idx = this._entries.indexOf(entry)
      if (idx !== -1) this._entries.splice(idx, 1)
    }
  }

  emit(event: string, payload: unknown): void {
    const snapshot = this._entries.slice()
    for (const entry of snapshot) {
      if (matchesPattern(entry.pattern, event)) {
        entry.handler({ event, payload })
      }
    }
  }

  matchCount(event: string): number {
    return this._entries.filter((e) => matchesPattern(e.pattern, event)).length
  }
}

// ---------------------------------------------------------------------------
// createDebouncedEmitter
// ---------------------------------------------------------------------------

export function createDebouncedEmitter<T>(
  emitter: { emit: (event: string, payload: T) => void },
  event: string,
  delayMs: number
): { emit: (payload: T) => void; flush: () => void; cancel: () => void } {
  let pending: T | undefined
  let hasPending = false
  let timerId: ReturnType<typeof setTimeout> | undefined

  const fire = () => {
    if (hasPending) {
      const payload = pending as T
      pending = undefined
      hasPending = false
      timerId = undefined
      emitter.emit(event, payload)
    }
  }

  return {
    emit(payload: T) {
      pending = payload
      hasPending = true
      if (delayMs === 0) {
        fire()
        return
      }
      if (timerId !== undefined) {
        clearTimeout(timerId)
      }
      timerId = setTimeout(fire, delayMs)
    },
    flush() {
      if (timerId !== undefined) {
        clearTimeout(timerId)
        timerId = undefined
      }
      fire()
    },
    cancel() {
      if (timerId !== undefined) {
        clearTimeout(timerId)
        timerId = undefined
      }
      pending = undefined
      hasPending = false
    },
  }
}

// ---------------------------------------------------------------------------
// Pipeline / transform utilities
// ---------------------------------------------------------------------------

export interface Transformer<In, Out> {
  (input: In): Out
}

export function pipelineTransform<In, Out>(
  source: Subject<In>,
  transform: Transformer<In, Out>
): Subject<Out> {
  const result = new Subject<Out>()
  source.subscribe((value) => {
    result.next(transform(value))
  })
  return result
}

// Two-step overloaded pipeline (for API surface compatibility)
export function pipeline<A, B>(source: Subject<A>, t1: Transformer<A, B>): Subject<B>
export function pipeline<A, B, C>(
  source: Subject<A>,
  t1: Transformer<A, B>,
  t2: Transformer<B, C>
): Subject<C>
export function pipeline<A, B, C>(
  source: Subject<A>,
  t1: Transformer<A, B>,
  t2?: Transformer<B, C>
): Subject<B> | Subject<C> {
  const mid = pipelineTransform(source, t1)
  if (t2) return pipelineTransform(mid, t2)
  return mid
}

// ---------------------------------------------------------------------------
// mergeSubjects
// ---------------------------------------------------------------------------

export function mergeSubjects<T>(...subjects: Subject<T>[]): Subject<T> {
  const merged = new Subject<T>()
  for (const s of subjects) {
    s.subscribe((value) => merged.next(value))
  }
  return merged
}

// ---------------------------------------------------------------------------
// filterSubject
// ---------------------------------------------------------------------------

export function filterSubject<T>(
  source: Subject<T>,
  predicate: (value: T) => boolean
): Subject<T> {
  const result = new Subject<T>()
  source.subscribe((value) => {
    if (predicate(value)) result.next(value)
  })
  return result
}

// ---------------------------------------------------------------------------
// mapSubject
// ---------------------------------------------------------------------------

export function mapSubject<In, Out>(
  source: Subject<In>,
  transform: (value: In) => Out
): Subject<Out> {
  return pipelineTransform(source, transform)
}

// ---------------------------------------------------------------------------
// takeSubject
// ---------------------------------------------------------------------------

export function takeSubject<T>(source: Subject<T>, count: number): Subject<T> {
  const result = new Subject<T>()
  let seen = 0
  source.subscribe((value) => {
    if (result.completed) return
    if (seen < count) {
      seen++
      result.next(value)
      if (seen >= count) {
        result.complete()
      }
    }
  })
  return result
}

// ---------------------------------------------------------------------------
// bufferSubject
// ---------------------------------------------------------------------------

export function bufferSubject<T>(source: Subject<T>, bufferSize: number): Subject<T[]> {
  const result = new Subject<T[]>()
  let buffer: T[] = []
  source.subscribe((value) => {
    buffer.push(value)
    if (buffer.length >= bufferSize) {
      result.next(buffer)
      buffer = []
    }
  })
  return result
}

// ---------------------------------------------------------------------------
// createChannel
// ---------------------------------------------------------------------------

export function createChannel<T>(): {
  publish: (value: T) => void
  subscribe: (handler: EventHandler<T>) => UnsubscribeFn
  subscriberCount: () => number
} {
  const handlers: EventHandler<T>[] = []
  return {
    publish(value: T) {
      const snapshot = handlers.slice()
      for (const h of snapshot) {
        h(value)
      }
    },
    subscribe(handler: EventHandler<T>): UnsubscribeFn {
      handlers.push(handler)
      return () => {
        const idx = handlers.indexOf(handler)
        if (idx !== -1) handlers.splice(idx, 1)
      }
    },
    subscriberCount() {
      return handlers.length
    },
  }
}

// ---------------------------------------------------------------------------
// debounce
// ---------------------------------------------------------------------------

export function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  delayMs: number
): (...args: T) => void {
  let timerId: ReturnType<typeof setTimeout> | undefined
  return function (...args: T) {
    if (timerId !== undefined) {
      clearTimeout(timerId)
    }
    timerId = setTimeout(() => {
      timerId = undefined
      fn(...args)
    }, delayMs)
  }
}

// ---------------------------------------------------------------------------
// throttle
// ---------------------------------------------------------------------------

export function throttle<T extends unknown[]>(
  fn: (...args: T) => void,
  limitMs: number
): (...args: T) => void {
  let lastCall = -Infinity
  return function (...args: T) {
    const now = Date.now()
    if (now - lastCall >= limitMs) {
      lastCall = now
      fn(...args)
    }
  }
}
