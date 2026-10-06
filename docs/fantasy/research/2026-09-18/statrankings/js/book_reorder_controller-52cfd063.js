import { Controller } from "@hotwired/stimulus"
import { csrfParam } from "csrf_param"

// Drag-to-reorder for the Customize+ venue rows. One instance per band
// (its element is that band's row container), so a drag can never cross
// into another family.
//
// Pointer events off the grip handle, not HTML5 drag-and-drop: iOS
// Safari only starts a native drag from a long-press (a normal touch
// drag just scrolls), which read as "dragging doesn't work on mobile".
// The grip carries touch-action: none (live_odds.scss) so the browser
// hands the gesture to us instead of scrolling, and grabbing by the
// grip alone leaves the rest of the row to its label job of toggling
// the checkbox.
//
// Rows move live as the pointer passes over them; on release every
// band's checked keys are collected in panel row order and PUT to the
// same preferences endpoint the checkboxes save through -- the saved
// list's order IS the board's column order within each band
// (LiveOdds::Board::Venue#position) -- and a Turbo refresh re-renders
// the table's columns to match. The panel itself is
// data-turbo-permanent, so the just-dragged rows survive that refresh
// untouched.
//
// Rendered only for subscribers (Components::LiveOdds::CustomizePanel):
// a visitor without the subscription gets no grab action and no
// instance of this controller at all.
export default class extends Controller {
  static values = { saveUrl: String }

  disconnect() {
    this._teardown()
  }

  grab(event) {
    const row = event.target.closest("[data-book-key]")
    if (!row || row.parentElement !== this.element) return

    // Claims the gesture: no text selection, no synthetic click on the
    // label (a grip press must never toggle the checkbox).
    event.preventDefault()
    this.dragging = row
    row.classList.add("lo-custom__row--dragging")
    this._onMove = (e) => this._move(e)
    this._onUp = () => this._release()
    document.addEventListener("pointermove", this._onMove)
    document.addEventListener("pointerup", this._onUp)
    document.addEventListener("pointercancel", this._onUp)
  }

  _move(event) {
    if (!this.dragging) return
    event.preventDefault()
    const over = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest("[data-book-key]")
    if (!over || over === this.dragging || over.parentElement !== this.element) return

    const rows = Array.from(this.element.children)
    const before = rows.indexOf(this.dragging) < rows.indexOf(over)
    over.insertAdjacentElement(before ? "afterend" : "beforebegin", this.dragging)
  }

  _release() {
    if (!this.dragging) return
    this.dragging.classList.remove("lo-custom__row--dragging")
    this.dragging = null
    this._teardown()
    this.save()
  }

  _teardown() {
    document.removeEventListener("pointermove", this._onMove)
    document.removeEventListener("pointerup", this._onUp)
    document.removeEventListener("pointercancel", this._onUp)
  }

  save() {
    if (!this.saveUrlValue) return

    // The whole panel's checked keys, not just this band's: the saved
    // list is the complete selection, and document order (prediction
    // markets, exchanges, then books, each in row order) carries every
    // band's arrangement at once.
    const panel = this.element.closest(".lo-custom__panel") || this.element
    const keys = Array.from(panel.querySelectorAll('[data-book-filter-target="checkbox"]'))
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value)

    // The CSRF token rides in the body, not the X-CSRF-Token header: the
    // CDN strips that header before Rails sees it (csrf_param.js). And a
    // rejected save must never trigger the refresh -- fetch() resolves on
    // a 4xx/5xx, so without the ok check a failed PUT would re-render the
    // server's OLD order under the visitor's just-dragged rows, which is
    // exactly the "row moves, columns don't" this shipped with. The rows
    // stay where they were dragged; the next drop resends the whole order.
    fetch(this.saveUrlValue, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ sportsbook_keys: keys, ...csrfParam() }),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`save failed (${response.status})`)
        window.Turbo?.visit(window.location.href, { action: "replace" })
      })
      .catch((error) => console.warn("book-reorder: save failed", error))
  }
}
