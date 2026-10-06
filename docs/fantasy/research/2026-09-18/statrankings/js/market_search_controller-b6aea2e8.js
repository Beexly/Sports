import { Controller } from "@hotwired/stimulus"

// Server-side market filter for the PredictionMarkets+ boards. Typing sets
// ?q= and reloads the board's Turbo frame; the server narrows the whole
// board before paginating it (Polymarket::PageData#query).
//
// This used to filter in the browser, hiding rows that didn't match. That
// worked while a board rendered its whole league, and stopped working the
// moment the boards paginated: the query could only see the fifty rows
// already on the page, so searching for a team on page four reported no
// results -- a different and wronger answer than "not on this page".
//
// Only the frame is replaced, and this input sits outside it, so the element
// being typed into is never re-rendered. Focus and the caret survive because
// nothing touches them, rather than because something restores them after.
//
// The visits replace rather than push history: one entry per keystroke would
// make the back button useless. The URL still updates (the frame carries
// data-turbo-action="advance"), so the current search is shareable and
// survives the board's own broadcast refreshes.
export default class extends Controller {
  static targets = ["input"]
  static values = { frame: String, delay: { type: Number, default: 250 } }

  disconnect() {
    clearTimeout(this.timeout)
  }

  search() {
    clearTimeout(this.timeout)
    this.timeout = setTimeout(() => this.visit(), this.delayValue)
  }

  clear() {
    this.inputTarget.value = ""
    this.search()
  }

  visit() {
    const url = new URL(window.location.href)
    const query = this.inputTarget.value.trim()

    if (query) {
      url.searchParams.set("q", query)
    } else {
      url.searchParams.delete("q")
    }
    // A new query renumbers the board, so page 3 of the old results is not
    // page 3 of the new ones -- and is often past the end of them.
    url.searchParams.delete("page")

    Turbo.visit(url.toString(), { frame: this.frameValue, action: "replace" })
  }
}
