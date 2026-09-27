import { Controller } from "@hotwired/stimulus"
import { dispatchAnalytics } from "dispatch_analytics"

const DEBOUNCE_MS = 400

let pendingRefocus = null

export default class extends Controller {
  static targets = ["input"]
  static values = {
    param: { type: String, default: "q" },
    // Numeric "Min ___" qualifier inputs need 0 to survive as an explicit,
    // unfiltered value distinct from the param never being submitted at all
    // (which falls back to a computed default). Plain search inputs (e.g.
    // Search Player) should still just drop the param when cleared.
    zeroOnClear: { type: Boolean, default: false },
  }

  connect() {
    this.searchTimeout = null

    if (pendingRefocus === this.paramValue) {
      pendingRefocus = null
      this.restoreCaret()
    }
  }

  restoreCaret() {
    const el = this.inputTarget

    // Defer to the next frame so we run after Turbo finishes swapping the
    // frame DOM — otherwise our focus/caret can be overwritten by Turbo's
    // own focus restoration.
    requestAnimationFrame(() => {
      el.focus()
      const length = el.value.length

      // setSelectionRange throws on type="number". Temporarily swap to
      // "text", position the caret at the end, then swap back.
      const originalType = el.type
      const needsSwap = originalType === "number"
      if (needsSwap) el.type = "text"

      try {
        el.setSelectionRange(length, length)
      } catch {
        // Ignore — input type doesn't support selection.
      }

      if (needsSwap) el.type = originalType
    })
  }

  disconnect() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout)
    }
  }

  search() {
    const query = this.sanitizedQuery()

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout)
    }

    this.searchTimeout = setTimeout(() => {
      const url = new URL(window.location.href)
      const paramName = this.paramValue

      if (query.length > 0) {
        url.searchParams.set(paramName, query)
      } else if (this.zeroOnClearValue) {
        url.searchParams.set(paramName, "0")
      } else {
        url.searchParams.delete(paramName)
      }

      const destination = `${url.pathname}${url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""}`
      const turboFrame = this.inputTarget.dataset.turboFrame
      const options = turboFrame ? { action: "replace", frame: turboFrame } : { action: "replace" }
      const turbo = window.Turbo

      if (!turbo) {
        window.location.assign(destination)
        return
      }

      dispatchAnalytics("player_search", { search_term: query })
      pendingRefocus = paramName
      turbo.visit(destination, options)
    }, DEBOUNCE_MS)
  }

  sanitizedQuery() {
    if (this.inputTarget.type !== "number") {
      return this.inputTarget.value.trim()
    }

    const digitsOnly = this.inputTarget.value.replace(/\D/g, "")

    if (this.inputTarget.value !== digitsOnly) {
      this.inputTarget.value = digitsOnly
    }

    return digitsOnly
  }
}
