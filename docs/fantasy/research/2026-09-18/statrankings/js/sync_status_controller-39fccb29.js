import { Controller } from "@hotwired/stimulus"

// Visual feedback for the two manual odds-engine triggers ("Sync odds now"
// and "Full sweep"), replacing a text status line with the sync icon
// itself: spins from the moment either form submits (before any server
// response -- see startSpinning, bound to each form's submit event) until
// the sync's effects are observed, then stops -- flashing the "Last
// updated" timestamp green only when THIS view's own data changed.
//
// Both buttons' icons spin and stop together, even though only one was
// clicked: there is no way to distinguish "the fast lane finished" from
// "the full sweep finished" from the client's side (both push the same
// timestamp-change / turbo:render signals below, and both share one
// server-side lock -- see odds-engine's api_server.py), so tracking them
// separately would be false precision. Both icons showing "something is
// happening" together is honest about what's actually observable.
//
// Two independent stop signals, because one sync can legitimately produce
// either outcome depending on which league happens to be on screen:
//
// 1. The timestamp's own datetime attribute changing -- guaranteed to
//    change when, and only when, the currently-viewed league's own data
//    advanced. Stops the spin AND flashes green.
// 2. A document-level `turbo:render` event -- dispatched whenever Turbo
//    finishes rendering a page, including the full-page morph a
//    Turbo::StreamsChannel.broadcast_refresh_to triggers (see
//    WatermarkBroadcast), regardless of whether the morph diff actually
//    changed anything. A full sweep touches ~50 leagues; the one currently
//    on screen (e.g. NFL in the off-season) can legitimately get zero new
//    rows while the sweep as a whole completes successfully in well under a
//    minute -- signal 1 alone would never fire, and the spinner would spin
//    for its full 90-second timeout looking hung. Stops the spin, no flash
//    (nothing new for *this* view).
//
// LiveOddsController#sync / #poll render real text into their own status
// target only for genuine failures (not configured, connection error) --
// "started" and "already running" render nothing, since the spinner already
// says "something is happening". A MutationObserver on each status target's
// text stops the spin immediately when an error appears, since nothing is
// coming. Each button gets its own status line (SyncButton::FAST_STATUS_DOM_ID
// / SLOW_STATUS_DOM_ID), so an error from one never displaces the other's.
export default class extends Controller {
  static targets = ["icon", "status", "timestamp"]
  static classes = ["spinning", "flash"]

  // Backstop so a lost response (odds-engine down, network drop after the
  // initial ack) doesn't spin forever with no explanation -- comfortably
  // longer than a full sweep takes end to end (see RAILS_TRIGGER.md).
  static values = {
    timeoutMs: { type: Number, default: 90_000 },
    // How long the flash class stays on before it's removed -- matches the
    // live-odds-updated-flash keyframe animation's own duration
    // (live_odds.scss) so the class comes off right as the two-pulse
    // animation finishes, not mid-pulse.
    flashHoldMs: { type: Number, default: 1400 },
  }

  // Class field, not connect()-initialized: Stimulus invokes *TargetConnected
  // callbacks (statusTargetConnected below, for any target already present
  // when this controller starts) BEFORE calling connect() itself, not
  // after -- confirmed live via the browser console, where initializing
  // this Map in connect() instead produced "Cannot read properties of
  // undefined (reading 'set')" inside statusTargetConnected on every single
  // page load. Stimulus caught that exception by silently abandoning this
  // controller's entire connection (logged once as "Failed to autoload
  // controller: sync-status", easy to miss) -- meaning connect() itself,
  // and both MutationObservers this whole spinner/flash mechanism depends
  // on, never ran at all. A class field is set during construction, before
  // Stimulus touches any lifecycle method, so it's guaranteed to exist no
  // matter which callback fires first.
  _statusObservers = new Map()

  connect() {
    this._onTurboRender = () => this.stopSpinning({ flash: false })
    document.addEventListener("turbo:render", this._onTurboRender)
  }

  disconnect() {
    this.timestampObserver?.disconnect()
    this._statusObservers.forEach((observer) => observer.disconnect())
    document.removeEventListener("turbo:render", this._onTurboRender)
    this._clearTimeout()
  }

  // Stimulus target lifecycle callback -- self-contained (builds its own
  // observer fresh, touches no connect()-initialized state), so it isn't
  // vulnerable to the *TargetConnected-before-connect() ordering that broke
  // statusTargetConnected (see the _statusObservers field comment). Kept as
  // a *Connected callback rather than folded into connect() anyway: it
  // fires again correctly if this target is ever removed and re-added,
  // which a one-time connect()-only setup would not survive.
  timestampTargetConnected(element) {
    this.timestampObserver = new MutationObserver(() => this.stopSpinning({ flash: true }))
    this.timestampObserver.observe(element, { attributes: true, attributeFilter: ["datetime"] })
  }

  timestampTargetDisconnected() {
    this.timestampObserver?.disconnect()
  }

  // Stimulus target lifecycle callback, called once per "status" target as
  // it connects -- there are two (one per button), each needing its own
  // observer since either one gaining text should stop the spin.
  statusTargetConnected(element) {
    const observer = new MutationObserver(() => {
      if (element.textContent.trim()) this.stopSpinning({ flash: false })
    })
    observer.observe(element, { childList: true, characterData: true, subtree: true })
    this._statusObservers.set(element, observer)
  }

  statusTargetDisconnected(element) {
    this._statusObservers.get(element)?.disconnect()
    this._statusObservers.delete(element)
  }

  // Disabled while spinning, on both buttons (they share one spinning state
  // -- see the class comment on why there's no separate per-button state to
  // disable independently): stops a second click from firing a request the
  // server will just 409 while the first is still in flight, which was
  // silently swallowing the reason the spinner looked stuck -- "already
  // running" renders no status text at all (STATUS_MESSAGES has no entry
  // for it, the spinner already says "something is happening"), so a
  // rejected second click gave no sign anything was wrong.
  //
  // Deliberately aria-disabled + pointer-events: none, not the native
  // disabled attribute: Turbo Drive automatically disables and then
  // re-enables a form's own submitter around its own request/response
  // cycle, and since that turbo_stream response typically lands in well
  // under 100ms (long before the real sync actually finishes), it was
  // fighting this and re-enabling the very button someone just clicked
  // almost immediately -- confirmed live. aria-disabled is inert to Turbo's
  // own button management, so nothing re-enables it out from under this
  // until stopSpinning says so. Screen readers still announce it as
  // disabled; sighted users get the same visual + click-blocking via CSS
  // (live_odds.scss's :disabled rule, which also targets aria-disabled).
  // One iconTarget (AdminSyncControls' summary icon) isn't inside a
  // <button> at all -- optional chaining skips it rather than throwing.
  //
  // Also closes the admin panel immediately on submit: the summary icon
  // above keeps showing "something is happening" even once it's closed, so
  // there's no need to keep the panel open just to see the spin, and
  // closing it gets the admin-only chrome back out of the way of the board
  // they actually clicked to refresh.
  startSpinning(event) {
    this.iconTargets.forEach((icon) => {
      icon.classList.add(this.spinningClass)
      icon.closest("button")?.setAttribute("aria-disabled", "true")
    })
    event.target.closest(".live-odds-admin-controls")?.removeAttribute("open")
    this._clearTimeout()
    this._timeout = setTimeout(() => this.stopSpinning({ flash: false }), this.timeoutMsValue)
  }

  stopSpinning({ flash }) {
    this.iconTargets.forEach((icon) => {
      icon.classList.remove(this.spinningClass)
      icon.closest("button")?.removeAttribute("aria-disabled")
    })
    this._clearTimeout()

    if (flash && this.hasTimestampTarget) {
      // The flash class lives in live_odds.scss on .live-odds-updated, the
      // <span> wrapping "Updated " + this <time> element -- flash the whole
      // line, not just the timestamp inside it.
      const line = this.timestampTarget.closest(".live-odds-updated") || this.timestampTarget
      line.classList.remove(this.flashClass)
      // Force a reflow so re-adding the class restarts its animation if
      // this line is still mid-flash from a broadcast moments ago.
      void line.offsetWidth
      line.classList.add(this.flashClass)
      setTimeout(() => line.classList.remove(this.flashClass), this.flashHoldMsValue)
    }
  }

  _clearTimeout() {
    if (this._timeout) clearTimeout(this._timeout)
    this._timeout = null
  }
}
