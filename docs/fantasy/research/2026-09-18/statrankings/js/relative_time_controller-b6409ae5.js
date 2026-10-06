import { Controller } from "@hotwired/stimulus"
import { formatLocalDateTime } from "format_local_time"

// Replaces a <time datetime="..."> element's text with a relative label
// ("just now", "5 seconds ago", "30 minutes ago") that keeps ticking on its
// own, without any new data from the server -- the live odds board's
// "Updated" stamp exists specifically to prove a live stream is behind it
// (BoardTable's own docstring), and an absolute timestamp alone doesn't
// visibly move between updates the way a ticking relative label does.
//
// Falls back to an absolute local date/time (same format
// local_time_controller.js renders) once the gap passes HOUR_THRESHOLD_MS --
// "3 hours ago" is less useful than just seeing when it actually was.
//
// Watches the datetime attribute itself (a MutationObserver, same pattern as
// sync_status_controller.js) rather than only formatting once on connect:
// Turbo::StreamsChannel.broadcast_refresh_to morphs this element in place
// when fresh data lands, so connect() only ever fires once per page load --
// every subsequent update is an attribute mutation, not a new controller
// instance, and each one needs to reset which moment "ago" is measured from.
const SECOND_MS = 1_000
const MINUTE_MS = 60 * SECOND_MS
const HOUR_MS = 60 * MINUTE_MS
const HOUR_THRESHOLD_MS = HOUR_MS
const JUST_NOW_THRESHOLD_MS = 5 * SECOND_MS

export default class extends Controller {
  // Opt-in compact vocabulary ("20s ago") for callers whose layout has no
  // room for "20 seconds ago" -- the PredictionMarkets+ feed-freshness
  // dropdown. Off by default, so the live odds board's "Updated" stamp keeps
  // rendering exactly as it did.
  static values = { compact: Boolean }

  connect() {
    this.observer = new MutationObserver(() => this.reset())
    this.observer.observe(this.element, { attributes: true, attributeFilter: ["datetime"] })
    this.reset()
  }

  disconnect() {
    this.observer?.disconnect()
    this._clearTimer()
  }

  reset() {
    const raw = this.element.getAttribute("datetime")
    this._date = raw ? new Date(raw) : null
    if (this._date && isNaN(this._date)) this._date = null
    this._clearTimer()
    this._tick()
  }

  _tick() {
    if (!this._date) return

    const elapsedMs = Date.now() - this._date.getTime()
    // Compact mode never falls back to an absolute stamp: this dropdown's
    // whole job is saying how long ago a feed wrote, and an hours-old feed
    // there is an alarm state that stays most legible as an age.
    if (this.compactValue) {
      this.element.textContent = compactLabel(Math.max(elapsedMs, 0))
      this._timer = setTimeout(() => this._tick(), SECOND_MS)
      return
    }

    if (elapsedMs < 0 || elapsedMs >= HOUR_THRESHOLD_MS) {
      this.element.textContent = formatLocalDateTime(this._date)
      return
    }

    this.element.textContent = relativeLabel(elapsedMs)
    this._timer = setTimeout(() => this._tick(), SECOND_MS)
  }

  _clearTimer() {
    if (this._timer) clearTimeout(this._timer)
    this._timer = null
  }
}

function relativeLabel(elapsedMs) {
  if (elapsedMs < JUST_NOW_THRESHOLD_MS) return "just now"

  const seconds = Math.floor(elapsedMs / SECOND_MS)
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"} ago`

  const minutes = Math.floor(elapsedMs / MINUTE_MS)
  return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
}

// Mirrors Polymarket::VenueFreshness#ago_label -- same thresholds, same
// rounding -- so the server's first paint and the ticking client label speak
// one vocabulary instead of disagreeing on the same instant.
function compactLabel(elapsedMs) {
  // Each threshold tests the raw age and only the displayed number is rounded,
  // exactly as the Ruby does. Rounding first and then comparing moves the
  // boundaries: a 59.6s age reads "60s ago" server-side but would fall into
  // the minutes bucket here and flip to "1m ago" the moment Stimulus connects.
  const seconds = elapsedMs / SECOND_MS
  if (seconds < 60) return `${Math.round(seconds)}s ago`
  if (seconds < 3600) return `${Math.round(elapsedMs / MINUTE_MS)}m ago`

  return `${Math.round(elapsedMs / HOUR_MS)}h ago`
}
