import { Controller } from "@hotwired/stimulus"

// Keeps the GA4 admin page fresh without a manual reload. GoogleAnalyticsReportingService
// caches results for 15 minutes server-side, so this just re-renders whatever's cached --
// data visibly updates as soon as the server cache rotates.
const POLL_INTERVAL_MS = 15000

export default class extends Controller {
  #interval

  connect() {
    // ponytail: polls even when the tab is hidden/backgrounded -- each poll only
    // re-renders the (usually cached) page, so the cost is trivial. Gate on
    // document.visibilityState if this ever needs to matter.
    this.#interval = setInterval(() => this.#refresh(), POLL_INTERVAL_MS)
  }

  disconnect() {
    clearInterval(this.#interval)
  }

  #refresh() {
    Turbo.visit(window.location.href, { action: "replace" })
  }
}
